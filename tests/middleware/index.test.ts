import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../../src/middleware/validate';
import { protect } from '../../src/middleware/authMiddleware';
import { errorHandler, handleJWTError, handleJWTExpiredError, handleValidationErrorDB, handleDuplicateFieldsDB } from '../../src/middleware/errorMiddleware';
import { ValidationError, AuthenticationError } from '../../src/utils/errors/customErrors';
import { AppError } from '../../src/utils/errors/AppError';
import { z } from 'zod';
import config from '../../src/config/envConfig';
import jwt from 'jsonwebtoken';

describe('Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalNodeEnv: string;
  let originalIsDev: boolean;
  let originalIsTest: boolean;
  let originalIsProd: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    // Save original config
    originalNodeEnv = config.nodeEnv;
    originalIsDev = config.isDev;
    originalIsTest = config.isTest;
    originalIsProd = config.isProd;
  });

  afterEach(() => {
    // Restore original config
    Object.defineProperty(config, 'nodeEnv', { value: originalNodeEnv, writable: true });
    Object.defineProperty(config, 'isDev', { value: originalIsDev, writable: true });
    Object.defineProperty(config, 'isTest', { value: originalIsTest, writable: true });
    Object.defineProperty(config, 'isProd', { value: originalIsProd, writable: true });
  });

  const setNodeEnv = (env: 'development' | 'production' | 'test') => {
    Object.defineProperty(config, 'nodeEnv', { value: env, writable: true });
    Object.defineProperty(config, 'isDev', { value: env === 'development', writable: true });
    Object.defineProperty(config, 'isTest', { value: env === 'test', writable: true });
    Object.defineProperty(config, 'isProd', { value: env === 'production', writable: true });
  };

  describe('validate middleware', () => {
    const testSchema = z.object({
      name: z.string().min(2, 'Name too short'),
      email: z.string().email('Invalid email'),
      age: z.coerce.number().int().min(18).optional(),
    });

    it('passes valid body data', () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com', age: 25 };
      
      const middleware = validate(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({ name: 'John Doe', email: 'john@example.com', age: 25 });
    });

    it('passes valid query data', () => {
      mockReq.query = { page: '1', limit: '10' };
      const querySchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      });
      
      const middleware = validate(querySchema, 'query');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query).toEqual({ page: 1, limit: 10 });
    });

    it('passes valid params data', () => {
      mockReq.params = { id: '507f1f77bcf86cd799439011' };
      const paramsSchema = z.object({
        id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
      });
      
      const middleware = validate(paramsSchema, 'params');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.params).toEqual({ id: '507f1f77bcf86cd799439011' });
    });

    it('rejects invalid body - missing field', () => {
      mockReq.body = { email: 'john@example.com' };
      
      const middleware = validate(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('rejects invalid body - invalid email', () => {
      mockReq.body = { name: 'John Doe', email: 'not-an-email' };
      
      const middleware = validate(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid email',
        statusCode: 400,
      }));
    });

    it('rejects invalid query params', () => {
      mockReq.query = { page: '0', limit: '100' };
      const querySchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      });
      
      const middleware = validate(querySchema, 'query');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('rejects invalid params', () => {
      mockReq.params = { id: 'invalid-id' };
      const paramsSchema = z.object({
        id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
      });
      
      const middleware = validate(paramsSchema, 'params');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid ID format',
      }));
    });

    it('rejects empty body', () => {
      mockReq.body = {};
      
      const middleware = validate(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('transforms data (coerce)', () => {
      mockReq.body = { name: 'John', email: 'john@example.com', age: '25' };
      
      const middleware = validate(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.age).toBe(25);
    });
  });

  describe('authMiddleware (protect)', () => {
    const validToken = jwt.sign({ id: 'user-123' }, config.jwtAccessSecret, { expiresIn: '15m' });
    const expiredToken = jwt.sign({ id: 'user-123' }, config.jwtAccessSecret, { expiresIn: '-1s' });
    const invalidToken = 'invalid.token.string';

    it('passes with valid Bearer token', () => {
      mockReq.headers = { authorization: `Bearer ${validToken}` };
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.id).toBe('user-123');
    });

    it('rejects missing Authorization header', () => {
      mockReq.headers = {};
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized, no token',
        statusCode: 401,
      }));
    });

    it('rejects Authorization header without Bearer', () => {
      mockReq.headers = { authorization: 'Basic abc123' };
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized, no token',
      }));
    });

    it('rejects Bearer token with empty value', () => {
      mockReq.headers = { authorization: 'Bearer ' };
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('rejects invalid token format', () => {
      mockReq.headers = { authorization: `Bearer ${invalidToken}` };
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized, token failed',
        statusCode: 401,
      }));
    });

    it('rejects expired token', () => {
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized, token failed',
      }));
    });

    it('attaches user payload to request', () => {
      const userId = 'user-456';
      const token = jwt.sign({ id: userId }, config.jwtAccessSecret, { expiresIn: '15m' });
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      protect(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user.id).toBe(userId);
    });
  });

  describe('errorHandler middleware', () => {
    it('handles AppError correctly in dev mode', () => {
      setNodeEnv('development');
      
      const error = new AppError('Test error', 400);
      error.statusCode = 400;
      error.status = 'fail';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Test error',
        error: error,
      }));
    });

    it('handles AppError correctly in test mode', () => {
      setNodeEnv('test');
      
      const error = new AppError('Test error', 400);
      error.statusCode = 400;
      error.status = 'fail';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Test error',
        // In test mode, error object is not included (only in dev)
      }));
    });

    it('handles operational error in prod mode', () => {
      setNodeEnv('production');
      
      const error = new AppError('Operational error', 400);
      error.isOperational = true;
      error.statusCode = 400;
      error.status = 'fail';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Operational error',
      }));
    });

    it('handles non-operational error in prod mode (generic message)', () => {
      setNodeEnv('production');
      
      const error = new Error('Database connection failed');
      error.name = 'Error';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Something went wrong!',
      }));
    });

    it('handles Mongoose ValidationError', () => {
      setNodeEnv('production');
      
      const error: any = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        name: { message: 'Name is required' },
        email: { message: 'Email is invalid' },
      };
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Invalid input data. Name is required. Email is invalid',
      }));
    });

    it('handles Mongoose duplicate key error (code 11000)', () => {
      setNodeEnv('production');
      
      const error: any = new Error('Duplicate key');
      error.code = 11000;
      error.keyValue = { email: 'test@example.com' };
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Duplicate field value: test@example.com. Please use another value!',
      }));
    });

    it('handles JsonWebTokenError', () => {
      setNodeEnv('production');
      
      const error: any = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Invalid token. Please log in again!',
      }));
    });

    it('handles TokenExpiredError', () => {
      setNodeEnv('production');
      
      const error: any = new Error('Token expired');
      error.name = 'TokenExpiredError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'fail',
        message: 'Your token has expired! Please log in again.',
      }));
    });

    it('defaults to 500 for unknown errors', () => {
      setNodeEnv('production');
      
      const error = new Error('Unknown error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Something went wrong!',
      }));
    });
  });

  describe('error handler helper functions', () => {
    it('handleJWTError returns correct AppError', () => {
      const error = handleJWTError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid token. Please log in again!');
      expect(error.statusCode).toBe(401);
    });

    it('handleJWTExpiredError returns correct AppError', () => {
      const error = handleJWTExpiredError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Your token has expired! Please log in again.');
      expect(error.statusCode).toBe(401);
    });

    it('handleValidationErrorDB formats mongoose validation errors', () => {
      const mongooseError: any = {
        errors: {
          field1: { message: 'Error 1' },
          field2: { message: 'Error 2' },
        },
      };
      
      const error = handleValidationErrorDB(mongooseError);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input data. Error 1. Error 2');
      expect(error.statusCode).toBe(400);
    });

    it('handleDuplicateFieldsDB formats duplicate key error', () => {
      const mongooseError: any = {
        keyValue: { email: 'test@example.com' },
      };
      
      const error = handleDuplicateFieldsDB(mongooseError);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Duplicate field value: test@example.com. Please use another value!');
      expect(error.statusCode).toBe(400);
    });
  });
});