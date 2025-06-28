import { body, query, param } from 'express-validator';
import { withValidation } from '../validation.js';
import { validateChatId } from './commonValidators.js';

export const createMessageValidator = withValidation([
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Message content cannot exceed 5000 characters'),

  validateChatId,
]);

export const getMessagesValidator = withValidation([
  param('chatId').isMongoId().withMessage('Invalid Chat ID format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
]);
