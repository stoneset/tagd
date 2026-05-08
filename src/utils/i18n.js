import i18next from 'i18next';
import fs from 'fs';
import path from 'path';

export function initializeI18n(publicDir) {
    const i18nDir = path.join(publicDir, 'i18n');
    const resources = {};

    try {
        // Load all JSON translation files
        const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'));

        files.forEach(file => {
            const lang = path.basename(file, '.json');
            const filePath = path.join(i18nDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            resources[lang] = { translation: JSON.parse(content) };
        });

        i18next.init({
            resources,
            lng: 'en',
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
        });

        return i18next;
    } catch (error) {
        console.error('[I18N]', `Failed to initialize i18next: ${error.message}`);
        return null;
    }
}

export function getTranslations(lang = 'en') {
    i18next.changeLanguage(lang);
    return i18next.getResourceBundle(lang, 'translation');
}