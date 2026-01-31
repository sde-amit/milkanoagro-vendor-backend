// Simple in-memory rate limiter implementation
class RateLimiter {
    constructor(windowMs, max, message) {
        this.windowMs = windowMs;
        this.max = max;
        this.message = message;
        this.requests = new Map();

        // Clean up old entries every minute
        setInterval(() => {
            const now = Date.now();
            for (const [key, data] of this.requests.entries()) {
                if (now - data.resetTime > this.windowMs) {
                    this.requests.delete(key);
                }
            }
        }, 60000);
    }

    middleware() {
        return (req, res, next) => {
            const key = this.getKey ? this.getKey(req) : req.ip;
            const now = Date.now();

            if (!this.requests.has(key)) {
                this.requests.set(key, {
                    count: 1,
                    resetTime: now
                });
                return next();
            }

            const data = this.requests.get(key);

            // Reset if window has passed
            if (now - data.resetTime > this.windowMs) {
                data.count = 1;
                data.resetTime = now;
                return next();
            }

            // Check if limit exceeded
            if (data.count >= this.max) {
                return res.status(429).json(this.message);
            }

            data.count++;
            next();
        };
    }

    setKeyGenerator(fn) {
        this.getKey = fn;
        return this;
    }
}

// General API rate limiter - More lenient for development
const generalLimiter = new RateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // max requests (increased for development)
    {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
).middleware();

// OTP specific rate limiter - More lenient for development
const otpLimiterInstance = new RateLimiter(
    5 * 60 * 1000, // 5 minutes
    10, // max requests (increased for development)
    {
        success: false,
        message: 'Too many OTP requests. Please wait 5 minutes before requesting again.'
    }
);

otpLimiterInstance.setKeyGenerator((req) => {
    return `${req.ip}-${req.body.phone || 'unknown'}`;
});

const otpLimiter = otpLimiterInstance.middleware();

// Login rate limiter - More lenient for development
const loginLimiter = new RateLimiter(
    15 * 60 * 1000, // 15 minutes
    50, // max requests (increased for development)
    {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.'
    }
).middleware();

// Export the general limiter as the default export
module.exports = generalLimiter;

// Also export named exports
module.exports.generalLimiter = generalLimiter;
module.exports.otpLimiter = otpLimiter;
module.exports.loginLimiter = loginLimiter;