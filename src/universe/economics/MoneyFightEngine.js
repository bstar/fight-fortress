/**
 * Money Fight Engine
 * Identifies and evaluates high-value matchups in the boxing universe
 * Finds unification bouts, rivalry fights, crossover matchups, and legacy fights
 */

import { MarketValue } from './MarketValue.js';
import { FightEconomics, FightPosition } from './FightEconomics.js';
import { EraConfig } from './EraConfig.js';

// Money fight classification
export const MoneyFightType = {
  MEGA_FIGHT: 'MEGA_FIGHT',           // $30M+ revenue potential
  SUPER_FIGHT: 'SUPER_FIGHT',         // $15-30M revenue
  BIG_FIGHT: 'BIG_FIGHT',             // $5-15M revenue
  GOOD_FIGHT: 'GOOD_FIGHT'            // $2-5M revenue (marketable but not huge)
};

// Special fight narratives that increase value
export const FightNarrative = {
  UNIFICATION: 'UNIFICATION',         // Two champions fighting
  RIVALRY: 'RIVALRY',                 // Known rivalry/bad blood
  REMATCH: 'REMATCH',                 // Previous fight between them
  GENERATIONAL: 'GENERATIONAL',       // Young star vs legend
  UNDEFEATED_VS_UNDEFEATED: 'UNDEFEATED_VS_UNDEFEATED',
  COMEBACK: 'COMEBACK',               // Former champ returning
  CROSSOVER: 'CROSSOVER'              // Cross-division fight
};

export class MoneyFightEngine {
  // Minimum combined draw for money fight status
  // Raised from 65 to 75 to be more selective about "money fights"
  static MONEY_FIGHT_THRESHOLD = 75;

  /**
   * Identify all potential money fights in the universe
   * @param {Universe} universe
   * @returns {Array} Sorted list of money fight opportunities
   */
  static identifyMoneyFights(universe) {
    const moneyFights = [];
    const fighters = Array.from(universe.fighters.values())
      .filter(f => f.career?.phase !== 'RETIRED' && f.canFight?.());

    // Group fighters by division for efficiency
    const byDivision = new Map();
    for (const fighter of fighters) {
      const division = fighter.physical?.weight ?
        this.getWeightClass(fighter.physical.weight) : 'Heavyweight';

      if (!byDivision.has(division)) {
        byDivision.set(division, []);
      }
      byDivision.get(division).push(fighter);
    }

    // Check pairings within same division
    for (const [division, divisionFighters] of byDivision) {
      for (let i = 0; i < divisionFighters.length; i++) {
        for (let j = i + 1; j < divisionFighters.length; j++) {
          const evaluation = this.evaluateMoneyFight(
            divisionFighters[i],
            divisionFighters[j],
            universe
          );

          if (evaluation.isMoneyFight) {
            moneyFights.push({
              fighterA: divisionFighters[i],
              fighterB: divisionFighters[j],
              division,
              ...evaluation
            });
          }
        }
      }
    }

    // Check cross-division superfights (champions only)
    const champions = fighters.filter(f =>
      f.career?.titles?.some(t => !t.lostDate)
    );

    for (let i = 0; i < champions.length; i++) {
      for (let j = i + 1; j < champions.length; j++) {
        const divA = this.getWeightClass(champions[i].physical?.weight || 200);
        const divB = this.getWeightClass(champions[j].physical?.weight || 200);

        // Only adjacent divisions for crossover
        if (this.areAdjacentDivisions(divA, divB)) {
          const evaluation = this.evaluateMoneyFight(
            champions[i],
            champions[j],
            universe
          );

          if (evaluation.isMoneyFight) {
            evaluation.narratives.push(FightNarrative.CROSSOVER);
            evaluation.adjustedDraw += 10;

            moneyFights.push({
              fighterA: champions[i],
              fighterB: champions[j],
              division: 'Crossover',
              isCrossover: true,
              ...evaluation
            });
          }
        }
      }
    }

    // Sort by projected revenue
    moneyFights.sort((a, b) => b.projectedRevenue - a.projectedRevenue);

    return moneyFights;
  }

