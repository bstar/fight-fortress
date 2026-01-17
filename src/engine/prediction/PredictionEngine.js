/**
 * PredictionEngine - Contextual outcome prediction based on all available data
 *
 * Generates pre-fight predictions using:
 * - Base attribute comparison
 * - Style matchup analysis
 * - Fight conditions (training camp, motivation, physical state)
 * - Pattern-based adjustments from fight history
 * - Contextual factors (stakes, venue, rivalry)
 */

import { PatternAnalyzer } from '../patterns/PatternAnalyzer.js';
import ModelParameters from '../model/ModelParameters.js';

/**
 * Style matchup advantages (rock-paper-scissors relationships)
 */
const STYLE_MATCHUPS = {
  'out-boxer': {
    advantageAgainst: ['slugger', 'brawler'],
    disadvantageAgainst: ['swarmer', 'pressure-fighter'],
    neutral: ['boxer-puncher', 'counter-puncher']
  },
  'swarmer': {
    advantageAgainst: ['out-boxer', 'counter-puncher'],
    disadvantageAgainst: ['slugger', 'boxer-puncher'],
    neutral: ['pressure-fighter', 'brawler']
  },
  'slugger': {
    advantageAgainst: ['swarmer', 'pressure-fighter'],
    disadvantageAgainst: ['out-boxer', 'counter-puncher'],
    neutral: ['boxer-puncher', 'brawler']
  },
  'boxer-puncher': {
    advantageAgainst: ['swarmer', 'brawler'],
    disadvantageAgainst: ['counter-puncher'],
    neutral: ['out-boxer', 'slugger', 'pressure-fighter']
  },
  'counter-puncher': {
    advantageAgainst: ['slugger', 'boxer-puncher'],
    disadvantageAgainst: ['swarmer', 'pressure-fighter'],
    neutral: ['out-boxer', 'brawler']
  },
  'pressure-fighter': {
    advantageAgainst: ['out-boxer', 'counter-puncher'],
    disadvantageAgainst: ['slugger', 'boxer-puncher'],
    neutral: ['swarmer', 'brawler']
  },
  'brawler': {
    advantageAgainst: [],
    disadvantageAgainst: ['out-boxer', 'boxer-puncher'],
    neutral: ['swarmer', 'slugger', 'counter-puncher', 'pressure-fighter']
  },
  'inside-fighter': {
    advantageAgainst: ['out-boxer'],
    disadvantageAgainst: ['slugger'],
    neutral: ['swarmer', 'boxer-puncher', 'counter-puncher', 'pressure-fighter', 'brawler']
  }
};

/**
 * Attribute weights for base prediction calculation
 */
const ATTRIBUTE_WEIGHTS = {
  power: {
    knockoutPower: 0.15,
    powerRight: 0.08,
    powerLeft: 0.05
  },
  speed: {
    handSpeed: 0.10,
    footSpeed: 0.08,
    reflexes: 0.08
  },
  defense: {
    headMovement: 0.08,
    blocking: 0.06,
    ringCutoff: 0.04
  },
  offense: {
    jabAccuracy: 0.06,
    powerAccuracy: 0.06,
    combinationPunching: 0.04
  },
  stamina: {
    cardio: 0.06,
    recoveryRate: 0.04
  },
  mental: {
    chin: 0.10,
    heart: 0.06,
    fightIQ: 0.06,
    killerInstinct: 0.04
  },
  technical: {
    footwork: 0.04,
    distanceManagement: 0.04,
    ringGeneralship: 0.04
  }
};

export class PredictionEngine {
  /**
   * Create prediction engine
   * @param {object} options - Engine options
   */
  constructor(options = {}) {
    this.patternAnalyzer = options.patternAnalyzer || new PatternAnalyzer();
    this.modelParams = options.modelParams || ModelParameters;

    // Configuration
    this.baseDrawRate = options.baseDrawRate || 0.03;
    this.styleMatchupWeight = options.styleMatchupWeight || 0.12;
    this.patternWeight = options.patternWeight || 0.15;
    this.conditionWeight = options.conditionWeight || 0.10;
    this.contextWeight = options.contextWeight || 0.08;
  }

