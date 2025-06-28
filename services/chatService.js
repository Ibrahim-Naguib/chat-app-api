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
  const chat = await query.select('-__v -deletedBy -restoredAt');
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
    .select('-__v -deletedBy -restoredAt');
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

// Handle deletion logic for private chats
export const handlePrivateChatDeletion = async (chat, userId) => {
  if (!chat.deletedBy) chat.deletedBy = [];

  if (!chat.deletedBy.includes(userId)) {
    chat.deletedBy.push(userId);
  }

  if (chat.restoredAt) {
    chat.restoredAt = chat.restoredAt.filter(
      (record) => record.userId.toString() !== userId.toString()
    );
  }

  if (chat.deletedBy.length === chat.users.length) {
    await Message.deleteMany({ chat: chat._id });
    await Chat.findByIdAndDelete(chat._id);
    return { deleted: true };
  }

  await chat.save();
  return { deleted: false };
};

// Handle restoration of a deleted chat when user accesses it
export const restoreDeletedChat = async (chat, userId) => {
  // Check if the current user had deleted this chat
  if (!chat.deletedBy || !chat.deletedBy.includes(userId)) {
    return { restoredUsers: [], updatedChat: chat }; // Nothing to restore
  }

  const restoredUsers = [
    ...chat.deletedBy.filter((id) => id.toString() === userId.toString()),
  ];

  // Remove user from deletedBy array to restore the chat
  chat.deletedBy = chat.deletedBy.filter(
    (deletedUserId) => deletedUserId.toString() !== userId.toString()
  );

  // Add restoration timestamp for this user - set to current time
  // This ensures they won't see old messages from before they deleted the chat
  if (!chat.restoredAt) {
    chat.restoredAt = [];
  }

  // Remove any existing restoration record for this user
  chat.restoredAt = chat.restoredAt.filter(
    (record) => record.userId.toString() !== userId.toString()
  );

  // Add new restoration record with current timestamp
  // This will hide all messages sent before this moment
  chat.restoredAt.push({
    userId: userId,
    timestamp: new Date(),
  });

  await chat.save();

  // Return updated chat with correct latestMessage value
  const updatedChat = await findChatById(chat._id);

  return { restoredUsers, updatedChat };
};
