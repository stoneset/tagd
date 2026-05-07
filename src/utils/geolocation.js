import https from 'https';

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
 * Fetch geolocation from MaxMind GeoIP2 or fallback to ip-api.com
 */
export function fetchGeoLocation(ip) {
    return new Promise((resolve) => {
        if (ip === 'unknown' || ip === '::1' || ip.startsWith('127.')) {
            resolve({ city: 'localhost', region: 'local', country: 'local' });
            return;
        }

        // Set a timeout for the entire geolocation lookup
        const timeout = setTimeout(() => {
            console.warn(`Geolocation lookup timeout for IP: ${ip}`);
            resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
        }, 5000);

        // Use MaxMind GeoIP2 if credentials are provided
        if (process.env.MAXMIND_ACCOUNT_ID && process.env.MAXMIND_LICENSE_KEY) {
            fetchMaxMindGeo(ip, timeout, resolve);
        } else {
            fetchIpApiGeo(ip, timeout, resolve);
        }
    });
}

function fetchMaxMindGeo(ip, timeout, resolve) {
    const accountId = process.env.MAXMIND_ACCOUNT_ID;
    const licenseKey = process.env.MAXMIND_LICENSE_KEY;
    const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64');

    const url = `https://geoip.maxmind.com/geoip/v2.1/city/${ip}`;
    const options = {
        headers: {
            'Authorization': `Basic ${auth}`
        }
    };

    https
        .get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                clearTimeout(timeout);
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve({
                            city: (parsed.city && parsed.city.names && parsed.city.names.en) || 'unknown',
                            region: (parsed.subdivisions && parsed.subdivisions[0] && parsed.subdivisions[0].names && parsed.subdivisions[0].names.en) || 'unknown',
                            country: (parsed.country && parsed.country.names && parsed.country.names.en) || 'unknown',
                        });
                    } else {
                        resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
                    }
                } catch (e) {
                    resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
                }
            });
        })
        .on('error', () => {
            clearTimeout(timeout);
            resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
        });
}

function fetchIpApiGeo(ip, timeout, resolve) {
    const url = `https://ip-api.com/json/${ip}?fields=city,region,country,status`;
    https
        .get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                clearTimeout(timeout);
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.status === 'success') {
                        resolve({
                            city: parsed.city || 'unknown',
                            region: parsed.region || 'unknown',
                            country: parsed.country || 'unknown',
                        });
                    } else {
                        console.warn(`[GEO] ip-api.com returned status: ${parsed.status} for IP: ${ip}`);
                        resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
                    }
                } catch (e) {
                    console.warn(`[GEO] Parse error for IP ${ip}: ${e.message}`);
                    resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
                }
            });
        })
        .on('error', (err) => {
            clearTimeout(timeout);
            console.warn(`[GEO] Request error for IP ${ip}: ${err.message}`);
            resolve({ city: 'unknown', region: 'unknown', country: 'unknown' });
        });
}