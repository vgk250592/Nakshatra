/**
 * Claude AI Integration Service
 * Handles all AI-powered astrological interpretations using Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { Chart, FullChartAnalysis, HoraryQuestion, CompatibilityMatch } from '../../models';
import { generateChartText } from '../astrology/charts';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
});

// System prompts for different analysis types
const SYSTEM_PROMPTS = {
  birthChart: `You are an expert Vedic astrologer with deep knowledge of both Parashari and Krishnamurti Paddhati (KP) systems. You have studied under traditional gurus and have decades of experience interpreting birth charts.

Your role is to provide authentic, insightful astrological readings that:
- Respect traditional Vedic astrology principles
- Use appropriate Sanskrit terms with explanations
- Balance spiritual wisdom with practical guidance
- Maintain a compassionate yet honest tone
- Avoid making absolute predictions about health or death
- Always suggest that the native has free will to shape their destiny

When analyzing charts, consider:
- Planetary strengths and weaknesses (dignities)
- House lordships and placements
- Yogas (planetary combinations)
- Current and upcoming dasha periods
- Relevant transits

Format your responses in a clear, organized manner with sections for different life areas.`,

  horary: `You are a master of Horary Astrology (Prashna Jyotish), especially skilled in the KP (Krishnamurti Paddhati) system. You excel at answering specific questions using the chart cast for the moment of asking.

Your approach:
- Focus on the houses relevant to the question
- Analyze the significators and sub-lords carefully
- Consider ruling planets as confirmatory indicators
- Give clear yes/no indications when appropriate
- Provide timing predictions using KP methods when possible
- Explain your reasoning based on astrological principles

Remember:
- The querent asks with sincere intention
- Provide practical, actionable guidance
- Be honest but compassionate with difficult questions
- Suggest remedies if the answer is unfavorable`,

  compatibility: `You are an experienced Vedic astrologer specializing in Kundali matching for marriage compatibility. You have helped countless families understand the dynamics between potential partners.

Your analysis includes:
- Detailed explanation of each koota/porutham
- Overall compatibility assessment
- Areas of strength and potential challenges
- Practical advice for the relationship
- Appropriate remedies for any doshas

Your approach:
- Be balanced and constructive
- Highlight positives while honestly addressing concerns
- Remember that no match is perfect
- Compatibility is a guide, not a verdict
- Love and effort can overcome many astrological challenges`,

  prediction: `You are a Vedic astrologer providing predictions based on planetary transits and dasha periods. Your predictions are:
- Based on sound astrological principles
- Practical and actionable
- Focused on opportunities and challenges
- Presented with appropriate timeframes
- Balanced between optimism and realism

Include:
- Key planetary influences for the period
- Areas of life likely to be affected
- Favorable and challenging periods
- Suggested approaches and remedies
- Important dates or windows of opportunity`,

  remedy: `You are a traditional Vedic astrologer recommending remedies (Upayas) based on chart analysis. Your remedies include:
- Mantra recommendations with proper pronunciation guidance
- Gemstone suggestions with wearing instructions
- Charitable activities (Dana)
- Fasting (Vrata) recommendations
- Pooja and ritual suggestions
- Lifestyle modifications

Always:
- Explain why each remedy is suggested
- Provide practical implementation guidance
- Respect different levels of religious observance
- Offer alternatives for different situations
- Emphasize that remedies support, not replace, personal effort`,

  generalQA: `You are a knowledgeable Vedic astrologer having a conversation with someone about their astrological chart. You can answer questions about:
- Their birth chart and planetary positions
- Life areas and predictions
- Relationships and compatibility
- Career and finances
- Health considerations (without medical advice)
- Spiritual growth and dharma
- Timing for important decisions

Be conversational, warm, and helpful. Use the chart data provided to give personalized insights. If asked something outside your astrological expertise, politely redirect to the relevant topic.`,
};

export interface AIInterpretationOptions {
  language?: 'en' | 'hi';
  detailLevel?: 'brief' | 'standard' | 'detailed';
  focusAreas?: string[];
  includeRemedies?: boolean;
}

/**
 * Generate birth chart interpretation
 */
