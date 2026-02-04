/**
 * Prediction routes (Daily, Monthly, Yearly horoscopes)
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { AppError, QuotaExceededError } from '../middleware/errorHandler';
import { generatePrediction } from '../../services/ai/claude';
import { logger } from '../../utils/logger';

export const predictionRouter = Router();

// Cache for predictions
const predictionCache: Map<string, {
  prediction: string;
  generatedAt: Date;
  validUntil: Date;
}> = new Map();

// User charts storage reference (shared with chart routes)
const userCharts: Map<string, any> = new Map();

const PredictionSchema = z.object({
  chartId: z.string().uuid().optional(),
  moonSign: z.string().optional(),
  period: z.enum(['daily', 'monthly', 'yearly']),
  language: z.enum(['en', 'hi']).default('en'),
});

/**
 * Get cache key for prediction
 */
function getCacheKey(moonSign: string, period: string): string {
  const today = new Date();
  const dateKey = period === 'daily'
    ? today.toISOString().split('T')[0]
    : period === 'monthly'
      ? `${today.getFullYear()}-${today.getMonth()}`
      : `${today.getFullYear()}`;

  return `${moonSign}-${period}-${dateKey}`;
}

/**
 * Get generic horoscope for a moon sign
 */
function getGenericHoroscope(moonSign: string, period: string): string {
  const horoscopes: { [key: string]: { [key: string]: string } } = {
    Aries: {
      daily: 'Today brings energy and initiative. Mars, your ruler, encourages bold action. Focus on personal goals while being mindful of impulsive decisions.',
      monthly: 'This month favors new beginnings and leadership opportunities. Your confidence is high, but balance ambition with patience.',
      yearly: 'A transformative year for career and personal growth. Jupiter\'s influence brings expansion, while Saturn teaches valuable lessons in persistence.',
    },
    Taurus: {
      daily: 'A day for stability and practical matters. Venus brings harmony to relationships. Financial decisions require careful thought.',
      monthly: 'Focus on security and building foundations this month. Love life shows promise, and creative pursuits flourish.',
      yearly: 'Material and emotional security are themes this year. Slow and steady progress leads to lasting gains.',
    },
    Gemini: {
      daily: 'Communication is highlighted. Mercury enhances your wit and learning. Short trips or important conversations are favorable.',
      monthly: 'Intellectual stimulation and social connections dominate. Multiple opportunities require prioritization.',
      yearly: 'A year of learning, teaching, and expanding your network. Flexibility is your greatest asset.',
    },
    Cancer: {
      daily: 'Emotional sensitivity is heightened. The Moon guides you toward nurturing activities. Home and family matters need attention.',
      monthly: 'Focus on emotional well-being and domestic harmony. Intuition is strong for important decisions.',
      yearly: 'A year for deepening roots and emotional healing. Family relationships undergo positive transformation.',
    },
    Leo: {
      daily: 'Your natural charisma shines. Creative expression and leadership opportunities arise. Generosity brings rewards.',
      monthly: 'Romance and creative projects flourish. Recognition for your efforts is likely.',
      yearly: 'A year to shine in your chosen field. Self-expression and personal branding bring success.',
    },
    Virgo: {
      daily: 'Attention to detail serves you well. Health and work routines benefit from organization. Service to others is highlighted.',
      monthly: 'Practical improvements and health initiatives succeed. Analysis leads to better systems.',
      yearly: 'A year of refinement and skill development. Health improvements have lasting benefits.',
    },
    Libra: {
      daily: 'Balance and harmony are your focus. Relationships require diplomatic attention. Artistic pursuits are favored.',
      monthly: 'Partnership matters come to the forefront. Legal and contractual issues resolve favorably.',
      yearly: 'A year for significant relationship developments. Balance personal needs with others\' expectations.',
    },
    Scorpio: {
      daily: 'Deep insights and transformative experiences are possible. Research and investigation yield results. Emotional intensity is high.',
      monthly: 'Shared resources and intimate matters require attention. Transformation through releasing the old.',
      yearly: 'A powerful year for personal transformation. Financial partnerships and inheritances are highlighted.',
    },
    Sagittarius: {
      daily: 'Optimism and adventure call. Learning and teaching opportunities arise. Long-distance connections are favorable.',
      monthly: 'Travel and higher education bring growth. Philosophical insights guide decisions.',
      yearly: 'A year of expansion through knowledge and experience. Foreign connections prove valuable.',
    },
    Capricorn: {
      daily: 'Career matters demand attention. Saturn rewards discipline and hard work. Structure and planning succeed.',
      monthly: 'Professional advancement is possible. Reputation and authority grow through consistent effort.',
      yearly: 'A year for climbing toward long-term goals. Patience and persistence pay dividends.',
    },
    Aquarius: {
      daily: 'Innovation and friendship are highlighted. Group activities bring opportunities. Embrace your uniqueness.',
      monthly: 'Social causes and technology projects flourish. Unexpected changes bring positive outcomes.',
      yearly: 'A year of humanitarian pursuits and friendship. Innovation in your field brings recognition.',
    },
    Pisces: {
      daily: 'Spiritual and creative energies flow freely. Intuition guides important decisions. Rest and reflection are beneficial.',
      monthly: 'Artistic expression and spiritual growth are highlighted. Compassion for others brings personal fulfillment.',
      yearly: 'A year for spiritual deepening and creative achievements. Dreams and intuition guide your path.',
    },
  };

  return horoscopes[moonSign]?.[period] ||
    `The stars align favorably for ${moonSign} this ${period === 'daily' ? 'day' : period === 'monthly' ? 'month' : 'year'}.`;
}

