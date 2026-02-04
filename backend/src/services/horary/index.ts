/**
 * Horary (Prashna) Astrology Service
 * Handles all horary/prashna related functionality
 */

import { v4 as uuidv4 } from 'uuid';
import { generateHoraryChart, calculateRulingPlanets, kpNumberToLongitude } from '../astrology/kp';
import { calculateAyanamsa, parseBirthDetails } from '../astrology/calculations';
import { interpretHoraryQuestion } from '../ai/claude';
import type { HoraryQuestion, CreateHoraryQuestion, Chart } from '../../models';
import { CATEGORY_HOUSE_MAP, HORARY_HOUSE_SIGNIFICATIONS } from '../../models/horary';
import { logger } from '../../utils/logger';

export interface HoraryResult {
  question: HoraryQuestion;
  chart: Chart;
  rulingPlanets: string[];
  significators: Record<number, string[]>;
  relevantHouses: number[];
  interpretation: string;
}

/**
 * Process a horary question and generate answer
 */
export async function processHoraryQuestion(
  userId: string,
  questionData: CreateHoraryQuestion,
  language: 'en' | 'hi' = 'en'
): Promise<HoraryResult> {
  const questionTime = new Date();

  // Generate horary chart from KP number
  const chartResult = await generateHoraryChart(
    userId,
    questionData.selectedNumber,
    questionData.latitude,
    questionData.longitude,
    questionData.timezone
  );

  // Get relevant houses for the question category
  const relevantHouses = CATEGORY_HOUSE_MAP[questionData.category] || [1, 7, 10];

  // Create horary question record
  const question: HoraryQuestion = {
    id: uuidv4(),
    userId,
    question: questionData.question,
    category: questionData.category,
    selectedNumber: questionData.selectedNumber,
    system: questionData.system || 'kp',
    questionTime,
    latitude: questionData.latitude,
    longitude: questionData.longitude,
    timezone: questionData.timezone,
    chartData: chartResult.chart,
    rulingPlanets: chartResult.rulingPlanets,
    significators: chartResult.significators,
    createdAt: questionTime,
  };

  // Generate AI interpretation
  try {
    const interpretation = await interpretHoraryQuestion(
      question,
      chartResult,
      { language }
    );
    question.answer = interpretation;

    return {
      question,
      chart: chartResult.chart,
      rulingPlanets: chartResult.rulingPlanets,
      significators: chartResult.significators,
      relevantHouses,
      interpretation,
    };
  } catch (error) {
    logger.error('Error generating horary interpretation:', error);
    throw error;
  }
}

/**
 * Get house significations for a category
 */
export function getHouseSignifications(category: keyof typeof CATEGORY_HOUSE_MAP): {
  primaryHouse: number;
  significations: string[];
  allRelevantHouses: { house: number; significations: string[] }[];
} {
  const houses = CATEGORY_HOUSE_MAP[category];
  const primaryHouse = houses[0];

  return {
    primaryHouse,
    significations: HORARY_HOUSE_SIGNIFICATIONS[primaryHouse as keyof typeof HORARY_HOUSE_SIGNIFICATIONS] || [],
    allRelevantHouses: houses.map((h) => ({
      house: h,
      significations: HORARY_HOUSE_SIGNIFICATIONS[h as keyof typeof HORARY_HOUSE_SIGNIFICATIONS] || [],
    })),
  };
}

/**
 * Validate KP number
 */
export function validateKPNumber(number: number, system: 'parashari' | 'kp'): boolean {
  if (system === 'parashari') {
    return number >= 1 && number <= 108;
  }
  return number >= 1 && number <= 249;
}

/**
 * Get guidance for selecting a KP number
 */
export function getKPNumberGuidance(): string {
  return `To ask a horary question:

1. Close your eyes and think deeply about your question
2. When ready, think of a number between 1 and 249
3. The first number that comes to your mind naturally is your KP number
4. Don't second-guess or change the number

The number you select will determine the ascendant of the horary chart, which is crucial for accurate predictions.

For Parashari system, select a number between 1 and 108 instead.`;
}

/**
 * Get categories with descriptions
 */
export function getQuestionCategories(): {
  category: string;
  description: string;
  sampleQuestions: string[];
}[] {
  return [
    {
      category: 'career',
      description: 'Questions about job, profession, business, and work',
      sampleQuestions: [
        'Will I get this job?',
        'Should I start my own business?',
        'Will I get a promotion this year?',
      ],
    },
    {
      category: 'relationship',
      description: 'Questions about love, marriage, and partnerships',
      sampleQuestions: [
        'Will this relationship lead to marriage?',
        'Is this person right for me?',
        'When will I get married?',
      ],
    },
    {
      category: 'health',
      description: 'Questions about wellbeing and recovery',
      sampleQuestions: [
        'Will I recover soon?',
        'Should I proceed with this treatment?',
      ],
    },
    {
      category: 'finance',
      description: 'Questions about money, investments, and wealth',
      sampleQuestions: [
        'Will this investment be profitable?',
        'Will I get my money back?',
        'Is this a good time to buy property?',
      ],
    },
    {
      category: 'property',
      description: 'Questions about real estate and property matters',
      sampleQuestions: [
        'Will I be able to buy this house?',
        'Should I sell my property now?',
        'Will my property dispute be resolved?',
      ],
    },
    {
      category: 'travel',
      description: 'Questions about journeys and relocation',
      sampleQuestions: [
        'Will my visa be approved?',
        'Is this a good time to travel?',
        'Should I relocate for this opportunity?',
      ],
    },
    {
      category: 'education',
      description: 'Questions about studies and examinations',
      sampleQuestions: [
        'Will I pass this exam?',
        'Should I pursue higher education?',
        'Will I get admission to this college?',
      ],
    },
    {
      category: 'legal',
      description: 'Questions about legal matters and disputes',
      sampleQuestions: [
        'Will I win this case?',
        'Should I proceed with legal action?',
        'When will my case be resolved?',
      ],
    },
    {
      category: 'lost_item',
      description: 'Questions about lost or stolen items',
      sampleQuestions: [
        'Will I find my lost item?',
        'Where should I look for it?',
        'Was it stolen?',
      ],
    },
    {
      category: 'timing',
      description: 'Questions about timing and muhurta',
      sampleQuestions: [
        'When is the best time to start this venture?',
        'Will this happen within this month?',
        'When will I hear back about this?',
      ],
    },
    {
      category: 'general',
      description: 'Other questions not fitting specific categories',
      sampleQuestions: [
        'What should I do in this situation?',
        'Is this decision favorable for me?',
      ],
    },
  ];
}
