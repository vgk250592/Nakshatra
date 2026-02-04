/**
 * Core astronomical calculations using Swiss Ephemeris
 * This module provides the foundation for all astrological calculations
 */

import { AYANAMSA_VALUES, ZODIAC_SIGNS, NAKSHATRAS, PLANETS, DASHA_PERIODS } from '../../config';
import type { BirthDetails, PlanetPosition, House } from '../../models';

// Swiss Ephemeris planet IDs
const SE_PLANETS = {
  SUN: 0,
  MOON: 1,
  MERCURY: 2,
  VENUS: 3,
  MARS: 4,
  JUPITER: 5,
  SATURN: 6,
  URANUS: 7,
  NEPTUNE: 8,
  PLUTO: 9,
  MEAN_NODE: 10, // Rahu
  TRUE_NODE: 11,
};

// Ayanamsa IDs for Swiss Ephemeris
const SE_AYANAMSA = {
  lahiri: 1,
  raman: 3,
  krishnamurti: 5,
  kp: 5,
};

export interface AstronomicalData {
  julianDay: number;
  siderealTime: number;
  ayanamsa: number;
  obliquity: number;
}

export interface PlanetaryPositions {
  [key: string]: {
    longitude: number;
    latitude: number;
    distance: number;
    speedLongitude: number;
    speedLatitude: number;
    speedDistance: number;
  };
}

/**
 * Convert date and time to Julian Day
 */
export function dateToJulianDay(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: number
): number {
  // Convert local time to UT
  const ut = hour + minute / 60 + second / 3600 - timezone;

  // Adjust date if UT crosses midnight
  let adjustedDay = day + ut / 24;
  let adjustedMonth = month;
  let adjustedYear = year;

  if (adjustedMonth <= 2) {
    adjustedYear -= 1;
    adjustedMonth += 12;
  }

  const A = Math.floor(adjustedYear / 100);
  const B = 2 - A + Math.floor(A / 4);

  const jd = Math.floor(365.25 * (adjustedYear + 4716)) +
    Math.floor(30.6001 * (adjustedMonth + 1)) +
    adjustedDay + B - 1524.5;

  return jd;
}

/**
 * Calculate sidereal time for a given location and time
 */
export function calculateSiderealTime(julianDay: number, longitude: number): number {
  const T = (julianDay - 2451545.0) / 36525;

  // Greenwich Mean Sidereal Time
  let gmst = 280.46061837 +
    360.98564736629 * (julianDay - 2451545.0) +
    0.000387933 * T * T -
    T * T * T / 38710000;

  // Normalize to 0-360
  gmst = gmst % 360;
  if (gmst < 0) gmst += 360;

  // Local Sidereal Time
  let lst = gmst + longitude;
  lst = lst % 360;
  if (lst < 0) lst += 360;

  return lst;
}

/**
 * Calculate ayanamsa (precession correction) for a given date
 */
export function calculateAyanamsa(julianDay: number, type: keyof typeof AYANAMSA_VALUES = 'lahiri'): number {
  // Reference: J2000.0 epoch (January 1, 2000, 12:00 TT)
  const J2000 = 2451545.0;
  const T = (julianDay - J2000) / 36525; // Julian centuries from J2000

  // Base ayanamsa at J2000 + annual precession rate
  const baseAyanamsa = AYANAMSA_VALUES[type];
  const annualPrecession = 50.2564 / 3600; // degrees per year
  const yearsFromJ2000 = (julianDay - J2000) / 365.25;

  return baseAyanamsa + annualPrecession * yearsFromJ2000;
}

/**
 * Convert tropical longitude to sidereal longitude
 */
export function tropicalToSidereal(tropicalLongitude: number, ayanamsa: number): number {
  let sidereal = tropicalLongitude - ayanamsa;
  if (sidereal < 0) sidereal += 360;
  return sidereal;
}

/**
 * Get zodiac sign from longitude
 */
export function getZodiacSign(longitude: number): { sign: number; signName: string; degree: number } {
  const sign = Math.floor(longitude / 30);
  const degree = longitude % 30;
  return {
    sign,
    signName: ZODIAC_SIGNS[sign],
    degree,
  };
}

/**
 * Get nakshatra from longitude
 */
