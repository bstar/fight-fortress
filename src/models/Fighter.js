/**
 * Fighter Model
 * Represents a complete fighter with all attributes, state, and runtime data
 */

// Fighter states
export const FighterState = {
  NEUTRAL: 'NEUTRAL',
  OFFENSIVE: 'OFFENSIVE',
  DEFENSIVE: 'DEFENSIVE',
  TIMING: 'TIMING',
  MOVING: 'MOVING',
  CLINCH: 'CLINCH',
  BUZZED: 'BUZZED',        // Dazed but not hurt - forced defensive, vulnerable
  HURT: 'HURT',
  KNOCKED_DOWN: 'KNOCKED_DOWN',
  FLASH_DOWN: 'FLASH_DOWN', // Quick knockdown - fighter pops right back up
  RECOVERED: 'RECOVERED'
};

// Offensive sub-states
export const OffensiveSubState = {
  JABBING: 'JABBING',
  COMBINATION: 'COMBINATION',
  POWER_SHOT: 'POWER_SHOT',
  BODY_WORK: 'BODY_WORK',
  FEINTING: 'FEINTING'
};

// Defensive sub-states
export const DefensiveSubState = {
  HIGH_GUARD: 'HIGH_GUARD',
  PHILLY_SHELL: 'PHILLY_SHELL',
  HEAD_MOVEMENT: 'HEAD_MOVEMENT',
  DISTANCE: 'DISTANCE',
  PARRYING: 'PARRYING'
};

// Movement sub-states
export const MovementSubState = {
  CUTTING_OFF: 'CUTTING_OFF',
  CIRCLING: 'CIRCLING',
  RETREATING: 'RETREATING'
};

export class Fighter {
  constructor(config) {
    // Validate required fields
    if (!config.identity?.name) {
      throw new Error('Fighter must have a name');
    }

    // Identity
    this.id = config.id || this.generateId(config.identity.name);
    this.name = config.identity.name;
    this.nickname = config.identity.nickname || null;
    this.nationality = config.identity.nationality || null;
    this.hometown = config.identity.hometown || null;

    // Physical attributes
    this.physical = {
      height: config.physical?.height || 180,
      weight: config.physical?.weight || 75,
      reach: config.physical?.reach || 180,
      age: config.physical?.age || 25,
      stance: config.physical?.stance || 'orthodox',
      bodyType: config.physical?.bodyType || 'average'
    };

    // Style
    this.style = {
      primary: config.style?.primary || 'boxer-puncher',
      defensive: config.style?.defensive || 'high-guard',
      offensive: config.style?.offensive || 'combo-puncher'
    };

    // Power attributes
    this.power = this.initAttributeGroup(config.power, {
      powerLeft: 70,
      powerRight: 75,
      knockoutPower: 70,
      bodyPunching: 70,
      punchingStamina: 70
    });

    // Speed attributes
    this.speed = this.initAttributeGroup(config.speed, {
      handSpeed: 70,
      footSpeed: 70,
      reflexes: 70,
      firstStep: 70,
      combinationSpeed: 70
    });

    // Stamina attributes
    this.stamina = this.initAttributeGroup(config.stamina, {
      cardio: 70,
      recoveryRate: 70,
      workRate: 70,
      secondWind: 50,
      paceControl: 60
    });

    // Defense attributes
    this.defense = this.initAttributeGroup(config.defense, {
      headMovement: 65,
      blocking: 70,
      parrying: 60,
      shoulderRoll: 50,
      clinchDefense: 65,
      clinchOffense: 60,
      ringAwareness: 65
    });

    // Offense attributes
    this.offense = this.initAttributeGroup(config.offense, {
      jabAccuracy: 70,
      powerAccuracy: 65,
      bodyAccuracy: 65,
      punchSelection: 65,
      feinting: 55,
      counterPunching: 60,
      combinationPunching: 70
    });

    // Technical attributes
    this.technical = this.initAttributeGroup(config.technical, {
      footwork: 65,
      distanceManagement: 65,
      insideFighting: 60,
      outsideFighting: 65,
      ringGeneralship: 60,
      adaptability: 60,
      fightIQ: 65
    });

    // Mental attributes
    this.mental = this.initAttributeGroup(config.mental, {
      chin: 75,
      heart: 75,
      killerInstinct: 65,
      composure: 65,
      intimidation: 50,
      confidence: 70,
      experience: 60,
      clutchFactor: 60
    });

    // Corner crew
    this.corner = this.initCorner(config.corner);

    // Record (for display)
    this.record = {
      wins: config.record?.wins || 0,
      losses: config.record?.losses || 0,
      draws: config.record?.draws || 0,
      kos: config.record?.kos || 0
    };

    // Initialize runtime state
    this.initializeRuntimeState();

    // Calculate derived stats
    this.calculateDerivedStats();
  }

