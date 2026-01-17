/**
 * Fight Effects Manager
 * Manages dynamic buffs and debuffs that occur during a fight
 * Effects are triggered by fight events and modify fighter behavior/attributes
 */

// Effect types - Positive (Buffs)
export const BuffType = {
  ADRENALINE_SURGE: 'adrenaline_surge',     // After being hurt - temporary power/speed boost
  MOMENTUM: 'momentum',                       // After landing clean shots - increased confidence
  SECOND_WIND: 'second_wind',                // Late round stamina surge
  KILLER_INSTINCT: 'killer_instinct',        // When opponent is hurt - increased aggression
  RHYTHM: 'rhythm',                           // When combinations are landing - flow state
  CROWD_ENERGY: 'crowd_energy',              // Home fighter advantage
  CONFIDENCE_BOOST: 'confidence_boost',      // After knockdown scored - psychological edge
  FRESH_LEGS: 'fresh_legs',                  // After rest period - movement bonus
  BIG_FIGHT_MENTALITY: 'big_fight_mentality', // vs elite opponent - rises to the occasion (Lewis trait)
  FAST_START: 'fast_start',                  // Explosive early rounds - Tyson's trademark aggression
};

// Effect types - Negative (Debuffs)
export const DebuffType = {
  CAUTIOUS: 'cautious',                      // After being hurt - more defensive, less aggressive
  RATTLED: 'rattled',                        // After knockdown - reduced composure, shaky
  ARM_WEARY: 'arm_weary',                    // After high output - reduced punch speed/power
  VISION_IMPAIRED: 'vision_impaired',        // From cuts/swelling - reduced accuracy
  DESPERATE: 'desperate',                    // Behind on cards late - reckless aggression
  DEMORALIZED: 'demoralized',                // Being dominated - reduced effectiveness
  SHELL_SHOCKED: 'shell_shocked',            // After brutal punishment - survival mode
  GASSED: 'gassed',                          // Stamina depleted - everything harder
  FROZEN: 'frozen',                          // Intimidated by opponent - hesitation
  HURT_HANDS: 'hurt_hands',                  // From landing hard shots - reduced power
  FOCUS_LAPSE: 'focus_lapse',                // Mental lapse - temporarily vulnerable (Lewis weakness)
};

// Effect category for UI display
export const EffectCategory = {
  BUFF: 'buff',
  DEBUFF: 'debuff',
};

/**
 * Effect definition with all properties
 */
class FightEffect {
  constructor(type, category, config = {}) {
    this.type = type;
    this.category = category;
    this.intensity = config.intensity || 0.5;        // 0-1 scale
    this.duration = config.duration || 20;           // Ticks (0.5s each)
    this.maxDuration = config.duration || 20;
    this.source = config.source || 'unknown';
    this.stackable = config.stackable || false;
    this.stacks = 1;
    this.maxStacks = config.maxStacks || 3;

    // What this effect modifies
    this.modifiers = config.modifiers || {};
  }

  /**
   * Get remaining duration as percentage
   */
  getRemainingPercent() {
    return this.duration / this.maxDuration;
  }

  /**
   * Get effective intensity (considers stacks and remaining duration)
   */
  getEffectiveIntensity() {
    // Effect weakens as duration decreases (last 25% of duration)
    const durationFactor = this.duration > this.maxDuration * 0.25
      ? 1.0
      : this.duration / (this.maxDuration * 0.25);

    return this.intensity * this.stacks * durationFactor;
  }

  /**
   * Tick down duration
   * @returns {boolean} - True if effect is still active
   */
  tick() {
    this.duration--;
    return this.duration > 0;
  }

  /**
   * Refresh or stack the effect
   */
  refresh(newIntensity = null, additionalDuration = null) {
    if (newIntensity !== null) {
      this.intensity = Math.max(this.intensity, newIntensity);
    }

    if (this.stackable && this.stacks < this.maxStacks) {
      this.stacks++;
    }

    // Refresh duration (at least half the max, or the additional amount)
    const refreshAmount = additionalDuration || Math.floor(this.maxDuration * 0.5);
    this.duration = Math.min(this.maxDuration, this.duration + refreshAmount);
  }
}

/**
 * Main Effects Manager
 */
export class FightEffectsManager {
  constructor() {
    // Use Maps for dynamic fighter ID support
    this.effects = new Map();  // Map<fighterId, Map<effectType, FightEffect>>
    this.history = new Map();  // Map<fighterId, Array>
    this.momentum = new Map(); // Map<fighterId, number>
    this.previousMomentum = new Map(); // Map<fighterId, number> - for shift detection
    this.recentEvents = new Map(); // Map<fighterId, object>
    this.lastMomentumLeader = null; // Who had momentum last check
    this.momentumShiftCooldown = 0; // Prevent rapid shift announcements

    // Pre-initialize for standard A/B fighter IDs
    this.initializeFighter('A');
    this.initializeFighter('B');
  }

