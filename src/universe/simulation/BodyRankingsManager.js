/**
 * BodyRankingsManager
 * Manages per-sanctioning-body rankings for fighters
 * Each body (WBC, WBA, IBF, WBO) has unique criteria and weights
 */

import { SanctioningBodyConfig, getAllBodyCodes } from '../economics/SanctioningBodyConfig.js';

export class BodyRankingsManager {
  constructor(universe) {
    this.universe = universe;
  }

  /**
   * Calculate ranking score for a fighter for a specific body
   * @param {UniverseFighter} fighter
   * @param {string} bodyCode - WBC, WBA, IBF, or WBO
   * @param {string} divisionName
   * @returns {number} Score (0-100) or -1 if ineligible
   */
  calculateBodyRankingScore(fighter, bodyCode, divisionName) {
    const config = SanctioningBodyConfig[bodyCode];
    if (!config) return 0;

    // Check entry requirements
    if (!this.meetsEntryRequirements(fighter, config)) {
      return -1;  // Not eligible for ranking
    }

    const weights = config.weights;
    let score = 0;

    // Win percentage (weighted)
    const winPct = fighter.getWinPercentage?.() || this.calculateWinPercentage(fighter);
    score += (winPct / 100) * weights.winPercentage;

    // Record quality (wins - losses * 2)
    const record = fighter.career?.record || { wins: 0, losses: 0 };
    const recordQuality = Math.max(0, record.wins - (record.losses * 2));
    score += Math.min(weights.recordQuality, (recordQuality / 20) * weights.recordQuality);

    // KO percentage
    const koPct = fighter.getKOPercentage?.() || this.calculateKOPercentage(fighter);
    score += (koPct / 100) * weights.koPercentage;

    // Activity score (inverted inactivity)
    const inactiveWeeks = fighter.career?.weeksInactive || 0;
    const maxInactive = config.activity.maxInactiveWeeks;
    if (inactiveWeeks <= maxInactive) {
      score += weights.activity;
    } else {
      const penalty = (inactiveWeeks - maxInactive) * config.activity.inactivityPenaltyPerWeek;
      score += Math.max(0, weights.activity - penalty);
    }

    // Win streak
    const streak = fighter.career?.consecutiveWins || 0;
    score += Math.min(weights.winStreak, (streak / 10) * weights.winStreak);

    // Quality of opposition
    const qoo = fighter.career?.oppositionQuality?.qualityScore || 50;
    score += (qoo / 100) * weights.qualityOfOpposition;

    // Popularity (only for bodies that value it)
    if (weights.popularity > 0) {
      const popularity = fighter.career?.popularity || 50;
      score += (popularity / 100) * weights.popularity;
    }

    // IBF special rule: ranked wins requirement
    if (config.entryRequirements.requiresRankedWin) {
      const rankedWins = fighter.career?.oppositionQuality?.rankedWins || 0;
      if (rankedWins === 0 && score > 50) {
        score *= 0.7;  // 30% penalty if no ranked wins
      }
    }

    return Math.round(score * 10) / 10;
  }

  /**
   * Calculate win percentage for a fighter
   */
  calculateWinPercentage(fighter) {
    const record = fighter.career?.record || { wins: 0, losses: 0, draws: 0 };
    const total = record.wins + record.losses + (record.draws || 0);
    if (total === 0) return 0;
    return (record.wins / total) * 100;
  }

  /**
   * Calculate KO percentage for a fighter
   */
  calculateKOPercentage(fighter) {
    const record = fighter.career?.record || { wins: 0, kos: 0 };
    if (record.wins === 0) return 0;
    return ((record.kos || 0) / record.wins) * 100;
  }

  /**
   * Check if fighter meets entry requirements for a body
   */
  meetsEntryRequirements(fighter, config) {
    const record = fighter.career?.record || { wins: 0, losses: 0 };
    const req = config.entryRequirements;

    if (record.wins < req.minimumWins) return false;
    if ((record.wins + record.losses) < req.minimumProFights) return false;
    if (record.losses > req.maxLosses) return false;

    return true;
  }

  /**
   * Update rankings for a specific body and division
   */
  updateBodyRankings(bodyCode, divisionName) {
    const config = SanctioningBodyConfig[bodyCode];
    const division = this.universe.divisions.get(divisionName);
    const body = this.universe.sanctioningBodies?.get(bodyCode);

    if (!division || !body) return [];

    // Get all active fighters in division
    const fighters = division.fighters
      .map(id => this.universe.fighters.get(id))
      .filter(f => f && f.career?.phase !== 'RETIRED' && (f.canFight?.() !== false));

    // Calculate scores for each fighter
    const scored = fighters.map(fighter => ({
      fighter,
      score: this.calculateBodyRankingScore(fighter, bodyCode, divisionName)
    }));

    // Filter out ineligible (-1 score) and sort by score
    const eligible = scored
      .filter(s => s.score >= 0)
      .sort((a, b) => b.score - a.score);

    // Take top 15 (excluding champion)
    const championId = body.champions?.get(divisionName);
    const ranked = eligible
      .filter(s => s.fighter.id !== championId)
      .slice(0, config.maxRanked);

    // Update body's rankings
    if (!body.rankings) body.rankings = new Map();
    body.rankings.set(divisionName, ranked.map((s, i) => ({
      rank: i + 1,
      fighterId: s.fighter.id,
      score: s.score
    })));

    // Update fighter's per-body ranking tracking
    ranked.forEach((s, i) => {
      if (!s.fighter.career.bodyRankings) {
        s.fighter.career.bodyRankings = {};
      }
      s.fighter.career.bodyRankings[bodyCode] = i + 1;
    });

    // Clear rankings for fighters no longer ranked
    fighters.forEach(f => {
      if (f.career?.bodyRankings?.[bodyCode]) {
        const stillRanked = ranked.some(r => r.fighter.id === f.id);
        if (!stillRanked) {
          delete f.career.bodyRankings[bodyCode];
        }
      }
    });

    return ranked;
  }

