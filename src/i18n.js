import fs from 'node:fs';
import path from 'node:path';

// Loads locales/<lang>.json. English is the fallback and is listed first.
export function loadLocales(dir) {
    const locales = {};
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    files.sort((a, b) => (b === 'en.json') - (a === 'en.json') || a.localeCompare(b));
    for (const file of files) {
        locales[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    }
    if (!locales.en) throw new Error('locales/en.json is required (fallback language)');
    return locales;
}

// ?lang=xx wins, then the browser's Accept-Language, then English
export function pickLanguage(req, locales) {
    const supported = Object.keys(locales);
    const { lang } = req.query;
    if (typeof lang === 'string' && supported.includes(lang)) return lang;
    return req.acceptsLanguages(...supported) || 'en';
}

export function translator(locales, lang) {
    const get = (obj, key) => key.split('.').reduce((o, k) => o?.[k], obj);
    return (key) => get(locales[lang], key) ?? get(locales.en, key) ?? key;
}
