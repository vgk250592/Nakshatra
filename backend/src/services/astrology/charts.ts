/**
 * Chart Rendering Service
 * Generates visual representations of astrological charts
 */

import type { Chart, PlanetPosition, House } from '../../models';

// Chart dimensions
const CHART_SIZE = 400;
const HOUSE_SIZE = CHART_SIZE / 4;

export interface ChartSVG {
  svg: string;
  width: number;
  height: number;
}

export interface ChartData {
  houses: {
    number: number;
    sign: string;
    planets: string[];
    signSymbol: string;
  }[];
  ascendant: string;
  style: 'north_indian' | 'south_indian';
}

// Zodiac symbols
const ZODIAC_SYMBOLS: { [key: string]: string } = {
  Aries: '\u2648',
  Taurus: '\u2649',
  Gemini: '\u264A',
  Cancer: '\u264B',
  Leo: '\u264C',
  Virgo: '\u264D',
  Libra: '\u264E',
  Scorpio: '\u264F',
  Sagittarius: '\u2650',
  Capricorn: '\u2651',
  Aquarius: '\u2652',
  Pisces: '\u2653',
};

// Planet abbreviations
const PLANET_ABBREV: { [key: string]: string } = {
  Sun: 'Su',
  Moon: 'Mo',
  Mars: 'Ma',
  Mercury: 'Me',
  Jupiter: 'Ju',
  Venus: 'Ve',
  Saturn: 'Sa',
  Rahu: 'Ra',
  Ketu: 'Ke',
};

/**
 * Prepare chart data for rendering
 */
export function prepareChartData(chart: Chart): ChartData {
  const houses = chart.houses.map((house) => ({
    number: house.house,
    sign: house.signName,
    planets: house.planets,
    signSymbol: ZODIAC_SYMBOLS[house.signName] || '',
  }));

  return {
    houses,
    ascendant: chart.ascendantSign,
    style: chart.chartStyle,
  };
}

/**
 * Generate North Indian style chart SVG
 * Diamond pattern with houses arranged in traditional order
 */
export function generateNorthIndianChart(chart: Chart): ChartSVG {
  const data = prepareChartData(chart);
  const size = CHART_SIZE;
  const mid = size / 2;

  // North Indian house positions (diamond layout)
  // House 1 is at top center, others follow clockwise
  const housePositions: { [key: number]: { x: number; y: number; w: number; h: number } } = {
    1: { x: mid - 50, y: 0, w: 100, h: 100 },           // Top center (Ascendant)
    2: { x: 0, y: 0, w: 100, h: 100 },                  // Top left
    3: { x: 0, y: 100, w: 100, h: 100 },                // Left upper
    4: { x: 0, y: 200, w: 100, h: 100 },                // Left lower
    5: { x: 0, y: 300, w: 100, h: 100 },                // Bottom left
    6: { x: mid - 50, y: 300, w: 100, h: 100 },         // Bottom center
    7: { x: 300, y: 300, w: 100, h: 100 },              // Bottom right
    8: { x: 300, y: 200, w: 100, h: 100 },              // Right lower
    9: { x: 300, y: 100, w: 100, h: 100 },              // Right upper
    10: { x: 300, y: 0, w: 100, h: 100 },               // Top right
    11: { x: mid + 50, y: 0, w: 100, h: 100 },          // Adjacent to 1
    12: { x: mid - 150, y: 0, w: 100, h: 100 },         // Adjacent to 1 (other side)
  };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  // Background
  svg += `<rect width="${size}" height="${size}" fill="#FFFFFF"/>`;

  // Draw diamond pattern
  svg += `
    <path d="M ${mid} 0 L ${size} ${mid} L ${mid} ${size} L 0 ${mid} Z"
          fill="none" stroke="#1F2937" stroke-width="2"/>
    <line x1="${mid}" y1="0" x2="${mid}" y2="${size}" stroke="#1F2937" stroke-width="1"/>
    <line x1="0" y1="${mid}" x2="${size}" y2="${mid}" stroke="#1F2937" stroke-width="1"/>
    <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="#1F2937" stroke-width="1"/>
    <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="#1F2937" stroke-width="1"/>
  `;

  // House text positions for North Indian chart
  const textPositions: { [key: number]: { x: number; y: number } } = {
    1: { x: mid, y: mid - 60 },
    2: { x: mid - 80, y: mid - 80 },
    3: { x: 60, y: mid - 30 },
    4: { x: 60, y: mid + 30 },
    5: { x: mid - 80, y: mid + 80 },
    6: { x: mid, y: mid + 60 },
    7: { x: mid + 80, y: mid + 80 },
    8: { x: size - 60, y: mid + 30 },
    9: { x: size - 60, y: mid - 30 },
    10: { x: mid + 80, y: mid - 80 },
    11: { x: mid + 40, y: mid - 40 },
    12: { x: mid - 40, y: mid - 40 },
  };

  // Add house contents
  data.houses.forEach((house) => {
    const pos = textPositions[house.number];
    if (pos) {
      // Sign symbol
      svg += `<text x="${pos.x}" y="${pos.y - 10}"
                    text-anchor="middle" font-size="14" fill="#6B7280">
                ${house.signSymbol}
              </text>`;

      // Planets
      const planetStr = house.planets.map((p) => PLANET_ABBREV[p] || p).join(' ');
      if (planetStr) {
        svg += `<text x="${pos.x}" y="${pos.y + 10}"
                      text-anchor="middle" font-size="12" font-weight="bold" fill="#1F2937">
                  ${planetStr}
                </text>`;
      }
    }
  });

  // Mark Ascendant
  svg += `<text x="${mid}" y="${mid - 80}"
                text-anchor="middle" font-size="10" fill="#9333EA">Asc</text>`;

  svg += '</svg>';

  return { svg, width: size, height: size };
}

