/**
 * FightRecordGenerator - Creates complete fight records from simulations
 *
 * Responsible for capturing fighter snapshots, extracting fight data,
 * and generating comprehensive records for analysis and validation.
 */

import FighterSnapshot from './FighterSnapshot.js';
import FightRecord from './FightRecord.js';
import ModelParameters from '../model/ModelParameters.js';

export class FightRecordGenerator {
  /**
   * Create a generator instance
   * @param {object} options - Generator options
   */
  constructor(options = {}) {
    this.includeDetailedStats = options.includeDetailedStats !== false;
    this.includeRoundByRound = options.includeRoundByRound !== false;
    this.includePrediction = options.includePrediction !== false;
  }

  /**
   * Create a complete fight record from a completed fight
   * @param {Fight} fight - Completed fight instance
   * @param {object} options - Additional options
   * @returns {FightRecord} Complete fight record
   */
  createRecord(fight, options = {}) {
    const { careerDataA, careerDataB, currentDate, fightContext } = options;

    // Create fighter snapshots
    const fighterASnapshot = new FighterSnapshot(fight.fighterA, {
      careerData: careerDataA,
      currentDate
    });

    const fighterBSnapshot = new FighterSnapshot(fight.fighterB, {
      careerData: careerDataB,
      currentDate
    });

    // Build the fight record
    const record = new FightRecord({
      version: ModelParameters.getVersion(),
      fighterA: fighterASnapshot.toJSON(),
      fighterB: fighterBSnapshot.toJSON(),
      conditions: this.extractConditions(fight, options),
      context: this.extractContext(fight, fightContext),
      metadata: {
        simulationType: options.simulationType || 'single',
        seed: options.seed || null,
        notes: options.notes || null
      }
    });

    // Set result if fight is complete
    if (fight.result) {
      record.setResult(this.extractResult(fight));
    }

    // Set detailed fight data
    if (this.includeDetailedStats) {
      record.setFightData(this.extractFightData(fight));
    }

    return record;
  }

  /**
   * Create fighter snapshots before fight starts (for pre-fight records)
   * @param {Fighter} fighterA - Fighter A
   * @param {Fighter} fighterB - Fighter B
   * @param {object} options - Snapshot options
   * @returns {object} Both fighter snapshots
   */
  createPreFightSnapshots(fighterA, fighterB, options = {}) {
    return {
      fighterA: new FighterSnapshot(fighterA, options).toJSON(),
      fighterB: new FighterSnapshot(fighterB, options).toJSON()
    };
  }

  /**
   * Extract fight conditions from fight state
   * @param {Fight} fight - Fight instance
   * @param {object} options - Additional condition data
   * @returns {object} Conditions for both fighters
   */
  extractConditions(fight, options = {}) {
    const extractFighterCondition = (fighter, conditionOverrides = {}) => {
      // Get current stamina as proxy for physical state
      const staminaPercent = fighter.currentStamina / fighter.maxStamina;
      const physicalState = staminaPercent > 0.9 ? 'peak'
        : staminaPercent > 0.7 ? 'good'
        : staminaPercent > 0.5 ? 'compromised'
        : 'drained';

      return {
        trainingCamp: conditionOverrides.trainingCamp || 1.0,
        motivation: conditionOverrides.motivation || 1.0,
        mentalState: conditionOverrides.mentalState || 'focused',
        physicalState: conditionOverrides.physicalState || physicalState,
        modifiers: conditionOverrides.modifiers || []
      };
    };

    return {
      fighterA: extractFighterCondition(fight.fighterA, options.conditionsA),
      fighterB: extractFighterCondition(fight.fighterB, options.conditionsB)
    };
  }