  /**
   * Generate complete prediction for a matchup
   * @param {object} fighterA - Fighter A snapshot or data
   * @param {object} fighterB - Fighter B snapshot or data
   * @param {object} conditions - Fight conditions for both fighters
   * @param {object} context - Fight context (stakes, venue, etc.)
   * @returns {object} Complete prediction
   */
  predict(fighterA, fighterB, conditions = {}, context = {}) {
    // Base prediction from attributes
    const basePrediction = this.baseAttributePrediction(fighterA, fighterB);

    // Style matchup adjustments
    const styleAdjustment = this.styleMatchupAdjustment(fighterA, fighterB);

    // Condition modifiers
    const conditionModifiers = this.applyConditions(conditions);

    // Pattern-based adjustments (if history available)
    const patternAdjustment = this.patternBasedAdjustment(fighterA, fighterB, context);

    // Context adjustments (stakes, venue, etc.)
    const contextAdjustment = this.contextAdjustment(fighterA, fighterB, context);

    // Combine all factors
    const rawProbability = {
      A: basePrediction.A * styleAdjustment.A * conditionModifiers.A *
         patternAdjustment.A * contextAdjustment.A,
      B: basePrediction.B * styleAdjustment.B * conditionModifiers.B *
         patternAdjustment.B * contextAdjustment.B
    };

    // Normalize to sum to 1 (minus draw rate)
    const total = rawProbability.A + rawProbability.B;
    const drawAdjustedTotal = 1 - this.baseDrawRate;

    const winProbability = {
      fighterA: (rawProbability.A / total) * drawAdjustedTotal,
      fighterB: (rawProbability.B / total) * drawAdjustedTotal,
      draw: this.baseDrawRate
    };

    // Predict method distribution
    const expectedMethod = this.predictMethod(fighterA, fighterB, conditions);

    // Predict fight length
    const expectedRounds = this.predictFightLength(fighterA, fighterB, context);

    // Calculate confidence in prediction
    const confidence = this.calculateConfidence(fighterA, fighterB, basePrediction);

    // Identify key factors
    const keyFactors = this.identifyKeyFactors(
      fighterA, fighterB, conditions, context,
      { basePrediction, styleAdjustment, patternAdjustment }
    );

    return {
      modelVersion: this.modelParams.getVersion?.() || 'current',
      winProbability,
      expectedMethod,
      expectedRounds,
      confidence,
      keyFactors,
      breakdown: {
        basePrediction,
        styleAdjustment,
        conditionModifiers,
        patternAdjustment,
        contextAdjustment
      }
    };
  }

  /**
   * Calculate base prediction from fighter attributes
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @returns {object} Base win probabilities
   */
  baseAttributePrediction(fighterA, fighterB) {
    let scoreA = 0;
    let scoreB = 0;

    // Calculate weighted attribute scores
    for (const [category, attributes] of Object.entries(ATTRIBUTE_WEIGHTS)) {
      for (const [attr, weight] of Object.entries(attributes)) {
        const valueA = this.getAttributeValue(fighterA, category, attr);
        const valueB = this.getAttributeValue(fighterB, category, attr);

        if (valueA !== null && valueB !== null) {
          scoreA += valueA * weight;
          scoreB += valueB * weight;
        }
      }
    }

    // Physical advantages
    const reachAdvantage = this.calculateReachAdvantage(fighterA, fighterB);
    const heightAdvantage = this.calculateHeightAdvantage(fighterA, fighterB);

    scoreA += reachAdvantage.A;
    scoreB += reachAdvantage.B;
    scoreA += heightAdvantage.A;
    scoreB += heightAdvantage.B;

    // Normalize to probabilities
    const total = scoreA + scoreB;
    return {
      A: scoreA / total,
      B: scoreB / total,
      differential: (scoreA - scoreB) / total
    };
  }

