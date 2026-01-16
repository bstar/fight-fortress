/**
 * Fight Economics Calculator
 * Calculates revenue streams and expenses for fight cards
 * Handles gate, PPV, broadcast rights, and sponsorship revenue
 */

import { MarketValue } from './MarketValue.js';

// Fight type constants
export const FightPosition = {
  TITLE_FIGHT: 'TITLE_FIGHT',
  ELIMINATOR: 'ELIMINATOR',
  MAIN_EVENT: 'MAIN_EVENT',
  CO_MAIN: 'CO_MAIN',
  UNDERCARD: 'UNDERCARD'
};

// Venue configurations
export const VenueType = {
  ARENA: { name: 'Arena', capacity: 18000, rentalCost: 250000 },
  STADIUM: { name: 'Stadium', capacity: 50000, rentalCost: 1000000 },
  CASINO: { name: 'Casino', capacity: 8000, rentalCost: 150000 },
  THEATER: { name: 'Theater', capacity: 3000, rentalCost: 75000 },
  CLUB: { name: 'Club', capacity: 1000, rentalCost: 25000 }
};

export class FightEconomics {
  /**
   * Calculate total revenue potential for a fight
   * @param {UniverseFighter} fighterA
   * @param {UniverseFighter} fighterB
   * @param {string} fightType - Fight position on card
   * @param {Object} venue - Venue configuration
   * @returns {Object} Revenue breakdown
   */
  static calculateRevenue(fighterA, fighterB, fightType = FightPosition.MAIN_EVENT, venue = null) {
    const revenue = {
      gate: 0,
      ppv: 0,
      ppvBuys: 0,
      broadcast: 0,
      sponsorship: 0,
      international: 0,
      total: 0
    };

    // Combined draw power
    const combinedDraw = MarketValue.calculateCombinedDraw(fighterA, fighterB);

    // 1. Gate revenue
    const venueConfig = venue || this.selectVenue(combinedDraw, fightType);
    const baseTicketPrice = this.getBaseTicketPrice(fightType, combinedDraw);
    const selloutPct = this.calculateSelloutPercentage(combinedDraw);

    revenue.gate = Math.round(
      venueConfig.capacity * baseTicketPrice * selloutPct
    );

    // 2. PPV revenue (only for major fights with high draw)
    const isPPV = fightType === FightPosition.TITLE_FIGHT || combinedDraw > 70;
    if (isPPV) {
      const ppvBuys = this.estimatePPVBuys(combinedDraw, fightType);
      const ppvPrice = 79.99;
      const promoterShare = 0.5; // Split with platform

      revenue.ppvBuys = ppvBuys;
      revenue.ppv = Math.round(ppvBuys * ppvPrice * promoterShare);
    }

    // 3. Broadcast rights (non-PPV fights)
    if (!isPPV) {
      revenue.broadcast = this.calculateBroadcastFee(combinedDraw, fightType);
    }

    // 4. Sponsorship
    revenue.sponsorship = this.calculateSponsorship(combinedDraw, fightType);

    // 5. International rights
    revenue.international = this.calculateInternationalRights(combinedDraw, fightType);

    // Total
    revenue.total = revenue.gate + revenue.ppv + revenue.broadcast +
                    revenue.sponsorship + revenue.international;

    // Add venue info for reference
    revenue.venue = venueConfig;
    revenue.combinedDraw = combinedDraw;
    revenue.isPPV = isPPV;

    return revenue;
  }

  /**
   * Estimate PPV buys based on draw and fight type
   * Range: 50,000 - 2,000,000+
   */
  static estimatePPVBuys(combinedDraw, fightType) {
    // Base: 50k minimum, scales up to 500k at draw 100
    let buys = 50000 + (combinedDraw / 100) * 450000;

    // Title fights get 50% bonus
    if (fightType === FightPosition.TITLE_FIGHT) {
      buys *= 1.5;
    }

    // Mega fights (90+ draw) can hit 1M+
    if (combinedDraw > 90) {
      buys *= 2;
    } else if (combinedDraw > 80) {
      buys *= 1.5;
    }

    // Add variance (+/- 20%)
    const variance = 0.8 + (Math.random() * 0.4);
    buys *= variance;

    return Math.round(buys);
  }

