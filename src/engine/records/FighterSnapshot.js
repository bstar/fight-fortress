/**
 * FighterSnapshot - Point-in-time capture of fighter state
 *
 * Creates an immutable snapshot of a fighter's attributes and career state
 * at the moment of a fight, enabling historical analysis and pattern detection.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Create a deep frozen copy of an object
 * @param {object} obj - Object to freeze
 * @returns {object} Deeply frozen copy
 */
const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;

  const frozen = Array.isArray(obj) ? [...obj] : { ...obj };
  Object.keys(frozen).forEach(key => {
    frozen[key] = deepFreeze(frozen[key]);
  });

  return Object.freeze(frozen);
};

/**
 * Extract attribute group from fighter, returning plain object
 * @param {object} group - Attribute group (power, speed, etc.)
 * @returns {object} Plain object copy of attributes
 */
const extractAttributeGroup = (group) =>
  group ? Object.entries(group).reduce((acc, [key, value]) => {
    acc[key] = typeof value === 'number' ? value : value;
    return acc;
  }, {}) : {};

export class FighterSnapshot {
  /**
   * Create a snapshot from a Fighter instance
   * @param {Fighter} fighter - Fighter to snapshot
   * @param {object} options - Additional context
   * @param {object} options.careerData - Career data for universe fighters
   * @param {object} options.currentDate - Current universe date { year, week }
   */
  constructor(fighter, options = {}) {
    const { careerData, currentDate } = options;

    // Unique snapshot ID
    this.snapshotId = uuidv4();
    this.timestamp = new Date().toISOString();

    // Fighter identity (immutable reference)
    this.id = fighter.id;
    this.name = fighter.name;
    this.nickname = fighter.nickname;
    this.nationality = fighter.nationality;

    // Physical attributes at fight time
    this.physical = deepFreeze({
      height: fighter.physical.height,
      weight: fighter.physical.weight,
      reach: fighter.physical.reach,
      age: fighter.physical.age,
      stance: fighter.physical.stance,
      bodyType: fighter.physical.bodyType
    });

    // Fighting style
    this.style = deepFreeze({
      primary: fighter.style.primary,
      defensive: fighter.style.defensive,
      offensive: fighter.style.offensive
    });

    // All attribute groups (frozen)
    this.power = deepFreeze(extractAttributeGroup(fighter.power));
    this.speed = deepFreeze(extractAttributeGroup(fighter.speed));
    this.stamina = deepFreeze(extractAttributeGroup(fighter.stamina));
    this.defense = deepFreeze(extractAttributeGroup(fighter.defense));
    this.offense = deepFreeze(extractAttributeGroup(fighter.offense));
    this.technical = deepFreeze(extractAttributeGroup(fighter.technical));
    this.mental = deepFreeze(extractAttributeGroup(fighter.mental));

    // Tactics and tendencies
    this.tactics = deepFreeze(extractAttributeGroup(fighter.tactics));

    // Record at fight time
    this.record = deepFreeze({
      wins: fighter.record?.wins || 0,
      losses: fighter.record?.losses || 0,
      draws: fighter.record?.draws || 0,
      kos: fighter.record?.kos || 0
    });

    // Corner crew
    this.corner = deepFreeze({
      headTrainer: fighter.corner?.headTrainer ? {
        name: fighter.corner.headTrainer.name,
        strategySkill: fighter.corner.headTrainer.strategySkill,
        communication: fighter.corner.headTrainer.communication,
        adaptability: fighter.corner.headTrainer.adaptability,
        specialty: fighter.corner.headTrainer.specialty
      } : null,
      cutman: fighter.corner?.cutman ? {
        name: fighter.corner.cutman.name,
        cutTreatment: fighter.corner.cutman.cutTreatment,
        swellingTreatment: fighter.corner.cutman.swellingTreatment,
        speed: fighter.corner.cutman.speed
      } : null
    });

    // Career state (for universe fighters)
    this.career = deepFreeze(this.extractCareerState(fighter, careerData, currentDate));

    // Derived/calculated stats at fight time
    this.derived = deepFreeze(this.extractDerivedStats(fighter));

    // Freeze the entire snapshot
    Object.freeze(this);
  }

  /**
   * Extract career state for universe fighters
   * @param {Fighter} fighter - Fighter instance
   * @param {object} careerData - Additional career data
   * @param {object} currentDate - Current date { year, week }
   * @returns {object} Career state snapshot
   */
  extractCareerState(fighter, careerData, _currentDate) {
    // For historical/template fighters, use basic record
    const basicCareer = {
      phase: careerData?.phase || 'UNKNOWN',
      age: fighter.physical?.age || careerData?.age || null,
      record: {
        wins: fighter.record?.wins || 0,
        losses: fighter.record?.losses || 0,
        draws: fighter.record?.draws || 0,
        kos: fighter.record?.kos || 0
      }
    };

    // For universe fighters with full career tracking
    if (careerData) {
      return {
        ...basicCareer,
        phase: careerData.phase || 'UNKNOWN',
        weeksSinceLastFight: careerData.weeksSinceLastFight || 0,
        consecutiveWins: careerData.consecutiveWins || 0,
        consecutiveLosses: careerData.consecutiveLosses || 0,
        recentKOLosses: careerData.recentKOLosses || 0,
        careerDamage: careerData.careerDamage ? {
          totalAbuse: careerData.careerDamage.totalAbuse || 0,
          chinDegradation: careerData.careerDamage.chinDegradation || 0,
          knockdownsReceived: careerData.careerDamage.knockdownsReceived || 0,
          koLosses: careerData.careerDamage.koLosses || 0
        } : null,
        rankings: careerData.rankings ? {
          current: careerData.rankings.current,
          peak: careerData.rankings.peak,
          bodyRankings: careerData.bodyRankings || {}
        } : null,
        titles: careerData.titles || [],
        popularity: careerData.popularity || 50,
        earnings: careerData.earnings || 0
      };
    }

    return basicCareer;
  }

