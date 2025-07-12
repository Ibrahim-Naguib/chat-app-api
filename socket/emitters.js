import { getIO } from './index.js';
import { ValidationError } from '../utils/errors/customErrors.js';

// Emit a new message to a chat room and update chat list
export const emitNewMessage = (chatId, message) => {
  if (!chatId || !message) {
    throw new ValidationError('Chat ID and message are required');
  }
  const io = getIO();
  io.to(chatId).emit('newMessage', message);
  io.emit('chatListUpdate', { chatId, latestMessage: message });
};

// Emit typing indicator to a chat room
export const emitTyping = (chatId, userId) => {
  if (!chatId || !userId) {
    throw new ValidationError('Chat ID and user ID are required');
  }
  const io = getIO();
  io.to(chatId).emit('typing', { userId, chatId });
};

// Emit stop typing indicator to a chat room
export const emitStopTyping = (chatId, userId) => {
  if (!chatId || !userId) {
    throw new ValidationError('Chat ID and user ID are required');
  }
  const io = getIO();
  io.to(chatId).emit('stopTyping', { userId, chatId });
};

// Emit updated online users list to all clients
export const emitUpdateOnlineUsers = (onlineUsers) => {
  const io = getIO();
  io.emit('updateOnlineUsers', Array.from(onlineUsers.keys()));
};
