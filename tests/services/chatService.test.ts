import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ForbiddenError } from '../../src/utils/errors/customErrors';
import * as chatService from '../../src/services/chatService';
import { createMockChat, createMockUser } from '../mocks';

vi.mock('../../src/models/Chat', () => ({
  Chat: {
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

import { Chat } from '../../src/models/Chat';

const mockedChat = Chat as any;

describe('chatService', () => {
  let mockChat: any;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChat = createMockChat();
    mockUser = createMockUser();
  });

  describe('findChatById', () => {
    it('returns chat when found with populate', async () => {
      mockedChat.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(mockChat),
      });

      const result = await chatService.findChatById('chat-id');
      expect(result).toEqual(mockChat);
      expect(mockedChat.findById).toHaveBeenCalledWith('chat-id');
    });

    it('returns chat when found without populate', async () => {
      mockedChat.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockChat),
      });

      const result = await chatService.findChatById('chat-id', false);
      expect(result).toEqual(mockChat);
    });

    it('throws NotFoundError when chat not found', async () => {
      mockedChat.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(null),
      });

      await expect(chatService.findChatById('non-existent')).rejects.toThrow(NotFoundError);
      await expect(chatService.findChatById('non-existent')).rejects.toThrow('Chat not found');
    });

    it('clears groupPicture for non-group chats', async () => {
      const nonGroupChat = createMockChat({ isGroupChat: false, groupPicture: 'some-url' });
      mockedChat.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(nonGroupChat),
      });

      const result = await chatService.findChatById('chat-id');
      expect(result.groupPicture).toBeUndefined();
    });
  });

  describe('ensureGroupAdmin', () => {
    it('passes when user is admin', () => {
      const chatWithAdmin = createMockChat({
        isGroupChat: true,
        groupAdmin: 'user-id',
      });

      expect(() => chatService.ensureGroupAdmin(chatWithAdmin, 'user-id')).not.toThrow();
    });

    it('throws ForbiddenError when user is not admin', () => {
      const chatWithAdmin = createMockChat({
        isGroupChat: true,
        groupAdmin: 'admin-id',
      });

      expect(() => chatService.ensureGroupAdmin(chatWithAdmin, 'user-id')).toThrow(ForbiddenError);
      expect(() => chatService.ensureGroupAdmin(chatWithAdmin, 'user-id')).toThrow(
        'Only admin can perform this action'
      );
    });

    it('throws ForbiddenError when groupAdmin is undefined', () => {
      const chatWithoutAdmin = createMockChat({
        isGroupChat: true,
        groupAdmin: undefined,
      });

      expect(() => chatService.ensureGroupAdmin(chatWithoutAdmin, 'user-id')).toThrow(ForbiddenError);
    });
  });

  describe('ensureUserInChat', () => {
    it('passes when user is in chat', () => {
      const chat = createMockChat({
        users: ['user-id', 'other-id'],
      });

      expect(() => chatService.ensureUserInChat(chat, 'user-id')).not.toThrow();
    });

    it('throws ForbiddenError when user not in chat', () => {
      const chat = createMockChat({
        users: ['other-id'],
      });

      expect(() => chatService.ensureUserInChat(chat, 'user-id')).toThrow(ForbiddenError);
      expect(() => chatService.ensureUserInChat(chat, 'user-id')).toThrow('You are not part of this chat');
    });
  });

  describe('findExistingChat', () => {
    it('finds existing private chat between two users', async () => {
      const existingChat = createMockChat({ isGroupChat: false });
      mockedChat.findOne.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(existingChat),
      });

      const result = await chatService.findExistingChat('user1', 'user2');
      expect(result).toEqual(existingChat);
      expect(mockedChat.findOne).toHaveBeenCalledWith({
        isGroupChat: false,
        users: { $all: ['user1', 'user2'], $size: 2 },
      });
    });

    it('returns null when no existing chat', async () => {
      mockedChat.findOne.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(null),
      });

      const result = await chatService.findExistingChat('user1', 'user2');
      expect(result).toBeNull();
    });
  });

  describe('createNewPrivateChat', () => {
    it('creates new private chat with correct properties', async () => {
      const targetUser = { _id: 'target-id', name: 'Target User' };
      const newChat = createMockChat({ isGroupChat: false, chatName: 'Target User' });
      mockedChat.create.mockResolvedValue({
        ...newChat,
        populate: vi.fn().mockResolvedValue(newChat),
      });

      const result = await chatService.createNewPrivateChat('user-id', targetUser);

      expect(mockedChat.create).toHaveBeenCalledWith({
        chatName: 'Target User',
        isGroupChat: false,
        users: ['user-id', 'target-id'],
        createdBy: 'user-id',
      });
      expect(result).toEqual(newChat);
    });
  });
});