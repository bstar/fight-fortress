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
  }

  /**
   * Generate fights for a week
   * Returns scheduled fight cards
   */
  generateWeeklyFights() {
    const fights = [];
    const activeFighters = this.universe.getActiveFighters()
      .filter(f => f.canFight() && f.career.weeksInactive >= 4);

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
    const division = this.universe.divisions.get(divisionName);

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
              const economics = this.calculateFightEconomics(fighter1, fighter2, FightType.TITLE_FIGHT);

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
            const economics = this.calculateFightEconomics(champ, selectedChallenger, FightType.TITLE_FIGHT);

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
  calculateFightEconomics(fighterA, fighterB, fightType) {
    try {
      const revenue = FightEconomics.calculateRevenue(fighterA, fighterB, fightType);
      const expenses = FightEconomics.calculateExpenses(fighterA, fighterB, fightType);

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
   */
  generateRankedFights(divisionName, fighters, used) {
    const fights = [];
    const division = this.universe.divisions.get(divisionName);
    if (!division) return fights;

    const rankedFighters = division.rankings
      .map(id => this.universe.fighters.get(id))
      .filter(f => f && f.canFight() && !used.has(f.id) && f.career.weeksInactive >= 6);

    // Pair up ranked fighters
    for (let i = 0; i < rankedFighters.length - 1; i += 2) {
      const fighterA = rankedFighters[i];
      const fighterB = rankedFighters[i + 1];

      if (!fighterA || !fighterB) continue;
      if (used.has(fighterA.id) || used.has(fighterB.id)) continue;

      // ~25% chance per available pair
      if (Math.random() < 0.25) {
        fights.push({
          fighterA: fighterA.id,
          fighterB: fighterB.id,
          division: divisionName,
          type: FightType.MAIN_EVENT,
          rounds: 10,
          quality: this.assessMatchupQuality(fighterA, fighterB)
        });
        used.add(fighterA.id);
        used.add(fighterB.id);
      }
    }

    return fights;
  }

  /**
   * Generate development fights (prospects vs journeymen)
   */
  generateDevelopmentFights(fighters, used) {
    const fights = [];

    const prospects = fighters.filter(f =>
      !used.has(f.id) &&
      f.canFight() &&
      f.career.weeksInactive >= 4 &&
      (f.career.phase === CareerPhase.PRO_DEBUT || f.career.phase === CareerPhase.RISING) &&
      (f.potential.tier === 'WORLD_CLASS' || f.potential.tier === 'ELITE' || f.potential.tier === 'GENERATIONAL' || f.potential.tier === 'CONTENDER')
    );

    const journeymen = fighters.filter(f =>
      !used.has(f.id) &&
      f.canFight() &&
      f.career.weeksInactive >= 3 &&
      (f.potential.tier === 'JOURNEYMAN' || f.potential.tier === 'CLUB')
    );

    // Match prospects against journeymen
    for (const prospect of prospects) {
      if (used.has(prospect.id)) continue;

      // Find a suitable journeyman in similar weight range
      const opponent = journeymen.find(j =>
        !used.has(j.id) &&
        Math.abs(j.physical.weight - prospect.physical.weight) < 5
      );

      if (opponent) {
        // ~40% chance per available prospect
        if (Math.random() < 0.40) {
          fights.push({
            fighterA: prospect.id,
            fighterB: opponent.id,
            division: this.universe.getDivisionForWeight(prospect.physical.weight)?.name,
            type: FightType.UNDERCARD,
            rounds: 6,
            quality: MatchupQuality.DEVELOPMENTAL
          });
          used.add(prospect.id);
          used.add(opponent.id);
        }
      }
    }

    return fights;
  }

  /**
   * Generate club-level fights
   */
  generateClubFights(fighters, used) {
    const fights = [];

    const available = fighters.filter(f =>
      !used.has(f.id) &&
      f.canFight() &&
      f.career.weeksInactive >= 3
    );

    // Randomly pair up remaining fighters
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const fighterA = shuffled[i];
      const fighterB = shuffled[i + 1];

      if (used.has(fighterA.id) || used.has(fighterB.id)) continue;

      // Check weight compatibility (within 5kg)
      if (Math.abs(fighterA.physical.weight - fighterB.physical.weight) > 5) continue;

      // ~30% chance per pair
      if (Math.random() < 0.30) {
        fights.push({
          fighterA: fighterA.id,
          fighterB: fighterB.id,
          division: this.universe.getDivisionForWeight(fighterA.physical.weight)?.name,
          type: FightType.CLUB,
          rounds: 4,
          quality: this.assessMatchupQuality(fighterA, fighterB)
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
