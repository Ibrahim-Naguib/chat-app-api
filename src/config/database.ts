import logger from './logger';
import mongoose from 'mongoose';
import config from './envConfig';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    await mongoose.connect(config.mongoUri, options);
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)), 'MongoDB connection error');
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(err instanceof Error ? err : new Error(String(err)), 'MongoDB connection error');
});

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)), 'Database disconnection error');
    process.exit(1);
  }
});
