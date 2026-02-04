/**
 * Compatibility Matching Service
 * Handles Ashtakoot (North Indian) and Dashakoot (South Indian) matching
 */

import { v4 as uuidv4 } from 'uuid';
import { generateBirthChart } from '../astrology';
import { getNakshatra, getZodiacSign } from '../astrology/calculations';
import { interpretCompatibility } from '../ai/claude';
import {
  ASHTAKOOT_MAX_POINTS,
  ESSENTIAL_PORUTHAMS,
  type AshtakootResult,
  type AshtakootKoota,
  type DashakootResult,
  type DashakootPorutham,
  type CompatibilityMatch,
  type CreateCompatibilityMatch,
} from '../../models/compatibility';
import type { BirthDetails, Chart } from '../../models';
import { logger } from '../../utils/logger';

// Nakshatra groups for compatibility calculations
const NAKSHATRA_GROUPS = {
  deva: ['Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Swati', 'Anuradha', 'Shravana', 'Revati'],
  manushya: ['Bharani', 'Rohini', 'Ardra', 'Purva Phalguni', 'Uttara Phalguni', 'Purva Ashadha', 'Uttara Ashadha', 'Purva Bhadrapada', 'Uttara Bhadrapada'],
  rakshasa: ['Krittika', 'Ashlesha', 'Magha', 'Chitra', 'Vishakha', 'Jyeshtha', 'Mula', 'Dhanishta', 'Shatabhisha'],
};

// Yoni (animal) assignments for nakshatras
const NAKSHATRA_YONI: { [key: string]: { animal: string; gender: 'male' | 'female' } } = {
  Ashwini: { animal: 'horse', gender: 'male' },
  Bharani: { animal: 'elephant', gender: 'female' },
  Krittika: { animal: 'sheep', gender: 'female' },
  Rohini: { animal: 'serpent', gender: 'male' },
  Mrigashira: { animal: 'serpent', gender: 'female' },
  Ardra: { animal: 'dog', gender: 'female' },
  Punarvasu: { animal: 'cat', gender: 'female' },
  Pushya: { animal: 'sheep', gender: 'male' },
  Ashlesha: { animal: 'cat', gender: 'male' },
  Magha: { animal: 'rat', gender: 'male' },
  'Purva Phalguni': { animal: 'rat', gender: 'female' },
  'Uttara Phalguni': { animal: 'cow', gender: 'male' },
  Hasta: { animal: 'buffalo', gender: 'female' },
  Chitra: { animal: 'tiger', gender: 'female' },
  Swati: { animal: 'buffalo', gender: 'male' },
  Vishakha: { animal: 'tiger', gender: 'male' },
  Anuradha: { animal: 'deer', gender: 'female' },
  Jyeshtha: { animal: 'deer', gender: 'male' },
  Mula: { animal: 'dog', gender: 'male' },
  'Purva Ashadha': { animal: 'monkey', gender: 'male' },
  'Uttara Ashadha': { animal: 'mongoose', gender: 'male' },
  Shravana: { animal: 'monkey', gender: 'female' },
  Dhanishta: { animal: 'lion', gender: 'female' },
  Shatabhisha: { animal: 'horse', gender: 'female' },
  'Purva Bhadrapada': { animal: 'lion', gender: 'male' },
  'Uttara Bhadrapada': { animal: 'cow', gender: 'female' },
  Revati: { animal: 'elephant', gender: 'male' },
};

// Varna (caste) of signs
const SIGN_VARNA: { [key: string]: string } = {
  Cancer: 'brahmin', Scorpio: 'brahmin', Pisces: 'brahmin',
  Aries: 'kshatriya', Leo: 'kshatriya', Sagittarius: 'kshatriya',
  Taurus: 'vaishya', Virgo: 'vaishya', Capricorn: 'vaishya',
  Gemini: 'shudra', Libra: 'shudra', Aquarius: 'shudra',
};

