import type { CorsOptions } from 'cors';
import config from './envConfig';
import { ForbiddenError } from '../utils/errors/customErrors';

const corsOptions: CorsOptions = {
  origin:
    config.isProd
      ? (origin, callback) => {
          const allowedOrigins = config.allowedOrigins
            ? config.allowedOrigins.split(',').map((url) => url.trim())
            : ['http://localhost:4000'];

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new ForbiddenError('Not allowed by CORS'));
          }
        }
      : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
};

export default corsOptions;
