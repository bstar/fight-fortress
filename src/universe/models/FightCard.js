/**
 * Fight Card Model
 * Represents a complete boxing event with main event, co-main, and undercard
 * Tracks economics, scheduling, and results
 */

import { v4 as uuidv4 } from 'uuid';
import { FightEconomics, FightPosition, VenueType } from '../economics/FightEconomics.js';
import { MarketValue } from '../economics/MarketValue.js';

// Card status types
export const CardStatus = {
  PLANNING: 'PLANNING',       // Still being put together
  ANNOUNCED: 'ANNOUNCED',     // Publicly announced
  SCHEDULED: 'SCHEDULED',     // Date set, tickets on sale
  FIGHT_WEEK: 'FIGHT_WEEK',   // Week of the event
  COMPLETED: 'COMPLETED',     // Event finished
  CANCELLED: 'CANCELLED'      // Event cancelled
};

// Fight slot on the card
export const FightSlot = {
  MAIN_EVENT: 'MAIN_EVENT',
  CO_MAIN: 'CO_MAIN',
  UNDERCARD_1: 'UNDERCARD_1',
  UNDERCARD_2: 'UNDERCARD_2',
  UNDERCARD_3: 'UNDERCARD_3',
  PRELIM_1: 'PRELIM_1',
  PRELIM_2: 'PRELIM_2'
};

export class FightCard {
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.name = config.name || 'Fight Night';
    this.promoterId = config.promoterId;

    // Scheduling
    this.date = config.date || null;
    this.status = config.status || CardStatus.PLANNING;

    // Venue
    this.venue = config.venue || VenueType.ARENA;
    this.location = config.location || 'Las Vegas, NV';

    // Fights on the card
    this.fights = config.fights || new Map();

    // Main event details
    this.mainEvent = config.mainEvent || null;

    // Financial projections
    this.projectedRevenue = config.projectedRevenue || null;
    this.projectedExpenses = config.projectedExpenses || null;
    this.projectedProfit = config.projectedProfit || null;

    // Actual results (after event)
    this.actualRevenue = config.actualRevenue || null;
    this.actualExpenses = config.actualExpenses || null;
    this.actualProfit = config.actualProfit || null;

    // Ticket sales tracking
    this.tickets = {
      capacity: this.venue.capacity || 10000,
      sold: config.ticketsSold || 0,
      revenue: config.ticketRevenue || 0
    };

    // PPV tracking
    this.ppv = {
      buys: config.ppvBuys || 0,
      revenue: config.ppvRevenue || 0,
      isPPV: config.isPPV || false
    };

