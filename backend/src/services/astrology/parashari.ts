/**
 * Parashari System Calculations
 * Traditional Vedic astrology based on Parashara's principles
 */

import {
  calculatePlanetaryPositions,
  calculateEqualHouses,
  calculateAyanamsa,
  tropicalToSidereal,
  getZodiacSign,
  getNakshatra,
  getPlanetHouse,
  parseBirthDetails,
  calculateVimshottariDasha,
  calculateSiderealTime,
  formatDMS,
} from './calculations';
import { ZODIAC_SIGNS, PLANETS } from '../../config';
import type { BirthDetails, Chart, PlanetPosition, House, Yoga, FullChartAnalysis } from '../../models';
import { v4 as uuidv4 } from 'uuid';

// Planet lordship (signs ruled by each planet)
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

// Planetary friendships
const PLANETARY_FRIENDSHIPS: { [key: string]: { friends: string[]; enemies: string[]; neutral: string[] } } = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'], neutral: ['Mercury'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [], neutral: ['Mars', 'Jupiter', 'Venus', 'Saturn'] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'], neutral: ['Venus', 'Saturn'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'], neutral: ['Mars', 'Jupiter', 'Saturn'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'], neutral: ['Saturn'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'], neutral: ['Mars', 'Jupiter'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'], neutral: ['Jupiter'] },
  Rahu: { friends: ['Venus', 'Saturn'], enemies: ['Sun', 'Moon', 'Mars'], neutral: ['Mercury', 'Jupiter'] },
  Ketu: { friends: ['Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'], neutral: ['Sun', 'Moon', 'Mercury'] },
};

// Exaltation signs
const EXALTATION_SIGNS: { [key: string]: { sign: string; degree: number } } = {
  Sun: { sign: 'Aries', degree: 10 },
  Moon: { sign: 'Taurus', degree: 3 },
  Mars: { sign: 'Capricorn', degree: 28 },
  Mercury: { sign: 'Virgo', degree: 15 },
  Jupiter: { sign: 'Cancer', degree: 5 },
  Venus: { sign: 'Pisces', degree: 27 },
  Saturn: { sign: 'Libra', degree: 20 },
  Rahu: { sign: 'Taurus', degree: 20 },
  Ketu: { sign: 'Scorpio', degree: 20 },
};

// Debilitation signs (opposite to exaltation)
const DEBILITATION_SIGNS: { [key: string]: string } = {
  Sun: 'Libra',
  Moon: 'Scorpio',
  Mars: 'Cancer',
  Mercury: 'Pisces',
  Jupiter: 'Capricorn',
  Venus: 'Virgo',
  Saturn: 'Aries',
  Rahu: 'Scorpio',
  Ketu: 'Taurus',
};

// Own signs (Mooltrikona and Own)
const OWN_SIGNS: { [key: string]: string[] } = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius'],
};

export interface ParashariChartOptions {
  includeOuterPlanets?: boolean;
  includeDivisionalCharts?: boolean;
  includeYogas?: boolean;
  includeShadbala?: boolean;
}

/**
 * Generate a complete Parashari birth chart
 */
