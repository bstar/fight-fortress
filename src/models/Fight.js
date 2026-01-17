/**
 * Fight Model
 * Represents an entire boxing match with configuration, state, and results
 */

import { Round } from './Round.js';

// Fight status
export const FightStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  BETWEEN_ROUNDS: 'BETWEEN_ROUNDS',
  STOPPED: 'STOPPED',
  COMPLETED: 'COMPLETED'
};

// Stoppage types
export const StoppageType = {
  KO: 'KO',
  TKO_REFEREE: 'TKO_REFEREE',
  TKO_CORNER: 'TKO_CORNER',
  TKO_DOCTOR: 'TKO_DOCTOR',
  TKO_INJURY: 'TKO_INJURY',
  TKO_THREE_KNOCKDOWNS: 'TKO_THREE_KNOCKDOWNS',
  DECISION_UNANIMOUS: 'DECISION_UNANIMOUS',
  DECISION_SPLIT: 'DECISION_SPLIT',
  DECISION_MAJORITY: 'DECISION_MAJORITY',
  DRAW_UNANIMOUS: 'DRAW_UNANIMOUS',
  DRAW_SPLIT: 'DRAW_SPLIT',
  DRAW_MAJORITY: 'DRAW_MAJORITY',
  NO_CONTEST: 'NO_CONTEST',
  DISQUALIFICATION: 'DISQUALIFICATION'
};

export class Fight {
  constructor(fighterA, fighterB, config = {}) {
    // Fighters
    this.fighterA = fighterA;
    this.fighterB = fighterB;

    // Configuration
    this.config = {
      type: config.type || 'non_title',
      rounds: config.rounds || 10,
      roundDuration: config.roundDuration || 180,
      restDuration: config.restDuration || 60,

      rules: {
        knockdownRule: config.rules?.knockdownRule || 'none',
        standingEightCount: config.rules?.standingEightCount || false,
        mandatoryEightCount: config.rules?.mandatoryEightCount || true,
        saveByTheBell: config.rules?.saveByTheBell || {
          round1: false,
          otherRounds: true
        }
      },

      sanctioning: config.sanctioning || [],
      titleOnLine: config.titleOnLine || false,

      location: {
        venue: config.location?.venue || 'Arena',
        city: config.location?.city || 'City',
        country: config.location?.country || 'Country',
        homeFighter: config.location?.homeFighter || null
      },

      simulation: {
        tickRate: config.simulation?.tickRate || 0.5,
        speedMultiplier: config.simulation?.speedMultiplier || 1.0
      }
    };

    // Set home fighter advantage
    if (this.config.location.homeFighter === 'A') {
      this.fighterA.isHomeFighter = true;
    } else if (this.config.location.homeFighter === 'B') {
      this.fighterB.isHomeFighter = true;
    }

    // Officials
    this.referee = config.referee || this.createDefaultReferee();
    this.judges = config.judges || this.createDefaultJudges();

    // Fight state
    this.status = FightStatus.NOT_STARTED;
    this.currentRound = 0;
    this.rounds = [];

    // Timing
    this.totalTime = 0;
    this.roundTime = 0;
    this.restTime = 0;

    // Result
    this.result = null;

    // Events log
    this.events = [];

    // Scorecards
    this.scorecards = this.initScorecards();
  }

  /**
   * Create default referee
   */
  createDefaultReferee() {
    return {
      name: 'Referee',
      tendencies: {
        clinchTolerance: 4.0,
        stoppageThreshold: 0.6,
        warningFrequency: 0.5,
        countSpeed: 1.0
      },
      rules: {
        standingEightCount: this.config?.rules?.standingEightCount || false,
        mandatoryEightCount: this.config?.rules?.mandatoryEightCount || true,
        threeKnockdownRule: this.config?.rules?.knockdownRule === 'three_knockdowns'
      },
      protectiveness: 0.5
    };
  }

