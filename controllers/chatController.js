import asyncHandler from 'express-async-handler';
import { Chat } from '../models/Chat.js';
import { findUserByEmail } from '../services/authService.js';
import { BadRequestError } from '../utils/errors/customErrors.js';
import { removeFile, serveFile, uploadFile } from '../services/imageService.js';
import {
  findExistingChat,
  createNewPrivateChat,
  findChatById,
  ensureGroupAdmin,
  ensureUserInChat,
} from '../services/chatService.js';

// Create or access a direct chat between two users
export const accessChat = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const targetUser = await findUserByEmail(email);
  if (targetUser._id.toString() === req.user.id) {
    throw new BadRequestError('Cannot create chat with yourself');
  }

  const chat = await findExistingChat(req.user.id, targetUser._id);
  if (chat) {
    return res.json(chat);
  }

  const newChat = await createNewPrivateChat(req.user.id, targetUser);
  res.status(201).json(newChat);
});

export const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({
    users: req.user.id,
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
    throw new BadRequestError('User is already a member of this group');
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
