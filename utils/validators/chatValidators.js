import { body } from 'express-validator';
import { withValidation } from '../validation.js';
import { ValidationError } from '../errors/customErrors.js';
import {
  validateChatId,
  validateEmail,
  validateUserId,
} from './commonValidators.js';

export const accessChatValidator = withValidation([validateEmail]);

export const createGroupChatValidator = withValidation([
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('users').custom((value) => {
    if (!Array.isArray(value)) {
      throw new ValidationError('Users must be an array');
    }
    if (value.length < 2) {
      throw new ValidationError('Group chat must have at least 3 members including you');
    }

    // Check for duplicates
    const uniqueEmails = [
      ...new Set(value.map((email) => email.toLowerCase())),
    ];
    if (uniqueEmails.length !== value.length) {
      throw new ValidationError('Duplicate email addresses are not allowed');
    }

    return true;
  }),
]);

export const renameGroupValidator = withValidation([
  validateChatId,
  body('chatName')
    .trim()
    .notEmpty()
    .withMessage('Chat name is required')
    .isLength({ min: 3 })
    .withMessage('Chat name must be at least 3 characters long'),
]);

export const addToGroupValidator = withValidation([
  validateChatId,
  validateEmail,
]);

export const removeFromGroupValidator = withValidation([
  validateChatId,
  validateUserId,
]);