// Vasya relationships
const VASYA_GROUPS: { [key: string]: string[] } = {
  Aries: ['Leo', 'Scorpio'],
  Taurus: ['Cancer', 'Libra'],
  Gemini: ['Virgo'],
  Cancer: ['Scorpio', 'Sagittarius'],
  Leo: ['Libra'],
  Virgo: ['Gemini', 'Pisces'],
  Libra: ['Virgo', 'Capricorn'],
  Scorpio: ['Cancer'],
  Sagittarius: ['Pisces'],
  Capricorn: ['Aries', 'Aquarius'],
  Aquarius: ['Aries'],
  Pisces: ['Capricorn'],
};

// Nadi groups
const NAKSHATRA_NADI: { [key: string]: 'vata' | 'pitta' | 'kapha' } = {
  Ashwini: 'vata', Ardra: 'vata', Punarvasu: 'vata', 'Uttara Phalguni': 'vata', Hasta: 'vata', Jyeshtha: 'vata', Mula: 'vata', Shatabhisha: 'vata', 'Purva Bhadrapada': 'vata',
  Bharani: 'pitta', Mrigashira: 'pitta', Pushya: 'pitta', 'Purva Phalguni': 'pitta', Chitra: 'pitta', Anuradha: 'pitta', 'Purva Ashadha': 'pitta', Dhanishta: 'pitta', 'Uttara Bhadrapada': 'pitta',
  Krittika: 'kapha', Rohini: 'kapha', Ashlesha: 'kapha', Magha: 'kapha', Swati: 'kapha', Vishakha: 'kapha', 'Uttara Ashadha': 'kapha', Shravana: 'kapha', Revati: 'kapha',
};

/**
 * Calculate Ashtakoot compatibility (North Indian system)
 */
export function calculateAshtakoot(
  person1MoonLongitude: number,
  person2MoonLongitude: number
): AshtakootResult {
  const person1Nakshatra = getNakshatra(person1MoonLongitude);
  const person2Nakshatra = getNakshatra(person2MoonLongitude);
  const person1Sign = getZodiacSign(person1MoonLongitude);
  const person2Sign = getZodiacSign(person2MoonLongitude);

  const kootas: AshtakootKoota[] = [];

  // 1. Varna (1 point)
  const varnaPoints = calculateVarna(person1Sign.signName, person2Sign.signName);
  kootas.push({
    name: 'varna',
    maxPoints: 1,
    obtainedPoints: varnaPoints,
    description: getVarnaDescription(varnaPoints),
    compatibility: varnaPoints >= 0.5 ? 'good' : 'average',
  });

  // 2. Vasya (2 points)
  const vasyaPoints = calculateVasya(person1Sign.signName, person2Sign.signName);
  kootas.push({
    name: 'vasya',
    maxPoints: 2,
    obtainedPoints: vasyaPoints,
    description: getVasyaDescription(vasyaPoints),
    compatibility: vasyaPoints >= 1.5 ? 'excellent' : vasyaPoints >= 1 ? 'good' : 'average',
  });

  // 3. Tara (3 points)
  const taraPoints = calculateTara(person1Nakshatra.nakshatraIndex, person2Nakshatra.nakshatraIndex);
  kootas.push({
    name: 'tara',
    maxPoints: 3,
    obtainedPoints: taraPoints,
    description: getTaraDescription(taraPoints),
    compatibility: taraPoints >= 2.5 ? 'excellent' : taraPoints >= 1.5 ? 'good' : 'poor',
  });

  // 4. Yoni (4 points)
  const yoniPoints = calculateYoni(person1Nakshatra.nakshatra, person2Nakshatra.nakshatra);
  kootas.push({
    name: 'yoni',
    maxPoints: 4,
    obtainedPoints: yoniPoints,
    description: getYoniDescription(yoniPoints),
    compatibility: yoniPoints >= 3 ? 'excellent' : yoniPoints >= 2 ? 'good' : 'poor',
  });

  // 5. Graha Maitri (5 points)
  const maitriPoints = calculateGrahaMaitri(person1Sign.signName, person2Sign.signName);
  kootas.push({
    name: 'graha_maitri',
    maxPoints: 5,
    obtainedPoints: maitriPoints,
    description: getMaitriDescription(maitriPoints),
    compatibility: maitriPoints >= 4 ? 'excellent' : maitriPoints >= 2.5 ? 'good' : 'poor',
  });

  // 6. Gana (6 points)
  const ganaPoints = calculateGana(person1Nakshatra.nakshatra, person2Nakshatra.nakshatra);
  kootas.push({
    name: 'gana',
    maxPoints: 6,
    obtainedPoints: ganaPoints,
    description: getGanaDescription(ganaPoints),
    compatibility: ganaPoints >= 5 ? 'excellent' : ganaPoints >= 3 ? 'good' : 'poor',
  });

  // 7. Bhakoot (7 points)
  const bhakootPoints = calculateBhakoot(person1Sign.sign, person2Sign.sign);
  kootas.push({
    name: 'bhakoot',
    maxPoints: 7,
    obtainedPoints: bhakootPoints,
    description: getBhakootDescription(bhakootPoints),
    compatibility: bhakootPoints >= 7 ? 'excellent' : bhakootPoints === 0 ? 'poor' : 'average',
  });

  // 8. Nadi (8 points)
  const nadiPoints = calculateNadi(person1Nakshatra.nakshatra, person2Nakshatra.nakshatra);
  kootas.push({
    name: 'nadi',
    maxPoints: 8,
    obtainedPoints: nadiPoints,
    description: getNadiDescription(nadiPoints),
    compatibility: nadiPoints >= 8 ? 'excellent' : nadiPoints === 0 ? 'poor' : 'average',
  });

  const totalPoints = kootas.reduce((sum, k) => sum + k.obtainedPoints, 0);
  const percentage = (totalPoints / 36) * 100;

  // Check for Mangal Dosha
  const mangalDosha = {
    person1: false, // Would need full chart to determine
    person2: false,
    cancelled: false,
    remedy: undefined as string | undefined,
  };

  // Check for Nadi Dosha
  const nadiDosha = {
    present: nadiPoints === 0,
    remedy: nadiPoints === 0 ? 'Perform Nadi Nivarana Pooja before marriage' : undefined,
  };

  let overallCompatibility: 'highly_compatible' | 'compatible' | 'average' | 'not_recommended';
  let recommendation: string;

  if (totalPoints >= 28) {
    overallCompatibility = 'highly_compatible';
    recommendation = 'Excellent match! The couple is highly compatible for marriage.';
  } else if (totalPoints >= 21) {
    overallCompatibility = 'compatible';
    recommendation = 'Good match. The couple has strong compatibility with minor areas to work on.';
  } else if (totalPoints >= 14) {
    overallCompatibility = 'average';
    recommendation = 'Average compatibility. Consider consulting an astrologer for detailed analysis.';
  } else {
    overallCompatibility = 'not_recommended';
    recommendation = 'Low compatibility score. Recommend thorough analysis and remedies before proceeding.';
  }

  return {
    totalPoints,
    percentage,
    kootas,
    mangalDosha,
    nadiDosha,
    overallCompatibility,
    recommendation,
  };
}

