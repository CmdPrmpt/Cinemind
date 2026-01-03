const fs = require('fs');
const Keyv = require('keyv');
const KeyvSqlite = require('@keyv/sqlite');

if (!fs.existsSync('data')) {
    fs.mkdirSync('data', { recursive: true });
}

const cache = new Keyv(new KeyvSqlite({ uri: 'sqlite://data/cache.sqlite' }));

cache.on('error', err => console.error('Cache Connection Error:', err));

const PENDING_UPDATES = new Set();

module.exports = {
    cache,
    PENDING_UPDATES
};
