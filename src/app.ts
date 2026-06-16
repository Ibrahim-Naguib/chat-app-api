import logger from './config/logger';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';

import { errorHandler } from './middleware/errorMiddleware';
import { apiLimiter, authLimiter } from './utils/rateLimiter';
import { AppError } from './utils/errors/AppError';
import { setupSwagger } from './config/swagger';
import { initCloudinary } from './config/cloudinary';

import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import corsOptions from './config/corsConfig';

const app = express();

// Trust proxy
app.set('trust proxy', 1);

initCloudinary();

// Swagger documentation
setupSwagger(app);

// Compression
app.use(compression());

// Security
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
  }),
);
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// NoSQL injection protection
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ key }: { req: express.Request; key: string }) => {
      logger.warn(`Sanitized potentially malicious input: ${key}`);
    },
  }),
);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.all('*', (req, _res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handler
app.use(errorHandler);

export default app;
