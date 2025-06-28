import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import config from '../config/envConfig.js';
import { AuthenticationError } from '../utils/errors/customErrors.js';

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    throw new AuthenticationError('Not authorized, no access token');
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    req.user = decoded;
    next();
  } catch (error) {
    throw new AuthenticationError('Not authorized, invalid token');
  }
});

export default protect;
