/**
 * Stamina Manager
 * Manages stamina expenditure, recovery, and fatigue effects
 */

import { FighterState, OffensiveSubState, DefensiveSubState, MovementSubState } from '../models/Fighter.js';
import { ActionType, PunchType } from './FighterAI.js';

// Stamina costs by action type
// BALANCED: Boxers should end at ~50-70%, pressure fighters at ~30-50%
// Even the most active fighters shouldn't gas completely in 12 rounds
const STAMINA_COSTS = {
  // Punches - moderate costs, balanced with recovery
  punches: {
    [PunchType.JAB]: 0.22,            // Efficient but not free
    [PunchType.CROSS]: 0.45,          // Power punches cost more
    [PunchType.LEAD_HOOK]: 0.40,
    [PunchType.REAR_HOOK]: 0.55,
    [PunchType.LEAD_UPPERCUT]: 0.38,
    [PunchType.REAR_UPPERCUT]: 0.60,
    [PunchType.BODY_JAB]: 0.22,
    [PunchType.BODY_CROSS]: 0.45,
    [PunchType.BODY_HOOK_LEAD]: 0.40,
    [PunchType.BODY_HOOK_REAR]: 0.55
  },

  // Combination bonus costs - moderate increase
  combination: {
    2: 0.1,
    3: 0.2,
    4: 0.3,
    5: 0.4
  },

  // Defensive actions (per second) - LOW ongoing costs
  // Main stamina drain should be from punches, not passive defense
  defense: {
    [DefensiveSubState.HIGH_GUARD]: 0.12,     // Holding hands up - sustainable
    [DefensiveSubState.PHILLY_SHELL]: 0.06,   // Very efficient defense
    [DefensiveSubState.HEAD_MOVEMENT]: 0.25,  // Active - costs more
    [DefensiveSubState.DISTANCE]: 0.10,       // Footwork-based
    [DefensiveSubState.PARRYING]: 0.15        // Active hands
  },

  // Movement (per second) - LOW ongoing costs
  // Moving shouldn't gas you out, throwing punches should
  movement: {
    forward: 0.08,        // Walking forward
    backward: 0.06,       // Backing up
    lateral: 0.10,        // Side to side
    circling: 0.15,       // Circling opponent
    cutting: 0.20,        // Ring cutting
    retreating: 0.10,     // Quick retreat
    burst: 0.35           // Explosive movement
  },

  // Baseline fight cost - ensures everyone tires over 12 rounds
  // Even defensive fighters expend energy staying alert, moving, ready
  baseline: 0.07,  // Per second, always applied - balanced with punch costs

  // Other
  clinch: {
    initiation: 0.6,
    holding: 0.15,
    breaking: 0.8
  },

  // Damage effects
  damage: {
    gettingHit: 0.06,     // Getting hit drains you
    beingHurt: 1.0,       // Per second while hurt
    knockdownRecovery: 8.0
  }
};

// Recovery rates - REDUCED so everyone tires over 12 rounds
// Even distance fighters should tire somewhat, pressure fighters more so
const RECOVERY_RATES = {
  // State-based recovery multipliers - BALANCED for 12-round fights
  // Target: Boxers end ~50-70%, Pressure fighters end ~30-50%
  states: {
    [FighterState.NEUTRAL]: 0.4,      // Moderate recovery when neutral
    [FighterState.DEFENSIVE]: 0.25,   // Reduced - defensive boxing still tires you
    [FighterState.TIMING]: 0.2,       // Counter-punchers stay alert - less recovery
    [FighterState.MOVING]: 0.15,      // Moving takes energy
    [FighterState.OFFENSIVE]: 0.4,    // Increased - pressure fighters need recovery too
    [FighterState.CLINCH]: 0.55,      // Clinching is for recovery
    [FighterState.HURT]: 0.0          // No recovery when hurt
  },

  // Defensive sub-state recovery - reduced for balance
  defensiveSubStates: {
    [DefensiveSubState.HIGH_GUARD]: 0.5,    // Holding guard up
    [DefensiveSubState.PHILLY_SHELL]: 0.6,  // Efficient style
    [DefensiveSubState.HEAD_MOVEMENT]: 0.3, // Active defense costs energy
    [DefensiveSubState.DISTANCE]: 0.4,      // Footwork-based
    [DefensiveSubState.PARRYING]: 0.35      // Active defense
  }
};