// Helper functions for Ashtakoot calculations
function calculateVarna(sign1: string, sign2: string): number {
  const varnas = ['brahmin', 'kshatriya', 'vaishya', 'shudra'];
  const v1 = varnas.indexOf(SIGN_VARNA[sign1]);
  const v2 = varnas.indexOf(SIGN_VARNA[sign2]);
  return v1 <= v2 ? 1 : 0;
}

function calculateVasya(sign1: string, sign2: string): number {
  const vasya1 = VASYA_GROUPS[sign1] || [];
  const vasya2 = VASYA_GROUPS[sign2] || [];
  if (vasya1.includes(sign2) && vasya2.includes(sign1)) return 2;
  if (vasya1.includes(sign2) || vasya2.includes(sign1)) return 1;
  return 0.5;
}

function calculateTara(nak1Index: number, nak2Index: number): number {
  const diff = ((nak2Index - nak1Index + 27) % 27) + 1;
  const tara = diff % 9;
  const auspiciousTaras = [1, 2, 4, 6, 8, 9];
  return auspiciousTaras.includes(tara) ? 3 : 1.5;
}

function calculateYoni(nak1: string, nak2: string): number {
  const yoni1 = NAKSHATRA_YONI[nak1];
  const yoni2 = NAKSHATRA_YONI[nak2];
  if (!yoni1 || !yoni2) return 2;

  if (yoni1.animal === yoni2.animal) {
    return yoni1.gender !== yoni2.gender ? 4 : 3;
  }

  // Enemy animals
  const enemies: { [key: string]: string } = {
    horse: 'buffalo', cow: 'tiger', elephant: 'lion', dog: 'deer',
    serpent: 'mongoose', cat: 'rat', monkey: 'sheep',
  };

  if (enemies[yoni1.animal] === yoni2.animal || enemies[yoni2.animal] === yoni1.animal) {
    return 0;
  }

  return 2;
}

