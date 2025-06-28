import asyncHandler from 'express-async-handler';
import { emitNewMessage } from '../socket/index.js';
import {
  getMessagesService,
  sendMessageService,
} from '../services/messageService.js';

export const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  const { message } = await sendMessageService(req.user, content, chatId);

  // Emit socket event for real-time message
  emitNewMessage(chatId, message);

  res.status(201).json(message);
});

export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const { messages, pagination } = await getMessagesService(
    req.user,
    chatId,
    page,
    limit
  );
  res.json({
    messages,
    pagination,
  });
});
