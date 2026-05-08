import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { info as logInfo, error as logError } from './logger.js';

/**
 * Load and parse items.csv
 */
export function loadItems(itemsFilePath) {
    try {
        if (!fs.existsSync(itemsFilePath)) {
            logInfo('[ITEMS]', `items.csv not found at ${itemsFilePath}`);
            return new Map();
        }

        const csvContent = fs.readFileSync(itemsFilePath, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        const itemsMap = new Map();
        records.forEach((record) => {
            if (record.id && record.name) {
                itemsMap.set(record.id, record.name);
            }
        });

        logInfo('[ITEMS]', `Loaded ${itemsMap.size} items from CSV`);
        return itemsMap;
    } catch (error) {
        logError('[ITEMS]', `Failed to load items.csv: ${error.message}`);
        return new Map();
    }
}

/**
 * Get item name by ID
 */
export function getItemName(itemsMap, itemId) {
    return itemsMap.get(itemId) || null;
}

/**
 * Check if item ID is valid
 */
export function isValidItem(itemsMap, itemId) {
    return itemsMap.has(itemId);
}