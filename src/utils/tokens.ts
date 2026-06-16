import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import config from '../config/envConfig';

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, config.jwtAccessSecret, {
    expiresIn: '15m' as const,
  });

  const refreshToken = jwt.sign({ id: userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

export const generateSocketToken = (userId: string): string => {
  return jwt.sign(
    {
      id: userId,
      type: 'socket',
    },
    config.jwtSocketSecret,
    {
      expiresIn: '1h',
    }
  );
};

export const setTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearTokenCookies = (res: Response): void => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' as const : 'lax' as const,
  };

  res.clearCookie('refreshToken', cookieOptions);
};
