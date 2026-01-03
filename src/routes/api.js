const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();

const { encryptConfig, encryptSensitiveFields, validatePassword } = require('../services/crypto');
const { validateConfig } = require('../lib/validation');
const { STREMIO_API_URL, MDBLIST_API_URL } = require('../config/constants');
const env = require('../config/env');

const userActivity = new Map();
const MAX_ACTIVITY_SIZE = 100000;


function trackUserActivity(hash) {
    if (userActivity.size >= MAX_ACTIVITY_SIZE) {

        const firstKey = userActivity.keys().next().value;
        userActivity.delete(firstKey);
    }
    userActivity.set(hash, Date.now());
}

const CLEANUP_INTERVAL = 60 * 60 * 1000;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [hash, timestamp] of userActivity) {
        if (now - timestamp > MAX_AGE) {
            userActivity.delete(hash);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`[Cleanup] Removed ${cleaned} stale user activity entries`);
    }
}, CLEANUP_INTERVAL);

// Token-based brute-force protection for password-protected configs
const tokenFailures = new Map(); // { tokenHash: { count, lockedUntil, lastAttempt } }
const MAX_FAILURES_SIZE = 10000;

function getTokenLockStatus(token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
    const failure = tokenFailures.get(hash);

    if (!failure) return { locked: false, hash };

    // Clear old entries (no attempts in 1 hour)
    if (Date.now() - failure.lastAttempt > 60 * 60 * 1000) {
        tokenFailures.delete(hash);
        return { locked: false, hash };
    }

    if (failure.lockedUntil && failure.lockedUntil > Date.now()) {
        const waitSeconds = Math.ceil((failure.lockedUntil - Date.now()) / 1000);
        return { locked: true, hash, waitSeconds, count: failure.count };
    }

    return { locked: false, hash, count: failure.count };
}

function recordTokenFailure(hash) {
    if (tokenFailures.size >= MAX_FAILURES_SIZE) {
        const firstKey = tokenFailures.keys().next().value;
        tokenFailures.delete(firstKey);
    }

    const current = tokenFailures.get(hash) || { count: 0 };
    current.count++;
    current.lastAttempt = Date.now();

    // Progressive lockout: 5 failures = 1 min, 10 = 5 min, 15+ = 30 min
    if (current.count >= 15) {
        current.lockedUntil = Date.now() + 30 * 60 * 1000;
    } else if (current.count >= 10) {
        current.lockedUntil = Date.now() + 5 * 60 * 1000;
    } else if (current.count >= 5) {
        current.lockedUntil = Date.now() + 60 * 1000;
    }

    tokenFailures.set(hash, current);

    // Log potential brute-force attempts
    if (current.count === 5 || current.count === 10 || current.count === 20) {
        console.warn(`[SECURITY] Brute-force attempt detected: ${current.count} failures for token ${hash}`);
    }
}

function clearTokenFailures(hash) {
    tokenFailures.delete(hash);
}








router.post('/validate-user', async (req, res) => {
    const { authKey } = req.body;
    if (!authKey) return res.json({ valid: false, error: "Key missing" });

    try {
        const response = await axios.post(STREMIO_API_URL, {
            authKey: authKey,
            collection: "libraryItem",
            limit: 1
        }, { timeout: 5000 });

        if (response.data.result && Array.isArray(response.data.result)) {
            return res.json({ valid: true });
        }
        return res.json({ valid: false, error: "Invalid Key" });
    } catch (e) {
        return res.json({ valid: false, error: "Connection Failed" });
    }
});


router.post('/validate-tmdb', async (req, res) => {
    const { tmdbKey } = req.body;
    if (!tmdbKey) return res.json({ valid: false, error: "Key missing" });

    try {
        await axios.get('https://api.themoviedb.org/3/configuration', {
            params: { api_key: tmdbKey },
            timeout: 5000
        });
        return res.json({ valid: true });
    } catch (e) {
        if (e.response && e.response.status === 401) {
            return res.json({ valid: false, error: "Invalid API Key" });
        }
        return res.json({ valid: false, error: "Connection Failed" });
    }
});

router.post('/validate-trakt', async (req, res) => {
    const { traktClientId } = req.body;
    if (!traktClientId) return res.json({ valid: false, error: "Client ID missing" });

    // Basic format validation
    if (!/^[a-zA-Z0-9]{32,128}$/.test(traktClientId)) {
        return res.json({ valid: false, error: "Invalid format (must be 32-128 alphanumeric characters)" });
    }

    try {
        // Test by fetching a public endpoint with the client ID
        await axios.get('https://api.trakt.tv/movies/trending?limit=1', {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': traktClientId
            },
            timeout: 5000
        });
        return res.json({ valid: true });
    } catch (e) {
        if (e.response && (e.response.status === 401 || e.response.status === 403)) {
            return res.json({ valid: false, error: "Invalid Client ID" });
        }
        return res.json({ valid: false, error: "Connection Failed" });
    }
});


