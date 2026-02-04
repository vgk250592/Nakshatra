/**
 * Birth Chart routes
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requirePremium, AuthenticatedRequest } from '../middleware/auth';
import { AppError, QuotaExceededError } from '../middleware/errorHandler';
import { BirthDetailsSchema } from '../../models/user';
import { generateBirthChart } from '../../services/astrology';
import { interpretBirthChart, generateRemedies, handleChartQuestion } from '../../services/ai/claude';
import { logger } from '../../utils/logger';

export const chartRouter = Router();

// In-memory chart storage (replace with database in production)
const userCharts: Map<string, {
  id: string;
  userId: string;
  chart: any;
  interpretation?: string;
  createdAt: Date;
}> = new Map();

const GenerateChartSchema = z.object({
  birthDetails: BirthDetailsSchema,
  system: z.enum(['parashari', 'kp']).default('parashari'),
  chartStyle: z.enum(['north_indian', 'south_indian']).default('north_indian'),
  includeInterpretation: z.boolean().default(false),
  language: z.enum(['en', 'hi']).default('en'),
});

const ChartQuestionSchema = z.object({
  chartId: z.string().uuid(),
  question: z.string().min(5).max(500),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
});

/**
 * @route POST /api/v1/chart/generate
 * @desc Generate a birth chart
 */
chartRouter.post('/generate', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = GenerateChartSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check subscription for KP system
    if (data.system === 'kp' && req.user!.subscriptionTier === 'free') {
      throw new QuotaExceededError('KP system requires premium subscription');
    }

    logger.info(`Generating ${data.system} chart for user ${userId}`);

    // Generate the chart
    const result = await generateBirthChart(userId, data.birthDetails, {
      system: data.system,
      chartStyle: data.chartStyle,
      includeYogas: true,
      includeSignificators: data.system === 'kp',
    });

    let interpretation: string | undefined;

    // Generate interpretation if requested (premium only)
    if (data.includeInterpretation) {
      if (req.user!.subscriptionTier === 'free') {
        throw new QuotaExceededError('Detailed interpretation requires premium subscription');
      }

      interpretation = await interpretBirthChart(result.analysis, {
        language: data.language,
        detailLevel: 'detailed',
        includeRemedies: true,
      });
    }

    // Store the chart
    const chartRecord = {
      id: result.analysis.chart.id,
      userId,
      chart: result.analysis,
      interpretation,
      createdAt: new Date(),
    };
    userCharts.set(result.analysis.chart.id, chartRecord);

    res.status(201).json({
      status: 'success',
      data: {
        chart: {
          id: result.analysis.chart.id,
          system: result.analysis.chart.system,
          ascendant: result.analysis.chart.ascendantSign,
          moonSign: result.analysis.chart.moonSign,
          sunSign: result.analysis.chart.sunSign,
          planets: result.analysis.chart.planets,
          houses: result.analysis.chart.houses,
          chartStyle: result.analysis.chart.chartStyle,
        },
        svg: result.svg,
        currentDasha: result.analysis.currentDasha,
        yogas: result.analysis.yogas,
        interpretation,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/chart/:chartId
 * @desc Get a specific chart
 */
chartRouter.get('/:chartId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chartId } = req.params;
    const userId = req.user!.userId;

    const chartRecord = userCharts.get(chartId);

    if (!chartRecord) {
      throw new AppError('Chart not found', 404);
    }

    if (chartRecord.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      status: 'success',
      data: {
        chart: chartRecord.chart,
        interpretation: chartRecord.interpretation,
        createdAt: chartRecord.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/chart
 * @desc Get all charts for current user
 */
chartRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const charts = Array.from(userCharts.values())
      .filter((c) => c.userId === userId)
      .map((c) => ({
        id: c.id,
        system: c.chart.chart.system,
        ascendant: c.chart.chart.ascendantSign,
        moonSign: c.chart.chart.moonSign,
        createdAt: c.createdAt,
      }));

    res.json({
      status: 'success',
      data: { charts },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/chart/interpret
 * @desc Get interpretation for an existing chart
 */
chartRouter.post('/interpret', authenticate, requirePremium, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chartId, language = 'en', focusAreas } = req.body;
    const userId = req.user!.userId;

    const chartRecord = userCharts.get(chartId);

    if (!chartRecord) {
      throw new AppError('Chart not found', 404);
    }

    if (chartRecord.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    const interpretation = await interpretBirthChart(chartRecord.chart, {
      language,
      detailLevel: 'detailed',
      focusAreas,
      includeRemedies: true,
    });

    // Update stored chart with interpretation
    chartRecord.interpretation = interpretation;
    userCharts.set(chartId, chartRecord);

    res.json({
      status: 'success',
      data: { interpretation },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/chart/remedies
 * @desc Get remedies for a chart
 */
chartRouter.post('/remedies', authenticate, requirePremium, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chartId, focusPlanets, focusAreas, language = 'en' } = req.body;
    const userId = req.user!.userId;

    const chartRecord = userCharts.get(chartId);

    if (!chartRecord) {
      throw new AppError('Chart not found', 404);
    }

    if (chartRecord.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    const remedies = await generateRemedies(
      chartRecord.chart.chart,
      focusPlanets,
      focusAreas,
      { language }
    );

    res.json({
      status: 'success',
      data: { remedies },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/chart/ask
 * @desc Ask a question about a chart (Q&A feature)
 */
chartRouter.post('/ask', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = ChartQuestionSchema.parse(req.body);
    const userId = req.user!.userId;

    const chartRecord = userCharts.get(data.chartId);

    if (!chartRecord) {
      throw new AppError('Chart not found', 404);
    }

    if (chartRecord.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Free users get limited Q&A
    if (req.user!.subscriptionTier === 'free' && data.conversationHistory.length >= 2) {
      throw new QuotaExceededError('Free tier limited to 2 follow-up questions. Upgrade for unlimited Q&A.');
    }

    const answer = await handleChartQuestion(
      chartRecord.chart.chart,
      data.question,
      data.conversationHistory
    );

    res.json({
      status: 'success',
      data: {
        answer,
        conversationHistory: [
          ...data.conversationHistory,
          { role: 'user', content: data.question },
          { role: 'assistant', content: answer },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/chart/:chartId
 * @desc Delete a chart
 */
chartRouter.delete('/:chartId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chartId } = req.params;
    const userId = req.user!.userId;

    const chartRecord = userCharts.get(chartId);

    if (!chartRecord) {
      throw new AppError('Chart not found', 404);
    }

    if (chartRecord.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    userCharts.delete(chartId);

    res.json({
      status: 'success',
      message: 'Chart deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});
