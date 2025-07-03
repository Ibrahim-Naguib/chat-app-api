import jwt from 'jsonwebtoken';
import config from '../config/envConfig.js';
import { setupEventHandlers } from './eventHandlers.js';
import { emitUpdateOnlineUsers } from './emitters.js';

const onlineUsers = new Map();

// Socket authentication middleware - JWT ONLY (NO COOKIES)
// This middleware enforces JWT-based authentication for Socket.IO connections
// and explicitly does NOT use cookies for authentication
const authMiddleware = async (socket, next) => {
  try {
    // ONLY check for JWT token in the auth object - NO cookie fallback
    const token = socket.handshake.auth?.token;

    console.log(
      'Socket Auth - JWT Token:',
      token ? 'Token received' : 'No token found'
    );

    if (!token) {
      console.error('Socket Auth Error: No JWT token found in auth object');
      console.log('Auth object received:', socket.handshake.auth);
      return next(new Error('JWT token is required for socket authentication'));
    }

    // Verify the JWT token using socket-specific secret
    const decoded = jwt.verify(
      token,
      config.jwtSocketSecret || config.jwtAccessSecret
    );

    // Verify this is a socket token (if type is present)
    if (decoded.type && decoded.type !== 'socket') {
      throw new Error('Invalid token type for socket authentication');
    }

    socket.userId = decoded.id;
    console.log(
      `Socket authenticated successfully for user: ${decoded.id} (JWT-based)`
    );
    next();
  } catch (error) {
    console.error('Socket JWT Authentication Error:', error.message);
    return next(new Error('Socket JWT authentication failed'));
  }
};

// Handle new socket connections
export const handleConnection = (io) => {
  // Apply authentication middleware
  // io.use(authMiddleware);

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
