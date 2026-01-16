/**
 * Champion Behavior AI
 * Models how champions make fight selections, including "ducking" dangerous opponents
 * Factors in danger assessment, financial incentives, personality, and career phase
 */

import { MarketValue } from '../economics/MarketValue.js';
import { FightEconomics } from '../economics/FightEconomics.js';

export class ChampionBehavior {
  /**
   * Determine if champion will avoid a challenger
   * Returns ducking probability (0-1)
   * @param {UniverseFighter} champion - The current champion
   * @param {UniverseFighter} challenger - The potential challenger
   * @param {Universe} universe - Universe context
   * @returns {number} Probability of ducking (0-1)
   */
  static calculateDuckingChance(champion, challenger, universe = null) {
    // Only applies to champions
    const activeTitles = champion.career?.titles?.filter(t => !t.lostDate) || [];
    if (activeTitles.length === 0) {
      return 0;
    }

    let duckingChance = 0;

    // 1. Danger assessment (most important factor)
    const dangerRating = this.assessDanger(champion, challenger, universe);
    duckingChance += dangerRating * 0.35;

    // 2. Financial incentive to avoid
    const champValue = MarketValue.calculate(champion);
    const challengerValue = MarketValue.calculate(challenger);

    // Low-value challengers = less money, more to lose
    if (challengerValue < champValue * 0.3) {
      duckingChance += 0.15;  // "Nothing to gain"
    }

    // High-value challengers are more attractive despite danger
    if (challengerValue > champValue * 0.8) {
      duckingChance -= 0.1;  // Big payday
    }

    // 3. Personality factors
    const heart = champion.mental?.heart || 70;
    const ambition = champion.personality?.ambition || 50;
    const riskTolerance = champion.personality?.riskTolerance || 50;

    // Heart reduces ducking (brave fighters don't duck)
    duckingChance -= (heart / 100) * 0.25;

    // High ambition reduces ducking (want legacy, not just money)
    duckingChance -= (ambition / 100) * 0.15;

    // Risk tolerance affects willingness to take dangerous fights
    duckingChance -= (riskTolerance / 100) * 0.1;

    // 4. Career phase affects risk calculus
    const phase = champion.career?.phase;
    if (phase === 'DECLINE') {
      duckingChance += 0.2;  // Protect legacy in twilight
    } else if (phase === 'RISING') {
      duckingChance -= 0.1;  // Hungry to prove themselves
    } else if (phase === 'CHAMPION') {
      // Established champs vary
    }

    // 5. Recent KO loss makes them gun-shy
    const recentHistory = champion.fightHistory?.slice(-5) || [];
    const recentKOLoss = recentHistory.some(
      f => f.result === 'L' && (f.method === 'KO' || f.method === 'TKO')
    );
    if (recentKOLoss) {
      duckingChance += 0.15;
    }

    // 6. Long reign makes them protective
    const titleDefenses = this.countTitleDefenses(champion);
    if (titleDefenses >= 5) {
      duckingChance += 0.1;  // Don't want to lose legacy
    }

    // 7. Consecutive wins/losses streak
    const consecutiveLosses = champion.career?.consecutiveLosses || 0;
    if (consecutiveLosses > 0) {
      duckingChance += 0.1; // One more loss could end career
    }

    // Cap ducking chance
    return Math.max(0, Math.min(0.8, duckingChance));
  }