  /**
   * Create default judges
   */
  createDefaultJudges() {
    // Judges have subtle style preferences - creates variability in decisions
    // Not dramatic but allows for occasional split decisions
    return [
      {
        name: 'Judge 1',
        type: 'technical', // Favors clean boxing, defense
        preferences: {
          cleanPunching: 1.15,   // Rewards clean, accurate punching
          defense: 1.2,         // Values good defense
          effectiveAggression: 0.9,
          ringGeneralship: 1.1,
          powerShots: 1.0,
          volume: 0.85         // Less impressed by raw volume
        },
        knockdownWeight: 1.0,
        homeBias: 0,
        consistency: 88
      },
      {
        name: 'Judge 2',
        type: 'action', // Favors aggression, activity
        preferences: {
          cleanPunching: 0.95,
          defense: 0.85,
          effectiveAggression: 1.2,  // Rewards forward pressure
          ringGeneralship: 0.9,
          powerShots: 1.05,
          volume: 1.15              // Values activity
        },
        knockdownWeight: 1.0,
        homeBias: 0,
        consistency: 82
      },
      {
        name: 'Judge 3',
        type: 'power', // Favors damage and power shots
        preferences: {
          cleanPunching: 1.1,
          defense: 0.95,
          effectiveAggression: 1.0,
          ringGeneralship: 0.95,
          powerShots: 1.2,         // Values power punching
          volume: 1.0
        },
        knockdownWeight: 1.0,
        homeBias: 0,
        consistency: 85
      }
    ];
  }

  /**
   * Initialize scorecards
   */
  initScorecards() {
    return this.judges.map(judge => ({
      judge: judge.name,
      rounds: [],
      totalA: 0,
      totalB: 0
    }));
  }

  /**
   * Start the fight
   */
  start() {
    this.status = FightStatus.IN_PROGRESS;
    this.currentRound = 1;
    this.rounds.push(new Round(1, this.config.roundDuration));

    // Initialize fighters for fight
    this.fighterA.initializeRuntimeState();
    this.fighterB.initializeRuntimeState();

    this.addEvent({
      type: 'FIGHT_START',
      fighterA: this.fighterA.name,
      fighterB: this.fighterB.name
    });

    this.addEvent({
      type: 'ROUND_START',
      round: 1
    });
  }

  /**
   * Get current round
   */
  getCurrentRound() {
    if (this.rounds.length === 0) return null;
    return this.rounds[this.rounds.length - 1];
  }

  /**
   * End the current round
   */
  endRound() {
    const round = this.getCurrentRound();
    if (!round) return;

    round.complete();

    // Score the round
    this.scoreRound(round);

    this.addEvent({
      type: 'ROUND_END',
      round: this.currentRound,
      stats: round.getSummary()
    });

    // Check if fight should continue
    if (this.currentRound >= this.config.rounds) {
      this.endFightByDecision();
    } else {
      this.status = FightStatus.BETWEEN_ROUNDS;
      this.restTime = 0;
    }
  }

  /**
   * Start next round
   */
  startNextRound() {
    this.currentRound++;
    this.rounds.push(new Round(this.currentRound, this.config.roundDuration));
    this.roundTime = 0;
    this.status = FightStatus.IN_PROGRESS;

    // Reset fighters for new round
    this.fighterA.resetForRound();
    this.fighterB.resetForRound();

    // Apply between-round recovery
    this.fighterA.applyBetweenRoundRecovery();
    this.fighterB.applyBetweenRoundRecovery();

    this.addEvent({
      type: 'ROUND_START',
      round: this.currentRound
    });
  }

  /**
   * Score a round
   */
  scoreRound(round) {
    for (let i = 0; i < this.judges.length; i++) {
      const judge = this.judges[i];
      const score = this.calculateJudgeScore(judge, round);

      this.scorecards[i].rounds.push({
        round: round.number,
        scoreA: score.A,
        scoreB: score.B,
        margin: Math.abs(score.A - score.B)
      });

      this.scorecards[i].totalA += score.A;
      this.scorecards[i].totalB += score.B;
    }

    round.setScores(this.scorecards.map(sc => ({
      judge: sc.judge,
      A: sc.rounds[sc.rounds.length - 1].scoreA,
      B: sc.rounds[sc.rounds.length - 1].scoreB
    })));
  }

