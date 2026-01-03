const { createApp } = require('./app');
const { cache } = require('./services/cache');
const env = require('./config/env');

const app = createApp();
const PORT = env.PORT;

const server = app.listen(PORT, () => {
    console.log(`Addon running at http://localhost:${PORT}`);
});

async function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(() => {
        console.log('HTTP server closed.');
    });

    try {
        await cache.disconnect();
        console.log('Cache disconnected.');
    } catch (e) {
        console.error('Error disconnecting cache:', e.message);
    }

    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
