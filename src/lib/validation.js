const {
    VALID_ID_TYPES,
    VALID_ENGINES,
    VALID_ANIME_ENGINES,
    VALID_SORT_ORDERS,
    VALID_INPUT_MODES,
    VALID_LIBRARY_SOURCES
} = require('../config/constants');

function validateConfig(config) {
    const errors = [];

    const librarySource = config.librarySource || 'stremio';
    if (!VALID_LIBRARY_SOURCES.includes(librarySource)) {
        errors.push('Invalid librarySource');
    }

    if (librarySource === 'stremio') {
        if (!config.authKey || typeof config.authKey !== 'string' || config.authKey.length < 10) {
            errors.push('Invalid authKey');
        }
    } else if (librarySource === 'mdblist') {
        if (!config.mdblistApiKey || typeof config.mdblistApiKey !== 'string' || config.mdblistApiKey.length < 10) {
            errors.push('Invalid MDBlist API Key');
        }
    }

    if (!config.tmdbApiKey || typeof config.tmdbApiKey !== 'string' || config.tmdbApiKey.length < 10) {
        errors.push('Invalid TMDB API Key');
    }

    // Trakt Client ID validation (optional field, but must be valid format if provided)
    if (config.traktClientId && !/^[a-zA-Z0-9]{32,128}$/.test(config.traktClientId)) {
        errors.push('Invalid Trakt Client ID format');
    }

    if (config.movieIdType && !VALID_ID_TYPES.includes(config.movieIdType)) {
        errors.push('Invalid movieIdType');
    }
    if (config.seriesIdType && !VALID_ID_TYPES.includes(config.seriesIdType)) {
        errors.push('Invalid seriesIdType');
    }
    if (config.animeIdType && !VALID_ID_TYPES.includes(config.animeIdType)) {
        errors.push('Invalid animeIdType');
    }
    if (config.recEngine && !VALID_ENGINES.includes(config.recEngine)) {
        errors.push('Invalid recEngine');
    }
    if (config.animeEngine && !VALID_ANIME_ENGINES.includes(config.animeEngine)) {
        errors.push('Invalid animeEngine');
    }
    if (config.sortOrder && !VALID_SORT_ORDERS.includes(config.sortOrder)) {
        errors.push('Invalid sortOrder');
    }
    if (config.inputMode && !VALID_INPUT_MODES.includes(config.inputMode)) {
        errors.push('Invalid inputMode');
    }

    const minRating = parseInt(config.minRating);
    if (config.minRating && (isNaN(minRating) || minRating < 0 || minRating > 10)) {
        errors.push('Invalid minRating');
    }
    const sourceCount = parseInt(config.sourceCount);
    if (config.sourceCount && (isNaN(sourceCount) || sourceCount < 1 || sourceCount > 100)) {
        errors.push('Invalid sourceCount');
    }

    if (config.catalog_order && !Array.isArray(config.catalog_order)) {
        errors.push('Invalid catalog_order');
    }

    return errors;
}

/**
 * Sanitizes a custom catalog name to prevent XSS and injection attacks.
 * @param {string} name - The user-provided catalog name
 * @returns {string|null} - Sanitized name or null if invalid
 */
function sanitizeCatalogName(name) {
    if (!name || typeof name !== 'string') return null;

    // Trim and limit length
    let sanitized = name.trim().slice(0, 50);

    // Remove any HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Only allow alphanumeric, spaces, and basic punctuation
    // This regex allows: letters, numbers, spaces, hyphens, apostrophes, ampersands, parentheses
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-'&()]/g, '');

    // Collapse multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Return null if empty after sanitization
    return sanitized.length > 0 ? sanitized : null;
}

module.exports = {
    validateConfig,
    sanitizeCatalogName
};
