/**
 * KP (Krishnamurti Paddhati) System Calculations
 * Based on the stellar astrology system developed by Prof. K.S. Krishnamurti
 */

import {
  calculatePlanetaryPositions,
  calculatePlacidusHouses,
  calculateAyanamsa,
  tropicalToSidereal,
  getZodiacSign,
  getNakshatra,
  getPlanetHouse,
  parseBirthDetails,
  calculateSiderealTime,
  formatDMS,
} from './calculations';
import { ZODIAC_SIGNS, NAKSHATRAS, DASHA_PERIODS, KP_SUB_DIVISIONS } from '../../config';
import type { BirthDetails, Chart, PlanetPosition, House, FullChartAnalysis } from '../../models';
import { v4 as uuidv4 } from 'uuid';

// KP Sub-lord table (249 divisions)
// Each nakshatra (13°20') is divided into 9 unequal parts proportional to Vimshottari dasha periods
const DASHA_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const TOTAL_DASHA_YEARS = 120;

// Sign lords for KP
const SIGN_LORDS: { [key: string]: string } = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
};

export interface KPChartOptions {
  includeSubSubLords?: boolean;
  includeSignificators?: boolean;
  includeRulingPlanets?: boolean;
}

/**
 * Get the star lord (nakshatra lord) for a given longitude
 */
export function getStarLord(longitude: number): string {
  const nakshatraSpan = 360 / 27;
  const nakshatraIndex = Math.floor(longitude / nakshatraSpan);

  // Nakshatra lords repeat in Vimshottari sequence
  const lordIndex = nakshatraIndex % 9;
  return DASHA_SEQUENCE[lordIndex];
}

/**
 * Get the sub-lord for a given longitude
 * Each nakshatra is divided into 9 unequal parts based on Vimshottari proportions
 */
export function getSubLord(longitude: number): string {
  const nakshatraSpan = 360 / 27; // 13.333... degrees
  const positionInNakshatra = longitude % nakshatraSpan;

  // Get the star lord to determine starting point of sub-periods
  const nakshatraIndex = Math.floor(longitude / nakshatraSpan);
  const starLordIndex = nakshatraIndex % 9;

  // Calculate sub-lord divisions within the nakshatra
  let accumulated = 0;
  for (let i = 0; i < 9; i++) {
    const subLordIndex = (starLordIndex + i) % 9;
    const subLord = DASHA_SEQUENCE[subLordIndex];
    const subPeriodYears = DASHA_PERIODS[subLord as keyof typeof DASHA_PERIODS];
    const subSpan = (subPeriodYears / TOTAL_DASHA_YEARS) * nakshatraSpan;

    accumulated += subSpan;
    if (positionInNakshatra < accumulated) {
      return subLord;
    }
  }

  return DASHA_SEQUENCE[starLordIndex]; // Fallback
}

/**
 * Get the sub-sub-lord for a given longitude
 * Further division of sub-lord period
 */
export function getSubSubLord(longitude: number): string {
  const nakshatraSpan = 360 / 27;
  const positionInNakshatra = longitude % nakshatraSpan;

  const nakshatraIndex = Math.floor(longitude / nakshatraSpan);
  const starLordIndex = nakshatraIndex % 9;

  // Find sub-lord and position within sub-period
  let subAccumulated = 0;
  let subLordIndex = starLordIndex;
  let positionInSubPeriod = 0;
  let subSpan = 0;

  for (let i = 0; i < 9; i++) {
    subLordIndex = (starLordIndex + i) % 9;
    const subLord = DASHA_SEQUENCE[subLordIndex];
    const subPeriodYears = DASHA_PERIODS[subLord as keyof typeof DASHA_PERIODS];
    subSpan = (subPeriodYears / TOTAL_DASHA_YEARS) * nakshatraSpan;

    if (positionInNakshatra < subAccumulated + subSpan) {
      positionInSubPeriod = positionInNakshatra - subAccumulated;
      break;
    }
    subAccumulated += subSpan;
  }

  // Now find sub-sub-lord within the sub-period
  let subSubAccumulated = 0;
  for (let j = 0; j < 9; j++) {
    const subSubLordIndex = (subLordIndex + j) % 9;
    const subSubLord = DASHA_SEQUENCE[subSubLordIndex];
    const subSubPeriodYears = DASHA_PERIODS[subSubLord as keyof typeof DASHA_PERIODS];
    const subSubSpan = (subSubPeriodYears / TOTAL_DASHA_YEARS) * subSpan;

    subSubAccumulated += subSubSpan;
    if (positionInSubPeriod < subSubAccumulated) {
      return subSubLord;
    }
  }

  return DASHA_SEQUENCE[subLordIndex]; // Fallback
}