export async function generateParashariChart(
  userId: string,
  birthDetails: BirthDetails,
  chartStyle: 'north_indian' | 'south_indian' = 'north_indian',
  options: ParashariChartOptions = {}
): Promise<FullChartAnalysis> {
  const { julianDay } = parseBirthDetails(birthDetails);

  // Calculate ayanamsa (Lahiri for Parashari)
  const ayanamsa = calculateAyanamsa(julianDay, 'lahiri');

  // Get planetary positions
  const tropicalPositions = calculatePlanetaryPositions(julianDay);

  // Calculate ascendant
  const lst = calculateSiderealTime(julianDay, birthDetails.longitude);
  const tropicalAscendant = calculateAscendant(lst, birthDetails.latitude);
  const siderealAscendant = tropicalToSidereal(tropicalAscendant, ayanamsa);

  // Calculate house cusps (Equal house system for Parashari)
  const houseCusps = calculateEqualHouses(siderealAscendant);

  // Convert planetary positions to sidereal and create PlanetPosition objects
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
    });
  }

  // Create house objects
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
    };
  });

  // Get Moon position for dasha calculation
  const moonPosition = planets.find((p) => p.planet === 'Moon');
  const dashaTimeline = calculateVimshottariDasha(moonPosition?.longitude || 0, julianDay);

  // Find current dasha
  const now = new Date();
  const currentDasha = dashaTimeline.find(
    (d) => now >= d.startDate && now < d.endDate
  ) || dashaTimeline[0];

  // Identify yogas
  const yogas = options.includeYogas !== false ? identifyYogas(planets, houses) : [];

  // Get ascendant sign info
  const ascendantZodiac = getZodiacSign(siderealAscendant);

  // Create chart object
  const chart: Chart = {
    id: uuidv4(),
    userId,
    birthDetails,
    system: 'parashari',
    ayanamsa: 'lahiri',
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
    yogas,
  };
}

/**
 * Calculate ascendant from local sidereal time and latitude
 */
function calculateAscendant(lst: number, latitude: number): number {
  const lstRad = lst * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const obliquity = 23.4393 * Math.PI / 180; // Mean obliquity

  const y = Math.cos(lstRad);
  const x = -(Math.sin(lstRad) * Math.cos(obliquity) + Math.tan(latRad) * Math.sin(obliquity));

  let ascendant = Math.atan2(y, x) * 180 / Math.PI;
  if (ascendant < 0) ascendant += 360;

  return ascendant;
}

/**
 * Identify yogas (planetary combinations) in the chart
 */