router.post('/validate-mdblist', async (req, res) => {
    const { mdblistKey } = req.body;
    if (!mdblistKey) return res.json({ valid: false, error: "Key missing" });

    try {
        const response = await axios.get(`${MDBLIST_API_URL}/user`, {
            params: { apikey: mdblistKey },
            timeout: 5000
        });

        if (response.data && (response.data.id || response.data.username)) {
            return res.json({ valid: true, username: response.data.username });
        }
        return res.json({ valid: false, error: "Invalid API Key" });
    } catch (e) {
        if (e.response && (e.response.status === 401 || e.response.status === 403)) {
            return res.json({ valid: false, error: "Invalid API Key" });
        }
        return res.json({ valid: false, error: "Connection Failed" });
    }
});


router.post('/encrypt-config', (req, res) => {
    const {
        authKey, movieIdType, seriesIdType, animeIdType, inputMode, minRating, era,
        sourceCount, hideWatched, fillGaps, animeFillGaps, sortOrder, language, rpdbKey, recEngine,
        catalog_order, animeEngine, tmdbApiKey, librarySource, mdblistApiKey, configPassword, traktClientId
    } = req.body;

    let configObj = {
        authKey, movieIdType, seriesIdType, animeIdType, inputMode, minRating, era,
        sourceCount, hideWatched, fillGaps, animeFillGaps, sortOrder, language, rpdbKey, recEngine,
        catalog_order, animeEngine, tmdbApiKey, librarySource, mdblistApiKey, traktClientId
    };

    const errors = validateConfig(configObj);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    let passwordProtected = false;
    let encryptedPassword = null;
    if (configPassword) {
        const passwordValidation = validatePassword(configPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password validation failed',
                details: passwordValidation.errors
            });
        }

        configObj = encryptSensitiveFields(configObj, configPassword);
        passwordProtected = true;

        const { encryptUrlPassword } = require('../services/crypto');
        encryptedPassword = encryptUrlPassword(configPassword);
    }

    const token = encryptConfig(JSON.stringify(configObj));
    res.json({ token, passwordProtected, encryptedPassword });
});


router.post('/decrypt-config', (req, res) => {
    const { token, password } = req.body;

    if (!token) return res.status(400).json({ error: 'Token required' });

    const { decryptConfig, decryptSensitiveFields, isPasswordProtected } = require('../services/crypto');

    const config = decryptConfig(token);
    if (!config) {
        return res.status(400).json({ error: 'Invalid token' });
    }

    if (isPasswordProtected(config)) {
        // Check for brute-force lockout
        const lockStatus = getTokenLockStatus(token);
        if (lockStatus.locked) {
            return res.status(429).json({
                error: `Too many failed attempts. Try again in ${lockStatus.waitSeconds} seconds.`,
                lockedUntil: lockStatus.waitSeconds,
                attempts: lockStatus.count
            });
        }

        if (!password) {
            return res.status(401).json({ error: 'Password required', passwordRequired: true });
        }

        const decrypted = decryptSensitiveFields(config, password);
        if (!decrypted) {
            // Record failure for brute-force protection
            recordTokenFailure(lockStatus.hash);
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Success - clear any failure tracking
        clearTokenFailures(lockStatus.hash);
        res.json({ config: decrypted });
    } else {
        res.json({ config });
    }
});


router.get('/stats', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!env.STATS_PASS) {
        return res.status(503).json({ error: 'Stats not configured. Set STATS_USER and STATS_PASS in .env' });
    }

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Stats"');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');

    const userBuffer = Buffer.from(user || '');
    const passBuffer = Buffer.from(pass || '');
    const expectedUserBuffer = Buffer.from(env.STATS_USER || '');
    const expectedPassBuffer = Buffer.from(env.STATS_PASS || '');

    const validUser = userBuffer.length === expectedUserBuffer.length &&
        crypto.timingSafeEqual(userBuffer, expectedUserBuffer);
    const validPass = passBuffer.length === expectedPassBuffer.length &&
        crypto.timingSafeEqual(passBuffer, expectedPassBuffer);

    if (!validUser || !validPass) {
        return res.status(403).json({ error: 'Invalid credentials' });
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let users24h = 0, users7d = 0, users30d = 0;

    for (const [, timestamp] of userActivity) {
        const age = now - timestamp;
        if (age < day) users24h++;
        if (age < 7 * day) users7d++;
        if (age < 30 * day) users30d++;
    }

    res.json({
        activeUsers: { last24h: users24h, last7d: users7d, last30d: users30d },
        totalTracked: userActivity.size,
        serverUptime: Math.floor(process.uptime() / 60) + ' minutes',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
module.exports.trackUserActivity = trackUserActivity;
