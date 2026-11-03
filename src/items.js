import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { log } from './logger.js';

export const normalizeId = (id) => String(id).trim().toUpperCase();

// Returns Map<ID, name>. IDs are case-insensitive. Extra columns (e.g. a `url`
// column used by label printing software) are ignored.
export function loadItems(file) {
    if (!fs.existsSync(file)) {
        log.warn('ITEMS', `${file} not found: every scan will be treated as unknown`);
        return new Map();
    }
    const records = parse(fs.readFileSync(file), {
        columns: true,
        bom: true,
        delimiter: [',', ';'], // Excel with a French locale saves CSV with ';'
        skip_empty_lines: true,
        trim: true,
    });
    const items = new Map(records.filter((r) => r.id && r.name).map((r) => [normalizeId(r.id), r.name]));
    log.info('ITEMS', `Loaded ${items.size} items`);
    return items;
}
