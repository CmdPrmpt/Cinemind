const express = require('express');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const https = require('https');

const { securityHeaders, corsMiddleware } = require('./middleware/security');
const { globalLimiter, apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { apiRoutes, addonRoutes, pageRoutes } = require('./routes');

function createApp() {
    const app = express();

    // Trust first proxy (needed for rate limiting behind reverse proxy like Traefik/nginx)
    app.set('trust proxy', 1);

    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 200 });
    axios.defaults.httpsAgent = httpsAgent;
    axios.defaults.timeout = 15000;

    axiosRetry(axios, {
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                (error.response && error.response.status === 429);
        }
    });

    app.use(securityHeaders);
    app.use(express.json());
    app.use(corsMiddleware);
    app.use(pageRoutes);
    app.use(globalLimiter);
    app.use('/api/', apiLimiter);
    app.use('/api', apiRoutes);
    app.use(addonRoutes);
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