  /**
   * Calculate a judge's score for a round
   * Based on the four official scoring criteria:
   * 1. Clean, effective punching (quality over quantity)
   * 2. Effective aggression (aggression that lands, not wild swinging)
   * 3. Ring generalship (controlling the fight's location and pace)
   * 4. Defense (making opponent miss, not just running)
   */
  calculateJudgeScore(judge, round) {
    const statsA = round.stats.A;
    const statsB = round.stats.B;

    // ============================================
    // 1. CLEAN EFFECTIVE PUNCHING
    // Power punches and damage matter more than jabs
    // ============================================

    // Clean punches weighted by impact
    // DAMAGE is king - fighter dealing more damage should win rounds
    // In boxing, it's not about how many punches you throw, but how effective they are
    // Lewis' power jab vs Holyfield's volume - Lewis should win if dealing more damage
    const cleanPunchingA =
      statsA.cleanPunchesLanded * 0.8 +           // Clean shots (reduced - count less)
      statsA.powerPunchesLanded * 1.5 +           // Power punches (reduced)
      statsA.jabsLanded * 0.2 +                   // Jabs worth minimal
      (statsA.damageDealt / 10) * 6.0 +           // DAMAGE - very heavily weighted (up from 4)
      statsA.significantStrikesLanded * 3.0;      // Big, impactful shots

    const cleanPunchingB =
      statsB.cleanPunchesLanded * 0.8 +
      statsB.powerPunchesLanded * 1.5 +
      statsB.jabsLanded * 0.2 +
      (statsB.damageDealt / 10) * 6.0 +           // DAMAGE - very heavily weighted (up from 4)
      statsB.significantStrikesLanded * 3.0;

    // ============================================
    // 2. EFFECTIVE AGGRESSION
    // Moving forward AND landing, not just charging
    // ============================================

    const accuracyA = statsA.punchesThrown > 0
      ? statsA.punchesLanded / statsA.punchesThrown
      : 0;
    const accuracyB = statsB.punchesThrown > 0
      ? statsB.punchesLanded / statsB.punchesThrown
      : 0;

    // Effective aggression = forward pressure that results in landed punches
    // Just moving forward without landing shouldn't score much - DAMAGE is what counts
    // Reduce forward movement bonus significantly - it's not effective if it doesn't hurt opponent
    // Boxing rewards EFFECTIVE aggression, not just walking forward
    const effectiveAggressionA =
      statsA.forwardMovementTime * 0.03 * accuracyA +          // Forward movement (reduced more)
      (statsA.punchesLanded > statsB.punchesLanded ? 2 : 0) +  // Small bonus for outlanding
      (statsA.damageDealt > statsB.damageDealt ? 18 : 0) +     // BIG bonus for damage advantage
      (statsA.damageDealt / 15);                               // Absolute damage bonus (increased)

    const effectiveAggressionB =
      statsB.forwardMovementTime * 0.03 * accuracyB +
      (statsB.punchesLanded > statsA.punchesLanded ? 2 : 0) +
      (statsB.damageDealt > statsA.damageDealt ? 18 : 0) +
      (statsB.damageDealt / 15);

    // ============================================
    // 3. RING GENERALSHIP
    // Who is dictating the fight? Not who is running!
    // Controlling center, cutting off ring, forcing opponent to corners/ropes
    // ============================================

    // Penalize backward movement ONLY if not dealing damage
    // Smart boxing (moving backward but outscoring) shouldn't be penalized
    // If dealing more damage while moving back, that's ring generalship, not running
    const backwardPenaltyA = statsA.damageDealt > statsB.damageDealt
      ? statsA.backwardMovementTime * 0.02  // Minimal penalty - boxing, not running
      : statsA.backwardMovementTime * 0.08; // Penalty - running without effective offense
    const backwardPenaltyB = statsB.damageDealt > statsA.damageDealt
      ? statsB.backwardMovementTime * 0.02
      : statsB.backwardMovementTime * 0.08;

    // Reward controlling center and putting opponent on ropes/corners
    // Also consider who is dictating WHERE the fight takes place
    const ringGeneralshipA =
      statsA.centerControlTime * 0.2 +            // Center control (slightly reduced)
      statsB.ropeTime * 0.25 +                    // Opponent on ropes (you put them there)
      statsB.cornerTime * 0.4 -                   // Opponent in corner (you trapped them)
      backwardPenaltyA -                          // Penalize running (not boxing)
      statsA.ropeTime * 0.12 -                    // Penalize being on ropes yourself
      statsA.cornerTime * 0.2;                    // Penalize being cornered yourself

    const ringGeneralshipB =
      statsB.centerControlTime * 0.2 +
      statsA.ropeTime * 0.25 +
      statsA.cornerTime * 0.4 -
      backwardPenaltyB -
      statsB.ropeTime * 0.12 -
      statsB.cornerTime * 0.2;

    // ============================================
    // 4. DEFENSE
    // Making opponent miss through skill, not just running
    // Blocking and slipping are more valuable than just being far away
    // ============================================

    // Defense through skill (blocking, evading)
    const defenseA =
      statsA.punchesBlocked * 1.0 +              // Blocking
      statsA.punchesEvaded * 2.0 -               // Head movement (more skillful)
      (statsA.damageReceived / 20);              // Penalize taking damage

    const defenseB =
      statsB.punchesBlocked * 1.0 +
      statsB.punchesEvaded * 2.0 -
      (statsB.damageReceived / 20);

    // ============================================
    // APPLY JUDGE PREFERENCES
    // ============================================

    let totalA = 0, totalB = 0;

    // Clean punching (most important - weighted higher)
    totalA += cleanPunchingA * (judge.preferences.cleanPunching || 1.0) * 1.2;
    totalB += cleanPunchingB * (judge.preferences.cleanPunching || 1.0) * 1.2;

    // Power shots preference
    totalA += statsA.powerPunchesLanded * (judge.preferences.powerShots || 1.0) * 2.0;
    totalB += statsB.powerPunchesLanded * (judge.preferences.powerShots || 1.0) * 2.0;

    // Volume preference (some judges favor activity - but much less than damage)
    // Reduced from 0.5 to 0.25 - activity without damage shouldn't win rounds
    totalA += statsA.punchesLanded * (judge.preferences.volume || 1.0) * 0.25;
    totalB += statsB.punchesLanded * (judge.preferences.volume || 1.0) * 0.25;

    // Effective aggression
    totalA += effectiveAggressionA * (judge.preferences.effectiveAggression || 1.0);
    totalB += effectiveAggressionB * (judge.preferences.effectiveAggression || 1.0);

    // Ring generalship
    totalA += Math.max(0, ringGeneralshipA) * (judge.preferences.ringGeneralship || 1.0);
    totalB += Math.max(0, ringGeneralshipB) * (judge.preferences.ringGeneralship || 1.0);

    // Defense
    totalA += Math.max(0, defenseA) * (judge.preferences.defense || 1.0) * 0.8;
    totalB += Math.max(0, defenseB) * (judge.preferences.defense || 1.0) * 0.8;

    // ============================================
    // APPLY HOME BIAS
    // ============================================

    if (judge.homeBias > 0) {
      if (this.fighterA.isHomeFighter) {
        totalA *= 1 + (judge.homeBias / 100);
      } else if (this.fighterB.isHomeFighter) {
        totalB *= 1 + (judge.homeBias / 100);
      }
    }

    // ============================================
    // DETERMINE ROUND SCORE
    // ============================================

    let scoreA = 10, scoreB = 10;
    const diff = totalA - totalB;
    const threshold = 12;  // Threshold for clear round

    if (Math.abs(diff) > threshold) {
      // Clear round
      if (diff > 0) scoreB = 9;
      else scoreA = 9;
    } else if (Math.abs(diff) > 4) {
      // Moderate advantage, use consistency
      if (Math.random() > judge.consistency / 100) {
        // Inconsistent judging - might miss the edge
        if (Math.random() > 0.6) {
          // 40% chance of wrong call in close round
          if (diff > 0) scoreA = 9;
          else scoreB = 9;
        } else {
          if (diff > 0) scoreB = 9;
          else scoreA = 9;
        }
      } else {
        if (diff > 0) scoreB = 9;
        else if (diff < 0) scoreA = 9;
      }
    } else {
      // Very close - could go either way or be 10-10
      const closeRoll = Math.random();
      if (closeRoll < 0.3) {
        // 30% chance of even round
        // Keep 10-10
      } else if (diff > 1) {
        scoreB = 9;
      } else if (diff < -1) {
        scoreA = 9;
      }
      // else 10-10
    }

    // ============================================
    // APPLY KNOCKDOWN PENALTIES
    // Knockdowns are automatic point deductions
    // ============================================

    const kdWeight = judge.knockdownWeight || 1.0;
    const knockdownsA = round.knockdowns.A.length;  // A got knocked down
    const knockdownsB = round.knockdowns.B.length;  // B got knocked down

    // Fighter who gets knocked down loses a point (given to opponent)
    // Knockdowns should be decisive - no cap per round (realistic scoring)
    // 1 KD = 10-8 round, 2 KDs = 10-7 round, 3 KDs = 10-6 round (usually stopped)
    if (knockdownsA > 0) {
      // A was knocked down, B scores the knockdown
      scoreA -= knockdownsA * kdWeight;
      // If A was winning on points but got knocked down, B should win the round (reversal)
      if (diff > 0 && knockdownsB === 0) {
        // A was winning on points but B knocked A down - B takes the round
        scoreB = 10;
        scoreA = Math.min(scoreA, 9);  // A can't win after getting knocked down while "winning"
      }
    }
    if (knockdownsB > 0) {
      // B was knocked down, A scores the knockdown
      scoreB -= knockdownsB * kdWeight;
      // If B was winning on points but got knocked down, A should win the round (reversal)
      if (diff < 0 && knockdownsA === 0) {
        // B was winning on points but A knocked B down - A takes the round
        scoreA = 10;
        scoreB = Math.min(scoreB, 9);  // B can't win after getting knocked down while "winning"
      }
    }

    // Ensure minimum score of 7
    scoreA = Math.max(7, Math.round(scoreA));
    scoreB = Math.max(7, Math.round(scoreB));

    return { A: scoreA, B: scoreB };
  }

