/**
 * Fight Integration
 * Connects universe fighters with the existing SimulationLoop
 * Runs fights and updates career records
 */

import { SimulationLoop } from '../../engine/SimulationLoop.js';
import { FighterAI } from '../../engine/FighterAI.js';
import { CombatResolver } from '../../engine/CombatResolver.js';
import { DamageCalculator } from '../../engine/DamageCalculator.js';
import { StaminaManager } from '../../engine/StaminaManager.js';
import { PositionTracker } from '../../engine/PositionTracker.js';
import { Fight } from '../../models/Fight.js';
import { FightType } from './MatchmakingEngine.js';

export class FightIntegration {
  constructor(universe) {
    this.universe = universe;
  }

  /**
   * Run a scheduled fight and return the result
   * @param {Object} fightCard - Fight configuration from MatchmakingEngine
   * @returns {Object} Fight result
   */
  async runFight(fightCard) {
    const fighterA = this.universe.fighters.get(fightCard.fighterA);
    const fighterB = this.universe.fighters.get(fightCard.fighterB);

    if (!fighterA || !fighterB) {
      return { error: 'Fighter not found', cancelled: true };
    }

    // Convert UniverseFighters to combat-ready Fighters
    const combatA = fighterA.toCombatFighter();
    const combatB = fighterB.toCombatFighter();

    // Create Fight object
    const fight = new Fight(combatA, combatB, {
      rounds: fightCard.rounds || 10
    });

    // Create engine components
    const fighterAI = new FighterAI();
    const combatResolver = new CombatResolver();
    const damageCalculator = new DamageCalculator();
    const staminaManager = new StaminaManager();
    const positionTracker = new PositionTracker();

    // Create simulation with display disabled for headless operation
    const simulation = new SimulationLoop(fight, {
      tickRate: 0.5,
      enableRenderer: false,  // No display for batch fights
      enableLogging: false    // No logging for batch fights
    });

    // Inject engine components
    simulation.setComponents({
      fighterAI,
      combatResolver,
      damageCalculator,
      staminaManager,
      positionTracker
    });

    try {
      const simResult = await simulation.runInstant();

      // Transform simulation result to match expected format
      const transformedResult = this.transformSimulationResult(simResult);

      // Process the result
      return this.processResult(fightCard, fighterA, fighterB, transformedResult);
    } catch (error) {
      console.error('Fight simulation error:', error);
      return { error: error.message, cancelled: true };
    }
  }

  /**
   * Transform SimulationLoop result to the format expected by processResult
   * SimulationLoop returns: { fighterA, fighterB, result: { winner: 'A'|'B', method, round }, stats: { A, B } }
   * processResult expects: { winnerId: 'fighterA'|'fighterB', method, round, stats: { fighterA, fighterB } }
   */
  transformSimulationResult(simResult) {
    // Map winner from 'A'/'B' to 'fighterA'/'fighterB'
    const winnerId = simResult.result?.winner === 'A' ? 'fighterA' :
                     simResult.result?.winner === 'B' ? 'fighterB' : null;

    // Extract and normalize method
    let method = simResult.result?.method || 'Decision';
    // Normalize stoppage type names (e.g., 'DECISION_UNANIMOUS' -> 'Decision')
    if (method.startsWith('DECISION') || method.startsWith('Decision')) {
      method = 'Decision';
    } else if (method === 'TKO' || method === 'STOPPAGE_TKO') {
      method = 'TKO';
    } else if (method === 'KO' || method === 'STOPPAGE_KO') {
      method = 'KO';
    }

    // Transform stats from A/B to fighterA/fighterB
    const stats = {
      fighterA: simResult.stats?.A || {
        punchesThrown: 0,
        punchesLanded: 0,
        knockdowns: 0
      },
      fighterB: simResult.stats?.B || {
        punchesThrown: 0,
        punchesLanded: 0,
        knockdowns: 0
      }
    };

    return {
      winnerId,
      winner: winnerId === 'fighterA' ? simResult.fighterA : simResult.fighterB,
      method,
      round: simResult.result?.round || 1,
      totalRounds: simResult.result?.round || 10,
      stats
    };
  }

  /**
   * Run a fight synchronously (for batch processing)
   */
  runFightSync(fightCard) {
    const fighterA = this.universe.fighters.get(fightCard.fighterA);
    const fighterB = this.universe.fighters.get(fightCard.fighterB);

    if (!fighterA || !fighterB) {
      return { error: 'Fighter not found', cancelled: true };
    }

    // Convert UniverseFighters to combat-ready Fighters
    const combatA = fighterA.toCombatFighter();
    const combatB = fighterB.toCombatFighter();

    // Simulate fight outcome based on attributes (simplified for batch processing)
    const result = this.simulateFightOutcome(combatA, combatB, fightCard);

    return this.processResult(fightCard, fighterA, fighterB, result);
  }

