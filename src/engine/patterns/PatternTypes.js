/**
 * PatternTypes - Definitions for fighter behavior patterns
 *
 * Patterns are discovered from accumulated fight history and used to:
 * - Predict future fight outcomes
 * - Inform matchmaking decisions
 * - Generate narrative/commentary
 * - Identify career trajectory changes
 */

/**
 * Pattern categories
 */
export const PatternCategory = {
  PERFORMANCE: 'PERFORMANCE',     // How fighter performs under conditions
  STYLE: 'STYLE',                 // Fighting style tendencies
  PHYSICAL: 'PHYSICAL',           // Physical durability patterns
  MENTAL: 'MENTAL',               // Psychological patterns
  CAREER: 'CAREER'                // Career trajectory patterns
};

/**
 * Pattern confidence thresholds
 */
export const ConfidenceLevel = {
  LOW: 0.3,       // Possible pattern, limited evidence
  MODERATE: 0.5,  // Likely pattern, some evidence
  HIGH: 0.7,      // Strong pattern, good evidence
  VERY_HIGH: 0.85 // Very reliable pattern, extensive evidence
};

/**
 * Minimum sample sizes for pattern detection
 */
export const MinSampleSize = {
  BASIC: 3,       // Minimum for any pattern
  RELIABLE: 5,    // For moderate confidence
  STRONG: 8,      // For high confidence
  DEFINITIVE: 12  // For very high confidence
};

/**
 * Pattern definitions with detection criteria
 */