  /**
   * Stop the fight (KO, TKO, etc.)
   * @param {string} type - Stoppage type (KO, TKO_REFEREE, etc.)
   * @param {string} winner - Winner ID ('A' or 'B')
   * @param {number} round - Round number (optional)
   * @param {number} time - Time in round (optional)
   * @param {object} finishingDetails - Details about the finishing sequence (optional)
   */
  stopFight(type, winner, round = null, time = null, finishingDetails = null) {
    this.status = FightStatus.STOPPED;

    const currentRound = this.getCurrentRound();
    if (currentRound) {
      currentRound.stop(type, time);
    }

    this.result = {
      winner,
      loser: winner === 'A' ? 'B' : 'A',
      method: type,
      round: round || this.currentRound,
      time: time || (currentRound ? currentRound.currentTime : 0),
      scorecards: null,
      // Finishing details for KO/TKO
      finishingPunch: finishingDetails?.punchType || null,
      finishingLocation: finishingDetails?.location || 'head',
      finishingDamage: finishingDetails?.damage || null,
      wasCounter: finishingDetails?.isCounter || false,
      knockdownsInRound: finishingDetails?.knockdownsInRound || 0,
      totalKnockdowns: finishingDetails?.totalKnockdowns || 0,
      finisherName: finishingDetails?.finisherName || null,
      loserName: finishingDetails?.loserName || null,
      loserHealth: finishingDetails?.loserHealth || null,
      loserStamina: finishingDetails?.loserStamina || null
    };

    this.addEvent({
      type: 'FIGHT_END',
      method: type,
      winner: winner === 'A' ? this.fighterA.name : this.fighterB.name,
      round: this.result.round,
      time: this.result.time,
      finishingPunch: this.result.finishingPunch
    });
  }

