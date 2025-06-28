import { body } from 'express-validator';

export const validateEmail = body('email')
  .trim()
  .notEmpty()
  .withMessage('Email is required')
  .isEmail()
  .withMessage('Please enter a valid email')
  .normalizeEmail();

export const validateChatId = body('chatId')
  .trim()
  .notEmpty()
  .withMessage('Chat ID is required')
  .isMongoId()
  .withMessage('Invalid Chat ID format');

export const validateUserId = body('userId')
  .trim()
  .notEmpty()
  .withMessage('User ID is required')
  .isMongoId()
  .withMessage('Invalid User ID format');

export const validatePassword = body('password')
  .trim()
  .notEmpty()
  .withMessage('Password is required')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');
