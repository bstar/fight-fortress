/**
 * Division Model
 * Represents a weight class division with rankings and championship tracking
 */

export class Division {
  constructor(config = {}) {
    // Division identity
    this.name = config.name || 'Heavyweight';
    this.minWeight = config.minWeight || 90.7;
    this.maxWeight = config.maxWeight || Infinity;
    this.displayWeight = config.displayWeight || '200+ lbs';

    // Current champion
    this.champion = config.champion || null;
    this.championDefenses = config.championDefenses || 0;
    this.championSince = config.championSince || null;

    // Rankings (top 15 contenders by ID)
    this.rankings = config.rankings || [];

    // All fighters in this division
    this.fighters = config.fighters || [];

    // Division history
    this.championHistory = config.championHistory || [];

    // Mandatory challenger (must be defended against)
    this.mandatoryChallenger = config.mandatoryChallenger || null;

    // Interim champion (if regular champion is inactive)
    this.interimChampion = config.interimChampion || null;
  }

  /**
   * Add a fighter to this division
   */
  addFighter(fighterId) {
    if (!this.fighters.includes(fighterId)) {
      this.fighters.push(fighterId);
    }
  }

  /**
   * Remove a fighter from this division
   */
  removeFighter(fighterId) {
    this.fighters = this.fighters.filter(id => id !== fighterId);
    this.rankings = this.rankings.filter(id => id !== fighterId);

    // Handle if champion leaves
    if (this.champion === fighterId) {
      this.vacateChampionship('Fighter left division');
    }

    if (this.mandatoryChallenger === fighterId) {
      this.mandatoryChallenger = null;
    }
  }

  /**
   * Crown a new champion
   */
  setChampion(fighterId, date, method = 'Won title') {
    // Record previous champion in history
    if (this.champion) {
      this.championHistory.push({
        fighterId: this.champion,
        startDate: this.championSince,
        endDate: date,
        defenses: this.championDefenses,
        lostTo: fighterId,
        method
      });
    }

    this.champion = fighterId;
    this.championSince = date;
    this.championDefenses = 0;
    this.interimChampion = null;

    // Remove from rankings if present
    this.rankings = this.rankings.filter(id => id !== fighterId);
  }

  /**
   * Record a successful title defense
   */
  recordDefense() {
    if (this.champion) {
      this.championDefenses++;
    }
  }

  /**
   * Vacate the championship
   */
  vacateChampionship(reason = 'Vacated') {
    if (this.champion) {
      this.championHistory.push({
        fighterId: this.champion,
        startDate: this.championSince,
        endDate: null,
        defenses: this.championDefenses,
        lostTo: null,
        method: reason
      });
    }

    this.champion = null;
    this.championSince = null;
    this.championDefenses = 0;

    // Promote interim champion if exists
    if (this.interimChampion) {
      this.champion = this.interimChampion;
      this.interimChampion = null;
    }
  }

  /**
   * Update rankings based on fight results and activity
   * @param {Map} fighters - Map of all fighters for accessing data
   * @param {Object} rankingScores - Pre-calculated ranking scores { fighterId: score }
   */
  updateRankings(fighters, rankingScores) {
    // Get all ranked fighters with their scores
    const rankedFighters = this.fighters
      .filter(id => id !== this.champion && rankingScores[id] !== undefined)
      .map(id => ({ id, score: rankingScores[id] }))
      .sort((a, b) => b.score - a.score);

    // Top 15 become rankings
    this.rankings = rankedFighters.slice(0, 15).map(f => f.id);

    // #1 ranked becomes mandatory if no current mandatory
    if (!this.mandatoryChallenger && this.rankings.length > 0) {
      this.mandatoryChallenger = this.rankings[0];
    }
  }

  /**
   * Get a fighter's ranking in this division
   * @returns {number|null} Ranking (1-15) or null if unranked
   */
  getFighterRanking(fighterId) {
    if (fighterId === this.champion) return 0; // Champion is rank 0
    const index = this.rankings.indexOf(fighterId);
    return index >= 0 ? index + 1 : null;
  }

  /**
   * Check if a fight would be a title fight
   */
  isTitleFight(fighterAId, fighterBId) {
    return this.champion === fighterAId || this.champion === fighterBId;
  }

  /**
   * Get championship status string
   */
  getChampionshipStatus() {
    if (!this.champion) {
      return 'VACANT';
    }
    if (this.interimChampion) {
      return 'DISPUTED';
    }
    return 'UNIFIED';
  }

  /**
   * Get division summary
   */
  getSummary() {
    return {
      name: this.name,
      weight: this.displayWeight,
      status: this.getChampionshipStatus(),
      champion: this.champion,
      defenses: this.championDefenses,
      championSince: this.championSince,
      rankings: this.rankings,
      totalFighters: this.fighters.length,
      mandatory: this.mandatoryChallenger
    };
  }

  /**
   * Get list of unranked fighters
   */
  getUnrankedFighters() {
    return this.fighters.filter(id =>
      id !== this.champion &&
      !this.rankings.includes(id)
    );
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      name: this.name,
      minWeight: this.minWeight,
      maxWeight: this.maxWeight === Infinity ? 'Infinity' : this.maxWeight,
      displayWeight: this.displayWeight,
      champion: this.champion,
      championDefenses: this.championDefenses,
      championSince: this.championSince,
      rankings: this.rankings,
      fighters: this.fighters,
      championHistory: this.championHistory,
      mandatoryChallenger: this.mandatoryChallenger,
      interimChampion: this.interimChampion
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new Division({
      ...data,
      maxWeight: data.maxWeight === 'Infinity' ? Infinity : data.maxWeight
    });
  }
}

export default Division;