export const PatternDefinitions = {
  // ============================================
  // PERFORMANCE PATTERNS
  // ============================================

  CLUTCH_PERFORMER: {
    id: 'clutch_performer',
    name: 'Clutch Performer',
    category: PatternCategory.PERFORMANCE,
    description: 'Performs better in high-stakes fights (title fights, big events)',
    positive: true,
    detection: {
      metric: 'bigFightWinRate',
      threshold: 0.65,          // Wins 65%+ of big fights
      comparisonMetric: 'overallWinRate',
      comparisonDelta: 0.10     // At least 10% better than overall
    },
    effects: {
      titleFightBonus: 0.05,    // 5% performance boost in title fights
      pressureResistance: 0.10
    }
  },

  CHOKES_UNDER_PRESSURE: {
    id: 'chokes_under_pressure',
    name: 'Chokes Under Pressure',
    category: PatternCategory.PERFORMANCE,
    description: 'Underperforms in high-stakes situations',
    positive: false,
    detection: {
      metric: 'bigFightWinRate',
      threshold: 0.35,          // Wins less than 35% of big fights
      comparisonMetric: 'overallWinRate',
      comparisonDelta: -0.15    // At least 15% worse than overall
    },
    effects: {
      titleFightPenalty: -0.08,
      pressureVulnerability: 0.15
    }
  },

  SLOW_STARTER: {
    id: 'slow_starter',
    name: 'Slow Starter',
    category: PatternCategory.PERFORMANCE,
    description: 'Tends to lose early rounds but improves as fight progresses',
    positive: null,             // Neutral - has tradeoffs
    detection: {
      metric: 'earlyRoundWinRate',
      threshold: 0.35,
      comparisonMetric: 'lateRoundWinRate',
      comparisonDelta: -0.20
    },
    effects: {
      earlyRoundPenalty: -0.10,
      lateRoundBonus: 0.08
    }
  },

  FAST_STARTER: {
    id: 'fast_starter',
    name: 'Fast Starter',
    category: PatternCategory.PERFORMANCE,
    description: 'Dominates early rounds but may fade',
    positive: null,
    detection: {
      metric: 'earlyRoundWinRate',
      threshold: 0.70,
      comparisonMetric: 'lateRoundWinRate',
      comparisonDelta: 0.15
    },
    effects: {
      earlyRoundBonus: 0.10,
      lateRoundPenalty: -0.05
    }
  },

  COMEBACK_SPECIALIST: {
    id: 'comeback_specialist',
    name: 'Comeback Specialist',
    category: PatternCategory.PERFORMANCE,
    description: 'Often wins after being hurt or behind on cards',
    positive: true,
    detection: {
      metric: 'comebackWinRate',
      threshold: 0.40,          // Wins 40%+ when hurt/behind
      minOccurrences: 3
    },
    effects: {
      hurtRecoveryBonus: 0.15,
      heartBonus: 5
    }
  },

  // ============================================
  // STYLE PATTERNS
  // ============================================

  PRESSURE_DESTROYER: {
    id: 'pressure_destroyer',
    name: 'Pressure Destroyer',
    category: PatternCategory.STYLE,
    description: 'Excels against pressure fighters and swarmers',
    positive: true,
    detection: {
      metric: 'winRateVsPressure',
      threshold: 0.70,
      minOccurrences: 4
    },
    effects: {
      vsPressureFighterBonus: 0.12
    }
  },

  BOXER_KILLER: {
    id: 'boxer_killer',
    name: 'Boxer Killer',
    category: PatternCategory.STYLE,
    description: 'Effective at cutting off and catching pure boxers',
    positive: true,
    detection: {
      metric: 'winRateVsBoxer',
      threshold: 0.70,
      minOccurrences: 4
    },
    effects: {
      vsOutBoxerBonus: 0.12
    }
  },

  COUNTER_PUNCHER_SPECIALIST: {
    id: 'counter_specialist',
    name: 'Counter Specialist',
    category: PatternCategory.STYLE,
    description: 'High percentage of wins via counter punching',
    positive: true,
    detection: {
      metric: 'counterPunchKORate',
      threshold: 0.30,          // 30%+ of KOs via counters
      minOccurrences: 3
    },
    effects: {
      counterDamageBonus: 0.15,
      timingBonus: 5
    }
  },

  BODY_PUNCHER: {
    id: 'body_puncher',
    name: 'Body Puncher',
    category: PatternCategory.STYLE,
    description: 'Consistently targets body and wears down opponents',
    positive: true,
    detection: {
      metric: 'bodyPunchRate',
      threshold: 0.35,
      metric2: 'bodyKORate',
      threshold2: 0.15
    },
    effects: {
      bodyDamageBonus: 0.10,
      opponentStaminaDrain: 0.05
    }
  },

  KO_ARTIST: {
    id: 'ko_artist',
    name: 'KO Artist',
    category: PatternCategory.STYLE,
    description: 'Consistently finishes fights early',
    positive: true,
    detection: {
      metric: 'koRate',
      threshold: 0.70,
      minWins: 5
    },
    effects: {
      knockoutPowerBonus: 5,
      intimidationBonus: 0.10
    }
  },

  DECISION_MACHINE: {
    id: 'decision_machine',
    name: 'Decision Machine',
    category: PatternCategory.STYLE,
    description: 'Wins most fights by decision, rarely gets stopped',
    positive: null,
    detection: {
      metric: 'decisionWinRate',
      threshold: 0.60,
      metric2: 'timesStoppedRate',
      threshold2: 0.10
    },
    effects: {
      enduranceBonus: 5,
      judgeAppealBonus: 0.05
    }
  },

  // ============================================
  // PHYSICAL PATTERNS
  // ============================================

  IRON_CHIN: {
    id: 'iron_chin',
    name: 'Iron Chin',
    category: PatternCategory.PHYSICAL,
    description: 'Rarely gets knocked down or stopped',
    positive: true,
    detection: {
      metric: 'knockdownsReceivedPerFight',
      threshold: 0.15,
      metric2: 'timesStoppedRate',
      threshold2: 0.08,
      minFights: 8
    },
    effects: {
      chinBonus: 8,
      knockdownResistance: 0.20
    }
  },

  GLASS_CHIN: {
    id: 'glass_chin',
    name: 'Glass Chin',
    category: PatternCategory.PHYSICAL,
    description: 'Gets hurt frequently and struggles to recover',
    positive: false,
    detection: {
      metric: 'knockdownsReceivedPerFight',
      threshold: 0.50,
      metric2: 'timesStoppedRate',
      threshold2: 0.25,
      minFights: 5
    },
    effects: {
      chinPenalty: -8,
      knockdownVulnerability: 0.25
    }
  },

  CHIN_DEGRADING: {
    id: 'chin_degrading',
    name: 'Chin Degrading',
    category: PatternCategory.PHYSICAL,
    description: 'Getting hurt more frequently as career progresses',
    positive: false,
    detection: {
      metric: 'recentKnockdownRate',
      comparisonMetric: 'earlyCareerKnockdownRate',
      comparisonDelta: 0.30     // 30% more knockdowns recently
    },
    effects: {
      chinDegradation: -3,
      retirementPressure: 0.15
    }
  },

  CARDIO_MACHINE: {
    id: 'cardio_machine',
    name: 'Cardio Machine',
    category: PatternCategory.PHYSICAL,
    description: 'Maintains high work rate throughout fights',
    positive: true,
    detection: {
      metric: 'lateRoundPunchOutput',
      comparisonMetric: 'earlyRoundPunchOutput',
      comparisonDelta: -0.15    // Less than 15% drop in output
    },
    effects: {
      cardioBonus: 8,
      workRateBonus: 0.10
    }
  },

  FADES_LATE: {
    id: 'fades_late',
    name: 'Fades Late',
    category: PatternCategory.PHYSICAL,
    description: 'Punch output and effectiveness drop significantly in late rounds',
    positive: false,
    detection: {
      metric: 'lateRoundPunchOutput',
      comparisonMetric: 'earlyRoundPunchOutput',
      comparisonDelta: -0.40    // 40%+ drop in output
    },
    effects: {
      cardioPenalty: -5,
      lateRoundVulnerability: 0.15
    }
  },

  // ============================================
  // MENTAL PATTERNS
  // ============================================

  KILLER_INSTINCT: {
    id: 'killer_instinct',
    name: 'Killer Instinct',
    category: PatternCategory.MENTAL,
    description: 'Finishes hurt opponents consistently',
    positive: true,
    detection: {
      metric: 'finishRateWhenOpponentHurt',
      threshold: 0.70,
      minOccurrences: 4
    },
    effects: {
      killerInstinctBonus: 10,
      hurtOpponentDamageBonus: 0.15
    }
  },

  LETS_OPPONENTS_OFF: {
    id: 'lets_off_hook',
    name: 'Lets Opponents Off The Hook',
    category: PatternCategory.MENTAL,
    description: 'Fails to capitalize when opponent is hurt',
    positive: false,
    detection: {
      metric: 'finishRateWhenOpponentHurt',
      threshold: 0.30,
      minOccurrences: 4
    },
    effects: {
      killerInstinctPenalty: -8,
      missedOpportunityRate: 0.20
    }
  },

  FRONTRUNNER: {
    id: 'frontrunner',
    name: 'Frontrunner',
    category: PatternCategory.MENTAL,
    description: 'Dominant when ahead, struggles when behind',
    positive: null,
    detection: {
      metric: 'winRateWhenAhead',
      threshold: 0.85,
      metric2: 'winRateWhenBehind',
      threshold2: 0.25
    },
    effects: {
      aheadBonus: 0.10,
      behindPenalty: -0.15
    }
  },

  WARRIOR_HEART: {
    id: 'warrior_heart',
    name: 'Warrior Heart',
    category: PatternCategory.MENTAL,
    description: 'Never gives up, fights hard even when losing',
    positive: true,
    detection: {
      metric: 'fightsThroughAdversity',
      threshold: 0.60,
      metric2: 'quitRate',
      threshold2: 0.05
    },
    effects: {
      heartBonus: 10,
      adversityResistance: 0.20
    }
  },

  // ============================================
  // CAREER PATTERNS
  // ============================================

  LATE_BLOOMER: {
    id: 'late_bloomer',
    name: 'Late Bloomer',
    category: PatternCategory.CAREER,
    description: 'Improved significantly after early career struggles',
    positive: true,
    detection: {
      metric: 'recentWinRate',
      threshold: 0.80,
      comparisonMetric: 'earlyCareerWinRate',
      comparisonDelta: 0.25
    },
    effects: {
      growthPotential: 0.10
    }
  },

  PEAKED_EARLY: {
    id: 'peaked_early',
    name: 'Peaked Early',
    category: PatternCategory.CAREER,
    description: 'Best years are behind them',
    positive: false,
    detection: {
      metric: 'recentWinRate',
      comparisonMetric: 'peakWinRate',
      comparisonDelta: -0.30
    },
    effects: {
      declineRate: 0.10,
      retirementPressure: 0.20
    }
  },

  GATEKEEPER: {
    id: 'gatekeeper',
    name: 'Gatekeeper',
    category: PatternCategory.CAREER,
    description: 'Beats lower-tier opponents but loses to elite',
    positive: null,
    detection: {
      metric: 'winRateVsLowerTier',
      threshold: 0.75,
      metric2: 'winRateVsElite',
      threshold2: 0.25
    },
    effects: {
      vsLowerTierBonus: 0.10,
      vsElitePenalty: -0.10
    }
  },

  ACTIVITY_DEPENDENT: {
    id: 'activity_dependent',
    name: 'Activity Dependent',
    category: PatternCategory.CAREER,
    description: 'Performs better with regular activity, struggles after layoffs',
    positive: null,
    detection: {
      metric: 'winRateAfterLayoff',
      threshold: 0.40,
      comparisonMetric: 'winRateWithActivity',
      comparisonDelta: -0.25
    },
    effects: {
      layoffPenalty: -0.12,
      activityBonus: 0.05
    }
  }
};

/**
 * Get pattern definition by ID
 */
export const getPatternDefinition = (patternId) =>
  PatternDefinitions[patternId] ||
  Object.values(PatternDefinitions).find(p => p.id === patternId);

/**
 * Get all patterns in a category
 */
export const getPatternsByCategory = (category) =>
  Object.values(PatternDefinitions).filter(p => p.category === category);

/**
 * Get all positive/negative patterns
 */
export const getPositivePatterns = () =>
  Object.values(PatternDefinitions).filter(p => p.positive === true);

export const getNegativePatterns = () =>
  Object.values(PatternDefinitions).filter(p => p.positive === false);

export default PatternDefinitions;
