import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors/customErrors';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const firstError = result.error.issues?.[0];
      const message = firstError?.message || 'Validation failed';
      return next(new ValidationError(message));
    }

    req[source] = result.data;
    next();
  };
};