  /**
   * Get attribute value from fighter data (handles different structures)
   */
  getAttributeValue(fighter, category, attr) {
    // Try direct access
    if (fighter[category]?.[attr] !== undefined) {
      return fighter[category][attr];
    }

    // Try snapshot structure
    if (fighter.snapshot?.[category]?.[attr] !== undefined) {
      return fighter.snapshot[category][attr];
    }

    // Try attributes structure
    if (fighter.attributes?.[category]?.[attr] !== undefined) {
      return fighter.attributes[category][attr];
    }

    return null;
  }

  /**
   * Calculate reach advantage
   */
  calculateReachAdvantage(fighterA, fighterB) {
    const reachA = fighterA.physical?.reach || fighterA.snapshot?.physical?.reach || 180;
    const reachB = fighterB.physical?.reach || fighterB.snapshot?.physical?.reach || 180;

    const diff = reachA - reachB;
    const advantage = Math.min(0.05, Math.abs(diff) / 200); // Max 5% advantage

    return {
      A: diff > 0 ? advantage : 0,
      B: diff < 0 ? advantage : 0
    };
  }

  /**
   * Calculate height advantage
   */
  calculateHeightAdvantage(fighterA, fighterB) {
    const heightA = fighterA.physical?.height || fighterA.snapshot?.physical?.height || 180;
    const heightB = fighterB.physical?.height || fighterB.snapshot?.physical?.height || 180;

    const diff = heightA - heightB;
    const advantage = Math.min(0.03, Math.abs(diff) / 300); // Max 3% advantage

    return {
      A: diff > 0 ? advantage : 0,
      B: diff < 0 ? advantage : 0
    };
  }

  /**
   * Calculate style matchup adjustment
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @returns {object} Style adjustment multipliers
   */
  styleMatchupAdjustment(fighterA, fighterB) {
    const styleA = (fighterA.style?.primary || fighterA.snapshot?.style?.primary || 'boxer-puncher').toLowerCase();
    const styleB = (fighterB.style?.primary || fighterB.snapshot?.style?.primary || 'boxer-puncher').toLowerCase();

    let adjustmentA = 1.0;
    let adjustmentB = 1.0;

    const matchupA = STYLE_MATCHUPS[styleA];
    const matchupB = STYLE_MATCHUPS[styleB];

    // Check A's advantage/disadvantage against B's style
    if (matchupA?.advantageAgainst?.includes(styleB)) {
      adjustmentA += this.styleMatchupWeight;
    } else if (matchupA?.disadvantageAgainst?.includes(styleB)) {
      adjustmentA -= this.styleMatchupWeight * 0.8;
    }

    // Check B's advantage/disadvantage against A's style
    if (matchupB?.advantageAgainst?.includes(styleA)) {
      adjustmentB += this.styleMatchupWeight;
    } else if (matchupB?.disadvantageAgainst?.includes(styleA)) {
      adjustmentB -= this.styleMatchupWeight * 0.8;
    }

    return {
      A: Math.max(0.7, adjustmentA),
      B: Math.max(0.7, adjustmentB),
      styleA,
      styleB,
      description: this.describeStyleMatchup(styleA, styleB, adjustmentA, adjustmentB)
    };
  }

  /**
   * Describe style matchup for narrative
   */
  describeStyleMatchup(styleA, styleB, adjA, adjB) {
    if (adjA > adjB + 0.1) {
      return `${styleA} has advantage over ${styleB}`;
    } else if (adjB > adjA + 0.1) {
      return `${styleB} has advantage over ${styleA}`;
    }
    return 'Neutral style matchup';
  }

