import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { config, ROOT, DATA_DIR } from './config.js';
import { log } from './logger.js';
import { loadItems, normalizeId } from './items.js';
import { loadLocales, pickLanguage, translator } from './i18n.js';
import { lookupGeo, normalizeIp } from './geo.js';
import { createLimiter } from './limiter.js';
import { createScanStore, filterScans, parseDate, toCsv } from './scans.js';
import { createNotifier } from './notify.js';

const items = loadItems(path.join(DATA_DIR, 'items.csv'));
const locales = loadLocales(path.join(ROOT, 'locales'));
const store = createScanStore(DATA_DIR);
const notify = createNotifier(config);

// Rate limiting never blocks the page (the finder must always see the contact
// info): it only limits recorded scans per IP and notifications per IP + item.
const { enabled, windowMs, maxRequests } = config.rateLimit;
const allowRecord = enabled ? createLimiter(windowMs, maxRequests) : () => true;
const allowNotify = enabled ? createLimiter(windowMs, 1) : () => true;

const { owner } = config;
let website = null;
try {
    if (owner.website) website = { url: owner.website, host: new URL(owner.website).hostname };
} catch {
    log.warn('CONFIG', `owner.website is not a valid URL, hidden from the page: ${owner.website}`);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(express.static(path.join(ROOT, 'public')));

function renderPage(req, res, itemName) {
    const lang = pickLanguage(req, locales);
    const t = translator(locales, lang);
    const mailto = owner.email
        ? `mailto:${owner.email}?subject=${encodeURIComponent(t('email.subject'))}&body=${encodeURIComponent(t('email.body'))}`
        : null;
    res.render('index', {
        lang,
        t,
        languages: Object.entries(locales).map(([code, l]) => ({ code, name: l.languageName || code })),
        itemName: itemName || t('something'),
        owner,
        website,
        mailto,
        appearance: config.appearance,
    });
}

async function recordScan(req, itemId, itemName) {
    const ip = normalizeIp(req.ip);
    if (!allowRecord(ip)) {
        log.info('SCAN', `Rate limit reached for ${ip}: scan of ${itemId} not recorded`);
        return;
    }
    const scan = {
        timestamp: new Date().toISOString(),
        itemId,
        itemName: itemName || null,
        known: Boolean(itemName),
        ip,
        userAgent: req.get('user-agent') || null,
        acceptLanguage: req.get('accept-language') || null,
        referer: req.get('referer') || null,
    };
    scan.geo = await lookupGeo(ip);
    store.append(scan);

    if (!scan.known) {
        log.info('SCAN', `Unknown item ${itemId} from ${ip} (recorded, no notification)`);
        return;
    }
    log.info('SCAN', `${itemName} (${itemId}) from ${ip} (${scan.geo.city}, ${scan.geo.country})`);
    if (allowNotify(`${ip}|${itemId}`)) await notify(scan);
    else log.info('SCAN', `Notification already sent for ${itemId} / ${ip} in this window`);
}

app.get('/', (req, res) => renderPage(req, res, null));

app.get('/i/:id', (req, res) => {
    const itemId = normalizeId(req.params.id).slice(0, 64);
    const itemName = items.get(itemId) || null;
    renderPage(req, res, itemName);
    // Answer first, then geolocate / store / notify in the background.
    // Switching language reloads the page with ?lang=: not a new scan.
    if (req.query.lang === undefined) {
        recordScan(req, itemId, itemName).catch((err) => log.error('SCAN', `Processing failed: ${err.message}`));
    }
});

// Admin API (x-admin-token header)
const tokenDigest = crypto.createHash('sha256').update(config.adminToken).digest();
function requireAdmin(req, res, next) {
    const given = crypto.createHash('sha256').update(req.get('x-admin-token') || '').digest();
    if (!crypto.timingSafeEqual(given, tokenDigest)) return res.status(403).json({ error: 'Unauthorized' });
    next();
}

// GET /api/scans?itemId=&from=&to=&format=json|csv  (/api/export kept as an alias)
app.get(['/api/scans', '/api/export'], requireAdmin, (req, res) => {
    const { itemId, from, to, format } = req.query;
    const range = {
        from: typeof from === 'string' ? parseDate(from) : 0,
        to: typeof to === 'string' ? parseDate(to, { endOfDay: true }) : Infinity,
    };
    if (range.from === null || range.to === null) return res.status(400).json({ error: 'Invalid date in from/to' });

    const scans = filterScans(store.readAll(), {
        itemId: typeof itemId === 'string' ? normalizeId(itemId) : null,
        ...range,
    });
    if (format === 'csv') return res.type('text/csv').attachment('scans.csv').send(toCsv(scans));
    res.json(scans);
});

app.use((err, req, res, next) => {
    log.error('HTTP', err.stack || err.message);
    res.status(500).send('Internal server error');
});

app.listen(config.port, () => {
    log.info('INFO', `tagd running on http://localhost:${config.port} (trust proxy: ${config.trustProxy})`);
});
