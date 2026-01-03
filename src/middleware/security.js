const helmet = require('helmet');

const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            // CVE-013: Restrict image sources to specific domains instead of all https:
            imgSrc: ["'self'", "data:", "blob:", "https://image.tmdb.org", "https://i.imgur.com", "https://www.themoviedb.org"],
            connectSrc: ["'self'", "https://api.themoviedb.org", "https://api.trakt.tv", "https://graphql.anilist.co", "https://api.mdblist.com", "https://api.stremio.com", "https://api.strem.io"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// CVE-001: Strict origin whitelist only - no referer bypass
const ALLOWED_ORIGINS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/[a-z]+\.stremio\.com$/,  // Only *.stremio.com subdomains
    /^https:\/\/app\.strem\.io$/,
    /^https:\/\/web\.stremio\.com$/,
    /^stremio:\/\//
];

function isAllowedOrigin(origin) {
    if (!origin) return false;  // Changed: no longer allow null/undefined origins by default
    return ALLOWED_ORIGINS.some(pattern => {
        if (pattern instanceof RegExp) return pattern.test(origin);
        return origin === pattern;
    });
}

function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    const path = req.path;

    // Addon routes should be accessible from anywhere (other addons, Stremio clients, etc.)
    // These are read-only and don't expose sensitive data
    const isAddonRoute = path.includes('/manifest.json') ||
        path.includes('/catalog/') ||
        path.includes('/meta/') ||
        path.includes('/stream/') ||
        path.includes('/subtitles/');

    if (isAddonRoute) {
        // Allow all origins for addon routes - required for cross-addon compatibility
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (isAllowedOrigin(origin)) {
        // Strict origin check for landing page and API routes
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');  // Prevent cache poisoning
    } else if (!origin) {
        // Same-origin requests (no Origin header) - allow for navigation
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    // If origin exists but not allowed for non-addon routes, don't set CORS headers

    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');  // 24 hours

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
}

module.exports = {
    securityHeaders,
    corsMiddleware
};