  /**
   * Simplified fight outcome simulation for batch processing
   * Uses fighter attributes to determine winner without full tick-by-tick simulation
   */
  simulateFightOutcome(fighterA, fighterB, fightCard) {
    // Calculate overall ratings
    const ratingA = this.calculateFighterRating(fighterA);
    const ratingB = this.calculateFighterRating(fighterB);

    // Add randomness (upsets happen)
    const varianceA = (Math.random() - 0.5) * 30;
    const varianceB = (Math.random() - 0.5) * 30;

    const adjustedA = ratingA + varianceA;
    const adjustedB = ratingB + varianceB;

    // Determine winner
    const winner = adjustedA >= adjustedB ? fighterA : fighterB;
    const loser = adjustedA >= adjustedB ? fighterB : fighterA;
    const margin = Math.abs(adjustedA - adjustedB);

    // Determine method
    let method, round;
    const koChance = (winner.power?.knockoutPower || 70) / 100 * 0.5;
    const rounds = fightCard.rounds || 10;

    if (margin > 25 && Math.random() < koChance * 1.5) {
      // Dominant KO
      method = 'KO';
      round = 1 + Math.floor(Math.random() * Math.min(6, rounds));
    } else if (margin > 15 && Math.random() < koChance) {
      // Late stoppage
      method = 'TKO';
      round = Math.floor(rounds * 0.5) + Math.floor(Math.random() * (rounds * 0.5));
    } else if (margin > 10 && Math.random() < koChance * 0.5) {
      // Could go either way but stoppage
      method = Math.random() < 0.5 ? 'TKO' : 'KO';
      round = Math.floor(rounds * 0.7) + Math.floor(Math.random() * (rounds * 0.3));
    } else {
      // Goes to decision
      method = 'Decision';
      round = rounds;
    }

    // Calculate stats (simplified)
    const punchesA = Math.floor(30 + Math.random() * 50) * round;
    const punchesB = Math.floor(30 + Math.random() * 50) * round;
    const landedA = Math.floor(punchesA * (0.25 + (fighterA.offense?.jabAccuracy || 70) / 400));
    const landedB = Math.floor(punchesB * (0.25 + (fighterB.offense?.jabAccuracy || 70) / 400));

    return {
      winner: winner.name,
      winnerId: winner === fighterA ? 'fighterA' : 'fighterB',
      loser: loser.name,
      method,
      round,
      finalRound: round,
      totalRounds: rounds,
      stats: {
        fighterA: {
          punchesThrown: punchesA,
          punchesLanded: winner === fighterA ? landedA : Math.floor(landedA * 0.8),
          knockdowns: method !== 'Decision' && winner === fighterA ? 1 : 0
        },
        fighterB: {
          punchesThrown: punchesB,
          punchesLanded: winner === fighterB ? landedB : Math.floor(landedB * 0.8),
          knockdowns: method !== 'Decision' && winner === fighterB ? 1 : 0
        }
      }
    };
  }

  /**
   * Calculate overall fighter rating
   */
  calculateFighterRating(fighter) {
    const power = ((fighter.power?.powerLeft || 70) + (fighter.power?.powerRight || 70)) / 2;
    const speed = ((fighter.speed?.handSpeed || 70) + (fighter.speed?.footSpeed || 70)) / 2;
    const defense = ((fighter.defense?.headMovement || 70) + (fighter.defense?.blocking || 70)) / 2;
    const chin = fighter.mental?.chin || 70;
    const heart = fighter.mental?.heart || 70;
    const iq = fighter.technical?.fightIQ || 70;

    // Weight the attributes
    return (power * 0.20) + (speed * 0.20) + (defense * 0.20) +
           (chin * 0.15) + (heart * 0.10) + (iq * 0.15);
  }

  /**
   * Process fight result and update fighter records
   */
  processResult(fightCard, fighterA, fighterB, simResult) {
    const winnerId = simResult.winnerId === 'fighterA' ? fighterA.id : fighterB.id;
    const loserId = simResult.winnerId === 'fighterA' ? fighterB.id : fighterA.id;
    const winner = simResult.winnerId === 'fighterA' ? fighterA : fighterB;
    const loser = simResult.winnerId === 'fighterA' ? fighterB : fighterA;

    const isKO = simResult.method === 'KO' || simResult.method === 'TKO';
    const currentDate = this.universe.currentDate;

    // Create replay data with fighter snapshots
    const replayData = {
      fighterA: this.createFighterSnapshot(fighterA),
      fighterB: this.createFighterSnapshot(fighterB),
      rounds: fightCard.rounds || 10,
      division: fightCard.division,
      type: fightCard.type
    };

    // Create result object
    const result = {
      date: { ...currentDate },
      fighterA: fighterA.id,
      fighterB: fighterB.id,
      fighterAName: fighterA.name,
      fighterBName: fighterB.name,
      winner: winnerId,
      winnerName: winner.name,
      loser: loserId,
      loserName: loser.name,
      method: simResult.method,
      round: simResult.round,
      totalRounds: fightCard.rounds,
      division: fightCard.division,
      type: fightCard.type,
      titleInfo: fightCard.titleInfo,
      stats: simResult.stats,
      isUpset: this.isUpset(winner, loser)
    };

    // Update winner's record
    fighterA.recordFightResult({
      winner: winnerId,
      opponent: fighterB.id,
      opponentName: fighterB.name,
      method: simResult.method,
      round: simResult.round,
      totalRounds: fightCard.rounds,
      wasTitle: fightCard.type === FightType.TITLE_FIGHT,
      title: fightCard.titleInfo?.organization,
      wasUpset: result.isUpset && winnerId === fighterA.id,
      fightOfTheNight: simResult.method === 'KO' && simResult.round <= 3,
      replayData: replayData
    }, currentDate);

    // Update loser's record
    fighterB.recordFightResult({
      winner: winnerId,
      opponent: fighterA.id,
      opponentName: fighterA.name,
      method: simResult.method,
      round: simResult.round,
      totalRounds: fightCard.rounds,
      wasTitle: fightCard.type === FightType.TITLE_FIGHT,
      title: fightCard.titleInfo?.organization,
      wasUpset: result.isUpset && winnerId === fighterB.id,
      fightOfTheNight: simResult.method === 'KO' && simResult.round <= 3,
      replayData: replayData
    }, currentDate);

    // Handle title implications
    if (fightCard.type === FightType.TITLE_FIGHT && fightCard.titleInfo) {
      this.handleTitleResult(fightCard, winner, loser, result);
    }

    // Update universe stats
    this.universe.recordFight(result);

    return result;
  }