  /**
   * Initialize tracking for a fighter ID
   */
  initializeFighter(fighterId) {
    if (!this.effects.has(fighterId)) {
      this.effects.set(fighterId, new Map());
      this.history.set(fighterId, []);
      this.momentum.set(fighterId, 0);
      this.previousMomentum.set(fighterId, 0);
      this.recentEvents.set(fighterId, {
        punchesLanded: 0,
        punchesTaken: 0,
        knockdownsScored: 0,
        knockdownsTaken: 0
      });
    }
  }

  /**
   * Ensure fighter is initialized (auto-init on first access)
   */
  ensureFighter(fighterId) {
    if (!this.effects.has(fighterId)) {
      this.initializeFighter(fighterId);
    }
  }

  /**
   * Reset for new round
   */
  resetForRound() {
    // Clear temporary event counters for all fighters
    for (const [fighterId] of this.recentEvents) {
      this.recentEvents.set(fighterId, {
        punchesLanded: 0,
        punchesTaken: 0,
        knockdownsScored: 0,
        knockdownsTaken: 0
      });
    }

    // Apply fresh legs buff at round start to all fighters
    for (const [fighterId] of this.effects) {
      this.applyEffect(fighterId, BuffType.FRESH_LEGS, {
        intensity: 0.3,
        duration: 12,  // First 6 seconds of round
        source: 'round_start',
        modifiers: { footSpeed: 0.1, headMovement: 0.05 }
      });
    }
  }

  /**
   * Apply an effect to a fighter
   */
  applyEffect(fighterId, type, config = {}) {
    this.ensureFighter(fighterId);

    const category = Object.values(BuffType).includes(type)
      ? EffectCategory.BUFF
      : EffectCategory.DEBUFF;

    // MOMENTUM is exclusive - only one fighter can have it at a time
    // When one fighter gains momentum, the opponent loses it
    if (type === BuffType.MOMENTUM) {
      const opponentId = fighterId === 'A' ? 'B' : 'A';
      this.removeEffect(opponentId, BuffType.MOMENTUM);
    }

    const fighterEffects = this.effects.get(fighterId);
    const existingEffect = fighterEffects.get(type);

    if (existingEffect) {
      // Refresh existing effect
      existingEffect.refresh(config.intensity, config.duration);
    } else {
      // Create new effect
      const effect = new FightEffect(type, category, config);
      fighterEffects.set(type, effect);

      // Log to history
      this.history.get(fighterId).push({
        type,
        category,
        appliedAt: Date.now(),
        source: config.source || 'unknown',
        intensity: config.intensity || 0.5,
      });
    }
  }

  /**
   * Remove an effect
   */
  removeEffect(fighterId, type) {
    this.ensureFighter(fighterId);
    this.effects.get(fighterId).delete(type);
  }

  /**
   * Check if fighter has effect
   */
  hasEffect(fighterId, type) {
    this.ensureFighter(fighterId);
    return this.effects.get(fighterId).has(type);
  }

  /**
   * Get an effect object (null if not present)
   */
  getEffect(fighterId, type) {
    this.ensureFighter(fighterId);
    return this.effects.get(fighterId).get(type) || null;
  }

  /**
   * Get effect intensity (0 if not present)
   */
  getEffectIntensity(fighterId, type) {
    this.ensureFighter(fighterId);
    const effect = this.effects.get(fighterId).get(type);
    return effect ? effect.getEffectiveIntensity() : 0;
  }

  /**
   * Get all active effects for a fighter
   */
  getActiveEffects(fighterId) {
    this.ensureFighter(fighterId);
    return Array.from(this.effects.get(fighterId).values());
  }

  /**
   * Get active buffs only
   */
  getActiveBuffs(fighterId) {
    return this.getActiveEffects(fighterId).filter(e => e.category === EffectCategory.BUFF);
  }

  /**
   * Get active debuffs only
   */
  getActiveDebuffs(fighterId) {
    return this.getActiveEffects(fighterId).filter(e => e.category === EffectCategory.DEBUFF);
  }

  /**
   * Tick all effects (called each simulation tick)
   */
  tick() {
    for (const [, fighterEffects] of this.effects) {
      const toRemove = [];

      for (const [type, effect] of fighterEffects) {
        if (!effect.tick()) {
          toRemove.push(type);
        }
      }

      // Remove expired effects
      for (const type of toRemove) {
        fighterEffects.delete(type);
      }
    }

    // Decrement momentum shift cooldown
    if (this.momentumShiftCooldown > 0) {
      this.momentumShiftCooldown--;
    }
  }

