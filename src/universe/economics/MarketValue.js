/**
 * Market Value Calculator
 * Calculates fighter worth for purse negotiations, contracts, and fight economics
 * Range: $10,000 (club fighter) to $50,000,000+ (superstar)
 */

export class MarketValue {
  // Tier multipliers for base value calculation
  static TIER_MULTIPLIERS = {
    GENERATIONAL: 100,
    ELITE: 50,
    WORLD_CLASS: 20,
    CONTENDER: 8,
    GATEKEEPER: 3,
    JOURNEYMAN: 1.5,
    CLUB: 1
  };

  /**
   * Calculate a fighter's market value (what they can command in purses)
   * @param {UniverseFighter} fighter - The fighter to evaluate
   * @param {Universe} universe - The universe context (optional, for additional factors)
   * @returns {number} Market value in dollars
   */
  static calculate(fighter, universe = null) {
    let baseValue = 10000;

    // 1. Talent tier multiplier
    const tierMultiplier = this.TIER_MULTIPLIERS[fighter.potential?.tier] || 1;
    baseValue *= tierMultiplier;

    // 2. Championship bonus (2-5x for current champions)
    const activeTitles = fighter.career?.titles?.filter(t => !t.lostDate) || [];
    if (activeTitles.length > 0) {
      baseValue *= 2 + (activeTitles.length * 0.5);
    }

    // 3. Popularity multiplier (1-10x based on 0-100 popularity)
    const popularity = fighter.career?.popularity || 50;
    const popMultiplier = 1 + (popularity / 100) * 9;
    baseValue *= popMultiplier;

    // 4. Win streak bonus (up to 2x for long streaks)
    const consecutiveWins = fighter.career?.consecutiveWins || 0;
    baseValue *= 1 + Math.min(1, consecutiveWins * 0.1);

    // 5. KO percentage bonus (exciting fighters worth more)
    const koRate = fighter.getKOPercentage?.() || 0;
    baseValue *= 1 + (koRate / 100) * 0.5;

    // 6. Record quality factor
    const winPct = fighter.getWinPercentage?.() || 50;
    baseValue *= 0.5 + (winPct / 100) * 0.5;

    // 7. UNDEFEATED BONUS - The "0" is sacred in boxing
    const losses = fighter.career?.record?.losses || 0;
    const wins = fighter.career?.record?.wins || 0;

    if (losses === 0 && wins > 0) {
      // Undefeated bonus scales dramatically with wins
      if (wins >= 25) {
        baseValue *= 3.0;        // Major star, possible ATG
      } else if (wins >= 20) {
        baseValue *= 2.5;        // Proven undefeated star
      } else if (wins >= 15) {
        baseValue *= 2.0;        // Serious undefeated prospect
      } else if (wins >= 10) {
        baseValue *= 1.7;        // Undefeated with real record
      } else if (wins >= 5) {
        baseValue *= 1.4;        // Building undefeated record
      } else {
        baseValue *= 1.2;        // Early undefeated fighter
      }
    } else if (losses === 1 && wins >= 15) {
      // Single loss but still very marketable
      baseValue *= 1.4;
    } else if (losses === 1 && wins >= 10) {
      baseValue *= 1.3;
    } else if (losses <= 2 && wins >= 20) {
      // Very few losses with substantial wins
      baseValue *= 1.2;
    }

    // 8. Decline penalty
    if (fighter.career?.phase === 'DECLINE') {
      baseValue *= 0.6;
    }

    // 9. Activity penalty (long inactive fighters worth less)
    const weeksInactive = fighter.career?.weeksInactive || 0;
    if (weeksInactive > 52) {
      baseValue *= Math.max(0.5, 1 - (weeksInactive - 52) * 0.01);
    }

    // 10. Loss streak penalty
    const consecutiveLosses = fighter.career?.consecutiveLosses || 0;
    if (consecutiveLosses > 0) {
      baseValue *= Math.max(0.3, 1 - consecutiveLosses * 0.15);
    }

    return Math.round(baseValue);
  }

