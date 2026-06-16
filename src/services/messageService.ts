import { Message, IMessage } from '../models/Message';
import { findChatById, ensureUserInChat } from './chatService';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors/customErrors';

export const sendMessageService = async (user: { id: string }, content: string, chatId: string) => {
  const chat = await findChatById(chatId, false);
  ensureUserInChat(chat, user.id);

  const message = await Message.create({
    sender: user.id,
    content,
    chat: chatId,
  });

  await message.populate([
    { path: 'sender', select: '_id name email profilePicture' },
    { path: 'chat', select: '_id chatName isGroupChat' },
  ]);

  chat.latestMessage = message._id;
  await chat.save();

  return { message, chat };
};

export const markMessagesAsRead = async (user: { id: string }, chatId: string) => {
  const chat = await findChatById(chatId, false);
  ensureUserInChat(chat, user.id);

  // Update all unread messages in this chat (where user is not in readBy)
  await Message.updateMany(
    {
      chat: chatId,
      sender: { $ne: user.id }, // Don't mark own messages as read
      'readBy.user': { $ne: user.id }, // Only messages not already read by user
    },
    {
      $push: {
        readBy: {
          user: user.id,
          readAt: new Date(),
        },
      },
    }
  );

  return { success: true };
};

export const buildPagination = (pageNum: number, limitNum: number, totalDocs: number) => {
  const skip = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(totalDocs / limitNum);

  const pagination: Record<string, number> = {
    page: pageNum,
    limit: limitNum,
    numberOfPages: totalPages,
  };

  if (pageNum * limitNum < totalDocs) {
    pagination.next = pageNum + 1;
  }
  if (skip > 0) {
    pagination.prev = pageNum - 1;
  }

  return { skip, pagination };
};

export const getMessagesService = async (
  user: { id: string },
  chatId: string,
  page = 1,
  limit = 10
) => {
  const chat = await findChatById(chatId, false);
  ensureUserInChat(chat, user.id);

  const messageFilter = { chat: chatId };

  const totalDocs = await Message.countDocuments(messageFilter);
  const { skip, pagination } = buildPagination(page, limit, totalDocs);

  const messages = await Message.find(messageFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate([
      { path: 'sender', select: '_id name email profilePicture' },
      { path: 'chat', select: '_id chatName isGroupChat' },
    ])
    .select('-__v');

  return { messages, pagination };
};

export const updateMessageService = async (
  user: { id: string },
  messageId: string,
  content: string
) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Only sender can edit their message
  if (message.sender.toString() !== user.id) {
    throw new ForbiddenError('Not authorized to edit this message');
  }

  // Don't allow editing to empty content
  if (!content.trim()) {
    throw new ValidationError('Message content cannot be empty');
  }

  message.content = content.trim();
  message.isEdited = true;
  message.editedAt = new Date();

  await message.save();

  await message.populate([
    { path: 'sender', select: '_id name email profilePicture' },
    { path: 'chat', select: '_id chatName isGroupChat' },
  ]);

  return message;
};
