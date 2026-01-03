const axios = require('axios');
const { cache } = require('../services/cache');
const { TMDB_BASE_URL, ARM_API_URL, CACHE_TTL } = require('../config/constants');
const { getPlexAniBridgeData } = require('../services/plexanibridge');
const { batchMap, isAnimeItem } = require('./utils');

async function convertToTargetIds(items, type, config) {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const movieTarget = config.movieIdType || 'tmdb';
    const seriesTarget = config.seriesIdType || 'tvdb';
    const animeTarget = config.animeIdType || 'kitsu';
    const rpdbKey = config.rpdbKey;

    return await batchMap(items, 25, async (item) => {
        try {
            const isAnime = isAnimeItem(item);
            let effectiveTarget = 'tmdb';
            if (isAnime) effectiveTarget = animeTarget;
            else if (type === 'movie') effectiveTarget = movieTarget;
            else if (type === 'series') effectiveTarget = seriesTarget;

            const needsExternal = (effectiveTarget !== 'tmdb') || !!rpdbKey;
            if (!needsExternal) return { ...item, final_id: `tmdb:${item.id}` };

            const cacheKey = `ext_ids:${type}:${item.id}`;
            let ext = await cache.get(cacheKey);

            if (!ext) {
                const externalIdsRes = await axios.get(`${TMDB_BASE_URL}/${endpoint}/${item.id}/external_ids`, {
                    params: { api_key: config.tmdbApiKey }
                });
                ext = externalIdsRes.data;
                await cache.set(cacheKey, ext, CACHE_TTL.EXTERNAL_IDS);
            }

            const resultItem = { ...item, imdb_id: ext.imdb_id };

            if (effectiveTarget === 'imdb' && ext.imdb_id) {
                return { ...resultItem, final_id: ext.imdb_id };
            }
            if (effectiveTarget === 'tvdb' && ext.tvdb_id) {
                return { ...resultItem, final_id: `tvdb:${ext.tvdb_id}` };
            }
            if (effectiveTarget === 'tmdb') {
                return { ...resultItem, final_id: `tmdb:${item.id}` };
            }

            if (effectiveTarget === 'kitsu') {
                const armCacheKey = `revmap:tmdb:${item.id}`;
                const cached = await cache.get(armCacheKey);
                if (cached && cached[effectiveTarget]) {
                    return { ...resultItem, final_id: `${effectiveTarget}:${cached[effectiveTarget]}` };
                }
                try {
                    const armRes = await axios.get(ARM_API_URL, { params: { source: 'tmdb', id: item.id } });
                    if (armRes.data && armRes.data[effectiveTarget]) {
                        await cache.set(armCacheKey, armRes.data, CACHE_TTL.EXTERNAL_IDS);
                        return { ...resultItem, final_id: `${effectiveTarget}:${armRes.data[effectiveTarget]}` };
                    }
                } catch (e) {
                    console.log(`[ARM] Lookup failed for tmdb:${item.id}:`, e.message);
                }
            }

            if (effectiveTarget === 'mal') {
                let params = null;
                if (type === 'movie') params = { tmdb_movie_id: item.id };
                else params = { tmdb_show_id: item.id };

                const bridge = await getPlexAniBridgeData(params);
                if (bridge && bridge.mal_id) {
                    const mId = Array.isArray(bridge.mal_id) ? bridge.mal_id[0] : bridge.mal_id;
                    if (mId) return { ...resultItem, final_id: `mal:${mId}` };
                }
            }

            return { ...resultItem, final_id: `tmdb:${item.id}` };
        } catch (e) {
            return { ...item, final_id: `tmdb:${item.id}` };
        }
    });
}

module.exports = {
    convertToTargetIds
};