/**
 * Generate South Indian style chart SVG
 * Square grid pattern with houses arranged in traditional order
 */
export function generateSouthIndianChart(chart: Chart): ChartSVG {
  const data = prepareChartData(chart);
  const size = CHART_SIZE;
  const cellSize = size / 4;

  // South Indian layout: 4x4 grid with center empty
  // Signs are fixed, houses rotate based on ascendant
  const signPositions: { [key: string]: { row: number; col: number } } = {
    Pisces: { row: 0, col: 0 },
    Aries: { row: 0, col: 1 },
    Taurus: { row: 0, col: 2 },
    Gemini: { row: 0, col: 3 },
    Aquarius: { row: 1, col: 0 },
    Cancer: { row: 1, col: 3 },
    Capricorn: { row: 2, col: 0 },
    Leo: { row: 2, col: 3 },
    Sagittarius: { row: 3, col: 0 },
    Scorpio: { row: 3, col: 1 },
    Libra: { row: 3, col: 2 },
    Virgo: { row: 3, col: 3 },
  };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  // Background
  svg += `<rect width="${size}" height="${size}" fill="#FFFFFF"/>`;

  // Draw grid
  for (let i = 0; i <= 4; i++) {
    svg += `<line x1="${i * cellSize}" y1="0" x2="${i * cellSize}" y2="${size}" stroke="#1F2937" stroke-width="1"/>`;
    svg += `<line x1="0" y1="${i * cellSize}" x2="${size}" y2="${i * cellSize}" stroke="#1F2937" stroke-width="1"/>`;
  }

  // Draw diagonal lines in corner cells
  svg += `<line x1="0" y1="0" x2="${cellSize}" y2="${cellSize}" stroke="#1F2937" stroke-width="1"/>`;
  svg += `<line x1="${size - cellSize}" y1="0" x2="${size}" y2="${cellSize}" stroke="#1F2937" stroke-width="1"/>`;
  svg += `<line x1="0" y1="${size}" x2="${cellSize}" y2="${size - cellSize}" stroke="#1F2937" stroke-width="1"/>`;
  svg += `<line x1="${size - cellSize}" y1="${size}" x2="${size}" y2="${size - cellSize}" stroke="#1F2937" stroke-width="1"/>`;

  // Map houses to signs based on ascendant
  const ascendantIndex = Object.keys(signPositions).indexOf(data.ascendant);
  const signOrder = Object.keys(signPositions);

  data.houses.forEach((house) => {
    const signIndex = (ascendantIndex + house.number - 1) % 12;
    const sign = signOrder[signIndex];
    const pos = signPositions[sign];

    if (pos) {
      const x = pos.col * cellSize + cellSize / 2;
      const y = pos.row * cellSize + cellSize / 2;

      // House number
      svg += `<text x="${x}" y="${y - 20}"
                    text-anchor="middle" font-size="10" fill="#9CA3AF">
                ${house.number}
              </text>`;

      // Sign symbol
      svg += `<text x="${x}" y="${y}"
                    text-anchor="middle" font-size="16" fill="#6B7280">
                ${ZODIAC_SYMBOLS[sign] || ''}
              </text>`;

      // Planets
      const planetStr = house.planets.map((p) => PLANET_ABBREV[p] || p).join(' ');
      if (planetStr) {
        svg += `<text x="${x}" y="${y + 20}"
                      text-anchor="middle" font-size="11" font-weight="bold" fill="#1F2937">
                  ${planetStr}
                </text>`;
      }

      // Mark Ascendant house
      if (house.number === 1) {
        svg += `<text x="${x + 30}" y="${y - 30}"
                      text-anchor="middle" font-size="10" fill="#9333EA">Asc</text>`;
      }
    }
  });

  svg += '</svg>';

  return { svg, width: size, height: size };
}

