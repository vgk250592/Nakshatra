/**
 * Astrology Services Index
 * Exports all astrology-related functionality
 */

// Core calculations
export * from './calculations';

// System-specific implementations
export * from './parashari';
export * from './kp';

// Chart rendering
export * from './charts';

// Main entry points for chart generation
import { generateParashariChart, ParashariChartOptions } from './parashari';
import { generateKPChart, generateHoraryChart, KPChartOptions } from './kp';
import { generateChartSVG, generateChartText } from './charts';
import type { BirthDetails, FullChartAnalysis, Chart } from '../../models';

export type AstrologySystem = 'parashari' | 'kp';
export type ChartStyle = 'north_indian' | 'south_indian';

export interface GenerateChartOptions {
  system?: AstrologySystem;
  chartStyle?: ChartStyle;
  includeYogas?: boolean;
  includeSignificators?: boolean;
  includeShadbala?: boolean;
}

/**
 * Generate a birth chart using the specified system
 */
export async function generateBirthChart(
  userId: string,
  birthDetails: BirthDetails,
  options: GenerateChartOptions = {}
): Promise<{
  analysis: FullChartAnalysis;
  svg: string;
  textRepresentation: string;
}> {
  const system = options.system || 'parashari';
  const chartStyle = options.chartStyle || 'north_indian';

  let analysis: FullChartAnalysis;

  if (system === 'kp') {
    analysis = await generateKPChart(userId, birthDetails, chartStyle, {
      includeSignificators: options.includeSignificators,
      includeSubSubLords: true,
    });
  } else {
    analysis = await generateParashariChart(userId, birthDetails, chartStyle, {
      includeYogas: options.includeYogas,
      includeShadbala: options.includeShadbala,
    });
  }

  const svg = generateChartSVG(analysis.chart).svg;
  const textRepresentation = generateChartText(analysis.chart);

  return {
    analysis,
    svg,
    textRepresentation,
  };
}

/**
 * Generate a horary (Prashna) chart
 */
export async function generatePrashnaChart(
  userId: string,
  kpNumber: number,
  latitude: number,
  longitude: number,
  timezone: string
): Promise<{
  chart: Chart;
  rulingPlanets: string[];
  significators: Record<number, string[]>;
  svg: string;
}> {
  const result = await generateHoraryChart(userId, kpNumber, latitude, longitude, timezone);
  const svg = generateChartSVG(result.chart).svg;

  return {
    ...result,
    svg,
  };
}
