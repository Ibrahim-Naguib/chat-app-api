import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import config from '../config/envConfig.js';
import { AuthenticationError } from '../utils/errors/customErrors.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  console.log('Token:', token);
  if (!token) {
    throw new AuthenticationError('Not authorized, no token');
  }
  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    throw new AuthenticationError('Not authorized, token failed');
  }
});

export default protect;
