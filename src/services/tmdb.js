const axios = require('axios');
const { cache } = require('./cache');
const { TMDB_BASE_URL, CACHE_TTL } = require('../config/constants');

async function resolveTmdbId(stremioId, typeHint, apiKey, append = null, monitor = null) {
    let tmdbId = null;
    let resolvedType = typeHint;

    if (!apiKey) return null;

    const idCacheKey = `map:${stremioId}`;
    let cachedIdMap = await cache.get(idCacheKey);

    if (cachedIdMap) {
        tmdbId = cachedIdMap.id;
        resolvedType = cachedIdMap.type;
    } else {
        try {
            if (stremioId.startsWith('tmdb:')) {
                tmdbId = stremioId.split(':')[1];
            } else if (stremioId.startsWith('tt')) {
                const start = Date.now();
                const res = await axios.get(`${TMDB_BASE_URL}/find/${stremioId}`, {
                    params: { api_key: apiKey, external_source: 'imdb_id' }
                });
                if (monitor) monitor.record('TMDB', 'ID Resolution', Date.now() - start);
                const m = res.data.movie_results?.[0];
                const t = res.data.tv_results?.[0];
                if (m) { tmdbId = m.id; resolvedType = 'movie'; }
                else if (t) { tmdbId = t.id; resolvedType = 'series'; }
            } else if (stremioId.startsWith('tvdb:')) {
                const start = Date.now();
                const res = await axios.get(`${TMDB_BASE_URL}/find/${stremioId.split(':')[1]}`, {
                    params: { api_key: apiKey, external_source: 'tvdb_id' }
                });
                if (monitor) monitor.record('TMDB', 'ID Resolution', Date.now() - start);
                if (res.data.tv_results?.[0]) {
                    tmdbId = res.data.tv_results[0].id;
                    resolvedType = 'series';
                }
            } else if (stremioId.startsWith('kitsu:')) {
                const [src, id] = stremioId.split(':');
                const start = Date.now();
                const { ARM_API_URL } = require('../config/constants');
                const arm = await axios.get(ARM_API_URL, { params: { source: src, id } });
                if (monitor) monitor.record('ARM', 'ID Resolution', Date.now() - start);
                if (arm.data?.tmdb) { tmdbId = arm.data.tmdb; }
            } else if (stremioId.startsWith('mal:')) {
                const { getPlexAniBridgeData } = require('./plexanibridge');
                const id = stremioId.split(':')[1];
                const bridge = await getPlexAniBridgeData({ mal_id: id }, monitor);
                if (bridge) {
                    tmdbId = bridge.tmdb_movie_id || bridge.tmdb_show_id;
                    if (bridge.tmdb_movie_id) resolvedType = 'movie';
                    else if (bridge.tmdb_show_id) resolvedType = 'series';
                }
            }
        } catch (e) {
            console.log(`[Resolve] Error resolving ${stremioId}:`, e.message);
        }

        if (tmdbId) await cache.set(idCacheKey, { id: tmdbId, type: resolvedType }, CACHE_TTL.ID_MAP);
    }

    if (!tmdbId) return null;

    const endpoint = resolvedType === 'movie' ? 'movie' : 'tv';
    const detailsCacheKey = `details:${resolvedType}:${tmdbId}:${append || ''}`;

    const cachedDetails = await cache.get(detailsCacheKey);
    if (cachedDetails) return cachedDetails;

    try {
        const params = { api_key: apiKey };
        if (append) params.append_to_response = append;

        const start = Date.now();
        const details = await axios.get(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}`, { params });
        if (monitor) monitor.record('TMDB', 'Metadata/Cast', Date.now() - start);
        const d = details.data;

        const result = {
            id: d.id,
            type: resolvedType,
            title: d.title,
            name: d.name,
            overview: d.overview,
            poster_path: d.poster_path,
            backdrop_path: d.backdrop_path,
            release_date: d.release_date,
            first_air_date: d.first_air_date,
            vote_average: d.vote_average,
            popularity: d.popularity,
            genre_ids: d.genres?.map(g => g.id) || [],
            original_language: d.original_language,
            recommendations: d.recommendations?.results || [],
            credits: d.credits || d.combined_credits || null,
            external_ids: d.external_ids || null
        };

        await cache.set(detailsCacheKey, result, CACHE_TTL.DETAILS);
        return result;
    } catch (e) { return null; }
}

async function getDiscoveryItems(type, genreId, minRating, language, page, isAnime, apiKey, monitor = null) {
    const cacheKey = `discover:${type}:${genreId}:${minRating}:${language}:${page}:${isAnime}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
    const params = {
        api_key: apiKey,
        sort_by: 'popularity.desc',
        include_adult: false,
        include_video: false,
        page: page,
        'vote_count.gte': 10
    };

    if (isAnime) {
        params.with_genres = genreId ? `${genreId},16` : '16';
        params.with_original_language = 'ja';
    } else {
        if (genreId) params.with_genres = genreId;
        if (language && language !== 'any') params.with_original_language = language;
    }

    if (minRating && minRating > 0) params['vote_average.gte'] = minRating;

    try {
        const start = Date.now();
        const res = await axios.get(`${TMDB_BASE_URL}/${endpoint}`, { params });
        if (monitor) monitor.record('TMDB', 'Discovery/Fill', Date.now() - start);
        const results = res.data.results || [];
        await cache.set(cacheKey, results, CACHE_TTL.DISCOVERY);
        return results;
    } catch (e) {
        console.log(`[TMDB] Discovery failed for ${type}:`, e.message);
        return [];
    }
}

async function getWorksByPersonOptimized(personId, type, genreId, minRating, apiKey, monitor = null) {
    const cacheKey = `works_opt:${type}:${personId}:${genreId || 'all'}:${minRating || 0}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
    const params = {
        api_key: apiKey,
        with_people: personId,
        sort_by: 'vote_count.desc',
        page: 1,
        'vote_count.gte': 50
    };

    if (genreId) params.with_genres = genreId;
    if (minRating) params['vote_average.gte'] = minRating;

    try {
        const start = Date.now();
        const res = await axios.get(`${TMDB_BASE_URL}/${endpoint}`, { params });
        if (monitor) monitor.record('TMDB', 'Director/Cast Work', Date.now() - start);
        const results = res.data.results || [];
        await cache.set(cacheKey, results, CACHE_TTL.ID_MAP);
        return results.slice(0, 5);
    } catch (e) {
        console.log(`[TMDB] Works lookup failed for person ${personId}:`, e.message);
        return [];
    }
}

module.exports = {
    resolveTmdbId,
    getDiscoveryItems,
    getWorksByPersonOptimized
};
