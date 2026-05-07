import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Utils
import { loadConfig, initializeScansFile, saveScan, loadScans } from './utils/storage.js';
import { rateLimitMiddleware } from './utils/ratelimit.js';
import { getClientIp, fetchGeoLocation } from './utils/geolocation.js';
import { sendDiscordNotification } from './utils/discord.js';

dotenv.config();

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';

const DATA_DIR = path.join(__dirname, '../data');
const SCANS_FILE = path.join(DATA_DIR, 'scans.json');
const CONFIG_FILE = path.join(__dirname, '../config.json');
const CONFIG_EXAMPLE = path.join(__dirname, '../config.json.example');

// Load config
const CONFIG = loadConfig(CONFIG_FILE, CONFIG_EXAMPLE);
initializeScansFile(SCANS_FILE);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/itm', rateLimitMiddleware(CONFIG));

// Routes

// GET /api/config - Public configuration
app.get('/api/config', (req, res) => {
    res.json(CONFIG);
});

// GET / - Serve public page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
        if (err) {
            console.error('Error sending home page:', err.message);
            if (!res.headersSent) {
                res.status(500).send('Error loading page');
            }
        }
    });
});

// GET /itm/:id - Log scan and serve public page
app.get('/itm/:id', async(req, res) => {
    try {
        const itemId = req.params.id;
        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const acceptLanguage = req.headers['accept-language'] || 'unknown';
        const referer = req.headers['referer'] || 'unknown';
        const timestamp = new Date().toISOString();

        // Debug: Log IP resolution
        console.log(`[DEBUG] X-Forwarded-For: ${req.headers['x-forwarded-for'] || 'not set'}`);
        console.log(`[DEBUG] Remote Address: ${req.socket.remoteAddress}`);

        // Fetch geolocation
        const geo = await fetchGeoLocation(ip);

        // Create scan record
        const scan = {
            itemId,
            ip,
            userAgent,
            acceptLanguage,
            referer,
            timestamp,
            geo,
            headers: Object.fromEntries(Object.entries(req.headers)),
        };

        // Save scan
        saveScan(scan, SCANS_FILE);

        // Send Discord notification (non-blocking)
        if (DISCORD_WEBHOOK_URL) {
            sendDiscordNotification(scan, DISCORD_WEBHOOK_URL).catch((err) => {
                console.error('[DISCORD] Failed to send notification:', err.message);
            });
        }

        console.log(`[SCAN] ${itemId} from ${ip} (${geo.city}, ${geo.country})`);

        // Serve public page
        res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
            if (err) {
                console.error('[ERROR] Failed to send page:', err.code);
                if (!res.headersSent) {
                    res.status(500).send('Error loading page');
                }
            }
        });
    } catch (error) {
        console.error('[ERROR] Scan processing failed:', error.message);
        res.status(500).send('Error processing scan');
    }
});

// GET /api/scans - Get all scans (protected by x-admin-token)
app.get('/api/scans', (req, res) => {
    const token = req.headers['x-admin-token'];

    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const scans = loadScans(SCANS_FILE);
        res.json(scans);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read scans' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏷️  tagd server running on http://localhost:${PORT}`);
    console.log(`Admin token: ${ADMIN_TOKEN}`);
});