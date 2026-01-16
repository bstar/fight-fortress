/**
 * Fight Economics Calculator
 * Calculates revenue streams and expenses for fight cards
 * Handles gate, PPV, broadcast rights, and sponsorship revenue
 *
 * Updated with era-based economics and division multipliers
 */

import { MarketValue } from './MarketValue.js';
import { EraConfig, RevenueModel, RealismLevel } from './EraConfig.js';

// Fight type constants
export const FightPosition = {
  TITLE_FIGHT: 'TITLE_FIGHT',
  ELIMINATOR: 'ELIMINATOR',
  MAIN_EVENT: 'MAIN_EVENT',
  CO_MAIN: 'CO_MAIN',
  UNDERCARD: 'UNDERCARD'
};

// Venue configurations (base 2020s values - will be scaled by era)
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
   * @param {Object} options - Era options { year, division, realismLevel }
   * @returns {Object} Revenue breakdown
   */
  static calculateRevenue(fighterA, fighterB, fightType = FightPosition.MAIN_EVENT, venue = null, options = {}) {
    const {
      year = 2020,
      division = 'Heavyweight',
      realismLevel = RealismLevel.SIMPLIFIED
    } = options;

    const revenue = {
      gate: 0,
      ppv: 0,
      ppvBuys: 0,
      closedCircuit: 0,
      broadcast: 0,
      sponsorship: 0,
      international: 0,
      streaming: 0,
      total: 0
    };

    // Combined draw power
    const combinedDraw = MarketValue.calculateCombinedDraw(fighterA, fighterB);
    const venueConfig = venue || this.selectVenue(combinedDraw, fightType);

    // Get era configuration
    const inflationMult = EraConfig.getInflationMultiplier(year, realismLevel);
    const divisionMult = EraConfig.getDivisionMultiplier(division);
    const revenueModel = EraConfig.getRevenueModel(year);
    const sponsorshipMult = EraConfig.getSponsorshipMultiplier(year, realismLevel);

    // 1. Gate revenue (always available, scaled by era and division)
    const eraTicketPrice = EraConfig.getBaseTicketPrice(year, realismLevel);
    const ticketMultiplier = this.getTicketPriceMultiplier(fightType, combinedDraw);
    const baseTicketPrice = eraTicketPrice * ticketMultiplier;
    const selloutPct = this.calculateSelloutPercentage(combinedDraw);

    revenue.gate = Math.round(
      venueConfig.capacity * baseTicketPrice * selloutPct * divisionMult
    );

    // 2. Era-specific revenue streams based on revenue model
    switch (revenueModel) {
      case RevenueModel.GATE_ONLY:
        // Pre-TV era: gate is everything, no other significant revenue
        // Slightly boost gate for big fights since it was the only draw
        if (combinedDraw > 80 || fightType === FightPosition.TITLE_FIGHT) {
          revenue.gate = Math.round(revenue.gate * 1.3);
        }
        break;

      case RevenueModel.CLOSED_CIRCUIT_TV:
        // 1960s-70s: closed circuit theaters
        if (combinedDraw > 60 || fightType === FightPosition.TITLE_FIGHT) {
          const venues = Math.min(300, Math.floor(combinedDraw * 3));
          const avgTheaterCapacity = 500;
          const ccTicketPrice = baseTicketPrice * 0.6; // Cheaper than live
          revenue.closedCircuit = Math.round(
            venues * avgTheaterCapacity * ccTicketPrice * selloutPct * divisionMult
          );
        }
        // Broadcast rights start appearing
        revenue.broadcast = Math.round(
          this.calculateBroadcastFee(combinedDraw, fightType) * inflationMult * divisionMult
        );
        // Early sponsorship
        revenue.sponsorship = Math.round(
          combinedDraw * 3000 * inflationMult * divisionMult * sponsorshipMult
        );
        break;

      case RevenueModel.PPV_DOMINANT:
        // 1980s-2000s: home PPV is king
        const isPPV = fightType === FightPosition.TITLE_FIGHT || combinedDraw > 70;
        if (isPPV) {
          const ppvPrice = EraConfig.getPPVPrice(year, realismLevel);
          const maxBuys = EraConfig.getMaxPPVBuys(year, realismLevel);
          const ppvBuys = this.estimatePPVBuys(combinedDraw, fightType, maxBuys);
          const promoterShare = 0.5; // Split with platform
          revenue.ppvBuys = Math.round(ppvBuys * divisionMult);
          revenue.ppv = Math.round(revenue.ppvBuys * ppvPrice * promoterShare);
        }
        // Non-PPV fights get broadcast
        if (!isPPV) {
          revenue.broadcast = Math.round(
            this.calculateBroadcastFee(combinedDraw, fightType) * inflationMult * divisionMult
          );
        }
        // Full sponsorship
        revenue.sponsorship = Math.round(
          this.calculateSponsorship(combinedDraw, fightType) * inflationMult * divisionMult
        );
        // International rights
        revenue.international = Math.round(
          this.calculateInternationalRights(combinedDraw, fightType) * inflationMult * divisionMult
        );
        break;

      case RevenueModel.STREAMING_HYBRID:
        // 2010s+: PPV + streaming
        const isModernPPV = fightType === FightPosition.TITLE_FIGHT || combinedDraw > 70;
        if (isModernPPV) {
          const ppvPrice = EraConfig.getPPVPrice(year, realismLevel);
          const maxBuys = EraConfig.getMaxPPVBuys(year, realismLevel);
          const ppvBuys = this.estimatePPVBuys(combinedDraw, fightType, maxBuys);
          revenue.ppvBuys = Math.round(ppvBuys * divisionMult);
          revenue.ppv = Math.round(revenue.ppvBuys * ppvPrice * 0.5);
          // Streaming adds 20% bonus
          revenue.streaming = Math.round(revenue.ppv * 0.2);
        }
        if (!isModernPPV) {
          revenue.broadcast = Math.round(
            this.calculateBroadcastFee(combinedDraw, fightType) * inflationMult * divisionMult
          );
        }
        // Enhanced sponsorship in modern era
        revenue.sponsorship = Math.round(
          this.calculateSponsorship(combinedDraw, fightType) * inflationMult * divisionMult * sponsorshipMult
        );
        // Global international rights
        revenue.international = Math.round(
          this.calculateInternationalRights(combinedDraw, fightType) * inflationMult * divisionMult * 1.5
        );
        break;
    }

    // Total
    revenue.total = revenue.gate + revenue.ppv + revenue.closedCircuit +
                    revenue.broadcast + revenue.sponsorship +
                    revenue.international + revenue.streaming;

    // Metadata
    revenue.venue = venueConfig;
    revenue.combinedDraw = combinedDraw;
    revenue.isPPV = revenue.ppv > 0;
    revenue.era = EraConfig.getEraFromYear(year);
    revenue.divisionMultiplier = divisionMult;
    revenue.inflationMultiplier = inflationMult;
    revenue.year = year;
    revenue.division = division;

    return revenue;
  }

  /**
   * Estimate PPV buys based on draw, fight type, and era max
   * @param {number} combinedDraw
   * @param {string} fightType
   * @param {number} maxBuys - Era-specific max PPV buys
   * @returns {number}
   */
  static estimatePPVBuys(combinedDraw, fightType, maxBuys = 2000000) {
    // Base: 50k minimum, scales up based on draw
    const baseMultiplier = combinedDraw / 100;
    let buys = 50000 + (baseMultiplier * (maxBuys * 0.25));

    // Title fights get 50% bonus
    if (fightType === FightPosition.TITLE_FIGHT) {
      buys *= 1.5;
    }

    // Mega fights (90+ draw) can hit max
    if (combinedDraw > 90) {
      buys *= 2;
    } else if (combinedDraw > 80) {
      buys *= 1.5;
    }

    // Cap at max buys for era
    buys = Math.min(buys, maxBuys);

    // Add variance (+/- 15%)
    const variance = 0.85 + (Math.random() * 0.3);
    buys *= variance;

    return Math.round(buys);
  }

  /**
   * Get ticket price multiplier by fight type and draw
   */
  static getTicketPriceMultiplier(fightType, combinedDraw) {
    const baseMultipliers = {
      [FightPosition.TITLE_FIGHT]: 2.5,
      [FightPosition.ELIMINATOR]: 1.5,
      [FightPosition.MAIN_EVENT]: 1.0,
      [FightPosition.CO_MAIN]: 0.75,
      [FightPosition.UNDERCARD]: 0.5
    };

    let multiplier = baseMultipliers[fightType] || 1;

    // Premium for high-draw fights
    if (combinedDraw > 80) {
      multiplier *= 1.5;
    } else if (combinedDraw > 60) {
      multiplier *= 1.25;
    }

    return multiplier;
  }

  /**
   * Calculate sellout percentage based on draw
   * Range: 40% - 100%
   */
  static calculateSelloutPercentage(combinedDraw) {
    return Math.min(1, 0.4 + (combinedDraw / 100) * 0.6);
  }

  /**
   * Calculate broadcast rights fee (non-PPV)
   * Returns base value (will be scaled by inflation/division)
   */
  static calculateBroadcastFee(combinedDraw, fightType) {
    let baseFee = 100000;
    baseFee += combinedDraw * 5000;

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
   * Returns base value (will be scaled by inflation/division)
   */
  static calculateSponsorship(combinedDraw, fightType) {
    let sponsorship = combinedDraw * 3000;

    if (fightType === FightPosition.TITLE_FIGHT) {
      sponsorship *= 2;
    }

    return Math.round(sponsorship);
  }

  /**
   * Calculate international broadcast rights
   * Returns base value (will be scaled by inflation/division)
   */
  static calculateInternationalRights(combinedDraw, fightType) {
    let rights = combinedDraw * 2000;

    if (fightType === FightPosition.TITLE_FIGHT) {
      rights *= 2;
    }

    return Math.round(rights);
  }

  /**
   * Select appropriate venue based on draw and fight type
   */
  static selectVenue(combinedDraw, fightType) {
    if (fightType === FightPosition.TITLE_FIGHT && combinedDraw > 85) {
      return VenueType.STADIUM;
    }
    if (combinedDraw > 60 || fightType === FightPosition.TITLE_FIGHT) {
      return VenueType.ARENA;
    }
    if (combinedDraw > 40) {
      return VenueType.CASINO;
    }
    if (combinedDraw > 25) {
      return VenueType.THEATER;
    }
    return VenueType.CLUB;
  }

  /**
   * Calculate fight expenses with revenue-based purses
   * CRITICAL FIX: Purses are now percentage of revenue, not market value
   * @param {UniverseFighter} fighterA
   * @param {UniverseFighter} fighterB
   * @param {string} fightType
   * @param {Object} venue
   * @param {Object} options - Era options { year, division, realismLevel }
   * @returns {Object} Expense breakdown
   */
  static calculateExpenses(fighterA, fighterB, fightType = FightPosition.MAIN_EVENT, venue = null, options = {}) {
    const {
      year = 2020,
      division = 'Heavyweight',
      realismLevel = RealismLevel.SIMPLIFIED
    } = options;

    // FIRST: Calculate total revenue
    const revenue = this.calculateRevenue(fighterA, fighterB, fightType, venue, options);

    // Get era configuration
    const inflationMult = EraConfig.getInflationMultiplier(year, realismLevel);
    const purseSplitRatio = EraConfig.getPurseSplitRatio(year, realismLevel);

    const combinedDraw = revenue.combinedDraw;
    const venueConfig = venue || this.selectVenue(combinedDraw, fightType);

    const expenses = {
      purseA: 0,
      purseB: 0,
      purseSplit: null,
      totalPurses: 0,
      venue: Math.round(venueConfig.rentalCost * inflationMult),
      production: 0,
      marketing: 0,
      sanctioning: 0,
      insurance: 0,
      staff: 0,
      misc: 0,
      total: 0
    };

    // CRITICAL FIX: Purse pool is percentage of REVENUE, not market value
    const totalPursePool = Math.round(revenue.total * purseSplitRatio);

    // Get market values for split calculation only (not purse amount)
    const splitRatio = MarketValue.calculatePurseSplit(fighterA, fighterB);
    expenses.purseSplit = splitRatio;

    // Split purse pool by market value ratio (with 30% B-side minimum enforced by MarketValue)
    expenses.purseA = Math.round(totalPursePool * splitRatio.fighterA);
    expenses.purseB = Math.round(totalPursePool * splitRatio.fighterB);
    expenses.totalPurses = expenses.purseA + expenses.purseB;

    // Production costs (scaled by inflation)
    expenses.production = Math.round(
      this.getProductionCosts(fightType, venueConfig) * inflationMult
    );

    // Marketing costs (scaled by inflation)
    expenses.marketing = Math.round(
      this.getMarketingCosts(fightType, combinedDraw) * inflationMult
    );

    // Sanctioning fees (title fights only)
    expenses.sanctioning = Math.round(
      (fightType === FightPosition.TITLE_FIGHT ? 50000 : 10000) * inflationMult
    );

    // Insurance (scaled by inflation)
    expenses.insurance = Math.round(
      (25000 + (combinedDraw * 250)) * inflationMult
    );

    // Staff and operations
    expenses.staff = Math.round(venueConfig.capacity * 5 * inflationMult);

    // Miscellaneous (5% of other expenses)
    const subtotal = expenses.totalPurses + expenses.venue +
                     expenses.production + expenses.marketing +
                     expenses.sanctioning + expenses.insurance + expenses.staff;
    expenses.misc = Math.round(subtotal * 0.05);

    // Total
    expenses.total = subtotal + expenses.misc;

    // Add metadata
    expenses.year = year;
    expenses.division = division;
    expenses.revenueTotal = revenue.total;
    expenses.purseSplitRatio = purseSplitRatio;

    return expenses;
  }

  /**
   * Get production costs by fight type and venue
   * Returns base 2020s value (will be scaled by inflation)
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
   * Returns base 2020s value (will be scaled by inflation)
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
    cost *= 0.5 + (combinedDraw / 100);

    return Math.round(cost);
  }

  /**
   * Calculate profit/loss for a fight
   */
  static calculateProfit(fighterA, fighterB, fightType, venue = null, options = {}) {
    const revenue = this.calculateRevenue(fighterA, fighterB, fightType, venue, options);
    const expenses = this.calculateExpenses(fighterA, fighterB, fightType, venue, options);

    const profit = revenue.total - expenses.total;
    const roi = expenses.total > 0 ? profit / expenses.total : 0;
    const ppvPrice = EraConfig.getPPVPrice(options.year || 2020, options.realismLevel);

    return {
      revenue,
      expenses,
      profit,
      roi,
      profitMargin: revenue.total > 0 ? profit / revenue.total : 0,
      isProfitable: profit > 0,
      breakEvenPPV: revenue.isPPV && ppvPrice > 0
        ? Math.ceil(expenses.total / (ppvPrice * 0.5))
        : null
    };
  }

  /**
   * Calculate fighter purse for a specific fight
   * Now based on revenue percentage rather than market value
   */
  static calculateFighterPurse(fighter, opponent, fightType, options = {}) {
    const revenue = this.calculateRevenue(fighter, opponent, fightType, null, options);
    const purseSplitRatio = EraConfig.getPurseSplitRatio(
      options.year || 2020,
      options.realismLevel || RealismLevel.SIMPLIFIED
    );

    const totalPursePool = Math.round(revenue.total * purseSplitRatio);
    const split = MarketValue.calculatePurseSplit(fighter, opponent);

    // Determine if fighter is A-side
    const fighterValue = MarketValue.calculate(fighter);
    const opponentValue = MarketValue.calculate(opponent);
    const isASide = fighterValue >= opponentValue;
    const ratio = isASide ? split.fighterA : split.fighterB;

    return {
      base: Math.round(totalPursePool * ratio),
      split: ratio,
      isASide,
      totalPool: totalPursePool,
      fightRevenue: revenue.total
    };
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount) {
    return MarketValue.formatValue(amount);
  }

  /**
   * Get base ticket price for legacy compatibility
   * @deprecated Use getTicketPriceMultiplier with era config instead
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

    if (combinedDraw > 80) {
      price *= 1.5;
    } else if (combinedDraw > 60) {
      price *= 1.25;
    }

    return price;
  }
}

export default FightEconomics;
