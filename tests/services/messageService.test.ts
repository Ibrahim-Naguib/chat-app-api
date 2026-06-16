import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../src/utils/errors/customErrors';
import * as messageService from '../../src/services/messageService';
import { createMockChat, createMockUser } from '../mocks';

vi.mock('../../src/models/Message', () => ({
  Message: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    populate: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../src/services/chatService', () => ({
  findChatById: vi.fn(),
  ensureUserInChat: vi.fn(),
}));

import { Message } from '../../src/models/Message';
import { findChatById, ensureUserInChat } from '../../src/services/chatService';

const mockedMessage = Message as any;
const mockedFindChatById = findChatById as any;
const mockedEnsureUserInChat = ensureUserInChat as any;

describe('messageService', () => {
  let mockChat: any;
  let mockUserId = 'user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    mockChat = createMockChat();
    mockedFindChatById.mockResolvedValue(mockChat);
    mockedEnsureUserInChat.mockImplementation(() => {});
  });

  describe('sendMessageService', () => {
    it('creates message and updates chat latestMessage', async () => {
      const mockMessage = {
        _id: 'msg-id',
        sender: mockUserId,
        content: 'Hello!',
        chat: 'chat-id',
        populate: vi.fn().mockResolvedValue({
          _id: 'msg-id',
          sender: { _id: mockUserId, name: 'Test', email: 'test@test.com', profilePicture: '' },
          content: 'Hello!',
          chat: { _id: 'chat-id', chatName: 'Test Chat', isGroupChat: false },
        }),
      };

      mockedMessage.create.mockResolvedValue(mockMessage);

      const result = await messageService.sendMessageService({ id: mockUserId }, 'Hello!', 'chat-id');

      expect(mockedFindChatById).toHaveBeenCalledWith('chat-id', false);
      expect(mockedEnsureUserInChat).toHaveBeenCalledWith(mockChat, mockUserId);
      expect(mockedMessage.create).toHaveBeenCalledWith({
        sender: mockUserId,
        content: 'Hello!',
        chat: 'chat-id',
      });
      expect(mockChat.latestMessage).toBe('msg-id');
      expect(mockChat.save).toHaveBeenCalled();
      expect(result.message).toEqual(mockMessage);
      expect(result.chat).toEqual(mockChat);
    });

    it('throws when user not in chat', async () => {
      mockedEnsureUserInChat.mockImplementation(() => {
        throw new ForbiddenError('You are not part of this chat');
      });

      await expect(
        messageService.sendMessageService({ id: mockUserId }, 'Hello!', 'chat-id')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('buildPagination', () => {
    it('calculates correct pagination for first page', () => {
      const { skip, pagination } = messageService.buildPagination(1, 10, 25);

      expect(skip).toBe(0);
      expect(pagination).toEqual({
        page: 1,
        limit: 10,
        numberOfPages: 3,
        next: 2,
      });
    });

    it('calculates correct pagination for middle page', () => {
      const { skip, pagination } = messageService.buildPagination(2, 10, 25);

      expect(skip).toBe(10);
      expect(pagination).toEqual({
        page: 2,
        limit: 10,
        numberOfPages: 3,
        next: 3,
        prev: 1,
      });
    });

    it('calculates correct pagination for last page', () => {
      const { skip, pagination } = messageService.buildPagination(3, 10, 25);

      expect(skip).toBe(20);
      expect(pagination).toEqual({
        page: 3,
        limit: 10,
        numberOfPages: 3,
        prev: 2,
      });
    });

    it('handles exact page count', () => {
      const { skip, pagination } = messageService.buildPagination(2, 10, 20);

      expect(skip).toBe(10);
      expect(pagination).toEqual({
        page: 2,
        limit: 10,
        numberOfPages: 2,
        prev: 1,
      });
    });
  });

  describe('getMessagesService', () => {
    it('returns paginated messages for valid chat', async () => {
      const mockMessages = [
        { _id: 'msg1', content: 'Message 1' },
        { _id: 'msg2', content: 'Message 2' },
      ];

      mockedMessage.countDocuments.mockResolvedValue(15);
      mockedMessage.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(mockMessages),
      });

      const result = await messageService.getMessagesService(
        { id: mockUserId },
        'chat-id',
        2,
        5
      );

      expect(mockedFindChatById).toHaveBeenCalledWith('chat-id', false);
      expect(mockedEnsureUserInChat).toHaveBeenCalledWith(mockChat, mockUserId);
      expect(mockedMessage.countDocuments).toHaveBeenCalledWith({ chat: 'chat-id' });
      expect(result.messages).toEqual(mockMessages);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        numberOfPages: 3,
        next: 3,
        prev: 1,
      });
    });

    it('throws ForbiddenError when user not in chat', async () => {
      mockedEnsureUserInChat.mockImplementation(() => {
        throw new ForbiddenError('You are not part of this chat');
      });

      await expect(
        messageService.getMessagesService({ id: mockUserId }, 'chat-id')
      ).rejects.toThrow(ForbiddenError);
    });

    it('uses default page and limit', async () => {
      mockedMessage.countDocuments.mockResolvedValue(5);
      mockedMessage.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([]),
      });

      const result = await messageService.getMessagesService({ id: mockUserId }, 'chat-id');

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.numberOfPages).toBe(1);
    });
  });
});