  /**
   * Evaluate if a specific matchup qualifies as a money fight
   * @param {UniverseFighter} fighterA
   * @param {UniverseFighter} fighterB
   * @param {Universe} universe
   * @returns {Object} Money fight evaluation
   */
  static evaluateMoneyFight(fighterA, fighterB, universe = null) {
    // Base draw power
    const drawA = MarketValue.calculatePPVDraw(fighterA);
    const drawB = MarketValue.calculatePPVDraw(fighterB);
    const combinedDraw = (drawA + drawB) / 2;

    // Identify special narratives
    const narratives = this.identifyNarratives(fighterA, fighterB, universe);

    // Calculate draw bonuses from narratives
    let drawBonus = 0;
    const narrativeValues = {
      [FightNarrative.UNIFICATION]: 20,
      [FightNarrative.RIVALRY]: 15,
      [FightNarrative.UNDEFEATED_VS_UNDEFEATED]: 15,
      [FightNarrative.GENERATIONAL]: 12,
      [FightNarrative.REMATCH]: 10,
      [FightNarrative.COMEBACK]: 8,
      [FightNarrative.CROSSOVER]: 10
    };

    for (const narrative of narratives) {
      drawBonus += narrativeValues[narrative] || 0;
    }

    const adjustedDraw = Math.min(100, combinedDraw + drawBonus);

    // Determine if it's a money fight
    const isMoneyFight = adjustedDraw >= this.MONEY_FIGHT_THRESHOLD;

    // Get era-based economics options from universe
    const division = universe?.getDivisionForWeight?.(fighterA.physical?.weight)?.name;
    const economicsOptions = universe?.getEconomicsOptions?.(division) || {};
    const year = universe?.getCurrentYear?.() || 2020;

    // Calculate projected revenue
    const revenue = FightEconomics.calculateRevenue(
      fighterA,
      fighterB,
      FightPosition.TITLE_FIGHT,
      null,
      economicsOptions
    );

    // Classify the fight (adjusted for era)
    const classification = this.classifyMoneyFight(revenue.total, year);

    // Generate promotional angles
    const promotionalAngles = this.generatePromotionalAngles(
      fighterA, fighterB, narratives
    );

    return {
      isMoneyFight,
      combinedDraw: Math.round(combinedDraw),
      adjustedDraw: Math.round(adjustedDraw),
      drawBonus,
      narratives,
      classification,
      projectedRevenue: revenue.total,
      ppvProjection: revenue.ppv,
      ppvBuysEstimate: revenue.ppvBuys,
      promotionalAngles,
      marketAnalysis: {
        fighterADraw: drawA,
        fighterBDraw: drawB,
        fighterAValue: MarketValue.calculate(fighterA),
        fighterBValue: MarketValue.calculate(fighterB)
      }
    };
  }

  /**
   * Identify special narratives for a matchup
   */
  static identifyNarratives(fighterA, fighterB, universe = null) {
    const narratives = [];

    // Check for unification
    if (this.isUnificationFight(fighterA, fighterB)) {
      narratives.push(FightNarrative.UNIFICATION);
    }

    // Check for rivalry
    if (this.isRivalryFight(fighterA, fighterB, universe)) {
      narratives.push(FightNarrative.RIVALRY);
    }

    // Check for rematch
    if (this.isRematch(fighterA, fighterB)) {
      narratives.push(FightNarrative.REMATCH);
    }

    // Check for generational clash
    if (this.isGenerationalClash(fighterA, fighterB, universe)) {
      narratives.push(FightNarrative.GENERATIONAL);
    }

    // Check for undefeated vs undefeated
    if (this.isUndefeatedVsUndefeated(fighterA, fighterB)) {
      narratives.push(FightNarrative.UNDEFEATED_VS_UNDEFEATED);
    }

    // Check for comeback
    if (this.isComebackFight(fighterA) || this.isComebackFight(fighterB)) {
      narratives.push(FightNarrative.COMEBACK);
    }

    return narratives;
  }

  /**
   * Check if fight is a unification bout
   */
  static isUnificationFight(fighterA, fighterB) {
    const aTitles = fighterA.career?.titles?.filter(t => !t.lostDate) || [];
    const bTitles = fighterB.career?.titles?.filter(t => !t.lostDate) || [];

    return aTitles.length > 0 && bTitles.length > 0;
  }

