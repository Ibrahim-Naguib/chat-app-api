import { Message } from '../models/Message.js';
import { findChatById, ensureUserInChat } from './chatService.js';

export const sendMessageService = async (user, content, chatId) => {
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

export const buildPagination = (page = 1, limit = 10, totalDocs = 0) => {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;
  const totalPages = Math.ceil(totalDocs / parsedLimit);

  const pagination = {
    page: parsedPage,
    limit: parsedLimit,
    numberOfPages: totalPages,
  };

  if (parsedPage * parsedLimit < totalDocs) {
    pagination.next = parsedPage + 1;
  }
  if (skip > 0) {
    pagination.prev = parsedPage - 1;
  }

  return { skip, pagination };
};

export const getMessagesService = async (
  user,
  chatId,
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
