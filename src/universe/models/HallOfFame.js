/**
 * Hall of Fame System
 * Tracks legendary fighters and their achievements
 */

// HOF Categories
export const HOFCategory = {
  FIRST_BALLOT: 'FIRST_BALLOT',     // Immediate induction, all-time greats
  MODERN: 'MODERN',                  // Recent era champions
  OLD_TIMER: 'OLD_TIMER',           // Pioneers and early era fighters
  CONTRIBUTOR: 'CONTRIBUTOR'         // Non-fighters (trainers, etc.)
};

export class HallOfFame {
  constructor(data = {}) {
    this.inductees = new Map(Object.entries(data.inductees || {}));
    this.candidates = data.candidates || [];
    this.criteria = {
      // Minimum requirements
      minTotalFights: 20,
      minWins: 15,
      minWinPercentage: 60,

      // Point thresholds for induction
      firstBallotThreshold: 90,  // Automatic first-ballot
      inductionThreshold: 70     // Regular induction
    };
  }

  /**
   * Check if a fighter is already inducted
   */
  isInducted(fighterId) {
    return this.inductees.has(fighterId);
  }

  /**
   * Evaluate a candidate for HOF induction
   * @returns {Object} { qualifies: boolean, score: number, category: string }
   */
  evaluateCandidate(fighter) {
    let score = 0;
    const record = fighter.career.record;
    const totalFights = record.wins + record.losses + record.draws;
    const winPct = totalFights > 0 ? (record.wins / totalFights) * 100 : 0;

    // Basic requirements check
    if (totalFights < this.criteria.minTotalFights ||
        record.wins < this.criteria.minWins ||
        winPct < this.criteria.minWinPercentage) {
      return { qualifies: false, score: 0, category: null, reason: 'Does not meet minimum requirements' };
    }

    // Title history (up to 40 points)
    const titleCount = fighter.career.titles.length;
    const worldTitles = fighter.career.titles.filter(t =>
      t.title.includes('WBC') || t.title.includes('WBA') ||
      t.title.includes('IBF') || t.title.includes('WBO')
    ).length;

    score += Math.min(20, worldTitles * 7);  // Each world title

    // Title defenses (up to 15 points)
    const totalDefenses = fighter.career.titles.reduce((sum, t) => sum + (t.defenses || 0), 0);
    score += Math.min(15, totalDefenses * 2);

    // Win percentage (up to 15 points)
    score += (winPct / 100) * 15;

    // KO percentage (up to 10 points)
    const koPct = record.wins > 0 ? (record.kos / record.wins) * 100 : 0;
    score += (koPct / 100) * 10;

    // Career longevity (up to 10 points)
    score += Math.min(10, totalFights * 0.2);

    // Peak ranking (up to 10 points)
    if (fighter.career.rankings.peak !== null) {
      score += Math.max(0, (16 - fighter.career.rankings.peak));
    }

    // Talent tier bonus
    const tierBonus = {
      'GENERATIONAL': 15,
      'ELITE': 10,
      'WORLD_CLASS': 5,
      'CONTENDER': 2,
      'GATEKEEPER': 0,
      'JOURNEYMAN': -5,
      'CLUB': -10
    };
    score += tierBonus[fighter.potential.tier] || 0;

    // Determine category
    let category = null;
    let qualifies = false;

    if (score >= this.criteria.firstBallotThreshold) {
      qualifies = true;
      category = HOFCategory.FIRST_BALLOT;
    } else if (score >= this.criteria.inductionThreshold) {
      qualifies = true;
      category = HOFCategory.MODERN;
    }

    return {
      qualifies,
      score: Math.round(score),
      category,
      breakdown: {
        titles: worldTitles,
        defenses: totalDefenses,
        winPct: Math.round(winPct),
        koPct: Math.round(koPct),
        totalFights
      }
    };
  }

  /**
   * Induct a fighter into the Hall of Fame
   */
  induct(fighter, date, category = HOFCategory.MODERN) {
    const record = fighter.career.record;

    this.inductees.set(fighter.id, {
      id: fighter.id,
      name: fighter.name,
      nickname: fighter.nickname,
      nationality: fighter.nationality,
      inductionDate: { ...date },
      category,
      record: {
        wins: record.wins,
        losses: record.losses,
        draws: record.draws,
        kos: record.kos
      },
      titles: fighter.career.titles.map(t => ({
        title: t.title,
        wonDate: t.wonDate,
        defenses: t.defenses
      })),
      peakRanking: fighter.career.rankings.peak,
      careerSpan: this.calculateCareerSpan(fighter)
    });
  }

  /**
   * Calculate career span string
   */
  calculateCareerSpan(fighter) {
    const debut = fighter.career.proDebutDate?.year || '?';
    const retirement = fighter.career.retirementDate?.year || '?';
    return `${debut}-${retirement}`;
  }

  /**
   * Get all inductees, optionally filtered by category
   */
  getInductees(category = null) {
    const all = Array.from(this.inductees.values());
    if (!category) return all;
    return all.filter(i => i.category === category);
  }

  /**
   * Get inductee count
   */
  getInducteeCount() {
    return this.inductees.size;
  }

  /**
   * Get first-ballot inductees
   */
  getFirstBallot() {
    return this.getInductees(HOFCategory.FIRST_BALLOT);
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      inductees: Object.fromEntries(this.inductees),
      candidates: this.candidates
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new HallOfFame(data);
  }
}

export default HallOfFame;
