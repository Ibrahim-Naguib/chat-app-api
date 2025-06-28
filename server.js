import app from './app.js';
import config from './config/envConfig.js';
import { connectDatabase } from './config/database.js';
import { initSocket } from './socket/index.js';
import {
  unhandledRejection,
  uncaughtException,
} from './middleware/errorMiddleware.js';

// Handle uncaught exceptions
uncaughtException();

// Connect to database
connectDatabase();

const server = app.listen(config.port, () => {
  console.log(
    `Server is running on port ${config.port} in ${config.nodeEnv} mode`
  );
});

initSocket(server);

unhandledRejection(server);