  /**
   * Calculate base ticket price by fight type and draw
   */
  static getBaseTicketPrice(fightType, combinedDraw) {
    const basePrices = {
      [FightPosition.TITLE_FIGHT]: 250,
      [FightPosition.ELIMINATOR]: 150,
      [FightPosition.MAIN_EVENT]: 100,
      [FightPosition.CO_MAIN]: 75,
      [FightPosition.UNDERCARD]: 50
    };

    let price = basePrices[fightType] || 50;

    // Premium for high-draw fights
    if (combinedDraw > 80) {
      price *= 1.5;
    } else if (combinedDraw > 60) {
      price *= 1.25;
    }

    return price;
  }

  /**
   * Calculate sellout percentage based on draw
   * Range: 40% - 100%
   */
  static calculateSelloutPercentage(combinedDraw) {
    // Base 40%, scales to 100% at draw 100
    return Math.min(1, 0.4 + (combinedDraw / 100) * 0.6);
  }

  /**
   * Calculate broadcast rights fee (non-PPV)
   */
  static calculateBroadcastFee(combinedDraw, fightType) {
    let baseFee = 100000;

    // Scale by draw
    baseFee += combinedDraw * 5000;

    // Fight type multipliers
    const typeMultipliers = {
      [FightPosition.TITLE_FIGHT]: 3,
      [FightPosition.ELIMINATOR]: 2,
      [FightPosition.MAIN_EVENT]: 1.5,
      [FightPosition.CO_MAIN]: 0.75,
      [FightPosition.UNDERCARD]: 0.25
    };

    return Math.round(baseFee * (typeMultipliers[fightType] || 1));
  }

  /**
   * Calculate sponsorship revenue
   */
  static calculateSponsorship(combinedDraw, fightType) {
    // Base sponsorship scales with draw
    let sponsorship = combinedDraw * 3000;

    // Title fights get more sponsor interest
    if (fightType === FightPosition.TITLE_FIGHT) {
      sponsorship *= 2;
    }

    return Math.round(sponsorship);
  }

  /**
   * Calculate international broadcast rights
   */
  static calculateInternationalRights(combinedDraw, fightType) {
    // Base: scales with draw
    let rights = combinedDraw * 2000;

    // Title fights have more international appeal
    if (fightType === FightPosition.TITLE_FIGHT) {
      rights *= 2;
    }

    return Math.round(rights);
  }

  /**
   * Select appropriate venue based on draw and fight type
   */
  static selectVenue(combinedDraw, fightType) {
    // Title fights with high draw go to stadiums
    if (fightType === FightPosition.TITLE_FIGHT && combinedDraw > 85) {
      return VenueType.STADIUM;
    }

    // High-profile fights go to arenas
    if (combinedDraw > 60 || fightType === FightPosition.TITLE_FIGHT) {
      return VenueType.ARENA;
    }

    // Mid-level fights go to casinos/theaters
    if (combinedDraw > 40) {
      return VenueType.CASINO;
    }

    if (combinedDraw > 25) {
      return VenueType.THEATER;
    }

    // Local fights
    return VenueType.CLUB;
  }