function identifyYogas(planets: PlanetPosition[], houses: House[]): Yoga[] {
  const yogas: Yoga[] = [];

  // Helper functions
  const getPlanet = (name: string) => planets.find((p) => p.planet === name);
  const getPlanetsInHouse = (houseNum: number) => planets.filter((p) => p.house === houseNum);
  const getHouseLord = (houseNum: number) => houses[houseNum - 1]?.lord;

  // 1. Gajakesari Yoga - Jupiter in kendra from Moon
  const moon = getPlanet('Moon');
  const jupiter = getPlanet('Jupiter');
  if (moon && jupiter) {
    const moonHouse = moon.house;
    const jupiterHouse = jupiter.house;
    const houseDiff = Math.abs(jupiterHouse - moonHouse);
    const kendraPositions = [0, 3, 6, 9];
    if (kendraPositions.includes(houseDiff) || kendraPositions.includes(12 - houseDiff)) {
      yogas.push({
        name: 'Gajakesari Yoga',
        type: 'benefic',
        planets: ['Moon', 'Jupiter'],
        houses: [moonHouse, jupiterHouse],
        description: 'Jupiter in kendra from Moon brings wisdom, wealth, and respected position in society.',
        strength: 75,
      });
    }
  }

  // 2. Budha-Aditya Yoga - Sun and Mercury conjunction
  const sun = getPlanet('Sun');
  const mercury = getPlanet('Mercury');
  if (sun && mercury && sun.house === mercury.house) {
    // Check if Mercury is not combust (too close to Sun)
    const distance = Math.abs(sun.longitude - mercury.longitude);
    if (distance > 14) {
      yogas.push({
        name: 'Budha-Aditya Yoga',
        type: 'benefic',
        planets: ['Sun', 'Mercury'],
        houses: [sun.house],
        description: 'Combination of Sun and Mercury grants intelligence, communication skills, and success in intellectual pursuits.',
        strength: 70,
      });
    }
  }

  // 3. Chandra-Mangal Yoga - Moon and Mars conjunction
  const mars = getPlanet('Mars');
  if (moon && mars && moon.house === mars.house) {
    yogas.push({
      name: 'Chandra-Mangal Yoga',
      type: 'benefic',
      planets: ['Moon', 'Mars'],
      houses: [moon.house],
      description: 'Moon-Mars combination brings courage, wealth through self-effort, and business acumen.',
      strength: 65,
    });
  }

  // 4. Hamsa Yoga - Jupiter in kendra in own/exaltation sign
  if (jupiter) {
    const kendraHouses = [1, 4, 7, 10];
    const jupiterSign = jupiter.signName;
    const isJupiterStrong = ['Sagittarius', 'Pisces', 'Cancer'].includes(jupiterSign);
    if (kendraHouses.includes(jupiter.house) && isJupiterStrong) {
      yogas.push({
        name: 'Hamsa Yoga',
        type: 'benefic',
        planets: ['Jupiter'],
        houses: [jupiter.house],
        description: 'Mahapurusha Yoga of Jupiter brings righteousness, wisdom, spiritual inclination, and respect.',
        strength: 85,
      });
    }
  }

  // 5. Malavya Yoga - Venus in kendra in own/exaltation sign
  const venus = getPlanet('Venus');
  if (venus) {
    const kendraHouses = [1, 4, 7, 10];
    const venusSign = venus.signName;
    const isVenusStrong = ['Taurus', 'Libra', 'Pisces'].includes(venusSign);
    if (kendraHouses.includes(venus.house) && isVenusStrong) {
      yogas.push({
        name: 'Malavya Yoga',
        type: 'benefic',
        planets: ['Venus'],
        houses: [venus.house],
        description: 'Mahapurusha Yoga of Venus brings luxury, artistic talents, beautiful spouse, and material comforts.',
        strength: 85,
      });
    }
  }

  // 6. Ruchaka Yoga - Mars in kendra in own/exaltation sign
  if (mars) {
    const kendraHouses = [1, 4, 7, 10];
    const marsSign = mars.signName;
    const isMarsStrong = ['Aries', 'Scorpio', 'Capricorn'].includes(marsSign);
    if (kendraHouses.includes(mars.house) && isMarsStrong) {
      yogas.push({
        name: 'Ruchaka Yoga',
        type: 'benefic',
        planets: ['Mars'],
        houses: [mars.house],
        description: 'Mahapurusha Yoga of Mars brings courage, leadership, military success, and physical strength.',
        strength: 85,
      });
    }
  }

  // 7. Shasha Yoga - Saturn in kendra in own/exaltation sign
  const saturn = getPlanet('Saturn');
  if (saturn) {
    const kendraHouses = [1, 4, 7, 10];
    const saturnSign = saturn.signName;
    const isSaturnStrong = ['Capricorn', 'Aquarius', 'Libra'].includes(saturnSign);
    if (kendraHouses.includes(saturn.house) && isSaturnStrong) {
      yogas.push({
        name: 'Shasha Yoga',
        type: 'benefic',
        planets: ['Saturn'],
        houses: [saturn.house],
        description: 'Mahapurusha Yoga of Saturn brings discipline, authority, success in service, and longevity.',
        strength: 85,
      });
    }
  }

  // 8. Bhadra Yoga - Mercury in kendra in own/exaltation sign
  if (mercury) {
    const kendraHouses = [1, 4, 7, 10];
    const mercurySign = mercury.signName;
    const isMercuryStrong = ['Gemini', 'Virgo'].includes(mercurySign);
    if (kendraHouses.includes(mercury.house) && isMercuryStrong) {
      yogas.push({
        name: 'Bhadra Yoga',
        type: 'benefic',
        planets: ['Mercury'],
        houses: [mercury.house],
        description: 'Mahapurusha Yoga of Mercury brings eloquence, intelligence, business success, and youthful appearance.',
        strength: 85,
      });
    }
  }

  // 9. Kemadruma Yoga - Moon without planets in 2nd and 12th from it
  if (moon) {
    const house2FromMoon = ((moon.house + 1 - 1) % 12) + 1;
    const house12FromMoon = ((moon.house - 1 - 1 + 12) % 12) + 1;
    const planetsIn2nd = getPlanetsInHouse(house2FromMoon).filter((p) => !['Rahu', 'Ketu'].includes(p.planet));
    const planetsIn12th = getPlanetsInHouse(house12FromMoon).filter((p) => !['Rahu', 'Ketu'].includes(p.planet));

    if (planetsIn2nd.length === 0 && planetsIn12th.length === 0) {
      yogas.push({
        name: 'Kemadruma Yoga',
        type: 'malefic',
        planets: ['Moon'],
        houses: [moon.house],
        description: 'Moon without support may indicate periods of loneliness or financial struggles. Remedies can help.',
        strength: 50,
      });
    }
  }

  // 10. Mangal Dosha - Mars in 1, 4, 7, 8, or 12th house
  if (mars) {
    const mangalDoshaHouses = [1, 4, 7, 8, 12];
    if (mangalDoshaHouses.includes(mars.house)) {
      yogas.push({
        name: 'Mangal Dosha',
        type: 'malefic',
        planets: ['Mars'],
        houses: [mars.house],
        description: 'Mars placement may affect marriage compatibility. Various cancellation factors and remedies exist.',
        strength: 40,
      });
    }
  }

  return yogas;
}

