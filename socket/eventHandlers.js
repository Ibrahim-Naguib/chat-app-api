import { emitTyping, emitStopTyping } from './emitters.js';

// Setup all event handlers for a socket
export const setupEventHandlers = (socket, userId) => {
  // Join a chat room
  socket.on('joinRoom', (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
    console.log(`User ${userId} joined room: ${chatId}`);
  });

  // Leave a chat room
  socket.on('leaveRoom', (chatId) => {
    if (!chatId) return;
    socket.leave(chatId);
    console.log(`User ${userId} left room: ${chatId}`);
  });

  // Handle typing events
  socket.on('typing', ({ chatId }) => {
    if (!chatId) return;
    emitTyping(chatId, userId);
  });

  // Handle stop typing events
  socket.on('stopTyping', ({ chatId }) => {
    if (!chatId) return;
    emitStopTyping(chatId, userId);
  });
};
