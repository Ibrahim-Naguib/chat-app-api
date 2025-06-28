import multer from 'multer';
import { AppError } from '../errors/AppError.js';

// Middleware to validate file upload
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image file', 400));
  }

  // Additional validation for file properties
  if (req.file.size === 0) {
    return next(new AppError('Uploaded file is empty', 400));
  }

  next();
};

// Middleware to handle multer errors
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError('File size too large. Maximum size is 5MB', 400)
      );
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError('Unexpected field name. Use "image" as field name', 400)
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(
        new AppError('Too many files. Only one file is allowed', 400)
      );
    }
    return next(new AppError('File upload error: ' + err.message, 400));
  }

  // Handle AppError from fileFilter
  if (err instanceof AppError) {
    return next(err);
  }

  next(err);
};

// Validate file existence for removal
export const validateFileRemoval = async (req, res, next) => {
  try {
    // Import User model dynamically to avoid circular imports
    const { default: User } = await import('../../models/User.js');

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user has a custom profile picture (not the default one)
    const defaultPicture =
      'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
    if (!user.profilePicture || user.profilePicture === defaultPicture) {
      return next(new AppError('No profile picture to remove', 400));
    }

    next();
  } catch (error) {
    next(new AppError('Error validating file removal', 500));
  }
};