  /**
   * Apply fight condition modifiers
   * @param {object} conditions - Conditions for both fighters
   * @returns {object} Condition multipliers
   */
  applyConditions(conditions = {}) {
    const condA = conditions.fighterA || {};
    const condB = conditions.fighterB || {};

    let modifierA = 1.0;
    let modifierB = 1.0;

    // Training camp quality
    modifierA *= 0.9 + (condA.trainingCamp || 1.0) * 0.1;
    modifierB *= 0.9 + (condB.trainingCamp || 1.0) * 0.1;

    // Motivation
    modifierA *= 0.95 + (condA.motivation || 1.0) * 0.05;
    modifierB *= 0.95 + (condB.motivation || 1.0) * 0.05;

    // Physical state
    const stateModifiers = {
      'peak': 1.0,
      'good': 0.97,
      'compromised': 0.92,
      'drained': 0.85
    };
    modifierA *= stateModifiers[condA.physicalState] || 1.0;
    modifierB *= stateModifiers[condB.physicalState] || 1.0;

    // Mental state
    const mentalModifiers = {
      'focused': 1.02,
      'confident': 1.0,
      'nervous': 0.95,
      'overconfident': 0.97,
      'distracted': 0.92
    };
    modifierA *= mentalModifiers[condA.mentalState] || 1.0;
    modifierB *= mentalModifiers[condB.mentalState] || 1.0;

    // Apply any explicit modifiers
    for (const mod of (condA.modifiers || [])) {
      modifierA *= 1 + (mod.bonus || 0) - (mod.penalty || 0);
    }
    for (const mod of (condB.modifiers || [])) {
      modifierB *= 1 + (mod.bonus || 0) - (mod.penalty || 0);
    }

    return {
      A: modifierA,
      B: modifierB
    };
  }

  /**
   * Apply pattern-based adjustments from fight history
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} context - Fight context
   * @returns {object} Pattern adjustment multipliers
   */
  patternBasedAdjustment(fighterA, fighterB, context = {}) {
    const idA = fighterA.id || fighterA.snapshot?.id;
    const idB = fighterB.id || fighterB.snapshot?.id;

    // If no IDs, can't do pattern analysis
    if (!idA && !idB) {
      return { A: 1.0, B: 1.0 };
    }

    let adjustmentA = 1.0;
    let adjustmentB = 1.0;

    // Analyze patterns if IDs available
    const patternsA = idA ? this.patternAnalyzer.analyzePatterns(idA) : { patterns: [] };
    const patternsB = idB ? this.patternAnalyzer.analyzePatterns(idB) : { patterns: [] };

    // Title fight adjustments
    if (context.fightType === 'TITLE_FIGHT' || context.stakes) {
      const clutchA = patternsA.patterns?.find(p => p.id === 'clutch_performer');
      const chokesA = patternsA.patterns?.find(p => p.id === 'chokes_under_pressure');
      const clutchB = patternsB.patterns?.find(p => p.id === 'clutch_performer');
      const chokesB = patternsB.patterns?.find(p => p.id === 'chokes_under_pressure');

      if (clutchA) adjustmentA *= 1 + (clutchA.confidence * 0.08);
      if (chokesA) adjustmentA *= 1 - (chokesA.confidence * 0.10);
      if (clutchB) adjustmentB *= 1 + (clutchB.confidence * 0.08);
      if (chokesB) adjustmentB *= 1 - (chokesB.confidence * 0.10);
    }

    // KO power patterns
    const koArtistA = patternsA.patterns?.find(p => p.id === 'ko_artist');
    const koArtistB = patternsB.patterns?.find(p => p.id === 'ko_artist');
    const glassJawA = patternsA.patterns?.find(p => p.id === 'glass_chin');
    const glassJawB = patternsB.patterns?.find(p => p.id === 'glass_chin');

    // KO artist vs glass jaw is dangerous
    if (koArtistA && glassJawB) {
      adjustmentA *= 1 + (Math.min(koArtistA.confidence, glassJawB.confidence) * 0.12);
    }
    if (koArtistB && glassJawA) {
      adjustmentB *= 1 + (Math.min(koArtistB.confidence, glassJawA.confidence) * 0.12);
    }

    // Chin degradation
    const chinDegradingA = patternsA.patterns?.find(p => p.id === 'chin_degrading');
    const chinDegradingB = patternsB.patterns?.find(p => p.id === 'chin_degrading');

    if (chinDegradingA) adjustmentA *= 1 - (chinDegradingA.confidence * 0.08);
    if (chinDegradingB) adjustmentB *= 1 - (chinDegradingB.confidence * 0.08);

    // Iron chin
    const ironChinA = patternsA.patterns?.find(p => p.id === 'iron_chin');
    const ironChinB = patternsB.patterns?.find(p => p.id === 'iron_chin');

    if (ironChinA) adjustmentA *= 1 + (ironChinA.confidence * 0.05);
    if (ironChinB) adjustmentB *= 1 + (ironChinB.confidence * 0.05);

    return {
      A: adjustmentA,
      B: adjustmentB,
      patternsA: patternsA.patterns?.map(p => p.id) || [],
      patternsB: patternsB.patterns?.map(p => p.id) || []
    };
  }

