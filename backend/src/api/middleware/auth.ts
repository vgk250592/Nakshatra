/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AuthenticationError, AuthorizationError } from './errorHandler';

export interface JWTPayload {
  userId: string;
  email?: string;
  phone?: string;
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      req.user = decoded;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw jwtError;
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
        req.user = decoded;
      } catch {
        // Ignore token errors for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user has required subscription tier
 */
export function requireSubscription(
  allowedTiers: Array<'free' | 'premium' | 'premium_plus'>
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError();
      }

      if (!allowedTiers.includes(req.user.subscriptionTier)) {
        throw new AuthorizationError(
          'This feature requires a premium subscription'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has premium or premium_plus subscription
 */
export function requirePremium(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  return requireSubscription(['premium', 'premium_plus'])(req, res, next);
}

/**
 * Check if user has premium_plus subscription
 */
export function requirePremiumPlus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  return requireSubscription(['premium_plus'])(req, res, next);
}

/**
 * Generate JWT token for user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Refresh token if close to expiry
 */
export function refreshTokenIfNeeded(token: string): string | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    // Refresh if less than 1 day until expiry
    if (timeUntilExpiry < 86400) {
      const { iat, exp, ...payload } = decoded;
      return generateToken(payload);
    }

    return null;
  } catch {
    return null;
  }
}