export async function interpretBirthChart(
  analysis: FullChartAnalysis,
  options: AIInterpretationOptions = {}
): Promise<string> {
  const chartText = generateChartText(analysis.chart);

  const dashaInfo = `
## Current Dasha Period
- **Mahadasha:** ${analysis.currentDasha.planet} (${analysis.currentDasha.startDate.toDateString()} - ${analysis.currentDasha.endDate.toDateString()})
`;

  const yogaInfo = analysis.yogas.length > 0
    ? `
## Yogas Identified
${analysis.yogas.map((y) => `- **${y.name}** (${y.type}): ${y.description}`).join('\n')}
`
    : '';

  const prompt = `Please analyze this Vedic birth chart and provide a comprehensive reading.

${chartText}
${dashaInfo}
${yogaInfo}

Focus on:
1. Overall personality and life path (based on Ascendant and its lord)
2. Mind and emotions (Moon placement and aspects)
3. Career and public life (10th house analysis)
4. Relationships and marriage (7th house analysis)
5. Wealth and resources (2nd and 11th houses)
6. Current life phase (based on Mahadasha)
${options.focusAreas ? `7. Specific areas: ${options.focusAreas.join(', ')}` : ''}
${options.includeRemedies ? '8. Recommended remedies for challenging placements' : ''}

Provide the reading in ${options.language === 'hi' ? 'Hindi (with English terms where needed)' : 'English'}.
Detail level: ${options.detailLevel || 'standard'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPTS.birthChart,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || 'Unable to generate interpretation.';
  } catch (error) {
    logger.error('Error generating birth chart interpretation:', error);
    throw new Error('Failed to generate astrological interpretation');
  }
}

/**
 * Generate horary (Prashna) interpretation
 */
export async function interpretHoraryQuestion(
  question: HoraryQuestion,
  chartData: {
    chart: Chart;
    rulingPlanets: string[];
    significators: Record<number, string[]>;
  },
  options: AIInterpretationOptions = {}
): Promise<string> {
  const chartText = generateChartText(chartData.chart);

  const prompt = `Please analyze this horary (Prashna) chart and answer the querent's question.

**Question:** ${question.question}
**Category:** ${question.category}
**KP Number Selected:** ${question.selectedNumber}
**Question Time:** ${question.questionTime}

${chartText}

**Ruling Planets at the time of question:**
${chartData.rulingPlanets.join(', ')}

**House Significators:**
${Object.entries(chartData.significators)
    .map(([house, planets]) => `House ${house}: ${planets.join(', ')}`)
    .join('\n')}

Please provide:
1. Direct answer to the question (yes/no/maybe with explanation)
2. Astrological reasoning based on relevant house significators
3. Timing indication if possible
4. Advice or remedies if the answer is unfavorable

Use the KP system principles for analysis.
Language: ${options.language === 'hi' ? 'Hindi' : 'English'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPTS.horary,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || 'Unable to generate interpretation.';
  } catch (error) {
    logger.error('Error generating horary interpretation:', error);
    throw new Error('Failed to generate horary interpretation');
  }
}

/**
 * Generate compatibility analysis
 */