  /**
   * Assess how dangerous a challenger is (0-1)
   * @param {UniverseFighter} champion
   * @param {UniverseFighter} challenger
   * @param {Universe} universe
   * @returns {number} Danger rating 0-1
   */
  static assessDanger(champion, challenger, universe = null) {
    let danger = 0;

    // 1. KO power threat
    const challengerKOPower = challenger.power?.knockoutPower || 70;
    const champChin = champion.mental?.chin || 70;
    const powerVsChin = (challengerKOPower - champChin + 30) / 100;
    danger += Math.max(0, powerVsChin) * 0.25;

    // 2. Style matchup danger
    const challengerStyle = challenger.style?.primary?.toLowerCase() || '';

    // Pressure fighters are dangerous to aging champions
    if (challengerStyle.includes('swarmer') ||
        challengerStyle.includes('pressure') ||
        challengerStyle.includes('volume')) {
      danger += 0.1;

      // Even more dangerous if champion is old
      const champAge = champion.getAge?.(universe?.currentDate) || 30;
      if (champAge >= 34) {
        danger += 0.1;
      }
    }

    // Counter-punchers are dangerous to aggressive champions
    const champStyle = champion.style?.primary?.toLowerCase() || '';
    if (challengerStyle.includes('counter') &&
        (champStyle.includes('slugger') || champStyle.includes('swarmer'))) {
      danger += 0.1;
    }

    // 3. Youth advantage
    if (universe?.currentDate) {
      const champAge = champion.getAge?.(universe.currentDate) || 30;
      const challengerAge = challenger.getAge?.(universe.currentDate) || 25;
      const ageDiff = champAge - challengerAge;

      if (ageDiff > 8) danger += 0.2;
      else if (ageDiff > 5) danger += 0.15;
      else if (ageDiff > 3) danger += 0.1;
    }

    // 4. Momentum/hot streak
    const challengerStreak = challenger.career?.consecutiveWins || 0;
    if (challengerStreak > 10) danger += 0.2;
    else if (challengerStreak > 7) danger += 0.15;
    else if (challengerStreak > 5) danger += 0.1;
    else if (challengerStreak > 3) danger += 0.05;

    // 5. Undefeated challengers are psychologically scary
    const challengerLosses = challenger.career?.record?.losses || 0;
    const challengerWins = challenger.career?.record?.wins || 0;
    if (challengerLosses === 0 && challengerWins >= 15) {
      danger += 0.15;
    } else if (challengerLosses === 0 && challengerWins >= 10) {
      danger += 0.1;
    }

    // 6. Physical advantages
    const reachDiff = (challenger.physical?.reach || 72) - (champion.physical?.reach || 72);
    if (reachDiff > 4) danger += 0.1;

    const heightDiff = (challenger.physical?.height || 180) - (champion.physical?.height || 180);
    if (heightDiff > 5) danger += 0.05;

    // 7. Talent tier comparison
    const tierRank = {
      GENERATIONAL: 7,
      ELITE: 6,
      WORLD_CLASS: 5,
      CONTENDER: 4,
      GATEKEEPER: 3,
      JOURNEYMAN: 2,
      CLUB: 1
    };
    const champTier = tierRank[champion.potential?.tier] || 4;
    const challengerTier = tierRank[challenger.potential?.tier] || 3;

    if (challengerTier >= champTier) {
      danger += (challengerTier - champTier + 1) * 0.05;
    }

    return Math.max(0, Math.min(1, danger));
  }

  /**
   * Count title defenses for a champion
   */
  static countTitleDefenses(champion) {
    const fightHistory = champion.fightHistory || [];
    return fightHistory.filter(f => f.wasTitle && f.result === 'W').length;
  }

  /**
   * Determine champion's preferred opponent from available challengers
   * Balances risk avoidance with financial opportunity
   * @param {UniverseFighter} champion
   * @param {UniverseFighter[]} availableChallengers
   * @param {Universe} universe
   * @returns {Object} Selected opponent and reasoning
   */
  static selectPreferredOpponent(champion, availableChallengers, universe = null) {
    if (!availableChallengers || availableChallengers.length === 0) {
      return null;
    }

    const evaluated = availableChallengers.map(challenger => {
      const duckingChance = this.calculateDuckingChance(champion, challenger, universe);
      const dangerRating = this.assessDanger(champion, challenger, universe);

      const fightValue = FightEconomics.calculateRevenue(
        champion, challenger, 'TITLE_FIGHT'
      ).total;

      const marketValue = MarketValue.calculate(challenger);

      // Score: balance value against risk
      // High value, low danger = best
      const riskAdjustedValue = fightValue * (1 - duckingChance);

      // Legacy score: dangerous wins are more prestigious
      const legacyScore = dangerRating * 50 + (marketValue / 1000000);

      return {
        challenger,
        duckingChance,
        dangerRating,
        fightValue,
        riskAdjustedValue,
        legacyScore,
        // Final score combines money and acceptable risk
        score: riskAdjustedValue
      };
    });

    // Sort by score (prefer high value, acceptable risk)
    evaluated.sort((a, b) => b.score - a.score);

    const selected = evaluated[0];

    return {
      selected: selected.challenger,
      alternatives: evaluated.slice(1, 4).map(e => ({
        fighter: e.challenger,
        reason: this.getAlternativeReason(e, selected)
      })),
      analysis: {
        selectedName: selected.challenger.name,
        duckingChance: Math.round(selected.duckingChance * 100),
        dangerRating: Math.round(selected.dangerRating * 100),
        fightValue: selected.fightValue,
        reason: this.getSelectionReason(selected, evaluated)
      }
    };
  }

