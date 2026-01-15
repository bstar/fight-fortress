/**
 * Foul Manager
 * Handles strategic fouls, warnings, point deductions, and disqualifications
 * Some fighters use fouls strategically (headbutts, low blows, holding, etc.)
 */

import { FighterState } from '../models/Fighter.js';

// Types of fouls
export const FoulType = {
  HEADBUTT: 'headbutt',
  LOW_BLOW: 'low_blow',
  RABBIT_PUNCH: 'rabbit_punch',
  HOLDING: 'holding',
  ELBOW: 'elbow',
  PUSH: 'push',
  HITTING_AFTER_BREAK: 'hitting_after_break',
  HITTING_ON_BREAK: 'hitting_on_break'
};

// Foul characteristics
const FOUL_DATA = {
  [FoulType.HEADBUTT]: {
    name: 'Headbutt',
    damage: { min: 2, max: 8 },
    cutChance: 0.25,
    detectChance: 0.6,       // Refs often miss "accidental" headbutts
    warningThreshold: 2,
    description: 'uses head as a weapon'
  },
  [FoulType.LOW_BLOW]: {
    name: 'Low Blow',
    damage: { min: 0, max: 2 },
    staminaDrain: 15,
    detectChance: 0.8,
    warningThreshold: 1,
    recoveryTime: 3,         // Time given to recover
    description: 'lands a low blow'
  },
  [FoulType.RABBIT_PUNCH]: {
    name: 'Rabbit Punch',
    damage: { min: 1, max: 4 },
    detectChance: 0.5,
    warningThreshold: 2,
    description: 'hits behind the head'
  },
  [FoulType.HOLDING]: {
    name: 'Excessive Holding',
    damage: { min: 0, max: 0 },
    staminaRecovery: 5,      // Holder recovers stamina
    detectChance: 0.9,
    warningThreshold: 3,
    description: 'holds excessively'
  },
  [FoulType.ELBOW]: {
    name: 'Elbow',
    damage: { min: 3, max: 10 },
    cutChance: 0.35,
    detectChance: 0.7,
    warningThreshold: 1,
    description: 'throws an elbow'
  },
  [FoulType.PUSH]: {
    name: 'Push',
    damage: { min: 0, max: 1 },
    detectChance: 0.4,
    warningThreshold: 3,
    description: 'pushes opponent'
  },
  [FoulType.HITTING_AFTER_BREAK]: {
    name: 'Hitting After Break',
    damage: { min: 2, max: 6 },
    detectChance: 0.95,
    warningThreshold: 1,
    description: 'hits after the break'
  },
  [FoulType.HITTING_ON_BREAK]: {
    name: 'Hitting on Break',
    damage: { min: 1, max: 4 },
    detectChance: 0.85,
    warningThreshold: 2,
    description: 'hits during break'
  }
};

export class FoulManager {
  constructor() {
    this.warnings = { A: {}, B: {} };
    this.pointDeductions = { A: 0, B: 0 };
    this.foulsThisRound = { A: [], B: [] };
    this.totalFouls = { A: [], B: [] };
  }

  /**
   * Reset for new fight
   */
  reset() {
    this.warnings = { A: {}, B: {} };
    this.pointDeductions = { A: 0, B: 0 };
    this.foulsThisRound = { A: [], B: [] };
    this.totalFouls = { A: [], B: [] };
  }

  /**
   * Reset round-specific tracking
   */
  resetRound() {
    this.foulsThisRound = { A: [], B: [] };
  }

  /**
   * Check if fighter should attempt a foul based on situation and tendencies
   */
  shouldAttemptFoul(fighter, opponent, situation, fighterId) {
    const tactics = fighter.tactics || {};
    const dirtiness = tactics.dirtiness || 0;

    // Clean fighters don't foul intentionally
    if (dirtiness < 20) return null;

    // Base chance from dirtiness (0-100 scale)
    let foulChance = dirtiness * 0.001; // 0-10% base

    // Situational modifiers

    // More likely when losing
    if (situation.scoreDiff < -2) {
      foulChance *= 1.5;
    }

    // More likely when tired (dirty way to get a breather)
    if (situation.staminaPercent < 0.4) {
      foulChance *= 1.3;
    }

    // More likely when hurt (desperate)
    if (fighter.isHurt || fighter.isBuzzed) {
      foulChance *= 1.4;
    }

    // More likely in close distance
    if (situation.distance < 2) {
      foulChance *= 1.5;
    }

    // Less likely early in fight (don't want early DQ)
    if (situation.round < 3) {
      foulChance *= 0.5;
    }

    // Less likely if already warned multiple times
    const totalWarnings = Object.values(this.warnings[fighterId] || {}).reduce((a, b) => a + b, 0);
    if (totalWarnings >= 2) {
      foulChance *= 0.6;
    }
    if (this.pointDeductions[fighterId] > 0) {
      foulChance *= 0.4;
    }

    // Roll for foul attempt
    if (Math.random() > foulChance) return null;

    // Determine which foul type based on fighter tendencies and situation
    return this.selectFoulType(fighter, situation);
  }

