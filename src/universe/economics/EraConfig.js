/**
 * Era Configuration System
 * Defines economic parameters for different boxing eras
 * Supports both simplified and historically researched modes
 */

// Era definitions
export const BoxingEra = {
  GOLDEN_AGE: 'GOLDEN_AGE',     // 1920-1959: Gate-only, small venues
  TV_ERA: 'TV_ERA',             // 1960-1979: Closed-circuit TV, Ali era
  PPV_ERA: 'PPV_ERA',           // 1980-2009: Home PPV dominance
  MODERN: 'MODERN'              // 2010+: Streaming hybrid, mega-purses
};

// Revenue model types (changes by era)
export const RevenueModel = {
  GATE_ONLY: 'GATE_ONLY',                 // Pre-1960: gate is everything
  CLOSED_CIRCUIT_TV: 'CLOSED_CIRCUIT_TV', // 1960s-1970s: theater broadcasts
  PPV_DOMINANT: 'PPV_DOMINANT',           // 1980s-2000s: home PPV
  STREAMING_HYBRID: 'STREAMING_HYBRID'    // 2010s+: PPV + streaming
};

// Realism levels
export const RealismLevel = {
  SIMPLIFIED: 'SIMPLIFIED',     // Easy brackets, approximations
  RESEARCHED: 'RESEARCHED'      // Historical accuracy with decade interpolation
};

export class EraConfig {
  // Division financial multipliers (constant across eras)
  // Based on historical revenue patterns in boxing
  static DIVISION_MULTIPLIERS = {
    'Heavyweight': 2.0,           // King of boxing
    'Cruiserweight': 0.8,         // Relatively new division
    'Light Heavyweight': 1.0,     // Solid but not glamour
    'Super Middleweight': 0.9,    // Tweener division
    'Middleweight': 1.2,          // Historic glamour division
    'Super Welterweight': 1.3,    // 154 has had stars
    'Welterweight': 1.5,          // Sugar Ray, Pacquiao, etc.
    'Super Lightweight': 0.9,     // 140 division
    'Lightweight': 1.0,           // Historic division
    'Super Featherweight': 0.7,   // 130
    'Featherweight': 0.7,         // Historic but small
    'Super Bantamweight': 0.5,    // Limited following
    'Bantamweight': 0.5,          // Limited following
    'Super Flyweight': 0.4,       // Niche
    'Flyweight': 0.3,             // Smallest following
    'Light Flyweight': 0.3,       // Very niche
    'Minimumweight': 0.25         // Smallest division
  };

