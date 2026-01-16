/**
 * UniverseFighter Model
 * Extends the base Fighter with career management, aging, and universe integration
 * This is the "living" fighter that exists in the simulation universe
 */

import { Fighter } from '../../models/Fighter.js';
import { v4 as uuidv4 } from 'uuid';

// Career phases
export const CareerPhase = {
  YOUTH: 'YOUTH',           // Under 18, not yet eligible
  AMATEUR: 'AMATEUR',       // Amateur career (18-22 typically)
  PRO_DEBUT: 'PRO_DEBUT',   // First few pro fights
  RISING: 'RISING',         // Building record, moving up
  CONTENDER: 'CONTENDER',   // Ranked, fighting for titles
  CHAMPION: 'CHAMPION',     // Holding a title
  GATEKEEPER: 'GATEKEEPER', // Experienced, tests prospects
  DECLINE: 'DECLINE',       // Past prime, considering retirement
  RETIRED: 'RETIRED'        // No longer fighting
};

// Talent tiers - determines ceiling and growth
export const TalentTier = {
  GENERATIONAL: 'GENERATIONAL', // All-time great potential (1%)
  ELITE: 'ELITE',               // World champion caliber (4%)
  WORLD_CLASS: 'WORLD_CLASS',   // Can compete at highest level (10%)
  CONTENDER: 'CONTENDER',       // Top 15 potential (15%)
  GATEKEEPER: 'GATEKEEPER',     // Tests prospects (25%)
  JOURNEYMAN: 'JOURNEYMAN',     // Fills cards (25%)
  CLUB: 'CLUB'                  // Local level only (20%)
};

export class UniverseFighter extends Fighter {
  constructor(baseConfig, universeData = {}) {
    super(baseConfig);

    // Override ID with UUID for universe tracking
    this.id = universeData.id || uuidv4();

    // Career tracking
    this.career = {
      phase: universeData.phase || CareerPhase.AMATEUR,

      // Timeline
      birthDate: universeData.birthDate || { year: 1980, week: 1 },
      proDebutDate: universeData.proDebutDate || null,
      retirementDate: universeData.retirementDate || null,
      lastFightDate: universeData.lastFightDate || null,

      // Record
      record: {
        wins: baseConfig.record?.wins || 0,
        losses: baseConfig.record?.losses || 0,
        draws: baseConfig.record?.draws || 0,
        kos: baseConfig.record?.kos || 0,
        koLosses: universeData.record?.koLosses || 0
      },

      // Rankings & titles
      rankings: {
        current: universeData.rankings?.current || null,
        peak: universeData.rankings?.peak || null,
        weeksRanked: universeData.rankings?.weeksRanked || 0
      },
      titles: universeData.titles || [],

      // Financials & popularity
      earnings: universeData.earnings || 0,
      popularity: universeData.popularity || 50, // 1-100

      // Status
      injuries: universeData.injuries || [],
      suspensions: universeData.suspensions || [],
      contractStatus: universeData.contractStatus || null,

      // Fight activity
      fightsThisYear: universeData.fightsThisYear || 0,
      weeksInactive: universeData.weeksInactive || 0,
      consecutiveWins: universeData.consecutiveWins || 0,
      consecutiveLosses: universeData.consecutiveLosses || 0
    };

    // Relationships
    this.relationships = {
      trainer: universeData.trainer || null,
      manager: universeData.manager || null,
      promoter: universeData.promoter || null,
      gym: universeData.gym || null,
      rivals: universeData.rivals || []
    };

    // Potential & development (hidden attributes)
    this.potential = {
      tier: universeData.tier || TalentTier.JOURNEYMAN,
      ceiling: universeData.ceiling || 75,         // Max overall rating achievable
      growthRate: universeData.growthRate || 1.0,  // Speed of improvement
      peakAgePhysical: universeData.peakAgePhysical || 28,
      peakAgeMental: universeData.peakAgeMental || 32,
      resilience: universeData.resilience || 0.5   // How well they age
    };

    // Store base attributes for progression/decline calculation
    this.baseAttributes = this.captureBaseAttributes();

    // Fight history in universe
    this.fightHistory = universeData.fightHistory || [];

    // Personality traits (affects career decisions)
    this.personality = {
      ambition: universeData.personality?.ambition || 50,       // Desire for greatness
      riskTolerance: universeData.personality?.riskTolerance || 50, // Take tough fights
      loyalty: universeData.personality?.loyalty || 50,         // Stick with team
      workEthic: universeData.personality?.workEthic || 50      // Training dedication
    };
  }

  /**
   * Capture current attributes as base for modifications
   */
  captureBaseAttributes() {
    return {
      power: { ...this.power },
      speed: { ...this.speed },
      stamina: { ...this.stamina },
      defense: { ...this.defense },
      offense: { ...this.offense },
      technical: { ...this.technical },
      mental: { ...this.mental }
    };
  }