  /**
   * Generate unique fighter ID from name
   */
  generateId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Initialize an attribute group with defaults
   */
  initAttributeGroup(provided, defaults) {
    const result = { ...defaults };
    if (provided) {
      for (const key of Object.keys(defaults)) {
        if (provided[key] !== undefined) {
          result[key] = this.clampAttribute(provided[key]);
        }
      }
    }
    return result;
  }

  /**
   * Clamp attribute to valid range
   */
  clampAttribute(value) {
    return Math.max(1, Math.min(100, value));
  }

  /**
   * Initialize corner crew with defaults
   */
  initCorner(config) {
    return {
      headTrainer: {
        name: config?.headTrainer?.name || 'Corner Trainer',
        strategySkill: config?.headTrainer?.strategySkill || 70,
        communication: config?.headTrainer?.communication || 70,
        adaptability: config?.headTrainer?.adaptability || 70,
        specialty: config?.headTrainer?.specialty || null
      },
      cutman: {
        name: config?.cutman?.name || 'Cutman',
        cutTreatment: config?.cutman?.cutTreatment || 75,
        swellingTreatment: config?.cutman?.swellingTreatment || 75,
        speed: config?.cutman?.speed || 70
      }
    };
  }

  /**
   * Initialize runtime state (reset at fight start)
   */
  initializeRuntimeState() {
    // Current state
    this.state = FighterState.NEUTRAL;
    this.subState = null;
    this.stateTimer = 0;

    // Current stamina
    this.maxStamina = this.calculateMaxStamina();
    this.currentStamina = this.maxStamina;
    this.staminaTier = 'fresh';

    // Damage - scale by weight class (heavyweights are tougher/more durable)
    this.headDamage = 0;
    this.bodyDamage = 0;
    this.maxHeadDamage = this.calculateMaxDamage('head');
    this.maxBodyDamage = this.calculateMaxDamage('body');

    // Conditions
    this.cuts = [];
    this.swelling = [];
    this.isHurt = false;
    this.hurtDuration = 0;

    // Buzzed state - fighter is dazed, forced defensive, vulnerable to knockdown
    // Less severe than hurt but fighter must recover before returning to normal
    this.isBuzzed = false;
    this.buzzedDuration = 0;       // Ticks remaining in buzzed state
    this.buzzedSeverity = 0;       // 1-3 scale, affects recovery and vulnerability
    this.buzzedRecoveryRate = 1;   // Dynamic - affected by chin, conditioning

    // Stun/recovery system - fighters need time to recover from big shots
    // During stun, fighters can't throw effectively and are more vulnerable
    this.isStunned = false;
    this.stunDuration = 0;     // Ticks remaining in stun
    this.stunLevel = 0;        // 1 = light stun (can still defend), 2 = heavy stun (vulnerable)

    // Knockdowns
    this.knockdownsThisRound = 0;
    this.knockdownsTotal = 0;

    // Buffs/Debuffs
    this.activeBuffs = [];
    this.activeDebuffs = [];

    // Position (will be set by PositionTracker)
    this.position = { x: 0, y: 0 };

    // Modified attributes (after buffs/debuffs)
    this.modifiedAttributes = {};

    // Current confidence (can change during fight)
    this.currentConfidence = this.mental.confidence;

    // Second wind tracking
    this.secondWindUsed = false;

    // Round stats accumulator
    this.roundStats = this.initRoundStats();

    // Fight stats accumulator
    this.fightStats = this.initFightStats();

    // Strategy adjustments from corner
    this.currentStrategy = {};

    // Is this the home fighter?
    this.isHomeFighter = false;
  }

