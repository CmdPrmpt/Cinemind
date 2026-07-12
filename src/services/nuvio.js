const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { cache } = require('./cache');
const { CACHE_TTL } = require('../config/constants');
const { calculateEngagementScore } = require('../lib/watchHistory');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function getSupabaseClient() {
    return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

async function nuvioLogin(email, password) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
    };
}

async function nuvioGetProfiles(accessToken, refreshToken) {
    const supabase = getSupabaseClient();
    const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || accessToken
    });
    if (sessionError) throw sessionError;

    // Proactively refresh the session to ensure the token isn't stale
    await supabase.auth.refreshSession().catch(() => {});

    const { data, error } = await supabase.rpc('sync_pull_profiles');
    if (error) throw error;
    return data || [];
}

async function getNuvioWatchHistory(accessToken, refreshToken, limit, targetType, inputMode, profileId = 1) {
    const safeLimit = Math.min(parseInt(limit) || 20, 10000);

    // Hash credentials to avoid storing raw values in cache database
    const credHash = crypto.createHash('sha256')
        .update(`${accessToken}:${profileId}`)
        .digest('hex')
        .slice(0, 16);
    const libCacheKey = `nuvio_library:${credHash}`;
    let libraryItems = await cache.get(libCacheKey);

    if (!libraryItems) {
        try {
            console.log(`[Nuvio] Fetching watch progress for profile ${profileId}...`);

            const supabase = getSupabaseClient();
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || accessToken
            });
            if (sessionError) throw sessionError;

            // Proactively refresh the session to ensure the token isn't stale
            await supabase.auth.refreshSession().catch(() => {});

            const { data: progressEntries, error } = await supabase.rpc('sync_pull_watch_progress', {
                p_profile_id: profileId
            });
            if (error) throw error;

            const entries = progressEntries || [];
            console.log(`[Nuvio] Fetched ${entries.length} progress entries`);

            libraryItems = [];
            const seenIds = new Set();

            // Process movies: each entry is a standalone item
            for (const entry of entries) {
                if (entry.content_type === 'movie') {
                    const id = entry.content_id;
                    if (!id || seenIds.has(id)) continue;
                    seenIds.add(id);

                    const progress = entry.duration > 0
                        ? entry.position / entry.duration
                        : 0;

                    libraryItems.push({
                        _id: id,
                        _tmdbId: id.startsWith('tmdb:') ? id : null,
                        _imdbId: null,
                        type: 'movie',
                        name: 'Unknown',  // Will be resolved by TMDB
                        state: {
                            lastWatched: entry.last_watched,
                            season: 0,
                            episode: 0,
                            flaggedAsWatched: progress > 0.9,
                            timeOffset: entry.position,
                            duration: entry.duration
                        }
                    });
                }
            }

            // Aggregate series episodes into show-level items
            const showMap = new Map();

            for (const entry of entries) {
                if (entry.content_type !== 'series') continue;

                const id = entry.content_id;
                if (!id) continue;

                const season = entry.season || 0;
                const episode = entry.episode || 0;

                if (!showMap.has(id) ||
                    season > showMap.get(id).season ||
                    (season === showMap.get(id).season && episode > showMap.get(id).episode)) {
                    showMap.set(id, {
                        id: id,
                        season: season,
                        episode: episode,
                        lastWatched: entry.last_watched
                    });
                } else if (entry.last_watched > showMap.get(id).lastWatched) {
                    showMap.get(id).lastWatched = entry.last_watched;
                }
            }

            for (const [id, show] of showMap) {
                if (seenIds.has(id)) continue;
                seenIds.add(id);

                libraryItems.push({
                    _id: id,
                    _tmdbId: id.startsWith('tmdb:') ? id : null,
                    _imdbId: null,
                    type: 'series',
                    name: 'Unknown',
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

            console.log(`[Nuvio] Processed ${libraryItems.length} total unique items`);
            await cache.set(libCacheKey, libraryItems, CACHE_TTL.LIBRARY);
        } catch (error) {
            console.error("Nuvio Fetch Error:", error.message);
            return { selectedItems: [], allLibraryIds: new Set() };
        }
    }

    try {
        const allLibraryIds = new Set();
        libraryItems.forEach(item => {
            if (item._id) allLibraryIds.add(item._id);
            if (item._tmdbId) allLibraryIds.add(item._tmdbId);
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

async function getNuvioDebugHistory(accessToken, refreshToken, profileId = 1) {
    const supabase = getSupabaseClient();
    const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || accessToken
    });
    if (sessionError) throw sessionError;

    // Proactively refresh the session to ensure the token isn't stale
    await supabase.auth.refreshSession().catch(() => {});

    const { data: entries, error } = await supabase.rpc('sync_pull_watch_progress', {
        p_profile_id: profileId
    });
    if (error) throw error;

    const rawEntries = entries || [];

    // Stats
    const movies = rawEntries.filter(e => e.content_type === 'movie');
    const seriesEpisodes = rawEntries.filter(e => e.content_type === 'series');

    // Aggregate series into unique shows
    const showMap = new Map();
    for (const e of seriesEpisodes) {
        const id = e.content_id;
        if (!id) continue;
        if (!showMap.has(id) || e.last_watched > showMap.get(id).last_watched) {
            showMap.set(id, {
                content_id: id,
                season: e.season || 0,
                episode: e.episode || 0,
                last_watched: e.last_watched,
                total_episodes: (showMap.get(id)?.total_episodes || 0) + 1
            });
        } else {
            showMap.get(id).total_episodes++;
        }
    }

    const uniqueShows = Array.from(showMap.values());

    return {
        total_entries: rawEntries.length,
        movie_count: movies.length,
        series_episode_count: seriesEpisodes.length,
        unique_show_count: uniqueShows.length,
        profile_id: profileId,
        sample_movies: movies.slice(0, 5).map(e => ({
            content_id: e.content_id,
            position: e.position,
            duration: e.duration,
            progress_pct: e.duration > 0 ? Math.round(e.position / e.duration * 100) : 0,
            last_watched: new Date(e.last_watched).toISOString()
        })),
        sample_shows: uniqueShows.slice(0, 10).map(s => ({
            content_id: s.content_id,
            highest_season: s.season,
            highest_episode: s.episode,
            total_episodes_watched: s.total_episodes,
            last_watched: new Date(s.last_watched).toISOString()
        }))
    };
}

module.exports = {
    getNuvioWatchHistory,
    nuvioLogin,
    nuvioGetProfiles,
    getNuvioDebugHistory
};
