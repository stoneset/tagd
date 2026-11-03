// Sliding-window limiter: allow(key) returns false once `max` hits happened within `windowMs`.
export function createLimiter(windowMs, max) {
    const hits = new Map();
    const recent = (key, now) => (hits.get(key) || []).filter((t) => now - t < windowMs);

    // Purge expired keys so the map does not grow forever
    setInterval(() => {
        const now = Date.now();
        for (const key of hits.keys()) {
            const kept = recent(key, now);
            if (kept.length) hits.set(key, kept);
            else hits.delete(key);
        }
    }, windowMs).unref();

    return function allow(key) {
        const now = Date.now();
        const kept = recent(key, now);
        const allowed = kept.length < max;
        if (allowed) kept.push(now);
        hits.set(key, kept);
        return allowed;
    };
}