  /**
   * Initialize round statistics
   */
  initRoundStats() {
    return {
      punchesThrown: 0,
      punchesLanded: 0,
      jabsThrown: 0,
      jabsLanded: 0,
      powerPunchesThrown: 0,
      powerPunchesLanded: 0,
      bodyPunchesThrown: 0,
      bodyPunchesLanded: 0,
      cleanPunchesLanded: 0,
      damageDealt: 0,
      damageReceived: 0,
      punchesBlocked: 0,
      punchesEvaded: 0,
      knockdownsScored: 0,
      knockdownsSuffered: 0,
      clinchesInitiated: 0,
      timeInState: {}
    };
  }

  /**
   * Initialize fight statistics
   */
  initFightStats() {
    return {
      punchesThrown: 0,
      punchesLanded: 0,
      jabsThrown: 0,
      jabsLanded: 0,
      powerPunchesThrown: 0,
      powerPunchesLanded: 0,
      bodyPunchesThrown: 0,
      bodyPunchesLanded: 0,
      cleanPunchesLanded: 0,
      damageDealt: 0,
      damageReceived: 0,
      punchesBlocked: 0,
      punchesEvaded: 0,
      knockdownsScored: 0,
      knockdownsSuffered: 0,
      clinchesInitiated: 0,
      roundsWon: 0,
      roundsLost: 0,
      roundHistory: []
    };
  }

  /**
   * Calculate maximum damage capacity based on weight class
   * REALISTIC VALUES: Fighters routinely take 150-300 punches in a 12-round fight
   * without being stopped (unless knockdowns occur)
   * These values should allow fights to go the distance most of the time
   */
  calculateMaxDamage(type = 'head') {
    const weight = this.physical?.weight || 75;

    // Base damage thresholds by weight class - SIGNIFICANTLY INCREASED
    // These values should allow 150-200 punches to land before reaching 80% damage
    let baseDamage;
    if (weight >= 90.7) {
      // Heavyweight - very durable
      baseDamage = type === 'head' ? 350 : 300;
    } else if (weight >= 79.4) {
      // Cruiserweight
      baseDamage = type === 'head' ? 320 : 280;
    } else if (weight >= 76.2) {
      // Light heavyweight
      baseDamage = type === 'head' ? 300 : 260;
    } else if (weight >= 72.6) {
      // Middleweight
      baseDamage = type === 'head' ? 280 : 240;
    } else if (weight >= 66.7) {
      // Welterweight
      baseDamage = type === 'head' ? 260 : 220;
    } else if (weight >= 61.2) {
      // Lightweight
      baseDamage = type === 'head' ? 240 : 200;
    } else if (weight >= 57.2) {
      // Featherweight
      baseDamage = type === 'head' ? 220 : 180;
    } else if (weight >= 53.5) {
      // Bantamweight
      baseDamage = type === 'head' ? 200 : 170;
    } else {
      // Flyweight
      baseDamage = type === 'head' ? 180 : 150;
    }

    // Modify by chin attribute for head damage
    if (type === 'head') {
      const chinMod = 0.9 + (this.mental?.chin || 75) / 400; // 0.9 - 1.15 range
      baseDamage *= chinMod;
    }

    return Math.round(baseDamage);
  }

  /**
   * Calculate maximum stamina based on cardio and modifiers
   */
  calculateMaxStamina() {
    // Base from cardio: 80 + (cardio * 0.4) = 80-120
    let maxStamina = 80 + (this.stamina.cardio * 0.4);

    // Weight modifier (heavier = slightly lower)
    const weightMod = 1 - (this.physical.weight - 70) * 0.002;
    maxStamina *= weightMod;

    // Age modifier
    const ageMod = this.getAgeStaminaModifier();
    maxStamina *= ageMod;

    // Body type modifier
    const bodyMods = {
      lean: 1.05,
      average: 1.0,
      muscular: 0.97,
      stocky: 0.98,
      lanky: 1.02
    };
    maxStamina *= bodyMods[this.physical.bodyType] || 1.0;

    return maxStamina;
  }

  /**
   * Get age-based stamina modifier
   */
  getAgeStaminaModifier() {
    const age = this.physical.age;
    if (age <= 24) return 1.0;
    if (age <= 28) return 1.0;
    if (age <= 32) return 0.97;
    if (age <= 35) return 0.92;
    if (age <= 38) return 0.85;
    return 0.78;
  }

