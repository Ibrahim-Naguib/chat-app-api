import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import {
  findUser,
  findUserByEmail,
  authenticateUser,
  generateAndSetTokens,
  hashResetCode,
  resetPasswordFields,
} from '../services/authService.js';
import { clearTokenCookies, generateSocketToken } from '../utils/tokens.js';
import { AuthenticationError } from '../utils/errors/customErrors.js';
import jwt from 'jsonwebtoken';
import config from '../config/envConfig.js';
import sendEmail from '../utils/sendEmail.js';

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AuthenticationError('User already exists with this email');
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const userData = await authenticateUser(user, res);
  res.status(201).json(userData);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    throw new AuthenticationError('Invalid email or password');
  }

  const userData = await authenticateUser(user, res);
  res.json(userData);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token not found');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
  const user = await findUser({ _id: decoded.id }, 'User not found');
  if (user.refreshToken !== refreshToken) {
    throw new AuthenticationError('Refresh token mismatch');
  }
  await generateAndSetTokens(user, res);
  res.json({ message: 'Tokens refreshed successfully' });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await User.findOneAndUpdate(
      { refreshToken },
      { $unset: { refreshToken: 1 } }
    );
  }

  clearTokenCookies(res);

  res.json({ message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await findUserByEmail(email);
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = hashResetCode(resetCode);

  user.passwordResetCode = hashedResetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  const message = `Your password reset code for ChatApp is: ${resetCode}. It is valid for 10 minutes.`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'ChatApp Password Reset Code',
      message,
    });
  } catch (error) {
    await resetPasswordFields(user);
    throw new AuthenticationError('Failed to send password reset code');
  }

  res.json({
    message: 'Password reset code sent to your email',
  });
});

export const verifyResetCode = asyncHandler(async (req, res) => {
  const { resetCode, email } = req.body;

  const hashedResetCode = hashResetCode(resetCode);

  const user = await findUser(
    {
      email,
      passwordResetCode: hashedResetCode,
      passwordResetExpires: { $gt: Date.now() },
    },
    'Invalid or expired password reset code'
  );

  user.passwordResetVerified = true;
  await user.save();
  res.json({
    message: 'Password reset code verified successfully',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword, email } = req.body;

  const user = await findUserByEmail(email);
  if (!user.passwordResetVerified) {
    throw new AuthenticationError('Password reset code not verified');
  }

  user.password = newPassword;
  await resetPasswordFields(user);

  res.json({
    message:
      'Password reset successfully. Please log in with your new password.',
  });
});

// Get socket token endpoint - requires API authentication via cookies
export const getSocketToken = asyncHandler(async (req, res) => {
  // This endpoint uses the existing auth middleware (cookie-based)
  // to verify the user and then issues a socket-specific token
  const userId = req.user.id;

  const socketToken = generateSocketToken(userId);

  res.json({
    socketToken,
    expiresIn: '1h',
    message: 'Socket token generated successfully',
  });
});
