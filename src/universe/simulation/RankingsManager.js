/**
 * Rankings Manager
 * Calculates and updates fighter rankings within divisions
 */

export class RankingsManager {
  constructor(universe) {
    this.universe = universe;
  }

  /**
   * Update rankings for a division
   * @param {Division} division
   * @returns {Object[]} Array of ranking changes
   */
  updateDivisionRankings(division) {
    const changes = [];

    // Get all eligible fighters
    const eligibleFighters = division.fighters
      .map(id => this.universe.fighters.get(id))
      .filter(f => f && f.canFight() && f.career.phase !== 'RETIRED');

    // Calculate scores for each fighter
    const scores = new Map();
    for (const fighter of eligibleFighters) {
      if (fighter.id === division.champion) continue; // Champion not in rankings
      scores.set(fighter.id, this.calculateRankingScore(fighter));
    }

    // Sort by score
    const sortedFighters = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Top 15

    // Detect changes
    const oldRankings = [...division.rankings];
    const newRankings = sortedFighters.map(([id]) => id);

    for (let i = 0; i < newRankings.length; i++) {
      const fighterId = newRankings[i];
      const oldRank = oldRankings.indexOf(fighterId);
      const newRank = i;

      if (oldRank === -1) {
        // New entry
        changes.push({
          fighterId,
          fighterName: this.universe.fighters.get(fighterId)?.name,
          change: 'ENTERED',
          newRank: newRank + 1,
          message: `${this.universe.fighters.get(fighterId)?.name} enters rankings at #${newRank + 1}`
        });
      } else if (oldRank !== newRank) {
        const moved = oldRank - newRank;
        if (Math.abs(moved) >= 2) { // Only report significant moves
          changes.push({
            fighterId,
            fighterName: this.universe.fighters.get(fighterId)?.name,
            change: moved > 0 ? 'UP' : 'DOWN',
            oldRank: oldRank + 1,
            newRank: newRank + 1,
            positions: Math.abs(moved),
            message: `${this.universe.fighters.get(fighterId)?.name} moves ${moved > 0 ? 'up' : 'down'} to #${newRank + 1}`
          });
        }
      }
    }

    // Check for fighters dropping out
    for (const fighterId of oldRankings) {
      if (!newRankings.includes(fighterId)) {
        changes.push({
          fighterId,
          fighterName: this.universe.fighters.get(fighterId)?.name,
          change: 'DROPPED',
          message: `${this.universe.fighters.get(fighterId)?.name} drops out of rankings`
        });
      }
    }

    // Update division rankings
    division.rankings = newRankings;

    // Update fighter ranking data
    for (let i = 0; i < newRankings.length; i++) {
      const fighter = this.universe.fighters.get(newRankings[i]);
      if (fighter) {
        const newRank = i + 1;
        fighter.career.rankings.current = newRank;
        fighter.career.rankings.weeksRanked++;

        if (!fighter.career.rankings.peak || newRank < fighter.career.rankings.peak) {
          fighter.career.rankings.peak = newRank;
        }
      }
    }

    // Clear ranking for fighters who dropped out
    for (const fighterId of oldRankings) {
      if (!newRankings.includes(fighterId)) {
        const fighter = this.universe.fighters.get(fighterId);
        if (fighter) {
          fighter.career.rankings.current = null;
        }
      }
    }

    // Update mandatory challenger
    if (newRankings.length > 0) {
      division.mandatoryChallenger = newRankings[0];
    }

    return changes;
  }