  /**
   * Calculate derived statistics
   */
  calculateDerivedStats() {
    // Effective reach based on height and stance
    this.effectiveReach = this.physical.reach;

    // Optimal fighting range
    this.optimalRange = this.calculateOptimalRange();

    // Overall ratings for quick reference
    this.overallPower = (this.power.powerLeft + this.power.powerRight) / 2;
    this.overallSpeed = (
      this.speed.handSpeed +
      this.speed.footSpeed +
      this.speed.reflexes
    ) / 3;
    this.overallDefense = (
      this.defense.headMovement +
      this.defense.blocking +
      this.defense.ringAwareness
    ) / 3;

    // Punch output potential
    this.punchOutput = (
      this.stamina.workRate *
      this.stamina.cardio *
      this.speed.combinationSpeed
    ) / 10000 * 100;

    // Defensive efficiency
    this.defensiveEfficiency = (
      this.defense.headMovement +
      this.defense.blocking +
      this.technical.footwork
    ) / 3;

    // Ring control ability
    this.ringControl = (
      this.technical.ringGeneralship +
      this.technical.footwork +
      this.technical.distanceManagement
    ) / 3;
  }

  /**
   * Calculate optimal fighting range
   */
  calculateOptimalRange() {
    // Base on reach
    let range = this.physical.reach / 45; // ~4 feet for 180cm reach

    // Style adjustments
    const styleRangeMods = {
      'out-boxer': 0.3,
      'swarmer': -0.5,
      'slugger': 0,
      'boxer-puncher': 0.1,
      'counter-puncher': 0.2,
      'inside-fighter': -0.6,
      'volume-puncher': 0,
      'switch-hitter': 0.1
    };

    range += styleRangeMods[this.style.primary] || 0;

    // Clamp to reasonable range
    return Math.max(2.5, Math.min(6, range));
  }

  /**
   * Reset state for new round
   */
  resetForRound() {
    this.state = FighterState.NEUTRAL;
    this.subState = null;
    this.stateTimer = 0;
    this.knockdownsThisRound = 0;
    this.isHurt = false;
    this.hurtDuration = 0;

    // Archive round stats
    this.fightStats.roundHistory.push({ ...this.roundStats });

    // Reset round stats
    this.roundStats = this.initRoundStats();
  }

  /**
   * Apply between-round recovery
   */
  applyBetweenRoundRecovery() {
    // Stamina recovery
    const baseRecovery = this.maxStamina * (this.stamina.recoveryRate / 100) * 0.4;
    const cornerBonus = (this.corner.headTrainer.strategySkill / 100) * 0.1;
    const bodyPenalty = 1 - (this.bodyDamage / 200);
    const ageMod = this.getAgeRecoveryModifier();

    let recovery = baseRecovery * (1 + cornerBonus) * bodyPenalty * ageMod;
    recovery = Math.min(recovery, this.maxStamina * 0.5);

    this.currentStamina = Math.min(this.maxStamina, this.currentStamina + recovery);

    // Minimal damage recovery
    this.headDamage *= 0.9; // 10% recovery
    this.bodyDamage *= 0.95; // 5% recovery

    // Update stamina tier
    this.updateStaminaTier();
  }

  /**
   * Get age-based recovery modifier
   */
  getAgeRecoveryModifier() {
    const age = this.physical.age;
    if (age <= 25) return 1.0;
    if (age <= 30) return 0.95;
    if (age <= 35) return 0.85;
    return 0.75;
  }

  /**
   * Update stamina tier based on current percentage
   */
  updateStaminaTier() {
    const percent = this.currentStamina / this.maxStamina;

    if (percent >= 0.8) {
      this.staminaTier = 'fresh';
    } else if (percent >= 0.6) {
      this.staminaTier = 'good';
    } else if (percent >= 0.4) {
      this.staminaTier = 'tired';
    } else if (percent >= 0.25) {
      this.staminaTier = 'exhausted';
    } else {
      this.staminaTier = 'gassed';
    }
  }

  /**
   * Spend stamina for an action
   */
  spendStamina(amount) {
    this.currentStamina = Math.max(0, this.currentStamina - amount);
    this.updateStaminaTier();
  }

  /**
   * Recover stamina passively
   */
  recoverStamina(amount) {
    this.currentStamina = Math.min(this.maxStamina, this.currentStamina + amount);
    this.updateStaminaTier();
  }

  /**
   * Apply damage to fighter
   */
  takeDamage(amount, location = 'head') {
    if (location === 'head') {
      this.headDamage = Math.min(this.maxHeadDamage, this.headDamage + amount);
    } else {
      this.bodyDamage = Math.min(this.maxBodyDamage, this.bodyDamage + amount);
      // Body shots also drain stamina
      this.spendStamina(amount * 0.5);
    }
  }

