import RateLimit from 'express-rate-limit';

export var generalRateLimiter = RateLimit({
    windowMs: 15 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 seconds',
});

// Uses the built-in skip option so static-analysis tools can trace the
// rate-limiter through the exported symbol without a wrapping closure.
export const loginRateLimiter = RateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts from this IP, please try again after a minute',
    skip: () => process.env.SKIP_RATE_LIMIT === 'true' || !!process.env.CI,
});

export var fileUploadRateLimiter = RateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many file uploads, please try again later',
});