export class StaminaManager {
  constructor() {
    this.lastUpdate = {};
  }

  /**
   * Update stamina for a fighter based on their decision
   */
  update(fighter, decision, deltaTime) {
    // Calculate cost for this tick
    const cost = this.calculateCost(fighter, decision, deltaTime);

    // Spend stamina
    fighter.spendStamina(cost);

    // Calculate recovery
    const recovery = this.calculateRecovery(fighter, decision, deltaTime);

    // Apply recovery
    fighter.recoverStamina(recovery);

    // Update stamina tier
    fighter.updateStaminaTier();

    // Apply fatigue effects
    this.applyFatigueEffects(fighter);
  }

  /**
   * Calculate stamina cost for current action
   */
  calculateCost(fighter, decision, deltaTime) {
    let cost = 0;

    // BASELINE COST - just being in the fight drains energy
    // Mental focus, staying ready, heat, tension - it all adds up
    // This ensures even "economical" boxers tire over 12 rounds
    cost += STAMINA_COSTS.baseline * deltaTime;

    // Action cost
    if (decision.action) {
      cost += this.calculateActionCost(decision.action, fighter);
    }

    // State cost (ongoing)
    cost += this.calculateStateCost(fighter, deltaTime);

    // Damage cost (if hurt)
    if (fighter.isHurt) {
      cost += STAMINA_COSTS.damage.beingHurt * deltaTime;
    }

    // Work rate reduces costs - high workRate fighters can sustain output
    // Elite workRate (92) = ~65% cost reduction, average (70) = ~25% reduction
    // This is crucial for pressure fighters to go 12 rounds
    const workRateMod = Math.max(0.35, 1 - (fighter.stamina.workRate - 50) * 0.016);
    cost *= workRateMod;

    // Pace control helps manage energy expenditure
    // High paceControl fighters are smarter about when to exert
    const paceControlMod = Math.max(0.7, 1 - (fighter.stamina.paceControl - 50) * 0.006);
    cost *= paceControlMod;

    // Body damage increases costs significantly
    const bodyDamageMod = 1 + (fighter.bodyDamage / 150);
    cost *= bodyDamageMod;

    // Fatigue increases costs - tired fighters burn more energy
    const fatigueLevel = 1 - fighter.getStaminaPercent();
    const fatigueMod = 1 + (fatigueLevel * 0.25); // Increased from 0.15
    cost *= fatigueMod;

    return Math.max(0, cost);
  }

  /**
   * Calculate cost for a specific action
   */
  calculateActionCost(action, fighter) {
    switch (action.type) {
      case ActionType.PUNCH:
        return this.calculatePunchCost(action, fighter);

      case ActionType.BLOCK:
        return STAMINA_COSTS.defense[DefensiveSubState.HIGH_GUARD] * 0.5;

      case ActionType.EVADE:
        return STAMINA_COSTS.defense[DefensiveSubState.HEAD_MOVEMENT] * 0.5;

      case ActionType.MOVE:
        return this.calculateMovementCost(action);

      case ActionType.CLINCH:
        return STAMINA_COSTS.clinch.initiation;

      default:
        return 0;
    }
  }

  /**
   * Calculate punch cost
   */
  calculatePunchCost(action, fighter) {
    // Combination
    if (action.punchType === 'combination' && action.combination) {
      let totalCost = 0;

      for (const punch of action.combination) {
        totalCost += STAMINA_COSTS.punches[punch] || 2.0;
      }

      // Combination bonus cost
      const comboLength = action.combination.length;
      totalCost += STAMINA_COSTS.combination[Math.min(5, comboLength)] || 0;

      return totalCost;
    }

    // Single punch
    return STAMINA_COSTS.punches[action.punchType] || 2.0;
  }

