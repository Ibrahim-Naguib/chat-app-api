import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from './errors/AppError.js';

// Ensure upload directories exist
const uploadDirs = ['uploads/profiles', 'uploads/groups'];
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create a dynamic multer upload instance
export const createUploader = (directory) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dirPath = path.join('uploads', directory);
      cb(null, dirPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`
      );
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new AppError('Please upload only images (jpeg, jpg, png, gif)', 400));
    },
  });
};

// Utility function to delete file
export const deleteFile = (filepath) => {
  if (filepath && fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};
