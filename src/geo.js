import { log } from './logger.js';

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

export const normalizeIp = (ip = '') => ip.replace(/^::ffff:/, '');

// ip-api.com free endpoint: HTTP only, 45 requests/min per IP, non-commercial use only.
export async function lookupGeo(ip) {
    if (!ip || PRIVATE_IP.test(ip)) return { city: 'local', region: 'local', country: 'local' };
    const unknown = { city: 'unknown', region: 'unknown', country: 'unknown' };
    try {
        const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,region,country`, {
            signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        if (data.status !== 'success') {
            log.debug('GEO', `ip-api returned "${data.status}" for ${ip}`);
            return unknown;
        }
        return { city: data.city || 'unknown', region: data.region || 'unknown', country: data.country || 'unknown' };
    } catch (err) {
        log.debug('GEO', `Lookup failed for ${ip}: ${err.message}`);
        return unknown;
    }
}