  // Era configurations
  static ERA_CONFIGS = {
    [BoxingEra.GOLDEN_AGE]: {
      name: 'Golden Age',
      yearRange: { start: 1920, end: 1959 },
      revenueModel: RevenueModel.GATE_ONLY,
      description: 'Gate-only economics, legendary champions like Dempsey & Louis',
      defaultStartYear: 1925,
      simplified: {
        inflationMultiplier: 0.03,    // $1 in 1940 ≈ $0.03 in 2020
        basePPVPrice: 0,              // No PPV
        maxPPVBuys: 0,
        baseTicketPrice: 5,           // $5 average ticket
        maxVenueCapacity: 100000,     // Huge outdoor venues possible
        broadcastRights: 0,           // Radio only, minimal
        purseSplitToRevenue: 0.50,    // Fighters got larger share
        sponsorshipMultiplier: 0.1    // Minimal sponsorship
      },
      researched: {
        inflationByDecade: {
          1920: 0.020,
          1930: 0.025,
          1940: 0.030,
          1950: 0.045
        },
        historicalPurses: {
          // Joe Louis vs Max Schmeling 2: ~$350K purse each
          megaFight: 350000,
          titleFight: 50000,
          mainEvent: 10000,
          clubFight: 500
        },
        ppvPriceByYear: {} // No PPV
      }
    },

    [BoxingEra.TV_ERA]: {
      name: 'TV Era',
      yearRange: { start: 1960, end: 1979 },
      revenueModel: RevenueModel.CLOSED_CIRCUIT_TV,
      description: 'Closed-circuit TV, the Ali era begins',
      defaultStartYear: 1965,
      simplified: {
        inflationMultiplier: 0.12,    // 1970 dollars
        basePPVPrice: 0,              // Closed circuit, not home PPV
        maxPPVBuys: 0,
        baseTicketPrice: 25,          // Higher ticket prices
        maxVenueCapacity: 50000,      // Arenas
        closedCircuitMultiplier: 0.5, // 50% of gate from closed circuit
        maxClosedCircuitVenues: 300,  // Theaters showing fight
        broadcastRights: 500000,      // Network TV rights
        purseSplitToRevenue: 0.55,    // Ali got 55%+
        sponsorshipMultiplier: 0.3    // Growing sponsorship
      },
      researched: {
        inflationByDecade: {
          1960: 0.08,
          1970: 0.15
        },
        historicalPurses: {
          // Ali vs Frazier I: $2.5M each
          megaFight: 2500000,
          titleFight: 200000,
          mainEvent: 30000,
          clubFight: 1500
        },
        ppvPriceByYear: {} // No home PPV yet
      }
    },

    [BoxingEra.PPV_ERA]: {
      name: 'PPV Era',
      yearRange: { start: 1980, end: 2009 },
      revenueModel: RevenueModel.PPV_DOMINANT,
      description: 'Pay-per-view dominance, Tyson & heavyweight revival',
      defaultStartYear: 1995,
      simplified: {
        inflationMultiplier: 0.50,    // Mid-90s dollars
        basePPVPrice: 49.99,          // $49.99 in 1990s
        maxPPVBuys: 2000000,          // Tyson could hit 2M
        baseTicketPrice: 150,         // Casino venues
        maxVenueCapacity: 20000,      // Arenas
        broadcastRights: 2000000,     // Premium cable deals
        purseSplitToRevenue: 0.60,    // Standard 60%
        sponsorshipMultiplier: 1.0    // Full sponsorship era
      },
      researched: {
        inflationByDecade: {
          1980: 0.30,
          1990: 0.50,
          2000: 0.70
        },
        historicalPurses: {
          // Tyson vs Holyfield: $30M/$11M
          megaFight: 30000000,
          titleFight: 3000000,
          mainEvent: 500000,
          clubFight: 10000
        },
        ppvPriceByYear: {
          1985: 19.99,
          1990: 34.99,
          1995: 49.99,
          2000: 54.99,
          2005: 54.99
        }
      }
    },

    [BoxingEra.MODERN]: {
      name: 'Modern Era',
      yearRange: { start: 2010, end: 2100 },
      revenueModel: RevenueModel.STREAMING_HYBRID,
      description: 'Streaming hybrid, mega-purses, global reach',
      defaultStartYear: 2020,
      simplified: {
        inflationMultiplier: 1.0,     // Base (2020 dollars)
        basePPVPrice: 79.99,          // $79.99 modern PPV
        maxPPVBuys: 4000000,          // Mega fights can hit 4M
        baseTicketPrice: 250,         // Premium pricing
        maxVenueCapacity: 80000,      // Stadium shows
        broadcastRights: 5000000,     // Big broadcast deals
        streamingBonus: 0.2,          // Extra 20% from streaming
        purseSplitToRevenue: 0.60,    // Standard 60%
        sponsorshipMultiplier: 1.5    // Global sponsors
      },
      researched: {
        inflationByDecade: {
          2010: 0.85,
          2020: 1.0
        },
        historicalPurses: {
          // Mayweather vs Pacquiao: $250M+
          megaFight: 250000000,
          titleFight: 10000000,
          mainEvent: 1000000,
          clubFight: 25000
        },
        ppvPriceByYear: {
          2010: 59.99,
          2015: 69.99,
          2020: 79.99
        }
      }
    }
  };

