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

export const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'None',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'None',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};
