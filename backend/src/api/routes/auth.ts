/**
 * Authentication routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError, ValidationError } from '../middleware/errorHandler';
import { CreateUserSchema, type CreateUser } from '../../models/user';
import { logger } from '../../utils/logger';

export const authRouter = Router();

// In-memory user storage (replace with database in production)
const users: Map<string, {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  passwordHash: string;
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  createdAt: Date;
}> = new Map();

const RegisterSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

const LoginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      (u) => (data.email && u.email === data.email) || (data.phone && u.phone === data.phone)
    );

    if (existingUser) {
      throw new AppError('User with this email or phone already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      email: data.email,
      phone: data.phone,
      name: data.name,
      passwordHash,
      subscriptionTier: 'free' as const,
      createdAt: new Date(),
    };

    users.set(userId, user);

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
    });

    logger.info(`New user registered: ${userId}`);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = LoginSchema.parse(req.body);

    // Find user
    const user = Array.from(users.values()).find(
      (u) => (data.email && u.email === data.email) || (data.phone && u.phone === data.phone)
    );

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
    });

    logger.info(`User logged in: ${user.id}`);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user
 */
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = users.get(req.user!.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh token
 */
authRouter.post('/refresh', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = users.get(req.user!.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
    });

    res.json({
      status: 'success',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user (client-side token removal)
 */
authRouter.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  // JWT tokens are stateless, so logout is handled client-side
  // In production, you might want to implement token blacklisting
  res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
});
