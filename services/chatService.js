import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { NotFoundError, ForbiddenError } from '../utils/errors/customErrors.js';

// Find chat by ID with optional population
export const findChatById = async (chatId, populate = true) => {
  let query = Chat.findById(chatId);
  if (populate) {
    query = query
      .populate(
        'users',
        '-password -refreshToken -passwordResetCode -passwordResetExpires -passwordResetVerified -createdAt -updatedAt -__v'
      )
      .populate(
        'groupAdmin',
        '-password -refreshToken -passwordResetCode -passwordResetExpires -passwordResetVerified -createdAt -updatedAt -__v'
      )
      .populate('latestMessage', '-__v');
  }
  const chat = await query.select('-__v');
  if (!chat) {
    throw new NotFoundError('Chat not found');
  }

  // Remove groupPicture for non-group chats
  if (!chat.isGroupChat && chat.groupPicture) {
    chat.groupPicture = undefined;
  }

  return chat;
};

// Only allow group admin to perform certain actions
export const ensureGroupAdmin = (chat, userId) => {
  if (chat.groupAdmin.toString() !== userId) {
    throw new ForbiddenError('Only admin can perform this action');
  }
};

// Ensure user is part of the chat before performing actions
export const ensureUserInChat = (chat, userId) => {
  if (!chat.users.some((id) => id.toString() === userId)) {
    throw new ForbiddenError('You are not part of this chat');
  }
};

// Find an existing chat between two users
export const findExistingChat = async (userId, targetUserId) => {
  return Chat.findOne({
    isGroupChat: false,
    users: { $all: [userId, targetUserId], $size: 2 },
  })
    .populate(
      'users',
      '-password -refreshToken -passwordResetCode -passwordResetExpires -passwordResetVerified -createdAt -updatedAt -__v'
    )
    .populate('latestMessage', '-__v')
    .select('-__v');
};

// Create a new private chat between two users
export const createNewPrivateChat = async (userId, targetUser) => {
  let chat = await Chat.create({
    chatName: targetUser.name,
    isGroupChat: false,
    users: [userId, targetUser._id],
    createdBy: userId,
  });

  return chat.populate(
    'users',
    '-password -refreshToken -passwordResetCode -passwordResetExpires -passwordResetVerified -createdAt -updatedAt -__v'
  );
};
