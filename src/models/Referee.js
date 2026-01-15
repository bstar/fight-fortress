/**
 * Referee Model
 * Controls the flow of the fight - separates clinches, watches for fouls,
 * stops fights when a fighter can't defend themselves
 */

export class Referee {
  constructor(config = {}) {
    this.name = config.name || 'Mills Lane';

    // Referee attributes (0-100)
    this.attributes = {
      experience: config.experience || 75,      // How well they read the fight
      attentiveness: config.attentiveness || 80, // How closely they watch action
      fairness: config.fairness || 85,          // Consistency in calls
      positioning: config.positioning || 75,    // Always in right spot to see
      commandPresence: config.commandPresence || 80  // Fighters respect commands
    };

    // Tendencies affect how the ref manages the fight
    this.tendencies = {
      // Clinch management (1-10 scale, higher = more tolerance)
      clinchTolerance: config.clinchTolerance || 3,  // How long before breaking
      clinchBreakSpeed: config.clinchBreakSpeed || 1.0, // How fast they separate

      // Stoppage tendencies (0-1 scale)
      stoppageThreshold: config.stoppageThreshold || 0.6, // When to stop fight
      protectiveness: config.protectiveness || 0.5, // How protective of hurt fighters

      // Count tendencies
      countSpeed: config.countSpeed || 1.0,  // Speed of knockdown count (1.0 = normal)
      longCount: config.longCount || false,  // Tends to give long counts

      // Foul enforcement
      foulStrictness: config.foulStrictness || 0.5, // 0 = lenient, 1 = strict
      warningFirst: config.warningFirst !== false,  // Usually warns before deducting

      // Pace management
      keepsFightMoving: config.keepsFightMoving || 0.7 // How actively manages pace
    };

    // Rules for this fight
    this.rules = {
      standingEightCount: config.rules?.standingEightCount || false,
      mandatoryEightCount: config.rules?.mandatoryEightCount || true,
      threeKnockdownRule: config.rules?.threeKnockdownRule || false,
      maxClinchDuration: config.rules?.maxClinchDuration || 3.0  // seconds
    };

    // Runtime state
    this.clinchStartTime = null;
    this.clinchWarningIssued = false;
    this.commandQueue = [];
  }

  /**
   * Check if referee should break up a clinch
   * @param {number} clinchDuration - How long the clinch has lasted
   * @param {Object} fighterA - First fighter
   * @param {Object} fighterB - Second fighter
   * @returns {Object} - { shouldBreak, command, delay }
   */
  checkClinchBreak(clinchDuration, fighterA, fighterB) {
    // Base break time based on tolerance
    const baseBreakTime = this.tendencies.clinchTolerance * 0.5; // 0.5-5 seconds

    // Adjust based on situation
    let breakTime = baseBreakTime;

    // If one fighter is hurt, break quicker to protect them
    if (fighterA.isHurt || fighterB.isHurt) {
      breakTime *= 0.5;
    }

    // If both are tired, might let them rest slightly longer
    const avgStamina = (fighterA.getStaminaPercent() + fighterB.getStaminaPercent()) / 2;
    if (avgStamina < 0.3) {
      breakTime *= 0.8; // But not too long
    }

    // Experience affects timing precision
    const experienceMod = 0.8 + (this.attributes.experience / 100) * 0.4;
    breakTime *= experienceMod;

    // Random variation (+/- 20%)
    breakTime *= 0.8 + Math.random() * 0.4;

    if (clinchDuration >= breakTime) {
      // Issue warning first time, then break
      if (!this.clinchWarningIssued && clinchDuration < breakTime + 1.0) {
        this.clinchWarningIssued = true;
        return {
          shouldBreak: false,
          command: 'WORK',  // "Let's work!" or "Break it up!"
          delay: 0.5
        };
      }

      return {
        shouldBreak: true,
        command: 'BREAK',
        delay: 0.3 / this.tendencies.clinchBreakSpeed
      };
    }

    return { shouldBreak: false, command: null, delay: 0 };
  }

  /**
   * Reset clinch tracking
   */
  resetClinch() {
    this.clinchStartTime = null;
    this.clinchWarningIssued = false;
  }