  /**
   * Add a buff
   */
  addBuff(buff) {
    // Remove any existing buff of same type
    this.activeBuffs = this.activeBuffs.filter(b => b.type !== buff.type);
    this.activeBuffs.push({
      ...buff,
      startTime: Date.now()
    });
  }

  /**
   * Add a debuff
   */
  addDebuff(debuff) {
    this.activeDebuffs.push({
      ...debuff,
      startTime: Date.now()
    });
  }

  /**
   * Add a cut
   */
  addCut(location, severity) {
    this.cuts.push({
      location,
      severity,
      bleeding: true,
      treated: false
    });
    this.addDebuff({
      type: 'cut',
      location,
      severity,
      effects: {
        vision: location.includes('eye') ? -severity * 5 : 0
      }
    });
  }

  /**
   * Add swelling
   */
  addSwelling(location, severity) {
    this.swelling.push({
      location,
      severity,
      treated: false
    });
    this.addDebuff({
      type: 'swelling',
      location,
      severity,
      effects: {
        vision: location.includes('eye') ? -severity * 8 : 0
      }
    });
  }

  /**
   * Set fighter to hurt state
   */
  setHurt(duration) {
    this.state = FighterState.HURT;
    this.isHurt = true;
    this.hurtDuration = duration;
    // Clear buzzed if transitioning to hurt
    this.isBuzzed = false;
    this.buzzedDuration = 0;
    this.addDebuff({
      type: 'hurt',
      duration,
      effects: {
        speed: -25,
        power: -15,
        defense: -30
      }
    });
  }

  /**
   * Set fighter to buzzed state
   * Buzzed fighters are forced defensive and vulnerable to knockdown
   * Duration: 5-20 seconds, compounds when hit hard while already buzzed
   * @param {number} damage - Damage that caused the buzzed state
   * @param {string} punchType - Type of punch that caused it
   */
  setBuzzed(damage, punchType) {
    // Don't buzz if already hurt or knocked down
    if (this.isHurt || this.state === FighterState.KNOCKED_DOWN) return;

    // Calculate severity (1-3) based on damage
    const severity = damage >= 5 ? 3 : (damage >= 3.5 ? 2 : 1);

    // Calculate base duration: 10-40 ticks (5-20 seconds at 0.5s/tick)
    // Higher chin = shorter duration
    const chinMod = 1 - (this.mental.chin / 200); // 0.5 - 1.0 range for worse chins
    let duration = Math.round((10 + severity * 8) * (0.6 + chinMod * 0.6));

    // Power punches cause longer buzz
    const powerPunches = ['cross', 'rear_hook', 'rear_uppercut', 'lead_hook', 'lead_uppercut'];
    if (powerPunches.includes(punchType)) {
      duration = Math.round(duration * 1.4);
    }

    // Accumulated damage increases duration significantly
    const damagePercent = this.headDamage / this.maxHeadDamage;
    if (damagePercent > 0.6) {
      duration = Math.round(duration * (1.3 + (damagePercent - 0.6)));
    } else if (damagePercent > 0.3) {
      duration = Math.round(duration * (1 + (damagePercent - 0.3) * 0.5));
    }

    // Clamp duration: 10-40 ticks (5-20 seconds)
    duration = Math.max(10, Math.min(40, duration));

    // Calculate dynamic recovery rate based on attributes
    // Higher cardio/chin = faster recovery
    this.buzzedRecoveryRate = 0.7 + (this.mental.chin / 300) + (this.stamina.cardio / 600);

    // Low stamina slows recovery significantly
    const staminaPercent = this.currentStamina / this.maxStamina;
    if (staminaPercent < 0.3) {
      this.buzzedRecoveryRate *= 0.5;
    } else if (staminaPercent < 0.5) {
      this.buzzedRecoveryRate *= 0.7;
    }

    // COMPOUNDING: If already buzzed, getting hit hard makes it worse
    if (this.isBuzzed) {
      // Each hit while buzzed extends duration significantly
      const extensionAmount = Math.round(duration * 0.75); // Add 75% of new duration
      this.buzzedDuration = Math.min(this.buzzedDuration + extensionAmount, 40);

      // Increase severity if hit hard while already buzzed
      if (severity >= this.buzzedSeverity) {
        this.buzzedSeverity = Math.min(3, this.buzzedSeverity + 1);
      }

      // Each compounding hit slows recovery
      this.buzzedRecoveryRate *= 0.85;

      // Update debuff to match new severity
      this.activeDebuffs = this.activeDebuffs.filter(d => d.type !== 'buzzed');
      this.addDebuff({
        type: 'buzzed',
        duration: this.buzzedDuration,
        effects: {
          speed: -10 * this.buzzedSeverity,
          power: -5 * this.buzzedSeverity,
          defense: -12 * this.buzzedSeverity,
          accuracy: -10 * this.buzzedSeverity
        }
      });
    } else {
      // Fresh buzzed state
      this.isBuzzed = true;
      this.buzzedDuration = duration;
      this.buzzedSeverity = severity;
      this.state = FighterState.BUZZED;
      this.subState = DefensiveSubState.HIGH_GUARD; // Forced defensive

      // Add buzzed debuff
      this.addDebuff({
        type: 'buzzed',
        duration,
        effects: {
          speed: -10 * severity,
          power: -5 * severity,
          defense: -12 * severity,
          accuracy: -10 * severity
        }
      });
    }
  }

