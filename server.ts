import logger from './src/config/logger.js';
import app from './src/app';
import config from './src/config/envConfig';
import { connectDatabase } from './src/config/database';
import { initSocket } from './src/socket/index';
import {
  unhandledRejection,
  uncaughtException,
} from './src/middleware/errorMiddleware';

uncaughtException();

await connectDatabase();

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

initSocket(server);

unhandledRejection(server);
