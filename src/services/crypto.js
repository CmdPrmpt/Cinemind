const crypto = require('crypto');
const env = require('../config/env');

const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

const SENSITIVE_FIELDS = ['authKey', 'tmdbApiKey', 'mdblistApiKey', 'rpdbKey', 'traktClientId'];

function getFixedKey(key) {
    return crypto.createHash('sha256').update(String(key)).digest().slice(0, 32);
}

const ENCRYPTION_KEY = env.ENCRYPTION_KEY ? getFixedKey(env.ENCRYPTION_KEY) : null;

function validatePassword(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least 1 lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number');
    }

    return { valid: errors.length === 0, errors };
}

function deriveKeyFromPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

function encryptSensitiveFields(config, password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKeyFromPassword(password, salt);

    const protectedConfig = { ...config, _passwordProtected: true, _salt: salt.toString('hex') };

    for (const field of SENSITIVE_FIELDS) {
        if (config[field]) {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            let encrypted = cipher.update(config[field], 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            const authTag = cipher.getAuthTag();

            // Format: iv:authTag:ciphertext
            protectedConfig[field] = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
        }
    }

    return protectedConfig;
}

function decryptSensitiveFields(config, password) {
    if (!config._passwordProtected || !config._salt) {
        return config;
    }

    try {
        const salt = Buffer.from(config._salt, 'hex');
        const key = deriveKeyFromPassword(password, salt);

        const decryptedConfig = { ...config };
        delete decryptedConfig._salt;

        for (const field of SENSITIVE_FIELDS) {
            if (config[field] && config[field].includes(':')) {
                const parts = config[field].split(':');
                if (parts.length === 3) {
                    const [ivHex, authTagHex, encryptedHex] = parts;
                    const iv = Buffer.from(ivHex, 'hex');
                    const authTag = Buffer.from(authTagHex, 'hex');
                    const encrypted = Buffer.from(encryptedHex, 'hex');

                    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
                    decipher.setAuthTag(authTag);
                    let decrypted = decipher.update(encrypted);
                    decrypted = Buffer.concat([decrypted, decipher.final()]);
                    decryptedConfig[field] = decrypted.toString('utf8');
                }
            }
        }

        return decryptedConfig;
    } catch (e) {
        return null;
    }
}

function isPasswordProtected(config) {
    return config && config._passwordProtected === true;
}

function encryptConfig(text) {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY not configured');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptConfig(text) {
    if (!ENCRYPTION_KEY) {
        return null;
    }

    try {
        const textParts = text.split(':');
        // Handle potential backward compatibility or strictly enforce new format
        // For security fix, we enforce new format, but old CBC texts (iv:ciphertext) will fail gracefully or need logic
        // Given vulnerability context, we assume a fresh start or simple failure for old tokens is safest
        if (textParts.length !== 3) return null;

        const iv = Buffer.from(textParts[0], 'hex');
        const authTag = Buffer.from(textParts[1], 'hex');
        const encryptedText = Buffer.from(textParts[2], 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString());
    } catch (e) {
        return null;
    }
}

function encryptUrlPassword(password) {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY not configured');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(password, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64url');
}

function decryptUrlPassword(encryptedPassword) {
    if (!ENCRYPTION_KEY) {
        return null;
    }

    try {
        const combined = Buffer.from(encryptedPassword, 'base64url');
        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        return null;
    }
}

module.exports = {
    encryptConfig,
    decryptConfig,
    getFixedKey,
    validatePassword,
    encryptSensitiveFields,
    decryptSensitiveFields,
    isPasswordProtected,
    encryptUrlPassword,
    decryptUrlPassword,
    SENSITIVE_FIELDS
};
