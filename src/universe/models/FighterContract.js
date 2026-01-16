/**
 * Fighter Contract Model
 * Represents a promotional contract between a fighter and promoter
 * Tracks fight counts, purse minimums, and contract status
 */

import { v4 as uuidv4 } from 'uuid';

// Contract status types
export const ContractStatus = {
  ACTIVE: 'ACTIVE',         // Contract in effect
  FULFILLED: 'FULFILLED',   // All fights completed
  EXPIRED: 'EXPIRED',       // Time ran out
  TERMINATED: 'TERMINATED', // Ended early (by either party)
  NEGOTIATING: 'NEGOTIATING' // In negotiation phase
};

// Contract type classifications
export const ContractType = {
  PROMOTIONAL: 'PROMOTIONAL',    // Standard promotional deal
  CO_PROMOTIONAL: 'CO_PROMOTIONAL', // Shared with another promoter
  ONE_FIGHT: 'ONE_FIGHT',        // Single fight deal
  EXCLUSIVE: 'EXCLUSIVE',        // Full exclusivity
  DEVELOPMENT: 'DEVELOPMENT'     // Prospect development deal
};

export class FighterContract {
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.fighterId = config.fighterId;
    this.promoterId = config.promoterId;

    // Contract terms
    this.terms = {
      // Fight requirements
      fightCount: config.fightCount || 3,
      fightsRemaining: config.fightsRemaining ?? config.fightCount ?? 3,

      // Financial terms
      purseMinimum: config.purseMinimum || 50000,
      purseEscalator: config.purseEscalator || 1.1, // 10% increase per win
      ppvShare: config.ppvShare || 0,               // % of PPV revenue
      sponsorshipShare: config.sponsorshipShare || 0.5, // 50% of personal sponsors

      // Exclusivity
      exclusivity: config.exclusivity ?? true,
      coPromoter: config.coPromoter || null,

      // Duration
      startDate: config.startDate || null,
      endDate: config.endDate || null,
      durationWeeks: config.durationWeeks || 156, // 3 years default

      // Options
      optionFights: config.optionFights || 0,      // Additional fights promoter can trigger
      titleShotClause: config.titleShotClause || false, // Must get title shot if available
      rematchClause: config.rematchClause || false     // Automatic rematch if champion loses
    };

    // Contract type
    this.type = config.type || ContractType.PROMOTIONAL;

    // Status tracking
    this.status = config.status || ContractStatus.ACTIVE;
    this.fightsDone = config.fightsDone || 0;
    this.totalEarned = config.totalEarned || 0;

    // Fight history under this contract
    this.fights = config.fights || [];

