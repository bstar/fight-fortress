/**
 * FightRecord - Complete record of a fight for analysis and validation
 *
 * Captures all conditions at fight time, the actual result, and detailed
 * fight data for pattern analysis and model validation.
 */

import { v4 as uuidv4 } from 'uuid';
import ModelParameters from '../model/ModelParameters.js';

/**
 * Deep freeze an object to make it immutable
 */
const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  const frozen = Array.isArray(obj) ? [...obj] : { ...obj };
  Object.keys(frozen).forEach(key => {
    frozen[key] = deepFreeze(frozen[key]);
  });
  return Object.freeze(frozen);
};

export class FightRecord {
  /**
   * Create a new fight record
   * @param {object} config - Fight record configuration
   */
  constructor(config) {
    // Unique fight record ID
    this.id = config.id || uuidv4();

    // Model version that produced this result
    this.version = config.version || ModelParameters.getVersion();

    // Timestamps
    this.timestamp = config.timestamp || new Date().toISOString();
    this.createdAt = config.createdAt || Date.now();

    // Fighter snapshots (frozen state at fight time)
    this.fighterA = deepFreeze(config.fighterA);
    this.fighterB = deepFreeze(config.fighterB);

    // Fight conditions (context that affects performance)
    this.conditions = deepFreeze(config.conditions || {
      fighterA: this.defaultConditions(),
      fighterB: this.defaultConditions()
    });

    // Fight context (situational factors)
    this.context = deepFreeze(config.context || {
      fightType: 'STANDARD',
      rounds: 12,
      venue: null,
      stakes: null,
      isRematch: false,
      isRivalry: false,
      publicPressure: 0.5
    });

    // Pre-fight prediction (if available)
    this.prediction = config.prediction ? deepFreeze(config.prediction) : null;

    // Actual result (populated after fight)
    this.result = config.result ? deepFreeze(config.result) : null;

    // Detailed fight data (populated after fight)
    this.fightData = config.fightData ? deepFreeze(config.fightData) : null;

    // Post-fight career effects (populated after processing)
    this.careerEffects = config.careerEffects ? deepFreeze(config.careerEffects) : null;

    // Pattern analysis (detected patterns for both fighters)
    this.patternAnalysis = config.patternAnalysis ? deepFreeze(config.patternAnalysis) : null;

    // Metadata
    this.metadata = deepFreeze(config.metadata || {
      simulationType: 'single',  // single, batch, validation
      seed: null,                // Random seed if reproducible
      notes: null
    });
  }

  /**
   * Default fight conditions
   * @returns {object} Default condition values
   */
  defaultConditions() {
    return {
      trainingCamp: 1.0,        // 0-1 quality of preparation
      motivation: 1.0,          // Drive to win this specific fight
      mentalState: 'focused',   // focused, distracted, overconfident, nervous
      physicalState: 'peak',    // peak, good, compromised, drained
      modifiers: []             // Active effects/bonuses
    };
  }

  /**
   * Set the pre-fight prediction
   * @param {object} prediction - Prediction data
   */
  setPrediction(prediction) {
    this.prediction = deepFreeze({
      modelVersion: prediction.modelVersion || this.version,
      winProbability: {
        fighterA: prediction.winProbability?.fighterA || 0.5,
        fighterB: prediction.winProbability?.fighterB || 0.5,
        draw: prediction.winProbability?.draw || 0.02
      },
      expectedMethod: {
        ko: prediction.expectedMethod?.ko || 0.3,
        tko: prediction.expectedMethod?.tko || 0.2,
        decision: prediction.expectedMethod?.decision || 0.45,
        draw: prediction.expectedMethod?.draw || 0.02,
        dq: prediction.expectedMethod?.dq || 0.03
      },
      expectedRounds: prediction.expectedRounds || 10,
      confidence: prediction.confidence || 0.5,
      keyFactors: prediction.keyFactors || []
    });
  }

  /**
   * Set the actual fight result
   * @param {object} result - Fight result data
   */
  setResult(result) {
    this.result = deepFreeze({
      winner: result.winner,              // 'A', 'B', or 'DRAW'
      loser: result.loser,                // 'A', 'B', or null for draw
      method: result.method,              // KO, TKO, DECISION, etc.
      round: result.round,                // Round ended
      time: result.time,                  // Time in final round
      scores: result.scores || null,      // Judge scorecards if decision
      finishingDetails: result.finishingDetails || null
    });
  }

  /**
   * Set detailed fight data
   * @param {object} data - Fight data
   */
  setFightData(data) {
    this.fightData = deepFreeze({
      roundByRound: data.roundByRound || [],
      totalStats: data.totalStats || {
        punchesThrown: { A: 0, B: 0 },
        punchesLanded: { A: 0, B: 0 },
        powerPunches: { A: 0, B: 0 },
        knockdowns: { A: 0, B: 0 },
        significant: { A: 0, B: 0 }
      },
      finishDetails: data.finishDetails || null,
      fightNarrative: data.fightNarrative || []
    });
  }

