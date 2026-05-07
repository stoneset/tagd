import fs from 'fs';
import path from 'path';

/**
 * Load config from file with fallback to example
 */
export function loadConfig(configPath, examplePath) {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading config.json:', error.message);
    }

    // Fallback to example
    try {
        return JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    } catch (error) {
        console.error('Error loading config.json.example:', error.message);
        return {};
    }
}

/**
 * Initialize scans file if it doesn't exist
 */
export function initializeScansFile(scansPath) {
    const dir = path.dirname(scansPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(scansPath)) {
        fs.writeFileSync(scansPath, JSON.stringify([], null, 2));
    }
}

/**
 * Save scan to JSON file
 */
export function saveScan(scan, scansPath) {
    try {
        const scans = JSON.parse(fs.readFileSync(scansPath, 'utf8'));
        scans.push(scan);
        fs.writeFileSync(scansPath, JSON.stringify(scans, null, 2));
    } catch (error) {
        console.error('Failed to save scan:', error.message);
    }
}

/**
 * Load all scans from JSON file
 */
export function loadScans(scansPath) {
    try {
        return JSON.parse(fs.readFileSync(scansPath, 'utf8'));
    } catch (error) {
        console.error('Failed to load scans:', error.message);
        return [];
    }
}