/**
 * Generate chart SVG based on style preference
 */
export function generateChartSVG(chart: Chart): ChartSVG {
  if (chart.chartStyle === 'south_indian') {
    return generateSouthIndianChart(chart);
  }
  return generateNorthIndianChart(chart);
}

/**
 * Generate text representation of chart for AI analysis
 */
export function generateChartText(chart: Chart): string {
  let text = `# Birth Chart Analysis\n\n`;
  text += `**System:** ${chart.system === 'kp' ? 'Krishnamurti Paddhati (KP)' : 'Parashari'}\n`;
  text += `**Ayanamsa:** ${chart.ayanamsa} (${chart.ayanamsaValue.toFixed(4)}°)\n\n`;

  text += `## Basic Details\n`;
  text += `- **Ascendant (Lagna):** ${chart.ascendantSign}\n`;
  text += `- **Moon Sign (Rashi):** ${chart.moonSign}\n`;
  text += `- **Sun Sign:** ${chart.sunSign}\n\n`;

  text += `## Planetary Positions\n\n`;
  text += `| Planet | Sign | Degree | Nakshatra | House | Retrograde |\n`;
  text += `|--------|------|--------|-----------|-------|------------|\n`;

  chart.planets.forEach((planet) => {
    const retro = planet.isRetrograde ? 'R' : '';
    text += `| ${planet.planet} | ${planet.signName} | ${planet.degree}°${planet.minute}'${planet.second}" | ${planet.nakshatra} (${planet.nakshatraPada}) | ${planet.house} | ${retro} |\n`;
  });

  text += `\n## House Analysis\n\n`;
  chart.houses.forEach((house) => {
    text += `**House ${house.house} (${house.signName}):** Lord - ${house.lord}`;
    if (house.planets.length > 0) {
      text += `, Planets - ${house.planets.join(', ')}`;
    }
    text += `\n`;
  });

  return text;
}

/**
 * Get planet details with dignity analysis
 */
export function analyzePlanetDignity(planet: PlanetPosition): {
  dignity: string;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
} {
  const exaltationSigns: { [key: string]: string } = {
    Sun: 'Aries',
    Moon: 'Taurus',
    Mars: 'Capricorn',
    Mercury: 'Virgo',
    Jupiter: 'Cancer',
    Venus: 'Pisces',
    Saturn: 'Libra',
  };

  const debilitationSigns: { [key: string]: string } = {
    Sun: 'Libra',
    Moon: 'Scorpio',
    Mars: 'Cancer',
    Mercury: 'Pisces',
    Jupiter: 'Capricorn',
    Venus: 'Virgo',
    Saturn: 'Aries',
  };

  const ownSigns: { [key: string]: string[] } = {
    Sun: ['Leo'],
    Moon: ['Cancer'],
    Mars: ['Aries', 'Scorpio'],
    Mercury: ['Gemini', 'Virgo'],
    Jupiter: ['Sagittarius', 'Pisces'],
    Venus: ['Taurus', 'Libra'],
    Saturn: ['Capricorn', 'Aquarius'],
  };

  if (exaltationSigns[planet.planet] === planet.signName) {
    return {
      dignity: 'Exalted',
      strength: 'strong',
      description: `${planet.planet} is exalted in ${planet.signName}, giving maximum strength and positive results.`,
    };
  }

  if (debilitationSigns[planet.planet] === planet.signName) {
    return {
      dignity: 'Debilitated',
      strength: 'weak',
      description: `${planet.planet} is debilitated in ${planet.signName}, indicating challenges that require effort to overcome.`,
    };
  }

  if (ownSigns[planet.planet]?.includes(planet.signName)) {
    return {
      dignity: 'Own Sign',
      strength: 'strong',
      description: `${planet.planet} is in its own sign ${planet.signName}, giving comfortable and reliable results.`,
    };
  }

  return {
    dignity: 'Neutral',
    strength: 'moderate',
    description: `${planet.planet} in ${planet.signName} has moderate strength and mixed results based on aspects and conjunctions.`,
  };
}
