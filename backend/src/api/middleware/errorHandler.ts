/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super('Validation failed', 400);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Quota exceeded. Please upgrade your subscription.') {
    super(message, 402);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      errors[path] = e.message;
    });

    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // Custom validation errors
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Known operational errors
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Unknown errors - don't leak details
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    status: 'error',
    message,
  });
}
