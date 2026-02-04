/**
 * Compatibility matching routes
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requirePremium, AuthenticatedRequest } from '../middleware/auth';
import { AppError, QuotaExceededError } from '../middleware/errorHandler';
import { BirthDetailsSchema } from '../../models/user';
import { processCompatibilityMatch } from '../../services/compatibility';
import { logger } from '../../utils/logger';

export const compatibilityRouter = Router();

// In-memory storage
const compatibilityMatches: Map<string, any> = new Map();
const userQuotas: Map<string, { matchesUsed: number; lastReset: Date }> = new Map();

const CompatibilityMatchSchema = z.object({
  person1Name: z.string().min(1).max(100),
  person1BirthDetails: BirthDetailsSchema,
  person2Name: z.string().min(1).max(100),
  person2BirthDetails: BirthDetailsSchema,
  system: z.enum(['ashtakoot', 'dashakoot']).default('ashtakoot'),
  language: z.enum(['en', 'hi']).default('en'),
});

/**
 * Get user's compatibility quota
 */
function getUserQuota(userId: string, subscriptionTier: string): {
  limit: number;
  used: number;
  remaining: number;
} {
  const limits = {
    free: 0, // Free users can't use compatibility matching
    premium: 3,
    premium_plus: Infinity,
  };

  const limit = limits[subscriptionTier as keyof typeof limits] || 0;
  const quota = userQuotas.get(userId);
  const now = new Date();

  // Reset quota monthly
  if (!quota || now.getMonth() !== quota.lastReset.getMonth()) {
    userQuotas.set(userId, { matchesUsed: 0, lastReset: now });
    return { limit, used: 0, remaining: limit };
  }

  return {
    limit,
    used: quota.matchesUsed,
    remaining: Math.max(0, limit - quota.matchesUsed),
  };
}

/**
 * Increment user's quota usage
 */
function useQuota(userId: string): void {
  const quota = userQuotas.get(userId);
  if (quota) {
    quota.matchesUsed += 1;
    userQuotas.set(userId, quota);
  } else {
    userQuotas.set(userId, { matchesUsed: 1, lastReset: new Date() });
  }
}

/**
 * @route GET /api/v1/compatibility/systems
 * @desc Get information about compatibility systems
 */
compatibilityRouter.get('/systems', (req, res) => {
  res.json({
    status: 'success',
    data: {
      systems: [
        {
          id: 'ashtakoot',
          name: 'Ashtakoot (Guna Milan)',
          region: 'North India',
          description: '36-point matching system analyzing 8 aspects (kootas) of compatibility',
          totalPoints: 36,
          minimumRecommended: 18,
          aspects: [
            { name: 'Varna', points: 1, description: 'Spiritual compatibility' },
            { name: 'Vasya', points: 2, description: 'Mutual attraction and control' },
            { name: 'Tara', points: 3, description: 'Birth star compatibility' },
            { name: 'Yoni', points: 4, description: 'Physical and sexual compatibility' },
            { name: 'Graha Maitri', points: 5, description: 'Mental compatibility' },
            { name: 'Gana', points: 6, description: 'Temperament compatibility' },
            { name: 'Bhakoot', points: 7, description: 'Health and wealth' },
            { name: 'Nadi', points: 8, description: 'Health and progeny' },
          ],
        },
        {
          id: 'dashakoot',
          name: 'Dashakoot (Porutham)',
          region: 'South India (Kerala, Tamil Nadu)',
          description: '10-point matching system with essential and secondary factors',
          totalPoints: 10,
          minimumRecommended: 6,
          essentialAspects: ['Dina', 'Gana', 'Rajju', 'Rasi'],
          aspects: [
            { name: 'Dina', essential: false, description: 'Daily happiness and health' },
            { name: 'Gana', essential: true, description: 'Temperament match' },
            { name: 'Mahendra', essential: false, description: 'Progeny and prosperity' },
            { name: 'Stree Deergha', essential: false, description: 'Wife\'s longevity' },
            { name: 'Yoni', essential: false, description: 'Physical compatibility' },
            { name: 'Veda', essential: false, description: 'Absence of obstacles' },
            { name: 'Rajju', essential: true, description: 'Marital longevity' },
            { name: 'Rasi', essential: true, description: 'Moon sign compatibility' },
            { name: 'Rasiyathipathi', essential: false, description: 'Rasi lord friendship' },
            { name: 'Vasya', essential: false, description: 'Mutual attraction' },
          ],
        },
      ],
    },
  });
});

