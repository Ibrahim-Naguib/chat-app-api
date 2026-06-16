import type { Request, Response, NextFunction } from 'express';
import { emitNewMessage, emitMessageRead, emitMessageEdited } from '../socket/emitters';
import {
  getMessagesService,
  sendMessageService,
  markMessagesAsRead,
  updateMessageService,
} from '../services/messageService';
import type { AuthenticatedRequest } from '../types/index';

export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, chatId } = req.body;
    const user = (req as AuthenticatedRequest).user;

    const { message } = await sendMessageService(user, content, chatId);

    emitNewMessage(chatId, message);

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messageId = req.params.messageId as string;
    const { content } = req.body;
    const user = (req as AuthenticatedRequest).user;

    const message = await updateMessageService(user, messageId, content);

    emitMessageEdited(message.chat._id.toString(), message);

    res.json(message);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId as string;
    const user = (req as AuthenticatedRequest).user;

    await markMessagesAsRead(user, chatId);

    emitMessageRead(chatId, user.id);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId as string;
    const page = typeof req.query.page === 'string' ? req.query.page : '1';
    const limit = typeof req.query.limit === 'string' ? req.query.limit : '10';
    const user = (req as AuthenticatedRequest).user;

    const { messages, pagination } = await getMessagesService(
      user,
      chatId,
      Number(page),
      Number(limit)
    );

    res.json({ messages, pagination });
  } catch (error) {
    next(error);
  }
};
