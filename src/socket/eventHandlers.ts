import type { Socket } from 'socket.io';
import { emitTyping, emitStopTyping } from './emitters';

export const setupEventHandlers = (socket: Socket, userId: string): void => {
  socket.on('joinRoom', (chatId: string) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  socket.on('leaveRoom', (chatId: string) => {
    if (!chatId) return;
    socket.leave(chatId);
  });

  socket.on('typing', ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    emitTyping(chatId, userId);
  });

  socket.on('stopTyping', ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    emitStopTyping(chatId, userId);
  });
};
