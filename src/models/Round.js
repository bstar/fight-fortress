/**
 * Round Model
 * Represents a single round of boxing with statistics and events
 */

export class Round {
  constructor(roundNumber, duration = 180) {
    this.number = roundNumber;
    this.duration = duration; // seconds
    this.currentTime = 0;
    this.isComplete = false;
    this.stoppageTime = null;
    this.stoppageReason = null;

    // Initialize statistics for both fighters
    this.stats = {
      A: this.initFighterStats(),
      B: this.initFighterStats()
    };

    // Events that occurred during the round
    this.events = [];

    // Scoring
    this.scores = null; // Set after round ends

    // Knockdowns
    this.knockdowns = {
      A: [],
      B: []
    };
  }

  /**
   * Initialize per-fighter round statistics
   */
  initFighterStats() {
    return {
      // Punches
      punchesThrown: 0,
      punchesLanded: 0,
      jabsThrown: 0,
      jabsLanded: 0,
      powerPunchesThrown: 0,
      powerPunchesLanded: 0,
      bodyPunchesThrown: 0,
      bodyPunchesLanded: 0,
      headPunchesThrown: 0,
      headPunchesLanded: 0,

      // Quality
      cleanPunchesLanded: 0,
      partialPunchesLanded: 0,
      punchesBlocked: 0,
      punchesMissed: 0,
      punchesEvaded: 0,

      // Damage
      damageDealt: 0,
      damageReceived: 0,
      significantStrikesLanded: 0,

      // Defense
      evasions: {
        slips: 0,
        ducks: 0,
        leans: 0,
        footwork: 0
      },
      blocks: {
        highGuard: 0,
        shell: 0,
        arm: 0
      },

      // Activity
      timeInStates: {},
      forwardMovementTime: 0,
      backwardMovementTime: 0,
      clinchesInitiated: 0,
      clinchTime: 0,

      // Position
      centerControlTime: 0,
      ropeTime: 0,
      cornerTime: 0,
      optimalRangeTime: 0,

      // Combinations
      combinationsThrown: 0,
      combinationsCompleted: 0,
      longestCombo: 0
    };
  }

  /**
   * Record a punch thrown
   */
  recordPunchThrown(fighterId, punchType, isBody = false) {
    const stats = this.stats[fighterId];
    stats.punchesThrown++;

    // Categorize punch
    if (punchType === 'jab' || punchType === 'body_jab') {
      stats.jabsThrown++;
    } else {
      stats.powerPunchesThrown++;
    }

    if (isBody) {
      stats.bodyPunchesThrown++;
    } else {
      stats.headPunchesThrown++;
    }
  }

  /**
   * Record a punch landed
   */
  recordPunchLanded(fighterId, punchType, quality, damage, isBody = false) {
    const stats = this.stats[fighterId];
    stats.punchesLanded++;

    // Categorize punch
    if (punchType === 'jab' || punchType === 'body_jab') {
      stats.jabsLanded++;
    } else {
      stats.powerPunchesLanded++;
    }

    if (isBody) {
      stats.bodyPunchesLanded++;
    } else {
      stats.headPunchesLanded++;
    }

    // Quality
    if (quality === 'clean') {
      stats.cleanPunchesLanded++;
    } else if (quality === 'partial') {
      stats.partialPunchesLanded++;
    }

    // Damage
    stats.damageDealt += damage;

    // Significant strike (damage > 15)
    if (damage > 15) {
      stats.significantStrikesLanded++;
    }

    // Update opponent's damage received
    const opponentId = fighterId === 'A' ? 'B' : 'A';
    this.stats[opponentId].damageReceived += damage;
  }

  /**
   * Record a punch blocked
   */
  recordPunchBlocked(fighterId, blockType) {
    const stats = this.stats[fighterId];
    stats.punchesBlocked++;

    if (stats.blocks[blockType] !== undefined) {
      stats.blocks[blockType]++;
    }
  }

  /**
   * Record a punch evaded
   */
  recordPunchEvaded(fighterId, evasionType) {
    const stats = this.stats[fighterId];
    stats.punchesEvaded++;

    if (stats.evasions[evasionType] !== undefined) {
      stats.evasions[evasionType]++;
    }
  }

  /**
   * Record a punch missed (no block or evasion, just missed)
   */
  recordPunchMissed(fighterId) {
    const opponentId = fighterId === 'A' ? 'B' : 'A';
    this.stats[opponentId].punchesMissed++;
  }

  /**
   * Record a knockdown
   */
  recordKnockdown(fighterId, punchType, recoveryCount) {
    this.knockdowns[fighterId].push({
      time: this.currentTime,
      punch: punchType,
      recoveryCount
    });

    this.addEvent({
      type: 'KNOCKDOWN',
      fighter: fighterId,
      time: this.currentTime,
      punch: punchType,
      recoveryCount
    });
  }

  /**
   * Record time in a state
   */
  recordStateTime(fighterId, state, duration) {
    const stats = this.stats[fighterId];
    if (!stats.timeInStates[state]) {
      stats.timeInStates[state] = 0;
    }
    stats.timeInStates[state] += duration;
  }