/**
 * Get planetary strength (simplified Shadbala)
 */
export function calculateShadbala(planets: PlanetPosition[]): Record<string, number> {
  const shadbala: Record<string, number> = {};

  for (const planet of planets) {
    let strength = 50; // Base strength

    // Exaltation/Debilitation
    const exaltation = EXALTATION_SIGNS[planet.planet];
    const debilitation = DEBILITATION_SIGNS[planet.planet];
    if (exaltation && planet.signName === exaltation.sign) {
      strength += 30;
    } else if (debilitation && planet.signName === debilitation) {
      strength -= 20;
    }

    // Own sign
    const ownSigns = OWN_SIGNS[planet.planet];
    if (ownSigns && ownSigns.includes(planet.signName)) {
      strength += 20;
    }

    // Retrograde (increases strength for outer planets)
    if (planet.isRetrograde && !['Sun', 'Moon'].includes(planet.planet)) {
      strength += 10;
    }

    // Angular houses (1, 4, 7, 10)
    if ([1, 4, 7, 10].includes(planet.house)) {
      strength += 15;
    }

    // Normalize to 0-100
    shadbala[planet.planet] = Math.max(0, Math.min(100, strength));
  }

  return shadbala;
}

/**
 * Generate D9 (Navamsa) divisional chart
 */
export function generateNavamsaChart(planets: PlanetPosition[]): PlanetPosition[] {
  return planets.map((planet) => {
    // Navamsa calculation: each sign is divided into 9 parts of 3°20' each
    const navamsaPart = Math.floor((planet.longitude % 30) / (30 / 9));
    const signIndex = Math.floor(planet.longitude / 30);

    // Starting navamsa sign depends on the element of the birth sign
    const elements = ['fire', 'earth', 'air', 'water'];
    const element = elements[signIndex % 4];
    const startSign = { fire: 0, earth: 9, air: 6, water: 3 }[element] || 0;

    const navamsaSign = (startSign + navamsaPart) % 12;
    const navamsaLongitude = navamsaSign * 30 + (planet.longitude % (30 / 9)) * 9;

    const zodiac = getZodiacSign(navamsaLongitude);
    const nakshatra = getNakshatra(navamsaLongitude);

    return {
      ...planet,
      longitude: navamsaLongitude,
      sign: navamsaSign,
      signName: ZODIAC_SIGNS[navamsaSign],
      degree: zodiac.degree,
      nakshatra: nakshatra.nakshatra,
      nakshatraPada: nakshatra.pada,
      nakshatraLord: nakshatra.nakshatraLord,
    };
  });
}
