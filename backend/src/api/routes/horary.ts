/**
 * Horary (Prashna) Astrology routes
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requirePremium, AuthenticatedRequest } from '../middleware/auth';
import { AppError, QuotaExceededError } from '../middleware/errorHandler';
import { processHoraryQuestion, getQuestionCategories, getKPNumberGuidance, validateKPNumber } from '../../services/horary';
import { logger } from '../../utils/logger';

export const horaryRouter = Router();

// In-memory storage for horary questions and user quotas
const horaryQuestions: Map<string, any> = new Map();
const userQuotas: Map<string, { questionsUsed: number; lastReset: Date }> = new Map();

const HoraryQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  category: z.enum([
    'career', 'relationship', 'health', 'finance', 'property',
    'travel', 'education', 'legal', 'lost_item', 'timing', 'general',
  ]),
  selectedNumber: z.number().int().min(1).max(249),
  system: z.enum(['parashari', 'kp']).default('kp'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().default('Asia/Kolkata'),
  language: z.enum(['en', 'hi']).default('en'),
});

/**
 * Get user's horary quota
 */
function getUserQuota(userId: string, subscriptionTier: string): {
  limit: number;
  used: number;
  remaining: number;
} {
  const limits = {
    free: 1,
    premium: 3,
    premium_plus: Infinity,
  };

  const limit = limits[subscriptionTier as keyof typeof limits] || 1;
  const quota = userQuotas.get(userId);
  const now = new Date();

  // Reset quota monthly
  if (!quota || now.getMonth() !== quota.lastReset.getMonth()) {
    userQuotas.set(userId, { questionsUsed: 0, lastReset: now });
    return { limit, used: 0, remaining: limit };
  }

  return {
    limit,
    used: quota.questionsUsed,
    remaining: Math.max(0, limit - quota.questionsUsed),
  };
}

/**
 * Increment user's quota usage
 */
function useQuota(userId: string): void {
  const quota = userQuotas.get(userId);
  if (quota) {
    quota.questionsUsed += 1;
    userQuotas.set(userId, quota);
  } else {
    userQuotas.set(userId, { questionsUsed: 1, lastReset: new Date() });
  }
}

/**
 * @route GET /api/v1/horary/categories
 * @desc Get available question categories
 */
horaryRouter.get('/categories', (req, res) => {
  res.json({
    status: 'success',
    data: {
      categories: getQuestionCategories(),
    },
  });
});

/**
 * @route GET /api/v1/horary/guidance
 * @desc Get guidance for selecting KP number
 */
horaryRouter.get('/guidance', (req, res) => {
  res.json({
    status: 'success',
    data: {
      guidance: getKPNumberGuidance(),
      parashari: {
        range: { min: 1, max: 108 },
        description: 'For Parashari system, select a number between 1 and 108',
      },
      kp: {
        range: { min: 1, max: 249 },
        description: 'For KP system, select a number between 1 and 249',
      },
    },
  });
});

/**
 * @route GET /api/v1/horary/quota
 * @desc Get user's horary question quota
 */
horaryRouter.get('/quota', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const quota = getUserQuota(req.user!.userId, req.user!.subscriptionTier);

  res.json({
    status: 'success',
    data: {
      quota,
      subscriptionTier: req.user!.subscriptionTier,
      upgradeMessage: quota.remaining === 0
        ? 'Upgrade to Premium for more horary questions'
        : undefined,
    },
  });
});

/**
 * @route POST /api/v1/horary/ask
 * @desc Ask a horary question
 */
horaryRouter.post('/ask', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = HoraryQuestionSchema.parse(req.body);
    const userId = req.user!.userId;
    const subscriptionTier = req.user!.subscriptionTier;

    // Validate KP number for the selected system
    if (!validateKPNumber(data.selectedNumber, data.system)) {
      throw new AppError(
        `Invalid number for ${data.system} system. Use 1-108 for Parashari or 1-249 for KP.`,
        400
      );
    }

    // Check quota
    const quota = getUserQuota(userId, subscriptionTier);
    if (quota.remaining <= 0) {
      throw new QuotaExceededError(
        `Monthly horary question limit reached (${quota.limit}). Upgrade for more questions.`
      );
    }

    logger.info(`Processing horary question for user ${userId}`);

    // Process the question
    const result = await processHoraryQuestion(
      userId,
      {
        question: data.question,
        category: data.category,
        selectedNumber: data.selectedNumber,
        system: data.system,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
      },
      data.language
    );

    // Use quota
    useQuota(userId);

    // Store the question
    horaryQuestions.set(result.question.id, result);

    res.status(201).json({
      status: 'success',
      data: {
        id: result.question.id,
        question: result.question.question,
        category: result.question.category,
        chart: {
          ascendant: result.chart.ascendantSign,
          moonSign: result.chart.moonSign,
          planets: result.chart.planets.map((p) => ({
            planet: p.planet,
            sign: p.signName,
            house: p.house,
            starLord: p.starLord,
            subLord: p.subLord,
          })),
        },
        rulingPlanets: result.rulingPlanets,
        relevantHouses: result.relevantHouses,
        significators: result.significators,
        interpretation: result.interpretation,
        quotaRemaining: quota.remaining - 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/horary/history
 * @desc Get user's horary question history
 */
horaryRouter.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { limit = 10, offset = 0 } = req.query;

    const questions = Array.from(horaryQuestions.values())
      .filter((q) => q.question.userId === userId)
      .sort((a, b) => new Date(b.question.createdAt).getTime() - new Date(a.question.createdAt).getTime())
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((q) => ({
        id: q.question.id,
        question: q.question.question,
        category: q.question.category,
        answer: q.interpretation?.substring(0, 200) + '...',
        createdAt: q.question.createdAt,
      }));

    res.json({
      status: 'success',
      data: {
        questions,
        total: Array.from(horaryQuestions.values()).filter((q) => q.question.userId === userId).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/horary/:questionId
 * @desc Get a specific horary question
 */
horaryRouter.get('/:questionId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { questionId } = req.params;
    const userId = req.user!.userId;

    const result = horaryQuestions.get(questionId);

    if (!result) {
      throw new AppError('Question not found', 404);
    }

    if (result.question.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      status: 'success',
      data: {
        id: result.question.id,
        question: result.question.question,
        category: result.question.category,
        chart: result.chart,
        rulingPlanets: result.rulingPlanets,
        relevantHouses: result.relevantHouses,
        significators: result.significators,
        interpretation: result.interpretation,
        createdAt: result.question.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});
