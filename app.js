import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler } from './middleware/errorMiddleware.js';
import mongoSanitize from 'express-mongo-sanitize';
import { apiLimiter, authLimiter } from './utils/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

import corsOptions from './config/corsConfig.js';
import { AppError } from './utils/errors/AppError.js';

const app = express();

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compression middleware for better performance
app.use(compression());

// Security Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// NoSQL Injection Protection
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized potentially malicious input: ${key}`);
    },
  })
);

// Rate Limiting
app.use('/api/', apiLimiter); // General API rate limiting
app.use('/api/auth/', authLimiter); // Stricter rate limiting for auth routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// Serve static files
app.use('/profiles', express.static(path.join(__dirname, 'uploads/profiles')));
app.use('/groups', express.static(path.join(__dirname, 'uploads/groups')));

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(errorHandler);

export default app;
