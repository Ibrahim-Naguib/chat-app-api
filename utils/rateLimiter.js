import rateLimit from 'express-rate-limit';
import config from '../config/envConfig.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'production' ? 100 : 1000, // More lenient in development
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-specific rate limiter (more strict)
export const authLimiter = rateLimit({
  windowMs: config.nodeEnv === 'production' ? 60 * 60 * 1000 : 5 * 60 * 1000, // 1 hour in prod, 5 minutes in dev
  max: config.nodeEnv === 'production' ? 10 : 100, // 10 in prod, 100 in dev
  message: 'Too many auth attempts from this IP, please try again later',
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
