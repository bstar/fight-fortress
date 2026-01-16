/**
 * Career Damage System
 * Tracks cumulative damage throughout a fighter's career
 * Affects chin, reflexes, and speed permanently
 * Influences retirement decisions
 */

export class CareerDamage {
  constructor(data = {}) {
    // Overall abuse metric (0-100)
    this.totalAbuse = data.totalAbuse || 0;

    // Specific damage counters
    this.knockdownsReceived = data.knockdownsReceived || 0;
    this.koLosses = data.koLosses || 0;
    this.tkoLosses = data.tkoLosses || 0;
    this.roundsFought = data.roundsFought || 0;
    this.punchesAbsorbed = data.punchesAbsorbed || 0;

    // Permanent attribute degradation
    this.chinDegradation = data.chinDegradation || 0;
    this.reflexDegradation = data.reflexDegradation || 0;
    this.speedDegradation = data.speedDegradation || 0;

    // War history (fights that took heavy toll)
    this.warFights = data.warFights || 0;
  }

  /**
   * Record damage from a fight result
   * @param {Object} fightResult - The result of the fight
   */
  recordFightDamage(fightResult) {
    const {
      knockdowns = 0,
      method,
      rounds,
      result,
      punchesReceived,
      wasKnockedOut = false,
      wasWar = false
    } = fightResult;

    // KO losses are devastating to long-term health
    if (wasKnockedOut || (method === 'KO' && result === 'L')) {
      this.koLosses++;
      this.totalAbuse += 8;
      this.chinDegradation += 2;   // Permanent -2 to chin
      this.reflexDegradation += 1; // Permanent -1 to reflexes
    }

    // TKO losses still damaging
    if (method === 'TKO' && result === 'L') {
      this.tkoLosses++;
      this.totalAbuse += 5;
      this.chinDegradation += 1;
    }

    // Knockdowns accumulate damage (even in wins)
    if (knockdowns > 0) {
      this.knockdownsReceived += knockdowns;
      this.totalAbuse += knockdowns * 2;
      // Multiple knockdowns in one fight is especially bad
      if (knockdowns >= 2) {
        this.chinDegradation += 0.5;
      }
    }

    // Long fights wear on the body
    this.roundsFought += rounds || 0;
    this.totalAbuse += (rounds || 0) * 0.2;

    // Absorbing punches causes cumulative damage
    const absorbed = punchesReceived || (rounds || 0) * 15;
    this.punchesAbsorbed += absorbed;
    this.totalAbuse += absorbed * 0.01;

    // War fights (back and forth battles) take extra toll
    if (wasWar) {
      this.warFights++;
      this.totalAbuse += 3;
      this.speedDegradation += 0.5;
    }

    // Cap at 100
    this.totalAbuse = Math.min(100, this.totalAbuse);
  }

  /**
   * Get current attribute penalties from career damage
   * @returns {Object} Penalties to apply to attributes
   */
  getAttributePenalties() {
    return {
      chin: -Math.floor(this.chinDegradation),
      reflexes: -Math.floor(this.reflexDegradation),
      handSpeed: -Math.floor(this.speedDegradation),
      footSpeed: -Math.floor(this.speedDegradation * 0.5)
    };
  }

  /**
   * Apply damage penalties to fighter attributes
   * @param {Object} attributes - Current fighter attributes
   * @returns {Object} Modified attributes with penalties applied
   */
  applyPenalties(attributes) {
    const penalties = this.getAttributePenalties();
    const modified = { ...attributes };

    // Apply to mental.chin
    if (modified.mental?.chin !== undefined) {
      modified.mental = {
        ...modified.mental,
        chin: Math.max(30, modified.mental.chin + penalties.chin)
      };
    }

    // Apply to speed.reflexes
    if (modified.speed?.reflexes !== undefined) {
      modified.speed = {
        ...modified.speed,
        reflexes: Math.max(30, modified.speed.reflexes + penalties.reflexes)
      };
    }

    // Apply to speed.handSpeed
    if (modified.speed?.handSpeed !== undefined) {
      modified.speed = {
        ...modified.speed,
        handSpeed: Math.max(30, modified.speed.handSpeed + penalties.handSpeed)
      };
    }

    // Apply to speed.footSpeed
    if (modified.speed?.footSpeed !== undefined) {
      modified.speed = {
        ...modified.speed,
        footSpeed: Math.max(30, modified.speed.footSpeed + penalties.footSpeed)
      };
    }

    return modified;
  }

  /**
   * Check if fighter should consider retirement due to damage
   * @returns {Object} { retire: boolean, warning: boolean, reason: string }
   */
  shouldRetireDueToDamage() {
    // Severe damage - should retire
    if (this.koLosses >= 5) {
      return { retire: true, warning: false, reason: 'Too many KO losses' };
    }
    if (this.totalAbuse >= 85) {
      return { retire: true, warning: false, reason: 'Accumulated too much damage' };
    }
    if (this.chinDegradation >= 15) {
      return { retire: true, warning: false, reason: 'Chin completely deteriorated' };
    }
    if (this.knockdownsReceived >= 15) {
      return { retire: true, warning: false, reason: 'Too many knockdowns received' };
    }

    // Warning signs - consider retirement
    if (this.koLosses >= 3) {
      return { retire: false, warning: true, reason: 'Multiple KO losses' };
    }
    if (this.totalAbuse >= 60) {
      return { retire: false, warning: true, reason: 'High career damage' };
    }
    if (this.chinDegradation >= 8) {
      return { retire: false, warning: true, reason: 'Significant chin deterioration' };
    }
    if (this.tkoLosses + this.koLosses >= 6) {
      return { retire: false, warning: true, reason: 'Multiple stoppage losses' };
    }

    return { retire: false, warning: false, reason: null };
  }

  /**
   * Get damage level description
   * @returns {string} Description of damage level
   */
  getDamageLevel() {
    if (this.totalAbuse >= 80) return 'SEVERE';
    if (this.totalAbuse >= 60) return 'HEAVY';
    if (this.totalAbuse >= 40) return 'MODERATE';
    if (this.totalAbuse >= 20) return 'LIGHT';
    return 'MINIMAL';
  }

  /**
   * Get a summary of the damage for display
   * @returns {Object} Damage summary
   */
  getSummary() {
    return {
      level: this.getDamageLevel(),
      totalAbuse: Math.round(this.totalAbuse),
      koLosses: this.koLosses,
      tkoLosses: this.tkoLosses,
      knockdownsReceived: this.knockdownsReceived,
      roundsFought: this.roundsFought,
      warFights: this.warFights,
      penalties: this.getAttributePenalties()
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      totalAbuse: this.totalAbuse,
      knockdownsReceived: this.knockdownsReceived,
      koLosses: this.koLosses,
      tkoLosses: this.tkoLosses,
      roundsFought: this.roundsFought,
      punchesAbsorbed: this.punchesAbsorbed,
      chinDegradation: this.chinDegradation,
      reflexDegradation: this.reflexDegradation,
      speedDegradation: this.speedDegradation,
      warFights: this.warFights
    };
  }

  /**
   * Create from saved data
   */
  static fromJSON(data) {
    return new CareerDamage(data);
  }
}

export default CareerDamage;
