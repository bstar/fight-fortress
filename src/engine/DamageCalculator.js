/**
 * Damage Calculator
 * Calculates and applies damage, manages damage effects and thresholds
 */

export class DamageCalculator {
  constructor() {
    // Damage thresholds - tuned for realistic fight lengths
    // A 12-round fight should accumulate 60-80 head damage on average
    this.thresholds = {
      hurt: {
        head: 8,        // Single punch threshold to enter hurt state
        body: 12
      },
      knockdown: {
        base: 12,       // Single punch knockdown threshold (rarely reached)
        cumulative: 70  // Accumulated damage before knockdowns become likely
      },
      ko: {
        head: 100,
        body: 120
      }
    };
  }

  /**
   * Calculate damage for a hit
   */
  calculateDamage(hit, attacker, target) {
    let damage = hit.damage || 0;

    // Apply target's resistance
    const resistance = this.calculateResistance(target, hit.location);
    damage *= (1 - resistance);

    // Apply chin modifier for head shots
    if (hit.location === 'head') {
      const chinMod = 1 - (target.mental.chin / 200);
      damage *= (1 + chinMod);
    }

    // Apply attacker's punching stamina modifier
    const staminaRetention = attacker.power.punchingStamina / 100;
    const staminaPercent = attacker.getStaminaPercent();
    if (staminaPercent < 0.5) {
      const fatigueEffect = (0.5 - staminaPercent) * (1 - staminaRetention);
      damage *= (1 - fatigueEffect);
    }

    return Math.max(1, Math.round(damage));
  }

  /**
   * Calculate target's resistance to damage
   */
  calculateResistance(target, location) {
    let resistance = 0;

    // Base from blocking skill
    resistance += target.defense.blocking / 500;

    // Experience provides some resistance
    resistance += target.mental.experience / 1000;

    // Body type modifiers
    const bodyMods = {
      stocky: 0.05,
      muscular: 0.03,
      average: 0,
      lean: -0.02,
      lanky: -0.03
    };
    resistance += bodyMods[target.physical.bodyType] || 0;

    return Math.min(0.3, Math.max(0, resistance));
  }

  /**
   * Check if fighter should enter hurt state
   * Hurt state should be very rare - maybe 0-3 times per fight max
   */
  checkHurt(target, damage) {
    const threshold = this.thresholds.hurt.head;

    // Adjust threshold based on current damage (more likely when already damaged)
    const damagePercent = target.getHeadDamagePercent();
    const adjustedThreshold = threshold * (1 - damagePercent * 0.15);

    // Only check if damage exceeds threshold
    if (damage < adjustedThreshold) {
      return false;
    }

    // Chin and composure strongly prevent hurt state
    const chinResistance = target.mental.chin / 100;  // 0-1
    const composureResistance = target.mental.composure / 100;  // 0-1
    const resistance = (chinResistance * 0.7 + composureResistance * 0.3);

    // Strong resistance from good chin
    if (Math.random() < resistance * 0.8) {
      return false;
    }

    // Final check - only 15% chance to actually get hurt even if you pass all other checks
    // This means a fighter with 80 chin would have roughly: 0.2 * 0.15 = 3% chance per big hit
    return Math.random() < 0.15;
  }

