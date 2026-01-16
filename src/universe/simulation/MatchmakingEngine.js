/**
 * Matchmaking Engine
 * Handles fight scheduling, matchups, and card creation for the universe
 * Integrates economic considerations: market value, ducking behavior, money fights
 */

import { CareerPhase } from '../models/UniverseFighter.js';
import { ChampionBehavior } from '../ai/ChampionBehavior.js';
import { MoneyFightEngine } from '../economics/MoneyFightEngine.js';
import { FightEconomics } from '../economics/FightEconomics.js';
import { MarketValue } from '../economics/MarketValue.js';
import { Manager } from '../models/Manager.js';

// Fight types
export const FightType = {
  CLUB: 'CLUB',               // Local/small venue fights
  UNDERCARD: 'UNDERCARD',     // Supporting fights on bigger cards
  MAIN_EVENT: 'MAIN_EVENT',   // Headliner non-title
  ELIMINATOR: 'ELIMINATOR',   // Title eliminator
  TITLE_FIGHT: 'TITLE_FIGHT', // Championship bout
  UNIFICATION: 'UNIFICATION'  // Multiple titles on the line
};

// Matchup quality ratings
export const MatchupQuality = {
  MISMATCH: 'MISMATCH',       // One-sided, bad for sport
  DEVELOPMENTAL: 'DEVELOPMENTAL', // Prospect vs journeyman
  COMPETITIVE: 'COMPETITIVE', // Good, even matchup
  COMPELLING: 'COMPELLING',   // Great stylistic matchup
  SUPERFIGHT: 'SUPERFIGHT'    // Elite vs elite
};

export class MatchmakingEngine {
  constructor(universe) {
    this.universe = universe;
    this.managers = universe.managers || new Map();
  }

  /**
   * Get or create a manager for a fighter
   * @param {UniverseFighter} fighter
   * @returns {Manager}
   */
  getManagerForFighter(fighter) {
    // Check if fighter has an assigned manager
    const managerId = fighter.relationships?.manager;
    if (managerId && this.managers.has(managerId)) {
      return this.managers.get(managerId);
    }

    // Create a default manager based on fighter tier
    // In a full implementation, managers would be persistent entities
    const defaultManager = new Manager({
      personality: {
        ethics: 50,
        greed: 50,
        patience: 50,
        ambition: 50
      }
    });

    return defaultManager;
  }

  /**
   * Check if fighter is ready to fight based on manager policy
   * @param {UniverseFighter} fighter
   * @returns {boolean}
   */
  isFighterReadyByManager(fighter) {
    const manager = this.getManagerForFighter(fighter);
    return manager.isReadyToFight(fighter);
  }

  /**
   * Check manager approval for a fight
   * @param {UniverseFighter} fighter
   * @param {UniverseFighter} opponent
   * @param {string} fightType
   * @returns {Object} { approved: boolean, reason: string }
   */
  checkManagerApproval(fighter, opponent, fightType) {
    const manager = this.getManagerForFighter(fighter);
    const evaluation = manager.evaluateFight(fighter, opponent, fightType, this.universe);

    return {
      approved: evaluation.accept,
      reason: evaluation.reason,
      mentality: manager.getMentalityForFighter(fighter)
    };
  }

  /**
   * Get fight frequency limits for a fighter
   * @param {UniverseFighter} fighter
   * @returns {Object} { minWeeks, maxFightsPerYear }
   */
  getFighterFrequency(fighter) {
    const manager = this.getManagerForFighter(fighter);
    return manager.getFightFrequency(fighter);
  }

