const express = require('express');
const router = express.Router();

const { renderLandingPage } = require('../views/landing');

router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(renderLandingPage({}));
});

router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
