import { getClientIp } from './geolocation.js';

const ipRequestMap = new Map();

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(config) {
    return (req, res, next) => {
        if (!config.rateLimit || !config.rateLimit.enabled) {
            return next();
        }

        const ip = getClientIp(req);
        const windowMs = config.rateLimit.windowMs || 900000; // 15 minutes default
        const maxRequests = config.rateLimit.maxRequests || 10;
        const now = Date.now();

        if (!ipRequestMap.has(ip)) {
            ipRequestMap.set(ip, []);
        }

        const requests = ipRequestMap.get(ip);
        const recentRequests = requests.filter(time => now - time < windowMs);

        if (recentRequests.length >= maxRequests) {
            console.warn(`[RATE LIMIT] IP ${ip} exceeded limit`);
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        recentRequests.push(now);
        ipRequestMap.set(ip, recentRequests);
        next();
    };
}