  /**
   * Update buzzed state (called each tick)
   */
  updateBuzzed() {
    if (this.isBuzzed && this.buzzedDuration > 0) {
      // Apply dynamic recovery rate
      this.buzzedDuration -= this.buzzedRecoveryRate;

      // Chance to shake it off early if good chin and composure
      if (this.buzzedDuration > 2) {
        const shakeOffChance = (this.mental.chin + this.mental.composure) / 800;
        if (Math.random() < shakeOffChance) {
          this.buzzedDuration = Math.max(1, this.buzzedDuration - 2);
        }
      }

      if (this.buzzedDuration <= 0) {
        this.clearBuzzed();
      }
    }
  }

  /**
   * Clear buzzed state
   */
  clearBuzzed() {
    this.isBuzzed = false;
    this.buzzedDuration = 0;
    this.buzzedSeverity = 0;
    this.buzzedRecoveryRate = 1;

    // Remove buzzed debuff
    this.activeDebuffs = this.activeDebuffs.filter(d => d.type !== 'buzzed');

    // Return to neutral if still in buzzed state
    if (this.state === FighterState.BUZZED) {
      this.state = FighterState.NEUTRAL;
      this.subState = null;
    }
  }

  /**
   * Get buzzed vulnerability multiplier
   * Buzzed fighters are more susceptible to knockdowns
   */
  getBuzzedVulnerability() {
    if (!this.isBuzzed) return 1.0;
    // Severity 1: 1.25x, Severity 2: 1.5x, Severity 3: 1.75x
    return 1 + (this.buzzedSeverity * 0.25);
  }

  /**
   * Check if fighter is vulnerable to knockdown (buzzed or hurt)
   */
  isVulnerableToKnockdown() {
    return this.isBuzzed || this.isHurt || this.stunLevel >= 2;
  }

  /**
   * Get total vulnerability multiplier (combines all vulnerability states)
   */
  getTotalVulnerability() {
    let multiplier = 1.0;
    if (this.isBuzzed) multiplier *= this.getBuzzedVulnerability();
    if (this.isStunned) multiplier *= this.getStunVulnerability();
    if (this.isHurt) multiplier *= 1.4; // Hurt fighters very vulnerable
    return multiplier;
  }

  /**
   * Apply stun from a significant hit
   * Stun prevents effective offense and increases vulnerability
   * @param {number} damage - Damage that caused the stun
   * @param {string} punchType - Type of punch that caused stun
   */
  applyStun(damage, punchType) {
    // Calculate stun duration based on damage and chin
    // With new damage scale (1-6 typical), adjust thresholds
    // Base: 1-4 ticks (0.5-2 seconds)
    const chinMod = 1 - (this.mental.chin / 200); // 0.5 - 0.85 range
    let duration = Math.ceil(damage / 2.5) * chinMod;

    // Power punches cause longer stun
    const powerPunches = ['cross', 'rear_hook', 'rear_uppercut', 'body_hook_rear'];
    if (powerPunches.includes(punchType)) {
      duration *= 1.3;
    }

    // Clamp duration
    duration = Math.max(1, Math.min(5, Math.round(duration)));

    // Determine stun level based on damage (with new scale)
    const stunLevel = damage >= 5 ? 2 : 1;

    // Only apply if stronger than current stun
    if (!this.isStunned || stunLevel > this.stunLevel || duration > this.stunDuration) {
      this.isStunned = true;
      this.stunDuration = duration;
      this.stunLevel = stunLevel;
    }
  }

