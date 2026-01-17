/**
 * Damage Calculator
 * Calculates and applies damage, manages damage effects and thresholds
 */

import { ModelParameters } from './model/ModelParameters.js';

export class DamageCalculator {
  constructor() {
    // Thresholds now loaded from ModelParameters
    // Parameters defined in: src/engine/model/versions/v1.0.0/combat.yaml
  }

  /**
   * Get thresholds from model parameters (computed on access)
   */
  get thresholds() {
    return {
      hurt: {
        head: ModelParameters.get('combat.damage.thresholds.hurt.head', 5),
        body: ModelParameters.get('combat.damage.thresholds.hurt.body', 8)
      },
      knockdown: {
        base: ModelParameters.get('combat.damage.thresholds.knockdown.base', 8),
        cumulative: ModelParameters.get('combat.damage.thresholds.knockdown.cumulative', 50)
      },
      ko: {
        head: ModelParameters.get('combat.damage.thresholds.ko.head', 100),
        body: ModelParameters.get('combat.damage.thresholds.ko.body', 120)
      }
    };
  }

  /**
   * Calculate damage for a hit
   * Uses functional composition for modifier application
   */
  calculateDamage(hit, attacker, target) {
    const baseDamage = hit.damage || 0;
    const chinFactor = ModelParameters.get('combat.damage.modifiers.chin_factor', 0.005);
    const staminaThreshold = ModelParameters.get('combat.damage.modifiers.stamina_threshold', 0.5);

    // Calculate resistance modifier
    const resistance = this.calculateResistance(target, hit.location);
    const resistanceMod = 1 - resistance;

    // Calculate chin modifier for head shots
    const chinMod = hit.location === 'head'
      ? 1 + (1 - target.mental.chin * chinFactor * 2)  // chin/200 = chin * 0.005 * 2
      : 1;

    // Calculate stamina modifier
    const staminaRetention = attacker.power.punchingStamina / 100;
    const staminaPercent = attacker.getStaminaPercent();
    const staminaMod = staminaPercent < staminaThreshold
      ? 1 - ((staminaThreshold - staminaPercent) * (1 - staminaRetention))
      : 1;

    // Apply all modifiers functionally
    const finalDamage = baseDamage * resistanceMod * chinMod * staminaMod;

    return Math.max(1, Math.round(finalDamage));
  }

  /**
   * Calculate target's resistance to damage
   * Functional implementation - computes resistance from components
   */
  calculateResistance(target, _location) {
    const blockingFactor = ModelParameters.get('combat.damage.resistance.blocking_factor', 500);
    const experienceFactor = ModelParameters.get('combat.damage.resistance.experience_factor', 1000);
    const maxResistance = ModelParameters.get('combat.damage.resistance.max_resistance', 0.3);

    // Body type modifiers from parameters
    const bodyMods = ModelParameters.get('combat.damage.resistance.body_types', {
      stocky: 0.05,
      muscular: 0.03,
      average: 0,
      lean: -0.02,
      lanky: -0.03,
      'tall-rangy': -0.02
    });

    // Compute resistance as sum of components
    const blockingResistance = target.defense.blocking / blockingFactor;
    const experienceResistance = target.mental.experience / experienceFactor;
    const bodyTypeResistance = bodyMods[target.physical.bodyType] || 0;

    const totalResistance = blockingResistance + experienceResistance + bodyTypeResistance;

    return Math.min(maxResistance, Math.max(0, totalResistance));
  }

