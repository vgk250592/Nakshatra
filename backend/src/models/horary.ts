import { z } from 'zod';

export const HoraryQuestionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  question: z.string().min(10).max(500),
  category: z.enum([
    'career',
    'relationship',
    'health',
    'finance',
    'property',
    'travel',
    'education',
    'legal',
    'lost_item',
    'timing',
    'general',
  ]),
  selectedNumber: z.number().min(1).max(249), // 1-108 for Parashari, 1-249 for KP
  system: z.enum(['parashari', 'kp']),
  questionTime: z.date(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string(),
  chartData: z.any().optional(),
  answer: z.string().optional(),
  rulingPlanets: z.array(z.string()).optional(),
  significators: z.record(z.string(), z.array(z.string())).optional(),
  createdAt: z.date(),
});

export const CreateHoraryQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  category: z.enum([
    'career',
    'relationship',
    'health',
    'finance',
    'property',
    'travel',
    'education',
    'legal',
    'lost_item',
    'timing',
    'general',
  ]),
  selectedNumber: z.number().min(1).max(249),
  system: z.enum(['parashari', 'kp']).default('kp'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string(),
});

export type HoraryQuestion = z.infer<typeof HoraryQuestionSchema>;
export type CreateHoraryQuestion = z.infer<typeof CreateHoraryQuestionSchema>;

// House significations for horary astrology
export const HORARY_HOUSE_SIGNIFICATIONS = {
  1: ['Self', 'Health', 'Personality', 'Beginning of matter'],
  2: ['Money', 'Possessions', 'Family', 'Speech'],
  3: ['Siblings', 'Short travels', 'Communication', 'Courage'],
  4: ['Home', 'Mother', 'Property', 'End of matter'],
  5: ['Children', 'Romance', 'Speculation', 'Creativity'],
  6: ['Enemies', 'Disease', 'Service', 'Pets'],
  7: ['Spouse', 'Partner', 'Open enemies', 'Contracts'],
  8: ['Death', 'Inheritance', 'Occult', 'Transformation'],
  9: ['Fortune', 'Long travels', 'Higher education', 'Guru'],
  10: ['Career', 'Fame', 'Father', 'Authority'],
  11: ['Gains', 'Friends', 'Aspirations', 'Elder siblings'],
  12: ['Loss', 'Foreign lands', 'Expenses', 'Moksha'],
} as const;

// Question category to primary house mapping
export const CATEGORY_HOUSE_MAP = {
  career: [10, 6, 2],
  relationship: [7, 5, 11],
  health: [1, 6, 8],
  finance: [2, 11, 5],
  property: [4, 11, 10],
  travel: [3, 9, 12],
  education: [4, 5, 9],
  legal: [6, 7, 12],
  lost_item: [2, 4, 11],
  timing: [1, 5, 9],
  general: [1, 7, 10],
} as const;

// Database table definition
export const HORARY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS horary_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  selected_number INTEGER NOT NULL,
  system VARCHAR(20) NOT NULL DEFAULT 'kp',
  question_time TIMESTAMP NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  chart_data JSONB,
  answer TEXT,
  ruling_planets JSONB,
  significators JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_horary_user_id ON horary_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_horary_category ON horary_questions(category);
CREATE INDEX IF NOT EXISTS idx_horary_created_at ON horary_questions(created_at);
`;
