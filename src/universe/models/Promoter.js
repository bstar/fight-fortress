/**
 * Promoter Model
 * Represents a boxing promotional company that signs fighters, schedules events, and manages finances
 * Key entity in the economic simulation
 */

import { v4 as uuidv4 } from 'uuid';
import { MarketValue } from '../economics/MarketValue.js';
import { FightEconomics, FightPosition, VenueType } from '../economics/FightEconomics.js';
import { FighterContract, ContractType, ContractStatus } from './FighterContract.js';
import { FightCard, CardStatus, FightSlot } from './FightCard.js';

// Promoter tier based on budget and reputation
export const PromoterTier = {
  MAJOR: 'MAJOR',           // Top Rank, Matchroom level ($50M+ budget)
  REGIONAL: 'REGIONAL',     // Strong regional presence ($10-50M)
  DEVELOPING: 'DEVELOPING', // Growing operation ($2-10M)
  LOCAL: 'LOCAL'            // Local shows only (<$2M)
};

export class Promoter {
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.name = config.name || 'Unknown Promotions';

    // Origin (if from former fighter)
    this.formerFighterId = config.formerFighterId || null;

    // Financial state
    this.finances = {
      budget: config.budget || 5000000,
      totalRevenue: config.totalRevenue || 0,
      totalExpenses: config.totalExpenses || 0,
      totalProfit: config.totalProfit || 0,
      cardsPromoted: config.cardsPromoted || 0,
      cashReserve: config.cashReserve || (config.budget || 5000000) * 0.2 // Keep 20% reserve
    };

    // Roster management
    this.roster = config.roster || [];               // Fighter IDs under contract
    this.contracts = new Map();                       // fighterId -> FighterContract

    // Load contracts from config
    if (config.contracts) {
      for (const [fighterId, contractData] of config.contracts) {
        this.contracts.set(fighterId, FighterContract.fromJSON(contractData));
      }
    }

    // Reputation affects fighter willingness to sign
    this.reputation = config.reputation || 50;  // 0-100

    // Strategic preferences
    this.strategy = {
      riskTolerance: config.riskTolerance ?? 50,        // Willingness to make risky fights
      moneyFightFocus: config.moneyFightFocus ?? 50,    // Prioritize big paydays
      talentDevelopment: config.talentDevelopment ?? 50, // Invest in prospects
      aggression: config.aggression ?? 50                // How aggressively pursue signings
    };

    // Track scheduled and past cards
    this.scheduledCards = config.scheduledCards || [];
    this.pastCards = config.pastCards || [];

    // Network and relationships
    this.relationships = {
      sanctioningBodies: config.sanctioningBodies || [], // Bodies they work with
      tvDeals: config.tvDeals || [],                     // Broadcasting partnerships
      venues: config.venues || []                         // Preferred venues
    };