  /**
   * Check if referee should stop the fight
   * @param {Object} fighter - The fighter being evaluated
   * @param {Object} opponent - The opponent
   * @param {Object} situation - Current fight situation
   * @returns {Object} - { shouldStop, reason }
   */
  checkStoppage(fighter, opponent, situation) {
    // Never stop if fighter is winning
    if (situation.scoreDiff > 2) {
      return { shouldStop: false };
    }

    let stoppageScore = 0;
    const threshold = this.tendencies.stoppageThreshold;

    // Damage accumulation
    const headDamagePercent = fighter.getHeadDamagePercent();
    const bodyDamagePercent = fighter.getBodyDamagePercent();

    if (headDamagePercent > 0.8) stoppageScore += 0.4;
    else if (headDamagePercent > 0.6) stoppageScore += 0.2;

    if (bodyDamagePercent > 0.9) stoppageScore += 0.2;

    // Hurt state
    if (fighter.isHurt) {
      stoppageScore += 0.3;

      // How long have they been hurt?
      if (fighter.hurtDuration > 5) stoppageScore += 0.2;
      if (fighter.hurtDuration > 10) stoppageScore += 0.3;
    }

    // Multiple knockdowns
    if (fighter.knockdownsThisRound >= 2) stoppageScore += 0.3;
    if (fighter.knockdownsTotal >= 3) stoppageScore += 0.2;

    // Not fighting back / can't defend
    const recentPunchesLanded = fighter.roundStats?.punchesLanded || 0;
    const recentPunchesTaken = opponent.roundStats?.punchesLanded || 0;

    if (recentPunchesTaken > 20 && recentPunchesLanded < 5) {
      stoppageScore += 0.2; // One-sided beating
    }

    // Stamina depletion
    if (fighter.getStaminaPercent() < 0.1) {
      stoppageScore += 0.15;
    }

    // Protectiveness affects threshold
    const adjustedThreshold = threshold * (1 - this.tendencies.protectiveness * 0.3);

    if (stoppageScore >= adjustedThreshold) {
      return {
        shouldStop: true,
        reason: this.determineStoppageReason(fighter, stoppageScore)
      };
    }

    return { shouldStop: false };
  }

  /**
   * Determine the reason for stoppage
   */
  determineStoppageReason(fighter, score) {
    if (fighter.knockdownsThisRound >= 3) return 'three_knockdowns';
    if (fighter.isHurt && fighter.hurtDuration > 10) return 'not_defending';
    if (fighter.getHeadDamagePercent() > 0.85) return 'accumulated_damage';
    return 'referee_stoppage';
  }

  /**
   * Issue a command during the fight
   * @param {string} command - The command type
   * @returns {Object} - Command details for display
   */
  issueCommand(command) {
    const commands = {
      'BREAK': {
        text: 'BREAK!',
        variations: ['Break!', 'Break it up!', 'Step back!', 'Separate!']
      },
      'WORK': {
        text: 'WORK!',
        variations: ["Let's work!", "Work out of there!", "Keep it moving!", "Box!"]
      },
      'STOP': {
        text: 'STOP!',
        variations: ['Stop!', "That's it!", 'Stop the fight!']
      },
      'WARNING': {
        text: 'WARNING',
        variations: ['Watch it!', "I'm warning you!", 'Keep it clean!', 'No holding!']
      },
      'POINT': {
        text: 'POINT DEDUCTION',
        variations: ["I'm taking a point!", 'Point deducted!']
      },
      'TIME': {
        text: 'TIME',
        variations: ['Time!', 'Hold on!', 'Stop the clock!']
      },
      'BOX': {
        text: 'BOX',
        variations: ['Box!', 'Continue!', 'Fight!']
      }
    };

    const cmd = commands[command] || { text: command, variations: [command] };
    const variation = cmd.variations[Math.floor(Math.random() * cmd.variations.length)];

    return {
      type: command,
      text: variation,
      refName: this.name
    };
  }

  /**
   * Get referee's skill level (affects foul detection, etc.)
   */
  getSkill() {
    return (this.attributes.experience + this.attributes.attentiveness +
            this.attributes.fairness + this.attributes.positioning) / 4;
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      name: this.name,
      attributes: { ...this.attributes },
      tendencies: { ...this.tendencies },
      rules: { ...this.rules }
    };
  }

  /**
   * Create from config
   */
  static fromConfig(config) {
    return new Referee(config);
  }

  /**
   * Create a preset referee
   */
  static createPreset(type) {
    const presets = {
      'strict': {
        name: 'Mills Lane',
        experience: 90,
        attentiveness: 85,
        clinchTolerance: 2,
        foulStrictness: 0.8,
        stoppageThreshold: 0.5,
        keepsFightMoving: 0.9
      },
      'lenient': {
        name: 'Joe Cortez',
        experience: 85,
        attentiveness: 75,
        clinchTolerance: 5,
        foulStrictness: 0.3,
        stoppageThreshold: 0.7,
        protectiveness: 0.3
      },
      'protective': {
        name: 'Kenny Bayless',
        experience: 88,
        attentiveness: 90,
        clinchTolerance: 3,
        foulStrictness: 0.5,
        stoppageThreshold: 0.4,
        protectiveness: 0.8
      },
      'default': {
        name: 'Steve Smoger',
        experience: 80,
        attentiveness: 80,
        clinchTolerance: 3,
        foulStrictness: 0.5,
        stoppageThreshold: 0.6,
        protectiveness: 0.5
      }
    };

    return new Referee(presets[type] || presets['default']);
  }
}

export default Referee;