    // Card-level purse pool
    this.pursePool = config.pursePool || 0;
  }

  /**
   * Add a fight to the card
   */
  addFight(slot, fightConfig) {
    const { fighterA, fighterB, type, rounds = 10, titleInfo = null } = fightConfig;

    const fight = {
      slot,
      fighterAId: fighterA.id || fighterA,
      fighterBId: fighterB.id || fighterB,
      fighterAName: fighterA.name || 'TBA',
      fighterBName: fighterB.name || 'TBA',
      type: type || this.getTypeForSlot(slot),
      rounds,
      titleInfo,
      status: 'SCHEDULED',
      result: null,
      purseA: 0,
      purseB: 0
    };

    // Calculate purses if we have full fighter objects
    if (fighterA.career && fighterB.career) {
      const economics = FightEconomics.calculateExpenses(fighterA, fighterB, fight.type);
      fight.purseA = economics.purseA;
      fight.purseB = economics.purseB;
    }

    this.fights.set(slot, fight);

    // If this is main event, store reference and update card economics
    if (slot === FightSlot.MAIN_EVENT) {
      this.mainEvent = fight;
      if (fighterA.career && fighterB.career) {
        this.calculateProjections(fighterA, fighterB);
      }
    }

    return fight;
  }

  /**
   * Get fight type based on slot
   */
  getTypeForSlot(slot) {
    const slotTypes = {
      [FightSlot.MAIN_EVENT]: FightPosition.MAIN_EVENT,
      [FightSlot.CO_MAIN]: FightPosition.CO_MAIN,
      [FightSlot.UNDERCARD_1]: FightPosition.UNDERCARD,
      [FightSlot.UNDERCARD_2]: FightPosition.UNDERCARD,
      [FightSlot.UNDERCARD_3]: FightPosition.UNDERCARD,
      [FightSlot.PRELIM_1]: FightPosition.UNDERCARD,
      [FightSlot.PRELIM_2]: FightPosition.UNDERCARD
    };
    return slotTypes[slot] || FightPosition.UNDERCARD;
  }

  /**
   * Calculate financial projections for the card
   */
  calculateProjections(mainEventFighterA, mainEventFighterB) {
    // Main event drives most of the economics
    const revenue = FightEconomics.calculateRevenue(
      mainEventFighterA,
      mainEventFighterB,
      this.mainEvent?.type || FightPosition.MAIN_EVENT,
      this.venue
    );

    // Calculate all fight expenses
    let totalPurses = 0;
    for (const fight of this.fights.values()) {
      totalPurses += (fight.purseA || 0) + (fight.purseB || 0);
    }

    const expenses = {
      purses: totalPurses,
      venue: this.venue.rentalCost,
      production: FightEconomics.getProductionCosts(FightPosition.MAIN_EVENT, this.venue),
      marketing: FightEconomics.getMarketingCosts(FightPosition.MAIN_EVENT, revenue.combinedDraw),
      sanctioning: this.mainEvent?.titleInfo ? 50000 : 10000,
      insurance: 25000 + (revenue.combinedDraw * 250),
      staff: Math.round(this.venue.capacity * 5),
      misc: 0
    };

    const subtotal = Object.values(expenses).reduce((a, b) => a + b, 0);
    expenses.misc = Math.round(subtotal * 0.05);
    expenses.total = subtotal + expenses.misc;

    this.projectedRevenue = revenue;
    this.projectedExpenses = expenses;
    this.projectedProfit = revenue.total - expenses.total;
    this.ppv.isPPV = revenue.isPPV;

    return {
      revenue,
      expenses,
      profit: this.projectedProfit,
      roi: expenses.total > 0 ? this.projectedProfit / expenses.total : 0
    };
  }

  /**
   * Record fight result
   */
  recordFightResult(slot, result) {
    const fight = this.fights.get(slot);
    if (!fight) return null;

    fight.status = 'COMPLETED';
    fight.result = {
      winner: result.winner,
      method: result.method,
      round: result.round,
      time: result.time
    };

    return fight;
  }

  /**
   * Complete the card and calculate actuals
   */
  completeCard(actualResults = {}) {
    this.status = CardStatus.COMPLETED;

    // Use projections as base, adjust with actual data
    this.actualRevenue = {
      ...this.projectedRevenue,
      ...actualResults.revenue
    };

    // Update ticket sales
    if (actualResults.ticketsSold) {
      this.tickets.sold = actualResults.ticketsSold;
      this.tickets.revenue = actualResults.ticketRevenue ||
        (this.tickets.sold * (this.projectedRevenue?.gate / this.tickets.capacity || 100));
    }

    // Update PPV
    if (actualResults.ppvBuys) {
      this.ppv.buys = actualResults.ppvBuys;
      this.ppv.revenue = Math.round(actualResults.ppvBuys * 79.99 * 0.5);
      this.actualRevenue.ppv = this.ppv.revenue;
      this.actualRevenue.ppvBuys = this.ppv.buys;
    }

    // Recalculate total revenue
    this.actualRevenue.total = (this.actualRevenue.gate || this.tickets.revenue) +
                               (this.actualRevenue.ppv || 0) +
                               (this.actualRevenue.broadcast || 0) +
                               (this.actualRevenue.sponsorship || 0) +
                               (this.actualRevenue.international || 0);

    // Expenses stay mostly as projected
    this.actualExpenses = {
      ...this.projectedExpenses,
      ...actualResults.expenses
    };

    this.actualProfit = this.actualRevenue.total - this.actualExpenses.total;

    return {
      revenue: this.actualRevenue,
      expenses: this.actualExpenses,
      profit: this.actualProfit,
      success: this.actualProfit > 0
    };
  }

  /**
   * Cancel the card
   */
  cancel(reason = 'Unknown') {
    this.status = CardStatus.CANCELLED;
    this.cancellationReason = reason;

    // Calculate cancellation costs (venue fees, marketing already spent)
    const cancellationCosts = {
      venue: Math.round(this.venue.rentalCost * 0.5), // 50% cancellation fee
      marketing: this.projectedExpenses?.marketing || 0, // Marketing already spent
      refunds: this.tickets.revenue // Must refund tickets
    };
    cancellationCosts.total = Object.values(cancellationCosts).reduce((a, b) => a + b, 0);

    this.cancellationCosts = cancellationCosts;
    return cancellationCosts;
  }

  /**
   * Get card billing (promotional name)
   */
  getBilling() {
    if (!this.mainEvent) return this.name;

    const fighterA = this.mainEvent.fighterAName || 'TBA';
    const fighterB = this.mainEvent.fighterBName || 'TBA';

    return `${fighterA} vs ${fighterB}`;
  }

  /**
   * Get fight count by status
   */
  getFightCounts() {
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;

    for (const fight of this.fights.values()) {
      if (fight.status === 'SCHEDULED') scheduled++;
      else if (fight.status === 'COMPLETED') completed++;
      else if (fight.status === 'CANCELLED') cancelled++;
    }

    return { scheduled, completed, cancelled, total: this.fights.size };
  }

  /**
   * Check if card is profitable
   */
  isProfitable() {
    if (this.actualProfit !== null) {
      return this.actualProfit > 0;
    }
    return this.projectedProfit > 0;
  }

  /**
   * Get card summary for display
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      billing: this.getBilling(),
      date: this.date,
      status: this.status,
      venue: this.venue.name,
      location: this.location,
      isPPV: this.ppv.isPPV,
      fightCount: this.fights.size,
      mainEvent: this.mainEvent ? {
        fighterA: this.mainEvent.fighterAName,
        fighterB: this.mainEvent.fighterBName,
        titleInfo: this.mainEvent.titleInfo
      } : null,
      projected: {
        revenue: this.projectedRevenue?.total || 0,
        expenses: this.projectedExpenses?.total || 0,
        profit: this.projectedProfit || 0
      },
      actual: this.status === CardStatus.COMPLETED ? {
        revenue: this.actualRevenue?.total || 0,
        expenses: this.actualExpenses?.total || 0,
        profit: this.actualProfit || 0
      } : null
    };
  }

  /**
   * Serialize for saving
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      promoterId: this.promoterId,
      date: this.date,
      status: this.status,
      venue: this.venue,
      location: this.location,
      fights: Array.from(this.fights.entries()),
      mainEvent: this.mainEvent,
      projectedRevenue: this.projectedRevenue,
      projectedExpenses: this.projectedExpenses,
      projectedProfit: this.projectedProfit,
      actualRevenue: this.actualRevenue,
      actualExpenses: this.actualExpenses,
      actualProfit: this.actualProfit,
      tickets: this.tickets,
      ppv: this.ppv,
      pursePool: this.pursePool,
      cancellationReason: this.cancellationReason,
      cancellationCosts: this.cancellationCosts
    };
  }

  /**
   * Create from saved data
   */
  static fromJSON(data) {
    const card = new FightCard(data);
    card.fights = new Map(data.fights || []);
    return card;
  }
}

export default FightCard;