  /**
   * Generate fights for a week
   * Returns scheduled fight cards
   * Now respects manager fight frequency based on fighter mentality
   */
  generateWeeklyFights() {
    const fights = [];
    // Filter fighters based on manager's fight frequency policy
    const activeFighters = this.universe.getActiveFighters()
      .filter(f => f.canFight() && this.isFighterReadyByManager(f));

    // Group by division
    const byDivision = new Map();
    for (const fighter of activeFighters) {
      const div = this.universe.getDivisionForWeight(fighter.physical.weight);
      if (!div) continue;

      if (!byDivision.has(div.name)) {
        byDivision.set(div.name, []);
      }
      byDivision.get(div.name).push(fighter);
    }

    // Generate fights for each division
    for (const [divisionName, fighters] of byDivision) {
      const divisionFights = this.generateDivisionFights(divisionName, fighters);
      fights.push(...divisionFights);
    }

    return fights;
  }

  /**
   * Generate fights for a specific division
   */
  generateDivisionFights(divisionName, availableFighters) {
    const fights = [];
    const used = new Set();
    const _division = this.universe.divisions.get(divisionName); // Division available for future use

    // Shuffle fighters for variety
    const shuffled = [...availableFighters].sort(() => Math.random() - 0.5);

    // 1. Check for title fights first
    const titleFights = this.generateTitleFights(divisionName, shuffled, used);
    fights.push(...titleFights);

    // 2. Generate ranked vs ranked fights
    const rankedFights = this.generateRankedFights(divisionName, shuffled, used);
    fights.push(...rankedFights);

    // 3. Generate prospect development fights
    const devFights = this.generateDevelopmentFights(shuffled, used);
    fights.push(...devFights);

    // 4. Fill remaining with club fights
    const clubFights = this.generateClubFights(shuffled, used);
    fights.push(...clubFights);

    return fights;
  }

  /**
   * Generate title fights for sanctioning bodies
   * Now includes ducking behavior and financial considerations
   */
  generateTitleFights(divisionName, fighters, used) {
    const fights = [];
    const bodies = this.universe.getAllSanctioningBodies();

    for (const body of bodies) {
      const champId = body.getChampion(divisionName);

      if (!champId) {
        // Vacant title - #1 vs #2 for the belt
        const rankings = body.getRankings(divisionName);
        if (rankings.length >= 2) {
          const fighter1 = this.universe.fighters.get(rankings[0]);
          const fighter2 = this.universe.fighters.get(rankings[1]);

          if (fighter1 && fighter2 &&
              fighter1.canFight() && fighter2.canFight() &&
              !used.has(fighter1.id) && !used.has(fighter2.id)) {

            // Only ~20% chance per week of scheduling a vacant title fight
            if (Math.random() < 0.2) {
              const economics = this.calculateFightEconomics(fighter1, fighter2, FightType.TITLE_FIGHT, divisionName);

              fights.push({
                fighterA: fighter1.id,
                fighterB: fighter2.id,
                division: divisionName,
                type: FightType.TITLE_FIGHT,
                titleInfo: {
                  organization: body.shortName,
                  isVacant: true
                },
                rounds: 12,
                quality: this.assessMatchupQuality(fighter1, fighter2),
                economics
              });
              used.add(fighter1.id);
              used.add(fighter2.id);
            }
          }
        }
      } else {
        // Champion exists - check for mandatory or voluntary defense
        const champ = this.universe.fighters.get(champId);
        if (!champ || !champ.canFight() || used.has(champId)) continue;

        // Check if champion is inactive too long
        if (champ.career.weeksInactive < 8) continue;

        // Get available challengers
        const rankings = body.getRankings(divisionName);
        const availableChallengers = rankings
          .map(id => this.universe.fighters.get(id))
          .filter(f => f && f.canFight() && !used.has(f.id) && f.id !== champId);

        if (availableChallengers.length === 0) continue;

        // Check mandatory status
        const weeksSinceDefense = this.getWeeksSinceLastDefense(champ);
        const mandatoryCheck = ChampionBehavior.shouldTakeMandatory(
          champ,
          availableChallengers[0],
          weeksSinceDefense,
          this.universe
        );

        let selectedChallenger;
        let fightInfo = {
          forced: false,
          ducked: null,
          reason: null
        };

        if (mandatoryCheck.required) {
          // Forced mandatory defense
          selectedChallenger = availableChallengers[0];
          fightInfo.forced = true;
          fightInfo.reason = mandatoryCheck.reason;
        } else {
          // Champion gets to choose (with ducking behavior)
          const selection = ChampionBehavior.selectPreferredOpponent(
            champ,
            availableChallengers,
            this.universe
          );

          if (selection) {
            selectedChallenger = selection.selected;
            fightInfo.ducked = selection.analysis.duckingChance > 50 ?
              availableChallengers[0]?.name : null;
            fightInfo.reason = selection.analysis.reason;
          } else {
            selectedChallenger = availableChallengers[0];
          }
        }

        if (selectedChallenger && !used.has(selectedChallenger.id)) {
          // ~15% chance per week of title defense
          if (Math.random() < 0.15) {
            const economics = this.calculateFightEconomics(champ, selectedChallenger, FightType.TITLE_FIGHT, divisionName);

            fights.push({
              fighterA: champ.id,
              fighterB: selectedChallenger.id,
              division: divisionName,
              type: FightType.TITLE_FIGHT,
              titleInfo: {
                organization: body.shortName,
                isVacant: false,
                defenseNumber: this.getTitleDefenseCount(body, divisionName, champId) + 1,
                ...fightInfo
              },
              rounds: 12,
              quality: this.assessMatchupQuality(champ, selectedChallenger),
              economics
            });
            used.add(champ.id);
            used.add(selectedChallenger.id);
          }
        }
      }
    }

    return fights;
  }

