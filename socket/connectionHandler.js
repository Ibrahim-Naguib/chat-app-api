import jwt from 'jsonwebtoken';
import config from '../config/envConfig.js';
import { setupEventHandlers } from './eventHandlers.js';
import { emitUpdateOnlineUsers } from './emitters.js';

const onlineUsers = new Map();

// Socket authentication middleware
const authMiddleware = async (socket, next) => {
  try {
    const token = extractTokenFromCookies(socket.handshake.headers.cookie);
    if (!token) {
      return next(new Error('Authentication token is required'));
    }
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    console.error('Socket Authentication Error:', error.message);
    return next(new Error('Authentication failed'));
  }
};

// Extract token from cookie string
const extractTokenFromCookies = (cookies = '') => {
  if (!cookies) return null;
  return cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('accessToken='))
    ?.split('=')[1];
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
