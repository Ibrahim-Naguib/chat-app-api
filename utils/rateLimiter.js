import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-specific rate limiter (more strict)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/signup requests per hour
  message:
    'Too many auth attempts from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// Message rate limiter
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  message: 'Too many messages sent, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});