  /**
   * Extract derived/calculated stats
   * @param {Fighter} fighter - Fighter instance
   * @returns {object} Derived stats
   */
  extractDerivedStats(fighter) {
    return {
      // Overall ratings if calculated
      overallRating: fighter.overallRating || this.calculateOverallRating(fighter),

      // Win percentage
      winPercentage: this.calculateWinPercentage(fighter),

      // KO percentage
      koPercentage: this.calculateKOPercentage(fighter),

      // Style-specific effectiveness scores
      insideEffectiveness: this.calculateInsideEffectiveness(fighter),
      outsideEffectiveness: this.calculateOutsideEffectiveness(fighter),

      // Punch output potential
      punchOutputPotential: this.calculatePunchOutput(fighter)
    };
  }

  /**
   * Calculate overall rating from attributes
   * @param {Fighter} fighter - Fighter instance
   * @returns {number} Overall rating 0-100
   */
  calculateOverallRating(fighter) {
    const weights = {
      power: 0.15,
      speed: 0.15,
      stamina: 0.10,
      defense: 0.15,
      offense: 0.15,
      technical: 0.15,
      mental: 0.15
    };

    const avgGroup = (group) => {
      const values = Object.values(group || {}).filter(v => typeof v === 'number');
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 50;
    };

    const weighted =
      avgGroup(fighter.power) * weights.power +
      avgGroup(fighter.speed) * weights.speed +
      avgGroup(fighter.stamina) * weights.stamina +
      avgGroup(fighter.defense) * weights.defense +
      avgGroup(fighter.offense) * weights.offense +
      avgGroup(fighter.technical) * weights.technical +
      avgGroup(fighter.mental) * weights.mental;

    return Math.round(weighted);
  }

  /**
   * Calculate win percentage
   * @param {Fighter} fighter - Fighter instance
   * @returns {number} Win percentage 0-100
   */
  calculateWinPercentage(fighter) {
    const total = (fighter.record?.wins || 0) +
                  (fighter.record?.losses || 0) +
                  (fighter.record?.draws || 0);
    return total > 0 ? Math.round((fighter.record.wins / total) * 100) : 0;
  }

  /**
   * Calculate KO percentage
   * @param {Fighter} fighter - Fighter instance
   * @returns {number} KO percentage 0-100
   */
  calculateKOPercentage(fighter) {
    const wins = fighter.record?.wins || 0;
    const kos = fighter.record?.kos || 0;
    return wins > 0 ? Math.round((kos / wins) * 100) : 0;
  }

  /**
   * Calculate inside fighting effectiveness
   * @param {Fighter} fighter - Fighter instance
   * @returns {number} Inside effectiveness 0-100
   */
  calculateInsideEffectiveness(fighter) {
    return Math.round(
      (fighter.technical?.insideFighting || 60) * 0.3 +
      (fighter.power?.bodyPunching || 70) * 0.25 +
      (fighter.defense?.clinchOffense || 60) * 0.25 +
      (fighter.mental?.heart || 75) * 0.2
    );
  }

  /**
   * Calculate outside fighting effectiveness
   * @param {Fighter} fighter - Fighter instance
   * @returns {number} Outside effectiveness 0-100
   */
  calculateOutsideEffectiveness(fighter) {
    return Math.round(
      (fighter.technical?.outsideFighting || 65) * 0.25 +
      (fighter.technical?.distanceManagement || 65) * 0.25 +
      (fighter.offense?.jabAccuracy || 70) * 0.25 +
      (fighter.speed?.footSpeed || 70) * 0.25
    );
  }

  /**
   * Calculate punch output potential
   * @param {Fighter} fighter - Fighter instance
   * @returns {number} Punch output score 0-100
   */
  calculatePunchOutput(fighter) {
    return Math.round(
      (fighter.stamina?.workRate || 70) * 0.35 +
      (fighter.stamina?.cardio || 70) * 0.25 +
      (fighter.speed?.combinationSpeed || 70) * 0.25 +
      (fighter.power?.punchingStamina || 70) * 0.15
    );
  }

  /**
   * Convert snapshot to plain object for serialization
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      snapshotId: this.snapshotId,
      timestamp: this.timestamp,
      id: this.id,
      name: this.name,
      nickname: this.nickname,
      nationality: this.nationality,
      physical: this.physical,
      style: this.style,
      power: this.power,
      speed: this.speed,
      stamina: this.stamina,
      defense: this.defense,
      offense: this.offense,
      technical: this.technical,
      mental: this.mental,
      tactics: this.tactics,
      record: this.record,
      corner: this.corner,
      career: this.career,
      derived: this.derived
    };
  }

  /**
   * Create snapshot from serialized data
   * @param {object} data - Serialized snapshot data
   * @returns {object} Reconstructed snapshot (plain object, not class instance)
   */
  static fromJSON(data) {
    return deepFreeze(data);
  }
}

export default FighterSnapshot;