  /**
   * Check if fighter should enter hurt state
   * Hurt state should occur 2-5 times per fight (significant shots that wobble a fighter)
   * This creates drama and opportunities for finishes
   */
  checkHurt(target, damage) {
    // Load parameters
    const params = {
      baseChance: ModelParameters.get('combat.hurt.base_chance', 0.25),
      damageRatioScaling: ModelParameters.get('combat.hurt.damage_ratio_scaling', 0.3),
      chinModifierFactor: ModelParameters.get('combat.hurt.chin_modifier_factor', 0.4),
      composureFactor: ModelParameters.get('combat.hurt.composure_factor', 300),
      damagePercentThreshold: ModelParameters.get('combat.hurt.damage_percent_threshold', 0.4),
      damagePercentMultiplier: ModelParameters.get('combat.hurt.damage_percent_multiplier', 0.8),
      lowStaminaThreshold: ModelParameters.get('combat.hurt.low_stamina_threshold', 0.3),
      lowStaminaMultiplier: ModelParameters.get('combat.hurt.low_stamina_multiplier', 1.3),
      medStaminaThreshold: ModelParameters.get('combat.hurt.medium_stamina_threshold', 0.5),
      medStaminaMultiplier: ModelParameters.get('combat.hurt.medium_stamina_multiplier', 1.15),
      minChance: ModelParameters.get('combat.hurt.min_chance', 0.10),
      maxChance: ModelParameters.get('combat.hurt.max_chance', 0.60)
    };

    const threshold = this.thresholds.hurt.head;
    const damagePercent = target.getHeadDamagePercent();

    // Adjust threshold based on current damage (more likely when already damaged)
    const adjustedThreshold = threshold * (1 - damagePercent * 0.25);

    // Only check if damage exceeds threshold
    if (damage < adjustedThreshold) {
      return false;
    }

    // Compute hurt chance through modifiers
    const damageRatio = damage / adjustedThreshold;
    const baseHurtChance = params.baseChance + (damageRatio - 1) * params.damageRatioScaling;

    // Chin modifier
    const chinMod = (target.mental.chin - 70) / 100;
    const chinMultiplier = 1 - chinMod * params.chinModifierFactor;

    // Composure modifier
    const composure = target.mental.composure || 70;
    const composureMultiplier = 1 - (composure - 70) / params.composureFactor;

    // Accumulated damage modifier
    const damageMultiplier = damagePercent > params.damagePercentThreshold
      ? 1.2 + (damagePercent - params.damagePercentThreshold) * params.damagePercentMultiplier
      : 1;

    // Stamina modifier
    const staminaPercent = target.getStaminaPercent();
    const staminaMultiplier = staminaPercent < params.lowStaminaThreshold
      ? params.lowStaminaMultiplier
      : staminaPercent < params.medStaminaThreshold
        ? params.medStaminaMultiplier
        : 1;

    // Combine all modifiers
    const finalChance = Math.min(
      params.maxChance,
      Math.max(params.minChance, baseHurtChance * chinMultiplier * composureMultiplier * damageMultiplier * staminaMultiplier)
    );

    return Math.random() < finalChance;
  }

  /**
   * Calculate knockdown chance
   * Functional implementation with parameter-driven modifiers
   */
  calculateKnockdownChance(target, damage, punchType, isCounter) {
    // Load parameters
    const params = {
      baseChanceAtThreshold: ModelParameters.get('combat.knockdown.base_chance_at_threshold', 0.50),
      overThresholdScaling: ModelParameters.get('combat.knockdown.over_threshold_scaling', 0.3),
      powerPunchMultiplier: ModelParameters.get('combat.knockdown.power_punch_multiplier', 1.3),
      counterMultiplier: ModelParameters.get('combat.knockdown.counter_multiplier', 1.2),
      cumulativeDamageFactor: ModelParameters.get('combat.knockdown.cumulative_damage_factor', 0.5),
      staminaLowThreshold: ModelParameters.get('combat.knockdown.stamina_low_threshold', 0.3),
      staminaLowMultiplier: ModelParameters.get('combat.knockdown.stamina_low_multiplier', 1.3),
      chinFactor: ModelParameters.get('combat.knockdown.chin_factor', 200),
      maxChance: ModelParameters.get('combat.knockdown.max_chance', 0.9)
    };

    // Base chance from damage relative to threshold
    const threshold = this.calculateKnockdownThreshold(target);
    const baseChance = damage >= threshold
      ? params.baseChanceAtThreshold + ((damage - threshold) / threshold) * params.overThresholdScaling
      : 0;

    // If no base chance, no knockdown possible
    if (baseChance === 0) {
      return 0;
    }

    // Power punch modifier
    const isPowerPunch = punchType.includes('hook') || punchType.includes('uppercut');
    const powerMultiplier = isPowerPunch ? params.powerPunchMultiplier : 1;

    // Counter modifier
    const counterMultiplier = isCounter ? params.counterMultiplier : 1;

    // Cumulative damage modifier
    const damagePercent = target.getHeadDamagePercent();
    const damageMultiplier = 1 + damagePercent * params.cumulativeDamageFactor;

    // Stamina modifier
    const staminaPercent = target.getStaminaPercent();
    const staminaMultiplier = staminaPercent < params.staminaLowThreshold
      ? params.staminaLowMultiplier
      : 1;

    // Chin modifier
    const chinMultiplier = 1 - target.mental.chin / params.chinFactor;

    // Combine all modifiers
    const finalChance = baseChance * powerMultiplier * counterMultiplier * damageMultiplier * staminaMultiplier * chinMultiplier;

    return Math.min(params.maxChance, finalChance);
  }