  /**
   * Calculate movement cost
   */
  calculateMovementCost(action) {
    const direction = action.direction || 'forward';

    if (action.cutting) {
      return STAMINA_COSTS.movement.cutting * 0.5;
    }
    if (action.lateral) {
      return STAMINA_COSTS.movement.lateral * 0.5;
    }

    return (STAMINA_COSTS.movement[direction] || 0.5) * 0.5;
  }

  /**
   * Calculate ongoing state cost
   */
  calculateStateCost(fighter, deltaTime) {
    const state = fighter.state;
    const subState = fighter.subState;

    // Defensive states have ongoing cost
    if (state === FighterState.DEFENSIVE && subState) {
      const costPerSecond = STAMINA_COSTS.defense[subState] || 1.0;
      return costPerSecond * deltaTime;
    }

    // Moving states have ongoing cost
    if (state === FighterState.MOVING) {
      return STAMINA_COSTS.movement.circling * deltaTime * 0.5;
    }

    // Clinch holding
    if (state === FighterState.CLINCH) {
      return STAMINA_COSTS.clinch.holding * deltaTime;
    }

    return 0;
  }

  /**
   * Calculate stamina recovery for this tick
   */
  calculateRecovery(fighter, decision, deltaTime) {
    // Base recovery rate from cardio - GENEROUS for sustainable fights
    // High cardio fighters (90+) recover significantly faster
    // This helps pressure fighters who have elite conditioning
    const baseRate = fighter.stamina.cardio * 0.018;  // Increased from 0.015

    // State modifier - now all states have some recovery
    const stateMod = this.getStateRecoveryModifier(fighter);

    // Body damage reduces recovery
    const bodyDamageMod = 1 - (fighter.bodyDamage / 250);

    // Head damage slightly reduces recovery
    const headDamageMod = 1 - (fighter.headDamage / 500);

    // Age factor
    const ageMod = this.getAgeRecoveryModifier(fighter.physical.age);

    // Calculate total recovery
    let recovery = baseRate * stateMod * bodyDamageMod * headDamageMod * ageMod * deltaTime;

    // Only zero recovery when hurt (survival mode)
    if (fighter.state === FighterState.HURT) {
      recovery = 0;
    }

    return Math.max(0, recovery);
  }

  /**
   * Get recovery modifier based on current state
   */
  getStateRecoveryModifier(fighter) {
    const state = fighter.state;
    const subState = fighter.subState;

    // Base state modifier
    let modifier = RECOVERY_RATES.states[state] || 0;

    // Sub-state modifier for defensive
    if (state === FighterState.DEFENSIVE && subState) {
      modifier *= RECOVERY_RATES.defensiveSubStates[subState] || 0.5;
    }

    return modifier;
  }

  /**
   * Get age-based recovery modifier
   */
  getAgeRecoveryModifier(age) {
    if (age <= 25) return 1.0;
    if (age <= 30) return 0.95;
    if (age <= 32) return 0.90;
    if (age <= 35) return 0.82;
    if (age <= 38) return 0.72;
    return 0.60;
  }

  /**
   * Calculate between-round recovery
   */
  calculateBetweenRoundRecovery(fighter) {
    // Base from recovery rate attribute - BALANCED for gradual fatigue
    // A fighter with 75 recoveryRate should recover ~34% of max stamina between rounds
    // This allows fights to go 12 rounds while still building fatigue
    const baseRecovery = fighter.maxStamina * (fighter.stamina.recoveryRate / 100) * 0.45;

    // Corner effectiveness bonus (up to 12% extra)
    const cornerBonus = fighter.corner?.headTrainer?.strategySkill
      ? (fighter.corner.headTrainer.strategySkill / 100) * 0.12
      : 0;

    // Body damage penalty - body work wears you down
    const bodyPenalty = 1 - (fighter.bodyDamage / 250);

    // Age factor
    const ageMod = this.getAgeRecoveryModifier(fighter.physical.age);

    // Calculate total
    let recovery = baseRecovery * (1 + cornerBonus) * bodyPenalty * ageMod;

    // Cap at 55% of max - can recover decently but not fully
    recovery = Math.min(recovery, fighter.maxStamina * 0.55);

    return recovery;
  }