  /**
   * Update stun state (called each tick)
   * @param {number} tickRate - Seconds per tick
   */
  updateStun(tickRate) {
    if (this.isStunned && this.stunDuration > 0) {
      this.stunDuration -= 1;

      if (this.stunDuration <= 0) {
        this.isStunned = false;
        this.stunLevel = 0;
      }
    }

    // Also update hurt duration
    if (this.isHurt && this.hurtDuration > 0) {
      this.hurtDuration -= tickRate;

      if (this.hurtDuration <= 0) {
        this.isHurt = false;
        this.hurtDuration = 0;
        // Remove hurt debuff
        this.activeDebuffs = this.activeDebuffs.filter(d => d.type !== 'hurt');
      }
    }
  }

  /**
   * Check if fighter can throw punches effectively
   * Stunned fighters have reduced or no offensive capability
   */
  canThrowPunch() {
    if (this.isStunned) {
      // Heavy stun: can't throw at all
      if (this.stunLevel >= 2) return false;
      // Light stun: 30% chance to throw
      if (Math.random() > 0.3) return false;
    }
    return true;
  }

  /**
   * Get stun vulnerability multiplier
   * Stunned fighters take more damage from follow-up shots
   */
  getStunVulnerability() {
    if (!this.isStunned) return 1.0;
    // Light stun: 15% more damage, Heavy stun: 30% more damage
    return this.stunLevel >= 2 ? 1.30 : 1.15;
  }

  /**
   * Transition to a new state
   */
  transitionTo(newState, subState = null) {
    this.state = newState;
    this.subState = subState;
    this.stateTimer = 0;
  }

  /**
   * Update modified attributes based on buffs/debuffs
   */
  updateModifiedAttributes() {
    // Start with base attributes
    this.modifiedAttributes = {
      power: { ...this.power },
      speed: { ...this.speed },
      defense: { ...this.defense },
      offense: { ...this.offense },
      technical: { ...this.technical },
      mental: { ...this.mental }
    };

    // Apply fatigue penalties
    this.applyFatiguePenalties();

    // Apply buff effects
    for (const buff of this.activeBuffs) {
      this.applyBuffEffects(buff);
    }

    // Apply debuff effects
    for (const debuff of this.activeDebuffs) {
      this.applyDebuffEffects(debuff);
    }
  }

  /**
   * Apply fatigue penalties to modified attributes
   * Heart reduces fatigue penalties - elite heart fighters push through exhaustion
   * Holyfield (98 heart) 'gassed' performs like average fighter 'exhausted'
   */
  applyFatiguePenalties() {
    const basePenalties = {
      fresh: {},
      good: { power: -3, speed: -2 },
      tired: { power: -8, speed: -5, accuracy: -5, defense: -5 },
      exhausted: { power: -15, speed: -12, accuracy: -10, defense: -15 },
      gassed: { power: -30, speed: -25, accuracy: -20, defense: -30, chin: -15 }
    };

    const rawPenalties = basePenalties[this.staminaTier] || {};

    // Heart reduces fatigue penalties significantly
    // Elite heart (98) reduces penalties by ~37%
    // Average heart (70) = no change
    // Poor heart (50) = 27% worse penalties
    const heart = this.mental?.heart || 70;
    const heartFactor = 1 - (heart - 70) / 75;

    // Apply heart-adjusted penalties
    const tierPenalties = {};
    for (const [attr, penalty] of Object.entries(rawPenalties)) {
      tierPenalties[attr] = Math.round(penalty * heartFactor);
    }

    for (const [attr, penalty] of Object.entries(tierPenalties)) {
      // Apply to relevant attribute groups
      if (attr === 'power') {
        this.modifiedAttributes.power.powerLeft *= (1 + penalty / 100);
        this.modifiedAttributes.power.powerRight *= (1 + penalty / 100);
      } else if (attr === 'speed') {
        this.modifiedAttributes.speed.handSpeed *= (1 + penalty / 100);
        this.modifiedAttributes.speed.footSpeed *= (1 + penalty / 100);
      } else if (attr === 'accuracy') {
        this.modifiedAttributes.offense.jabAccuracy *= (1 + penalty / 100);
        this.modifiedAttributes.offense.powerAccuracy *= (1 + penalty / 100);
      } else if (attr === 'defense') {
        this.modifiedAttributes.defense.headMovement *= (1 + penalty / 100);
        this.modifiedAttributes.defense.blocking *= (1 + penalty / 100);
      } else if (attr === 'chin') {
        this.modifiedAttributes.mental.chin *= (1 + penalty / 100);
      }
    }

    // Apply zero stamina vulnerability - additional chin penalty when completely exhausted
    // This makes fighters at/near zero stamina extremely vulnerable to knockouts
    const staminaPercent = this.getStaminaPercent();
    if (staminaPercent <= 0.10) {
      // Calculate severity: 0 at 10%, 1 at 0%
      const severityFactor = 1 - (staminaPercent / 0.10);
      // Up to -30 chin at 0% stamina
      const zeroStaminaChinPenalty = -30 * severityFactor;
      this.modifiedAttributes.mental.chin *= (1 + zeroStaminaChinPenalty / 100);
    }
  }

