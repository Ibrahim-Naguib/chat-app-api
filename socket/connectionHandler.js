import jwt from 'jsonwebtoken';
import config from '../config/envConfig.js';
import { AuthenticationError } from '../utils/errors/customErrors.js';
import { setupEventHandlers } from './eventHandlers.js';
import { emitUpdateOnlineUsers } from './emitters.js';

const onlineUsers = new Map();

const authMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new AuthenticationError('Not authorized, no token'));
    }

    // Verify the JWT token using socket-specific secret
    const decoded = jwt.verify(token, config.jwtAccessSecret);

    socket.userId = decoded.id;
    next();
  } catch (error) {
    return next(new AuthenticationError('Not authorized, token failed'));
  }
};

// Handle new socket connections
export const handleConnection = (io) => {
  // Apply authentication middleware
  io.use(authMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.userId;

    console.log(`User connected: ${userId}`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);
    emitUpdateOnlineUsers(onlineUsers);

    // Setup event handlers for this socket
    setupEventHandlers(socket, userId);

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      emitUpdateOnlineUsers(onlineUsers);
    });

    // Error handling
    socket.on('error', (err) => {
      console.error(`Socket error for user ${userId}:`, err);
    });
  });
};

export const getOnlineUsers = () => {
  return onlineUsers;
};
