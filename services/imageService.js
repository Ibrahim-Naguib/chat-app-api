import path from 'path';
import asyncHandler from 'express-async-handler';

import { AppError } from '../utils/errors/AppError.js';
import { NotFoundError } from '../utils/errors/customErrors.js';
import { deleteFile } from '../utils/fileUpload.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPicture =
  'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';

// Generic function to serve files (works for both profiles and groups)
export const serveFile = asyncHandler(async (req, res, directory) => {
  try {
    const filePath = path.join(
      __dirname,
      '..',
      'uploads',
      directory,
      req.params.filename
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Set Content-Type header dynamically based on file extension
    const mimeType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeType[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ message: 'Error serving image' });
  }
});

// Generic function to upload a file (works for both profiles and groups)
export const uploadFile = asyncHandler(
  async (req, res, model, field, directory) => {
    const id = req.body?.chatId || req.user.id;
    const entity = await model.findById(id);

    if (!entity) {
      throw new NotFoundError(`${model.modelName} not found`);
    }

    // Delete old file if it exists and isn't the default
    if (entity[field] && !entity[field].includes(defaultPicture)) {
      deleteFile(
        path.join(`uploads/${directory}`, path.basename(entity[field]))
      );
    }

    // Update the file path
    entity[field] = `/${directory}/${req.file.filename}`;
    await entity.save();

    res.json({
      message: `${field} updated successfully`,
      [field]: entity[field],
    });
  }
);

// Generic function to remove a file (works for both profiles and groups)
export const removeFile = asyncHandler(
  async (req, res, model, field, directory) => {
    const id = req.body?.chatId || req.user.id;
    const entity = await model.findById(id);
    if (!entity) {
      throw new NotFoundError(`${model.modelName} not found`);
    }

    // Delete current file if it exists and isn't the default
    if (entity[field] && !entity[field].includes(defaultPicture)) {
      deleteFile(
        path.join(`uploads/${directory}`, path.basename(entity[field]))
      );
    }

    // Reset to default picture
    entity[field] = defaultPicture;
    await entity.save();

    res.json({
      message: `${field} removed successfully`,
      [field]: entity[field],
    });
  }
);
