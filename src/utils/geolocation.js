import http from 'http';
import { debug } from './logger.js';

const GEO_PREFIX = '[GEO]';

/**
 * Get client IP from request (x-forwarded-for aware)
 */
export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
}

/**
 * Fetch geolocation using ip-api.com
 */
export function fetchGeoLocation(ip) {
    return new Promise((resolve) => {
        debug(GEO_PREFIX, `Starting geolocation lookup for IP: ${ip}`);

        if (ip === 'unknown' || ip === '::1' || ip.startsWith('127.')) {
            debug(GEO_PREFIX, 'IP is localhost, returning local');
            resolve({ city: 'localhost', region: 'local', country: 'local' });
            return;
        }

        const timeout = setTimeout(() => {
            debug(GEO_PREFIX, `Lookup timeout for IP: ${ip}`);
            resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
        }, 5000);

        fetchIpApiGeo(ip, timeout, resolve);
    });
}

function fetchIpApiGeo(ip, timeout, resolve) {
    const url = `http://ip-api.com/json/${ip}?fields=city,region,country,status`;
    debug(GEO_PREFIX, `Requesting: ${url}`);

    http
        .get(url, (res) => {
            debug(GEO_PREFIX, `Response status code: ${res.statusCode}`);
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                clearTimeout(timeout);
                debug(GEO_PREFIX, `Response data: ${data}`);
                try {
                    const parsed = JSON.parse(data);
                    debug(GEO_PREFIX, `Parsed response: ${JSON.stringify(parsed)}`);

                    if (parsed.status === 'success') {
                        debug(GEO_PREFIX, `Success! City=${parsed.city}, Region=${parsed.region}, Country=${parsed.country}`);
                        resolve({
                            city: parsed.city || 'unknown',
                            region: parsed.region || 'unknown',
                            country: parsed.country || 'unknown',
                        });
                    } else {
                        debug(GEO_PREFIX, `ip-api.com returned status: ${parsed.status} for IP: ${ip}`);
                        resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
                    }
                } catch (e) {
                    debug(GEO_PREFIX, `Parse error for IP ${ip}: ${e.message}`);
                    resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
                }
            });
        })
        .on('error', (err) => {
            clearTimeout(timeout);
            debug(GEO_PREFIX, `Request error for IP ${ip}: ${err.message}`);
            resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
        });
}