  /**
   * Set career effects from the fight
   * @param {object} effects - Career effects for both fighters
   */
  setCareerEffects(effects) {
    this.careerEffects = deepFreeze({
      fighterA: effects.fighterA || {
        damageAccumulated: 0,
        attributeChanges: {},
        confidenceChange: 0,
        patternUpdates: []
      },
      fighterB: effects.fighterB || {
        damageAccumulated: 0,
        attributeChanges: {},
        confidenceChange: 0,
        patternUpdates: []
      }
    });
  }

  /**
   * Set pattern analysis for both fighters
   * @param {object} analysis - Pattern analysis data
   */
  setPatternAnalysis(analysis) {
    this.patternAnalysis = deepFreeze({
      fighterA: analysis.fighterA || {
        fighterId: this.fighterA?.id,
        fightsAnalyzed: 0,
        patterns: [],
        metrics: {},
        confidence: 0,
        summary: 'No patterns detected'
      },
      fighterB: analysis.fighterB || {
        fighterId: this.fighterB?.id,
        fightsAnalyzed: 0,
        patterns: [],
        metrics: {},
        confidence: 0,
        summary: 'No patterns detected'
      },
      matchupInsights: analysis.matchupInsights || [],
      analyzedAt: new Date().toISOString()
    });
  }

  /**
   * Check if prediction was accurate
   * @returns {object} Accuracy analysis
   */
  analyzePredictionAccuracy() {
    if (!this.prediction || !this.result) {
      return { available: false };
    }

    const predictedWinner = this.prediction.winProbability.fighterA >
                            this.prediction.winProbability.fighterB ? 'A' : 'B';
    const actualWinner = this.result.winner;
    const correctWinner = predictedWinner === actualWinner;

    // Method accuracy
    const isKOFinish = ['KO', 'TKO', 'TKO_REFEREE', 'TKO_CORNER'].includes(this.result.method);
    const isDecision = this.result.method === 'DECISION';
    const predictedKO = (this.prediction.expectedMethod.ko + this.prediction.expectedMethod.tko) > 0.5;
    const correctMethod = (isKOFinish && predictedKO) || (isDecision && !predictedKO);

    // Round accuracy (within 2 rounds)
    const roundAccuracy = Math.abs(this.result.round - this.prediction.expectedRounds) <= 2;

    return {
      available: true,
      correctWinner,
      correctMethod,
      roundAccuracy,
      predictedWinProb: this.prediction.winProbability[`fighter${predictedWinner}`],
      actualWinner,
      confidenceUsed: this.prediction.confidence,
      overallAccuracy: (correctWinner ? 0.5 : 0) + (correctMethod ? 0.3 : 0) + (roundAccuracy ? 0.2 : 0)
    };
  }

  /**
   * Get fight summary for display
   * @returns {object} Human-readable summary
   */
  getSummary() {
    const fighterAName = this.fighterA?.name || 'Fighter A';
    const fighterBName = this.fighterB?.name || 'Fighter B';

    const resultSummary = this.result
      ? `${this.result.winner === 'A' ? fighterAName : this.result.winner === 'B' ? fighterBName : 'Draw'} ` +
        `by ${this.result.method} (R${this.result.round})`
      : 'No result';

    return {
      id: this.id,
      matchup: `${fighterAName} vs ${fighterBName}`,
      context: this.context.fightType,
      result: resultSummary,
      rounds: this.context.rounds,
      version: this.version,
      timestamp: this.timestamp
    };
  }

  /**
   * Convert to JSON for serialization
   * @returns {object} Serializable object
   */
  toJSON() {
    return {
      id: this.id,
      version: this.version,
      timestamp: this.timestamp,
      createdAt: this.createdAt,
      fighterA: this.fighterA,
      fighterB: this.fighterB,
      conditions: this.conditions,
      context: this.context,
      prediction: this.prediction,
      result: this.result,
      fightData: this.fightData,
      careerEffects: this.careerEffects,
      patternAnalysis: this.patternAnalysis,
      metadata: this.metadata
    };
  }

  /**
   * Create FightRecord from serialized data
   * @param {object} data - Serialized data
   * @returns {FightRecord} Reconstructed fight record
   */
  static fromJSON(data) {
    return new FightRecord(data);
  }

  /**
   * Create a minimal record for batch testing (less data, faster)
   * @param {object} config - Basic fight config
   * @returns {FightRecord} Minimal record
   */
  static createMinimal(config) {
    return new FightRecord({
      ...config,
      metadata: {
        simulationType: 'batch',
        minimal: true
      }
    });
  }
}

export default FightRecord;