  /**
   * Extract fight context
   * @param {Fight} fight - Fight instance
   * @param {object} contextOverrides - Additional context
   * @returns {object} Fight context
   */
  extractContext(fight, contextOverrides = {}) {
    return {
      fightType: contextOverrides.fightType || fight.fightType || 'STANDARD',
      rounds: fight.scheduledRounds || 12,
      venue: contextOverrides.venue || null,
      stakes: contextOverrides.stakes || null,
      isRematch: contextOverrides.isRematch || false,
      isRivalry: contextOverrides.isRivalry || false,
      publicPressure: contextOverrides.publicPressure || 0.5,
      date: contextOverrides.date || null
    };
  }

  /**
   * Extract fight result
   * @param {Fight} fight - Completed fight
   * @returns {object} Result data
   */
  extractResult(fight) {
    const result = fight.result;

    return {
      winner: result.winner,
      loser: result.loser,
      method: result.method,
      round: result.round,
      time: result.time,
      scores: result.scorecards ? this.formatScorecards(result.scorecards) : null,
      finishingDetails: result.finishingPunch ? {
        finishType: result.method,
        finishPunch: result.finishingPunch,
        location: result.finishingLocation,
        damage: result.finishingDamage,
        wasCounter: result.wasCounter,
        knockdownsInRound: result.knockdownsInRound,
        totalKnockdowns: result.totalKnockdowns
      } : null
    };
  }

  /**
   * Format scorecards for storage
   * @param {Array} scorecards - Judge scorecards
   * @returns {object} Formatted scorecards
   */
  formatScorecards(scorecards) {
    if (!scorecards || !Array.isArray(scorecards)) return null;

    return scorecards.map((card, index) => ({
      judge: index + 1,
      judgeName: card.judgeName || `Judge ${index + 1}`,
      scoreA: card.scoreA || card.A,
      scoreB: card.scoreB || card.B,
      rounds: card.rounds || []
    }));
  }

  /**
   * Extract detailed fight data
   * @param {Fight} fight - Completed fight
   * @returns {object} Detailed fight data
   */
  extractFightData(fight) {
    const data = {
      roundByRound: [],
      totalStats: this.extractTotalStats(fight),
      finishDetails: null,
      fightNarrative: []
    };

    // Extract round-by-round data
    if (this.includeRoundByRound && fight.rounds) {
      data.roundByRound = fight.rounds.map((round, index) =>
        this.extractRoundData(round, index + 1)
      );
    }

    // Extract finish details if stoppage
    if (fight.result && fight.result.method !== 'DECISION') {
      data.finishDetails = {
        finishType: fight.result.method,
        finishPunch: fight.result.finishingPunch,
        targetDown: true,
        countReached: fight.result.method === 'KO' ? 10 : null,
        round: fight.result.round,
        time: fight.result.time
      };
    }

    // Extract key moments from events
    data.fightNarrative = this.extractNarrative(fight);

    return data;
  }

  /**
   * Extract round data
   * @param {Round} round - Round instance
   * @param {number} roundNumber - Round number
   * @returns {object} Round data
   */
  extractRoundData(round, roundNumber) {
    return {
      round: roundNumber,
      scores: round.scores || { A: 10, B: 10 },
      punchStats: {
        thrown: {
          A: round.stats?.A?.punchesThrown || 0,
          B: round.stats?.B?.punchesThrown || 0
        },
        landed: {
          A: round.stats?.A?.punchesLanded || 0,
          B: round.stats?.B?.punchesLanded || 0
        },
        power: {
          A: round.stats?.A?.powerPunchesLanded || 0,
          B: round.stats?.B?.powerPunchesLanded || 0
        }
      },
      knockdowns: {
        A: round.knockdowns?.A?.length || 0,
        B: round.knockdowns?.B?.length || 0
      },
      staggers: {
        A: round.staggers?.A || 0,
        B: round.staggers?.B || 0
      },
      damageDealt: {
        A: round.stats?.A?.damageDealt || 0,
        B: round.stats?.B?.damageDealt || 0
      },
      dominantFighter: this.determineDominantFighter(round)
    };
  }