  /**
   * Calculate ranking score for a fighter
   */
  calculateRankingScore(fighter) {
    const record = fighter.career.record;
    const totalFights = record.wins + record.losses + record.draws;

    if (totalFights === 0) return 0;

    let score = 0;

    // Win percentage (up to 35 points)
    const winPct = record.wins / totalFights;
    score += winPct * 35;

    // Record quality - wins matter (up to 20 points)
    score += Math.min(20, record.wins * 0.8);

    // KO percentage bonus (up to 10 points)
    if (record.wins > 0) {
      const koPct = record.kos / record.wins;
      score += koPct * 10;
    }

    // Activity bonus (up to 10 points)
    score += Math.min(10, fighter.career.fightsThisYear * 3);

    // Win streak bonus (up to 10 points)
    score += Math.min(10, fighter.career.consecutiveWins * 2);

    // Quality of opposition bonus (based on peak ranking)
    if (fighter.career.rankings.peak) {
      score += Math.max(0, 15 - fighter.career.rankings.peak);
    }

    // Penalties
    // Losing streak
    score -= fighter.career.consecutiveLosses * 5;

    // Inactivity penalty
    if (fighter.career.weeksInactive > 26) {
      score -= (fighter.career.weeksInactive - 26) * 0.3;
    }

    // Recent losses hurt more
    if (fighter.career.consecutiveLosses > 0) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * Get ranking score breakdown for debugging/display
   */
  getScoreBreakdown(fighter) {
    const record = fighter.career.record;
    const totalFights = record.wins + record.losses + record.draws;

    if (totalFights === 0) {
      return { total: 0, components: {} };
    }

    const components = {
      winPercentage: (record.wins / totalFights) * 35,
      recordQuality: Math.min(20, record.wins * 0.8),
      koPercentage: record.wins > 0 ? (record.kos / record.wins) * 10 : 0,
      activity: Math.min(10, fighter.career.fightsThisYear * 3),
      winStreak: Math.min(10, fighter.career.consecutiveWins * 2),
      peakRanking: fighter.career.rankings.peak
        ? Math.max(0, 15 - fighter.career.rankings.peak)
        : 0,
      loseStreakPenalty: -fighter.career.consecutiveLosses * 5,
      inactivityPenalty: fighter.career.weeksInactive > 26
        ? -(fighter.career.weeksInactive - 26) * 0.3
        : 0,
      recentLossPenalty: fighter.career.consecutiveLosses > 0 ? -5 : 0
    };

    const total = Object.values(components).reduce((a, b) => a + b, 0);

    return { total: Math.max(0, total), components };
  }

  /**
   * Get division standings with full details
   */
  getDivisionStandings(division) {
    const standings = [];

    // Champion first
    if (division.champion) {
      const champion = this.universe.fighters.get(division.champion);
      if (champion) {
        standings.push({
          rank: 'C',
          fighter: champion,
          name: champion.name,
          record: champion.getRecordString(),
          score: null,
          status: 'CHAMPION',
          defenses: division.championDefenses
        });
      }
    }

    // Ranked fighters
    for (let i = 0; i < division.rankings.length; i++) {
      const fighter = this.universe.fighters.get(division.rankings[i]);
      if (fighter) {
        standings.push({
          rank: i + 1,
          fighter,
          name: fighter.name,
          record: fighter.getRecordString(),
          score: this.calculateRankingScore(fighter),
          status: i === 0 && division.mandatoryChallenger === fighter.id
            ? 'MANDATORY'
            : 'RANKED'
        });
      }
    }

    return standings;
  }

  /**
   * Handle ranking changes after a fight
   */
  processFightResult(winner, loser, division, wasTitle) {
    const changes = [];

    if (wasTitle) {
      // Title fight
      if (winner.id !== division.champion) {
        // New champion
        changes.push({
          type: 'NEW_CHAMPION',
          fighterId: winner.id,
          fighterName: winner.name,
          message: `${winner.name} is the new ${division.name} champion!`
        });
      } else {
        // Successful defense
        division.recordDefense();
        changes.push({
          type: 'TITLE_DEFENSE',
          fighterId: winner.id,
          fighterName: winner.name,
          defenses: division.championDefenses,
          message: `${winner.name} makes defense #${division.championDefenses}`
        });
      }
    } else {
      // Non-title fight - immediate ranking implications
      const winnerRank = division.getFighterRanking(winner.id);
      const loserRank = division.getFighterRanking(loser.id);

      // Winner beats higher-ranked opponent
      if (loserRank !== null && (winnerRank === null || winnerRank > loserRank)) {
        changes.push({
          type: 'UPSET_WIN',
          fighterId: winner.id,
          fighterName: winner.name,
          message: `${winner.name} scores upset over #${loserRank} ${loser.name}`
        });
      }
    }

    return changes;
  }
}

export default RankingsManager;
