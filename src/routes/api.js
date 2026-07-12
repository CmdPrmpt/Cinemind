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


router.post('/nuvio-login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, error: "Email and password required" });

    try {
        const { nuvioLogin } = require('../services/nuvio');
        const result = await nuvioLogin(email, password);
        return res.json({
            success: true,
            access_token: result.access_token,
            refresh_token: result.refresh_token
        });
    } catch (e) {
        if (e.message && (e.message.includes('Invalid') || e.message.includes('credentials'))) {
            return res.json({ success: false, error: "Invalid email or password" });
        }
        return res.json({ success: false, error: "Connection Failed" });
    }
});


router.post('/nuvio-profiles', async (req, res) => {
    const { nuvioAccessToken, nuvioRefreshToken } = req.body;
    if (!nuvioAccessToken) return res.json({ success: false, error: "Access token required" });

    try {
        const { nuvioGetProfiles } = require('../services/nuvio');
        const profiles = await nuvioGetProfiles(nuvioAccessToken, nuvioRefreshToken || '');
        const mapped = profiles.map(p => ({
            profile_index: p.profile_index,
            name: p.name,
            avatar_color_hex: p.avatar_color_hex
        }));
        return res.json({ success: true, profiles: mapped });
    } catch (e) {
        return res.json({ success: false, error: "Connection Failed" });
    }
});


router.post('/stremio-profiles', async (req, res) => {
    const { authKey } = req.body;
    if (!authKey) return res.json({ success: false, error: "AuthKey required" });

    try {
        const { getStremioUserInfo } = require('../services/stremio');
        const { result, error } = await getStremioUserInfo(authKey);
        if (error || !result) {
            return res.json({ success: false, error: error || "No user info returned" });
        }

        const userProfiles = result.premiumPrefs && result.premiumPrefs.userProfiles;
        if (!userProfiles || Object.keys(userProfiles).length === 0) {
            return res.json({ success: true, profiles: [], singleUser: true });
        }

        const mapped = Object.entries(userProfiles).map(([id, info]) => ({
            id,
            name: info.name || id,
            hasPin: info.hasPin || false,
            canManageAddons: info.canManageAddons || false
        }));
        return res.json({ success: true, profiles: mapped, singleUser: false });
    } catch (e) {
        return res.json({ success: false, error: "Connection Failed" });
    }
});


router.post('/stremio-authenticate-profile', async (req, res) => {
    const { authKey, profileId, pin } = req.body;
    if (!authKey || !profileId) return res.json({ success: false, error: "AuthKey and profileId required" });

    try {
        const { authenticateStremioProfile } = require('../services/stremio');
        const { authKey: profileAuthKey, error } = await authenticateStremioProfile(authKey, profileId, pin || '');
        if (error || !profileAuthKey) {
            return res.json({ success: false, error: error || "Authentication failed" });
        }
        return res.json({ success: true, authKey: profileAuthKey });
    } catch (e) {
        return res.json({ success: false, error: "Connection Failed" });
    }
});


router.post('/encrypt-config', (req, res) => {
    const {
        authKey, movieIdType, seriesIdType, animeIdType, inputMode, minRating, era,
        sourceCount, hideWatched, fillGaps, animeFillGaps, sortOrder, language, rpdbKey, recEngine,
        catalog_order, animeEngine, tmdbApiKey, librarySource, mdblistApiKey, configPassword, traktClientId,
        nuvioAccessToken, nuvioProfileId, nuvioRefreshToken,
        stremioProfileId, stremioProfileAuthKey
    } = req.body;

    let configObj = {
        authKey, movieIdType, seriesIdType, animeIdType, inputMode, minRating, era,
        sourceCount, hideWatched, fillGaps, animeFillGaps, sortOrder, language, rpdbKey, recEngine,
        catalog_order, animeEngine, tmdbApiKey, librarySource, mdblistApiKey, traktClientId,
        nuvioAccessToken, nuvioProfileId, nuvioRefreshToken,
        stremioProfileId, stremioProfileAuthKey
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
    let { token, password } = req.body;

    if (!token) return res.status(400).json({ error: 'Token required' });

    // Check if token is actually a UUID — resolve to encrypted token from DB
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
        const { getConfig } = require('../services/database');
        const encryptedToken = getConfig(token);
        if (!encryptedToken) return res.status(400).json({ error: 'Invalid Token' });
        token = encryptedToken;
    }

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


// --- UUID-based config storage ---
const { saveConfig, updateConfig, getConfig, deleteConfig, configExists } = require('../services/database');

// xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const SAVE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Auth middleware for config management endpoints
function requireConfigAuth(req, res, next) {
    if (!env.STATS_USER || !env.STATS_PASS) {
        return res.status(503).json({ error: 'Config storage not configured.' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Config Admin"');
        return res.status(401).json({ error: 'Authentication required' });
    }
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');
    const userBuf = Buffer.from(user);
    const passBuf = Buffer.from(pass);
    const expectedUser = Buffer.from(env.STATS_USER);
    const expectedPass = Buffer.from(env.STATS_PASS);
    if (userBuf.length !== expectedUser.length || passBuf.length !== expectedPass.length ||
        !crypto.timingSafeEqual(userBuf, expectedUser) || !crypto.timingSafeEqual(passBuf, expectedPass)) {
        return res.status(403).json({ error: 'Invalid credentials' });
    }
    next();
}

// Public: save a config (called from landing page JS — protected by rate limiter + token validation)
router.post('/save-config', (req, res) => {
    const { encryptedToken, uuid: existingUuid } = req.body;
    if (!encryptedToken) return res.status(400).json({ error: 'Encrypted token required' });

    // Validate the token is decryptable before storing
    const { decryptConfig } = require('../services/crypto');
    const config = decryptConfig(encryptedToken);
    if (!config) return res.status(400).json({ error: 'Invalid encrypted token' });

    // If editing an existing config, update it in place so the install URL stays stable.
    // Falls through to creating a new one if the UUID is unknown (e.g. expired/cleaned up).
    if (existingUuid && SAVE_UUID_PATTERN.test(existingUuid) && updateConfig(existingUuid, encryptedToken)) {
        return res.json({ uuid: existingUuid, installUrl: `/${existingUuid}/manifest.json` });
    }

    const uuid = saveConfig(encryptedToken);
    res.json({ uuid, installUrl: `/${uuid}/manifest.json` });
});

// Admin-only: delete a stored config
router.delete('/delete-config/:uuid', requireConfigAuth, (req, res) => {
    const { uuid } = req.params;
    if (!uuid) return res.status(400).json({ error: 'UUID required' });

    const deleted = deleteConfig(uuid);
    if (!deleted) return res.status(404).json({ error: 'Config not found' });
    res.json({ success: true });
});

router.get('/config-exists/:uuid', (req, res) => {
    const { uuid } = req.params;
    if (!uuid) return res.status(400).json({ error: 'UUID required' });

    res.json({ exists: configExists(uuid) });
});

module.exports = router;
module.exports.trackUserActivity = trackUserActivity;