/**
 * Calculate KP number (1-249) from longitude
 */
export function getKPNumber(longitude: number): number {
  // 249 divisions across 360 degrees
  const division = 360 / 249;
  return Math.floor(longitude / division) + 1;
}

/**
 * Calculate longitude from KP number (1-249)
 */
export function kpNumberToLongitude(kpNumber: number): number {
  const division = 360 / 249;
  return (kpNumber - 1) * division + division / 2;
}

/**
 * Generate a complete KP birth chart
 */
export async function generateKPChart(
  userId: string,
  birthDetails: BirthDetails,
  chartStyle: 'north_indian' | 'south_indian' = 'north_indian',
  options: KPChartOptions = {}
): Promise<FullChartAnalysis> {
  const { julianDay } = parseBirthDetails(birthDetails);

  // Calculate KP Ayanamsa (slightly different from Lahiri)
  const ayanamsa = calculateAyanamsa(julianDay, 'kp');

  // Get planetary positions
  const tropicalPositions = calculatePlanetaryPositions(julianDay);

  // Calculate Placidus house cusps (KP uses Placidus)
  const houseCusps = calculatePlacidusHouses(julianDay, birthDetails.latitude, birthDetails.longitude, ayanamsa);

  // Ascendant is the first house cusp
  const siderealAscendant = houseCusps[0];

  // Convert planetary positions to sidereal with KP sub-lords
  const planets: PlanetPosition[] = [];
  for (const [planetName, position] of Object.entries(tropicalPositions)) {
    const siderealLongitude = tropicalToSidereal(position.longitude, ayanamsa);
    const zodiac = getZodiacSign(siderealLongitude);
    const nakshatra = getNakshatra(siderealLongitude);
    const house = getPlanetHouse(siderealLongitude, houseCusps);
    const dms = formatDMS(zodiac.degree);

    // KP specific calculations
    const starLord = getStarLord(siderealLongitude);
    const subLord = getSubLord(siderealLongitude);
    const subSubLord = options.includeSubSubLords ? getSubSubLord(siderealLongitude) : undefined;

    planets.push({
      planet: planetName,
      longitude: siderealLongitude,
      latitude: position.latitude,
      speed: position.speedLongitude,
      sign: zodiac.sign,
      signName: zodiac.signName,
      degree: dms.degrees,
      minute: dms.minutes,
      second: dms.seconds,
      nakshatra: nakshatra.nakshatra,
      nakshatraPada: nakshatra.pada,
      nakshatraLord: nakshatra.nakshatraLord,
      isRetrograde: position.speedLongitude < 0,
      house,
      starLord,
      subLord,
      subSubLord,
    });
  }

  // Create house objects with KP sub-lords
  const houses: House[] = houseCusps.map((cusp, index) => {
    const zodiac = getZodiacSign(cusp);
    const planetsInHouse = planets.filter((p) => p.house === index + 1).map((p) => p.planet);
    const subLord = getSubLord(cusp);

    // Calculate significators for each house
    const significators = options.includeSignificators
      ? calculateHouseSignificators(index + 1, planets, houses, houseCusps)
      : undefined;

    return {
      house: index + 1,
      cusp,
      sign: zodiac.sign,
      signName: zodiac.signName,
      degree: zodiac.degree,
      lord: SIGN_LORDS[zodiac.signName],
      planets: planetsInHouse,
      subLord,
      significators,
    };
  });

  // Get Moon position for dasha calculation
  const moonPosition = planets.find((p) => p.planet === 'Moon');

  // KP Dasha calculation
  const dashaTimeline = calculateKPDasha(moonPosition?.longitude || 0, julianDay);

  // Find current dasha
  const now = new Date();
  const currentDasha = dashaTimeline.find(
    (d) => now >= d.startDate && now < d.endDate
  ) || dashaTimeline[0];

  // Get ascendant sign info
  const ascendantZodiac = getZodiacSign(siderealAscendant);

  // Create chart object
  const chart: Chart = {
    id: uuidv4(),
    userId,
    birthDetails,
    system: 'kp',
    ayanamsa: 'kp',
    ayanamsaValue: ayanamsa,
    ascendant: siderealAscendant,
    ascendantSign: ascendantZodiac.signName,
    moonSign: moonPosition?.signName || '',
    sunSign: planets.find((p) => p.planet === 'Sun')?.signName || '',
    planets,
    houses,
    chartStyle,
    createdAt: new Date(),
  };

  return {
    chart,
    currentDasha: {
      planet: currentDasha.planet,
      startDate: currentDasha.startDate,
      endDate: currentDasha.endDate,
      level: 'mahadasha',
    },
    dashaTimeline: dashaTimeline.map((d) => ({
      planet: d.planet,
      startDate: d.startDate,
      endDate: d.endDate,
      level: 'mahadasha' as const,
    })),
    yogas: [], // KP doesn't emphasize traditional yogas
  };
}