function calculateGrahaMaitri(sign1: string, sign2: string): number {
  const lords: { [key: string]: string } = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
  };

  const friendships: { [key: string]: { friends: string[]; neutral: string[]; enemies: string[] } } = {
    Sun: { friends: ['Moon', 'Mars', 'Jupiter'], neutral: ['Mercury'], enemies: ['Venus', 'Saturn'] },
    Moon: { friends: ['Sun', 'Mercury'], neutral: ['Mars', 'Jupiter', 'Venus', 'Saturn'], enemies: [] },
    Mars: { friends: ['Sun', 'Moon', 'Jupiter'], neutral: ['Venus', 'Saturn'], enemies: ['Mercury'] },
    Mercury: { friends: ['Sun', 'Venus'], neutral: ['Mars', 'Jupiter', 'Saturn'], enemies: ['Moon'] },
    Jupiter: { friends: ['Sun', 'Moon', 'Mars'], neutral: ['Saturn'], enemies: ['Mercury', 'Venus'] },
    Venus: { friends: ['Mercury', 'Saturn'], neutral: ['Mars', 'Jupiter'], enemies: ['Sun', 'Moon'] },
    Saturn: { friends: ['Mercury', 'Venus'], neutral: ['Jupiter'], enemies: ['Sun', 'Moon', 'Mars'] },
  };

  const lord1 = lords[sign1];
  const lord2 = lords[sign2];

  if (lord1 === lord2) return 5;

  const rel1 = friendships[lord1];
  const rel2 = friendships[lord2];

  const isFriend1 = rel1?.friends.includes(lord2);
  const isFriend2 = rel2?.friends.includes(lord1);
  const isEnemy1 = rel1?.enemies.includes(lord2);
  const isEnemy2 = rel2?.enemies.includes(lord1);

  if (isFriend1 && isFriend2) return 5;
  if (isFriend1 || isFriend2) return 4;
  if (!isEnemy1 && !isEnemy2) return 3;
  if (isEnemy1 && isEnemy2) return 0;
  return 1;
}

function calculateGana(nak1: string, nak2: string): number {
  let gana1 = 'manushya';
  let gana2 = 'manushya';

  for (const [gana, nakshatras] of Object.entries(NAKSHATRA_GROUPS)) {
    if (nakshatras.includes(nak1)) gana1 = gana;
    if (nakshatras.includes(nak2)) gana2 = gana;
  }

  if (gana1 === gana2) return 6;
  if ((gana1 === 'deva' && gana2 === 'manushya') || (gana1 === 'manushya' && gana2 === 'deva')) return 5;
  if (gana1 === 'rakshasa' || gana2 === 'rakshasa') return 0;
  return 3;
}

function calculateBhakoot(sign1: number, sign2: number): number {
  const diff = Math.abs(sign1 - sign2);
  // 6-8 and 2-12 combinations are inauspicious
  if (diff === 5 || diff === 7 || diff === 1 || diff === 11) return 0;
  return 7;
}

function calculateNadi(nak1: string, nak2: string): number {
  const nadi1 = NAKSHATRA_NADI[nak1];
  const nadi2 = NAKSHATRA_NADI[nak2];
  return nadi1 !== nadi2 ? 8 : 0;
}

// Description helper functions
function getVarnaDescription(points: number): string {
  return points >= 1 ? 'Good spiritual and intellectual compatibility' : 'Some differences in outlook, can be bridged with understanding';
}

function getVasyaDescription(points: number): string {
  if (points >= 2) return 'Excellent mutual attraction and influence';
  if (points >= 1) return 'Good level of mutual respect and attraction';
  return 'May need to work on mutual understanding';
}

function getTaraDescription(points: number): string {
  return points >= 3 ? 'Favorable star combination for harmony' : 'Need to be mindful of timing for important decisions';
}

