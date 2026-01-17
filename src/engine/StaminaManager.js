/**
 * Stamina Manager
 * Manages stamina expenditure, recovery, and fatigue effects
 * Parameters loaded from ModelParameters for versioned tuning
 */

import { FighterState, OffensiveSubState, DefensiveSubState, MovementSubState } from '../models/Fighter.js';
import { ActionType, PunchType } from './FighterAI.js';
import ModelParameters from './model/ModelParameters.js';

// Punch type to parameter key mapping
const PUNCH_TYPE_TO_KEY = {
  [PunchType.JAB]: 'jab',
  [PunchType.CROSS]: 'cross',
  [PunchType.LEAD_HOOK]: 'lead_hook',
  [PunchType.REAR_HOOK]: 'rear_hook',
  [PunchType.LEAD_UPPERCUT]: 'lead_uppercut',
  [PunchType.REAR_UPPERCUT]: 'rear_uppercut',
  [PunchType.BODY_JAB]: 'body_jab',
  [PunchType.BODY_CROSS]: 'body_cross',
  [PunchType.BODY_HOOK_LEAD]: 'body_hook_lead',
  [PunchType.BODY_HOOK_REAR]: 'body_hook_rear'
};

// Defense sub-state to parameter key mapping
const DEFENSE_STATE_TO_KEY = {
  [DefensiveSubState.HIGH_GUARD]: 'high_guard',
  [DefensiveSubState.PHILLY_SHELL]: 'philly_shell',
  [DefensiveSubState.HEAD_MOVEMENT]: 'head_movement',
  [DefensiveSubState.DISTANCE]: 'distance',
  [DefensiveSubState.PARRYING]: 'parrying'
};

// Fighter state to parameter key mapping
const FIGHTER_STATE_TO_KEY = {
  [FighterState.NEUTRAL]: 'neutral',
  [FighterState.DEFENSIVE]: 'defensive',
  [FighterState.TIMING]: 'timing',
  [FighterState.MOVING]: 'moving',
  [FighterState.OFFENSIVE]: 'offensive',
  [FighterState.CLINCH]: 'clinch',
  [FighterState.HURT]: 'hurt'
};

/**
 * Get stamina cost for a punch type from parameters
 */
const getPunchCost = (punchType) => {
  const key = PUNCH_TYPE_TO_KEY[punchType] || 'jab';
  return ModelParameters.get(`stamina.costs.punches.${key}`, 0.30);
};

/**
 * Get combination bonus cost from parameters
 */
const getCombinationCost = (comboLength) => {
  const clampedLength = Math.min(5, Math.max(2, comboLength));
  return ModelParameters.get(`stamina.costs.combination.${clampedLength}`, 0.20);
};

/**
 * Get defensive action cost from parameters
 */
const getDefenseCost = (defenseState) => {
  const key = DEFENSE_STATE_TO_KEY[defenseState] || 'high_guard';
  return ModelParameters.get(`stamina.costs.defense.${key}`, 0.03);
};

/**
 * Get movement cost from parameters
 */
const getMovementCost = (direction) => {
  return ModelParameters.get(`stamina.costs.movement.${direction}`, 0.05);
};

/**
 * Get damage-related stamina cost from parameters
 */
const getDamageCost = (costType) => {
  const keyMap = {
    gettingHitBase: 'getting_hit_base',
    gettingHitPerPower: 'getting_hit_per_power',
    bodyHitMultiplier: 'body_hit_multiplier',
    beingHurt: 'being_hurt',
    knockdownRecovery: 'knockdown_recovery',
    buzzedDrainPerSec: 'buzzed_drain_per_sec'
  };
  const key = keyMap[costType] || costType;
  const defaults = {
    getting_hit_base: 0.5,
    getting_hit_per_power: 0.05,
    body_hit_multiplier: 1.8,
    being_hurt: 2.0,
    knockdown_recovery: 15.0,
    buzzed_drain_per_sec: 1.0
  };
  return ModelParameters.get(`stamina.costs.damage.${key}`, defaults[key] || 0.5);
};

/**
 * Get miss penalty from parameters
 */
