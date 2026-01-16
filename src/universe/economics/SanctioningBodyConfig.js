/**
 * Configuration for boxing sanctioning bodies
 * Each body has unique ranking criteria reflecting real-world differences:
 * - WBC: Most transparent, points-based, values activity
 * - WBA: More political, popularity/star power matters
 * - IBF: Strictest, requires ranked wins, harsh inactivity penalties
 * - WBO: Balanced approach
 */

export const SanctioningBodyConfig = {
  WBC: {
    name: 'World Boxing Council',
    abbreviation: 'WBC',
    founded: 1963,
    maxRanked: 15,

    // Ranking weights (must sum to 100)
    weights: {
      winPercentage: 25,      // Lower - more forgiving of losses
      recordQuality: 15,
      koPercentage: 10,
      activity: 20,           // Highest activity weight
      winStreak: 10,
      qualityOfOpposition: 15,
      popularity: 5           // Some star factor
    },

    // Activity requirements
    activity: {
      maxInactiveWeeks: 52,   // 1 year before ranking penalty
      inactivityPenaltyPerWeek: 1.5,  // Points lost per week over limit
      minimumFightsPerYear: 1
    },

    // Entry requirements
    entryRequirements: {
      minimumWins: 8,
      minimumProFights: 10,
      maxLosses: 5,
      requiresRankedWin: false
    },

    // Mandatory rules
    mandatory: {
      weeksBeforeMandatory: 52,
      allowStepAside: true,
      interimAllowed: true
    }
  },

  WBA: {
    name: 'World Boxing Association',
    abbreviation: 'WBA',
    founded: 1921,
    maxRanked: 15,

    weights: {
      winPercentage: 30,
      recordQuality: 15,
      koPercentage: 8,
      activity: 12,           // Lower activity weight
      winStreak: 10,
      qualityOfOpposition: 15,
      popularity: 10          // Highest popularity weight (political)
    },

    activity: {
      maxInactiveWeeks: 65,   // Most lenient
      inactivityPenaltyPerWeek: 1.0,
      minimumFightsPerYear: 1
    },

    entryRequirements: {
      minimumWins: 10,
      minimumProFights: 12,
      maxLosses: 4,
      requiresRankedWin: false
    },

    mandatory: {
      weeksBeforeMandatory: 65,
      allowStepAside: true,
      interimAllowed: true,
      superChampionTier: true  // WBA "super" champion system
    }
  },

  IBF: {
    name: 'International Boxing Federation',
    abbreviation: 'IBF',
    founded: 1983,
    maxRanked: 15,

    weights: {
      winPercentage: 35,      // Strictest - wins matter most
      recordQuality: 25,      // Highest quality weight
      koPercentage: 5,
      activity: 15,
      winStreak: 5,
      qualityOfOpposition: 15,
      popularity: 0           // No star factor - pure merit
    },

    activity: {
      maxInactiveWeeks: 39,   // Strictest - 9 months
      inactivityPenaltyPerWeek: 2.5,  // Harshest penalty
      minimumFightsPerYear: 2  // Must fight twice yearly
    },

    entryRequirements: {
      minimumWins: 12,
      minimumProFights: 15,
      maxLosses: 3,
      requiresRankedWin: true  // Must beat a ranked opponent to enter top 15
    },

    mandatory: {
      weeksBeforeMandatory: 39,  // Fastest mandatory
      allowStepAside: false,     // No step-asides
      interimAllowed: false      // No interim champions
    }
  },

  WBO: {
    name: 'World Boxing Organization',
    abbreviation: 'WBO',
    founded: 1988,
    maxRanked: 15,

    weights: {
      winPercentage: 30,
      recordQuality: 20,
      koPercentage: 10,
      activity: 15,
      winStreak: 10,
      qualityOfOpposition: 15,
      popularity: 0
    },

    activity: {
      maxInactiveWeeks: 52,
      inactivityPenaltyPerWeek: 2.0,
      minimumFightsPerYear: 1
    },

    entryRequirements: {
      minimumWins: 10,
      minimumProFights: 12,
      maxLosses: 4,
      requiresRankedWin: false
    },

    mandatory: {
      weeksBeforeMandatory: 52,
      allowStepAside: true,
      interimAllowed: true
    }
  }
};

/**
 * Get all sanctioning body codes
 */
export function getAllBodyCodes() {
  return Object.keys(SanctioningBodyConfig);
}

/**
 * Get config for a specific body
 */
export function getBodyConfig(bodyCode) {
  return SanctioningBodyConfig[bodyCode] || null;
}

/**
 * Get the most lenient inactivity limit across all bodies
 */
export function getMostLenientInactivityLimit() {
  return Math.max(...Object.values(SanctioningBodyConfig).map(c => c.activity.maxInactiveWeeks));
}

/**
 * Get the strictest inactivity limit across all bodies
 */
export function getStrictestInactivityLimit() {
  return Math.min(...Object.values(SanctioningBodyConfig).map(c => c.activity.maxInactiveWeeks));
}

export default SanctioningBodyConfig;