  /**
   * Check if fighters have a rivalry
   */
  static isRivalryFight(fighterA, fighterB, universe = null) {
    // Check explicit rival lists
    if (fighterA.relationships?.rivals?.includes(fighterB.id) ||
        fighterB.relationships?.rivals?.includes(fighterA.id)) {
      return true;
    }

    // Check universe active rivalries
    if (universe?.activeRivalries) {
      return universe.activeRivalries.some(r =>
        !r.resolved &&
        ((r.fighterA === fighterA.id && r.fighterB === fighterB.id) ||
         (r.fighterA === fighterB.id && r.fighterB === fighterA.id))
      );
    }

    // Organic rivalry: same ranking tier, both on win streaks
    const rankA = fighterA.career?.rankings?.current;
    const rankB = fighterB.career?.rankings?.current;
    const bothRanked = rankA && rankB;
    const closeRanking = bothRanked && Math.abs(rankA - rankB) <= 3;
    const bothWinning = (fighterA.career?.consecutiveWins || 0) >= 3 &&
                        (fighterB.career?.consecutiveWins || 0) >= 3;

    return closeRanking && bothWinning;
  }

  /**
   * Check if this is a rematch
   */
  static isRematch(fighterA, fighterB) {
    const aHistory = fighterA.fightHistory || [];
    return aHistory.some(f => f.opponent === fighterB.id);
  }

  /**
   * Check if this is a generational clash (legend vs rising star)
   */
  static isGenerationalClash(fighterA, fighterB, universe = null) {
    if (!universe?.currentDate) return false;

    const ageA = fighterA.getAge?.(universe.currentDate) || 30;
    const ageB = fighterB.getAge?.(universe.currentDate) || 30;
    const ageDiff = Math.abs(ageA - ageB);

    if (ageDiff < 8) return false;

    // Older fighter must be established (champ or former champ)
    const older = ageA > ageB ? fighterA : fighterB;
    const younger = ageA > ageB ? fighterB : fighterA;

    const olderIsLegend = (older.career?.titles?.length || 0) > 0 ||
                          (older.career?.record?.wins || 0) >= 30;
    const youngerIsRising = (younger.career?.consecutiveWins || 0) >= 5 ||
                            younger.potential?.tier === 'GENERATIONAL' ||
                            younger.potential?.tier === 'ELITE';

    return olderIsLegend && youngerIsRising;
  }

  /**
   * Check if both fighters are undefeated
   */
  static isUndefeatedVsUndefeated(fighterA, fighterB) {
    const aLosses = fighterA.career?.record?.losses || 0;
    const bLosses = fighterB.career?.record?.losses || 0;
    const aWins = fighterA.career?.record?.wins || 0;
    const bWins = fighterB.career?.record?.wins || 0;

    // Both undefeated with meaningful records
    return aLosses === 0 && bLosses === 0 && aWins >= 10 && bWins >= 10;
  }

  /**
   * Check if this is a comeback fight for a former champion
   */
  static isComebackFight(fighter) {
    const titles = fighter.career?.titles || [];
    const hasLostTitle = titles.some(t => t.lostDate);
    const hasNoCurrentTitle = !titles.some(t => !t.lostDate);
    const recentActivity = (fighter.career?.weeksInactive || 0) > 26;

    return hasLostTitle && hasNoCurrentTitle && recentActivity;
  }

  /**
   * Classify money fight by revenue tier
   * Thresholds are adjusted by era inflation multiplier
   * @param {number} revenue - Total fight revenue
   * @param {number} year - Year for era adjustment (default 2020)
   * @returns {string|null} MoneyFightType or null
   */
  static classifyMoneyFight(revenue, year = 2020) {
    const inflationMult = EraConfig.getInflationMultiplier(year);

    // Adjust thresholds by era (base thresholds are 2020s values)
    const megaThreshold = 30000000 * inflationMult;
    const superThreshold = 15000000 * inflationMult;
    const bigThreshold = 5000000 * inflationMult;
    const goodThreshold = 2000000 * inflationMult;

    if (revenue >= megaThreshold) return MoneyFightType.MEGA_FIGHT;
    if (revenue >= superThreshold) return MoneyFightType.SUPER_FIGHT;
    if (revenue >= bigThreshold) return MoneyFightType.BIG_FIGHT;
    if (revenue >= goodThreshold) return MoneyFightType.GOOD_FIGHT;
    return null;
  }