  /**
   * Check for momentum shift and return event data if shift occurred
   * A momentum shift happens when:
   * 1. The lead changes (A was ahead, now B is ahead)
   * 2. A significant swing occurs (30+ point change)
   * 3. One fighter gains dominant momentum (60+ points ahead)
   */
  checkMomentumShift() {
    if (this.momentumShiftCooldown > 0) return null;

    const momA = this.momentum.get('A') || 0;
    const momB = this.momentum.get('B') || 0;
    const prevMomA = this.previousMomentum.get('A') || 0;
    const prevMomB = this.previousMomentum.get('B') || 0;

    // Determine current and previous leaders
    const currentLeader = momA > momB + 15 ? 'A' : momB > momA + 15 ? 'B' : null;
    const prevLeader = prevMomA > prevMomB + 15 ? 'A' : prevMomB > prevMomA + 15 ? 'B' : null;

    // Update previous momentum for next check
    this.previousMomentum.set('A', momA);
    this.previousMomentum.set('B', momB);

    let shiftEvent = null;

    // Check for lead change
    if (currentLeader && prevLeader && currentLeader !== prevLeader) {
      shiftEvent = {
        type: 'MOMENTUM_SHIFT',
        newLeader: currentLeader,
        previousLeader: prevLeader,
        magnitude: 'change',
        momentumA: momA,
        momentumB: momB
      };
      this.momentumShiftCooldown = 40; // ~20 seconds cooldown
    }
    // Check for gaining control (neutral to dominant)
    else if (currentLeader && !this.lastMomentumLeader) {
      const diff = Math.abs(momA - momB);
      if (diff >= 30) {
        shiftEvent = {
          type: 'MOMENTUM_SHIFT',
          newLeader: currentLeader,
          previousLeader: null,
          magnitude: diff >= 50 ? 'dominant' : 'gaining',
          momentumA: momA,
          momentumB: momB
        };
        this.momentumShiftCooldown = 30; // ~15 seconds cooldown
      }
    }
    // Check for dominant momentum (big lead)
    else if (currentLeader === this.lastMomentumLeader) {
      const diff = Math.abs(momA - momB);
      if (diff >= 60 && this.momentumShiftCooldown === 0) {
        shiftEvent = {
          type: 'MOMENTUM_SHIFT',
          newLeader: currentLeader,
          previousLeader: currentLeader,
          magnitude: 'dominant',
          momentumA: momA,
          momentumB: momB
        };
        this.momentumShiftCooldown = 60; // ~30 seconds cooldown
      }
    }

    this.lastMomentumLeader = currentLeader;
    return shiftEvent;
  }

  /**
   * Get current momentum state for display
   */
  getMomentumState() {
    const momA = this.momentum.get('A') || 0;
    const momB = this.momentum.get('B') || 0;
    return {
      A: momA,
      B: momB,
      leader: momA > momB + 15 ? 'A' : momB > momA + 15 ? 'B' : null,
      margin: Math.abs(momA - momB)
    };
  }

  /**
   * Calculate total modifier for an attribute from all effects
   */
  getAttributeModifier(fighterId, attribute) {
    this.ensureFighter(fighterId);
    let modifier = 0;

    for (const effect of this.effects.get(fighterId).values()) {
      if (effect.modifiers[attribute]) {
        const contribution = effect.modifiers[attribute] * effect.getEffectiveIntensity();
        modifier += contribution;
      }
    }

    return modifier;
  }

