import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { NotFoundError } from '../utils/errors/customErrors.js';
import { AppError } from '../utils/errors/AppError.js';
import { removeFile, serveFile, uploadFile } from '../services/imageService.js';

export const getProfilePicture = asyncHandler(async (req, res) => {
  serveFile(req, res, 'profiles');
});

export const uploadProfilePicture = asyncHandler(async (req, res) => {
  uploadFile(req, res, User, 'profilePicture', 'profiles');
});

export const removeProfilePicture = asyncHandler(async (req, res) => {
  removeFile(req, res, User, 'profilePicture', 'profiles');
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    '-password -refreshToken -passwordResetCode -passwordResetExpires -passwordResetVerified -__v'
  );
  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select(
    '+password name email profilePicture'
  );
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update name if provided
  if (name) {
    user.name = name;
  }

  // Update password if provided
  if (currentPassword && newPassword) {
    // Verify current password using the model's method
    const isPasswordCorrect = await user.matchPassword(currentPassword);

    if (!isPasswordCorrect) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Set new password - it will be hashed by the pre-save middleware
    user.password = newPassword;
  } else if (
    (currentPassword && !newPassword) ||
    (!currentPassword && newPassword)
  ) {
    throw new AppError(
      'Both current password and new password are required to update password',
      400
    );
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
});