  /**
   * Calculate knockdown threshold for a fighter
   */
  calculateKnockdownThreshold(target) {
    let threshold = this.thresholds.knockdown.base;

    // Chin increases threshold
    threshold += target.mental.chin / 4;

    // Experience increases threshold slightly
    threshold += target.mental.experience / 10;

    // Reduce threshold based on accumulated damage
    // Cumulative damage wears down the fighter significantly
    // A fighter who has taken 50% damage is much more susceptible to knockdowns
    const damagePercent = target.getHeadDamagePercent();
    threshold *= (1 - damagePercent * 0.55);  // Increased from 0.4

    // Reduce threshold based on stamina
    const staminaPercent = target.getStaminaPercent();
    threshold *= (0.7 + staminaPercent * 0.3);

    return Math.max(10, threshold);
  }

  /**
   * Calculate recovery chance from knockdown
   * Functional implementation with parameter-driven modifiers
   */
  calculateRecoveryChance(target, _knockdownDamage, count) {
    // Load parameters
    const params = {
      baseChanceMultiplier: ModelParameters.get('combat.recovery.knockdown.base_chance_multiplier', 0.5),
      experienceBonus: ModelParameters.get('combat.recovery.knockdown.experience_bonus', 300),
      damagePenalty: ModelParameters.get('combat.recovery.knockdown.damage_penalty', 0.4),
      staminaFactor: ModelParameters.get('combat.recovery.knockdown.stamina_factor', 0.5),
      earlyCountBonus: ModelParameters.get('combat.recovery.knockdown.early_count_bonus', 1.3),
      midCountBonus: ModelParameters.get('combat.recovery.knockdown.mid_count_bonus', 1.1),
      lateCountPenalty: ModelParameters.get('combat.recovery.knockdown.late_count_penalty', 0.7),
      previousKdFactor: ModelParameters.get('combat.recovery.knockdown.previous_kd_factor', 0.85),
      maxChance: ModelParameters.get('combat.recovery.knockdown.max_chance', 0.95),
      minChance: ModelParameters.get('combat.recovery.knockdown.min_chance', 0.1)
    };

    // Base recovery from chin and heart
    const baseChance = (target.mental.chin + target.mental.heart) / 200 * params.baseChanceMultiplier * 2;

    // Experience bonus
    const experienceBonus = target.mental.experience / params.experienceBonus;

    // Damage penalty
    const damagePercent = target.getHeadDamagePercent();
    const damageMultiplier = 1 - damagePercent * params.damagePenalty;

    // Stamina factor
    const staminaMultiplier = params.staminaFactor + target.getStaminaPercent() * params.staminaFactor;

    // Count modifier (easier at lower counts)
    const countMultiplier = count <= 4
      ? params.earlyCountBonus
      : count <= 6
        ? params.midCountBonus
        : count >= 9
          ? params.lateCountPenalty
          : 1;

    // Previous knockdowns reduce chance
    const previousKdMultiplier = Math.pow(params.previousKdFactor, target.knockdownsThisRound);

    // Combine all factors
    const finalChance = (baseChance + experienceBonus) * damageMultiplier * staminaMultiplier * countMultiplier * previousKdMultiplier;

    return Math.min(params.maxChance, Math.max(params.minChance, finalChance));
  }

