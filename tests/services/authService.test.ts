import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthenticationError } from '../../src/utils/errors/customErrors';
import * as authService from '../../src/services/authService';
import { createMockUser, createMockResponse } from '../mocks';

vi.mock('../../src/models/User', () => ({
  default: {
    findOne: vi.fn(),
  },
}));
vi.mock('../../src/utils/tokens', () => ({
  generateTokens: vi.fn(() => ({ accessToken: 'mockAccessToken', refreshToken: 'mockRefreshToken' })),
  setTokenCookie: vi.fn(),
}));
vi.mock('../../src/config/envConfig', () => ({
  default: {
    jwtAccessSecret: 'test-access-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtSocketSecret: 'test-socket-secret',
    jwtExpiresIn: '7d',
  },
}));
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createHash: () => ({
      update: () => ({ digest: () => 'hashedResetCode' }),
    }),
  };
});

import User from '../../src/models/User';
import { generateTokens, setTokenCookie } from '../../src/utils/tokens';
import crypto from 'node:crypto';

const mockedUser = User as any;
const mockedGenerateTokens = generateTokens as any;
const mockedSetTokenCookie = setTokenCookie as any;

describe('authService', () => {
  let mockUser: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = createMockUser();
    mockRes = createMockResponse();
  });

  describe('findUser', () => {
    it('returns user when found', async () => {
      mockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.findUser({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
      expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('throws AuthenticationError when user not found', async () => {
      mockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      await expect(authService.findUser({ email: 'notfound@example.com' })).rejects.toThrow(
        AuthenticationError
      );
      await expect(authService.findUser({ email: 'notfound@example.com' })).rejects.toThrow(
        'User not found'
      );
    });

    it('uses custom error message', async () => {
      mockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      await expect(authService.findUser({ email: 'x' }, 'Custom error')).rejects.toThrow('Custom error');
    });
  });

  describe('findUserByEmail', () => {
    it('calls findUser with email filter', async () => {
      mockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.findUserByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('uses custom error message', async () => {
      mockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      await expect(authService.findUserByEmail('x@x.com', 'Email not found')).rejects.toThrow('Email not found');
    });
  });

  describe('authenticateUser', () => {
    it('generates tokens, sets cookie, saves user, returns user data', async () => {
      const result = await authService.authenticateUser(mockUser, mockRes);

      expect(mockedGenerateTokens).toHaveBeenCalledWith(mockUser._id.toString());
      expect(mockedSetTokenCookie).toHaveBeenCalledWith(mockRes, 'mockRefreshToken');
      expect(mockUser.refreshToken).toBe('mockRefreshToken');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'mockAccessToken',
        user: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          profilePicture: mockUser.profilePicture,
        },
      });
    });
  });

  describe('hashResetCode', () => {
    it('returns SHA256 hash of reset code', () => {
      const result = authService.hashResetCode('123456');
      expect(result).toBe('8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');
    });
  });

  describe('resetPasswordFields', () => {
    it('clears password reset fields and saves user', async () => {
      mockUser.passwordResetCode = 'code';
      mockUser.passwordResetExpires = new Date();
      mockUser.passwordResetVerified = true;

      await authService.resetPasswordFields(mockUser);

      expect(mockUser.passwordResetCode).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.passwordResetVerified).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});