  /**
   * Apply context-based adjustments
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} context - Fight context
   * @returns {object} Context adjustment multipliers
   */
  contextAdjustment(fighterA, fighterB, context = {}) {
    let adjustmentA = 1.0;
    let adjustmentB = 1.0;

    // Home advantage (if venue info available)
    if (context.homeAdvantage === 'A') {
      adjustmentA *= 1.03;
    } else if (context.homeAdvantage === 'B') {
      adjustmentB *= 1.03;
    }

    // Rivalry intensity can favor the more motivated fighter
    if (context.isRivalry && context.rivalryFavored) {
      if (context.rivalryFavored === 'A') {
        adjustmentA *= 1.02;
      } else {
        adjustmentB *= 1.02;
      }
    }

    // Public pressure can affect some fighters negatively
    if (context.publicPressure > 0.8) {
      // High pressure slightly favors experienced fighters
      const expA = fighterA.career?.record?.wins || fighterA.record?.wins || 0;
      const expB = fighterB.career?.record?.wins || fighterB.record?.wins || 0;

      if (expA > expB + 10) {
        adjustmentA *= 1.02;
      } else if (expB > expA + 10) {
        adjustmentB *= 1.02;
      }
    }

    // Layoff consideration
    const layoffA = fighterA.career?.weeksInactive || 0;
    const layoffB = fighterB.career?.weeksInactive || 0;

    if (layoffA > 52) adjustmentA *= 0.95; // Ring rust
    if (layoffB > 52) adjustmentB *= 0.95;

    return {
      A: adjustmentA,
      B: adjustmentB
    };
  }

  /**
   * Predict method distribution (KO/TKO/Decision)
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} conditions - Fight conditions
   * @returns {object} Method probabilities
   */
  predictMethod(fighterA, fighterB, conditions = {}) {
    // Base rates
    let ko = 0.25;
    let tko = 0.20;
    let decision = 0.50;
    let dq = 0.02;

    // Adjust for power
    const powerA = this.getAttributeValue(fighterA, 'power', 'knockoutPower') || 70;
    const powerB = this.getAttributeValue(fighterB, 'power', 'knockoutPower') || 70;
    const avgPower = (powerA + powerB) / 2;

    // High power fighters = more KOs
    ko += (avgPower - 70) / 200;
    tko += (avgPower - 70) / 300;
    decision -= (avgPower - 70) / 150;

    // Adjust for chin
    const chinA = this.getAttributeValue(fighterA, 'mental', 'chin') || 75;
    const chinB = this.getAttributeValue(fighterB, 'mental', 'chin') || 75;
    const avgChin = (chinA + chinB) / 2;

    // Weak chins = more KOs
    ko += (80 - avgChin) / 200;
    tko += (80 - avgChin) / 250;
    decision -= (80 - avgChin) / 125;

    // Adjust for cardio (low cardio = more late stoppages)
    const cardioA = this.getAttributeValue(fighterA, 'stamina', 'cardio') || 75;
    const cardioB = this.getAttributeValue(fighterB, 'stamina', 'cardio') || 75;
    const avgCardio = (cardioA + cardioB) / 2;

    if (avgCardio < 70) {
      tko += 0.05;
      decision -= 0.05;
    }

    // Normalize
    const total = ko + tko + decision + dq;
    const draw = this.baseDrawRate;

    return {
      ko: Math.max(0.05, Math.min(0.50, ko / total)) * (1 - draw),
      tko: Math.max(0.05, Math.min(0.40, tko / total)) * (1 - draw),
      decision: Math.max(0.20, Math.min(0.70, decision / total)) * (1 - draw),
      dq: Math.max(0.01, Math.min(0.05, dq / total)) * (1 - draw),
      draw
    };
  }