  /**
   * Record clinch
   */
  recordClinch(initiatorId, duration) {
    this.stats[initiatorId].clinchesInitiated++;
    this.stats.A.clinchTime += duration;
    this.stats.B.clinchTime += duration;
  }

  /**
   * Record combination
   */
  recordCombination(fighterId, punchCount, completed) {
    const stats = this.stats[fighterId];
    stats.combinationsThrown++;

    if (completed) {
      stats.combinationsCompleted++;
    }

    if (punchCount > stats.longestCombo) {
      stats.longestCombo = punchCount;
    }
  }

  /**
   * Add an event to the round
   */
  addEvent(event) {
    this.events.push({
      ...event,
      timestamp: this.currentTime
    });
  }

  /**
   * Update the current time
   */
  tick(deltaTime) {
    this.currentTime += deltaTime;

    if (this.currentTime >= this.duration && !this.stoppageTime) {
      this.complete();
    }
  }

  /**
   * Complete the round
   */
  complete() {
    this.isComplete = true;
    this.addEvent({
      type: 'ROUND_END',
      round: this.number,
      time: this.currentTime
    });
  }

  /**
   * Stop the round early (KO, TKO, etc.)
   */
  stop(reason, time = null) {
    this.isComplete = true;
    this.stoppageTime = time || this.currentTime;
    this.stoppageReason = reason;

    this.addEvent({
      type: 'ROUND_STOPPED',
      round: this.number,
      reason,
      time: this.stoppageTime
    });
  }

  /**
   * Set round scores
   */
  setScores(judgeScores) {
    this.scores = judgeScores;
  }

  /**
   * Get accuracy percentage for a fighter
   */
  getAccuracy(fighterId) {
    const stats = this.stats[fighterId];
    if (stats.punchesThrown === 0) return 0;
    return stats.punchesLanded / stats.punchesThrown;
  }

  /**
   * Get jab accuracy for a fighter
   */
  getJabAccuracy(fighterId) {
    const stats = this.stats[fighterId];
    if (stats.jabsThrown === 0) return 0;
    return stats.jabsLanded / stats.jabsThrown;
  }

  /**
   * Get power punch accuracy for a fighter
   */
  getPowerAccuracy(fighterId) {
    const stats = this.stats[fighterId];
    if (stats.powerPunchesThrown === 0) return 0;
    return stats.powerPunchesLanded / stats.powerPunchesThrown;
  }

  /**
   * Get the probable round winner based on stats
   */
  getStatsWinner() {
    const scoreA = this.calculateRoundScore('A');
    const scoreB = this.calculateRoundScore('B');

    if (Math.abs(scoreA - scoreB) < 5) {
      return { winner: null, margin: Math.abs(scoreA - scoreB) };
    }

    return {
      winner: scoreA > scoreB ? 'A' : 'B',
      margin: Math.abs(scoreA - scoreB)
    };
  }

  /**
   * Calculate a score metric for a fighter
   */
  calculateRoundScore(fighterId) {
    const stats = this.stats[fighterId];
    let score = 0;

    // Clean punches (most valuable)
    score += stats.cleanPunchesLanded * 3;

    // Other landed punches
    score += (stats.punchesLanded - stats.cleanPunchesLanded) * 1.5;

    // Power punch bonus
    score += stats.powerPunchesLanded * 1;

    // Damage dealt
    score += stats.damageDealt * 0.5;

    // Knockdowns (big bonus)
    score += this.knockdowns[fighterId].length * 25;

    // Defense (small bonus)
    const opponentId = fighterId === 'A' ? 'B' : 'A';
    const punchesFaced = this.stats[opponentId].punchesThrown;
    if (punchesFaced > 0) {
      const defenseRate = (stats.punchesBlocked + stats.punchesEvaded) / punchesFaced;
      score += defenseRate * 10;
    }

    return score;
  }

  /**
   * Get round summary for display
   */
  getSummary() {
    return {
      round: this.number,
      duration: this.stoppageTime || this.duration,
      isComplete: this.isComplete,
      stoppageReason: this.stoppageReason,

      stats: {
        A: {
          punchesThrown: this.stats.A.punchesThrown,
          punchesLanded: this.stats.A.punchesLanded,
          accuracy: this.getAccuracy('A'),
          powerPunches: {
            thrown: this.stats.A.powerPunchesThrown,
            landed: this.stats.A.powerPunchesLanded
          },
          knockdowns: this.knockdowns.A.length
        },
        B: {
          punchesThrown: this.stats.B.punchesThrown,
          punchesLanded: this.stats.B.punchesLanded,
          accuracy: this.getAccuracy('B'),
          powerPunches: {
            thrown: this.stats.B.powerPunchesThrown,
            landed: this.stats.B.powerPunchesLanded
          },
          knockdowns: this.knockdowns.B.length
        }
      },

      scores: this.scores,
      knockdowns: this.knockdowns,
      keyEvents: this.getKeyEvents()
    };
  }

  /**
   * Get key events from the round
   */
  getKeyEvents() {
    return this.events.filter(e =>
      ['KNOCKDOWN', 'HURT', 'CUT', 'SIGNIFICANT_PUNCH'].includes(e.type)
    );
  }

  /**
   * Format time as MM:SS
   */
  formatTime(seconds = null) {
    const time = seconds !== null ? seconds : this.currentTime;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export default Round;
