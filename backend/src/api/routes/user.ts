/**
 * User management routes
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { BirthDetailsSchema } from '../../models/user';
import { logger } from '../../utils/logger';

export const userRouter = Router();

// In-memory user storage (shared - in production use database)
const users: Map<string, {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  birthDetails?: any;
  preferredChartStyle: 'north_indian' | 'south_indian';
  preferredSystem: 'parashari' | 'kp';
  preferredLanguage: 'en' | 'hi';
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}> = new Map();

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  birthDetails: BirthDetailsSchema.optional(),
  preferredChartStyle: z.enum(['north_indian', 'south_indian']).optional(),
  preferredSystem: z.enum(['parashari', 'kp']).optional(),
  preferredLanguage: z.enum(['en', 'hi']).optional(),
});

/**
 * @route GET /api/v1/user/profile
 * @desc Get user profile
 */
userRouter.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    let user = users.get(userId);

    // Create basic user profile if not exists
    if (!user) {
      user = {
        id: userId,
        email: req.user!.email,
        phone: req.user!.phone,
        name: 'User',
        preferredChartStyle: 'north_indian',
        preferredSystem: 'parashari',
        preferredLanguage: 'en',
        subscriptionTier: req.user!.subscriptionTier,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.set(userId, user);
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          birthDetails: user.birthDetails,
          preferences: {
            chartStyle: user.preferredChartStyle,
            system: user.preferredSystem,
            language: user.preferredLanguage,
          },
          subscription: {
            tier: user.subscriptionTier,
            expiresAt: user.subscriptionExpiresAt,
          },
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/user/profile
 * @desc Update user profile
 */
userRouter.patch('/profile', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const data = UpdateProfileSchema.parse(req.body);

    let user = users.get(userId);

    if (!user) {
      user = {
        id: userId,
        email: req.user!.email,
        phone: req.user!.phone,
        name: data.name || 'User',
        preferredChartStyle: data.preferredChartStyle || 'north_indian',
        preferredSystem: data.preferredSystem || 'parashari',
        preferredLanguage: data.preferredLanguage || 'en',
        subscriptionTier: req.user!.subscriptionTier,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Update fields
    if (data.name) user.name = data.name;
    if (data.birthDetails) user.birthDetails = data.birthDetails;
    if (data.preferredChartStyle) user.preferredChartStyle = data.preferredChartStyle;
    if (data.preferredSystem) user.preferredSystem = data.preferredSystem;
    if (data.preferredLanguage) user.preferredLanguage = data.preferredLanguage;
    user.updatedAt = new Date();

    users.set(userId, user);

    logger.info(`User profile updated: ${userId}`);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          birthDetails: user.birthDetails,
          preferences: {
            chartStyle: user.preferredChartStyle,
            system: user.preferredSystem,
            language: user.preferredLanguage,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/user/birth-details
 * @desc Save or update birth details
 */
userRouter.post('/birth-details', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const birthDetails = BirthDetailsSchema.parse(req.body);

    let user = users.get(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.birthDetails = birthDetails;
    user.updatedAt = new Date();
    users.set(userId, user);

    logger.info(`Birth details saved for user: ${userId}`);

    res.json({
      status: 'success',
      data: {
        birthDetails: user.birthDetails,
        message: 'Birth details saved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/user/subscription
 * @desc Get subscription details
 */
userRouter.get('/subscription', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = users.get(userId);

    const subscriptionFeatures = {
      free: {
        birthChart: 'Basic Parashari chart',
        horary: '1 question/month',
        compatibility: 'Not available',
        predictions: 'Daily only',
        remedies: 'Not available',
        chartQA: 'Limited',
      },
      premium: {
        birthChart: 'Both Parashari & KP systems',
        horary: '3 questions/month',
        compatibility: '3 matches/month',
        predictions: 'Daily, Monthly, Yearly',
        remedies: 'Available',
        chartQA: 'Unlimited',
      },
      premium_plus: {
        birthChart: 'All systems with advanced analysis',
        horary: 'Unlimited',
        compatibility: 'Unlimited',
        predictions: 'Personalized AI predictions',
        remedies: 'Detailed personalized remedies',
        chartQA: 'Unlimited with priority',
      },
    };

    const pricing = {
      premium: {
        monthly: { amount: 299, currency: 'INR' },
        yearly: { amount: 2999, currency: 'INR', savings: '17%' },
      },
      premium_plus: {
        monthly: { amount: 599, currency: 'INR' },
        yearly: { amount: 5999, currency: 'INR', savings: '17%' },
      },
    };

    res.json({
      status: 'success',
      data: {
        current: {
          tier: req.user!.subscriptionTier,
          expiresAt: user?.subscriptionExpiresAt,
          features: subscriptionFeatures[req.user!.subscriptionTier],
        },
        available: [
          {
            tier: 'premium',
            name: 'Premium',
            features: subscriptionFeatures.premium,
            pricing: pricing.premium,
          },
          {
            tier: 'premium_plus',
            name: 'Premium Plus',
            features: subscriptionFeatures.premium_plus,
            pricing: pricing.premium_plus,
            recommended: true,
          },
        ],
        adhoc: {
          horaryQuestion: { amount: 59, currency: 'INR', description: 'Single horary question' },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/user/account
 * @desc Delete user account
 */
userRouter.delete('/account', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Delete user data
    users.delete(userId);

    logger.info(`User account deleted: ${userId}`);

    res.json({
      status: 'success',
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/user/export
 * @desc Export user data (GDPR compliance)
 */
userRouter.get('/export', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = users.get(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Compile all user data
    const exportData = {
      profile: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        birthDetails: user.birthDetails,
        preferences: {
          chartStyle: user.preferredChartStyle,
          system: user.preferredSystem,
          language: user.preferredLanguage,
        },
        subscription: {
          tier: user.subscriptionTier,
          expiresAt: user.subscriptionExpiresAt,
        },
        createdAt: user.createdAt,
      },
      // In production, include charts, horary questions, compatibility matches, etc.
      charts: [],
      horaryQuestions: [],
      compatibilityMatches: [],
      exportedAt: new Date().toISOString(),
    };

    res.json({
      status: 'success',
      data: exportData,
    });
  } catch (error) {
    next(error);
  }
});
