const axios = require('axios');
const crypto = require('crypto');
const { cache } = require('./cache');
const { MDBLIST_API_URL, CACHE_TTL } = require('../config/constants');
const { calculateEngagementScore } = require('../lib/watchHistory');

async function getMDBlistWatchHistory(apiKey, limit, targetType, inputMode) {
    const safeLimit = Math.min(parseInt(limit) || 20, 10000);

    // Hash the API key to avoid storing raw credentials in cache database
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
    const libCacheKey = `mdblist_library:${keyHash}`;
    let libraryItems = await cache.get(libCacheKey);

    if (!libraryItems) {
        try {
            console.log(`[MDBlist] Fetching watch history...`);

            const [watchedRes, playbackRes] = await Promise.all([
                axios.get(`${MDBLIST_API_URL}/sync/watched`, {
                    params: { apikey: apiKey, limit: 5000 },
                    timeout: 15000
                }).catch(e => ({ data: {} })),
                axios.get(`${MDBLIST_API_URL}/sync/playback`, {
                    params: { apikey: apiKey },
                    timeout: 15000
                }).catch(e => ({ data: [] }))
            ]);

            const watchedData = watchedRes.data || {};
            const playbackData = playbackRes.data || [];

            const moviesCount = (watchedData.movies || []).length;
            const episodesCount = (watchedData.episodes || []).length;
            console.log(`[MDBlist] Fetched ${moviesCount} movies + ${episodesCount} episodes + ${playbackData.length} in-progress`);

            libraryItems = [];
            const seenIds = new Set();

            for (const item of (watchedData.movies || [])) {
                const movie = item.movie || {};
                const ids = movie.ids || {};
                const id = ids.imdb || (ids.tmdb ? `tmdb:${ids.tmdb}` : null);
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);

                libraryItems.push({
                    _id: id,
                    _tmdbId: ids.tmdb ? `tmdb:${ids.tmdb}` : null,
                    _imdbId: ids.imdb || null,
                    type: 'movie',
                    name: movie.title || 'Unknown',
                    state: {
                        lastWatched: new Date(item.last_watched_at || Date.now()).getTime(),
                        season: 0,
                        episode: 0,
                        flaggedAsWatched: true,
                        timeOffset: 1,
                        duration: 1
                    }
                });
            }

            const showMap = new Map();
            const showTmdbIds = new Map();

            for (const item of (watchedData.episodes || [])) {
                const episode = item.episode || {};
                const show = episode.show || {};
                const ids = show.ids || {};
                const id = ids.imdb || (ids.tmdb ? `tmdb:${ids.tmdb}` : null);
                if (!id) continue;

                if (!showMap.has(id) ||
                    episode.season > showMap.get(id).season ||
                    (episode.season === showMap.get(id).season && episode.number > showMap.get(id).episode)) {
                    showMap.set(id, {
                        id: id,
                        name: show.title || 'Unknown',
                        season: episode.season || 0,
                        episode: episode.number || 0,
                        lastWatched: new Date(item.last_watched_at || Date.now()).getTime()
                    });
                    showTmdbIds.set(id, {
                        tmdb: ids.tmdb ? `tmdb:${ids.tmdb}` : null,
                        imdb: ids.imdb || null
                    });
                }
            }

            for (const [id, show] of showMap) {
                if (seenIds.has(id)) continue;
                seenIds.add(id);
                const extraIds = showTmdbIds.get(id) || {};

                libraryItems.push({
                    _id: id,
                    _tmdbId: extraIds.tmdb,
                    _imdbId: extraIds.imdb,
                    type: 'series',
                    name: show.name,
                    state: {
                        lastWatched: show.lastWatched,
                        season: show.season,
                        episode: show.episode,
                        flaggedAsWatched: true,
                        timeOffset: 1,
                        duration: 1
                    }
                });
            }

            for (const item of playbackData) {
                const ids = item.ids || {};
                const id = ids.imdb || (ids.tmdb ? `tmdb:${ids.tmdb}` : null);
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);

                const type = item.type === 'movie' ? 'movie' : 'series';
                const progress = parseFloat(item.progress) || 0;

                libraryItems.push({
                    _id: id,
                    _tmdbId: ids.tmdb ? `tmdb:${ids.tmdb}` : null,
                    _imdbId: ids.imdb || null,
                    type: type,
                    name: item.title || 'Unknown',
                    state: {
                        lastWatched: new Date(item.paused_at || Date.now()).getTime(),
                        season: item.season || 0,
                        episode: item.episode || 0,
                        flaggedAsWatched: false,
                        timeOffset: progress,
                        duration: 100
                    }
                });
            }

            console.log(`[MDBlist] Processed ${libraryItems.length} total unique items`);
            await cache.set(libCacheKey, libraryItems, CACHE_TTL.LIBRARY);
        } catch (error) {
            console.error("MDBlist Fetch Error:", error.message);
            return { selectedItems: [], allLibraryIds: new Set() };
        }
    }

    try {
        const allLibraryIds = new Set();
        libraryItems.forEach(item => {
            if (item._id) allLibraryIds.add(item._id);
            if (item._tmdbId) allLibraryIds.add(item._tmdbId);
            if (item._imdbId) allLibraryIds.add(item._imdbId);
        });

        const validItems = libraryItems.filter(item => {
            if (!item._id) return false;
            if (targetType && item.type !== targetType) return false;
            return true;
        });

        let selectedItems = [];
        if (inputMode === 'random') {
            const shuffled = [...validItems];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            selectedItems = shuffled.slice(0, safeLimit);
        } else {
            const processedItems = validItems.map(item => ({
                ...item,
                _score: calculateEngagementScore(item),
                _date: new Date(item.state.lastWatched || 0).getTime()
            }));
            const favorites = [...processedItems].sort((a, b) => b._score - a._score);
            const recents = [...processedItems].sort((a, b) => b._date - a._date);

            const combined = [];
            const seenIds = new Set();
            const threshold = safeLimit > 100 ? 10 : 0;

            for (let i = 0; i < processedItems.length; i++) {
                if (combined.length >= safeLimit) break;
                if (i < recents.length && !seenIds.has(recents[i]._id)) {
                    if (recents[i]._score > threshold) {
                        combined.push(recents[i]); seenIds.add(recents[i]._id);
                    }
                }
                if (combined.length >= safeLimit) break;
                if (i < favorites.length && !seenIds.has(favorites[i]._id)) {
                    if (favorites[i]._score > threshold) {
                        combined.push(favorites[i]); seenIds.add(favorites[i]._id);
                    }
                }
            }
            selectedItems = combined;
        }
        return { selectedItems, allLibraryIds };
    } catch (error) {
        return { selectedItems: [], allLibraryIds: new Set() };
    }
}

module.exports = {
    getMDBlistWatchHistory
};