export function getNakshatra(longitude: number): {
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  nakshatraLord: string;
} {
  const nakshatraSpan = 360 / 27; // 13.333... degrees per nakshatra
  const padaSpan = nakshatraSpan / 4; // 3.333... degrees per pada

  const nakshatraIndex = Math.floor(longitude / nakshatraSpan);
  const positionInNakshatra = longitude % nakshatraSpan;
  const pada = Math.floor(positionInNakshatra / padaSpan) + 1;

  // Nakshatra lords for Vimshottari Dasha
  const nakshatraLords = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  ];

  return {
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraIndex,
    pada,
    nakshatraLord: nakshatraLords[nakshatraIndex],
  };
}

/**
 * Calculate house cusps using Placidus system (for KP)
 */
export function calculatePlacidusHouses(
  julianDay: number,
  latitude: number,
  longitude: number,
  ayanamsa: number
): number[] {
  const lst = calculateSiderealTime(julianDay, longitude);
  const ramc = lst; // Right Ascension of Medium Coeli

  // Obliquity of ecliptic
  const T = (julianDay - 2451545.0) / 36525;
  const obliquity = 23.439291 - 0.0130042 * T;

  const cusps: number[] = [];
  const latRad = latitude * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;

  // Calculate 12 house cusps
  for (let i = 1; i <= 12; i++) {
    let cusp: number;

    if (i === 1) {
      // Ascendant
      const ascRad = Math.atan2(
        Math.cos(ramc * Math.PI / 180),
        -(Math.sin(ramc * Math.PI / 180) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad))
      );
      cusp = ascRad * 180 / Math.PI;
      if (cusp < 0) cusp += 360;
    } else if (i === 10) {
      // MC (Medium Coeli)
      cusp = ramc;
    } else {
      // Simplified Placidus calculation for other houses
      const houseAngle = (i - 1) * 30;
      cusp = (ramc + houseAngle) % 360;
    }

    // Convert to sidereal
    cusp = tropicalToSidereal(cusp, ayanamsa);
    cusps.push(cusp);
  }

  return cusps;
}

/**
 * Calculate house cusps using Equal House system (for Parashari)
 */
export function calculateEqualHouses(ascendant: number): number[] {
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push((ascendant + i * 30) % 360);
  }
  return cusps;
}

/**
 * Determine which house a planet is in
 */
export function getPlanetHouse(planetLongitude: number, houseCusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const nextHouse = (i + 1) % 12;
    const currentCusp = houseCusps[i];
    const nextCusp = houseCusps[nextHouse];

    if (nextCusp > currentCusp) {
      if (planetLongitude >= currentCusp && planetLongitude < nextCusp) {
        return i + 1;
      }
    } else {
      // House spans 0 degrees
      if (planetLongitude >= currentCusp || planetLongitude < nextCusp) {
        return i + 1;
      }
    }
  }
  return 1;
}

/**
 * Calculate planetary positions (simulated - in production use Swiss Ephemeris)
 * This is a simplified calculation for demonstration
 */
