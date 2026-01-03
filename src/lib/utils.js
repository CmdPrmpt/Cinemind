async function batchMap(items, batchSize, fn) {
    const results = [];
    const effectiveBatchSize = batchSize || 20;

    for (let i = 0; i < items.length; i += effectiveBatchSize) {
        const batch = items.slice(i, i + effectiveBatchSize);
        const batchResults = await Promise.all(batch.map(item =>
            fn(item).catch(err => {
                if (err.response && err.response.status !== 404) {
                    console.error(`Batch Error: ${err.message}`);
                }
                return null;
            })
        ));
        results.push(...batchResults);
    }
    return results.filter(r => r !== null);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function checkEra(dateStr, eraOption) {
    if (!dateStr || !eraOption || eraOption === 'all' || eraOption === '') return true;

    const year = parseInt(dateStr.split('-')[0]);
    if (isNaN(year)) return false;

    const selectedEras = eraOption.split(',');
    return selectedEras.some(era => {
        if (era === 'modern') return year >= 2010;
        if (era === '2000s') return year >= 2000 && year < 2010;
        if (era === '90s') return year >= 1990 && year < 2000;
        if (era === 'classic') return year < 1990;
        return false;
    });
}

function getCatalogDisplayName(id) {
    const map = {
        'personalized_recs_movies': 'Recommended Movies',
        'personalized_recs_series': 'Recommended Series',
        'personalized_recs_anime_movies': 'Recommended Anime Movies',
        'personalized_recs_anime_series': 'Recommended Anime Series',
        'crew_recs_movies': 'Director/Cast Movies',
        'crew_recs_series': 'Director/Cast Series',
        'personalized_crew_movies': 'Director/Cast Movies',
        'personalized_crew_series': 'Director/Cast Series'
    };
    return map[id] || id;
}

function isAnimeItem(item) {
    if (!item) return false;
    const isAnimation = item.genre_ids?.includes(16);
    const isAsian = item.original_language === 'ja' ||
        item.original_language === 'zh' ||
        item.original_language === 'ko';
    return isAnimation && isAsian;
}

// CVE-006: Secure URL parameter parsing with prototype pollution protection
function parseExtraFromUrl(url) {
    const match = url.match(/\/catalog\/[^\/]+\/[^\/]+\/([^\/]+)\.json/);
    if (!match) return {};

    const extraStr = match[1];
    const extra = Object.create(null);  // Prevent prototype pollution

    // Allowed parameters whitelist
    const ALLOWED_PARAMS = ['genre', 'skip', 'search'];

    try {
        extraStr.split('&').forEach(part => {
            const eqIndex = part.indexOf('=');
            if (eqIndex === -1) return;

            const key = part.substring(0, eqIndex);

            // Prototype pollution protection
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                console.error(`[Security] Prototype pollution attempt blocked: ${key}`);
                return;
            }

            // Whitelist validation
            if (!ALLOWED_PARAMS.includes(key)) {
                return;  // Silently ignore unknown params
            }

            const value = decodeURIComponent(part.substring(eqIndex + 1));

            // Basic sanitization
            if (key === 'skip') {
                const numValue = parseInt(value, 10);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 10000) {
                    extra[key] = numValue;
                }
            } else if (key === 'genre' || key === 'search') {
                // Max length validation
                if (value.length <= 100) {
                    extra[key] = value;
                }
            }
        });
    } catch (e) {
        console.error('[Security] Error parsing URL parameters:', e.message);
        return Object.create(null);
    }

    return extra;
}

module.exports = {
    batchMap,
    shuffle,
    checkEra,
    getCatalogDisplayName,
    isAnimeItem,
    parseExtraFromUrl
};