  /**
   * Calculate current age based on universe date
   */
  getAge(currentDate) {
    const birthWeeks = this.career.birthDate.year * 52 + this.career.birthDate.week;
    const currentWeeks = currentDate.year * 52 + currentDate.week;
    return Math.floor((currentWeeks - birthWeeks) / 52);
  }

  /**
   * Check if fighter is in their physical prime
   */
  isInPhysicalPrime(currentDate) {
    const age = this.getAge(currentDate);
    return age >= this.potential.peakAgePhysical - 2 &&
           age <= this.potential.peakAgePhysical + 2;
  }

  /**
   * Check if fighter is in their mental prime
   */
  isInMentalPrime(currentDate) {
    const age = this.getAge(currentDate);
    return age >= this.potential.peakAgeMental - 2 &&
           age <= this.potential.peakAgeMental + 2;
  }

  /**
   * Check if fighter is past their prime (decline phase)
   */
  isPastPrime(currentDate) {
    const age = this.getAge(currentDate);
    return age > this.potential.peakAgePhysical + 3;
  }

  /**
   * Get record as string
   */
  getRecordString() {
    const r = this.career.record;
    let str = `${r.wins}-${r.losses}`;
    if (r.draws > 0) str += `-${r.draws}`;
    str += ` (${r.kos} KOs)`;
    return str;
  }

  /**
   * Calculate win percentage
   */
  getWinPercentage() {
    const total = this.career.record.wins + this.career.record.losses + this.career.record.draws;
    if (total === 0) return 0;
    return (this.career.record.wins / total) * 100;
  }

  /**
   * Calculate KO percentage
   */
  getKOPercentage() {
    if (this.career.record.wins === 0) return 0;
    return (this.career.record.kos / this.career.record.wins) * 100;
  }

  /**
   * Check if fighter can compete (not injured, suspended, or retired)
   */
  canFight() {
    return this.career.phase !== CareerPhase.RETIRED &&
           this.career.injuries.length === 0 &&
           this.career.suspensions.length === 0;
  }

  /**
   * Check if fighter should retire based on various factors
   */
  shouldConsiderRetirement(currentDate) {
    const age = this.getAge(currentDate);
    const record = this.career.record;

    // Age factor - older fighters more likely to retire
    if (age >= 40) return true;
    if (age >= 38 && this.career.consecutiveLosses >= 2) return true;

    // After severe KO losses
    if (record.koLosses >= 4) return true;

    // Losing record in decline
    if (this.career.phase === CareerPhase.DECLINE &&
        record.losses > record.wins) return true;

    // Long losing streak
    if (this.career.consecutiveLosses >= 4) return true;

    return false;
  }

  /**
   * Record a fight result
   */
  recordFightResult(result, currentDate) {
    const isWin = result.winner === this.id;
    const isKO = result.method === 'KO' || result.method === 'TKO';

    // Update record
    if (isWin) {
      this.career.record.wins++;
      if (isKO) this.career.record.kos++;
      this.career.consecutiveWins++;
      this.career.consecutiveLosses = 0;
    } else if (result.method === 'Draw') {
      this.career.record.draws++;
    } else {
      this.career.record.losses++;
      if (isKO) this.career.record.koLosses++;
      this.career.consecutiveLosses++;
      this.career.consecutiveWins = 0;
    }

    // Update activity
    this.career.lastFightDate = { ...currentDate };
    this.career.fightsThisYear++;
    this.career.weeksInactive = 0;

    // Add to fight history with replay data
    this.fightHistory.push({
      date: { ...currentDate },
      opponent: result.opponent,
      opponentName: result.opponentName,
      result: isWin ? 'W' : (result.method === 'Draw' ? 'D' : 'L'),
      method: result.method,
      round: result.round,
      totalRounds: result.totalRounds || 10,
      wasTitle: result.wasTitle || false,
      title: result.title || null,
      // Store replay data if provided
      replayData: result.replayData || null
    });

    // Update popularity based on result
    this.updatePopularityFromFight(result, isWin, isKO);

    // Check for career phase transitions
    this.updateCareerPhase(currentDate);
  }

  /**
   * Update popularity based on fight result
   */
  updatePopularityFromFight(result, isWin, isKO) {
    let change = 0;

    if (isWin) {
      change = 2;
      if (isKO) change += 2;
      if (result.wasTitle) change += 5;
      if (result.wasUpset) change += 5;
    } else {
      change = -2;
      if (isKO) change -= 2;
      if (result.wasTitle) change -= 3;
    }

    // Exciting fights boost popularity regardless of result
    if (result.fightOfTheNight) change += 3;

    this.career.popularity = Math.max(0, Math.min(100,
      this.career.popularity + change
    ));
  }