/**
 * Calculate KP Dasha (similar to Vimshottari but with KP ayanamsa)
 */
function calculateKPDasha(
  moonLongitude: number,
  birthJulianDay: number
): { planet: string; startDate: Date; endDate: Date }[] {
  const nakshatraSpan = 360 / 27;
  const nakshatraIndex = Math.floor(moonLongitude / nakshatraSpan);
  const positionInNakshatra = moonLongitude % nakshatraSpan;
  const progressInNakshatra = positionInNakshatra / nakshatraSpan;

  // Get starting dasha lord
  const startIndex = nakshatraIndex % 9;
  const nakshatraLord = DASHA_SEQUENCE[startIndex];

  // Calculate remaining period in first dasha
  const firstDashaTotalYears = DASHA_PERIODS[nakshatraLord as keyof typeof DASHA_PERIODS];
  const remainingYears = firstDashaTotalYears * (1 - progressInNakshatra);

  const dashas: { planet: string; startDate: Date; endDate: Date }[] = [];
  let currentJD = birthJulianDay;

  // Generate dashas
  for (let i = 0; i < 9; i++) {
    const planet = DASHA_SEQUENCE[(startIndex + i) % 9];
    const years = i === 0 ? remainingYears : DASHA_PERIODS[planet as keyof typeof DASHA_PERIODS];

    const startDate = julianDayToDate(currentJD);
    currentJD += years * 365.25;
    const endDate = julianDayToDate(currentJD);

    dashas.push({ planet, startDate, endDate });
  }

  return dashas;
}

/**
 * Convert Julian Day to Date
 */
function julianDayToDate(jd: number): Date {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;

  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  return new Date(Date.UTC(year, month - 1, Math.floor(day)));
}

/**
 * Calculate significators for a house (KP method)
 * A planet signifies a house if:
 * 1. It is placed in that house
 * 2. It owns that house
 * 3. It is the star lord of planets in that house
 * 4. It is the star lord of the house lord
 */
function calculateHouseSignificators(
  houseNum: number,
  planets: PlanetPosition[],
  _houses: House[],
  houseCusps: number[]
): string[] {
  const significators: Set<string> = new Set();

  // 1. Planets placed in the house
  const planetsInHouse = planets.filter((p) => p.house === houseNum);
  planetsInHouse.forEach((p) => significators.add(p.planet));

  // 2. House lord
  const houseCusp = houseCusps[houseNum - 1];
  const houseSign = getZodiacSign(houseCusp).signName;
  const houseLord = SIGN_LORDS[houseSign];
  significators.add(houseLord);

  // 3. Star lords of planets in the house
  planetsInHouse.forEach((p) => {
    if (p.starLord) {
      significators.add(p.starLord);
    }
  });

  // 4. Star lord of house lord
  const houseLordPlanet = planets.find((p) => p.planet === houseLord);
  if (houseLordPlanet?.starLord) {
    significators.add(houseLordPlanet.starLord);
  }

  return Array.from(significators);
}

/**
 * Calculate ruling planets for the current moment (used in horary)
 */
export function calculateRulingPlanets(
  latitude: number,
  longitude: number,
  julianDay: number,
  ayanamsa: number
): string[] {
  const rulingPlanets: string[] = [];

  // 1. Day lord
  const dayOfWeek = Math.floor(julianDay + 1.5) % 7;
  const dayLords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  rulingPlanets.push(dayLords[dayOfWeek]);

  // 2. Ascendant sign lord
  const lst = calculateSiderealTime(julianDay, longitude);
  const houseCusps = calculatePlacidusHouses(julianDay, latitude, longitude, ayanamsa);
  const ascendantSign = getZodiacSign(houseCusps[0]).signName;
  rulingPlanets.push(SIGN_LORDS[ascendantSign]);

  // 3. Ascendant star lord
  const ascStarLord = getStarLord(houseCusps[0]);
  rulingPlanets.push(ascStarLord);

  // 4. Moon sign lord
  const tropicalPositions = calculatePlanetaryPositions(julianDay);
  const moonLongitude = tropicalToSidereal(tropicalPositions.Moon.longitude, ayanamsa);
  const moonSign = getZodiacSign(moonLongitude).signName;
  rulingPlanets.push(SIGN_LORDS[moonSign]);

  // 5. Moon star lord
  const moonStarLord = getStarLord(moonLongitude);
  rulingPlanets.push(moonStarLord);

  // Remove duplicates and return
  return [...new Set(rulingPlanets)];
}

