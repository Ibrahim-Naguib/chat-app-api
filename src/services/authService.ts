import type { Response } from 'express';
import User, { IUser } from '../models/User';
import { AuthenticationError } from '../utils/errors/customErrors';
import { generateTokens, setTokenCookie } from '../utils/tokens';
import crypto from 'node:crypto';

export const findUser = async (filter: Record<string, unknown>, errorMessage = 'User not found') => {
  const user = await User.findOne(filter).select('+password +refreshToken +passwordResetCode +passwordResetExpires +passwordResetVerified');
  if (!user) {
    throw new AuthenticationError(errorMessage);
  }
  return user;
};

export const findUserByEmail = async (
  email: string,
  errorMessage = 'User not found with this email'
) => {
  return findUser({ email }, errorMessage);
};

export const authenticateUser = async (user: IUser, res: Response) => {
  const { accessToken, refreshToken } = generateTokens(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save();

  setTokenCookie(res, refreshToken);

  return {
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
    },
  };
};

export const hashResetCode = (resetCode: string): string =>
  crypto.createHash('sha256').update(resetCode).digest('hex');

export const resetPasswordFields = async (user: IUser): Promise<void> => {
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = false;
  await user.save();
};
