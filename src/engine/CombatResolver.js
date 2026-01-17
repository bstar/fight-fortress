/**
 * Combat Resolver
 * Resolves combat interactions between fighters, determining hits, blocks, and outcomes
 *
 * Parameters are loaded from ModelParameters with fallback to hardcoded defaults.
 * See: src/engine/model/versions/v1.0.0/combat.yaml
 */

import { FighterState, DefensiveSubState } from '../models/Fighter.js';
import { ActionType, PunchType } from './FighterAI.js';
import { ModelParameters } from './model/ModelParameters.js';

/**
 * Weight class profiles - control punch output and activity rates
 * Real boxing stats per round:
 * - Heavyweight: 40-60 punches thrown, ~30% accuracy
 * - Middleweight: 50-70 punches thrown, ~35% accuracy
 * - Welterweight: 60-80 punches thrown, ~38% accuracy
 * - Lightweight: 70-90 punches thrown, ~40% accuracy
 *
 * NOW LOADED FROM: ModelParameters.get('combat.weight_classes.<class>')
 */

/**
 * Get weight class profile from ModelParameters
 * Falls back to hardcoded defaults if parameters not loaded
 */
const getWeightClassProfileFromParams = (weightClass) => {
  const defaults = {
    activityRate: 0.50,
    maxComboLength: 5,
    comboChance: 0.40,
    recoveryTicks: 2,
    staminaMultiplier: 1.0,
    damageMultiplier: 1.0,
    punchesPerRound: { min: 55, max: 75 }
  };

  // Convert weight class name to parameter key (e.g., 'light-heavyweight' -> 'light_heavyweight')
  const paramKey = weightClass.replace(/-/g, '_');
  const basePath = `combat.weight_classes.${paramKey}`;

  return {
    activityRate: ModelParameters.get(`${basePath}.activity_rate`, defaults.activityRate),
    maxComboLength: ModelParameters.get(`${basePath}.max_combo_length`, defaults.maxComboLength),
    comboChance: ModelParameters.get(`${basePath}.combo_chance`, defaults.comboChance),
    recoveryTicks: ModelParameters.get(`${basePath}.recovery_ticks`, defaults.recoveryTicks),
    staminaMultiplier: ModelParameters.get(`${basePath}.stamina_multiplier`, defaults.staminaMultiplier),
    damageMultiplier: ModelParameters.get(`${basePath}.damage_multiplier`, defaults.damageMultiplier),
    punchesPerRound: {
      min: ModelParameters.get(`${basePath}.punches_per_round.min`, defaults.punchesPerRound.min),
      max: ModelParameters.get(`${basePath}.punches_per_round.max`, defaults.punchesPerRound.max)
    }
  };
};

/**
 * Get weight class thresholds from ModelParameters
 */
const getWeightClassThresholds = () => ({
  heavyweight: ModelParameters.get('combat.weight_classes.heavyweight.min_weight', 90.7),
  cruiserweight: ModelParameters.get('combat.weight_classes.cruiserweight.min_weight', 79.4),
  lightHeavyweight: ModelParameters.get('combat.weight_classes.light_heavyweight.min_weight', 76.2),
  middleweight: ModelParameters.get('combat.weight_classes.middleweight.min_weight', 72.6),
  welterweight: ModelParameters.get('combat.weight_classes.welterweight.min_weight', 66.7),
  lightweight: ModelParameters.get('combat.weight_classes.lightweight.min_weight', 61.2),
  featherweight: ModelParameters.get('combat.weight_classes.featherweight.min_weight', 57.2),
  bantamweight: ModelParameters.get('combat.weight_classes.bantamweight.min_weight', 53.5)
});

/**
 * Base punch statistics - NOW LOADED FROM ModelParameters
 * Damage scaled for 10-12 round fights
 * Target: Fighter takes ~100-150 punches landed over full fight
 *
 * NOW LOADED FROM: ModelParameters.get('combat.punches.<type>')
 */

/**
 * Get punch stats from ModelParameters for a given punch type
 * Falls back to defaults if parameters not loaded
 */