export function calculatePlanetaryPositions(julianDay: number): PlanetaryPositions {
  // In production, this would use the Swiss Ephemeris library
  // For now, we use simplified mean positions

  const T = (julianDay - 2451545.0) / 36525; // Julian centuries from J2000

  const positions: PlanetaryPositions = {};

  // Sun - mean longitude
  const sunL = (280.46646 + 36000.76983 * T) % 360;
  positions.Sun = {
    longitude: sunL < 0 ? sunL + 360 : sunL,
    latitude: 0,
    distance: 1.0,
    speedLongitude: 0.9856,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Moon - mean longitude
  const moonL = (218.3165 + 481267.8813 * T) % 360;
  positions.Moon = {
    longitude: moonL < 0 ? moonL + 360 : moonL,
    latitude: 0,
    distance: 0.00257,
    speedLongitude: 13.176,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Mercury
  const mercuryL = (252.2509 + 149472.6746 * T) % 360;
  positions.Mercury = {
    longitude: mercuryL < 0 ? mercuryL + 360 : mercuryL,
    latitude: 0,
    distance: 0.387,
    speedLongitude: 4.09,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Venus
  const venusL = (181.9798 + 58517.8039 * T) % 360;
  positions.Venus = {
    longitude: venusL < 0 ? venusL + 360 : venusL,
    latitude: 0,
    distance: 0.723,
    speedLongitude: 1.602,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Mars
  const marsL = (355.4330 + 19140.2993 * T) % 360;
  positions.Mars = {
    longitude: marsL < 0 ? marsL + 360 : marsL,
    latitude: 0,
    distance: 1.524,
    speedLongitude: 0.524,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Jupiter
  const jupiterL = (34.3515 + 3034.9057 * T) % 360;
  positions.Jupiter = {
    longitude: jupiterL < 0 ? jupiterL + 360 : jupiterL,
    latitude: 0,
    distance: 5.203,
    speedLongitude: 0.083,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Saturn
  const saturnL = (50.0774 + 1222.1138 * T) % 360;
  positions.Saturn = {
    longitude: saturnL < 0 ? saturnL + 360 : saturnL,
    latitude: 0,
    distance: 9.537,
    speedLongitude: 0.033,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Rahu (Mean North Node)
  const rahuL = (125.0445 - 1934.1363 * T) % 360;
  positions.Rahu = {
    longitude: rahuL < 0 ? rahuL + 360 : rahuL,
    latitude: 0,
    distance: 0,
    speedLongitude: -0.053,
    speedLatitude: 0,
    speedDistance: 0,
  };

  // Ketu (opposite to Rahu)
  positions.Ketu = {
    longitude: (positions.Rahu.longitude + 180) % 360,
    latitude: 0,
    distance: 0,
    speedLongitude: -0.053,
    speedLatitude: 0,
    speedDistance: 0,
  };

  return positions;
}

/**
 * Calculate Vimshottari Dasha
 */
export function calculateVimshottariDasha(
  moonLongitude: number,
  birthJulianDay: number
): { planet: string; startDate: Date; endDate: Date }[] {
  const { nakshatraLord, pada } = getNakshatra(moonLongitude);
  const nakshatraSpan = 360 / 27;
  const positionInNakshatra = moonLongitude % nakshatraSpan;
  const progressInNakshatra = positionInNakshatra / nakshatraSpan;

  // Dasha sequence
  const dashaSequence = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

  // Find starting dasha lord
  const startIndex = dashaSequence.indexOf(nakshatraLord);

  // Calculate remaining period in first dasha
  const firstDashaTotalYears = DASHA_PERIODS[nakshatraLord as keyof typeof DASHA_PERIODS];
  const remainingYears = firstDashaTotalYears * (1 - progressInNakshatra);

  const dashas: { planet: string; startDate: Date; endDate: Date }[] = [];
  let currentJD = birthJulianDay;

  // Generate dashas for 120 years (full Vimshottari cycle)
  for (let i = 0; i < 9; i++) {
    const planet = dashaSequence[(startIndex + i) % 9];
    const years = i === 0 ? remainingYears : DASHA_PERIODS[planet as keyof typeof DASHA_PERIODS];

    const startDate = julianDayToDate(currentJD);
    currentJD += years * 365.25;
    const endDate = julianDayToDate(currentJD);

    dashas.push({ planet, startDate, endDate });
  }

  return dashas;
}

/**
 * Convert Julian Day to JavaScript Date
 */
export function julianDayToDate(jd: number): Date {
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

  const hours = (day % 1) * 24;
  const minutes = (hours % 1) * 60;
  const seconds = (minutes % 1) * 60;

  return new Date(Date.UTC(year, month - 1, Math.floor(day), Math.floor(hours), Math.floor(minutes), Math.floor(seconds)));
}

/**
 * Parse birth details and calculate Julian Day
 */
export function parseBirthDetails(birthDetails: BirthDetails): {
  julianDay: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timezone: number;
} {
  const [year, month, day] = birthDetails.date.split('-').map(Number);
  const timeParts = birthDetails.time.split(':').map(Number);
  const hour = timeParts[0];
  const minute = timeParts[1];
  const second = timeParts[2] || 0;

  // Parse timezone offset (simplified - in production use proper timezone library)
  const timezone = parseTimezoneOffset(birthDetails.timezone);

  const julianDay = dateToJulianDay(year, month, day, hour, minute, second, timezone);

  return { julianDay, year, month, day, hour, minute, second, timezone };
}

/**
 * Parse timezone string to offset in hours
 */
function parseTimezoneOffset(timezone: string): number {
  // Common Indian timezone
  if (timezone === 'Asia/Kolkata' || timezone === 'IST') {
    return 5.5;
  }

  // UTC offset format
  const match = timezone.match(/^UTC([+-])(\d{1,2}):?(\d{2})?$/);
  if (match) {
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || '0', 10);
    return sign * (hours + minutes / 60);
  }

  // Default to IST
  return 5.5;
}

/**
 * Format degrees to DMS (degrees, minutes, seconds)
 */
export function formatDMS(degrees: number): { degrees: number; minutes: number; seconds: number } {
  const d = Math.floor(degrees);
  const m = Math.floor((degrees - d) * 60);
  const s = Math.round(((degrees - d) * 60 - m) * 60);
  return { degrees: d, minutes: m, seconds: s };
}