/**
 * Generate horary chart from KP number (1-249)
 */
export async function generateHoraryChart(
  userId: string,
  kpNumber: number,
  latitude: number,
  longitude: number,
  timezone: string
): Promise<{
  chart: Chart;
  rulingPlanets: string[];
  significators: Record<number, string[]>;
}> {
  const now = new Date();
  const julianDay = dateToJulianDay(now, timezone);
  const ayanamsa = calculateAyanamsa(julianDay, 'kp');

  // Convert KP number to ascendant longitude
  const ascendantLongitude = kpNumberToLongitude(kpNumber);

  // Calculate house cusps from the KP number ascendant
  // In horary, we use the KP number to determine the ascendant
  const houseCusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    // Simplified: using equal houses from the KP number ascendant
    houseCusps.push((ascendantLongitude + i * 30) % 360);
  }

  // Get current planetary positions
  const tropicalPositions = calculatePlanetaryPositions(julianDay);

  // Convert to sidereal with KP details
  const planets: PlanetPosition[] = [];
  for (const [planetName, position] of Object.entries(tropicalPositions)) {
    const siderealLongitude = tropicalToSidereal(position.longitude, ayanamsa);
    const zodiac = getZodiacSign(siderealLongitude);
    const nakshatra = getNakshatra(siderealLongitude);
    const house = getPlanetHouse(siderealLongitude, houseCusps);
    const dms = formatDMS(zodiac.degree);

    planets.push({
      planet: planetName,
      longitude: siderealLongitude,
      latitude: position.latitude,
      speed: position.speedLongitude,
      sign: zodiac.sign,
      signName: zodiac.signName,
      degree: dms.degrees,
      minute: dms.minutes,
      second: dms.seconds,
      nakshatra: nakshatra.nakshatra,
      nakshatraPada: nakshatra.pada,
      nakshatraLord: nakshatra.nakshatraLord,
      isRetrograde: position.speedLongitude < 0,
      house,
      starLord: getStarLord(siderealLongitude),
      subLord: getSubLord(siderealLongitude),
    });
  }

  // Create houses with significators
  const houses: House[] = houseCusps.map((cusp, index) => {
    const zodiac = getZodiacSign(cusp);
    const planetsInHouse = planets.filter((p) => p.house === index + 1).map((p) => p.planet);

    return {
      house: index + 1,
      cusp,
      sign: zodiac.sign,
      signName: zodiac.signName,
      degree: zodiac.degree,
      lord: SIGN_LORDS[zodiac.signName],
      planets: planetsInHouse,
      subLord: getSubLord(cusp),
    };
  });

  // Calculate ruling planets
  const rulingPlanets = calculateRulingPlanets(latitude, longitude, julianDay, ayanamsa);

  // Calculate significators for all houses
  const significators: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) {
    significators[i] = calculateHouseSignificators(i, planets, houses, houseCusps);
  }

  const ascendantZodiac = getZodiacSign(ascendantLongitude);
  const moonPosition = planets.find((p) => p.planet === 'Moon');

  const chart: Chart = {
    id: uuidv4(),
    userId,
    birthDetails: {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      latitude,
      longitude,
      timezone,
    },
    system: 'kp',
    ayanamsa: 'kp',
    ayanamsaValue: ayanamsa,
    ascendant: ascendantLongitude,
    ascendantSign: ascendantZodiac.signName,
    moonSign: moonPosition?.signName || '',
    sunSign: planets.find((p) => p.planet === 'Sun')?.signName || '',
    planets,
    houses,
    chartStyle: 'north_indian',
    createdAt: now,
  };

  return {
    chart,
    rulingPlanets,
    significators,
  };
}

/**
 * Convert Date to Julian Day
 */
function dateToJulianDay(date: Date, timezone: string): number {
  // Parse timezone offset
  let tzOffset = 5.5; // Default IST
  if (timezone === 'Asia/Kolkata' || timezone === 'IST') {
    tzOffset = 5.5;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  // Convert to UT
  const ut = hour + minute / 60 + second / 3600;
  let adjustedDay = day + ut / 24;
  let adjustedMonth = month;
  let adjustedYear = year;

  if (adjustedMonth <= 2) {
    adjustedYear -= 1;
    adjustedMonth += 12;
  }

  const A = Math.floor(adjustedYear / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (adjustedYear + 4716)) +
    Math.floor(30.6001 * (adjustedMonth + 1)) +
    adjustedDay + B - 1524.5;
}
