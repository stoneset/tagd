import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './logger.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');

function fail(message) {
    log.error('CONFIG', message);
    process.exit(1);
}

if (typeof process.loadEnvFile !== 'function') fail('Node.js >= 20.12 is required');

const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const configFile = path.join(ROOT, 'config.json');
if (!fs.existsSync(configFile)) fail('config.json not found: copy config.json.example to config.json and edit it');

let file;
try {
    file = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (err) {
    fail(`config.json is not valid JSON: ${err.message}`);
}

const adminToken = process.env.ADMIN_TOKEN?.trim();
if (!adminToken || ['change-me', 'your-secret-admin-token-here'].includes(adminToken)) {
    fail('ADMIN_TOKEN must be set in .env (generate one with: openssl rand -hex 32)');
}

// Express "trust proxy": number of proxy hops, 'loopback', a subnet list, true/false
function parseTrustProxy(value) {
    if (!value) return 'loopback';
    if (/^\d+$/.test(value)) return Number(value);
    if (value === 'true' || value === 'false') return value === 'true';
    return value;
}

const smtp = file.smtp?.enabled ? { ...file.smtp, pass: process.env.SMTP_PASS ?? file.smtp.pass } : null;
if (smtp && !smtp.to) fail('smtp.to is required when smtp.enabled is true');
if (smtp && !process.env.SMTP_PASS && file.smtp.pass) {
    log.warn('CONFIG', 'smtp.pass in config.json is deprecated: move it to SMTP_PASS in .env');
}

export const config = {
    port: Number(process.env.PORT) || 3000,
    adminToken,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
    smtp,
    owner: file.owner || {},
    appearance: file.appearance || {},
    rateLimit: { enabled: true, windowMs: 15 * 60 * 1000, maxRequests: 10, ...file.rateLimit },
};

if (!config.owner.email) log.warn('CONFIG', 'owner.email is not set: the public page will show no email contact');
