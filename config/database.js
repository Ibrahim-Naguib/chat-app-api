import mongoose from 'mongoose';
import config from './envConfig.js';

export const connectDatabase = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(
      'MongoDB URI:',
      config.mongoUri ? 'URI is set' : 'URI is missing'
    );

    const options = {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(config.mongoUri, options);
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Full error:', err);
    process.exit(1); // Exit process with failure
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during database disconnection:', err);
    process.exit(1);
  }
});
