import config from './envConfig.js';
import { ForbiddenError } from '../utils/errors/customErrors.js';

const corsOptions = {
  origin:
    config.nodeEnv === 'production'
      ? (origin, callback) => {
          const allowedOrigins = config.allowedOrigins
            ? config.allowedOrigins.split(',').map((url) => url.trim())
            : ['http://localhost:4000'];

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            console.warn(`Blocked by CORS: ${origin}`);
            callback(new ForbiddenError('Not allowed by CORS'));
          }
        }
      : true, // Allow all in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
};
export default corsOptions;
