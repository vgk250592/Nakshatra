import { z } from 'zod';
import { BirthDetailsSchema } from './user';

export const PlanetPositionSchema = z.object({
  planet: z.string(),
  longitude: z.number().min(0).max(360),
  latitude: z.number(),
  speed: z.number(),
  sign: z.number().min(0).max(11),
  signName: z.string(),
  degree: z.number().min(0).max(30),
  minute: z.number().min(0).max(60),
  second: z.number().min(0).max(60),
  nakshatra: z.string(),
  nakshatraPada: z.number().min(1).max(4),
  nakshatraLord: z.string(),
  isRetrograde: z.boolean(),
  house: z.number().min(1).max(12),
  // KP specific
  subLord: z.string().optional(),
  subSubLord: z.string().optional(),
  starLord: z.string().optional(),
});

export const HouseSchema = z.object({
  house: z.number().min(1).max(12),
  cusp: z.number().min(0).max(360),
  sign: z.number().min(0).max(11),
  signName: z.string(),
  degree: z.number(),
  lord: z.string(),
  planets: z.array(z.string()),
  // KP specific
  subLord: z.string().optional(),
  significators: z.array(z.string()).optional(),
});

export const ChartSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  birthDetails: BirthDetailsSchema,
  system: z.enum(['parashari', 'kp']),
  ayanamsa: z.string(),
  ayanamsaValue: z.number(),
  ascendant: z.number(),
  ascendantSign: z.string(),
  moonSign: z.string(),
  sunSign: z.string(),
  planets: z.array(PlanetPositionSchema),
  houses: z.array(HouseSchema),
  chartStyle: z.enum(['north_indian', 'south_indian']),
  createdAt: z.date(),
});

export const DivisionalChartSchema = z.object({
  type: z.enum(['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60']),
  planets: z.array(PlanetPositionSchema),
});

export const DashaSchema = z.object({
  planet: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  level: z.enum(['mahadasha', 'antardasha', 'pratyantardasha']),
  subPeriods: z.array(z.lazy(() => DashaSchema)).optional(),
});

export const YogaSchema = z.object({
  name: z.string(),
  type: z.enum(['benefic', 'malefic', 'neutral']),
  planets: z.array(z.string()),
  houses: z.array(z.number()),
  description: z.string(),
  strength: z.number().min(0).max(100),
});

export const FullChartAnalysisSchema = z.object({
  chart: ChartSchema,
  divisionalCharts: z.array(DivisionalChartSchema).optional(),
  currentDasha: DashaSchema,
  dashaTimeline: z.array(DashaSchema),
  yogas: z.array(YogaSchema),
  shadbala: z.record(z.string(), z.number()).optional(),
});

export type PlanetPosition = z.infer<typeof PlanetPositionSchema>;
export type House = z.infer<typeof HouseSchema>;
export type Chart = z.infer<typeof ChartSchema>;
export type DivisionalChart = z.infer<typeof DivisionalChartSchema>;
export type Dasha = z.infer<typeof DashaSchema>;
export type Yoga = z.infer<typeof YogaSchema>;
export type FullChartAnalysis = z.infer<typeof FullChartAnalysisSchema>;

// Database table definition
export const CHART_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  birth_latitude DECIMAL(10, 7) NOT NULL,
  birth_longitude DECIMAL(10, 7) NOT NULL,
  birth_timezone VARCHAR(50) NOT NULL,
  birth_city VARCHAR(100),
  birth_country VARCHAR(100),
  system VARCHAR(20) NOT NULL DEFAULT 'parashari',
  ayanamsa VARCHAR(20) NOT NULL DEFAULT 'lahiri',
  chart_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);
CREATE INDEX IF NOT EXISTS idx_charts_system ON charts(system);
`;