/**
 * @route GET /api/v1/predictions/signs
 * @desc Get list of zodiac signs
 */
predictionRouter.get('/signs', (req, res) => {
  const signs = [
    { name: 'Aries', symbol: '♈', element: 'Fire', ruler: 'Mars' },
    { name: 'Taurus', symbol: '♉', element: 'Earth', ruler: 'Venus' },
    { name: 'Gemini', symbol: '♊', element: 'Air', ruler: 'Mercury' },
    { name: 'Cancer', symbol: '♋', element: 'Water', ruler: 'Moon' },
    { name: 'Leo', symbol: '♌', element: 'Fire', ruler: 'Sun' },
    { name: 'Virgo', symbol: '♍', element: 'Earth', ruler: 'Mercury' },
    { name: 'Libra', symbol: '♎', element: 'Air', ruler: 'Venus' },
    { name: 'Scorpio', symbol: '♏', element: 'Water', ruler: 'Mars' },
    { name: 'Sagittarius', symbol: '♐', element: 'Fire', ruler: 'Jupiter' },
    { name: 'Capricorn', symbol: '♑', element: 'Earth', ruler: 'Saturn' },
    { name: 'Aquarius', symbol: '♒', element: 'Air', ruler: 'Saturn' },
    { name: 'Pisces', symbol: '♓', element: 'Water', ruler: 'Jupiter' },
  ];

  res.json({
    status: 'success',
    data: { signs },
  });
});

/**
 * @route GET /api/v1/predictions/daily/:sign
 * @desc Get daily horoscope for a sign (free)
 */
predictionRouter.get('/daily/:sign', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sign } = req.params;
    const validSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

    if (!validSigns.includes(sign)) {
      throw new AppError('Invalid zodiac sign', 400);
    }

    // Check cache
    const cacheKey = getCacheKey(sign, 'daily');
    const cached = predictionCache.get(cacheKey);

    if (cached && cached.validUntil > new Date()) {
      res.json({
        status: 'success',
        data: {
          sign,
          period: 'daily',
          prediction: cached.prediction,
          date: new Date().toISOString().split('T')[0],
          cached: true,
        },
      });
      return;
    }

    // Generate generic horoscope for free users
    const prediction = getGenericHoroscope(sign, 'daily');

    // Cache it
    const validUntil = new Date();
    validUntil.setHours(23, 59, 59, 999);
    predictionCache.set(cacheKey, {
      prediction,
      generatedAt: new Date(),
      validUntil,
    });

    res.json({
      status: 'success',
      data: {
        sign,
        period: 'daily',
        prediction,
        date: new Date().toISOString().split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/predictions/personalized
 * @desc Get personalized prediction based on birth chart (premium)
 */
predictionRouter.post('/personalized', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = PredictionSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check subscription for detailed predictions
    if (req.user!.subscriptionTier === 'free' && data.period !== 'daily') {
      throw new QuotaExceededError('Monthly and yearly predictions require premium subscription');
    }

    let chart;

    if (data.chartId) {
      const chartRecord = userCharts.get(data.chartId);
      if (!chartRecord || chartRecord.userId !== userId) {
        throw new AppError('Chart not found', 404);
      }
      chart = chartRecord.chart;
    } else if (data.moonSign) {
      // Use generic prediction for moon sign
      const prediction = getGenericHoroscope(data.moonSign, data.period);
      res.json({
        status: 'success',
        data: {
          moonSign: data.moonSign,
          period: data.period,
          prediction,
          personalized: false,
        },
      });
      return;
    } else {
      throw new AppError('Either chartId or moonSign is required', 400);
    }

    logger.info(`Generating ${data.period} prediction for user ${userId}`);

    // Generate personalized prediction
    const prediction = await generatePrediction(
      chart.chart,
      data.period,
      chart.currentDasha,
      { language: data.language }
    );

    res.json({
      status: 'success',
      data: {
        chartId: data.chartId,
        period: data.period,
        prediction,
        personalized: true,
        currentDasha: chart.currentDasha.planet,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/predictions/transits
 * @desc Get current planetary transits
 */
predictionRouter.get('/transits', (req, res) => {
  // Simplified transit information
  const today = new Date();

  const transits = {
    date: today.toISOString().split('T')[0],
    moon: {
      sign: 'Based on current position',
      nakshatra: 'Current nakshatra',
      tithi: 'Current tithi',
    },
    majorTransits: [
      'Check ephemeris for current major transits',
    ],
    upcomingEvents: [
      'New Moon',
      'Full Moon',
      'Eclipses if any',
    ],
  };

  res.json({
    status: 'success',
    data: { transits },
  });
});
