import asyncHandler from 'express-async-handler';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { findUserByEmail } from '../services/authService.js';
import { AppError } from '../utils/errors/AppError.js';
import { removeFile, serveFile, uploadFile } from '../services/imageService.js';
import {
  handlePrivateChatDeletion,
  findExistingChat,
  createNewPrivateChat,
  restoreDeletedChat,
  findChatById,
  ensureGroupAdmin,
  ensureUserInChat,
} from '../services/chatService.js';

// Create or access a direct chat between two users
export const accessChat = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const targetUser = await findUserByEmail(email);
  if (targetUser._id.toString() === req.user.id) {
    throw new AppError('Cannot create chat with yourself', 400);
  }

  const chat = await findExistingChat(req.user.id, targetUser._id);
  if (chat) {
    const { updatedChat } = await restoreDeletedChat(chat, req.user.id);
    return res.json(updatedChat);
  }

  const newChat = await createNewPrivateChat(req.user.id, targetUser);
  res.status(201).json(newChat);
});

export const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({
    users: req.user.id,
    deletedBy: { $ne: req.user.id },
    $or: [
      { latestMessage: { $exists: true } },
      { createdBy: req.user.id },
      { isGroupChat: true },
    ],
  })
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
});

// Delete a chat
export const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  const chat = await findChatById(chatId, false);

  ensureUserInChat(chat, req.user.id);

  if (!chat.isGroupChat) {
    const result = await handlePrivateChatDeletion(chat, req.user.id);
    if (result.deleted) {
      return res.status(200).json({ message: 'Chat permanently deleted' });
    }
  } else {
    await Chat.findByIdAndDelete(chatId); // For group: permanent delete
  }

  res.status(200).json({ message: 'Chat deleted successfully' });
});

// Create group chat
export const createGroupChat = asyncHandler(async (req, res) => {
  const { name, users } = req.body;

  // Find users by email and get their IDs
  const userIds = await Promise.all(
    users.map(async (email) => {
      const user = await findUserByEmail(
        email,
        `User not found with email: ${email}`
      );
      return user._id;
    })
  );

  // Add current user
  userIds.push(req.user.id);

  const chat = await Chat.create({
    chatName: name,
    isGroupChat: true,
    users: userIds,
    groupAdmin: req.user.id,
    createdBy: req.user.id,
  });

  const fullChat = await findChatById(chat._id);

  res.status(201).json(fullChat);
});

// Rename group
export const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const chat = await findChatById(chatId, false);

  // Only group admin can rename
  ensureGroupAdmin(chat, req.user.id);

  chat.chatName = chatName;
  await chat.save();

  const updatedChat = await findChatById(chatId);

  res.json(updatedChat);
});

// Add user to group
export const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, email } = req.body;

  const chat = await findChatById(chatId, false);

  // Only admin can add members
  ensureGroupAdmin(chat, req.user.id);

  // Find user by email
  const userToAdd = await findUserByEmail(email);

  if (
    chat.users.some((userId) => userId.toString() === userToAdd._id.toString())
  ) {
    throw new AppError('User is already a member of this group', 400);
  }

  chat.users.push(userToAdd._id);
  await chat.save();

  const updatedChat = await findChatById(chatId);

  res.json(updatedChat);
});

export const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await findChatById(chatId, false);

  ensureGroupAdmin(chat, req.user.id);

  chat.users = chat.users.filter((id) => id.toString() !== userId);
  await chat.save();

  const updatedChat = await findChatById(chatId);

  res.json(updatedChat);
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const { chatId } = req.body;

  const chat = await findChatById(chatId, false);

  ensureUserInChat(chat, req.user.id);

  const isAdmin = chat.groupAdmin.toString() === req.user.id;

  chat.users = chat.users.filter((id) => id.toString() !== req.user.id);

  if (chat.users.length === 0) {
    await Message.deleteMany({ chat: chatId });

    await Chat.findByIdAndDelete(chatId);
    return res.status(200).json({
      status: 'success',
      message: 'Left group chat successfully',
    });
  }

  if (isAdmin && chat.users.length > 0) {
    chat.groupAdmin = chat.users[0];
  }

  await chat.save();

  res.status(200).json({
    status: 'success',
    message: 'Left group chat successfully',
  });
});

export const getGroupPicture = asyncHandler(async (req, res) => {
  serveFile(req, res, 'groups');
});

export const uploadGroupPicture = asyncHandler(async (req, res) => {
  const chat = await findChatById(req.body.chatId, false);
  ensureUserInChat(chat, req.user.id);
  ensureGroupAdmin(chat, req.user.id);
  uploadFile(req, res, Chat, 'groupPicture', 'groups');
});

export const removeGroupPicture = asyncHandler(async (req, res) => {
  const chat = await findChatById(req.body.chatId, false);
  ensureUserInChat(chat, req.user.id);
  ensureGroupAdmin(chat, req.user.id);
  removeFile(req, res, Chat, 'groupPicture', 'groups');
});