  /**
   * Generate promotional angles for marketing
   */
  static generatePromotionalAngles(fighterA, fighterB, narratives) {
    const angles = [];

    if (narratives.includes(FightNarrative.UNIFICATION)) {
      angles.push({
        headline: 'UNDISPUTED',
        tagline: 'Two champions, one throne',
        theme: 'legacy'
      });
    }

    if (narratives.includes(FightNarrative.RIVALRY)) {
      angles.push({
        headline: 'BAD BLOOD',
        tagline: 'Years of tension finally settled',
        theme: 'drama'
      });
    }

    if (narratives.includes(FightNarrative.REMATCH)) {
      angles.push({
        headline: 'REDEMPTION',
        tagline: 'The rematch the world demanded',
        theme: 'revenge'
      });
    }

    if (narratives.includes(FightNarrative.GENERATIONAL)) {
      angles.push({
        headline: 'PASSING THE TORCH',
        tagline: 'Legend meets future',
        theme: 'legacy'
      });
    }

    if (narratives.includes(FightNarrative.UNDEFEATED_VS_UNDEFEATED)) {
      angles.push({
        headline: 'ZERO MUST GO',
        tagline: 'One undefeated record will fall',
        theme: 'stakes'
      });
    }

    if (narratives.includes(FightNarrative.COMEBACK)) {
      angles.push({
        headline: 'THE RETURN',
        tagline: 'One more chapter to write',
        theme: 'narrative'
      });
    }

    if (narratives.includes(FightNarrative.CROSSOVER)) {
      angles.push({
        headline: 'SUPERFIGHT',
        tagline: 'The fight that defies weight classes',
        theme: 'spectacle'
      });
    }

    // Default angle
    if (angles.length === 0) {
      angles.push({
        headline: 'COLLISION COURSE',
        tagline: `${fighterA.name} vs ${fighterB.name}`,
        theme: 'matchup'
      });
    }

    return angles;
  }

  /**
   * Get weight class from weight
   */
  static getWeightClass(weight) {
    if (weight > 200) return 'Heavyweight';
    if (weight > 175) return 'Cruiserweight';
    if (weight > 168) return 'Light Heavyweight';
    if (weight > 160) return 'Super Middleweight';
    if (weight > 154) return 'Middleweight';
    if (weight > 147) return 'Super Welterweight';
    if (weight > 140) return 'Welterweight';
    if (weight > 135) return 'Super Lightweight';
    if (weight > 130) return 'Lightweight';
    return 'Featherweight';
  }

  /**
   * Check if two divisions are adjacent (for crossover fights)
   */
  static areAdjacentDivisions(divA, divB) {
    const order = [
      'Featherweight', 'Lightweight', 'Super Lightweight', 'Welterweight',
      'Super Welterweight', 'Middleweight', 'Super Middleweight',
      'Light Heavyweight', 'Cruiserweight', 'Heavyweight'
    ];

    const indexA = order.indexOf(divA);
    const indexB = order.indexOf(divB);

    return Math.abs(indexA - indexB) === 1;
  }

  /**
   * Get top money fights by category
   */
  static getTopMoneyFightsByCategory(moneyFights) {
    const categories = {
      unification: [],
      rivalry: [],
      generational: [],
      superfight: []
    };

    for (const fight of moneyFights) {
      if (fight.narratives.includes(FightNarrative.UNIFICATION)) {
        categories.unification.push(fight);
      }
      if (fight.narratives.includes(FightNarrative.RIVALRY)) {
        categories.rivalry.push(fight);
      }
      if (fight.narratives.includes(FightNarrative.GENERATIONAL)) {
        categories.generational.push(fight);
      }
      if (fight.isCrossover) {
        categories.superfight.push(fight);
      }
    }

    // Return top 3 from each category
    return {
      unification: categories.unification.slice(0, 3),
      rivalry: categories.rivalry.slice(0, 3),
      generational: categories.generational.slice(0, 3),
      superfight: categories.superfight.slice(0, 3)
    };
  }
}

export default MoneyFightEngine;
