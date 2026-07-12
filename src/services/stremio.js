const axios = require('axios');
const crypto = require('crypto');
const { cache } = require('./cache');
const { STREMIO_API_URL, CACHE_TTL } = require('../config/constants');
const { calculateEngagementScore } = require('../lib/watchHistory');

async function getUserWatchHistory(authKey, limit, targetType, inputMode) {
    const safeLimit = Math.min(parseInt(limit) || 20, 10000);

    // Hash the authKey to avoid storing raw credentials in cache database
    const keyHash = crypto.createHash('sha256').update(authKey).digest('hex').slice(0, 16);
    const libCacheKey = `library:${keyHash}`;
    let libraryItems = await cache.get(libCacheKey);
    let fromCache = true;

    if (!libraryItems) {
        fromCache = false;
        try {
            const response = await axios.post(STREMIO_API_URL, {
                authKey,
                collection: "libraryItem",
                all: true
            });
            libraryItems = response.data.result || [];
            await cache.set(libCacheKey, libraryItems, CACHE_TTL.LIBRARY);
            console.log(`[Library] Fetched ${libraryItems.length} items from Stremio API`);
        } catch (error) {
            console.error("Library Fetch Error:", error.message);
            return { selectedItems: [], allLibraryIds: new Set() };
        }
    }

    try {
        const allLibraryIds = new Set();

        libraryItems.forEach(item => {
            if (item._id) {
                allLibraryIds.add(item._id);
                if (item._id.startsWith('tmdb:')) {
                } else if (item._id.startsWith('tvdb:')) {
                } else if (item._id.startsWith('tt')) {
                    allLibraryIds.add(item._id);
                }
            }
        });

        if (!fromCache) {
            console.log(`[Library] ${allLibraryIds.size} unique IDs for hide-watched matching`);
        }

        const validItems = libraryItems.filter(item => {
            if (!item._id) return false;
            if (targetType && item.type !== targetType) return false;
            if (item.removed) {
                const hasHistory = item.state && (item.state.timeOffset > 0 || item.state.lastWatched);
                if (!hasHistory) return false;
            }
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
                _date: new Date(item.state?.lastWatched || item.state?.lastModified || 0).getTime()
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

const STREMIO_API_BASE = 'https://api.strem.io/api/';

async function getStremioUserInfo(authKey) {
    try {
        const response = await axios.post(`${STREMIO_API_BASE}getUser`, { authKey }, { timeout: 10000 });
        const data = response.data;
        if (data && data.result) {
            return { result: data.result, error: null };
        }
        return { result: null, error: 'Invalid response from API' };
    } catch (error) {
        console.error('[Stremio] getUser failed:', error.message);
        return { result: null, error: `Network error: ${error.message}` };
    }
}

async function authenticateStremioProfile(authKey, profileId, pin = '') {
    try {
        const response = await axios.post(`${STREMIO_API_BASE}premiumPrefs/authenticateProfile`, {
            authKey,
            profileId,
            pin
        }, { timeout: 10000 });
        const data = response.data;
        if (data && data.result && data.result.authKey) {
            return { authKey: data.result.authKey, error: null };
        }
        return { authKey: null, error: 'Invalid response from API' };
    } catch (error) {
        console.error('[Stremio] authenticateProfile failed:', error.message);
        return { authKey: null, error: `Network error: ${error.message}` };
    }
}

async function getStremioDebugHistory(authKey) {
    try {
        const response = await axios.post(STREMIO_API_URL, {
            authKey,
            collection: "libraryItem",
            all: true
        }, { timeout: 15000 });
        const items = response.data.result || [];

        const movies = items.filter(i => i.type === 'movie');
        const series = items.filter(i => i.type === 'series');
        const removedWithHistory = items.filter(i => i.removed && i.state && (i.state.timeOffset > 0 || i.state.lastWatched));

        // Sort by lastWatched / lastModified descending
        const getDate = (i) => new Date(i.state?.lastWatched || i.state?.lastModified || 0).getTime();
        const sortedMovies = [...movies].sort((a, b) => getDate(b) - getDate(a));
        const sortedSeries = [...series].sort((a, b) => getDate(b) - getDate(a));

        return {
            total_entries: items.length,
            movie_count: movies.length,
            series_count: series.length,
            removed_with_history: removedWithHistory.length,
            sample_movies: sortedMovies.slice(0, 5).map(m => ({
                _id: m._id || 'N/A',
                name: m.name || 'Unknown',
                progress_pct: m.state && m.state.duration > 0 ? Math.round((m.state.timeOffset || 0) / m.state.duration * 100) : 0,
                last_watched: m.state?.lastWatched || m.state?.lastModified || 'N/A'
            })),
            sample_series: sortedSeries.slice(0, 10).map(s => {
                let season = s.state?.season || 0;
                let episode = s.state?.episode || 0;
                const vid = s.state?.video_id || '';
                // Parse season/episode from video_id if not in state (format: tt1234567:S:EE)
                if ((!season || !episode) && vid) {
                    const parts = vid.split(':');
                    if (parts.length >= 3) {
                        season = season || parseInt(parts[parts.length - 2]) || 0;
                        episode = episode || parseInt(parts[parts.length - 1]) || 0;
                    }
                }
                return {
                    _id: s._id || 'N/A',
                    name: s.name || 'Unknown',
                    season,
                    episode,
                    last_watched: s.state?.lastWatched || s.state?.lastModified || 'N/A'
                };
            })
        };
    } catch (error) {
        console.error('[Stremio] Debug fetch failed:', error.message);
        return { error: `Failed to fetch: ${error.message}` };
    }
}

module.exports = {
    getUserWatchHistory,
    getStremioUserInfo,
    authenticateStremioProfile,
    getStremioDebugHistory
};
