/**
 * Stamina Manager
 * Manages stamina expenditure, recovery, and fatigue effects
 */

import { FighterState, OffensiveSubState, DefensiveSubState, MovementSubState } from '../models/Fighter.js';
import { ActionType, PunchType } from './FighterAI.js';

// Stamina costs by action type
// DYNAMIC: Stamina should fluctuate dramatically - high costs, high recovery
// Throwing punches drains you fast, but rest recovers quickly
// This makes energy management a visible, tactical element
const STAMINA_COSTS = {
  // Punches - Balanced costs for visible but sustainable drain
  punches: {
    [PunchType.JAB]: 0.35,
    [PunchType.CROSS]: 0.80,
    [PunchType.LEAD_HOOK]: 0.70,
    [PunchType.REAR_HOOK]: 0.95,
    [PunchType.LEAD_UPPERCUT]: 0.65,
    [PunchType.REAR_UPPERCUT]: 1.0,
    [PunchType.BODY_JAB]: 0.40,
    [PunchType.BODY_CROSS]: 0.85,
    [PunchType.BODY_HOOK_LEAD]: 0.75,
    [PunchType.BODY_HOOK_REAR]: 1.0
  },

  // Combination bonus costs
  combination: {
    2: 0.15,
    3: 0.35,
    4: 0.60,
    5: 1.0
  },

  // Defensive actions (per second) - light ongoing cost
  defense: {
    [DefensiveSubState.HIGH_GUARD]: 0.1,      // Holding guard up
    [DefensiveSubState.PHILLY_SHELL]: 0.05,   // Efficient shoulder roll
    [DefensiveSubState.HEAD_MOVEMENT]: 0.2,   // Active bobbing/weaving
    [DefensiveSubState.DISTANCE]: 0.08,       // Footwork-based
    [DefensiveSubState.PARRYING]: 0.15        // Active hand defense
  },

  // Movement (per second) - light movement costs
  movement: {
    forward: 0.08,        // Pressing forward
    backward: 0.05,       // Backing up
    lateral: 0.1,         // Side to side
    circling: 0.12,       // Circling opponent
    cutting: 0.2,         // Ring cutting
    retreating: 0.1,      // Quick retreat
    burst: 0.3            // Explosive movement
  },

  // Baseline fight cost - constant energy expenditure
  // Being in a boxing match is exhausting even when not throwing punches
  baseline: 0.12,  // Per second - moderate drain just for being active (~22/round)

  // Other
  clinch: {
    initiation: 0.5,
    holding: 0.1,         // Clinching is for rest
    breaking: 0.8
  },

  // Damage effects - getting hit saps energy, hard shots drain more
  damage: {
    gettingHitBase: 0.3,       // Base drain per hit
    gettingHitPerPower: 0.02,  // Additional drain per power point (30 power = +0.6)
    bodyHitMultiplier: 1.5,    // Body shots drain 50% more stamina
    beingHurt: 1.5,            // Per second while hurt
    knockdownRecovery: 10.0
  }
};