  /**
   * Get weeks since champion's last title defense
   */
  getWeeksSinceLastDefense(champion) {
    const titleFights = champion.fightHistory?.filter(f => f.wasTitle) || [];
    if (titleFights.length === 0) return 52; // Never defended

    const lastDefense = titleFights[titleFights.length - 1];
    if (!lastDefense.date || !this.universe.currentDate) return 52;

    const defenseWeeks = lastDefense.date.year * 52 + lastDefense.date.week;
    const currentWeeks = this.universe.currentDate.year * 52 + this.universe.currentDate.week;

    return currentWeeks - defenseWeeks;
  }

  /**
   * Calculate fight economics for scheduling decisions
   */
  calculateFightEconomics(fighterA, fighterB, fightType, divisionName = null) {
    try {
      // Get division name from fighters if not provided
      const division = divisionName ||
        this.universe.getDivisionForWeight(fighterA.physical.weight)?.name ||
        'Heavyweight';

      // Get era options from universe
      const options = this.universe.getEconomicsOptions(division);

      const revenue = FightEconomics.calculateRevenue(fighterA, fighterB, fightType, null, options);
      const expenses = FightEconomics.calculateExpenses(fighterA, fighterB, fightType, null, options);

      return {
        projectedRevenue: revenue.total,
        projectedExpenses: expenses.total,
        projectedProfit: revenue.total - expenses.total,
        isPPV: revenue.isPPV,
        ppvBuys: revenue.ppvBuys,
        purseA: expenses.purseA,
        purseB: expenses.purseB,
        marketValueA: MarketValue.calculate(fighterA),
        marketValueB: MarketValue.calculate(fighterB)
      };
    } catch {
      return null;
    }
  }

  /**
   * Identify money fights available in the universe
   */
  identifyMoneyFights() {
    return MoneyFightEngine.identifyMoneyFights(this.universe);
  }

  /**
   * Get title defense count for a champion
   */
  getTitleDefenseCount(body, division, champId) {
    const history = body.getTitleHistory(division);
    const currentReign = history.find(h => h.fighterId === champId && !h.endDate);
    return currentReign?.defenses || 0;
  }