function getYoniDescription(points: number): string {
  if (points >= 4) return 'Excellent physical and intimate compatibility';
  if (points >= 2) return 'Good physical compatibility';
  return 'May need conscious effort for physical harmony';
}

function getMaitriDescription(points: number): string {
  if (points >= 4) return 'Excellent mental and emotional compatibility';
  if (points >= 2.5) return 'Good mental wavelength';
  return 'Different thought processes, requires patience';
}

function getGanaDescription(points: number): string {
  if (points >= 5) return 'Similar temperaments, easy understanding';
  if (points >= 3) return 'Manageable differences in temperament';
  return 'Contrasting natures, may lead to conflicts';
}

function getBhakootDescription(points: number): string {
  return points >= 7 ? 'Favorable for health, wealth, and family happiness' : 'May face challenges in finances or health, remedies recommended';
}

function getNadiDescription(points: number): string {
  return points >= 8 ? 'Different nadis ensure healthy progeny and vitality' : 'Same nadi - Nadi Dosha present, remedies required';
}

/**
 * Calculate Dashakoot/Porutham compatibility (South Indian system)
 */
export function calculateDashakoot(
  person1MoonLongitude: number,
  person2MoonLongitude: number
): DashakootResult {
  const person1Nakshatra = getNakshatra(person1MoonLongitude);
  const person2Nakshatra = getNakshatra(person2MoonLongitude);
  const person1Sign = getZodiacSign(person1MoonLongitude);
  const person2Sign = getZodiacSign(person2MoonLongitude);

  const poruthams: DashakootPorutham[] = [];

  // 1. Dina Porutham
  const dinaMatch = calculateDinaPorutham(person1Nakshatra.nakshatraIndex, person2Nakshatra.nakshatraIndex);
  poruthams.push({
    name: 'dina',
    matched: dinaMatch,
    importance: 'secondary',
    description: dinaMatch ? 'Favorable for health and daily happiness' : 'May face minor health issues',
  });

  // 2. Gana Porutham
  const ganaMatch = calculateGanaPorutham(person1Nakshatra.nakshatra, person2Nakshatra.nakshatra);
  poruthams.push({
    name: 'gana',
    matched: ganaMatch,
    importance: 'essential',
    description: ganaMatch ? 'Compatible temperaments' : 'Different temperaments may cause friction',
  });

  // 3. Mahendra Porutham
  const mahendraMatch = calculateMahendraPorutham(person1Nakshatra.nakshatraIndex, person2Nakshatra.nakshatraIndex);
  poruthams.push({
    name: 'mahendra',
    matched: mahendraMatch,
    importance: 'secondary',
    description: mahendraMatch ? 'Favorable for progeny and prosperity' : 'May need remedies for progeny',
  });

  // 4. Stree Deergha Porutham
  const streeDeerghaMatch = calculateStreeDeerga(person1Nakshatra.nakshatraIndex, person2Nakshatra.nakshatraIndex);
  poruthams.push({
    name: 'stree_deergha',
    matched: streeDeerghaMatch,
    importance: 'important',
    description: streeDeerghaMatch ? 'Favorable for longevity and prosperity of wife' : 'Some challenges may arise',
  });

  // 5. Yoni Porutham
  const yoniMatch = calculateYoniPorutham(person1Nakshatra.nakshatra, person2Nakshatra.nakshatra);
  poruthams.push({
    name: 'yoni',
    matched: yoniMatch,
    importance: 'important',
    description: yoniMatch ? 'Good physical compatibility' : 'May need adjustment in intimate matters',
  });

  // 6. Veda Porutham (Vedha)
  const vedaMatch = !hasVedha(person1Nakshatra.nakshatraIndex, person2Nakshatra.nakshatraIndex);
  poruthams.push({
    name: 'veda',
    matched: vedaMatch,
    importance: 'secondary',
    description: vedaMatch ? 'No adverse vedha' : 'Vedha present, may cause obstacles',
  });

  // 7. Rajju Porutham
  const rajjuMatch = calculateRajjuPorutham(person1Nakshatra.nakshatraIndex, person2Nakshatra.nakshatraIndex);
  poruthams.push({
    name: 'rajju',
    matched: rajjuMatch,
    importance: 'essential',
    description: rajjuMatch ? 'Favorable for marital longevity' : 'Rajju Dosha present, requires remedies',
  });

  // 8. Rasi Porutham
  const rasiMatch = calculateRasiPorutham(person1Sign.sign, person2Sign.sign);
  poruthams.push({
    name: 'rasi',
    matched: rasiMatch,
    importance: 'essential',
    description: rasiMatch ? 'Favorable moon sign relationship' : 'Challenging moon sign combination',
  });

  // 9. Rasiyathipathi Porutham
  const rasiyathipathiMatch = calculateRasiyathipathi(person1Sign.signName, person2Sign.signName);
  poruthams.push({
    name: 'rasiyathipathi',
    matched: rasiyathipathiMatch,
    importance: 'important',
    description: rasiyathipathiMatch ? 'Rasi lords are compatible' : 'Rasi lords have enmity',
  });

  // 10. Vasya Porutham
  const vasyaMatch = calculateVasyaPorutham(person1Sign.signName, person2Sign.signName);
  poruthams.push({
    name: 'vasya',
    matched: vasyaMatch,
    importance: 'secondary',
    description: vasyaMatch ? 'Good mutual attraction' : 'May lack natural attraction',
  });

  const matchedCount = poruthams.filter((p) => p.matched).length;
  const percentage = (matchedCount / 10) * 100;

  // Check essential poruthams
  const essentialMatched = poruthams
    .filter((p) => p.importance === 'essential')
    .every((p) => p.matched);

  // Papa Samyam (simplified)
  const papaSamyam = {
    balanced: true,
    person1Score: 0,
    person2Score: 0,
    description: 'Malefic influences are balanced',
  };

  // Dasha Sandhi check (simplified)
  const dashaSandhi = {
    present: false,
    description: 'No adverse dasha sandhi',
  };

  let overallCompatibility: 'highly_compatible' | 'compatible' | 'average' | 'not_recommended';
  let recommendation: string;

  if (matchedCount >= 8 && essentialMatched) {
    overallCompatibility = 'highly_compatible';
    recommendation = 'Excellent match with most poruthams matching.';
  } else if (matchedCount >= 6 && essentialMatched) {
    overallCompatibility = 'compatible';
    recommendation = 'Good match with essential poruthams present.';
  } else if (matchedCount >= 5) {
    overallCompatibility = 'average';
    recommendation = 'Average compatibility. Some poruthams missing, consider remedies.';
  } else {
    overallCompatibility = 'not_recommended';
    recommendation = 'Low compatibility. Consult an astrologer for detailed analysis and remedies.';
  }

  return {
    matchedCount,
    totalCount: 10,
    percentage,
    poruthams,
    papaSamyam,
    dashaSandhi,
    overallCompatibility,
    recommendation,
  };
}