  /**
   * Create a fighter snapshot for replay purposes
   * Stores all data needed to recreate the fighter for replay
   */
  createFighterSnapshot(fighter) {
    return {
      identity: {
        name: fighter.name,
        nickname: fighter.nickname,
        nationality: fighter.nationality,
        hometown: fighter.hometown
      },
      physical: { ...fighter.physical },
      style: { ...fighter.style },
      power: { ...fighter.power },
      speed: { ...fighter.speed },
      stamina: { ...fighter.stamina },
      defense: { ...fighter.defense },
      offense: { ...fighter.offense },
      technical: { ...fighter.technical },
      mental: { ...fighter.mental },
      tactics: fighter.tactics ? { ...fighter.tactics } : undefined,
      corner: fighter.corner ? { ...fighter.corner } : undefined,
      record: { ...fighter.career.record }
    };
  }

  /**
   * Check if result is an upset
   */
  isUpset(winner, loser) {
    const tierRanks = {
      'GENERATIONAL': 7, 'ELITE': 6, 'WORLD_CLASS': 5,
      'CONTENDER': 4, 'GATEKEEPER': 3, 'JOURNEYMAN': 2, 'CLUB': 1
    };

    const winnerTier = tierRanks[winner.potential.tier] || 2;
    const loserTier = tierRanks[loser.potential.tier] || 2;

    // Upset if winner was 2+ tiers below loser
    return winnerTier <= loserTier - 2;
  }

  /**
   * Handle title fight results
   */
  handleTitleResult(fightCard, winner, loser, result) {
    const org = fightCard.titleInfo.organization;
    const body = this.universe.getSanctioningBody(org);
    if (!body) return;

    const division = fightCard.division;

    if (fightCard.titleInfo.isVacant) {
      // Winner claims vacant title
      body.setChampion(division, winner.id, this.universe.currentDate, 'Won vacant title');
      winner.addTitle(`${org} ${division}`, this.universe.currentDate);

      result.titleChange = {
        type: 'NEW_CHAMPION',
        organization: org,
        champion: winner.name
      };
    } else {
      // Was a defense
      const champId = body.getChampion(division);

      if (winner.id === champId) {
        // Successful defense
        body.recordDefense(division);
        result.titleChange = {
          type: 'SUCCESSFUL_DEFENSE',
          organization: org,
          champion: winner.name,
          defenseNumber: fightCard.titleInfo.defenseNumber
        };
      } else {
        // New champion!
        body.setChampion(division, winner.id, this.universe.currentDate, `Defeated ${loser.name}`);
        winner.addTitle(`${org} ${division}`, this.universe.currentDate);
        loser.removeTitle(`${org} ${division}`, this.universe.currentDate, `Lost to ${winner.name}`);

        result.titleChange = {
          type: 'TITLE_CHANGE',
          organization: org,
          newChampion: winner.name,
          formerChampion: loser.name
        };
      }
    }
  }

  /**
   * Run multiple fights in batch using full simulation engine
   * @param {Object[]} fightCards - Array of fight configurations
   * @returns {Promise<Object[]>} Array of fight results
   */
  async runFightsBatch(fightCards) {
    const results = [];

    // Run fights sequentially to avoid overwhelming memory
    // Each fight uses the full SimulationLoop combat engine
    for (const card of fightCards) {
      const result = await this.runFight(card);
      if (!result.cancelled) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run multiple fights in parallel (faster but uses more memory)
   * @param {Object[]} fightCards - Array of fight configurations
   * @returns {Promise<Object[]>} Array of fight results
   */
  async runFightsBatchParallel(fightCards) {
    const promises = fightCards.map(card => this.runFight(card));
    const results = await Promise.all(promises);
    return results.filter(r => !r.cancelled);
  }
}

export default FightIntegration;