  /**
   * Select which type of foul to attempt
   */
  selectFoulType(fighter, situation) {
    const tactics = fighter.tactics || {};
    const weights = {};

    // Headbutt - more likely for inside fighters at close range
    weights[FoulType.HEADBUTT] = (tactics.headbuttTendency || 0) *
      (situation.distance < 2 ? 2 : 0.3);

    // Low blow - universal dirty tactic
    weights[FoulType.LOW_BLOW] = (tactics.lowBlowTendency || 0) * 1.0;

    // Rabbit punch - in clinch or when opponent turns
    weights[FoulType.RABBIT_PUNCH] = (tactics.rabbitPunchTendency || 0) *
      (fighter.state === FighterState.CLINCH ? 2 : 0.5);

    // Holding - when tired or hurt
    weights[FoulType.HOLDING] = (tactics.holdingTendency || 0) *
      (situation.staminaPercent < 0.5 ? 2 : 0.8);

    // Elbow - rare but devastating
    weights[FoulType.ELBOW] = (tactics.elbowTendency || 0) * 0.5;

    // Push - minor foul, mostly for creating distance
    weights[FoulType.PUSH] = (tactics.pushTendency || 0) *
      (situation.distance < 2 ? 1.5 : 0.3);

    // Calculate total weight
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return null;

    // Weighted random selection
    let roll = Math.random() * totalWeight;
    for (const [foulType, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return foulType;
    }

    return null;
  }

  /**
   * Execute a foul and determine consequences
   */
  executeFoul(foulType, attacker, target, fighterId, referee) {
    const foulData = FOUL_DATA[foulType];
    if (!foulData) return null;

    const result = {
      type: foulType,
      name: foulData.name,
      attacker: fighterId,
      detected: false,
      intentional: false,
      warning: false,
      pointDeduction: false,
      disqualification: false,
      damage: 0,
      staminaDrain: 0,
      cutCaused: false,
      description: foulData.description
    };

    // Calculate damage if applicable
    if (foulData.damage) {
      result.damage = foulData.damage.min +
        Math.random() * (foulData.damage.max - foulData.damage.min);
    }

    // Stamina effects
    if (foulData.staminaDrain) {
      result.staminaDrain = foulData.staminaDrain;
    }
    if (foulData.staminaRecovery) {
      result.staminaRecovery = foulData.staminaRecovery;
    }

    // Cut chance
    if (foulData.cutChance && Math.random() < foulData.cutChance) {
      result.cutCaused = true;
    }

    // Detection check - referee skill matters
    const refSkill = referee?.skill || 70;
    const detectMod = refSkill / 100;
    const detectChance = foulData.detectChance * detectMod;

    result.detected = Math.random() < detectChance;

    if (result.detected) {
      // Track the foul
      this.foulsThisRound[fighterId].push(foulType);
      this.totalFouls[fighterId].push(foulType);

      // Count warnings for this foul type
      if (!this.warnings[fighterId][foulType]) {
        this.warnings[fighterId][foulType] = 0;
      }
      this.warnings[fighterId][foulType]++;

      const warningCount = this.warnings[fighterId][foulType];

      // Determine penalty based on warning count
      if (warningCount <= foulData.warningThreshold) {
        result.warning = true;
      } else if (warningCount <= foulData.warningThreshold + 2) {
        result.pointDeduction = true;
        this.pointDeductions[fighterId]++;
      } else {
        // Multiple point deductions or especially egregious
        if (this.pointDeductions[fighterId] >= 3) {
          result.disqualification = true;
        } else {
          result.pointDeduction = true;
          this.pointDeductions[fighterId]++;
        }
      }

      // Intentionality affects severity
      const dirtiness = attacker.tactics?.dirtiness || 0;
      if (dirtiness > 60 && Math.random() < 0.3) {
        result.intentional = true;
        // Intentional fouls escalate penalties
        if (result.warning && this.warnings[fighterId][foulType] > 1) {
          result.warning = false;
          result.pointDeduction = true;
          this.pointDeductions[fighterId]++;
        }
      }
    }

    return result;
  }

  /**
   * Apply foul effects to fighters
   */
  applyFoulEffects(result, attacker, target) {
    // Apply damage to target
    if (result.damage > 0) {
      target.takeDamage(result.damage, 'head');
    }

    // Apply stamina drain to target (low blow, etc.)
    if (result.staminaDrain) {
      target.spendStamina(result.staminaDrain);
    }

    // Apply stamina recovery to attacker (holding)
    if (result.staminaRecovery) {
      attacker.recoverStamina(result.staminaRecovery);
    }

    return result;
  }

  /**
   * Get point deductions for a fighter
   */
  getPointDeductions(fighterId) {
    return this.pointDeductions[fighterId] || 0;
  }

  /**
   * Get foul summary for display
   */
  getFoulSummary(fighterId) {
    return {
      warnings: { ...this.warnings[fighterId] },
      pointDeductions: this.pointDeductions[fighterId],
      totalFouls: this.totalFouls[fighterId].length,
      foulsThisRound: this.foulsThisRound[fighterId].length
    };
  }
}

export default FoulManager;
