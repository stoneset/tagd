/**
 * Centralized logger with environment control
 */
const LOG_LEVELS = {
    DEBUG: '[DEBUG]',
    INFO: '[INFO]',
    WARN: '[WARN]',
    ERROR: '[ERROR]',
    SCAN: '[SCAN]',
    DISCORD: '[DISCORD]',
    RATE_LIMIT: '[RATE LIMIT]',
    GEO: '[GEO]',
};

function isDebugEnabled() {
    return process.env.DEBUG === 'true' || process.env.DEBUG === '1';
}

export function debug(prefix, message) {
    if (isDebugEnabled()) {
        console.log(`${prefix} ${message}`);
    }
}

export function info(prefix, message) {
    console.log(`${prefix} ${message}`);
}

export function warn(prefix, message) {
    console.warn(`${prefix} ${message}`);
}

export function error(prefix, message) {
    console.error(`${prefix} ${message}`);
}

export default LOG_LEVELS;