  /**
   * Calculate TKO probability
   * Uses parameter-driven thresholds and chances
   */
  calculateTKOProbability(target, referee) {
    // Load parameters
    const params = {
      damageSevere: ModelParameters.get('combat.tko.damage_thresholds.severe', 0.9),
      damageModerate: ModelParameters.get('combat.tko.damage_thresholds.moderate', 0.8),
      damageElevated: ModelParameters.get('combat.tko.damage_thresholds.elevated', 0.7),
      chanceSevere: ModelParameters.get('combat.tko.damage_chances.severe', 0.4),
      chanceModerate: ModelParameters.get('combat.tko.damage_chances.moderate', 0.2),
      chanceElevated: ModelParameters.get('combat.tko.damage_chances.elevated', 0.1),
      hurtBonus: ModelParameters.get('combat.tko.hurt_bonus', 0.15),
      prolongedHurtBonus: ModelParameters.get('combat.tko.prolonged_hurt_bonus', 0.15),
      kd1Chance: ModelParameters.get('combat.tko.knockdowns_this_round.one', 0.20),
      kd2Chance: ModelParameters.get('combat.tko.knockdowns_this_round.two', 0.45),
      kd3Chance: ModelParameters.get('combat.tko.knockdowns_this_round.three_plus', 0.70),
      severeCutChance: ModelParameters.get('combat.tko.cut_severity.severe', 0.2),
      moderateCutChance: ModelParameters.get('combat.tko.cut_severity.moderate', 0.1),
      refereeBase: ModelParameters.get('combat.tko.referee_protectiveness_base', 0.5)
    };

    // Damage level contribution
    const damagePercent = target.getHeadDamagePercent();
    const damageChance = damagePercent > params.damageSevere
      ? params.chanceSevere
      : damagePercent > params.damageModerate
        ? params.chanceModerate
        : damagePercent > params.damageElevated
          ? params.chanceElevated
          : 0;

    // Hurt state contribution
    const hurtChance = target.isHurt
      ? params.hurtBonus + (target.hurtDuration > 5 ? params.prolongedHurtBonus : 0)
      : 0;

    // Knockdown contribution
    const kdChance = target.knockdownsThisRound >= 3
      ? params.kd3Chance
      : target.knockdownsThisRound === 2
        ? params.kd2Chance
        : target.knockdownsThisRound === 1
          ? params.kd1Chance
          : 0;

    // Cut contribution (functional reduce)
    const cutChance = target.cuts.reduce((acc, cut) => {
      if (cut.severity >= 3) return acc + params.severeCutChance;
      if (cut.severity >= 2) return acc + params.moderateCutChance;
      return acc;
    }, 0);

    // Combine all factors
    const baseProbability = damageChance + hurtChance + kdChance + cutChance;

    // Apply referee protectiveness
    return baseProbability * (params.refereeBase + referee.protectiveness);
  }

  /**
   * Calculate damage recovery between rounds
   * Uses parameterized recovery rates
   */
  calculateBetweenRoundRecovery(target) {
    const headRecoveryRate = ModelParameters.get('combat.recovery.between_rounds.head_damage_recovery', 0.1);
    const bodyRecoveryRate = ModelParameters.get('combat.recovery.between_rounds.body_damage_recovery', 0.05);

    return {
      head: target.headDamage * headRecoveryRate,
      body: target.bodyDamage * bodyRecoveryRate
    };
  }

  /**
   * Calculate cut severity from damage
   * Uses parameterized damage thresholds
   */
  calculateCutSeverity(damage, location) {
    const params = {
      damage20: ModelParameters.get('combat.cuts.severity_thresholds.damage_20', 3),
      damage15: ModelParameters.get('combat.cuts.severity_thresholds.damage_15', 2),
      damage10: ModelParameters.get('combat.cuts.severity_thresholds.damage_10', 1),
      eyebrowBonus: ModelParameters.get('combat.cuts.eyebrow_bonus', 1),
      maxSeverity: ModelParameters.get('combat.cuts.max_severity', 4)
    };

    // Base severity from damage
    const baseSeverity = damage >= 20
      ? params.damage20
      : damage >= 15
        ? params.damage15
        : damage >= 10
          ? params.damage10
          : 0;

    // Location modifier
    const locationBonus = location.includes('eyebrow') ? params.eyebrowBonus : 0;

    return Math.min(params.maxSeverity, baseSeverity + locationBonus);
  }

  /**
   * Calculate swelling severity from damage
   * Uses parameterized hit thresholds
   */
  calculateSwellingSeverity(target, _location) {
    const params = {
      hitsSevere: ModelParameters.get('combat.swelling.hits_threshold_severe', 15),
      hitsModerate: ModelParameters.get('combat.swelling.hits_threshold_moderate', 10),
      hitsMild: ModelParameters.get('combat.swelling.hits_threshold_mild', 5)
    };

    const accumulatedHits = target.roundStats?.cleanPunchesLanded || 0;

    // Determine severity based on accumulated hits
    return accumulatedHits >= params.hitsSevere
      ? 3
      : accumulatedHits >= params.hitsModerate
        ? 2
        : accumulatedHits >= params.hitsMild
          ? 1
          : 0;
  }