  /**
   * End fight by decision
   */
  endFightByDecision() {
    this.status = FightStatus.COMPLETED;

    // Tally final scores
    const finalScores = this.scorecards.map(sc => ({
      judge: sc.judge,
      A: sc.totalA,
      B: sc.totalB
    }));

    // Determine winner
    let winsA = 0, winsB = 0, draws = 0;

    for (const score of finalScores) {
      if (score.A > score.B) winsA++;
      else if (score.B > score.A) winsB++;
      else draws++;
    }

    let winner, method;

    if (winsA >= 2) {
      winner = 'A';
      if (winsA === 3) method = StoppageType.DECISION_UNANIMOUS;
      else if (draws === 1) method = StoppageType.DECISION_MAJORITY;
      else method = StoppageType.DECISION_SPLIT;
    } else if (winsB >= 2) {
      winner = 'B';
      if (winsB === 3) method = StoppageType.DECISION_UNANIMOUS;
      else if (draws === 1) method = StoppageType.DECISION_MAJORITY;
      else method = StoppageType.DECISION_SPLIT;
    } else {
      winner = null;
      if (draws === 3) method = StoppageType.DRAW_UNANIMOUS;
      else if (draws === 2) method = StoppageType.DRAW_MAJORITY;
      else method = StoppageType.DRAW_SPLIT;
    }

    this.result = {
      winner,
      loser: winner ? (winner === 'A' ? 'B' : 'A') : null,
      method,
      round: this.config.rounds,
      time: this.config.roundDuration,
      scorecards: finalScores
    };

    this.addEvent({
      type: 'FIGHT_END',
      method,
      winner: winner ? (winner === 'A' ? this.fighterA.name : this.fighterB.name) : 'DRAW',
      scorecards: finalScores.map(s => `${s.A}-${s.B}`)
    });
  }

