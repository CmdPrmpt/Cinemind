const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'configs.sqlite');

let db = null;

function getDb() {
    if (!db) {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');
        initialize();
    }
    return db;
}

function initialize() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_configs (
            id TEXT PRIMARY KEY,
            encrypted_token TEXT NOT NULL,
            config_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_accessed_at INTEGER NOT NULL
        )
    `);
    // Create index for cleanup queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_configs_accessed
        ON user_configs (last_accessed_at)
    `);
}

function generateUuid() {
    return crypto.randomUUID();
}

function saveConfig(encryptedToken) {
    const id = generateUuid();
    const configHash = crypto.createHash('sha256').update(encryptedToken).digest('hex').slice(0, 16);
    const now = Date.now();

    const stmt = getDb().prepare(`
        INSERT INTO user_configs (id, encrypted_token, config_hash, created_at, last_accessed_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, encryptedToken, configHash, now, now);

    return id;
}

function updateConfig(id, encryptedToken) {
    // Update an existing config row in place, keeping the same UUID (stable install URL).
    // Returns true if a row was updated, false if the id does not exist.
    const configHash = crypto.createHash('sha256').update(encryptedToken).digest('hex').slice(0, 16);
    const now = Date.now();

    const stmt = getDb().prepare(`
        UPDATE user_configs
        SET encrypted_token = ?, config_hash = ?, last_accessed_at = ?
        WHERE id = ?
    `);
    return stmt.run(encryptedToken, configHash, now, id).changes > 0;
}

function getConfig(id) {
    const stmt = getDb().prepare(`
        SELECT encrypted_token FROM user_configs WHERE id = ?
    `);
    const row = stmt.get(id);
    if (!row) return null;

    // Update access time
    const updateStmt = getDb().prepare(`
        UPDATE user_configs SET last_accessed_at = ? WHERE id = ?
    `);
    updateStmt.run(Date.now(), id);

    return row.encrypted_token;
}

function deleteConfig(id) {
    const stmt = getDb().prepare(`DELETE FROM user_configs WHERE id = ?`);
    return stmt.run(id).changes > 0;
}

function configExists(id) {
    const stmt = getDb().prepare(`SELECT 1 FROM user_configs WHERE id = ?`);
    return !!stmt.get(id);
}

function cleanupOldConfigs(maxAgeMs = 90 * 24 * 60 * 60 * 1000) {
    // Clean up configs older than maxAgeMs (default 90 days)
    const cutoff = Date.now() - maxAgeMs;
    const stmt = getDb().prepare(`DELETE FROM user_configs WHERE last_accessed_at < ?`);
    const result = stmt.run(cutoff);
    if (result.changes > 0) {
        console.log(`[DB] Cleaned up ${result.changes} expired configs`);
    }
}

// Run cleanup on startup (don't await — background)
setTimeout(() => cleanupOldConfigs(), 60000);

module.exports = {
    saveConfig,
    updateConfig,
    getConfig,
    deleteConfig,
    configExists,
    generateUuid
};