  /**
   * Predict expected fight length
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} context - Fight context
   * @returns {number} Expected rounds
   */
  predictFightLength(fighterA, fighterB, context = {}) {
    const scheduledRounds = context.rounds || 12;

    // Base expectation
    let expectedRounds = scheduledRounds * 0.75;

    // Adjust for KO power (high power = shorter fights)
    const powerA = this.getAttributeValue(fighterA, 'power', 'knockoutPower') || 70;
    const powerB = this.getAttributeValue(fighterB, 'power', 'knockoutPower') || 70;
    const avgPower = (powerA + powerB) / 2;

    expectedRounds -= (avgPower - 70) / 20;

    // Adjust for chin (weak chins = shorter fights)
    const chinA = this.getAttributeValue(fighterA, 'mental', 'chin') || 75;
    const chinB = this.getAttributeValue(fighterB, 'mental', 'chin') || 75;
    const minChin = Math.min(chinA, chinB);

    expectedRounds -= (80 - minChin) / 15;

    // Adjust for cardio (good cardio = longer fights)
    const cardioA = this.getAttributeValue(fighterA, 'stamina', 'cardio') || 75;
    const cardioB = this.getAttributeValue(fighterB, 'stamina', 'cardio') || 75;
    const avgCardio = (cardioA + cardioB) / 2;

    expectedRounds += (avgCardio - 75) / 20;

    // Clamp to valid range
    return Math.max(3, Math.min(scheduledRounds, Math.round(expectedRounds * 10) / 10));
  }

