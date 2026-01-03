const { resolveTmdbId, getDiscoveryItems, getWorksByPersonOptimized } = require('../services/tmdb');
const { getTraktRecommendations } = require('../services/trakt');
const { getAniListRecommendations, getAniListTrending } = require('../services/anilist');
const { checkAnimeViaApi } = require('../services/plexanibridge');
const { convertToTargetIds } = require('./idConverter');
const { batchMap, shuffle, checkEra, getCatalogDisplayName, isAnimeItem } = require('./utils');
const PerformanceMonitor = require('./performance');


async function generateCatalog(config, type, requiredGenreId, allLibraryIds, selectedItems, isAnimeCatalog, strategy = 'content', catalogId = null) {
    const prefix = isAnimeCatalog ? '[ANIME] ' : '';
    const reportId = catalogId || `${prefix}${type}`;
    const monitor = new PerformanceMonitor(reportId);

    const tmdbKey = config.tmdbApiKey;

    let appendType = null;
    if (strategy === 'content') {
        if (!isAnimeCatalog) {
            if (config.recEngine !== 'trakt') appendType = 'recommendations';
            if (config.recEngine !== 'tmdb') appendType = appendType ? 'recommendations,external_ids' : 'external_ids';

            if (config.hideWatched && appendType && !appendType.includes('external_ids')) {
                appendType += ',external_ids';
            } else if (config.hideWatched && !appendType) {
                appendType = 'recommendations,external_ids';
            }
        }
    } else if (strategy === 'crew') {
        appendType = 'credits';
        if (config.hideWatched) appendType += ',external_ids';
    }

    const resolvedBatches = await batchMap(selectedItems, 20, async (item) => {
        const resolved = await resolveTmdbId(item._id, item.type, tmdbKey, appendType, monitor);
        if (resolved && (resolved.type === 'unknown' || resolved.type === type)) {
            const year = item.year || (item.releaseInfo ? item.releaseInfo.split('-')[0] : '2000');
            return {
                ...resolved,
                name: item.name || 'Unknown',
                title: item.name,
                release_date: `${year}-01-01`
            };
        }
        return null;
    });

    let resolvedHistory = resolvedBatches.filter(i => i !== null);

    let seedItems = [];
    if (isAnimeCatalog) {
        console.log(`[ANIME DEBUG] Identifying anime seeds from ${resolvedHistory.length} history items...`);
        const animeChecks = await Promise.all(resolvedHistory.map(async (item) => {
            const anilistId = await checkAnimeViaApi(item, monitor);
            return anilistId ? { ...item, anilistId } : null;
        }));

        const uniqueSeeds = new Map();
        animeChecks.forEach(i => {
            if (i && i.anilistId && !uniqueSeeds.has(i.anilistId)) {
                uniqueSeeds.set(i.anilistId, i);
            }
        });
        seedItems = Array.from(uniqueSeeds.values());
        console.log(`[ANIME DEBUG] Found ${seedItems.length} unique valid anime seeds from ${animeChecks.filter(x => x).length} matches.`);
    } else {
        seedItems = resolvedHistory.filter(item => !isAnimeItem(item));
    }

    const batchSize = isAnimeCatalog ? 5 : 20;
    const tmdbResults = await batchMap(seedItems, batchSize, async (resolved) => {

        if (isAnimeCatalog) await new Promise(r => setTimeout(r, 500));
        const results = [];

        if (strategy === 'content') {
            if (isAnimeCatalog) {
                let aniListRecs = [];
                if (resolved.anilistId) {
                    aniListRecs = await getAniListRecommendations(resolved.id, resolved.anilistId, monitor);
                } else {
                    aniListRecs = await getAniListRecommendations(resolved.id, null, monitor);
                }
                results.push(...aniListRecs);
            } else {
                if (config.recEngine !== 'trakt') {
                    if (resolved.recommendations && resolved.recommendations.length > 0) {
                        results.push(...resolved.recommendations);
                    }
                }
                if (config.recEngine !== 'tmdb') {
                    const imdbId = resolved.external_ids?.imdb_id;
                    const traktRecs = await getTraktRecommendations(resolved.id, imdbId, type, config.traktClientId, monitor);
                    results.push(...traktRecs);
                }
            }
        }

        if (strategy === 'crew') {
            const credits = resolved.credits;
            const peopleIds = [];
            if (credits && type === 'movie' && credits.crew) {
                const directors = credits.crew.filter(c => c.job === 'Director').slice(0, 1);
                directors.forEach(d => peopleIds.push(d.id));
            }
            if (credits && credits.cast) {
                const topCast = credits.cast.slice(0, 2);
                topCast.forEach(c => peopleIds.push(c.id));
            }
            for (const personId of peopleIds) {
                const works = await getWorksByPersonOptimized(personId, type, requiredGenreId, config.minRating, tmdbKey);
                results.push(...works);
            }
        }
        return results;
    });

    const allRecs = tmdbResults.flat();
    const uniqueMap = new Map();
    const rawItems = [];

    let excludedGenres = new Set();
    if (config.catalog_order && Array.isArray(config.catalog_order)) {


        const catConfig = config.catalog_order.find(c => {
            if (!c || typeof c !== 'object') return false;

            return c.id === reportId || c.catalogId === reportId;
        });
        if (catConfig && catConfig.excludedGenres && Array.isArray(catConfig.excludedGenres)) {
            catConfig.excludedGenres.forEach(g => excludedGenres.add(g));
        }
    }

    const { TMDB_GENRE_MAP } = require('../config/genres');

    const isExcluded = (item) => {
        if (excludedGenres.size === 0) return false;

        if (item.genre_ids && Array.isArray(item.genre_ids)) {
            for (const id of item.genre_ids) {
                const name = TMDB_GENRE_MAP[id];
                if (name && excludedGenres.has(name)) return true;
            }
        }

        if (item.genres && Array.isArray(item.genres)) {
            for (const g of item.genres) {

                const name = typeof g === 'string' ? g : g.name;
                if (name && excludedGenres.has(name)) return true;
            }
        }

        if (item.tags && Array.isArray(item.tags)) {
            for (const tag of item.tags) {


                const name = typeof tag === 'string' ? tag : tag.name;
                if (name && excludedGenres.has(name)) return true;
            }
        }

        return false;
    };

    const isItemValid = (r) => {
        if (!r.id) return false;

        if (isExcluded(r)) {

            return false;
        }

        const isExternalSource = r._source === 'trakt' || r._source === 'anilist';

        if (!isExternalSource) {
            const isAnime = isAnimeItem(r);
            if (isAnimeCatalog) {
                if (!isAnime) return false;
            } else {
                if (isAnime) return false;
            }

            if (requiredGenreId && (!r.genre_ids || !r.genre_ids.includes(requiredGenreId))) return false;

            if (config.minRating > 0 && (r.vote_average || 0) < parseFloat(config.minRating)) return false;
            const date = r.release_date || r.first_air_date;
            if (!checkEra(date, config.era)) return false;
            if (!isAnimeCatalog && config.language && config.language !== 'any' && r.original_language !== config.language) return false;
        }

        if (config.hideWatched) {
            const idStr = String(r.id);
            if (idStr.includes(':') && allLibraryIds.has(idStr)) return false;
            if (allLibraryIds.has(`tmdb:${r.id}`)) return false;
            if (r.imdb_id && allLibraryIds.has(r.imdb_id)) return false;
            if (r.external_ids?.imdb_id && allLibraryIds.has(r.external_ids.imdb_id)) return false;
            if (r.external_ids?.tvdb_id && allLibraryIds.has(`tvdb:${r.external_ids.tvdb_id}`)) return false;
        }

        if (String(r.id).startsWith('mal:') || String(r.id).startsWith('kitsu:')) return true;
        return true;
    };

    for (const r of allRecs) {
        if (!uniqueMap.has(r.id) && isItemValid(r)) {
            uniqueMap.set(r.id, r);
            rawItems.push(r);
        }
    }

    const fullyResolvedItems = await batchMap(rawItems, 25, async (item) => {

        if (item._source === 'trakt' || item._source === 'anilist') {
            const details = await resolveTmdbId(
                String(item.id).startsWith('mal:') ? item.id : `tmdb:${item.id}`,
                type,
                tmdbKey,
                config.hideWatched ? 'external_ids' : null,
                monitor
            );
            if (!details) console.log(`[Resolve] Failed to resolve ${item._source} item: ${item.id}`);
            if (details) return { ...details, _source: item._source };
            return null;
        }



        const needsExternalIds = config.hideWatched && (
            (type === 'series' && !item.external_ids?.tvdb_id) ||
            (type === 'movie' && !item.external_ids && !item.imdb_id)
        );
        if (needsExternalIds) {
            const details = await resolveTmdbId(
                `tmdb:${item.id}`,
                type,
                tmdbKey,
                'external_ids',
                monitor
            );
            if (details) {
                return { ...item, external_ids: details.external_ids, imdb_id: details.external_ids?.imdb_id };
            }
        }

        return item;
    });

    let finalItems = fullyResolvedItems.filter(r => {
        if (!r) return false;

        // Apply genre exclusions to resolved items (especially important for Trakt/AniList which now have genre_ids)
        if (isExcluded(r)) {
            console.log(`[Filter] Dropped ${r.title || r.name}: Excluded genre`);
            return false;
        }

        if (config.hideWatched) {
            const title = r.title || r.name || 'Unknown';
            const tmdbIdToCheck = `tmdb:${r.id}`;

            const env = require('../config/env');
            if (env.DEBUG) {
                console.log(`[DEBUG HideWatched] Checking "${title}":`);
                console.log(`  - r.id = ${r.id} (type: ${typeof r.id})`);
                console.log(`  - Checking tmdb: format = "${tmdbIdToCheck}"`);
                console.log(`  - allLibraryIds.has("${tmdbIdToCheck}") = ${allLibraryIds.has(tmdbIdToCheck)}`);
                console.log(`  - r.imdb_id = ${r.imdb_id}`);
                console.log(`  - r.external_ids = ${JSON.stringify(r.external_ids)}`);
            }

            if (allLibraryIds.has(tmdbIdToCheck)) {
                console.log(`[HideWatched] Filtered: ${title} (${tmdbIdToCheck})`);
                return false;
            }

            if (r.imdb_id && allLibraryIds.has(r.imdb_id)) {
                console.log(`[HideWatched] Filtered: ${title} (${r.imdb_id})`);
                return false;
            }

            if (r.external_ids?.imdb_id && allLibraryIds.has(r.external_ids.imdb_id)) {
                console.log(`[HideWatched] Filtered: ${title} (ext: ${r.external_ids.imdb_id})`);
                return false;
            }

            if (r.external_ids?.tvdb_id && allLibraryIds.has(`tvdb:${r.external_ids.tvdb_id}`)) {
                console.log(`[HideWatched] Filtered: ${title} (tvdb:${r.external_ids.tvdb_id})`);
                return false;
            }
        }

        const isExternalSource = r._source === 'trakt' || r._source === 'anilist';
        const isAnime = isAnimeItem(r) || (isExternalSource && isAnimeCatalog);

        if (isAnimeCatalog && !isAnime) {
            console.log(`[Filter] Dropped ${r.title}: Not Anime (Genre: ${r.genre_ids}, Lang: ${r.original_language})`);
            return false;
        }
        if (!isAnimeCatalog && isAnime) return false;

        if (requiredGenreId && (!r.genre_ids || !r.genre_ids.includes(requiredGenreId))) return false;

        if (config.minRating > 0 && (r.vote_average || 0) < parseFloat(config.minRating)) {
            console.log(`[Filter] Dropped ${r.title}: Rating ${r.vote_average} < ${config.minRating}`);
            return false;
        }

        const date = r.release_date || r.first_air_date;
        if (!checkEra(date, config.era)) {
            return false;
        }

        return true;
    });

    let shouldFill = false;
    const hasHistory = selectedItems.length > 0;
    const isGenreSpecific = !!requiredGenreId;
    const currentCount = finalItems.length;

    const configAllowsFill = isAnimeCatalog ? config.animeFillGaps : config.fillGaps;

    if (configAllowsFill) {
        if (!hasHistory) { shouldFill = true; }
        else if (isGenreSpecific) { shouldFill = true; }
        else if (currentCount < 15) { shouldFill = true; }
    }

    if (strategy === 'content' && shouldFill) {
        console.log(`[ANIME DEBUG] Gap fill triggered. isAnimeCatalog=${isAnimeCatalog}, animeFillGaps=${config.animeFillGaps}, finalItems before fill=${finalItems.length}`);

        if (isAnimeCatalog && config.animeFillGaps) {
            console.log(`[AutoFill] Fetching AniList Trending to fill gaps...`);
            const trending = await getAniListTrending();
            console.log(`[ANIME DEBUG] AniList trending returned ${trending.length} items`);
            for (const item of trending) {
                if (finalItems.length >= 40) break;
                if (!finalItems.some(f => f.id === item.id) && isItemValid(item)) {
                    finalItems.push(item);
                }
            }
            console.log(`[ANIME DEBUG] After gap fill: ${finalItems.length} items`);
        } else if (config.fillGaps && !isAnimeCatalog) {
            console.log(`[AutoFill] Using TMDB Discovery to fill gaps...`);
            let page = 1;
            while (finalItems.length < 40 && page <= 5) {
                const discovery = await getDiscoveryItems(type, requiredGenreId, config.minRating, config.language, page, isAnimeCatalog, tmdbKey, monitor);
                for (const item of discovery) {
                    if (finalItems.length >= 40) break;
                    if (!finalItems.some(f => f.id === item.id) && isItemValid(item)) {
                        finalItems.push(item);
                    }
                }
                page++;
            }
        }
    }

    const standardToConvert = finalItems.slice(0, 50);
    const convertedStandard = await convertToTargetIds(standardToConvert, type, config);
    let mergedList = [...convertedStandard];

    if (config.sortOrder === 'rating_desc') {
        mergedList.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (config.sortOrder === 'date_desc') {
        mergedList.sort((a, b) => new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0));
    } else if (config.sortOrder === 'popularity_desc') {
        mergedList.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (config.sortOrder === 'random') {
        shuffle(mergedList);
    }

    const gapFillCount = shouldFill ? (finalItems.length - currentCount) : undefined;
    monitor.printSummary(gapFillCount);

    return {
        metas: mergedList.map(i => {
            let posterUrl = i.poster_path ? `https://image.tmdb.org/t/p/w500${i.poster_path}` : null;
            if (config.rpdbKey && i.imdb_id) {
                posterUrl = `https://api.ratingposterdb.com/${config.rpdbKey}/imdb/poster-default/${i.imdb_id}.jpg`;
            }
            return {
                id: i.final_id || `tmdb:${i.id}`,
                type: type,
                name: i.title || i.name,
                poster: posterUrl,
                description: i.overview || '',
                releaseInfo: (i.release_date || i.first_air_date || '').split('-')[0],
                imdbRating: i.vote_average ? i.vote_average.toFixed(1) : null
            };
        })
    };
}

module.exports = {
    generateCatalog
};
