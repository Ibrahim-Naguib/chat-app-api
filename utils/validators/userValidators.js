import { body } from 'express-validator';
import { withValidation } from '../validation.js';
import { ValidationError } from '../errors/customErrors.js';

export const updateProfileValidation = withValidation([
  body().custom((value, { req }) => {
    const { name, currentPassword, newPassword } = req.body;
    if (!name && !currentPassword && !newPassword) {
      throw new ValidationError('Please provide a name or password to update');
    }
    return true;
  }),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long')
    .isLength({ max: 50 })
    .withMessage('Name must not exceed 50 characters'),

  body('currentPassword')
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage('Current password must be at least 6 characters long'),

  body('newPassword')
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),

  // Custom validation to ensure both passwords are provided together
  body('currentPassword').custom((value, { req }) => {
    if ((value && !req.body.newPassword) || (!value && req.body.newPassword)) {
      throw new ValidationError(
        'Both current password and new password are required to update password'
      );
    }
    return true;
  }),
]);
