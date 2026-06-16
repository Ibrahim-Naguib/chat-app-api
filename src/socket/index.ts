import logger from '../config/logger';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import config from '../config/envConfig';
import { setupEventHandlers } from './eventHandlers';
import { emitUpdateOnlineUsers } from './emitters';
import { AuthenticationError } from '../utils/errors/customErrors';
import type { AuthPayload } from '../types/index';

const onlineUsers = new Map<string, string>();

interface AuthenticatedSocket extends Socket {
  userId: string;
}

let io: Server;

const authMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new AuthenticationError('Not authorized, no token'));
    }

    const decoded = jwt.verify(token, config.jwtSocketSecret) as AuthPayload;
    (socket as AuthenticatedSocket).userId = decoded.id;
    next();
  } catch {
    return next(new AuthenticationError('Not authorized, token failed'));
  }
};

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: config.allowedOrigins?.split(',') || ['http://localhost:4000'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.use(authMiddleware);

  io.on('connection', (socket) => {
    const userId = (socket as AuthenticatedSocket).userId;

    onlineUsers.set(userId, socket.id);
    emitUpdateOnlineUsers(onlineUsers);

    setupEventHandlers(socket, userId);

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      emitUpdateOnlineUsers(onlineUsers);
    });

    socket.on('error', (err: Error) => {
      logger.error({ err }, `Socket error for user ${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server | null => {
  return io || null;
};

export { onlineUsers as getOnlineUsers };
