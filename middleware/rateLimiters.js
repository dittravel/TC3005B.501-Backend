/**
 * Rate Limiting Middleware
 * 
 * This module provides rate limiting middleware to protect against
 * abuse and DoS attacks. It implements different rate limits for
 * various types of operations to ensure system stability and security.
 */

import RateLimit from 'express-rate-limit';

// General rate limiter for all requests
export var generalRateLimiter = RateLimit({
    windowMs: 15 * 1000, // 15 seconds
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 seconds',
});

// Rate limiter specifically for login attempts
const _loginRateLimiter = RateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many login attempts from this IP, please try again after a minute',
});
// Skip rate limiting in test/CI so E2E suites are not throttled.
// Checks SKIP_RATE_LIMIT explicitly because dotenv({ override: true }) in lib/prisma.js
// will overwrite NODE_ENV from .env before this middleware is ever called.
export const loginRateLimiter = (req, res, next) => {
    if (process.env.SKIP_RATE_LIMIT === 'true' || process.env.CI) return next();
    return _loginRateLimiter(req, res, next);
};

// Rate limiter for file uploads and expensive operations
export var fileUploadRateLimiter = RateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 uploads per windowMs
    message: 'Too many file uploads, please try again later',
});