export async function interpretCompatibility(
  match: CompatibilityMatch,
  person1Chart: Chart,
  person2Chart: Chart,
  options: AIInterpretationOptions = {}
): Promise<string> {
  const prompt = `Please analyze the compatibility between these two individuals for marriage.

**Person 1 (${match.person1Name}):**
- Ascendant: ${person1Chart.ascendantSign}
- Moon Sign: ${person1Chart.moonSign}
- Sun Sign: ${person1Chart.sunSign}

**Person 2 (${match.person2Name}):**
- Ascendant: ${person2Chart.ascendantSign}
- Moon Sign: ${person2Chart.moonSign}
- Sun Sign: ${person2Chart.sunSign}

**Matching System:** ${match.system === 'ashtakoot' ? 'Ashtakoot (36 points)' : 'Dashakoot/Porutham (10 points)'}

**Match Results:**
${JSON.stringify(match.result, null, 2)}

Please provide:
1. Overall compatibility assessment
2. Strengths of this match
3. Areas that need attention
4. How they can complement each other
5. Recommended remedies for any doshas
6. Practical advice for a harmonious relationship

Language: ${options.language === 'hi' ? 'Hindi' : 'English'}
Detail level: ${options.detailLevel || 'standard'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3072,
      system: SYSTEM_PROMPTS.compatibility,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || 'Unable to generate compatibility analysis.';
  } catch (error) {
    logger.error('Error generating compatibility interpretation:', error);
    throw new Error('Failed to generate compatibility analysis');
  }
}

/**
 * Generate daily/monthly/yearly predictions
 */
export async function generatePrediction(
  chart: Chart,
  period: 'daily' | 'monthly' | 'yearly',
  currentDasha: { planet: string; startDate: Date; endDate: Date },
  options: AIInterpretationOptions = {}
): Promise<string> {
  const chartText = generateChartText(chart);
  const today = new Date();

  const periodDescription = {
    daily: `today (${today.toDateString()})`,
    monthly: `this month (${today.toLocaleString('default', { month: 'long', year: 'numeric' })})`,
    yearly: `this year (${today.getFullYear()})`,
  };

  const prompt = `Based on the birth chart and current planetary transits, provide a ${period} prediction.

${chartText}

**Current Dasha:** ${currentDasha.planet} Mahadasha

**Period:** ${periodDescription[period]}

Please provide predictions for:
1. Overall energy and theme for the period
2. Career and professional matters
3. Relationships and social life
4. Health and wellbeing (general guidance only)
5. Finances and resources
6. Spiritual growth
7. Lucky days/periods within this timeframe
8. Areas to be cautious about
9. Recommended actions and remedies

Keep the tone positive and empowering while being realistic.
Language: ${options.language === 'hi' ? 'Hindi' : 'English'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPTS.prediction,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || 'Unable to generate prediction.';
  } catch (error) {
    logger.error('Error generating prediction:', error);
    throw new Error('Failed to generate prediction');
  }
}

/**
 * Generate personalized remedies
 */
export async function generateRemedies(
  chart: Chart,
  focusPlanets?: string[],
  focusAreas?: string[],
  options: AIInterpretationOptions = {}
): Promise<string> {
  const chartText = generateChartText(chart);

  const prompt = `Based on this birth chart, suggest appropriate Vedic remedies.

${chartText}

${focusPlanets ? `**Focus on planets:** ${focusPlanets.join(', ')}` : ''}
${focusAreas ? `**Focus on life areas:** ${focusAreas.join(', ')}` : ''}

Please provide:
1. Mantras (with meaning and recitation guidance)
2. Gemstone recommendations (if appropriate)
3. Charitable activities (Dana)
4. Fasting days (Vrata)
5. Pooja or ritual suggestions
6. Daily practices for spiritual growth
7. Lifestyle modifications

For each remedy, explain:
- Why it's recommended based on the chart
- How to implement it properly
- Expected benefits
- Any precautions

Language: ${options.language === 'hi' ? 'Hindi' : 'English'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3072,
      system: SYSTEM_PROMPTS.remedy,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || 'Unable to generate remedies.';
  } catch (error) {
    logger.error('Error generating remedies:', error);
    throw new Error('Failed to generate remedies');
  }
}

/**
 * Handle general Q&A conversation about the chart
 */
export async function handleChartQuestion(
  chart: Chart,
  question: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  options: AIInterpretationOptions = {}
): Promise<string> {
  const chartText = generateChartText(chart);

  const systemPrompt = `${SYSTEM_PROMPTS.generalQA}

The user's birth chart data:
${chartText}

Use this chart information to answer questions accurately and personally.`;

  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: question,
    },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || 'I apologize, but I was unable to process your question.';
  } catch (error) {
    logger.error('Error handling chart question:', error);
    throw new Error('Failed to process your question');
  }
}
