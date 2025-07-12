import User from '../models/User.js';
import { AuthenticationError } from '../utils/errors/customErrors.js';
import { generateTokens, setTokenCookie } from '../utils/tokens.js';
import crypto from 'crypto';

// Find a user by filter criteria and throw error if not found
export const findUser = async (filter, errorMessage = 'User not found') => {
  const user = await User.findOne(filter);
  if (!user) {
    throw new AuthenticationError(errorMessage);
  }
  return user;
};

// Find a user by email
export const findUserByEmail = async (
  email,
  errorMessage = 'User not found with this email'
) => {
  return findUser({ email }, errorMessage);
};

// Generate and set tokens
export const generateAndSetTokens = async (user, res, forceRefresh = false) => {
  const { accessToken, refreshToken } = generateTokens(user._id);
  if (!user.refreshToken || forceRefresh) {
    user.refreshToken = refreshToken;
    await user.save();
  }
  setTokenCookies(res, accessToken, user.refreshToken);
  return { accessToken, refreshToken: user.refreshToken };
};

// Generate tokens, save user, and set cookies
export const authenticateUser = async (user, res) => {
  const { accessToken, refreshToken } = generateTokens(user._id);

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

// Create hashed reset code
export const hashResetCode = (resetCode) =>
  crypto.createHash('sha256').update(String(resetCode)).digest('hex');

// Clear password reset fields and save user
export const resetPasswordFields = async (user) => {
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = false;
  await user.save();
};
