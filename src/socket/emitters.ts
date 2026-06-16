import type { Server } from 'socket.io';
import { getIO } from './index';

const safeEmit = (fn: (io: Server) => void): void => {
  const io = getIO();
  if (io) fn(io);
};

export const emitNewMessage = (chatId: string, message: unknown): void => {
  safeEmit((io) => {
    io.to(chatId).emit('newMessage', message);
    io.emit('chatListUpdate', { chatId, latestMessage: message });
  });
};

export const emitTyping = (chatId: string, userId: string): void => {
  safeEmit((io) => {
    io.to(chatId).emit('typing', { userId, chatId });
  });
};

export const emitStopTyping = (chatId: string, userId: string): void => {
  safeEmit((io) => {
    io.to(chatId).emit('stopTyping', { userId, chatId });
  });
};

export const emitUpdateOnlineUsers = (onlineUsers: Map<string, string>): void => {
  safeEmit((io) => {
    io.emit('updateOnlineUsers', Array.from(onlineUsers.keys()));
  });
};

export const emitMessageRead = (chatId: string, userId: string): void => {
  safeEmit((io) => {
    io.to(chatId).emit('messageRead', { chatId, userId, readAt: new Date() });
  });
};

export const emitMessageEdited = (chatId: string, message: unknown): void => {
  safeEmit((io) => {
    io.to(chatId).emit('messageEdited', message);
  });
};