  /**
   * Apply buff effects to modified attributes
   */
  applyBuffEffects(buff) {
    if (!buff.effects) return;

    for (const [attr, modifier] of Object.entries(buff.effects)) {
      this.applyModifier(attr, modifier);
    }
  }

  /**
   * Apply debuff effects to modified attributes
   */
  applyDebuffEffects(debuff) {
    if (!debuff.effects) return;

    for (const [attr, modifier] of Object.entries(debuff.effects)) {
      this.applyModifier(attr, modifier);
    }
  }

  /**
   * Apply a modifier to an attribute
   */
  applyModifier(attr, modifier) {
    // Handle common shorthand attributes
    const mappings = {
      speed: ['speed.handSpeed', 'speed.footSpeed'],
      power: ['power.powerLeft', 'power.powerRight'],
      defense: ['defense.headMovement', 'defense.blocking'],
      accuracy: ['offense.jabAccuracy', 'offense.powerAccuracy'],
      vision: ['offense.jabAccuracy', 'offense.powerAccuracy', 'defense.headMovement']
    };

    const paths = mappings[attr] || [attr];

    for (const path of paths) {
      const [group, key] = path.split('.');
      if (this.modifiedAttributes[group] && this.modifiedAttributes[group][key]) {
        this.modifiedAttributes[group][key] *= (1 + modifier / 100);
      }
    }
  }

  /**
   * Get display name (with nickname if available)
   */
  getDisplayName() {
    if (this.nickname) {
      return `${this.name.split(' ')[0]} "${this.nickname}" ${this.name.split(' ').slice(1).join(' ')}`;
    }
    return this.name;
  }

  /**
   * Get short name for display
   */
  getShortName() {
    const parts = this.name.split(' ');
    if (parts.length > 1) {
      return parts[parts.length - 1]; // Last name
    }
    return this.name;
  }

  /**
   * Get current stamina percentage
   */
  getStaminaPercent() {
    return this.currentStamina / this.maxStamina;
  }

  /**
   * Get current head damage percentage
   */
  getHeadDamagePercent() {
    return this.headDamage / this.maxHeadDamage;
  }

  /**
   * Get current body damage percentage
   */
  getBodyDamagePercent() {
    return this.bodyDamage / this.maxBodyDamage;
  }

  /**
   * Check if fighter is in critical condition
   */
  isCritical() {
    return (
      this.getHeadDamagePercent() > 0.8 ||
      this.getStaminaPercent() < 0.2 ||
      this.isHurt
    );
  }

  /**
   * Serialize fighter to plain object (for saving)
   */
  toJSON() {
    return {
      identity: {
        name: this.name,
        nickname: this.nickname,
        nationality: this.nationality,
        hometown: this.hometown
      },
      physical: this.physical,
      style: this.style,
      power: this.power,
      speed: this.speed,
      stamina: this.stamina,
      defense: this.defense,
      offense: this.offense,
      technical: this.technical,
      mental: this.mental,
      corner: this.corner,
      record: this.record
    };
  }

  /**
   * Create fighter from config file data
   */
  static fromConfig(config) {
    return new Fighter(config);
  }
}

export default Fighter;