  /**
   * Update career phase based on current status
   */
  updateCareerPhase(currentDate) {
    const age = this.getAge(currentDate);
    const record = this.career.record;
    const totalFights = record.wins + record.losses + record.draws;

    // Check for retirement conditions
    if (this.shouldConsiderRetirement(currentDate)) {
      this.career.phase = CareerPhase.DECLINE;
      return;
    }

    // Already retired
    if (this.career.phase === CareerPhase.RETIRED) return;

    // Champion phase
    if (this.career.titles.length > 0) {
      this.career.phase = CareerPhase.CHAMPION;
      return;
    }

    // Contender phase (ranked)
    if (this.career.rankings.current !== null && this.career.rankings.current <= 15) {
      this.career.phase = CareerPhase.CONTENDER;
      return;
    }

    // Gatekeeper - experienced but not elite
    if (totalFights >= 25 && age >= 30 && !this.isInPhysicalPrime(currentDate)) {
      this.career.phase = CareerPhase.GATEKEEPER;
      return;
    }

    // Rising - building record
    if (totalFights >= 5 && totalFights < 25 && record.wins > record.losses) {
      this.career.phase = CareerPhase.RISING;
      return;
    }

    // Pro debut
    if (totalFights < 5 && this.career.proDebutDate) {
      this.career.phase = CareerPhase.PRO_DEBUT;
      return;
    }

    // Decline
    if (age >= 35 || this.career.consecutiveLosses >= 3) {
      this.career.phase = CareerPhase.DECLINE;
      return;
    }
  }

  /**
   * Retire the fighter
   */
  retire(currentDate) {
    this.career.phase = CareerPhase.RETIRED;
    this.career.retirementDate = { ...currentDate };
  }

  /**
   * Add a title to the fighter's collection
   */
  addTitle(title, wonDate) {
    this.career.titles.push({
      title,
      wonDate: { ...wonDate },
      lostDate: null,
      defenses: 0
    });
    this.career.phase = CareerPhase.CHAMPION;
  }

  /**
   * Remove a title (lost or vacated)
   */
  removeTitle(title, lostDate, reason = 'Lost') {
    const titleEntry = this.career.titles.find(t => t.title === title && !t.lostDate);
    if (titleEntry) {
      titleEntry.lostDate = { ...lostDate };
      titleEntry.lostReason = reason;
    }

    // Update phase if no more titles
    if (!this.career.titles.some(t => !t.lostDate)) {
      this.career.phase = CareerPhase.CONTENDER;
    }
  }

  /**
   * Calculate ranking score for this fighter
   * Used by division to determine rankings
   */
  calculateRankingScore() {
    const record = this.career.record;
    const totalFights = record.wins + record.losses + record.draws;
    if (totalFights === 0) return 0;

    let score = 0;

    // Win percentage (up to 40 points)
    score += (record.wins / totalFights) * 40;

    // Quality wins bonus (based on opponents beaten - simplified for now)
    score += Math.min(20, record.wins * 0.5);

    // KO bonus
    score += Math.min(10, (record.kos / Math.max(1, record.wins)) * 10);

    // Activity bonus (fights in last year)
    score += Math.min(10, this.career.fightsThisYear * 2);

    // Streak bonus
    score += Math.min(10, this.career.consecutiveWins * 2);

    // Penalty for losses
    score -= this.career.consecutiveLosses * 5;

    // Inactivity penalty
    if (this.career.weeksInactive > 26) {
      score -= (this.career.weeksInactive - 26) * 0.5;
    }

    return Math.max(0, score);
  }

  /**
   * Convert to combat-ready Fighter for actual fight simulation
   * Strips universe-specific data and returns base Fighter
   */
  toCombatFighter() {
    return new Fighter({
      identity: {
        name: this.name,
        nickname: this.nickname,
        nationality: this.nationality,
        hometown: this.hometown
      },
      physical: { ...this.physical },
      style: { ...this.style },
      power: { ...this.power },
      speed: { ...this.speed },
      stamina: { ...this.stamina },
      defense: { ...this.defense },
      offense: { ...this.offense },
      technical: { ...this.technical },
      mental: { ...this.mental },
      tactics: { ...this.tactics },
      corner: { ...this.corner },
      record: { ...this.career.record }
    });
  }

  /**
   * Serialize to JSON for saving
   */
  toJSON() {
    return {
      // Base fighter data
      identity: {
        name: this.name,
        nickname: this.nickname,
        nationality: this.nationality,
        hometown: this.hometown
      },
      physical: this.physical,
      style: this.style,
      power: this.power,
      speed: this.speed,
      stamina: this.stamina,
      defense: this.defense,
      offense: this.offense,
      technical: this.technical,
      mental: this.mental,
      tactics: this.tactics,
      corner: this.corner,

      // Universe-specific data
      id: this.id,
      career: this.career,
      relationships: this.relationships,
      potential: this.potential,
      baseAttributes: this.baseAttributes,
      fightHistory: this.fightHistory,
      personality: this.personality
    };
  }

  /**
   * Create from saved JSON
   */
  static fromJSON(data) {
    const fighter = new UniverseFighter(data, {
      id: data.id,
      ...data.career,
      ...data.relationships,
      ...data.potential,
      personality: data.personality,
      fightHistory: data.fightHistory
    });

    fighter.baseAttributes = data.baseAttributes;

    return fighter;
  }
}

export default UniverseFighter;
