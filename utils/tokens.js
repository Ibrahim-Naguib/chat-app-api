import jwt from 'jsonwebtoken';
import config from '../config/envConfig.js';

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.jwtAccessSecret, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ id: userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return { accessToken, refreshToken };
};

// Generate socket-specific JWT token (completely separate from API tokens and cookies)
// This token is used exclusively for Socket.IO authentication
export const generateSocketToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      type: 'socket', // Mark this as a socket-specific token
    },
    config.jwtSocketSecret || config.jwtAccessSecret, // Fallback to access secret if socket secret not set
    {
      expiresIn: '1h', // Longer expiry for socket connections
    }
  );
};

export const setTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  };

  res.clearCookie('refreshToken', cookieOptions);
};