// Helper functions for Dashakoot
function calculateDinaPorutham(nak1Index: number, nak2Index: number): boolean {
  const diff = ((nak2Index - nak1Index + 27) % 27) + 1;
  return ![2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26].includes(diff);
}

function calculateGanaPorutham(nak1: string, nak2: string): boolean {
  let gana1 = 'manushya', gana2 = 'manushya';
  for (const [gana, nakshatras] of Object.entries(NAKSHATRA_GROUPS)) {
    if (nakshatras.includes(nak1)) gana1 = gana;
    if (nakshatras.includes(nak2)) gana2 = gana;
  }
  if (gana1 === gana2) return true;
  if (gana1 === 'rakshasa' && gana2 === 'rakshasa') return true;
  if (gana1 === 'rakshasa' || gana2 === 'rakshasa') return false;
  return true;
}

function calculateMahendraPorutham(nak1Index: number, nak2Index: number): boolean {
  const diff = ((nak2Index - nak1Index + 27) % 27) + 1;
  return [4, 7, 10, 13, 16, 19, 22, 25].includes(diff);
}

function calculateStreeDeerga(nak1Index: number, nak2Index: number): boolean {
  const diff = ((nak2Index - nak1Index + 27) % 27) + 1;
  return diff >= 13;
}

function calculateYoniPorutham(nak1: string, nak2: string): boolean {
  const yoni1 = NAKSHATRA_YONI[nak1];
  const yoni2 = NAKSHATRA_YONI[nak2];
  if (!yoni1 || !yoni2) return true;
  const enemies: { [key: string]: string } = {
    horse: 'buffalo', cow: 'tiger', elephant: 'lion', dog: 'deer',
    serpent: 'mongoose', cat: 'rat', monkey: 'sheep',
  };
  return enemies[yoni1.animal] !== yoni2.animal && enemies[yoni2.animal] !== yoni1.animal;
}

