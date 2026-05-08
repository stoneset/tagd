import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

export const PORT = process.env.PORT || 3000;
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';

export const DATA_DIR = path.join(__dirname, 'data');
export const SCANS_FILE = path.join(DATA_DIR, 'scans.json');
export const CONFIG_FILE = path.join(__dirname, 'config.json');
export const CONFIG_EXAMPLE = path.join(__dirname, 'config.json.example');

export const VIEWS_DIR = path.join(__dirname, 'views');
export const PUBLIC_DIR = path.join(__dirname, 'public');