    // Current purse level (increases with wins)
    this.currentPurse = config.currentPurse || this.terms.purseMinimum;
  }

  /**
   * Record a fight completed under this contract
   */
  recordFight(fightResult) {
    const { purse = 0, ppvBonus = 0, won = false, date = null } = fightResult;

    this.fightsDone++;
    this.terms.fightsRemaining--;
    this.totalEarned += purse + ppvBonus;

    // Track fight
    this.fights.push({
      date,
      purse,
      ppvBonus,
      won,
      totalPaid: purse + ppvBonus
    });

    // Increase purse for next fight if won
    if (won && this.terms.purseEscalator > 1) {
      this.currentPurse = Math.round(this.currentPurse * this.terms.purseEscalator);
    }

    // Check if contract is fulfilled
    if (this.terms.fightsRemaining <= 0 && this.terms.optionFights <= 0) {
      this.status = ContractStatus.FULFILLED;
    }

    return {
      fightsRemaining: this.terms.fightsRemaining,
      totalEarned: this.totalEarned,
      nextPurse: this.currentPurse,
      contractFulfilled: this.status === ContractStatus.FULFILLED
    };
  }

  /**
   * Exercise option fights (promoter's decision)
   */
  exerciseOption(numberOfFights = 1) {
    if (this.terms.optionFights <= 0) {
      return { success: false, reason: 'No option fights available' };
    }

    const fightsToAdd = Math.min(numberOfFights, this.terms.optionFights);
    this.terms.optionFights -= fightsToAdd;
    this.terms.fightsRemaining += fightsToAdd;
    this.terms.fightCount += fightsToAdd;

    // Reactivate if was fulfilled
    if (this.status === ContractStatus.FULFILLED) {
      this.status = ContractStatus.ACTIVE;
    }

    return {
      success: true,
      fightsAdded: fightsToAdd,
      fightsRemaining: this.terms.fightsRemaining,
      optionsRemaining: this.terms.optionFights
    };
  }

  /**
   * Check if contract allows the fighter to take a fight
   */
  canFight() {
    return this.status === ContractStatus.ACTIVE &&
           this.terms.fightsRemaining > 0;
  }

  /**
   * Check if contract is still valid (not expired)
   */
  isValid(currentDate) {
    if (this.status !== ContractStatus.ACTIVE) return false;

    if (this.terms.endDate && currentDate) {
      const endWeeks = this.terms.endDate.year * 52 + this.terms.endDate.week;
      const currentWeeks = currentDate.year * 52 + currentDate.week;
      if (currentWeeks >= endWeeks) {
        this.status = ContractStatus.EXPIRED;
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate remaining value of contract
   */
  getRemainingValue() {
    // Minimum value is remaining fights * current purse
    return this.terms.fightsRemaining * this.currentPurse;
  }

  /**
   * Get contract progress as percentage
   */
  getProgress() {
    const totalFights = this.terms.fightCount;
    if (totalFights === 0) return 100;
    return Math.round((this.fightsDone / totalFights) * 100);
  }

  /**
   * Terminate contract early
   */
  terminate(reason = 'Mutual agreement', terminatingParty = null) {
    this.status = ContractStatus.TERMINATED;
    this.terminationDetails = {
      reason,
      terminatingParty,
      fightsRemaining: this.terms.fightsRemaining,
      totalEarned: this.totalEarned
    };

    return this.terminationDetails;
  }

  /**
   * Calculate buyout cost (to end contract early)
   */
  calculateBuyout() {
    // Buyout = remaining purses + 20% penalty
    const remainingValue = this.getRemainingValue();
    return Math.round(remainingValue * 1.2);
  }

  /**
   * Check if fighter is owed a title shot
   */
  owedTitleShot() {
    return this.terms.titleShotClause && this.fightsDone >= 3;
  }

  /**
   * Serialize for saving
   */
  toJSON() {
    return {
      id: this.id,
      fighterId: this.fighterId,
      promoterId: this.promoterId,
      type: this.type,
      terms: { ...this.terms },
      status: this.status,
      fightsDone: this.fightsDone,
      totalEarned: this.totalEarned,
      currentPurse: this.currentPurse,
      fights: [...this.fights],
      terminationDetails: this.terminationDetails
    };
  }

  /**
   * Create from saved data
   */
  static fromJSON(data) {
    const contract = new FighterContract({
      ...data,
      ...data.terms
    });
    contract.fightsDone = data.fightsDone;
    contract.totalEarned = data.totalEarned;
    contract.currentPurse = data.currentPurse;
    contract.fights = data.fights || [];
    contract.terminationDetails = data.terminationDetails;
    return contract;
  }

  /**
   * Create a standard promotional contract
   */
  static createPromotionalDeal(fighterId, promoterId, options = {}) {
    return new FighterContract({
      fighterId,
      promoterId,
      type: ContractType.PROMOTIONAL,
      fightCount: options.fightCount || 3,
      purseMinimum: options.purseMinimum || 50000,
      purseEscalator: options.purseEscalator || 1.1,
      ppvShare: options.ppvShare || 0,
      exclusivity: true,
      optionFights: options.optionFights || 2,
      startDate: options.startDate,
      durationWeeks: options.durationWeeks || 156
    });
  }

  /**
   * Create a one-fight deal
   */
  static createOneFightDeal(fighterId, promoterId, purse, options = {}) {
    return new FighterContract({
      fighterId,
      promoterId,
      type: ContractType.ONE_FIGHT,
      fightCount: 1,
      purseMinimum: purse,
      purseEscalator: 1,
      ppvShare: options.ppvShare || 0,
      exclusivity: false,
      optionFights: 0,
      startDate: options.startDate,
      durationWeeks: 26 // 6 months
    });
  }

  /**
   * Create a development deal for prospects
   */
  static createDevelopmentDeal(fighterId, promoterId, options = {}) {
    return new FighterContract({
      fighterId,
      promoterId,
      type: ContractType.DEVELOPMENT,
      fightCount: options.fightCount || 6,
      purseMinimum: options.purseMinimum || 15000,
      purseEscalator: 1.15, // Bigger jumps for prospects
      ppvShare: 0,
      exclusivity: true,
      optionFights: options.optionFights || 4,
      titleShotClause: true, // Must give title shot if they earn it
      startDate: options.startDate,
      durationWeeks: options.durationWeeks || 208 // 4 years
    });
  }
}

export default FighterContract;