const getPunchStatsFromParams = (punchType) => {
  // Map PunchType enum to parameter key
  const punchTypeToKey = {
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

  // Default values matching original hardcoded values
  const defaults = {
    jab: { baseDamage: 0.5, baseAccuracy: 0.42, speed: 1.0, range: 5.0, staminaCost: 1.5 },
    cross: { baseDamage: 2.0, baseAccuracy: 0.32, speed: 0.85, range: 4.5, staminaCost: 3.5 },
    lead_hook: { baseDamage: 1.5, baseAccuracy: 0.28, speed: 0.88, range: 3.0, staminaCost: 3.0 },
    rear_hook: { baseDamage: 2.5, baseAccuracy: 0.26, speed: 0.82, range: 3.0, staminaCost: 4.0 },
    lead_uppercut: { baseDamage: 1.2, baseAccuracy: 0.25, speed: 0.80, range: 2.5, staminaCost: 2.5 },
    rear_uppercut: { baseDamage: 3.0, baseAccuracy: 0.22, speed: 0.75, range: 2.5, staminaCost: 4.5 },
    body_jab: { baseDamage: 0.6, baseAccuracy: 0.40, speed: 0.95, range: 4.5, staminaCost: 1.5 },
    body_cross: { baseDamage: 1.8, baseAccuracy: 0.30, speed: 0.83, range: 4.0, staminaCost: 3.5 },
    body_hook_lead: { baseDamage: 1.5, baseAccuracy: 0.30, speed: 0.85, range: 2.5, staminaCost: 3.0 },
    body_hook_rear: { baseDamage: 2.0, baseAccuracy: 0.28, speed: 0.80, range: 2.5, staminaCost: 4.0 }
  };

  const key = punchTypeToKey[punchType];
  if (!key) return null;

  const defaultStats = defaults[key];
  const basePath = `combat.punches.${key}`;

  return {
    baseDamage: ModelParameters.get(`${basePath}.base_damage`, defaultStats.baseDamage),
    baseAccuracy: ModelParameters.get(`${basePath}.base_accuracy`, defaultStats.baseAccuracy),
    speed: ModelParameters.get(`${basePath}.speed`, defaultStats.speed),
    range: ModelParameters.get(`${basePath}.range`, defaultStats.range),
    staminaCost: ModelParameters.get(`${basePath}.stamina_cost`, defaultStats.staminaCost)
  };
};

export class CombatResolver {
  constructor() {
    this.lastResolution = null;
    // Track recovery ticks for each fighter (cooldown between punch opportunities)
    this.fighterCooldowns = { A: 0, B: 0 };
    // Effects manager reference (set by SimulationLoop)
    this.effectsManager = null;
  }

  /**
   * Set effects manager reference
   */
  setEffectsManager(effectsManager) {
    this.effectsManager = effectsManager;
  }

  /**
   * Get weight class profile for a fighter
   * Now loads from ModelParameters with fallback defaults
   */
  getWeightClassProfile(fighter) {
    // Determine weight class from fighter's weight
    const weight = fighter.physical?.weight || 75; // kg
    const thresholds = getWeightClassThresholds();

    // Determine weight class name based on weight thresholds
    const weightClassName = weight >= thresholds.heavyweight ? 'heavyweight'
      : weight >= thresholds.cruiserweight ? 'cruiserweight'
      : weight >= thresholds.lightHeavyweight ? 'light-heavyweight'
      : weight >= thresholds.middleweight ? 'middleweight'
      : weight >= thresholds.welterweight ? 'welterweight'
      : weight >= thresholds.lightweight ? 'lightweight'
      : weight >= thresholds.featherweight ? 'featherweight'
      : weight >= thresholds.bantamweight ? 'bantamweight'
      : 'flyweight';

    return getWeightClassProfileFromParams(weightClassName);
  }

  /**
   * Check if fighter can throw a punch based on activity rate and cooldown
   */
  canThrowPunch(fighter, fighterId) {
    const profile = this.getWeightClassProfile(fighter);

    // Check cooldown
    if (this.fighterCooldowns[fighterId] > 0) {
      this.fighterCooldowns[fighterId]--;
      return false;
    }

    // Activity rate check - determines if fighter actually throws
    if (Math.random() > profile.activityRate) {
      return false;
    }

    // Set cooldown for next punch opportunity
    this.fighterCooldowns[fighterId] = profile.recoveryTicks;
    return true;
  }

  /**
   * Resolve combat between two fighters
   */
  resolve(fighterA, fighterB, decisionA, decisionB, fight) {
    // Store current round for adaptability calculations
    this.currentRound = fight?.currentRound || 1;

    const result = {
      hits: [],
      blocks: [],
      evades: [],
      misses: [],
      actions: [],
      knockdown: null
    };

    // Process Fighter A's action - with activity rate check AND stun check
    if (decisionA.action?.type === ActionType.PUNCH) {
      // Check both weight class activity rate AND stun state
      if (this.canThrowPunch(fighterA, 'A') && fighterA.canThrowPunch()) {
        const punchResult = this.resolvePunch(fighterA, fighterB, decisionA, decisionB, 'A');
        this.addPunchResult(result, punchResult);
      }
    } else {
      // Decrement cooldown even when not throwing
      if (this.fighterCooldowns.A > 0) this.fighterCooldowns.A--;
    }

    // Process Fighter B's action - with activity rate check AND stun check
    if (decisionB.action?.type === ActionType.PUNCH) {
      // Check both weight class activity rate AND stun state
      if (this.canThrowPunch(fighterB, 'B') && fighterB.canThrowPunch()) {
        const punchResult = this.resolvePunch(fighterB, fighterA, decisionB, decisionA, 'B');
        this.addPunchResult(result, punchResult);
      }
    } else {
      // Decrement cooldown even when not throwing
      if (this.fighterCooldowns.B > 0) this.fighterCooldowns.B--;
    }

    // Check for knockdown from damage
    for (const hit of result.hits) {
      const knockdown = this.checkKnockdown(hit, fight);
      if (knockdown) {
        result.knockdown = knockdown;
        break; // Only one knockdown per tick
      }
    }

    this.lastResolution = result;
    return result;
  }

  /**
   * Add punch result to overall result
   */
  addPunchResult(result, punchResult) {
    if (punchResult.outcome === 'hit') {
      result.hits.push(punchResult);
    } else if (punchResult.outcome === 'blocked') {
      result.blocks.push(punchResult);
    } else if (punchResult.outcome === 'evaded') {
      result.evades.push(punchResult);
    } else {
      result.misses.push(punchResult);
    }

    result.actions.push({
      attacker: punchResult.attacker,
      type: 'punch',
      punchType: punchResult.punchType,
      outcome: punchResult.outcome
    });
  }

  /**
   * Resolve a single punch
   */
  resolvePunch(attacker, defender, attackerDecision, defenderDecision, attackerId) {
    const action = attackerDecision.action;
    const defenderId = attackerId === 'A' ? 'B' : 'A';

    // Handle combinations
    if (action.punchType === 'combination') {
      return this.resolveCombination(attacker, defender, action, defenderDecision, attackerId);
    }

    const punchType = action.punchType;
    const punchStats = getPunchStatsFromParams(punchType);

    if (!punchStats) {
      return { outcome: 'miss', punchType, attacker: attackerId };
    }

    // Calculate distance
    const distance = this.calculateDistance(attacker, defender);

    // Check if in range
    if (distance > punchStats.range + 1) {
      return {
        outcome: 'miss',
        punchType,
        attacker: attackerId,
        target: defenderId,
        reason: 'out_of_range'
      };
    }

    // Calculate accuracy (pass IDs for effects modifiers)
    const accuracy = this.calculateAccuracy(attacker, defender, punchType, distance, action.isCounter, attackerId, defenderId);

    // Roll for hit
    const hitRoll = Math.random();

    if (hitRoll > accuracy) {
      // Miss
      return {
        outcome: 'miss',
        punchType,
        attacker: attackerId,
        target: defenderId,
        accuracy,
        roll: hitRoll
      };
    }

    // Punch would land - check defense
    const defenseResult = this.resolveDefense(defender, defenderDecision, punchType, action.target, defenderId);

    if (defenseResult.blocked) {
      return {
        outcome: 'blocked',
        punchType,
        attacker: attackerId,
        target: defenderId,
        blockType: defenseResult.blockType,
        damageReduction: defenseResult.damageReduction
      };
    }

    if (defenseResult.evaded) {
      return {
        outcome: 'evaded',
        punchType,
        attacker: attackerId,
        target: defenderId,
        evadeType: defenseResult.evadeType
      };
    }

    // Hit lands - calculate damage with stun vulnerability applied
    const baseDamage = this.calculateDamage(attacker, punchType, distance, action.isCounter, defenseResult.partial, attackerId, defender);
    const stunVulnerability = defender.getStunVulnerability ? defender.getStunVulnerability() : 1.0;
    const damage = Math.round(baseDamage * stunVulnerability);

    const quality = defenseResult.partial ? 'partial' : 'clean';

    return {
      outcome: 'hit',
      punchType,
      attacker: attackerId,
      target: defenderId,
      location: action.target || (punchType.includes('body') ? 'body' : 'head'),
      damage,
      quality,
      isCounter: action.isCounter || false,
      causedStun: damage >= 3 // Flag if this hit should cause stun (with new damage scale)
    };
  }

  /**
   * Resolve a combination of punches
   * Parameters loaded from ModelParameters with fallback defaults
   */
  resolveCombination(attacker, defender, action, defenderDecision, attackerId) {
    // Load combination parameters
    const comboParams = {
      accuracyDecay: ModelParameters.get('combat.resolution.combinations.accuracy_decay', 0.92),
      blockDecay: ModelParameters.get('combat.resolution.combinations.block_decay', 0.95),
      breakOnMissChance: ModelParameters.get('combat.resolution.combinations.break_on_miss_chance', 0.5),
      breakOnEvadeChance: ModelParameters.get('combat.resolution.combinations.break_on_evade_chance', 0.4)
    };

    const defenderId = attackerId === 'A' ? 'B' : 'A';
    const results = [];

    // Get weight class profile for combo limits
    const profile = this.getWeightClassProfile(attacker);

    // Limit combination length based on weight class
    const maxPunches = Math.min(action.combination.length, profile.maxComboLength);

    // Accuracy penalty accumulates through combo (using functional reduce pattern)
    const processCombo = (punches, accMod = 1.0, idx = 0) => {
      if (idx >= punches.length) return results;

      const punchType = punches[idx];
      const punchStats = getPunchStatsFromParams(punchType);

      if (!punchStats) return processCombo(punches, accMod, idx + 1);

      const distance = this.calculateDistance(attacker, defender);

      // Check range
      if (distance > punchStats.range + 1) {
        results.push({
          outcome: 'miss',
          punchType,
          attacker: attackerId,
          target: defenderId,
          reason: 'out_of_range'
        });
        return processCombo(punches, accMod, idx + 1);
      }

      // Calculate accuracy with combo modifier
      const accuracy = this.calculateAccuracy(attacker, defender, punchType, distance, false, attackerId, defenderId) * accMod;

      // Roll for hit
      if (Math.random() > accuracy) {
        results.push({
          outcome: 'miss',
          punchType,
          attacker: attackerId,
          target: defenderId
        });
        // Combo broken on miss (chance based on parameter)
        return Math.random() > comboParams.breakOnMissChance
          ? results  // Combo broken
          : processCombo(punches, accMod, idx + 1);
      }

      // Check defense
      const defenseResult = this.resolveDefense(defender, defenderDecision, punchType, 'head', defenderId);

      if (defenseResult.blocked) {
        results.push({
          outcome: 'blocked',
          punchType,
          attacker: attackerId,
          target: defenderId,
          blockType: defenseResult.blockType
        });
        // Combo continues through blocks with accuracy decay
        return processCombo(punches, accMod * comboParams.blockDecay, idx + 1);
      }

      if (defenseResult.evaded) {
        results.push({
          outcome: 'evaded',
          punchType,
          attacker: attackerId,
          target: defenderId,
          evadeType: defenseResult.evadeType
        });
        // Evade might break combo (based on parameter)
        return Math.random() > (1 - comboParams.breakOnEvadeChance)
          ? results  // Combo broken
          : processCombo(punches, accMod, idx + 1);
      }

      // Hit
      const damage = this.calculateDamage(attacker, punchType, distance, false, defenseResult.partial, attackerId, defender);

      results.push({
        outcome: 'hit',
        punchType,
        attacker: attackerId,
        target: defenderId,
        location: punchType.includes('body') ? 'body' : 'head',
        damage,
        quality: defenseResult.partial ? 'partial' : 'clean'
      });

      // Combo continues with accuracy decay
      return processCombo(punches, accMod * comboParams.accuracyDecay, idx + 1);
    };

    // Process the combination
    processCombo(action.combination.slice(0, maxPunches));

    // Return the first significant result (hit or miss)
    const hitResult = results.find(r => r.outcome === 'hit');
    if (hitResult) {
      hitResult.combinationHits = results.filter(r => r.outcome === 'hit').length;
      hitResult.combinationTotal = action.combination.length;
      return hitResult;
    }

    // Return first result
    return results[0] || {
      outcome: 'miss',
      punchType: 'combination',
      attacker: attackerId,
      target: defenderId
    };
  }

  /**
   * Calculate accuracy for a punch
   * Parameters loaded from ModelParameters with fallback defaults
   */
  calculateAccuracy(attacker, defender, punchType, distance, isCounter, attackerId = null, _defenderId = null) {
    // Load accuracy parameters
    const params = {
      attackerSkillBase: ModelParameters.get('combat.resolution.accuracy.attacker_skill_base', 0.5),
      attackerSkillDivisor: ModelParameters.get('combat.resolution.accuracy.attacker_skill_divisor', 100),
      handSpeedBase: ModelParameters.get('combat.resolution.accuracy.hand_speed_base', 0.8),
      handSpeedDivisor: ModelParameters.get('combat.resolution.accuracy.hand_speed_divisor', 500),
      rangePenalty: ModelParameters.get('combat.resolution.accuracy.range_penalty', 0.15),
      reachBonusFactor: ModelParameters.get('combat.resolution.accuracy.reach_bonus_factor', 0.6),
      counterMultiplier: ModelParameters.get('combat.resolution.accuracy.counter_multiplier', 1.2),
      hurtTargetBonus: ModelParameters.get('combat.resolution.accuracy.hurt_target_bonus', 1.3),
      fatigueSeverePenalty: ModelParameters.get('combat.resolution.accuracy.fatigue_severe_penalty', 0.8),
      fatigueModeratePenalty: ModelParameters.get('combat.resolution.accuracy.fatigue_moderate_penalty', 0.9)
    };

    const punchStats = getPunchStatsFromParams(punchType);
    const baseAccuracy = punchStats.baseAccuracy;

    // Apply effects manager accuracy modifier for attacker
    const effectsMod = (this.effectsManager && attackerId)
      ? this.effectsManager.getAccuracyModifier(attackerId)
      : 0;

    // Attacker accuracy modifier
    const attackerAccuracy = punchType.includes('jab')
      ? attacker.offense.jabAccuracy
      : attacker.offense.powerAccuracy;
    const skillMod = params.attackerSkillBase + attackerAccuracy / params.attackerSkillDivisor;

    // Hand speed bonus
    const handSpeedMod = params.handSpeedBase + attacker.speed.handSpeed / params.handSpeedDivisor;

    // Distance modifier
    const optimalRange = punchStats.range;
    const rangeDeviation = Math.abs(distance - optimalRange);
    const rangeMod = Math.max(0.3, 1 - rangeDeviation * params.rangePenalty);

    // Calculate base accuracy with all modifiers
    const accuracyWithBaseMods = baseAccuracy * (1 + effectsMod) * skillMod * handSpeedMod * rangeMod;

    // REACH ADVANTAGE: Longer reach = more effective at distance
    const attackerReach = attacker.physical?.reach || 180;
    const defenderReach = defender.physical?.reach || 180;
    const reachDiff = attackerReach - defenderReach;

    const reachMod = reachDiff !== 0 && distance >= 3.5
      // At long range, reach advantage matters significantly
      ? 1 + ((reachDiff / 100) * params.reachBonusFactor * Math.min(2.0, distance / 3.5))
      : reachDiff < 0 && distance < 2.5
        // At close range, shorter fighter can get under longer reach
        ? 1 + Math.abs(reachDiff / 100) * 0.30
        : reachDiff < 0 && distance >= 3.5
          // Shorter reach fighter at distance = major penalty
          ? 1 - (Math.abs(reachDiff / 100) * 0.5 * Math.min(2.0, distance / 3.5) * 0.5)
          : 1.0;

    // Defender style bonus - rangy boxers are harder to hit at distance
    const defenderStyle = defender.style?.primary;
    const isRangyDefender = defenderStyle === 'out-boxer' || defenderStyle === 'counter-puncher' || defenderStyle === 'boxer-puncher';
    const outsideFightingDef = defender.technical?.outsideFighting || 50;
    const defenderStyleMod = distance > 4 && isRangyDefender
      ? 0.95 - outsideFightingDef / 750
      : 1.0;

    // Defender movement penalty
    const movementMod = defender.state === FighterState.MOVING ? 0.85 : 1.0;

    // Counter punch bonus (uses parameter)
    const counterMod = isCounter
      ? params.counterMultiplier + attacker.offense.counterPunching / 200
      : 1.0;

    // Inside fighting bonus - sluggers and inside fighters excel at close range
    const attackerStyle = attacker.style?.primary;
    const isInsideFighter = attackerStyle === 'slugger' || attackerStyle === 'inside-fighter' || attackerStyle === 'swarmer';
    const insideFightingSkill = attacker.technical?.insideFighting || 50;
    const insideFightingMod = distance < 3.5 && isInsideFighter
      ? (1.0 + insideFightingSkill / 250) * (punchType.includes('jab') ? 1.0 : 1.10)
      : 1.0;

    // Out-boxer penalty at close range
    const outBoxerCloseMod = distance < 3 && attackerStyle === 'out-boxer' ? 0.85 : 1.0;

    // Outside fighting offensive bonus - rangy boxers are more accurate at distance
    const isRangyAttacker = attackerStyle === 'out-boxer' || attackerStyle === 'boxer-puncher';
    const outsideFightingAttack = attacker.technical?.outsideFighting || 50;
    const outsideFightingMod = distance >= 4 && isRangyAttacker
      ? 1 + (outsideFightingAttack - 50) / 250
      : 1.0;

    // Distance management - fighters with high distanceManagement control range better
    const attackerDistMgmt = attacker.technical?.distanceManagement || 50;
    const defenderDistMgmt = defender.technical?.distanceManagement || 50;
    const distMgmtDiff = attackerDistMgmt - defenderDistMgmt;
    const distMgmtMod = distMgmtDiff > 10
      ? 1 + distMgmtDiff / 250
      : distMgmtDiff < -10
        ? 1 + distMgmtDiff / 300
        : 1.0;

    // Style matchup modifiers - "Styles make fights"
    const styleMatchupMod = this.calculateStyleMatchupMod(attackerStyle, defenderStyle, distance);

    // First step advantage - explosive starters dominate early in exchanges
    const firstStepAdvantage = (attacker.speed?.firstStep || 70) - (defender.speed?.firstStep || 70);
    const firstStepMod = firstStepAdvantage > 10 && distance < 3.5
      ? 1 + (firstStepAdvantage - 10) / 100
      : 1.0;

    // Defender hurt bonus (easier to hit) - uses parameter
    const hurtMod = defender.isHurt ? params.hurtTargetBonus : 1.0;

    // Fatigue penalty - uses parameters
    const staminaPercent = attacker.getStaminaPercent();
    const fatigueMod = staminaPercent < 0.4 ? params.fatigueSeverePenalty
      : staminaPercent < 0.6 ? params.fatigueModeratePenalty
      : 1.0;

    // Adaptability bonus - fighters "figure out" opponent over rounds
    const adaptability = attacker.technical?.adaptability || 70;
    const round = this.currentRound || 1;
    const adaptMod = adaptability > 70 && round > 2
      ? 1 + ((round - 2) * 0.015) * ((adaptability - 70) / 100)
      : 1.0;

    // Experience bonus - veterans read opponents better
    const experience = attacker.mental?.experience || 70;
    const expMod = experience > 80 ? 1 + (experience - 80) / 500 : 1.0;

    // Combine all modifiers (functional composition)
    const finalAccuracy = accuracyWithBaseMods
      * reachMod
      * defenderStyleMod
      * movementMod
      * counterMod
      * insideFightingMod
      * outBoxerCloseMod
      * outsideFightingMod
      * distMgmtMod
      * styleMatchupMod
      * firstStepMod
      * hurtMod
      * fatigueMod
      * adaptMod
      * expMod;

    return Math.min(0.95, Math.max(0.1, finalAccuracy));
  }

  /**
   * Calculate style matchup modifier for accuracy
   * Certain styles have natural advantages against others
   */
  calculateStyleMatchupMod(attackerStyle, defenderStyle, distance) {
    // Inside-fighter vs Swarmer at close range
    if (attackerStyle === 'inside-fighter' && defenderStyle === 'swarmer') {
      return distance < 3 ? 1.18 : 0.94;
    }
    if (attackerStyle === 'swarmer' && defenderStyle === 'inside-fighter') {
      return distance < 3 ? 0.88 : 1.04;
    }

    // Out-boxer vs Slugger
    if (attackerStyle === 'slugger' && defenderStyle === 'out-boxer') {
      return 0.90;
    }

    // Counter-puncher vs Slugger
    if (attackerStyle === 'slugger' && defenderStyle === 'counter-puncher') {
      return 0.88;
    }

    // Boxer-puncher vs Swarmer
    if (attackerStyle === 'boxer-puncher' && defenderStyle === 'swarmer') {
      return distance >= 4 ? 1.08 : distance < 3 ? 0.92 : 1.0;
    }
    if (attackerStyle === 'swarmer' && defenderStyle === 'boxer-puncher') {
      return distance >= 4 ? 0.92 : distance < 3 ? 1.12 : 1.0;
    }

    return 1.0; // No special matchup modifier
  }

  /**
   * Check if fighter is in corner based on position
   */
  isInCorner(fighter) {
    if (!fighter.position) return false;
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x > 7 && y > 7; // Both axes near edge = corner
  }

  /**
   * Check if fighter is on ropes based on position
   */
  isOnRopes(fighter) {
    if (!fighter.position) return false;
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x > 8 || y > 8; // Near either edge
  }

  /**
   * Resolve defense against a punch
   * Parameters loaded from ModelParameters with fallback defaults
   */
  resolveDefense(defender, defenderDecision, punchType, target, defenderId = null) {
    // Load defense parameters
    const params = {
      hurtDefenseChance: ModelParameters.get('combat.resolution.defense.hurt_defense_chance', 0.3),
      cornerDefenseChance: ModelParameters.get('combat.resolution.defense.corner_defense_chance', 0.4),
      ropesDefenseChance: ModelParameters.get('combat.resolution.defense.ropes_defense_chance', 0.6),
      criticalDamageThreshold: ModelParameters.get('combat.resolution.defense.critical_damage_threshold', 0.95),
      criticalDefenseChance: ModelParameters.get('combat.resolution.defense.critical_defense_chance', 0.1),
      highDamageThreshold: ModelParameters.get('combat.resolution.defense.high_damage_threshold', 0.85),
      highDamageDefenseChance: ModelParameters.get('combat.resolution.defense.high_damage_defense_chance', 0.25),
      moderateDamageThreshold: ModelParameters.get('combat.resolution.defense.moderate_damage_threshold', 0.70),
      moderateDamageDefenseChance: ModelParameters.get('combat.resolution.defense.moderate_damage_defense_chance', 0.5)
    };

    const result = {
      blocked: false,
      evaded: false,
      partial: false,
      blockType: null,
      evadeType: null,
      damageReduction: 0
    };

    // Get effects defense modifier (negative = worse defense)
    const effectsDefenseMod = (this.effectsManager && defenderId)
      ? this.effectsManager.getDefenseModifier(defenderId)
      : 0;

    // If defender is hurt, defense is impaired
    if (defender.isHurt) {
      const hurtChance = Math.max(0.1, params.hurtDefenseChance + effectsDefenseMod);
      if (Math.random() > hurtChance) {
        return result;
      }
    }

    // Fighters backed into corner or on ropes are more vulnerable
    const inCorner = this.isInCorner(defender);
    const onRopes = this.isOnRopes(defender);

    // Position-based defense limitation
    const positionCheck = inCorner
      ? Math.random() > params.cornerDefenseChance
      : onRopes
        ? Math.random() > params.ropesDefenseChance
        : false;

    if (positionCheck) {
      return result;
    }

    // Fighters with critical damage are nearly defenseless
    const headDamagePercent = defender.getHeadDamagePercent();
    const damageDefenseCheck = headDamagePercent >= params.criticalDamageThreshold
      ? Math.random() > params.criticalDefenseChance
      : headDamagePercent >= params.highDamageThreshold
        ? Math.random() > params.highDamageDefenseChance
        : headDamagePercent >= params.moderateDamageThreshold
          ? Math.random() > params.moderateDamageDefenseChance
          : false;

    if (damageDefenseCheck) {
      return result;
    }

    const defenseSubState = defender.subState;

    // Check for active evasion
    if (defenderDecision.action?.type === ActionType.EVADE ||
        defenseSubState === DefensiveSubState.HEAD_MOVEMENT) {
      const evadeChance = this.calculateEvadeChance(defender, punchType, target);

      if (Math.random() < evadeChance) {
        result.evaded = true;
        result.evadeType = defenderDecision.action?.evadeType || 'slip';
        return result;
      }
    }

    // Check for blocking
    if (defenderDecision.action?.type === ActionType.BLOCK ||
        defenseSubState === DefensiveSubState.HIGH_GUARD ||
        defenseSubState === DefensiveSubState.PHILLY_SHELL) {
      const blockResult = this.calculateBlock(defender, defenseSubState, punchType, target);

      if (blockResult.success) {
        result.blocked = true;
        result.blockType = blockResult.type;
        result.damageReduction = blockResult.damageReduction;
        return result;
      } else if (blockResult.partial) {
        result.partial = true;
        result.damageReduction = blockResult.damageReduction;
        return result;
      }
    }

    // Passive defense check (ring awareness, reflexes)
    const passiveDefense = this.calculatePassiveDefense(defender, punchType);
    if (Math.random() < passiveDefense) {
      result.partial = true;
      result.damageReduction = 0.3;
    }

    return result;
  }

  /**
   * Calculate evade chance
   * Parameters loaded from ModelParameters with fallback defaults
   */
  calculateEvadeChance(defender, punchType, target) {
    // Load evasion parameters
    const params = {
      baseChance: ModelParameters.get('combat.resolution.evasion.base_chance', 0.1),
      headMovementDivisor: ModelParameters.get('combat.resolution.evasion.head_movement_divisor', 500),
      reflexesDivisor: ModelParameters.get('combat.resolution.evasion.reflexes_divisor', 600),
      bodyShotMultiplier: ModelParameters.get('combat.resolution.evasion.body_shot_multiplier', 0.4),
      hookUppercutMultiplier: ModelParameters.get('combat.resolution.evasion.hook_uppercut_multiplier', 0.7),
      fatiguePenalty: ModelParameters.get('combat.resolution.evasion.fatigue_penalty', 0.7),
      experienceBonusThreshold: ModelParameters.get('combat.resolution.evasion.experience_bonus_threshold', 80),
      experienceBonusDivisor: ModelParameters.get('combat.resolution.evasion.experience_bonus_divisor', 200),
      maxEvadeChance: ModelParameters.get('combat.resolution.evasion.max_evade_chance', 0.45)
    };

    // Base evade chance
    const baseChance = params.baseChance;

    // Head movement and reflexes contribution
    const skillBonus = defender.defense.headMovement / params.headMovementDivisor
      + defender.speed.reflexes / params.reflexesDivisor;

    // Target modifier (body shots much harder to evade)
    const targetMod = target === 'body' ? params.bodyShotMultiplier : 1.0;

    // Punch type modifier (hooks and uppercuts harder to evade)
    const isInsidePunch = punchType.includes('hook') || punchType.includes('uppercut');
    const punchTypeMod = isInsidePunch ? params.hookUppercutMultiplier : 1.0;

    // Fatigue penalty
    const fatigueMod = defender.getStaminaPercent() < 0.4 ? params.fatiguePenalty : 1.0;

    // Experience bonus
    const experience = defender.mental?.experience || 70;
    const expMod = experience > params.experienceBonusThreshold
      ? 1 + (experience - params.experienceBonusThreshold) / params.experienceBonusDivisor
      : 1.0;

    // Adaptability bonus over rounds
    const adaptability = defender.technical?.adaptability || 70;
    const round = this.currentRound || 1;
    const adaptMod = adaptability > 70 && round > 3
      ? 1 + ((round - 3) * 0.01) * ((adaptability - 70) / 100)
      : 1.0;

    // Combine all modifiers
    const finalChance = (baseChance + skillBonus) * targetMod * punchTypeMod * fatigueMod * expMod * adaptMod;

    return Math.min(params.maxEvadeChance, finalChance);
  }

  /**
   * Calculate block result
   * Parameters loaded from ModelParameters with fallback defaults
   */
  calculateBlock(defender, defenseSubState, punchType, target) {
    // Load blocking parameters
    const params = {
      baseChance: ModelParameters.get('combat.resolution.blocking.base_chance', 0.3),
      highGuardBonus: ModelParameters.get('combat.resolution.blocking.high_guard_bonus', 0.25),
      highGuardReduction: ModelParameters.get('combat.resolution.blocking.high_guard_reduction', 0.7),
      highGuardBodyPenalty: ModelParameters.get('combat.resolution.blocking.high_guard_body_penalty', 0.15),
      phillyShellStraightBonus: ModelParameters.get('combat.resolution.blocking.philly_shell_straight_bonus', 0.3),
      phillyShellStraightReduction: ModelParameters.get('combat.resolution.blocking.philly_shell_straight_reduction', 0.8),
      phillyShellHookBonus: ModelParameters.get('combat.resolution.blocking.philly_shell_hook_bonus', 0.1),
      phillyShellHookReduction: ModelParameters.get('combat.resolution.blocking.philly_shell_hook_reduction', 0.5),
      skillDivisor: ModelParameters.get('combat.resolution.blocking.skill_divisor', 400),
      parryThreshold: ModelParameters.get('combat.resolution.blocking.parry_threshold', 60),
      parryBonus: ModelParameters.get('combat.resolution.blocking.parry_bonus', 0.1),
      parryReduction: ModelParameters.get('combat.resolution.blocking.parry_reduction', 0.9),
      partialThreshold: ModelParameters.get('combat.resolution.blocking.partial_threshold', 0.15),
      partialReduction: ModelParameters.get('combat.resolution.blocking.partial_reduction', 0.3)
    };

    // Calculate block chance and damage reduction based on stance
    const { blockChance, damageReduction, blockType } = defenseSubState === DefensiveSubState.HIGH_GUARD
      ? {
          blockChance: params.baseChance + params.highGuardBonus + (target === 'body' ? -params.highGuardBodyPenalty : 0),
          damageReduction: target === 'body' ? 0.4 : params.highGuardReduction,
          blockType: 'high_guard'
        }
      : defenseSubState === DefensiveSubState.PHILLY_SHELL
        ? {
            blockChance: params.baseChance + (
              punchType === PunchType.JAB || punchType === PunchType.CROSS
                ? params.phillyShellStraightBonus
                : params.phillyShellHookBonus
            ),
            damageReduction: punchType === PunchType.JAB || punchType === PunchType.CROSS
              ? params.phillyShellStraightReduction
              : params.phillyShellHookReduction,
            blockType: 'shell'
          }
        : { blockChance: params.baseChance, damageReduction: 0.6, blockType: 'arm' };

    // Add blocking skill bonus
    const skillBonus = defender.defense.blocking / params.skillDivisor;
    const totalBlockChance = blockChance + skillBonus;

    // Parrying skill for straights
    const isStraightPunch = punchType === PunchType.JAB || punchType === PunchType.CROSS;
    const canParry = isStraightPunch && defender.defense.parrying > params.parryThreshold;
    const finalBlockChance = canParry ? totalBlockChance + params.parryBonus : totalBlockChance;
    const finalDamageReduction = canParry ? params.parryReduction : damageReduction;

    // Roll for block
    const roll = Math.random();

    return roll < finalBlockChance
      ? { success: true, type: blockType, damageReduction: finalDamageReduction }
      : roll < finalBlockChance + params.partialThreshold
        ? { success: false, partial: true, damageReduction: params.partialReduction }
        : { success: false, partial: false };
  }

  /**
   * Calculate passive defense (last resort)
   * Parameters loaded from ModelParameters with fallback defaults
   */
  calculatePassiveDefense(defender, _punchType) {
    const params = {
      baseChance: ModelParameters.get('combat.resolution.passive.base_chance', 0.1),
      ringAwarenessDivisor: ModelParameters.get('combat.resolution.passive.ring_awareness_divisor', 500),
      experienceDivisor: ModelParameters.get('combat.resolution.passive.experience_divisor', 500)
    };

    // Functional calculation: base chance + skill contributions
    return params.baseChance
      + defender.defense.ringAwareness / params.ringAwarenessDivisor
      + defender.mental.experience / params.experienceDivisor;
  }

  /**
   * Calculate damage for a landed punch
   * Parameters loaded from ModelParameters with fallback defaults
   */
  calculateDamage(attacker, punchType, distance, isCounter, isPartial, attackerId = null, defender = null) {
    // Load damage parameters
    const params = {
      powerBase: ModelParameters.get('combat.resolution.damage.power_base', 0.6),
      powerDivisor: ModelParameters.get('combat.resolution.damage.power_divisor', 250),
      koPowerEliteThreshold: ModelParameters.get('combat.resolution.damage.ko_power_elite_threshold', 85),
      koPowerEliteBonus: ModelParameters.get('combat.resolution.damage.ko_power_elite_bonus', 1.15),
      koPowerGoodThreshold: ModelParameters.get('combat.resolution.damage.ko_power_good_threshold', 70),
      counterBaseBonus: ModelParameters.get('combat.resolution.damage.counter_base_bonus', 1.15),
      counterSkillDivisor: ModelParameters.get('combat.resolution.damage.counter_skill_divisor', 400),
      partialHitMultiplier: ModelParameters.get('combat.resolution.damage.partial_hit_multiplier', 0.5),
      bodyPunchBase: ModelParameters.get('combat.resolution.damage.body_punch_base', 0.7),
      bodyPunchDivisor: ModelParameters.get('combat.resolution.damage.body_punch_divisor', 150),
      fatigueSevereThreshold: ModelParameters.get('combat.resolution.damage.fatigue_severe_threshold', 0.25),
      fatigueSevereMultiplier: ModelParameters.get('combat.resolution.damage.fatigue_severe_multiplier', 0.6),
      fatigueModerateThreshold: ModelParameters.get('combat.resolution.damage.fatigue_moderate_threshold', 0.4),
      fatigueModerateMultiplier: ModelParameters.get('combat.resolution.damage.fatigue_moderate_multiplier', 0.75),
      fatigueMildThreshold: ModelParameters.get('combat.resolution.damage.fatigue_mild_threshold', 0.6),
      fatigueMildMultiplier: ModelParameters.get('combat.resolution.damage.fatigue_mild_multiplier', 0.9),
      varianceMin: ModelParameters.get('combat.resolution.damage.variance_min', 0.85),
      varianceRange: ModelParameters.get('combat.resolution.damage.variance_range', 0.3)
    };

    const punchStats = getPunchStatsFromParams(punchType);
    const baseDamage = punchStats.baseDamage;

    // Weight class damage multiplier
    const profile = this.getWeightClassProfile(attacker);
    const weightClassMod = profile.damageMultiplier;

    // Weight differential modifier
    const weightMod = defender ? this.calculateWeightDifferentialMod(attacker, defender) : 1.0;

    // Effects manager power modifier
    const effectsMod = (this.effectsManager && attackerId)
      ? 1 + this.effectsManager.getPowerModifier(attackerId)
      : 1.0;

    // Power modifier calculation
    const power = punchType.includes('jab') || punchType.includes('body_jab')
      ? (attacker.power.powerLeft + attacker.power.powerRight) / 4
      : punchType.includes('lead')
        ? attacker.power.powerLeft
        : attacker.power.powerRight;

    const basePowerMod = params.powerBase + power / params.powerDivisor;

    // KO power bonus for power punches
    const koPower = attacker.power.knockoutPower || 70;
    const koPowerMod = !punchType.includes('jab') && koPower >= params.koPowerEliteThreshold
      ? params.koPowerEliteBonus + (koPower - params.koPowerEliteThreshold) / 100
      : !punchType.includes('jab') && koPower >= params.koPowerGoodThreshold
        ? 1.0 + (koPower - params.koPowerGoodThreshold) / 150
        : 1.0;

    const powerMod = basePowerMod * koPowerMod;

    // Distance modifier
    const rangeDeviation = Math.abs(distance - punchStats.range);
    const distanceMod = Math.max(0.5, 1 - rangeDeviation * 0.1);

    // Counter punch bonus
    const counterSkill = attacker.offense.counterPunching || 70;
    const counterMod = isCounter
      ? params.counterBaseBonus + counterSkill / params.counterSkillDivisor
      : 1.0;

    // Partial hit reduction
    const partialMod = isPartial ? params.partialHitMultiplier : 1.0;

    // Body punching skill for body shots
    const bodyMod = punchType.includes('body')
      ? params.bodyPunchBase + attacker.power.bodyPunching / params.bodyPunchDivisor
      : 1.0;

    // Fatigue penalty
    const staminaPercent = attacker.getStaminaPercent();
    const fatigueMod = staminaPercent < params.fatigueSevereThreshold ? params.fatigueSevereMultiplier
      : staminaPercent < params.fatigueModerateThreshold ? params.fatigueModerateMultiplier
      : staminaPercent < params.fatigueMildThreshold ? params.fatigueMildMultiplier
      : 1.0;

    // Random variance
    const varianceMod = params.varianceMin + Math.random() * params.varianceRange;

    // Combine all modifiers
    const finalDamage = baseDamage
      * weightClassMod
      * weightMod
      * effectsMod
      * powerMod
      * distanceMod
      * counterMod
      * partialMod
      * bodyMod
      * fatigueMod
      * varianceMod;

    return Math.max(1, Math.round(finalDamage));
  }

  /**
   * Calculate weight differential modifier for damage
   */
  calculateWeightDifferentialMod(attacker, defender) {
    const attackerWeight = attacker.physical?.weight || 75;
    const defenderWeight = defender.physical?.weight || 75;
    const weightRatio = attackerWeight / defenderWeight;

    return weightRatio > 1.1
      ? Math.min(2.5, 1 + (weightRatio - 1) * 2.0)
      : weightRatio < 0.9
        ? Math.max(0.3, weightRatio)
        : 1.0;
  }

  /**
   * Check for knockdown from damage
   * Knockdowns should be rare - maybe 0-2 per fight on average
   * Early knockdowns should be extremely rare (like real boxing)
   */
  checkKnockdown(hit, fight) {
    const target = fight.getFighter(hit.target);
    const attacker = fight.getFighter(hit.attacker);

    // Only head shots can cause knockdowns
    if (hit.location !== 'head') return null;

    // Load knockdown check parameters
    const kdParams = {
      minDamagePercent: ModelParameters.get('combat.resolution.knockdown_check.min_damage_percent', 0.15),
      chinBase: ModelParameters.get('combat.resolution.knockdown_check.chin_base', 3),
      chinDivisor: ModelParameters.get('combat.resolution.knockdown_check.chin_divisor', 15),
      damageReductionThreshold: ModelParameters.get('combat.resolution.knockdown_check.damage_reduction_threshold', 0.5),
      damageReductionFactor: ModelParameters.get('combat.resolution.knockdown_check.damage_reduction_factor', 0.3),
      staminaSevereThreshold: ModelParameters.get('combat.resolution.knockdown_check.stamina_severe_threshold', 0.25),
      staminaSevereReduction: ModelParameters.get('combat.resolution.knockdown_check.stamina_severe_reduction', 0.85),
      staminaModerateThreshold: ModelParameters.get('combat.resolution.knockdown_check.stamina_moderate_threshold', 0.4),
      staminaModerateReduction: ModelParameters.get('combat.resolution.knockdown_check.stamina_moderate_reduction', 0.92),
      flashDamageThreshold: ModelParameters.get('combat.resolution.knockdown_check.flash_damage_threshold', 8),
      flashCapEliteChin: ModelParameters.get('combat.resolution.knockdown_check.flash_cap_elite_chin', 0.025),
      flashCapGoodChin: ModelParameters.get('combat.resolution.knockdown_check.flash_cap_good_chin', 0.035),
      flashCapDecentChin: ModelParameters.get('combat.resolution.knockdown_check.flash_cap_decent_chin', 0.045),
      flashCapWeakChin: ModelParameters.get('combat.resolution.knockdown_check.flash_cap_weak_chin', 0.10),
      flashCapDefault: ModelParameters.get('combat.resolution.knockdown_check.flash_cap_default', 0.06),
      zeroStaminaThreshold: ModelParameters.get('combat.resolution.knockdown_check.zero_stamina_threshold', 0.10),
      zeroStaminaMaxMultiplier: ModelParameters.get('combat.resolution.knockdown_check.zero_stamina_max_multiplier', 2.0),
      directKnockdownFreshMultiplier: ModelParameters.get('combat.resolution.knockdown_check.direct_knockdown_fresh_multiplier', 1.3)
    };

    // Check damage threshold
    const headDamagePercent = target.getHeadDamagePercent();
    const chin = target.mental.chin;
    const staminaPercent = target.getStaminaPercent();

    // PROTECTION: No knockdowns when fighter is fresh (< minDamagePercent accumulated damage)
    // This prevents unrealistic first-punch knockouts
    // Exception: Extremely powerful clean shots can still cause flash KDs
    const isFresh = headDamagePercent < kdParams.minDamagePercent;

    // Calculate knockdown threshold with functional approach
    const calculateKnockdownThreshold = () => {
      // Base knockdown threshold - scales with chin
      const baseThreshold = kdParams.chinBase + (chin / kdParams.chinDivisor);

      // Damage reduction modifier (accumulated damage wears down resistance)
      const damageModifier = headDamagePercent > kdParams.damageReductionThreshold
        ? 1 - ((headDamagePercent - kdParams.damageReductionThreshold) * kdParams.damageReductionFactor)
        : 1.0;

      // Stamina reduction modifier (exhausted fighters go down easier)
      const staminaModifier = staminaPercent < kdParams.staminaSevereThreshold
        ? kdParams.staminaSevereReduction
        : staminaPercent < kdParams.staminaModerateThreshold
          ? kdParams.staminaModerateReduction
          : 1.0;

      return baseThreshold * damageModifier * staminaModifier;
    };

    const knockdownThreshold = calculateKnockdownThreshold();

    // DIRECT KNOCKDOWN: Only possible when damaged enough or hit VERY hard
    // Fresh fighters can only be knocked down by exceptional shots
    const directKnockdownPossible = !isFresh || hit.damage >= knockdownThreshold * kdParams.directKnockdownFreshMultiplier;

    // ZERO STAMINA VULNERABILITY: Exhausted fighters are extremely vulnerable to KOs
    // At 0% stamina: maxMultiplier KO multiplier (resistance halved)
    // At threshold stamina: no additional vulnerability
    const targetStaminaPercent = target.getStaminaPercent();
    const zeroStaminaKOMultiplier = targetStaminaPercent <= kdParams.zeroStaminaThreshold
      ? 1.0 + ((kdParams.zeroStaminaMaxMultiplier - 1.0) * (1 - targetStaminaPercent / kdParams.zeroStaminaThreshold))
      : 1.0;

    if (directKnockdownPossible && hit.damage >= knockdownThreshold) {
      // Roll against chin - higher chin = much harder to knock down
      // chinResistance is the CHANCE to RESIST knockdown (higher = better)
      // ELITE CHIN SCALING: 85+ chins should be nearly impossible to drop
      // Functional chin resistance calculation
      const calculateChinResistance = (chinValue) => {
        // Elite chin bonus - exponential resistance for 80+ chins
        const baseResistance = chin >= 90
          ? 0.85 + (chinValue - 90) * 0.012  // 90=0.85, 95=0.91, 100=0.97
          : chin >= 85
            ? 0.75 + (chinValue - 85) * 0.02   // 85=0.75, 90=0.85
            : chin >= 80
              ? 0.65 + (chinValue - 80) * 0.02 // 80=0.65, 85=0.75
              : (chinValue - 30) / 80;          // Base: 0.25 - 0.875 range

        // Apply zero stamina vulnerability - reduces resistance when exhausted
        return baseResistance / zeroStaminaKOMultiplier;
      };

      const chinResistance = calculateChinResistance(chin);

      // Knockdown happens if random roll EXCEEDS resistance (i.e., chin fails to protect)
      if (Math.random() > chinResistance) {
        return {
          attacker: hit.attacker,
          target: hit.target,
          punchType: hit.punchType,
          damage: hit.damage
        };
      }
    }

    // FLASH KNOCKDOWN: Very rare - requires specific conditions
    // Only possible with:
    // 1. Clean hit (not partial/blocked)
    // 2. Significant damage (>= 70% of threshold)
    // 3. Some accumulated damage OR exceptionally powerful shot
    // 4. Random chance scaled by knockout power vs chin
    const flashKnockdownPossible = !isFresh || hit.damage >= kdParams.flashDamageThreshold;

    // Flash knockdown: Any clean power punch can cause knockdown
    // Elite KO power (90+) makes this much more likely
    const isPowerPunch = hit.punchType && (
      hit.punchType.includes('hook') ||
      hit.punchType.includes('uppercut') ||
      hit.punchType === 'cross' ||
      hit.punchType === 'body_cross'
    );

    if (flashKnockdownPossible && hit.quality === 'clean' && isPowerPunch) {
      const knockoutPower = attacker.power.knockoutPower;

      // MISMATCH CHECK: Low KO power vs elite chin = virtually no knockdowns
      // If chin exceeds knockout power by 25+, knockdowns are extremely rare
      const chinAdvantage = chin - knockoutPower;
      if (chinAdvantage >= 25 && headDamagePercent < 0.5) {
        // Massive mismatch - weak puncher vs iron chin (e.g., 58 KO vs 85 chin)
        // Only possible if fighter is severely damaged (50%+)
        return null;
      }

      // Functional flash knockdown calculation
      const calculateFlashChance = () => {
        // Base chance from KO power vs chin matchup
        const baseChance = Math.max(0, (knockoutPower - 40) / 200) * (1 - chin / 150);

        // Elite chin protection modifier (85+): These fighters rarely go down
        const eliteChinMod = chin >= 90 ? 0.25
          : chin >= 85 ? 0.4
          : chin >= 80 ? 0.6
          : 1.0;

        // Low knockout power penalty (< 70): Weak punchers struggle to drop anyone
        const lowPowerMod = knockoutPower < 60 ? 0.3
          : knockoutPower < 70 ? 0.5
          : 1.0;

        // Elite knockout power bonus (90+)
        const elitePowerMod = knockoutPower >= 95 ? (1.6 + (knockoutPower - 95) / 50)
          : knockoutPower >= 90 ? 1.4
          : knockoutPower >= 80 ? 1.2
          : 1.0;

        // Early round KO power boost - Fast starters like Tyson
        // Only ELITE KO power (94+) gets early round bonus
        const currentRound = this.currentRound || 1;
        const earlyRoundMod = (currentRound <= 5 && knockoutPower >= 94)
          ? (() => {
            const roundFade = 1 - (currentRound - 1) / 5;
            const powerFactor = (knockoutPower - 92) / 25;
            return 1 + powerFactor * roundFade * 1.5;
          })()
          : 1.0;

        // Accumulated damage vulnerability modifier
        const damageMod = headDamagePercent > 0.4
          ? (1 + (headDamagePercent - 0.4) * 1.5)
          : 1.0;

        // Fresh fighter protection modifier
        const freshMod = isFresh
          ? (knockoutPower >= 90 ? 0.5 : 0.35)
          : 1.0;

        // Low stamina vulnerability modifier
        const staminaMod = staminaPercent < 0.2 ? 1.3
          : staminaPercent < 0.4 ? 1.1
          : 1.0;

        // Power punch bonus modifier
        const powerPunchMod = (hit.punchType && (
          hit.punchType.includes('hook') ||
          hit.punchType.includes('uppercut') ||
          hit.punchType === 'cross'
        )) ? 1.2 : 1.0;

        // Combine all modifiers
        return baseChance * eliteChinMod * lowPowerMod * elitePowerMod *
               earlyRoundMod * damageMod * freshMod * staminaMod *
               zeroStaminaKOMultiplier * powerPunchMod;
      };

      // Calculate flash cap based on chin level (from params)
      const calculateFlashCap = () => {
        const baseCap = chin >= 90 ? kdParams.flashCapEliteChin
          : chin >= 85 ? kdParams.flashCapGoodChin
          : chin >= 80 ? kdParams.flashCapDecentChin
          : chin < 70 ? kdParams.flashCapWeakChin
          : kdParams.flashCapDefault;

        // Elite KO power raises the cap significantly
        const powerMultiplier = knockoutPower >= 95 ? 2.5
          : knockoutPower >= 90 ? 2.0
          : knockoutPower >= 85 ? 1.6
          : knockoutPower >= 80 ? 1.3
          : 1.0;

        return baseCap * powerMultiplier;
      };

      const flashChance = Math.min(calculateFlashCap(), calculateFlashChance());

      if (Math.random() < flashChance) {
        return {
          attacker: hit.attacker,
          target: hit.target,
          punchType: hit.punchType,
          damage: hit.damage,
          flash: true
        };
      }
    }

    return null;
  }

  /**
   * Calculate distance between fighters
   */
  calculateDistance(fighterA, fighterB) {
    const dx = fighterA.position.x - fighterB.position.x;
    const dy = fighterA.position.y - fighterB.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export default CombatResolver;
