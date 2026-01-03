const axios = require('axios');
const { cache } = require('./cache');
const { ANILIST_API_URL, CACHE_TTL } = require('../config/constants');

async function getAniListRecommendations(tmdbId, knownAnilistId = null, monitor = null) {
    const cacheKey = `anilist_recs:${tmdbId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        if (cached.length === 0) console.log(`[AniList] Returning 0 recs from CACHE for TMDB ${tmdbId}`);
        return cached;
    }

    try {
        let anilistId = knownAnilistId;

        if (!anilistId) {
            const { getPlexAniBridgeData } = require('./plexanibridge');
            const bridge = await getPlexAniBridgeData({ tmdb_movie_id: tmdbId });
            anilistId = bridge?.anilist_id;

            if (!anilistId) {
                const bridgeShow = await getPlexAniBridgeData({ tmdb_show_id: tmdbId });
                anilistId = bridgeShow?.anilist_id;
            }
        }

        if (!anilistId) {
            await cache.set(cacheKey, [], CACHE_TTL.NEGATIVE);
            console.log(`[AniList] No AniList ID found for TMDB ${tmdbId}`);
            return [];
        }

        const query = `
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                recommendations(sort: [RATING_DESC, ID_DESC], page: 1, perPage: 10) {
                    nodes {
                        mediaRecommendation {
                            idMal
                            format
                            title { romaji english }
                            genres
                            tags { name }
                        }
                    }
                }
            }
        }`;

        const start = Date.now();
        const response = await axios.post(ANILIST_API_URL, {
            query: query,
            variables: { id: parseInt(anilistId) }
        }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        if (monitor) monitor.record('AniList', 'Recommendations', Date.now() - start);

        const nodes = response.data?.data?.Media?.recommendations?.nodes || [];

        const results = nodes
            .filter(n => n.mediaRecommendation && n.mediaRecommendation.idMal)
            .map(n => ({
                id: `mal:${n.mediaRecommendation.idMal}`,
                title: n.mediaRecommendation.title.english || n.mediaRecommendation.title.romaji,
                type: n.mediaRecommendation.format === 'MOVIE' ? 'movie' : 'series',
                genres: n.mediaRecommendation.genres || [],
                tags: (n.mediaRecommendation.tags || []).map(t => t.name),
                _source: 'anilist'
            }));

        await cache.set(cacheKey, results, CACHE_TTL.ID_MAP);
        return results;
    } catch (e) {
        if (e.response && e.response.status === 429) {
            console.log(`[AniList] Rate Limited for ${tmdbId}. Skipping to avoid timeout.`);
            return [];
        }
        console.log(`[AniList] Error for ${tmdbId}: ${e.message}`);
        return [];
    }
}

async function getAniListTrending() {
    const cacheKey = `anilist:trending`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
    query {
        Page(page: 1, perPage: 20) {
            media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
                idMal
                title { romaji english }
                genres
                tags { name }
            }
        }
    }`;

    try {
        const response = await axios.post(ANILIST_API_URL, { query }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });

        const nodes = response.data?.data?.Page?.media || [];
        const results = nodes
            .filter(n => n.idMal)
            .map(n => ({
                id: `mal:${n.idMal}`,
                title: n.title.english || n.title.romaji,
                type: 'series',
                genres: n.genres || [],
                tags: (n.tags || []).map(t => t.name),
                _source: 'anilist_trending'
            }));

        await cache.set(cacheKey, results, CACHE_TTL.ANILIST_TRENDING);
        return results;
    } catch (e) {
        console.error('AniList Trending Error:', e.message);
        return [];
    }
}

module.exports = {
    getAniListRecommendations,
    getAniListTrending
};
