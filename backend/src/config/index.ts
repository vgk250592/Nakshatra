import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  DEFAULT_AYANAMSA: z.enum(['lahiri', 'kp', 'raman', 'krishnamurti']).default('lahiri'),
  ENABLE_KP_SYSTEM: z.string().transform((val) => val === 'true').default('true'),
  ENABLE_HORARY: z.string().transform((val) => val === 'true').default('true'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    // Return defaults for development
    return {
      PORT: '3000',
      NODE_ENV: 'development' as const,
      DATABASE_URL: '',
      ANTHROPIC_API_KEY: '',
      JWT_SECRET: 'dev-secret',
      JWT_EXPIRES_IN: '7d',
      FIREBASE_PROJECT_ID: undefined,
      DEFAULT_AYANAMSA: 'lahiri' as const,
      ENABLE_KP_SYSTEM: true,
      ENABLE_HORARY: true,
    };
  }
};

export const config = parseEnv();

// Ayanamsa values in degrees (as of J2000.0 epoch)
export const AYANAMSA_VALUES = {
  lahiri: 23.85,
  kp: 23.97,
  raman: 22.46,
  krishnamurti: 23.97,
} as const;

// Zodiac signs
export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

// Nakshatras (27 lunar mansions)
export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

// Planets
export const PLANETS = {
  SUN: { id: 0, name: 'Sun', sanskrit: 'Surya', symbol: '☉' },
  MOON: { id: 1, name: 'Moon', sanskrit: 'Chandra', symbol: '☽' },
  MARS: { id: 4, name: 'Mars', sanskrit: 'Mangal', symbol: '♂' },
  MERCURY: { id: 2, name: 'Mercury', sanskrit: 'Budha', symbol: '☿' },
  JUPITER: { id: 5, name: 'Jupiter', sanskrit: 'Guru', symbol: '♃' },
  VENUS: { id: 3, name: 'Venus', sanskrit: 'Shukra', symbol: '♀' },
  SATURN: { id: 6, name: 'Saturn', sanskrit: 'Shani', symbol: '♄' },
  RAHU: { id: 10, name: 'Rahu', sanskrit: 'Rahu', symbol: '☊' },
  KETU: { id: 11, name: 'Ketu', sanskrit: 'Ketu', symbol: '☋' },
} as const;

// Houses (Bhavas)
export const HOUSES = {
  1: { name: 'First House', meaning: 'Self, personality, physical body' },
  2: { name: 'Second House', meaning: 'Wealth, family, speech' },
  3: { name: 'Third House', meaning: 'Siblings, courage, communication' },
  4: { name: 'Fourth House', meaning: 'Mother, home, happiness' },
  5: { name: 'Fifth House', meaning: 'Children, creativity, intelligence' },
  6: { name: 'Sixth House', meaning: 'Enemies, disease, service' },
  7: { name: 'Seventh House', meaning: 'Marriage, partnerships, business' },
  8: { name: 'Eighth House', meaning: 'Longevity, transformation, occult' },
  9: { name: 'Ninth House', meaning: 'Fortune, dharma, higher learning' },
  10: { name: 'Tenth House', meaning: 'Career, status, father' },
  11: { name: 'Eleventh House', meaning: 'Gains, aspirations, elder siblings' },
  12: { name: 'Twelfth House', meaning: 'Losses, moksha, foreign lands' },
} as const;

// Vimshottari Dasha periods (in years)
export const DASHA_PERIODS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
} as const;

// KP Sub-lord divisions
export const KP_SUB_DIVISIONS = 249;
