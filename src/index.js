import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, initializeScansFile, saveScan, loadScans } from './utils/storage.js';
import { rateLimitMiddleware } from './utils/ratelimit.js';
import { getClientIp, fetchGeoLocation } from './utils/geolocation.js';
import { sendDiscordNotification } from './utils/discord.js';
import { sendEmailNotification } from './utils/email.js';
import { error as logError, info as logInfo } from './utils/logger.js';
import { loadItems, isValidItem, getItemName } from './utils/items.js';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { PORT, DISCORD_WEBHOOK_URL, ADMIN_TOKEN, DATA_DIR, SCANS_FILE, CONFIG_FILE, CONFIG_EXAMPLE, VIEWS_DIR, PUBLIC_DIR } = await
import ('./constants.js');

(async() => {
    const app = express();

    app.set('view engine', 'ejs');
    app.set('views', VIEWS_DIR);

    // Load config
    const CONFIG = loadConfig(CONFIG_FILE, CONFIG_EXAMPLE);
    initializeScansFile(SCANS_FILE);
    const ITEMS_FILE = path.join(DATA_DIR, 'items.csv');
    const ITEMS_MAP = loadItems(ITEMS_FILE);

    // Middleware
    app.use(express.json());
    app.use(express.static(PUBLIC_DIR));

    // Routes

    // GET /api/config - Public configuration
    app.get('/api/config', (req, res) => {
        res.json(CONFIG);
    });

    // GET / - Serve home page
    app.get('/', (req, res) => {
        res.render('index', {
            owner: CONFIG.owner || {},
            appearance: CONFIG.appearance || {},
            itemId: null,
            itemName: null,
        });
    });

    // GET /i/:id - Log scan and serve public page
    app.get('/i/:id', rateLimitMiddleware(CONFIG), async(req, res) => {
        try {
            const itemId = req.params.id;
            const isValid = isValidItem(ITEMS_MAP, itemId);
            const itemName = getItemName(ITEMS_MAP, itemId);
            const ip = getClientIp(req);
            const userAgent = req.headers['user-agent'] || 'unknown';
            const acceptLanguage = req.headers['accept-language'] || 'unknown';
            const referer = req.headers['referer'] || 'unknown';
            const timestamp = new Date().toISOString();

            const geo = await fetchGeoLocation(ip);

            const scan = {
                itemId,
                itemName: itemName || 'Unknown',
                ip,
                userAgent,
                acceptLanguage,
                referer,
                timestamp,
                geo,
                headers: Object.fromEntries(Object.entries(req.headers)),
            };

            saveScan(scan, SCANS_FILE);

            // Only send notifications for valid items
            if (isValid) {
                if (DISCORD_WEBHOOK_URL) {
                    sendDiscordNotification(scan, DISCORD_WEBHOOK_URL).catch((err) => {
                        logError('[DISCORD]', `Failed to send notification: ${err.message}`);
                    });
                }

                if (CONFIG.smtp) {
                    sendEmailNotification(scan, CONFIG.smtp).catch((err) => {
                        logError('[EMAIL]', `Failed to send notification: ${err.message}`);
                    });
                }
                logInfo('[SCAN]', `${itemName} (${itemId}) from ${ip} (${geo.city}, ${geo.country})`);
            } else {
                logInfo('[SCAN]', `Unknown item ${itemId} from ${ip} (logged, no notif)`);
            }

            res.render('index', {
                owner: CONFIG.owner || {},
                appearance: CONFIG.appearance || {},
                itemId,
                itemName: itemName || 'something',
            });
        } catch (error) {
            logError('[ERROR]', `Scan processing failed: ${error.message}`);
            res.status(500).send('Error processing scan');
        }
    });

    // GET /api/scans - Get all scans (protected by x-admin-token)
    // Query params: itemId, from, to (filter by date range)
    app.get('/api/scans', (req, res) => {
        const token = req.headers['x-admin-token'];

        if (token !== ADMIN_TOKEN) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        try {
            let scans = loadScans(SCANS_FILE);

            // Filter by itemId
            if (req.query.itemId) {
                scans = scans.filter(scan => scan.itemId === req.query.itemId);
            }

            // Filter by date range
            if (req.query.from || req.query.to) {
                const from = req.query.from ? new Date(req.query.from).getTime() : 0;
                const to = req.query.to ? new Date(req.query.to).getTime() : Date.now();
                scans = scans.filter(scan => {
                    const scanTime = new Date(scan.timestamp).getTime();
                    return scanTime >= from && scanTime <= to;
                });
            }

            res.json(scans);
        } catch (error) {
            res.status(500).json({ error: 'Failed to read scans' });
        }
    });

    // GET /api/export - Export scans as CSV or JSON
    // Query params: format (csv|json), itemId, from, to
    app.get('/api/export', (req, res) => {
        const token = req.headers['x-admin-token'];

        if (token !== ADMIN_TOKEN) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        try {
            let scans = loadScans(SCANS_FILE);

            // Filter by itemId
            if (req.query.itemId) {
                scans = scans.filter(scan => scan.itemId === req.query.itemId);
            }

            // Filter by date range
            if (req.query.from || req.query.to) {
                const from = req.query.from ? new Date(req.query.from).getTime() : 0;
                const to = req.query.to ? new Date(req.query.to).getTime() : Date.now();
                scans = scans.filter(scan => {
                    const scanTime = new Date(scan.timestamp).getTime();
                    return scanTime >= from && scanTime <= to;
                });
            }

            const format = req.query.format || 'json';

            if (format === 'csv') {
                // Convert to CSV
                const headers = ['Item ID', 'IP', 'City', 'Region', 'Country', 'User Agent', 'Timestamp'];
                const rows = scans.map(scan => [
                    scan.itemId,
                    scan.ip,
                    scan.geo.city,
                    scan.geo.region,
                    scan.geo.country,
                    scan.userAgent,
                    scan.timestamp,
                ]);

                const csv = [headers, ...rows]
                    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                    .join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="scans.csv"');
                res.send(csv);
            } else {
                // JSON export
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="scans.json"');
                res.send(JSON.stringify(scans, null, 2));
            }
        } catch (error) {
            res.status(500).json({ error: 'Failed to export scans' });
        }
    });

    // Error handling
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    // Start server
    app.listen(PORT, () => {
        logInfo('[INFO]', `🏷️  tagd server running on http://localhost:${PORT}`);
        logInfo('[INFO]', `Admin token: ${ADMIN_TOKEN}`);
    });
})();