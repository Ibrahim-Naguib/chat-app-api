import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import {
  findUser,
  findUserByEmail,
  authenticateUser,
  hashResetCode,
  resetPasswordFields,
} from '../services/authService';
import {
  clearTokenCookies,
  generateSocketToken,
  generateTokens,
  setTokenCookie,
} from '../utils/tokens';
import { ConflictError, AuthenticationError } from '../utils/errors/customErrors';
import config from '../config/envConfig';
import { sendEmail } from '../services/emailService';
import type { AuthPayload } from '../types/index';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ConflictError('User already exists with this email'));
    }

    const user = await User.create({ name, email, password });

    const userData = await authenticateUser(user, res);
    res.status(201).json(userData);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return next(new AuthenticationError('Invalid email or password'));
    }

    const userData = await authenticateUser(user, res);
    res.json(userData);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.cookies as { refreshToken?: string };

    if (!refreshToken) {
      return next(new AuthenticationError('Refresh token not found'));
    }

    let decoded: AuthPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as AuthPayload;
    } catch {
      clearTokenCookies(res);
      return next(new AuthenticationError('Invalid refresh token'));
    }

    const user = await findUser({ _id: decoded.id }, 'User not found');
    if (!user || user.refreshToken !== refreshToken) {
      clearTokenCookies(res);
      if (user) {
        user.refreshToken = null as any;
        await user.save();
      }
      return next(new AuthenticationError('Refresh token mismatch'));
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString());
    user.refreshToken = newRefreshToken;
    setTokenCookie(res, newRefreshToken);
    await user.save();

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = (req.cookies as { refreshToken?: string }).refreshToken;

    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken },
        { $unset: { refreshToken: 1 } }
      );
    }

    clearTokenCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await findUserByEmail(email);
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = hashResetCode(resetCode);

    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetVerified = false;

    await user.save();

    const message = `Your password reset code for ChatApp is: ${resetCode}. It is valid for 10 minutes.`;
    try {
      await sendEmail({
        email: user.email,
        subject: 'ChatApp Password Reset Code',
        message,
      });
    } catch (emailErr) {
      await resetPasswordFields(user);
      return next(new AuthenticationError('Failed to send password reset code'));
    }

    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    next(error);
  }
};

export const verifyResetCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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
    res.json({ message: 'Password reset code verified successfully' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { newPassword, email } = req.body;

    const user = await findUserByEmail(email);
    if (!user.passwordResetVerified) {
      return next(new AuthenticationError('Password reset code not verified'));
    }

    user.password = newPassword;
    await resetPasswordFields(user);

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (error) {
    next(error);
  }
};

export const getSocketToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const socketToken = generateSocketToken(userId);

    res.json({
      socketToken,
      expiresIn: '1h',
      message: 'Socket JWT token generated successfully',
    });
  } catch (error) {
    next(error);
  }
};
