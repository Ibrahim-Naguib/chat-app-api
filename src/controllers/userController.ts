import type { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors/customErrors';
import { uploadToCloudinary, deleteFromCloudinary, getPublicId } from '../services/storageService';
import type { AuthenticatedRequest } from '../types/index';

export const uploadProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    if (!req.file) {
      return next(new BadRequestError('Please upload an image file'));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Delete old Cloudinary image if exists
    if (user.profilePicture && !user.profilePicture.includes('icon-library.com')) {
      const oldPublicId = getPublicId('profiles', userId);
      await deleteFromCloudinary(oldPublicId);
    }

    const result = await uploadToCloudinary(req.file, 'profiles', userId);

    user.profilePicture = result.url;
    await user.save();

    res.json({ message: 'Profile picture updated successfully', profilePicture: user.profilePicture });
  } catch (error) {
    next(error);
  }
};

export const removeProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    const user = await User.findById(userId);

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    if (user.profilePicture && !user.profilePicture.includes('icon-library.com')) {
      const publicId = getPublicId('profiles', userId);
      await deleteFromCloudinary(publicId);
    }

    user.profilePicture = 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
    await user.save();

    res.json({ message: 'Profile picture removed successfully', profilePicture: user.profilePicture });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    const user = await User.findById(userId).select(
      '-password -refreshToken -passwordResetCode -passwordResetExpires -passwordResetVerified -__v'
    );

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { name, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password +name +email +profilePicture');

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    if (name) {
      user.name = name;
    }

    if (currentPassword && newPassword) {
      const isPasswordCorrect = await user.matchPassword(currentPassword);

      if (!isPasswordCorrect) {
        return next(new BadRequestError('Current password is incorrect'));
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};
