const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { decryptConfig, decryptSensitiveFields, isPasswordProtected, decryptUrlPassword } = require('../services/crypto');
const { createAddonInterface } = require('../addon/builder');
const { parseExtraFromUrl } = require('../lib/utils');
const { renderLandingPage } = require('../views/landing');
const { trackUserActivity } = require('./api');

function getConfigWithPassword(token, encryptedPassword) {
    const config = decryptConfig(token);
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

// Helper to extract password from path or query
function getPassword(req) {
    // Prefer path parameter, fallback to query parameter
    return req.params.password || req.query.password;
}

router.get('/:token/configure', (req, res) => {
    const config = decryptConfig(req.params.token);
    if (!config) return res.redirect('/');

    let safeConfig = config;
    if (isPasswordProtected(config)) {
        safeConfig = { _passwordProtected: true };
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(renderLandingPage(safeConfig));
});

// Password-protected routes using path parameter (for Stremio deep links)
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

    const userHash = crypto.createHash('sha256').update(req.params.token).digest('hex').slice(0, 12);
    trackUserActivity(userHash);

    const addonInterface = createAddonInterface(config);
    res.json(addonInterface.manifest);
});

// Non-protected manifest route (with optional query param for backward compat)
router.get('/:token/manifest.json', (req, res) => {
    const password = req.query.password;
    const { config, error, requiresPassword } = getConfigWithPassword(req.params.token, password);

    if (error) {
        if (requiresPassword) {
            return res.status(401).json({
                error,
                message: 'This configuration is password protected.',
                passwordRequired: true
            });
        }
        return res.status(400).send(error);
    }

    const userHash = crypto.createHash('sha256').update(req.params.token).digest('hex').slice(0, 12);
    trackUserActivity(userHash);

    const addonInterface = createAddonInterface(config);
    res.json(addonInterface.manifest);
});

// Password-protected catalog routes using path parameter
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

    const userHash = crypto.createHash('sha256').update(req.params.token).digest('hex').slice(0, 12);
    trackUserActivity(userHash);

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

    const userHash = crypto.createHash('sha256').update(req.params.token).digest('hex').slice(0, 12);
    trackUserActivity(userHash);

    const extraObj = parseExtraFromUrl(req.url);
    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id, extraObj)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

// Non-protected catalog routes (with optional query param for backward compat)
router.get('/:token/catalog/:type/:id.json', (req, res) => {
    const password = req.query.password;
    const { config, error, requiresPassword } = getConfigWithPassword(req.params.token, password);

    if (error) {
        if (requiresPassword) {
            return res.status(401).json({
                error,
                message: 'Password required.',
                passwordRequired: true
            });
        }
        return res.status(400).send(error);
    }

    const userHash = crypto.createHash('sha256').update(req.params.token).digest('hex').slice(0, 12);
    trackUserActivity(userHash);

    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

router.get('/:token/catalog/:type/:id/:extra.json', (req, res) => {
    const password = req.query.password;
    const { config, error, requiresPassword } = getConfigWithPassword(req.params.token, password);

    if (error) {
        if (requiresPassword) {
            return res.status(401).json({
                error,
                message: 'Password required.',
                passwordRequired: true
            });
        }
        return res.status(400).send(error);
    }

    const userHash = crypto.createHash('sha256').update(req.params.token).digest('hex').slice(0, 12);
    trackUserActivity(userHash);

    const extraObj = parseExtraFromUrl(req.url);
    const addonInterface = createAddonInterface(config);
    addonInterface.get('catalog', req.params.type, req.params.id, extraObj)
        .then(response => res.json(response))
        .catch(err => res.status(500).json({ metas: [] }));
});

module.exports = router;