  /**
   * Calculate knockdown chance
   */
  calculateKnockdownChance(target, damage, punchType, isCounter) {
    let chance = 0;

    // Base chance from damage relative to threshold
    const threshold = this.calculateKnockdownThreshold(target);
    if (damage >= threshold) {
      chance = 0.5 + ((damage - threshold) / threshold) * 0.3;
    }

    // Power punches more likely
    if (punchType.includes('hook') || punchType.includes('uppercut')) {
      chance *= 1.3;
    }

    // Counter punches more likely
    if (isCounter) {
      chance *= 1.2;
    }

    // Cumulative damage increases chance
    const damagePercent = target.getHeadDamagePercent();
    chance *= (1 + damagePercent * 0.5);

    // Low stamina increases chance
    const staminaPercent = target.getStaminaPercent();
    if (staminaPercent < 0.3) {
      chance *= 1.3;
    }

    // Chin reduces chance
    chance *= (1 - target.mental.chin / 200);

    return Math.min(0.9, chance);
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
   */
  calculateRecoveryChance(target, knockdownDamage, count) {
    // Base recovery from chin and heart
    let chance = (target.mental.chin + target.mental.heart) / 200;

    // Experience helps
    chance += target.mental.experience / 300;

    // Modify by damage level
    const damagePercent = target.getHeadDamagePercent();
    chance *= (1 - damagePercent * 0.4);

    // Modify by stamina
    chance *= (0.5 + target.getStaminaPercent() * 0.5);

    // Count modifier (easier at lower counts)
    if (count <= 4) {
      chance *= 1.3;
    } else if (count <= 6) {
      chance *= 1.1;
    } else if (count >= 9) {
      chance *= 0.7;
    }

    // Previous knockdowns reduce chance
    chance *= Math.pow(0.85, target.knockdownsThisRound);

    return Math.min(0.95, Math.max(0.1, chance));
  }

  /**
   * Calculate TKO probability
   */
  calculateTKOProbability(target, referee) {
    let probability = 0;

    // Damage level
    const damagePercent = target.getHeadDamagePercent();
    if (damagePercent > 0.9) {
      probability += 0.4;
    } else if (damagePercent > 0.8) {
      probability += 0.2;
    } else if (damagePercent > 0.7) {
      probability += 0.1;
    }

    // Hurt state
    if (target.isHurt) {
      probability += 0.15;
      if (target.hurtDuration > 5) {
        probability += 0.15;
      }
    }

    // Multiple knockdowns - knockdowns in a round are very significant
    // First knockdown adds moderate chance, subsequent ones escalate quickly
    if (target.knockdownsThisRound === 1) {
      probability += 0.20;  // First knockdown
    } else if (target.knockdownsThisRound === 2) {
      probability += 0.45;  // Two knockdowns - very dangerous
    } else if (target.knockdownsThisRound >= 3) {
      probability += 0.70;  // Three or more - likely stoppage
    }

    // Severe cuts
    for (const cut of target.cuts) {
      if (cut.severity >= 3) {
        probability += 0.2;
      } else if (cut.severity >= 2) {
        probability += 0.1;
      }
    }

    // Referee protectiveness
    probability *= (0.5 + referee.protectiveness);

    return probability;
  }

  /**
   * Calculate damage recovery between rounds
   */
  calculateBetweenRoundRecovery(target) {
    return {
      head: target.headDamage * 0.1,  // 10% recovery
      body: target.bodyDamage * 0.05   // 5% recovery
    };
  }

  /**
   * Calculate cut severity from damage
   */
  calculateCutSeverity(damage, location) {
    let severity = 0;

    // Base from damage
    if (damage >= 20) severity = 3;
    else if (damage >= 15) severity = 2;
    else if (damage >= 10) severity = 1;

    // Location modifiers
    if (location.includes('eyebrow')) {
      severity += 1;
    }

    return Math.min(4, severity);
  }

  /**
   * Calculate swelling severity from damage
   */
  calculateSwellingSeverity(target, location) {
    const accumulatedHits = target.roundStats.cleanPunchesLanded || 0;

    let severity = 0;

    if (accumulatedHits >= 15) severity = 3;
    else if (accumulatedHits >= 10) severity = 2;
    else if (accumulatedHits >= 5) severity = 1;

    return severity;
  }

  /**
   * Apply damage effects (cuts, swelling, etc.)
   */
  applyDamageEffects(target, damage, location, punchType) {
    const effects = [];

    // Check for cut (only on head, from hooks/uppercuts)
    if (location === 'head' && damage > 12) {
      if (punchType.includes('hook') || punchType.includes('uppercut')) {
        const cutChance = (damage - 12) / 100 + (punchType.includes('hook') ? 0.03 : 0.02);
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
    if (location === 'head' && target.roundStats.cleanPunchesLanded > 10) {
      if (Math.random() < 0.05) {
        const swellLocation = Math.random() > 0.5 ? 'left_eye' : 'right_eye';
        const severity = this.calculateSwellingSeverity(target, swellLocation);
        if (severity > 0 && !target.swelling.find(s => s.location === swellLocation)) {
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
   */
  determineCutLocation() {
    const locations = [
      { name: 'left_eyebrow', weight: 0.3 },
      { name: 'right_eyebrow', weight: 0.3 },
      { name: 'left_eye', weight: 0.1 },
      { name: 'right_eye', weight: 0.1 },
      { name: 'nose', weight: 0.1 },
      { name: 'lip', weight: 0.1 }
    ];

    const total = locations.reduce((sum, l) => sum + l.weight, 0);
    let random = Math.random() * total;

    for (const loc of locations) {
      random -= loc.weight;
      if (random <= 0) return loc.name;
    }

    return 'left_eyebrow';
  }

  /**
   * Calculate vision impairment from cuts/swelling
   */
  calculateVisionImpairment(target) {
    let impairment = 0;

    // From cuts
    for (const cut of target.cuts) {
      if (cut.location.includes('eye') && cut.bleeding) {
        impairment += cut.severity * 0.1;
      }
    }

    // From swelling
    for (const swell of target.swelling) {
      if (swell.location.includes('eye')) {
        impairment += swell.severity * 0.15;
      }
    }

    return Math.min(0.5, impairment);
  }
}

export default DamageCalculator;
