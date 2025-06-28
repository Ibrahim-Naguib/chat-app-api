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

export const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};