  /**
   * Get era from year
   * @param {number} year
   * @returns {string} BoxingEra value
   */
  static getEraFromYear(year) {
    for (const [era, config] of Object.entries(this.ERA_CONFIGS)) {
      if (year >= config.yearRange.start && year <= config.yearRange.end) {
        return era;
      }
    }
    // Default to modern for future dates
    return BoxingEra.MODERN;
  }

  /**
   * Get full era configuration
   * @param {string} era - BoxingEra value
   * @param {string} realismLevel - RealismLevel value
   * @returns {object} Era configuration with settings
   */
  static getConfig(era, realismLevel = RealismLevel.SIMPLIFIED) {
    const baseConfig = this.ERA_CONFIGS[era];
    if (!baseConfig) {
      return this.ERA_CONFIGS[BoxingEra.MODERN];
    }

    return {
      ...baseConfig,
      settings: realismLevel === RealismLevel.RESEARCHED
        ? baseConfig.researched
        : baseConfig.simplified
    };
  }

  /**
   * Get inflation multiplier for specific year
   * In simplified mode, returns era's fixed multiplier
   * In researched mode, interpolates between decade values
   * @param {number} year
   * @param {string} realismLevel
   * @returns {number} Multiplier (0.02 to 1.0)
   */
  static getInflationMultiplier(year, realismLevel = RealismLevel.SIMPLIFIED) {
    const era = this.getEraFromYear(year);
    const config = this.getConfig(era, realismLevel);

    if (realismLevel === RealismLevel.SIMPLIFIED) {
      return config.settings.inflationMultiplier || config.simplified.inflationMultiplier;
    }

    // Researched: interpolate between decade values
    const inflationData = config.settings.inflationByDecade || config.researched.inflationByDecade;
    const decades = Object.keys(inflationData)
      .map(Number)
      .sort((a, b) => a - b);

    if (decades.length === 0) return 1.0;
    if (year <= decades[0]) return inflationData[decades[0]];
    if (year >= decades[decades.length - 1]) return inflationData[decades[decades.length - 1]];

    for (let i = 0; i < decades.length - 1; i++) {
      if (year >= decades[i] && year < decades[i + 1]) {
        const progress = (year - decades[i]) / (decades[i + 1] - decades[i]);
        const startVal = inflationData[decades[i]];
        const endVal = inflationData[decades[i + 1]];
        return startVal + (endVal - startVal) * progress;
      }
    }

    return inflationData[decades[decades.length - 1]] || 1.0;
  }

  /**
   * Get PPV price for year
   * @param {number} year
   * @param {string} realismLevel
   * @returns {number} PPV price in dollars (0 if no PPV available)
   */
  static getPPVPrice(year, realismLevel = RealismLevel.SIMPLIFIED) {
    // No PPV before 1980
    if (year < 1980) return 0;

    const era = this.getEraFromYear(year);
    const config = this.getConfig(era, realismLevel);

    if (realismLevel === RealismLevel.SIMPLIFIED) {
      return config.settings.basePPVPrice || config.simplified.basePPVPrice || 0;
    }

    // Researched: interpolate PPV prices
    const prices = config.settings.ppvPriceByYear || config.researched.ppvPriceByYear || {};
    const years = Object.keys(prices).map(Number).sort((a, b) => a - b);

    if (years.length === 0) {
      // Fall back to simplified
      return config.simplified.basePPVPrice || 0;
    }
    if (year <= years[0]) return prices[years[0]];
    if (year >= years[years.length - 1]) return prices[years[years.length - 1]];

    for (let i = 0; i < years.length - 1; i++) {
      if (year >= years[i] && year < years[i + 1]) {
        const progress = (year - years[i]) / (years[i + 1] - years[i]);
        return prices[years[i]] + (prices[years[i + 1]] - prices[years[i]]) * progress;
      }
    }

    return 79.99; // Default modern
  }

  /**
   * Get division multiplier
   * @param {string} divisionName
   * @returns {number} Multiplier (0.25 to 2.0)
   */
  static getDivisionMultiplier(divisionName) {
    return this.DIVISION_MULTIPLIERS[divisionName] || 1.0;
  }