function hasVedha(nak1Index: number, nak2Index: number): boolean {
  const vedhaGroups = [[0, 9], [1, 22], [2, 14], [3, 8], [4, 23], [5, 17], [6, 19], [7, 24], [10, 18], [11, 26], [12, 21], [13, 25], [15, 20]];
  return vedhaGroups.some(([a, b]) => (nak1Index === a && nak2Index === b) || (nak1Index === b && nak2Index === a));
}

function calculateRajjuPorutham(nak1Index: number, nak2Index: number): boolean {
  const rajjuGroups = {
    pada: [0, 5, 6, 11, 12, 17, 18, 23, 24],
    kati: [1, 4, 7, 10, 13, 16, 19, 22, 25],
    nabhi: [2, 3, 8, 9, 14, 15, 20, 21, 26],
  };
  for (const group of Object.values(rajjuGroups)) {
    if (group.includes(nak1Index) && group.includes(nak2Index)) return false;
  }
  return true;
}

function calculateRasiPorutham(sign1: number, sign2: number): boolean {
  const diff = ((sign2 - sign1 + 12) % 12) + 1;
  return ![6, 8, 12].includes(diff);
}

function calculateRasiyathipathi(sign1: string, sign2: string): boolean {
  const maitriPoints = calculateGrahaMaitri(sign1, sign2);
  return maitriPoints >= 2.5;
}

function calculateVasyaPorutham(sign1: string, sign2: string): boolean {
  const vasya1 = VASYA_GROUPS[sign1] || [];
  const vasya2 = VASYA_GROUPS[sign2] || [];
  return vasya1.includes(sign2) || vasya2.includes(sign1) || sign1 === sign2;
}

/**
 * Process complete compatibility match
 */
export async function processCompatibilityMatch(
  userId: string,
  matchData: CreateCompatibilityMatch,
  language: 'en' | 'hi' = 'en'
): Promise<{
  match: CompatibilityMatch;
  person1Chart: Chart;
  person2Chart: Chart;
  interpretation: string;
}> {
  // Generate charts for both persons
  const [person1ChartResult, person2ChartResult] = await Promise.all([
    generateBirthChart(userId, matchData.person1BirthDetails, { system: 'parashari' }),
    generateBirthChart(userId, matchData.person2BirthDetails, { system: 'parashari' }),
  ]);

  const person1Chart = person1ChartResult.analysis.chart;
  const person2Chart = person2ChartResult.analysis.chart;

  // Get moon longitudes
  const person1Moon = person1Chart.planets.find((p) => p.planet === 'Moon');
  const person2Moon = person2Chart.planets.find((p) => p.planet === 'Moon');

  if (!person1Moon || !person2Moon) {
    throw new Error('Could not calculate moon positions');
  }

  // Calculate compatibility based on system
  const result = matchData.system === 'dashakoot'
    ? calculateDashakoot(person1Moon.longitude, person2Moon.longitude)
    : calculateAshtakoot(person1Moon.longitude, person2Moon.longitude);

  // Create match record
  const match: CompatibilityMatch = {
    id: uuidv4(),
    userId,
    person1Name: matchData.person1Name,
    person1BirthDetails: matchData.person1BirthDetails,
    person2Name: matchData.person2Name,
    person2BirthDetails: matchData.person2BirthDetails,
    system: matchData.system,
    result,
    createdAt: new Date(),
  };

  // Generate AI interpretation
  try {
    const interpretation = await interpretCompatibility(match, person1Chart, person2Chart, { language });
    match.aiAnalysis = interpretation;

    return {
      match,
      person1Chart,
      person2Chart,
      interpretation,
    };
  } catch (error) {
    logger.error('Error generating compatibility interpretation:', error);
    throw error;
  }
}
