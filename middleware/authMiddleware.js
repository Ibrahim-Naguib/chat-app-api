import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import config from '../config/envConfig.js';
import { AuthenticationError } from '../utils/errors/customErrors.js';

const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  // Method 1: Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    console.log('Auth middleware - using Bearer token for:', req.path);
  }

  // Method 2: Fallback to cookies if no Authorization header
  if (!token) {
    token = req.cookies.accessToken;
    console.log('Auth middleware - using cookie token for:', req.path);
  }

  console.log('Access token present:', !!token);

  if (!token) {
    console.log('No access token found in Authorization header or cookies');
    throw new AuthenticationError('Not authorized, no access token');
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    req.user = decoded;
    console.log('Token verified successfully for user:', decoded.id);
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message);
    throw new AuthenticationError('Not authorized, invalid token');
  }
});

export default protect;
