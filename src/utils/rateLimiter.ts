import rateLimit from 'express-rate-limit';
import config from '../config/envConfig';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProd ? 100 : 1000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: config.isProd ? 60 * 60 * 1000 : 5 * 60 * 1000,
  max: config.isProd ? 10 : 100,
  message: 'Too many auth attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many messages sent, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});
