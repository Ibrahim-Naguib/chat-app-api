import { Server } from 'socket.io';
import config from '../config/envConfig.js';
import { handleConnection } from './connectionHandler.js';
import { ValidationError } from '../utils/errors/customErrors.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.allowedOrigins?.split(',') || ['http://localhost:4000'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000,
    // Reconnection config
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    },
  });

  console.log('Socket.IO server initialized');

  // Handle all socket connections
  handleConnection(io);

  return io;
};

export const getIO = () => {
  if (!io) throw new ValidationError('Socket.io not initialized!');
  return io;
};

export { getOnlineUsers } from './connectionHandler.js';
export {
  emitNewMessage,
  emitTyping,
  emitStopTyping,
  emitUpdateOnlineUsers,
} from './emitters.js';
