require('dotenv').config();
const crypto = require('crypto');

const env = {
    PORT: process.env.PORT || 7000,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    STATS_USER: process.env.STATS_USER,  // Removed default 'admin'
    STATS_PASS: process.env.STATS_PASS,
    DEBUG: process.env.DEBUG === 'true'
};

// CRITICAL: Fail-fast if encryption key is missing (CVE-002)
if (!env.ENCRYPTION_KEY) {
    console.error('[FATAL] ENCRYPTION_KEY environment variable is not set.');
    console.error('[FATAL] This is a critical security requirement.');
    console.error('[FATAL] Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

// Validate key strength
if (env.ENCRYPTION_KEY.length < 32) {
    console.error('[FATAL] ENCRYPTION_KEY must be at least 32 characters (256 bits).');
    process.exit(1);
}

module.exports = env;