  /**
   * Get reason for selecting an opponent
   */
  static getSelectionReason(selected, allEvaluated) {
    const reasons = [];

    if (selected.dangerRating < 0.3) {
      reasons.push('Low risk opponent');
    } else if (selected.dangerRating > 0.6) {
      reasons.push('Dangerous but lucrative');
    }

    if (selected.fightValue > 10000000) {
      reasons.push('Major payday');
    } else if (selected.fightValue > 5000000) {
      reasons.push('Good financial opportunity');
    }

    if (selected.duckingChance < 0.2) {
      reasons.push('Willing to take this fight');
    } else if (selected.duckingChance > 0.5) {
      reasons.push('Reluctant but best available option');
    }

    return reasons.join('; ') || 'Best available matchup';
  }

  /**
   * Get reason why an alternative wasn't selected
   */
  static getAlternativeReason(alternative, selected) {
    if (alternative.duckingChance > selected.duckingChance + 0.2) {
      return 'Too dangerous';
    }
    if (alternative.fightValue < selected.fightValue * 0.5) {
      return 'Not enough money';
    }
    if (alternative.dangerRating > 0.7) {
      return 'High risk';
    }
    return 'Lower priority';
  }

  /**
   * Determine if champion should take mandatory defense
   * (Can't duck forever - sanctioning bodies force the issue)
   */
  static shouldTakeMandatory(champion, mandatoryChallenger, weeksSinceLastDefense, universe = null) {
    // Mandatory after 1 year without defense
    if (weeksSinceLastDefense >= 52) {
      return {
        required: true,
        reason: 'Sanctioning body mandated defense',
        weeksOverdue: weeksSinceLastDefense - 52
      };
    }

    // Warning period: 40-52 weeks
    if (weeksSinceLastDefense >= 40) {
      const duckingChance = this.calculateDuckingChance(champion, mandatoryChallenger, universe);

      // Even ducking champions get nervous about vacating
      if (duckingChance > 0.7) {
        return {
          required: false,
          warning: true,
          reason: 'Champion avoiding mandatory, may vacate',
          weeksUntilMandatory: 52 - weeksSinceLastDefense
        };
      }

      return {
        required: false,
        warning: true,
        reason: 'Mandatory defense approaching',
        weeksUntilMandatory: 52 - weeksSinceLastDefense
      };
    }

    return {
      required: false,
      warning: false,
      weeksUntilMandatory: 52 - weeksSinceLastDefense
    };
  }

  /**
   * Decide if champion will vacate title rather than fight
   * Only in extreme cases
   */
  static willVacateToAvoid(champion, challenger, universe = null) {
    const duckingChance = this.calculateDuckingChance(champion, challenger, universe);
    const dangerRating = this.assessDanger(champion, challenger, universe);

    // Very high danger + declining career + high ducking tendency
    if (dangerRating > 0.7 &&
        duckingChance > 0.7 &&
        champion.career?.phase === 'DECLINE') {

      // Still unlikely - vacating is career-damaging
      const vacateChance = (duckingChance - 0.7) * (dangerRating - 0.5);
      return Math.random() < vacateChance;
    }

    return false;
  }
}

export default ChampionBehavior;
