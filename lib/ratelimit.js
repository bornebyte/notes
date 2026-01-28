// Simple in-memory rate limiter
// For production, consider using Redis or a dedicated rate limiting service

const rateLimitStore = new Map();

// Clean up old entries every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > 3600000) { // 1 hour
            rateLimitStore.delete(key);
        }
    }
}, 3600000);

export function rateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const key = identifier;

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs,
        });
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs
        };
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetTime) {
        // Window has expired, reset
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs,
        });
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs
        };
    }

    if (record.count >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: record.resetTime,
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        };
    }

    record.count++;
    return {
        allowed: true,
        remaining: maxRequests - record.count,
        resetTime: record.resetTime
    };
}
