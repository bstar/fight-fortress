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
  // Punches - Reduced costs so fighters can sustain activity across 12 rounds
  // A fighter throwing 50 punches/round shouldn't gas out by round 6
  punches: {
    [PunchType.JAB]: 0.20,          // Light, efficient punch
    [PunchType.CROSS]: 0.50,        // Power punch but common
    [PunchType.LEAD_HOOK]: 0.45,    // Solid power punch
    [PunchType.REAR_HOOK]: 0.60,    // Heavy power punch
    [PunchType.LEAD_UPPERCUT]: 0.40,
    [PunchType.REAR_UPPERCUT]: 0.65,
    [PunchType.BODY_JAB]: 0.25,
    [PunchType.BODY_CROSS]: 0.55,
    [PunchType.BODY_HOOK_LEAD]: 0.50,
    [PunchType.BODY_HOOK_REAR]: 0.65
  },

  // Combination bonus costs - reduced to allow sustained combinations
  combination: {
    2: 0.10,
    3: 0.20,
    4: 0.35,
    5: 0.55
  },

  // Defensive actions (per second) - very light ongoing cost
  // Holding guard shouldn't drain you fast - it's a resting position
  defense: {
    [DefensiveSubState.HIGH_GUARD]: 0.03,      // Holding guard up - minimal cost
    [DefensiveSubState.PHILLY_SHELL]: 0.02,    // Efficient shoulder roll
    [DefensiveSubState.HEAD_MOVEMENT]: 0.08,   // Active bobbing/weaving
    [DefensiveSubState.DISTANCE]: 0.04,        // Footwork-based
    [DefensiveSubState.PARRYING]: 0.06         // Active hand defense
  },

  // Movement (per second) - reduced movement costs
  // Footwork is tiring but shouldn't drain fighters rapidly
  movement: {
    forward: 0.04,        // Pressing forward
    backward: 0.03,       // Backing up
    lateral: 0.05,        // Side to side
    circling: 0.06,       // Circling opponent
    cutting: 0.10,        // Ring cutting (most intensive)
    retreating: 0.05,     // Quick retreat
    burst: 0.15           // Explosive movement
  },

  // Baseline fight cost - constant energy expenditure
  // Being in a boxing match is exhausting even when not throwing punches
  // But this should be LOW - most stamina drain comes from ACTIONS not just existing
  baseline: 0.04,  // Per second - light drain just for being active (~7/round)

  // Other
  clinch: {
    initiation: 0.5,
    holding: 0.1,         // Clinching is for rest
    breaking: 0.8
  },

  // Damage effects - getting hit saps energy, hard shots drain more
  damage: {
    gettingHitBase: 0.5,       // Base drain per hit (increased)
    gettingHitPerPower: 0.05,  // Additional drain per power point (30 power = +1.5)
    bodyHitMultiplier: 1.8,    // Body shots drain 80% more stamina
    beingHurt: 2.0,            // Per second while hurt (increased)
    knockdownRecovery: 15.0,   // Knockdowns are devastating
    buzzedDrainPerSec: 1.0     // Drain while buzzed/stunned
  },

  // Miss penalties - swinging and missing is exhausting
  miss: {
    baseMissMultiplier: 1.3,   // Missed punches cost 30% more than landing
    powerMissMultiplier: 1.8,  // Missed power punches cost 80% more
    haymakMissMultiplier: 2.5, // Wild haymakers that miss drain hard
    comboMissPenalty: 0.3      // Per missed punch in a combination
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

    // Buzzed state also drains stamina - trying to stay upright while wobbled
    if (fighter.isBuzzed) {
      cost += STAMINA_COSTS.damage.buzzedDrainPerSec * deltaTime;
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

    // NOTE: Removed fatigue spiral modifier - it caused death spiral
    // where tired fighters burned more energy, getting more tired, etc.
    // Now fatigue effects are handled purely through attribute penalties

    // Get current stamina for conservation calculations
    const currentPercent = fighter.getStaminaPercent();

    // CONSERVATION MODE - When actively resting, reduce costs significantly
    // This makes "CONSERVING" strategy actually work to recover stamina
    const isRecoveryState = fighter.state === FighterState.DEFENSIVE ||
                           fighter.state === FighterState.NEUTRAL ||
                           fighter.state === FighterState.CLINCH ||
                           fighter.state === FighterState.TIMING;

    if (isRecoveryState && currentPercent < 0.50) {
      // Reduce all costs by 50-80% when actively conserving at low stamina
      const conservationReduction = 0.5 + (0.50 - currentPercent) * 0.6; // 50% to 80% reduction
      cost *= (1 - conservationReduction);
    }

    // MINIMUM DRAIN FLOOR - always drain at least this much per second
    // BUT: Reduced or eliminated when actively conserving
    // This allows stamina to actually GO UP when resting
    let minimumDrain = 0.02 * deltaTime;  // ~0.02/sec minimum drain

    if (isRecoveryState && currentPercent < 0.40) {
      // No minimum drain when actively resting at low stamina
      // This allows visible recovery
      minimumDrain = 0;
    }

    cost = Math.max(cost, minimumDrain);

    // Apply stamina floor - fighters with good cardio maintain a reserve
    // Elite cardio (90) = 10% floor, Average (70) = 5% floor, Poor (50) = 2% floor
    const staminaFloor = (fighter.stamina.cardio - 40) * 0.002; // 0.02-0.10

    // If we're near the floor, reduce cost to prevent going below it
    if (currentPercent - (cost / fighter.maxStamina) < staminaFloor) {
      const maxAllowedCost = (currentPercent - staminaFloor) * fighter.maxStamina;
      cost = Math.max(0, maxAllowedCost);
    }

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
    // NOTE: Removed fatigue modifier - it caused death spiral

    const finalCost = baseCost * workRateMod * paceControlMod * cardioMod * bodyDamageMod;

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
   * Calculate extra stamina cost from missing punches
   * Missing power punches is exhausting - you wind up, swing, miss, and have to recover
   * @param {string} punchType - The type of punch that missed
   * @param {boolean} isWildSwing - True if it was a desperate/wild swing (haymaker)
   * @returns {number} - Extra stamina cost for the miss
   */
  calculateMissStaminaCost(punchType, isWildSwing = false) {
    // Get base punch cost
    const baseCost = STAMINA_COSTS.punches[punchType] || 0.3;

    // Determine miss multiplier based on punch type
    const powerPunches = ['cross', 'rear_hook', 'rear_uppercut', 'body_hook_rear', 'body_cross'];
    const isPower = powerPunches.includes(punchType);

    let missMultiplier;
    if (isWildSwing) {
      // Wild haymakers that miss are devastating to stamina
      missMultiplier = STAMINA_COSTS.miss.haymakMissMultiplier;
    } else if (isPower) {
      // Power punches that miss cost more
      missMultiplier = STAMINA_COSTS.miss.powerMissMultiplier;
    } else {
      // Jabs and light punches - minimal miss penalty
      missMultiplier = STAMINA_COSTS.miss.baseMissMultiplier;
    }

    // The extra cost is the difference between miss cost and landing cost
    // (since landing cost is already applied, we add the extra penalty)
    return baseCost * (missMultiplier - 1);
  }

  /**
   * Calculate extra stamina cost from missing multiple punches in a combination
   * Throwing a 4-punch combo where 3 punches miss is exhausting
   * @param {number} punchesThrown - Total punches in combo
   * @param {number} punchesMissed - Number that missed
   * @returns {number} - Extra stamina cost for the misses
   */
  calculateComboMissStaminaCost(punchesThrown, punchesMissed) {
    if (punchesThrown === 0 || punchesMissed === 0) return 0;

    // Penalty scales with how many missed
    // If you throw 4 and miss 3, that's really tiring
    const missRate = punchesMissed / punchesThrown;

    // High miss rate on combos = extra penalty
    if (missRate >= 0.75) {
      // Mostly whiffed - big penalty
      return punchesMissed * STAMINA_COSTS.miss.comboMissPenalty * 1.5;
    } else if (missRate >= 0.50) {
      // Half missed - moderate penalty
      return punchesMissed * STAMINA_COSTS.miss.comboMissPenalty;
    } else {
      // Landed most - small penalty
      return punchesMissed * STAMINA_COSTS.miss.comboMissPenalty * 0.5;
    }
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

    // CONSERVATION BONUS - When actively conserving (low stamina + recovery-friendly state)
    // Fighters who recognize they need to rest and actively do so get rewarded
    // This makes the "CONSERVING" strategy much more effective
    const conservationBonus = this.getConservationBonus(fighter, staminaPercent);

    // Calculate total recovery
    let recovery = baseRate * stateMod * attributeBonus * bodyDamageMod * headDamageMod * ageMod * ceilingEfficiency * conservationBonus * deltaTime;

    // Zero recovery when hurt (survival mode)
    if (fighter.state === FighterState.HURT) {
      recovery = 0;
    }

    return Math.max(0, recovery);
  }

  /**
   * Calculate conservation bonus for recovery
   * When fighters are low on stamina and actively resting (defensive/neutral/clinch),
   * they get a SIGNIFICANT recovery bonus - rewarding smart energy management
   * This should make stamina visibly go UP when conserving
   */
  getConservationBonus(fighter, staminaPercent) {
    const state = fighter.state;

    // Only applies when in recovery-friendly states
    const isConservingState = state === FighterState.DEFENSIVE ||
                              state === FighterState.NEUTRAL ||
                              state === FighterState.CLINCH ||
                              state === FighterState.TIMING;

    if (!isConservingState) {
      return 1.0; // No bonus when attacking/moving/hurt
    }

    // Conservation bonus scales with how depleted stamina is
    // At 50% stamina: 1.5x (mild bonus - reward early conservation)
    // At 40% stamina: 2.5x bonus
    // At 30% stamina: 3.5x bonus
    // At 20% stamina: 4.5x bonus
    // At 10% stamina: 5.5x bonus (desperate recovery)
    if (staminaPercent >= 0.50) {
      return 1.5; // Mild bonus even above 50% to encourage conservation
    }

    // Calculate bonus - STRONG scaling as stamina drops
    // Formula: 1.5 + (0.5 - staminaPercent) * 8
    // This gives us 1.5 at 50%, 3.5 at 40%, 4.5 at 30%, 5.5 at ~20%
    const depletionLevel = 0.50 - staminaPercent;
    let bonus = 1.5 + (depletionLevel * 8.0);

    // Fight IQ bonus - smarter fighters conserve more efficiently
    const fightIQ = fighter.mental?.fightIQ || fighter.technical?.fightIQ || 70;
    const iqBonus = 1 + ((fightIQ - 50) / 100) * 0.4; // Up to +20% at 100 IQ
    bonus *= iqBonus;

    // Clinching gets extra bonus - it's the ultimate conservation move
    if (state === FighterState.CLINCH) {
      bonus *= 1.5;
    }

    // Recovery rate bonus - fighters with better recovery capitalize more
    const recoveryRate = fighter.stamina?.recoveryRate || 70;
    const recoveryBonus = 1 + ((recoveryRate - 50) / 100) * 0.3;
    bonus *= recoveryBonus;

    // Cap at 6x to prevent extreme recovery
    return Math.min(6.0, bonus);
  }

  /**
   * Get recovery efficiency based on current stamina level
   * Creates dynamic recovery that:
   * - BOOSTS recovery when very low (body wants to recover from exhaustion)
   * - Normal recovery in mid-range
   * - Reduces recovery as you approach 100% (ceiling effect)
   */
  getRecoveryCeilingEfficiency(staminaPercent) {
    // Very low stamina (0-15%): BOOSTED recovery - body desperately needs energy
    // This helps fighters climb out of "gassed" tier faster
    if (staminaPercent <= 0.15) {
      // 1.5x recovery at 0%, tapering to 1.3x at 15%
      return 1.5 - (staminaPercent / 0.15) * 0.2;
    }

    // Low stamina (15-30%): Moderate boost - still recovering urgently
    if (staminaPercent <= 0.30) {
      // 1.3x at 15%, tapering to 1.1x at 30%
      return 1.3 - ((staminaPercent - 0.15) / 0.15) * 0.2;
    }

    // Mid-range (30-90%): Normal recovery
    if (staminaPercent <= 0.90) return 1.0;

    // 90-95%: gradual decline (100% -> 50%)
    if (staminaPercent <= 0.95) {
      return 1.0 - (staminaPercent - 0.90) * 10.0;
    }

    // 95-100%: steep decline (50% -> 0%) - prevents pinning at max
    return Math.max(0, 0.5 - (staminaPercent - 0.95) * 10.0);
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
   * LOW STAMINA IS A MAJOR DEBUFF - tired fighters perform significantly worse
   * Heart reduces fatigue penalties - elite heart fighters push through exhaustion
   * Holyfield (98 heart) at 'exhausted' tier performs like a normal fighter at 'tired'
   */
  getFatiguePenalties(tier, heart = 70) {
    const basePenalties = {
      fresh: {},
      good: {
        power: -5,
        speed: -3,
        reflexes: -2
      },
      tired: {
        power: -12,
        speed: -10,
        accuracy: -8,
        defense: -10,
        reflexes: -8,
        footSpeed: -8
      },
      exhausted: {
        power: -25,
        speed: -20,
        accuracy: -18,
        defense: -25,
        movement: -20,
        reflexes: -18,
        footSpeed: -18,
        chin: -10,
        timing: -15
      },
      gassed: {
        power: -40,           // Can barely hurt opponent
        speed: -35,           // Punches are slow and telegraphed
        accuracy: -30,        // Missing badly
        defense: -40,         // Can't defend properly
        movement: -35,        // Legs are gone
        chin: -25,            // Very vulnerable to KO
        reflexes: -35,        // Can't react in time
        footSpeed: -35,       // Can't move out of the way
        timing: -25,          // No sense of timing left
        headMovement: -30,    // Can't slip punches
        blocking: -25         // Guard is dropping
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