  /**
   * Calculate confidence in prediction
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} basePrediction - Base prediction result
   * @returns {number} Confidence 0-1
   */
  calculateConfidence(fighterA, fighterB, basePrediction) {
    let confidence = 0.5;

    // Larger skill gap = higher confidence
    const differential = Math.abs(basePrediction.differential || 0);
    confidence += differential * 0.5;

    // More fight history = higher confidence
    const fightsA = fighterA.career?.record?.wins + fighterA.career?.record?.losses || 0;
    const fightsB = fighterB.career?.record?.wins + fighterB.career?.record?.losses || 0;
    const avgFights = (fightsA + fightsB) / 2;

    confidence += Math.min(0.2, avgFights / 100);

    // Pattern analysis adds confidence
    const idA = fighterA.id || fighterA.snapshot?.id;
    const idB = fighterB.id || fighterB.snapshot?.id;

    if (idA || idB) {
      const patternsA = idA ? this.patternAnalyzer.analyzePatterns(idA) : null;
      const patternsB = idB ? this.patternAnalyzer.analyzePatterns(idB) : null;

      if (patternsA?.confidence) confidence += patternsA.confidence * 0.1;
      if (patternsB?.confidence) confidence += patternsB.confidence * 0.1;
    }

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  /**
   * Identify key factors affecting prediction
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} conditions - Fight conditions
   * @param {object} context - Fight context
   * @param {object} breakdown - Prediction breakdown
   * @returns {Array} Key factors
   */
  identifyKeyFactors(fighterA, fighterB, conditions, context, breakdown) {
    const factors = [];
    const nameA = fighterA.name || fighterA.identity?.name || 'Fighter A';
    const nameB = fighterB.name || fighterB.identity?.name || 'Fighter B';

    // Power differential
    const powerA = this.getAttributeValue(fighterA, 'power', 'knockoutPower') || 70;
    const powerB = this.getAttributeValue(fighterB, 'power', 'knockoutPower') || 70;
    const powerDiff = powerA - powerB;

    if (Math.abs(powerDiff) > 8) {
      factors.push({
        factor: 'power_advantage',
        favoredFighter: powerDiff > 0 ? 'A' : 'B',
        magnitude: Math.abs(powerDiff) / 100,
        description: `${powerDiff > 0 ? nameA : nameB} has significant power advantage (+${Math.abs(powerDiff)} knockout power)`
      });
    }

    // Reach advantage
    const reachA = fighterA.physical?.reach || fighterA.snapshot?.physical?.reach || 180;
    const reachB = fighterB.physical?.reach || fighterB.snapshot?.physical?.reach || 180;
    const reachDiff = reachA - reachB;

    if (Math.abs(reachDiff) > 8) {
      factors.push({
        factor: 'reach_advantage',
        favoredFighter: reachDiff > 0 ? 'A' : 'B',
        magnitude: Math.abs(reachDiff) / 50,
        description: `${Math.abs(reachDiff)}cm reach advantage for ${reachDiff > 0 ? nameA : nameB}`
      });
    }

    // Speed advantage
    const speedA = this.getAttributeValue(fighterA, 'speed', 'handSpeed') || 70;
    const speedB = this.getAttributeValue(fighterB, 'speed', 'handSpeed') || 70;
    const speedDiff = speedA - speedB;

    if (Math.abs(speedDiff) > 10) {
      factors.push({
        factor: 'speed_advantage',
        favoredFighter: speedDiff > 0 ? 'A' : 'B',
        magnitude: Math.abs(speedDiff) / 100,
        description: `${speedDiff > 0 ? nameA : nameB} has faster hands`
      });
    }

    // Chin vulnerability
    const chinA = this.getAttributeValue(fighterA, 'mental', 'chin') || 75;
    const chinB = this.getAttributeValue(fighterB, 'mental', 'chin') || 75;

    if (chinA < 65) {
      factors.push({
        factor: 'chin_vulnerability',
        favoredFighter: 'B',
        magnitude: (70 - chinA) / 100,
        description: `${nameA} has questionable chin`
      });
    }
    if (chinB < 65) {
      factors.push({
        factor: 'chin_vulnerability',
        favoredFighter: 'A',
        magnitude: (70 - chinB) / 100,
        description: `${nameB} has questionable chin`
      });
    }

    // Style matchup
    if (breakdown.styleAdjustment?.description !== 'Neutral style matchup') {
      factors.push({
        factor: 'style_matchup',
        favoredFighter: breakdown.styleAdjustment.A > breakdown.styleAdjustment.B ? 'A' : 'B',
        magnitude: Math.abs(breakdown.styleAdjustment.A - breakdown.styleAdjustment.B),
        description: breakdown.styleAdjustment.description
      });
    }

    // Condition factors
    const condA = conditions.fighterA || {};
    const condB = conditions.fighterB || {};

    if (condA.physicalState === 'drained') {
      factors.push({
        factor: 'weight_drain',
        favoredFighter: 'B',
        magnitude: 0.15,
        description: `${nameA} drained from weight cut`
      });
    }
    if (condB.physicalState === 'drained') {
      factors.push({
        factor: 'weight_drain',
        favoredFighter: 'A',
        magnitude: 0.15,
        description: `${nameB} drained from weight cut`
      });
    }

    // Experience differential
    const winsA = fighterA.career?.record?.wins || fighterA.record?.wins || 0;
    const winsB = fighterB.career?.record?.wins || fighterB.record?.wins || 0;
    const expDiff = winsA - winsB;

    if (Math.abs(expDiff) > 15) {
      factors.push({
        factor: 'experience_advantage',
        favoredFighter: expDiff > 0 ? 'A' : 'B',
        magnitude: Math.abs(expDiff) / 100,
        description: `${expDiff > 0 ? nameA : nameB} has significant experience advantage`
      });
    }

    // Sort by magnitude
    factors.sort((a, b) => b.magnitude - a.magnitude);

    return factors.slice(0, 6); // Top 6 factors
  }

  /**
   * Set fight history for pattern analysis
   * @param {Array} history - Fight history records
   */
  setFightHistory(history) {
    this.patternAnalyzer.setHistory(history);
  }
}

export default PredictionEngine;