// Recovery rates - Recovery requires truly resting, not just defending
const RECOVERY_RATES = {
  // State-based recovery multipliers
  // Only meaningful recovery when truly passive - can't recover while engaged
  states: {
    [FighterState.NEUTRAL]: 1.0,      // Standard recovery when neutral
    [FighterState.DEFENSIVE]: 0.9,    // Good recovery while defending
    [FighterState.TIMING]: 0.6,       // Counter-punchers stay ready - moderate
    [FighterState.MOVING]: 0.4,       // Moving takes energy but allows some recovery
    [FighterState.OFFENSIVE]: 0.2,    // Minimal recovery when attacking
    [FighterState.CLINCH]: 1.5,       // Clinching is for recovery (holding on)
    [FighterState.HURT]: 0.0          // No recovery when hurt
  },

  // Defensive sub-state recovery - REPLACES state modifier, doesn't multiply
  defensiveSubStates: {
    [DefensiveSubState.HIGH_GUARD]: 0.9,    // Holding guard - decent recovery
    [DefensiveSubState.PHILLY_SHELL]: 1.0,  // Efficient style - best defensive recovery
    [DefensiveSubState.HEAD_MOVEMENT]: 0.4, // Active bobbing - minimal recovery
    [DefensiveSubState.DISTANCE]: 0.7,      // Using legs - some recovery
    [DefensiveSubState.PARRYING]: 0.5       // Active hands - less recovery
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
   * DYNAMIC: High costs create visible drain during exchanges
   */
  calculateCost(fighter, decision, deltaTime) {
    let cost = 0;

    // BASELINE COST - just being in the fight drains energy
    cost += STAMINA_COSTS.baseline * deltaTime;

    // Action cost - punches are expensive!
    if (decision.action) {
      cost += this.calculateActionCost(decision.action, fighter);
    }

    // State cost (ongoing)
    cost += this.calculateStateCost(fighter, deltaTime);

    // Damage cost (if hurt) - being hurt is exhausting
    if (fighter.isHurt) {
      cost += STAMINA_COSTS.damage.beingHurt * deltaTime;
    }

    // Work rate reduces costs dramatically
    // Elite workRate (92) = 50% cost reduction (built for sustained output)
    // Average workRate (70) = 20% cost reduction
    // Poor workRate (50) = no reduction
    const workRateMod = Math.max(0.50, 1 - (fighter.stamina.workRate - 50) * 0.012);
    cost *= workRateMod;

    // Pace control helps manage energy expenditure
    // High paceControl (90) = 30% additional reduction
    // This represents knowing when to breathe, when to take off
    const paceControlMod = Math.max(0.70, 1 - (fighter.stamina.paceControl - 50) * 0.0075);
    cost *= paceControlMod;

    // Cardio affects efficiency too - better conditioned = more efficient
    const cardioMod = Math.max(0.80, 1 - (fighter.stamina.cardio - 50) * 0.005);
    cost *= cardioMod;

    // Body damage increases costs significantly - body work pays off
    const bodyDamageMod = 1 + (fighter.bodyDamage / 120);
    cost *= bodyDamageMod;

    // Fatigue spiral - tired fighters burn even more energy
    const fatigueLevel = 1 - fighter.getStaminaPercent();
    const fatigueMod = 1 + (fatigueLevel * 0.4);
    cost *= fatigueMod;

    // MINIMUM DRAIN FLOOR - always drain at least this much per second
    // Being in a boxing match is exhausting no matter what you're doing
    // This ensures fighters can NEVER pin at 100% stamina
    const minimumDrain = 0.08 * deltaTime;  // ~0.08/sec minimum drain
    cost = Math.max(cost, minimumDrain);

    return Math.max(0, cost);
  }

  /**
   * Check if fighter has enough stamina to perform an action
   * Actions are GATED by stamina - you can only do what your energy allows
   * This prevents fighters from throwing punches when completely exhausted
   * @param {Fighter} fighter - The fighter attempting the action
   * @param {Object} action - The action being attempted
   * @returns {Object} - { canPerform: boolean, cost: number, deficit: number }
   */
  canPerformAction(fighter, action) {
    // No action or non-punch actions always allowed
    if (!action || action.type !== ActionType.PUNCH) {
      return { canPerform: true, cost: 0, deficit: 0 };
    }

    // Calculate the base cost for this action
    const baseCost = this.calculateActionCost(action, fighter);

    // Apply fighter-specific modifiers (same as calculateCost)
    const workRateMod = Math.max(0.50, 1 - (fighter.stamina.workRate - 50) * 0.012);
    const paceControlMod = Math.max(0.70, 1 - (fighter.stamina.paceControl - 50) * 0.0075);
    const cardioMod = Math.max(0.80, 1 - (fighter.stamina.cardio - 50) * 0.005);
    const bodyDamageMod = 1 + (fighter.bodyDamage / 120);
    const fatigueLevel = 1 - fighter.getStaminaPercent();
    const fatigueMod = 1 + (fatigueLevel * 0.4);

    const finalCost = baseCost * workRateMod * paceControlMod * cardioMod * bodyDamageMod * fatigueMod;

    // Fighter must have enough stamina to perform the action
    const canPerform = fighter.currentStamina >= finalCost;
    const deficit = canPerform ? 0 : finalCost - fighter.currentStamina;

    return { canPerform, cost: finalCost, deficit };
  }

  /**
   * Get alternative action when primary action cannot be performed due to insufficient stamina
   * When a fighter is too exhausted to throw punches, they must resort to defensive actions
   * @param {Fighter} fighter - The fighter
   * @param {Object} originalAction - The action that couldn't be performed
   * @param {Object} situation - Current fight situation (distance, opponent state, etc.)
   * @returns {Object} - Replacement action with reason
   */
  getStaminaGatedAlternative(fighter, originalAction, situation) {
    const staminaPercent = fighter.getStaminaPercent();
    const distance = situation?.distance || 4;

    // At desperately low stamina and close to opponent - try to clinch for recovery
    if (staminaPercent < 0.05 && distance < 3) {
      return {
        type: ActionType.CLINCH,
        reason: 'stamina_gated',
        message: 'Too exhausted to punch - attempting to clinch'
      };
    }

    // At very low stamina - go into defensive shell and wait
    if (staminaPercent < 0.10) {
      return {
        type: ActionType.BLOCK,
        blockType: DefensiveSubState.HIGH_GUARD,
        reason: 'stamina_gated',
        message: 'Too exhausted to punch - covering up'
      };
    }

    // Default - just wait and recover
    return {
      type: ActionType.WAIT,
      reason: 'stamina_gated',
      message: 'Insufficient stamina for punch'
    };
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
   * Calculate stamina cost from getting hit
   * Hard shots drain more stamina - body shots are especially draining
   */
  calculateHitStaminaCost(damage, location, attacker) {
    // Base cost from getting hit
    let cost = STAMINA_COSTS.damage.gettingHitBase;

    // Add cost based on damage dealt (harder shots drain more)
    cost += damage * STAMINA_COSTS.damage.gettingHitPerPower;

    // Body shots drain extra stamina
    const isBody = location === 'body';
    if (isBody) {
      cost *= STAMINA_COSTS.damage.bodyHitMultiplier;
    }

    return cost;
  }

  /**
   * Calculate stamina recovery for this tick
   * Recovery should be meaningful but not instant - fighters need to truly rest to recover
   * Recovery is SLOW - you can't out-recover the cost of fighting
   *
   * KEY: Recovery efficiency decreases as stamina increases - prevents pinning at 100%
   */
  calculateRecovery(fighter, decision, deltaTime) {
    // Base recovery rate from cardio
    // Elite cardio (90) ~= 0.72/sec base, Average (70) ~= 0.56/sec, Poor (50) ~= 0.40/sec
    const baseRate = fighter.stamina.cardio * 0.008;

    // State modifier - only recover meaningfully when truly resting
    const stateMod = this.getStateRecoveryModifier(fighter);

    // Attribute bonuses - ADDITIVE not multiplicative to prevent stacking abuse
    const paceControlBonus = (fighter.stamina.paceControl - 50) * 0.005;
    const recoveryBonus = (fighter.stamina.recoveryRate - 50) * 0.005;
    const attributeBonus = 1 + Math.min(0.35, paceControlBonus + recoveryBonus);

    // Body damage reduces recovery significantly
    const bodyDamageMod = 1 - (fighter.bodyDamage / 150);

    // Head damage reduces recovery
    const headDamageMod = 1 - (fighter.headDamage / 300);

    // Age factor
    const ageMod = this.getAgeRecoveryModifier(fighter.physical.age);

    // STAMINA CEILING - Recovery efficiency drops as stamina increases
    // This prevents fighters from pinning at 100%
    // At 50% stamina: 100% efficiency (full recovery rate)
    // At 75% stamina: 60% efficiency
    // At 90% stamina: 25% efficiency
    // At 95% stamina: 10% efficiency
    // At 100% stamina: 0% efficiency (no recovery when full)
    const staminaPercent = fighter.getStaminaPercent();
    const ceilingEfficiency = this.getRecoveryCeilingEfficiency(staminaPercent);

    // Calculate total recovery
    let recovery = baseRate * stateMod * attributeBonus * bodyDamageMod * headDamageMod * ageMod * ceilingEfficiency * deltaTime;

    // Zero recovery when hurt (survival mode)
    if (fighter.state === FighterState.HURT) {
      recovery = 0;
    }

    return Math.max(0, recovery);
  }

  /**
   * Get recovery efficiency based on current stamina level
   * Creates a "ceiling effect" - harder to recover as you approach 100%
   * This prevents fighters from pinning at max stamina
   */
  getRecoveryCeilingEfficiency(staminaPercent) {
    // Below 50%: full efficiency
    if (staminaPercent <= 0.50) return 1.0;

    // 50-70%: gradual decline (100% -> 80%)
    if (staminaPercent <= 0.70) {
      return 1.0 - (staminaPercent - 0.50) * 1.0; // 1.0 at 50%, 0.8 at 70%
    }

    // 70-85%: steeper decline (80% -> 40%)
    if (staminaPercent <= 0.85) {
      return 0.8 - (staminaPercent - 0.70) * 2.67; // 0.8 at 70%, 0.4 at 85%
    }

    // 85-95%: steep decline (40% -> 10%)
    if (staminaPercent <= 0.95) {
      return 0.4 - (staminaPercent - 0.85) * 3.0; // 0.4 at 85%, 0.1 at 95%
    }

    // 95-100%: nearly impossible to recover (10% -> 0%)
    return Math.max(0, 0.1 - (staminaPercent - 0.95) * 2.0);
  }

  /**
   * Get recovery modifier based on current state
   */
  getStateRecoveryModifier(fighter) {
    const state = fighter.state;
    const subState = fighter.subState;

    // For defensive state, use sub-state modifier directly (not multiplied)
    if (state === FighterState.DEFENSIVE && subState) {
      return RECOVERY_RATES.defensiveSubStates[subState] || 0.5;
    }

    // Otherwise use base state modifier
    return RECOVERY_RATES.states[state] || 0;
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
   * DYNAMIC: Significant recovery between rounds - the minute break matters
   */
  calculateBetweenRoundRecovery(fighter) {
    // Base from recovery rate attribute - GENEROUS for dramatic round-to-round swings
    // Elite recovery (90) = can recover ~50% of max between rounds
    // Average recovery (70) = can recover ~35% of max
    // Poor recovery (50) = can recover ~25% of max
    const baseRecovery = fighter.maxStamina * (fighter.stamina.recoveryRate / 100) * 0.55;

    // Cardio bonus - well-conditioned fighters recover better between rounds
    const cardioBonus = 1 + (fighter.stamina.cardio - 50) * 0.008;

    // Corner effectiveness bonus (up to 15% extra)
    const cornerBonus = fighter.corner?.headTrainer?.strategySkill
      ? (fighter.corner.headTrainer.strategySkill / 100) * 0.15
      : 0;

    // Body damage penalty - body work accumulates and hurts recovery
    const bodyPenalty = 1 - (fighter.bodyDamage / 200);

    // Age factor
    const ageMod = this.getAgeRecoveryModifier(fighter.physical.age);

    // Calculate total
    let recovery = baseRecovery * cardioBonus * (1 + cornerBonus) * bodyPenalty * ageMod;

    // Cap at 60% of max - significant recovery but can't fully reset
    recovery = Math.min(recovery, fighter.maxStamina * 0.60);

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

  /**
   * Get zero stamina vulnerability modifiers
   * When stamina is at/near zero, fighters become extremely vulnerable to KO
   * This represents complete exhaustion - a fighter with no energy left
   * @param {number} staminaPercent - Current stamina as percentage (0-1)
   * @returns {Object} - { chinPenalty: number, koMultiplier: number }
   */
  getZeroStaminaVulnerability(staminaPercent) {
    // Vulnerability kicks in below 10% stamina
    if (staminaPercent > 0.10) {
      return { chinPenalty: 0, koMultiplier: 1.0 };
    }

    // At 0-10% stamina, apply escalating penalties
    // At exactly 0%: -30 chin, 2.0x KO multiplier (extremely vulnerable)
    // At 5%: -15 chin, 1.5x KO multiplier
    // At 10%: no additional penalty
    const severityFactor = 1 - (staminaPercent / 0.10); // 0 at 10%, 1 at 0%

    const chinPenalty = Math.round(-30 * severityFactor);
    const koMultiplier = 1.0 + (1.0 * severityFactor); // 1.0 to 2.0

    return { chinPenalty, koMultiplier };
  }
}

export default StaminaManager;
