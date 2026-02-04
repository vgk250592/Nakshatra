import { z } from 'zod';

export const BirthDetailsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:mm or HH:mm:ss format'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().min(1).max(100),
  birthDetails: BirthDetailsSchema.optional(),
  preferredChartStyle: z.enum(['north_indian', 'south_indian']).default('north_indian'),
  preferredSystem: z.enum(['parashari', 'kp']).default('parashari'),
  preferredLanguage: z.enum(['en', 'hi']).default('en'),
  subscriptionTier: z.enum(['free', 'premium', 'premium_plus']).default('free'),
  subscriptionExpiresAt: z.date().optional(),
  horaryQuestionsRemaining: z.number().default(1),
  compatibilityMatchesRemaining: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().min(1).max(100),
  birthDetails: BirthDetailsSchema.optional(),
  preferredChartStyle: z.enum(['north_indian', 'south_indian']).default('north_indian'),
  preferredSystem: z.enum(['parashari', 'kp']).default('parashari'),
  preferredLanguage: z.enum(['en', 'hi']).default('en'),
});

export type BirthDetails = z.infer<typeof BirthDetailsSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;

// Database table definition
export const USER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  birth_date DATE,
  birth_time TIME,
  birth_latitude DECIMAL(10, 7),
  birth_longitude DECIMAL(10, 7),
  birth_timezone VARCHAR(50),
  birth_city VARCHAR(100),
  birth_country VARCHAR(100),
  preferred_chart_style VARCHAR(20) DEFAULT 'north_indian',
  preferred_system VARCHAR(20) DEFAULT 'parashari',
  preferred_language VARCHAR(5) DEFAULT 'en',
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  horary_questions_remaining INTEGER DEFAULT 1,
  compatibility_matches_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
`;