  /**
   * Determine which fighter dominated a round
   * @param {Round} round - Round instance
   * @returns {string|null} 'A', 'B', or null if even
   */
  determineDominantFighter(round) {
    if (!round.scores) return null;

    const scoreA = round.scores.A || 10;
    const scoreB = round.scores.B || 10;

    if (scoreA > scoreB) return 'A';
    if (scoreB > scoreA) return 'B';
    return null;
  }

  /**
   * Extract total fight stats
   * @param {Fight} fight - Fight instance
   * @returns {object} Total stats
   */
  extractTotalStats(fight) {
    const statsA = fight.fighterA?.fightStats || {};
    const statsB = fight.fighterB?.fightStats || {};

    return {
      punchesThrown: {
        A: statsA.punchesThrown || 0,
        B: statsB.punchesThrown || 0
      },
      punchesLanded: {
        A: statsA.punchesLanded || 0,
        B: statsB.punchesLanded || 0
      },
      powerPunches: {
        A: statsA.powerPunchesLanded || 0,
        B: statsB.powerPunchesLanded || 0
      },
      jabs: {
        A: statsA.jabsLanded || 0,
        B: statsB.jabsLanded || 0
      },
      bodyPunches: {
        A: statsA.bodyPunchesLanded || 0,
        B: statsB.bodyPunchesLanded || 0
      },
      knockdowns: {
        A: statsA.knockdownsScored || 0,
        B: statsB.knockdownsScored || 0
      },
      damageDealt: {
        A: statsA.damageDealt || 0,
        B: statsB.damageDealt || 0
      },
      accuracy: {
        A: statsA.punchesThrown > 0
          ? Math.round((statsA.punchesLanded / statsA.punchesThrown) * 100)
          : 0,
        B: statsB.punchesThrown > 0
          ? Math.round((statsB.punchesLanded / statsB.punchesThrown) * 100)
          : 0
      }
    };
  }

  /**
   * Extract key fight narrative moments
   * @param {Fight} fight - Fight instance
   * @returns {Array} Key moments
   */
  extractNarrative(fight) {
    const narrative = [];
    const events = fight.events || [];

    // Filter for significant events
    const significantTypes = [
      'KNOCKDOWN', 'STAGGER', 'CUT', 'FIGHT_END',
      'ROUND_END', 'CORNER_STOPPAGE', 'REFEREE_STOPPAGE'
    ];

    events
      .filter(e => significantTypes.includes(e.type))
      .forEach(event => {
        narrative.push({
          type: event.type,
          round: event.round || fight.currentRound,
          time: event.time,
          fighter: event.fighter,
          description: event.description || this.generateEventDescription(event)
        });
      });

    return narrative;
  }

  /**
   * Generate description for event
   * @param {object} event - Event object
   * @returns {string} Event description
   */
  generateEventDescription(event) {
    const descriptions = {
      KNOCKDOWN: `${event.fighter || 'Fighter'} scores a knockdown`,
      STAGGER: `${event.fighter || 'Fighter'} staggers opponent`,
      CUT: `${event.fighter || 'Fighter'} opens a cut`,
      FIGHT_END: `Fight ends - ${event.method}`,
      ROUND_END: `End of round ${event.round}`,
      CORNER_STOPPAGE: 'Corner throws in towel',
      REFEREE_STOPPAGE: 'Referee stops the fight'
    };

    return descriptions[event.type] || event.type;
  }

  /**
   * Create a minimal record for batch testing
   * @param {Fight} fight - Completed fight
   * @returns {FightRecord} Minimal record
   */
  createMinimalRecord(fight) {
    const record = FightRecord.createMinimal({
      fighterA: {
        id: fight.fighterA.id,
        name: fight.fighterA.name
      },
      fighterB: {
        id: fight.fighterB.id,
        name: fight.fighterB.name
      },
      context: {
        fightType: fight.fightType || 'STANDARD',
        rounds: fight.scheduledRounds || 12
      }
    });

    if (fight.result) {
      record.setResult({
        winner: fight.result.winner,
        loser: fight.result.loser,
        method: fight.result.method,
        round: fight.result.round
      });
    }

    return record;
  }
}

export default FightRecordGenerator;