  /**
   * Apply damage effects (cuts, swelling, etc.)
   * Uses parameterized thresholds and chances
   */
  applyDamageEffects(target, damage, location, punchType) {
    const params = {
      cutDamageThreshold: ModelParameters.get('combat.cuts.damage_threshold', 12),
      hookCutBonus: ModelParameters.get('combat.cuts.hook_chance_bonus', 0.03),
      uppercutCutBonus: ModelParameters.get('combat.cuts.uppercut_chance_bonus', 0.02),
      swellingChance: ModelParameters.get('combat.swelling.chance_per_check', 0.05)
    };

    const effects = [];

    // Check for cut (only on head, from hooks/uppercuts)
    if (location === 'head' && damage > params.cutDamageThreshold) {
      const isPowerPunch = punchType.includes('hook') || punchType.includes('uppercut');
      if (isPowerPunch) {
        const cutBonus = punchType.includes('hook') ? params.hookCutBonus : params.uppercutCutBonus;
        const cutChance = (damage - params.cutDamageThreshold) / 100 + cutBonus;
        if (Math.random() < cutChance) {
          const cutLocation = this.determineCutLocation();
          const severity = this.calculateCutSeverity(damage, cutLocation);
          effects.push({
            type: 'cut',
            location: cutLocation,
            severity
          });
        }
      }
    }

    // Check for swelling (accumulative)
    const cleanHitsLanded = target.roundStats?.cleanPunchesLanded || 0;
    if (location === 'head' && cleanHitsLanded > 10) {
      if (Math.random() < params.swellingChance) {
        const swellLocation = Math.random() > 0.5 ? 'left_eye' : 'right_eye';
        const severity = this.calculateSwellingSeverity(target, swellLocation);
        const hasSwellingAtLocation = target.swelling?.some(s => s.location === swellLocation) || false;
        if (severity > 0 && !hasSwellingAtLocation) {
          effects.push({
            type: 'swelling',
            location: swellLocation,
            severity
          });
        }
      }
    }

    return effects;
  }

  /**
   * Determine cut location
   * Uses weighted random selection from parameterized locations
   */
  determineCutLocation() {
    const locationWeights = ModelParameters.get('combat.cuts.locations', {
      left_eyebrow: 0.3,
      right_eyebrow: 0.3,
      left_eye: 0.1,
      right_eye: 0.1,
      nose: 0.1,
      lip: 0.1
    });

    // Convert to array format for weighted selection
    const locations = Object.entries(locationWeights).map(([name, weight]) => ({ name, weight }));

    const total = locations.reduce((sum, l) => sum + l.weight, 0);
    const random = Math.random() * total;

    // Functional weighted selection using reduce
    const selected = locations.reduce(
      (acc, loc) => {
        if (acc.found) return acc;
        const newSum = acc.sum + loc.weight;
        return newSum >= random ? { found: true, location: loc.name, sum: newSum } : { ...acc, sum: newSum };
      },
      { found: false, location: 'left_eyebrow', sum: 0 }
    );

    return selected.location;
  }

  /**
   * Calculate vision impairment from cuts/swelling
   * Uses parameterized impairment values
   */
  calculateVisionImpairment(target) {
    const params = {
      cutImpairmentPerSeverity: ModelParameters.get('combat.vision.cut_impairment_per_severity', 0.1),
      swellingImpairmentPerSeverity: ModelParameters.get('combat.vision.swelling_impairment_per_severity', 0.15),
      maxImpairment: ModelParameters.get('combat.vision.max_impairment', 0.5)
    };

    // Calculate cut impairment (functional reduce)
    const cutImpairment = (target.cuts || []).reduce((acc, cut) => {
      const isEyeArea = cut.location.includes('eye');
      return isEyeArea && cut.bleeding
        ? acc + cut.severity * params.cutImpairmentPerSeverity
        : acc;
    }, 0);

    // Calculate swelling impairment (functional reduce)
    const swellingImpairment = (target.swelling || []).reduce((acc, swell) => {
      const isEyeArea = swell.location.includes('eye');
      return isEyeArea
        ? acc + swell.severity * params.swellingImpairmentPerSeverity
        : acc;
    }, 0);

    return Math.min(params.maxImpairment, cutImpairment + swellingImpairment);
  }
}

export default DamageCalculator;
