import { validationResult } from 'express-validator';
import { ValidationError } from './errors/customErrors.js';

export const validateRequest = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array()[0].msg);
  }
};

/**
 * Helper function to create validation middleware arrays
 * Eliminates repetitive middleware code in validator files
 */
export const withValidation = (validators) => [
  ...validators,
  (req, res, next) => {
    validateRequest(req);
    next();
  },
];
