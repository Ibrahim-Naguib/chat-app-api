import pino from 'pino';
import config from './envConfig';

const logger = pino({
  level: config.isProd ? 'info' : 'debug',
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    err: pino.stdSerializers.err,
  },
});

export default logger;
