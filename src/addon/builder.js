const crypto = require('crypto');
const { addonBuilder } = require('stremio-addon-sdk');
const { cache, PENDING_UPDATES } = require('../services/cache');
const { generateCatalog } = require('../lib/catalogGenerator');
const { getWatchHistory } = require('../lib/watchHistory');
const { getCatalogDisplayName, shuffle } = require('../lib/utils');
const { sanitizeCatalogName } = require('../lib/validation');
const {
    MOVIE_GENRES,
    SERIES_GENRES,
    MOVIE_GENRE_LIST,
    SERIES_GENRE_LIST,
    CATALOG_DEFINITIONS,
    SUPPORTED_CATALOG_IDS
} = require('../config/constants');

function createAddonInterface(config) {
    const catalogs = [];

    // Build a map of custom names from config
    const customNames = Object.create(null);
    if (config.catalog_order && Array.isArray(config.catalog_order)) {
        config.catalog_order.forEach(cat => {
            if (typeof cat === 'object' && cat.id && cat.customName) {
                // Server-side sanitization for security
                const sanitized = sanitizeCatalogName(cat.customName);
                if (sanitized) {
                    customNames[cat.id] = sanitized;
                }
            }
        });
    }

    if (config.catalog_order && Array.isArray(config.catalog_order) && config.catalog_order.length > 0) {
        config.catalog_order.forEach(cat => {
            const catId = typeof cat === 'string' ? cat : cat.id;
            if (catId && CATALOG_DEFINITIONS[catId]) {
                // Clone the catalog definition and apply custom name if present
                const catalogDef = { ...CATALOG_DEFINITIONS[catId] };
                if (customNames[catId]) {
                    catalogDef.name = customNames[catId];
                }
                catalogs.push(catalogDef);
            }
        });
    } else {
        const showStdMov = config.cat_std_mov !== false;
        const showStdSer = config.cat_std_ser !== false;
        const showAniMov = config.cat_ani_mov === true;
        const showAniSer = config.cat_ani_ser === true;
        const showCrewMov = config.cat_crew_mov === true;
        const showCrewSer = config.cat_crew_ser === true;

        if (showStdMov) catalogs.push({ ...CATALOG_DEFINITIONS['std_mov'], name: customNames['std_mov'] || CATALOG_DEFINITIONS['std_mov'].name });
        if (showStdSer) catalogs.push({ ...CATALOG_DEFINITIONS['std_ser'], name: customNames['std_ser'] || CATALOG_DEFINITIONS['std_ser'].name });
        if (showCrewMov) catalogs.push({ ...CATALOG_DEFINITIONS['crew_mov'], name: customNames['crew_mov'] || CATALOG_DEFINITIONS['crew_mov'].name });
        if (showCrewSer) catalogs.push({ ...CATALOG_DEFINITIONS['crew_ser'], name: customNames['crew_ser'] || CATALOG_DEFINITIONS['crew_ser'].name });
        if (showAniMov) catalogs.push({ ...CATALOG_DEFINITIONS['ani_mov'], name: customNames['ani_mov'] || CATALOG_DEFINITIONS['ani_mov'].name });
        if (showAniSer) catalogs.push({ ...CATALOG_DEFINITIONS['ani_ser'], name: customNames['ani_ser'] || CATALOG_DEFINITIONS['ani_ser'].name });
    }

    const configHash = crypto.createHash('sha256').update(JSON.stringify({
        mode: config.inputMode,
        lang: config.language,
        rpdb: config.rpdbKey,
        eras: config.era,
        order: config.catalog_order || 'default',
        animeEngine: config.animeEngine || 'tmdb'
    })).digest('hex').slice(0, 12);

    const librarySourceLabel = config.librarySource === 'mdblist' ? 'MDBList' : 'Stremio';
    const recEngineLabel = config.recEngine === 'both' ? 'TMDB + Trakt' : (config.recEngine === 'trakt' ? 'Trakt' : 'TMDB');
    const animeEngineLabel = config.animeEngine === 'anilist' ? 'AniList' : 'TMDB';
    const modeLabel = config.inputMode === 'recent' ? 'Adaptive' : 'Discovery';
    const languageLabel = config.language === 'any' || !config.language ? 'Any' : config.language.toUpperCase();
    const eraLabel = config.era === 'all' || !config.era ? 'All' : config.era.split(',').map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
    const rpdbLabel = config.rpdbKey ? 'On' : 'Off';
    const minRatingLabel = config.minRating > 0 ? `${config.minRating}+` : 'None';
    const hideWatchedLabel = config.hideWatched ? 'On' : 'Off';
    const fillGapsLabel = config.fillGaps ? 'On' : 'Off';
    const animeFillLabel = config.animeFillGaps ? 'On' : 'Off';
    const movieIdLabel = (config.movieIdType || 'tmdb').toUpperCase();
    const seriesIdLabel = (config.seriesIdType || 'tvdb').toUpperCase();
    const animeIdLabel = (config.animeIdType || 'kitsu').toUpperCase();
    const sortLabel = {
        'random': 'Random',
        'rating_desc': 'Rating',
        'date_desc': 'Date',
        'popularity_desc': 'Popularity'
    }[config.sortOrder] || 'Random';

    const description = [
        `📚 Library: ${librarySourceLabel} | Recs: ${recEngineLabel} | Anime: ${animeEngineLabel}`,
        `⚙️ Mode: ${modeLabel} | Language: ${languageLabel} | Eras: ${eraLabel}`,
        `🎨 RPDB: ${rpdbLabel} | Min Rating: ${minRatingLabel} | Hide Watched: ${hideWatchedLabel}`,
        `🔄 Gap Fill: ${fillGapsLabel} | Anime Fill: ${animeFillLabel} | Sort: ${sortLabel}`,
        `🆔 Movies: ${movieIdLabel} | Series: ${seriesIdLabel} | Anime: ${animeIdLabel}`
    ].join('\n');

    const builder = new addonBuilder({
        id: `org.stremio.personalizedrecs.${configHash}`,
        version: '8.3.0',
        name: 'Cinemind',
        logo: 'https://i.imgur.com/VuuIDMY.png',
        background: 'https://i.imgur.com/VuuIDMY.png',
        description: description,
        resources: ['catalog'],
        types: ['movie', 'series'],
        catalogs: catalogs,
        behaviorHints: { configurable: true }
    });

    builder.defineCatalogHandler(async ({ type, id, extra }) => {
        if (!SUPPORTED_CATALOG_IDS.includes(id)) return { metas: [] };

        const isAnimeCatalog = id.includes('anime');
        const isCrewCatalog = id.includes('crew');
        const strategy = isCrewCatalog ? 'crew' : 'content';

        const settingsHash = crypto.createHash('sha256').update(JSON.stringify({
            mode: config.inputMode, rating: config.minRating, era: config.era,
            lang: config.language,
            rpdb: config.rpdbKey, mId: config.movieIdType, sId: config.seriesIdType,
            aId: config.animeIdType, sort: config.sortOrder, engine: config.recEngine,
            animeEngine: config.animeEngine
        })).digest('hex');

        const cacheKeyId = config.librarySource === 'mdblist' ? config.mdblistApiKey : config.authKey;
        const cacheKey = `catalog:${config.librarySource || 'stremio'}:${cacheKeyId}:${id}:${extra.genre || 'all'}:${settingsHash}`;
        const cachedResult = await cache.get(cacheKey);

        let requiredGenreId = null;
        if (extra && extra.genre) {
            if (type === 'movie' && MOVIE_GENRES[extra.genre]) requiredGenreId = MOVIE_GENRES[extra.genre];
            else if (type === 'series' && SERIES_GENRES[extra.genre]) requiredGenreId = SERIES_GENRES[extra.genre];
        }

        let effectiveLimit = parseInt(config.sourceCount);
        if (extra.genre) effectiveLimit = Math.max(effectiveLimit, 20);
        if (isAnimeCatalog) effectiveLimit = 10000;
        if (isCrewCatalog) effectiveLimit = Math.min(effectiveLimit, 10);

        const runUpdate = async () => {
            if (PENDING_UPDATES.has(cacheKey)) return;
            PENDING_UPDATES.add(cacheKey);

            console.log(`[BACKGROUND] Refreshing ${id} (${strategy}) for user...`);
            try {
                const { selectedItems, allLibraryIds } = await getWatchHistory(config, effectiveLimit, type, config.inputMode);
                if (selectedItems.length > 0) {
                    const result = await generateCatalog(config, type, requiredGenreId, allLibraryIds, selectedItems, isAnimeCatalog, strategy, id);
                    await cache.set(cacheKey, { ...result, _timestamp: Date.now() }, 86400000);
                    console.log(`[BACKGROUND] Updated ${getCatalogDisplayName(id)}`);
                }
            } catch (e) { console.error("[BACKGROUND] Error:", e.message); }
            finally { PENDING_UPDATES.delete(cacheKey); }
        };

        if (cachedResult) {
            const age = Date.now() - (cachedResult._timestamp || 0);
            if (age > 14400000) {
                console.log(`[SWR] Serving Stale ${getCatalogDisplayName(id)} + Update`);
                runUpdate();
            } else {
                console.log(`[CACHE HIT] Serving Fresh ${getCatalogDisplayName(id)}`);
            }

            if (config.sortOrder === 'random') {
                const shuffled = shuffle([...cachedResult.metas]);
                return { metas: shuffled };
            }
            return cachedResult;
        }

        console.log(`[COLD MISS] Generating ${getCatalogDisplayName(id)}...`);
        const { selectedItems, allLibraryIds } = await getWatchHistory(config, effectiveLimit, type, config.inputMode);
        console.log(`[DEBUG] ${getCatalogDisplayName(id)}: selectedItems=${selectedItems.length}, allLibraryIds=${allLibraryIds.size}, hasFill=${isAnimeCatalog ? config.animeFillGaps : config.fillGaps}`);

        const hasFillEnabled = isAnimeCatalog ? config.animeFillGaps : config.fillGaps;
        if (selectedItems.length === 0 && !hasFillEnabled) {
            console.log(`\nCATALOG - ${getCatalogDisplayName(id)}:`);
            console.log('┌──────────────────────────────────────────────────────────────┐');
            console.log('│       Insufficient Library History & Gap Fill Disabled       │');
            console.log('└──────────────────────────────────────────────────────────────┘\n');
            return { metas: [] };
        }

        const result = await generateCatalog(config, type, requiredGenreId, allLibraryIds, selectedItems, isAnimeCatalog, strategy, id);
        console.log(`[DEBUG] ${getCatalogDisplayName(id)}: final metas=${result.metas.length}`);
        await cache.set(cacheKey, { ...result, _timestamp: Date.now() }, 86400000);
        return result;
    });

    return builder.getInterface();
}

module.exports = {
    createAddonInterface
};
