const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { decryptConfig, decryptSensitiveFields, isPasswordProtected, decryptUrlPassword } = require('../services/crypto');
const { createAddonInterface } = require('../addon/builder');
const { parseExtraFromUrl } = require('../lib/utils');
const { renderLandingPage } = require('../views/landing');
const { trackUserActivity } = require('./api');

// UUID regex pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a config from either a UUID (lookup in DB) or a raw encrypted token.
 */
function resolveConfigFromParam(param) {
    const { getConfig } = require('../services/database');

    // Check if param is a UUID
    if (UUID_PATTERN.test(param)) {
        const encryptedToken = getConfig(param);
        if (encryptedToken) {
            return { source: 'uuid', token: encryptedToken };
        }
    }

    // Fall back to treating param as a raw encrypted token
    return { source: 'token', token: param };
}

function getConfigWithPassword(tokenOrUuid, encryptedPassword) {
    const resolved = resolveConfigFromParam(tokenOrUuid);
    const config = decryptConfig(resolved.token);
    if (!config) {
        return { config: null, error: 'Invalid Token', requiresPassword: false };
    }

    if (isPasswordProtected(config)) {
        if (!encryptedPassword) {
            return { config: null, error: 'Password required', requiresPassword: true };
        }

        const password = decryptUrlPassword(encryptedPassword);
        if (!password) {
            return { config: null, error: 'Invalid password token', requiresPassword: true };
        }

        const decrypted = decryptSensitiveFields(config, password);
        if (!decrypted) {
            return { config: null, error: 'Incorrect password', requiresPassword: true };
        }
        return { config: decrypted, error: null, requiresPassword: false };
    }

    return { config, error: null, requiresPassword: false };
}

function getUserHash(tokenOrUuid) {
    return crypto.createHash('sha256').update(tokenOrUuid).digest('hex').slice(0, 12);
}

function renderConfigurePage(req, res) {
    const resolved = resolveConfigFromParam(req.params.token);
    const config = decryptConfig(resolved.token);
    if (!config) return res.redirect('/');

    let safeConfig = config;
    if (isPasswordProtected(config)) {
        safeConfig = { _passwordProtected: true };
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(renderLandingPage(safeConfig));
}

// --- Configure routes (UUID + token) ---
router.get('/:token/:password/configure', renderConfigurePage);
router.get('/:token/configure', renderConfigurePage);

// --- Password-protected manifest (path param) ---
router.get('/:token/:password/manifest.json', (req, res) => {
    const { config, error, requiresPassword } = getConfigWithPassword(req.params.token, req.params.password);

    if (error) {
        if (requiresPassword) {
            return res.status(401).json({
                error,
                message: 'Invalid or missing password.',
                passwordRequired: true
            });
        }
        return res.status(400).send(error);
    }

    trackUserActivity(getUserHash(req.params.token));
    const addonInterface = createAddonInterface(config);
    res.json(addonInterface.manifest);
});

// --- Non-protected manifest (no password) ---
router.get('/:token/manifest.json', (req, res) => {
    const resolved = resolveConfigFromParam(req.params.token);
    const config = decryptConfig(resolved.token);
    if (!config) {
        return res.status(400).send('Invalid Token');
    }

    if (isPasswordProtected(config)) {
        return res.status(401).json({
            error: 'Password required',
            message: 'This configuration is password protected. Use the install URL with the encrypted password.',
            passwordRequired: true
        });
    }

    trackUserActivity(getUserHash(req.params.token));
    const addonInterface = createAddonInterface(config);
    res.json(addonInterface.manifest);
});

// --- Password-protected catalog (path param) ---
router.get('/:token/:password/catalog/:type/:id.json', (req, res) => {
    const { config, error, requiresPassword } = getConfigWithPassword(req.params.token, req.params.password);

    if (error) {
        if (requiresPassword) {
            return res.status(401).json({
                error,
                message: 'Invalid or missing password.',
                passwordRequired: true
            });
        }
        return res.status(400).send(error);
    }

    trackUserActivity(getUserHash(req.params.token));
    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

router.get('/:token/:password/catalog/:type/:id/:extra.json', (req, res) => {
    const { config, error, requiresPassword } = getConfigWithPassword(req.params.token, req.params.password);

    if (error) {
        if (requiresPassword) {
            return res.status(401).json({
                error,
                message: 'Invalid or missing password.',
                passwordRequired: true
            });
        }
        return res.status(400).send(error);
    }

    trackUserActivity(getUserHash(req.params.token));
    const extraObj = parseExtraFromUrl(req.url);
    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id, extraObj)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

// --- Non-protected catalog (no password) ---
router.get('/:token/catalog/:type/:id.json', (req, res) => {
    const resolved = resolveConfigFromParam(req.params.token);
    const config = decryptConfig(resolved.token);
    if (!config) {
        return res.status(400).send('Invalid Token');
    }

    if (isPasswordProtected(config)) {
        return res.status(401).json({
            error: 'Password required',
            message: 'This configuration is password protected.',
            passwordRequired: true
        });
    }

    trackUserActivity(getUserHash(req.params.token));
    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

router.get('/:token/catalog/:type/:id/:extra.json', (req, res) => {
    const resolved = resolveConfigFromParam(req.params.token);
    const config = decryptConfig(resolved.token);
    if (!config) {
        return res.status(400).send('Invalid Token');
    }

    if (isPasswordProtected(config)) {
        return res.status(401).json({
            error: 'Password required',
            message: 'This configuration is password protected.',
            passwordRequired: true
        });
    }

    trackUserActivity(getUserHash(req.params.token));
    const extraObj = parseExtraFromUrl(req.url);
    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id, extraObj)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

module.exports = router;