  /**
   * Calculate fight expenses
   * @param {UniverseFighter} fighterA
   * @param {UniverseFighter} fighterB
   * @param {string} fightType
   * @param {Object} venue
   * @returns {Object} Expense breakdown
   */
  static calculateExpenses(fighterA, fighterB, fightType = FightPosition.MAIN_EVENT, venue = null) {
    const combinedDraw = MarketValue.calculateCombinedDraw(fighterA, fighterB);
    const venueConfig = venue || this.selectVenue(combinedDraw, fightType);

    const expenses = {
      purseA: 0,
      purseB: 0,
      purseSplit: null,
      venue: venueConfig.rentalCost,
      production: 0,
      marketing: 0,
      sanctioning: 0,
      insurance: 0,
      staff: 0,
      misc: 0,
      total: 0
    };

    // Fighter purses based on market value
    const valueA = MarketValue.calculate(fighterA);
    const valueB = MarketValue.calculate(fighterB);
    expenses.purseSplit = MarketValue.calculatePurseSplit(fighterA, fighterB);

    // Title fights pay more
    const titleMultiplier = fightType === FightPosition.TITLE_FIGHT ? 1.5 : 1;
    expenses.purseA = Math.round(valueA * titleMultiplier);
    expenses.purseB = Math.round(valueB * titleMultiplier);

    // Production costs
    expenses.production = this.getProductionCosts(fightType, venueConfig);

    // Marketing costs
    expenses.marketing = this.getMarketingCosts(fightType, combinedDraw);

    // Sanctioning fees (title fights only)
    expenses.sanctioning = fightType === FightPosition.TITLE_FIGHT ? 50000 : 10000;

    // Insurance
    expenses.insurance = 25000 + (combinedDraw * 250);

    // Staff and operations
    expenses.staff = Math.round(venueConfig.capacity * 5); // $5 per seat

    // Miscellaneous (5% of other expenses)
    const subtotal = expenses.purseA + expenses.purseB + expenses.venue +
                     expenses.production + expenses.marketing + expenses.sanctioning +
                     expenses.insurance + expenses.staff;
    expenses.misc = Math.round(subtotal * 0.05);

    // Total
    expenses.total = subtotal + expenses.misc;

    return expenses;
  }

  /**
   * Get production costs by fight type and venue
   */
  static getProductionCosts(fightType, venue) {
    const baseCosts = {
      [FightPosition.TITLE_FIGHT]: 500000,
      [FightPosition.ELIMINATOR]: 200000,
      [FightPosition.MAIN_EVENT]: 100000,
      [FightPosition.CO_MAIN]: 50000,
      [FightPosition.UNDERCARD]: 20000
    };

    let cost = baseCosts[fightType] || 20000;

    // Scale with venue size
    const venueMultiplier = venue.capacity / 10000;
    cost *= Math.max(0.5, venueMultiplier);

    return Math.round(cost);
  }

  /**
   * Get marketing costs
   */
  static getMarketingCosts(fightType, combinedDraw) {
    const baseCosts = {
      [FightPosition.TITLE_FIGHT]: 300000,
      [FightPosition.ELIMINATOR]: 150000,
      [FightPosition.MAIN_EVENT]: 75000,
      [FightPosition.CO_MAIN]: 30000,
      [FightPosition.UNDERCARD]: 10000
    };

    let cost = baseCosts[fightType] || 10000;

    // Higher draw = more marketing investment
    cost *= 0.5 + (combinedDraw / 100);

    return Math.round(cost);
  }

  /**
   * Calculate profit/loss for a fight
   */
  static calculateProfit(fighterA, fighterB, fightType, venue = null) {
    const revenue = this.calculateRevenue(fighterA, fighterB, fightType, venue);
    const expenses = this.calculateExpenses(fighterA, fighterB, fightType, venue);

    const profit = revenue.total - expenses.total;
    const roi = expenses.total > 0 ? profit / expenses.total : 0;

    return {
      revenue,
      expenses,
      profit,
      roi,
      profitMargin: revenue.total > 0 ? profit / revenue.total : 0,
      isProfitable: profit > 0,
      breakEvenPPV: revenue.isPPV ? Math.ceil(expenses.total / (79.99 * 0.5)) : null
    };
  }

  /**
   * Calculate fighter purse for a specific fight
   * Takes into account fight value and split ratio
   */
  static calculateFighterPurse(fighter, opponent, fightType, totalPursePool = null) {
    const split = MarketValue.calculatePurseSplit(fighter, opponent);

    // If total pool not specified, use market values
    if (!totalPursePool) {
      const revenue = this.calculateRevenue(fighter, opponent, fightType);
      // Fighters typically get 50-70% of total revenue
      totalPursePool = Math.round(revenue.total * 0.6);
    }

    const isASide = split.aSide === 'fighterA';
    const fighterIsA = true; // Assuming fighter is fighterA position
    const ratio = fighterIsA ? split.fighterA : split.fighterB;

    return {
      base: Math.round(totalPursePool * ratio),
      split: ratio,
      isASide: fighterIsA === isASide
    };
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount) {
    return MarketValue.formatValue(amount);
  }
}

export default FightEconomics;
