import logger from '../config/logger';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors/AppError';
import config from '../config/envConfig';

export const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

export const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.keyValue[Object.keys(err.keyValue)[0]];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

export const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

export const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    ...(config.isDev && { error: err }),
  });
};

const sendErrorProd = (err: AppError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error(err, 'Unhandled error');
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.isDev || config.isTest) {
    sendErrorDev(err, res);
  } else if (config.isProd) {
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

export const unhandledRejection = (server: { close: (cb: () => void) => void }): void => {
  process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION');
    logger.error({ err: err.name, msg: err.message }, 'Unhandled rejection');
    server.close(() => {
      process.exit(1);
    });
  });
};

export const uncaughtException = (): void => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION');
    logger.error({ err: err.name, msg: err.message }, 'Uncaught exception');
    process.exit(1);
  });
};
