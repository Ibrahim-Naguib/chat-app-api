import { vi } from 'vitest';
import type { Types } from 'mongoose';

export interface MockUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  profilePicture: string;
  refreshToken?: string;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  passwordResetVerified: boolean;
  matchPassword: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  [key: string]: any;
}

export interface MockChat {
  _id: Types.ObjectId;
  chatName?: string;
  isGroupChat: boolean;
  users: Types.ObjectId[];
  latestMessage?: Types.ObjectId;
  groupAdmin?: Types.ObjectId;
  groupPicture?: string;
  createdBy: Types.ObjectId;
  save: ReturnType<typeof vi.fn>;
  populate: ReturnType<typeof vi.fn>;
  [key: string]: any;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  _id: '507f1f77bcf86cd799439011' as unknown as Types.ObjectId,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedPassword123',
  profilePicture: 'https://example.com/avatar.jpg',
  refreshToken: undefined,
  passwordResetCode: undefined,
  passwordResetExpires: undefined,
  passwordResetVerified: false,
  matchPassword: vi.fn().mockResolvedValue(true),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

export const createMockChat = (overrides: Partial<MockChat> = {}): MockChat => ({
  _id: '507f1f77bcf86cd799439012' as unknown as Types.ObjectId,
  chatName: 'Test Chat',
  isGroupChat: false,
  users: ['507f1f77bcf86cd799439011' as unknown as Types.ObjectId],
  latestMessage: undefined,
  groupAdmin: undefined,
  groupPicture: undefined,
  createdBy: '507f1f77bcf86cd799439011' as unknown as Types.ObjectId,
  save: vi.fn().mockResolvedValue(undefined),
  populate: vi.fn().mockReturnThis(),
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
};

export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  cookies: {},
  user: { id: '507f1f77bcf86cd799439011' },
  ...overrides,
});

export const createMockNext = () => vi.fn();