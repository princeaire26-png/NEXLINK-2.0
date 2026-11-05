/**
 * Error handling middleware.
 * Catches all errors and returns structured JSON responses.
 * Never exposes internal stack traces to clients.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { z } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors,
    });
  }
  
  // Application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
    });
  }
  
  // Unknown errors — log but don't expose details
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  }, 'Unhandled error');
  
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
  });
}
