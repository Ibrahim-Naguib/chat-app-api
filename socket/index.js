import { Server } from 'socket.io';
import config from '../config/envConfig.js';
import { handleConnection } from './connectionHandler.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.allowedOrigins?.split(',') || ['http://localhost:4000'],
      credentials: true,
    },
    // Reconnection config
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    },
  });

  // Handle all socket connections
  handleConnection(io);

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export { getOnlineUsers } from './connectionHandler.js';
export {
  emitNewMessage,
  emitTyping,
  emitStopTyping,
  emitUpdateOnlineUsers,
} from './emitters.js';
