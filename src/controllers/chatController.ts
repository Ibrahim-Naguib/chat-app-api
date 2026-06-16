import type { Request, Response, NextFunction } from 'express';
import { Chat } from '../models/Chat';
import { findUserByEmail } from '../services/authService';
import { BadRequestError } from '../utils/errors/customErrors';
import {
  findExistingChat,
  createNewPrivateChat,
  findChatById,
  ensureGroupAdmin,
  ensureUserInChat,
} from '../services/chatService';
import { uploadToCloudinary, deleteFromCloudinary, getPublicId } from '../services/storageService';
import type { AuthenticatedRequest } from '../types/index';

export const accessChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    const targetUser = await findUserByEmail(email);
    if (targetUser._id.toString() === userId) {
      return next(new BadRequestError('Cannot create chat with yourself'));
    }

    const chat = await findExistingChat(userId, targetUser._id.toString());
    if (chat) {
      res.json(chat);
      return;
    }

    const newChat = await createNewPrivateChat(userId, targetUser);
    res.status(201).json(newChat);
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    const chats = await Chat.find({ users: userId })
      .populate('users', 'name email profilePicture')
      .populate('groupAdmin', 'name email profilePicture')
      .populate({
        path: 'latestMessage',
        select: 'content sender createdAt',
        populate: {
          path: 'sender',
          select: 'name email profilePicture',
        },
      })
      .sort({ updatedAt: -1 })
      .select('-__v');

    res.json(chats);
  } catch (error) {
    next(error);
  }
};

export const createGroupChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, users } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    const userIds = await Promise.all(
      users.map(async (email: string) => {
        const user = await findUserByEmail(email, `User not found with email: ${email}`);
        return user._id;
      })
    );

    userIds.push(userId);

    const chat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: userIds,
      groupAdmin: userId,
      createdBy: userId,
    });

    const fullChat = await findChatById(chat._id.toString());
    res.status(201).json(fullChat);
  } catch (error) {
    next(error);
  }
};

export const renameGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId, chatName } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    const chat = await findChatById(chatId, false);
    ensureGroupAdmin(chat, userId);

    chat.chatName = chatName;
    await chat.save();

    const updatedChat = await findChatById(chatId);
    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

export const addToGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId, email } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    const chat = await findChatById(chatId, false);
    ensureGroupAdmin(chat, userId);

    const userToAdd = await findUserByEmail(email);

    if (chat.users.some((uId: any) => uId.toString() === userToAdd._id.toString())) {
      return next(new BadRequestError('User is already a member of this group'));
    }

    chat.users.push(userToAdd._id);
    await chat.save();

    const updatedChat = await findChatById(chatId);
    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

export const removeFromGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId, userId: targetUserId } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    const chat = await findChatById(chatId, false);
    ensureGroupAdmin(chat, userId);

    // Prevent admin from removing themselves
    if (targetUserId === userId) {
      return next(new BadRequestError('Admin cannot remove themselves from the group'));
    }

    // Check if target user is in the group
    const isMember = chat.users.some((id: any) => id.toString() === targetUserId);
    if (!isMember) {
      return next(new BadRequestError('User is not a member of this group'));
    }

    // Prevent removing the group admin
    if (chat.isGroupChat && chat.groupAdmin && chat.groupAdmin.toString() === targetUserId) {
      return next(new BadRequestError('Cannot remove the group admin'));
    }

    chat.users = chat.users.filter((id: any) => id.toString() !== targetUserId);
    await chat.save();

    const updatedChat = await findChatById(chatId);
    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

export const uploadGroupPicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.body.chatId;
    const userId = (req as AuthenticatedRequest).user.id;

    const chat = await findChatById(chatId, false);
    ensureUserInChat(chat, userId);
    ensureGroupAdmin(chat, userId);

    if (!req.file) {
      return next(new BadRequestError('Please upload an image file'));
    }

    const result = await uploadToCloudinary(req.file, 'groups', chatId);

    chat.groupPicture = result.url;
    await chat.save();

    res.json({ message: 'Group picture updated successfully', groupPicture: chat.groupPicture });
  } catch (error) {
    next(error);
  }
};

export const removeGroupPicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.body.chatId;
    const userId = (req as AuthenticatedRequest).user.id;

    const chat = await findChatById(chatId, false);
    ensureUserInChat(chat, userId);
    ensureGroupAdmin(chat, userId);

    if (chat.groupPicture && !chat.groupPicture.includes('icon-library.com')) {
      const publicId = getPublicId('groups', chatId);
      await deleteFromCloudinary(publicId);
    }

    chat.groupPicture = 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
    await chat.save();

    res.json({ message: 'Group picture removed successfully', groupPicture: chat.groupPicture });
  } catch (error) {
    next(error);
  }
};