  /**
   * Add an event to the fight log
   */
  addEvent(event) {
    this.events.push({
      ...event,
      totalTime: this.totalTime,
      round: event.round || this.currentRound
    });
  }

  /**
   * Get fighter by ID
   */
  getFighter(id) {
    return id === 'A' ? this.fighterA : this.fighterB;
  }

  /**
   * Get opponent of a fighter
   */
  getOpponent(fighterId) {
    return fighterId === 'A' ? this.fighterB : this.fighterA;
  }

  /**
   * Get current scorecard totals
   */
  getCurrentScores() {
    return this.scorecards.map(sc => ({
      judge: sc.judge,
      A: sc.totalA,
      B: sc.totalB
    }));
  }

  /**
   * Check if the fight is over
   */
  isOver() {
    return this.status === FightStatus.STOPPED ||
           this.status === FightStatus.COMPLETED;
  }

  /**
   * Get fight summary
   */
  getSummary() {
    const winner = this.result?.winner;

    return {
      fighterA: this.fighterA.name,
      fighterB: this.fighterB.name,

      result: this.result,

      stats: {
        A: this.fighterA.fightStats,
        B: this.fighterB.fightStats
      },

      rounds: this.rounds.map(r => r.getSummary()),

      scorecards: this.scorecards,

      highlights: this.getHighlights()
    };
  }

  /**
   * Get fight highlights
   */
  getHighlights() {
    return this.events.filter(e =>
      ['KNOCKDOWN', 'FIGHT_END', 'HURT', 'CUT', 'ROUND_END'].includes(e.type)
    );
  }

  /**
   * Get compubox-style stats
   */
  getCompuboxStats() {
    const statsA = this.fighterA.fightStats;
    const statsB = this.fighterB.fightStats;

    return {
      totalPunches: {
        A: { thrown: statsA.punchesThrown, landed: statsA.punchesLanded },
        B: { thrown: statsB.punchesThrown, landed: statsB.punchesLanded }
      },
      jabs: {
        A: { thrown: statsA.jabsThrown, landed: statsA.jabsLanded },
        B: { thrown: statsB.jabsThrown, landed: statsB.jabsLanded }
      },
      powerPunches: {
        A: { thrown: statsA.powerPunchesThrown, landed: statsA.powerPunchesLanded },
        B: { thrown: statsB.powerPunchesThrown, landed: statsB.powerPunchesLanded }
      },
      accuracy: {
        A: statsA.punchesThrown > 0 ? (statsA.punchesLanded / statsA.punchesThrown * 100).toFixed(1) : '0.0',
        B: statsB.punchesThrown > 0 ? (statsB.punchesLanded / statsB.punchesThrown * 100).toFixed(1) : '0.0'
      },
      knockdowns: {
        A: statsA.knockdownsScored,
        B: statsB.knockdownsScored
      }
    };
  }
}

export default Fight;
