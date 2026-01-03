const axios = require('axios');
const { cache } = require('./cache');
const { PLEXANIBRIDGE_API, CACHE_TTL } = require('../config/constants');

async function getPlexAniBridgeData(params, monitor = null) {
    const cacheKey = `plexani:${JSON.stringify(params)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    try {
        const start = Date.now();
        const res = await axios.get(PLEXANIBRIDGE_API, { params, timeout: 5000 });
        if (monitor) monitor.record('PlexAniBridge', 'ID Resolution', Date.now() - start);

        if (res.data && res.data.results && res.data.results.length > 0) {
            const match = res.data.results[0];
            await cache.set(cacheKey, match, CACHE_TTL.EXTERNAL_IDS);
            return match;
        }
    } catch (e) {
        console.log(`[PlexAniBridge] Lookup failed:`, e.message);
    }

    await cache.set(cacheKey, null, CACHE_TTL.NEGATIVE);
    return null;
}

async function checkAnimeViaApi(item, monitor = null) {
    if (!item) return null;

    const cacheKey = `anime_check:${item.id || item._id}`;
    const cached = await cache.get(cacheKey);
    if (cached !== undefined) return cached;

    let params = null;

    if (item.imdb_id) {
        params = { imdb_id: item.imdb_id };
    } else if (item.external_ids && item.external_ids.imdb_id) {
        params = { imdb_id: item.external_ids.imdb_id };
    }
    else if (item._id && item._id.startsWith('tt')) {
        params = { imdb_id: item._id };
    }
    else if (item.id) {
        if (item.type === 'movie') params = { tmdb_movie_id: item.id };
        else if (item.type === 'series' || item.type === 'tv') params = { tmdb_show_id: item.id };
    }

    if (params) {
        const match = await getPlexAniBridgeData(params, monitor);
        if (match && match.anilist_id) {
            await cache.set(cacheKey, match.anilist_id, CACHE_TTL.EXTERNAL_IDS);
            return match.anilist_id;
        }
    }

    await cache.set(cacheKey, null, CACHE_TTL.ID_MAP);
    return null;
}

module.exports = {
    getPlexAniBridgeData,
    checkAnimeViaApi
};
