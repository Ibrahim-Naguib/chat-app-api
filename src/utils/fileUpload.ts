import multer from 'multer';
import { AppError } from './errors/AppError';

const storage = multer.memoryStorage();

export const createUploader = (/* unused - kept for API compat */_directory?: string) => {
  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop() || '');
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new AppError('Please upload only images (jpeg, jpg, png, gif)', 400));
    },
  });
};

export const handleMulterError = (err: any, _req: any, _res: any, next: any): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size too large. Maximum size is 5MB', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field name. Use "image" as field name', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Only one file is allowed', 400));
    }
    return next(new AppError('File upload error: ' + err.message, 400));
  }

  if (err instanceof AppError) {
    return next(err);
  }

  next(err);
};

export const validateFileUpload = (req: any, _res: any, next: any): void => {
  if (!req.file) {
    return next(new AppError('Please upload an image file', 400));
  }

  if (req.file.size === 0) {
    return next(new AppError('Uploaded file is empty', 400));
  }

  next();
};
