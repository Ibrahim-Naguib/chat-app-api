import config from './envConfig.js';

const corsOptions = {
  origin:
    config.nodeEnv === 'production'
      ? (origin, callback) => {
          const allowedOrigins = config.allowedOrigins
            ? config.allowedOrigins.split(',').map((url) => url.trim())
            : ['https://chat-app-mu-plum.vercel.app'];

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            console.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
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