/**
 * @route GET /api/v1/compatibility/quota
 * @desc Get user's compatibility matching quota
 */
compatibilityRouter.get('/quota', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const quota = getUserQuota(req.user!.userId, req.user!.subscriptionTier);

  res.json({
    status: 'success',
    data: {
      quota,
      subscriptionTier: req.user!.subscriptionTier,
      upgradeMessage: quota.limit === 0
        ? 'Compatibility matching requires Premium subscription'
        : quota.remaining === 0
          ? 'Monthly quota exhausted. Upgrade to Premium Plus for unlimited matches.'
          : undefined,
    },
  });
});

/**
 * @route POST /api/v1/compatibility/match
 * @desc Perform compatibility matching
 */
compatibilityRouter.post('/match', authenticate, requirePremium, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = CompatibilityMatchSchema.parse(req.body);
    const userId = req.user!.userId;
    const subscriptionTier = req.user!.subscriptionTier;

    // Check quota
    const quota = getUserQuota(userId, subscriptionTier);
    if (quota.remaining <= 0) {
      throw new QuotaExceededError(
        `Monthly compatibility matching limit reached (${quota.limit}). Upgrade for more matches.`
      );
    }

    logger.info(`Processing compatibility match for user ${userId}`);

    // Process the compatibility match
    const result = await processCompatibilityMatch(
      userId,
      {
        person1Name: data.person1Name,
        person1BirthDetails: data.person1BirthDetails,
        person2Name: data.person2Name,
        person2BirthDetails: data.person2BirthDetails,
        system: data.system,
      },
      data.language
    );

    // Use quota
    useQuota(userId);

    // Store the match
    compatibilityMatches.set(result.match.id, result);

    res.status(201).json({
      status: 'success',
      data: {
        id: result.match.id,
        person1: {
          name: result.match.person1Name,
          moonSign: result.person1Chart.moonSign,
          ascendant: result.person1Chart.ascendantSign,
        },
        person2: {
          name: result.match.person2Name,
          moonSign: result.person2Chart.moonSign,
          ascendant: result.person2Chart.ascendantSign,
        },
        system: result.match.system,
        result: result.match.result,
        interpretation: result.interpretation,
        quotaRemaining: quota.remaining - 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/compatibility/history
 * @desc Get user's compatibility match history
 */
compatibilityRouter.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { limit = 10, offset = 0 } = req.query;

    const matches = Array.from(compatibilityMatches.values())
      .filter((m) => m.match.userId === userId)
      .sort((a, b) => new Date(b.match.createdAt).getTime() - new Date(a.match.createdAt).getTime())
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((m) => ({
        id: m.match.id,
        person1Name: m.match.person1Name,
        person2Name: m.match.person2Name,
        system: m.match.system,
        compatibility: m.match.result.overallCompatibility,
        score: m.match.system === 'ashtakoot'
          ? `${m.match.result.totalPoints}/36`
          : `${m.match.result.matchedCount}/10`,
        createdAt: m.match.createdAt,
      }));

    res.json({
      status: 'success',
      data: {
        matches,
        total: Array.from(compatibilityMatches.values()).filter((m) => m.match.userId === userId).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/compatibility/:matchId
 * @desc Get a specific compatibility match
 */
compatibilityRouter.get('/:matchId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const userId = req.user!.userId;

    const result = compatibilityMatches.get(matchId);

    if (!result) {
      throw new AppError('Match not found', 404);
    }

    if (result.match.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      status: 'success',
      data: {
        id: result.match.id,
        person1: {
          name: result.match.person1Name,
          chart: {
            moonSign: result.person1Chart.moonSign,
            ascendant: result.person1Chart.ascendantSign,
            planets: result.person1Chart.planets,
          },
        },
        person2: {
          name: result.match.person2Name,
          chart: {
            moonSign: result.person2Chart.moonSign,
            ascendant: result.person2Chart.ascendantSign,
            planets: result.person2Chart.planets,
          },
        },
        system: result.match.system,
        result: result.match.result,
        interpretation: result.interpretation,
        createdAt: result.match.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});
