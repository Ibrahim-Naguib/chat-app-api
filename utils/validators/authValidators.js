import { body } from 'express-validator';
import { withValidation } from '../validation.js';
import { validateEmail, validatePassword } from './commonValidators.js';

export const signupValidation = withValidation([
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),

  validateEmail,

  validatePassword,
]);

export const loginValidation = withValidation([
  validateEmail,
  validatePassword,
]);

export const forgotPasswordValidation = withValidation([validateEmail]);

export const verifyResetCodeValidation = withValidation([
  validateEmail,

  body('resetCode')
    .trim()
    .notEmpty()
    .withMessage('Reset code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Reset code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Reset code must contain only numbers'),
]);

export const resetPasswordValidation = withValidation([
  validateEmail,

  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
]);
