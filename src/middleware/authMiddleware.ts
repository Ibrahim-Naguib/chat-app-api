import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import config from '../config/envConfig';
import { AuthenticationError } from '../utils/errors/customErrors';
import type { AuthPayload } from '../types/index';

export const protect = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AuthenticationError('Not authorized, no token'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as AuthPayload;
    (req as Request & { user: AuthPayload }).user = decoded;
    next();
  } catch {
    return next(new AuthenticationError('Not authorized, token failed'));
  }
};