    // Calculate tier based on budget
    this.tier = this.calculateTier();
  }

  /**
   * Calculate promoter tier based on budget
   */
  calculateTier() {
    if (this.finances.budget >= 50000000) return PromoterTier.MAJOR;
    if (this.finances.budget >= 10000000) return PromoterTier.REGIONAL;
    if (this.finances.budget >= 2000000) return PromoterTier.DEVELOPING;
    return PromoterTier.LOCAL;
  }

  /**
   * Attempt to sign a fighter to a contract
   */
  signFighter(fighter, terms = {}, universe = null) {
    // Check if fighter is already signed
    if (fighter.career?.contractStatus?.promoterId) {
      return {
        success: false,
        reason: 'Fighter already under contract',
        currentPromoter: fighter.career.contractStatus.promoterName
      };
    }

    // Check if we can afford minimum purse
    const marketValue = MarketValue.calculate(fighter);
    const purseMinimum = terms.purseMinimum || Math.round(marketValue * 0.8);

    if (purseMinimum > this.getAvailableBudget()) {
      return {
        success: false,
        reason: 'Insufficient budget',
        required: purseMinimum,
        available: this.getAvailableBudget()
      };
    }

    // Create contract offer
    const contract = new FighterContract({
      fighterId: fighter.id,
      promoterId: this.id,
      purseMinimum,
      fightCount: terms.fightCount || 3,
      ppvShare: terms.ppvShare || 0,
      exclusivity: terms.exclusivity ?? true,
      optionFights: terms.optionFights || 2,
      startDate: universe?.currentDate || null,
      durationWeeks: terms.durationWeeks || 156
    });

    // Calculate acceptance probability
    const offerQuality = purseMinimum / marketValue;
    const reputationBonus = (this.reputation - 50) / 100 * 0.2;

    // Fighter personality affects decision
    const loyalty = fighter.personality?.loyalty || 50;
    const ambition = fighter.personality?.ambition || 50;

    // High reputation promoters more attractive
    // Ambitious fighters want bigger promoters
    let acceptanceChance = offerQuality + reputationBonus;
    if (this.tier === PromoterTier.MAJOR) acceptanceChance += 0.15;
    if (this.tier === PromoterTier.LOCAL && ambition > 70) acceptanceChance -= 0.2;

    acceptanceChance = Math.max(0.1, Math.min(0.95, acceptanceChance));

    // Roll for acceptance
    if (Math.random() < acceptanceChance) {
      // Fighter accepts
      this.roster.push(fighter.id);
      this.contracts.set(fighter.id, contract);

      fighter.career.contractStatus = {
        promoterId: this.id,
        promoterName: this.name,
        signed: universe?.currentDate || null
      };

      return {
        success: true,
        contract,
        purseMinimum,
        acceptanceChance: Math.round(acceptanceChance * 100)
      };
    }

    return {
      success: false,
      reason: 'Fighter declined offer',
      offerQuality: Math.round(offerQuality * 100),
      acceptanceChance: Math.round(acceptanceChance * 100)
    };
  }

  /**
   * Release a fighter from their contract
   */
  releaseFighter(fighterId, reason = 'Released') {
    const contract = this.contracts.get(fighterId);
    if (!contract) {
      return { success: false, reason: 'Fighter not under contract' };
    }

    contract.terminate(reason, this.id);
    this.contracts.delete(fighterId);
    this.roster = this.roster.filter(id => id !== fighterId);

    return {
      success: true,
      fightsRemaining: contract.terms.fightsRemaining,
      totalEarned: contract.totalEarned
    };
  }

  /**
   * Get available budget (total minus committed purses)
   */
  getAvailableBudget() {
    let committed = 0;

    // Sum up committed purses from active contracts
    for (const contract of this.contracts.values()) {
      if (contract.status === ContractStatus.ACTIVE) {
        committed += contract.getRemainingValue();
      }
    }

    // Also consider scheduled card expenses
    for (const card of this.scheduledCards) {
      if (card.status === CardStatus.SCHEDULED || card.status === CardStatus.ANNOUNCED) {
        committed += card.projectedExpenses?.total || 0;
      }
    }

    return Math.max(0, this.finances.budget - committed - this.finances.cashReserve);
  }

  /**
   * Schedule a fight card
   */
  scheduleFightCard(config, universe = null) {
    const {
      mainEventFighterA,
      mainEventFighterB,
      mainEventType = FightPosition.MAIN_EVENT,
      venue = null,
      date = null,
      name = null,
      titleInfo = null
    } = config;

    // Get era-based economics options from universe
    const division = universe?.getDivisionForWeight?.(mainEventFighterA.physical?.weight)?.name;
    const economicsOptions = universe?.getEconomicsOptions?.(division) || {};

    // Calculate economics
    const projections = FightEconomics.calculateProfit(
      mainEventFighterA,
      mainEventFighterB,
      mainEventType,
      venue,
      economicsOptions
    );

    // Check if we can afford it
    if (projections.expenses.total > this.getAvailableBudget()) {
      return {
        success: false,
        reason: 'Insufficient budget',
        required: projections.expenses.total,
        available: this.getAvailableBudget()
      };
    }

    // Create the card (pass universe for era-based economics)
    const card = new FightCard({
      promoterId: this.id,
      name: name || `${mainEventFighterA.name} vs ${mainEventFighterB.name}`,
      date: date || this.getNextAvailableDate(universe),
      venue: venue || FightEconomics.selectVenue(
        projections.revenue.combinedDraw,
        mainEventType
      ),
      status: CardStatus.ANNOUNCED
    }, universe);

    // Add main event
    card.addFight(FightSlot.MAIN_EVENT, {
      fighterA: mainEventFighterA,
      fighterB: mainEventFighterB,
      type: mainEventType,
      rounds: mainEventType === FightPosition.TITLE_FIGHT ? 12 : 10,
      titleInfo
    });

    // Store projections
    card.projectedRevenue = projections.revenue;
    card.projectedExpenses = projections.expenses;
    card.projectedProfit = projections.profit;

    this.scheduledCards.push(card);

    return {
      success: true,
      card,
      projectedProfit: projections.profit,
      roi: projections.roi
    };
  }

  /**
   * Get next available date for a card (4+ weeks out)
   */
  getNextAvailableDate(universe) {
    const baseDate = universe?.currentDate || { year: 2000, week: 1 };

    // Find latest scheduled card date
    let latestWeek = baseDate.year * 52 + baseDate.week + 4;

    for (const card of this.scheduledCards) {
      if (card.date && (card.status === CardStatus.SCHEDULED || card.status === CardStatus.ANNOUNCED)) {
        const cardWeek = card.date.year * 52 + card.date.week;
        if (cardWeek >= latestWeek) {
          latestWeek = cardWeek + 2; // Space cards 2 weeks apart
        }
      }
    }

    return {
      year: Math.floor(latestWeek / 52),
      week: latestWeek % 52 || 52
    };
  }

  /**
   * Complete a fight card and update finances
   */
  completeCard(card, actualResults = {}) {
    const results = card.completeCard(actualResults);

    // Update finances
    this.finances.totalRevenue += results.revenue.total;
    this.finances.totalExpenses += results.expenses.total;
    this.finances.totalProfit += results.profit;
    this.finances.budget += results.profit; // Profit goes back into budget
    this.finances.cardsPromoted++;

    // Move to past cards
    this.scheduledCards = this.scheduledCards.filter(c => c.id !== card.id);
    this.pastCards.push(card);

    // Update reputation based on card success
    this.updateReputationFromCard(results);

    // Recalculate tier
    this.tier = this.calculateTier();

    return results;
  }

  /**
   * Update reputation based on card results
   */
  updateReputationFromCard(results) {
    let change = 0;

    // Profitable cards boost reputation
    if (results.profit > 0) {
      change += 1;
      if (results.profit > 1000000) change += 1;
      if (results.profit > 5000000) change += 2;
    } else {
      // Losses hurt reputation
      change -= 1;
      if (results.profit < -1000000) change -= 1;
    }

    // PPV success is prestigious
    if (results.revenue.ppvBuys > 500000) change += 2;
    if (results.revenue.ppvBuys > 1000000) change += 3;

    this.reputation = Math.max(0, Math.min(100, this.reputation + change));
  }

  /**
   * Evaluate if a fight is worth making
   */
  evaluateFightValue(fighterA, fighterB, type = FightPosition.MAIN_EVENT, universe = null) {
    // Get era-based economics options
    const division = universe?.getDivisionForWeight?.(fighterA.physical?.weight)?.name;
    const economicsOptions = universe?.getEconomicsOptions?.(division) || {};

    const profit = FightEconomics.calculateProfit(fighterA, fighterB, type, null, economicsOptions);

    // Factor in strategy preferences
    const riskFactor = this.assessFightRisk(fighterA, fighterB);

    // Risk-averse promoters want higher ROI
    const requiredROI = 0.1 + (1 - this.strategy.riskTolerance / 100) * 0.2;

    // Money fight focused promoters prioritize total revenue
    const moneyFightBonus = this.strategy.moneyFightFocus / 100 *
                           (profit.revenue.total > 10000000 ? 0.15 : 0);

    const adjustedROI = profit.roi - riskFactor * 0.1 + moneyFightBonus;

    return {
      ...profit,
      riskFactor,
      requiredROI,
      adjustedROI,
      worthMaking: adjustedROI >= requiredROI && profit.isProfitable,
      recommendation: this.getFightRecommendation(adjustedROI, requiredROI, profit)
    };
  }

  /**
   * Assess risk of a fight (star fighter losing, etc.)
   */
  assessFightRisk(fighterA, fighterB) {
    let risk = 0;

    // Close matchup = risky
    const valueA = MarketValue.calculate(fighterA);
    const valueB = MarketValue.calculate(fighterB);
    const valueDiff = Math.abs(valueA - valueB) / Math.max(valueA, valueB);
    risk += (1 - valueDiff) * 0.3;

    // Rising challenger vs established champion = risky for champion's promoter
    const aSideIsChamp = fighterA.career?.titles?.some(t => !t.lostDate);
    const bSideIsChamp = fighterB.career?.titles?.some(t => !t.lostDate);

    if (aSideIsChamp && !bSideIsChamp && fighterB.career?.consecutiveWins > 5) {
      risk += 0.2;
    }
    if (bSideIsChamp && !aSideIsChamp && fighterA.career?.consecutiveWins > 5) {
      risk += 0.2;
    }

    return Math.min(1, risk);
  }

  /**
   * Get recommendation for a fight
   */
  getFightRecommendation(adjustedROI, requiredROI, profit) {
    if (adjustedROI >= requiredROI * 2) return 'HIGHLY_RECOMMENDED';
    if (adjustedROI >= requiredROI) return 'RECOMMENDED';
    if (adjustedROI >= requiredROI * 0.5) return 'MARGINAL';
    if (profit.isProfitable) return 'LOW_PRIORITY';
    return 'NOT_RECOMMENDED';
  }

  /**
   * Find profitable fights among roster
   */
  findProfitableFights(universe) {
    const opportunities = [];

    // Get available fighters from roster
    const availableFighters = this.roster
      .map(id => universe?.fighters?.get(id))
      .filter(f => f && f.canFight?.());

    // Evaluate all possible pairings
    for (let i = 0; i < availableFighters.length; i++) {
      for (let j = i + 1; j < availableFighters.length; j++) {
        const evaluation = this.evaluateFightValue(
          availableFighters[i],
          availableFighters[j],
          FightPosition.MAIN_EVENT,
          universe
        );

        if (evaluation.worthMaking) {
          opportunities.push({
            fighterA: availableFighters[i],
            fighterB: availableFighters[j],
            ...evaluation
          });
        }
      }
    }

    // Sort by adjusted ROI
    opportunities.sort((a, b) => b.adjustedROI - a.adjustedROI);

    return opportunities;
  }

  /**
   * Get roster summary
   */
  getRosterSummary() {
    return {
      total: this.roster.length,
      activeContracts: Array.from(this.contracts.values())
        .filter(c => c.status === ContractStatus.ACTIVE).length,
      totalCommitted: this.getTotalCommittedPurses()
    };
  }

  /**
   * Get total committed purses
   */
  getTotalCommittedPurses() {
    let total = 0;
    for (const contract of this.contracts.values()) {
      if (contract.status === ContractStatus.ACTIVE) {
        total += contract.getRemainingValue();
      }
    }
    return total;
  }

  /**
   * Get fighter's contract
   */
  getContract(fighterId) {
    return this.contracts.get(fighterId);
  }

  /**
   * Get financial summary
   */
  getFinancialSummary() {
    return {
      ...this.finances,
      available: this.getAvailableBudget(),
      committed: this.getTotalCommittedPurses(),
      tier: this.tier,
      reputation: this.reputation
    };
  }

  /**
   * Serialize for saving
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      formerFighterId: this.formerFighterId,
      finances: { ...this.finances },
      roster: [...this.roster],
      contracts: Array.from(this.contracts.entries())
        .map(([id, contract]) => [id, contract.toJSON()]),
      reputation: this.reputation,
      strategy: { ...this.strategy },
      scheduledCards: this.scheduledCards.map(c => c.toJSON()),
      pastCards: this.pastCards.map(c => c.toJSON()),
      relationships: { ...this.relationships },
      tier: this.tier
    };
  }

  /**
   * Create from saved data
   */
  static fromJSON(data) {
    const promoter = new Promoter(data);

    // Restore contracts
    if (data.contracts) {
      for (const [fighterId, contractData] of data.contracts) {
        promoter.contracts.set(fighterId, FighterContract.fromJSON(contractData));
      }
    }

    // Restore cards
    promoter.scheduledCards = (data.scheduledCards || []).map(c => FightCard.fromJSON(c));
    promoter.pastCards = (data.pastCards || []).map(c => FightCard.fromJSON(c));

    return promoter;
  }

  /**
   * Create default major promoters for a new universe
   */
  static createDefaultPromoters() {
    return [
      new Promoter({
        name: 'Premier Boxing',
        budget: 75000000,
        reputation: 85,
        riskTolerance: 60,
        moneyFightFocus: 80,
        talentDevelopment: 40
      }),
      new Promoter({
        name: 'Golden Era Promotions',
        budget: 50000000,
        reputation: 80,
        riskTolerance: 50,
        moneyFightFocus: 60,
        talentDevelopment: 70
      }),
      new Promoter({
        name: 'World Class Boxing',
        budget: 30000000,
        reputation: 70,
        riskTolerance: 70,
        moneyFightFocus: 50,
        talentDevelopment: 60
      }),
      new Promoter({
        name: 'Rising Stars Inc.',
        budget: 15000000,
        reputation: 55,
        riskTolerance: 80,
        moneyFightFocus: 30,
        talentDevelopment: 90
      }),
      new Promoter({
        name: 'Regional Boxing Co.',
        budget: 5000000,
        reputation: 40,
        riskTolerance: 60,
        moneyFightFocus: 40,
        talentDevelopment: 50
      })
    ];
  }
}

export default Promoter;