const getMissCost = (missType) => {
  const keyMap = {
    baseMissMultiplier: 'base_multiplier',
    powerMissMultiplier: 'power_multiplier',
    haymakMissMultiplier: 'haymaker_multiplier',
    comboMissPenalty: 'combo_penalty'
  };
  const key = keyMap[missType] || missType;
  const defaults = {
    base_multiplier: 1.3,
    power_multiplier: 1.8,
    haymaker_multiplier: 2.5,
    combo_penalty: 0.3
  };
  return ModelParameters.get(`stamina.costs.miss.${key}`, defaults[key] || 1.3);
};

/**
 * Get recovery rate for a fighter state from parameters
 */
const getStateRecoveryRate = (state) => {
  const key = FIGHTER_STATE_TO_KEY[state] || 'neutral';
  return ModelParameters.get(`stamina.recovery.states.${key}`, 0.5);
};

/**
 * Get defensive sub-state recovery rate from parameters
 */
const getDefensiveSubStateRecovery = (subState) => {
  const key = DEFENSE_STATE_TO_KEY[subState] || 'high_guard';
  return ModelParameters.get(`stamina.recovery.defensive_substates.${key}`, 0.5);
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
   * Parameters loaded from ModelParameters
   */
  calculateCost(fighter, decision, deltaTime) {
    // Load efficiency parameters
    const efficiencyParams = {
      workRateThreshold: ModelParameters.get('stamina.efficiency.work_rate.base_threshold', 50),
      workRateFactor: ModelParameters.get('stamina.efficiency.work_rate.factor', 0.012),
      workRateMin: ModelParameters.get('stamina.efficiency.work_rate.min_multiplier', 0.50),
      paceControlThreshold: ModelParameters.get('stamina.efficiency.pace_control.base_threshold', 50),
      paceControlFactor: ModelParameters.get('stamina.efficiency.pace_control.factor', 0.0075),
      paceControlMin: ModelParameters.get('stamina.efficiency.pace_control.min_multiplier', 0.70),
      cardioThreshold: ModelParameters.get('stamina.efficiency.cardio.base_threshold', 50),
      cardioFactor: ModelParameters.get('stamina.efficiency.cardio.factor', 0.005),
      cardioMin: ModelParameters.get('stamina.efficiency.cardio.min_multiplier', 0.80),
      bodyDamageFactor: ModelParameters.get('stamina.efficiency.body_damage_cost_factor', 120)
    };

    const conservationParams = {
      enabledThreshold: ModelParameters.get('stamina.conservation.cost_reduction.enabled_threshold', 0.50),
      minReduction: ModelParameters.get('stamina.conservation.cost_reduction.min_reduction', 0.50),
      scaling: ModelParameters.get('stamina.conservation.cost_reduction.scaling', 0.6),
      minDrainNormal: ModelParameters.get('stamina.conservation.minimum_drain.normal', 0.02),
      minDrainThreshold: ModelParameters.get('stamina.conservation.minimum_drain.conserving_threshold', 0.40)
    };

    const floorParams = {
      cardioThreshold: ModelParameters.get('stamina.floor.cardio_threshold', 40),
      factor: ModelParameters.get('stamina.floor.factor', 0.002)
    };

    // Calculate base costs (functional approach)
    const baseline = ModelParameters.get('stamina.costs.baseline', 0.04);
    const baselineCost = baseline * deltaTime;
    const actionCost = decision.action ? this.calculateActionCost(decision.action, fighter) : 0;
    const stateCost = this.calculateStateCost(fighter, deltaTime);
    const hurtCost = fighter.isHurt ? getDamageCost('beingHurt') * deltaTime : 0;
    const buzzedCost = fighter.isBuzzed ? getDamageCost('buzzedDrainPerSec') * deltaTime : 0;

    const rawCost = baselineCost + actionCost + stateCost + hurtCost + buzzedCost;

    // Calculate efficiency modifiers
    const workRateMod = Math.max(efficiencyParams.workRateMin,
      1 - (fighter.stamina.workRate - efficiencyParams.workRateThreshold) * efficiencyParams.workRateFactor);
    const paceControlMod = Math.max(efficiencyParams.paceControlMin,
      1 - (fighter.stamina.paceControl - efficiencyParams.paceControlThreshold) * efficiencyParams.paceControlFactor);
    const cardioMod = Math.max(efficiencyParams.cardioMin,
      1 - (fighter.stamina.cardio - efficiencyParams.cardioThreshold) * efficiencyParams.cardioFactor);
    const bodyDamageMod = 1 + (fighter.bodyDamage / efficiencyParams.bodyDamageFactor);

    const currentPercent = fighter.getStaminaPercent();

    // Conservation mode check
    const isRecoveryState = fighter.state === FighterState.DEFENSIVE ||
                           fighter.state === FighterState.NEUTRAL ||
                           fighter.state === FighterState.CLINCH ||
                           fighter.state === FighterState.TIMING;

    const conservationMod = (isRecoveryState && currentPercent < conservationParams.enabledThreshold)
      ? 1 - (conservationParams.minReduction + (conservationParams.enabledThreshold - currentPercent) * conservationParams.scaling)
      : 1.0;

    // Apply all modifiers
    const modifiedCost = rawCost * workRateMod * paceControlMod * cardioMod * bodyDamageMod * conservationMod;

    // Apply minimum drain floor (functional)
    const minimumDrain = (isRecoveryState && currentPercent < conservationParams.minDrainThreshold)
      ? 0
      : conservationParams.minDrainNormal * deltaTime;

    const costWithFloor = Math.max(modifiedCost, minimumDrain);

    // Apply stamina floor protection
    const staminaFloor = (fighter.stamina.cardio - floorParams.cardioThreshold) * floorParams.factor;
    const maxAllowedCost = currentPercent - (costWithFloor / fighter.maxStamina) < staminaFloor
      ? Math.max(0, (currentPercent - staminaFloor) * fighter.maxStamina)
      : costWithFloor;

    return Math.max(0, maxAllowedCost);
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
   * Uses getter functions to load costs from parameters
   */
  calculateActionCost(action, _fighter) {
    switch (action.type) {
      case ActionType.PUNCH:
        return this.calculatePunchCost(action);

      case ActionType.BLOCK:
        return getDefenseCost(DefensiveSubState.HIGH_GUARD) * 0.5;

      case ActionType.EVADE:
        return getDefenseCost(DefensiveSubState.HEAD_MOVEMENT) * 0.5;

      case ActionType.MOVE:
        return this.calculateMovementCost(action);

      case ActionType.CLINCH:
        return ModelParameters.get('stamina.costs.clinch.initiation', 0.5);

      default:
        return 0;
    }
  }

  /**
   * Calculate punch cost using parameters
   */
  calculatePunchCost(action) {
    // Combination - use functional reduce pattern
    if (action.punchType === 'combination' && action.combination) {
      const punchCosts = action.combination.reduce(
        (total, punch) => total + getPunchCost(punch),
        0
      );
      const comboBonusCost = getCombinationCost(action.combination.length);
      return punchCosts + comboBonusCost;
    }

    // Single punch
    return getPunchCost(action.punchType);
  }

  /**
   * Calculate movement cost using parameters
   */
  calculateMovementCost(action) {
    const direction = action.direction || 'forward';

    if (action.cutting) {
      return getMovementCost('cutting') * 0.5;
    }
    if (action.lateral) {
      return getMovementCost('lateral') * 0.5;
    }

    return getMovementCost(direction) * 0.5;
  }

  /**
   * Calculate ongoing state cost using parameters
   */
  calculateStateCost(fighter, deltaTime) {
    const state = fighter.state;
    const subState = fighter.subState;

    // Defensive states have ongoing cost
    if (state === FighterState.DEFENSIVE && subState) {
      const costPerSecond = getDefenseCost(subState);
      return costPerSecond * deltaTime;
    }

    // Moving states have ongoing cost
    if (state === FighterState.MOVING) {
      return getMovementCost('circling') * deltaTime * 0.5;
    }

    // Clinch holding
    if (state === FighterState.CLINCH) {
      return ModelParameters.get('stamina.costs.clinch.holding', 0.1) * deltaTime;
    }

    return 0;
  }

  /**
   * Calculate stamina cost from getting hit
   * Hard shots drain more stamina - body shots are especially draining
   */
  calculateHitStaminaCost(damage, location, _attacker) {
    // Base cost from getting hit plus damage-scaled cost
    const baseCost = getDamageCost('gettingHitBase');
    const perPowerCost = getDamageCost('gettingHitPerPower');
    const rawCost = baseCost + (damage * perPowerCost);

    // Body shots drain extra stamina
    const bodyMultiplier = location === 'body' ? getDamageCost('bodyHitMultiplier') : 1.0;

    return rawCost * bodyMultiplier;
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
    const baseCost = getPunchCost(punchType);

    // Determine miss multiplier based on punch type (functional ternary chain)
    const powerPunches = ['cross', 'rear_hook', 'rear_uppercut', 'body_hook_rear', 'body_cross'];
    const isPower = powerPunches.includes(punchType);

    const missMultiplier = isWildSwing
      ? getMissCost('haymakMissMultiplier')
      : isPower
        ? getMissCost('powerMissMultiplier')
        : getMissCost('baseMissMultiplier');

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

    const missRate = punchesMissed / punchesThrown;
    const comboMissPenalty = getMissCost('comboMissPenalty');

    // High miss rate on combos = extra penalty (functional ternary)
    const missRateMultiplier = missRate >= 0.75 ? 1.5
      : missRate >= 0.50 ? 1.0
      : 0.5;

    return punchesMissed * comboMissPenalty * missRateMultiplier;
  }

  /**
   * Calculate stamina recovery for this tick
   * Recovery should be meaningful but not instant - fighters need to truly rest to recover
   * Recovery is SLOW - you can't out-recover the cost of fighting
   *
   * KEY: Recovery efficiency decreases as stamina increases - prevents pinning at 100%
   */
  calculateRecovery(fighter, _decision, deltaTime) {
    // Load recovery parameters
    const recoveryParams = {
      baseRatePerCardio: ModelParameters.get('stamina.recovery.base_rate_per_cardio', 0.008),
      paceControlFactor: ModelParameters.get('stamina.recovery.pace_control_factor', 0.005),
      recoveryRateFactor: ModelParameters.get('stamina.recovery.recovery_rate_factor', 0.005),
      maxAttributeBonus: ModelParameters.get('stamina.recovery.max_attribute_bonus', 0.35),
      bodyDamageFactor: ModelParameters.get('stamina.recovery.body_damage_factor', 150),
      headDamageFactor: ModelParameters.get('stamina.recovery.head_damage_factor', 300)
    };

    // Calculate base recovery rate from cardio
    const baseRate = fighter.stamina.cardio * recoveryParams.baseRatePerCardio;

    // State modifier - only recover meaningfully when truly resting
    const stateMod = this.getStateRecoveryModifier(fighter);

    // Attribute bonuses - ADDITIVE not multiplicative to prevent stacking abuse
    const paceControlBonus = (fighter.stamina.paceControl - 50) * recoveryParams.paceControlFactor;
    const recoveryBonus = (fighter.stamina.recoveryRate - 50) * recoveryParams.recoveryRateFactor;
    const attributeBonus = 1 + Math.min(recoveryParams.maxAttributeBonus, paceControlBonus + recoveryBonus);

    // Body damage reduces recovery significantly
    const bodyDamageMod = 1 - (fighter.bodyDamage / recoveryParams.bodyDamageFactor);

    // Head damage reduces recovery
    const headDamageMod = 1 - (fighter.headDamage / recoveryParams.headDamageFactor);

    // Age factor
    const ageMod = this.getAgeRecoveryModifier(fighter.physical.age);

    // Stamina ceiling efficiency (prevents pinning at 100%)
    const staminaPercent = fighter.getStaminaPercent();
    const ceilingEfficiency = this.getRecoveryCeilingEfficiency(staminaPercent);

    // Conservation bonus (reward smart energy management)
    const conservationBonus = this.getConservationBonus(fighter, staminaPercent);

    // Calculate total recovery (functional - no mutation)
    const rawRecovery = baseRate * stateMod * attributeBonus * bodyDamageMod * headDamageMod *
                        ageMod * ceilingEfficiency * conservationBonus * deltaTime;

    // Zero recovery when hurt (survival mode)
    const recovery = fighter.state === FighterState.HURT ? 0 : rawRecovery;

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

    // Load conservation parameters
    const conservParams = {
      mildThreshold: ModelParameters.get('stamina.conservation.recovery_bonus.mild_threshold', 0.50),
      mildBonus: ModelParameters.get('stamina.conservation.recovery_bonus.mild_bonus', 1.5),
      scaling: ModelParameters.get('stamina.conservation.recovery_bonus.scaling', 8.0),
      fightIQFactor: ModelParameters.get('stamina.conservation.recovery_bonus.fight_iq_factor', 0.4),
      clinchMultiplier: ModelParameters.get('stamina.conservation.recovery_bonus.clinch_multiplier', 1.5),
      recoveryRateFactor: ModelParameters.get('stamina.conservation.recovery_bonus.recovery_rate_factor', 0.3),
      maxBonus: ModelParameters.get('stamina.conservation.recovery_bonus.max_bonus', 6.0)
    };

    // Only applies when in recovery-friendly states
    const isConservingState = state === FighterState.DEFENSIVE ||
                              state === FighterState.NEUTRAL ||
                              state === FighterState.CLINCH ||
                              state === FighterState.TIMING;

    if (!isConservingState) {
      return 1.0; // No bonus when attacking/moving/hurt
    }

    // Mild bonus above threshold
    if (staminaPercent >= conservParams.mildThreshold) {
      return conservParams.mildBonus;
    }

    // Calculate bonus - scales with depletion level
    const depletionLevel = conservParams.mildThreshold - staminaPercent;
    const baseBonus = conservParams.mildBonus + (depletionLevel * conservParams.scaling);

    // Fight IQ bonus - smarter fighters conserve more efficiently
    const fightIQ = fighter.mental?.fightIQ || fighter.technical?.fightIQ || 70;
    const iqMod = 1 + ((fightIQ - 50) / 100) * conservParams.fightIQFactor;

    // Clinch bonus
    const clinchMod = state === FighterState.CLINCH ? conservParams.clinchMultiplier : 1.0;

    // Recovery rate bonus
    const recoveryRate = fighter.stamina?.recoveryRate || 70;
    const recoveryMod = 1 + ((recoveryRate - 50) / 100) * conservParams.recoveryRateFactor;

    // Combine all modifiers and cap
    return Math.min(conservParams.maxBonus, baseBonus * iqMod * clinchMod * recoveryMod);
  }

  /**
   * Get recovery efficiency based on current stamina level
   * Creates dynamic recovery that:
   * - BOOSTS recovery when very low (body wants to recover from exhaustion)
   * - Normal recovery in mid-range
   * - Reduces recovery as you approach 100% (ceiling effect)
   */
  getRecoveryCeilingEfficiency(staminaPercent) {
    // Load ceiling parameters
    const desperateThreshold = ModelParameters.get('stamina.recovery.desperate_recovery.threshold', 0.15);
    const maxBoost = ModelParameters.get('stamina.recovery.desperate_recovery.max_boost', 1.5);
    const minBoost = ModelParameters.get('stamina.recovery.desperate_recovery.min_boost', 1.3);

    // Very low stamina: BOOSTED recovery
    if (staminaPercent <= desperateThreshold) {
      return maxBoost - (staminaPercent / desperateThreshold) * (maxBoost - minBoost);
    }

    // Low stamina (15-30%): Moderate boost
    if (staminaPercent <= 0.30) {
      return minBoost - ((staminaPercent - desperateThreshold) / desperateThreshold) * 0.2;
    }

    // Mid-range (30-90%): Normal recovery
    if (staminaPercent <= 0.90) return 1.0;

    // 90-95%: gradual decline
    if (staminaPercent <= 0.95) {
      return 1.0 - (staminaPercent - 0.90) * 10.0;
    }

    // 95-100%: steep decline - prevents pinning at max
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
      return getDefensiveSubStateRecovery(subState);
    }

    // Otherwise use base state modifier
    return getStateRecoveryRate(state);
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

    // Calculate total (functional - single expression with cap)
    const rawRecovery = baseRecovery * cardioBonus * (1 + cornerBonus) * bodyPenalty * ageMod;

    // Cap at 60% of max - significant recovery but can't fully reset
    return Math.min(rawRecovery, fighter.maxStamina * 0.60);
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
    const baseDrain = damage * 0.5;

    // Liver shot chance (body hooks)
    const isBodyHook = punchType === PunchType.BODY_HOOK_LEAD || punchType === PunchType.BODY_HOOK_REAR;
    const liverShotTriggered = isBodyHook && Math.random() < 0.15;

    // Solar plexus chance (body cross)
    const solarPlexusTriggered = punchType === PunchType.BODY_CROSS && Math.random() < 0.1;

    // Calculate final drain (functional ternary)
    return liverShotTriggered ? damage * 1.0
      : solarPlexusTriggered ? damage * 0.8 + 5
      : baseDrain;
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
