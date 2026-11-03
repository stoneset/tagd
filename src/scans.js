import fs from 'node:fs';
import path from 'node:path';
import { log } from './logger.js';

// Scans are stored as JSON Lines (one scan per line): appending is O(1) and a
// corrupted line (e.g. crash during a write) only loses that line.
export function createScanStore(dataDir) {
    const file = path.join(dataDir, 'scans.jsonl');
    fs.mkdirSync(dataDir, { recursive: true });
    migrateLegacyFile(path.join(dataDir, 'scans.json'), file);

    return {
        append(scan) {
            fs.appendFileSync(file, JSON.stringify(scan) + '\n');
        },
        readAll() {
            if (!fs.existsSync(file)) return [];
            return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((line, i) => {
                try {
                    return [JSON.parse(line)];
                } catch {
                    log.warn('SCANS', `Skipping corrupted line ${i + 1} in scans.jsonl`);
                    return [];
                }
            });
        },
    };
}

// One-time migration from the 1.x scans.json (array). Drops the raw `headers`
// field (it contained visitors' cookies); the original is kept as scans.json.bak.
function migrateLegacyFile(legacyFile, file) {
    if (!fs.existsSync(legacyFile) || fs.existsSync(file)) return;
    let scans;
    try {
        scans = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
    } catch (err) {
        throw new Error(`Cannot migrate ${legacyFile}: ${err.message}`);
    }
    const lines = scans.map(({ headers, ...scan }) => JSON.stringify(scan) + '\n').join('');
    fs.writeFileSync(file + '.tmp', lines);
    fs.renameSync(file + '.tmp', file);
    fs.renameSync(legacyFile, legacyFile + '.bak');
    log.info('SCANS', `Migrated ${scans.length} scans to scans.jsonl (original kept as scans.json.bak)`);
}

// Parses ?from / ?to. A bare date (YYYY-MM-DD) as `to` includes that whole day.
// Returns null for an invalid date.
export function parseDate(value, { endOfDay = false } = {}) {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return null;
    return endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value) ? ms + 86_400_000 - 1 : ms;
}

export function filterScans(scans, { itemId, from = 0, to = Infinity }) {
    return scans.filter((scan) => {
        const time = Date.parse(scan.timestamp);
        return (!itemId || scan.itemId === itemId) && time >= from && time <= to;
    });
}

const CSV_COLUMNS = [
    ['Timestamp', (s) => s.timestamp],
    ['Item ID', (s) => s.itemId],
    ['Item name', (s) => s.itemName],
    ['IP', (s) => s.ip],
    ['City', (s) => s.geo?.city],
    ['Region', (s) => s.geo?.region],
    ['Country', (s) => s.geo?.country],
    ['User agent', (s) => s.userAgent],
    ['Language', (s) => s.acceptLanguage],
    ['Referer', (s) => s.referer],
];

function csvCell(value) {
    let text = String(value ?? '');
    // Neutralize spreadsheet formulas (CSV injection via user-controlled headers)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(scans) {
    const header = CSV_COLUMNS.map(([name]) => csvCell(name)).join(',');
    const rows = scans.map((scan) => CSV_COLUMNS.map(([, get]) => csvCell(get(scan))).join(','));
    return [header, ...rows].join('\n');
}