  /**
   * Generate ranked fighter matchups
   * Uses manager approval to determine if fighters will accept
   */
  generateRankedFights(divisionName, _fighters, used) {
    const fights = [];
    const division = this.universe.divisions.get(divisionName);
    if (!division) return fights;

    // Use manager readiness instead of fixed weeks
    const rankedFighters = division.rankings
      .map(id => this.universe.fighters.get(id))
      .filter(f => f && f.canFight() && !used.has(f.id) && this.isFighterReadyByManager(f));

    // Pair up ranked fighters with manager approval
    for (let i = 0; i < rankedFighters.length - 1; i += 2) {
      const fighterA = rankedFighters[i];
      const fighterB = rankedFighters[i + 1];

      if (!fighterA || !fighterB) continue;
      if (used.has(fighterA.id) || used.has(fighterB.id)) continue;

      // Check manager approval
      const approvalA = this.checkManagerApproval(fighterA, fighterB, FightType.MAIN_EVENT);
      const approvalB = this.checkManagerApproval(fighterB, fighterA, FightType.MAIN_EVENT);

      if (!approvalA.approved || !approvalB.approved) continue;

      // ~25% chance per available pair
      if (Math.random() < 0.25) {
        fights.push({
          fighterA: fighterA.id,
          fighterB: fighterB.id,
          division: divisionName,
          type: FightType.MAIN_EVENT,
          rounds: 10,
          quality: this.assessMatchupQuality(fighterA, fighterB),
          managerInfo: {
            mentalityA: approvalA.mentality,
            mentalityB: approvalB.mentality
          }
        });
        used.add(fighterA.id);
        used.add(fighterB.id);
      }
    }

    return fights;
  }

  /**
   * Generate development fights (prospects vs journeymen)
   * Now respects manager approval for protective/development mentalities
   */
  generateDevelopmentFights(availableFighters, used) {
    const fights = [];

    const prospects = availableFighters.filter(f =>
      !used.has(f.id) &&
      f.canFight() &&
      this.isFighterReadyByManager(f) &&
      (f.career.phase === CareerPhase.PRO_DEBUT || f.career.phase === CareerPhase.RISING) &&
      (f.potential.tier === 'WORLD_CLASS' || f.potential.tier === 'ELITE' || f.potential.tier === 'GENERATIONAL' || f.potential.tier === 'CONTENDER')
    );

    const journeymen = availableFighters.filter(f =>
      !used.has(f.id) &&
      f.canFight() &&
      this.isFighterReadyByManager(f) &&
      (f.potential.tier === 'JOURNEYMAN' || f.potential.tier === 'CLUB')
    );

    // Match prospects against journeymen with manager approval
    for (const prospect of prospects) {
      if (used.has(prospect.id)) continue;

      // Find a suitable journeyman in similar weight range
      // Check manager approval for the prospect side
      for (const journeyman of journeymen) {
        if (used.has(journeyman.id)) continue;
        if (Math.abs(journeyman.physical.weight - prospect.physical.weight) >= 5) continue;

        // Check if prospect's manager approves
        const prospectApproval = this.checkManagerApproval(prospect, journeyman, FightType.UNDERCARD);
        // Check if journeyman's manager approves
        const journeymanApproval = this.checkManagerApproval(journeyman, prospect, FightType.UNDERCARD);

        if (prospectApproval.approved && journeymanApproval.approved) {
          // ~40% chance per available prospect
          if (Math.random() < 0.40) {
            fights.push({
              fighterA: prospect.id,
              fighterB: journeyman.id,
              division: this.universe.getDivisionForWeight(prospect.physical.weight)?.name,
              type: FightType.UNDERCARD,
              rounds: 6,
              quality: MatchupQuality.DEVELOPMENTAL,
              managerInfo: {
                prospectMentality: prospectApproval.mentality,
                journeymanMentality: journeymanApproval.mentality
              }
            });
            used.add(prospect.id);
            used.add(journeyman.id);
            break; // Move to next prospect
          }
        }
      }
    }

    return fights;
  }