  /**
   * Check if PPV is available in this year
   * @param {number} year
   * @returns {boolean}
   */
  static hasPPV(year) {
    return year >= 1980;
  }

  /**
   * Check if streaming is available
   * @param {number} year
   * @returns {boolean}
   */
  static hasStreaming(year) {
    return year >= 2010;
  }

  /**
   * Get revenue model for year
   * @param {number} year
   * @returns {string} RevenueModel value
   */
  static getRevenueModel(year) {
    const era = this.getEraFromYear(year);
    return this.ERA_CONFIGS[era]?.revenueModel || RevenueModel.PPV_DOMINANT;
  }

  /**
   * Get purse split ratio (fighter percentage of revenue)
   * @param {number} year
   * @param {string} realismLevel
   * @returns {number} 0.5 to 0.6 typically
   */
  static getPurseSplitRatio(year, realismLevel = RealismLevel.SIMPLIFIED) {
    const era = this.getEraFromYear(year);
    const config = this.getConfig(era, realismLevel);
    return config.settings.purseSplitToRevenue || config.simplified.purseSplitToRevenue || 0.60;
  }

  /**
   * Get base ticket price for era
   * @param {number} year
   * @param {string} realismLevel
   * @returns {number} Base ticket price in dollars
   */
  static getBaseTicketPrice(year, realismLevel = RealismLevel.SIMPLIFIED) {
    const era = this.getEraFromYear(year);
    const config = this.getConfig(era, realismLevel);
    return config.settings.baseTicketPrice || config.simplified.baseTicketPrice || 100;
  }

  /**
   * Get max PPV buys possible for era
   * @param {number} year
   * @param {string} realismLevel
   * @returns {number}
   */
  static getMaxPPVBuys(year, realismLevel = RealismLevel.SIMPLIFIED) {
    if (!this.hasPPV(year)) return 0;
    const era = this.getEraFromYear(year);
    const config = this.getConfig(era, realismLevel);
    return config.settings.maxPPVBuys || config.simplified.maxPPVBuys || 1000000;
  }

  /**
   * Get sponsorship multiplier for era
   * @param {number} year
   * @param {string} realismLevel
   * @returns {number} 0.1 to 1.5
   */
  static getSponsorshipMultiplier(year, realismLevel = RealismLevel.SIMPLIFIED) {
    const era = this.getEraFromYear(year);
    const config = this.getConfig(era, realismLevel);
    return config.settings.sponsorshipMultiplier || config.simplified.sponsorshipMultiplier || 1.0;
  }

  /**
   * Get all available eras for UI selection
   * @returns {Array} Era options with id, label, year, description
   */
  static getEraOptions() {
    return [
      {
        id: BoxingEra.GOLDEN_AGE,
        label: 'Golden Age (1920s)',
        year: this.ERA_CONFIGS[BoxingEra.GOLDEN_AGE].defaultStartYear,
        description: this.ERA_CONFIGS[BoxingEra.GOLDEN_AGE].description
      },
      {
        id: BoxingEra.TV_ERA,
        label: 'TV Era (1960s)',
        year: this.ERA_CONFIGS[BoxingEra.TV_ERA].defaultStartYear,
        description: this.ERA_CONFIGS[BoxingEra.TV_ERA].description
      },
      {
        id: BoxingEra.PPV_ERA,
        label: 'PPV Era (1990s)',
        year: this.ERA_CONFIGS[BoxingEra.PPV_ERA].defaultStartYear,
        description: this.ERA_CONFIGS[BoxingEra.PPV_ERA].description
      },
      {
        id: BoxingEra.MODERN,
        label: 'Modern (2020s)',
        year: this.ERA_CONFIGS[BoxingEra.MODERN].defaultStartYear,
        description: this.ERA_CONFIGS[BoxingEra.MODERN].description
      }
    ];
  }
}

export default EraConfig;
