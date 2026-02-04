import { z } from 'zod';
import { BirthDetailsSchema } from './user';

// Ashtakoot (North Indian) - 36 points system
export const AshtakootKootaSchema = z.object({
  name: z.enum(['varna', 'vasya', 'tara', 'yoni', 'graha_maitri', 'gana', 'bhakoot', 'nadi']),
  maxPoints: z.number(),
  obtainedPoints: z.number(),
  description: z.string(),
  compatibility: z.enum(['excellent', 'good', 'average', 'poor']),
});

export const AshtakootResultSchema = z.object({
  totalPoints: z.number().max(36),
  percentage: z.number().min(0).max(100),
  kootas: z.array(AshtakootKootaSchema),
  mangalDosha: z.object({
    person1: z.boolean(),
    person2: z.boolean(),
    cancelled: z.boolean(),
    remedy: z.string().optional(),
  }),
  nadiDosha: z.object({
    present: z.boolean(),
    remedy: z.string().optional(),
  }),
  overallCompatibility: z.enum(['highly_compatible', 'compatible', 'average', 'not_recommended']),
  recommendation: z.string(),
});

// Dashakoot/Porutham (South Indian) - 10 points system
export const DashakootPoruthamSchema = z.object({
  name: z.enum(['dina', 'gana', 'mahendra', 'stree_deergha', 'yoni', 'veda', 'rajju', 'rasi', 'rasiyathipathi', 'vasya']),
  matched: z.boolean(),
  importance: z.enum(['essential', 'important', 'secondary']),
  description: z.string(),
});

export const DashakootResultSchema = z.object({
  matchedCount: z.number().max(10),
  totalCount: z.literal(10),
  percentage: z.number().min(0).max(100),
  poruthams: z.array(DashakootPoruthamSchema),
  papaSamyam: z.object({
    balanced: z.boolean(),
    person1Score: z.number(),
    person2Score: z.number(),
    description: z.string(),
  }),
  dashaSandhi: z.object({
    present: z.boolean(),
    description: z.string(),
  }),
  overallCompatibility: z.enum(['highly_compatible', 'compatible', 'average', 'not_recommended']),
  recommendation: z.string(),
});

export const CompatibilityMatchSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  person1Name: z.string(),
  person1BirthDetails: BirthDetailsSchema,
  person2Name: z.string(),
  person2BirthDetails: BirthDetailsSchema,
  system: z.enum(['ashtakoot', 'dashakoot']),
  result: z.union([AshtakootResultSchema, DashakootResultSchema]),
  aiAnalysis: z.string().optional(),
  createdAt: z.date(),
});

export const CreateCompatibilityMatchSchema = z.object({
  person1Name: z.string().min(1).max(100),
  person1BirthDetails: BirthDetailsSchema,
  person2Name: z.string().min(1).max(100),
  person2BirthDetails: BirthDetailsSchema,
  system: z.enum(['ashtakoot', 'dashakoot']).default('ashtakoot'),
});

export type AshtakootKoota = z.infer<typeof AshtakootKootaSchema>;
export type AshtakootResult = z.infer<typeof AshtakootResultSchema>;
export type DashakootPorutham = z.infer<typeof DashakootPoruthamSchema>;
export type DashakootResult = z.infer<typeof DashakootResultSchema>;
export type CompatibilityMatch = z.infer<typeof CompatibilityMatchSchema>;
export type CreateCompatibilityMatch = z.infer<typeof CreateCompatibilityMatchSchema>;

// Ashtakoot point values
export const ASHTAKOOT_MAX_POINTS = {
  varna: 1,
  vasya: 2,
  tara: 3,
  yoni: 4,
  graha_maitri: 5,
  gana: 6,
  bhakoot: 7,
  nadi: 8,
} as const;

// Essential poruthams in Dashakoot
export const ESSENTIAL_PORUTHAMS = ['dina', 'gana', 'rajju', 'rasi'] as const;

// Database table definition
export const COMPATIBILITY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS compatibility_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  person1_name VARCHAR(100) NOT NULL,
  person1_birth_date DATE NOT NULL,
  person1_birth_time TIME NOT NULL,
  person1_latitude DECIMAL(10, 7) NOT NULL,
  person1_longitude DECIMAL(10, 7) NOT NULL,
  person1_timezone VARCHAR(50) NOT NULL,
  person2_name VARCHAR(100) NOT NULL,
  person2_birth_date DATE NOT NULL,
  person2_birth_time TIME NOT NULL,
  person2_latitude DECIMAL(10, 7) NOT NULL,
  person2_longitude DECIMAL(10, 7) NOT NULL,
  person2_timezone VARCHAR(50) NOT NULL,
  system VARCHAR(20) NOT NULL DEFAULT 'ashtakoot',
  result JSONB NOT NULL,
  ai_analysis TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compatibility_user_id ON compatibility_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_created_at ON compatibility_matches(created_at);
`;