  /**
   * Apply fatigue effects to fighter
   */
  applyFatigueEffects(fighter) {
    // Effects are applied through modifiedAttributes in Fighter class
    // This is called to update the tier and any immediate effects

    const tier = fighter.staminaTier;

    // Visual/commentary effects could be triggered here
    if (tier === 'gassed' && !fighter._gasedWarningGiven) {
      fighter._gasedWarningGiven = true;
      // Could emit an event here
    }
  }

  /**
   * Check for second wind trigger
   */
  checkSecondWind(fighter, roundNumber) {
    // Must be championship rounds
    if (roundNumber < 9) return false;

    // Must be low on stamina
    if (fighter.getStaminaPercent() > 0.4) return false;

    // Must not have triggered already
    if (fighter.secondWindUsed) return false;

    // Roll for second wind
    const chance = fighter.stamina.secondWind / 100;

    // Heart bonus
    const heartBonus = (fighter.mental.heart - 50) / 200;

    // Total chance
    const totalChance = chance + heartBonus;

    if (Math.random() < totalChance) {
      // Trigger second wind
      fighter.secondWindUsed = true;

      // Restore stamina
      fighter.currentStamina += fighter.maxStamina * 0.25;

      // Add buff
      fighter.addBuff({
        type: 'second_wind',
        duration: 60,
        effects: {
          power: 10,
          speed: 5,
          recoveryBonus: 50
        }
      });

      return true;
    }

    return false;
  }

  /**
   * Calculate stamina drain from taking body damage
   */
  calculateBodyDamageStaminaDrain(damage, punchType) {
    let drain = damage * 0.5;

    // Liver shot
    if (punchType === PunchType.BODY_HOOK_LEAD || punchType === PunchType.BODY_HOOK_REAR) {
      // Chance of liver shot
      if (Math.random() < 0.15) {
        drain = damage * 1.0; // Double drain
      }
    }

    // Solar plexus
    if (punchType === PunchType.BODY_CROSS) {
      if (Math.random() < 0.1) {
        drain = damage * 0.8 + 5; // Extra flat drain
      }
    }

    return drain;
  }

  /**
   * Get stamina tier thresholds
   */
  getTierThresholds() {
    return {
      fresh: { min: 0.8, max: 1.0 },
      good: { min: 0.6, max: 0.8 },
      tired: { min: 0.4, max: 0.6 },
      exhausted: { min: 0.25, max: 0.4 },
      gassed: { min: 0, max: 0.25 }
    };
  }

  /**
   * Get fatigue penalties for a tier
   * Heart reduces fatigue penalties - elite heart fighters push through exhaustion
   * Holyfield (98 heart) at 'exhausted' tier performs like a normal fighter at 'tired'
   */
  getFatiguePenalties(tier, heart = 70) {
    const basePenalties = {
      fresh: {},
      good: {
        power: -3,
        speed: -2
      },
      tired: {
        power: -8,
        speed: -5,
        accuracy: -5,
        defense: -5
      },
      exhausted: {
        power: -15,
        speed: -12,
        accuracy: -10,
        defense: -15,
        movement: -10
      },
      gassed: {
        power: -30,
        speed: -25,
        accuracy: -20,
        defense: -30,
        movement: -25,
        chin: -15
      }
    };

    const penalties = basePenalties[tier] || {};

    // Heart reduces fatigue penalties
    // Elite heart (90+) reduces penalties by up to 40%
    // Average heart (70) = no change
    // Poor heart (50) = 20% worse penalties
    if (Object.keys(penalties).length > 0) {
      const heartFactor = 1 - (heart - 70) / 75; // 90 heart = 0.73x, 70 heart = 1x, 50 heart = 1.27x
      const adjustedPenalties = {};

      for (const [stat, penalty] of Object.entries(penalties)) {
        adjustedPenalties[stat] = Math.round(penalty * heartFactor);
      }

      return adjustedPenalties;
    }

    return penalties;
  }
}

export default StaminaManager;