  /**
   * Generate club-level fights
   * Tomato cans and journeymen fight more frequently (AGGRESSIVE/EXPLOITATIVE mentality)
   */
  generateClubFights(availableFighters, used) {
    const fights = [];

    // Filter by manager readiness, not fixed weeks
    const available = availableFighters.filter(f =>
      !used.has(f.id) &&
      f.canFight() &&
      this.isFighterReadyByManager(f)
    );

    // Randomly pair up remaining fighters
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const fighterA = shuffled[i];
      const fighterB = shuffled[i + 1];

      if (used.has(fighterA.id) || used.has(fighterB.id)) continue;

      // Check weight compatibility (within 5kg)
      if (Math.abs(fighterA.physical.weight - fighterB.physical.weight) > 5) continue;

      // Check manager approval for both sides
      const approvalA = this.checkManagerApproval(fighterA, fighterB, FightType.CLUB);
      const approvalB = this.checkManagerApproval(fighterB, fighterA, FightType.CLUB);

      if (!approvalA.approved || !approvalB.approved) continue;

      // ~30% chance per pair (higher for AGGRESSIVE/EXPLOITATIVE fighters)
      let fightChance = 0.30;
      if (approvalA.mentality === 'AGGRESSIVE' || approvalA.mentality === 'EXPLOITATIVE') {
        fightChance += 0.15;
      }
      if (approvalB.mentality === 'AGGRESSIVE' || approvalB.mentality === 'EXPLOITATIVE') {
        fightChance += 0.15;
      }

      if (Math.random() < fightChance) {
        fights.push({
          fighterA: fighterA.id,
          fighterB: fighterB.id,
          division: this.universe.getDivisionForWeight(fighterA.physical.weight)?.name,
          type: FightType.CLUB,
          rounds: 4,
          quality: this.assessMatchupQuality(fighterA, fighterB),
          managerInfo: {
            mentalityA: approvalA.mentality,
            mentalityB: approvalB.mentality
          }
        });
        used.add(fighterA.id);
        used.add(fighterB.id);
      }
    }

    return fights;
  }

  /**
   * Assess the quality of a matchup
   */
  assessMatchupQuality(fighterA, fighterB) {
    const tierRanks = {
      'GENERATIONAL': 7,
      'ELITE': 6,
      'WORLD_CLASS': 5,
      'CONTENDER': 4,
      'GATEKEEPER': 3,
      'JOURNEYMAN': 2,
      'CLUB': 1
    };

    const tierA = tierRanks[fighterA.potential.tier] || 2;
    const tierB = tierRanks[fighterB.potential.tier] || 2;
    const diff = Math.abs(tierA - tierB);

    if (diff >= 3) return MatchupQuality.MISMATCH;
    if (diff >= 2) return MatchupQuality.DEVELOPMENTAL;

    // Both high level
    if (tierA >= 5 && tierB >= 5) return MatchupQuality.SUPERFIGHT;
    if (tierA >= 4 && tierB >= 4) return MatchupQuality.COMPELLING;

    return MatchupQuality.COMPETITIVE;
  }

  /**
   * Calculate fight rounds based on fight type and fighter experience
   */
  calculateRounds(fightType, fighterA, fighterB) {
    switch (fightType) {
      case FightType.TITLE_FIGHT:
      case FightType.UNIFICATION:
        return 12;
      case FightType.ELIMINATOR:
      case FightType.MAIN_EVENT:
        return 10;
      case FightType.UNDERCARD:
        return 8;
      case FightType.CLUB:
      default:
        // Newer fighters get shorter fights
        const totalFights =
          (fighterA.career.record.wins + fighterA.career.record.losses) +
          (fighterB.career.record.wins + fighterB.career.record.losses);
        if (totalFights < 10) return 4;
        if (totalFights < 20) return 6;
        return 8;
    }
  }
}

export default MatchmakingEngine;