  /**
   * Get aggression modifier (positive = more aggressive, negative = more cautious)
   */
  getAggressionModifier(fighterId) {
    let modifier = 0;

    // Buffs that increase aggression
    modifier += this.getEffectIntensity(fighterId, BuffType.ADRENALINE_SURGE) * 0.3;
    modifier += this.getEffectIntensity(fighterId, BuffType.MOMENTUM) * 0.2;
    modifier += this.getEffectIntensity(fighterId, BuffType.KILLER_INSTINCT) * 0.4;
    modifier += this.getEffectIntensity(fighterId, BuffType.CONFIDENCE_BOOST) * 0.2;
    modifier += this.getEffectIntensity(fighterId, BuffType.FAST_START) * 0.5; // Explosive early rounds

    // Debuffs that decrease aggression (make cautious)
    modifier -= this.getEffectIntensity(fighterId, DebuffType.CAUTIOUS) * 0.4;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.RATTLED) * 0.3;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.SHELL_SHOCKED) * 0.5;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.FROZEN) * 0.4;

    // Desperate increases aggression but recklessly
    modifier += this.getEffectIntensity(fighterId, DebuffType.DESPERATE) * 0.5;

    return Math.max(-0.5, Math.min(0.5, modifier));
  }

  /**
   * Get defense modifier
   */
  getDefenseModifier(fighterId) {
    let modifier = 0;

    // Being cautious actually improves defense
    modifier += this.getEffectIntensity(fighterId, DebuffType.CAUTIOUS) * 0.15;

    // Negative effects on defense
    modifier -= this.getEffectIntensity(fighterId, DebuffType.RATTLED) * 0.2;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.SHELL_SHOCKED) * 0.3;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.GASSED) * 0.25;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.DESPERATE) * 0.3;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.VISION_IMPAIRED) * 0.2;

    // Positive effects
    modifier += this.getEffectIntensity(fighterId, BuffType.RHYTHM) * 0.1;
    modifier += this.getEffectIntensity(fighterId, BuffType.FRESH_LEGS) * 0.1;

    return Math.max(-0.4, Math.min(0.3, modifier));
  }

  /**
   * Get accuracy modifier
   */
  getAccuracyModifier(fighterId) {
    let modifier = 0;

    // Positive
    modifier += this.getEffectIntensity(fighterId, BuffType.RHYTHM) * 0.15;
    modifier += this.getEffectIntensity(fighterId, BuffType.MOMENTUM) * 0.1;
    modifier += this.getEffectIntensity(fighterId, BuffType.CONFIDENCE_BOOST) * 0.1;

    // Negative
    modifier -= this.getEffectIntensity(fighterId, DebuffType.VISION_IMPAIRED) * 0.25;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.ARM_WEARY) * 0.1;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.RATTLED) * 0.15;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.DESPERATE) * 0.2;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.DEMORALIZED) * 0.15;

    return Math.max(-0.3, Math.min(0.2, modifier));
  }

  /**
   * Get power modifier
   */
  getPowerModifier(fighterId) {
    let modifier = 0;

    // Positive
    modifier += this.getEffectIntensity(fighterId, BuffType.ADRENALINE_SURGE) * 0.2;
    modifier += this.getEffectIntensity(fighterId, BuffType.KILLER_INSTINCT) * 0.15;
    modifier += this.getEffectIntensity(fighterId, BuffType.MOMENTUM) * 0.1;
    modifier += this.getEffectIntensity(fighterId, BuffType.FAST_START) * 0.15; // Early round power

    // Negative
    modifier -= this.getEffectIntensity(fighterId, DebuffType.ARM_WEARY) * 0.2;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.GASSED) * 0.25;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.HURT_HANDS) * 0.15;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.DEMORALIZED) * 0.1;

    return Math.max(-0.3, Math.min(0.25, modifier));
  }

  /**
   * Get speed modifier
   */
  getSpeedModifier(fighterId) {
    let modifier = 0;

    // Positive
    modifier += this.getEffectIntensity(fighterId, BuffType.ADRENALINE_SURGE) * 0.15;
    modifier += this.getEffectIntensity(fighterId, BuffType.RHYTHM) * 0.1;
    modifier += this.getEffectIntensity(fighterId, BuffType.FRESH_LEGS) * 0.1;
    modifier += this.getEffectIntensity(fighterId, BuffType.FAST_START) * 0.2; // Explosive early speed

    // Negative
    modifier -= this.getEffectIntensity(fighterId, DebuffType.ARM_WEARY) * 0.15;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.GASSED) * 0.2;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.RATTLED) * 0.1;
    modifier -= this.getEffectIntensity(fighterId, DebuffType.SHELL_SHOCKED) * 0.15;

    return Math.max(-0.25, Math.min(0.2, modifier));
  }

  // ==========================================
  // EVENT HANDLERS - Called from SimulationLoop
  // ==========================================

  /**
   * Handle a punch being landed
   */
  onPunchLanded(attackerId, defenderId, punchData) {
    this.ensureFighter(attackerId);
    this.ensureFighter(defenderId);

    const { damage, punchType, isCounter, isCritical } = punchData;

    const attackerEvents = this.recentEvents.get(attackerId);
    const defenderEvents = this.recentEvents.get(defenderId);
    attackerEvents.punchesLanded++;
    defenderEvents.punchesTaken++;

    // Update momentum
    this.momentum.set(attackerId, Math.min(100, this.momentum.get(attackerId) + 3));
    this.momentum.set(defenderId, Math.max(-100, this.momentum.get(defenderId) - 2));

    // --- ATTACKER EFFECTS ---

    // Build momentum after landing multiple punches
    if (attackerEvents.punchesLanded >= 3) {
      this.applyEffect(attackerId, BuffType.MOMENTUM, {
        intensity: 0.4,
        duration: 30,
        stackable: true,
        maxStacks: 3,
        source: 'consecutive_punches',
        modifiers: { confidence: 0.1, accuracy: 0.05 }
      });
    }

    // Rhythm buff when combinations are landing
    if (punchType !== 'jab' && attackerEvents.punchesLanded >= 2) {
      this.applyEffect(attackerId, BuffType.RHYTHM, {
        intensity: 0.3,
        duration: 20,
        source: 'combination_landing',
        modifiers: { handSpeed: 0.1, combinationSpeed: 0.1 }
      });
    }

    // Big shot landed - potential hurt hands
    if (damage > 15 && punchType !== 'jab' && Math.random() < 0.1) {
      this.applyEffect(attackerId, DebuffType.HURT_HANDS, {
        intensity: 0.3,
        duration: 60,
        source: 'hard_punch',
        modifiers: { power: -0.1 }
      });
    }

    // --- DEFENDER EFFECTS ---

    // Taking punishment - potential caution
    if (damage > 10) {
      const cautionChance = damage / 50;
      if (Math.random() < cautionChance) {
        this.applyEffect(defenderId, DebuffType.CAUTIOUS, {
          intensity: Math.min(0.8, damage / 25),
          duration: 25 + Math.floor(damage),
          source: 'hurt_by_punch',
          modifiers: { aggression: -0.2 }
        });
      }
    }

    // Critical/big shots can cause shell shock
    if (isCritical || damage > 20) {
      if (Math.random() < 0.15) {
        this.applyEffect(defenderId, DebuffType.SHELL_SHOCKED, {
          intensity: 0.5,
          duration: 20,
          source: 'big_shot',
          modifiers: { composure: -0.2, reflexes: -0.1 }
        });
      }
    }
  }

  /**
   * Handle fighter being hurt (entering HURT state)
   */
  onFighterHurt(fighterId, opponentId, damageData) {
    // The hurt fighter becomes cautious
    this.applyEffect(fighterId, DebuffType.CAUTIOUS, {
      intensity: 0.7,
      duration: 40,
      source: 'hurt',
      modifiers: { aggression: -0.3 }
    });

    // Can also trigger adrenaline (fight response)
    if (Math.random() < 0.3) {
      this.applyEffect(fighterId, BuffType.ADRENALINE_SURGE, {
        intensity: 0.6,
        duration: 30,
        source: 'hurt_response',
        modifiers: { power: 0.15, handSpeed: 0.1 }
      });
    }

    // Opponent gets killer instinct
    this.applyEffect(opponentId, BuffType.KILLER_INSTINCT, {
      intensity: 0.8,
      duration: 35,
      source: 'opponent_hurt',
      modifiers: { aggression: 0.3, power: 0.1 }
    });
  }

  /**
   * Handle knockdown
   */
  onKnockdown(knockedDownId, attackerId, knockdownData) {
    this.ensureFighter(knockedDownId);
    this.ensureFighter(attackerId);

    const attackerEvents = this.recentEvents.get(attackerId);
    const knockedDownEvents = this.recentEvents.get(knockedDownId);
    attackerEvents.knockdownsScored++;
    knockedDownEvents.knockdownsTaken++;

    // Major momentum shift
    this.momentum.set(attackerId, Math.min(100, this.momentum.get(attackerId) + 30));
    this.momentum.set(knockedDownId, Math.max(-100, this.momentum.get(knockedDownId) - 40));

    // --- KNOCKED DOWN FIGHTER ---

    // Rattled effect - reduced composure
    this.applyEffect(knockedDownId, DebuffType.RATTLED, {
      intensity: 0.8,
      duration: 60,  // Lasts a while
      source: 'knockdown',
      modifiers: { composure: -0.25, confidence: -0.2 }
    });

    // Cautious - more defensive after getting up
    this.applyEffect(knockedDownId, DebuffType.CAUTIOUS, {
      intensity: 0.6,
      duration: 45,
      source: 'knockdown',
      modifiers: { aggression: -0.25 }
    });

    // Possible frozen/scared if multiple knockdowns
    if (knockedDownEvents.knockdownsTaken >= 2) {
      this.applyEffect(knockedDownId, DebuffType.FROZEN, {
        intensity: 0.7,
        duration: 40,
        source: 'multiple_knockdowns',
        modifiers: { firstStep: -0.2, reflexes: -0.15 }
      });
    }

    // --- ATTACKER ---

    // Confidence boost
    this.applyEffect(attackerId, BuffType.CONFIDENCE_BOOST, {
      intensity: 0.9,
      duration: 50,
      source: 'knockdown_scored',
      modifiers: { confidence: 0.2, composure: 0.1 }
    });

    // Killer instinct intensifies
    this.applyEffect(attackerId, BuffType.KILLER_INSTINCT, {
      intensity: 1.0,
      duration: 40,
      source: 'knockdown_scored',
      modifiers: { aggression: 0.4, power: 0.15 }
    });
  }

  /**
   * Handle fighter recovery from hurt state
   */
  onRecovery(fighterId) {
    // Slight adrenaline from surviving
    if (Math.random() < 0.4) {
      this.applyEffect(fighterId, BuffType.ADRENALINE_SURGE, {
        intensity: 0.4,
        duration: 25,
        source: 'survival',
        modifiers: { power: 0.1, heart: 0.1 }
      });
    }

    // Remove shell shock on recovery
    this.removeEffect(fighterId, DebuffType.SHELL_SHOCKED);
  }

  /**
   * Handle high punch output (fatigue effects)
   */
  onHighOutput(fighterId, punchCount, duration) {
    // More than 30 punches in 30 seconds = arm weary (very high output)
    // This should only trigger for extreme volume, not normal fighting
    if (punchCount > 30) {
      this.applyEffect(fighterId, DebuffType.ARM_WEARY, {
        intensity: Math.min(0.6, (punchCount - 30) / 30),
        duration: 30,
        stackable: true,
        maxStacks: 2,
        source: 'high_output',
        modifiers: { handSpeed: -0.08, power: -0.08 }
      });
    }
  }

  /**
   * Handle stamina depletion
   */
  onStaminaLow(fighterId, staminaPercent) {
    // Only trigger GASSED at very low stamina (20% or below)
    // The stamina system already has fatigue tiers that apply penalties
    if (staminaPercent < 0.20) {
      // Intensity scales with how low stamina is (0.20 -> 0 intensity, 0 -> 1 intensity)
      const intensity = Math.min(0.8, (0.20 - staminaPercent) / 0.20);
      this.applyEffect(fighterId, DebuffType.GASSED, {
        intensity: intensity,
        duration: 15,  // Short duration, rechecked frequently
        source: 'low_stamina',
        modifiers: { handSpeed: -0.10, footSpeed: -0.12, power: -0.10 }
      });
    } else {
      // Remove GASSED if stamina recovered above threshold
      this.removeEffect(fighterId, DebuffType.GASSED);
    }
  }

  /**
   * Handle being behind on scorecards late in fight
   */
  onBehindOnCards(fighterId, roundsRemaining, pointsBehind) {
    // Only applies in late rounds when significantly behind
    if (roundsRemaining <= 3 && pointsBehind >= 3) {
      this.applyEffect(fighterId, DebuffType.DESPERATE, {
        intensity: Math.min(1.0, pointsBehind / 10 + (3 - roundsRemaining) / 3),
        duration: 60,  // Rest of round basically
        source: 'behind_on_cards',
        modifiers: { aggression: 0.3, defense: -0.2 }
      });
    }
  }

  /**
   * Handle domination (one fighter clearly winning)
   */
  onDomination(dominatedId, dominatorId) {
    this.applyEffect(dominatedId, DebuffType.DEMORALIZED, {
      intensity: 0.5,
      duration: 45,
      source: 'being_dominated',
      modifiers: { confidence: -0.2, composure: -0.1 }
    });

    this.applyEffect(dominatorId, BuffType.MOMENTUM, {
      intensity: 0.6,
      duration: 40,
      source: 'dominating',
      modifiers: { confidence: 0.15, composure: 0.1 }
    });
  }

  /**
   * Handle cut being opened
   */
  onCutOpened(fighterId, location, severity) {
    if (location === 'eye' || location === 'eyebrow') {
      this.applyEffect(fighterId, DebuffType.VISION_IMPAIRED, {
        intensity: severity,
        duration: 200,  // Long lasting - until corner works on it
        source: 'cut',
        modifiers: { accuracy: -0.15, headMovement: -0.1 }
      });
    }
  }

  /**
   * Handle intimidation (pre-fight or early fight)
   * Intimidation is resisted by heart - elite heart fighters don't get scared
   * Tyson (99 intimidation) vs average heart (70) = major advantage
   * Tyson (99 intimidation) vs Holyfield (98 heart) = no effect
   */
  onIntimidation(intimidatedId, intimidatorPower, targetHeart, targetExperience) {
    // Calculate intimidation effectiveness: intimidation vs heart
    // Heart is the primary resistance, experience helps too
    const heartResistance = targetHeart || 70;
    const experienceResistance = (targetExperience || 70) * 0.2; // Experience helps 20%
    const totalResistance = heartResistance + experienceResistance;

    // Net intimidation effect
    const intimidationGap = intimidatorPower - totalResistance;

    // If target's heart+exp exceeds intimidation, they're unfazed
    if (intimidationGap <= 0) {
      return false; // "I'm not scared of you"
    }

    // Scale effect by the gap (bigger gap = more scared)
    // Gap of 10 = mild effect, Gap of 30+ = severe
    const effectStrength = Math.min(1.0, intimidationGap / 40);

    // Random factor - even intimidating fighters don't always land the mental blow
    const intimidationChance = 0.5 + (intimidatorPower / 200); // 50-100% based on intimidation
    if (Math.random() > intimidationChance) {
      return false;
    }

    // Apply intimidation debuff - scales with gap
    // Lasts the entire fight for severe intimidation, fades for mild
    const duration = Math.round(180 + effectStrength * 500); // 180-680 ticks (1.5-5+ minutes)

    this.applyEffect(intimidatedId, DebuffType.FROZEN, {
      intensity: effectStrength,
      duration: duration,
      source: 'intimidation',
      modifiers: {
        // Scaling debuffs based on how scared they are
        firstStep: -0.05 - effectStrength * 0.15,    // -5% to -20%
        confidence: -0.05 - effectStrength * 0.20,   // -5% to -25%
        accuracy: -0.03 - effectStrength * 0.12,     // -3% to -15%
        power: -0.02 - effectStrength * 0.08,        // -2% to -10%
        reflexes: -0.02 - effectStrength * 0.08,     // -2% to -10%
        composure: -0.05 - effectStrength * 0.15     // -5% to -20%
      }
    });

    return true;
  }

  /**
   * Check for second wind in late rounds
   */
  checkSecondWind(fighterId, fighter, currentRound, totalRounds) {
    // Only in championship rounds and if fighter has second wind attribute
    if (currentRound >= totalRounds - 2) {
      const secondWindChance = (fighter.stamina?.secondWind || 50) / 300;

      if (Math.random() < secondWindChance && !this.hasEffect(fighterId, BuffType.SECOND_WIND)) {
        this.applyEffect(fighterId, BuffType.SECOND_WIND, {
          intensity: 0.7,
          duration: 80,  // Most of a round
          source: 'championship_rounds',
          modifiers: { cardio: 0.2, heart: 0.15, workRate: 0.1 }
        });
        return true;  // Signal that second wind activated
      }
    }
    return false;
  }

  /**
   * Check for focus lapse - momentary mental lapses that leave fighters vulnerable
   * Fighters with low focus (like Lewis) are prone to these lapses
   * When lapsed, defensive attributes are significantly reduced for a few seconds
   */
  checkFocusLapse(fighterId, fighter) {
    // Already in a lapse, don't stack
    if (this.hasEffect(fighterId, DebuffType.FOCUS_LAPSE)) {
      return false;
    }

    // Focus attribute - defaults to 85 if not specified (most fighters are consistent)
    const focus = fighter.mental?.focus ?? 85;

    // Higher focus = lower chance of lapse
    // focus 90+ = 0.5% chance per tick (~1 lapse per 3 rounds)
    // focus 70 = 2% chance per tick (~1 lapse per round)
    // focus 50 = 4% chance per tick (~2-3 lapses per round)
    const lapseChance = Math.max(0.003, (100 - focus) / 1500);

    // Fatigue increases lapse chance
    const staminaPercent = fighter.getStaminaPercent?.() || 1;
    const fatigueMod = staminaPercent < 0.4 ? 1.5 : staminaPercent < 0.6 ? 1.2 : 1.0;

    if (Math.random() < lapseChance * fatigueMod) {
      // Focus lapse! Temporary vulnerability
      // Duration: 4-8 ticks (2-4 seconds) - enough to get caught
      const duration = Math.round(4 + Math.random() * 4);

      // Intensity scales with how unfocused they are
      const intensity = (100 - focus) / 100; // 0.3 for focus 70, 0.5 for focus 50

      this.applyEffect(fighterId, DebuffType.FOCUS_LAPSE, {
        intensity,
        duration,
        source: 'mental_lapse',
        modifiers: {
          headMovement: -0.15 - intensity * 0.15,   // -15% to -30%
          reflexes: -0.10 - intensity * 0.15,       // -10% to -25%
          blocking: -0.10 - intensity * 0.10,       // -10% to -20%
          ringAwareness: -0.20 - intensity * 0.10,  // -20% to -30%
        }
      });

      return true;
    }

    return false;
  }

  /**
   * Apply big fight mentality buff - fighters with high clutchFactor rise vs elite opponents
   * Lewis was often lazy but would elevate his game for marquee fights (Holyfield, Tyson)
   * vs weak opponents (Vitali), he wouldn't take training seriously and nearly lost
   *
   * @param {string} fighterId - 'A' or 'B'
   * @param {Fighter} fighter - The fighter being checked
   * @param {Fighter} opponent - The opponent they're facing
   */
  applyBigFightMentality(fighterId, fighter, opponent) {
    const clutchFactor = fighter.mental?.clutchFactor ?? 70;

    // Calculate opponent's "elite-ness" - average of key mental/power attributes
    const opponentRating = (
      (opponent.mental?.chin ?? 70) +
      (opponent.mental?.heart ?? 70) +
      (opponent.power?.knockoutPower ?? 70) +
      (opponent.technical?.fightIQ ?? 70) +
      (opponent.mental?.experience ?? 70)
    ) / 5;

    // Big fight = opponent rating 80+
    // Lewis (clutchFactor 85) vs Holyfield (opponentRating ~87) = big fight
    // Lewis (clutchFactor 85) vs journeyman (opponentRating ~60) = not a big fight
    if (opponentRating >= 80) {
      // This is a big fight - clutchFactor determines how much fighter rises
      const intensity = (clutchFactor - 50) / 100; // 85 clutch = 0.35 intensity
      const eliteFactor = (opponentRating - 80) / 20; // How elite opponent is (0-1)

      // Only apply if fighter has good clutchFactor (70+)
      if (clutchFactor >= 70) {
        this.applyEffect(fighterId, BuffType.BIG_FIGHT_MENTALITY, {
          intensity: intensity * (0.5 + eliteFactor * 0.5),
          duration: 999999, // Lasts entire fight
          source: 'big_fight',
          modifiers: {
            accuracy: 0.02 + intensity * 0.04,      // +2% to +6%
            power: 0.01 + intensity * 0.03,         // +1% to +4%
            handSpeed: intensity * 0.02,            // +0% to +3%
            composure: intensity * 0.1,             // +0% to +10%
            aggression: -intensity * 0.1,           // Less reckless - smarter
          }
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Apply fast start buff - explosive fighters like Tyson come out blazing
   * These fighters try to overwhelm opponents in the first 3-4 rounds
   * Uses firstStep (explosive entry) and killerInstinct (finish early)
   *
   * @param {string} fighterId - 'A' or 'B'
   * @param {Fighter} fighter - The fighter being checked
   */
  applyFastStart(fighterId, fighter) {
    // Fast start based on firstStep (explosiveness) and killerInstinct (urgency)
    const firstStep = fighter.speed?.firstStep ?? 70;
    const killerInstinct = fighter.mental?.killerInstinct ?? 70;

    // Fast starter score: need both explosiveness AND killer instinct
    // Tyson: firstStep 98, killerInstinct 99 = score 98.5
    // Holyfield: firstStep 88, killerInstinct 90 = score 89 (doesn't quite qualify)
    // Average fighter: firstStep 70, killerInstinct 70 = score 70
    const fastStartScore = (firstStep + killerInstinct) / 2;

    // Only apply if score is 92+ (elite fast starters - Tyson-level explosiveness)
    // This is a rare trait - only the most explosive fighters qualify
    if (fastStartScore >= 92) {
      const intensity = (fastStartScore - 92) / 16; // 0 to 0.5 for 92-100 range

      this.applyEffect(fighterId, BuffType.FAST_START, {
        intensity: 0.3 + intensity,  // 0.3 to 0.8 intensity
        duration: 480,               // ~4 rounds (120 ticks per round × 4)
        source: 'fast_starter',
        modifiers: {
          handSpeed: 0.05 + intensity * 0.08,     // +5% to +13% hand speed
          firstStep: 0.05 + intensity * 0.10,     // +5% to +15% explosiveness
          power: 0.03 + intensity * 0.05,         // +3% to +8% power
          aggression: 0.15 + intensity * 0.20,    // Much more aggressive early
          combinationSpeed: 0.05 + intensity * 0.08, // Faster combos
          intimidation: 0.10 + intensity * 0.15,  // More intimidating in early rounds
        }
      });

      return true;
    }

    return false;
  }

  /**
   * Update fast start effect each round - intensity decreases as rounds progress
   * Called at the start of each round
   *
   * @param {string} fighterId - 'A' or 'B'
   * @param {number} round - Current round number
   */
  updateFastStartForRound(fighterId, round) {
    if (!this.hasEffect(fighterId, BuffType.FAST_START)) {
      return;
    }

    // Fast start fades after round 4
    if (round > 4) {
      this.removeEffect(fighterId, BuffType.FAST_START);
      return;
    }

    // Reduce intensity each round (100% R1, 75% R2, 50% R3, 25% R4)
    const effect = this.getEffect(fighterId, BuffType.FAST_START);
    if (effect) {
      const roundMultiplier = (5 - round) / 4; // 1.0, 0.75, 0.5, 0.25
      // Scale down the modifiers
      for (const [key, baseValue] of Object.entries(effect.modifiers)) {
        effect.modifiers[key] = baseValue * roundMultiplier;
      }
    }
  }

  /**
   * Get summary of effects for display
   */
  getEffectsSummary(fighterId) {
    this.ensureFighter(fighterId);

    const buffs = this.getActiveBuffs(fighterId).map(e => ({
      type: e.type,
      intensity: e.getEffectiveIntensity(),
      remaining: e.getRemainingPercent(),
      stacks: e.stacks,
    }));

    const debuffs = this.getActiveDebuffs(fighterId).map(e => ({
      type: e.type,
      intensity: e.getEffectiveIntensity(),
      remaining: e.getRemainingPercent(),
      stacks: e.stacks,
    }));

    return { buffs, debuffs, momentum: this.momentum.get(fighterId) || 0 };
  }

  /**
   * Get display-friendly effect name
   */
  static getEffectDisplayName(type) {
    const names = {
      [BuffType.ADRENALINE_SURGE]: 'ADRENALINE',
      [BuffType.MOMENTUM]: 'MOMENTUM',
      [BuffType.SECOND_WIND]: 'SECOND WIND',
      [BuffType.KILLER_INSTINCT]: 'KILLER INSTINCT',
      [BuffType.RHYTHM]: 'IN RHYTHM',
      [BuffType.CROWD_ENERGY]: 'CROWD',
      [BuffType.CONFIDENCE_BOOST]: 'CONFIDENT',
      [BuffType.FRESH_LEGS]: 'FRESH',
      [BuffType.BIG_FIGHT_MENTALITY]: 'BIG FIGHT',
      [BuffType.FAST_START]: 'FAST START',
      [DebuffType.CAUTIOUS]: 'CAUTIOUS',
      [DebuffType.RATTLED]: 'RATTLED',
      [DebuffType.ARM_WEARY]: 'ARM WEARY',
      [DebuffType.VISION_IMPAIRED]: 'IMPAIRED VISION',
      [DebuffType.DESPERATE]: 'DESPERATE',
      [DebuffType.DEMORALIZED]: 'DEMORALIZED',
      [DebuffType.SHELL_SHOCKED]: 'SHELL SHOCKED',
      [DebuffType.GASSED]: 'GASSED',
      [DebuffType.FROZEN]: 'FROZEN',
      [DebuffType.HURT_HANDS]: 'HURT HANDS',
      [DebuffType.FOCUS_LAPSE]: 'UNFOCUSED',
    };
    return names[type] || type.toUpperCase();
  }
}

export default FightEffectsManager;