  /**
   * Calculate PPV draw potential (0-100)
   * Measures how many viewers a fighter can attract
   * @param {UniverseFighter} fighter - The fighter to evaluate
   * @returns {number} PPV draw rating 0-100
   */
  static calculatePPVDraw(fighter) {
    let draw = fighter.career?.popularity || 50;

    // Champions are automatic draws
    const activeTitles = fighter.career?.titles?.filter(t => !t.lostDate) || [];
    if (activeTitles.length > 0) {
      draw += 15 + (activeTitles.length * 5); // More titles = bigger draw
    }

    // KO artists draw viewers
    const koRate = fighter.getKOPercentage?.() || 0;
    draw += (koRate / 100) * 15;

    // Win streaks build interest
    const consecutiveWins = fighter.career?.consecutiveWins || 0;
    draw += Math.min(15, consecutiveWins * 3);

    // Undefeated fighters are special draws
    const losses = fighter.career?.record?.losses || 0;
    const wins = fighter.career?.record?.wins || 0;
    if (losses === 0 && wins >= 10) {
      draw += 10;
    }

    // High-tier talent draws more
    const tierBonus = {
      GENERATIONAL: 15,
      ELITE: 10,
      WORLD_CLASS: 5,
      CONTENDER: 2
    };
    draw += tierBonus[fighter.potential?.tier] || 0;

    return Math.min(100, Math.max(0, draw));
  }

  /**
   * Calculate the combined draw of two fighters (for a matchup)
   * @param {UniverseFighter} fighterA
   * @param {UniverseFighter} fighterB
   * @returns {number} Combined draw 0-100
   */
  static calculateCombinedDraw(fighterA, fighterB) {
    const drawA = this.calculatePPVDraw(fighterA);
    const drawB = this.calculatePPVDraw(fighterB);

    // Average draw with bonus for both being high
    let combined = (drawA + drawB) / 2;

    // Synergy bonus if both fighters are draws
    if (drawA > 60 && drawB > 60) {
      combined += 10;
    }

    return Math.min(100, combined);
  }

  /**
   * Calculate purse split ratio for a fight
   * The bigger star typically gets more
   * @param {UniverseFighter} fighterA
   * @param {UniverseFighter} fighterB
   * @returns {Object} { fighterA: ratio, fighterB: ratio }
   */
  static calculatePurseSplit(fighterA, fighterB) {
    const valueA = this.calculate(fighterA);
    const valueB = this.calculate(fighterB);
    const total = valueA + valueB;

    // A-side vs B-side split
    // Minimum 30% for B-side
    let ratioA = valueA / total;
    let ratioB = valueB / total;

    // Enforce minimums
    if (ratioA < 0.3) {
      ratioA = 0.3;
      ratioB = 0.7;
    } else if (ratioB < 0.3) {
      ratioB = 0.3;
      ratioA = 0.7;
    }

    return {
      fighterA: ratioA,
      fighterB: ratioB,
      aSide: valueA > valueB ? 'fighterA' : 'fighterB'
    };
  }

  /**
   * Get a descriptive tier for the market value
   * @param {number} value - Market value in dollars
   * @returns {string} Tier description
   */
  static getValueTier(value) {
    if (value >= 20000000) return 'SUPERSTAR';
    if (value >= 10000000) return 'MEGA_STAR';
    if (value >= 5000000) return 'STAR';
    if (value >= 1000000) return 'HEADLINER';
    if (value >= 500000) return 'MAIN_EVENT';
    if (value >= 100000) return 'CO_MAIN';
    if (value >= 50000) return 'UNDERCARD';
    if (value >= 20000) return 'PRELIM';
    return 'CLUB';
  }

  /**
   * Format market value as readable string
   * @param {number} value - Market value in dollars
   * @returns {string} Formatted string (e.g., "$1.5M")
   */
  static formatValue(value) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  }
}

export default MarketValue;
