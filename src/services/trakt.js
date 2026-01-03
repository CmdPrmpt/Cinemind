const axios = require('axios');
const { cache } = require('./cache');
const { TRAKT_BASE_URL, CACHE_TTL } = require('../config/constants');

async function getTraktRecommendations(tmdbId, imdbId, type, traktClientId, monitor = null) {
    if (!traktClientId) return [];

    const lookupId = imdbId || tmdbId;
    const cacheKey = `trakt_recs:${type}:${lookupId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const endpoint = type === 'movie' ? 'movies' : 'shows';

    try {
        let traktId = lookupId;
        if (!imdbId && !isNaN(tmdbId)) {
            const start = Date.now();
            const search = await axios.get(
                `${TRAKT_BASE_URL}/search/tmdb/${tmdbId}?type=${type === 'movie' ? 'movie' : 'show'}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'trakt-api-version': '2',
                        'trakt-api-key': traktClientId
                    }
                }
            );
            if (monitor) monitor.record('Trakt', 'ID Conversion', Date.now() - start);
            if (search.data && search.data[0]) {
                traktId = search.data[0][type === 'movie' ? 'movie' : 'show'].ids.slug;
            }
        }

        const startRelated = Date.now();
        const response = await axios.get(`${TRAKT_BASE_URL}/${endpoint}/${traktId}/related`, {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': traktClientId
            },
            params: { limit: 10 }
        });
        if (monitor) monitor.record('Trakt', 'Recommendations', Date.now() - startRelated);

        const results = response.data.map(item => ({
            id: item.ids.tmdb,
            type: type,
            _source: 'trakt'
        })).filter(i => i.id);

        await cache.set(cacheKey, results, CACHE_TTL.ID_MAP);
        return results;
    } catch (e) {
        console.log(`[Trakt] Recommendations failed for ${lookupId}:`, e.message);
        return [];
    }
}

module.exports = {
    getTraktRecommendations
};

