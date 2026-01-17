/**
 * Fight Model
 * Represents an entire boxing match with configuration, state, and results
 */

import { Round } from './Round.js';
import ModelParameters from '../engine/model/ModelParameters.js';

// Helper to get scoring parameters with defaults
const getScoringParam = (path, defaultValue) => ModelParameters.get(`scoring.${path}`, defaultValue);

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

    // Load scoring parameters
    const cleanPunchParams = {
      cleanPunchesWeight: getScoringParam('clean_punching.clean_punches_weight', 0.8),
      powerPunchesWeight: getScoringParam('clean_punching.power_punches_weight', 1.5),
      jabsWeight: getScoringParam('clean_punching.jabs_weight', 0.2),
      damageWeight: getScoringParam('clean_punching.damage_weight', 6.0),
      damageDivisor: getScoringParam('clean_punching.damage_divisor', 10),
      significantStrikesWeight: getScoringParam('clean_punching.significant_strikes_weight', 3.0)
    };

    const aggressionParams = {
      forwardMovementBase: getScoringParam('effective_aggression.forward_movement_base', 0.03),
      outlandingBonus: getScoringParam('effective_aggression.outlanding_bonus', 2),
      damageAdvantageBonus: getScoringParam('effective_aggression.damage_advantage_bonus', 18),
      absoluteDamageDivisor: getScoringParam('effective_aggression.absolute_damage_divisor', 15)
    };

    const ringGenParams = {
      centerControlWeight: getScoringParam('ring_generalship.center_control_weight', 0.2),
      opponentRopesWeight: getScoringParam('ring_generalship.opponent_ropes_weight', 0.25),
      opponentCornerWeight: getScoringParam('ring_generalship.opponent_corner_weight', 0.4),
      backwardPenaltyWinning: getScoringParam('ring_generalship.backward_penalty_winning', 0.02),
      backwardPenaltyLosing: getScoringParam('ring_generalship.backward_penalty_losing', 0.08),
      ownRopesPenalty: getScoringParam('ring_generalship.own_ropes_penalty', 0.12),
      ownCornerPenalty: getScoringParam('ring_generalship.own_corner_penalty', 0.2)
    };

    const defenseParams = {
      blockedWeight: getScoringParam('defense.blocked_weight', 1.0),
      evadedWeight: getScoringParam('defense.evaded_weight', 2.0),
      damageReceivedDivisor: getScoringParam('defense.damage_received_divisor', 20)
    };

    const judgeAppParams = {
      cleanPunchingMultiplier: getScoringParam('judge_application.clean_punching_multiplier', 1.2),
      powerShotsMultiplier: getScoringParam('judge_application.power_shots_multiplier', 2.0),
      volumeMultiplier: getScoringParam('judge_application.volume_multiplier', 0.25),
      defenseMultiplier: getScoringParam('judge_application.defense_multiplier', 0.8)
    };

    // ============================================
    // 1. CLEAN EFFECTIVE PUNCHING
    // ============================================
    const calculateCleanPunching = (stats) =>
      stats.cleanPunchesLanded * cleanPunchParams.cleanPunchesWeight +
      stats.powerPunchesLanded * cleanPunchParams.powerPunchesWeight +
      stats.jabsLanded * cleanPunchParams.jabsWeight +
      (stats.damageDealt / cleanPunchParams.damageDivisor) * cleanPunchParams.damageWeight +
      stats.significantStrikesLanded * cleanPunchParams.significantStrikesWeight;

    const cleanPunchingA = calculateCleanPunching(statsA);
    const cleanPunchingB = calculateCleanPunching(statsB);

    // ============================================
    // 2. EFFECTIVE AGGRESSION
    // ============================================
    const accuracyA = statsA.punchesThrown > 0
      ? statsA.punchesLanded / statsA.punchesThrown
      : 0;
    const accuracyB = statsB.punchesThrown > 0
      ? statsB.punchesLanded / statsB.punchesThrown
      : 0;

    const calculateEffectiveAggression = (ownStats, oppStats, accuracy) =>
      ownStats.forwardMovementTime * aggressionParams.forwardMovementBase * accuracy +
      (ownStats.punchesLanded > oppStats.punchesLanded ? aggressionParams.outlandingBonus : 0) +
      (ownStats.damageDealt > oppStats.damageDealt ? aggressionParams.damageAdvantageBonus : 0) +
      (ownStats.damageDealt / aggressionParams.absoluteDamageDivisor);

    const effectiveAggressionA = calculateEffectiveAggression(statsA, statsB, accuracyA);
    const effectiveAggressionB = calculateEffectiveAggression(statsB, statsA, accuracyB);

    // ============================================
    // 3. RING GENERALSHIP
    // ============================================
    const calculateBackwardPenalty = (ownStats, oppStats) =>
      ownStats.damageDealt > oppStats.damageDealt
        ? ownStats.backwardMovementTime * ringGenParams.backwardPenaltyWinning
        : ownStats.backwardMovementTime * ringGenParams.backwardPenaltyLosing;

    const backwardPenaltyA = calculateBackwardPenalty(statsA, statsB);
    const backwardPenaltyB = calculateBackwardPenalty(statsB, statsA);

    const calculateRingGeneralship = (ownStats, oppStats, backwardPenalty) =>
      ownStats.centerControlTime * ringGenParams.centerControlWeight +
      oppStats.ropeTime * ringGenParams.opponentRopesWeight +
      oppStats.cornerTime * ringGenParams.opponentCornerWeight -
      backwardPenalty -
      ownStats.ropeTime * ringGenParams.ownRopesPenalty -
      ownStats.cornerTime * ringGenParams.ownCornerPenalty;

    const ringGeneralshipA = calculateRingGeneralship(statsA, statsB, backwardPenaltyA);
    const ringGeneralshipB = calculateRingGeneralship(statsB, statsA, backwardPenaltyB);

    // ============================================
    // 4. DEFENSE
    // ============================================
    const calculateDefense = (stats) =>
      stats.punchesBlocked * defenseParams.blockedWeight +
      stats.punchesEvaded * defenseParams.evadedWeight -
      (stats.damageReceived / defenseParams.damageReceivedDivisor);

    const defenseA = calculateDefense(statsA);
    const defenseB = calculateDefense(statsB);

    // ============================================
    // APPLY JUDGE PREFERENCES
    // ============================================
    const calculateTotal = (cleanPunching, effectiveAggression, ringGeneralship, defense, stats) => {
      const cleanPunchingScore = cleanPunching *
        (judge.preferences.cleanPunching || 1.0) * judgeAppParams.cleanPunchingMultiplier;
      const powerShotsScore = stats.powerPunchesLanded *
        (judge.preferences.powerShots || 1.0) * judgeAppParams.powerShotsMultiplier;
      const volumeScore = stats.punchesLanded *
        (judge.preferences.volume || 1.0) * judgeAppParams.volumeMultiplier;
      const aggressionScore = effectiveAggression * (judge.preferences.effectiveAggression || 1.0);
      const generalshipScore = Math.max(0, ringGeneralship) *
        (judge.preferences.ringGeneralship || 1.0);
      const defenseScore = Math.max(0, defense) *
        (judge.preferences.defense || 1.0) * judgeAppParams.defenseMultiplier;

      return cleanPunchingScore + powerShotsScore + volumeScore +
        aggressionScore + generalshipScore + defenseScore;
    };

    const baseTotalA = calculateTotal(cleanPunchingA, effectiveAggressionA, ringGeneralshipA, defenseA, statsA);
    const baseTotalB = calculateTotal(cleanPunchingB, effectiveAggressionB, ringGeneralshipB, defenseB, statsB);

    // ============================================
    // APPLY HOME BIAS (functional)
    // ============================================
    const applyHomeBias = (total, isHomeFighter) =>
      judge.homeBias > 0 && isHomeFighter
        ? total * (1 + judge.homeBias / 100)
        : total;

    const totalA = applyHomeBias(baseTotalA, this.fighterA.isHomeFighter);
    const totalB = applyHomeBias(baseTotalB, this.fighterB.isHomeFighter);

    // ============================================
    // DETERMINE ROUND SCORE (functional)
    // ============================================
    const roundParams = {
      clearRoundThreshold: getScoringParam('round_thresholds.clear_round', 12),
      moderateAdvantage: getScoringParam('round_thresholds.moderate_advantage', 4),
      closeRoundEvenChance: getScoringParam('round_thresholds.close_round_even_chance', 0.30)
    };

    const consistencyParams = {
      wrongCallChance: getScoringParam('consistency.wrong_call_chance', 0.4),
      moderateCheckThreshold: getScoringParam('consistency.moderate_check_threshold', 0.6)
    };

    const diff = totalA - totalB;

    // Pure function to determine base round scores
    const determineBaseScores = (scoreDiff, judgeConsistency) => {
      // Clear round - large point differential
      if (Math.abs(scoreDiff) > roundParams.clearRoundThreshold) {
        return scoreDiff > 0 ? { A: 10, B: 9 } : { A: 9, B: 10 };
      }

      // Moderate advantage - use consistency check
      if (Math.abs(scoreDiff) > roundParams.moderateAdvantage) {
        const isInconsistent = Math.random() > judgeConsistency / 100;
        const wrongCall = isInconsistent && Math.random() < consistencyParams.wrongCallChance;

        // Wrong call reverses the actual winner
        return wrongCall
          ? (scoreDiff > 0 ? { A: 9, B: 10 } : { A: 10, B: 9 })
          : (scoreDiff > 0 ? { A: 10, B: 9 } : { A: 9, B: 10 });
      }

      // Very close - could go either way or be 10-10
      const closeRoll = Math.random();

      // Even round chance
      if (closeRoll < roundParams.closeRoundEvenChance) {
        return { A: 10, B: 10 };
      }

      // Slight edge gives the round
      return scoreDiff > 1 ? { A: 10, B: 9 }
        : scoreDiff < -1 ? { A: 9, B: 10 }
        : { A: 10, B: 10 };
    };

    const baseScores = determineBaseScores(diff, judge.consistency);

    // ============================================
    // APPLY KNOCKDOWN PENALTIES (functional)
    // Knockdowns are automatic point deductions
    // 1 KD = 10-8 round, 2 KDs = 10-7 round, 3 KDs = 10-6 round (usually stopped)
    // ============================================
    const kdParams = {
      minRoundScore: getScoringParam('knockdown.min_round_score', 7),
      defaultWeight: getScoringParam('knockdown.default_weight', 1.0)
    };

    const knockdownsA = round.knockdowns.A.length;  // A got knocked down
    const knockdownsB = round.knockdowns.B.length;  // B got knocked down
    const kdWeight = judge.knockdownWeight || kdParams.defaultWeight;

    // Pure function to apply knockdown penalties and reversals
    const applyKnockdownPenalties = (scores, kdsA, kdsB, weight, scoreDiff) => {
      // Apply base knockdown point deductions
      const afterKdA = kdsA > 0 ? scores.A - kdsA * weight : scores.A;
      const afterKdB = kdsB > 0 ? scores.B - kdsB * weight : scores.B;

      // Handle round reversals when knocked down while winning on points
      // If A was winning but got knocked down (and B wasn't), B takes the round
      const aKnockedDownWhileWinning = kdsA > 0 && scoreDiff > 0 && kdsB === 0;
      // If B was winning but got knocked down (and A wasn't), A takes the round
      const bKnockedDownWhileWinning = kdsB > 0 && scoreDiff < 0 && kdsA === 0;

      const finalA = aKnockedDownWhileWinning ? Math.min(afterKdA, 9) : afterKdA;
      const finalB = bKnockedDownWhileWinning ? Math.min(afterKdB, 9) : afterKdB;

      // Winner gets 10 in reversal scenarios
      const scoreAWithReversal = bKnockedDownWhileWinning ? 10 : finalA;
      const scoreBWithReversal = aKnockedDownWhileWinning ? 10 : finalB;

      // Ensure minimum score and round to integer
      return {
        A: Math.max(kdParams.minRoundScore, Math.round(scoreAWithReversal)),
        B: Math.max(kdParams.minRoundScore, Math.round(scoreBWithReversal))
      };
    };

    const finalScores = applyKnockdownPenalties(baseScores, knockdownsA, knockdownsB, kdWeight, diff);

    return finalScores;
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