  /**
   * Update all body rankings for all divisions
   */
  updateAllBodyRankings() {
    const bodies = getAllBodyCodes();
    const results = {};

    for (const bodyCode of bodies) {
      results[bodyCode] = {};
      for (const [divisionName] of this.universe.divisions) {
        results[bodyCode][divisionName] = this.updateBodyRankings(bodyCode, divisionName);
      }
    }

    return results;
  }

  /**
   * Get a fighter's ranking across all bodies
   */
  getFighterRankings(fighter) {
    return fighter.career?.bodyRankings || {};
  }

  /**
   * Get a fighter's ranking for a specific body
   */
  getFighterBodyRanking(fighter, bodyCode) {
    return fighter.career?.bodyRankings?.[bodyCode] || null;
  }

  /**
   * Check if fighter is mandatory challenger for a body
   */
  isMandatoryChallenger(fighter, bodyCode, divisionName) {
    const body = this.universe.sanctioningBodies?.get(bodyCode);
    if (!body) return false;

    const rankings = body.rankings?.get(divisionName);
    if (!rankings || rankings.length === 0) return false;

    // #1 ranked is mandatory
    return rankings[0].fighterId === fighter.id;
  }

  /**
   * Get the #1 ranked contender for a body/division
   */
  getMandatoryChallenger(bodyCode, divisionName) {
    const body = this.universe.sanctioningBodies?.get(bodyCode);
    if (!body) return null;

    const rankings = body.rankings?.get(divisionName);
    if (!rankings || rankings.length === 0) return null;

    return this.universe.fighters.get(rankings[0].fighterId);
  }

  /**
   * Get mandatory status for division/body
   */
  getMandatoryStatus(bodyCode, divisionName) {
    const config = SanctioningBodyConfig[bodyCode];
    const body = this.universe.sanctioningBodies?.get(bodyCode);

    if (!body || !config) return null;

    const championId = body.champions?.get(divisionName);
    if (!championId) return null;

    const lastDefense = body.titleHistory
      ?.filter(h => h.division === divisionName && h.championId === championId)
      ?.sort((a, b) => b.date.year - a.date.year || b.date.week - a.date.week)?.[0];

    const weeksSinceDefense = lastDefense
      ? this.getWeeksBetween(lastDefense.date, this.universe.currentDate)
      : 999;

    const mandatory = config.mandatory;

    return {
      championId,
      weeksSinceDefense,
      mandatoryDue: weeksSinceDefense >= mandatory.weeksBeforeMandatory,
      weeksUntilMandatory: Math.max(0, mandatory.weeksBeforeMandatory - weeksSinceDefense),
      mandatoryChallengerId: body.rankings?.get(divisionName)?.[0]?.fighterId,
      allowStepAside: mandatory.allowStepAside,
      interimAllowed: mandatory.interimAllowed
    };
  }

  /**
   * Get weeks between two dates
   */
  getWeeksBetween(date1, date2) {
    return ((date2.year - date1.year) * 52) + (date2.week - date1.week);
  }

  /**
   * Get rankings for display (all bodies for a division)
   */
  getDivisionRankingsDisplay(divisionName) {
    const bodies = getAllBodyCodes();
    const results = {};

    for (const bodyCode of bodies) {
      const body = this.universe.sanctioningBodies?.get(bodyCode);
      if (body?.rankings?.has(divisionName)) {
        results[bodyCode] = body.rankings.get(divisionName).map(r => {
          const fighter = this.universe.fighters.get(r.fighterId);
          return {
            rank: r.rank,
            fighterId: r.fighterId,
            name: fighter?.identity?.name || 'Unknown',
            record: fighter?.career?.record || { wins: 0, losses: 0 },
            score: r.score
          };
        });
      } else {
        results[bodyCode] = [];
      }
    }

    return results;
  }

  /**
   * Compare a fighter's ranking across bodies
   */
  compareRankingsAcrossBodies(fighter) {
    const rankings = this.getFighterRankings(fighter);
    const bodies = getAllBodyCodes();

    return bodies.map(bodyCode => ({
      body: bodyCode,
      rank: rankings[bodyCode] || null,
      ranked: !!rankings[bodyCode]
    }));
  }
}

export default BodyRankingsManager;
