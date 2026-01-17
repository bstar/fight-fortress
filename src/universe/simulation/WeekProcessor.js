/**
 * Week Processor
 * Handles all weekly simulation processing: aging, progression, decline, fights, injuries, etc.
 */

import { CareerPhase } from '../models/UniverseFighter.js';
import { MatchmakingEngine } from './MatchmakingEngine.js';
import { FightIntegration } from './FightIntegration.js';
import { RivalryManager } from '../economics/RivalryManager.js';
import { MoneyFightEngine } from '../economics/MoneyFightEngine.js';
import { BodyRankingsManager } from './BodyRankingsManager.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Progression configuration
const PROGRESSION_CONFIG = {
  // Weekly progression rates by attribute category (pre-peak)
  progressionRates: {
    power: 0.015,           // Slow natural growth
    speed: 0.012,           // Moderate growth, early decline
    stamina: 0.020,         // Highly trainable
    defense: 0.018,         // Experience-based
    offense: 0.018,
    technical: 0.025,       // Most trainable through practice
    mental: 0.020           // Grows with experience
  },

  // Weekly decline rates by attribute (post-peak)
  declineRates: {
    speed: 0.025,           // First to decline
    stamina: 0.020,
    reflexes: 0.022,
    power: 0.012,           // Power lasts longer
    chin: 0.018,            // Cumulative damage effect
    technical: 0.008,       // Skills mostly retained
    mental: 0.005           // Wisdom compensates
  },

  // Physical attributes that decline faster
  physicalAttributes: [
    'handSpeed', 'footSpeed', 'reflexes', 'firstStep',
    'cardio', 'recoveryRate'
  ],

  // Attributes that improve with experience
  experienceAttributes: [
    'fightIQ', 'ringGeneralship', 'punchSelection', 'composure',
    'distanceManagement', 'adaptability', 'paceControl'
  ]
};

export class WeekProcessor {
  constructor(universe) {
    this.universe = universe;
    this.matchmaker = new MatchmakingEngine(universe);
    this.fightIntegration = new FightIntegration(universe);
    this.bodyRankingsManager = new BodyRankingsManager(universe);
  }

  /**
   * Process one week of simulation
   * @returns {Promise<Object[]>} Array of events that occurred
   */
  async processWeek() {
    const events = [];

    // 1. Process fighter aging and attribute changes
    events.push(...this.processAgingAndProgression());

    // 2. Process injuries and recovery
    events.push(...this.processInjuries());

    // 3. Update activity tracking
    this.updateActivityTracking();

    // 4. Generate and run fights (uses full SimulationLoop combat engine)
    events.push(...await this.processFights());

    // 5. Check for retirements (monthly, not weekly - reduces retirement rate)
    if (this.universe.currentDate.week % 4 === 0) {
      events.push(...this.processRetirements());
    }

    // 5b. Update per-body rankings (monthly)
    if (this.universe.currentDate.week % 4 === 0) {
      events.push(...this.updateBodyRankings());
    }

    // 6. Generate new prospects (periodically)
    if (this.shouldGenerateProspects()) {
      events.push(...this.generateNewProspects());
    }

    // 7. Update rankings
    events.push(...this.updateRankings());

    // 8. Check for Hall of Fame inductions
    events.push(...this.processHallOfFame());

    // 9. Process financial activities (rivalries, money fights)
    events.push(...this.processFinancialActivities());

    // 10. Advance calendar
    this.universe.advanceWeek();

    return events;
  }

  /**
   * Process financial activities: rivalries, promoter activities, money fight identification
   */
  processFinancialActivities() {
    const events = [];

    // Process existing rivalries
    events.push(...this.processRivalries());

    // Identify potential money fights (quarterly)
    if (this.universe.currentDate.week % 13 === 0) {
      events.push(...this.identifyMoneyFightOpportunities());
    }

    // Process promoter activities (weekly)
    events.push(...this.processPromoterActivities());

    return events;
  }

  /**
   * Process weekly rivalry updates
   */
  processRivalries() {
    return RivalryManager.processWeeklyRivalries(this.universe);
  }

  /**
   * Identify money fight opportunities for the quarter
   */
  identifyMoneyFightOpportunities() {
    const events = [];

    try {
      const moneyFights = MoneyFightEngine.identifyMoneyFights(this.universe);

      // Store for UI display
      this.universe.moneyFightOpportunities = moneyFights.slice(0, 10);

      // Generate news event for top money fights
      if (moneyFights.length > 0) {
        const top = moneyFights[0];
        events.push({
          type: 'MONEY_FIGHT_IDENTIFIED',
          fighterA: top.fighterA.name,
          fighterB: top.fighterB.name,
          projectedRevenue: top.projectedRevenue,
          narratives: top.narratives,
          classification: top.classification,
          message: `${top.fighterA.name} vs ${top.fighterB.name} identified as potential ${top.classification}`
        });
      }
    } catch (error) {
      // Silently handle - money fights are optional
    }

    return events;
  }

  /**
   * Process promoter activities: signings, fight scheduling
   */
  processPromoterActivities() {
    const events = [];

    if (!this.universe.promoters || this.universe.promoters.length === 0) {
      return events;
    }

    for (const promoter of this.universe.promoters) {
      // Check for potential signings (10% chance per week per promoter)
      if (Math.random() < 0.1) {
        const signing = this.processPromoterSigning(promoter);
        if (signing) {
          events.push(signing);
        }
      }
    }

    return events;
  }

  /**
   * Process a potential fighter signing for a promoter
   */
  processPromoterSigning(promoter) {
    // Find free agents (fighters without contracts)
    const freeAgents = Array.from(this.universe.fighters.values())
      .filter(f =>
        f.canFight?.() &&
        !f.career?.contractStatus?.promoterId &&
        f.career?.phase !== CareerPhase.RETIRED
      );

    if (freeAgents.length === 0) return null;

    // Prioritize based on promoter strategy
    let candidates = [...freeAgents];

    // Sort by what promoter values
    if (promoter.strategy?.talentDevelopment > 60) {
      // Focus on prospects
      candidates.sort((a, b) => {
        const aTier = a.potential?.tier || 'JOURNEYMAN';
        const bTier = b.potential?.tier || 'JOURNEYMAN';
        const tierRank = { GENERATIONAL: 7, ELITE: 6, WORLD_CLASS: 5, CONTENDER: 4, GATEKEEPER: 3, JOURNEYMAN: 2, CLUB: 1 };
        return (tierRank[bTier] || 2) - (tierRank[aTier] || 2);
      });
    } else if (promoter.strategy?.moneyFightFocus > 60) {
      // Focus on established names
      candidates.sort((a, b) =>
        (b.career?.popularity || 0) - (a.career?.popularity || 0)
      );
    }

    // Try to sign top candidate
    const target = candidates[0];
    if (!target) return null;

    // Attempt signing
    const result = promoter.signFighter?.(target, {
      fightCount: 3,
      purseMinimum: null // Will use market value
    }, this.universe);

    if (result?.success) {
      return {
        type: 'FIGHTER_SIGNED',
        promoterName: promoter.name,
        fighterName: target.name,
        fighterId: target.id,
        contractValue: result.contract?.terms?.purseMinimum * result.contract?.terms?.fightCount,
        message: `${promoter.name} signs ${target.name} to promotional deal`
      };
    }

    return null;
  }

  /**
   * Generate and run this week's fights
   * @returns {Promise<Object[]>} Array of fight events
   */
  async processFights() {
    const events = [];

    // Generate fight cards
    const fightCards = this.matchmaker.generateWeeklyFights();

    if (fightCards.length === 0) return events;

    // Run all fights using full SimulationLoop combat engine
    const results = await this.fightIntegration.runFightsBatch(fightCards);

    // Convert results to events
    for (const result of results) {
      if (result.cancelled) continue;

      events.push({
        type: 'FIGHT_RESULT',
        ...result
      });

      // Title change events
      if (result.titleChange) {
        events.push({
          type: 'TITLE_CHANGE',
          ...result.titleChange,
          date: result.date
        });
      }

      // Upset events
      if (result.isUpset) {
        events.push({
          type: 'UPSET',
          winner: result.winnerName,
          loser: result.loserName,
          method: result.method,
          message: `UPSET! ${result.winnerName} defeats ${result.loserName} by ${result.method}!`
        });
      }
    }

    // Store weekly results for dashboard
    this.universe.lastWeekResults = results;

    return events;
  }

  /**
   * Check for Hall of Fame inductions (annual, at year end)
   */
  processHallOfFame() {
    const events = [];

    // Only process at year end
    if (this.universe.currentDate.week !== 52) return events;

    const HallOfFame = require('../models/HallOfFame.js').HallOfFame;
    const hof = this.universe.hallOfFame || new HallOfFame();

    // Get recent retirees who might qualify
    const eligibleRetirees = [];
    for (const [id, fighter] of this.universe.retiredFighters || new Map()) {
      if (hof.isInducted(id)) continue;

      // Must be retired at least 3 years
      const retirementYear = fighter.career.retirementDate?.year || 0;
      if (this.universe.currentDate.year - retirementYear < 3) continue;

      eligibleRetirees.push(fighter);
    }

    // Evaluate each eligible fighter
    for (const fighter of eligibleRetirees) {
      const evaluation = hof.evaluateCandidate(fighter);
      if (evaluation.qualifies) {
        hof.induct(fighter, this.universe.currentDate, evaluation.category);
        events.push({
          type: 'HOF_INDUCTION',
          fighterId: fighter.id,
          fighterName: fighter.name,
          category: evaluation.category,
          record: fighter.getRecordString(),
          message: `${fighter.name} has been inducted into the Hall of Fame!`
        });
      }
    }

    this.universe.hallOfFame = hof;
    return events;
  }

  /**
   * Process aging and attribute progression/decline for all fighters
   */
  processAgingAndProgression() {
    const events = [];

    for (const fighter of this.universe.fighters.values()) {
      if (fighter.career.phase === CareerPhase.RETIRED) continue;

      const age = fighter.getAge(this.universe.currentDate);
      const isInPrime = fighter.isInPhysicalPrime(this.universe.currentDate);
      const isPastPrime = fighter.isPastPrime(this.universe.currentDate);

      // Update physical age
      fighter.physical.age = age;

      if (isPastPrime) {
        // Apply decline
        const declineEvents = this.applyDecline(fighter, age);
        events.push(...declineEvents);
      } else if (!isInPrime) {
        // Still developing
        this.applyProgression(fighter);
      }
      // In prime = stable, no changes

      // Experience always grows slightly with activity
      if (fighter.career.fightsThisYear > 0) {
        this.applyExperienceGrowth(fighter);
      }
    }

    return events;
  }

  /**
   * Apply weekly progression to a developing fighter
   */
  applyProgression(fighter) {
    const growthRate = fighter.potential.growthRate;
    const ceiling = fighter.potential.ceiling;
    const workEthicMod = 0.8 + (fighter.personality.workEthic / 250); // 0.8 - 1.2

    for (const [category, rate] of Object.entries(PROGRESSION_CONFIG.progressionRates)) {
      const categoryAttrs = fighter[category];
      if (!categoryAttrs) continue;

      for (const [attr, currentValue] of Object.entries(categoryAttrs)) {
        // Get base value to determine ceiling
        const baseValue = fighter.baseAttributes[category]?.[attr] || 70;
        const maxValue = Math.min(ceiling, baseValue * 1.15);

        if (currentValue < maxValue) {
          // Diminishing returns as approaching ceiling
          const progressMultiplier = 1 - (currentValue / 100);
          const growth = rate * growthRate * workEthicMod * progressMultiplier;

          fighter[category][attr] = Math.min(maxValue,
            currentValue + growth
          );
        }
      }
    }
  }

  /**
   * Apply weekly decline to a past-prime fighter
   */
  applyDecline(fighter, age) {
    const events = [];
    const yearsPostPeak = age - fighter.potential.peakAgePhysical;
    const resilience = fighter.potential.resilience;

    // Decline accelerates with age
    const declineMultiplier = 1 + (yearsPostPeak * 0.1);
    const resilienceMod = 1 - (resilience * 0.4); // 0.6 - 1.0

    let significantDecline = false;

    for (const [attr, baseRate] of Object.entries(PROGRESSION_CONFIG.declineRates)) {
      // Find which category this attribute belongs to
      for (const category of ['power', 'speed', 'stamina', 'defense', 'offense', 'technical', 'mental']) {
        if (fighter[category]?.[attr] !== undefined) {
          const currentValue = fighter[category][attr];
          const decline = baseRate * declineMultiplier * resilienceMod;

          fighter[category][attr] = Math.max(30, currentValue - decline);

          // Track significant decline
          if (decline > 0.1) {
            significantDecline = true;
          }
        }
      }
    }

    // Physical attributes decline faster
    for (const attr of PROGRESSION_CONFIG.physicalAttributes) {
      for (const category of ['speed', 'stamina']) {
        if (fighter[category]?.[attr] !== undefined) {
          const extraDecline = 0.01 * declineMultiplier * resilienceMod;
          fighter[category][attr] = Math.max(30,
            fighter[category][attr] - extraDecline
          );
        }
      }
    }

    // Check for noticeable decline event
    if (significantDecline && yearsPostPeak >= 3 && Math.random() < 0.05) {
      events.push({
        type: 'VISIBLE_DECLINE',
        fighterId: fighter.id,
        fighterName: fighter.name,
        age,
        message: `${fighter.name} is showing signs of decline at age ${age}`
      });
    }

    return events;
  }

  /**
   * Apply experience growth (happens with fight activity)
   */
  applyExperienceGrowth(fighter) {
    const experienceGrowth = 0.1 * fighter.career.fightsThisYear;

    fighter.mental.experience = Math.min(99,
      fighter.mental.experience + experienceGrowth
    );

    // Experience-based attributes also improve slightly
    for (const attr of PROGRESSION_CONFIG.experienceAttributes) {
      for (const category of ['technical', 'mental', 'offense']) {
        if (fighter[category]?.[attr] !== undefined) {
          const growth = 0.02 * (fighter.mental.experience / 100);
          fighter[category][attr] = Math.min(99,
            fighter[category][attr] + growth
          );
        }
      }
    }
  }

  /**
   * Process injuries and recovery
   */
  processInjuries() {
    const events = [];

    for (const fighter of this.universe.fighters.values()) {
      if (fighter.career.phase === CareerPhase.RETIRED) continue;

      // Process existing injuries
      for (let i = fighter.career.injuries.length - 1; i >= 0; i--) {
        const injury = fighter.career.injuries[i];
        injury.weeksRemaining--;

        if (injury.weeksRemaining <= 0) {
          // Injury healed
          fighter.career.injuries.splice(i, 1);
          events.push({
            type: 'INJURY_HEALED',
            fighterId: fighter.id,
            fighterName: fighter.name,
            injury: injury.type,
            message: `${fighter.name} has recovered from ${injury.type}`
          });
        }
      }

      // Process suspensions
      for (let i = fighter.career.suspensions.length - 1; i >= 0; i--) {
        const suspension = fighter.career.suspensions[i];
        suspension.weeksRemaining--;

        if (suspension.weeksRemaining <= 0) {
          fighter.career.suspensions.splice(i, 1);
          events.push({
            type: 'SUSPENSION_ENDED',
            fighterId: fighter.id,
            fighterName: fighter.name,
            message: `${fighter.name}'s suspension has ended`
          });
        }
      }
    }

    return events;
  }

  /**
   * Update activity tracking for all fighters
   */
  updateActivityTracking() {
    // Reset yearly stats at year boundary
    if (this.universe.currentDate.week === 1) {
      for (const fighter of this.universe.fighters.values()) {
        fighter.career.fightsThisYear = 0;
      }
    }

    // Increment inactivity counter
    for (const fighter of this.universe.fighters.values()) {
      if (fighter.career.phase !== CareerPhase.RETIRED) {
        fighter.career.weeksInactive++;
      }
    }
  }

  /**
   * Process retirement decisions
   */
  processRetirements() {
    const events = [];

    for (const fighter of this.universe.fighters.values()) {
      if (fighter.career.phase === CareerPhase.RETIRED) continue;

      if (fighter.shouldConsiderRetirement(this.universe.currentDate)) {
        // Roll for retirement decision
        const retirementChance = this.calculateRetirementChance(fighter);

        if (Math.random() < retirementChance) {
          this.retireFighter(fighter);
          events.push({
            type: 'RETIREMENT',
            fighterId: fighter.id,
            fighterName: fighter.name,
            record: fighter.getRecordString(),
            age: fighter.getAge(this.universe.currentDate),
            titles: fighter.career.titles.filter(t => !t.lostDate).map(t => t.title),
            message: `${fighter.name} has announced retirement with a record of ${fighter.getRecordString()}`
          });
        }
      }
    }

    return events;
  }

  /**
   * Calculate probability of retirement (called monthly, not weekly)
   * Designed to maintain population: average fighter careers ~10-15 years
   */
  calculateRetirementChance(fighter) {
    const age = fighter.getAge(this.universe.currentDate);
    let chance = 0;

    // Base age factor - much lower since this runs monthly
    // A 40 year old with 2% monthly chance has ~78% survival over 1 year
    if (age >= 42) chance += 0.04;       // Really old, should retire soon
    else if (age >= 40) chance += 0.02;  // Old but can continue
    else if (age >= 38) chance += 0.01;  // Late career
    else if (age >= 36) chance += 0.005; // Experienced veteran

    // Losing streak factor (3+ consecutive losses is concerning)
    if (fighter.career.consecutiveLosses >= 3) {
      chance += 0.01;
    }

    // Severe KO losses factor (5+ KO losses is serious)
    const koLosses = fighter.career.record.koLosses || 0;
    if (koLosses >= 5) {
      chance += 0.02;
    } else if (koLosses >= 3) {
      chance += 0.005;
    }

    // Heart reduces retirement tendency
    chance *= (1 - fighter.mental.heart / 250);

    // Ambition reduces retirement tendency
    chance *= (1 - (fighter.personality?.ambition || 50) / 250);

    // Cap at reasonable monthly probability
    return Math.min(0.08, chance);
  }

  /**
   * Retire a fighter and potentially assign post-career role
   */
  retireFighter(fighter) {
    fighter.retire(this.universe.currentDate);
    this.universe.removeFighter(fighter.id, 'retirement');

    // Consider post-career roles if enabled
    if (this.universe.config.enablePostCareerRoles) {
      this.assignPostCareerRole(fighter);
    }
  }

  /**
   * Assign a post-career role based on fighter attributes
   */
  assignPostCareerRole(fighter) {
    const scores = {
      trainer: this.calculateTrainerScore(fighter),
      commentator: this.calculateCommentatorScore(fighter),
      promoter: this.calculatePromoterScore(fighter),
      none: 30
    };

    // Select role based on scores
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalScore;

    for (const [role, score] of Object.entries(scores)) {
      roll -= score;
      if (roll <= 0) {
        if (role !== 'none') {
          this.createPostCareerRole(fighter, role);
        }
        return;
      }
    }
  }

  /**
   * Calculate trainer aptitude score
   */
  calculateTrainerScore(fighter) {
    let score = 30;
    score += fighter.technical.fightIQ * 0.3;
    score += fighter.mental.experience * 0.2;
    score += fighter.technical.adaptability * 0.15;
    score += (fighter.career.titles.length > 0 ? 15 : 0);
    return score;
  }

  /**
   * Calculate commentator aptitude score
   */
  calculateCommentatorScore(fighter) {
    let score = 20;
    score += fighter.career.popularity * 0.3;
    score += fighter.mental.experience * 0.2;
    score += fighter.technical.fightIQ * 0.2;
    score += (fighter.career.titles.length > 0 ? 20 : 0);
    return score;
  }

  /**
   * Calculate promoter aptitude score
   */
  calculatePromoterScore(fighter) {
    let score = 15;
    score += fighter.career.popularity * 0.3;
    score += fighter.career.earnings / 100000 * 0.1;
    score += fighter.mental.confidence * 0.1;
    return score;
  }

  /**
   * Create a post-career role for retired fighter
   */
  createPostCareerRole(fighter, role) {
    switch (role) {
      case 'trainer':
        this.universe.addTrainer({
          id: `trainer-${fighter.id}`,
          name: fighter.name,
          formerFighterId: fighter.id,
          skills: {
            strategySkill: fighter.technical.fightIQ,
            communication: fighter.mental.composure,
            adaptability: fighter.technical.adaptability,
            specialty: fighter.style.primary
          },
          reputation: fighter.career.popularity,
          fighters: []
        });
        break;

      case 'commentator':
        this.universe.addCommentator({
          id: `commentator-${fighter.id}`,
          name: fighter.name,
          formerFighterId: fighter.id,
          skills: {
            technicalAnalysis: fighter.technical.fightIQ,
            charisma: fighter.mental.confidence,
            insightfulness: fighter.technical.ringGeneralship
          }
        });
        break;

      case 'promoter':
        this.universe.addPromoter({
          id: `promoter-${fighter.id}`,
          name: fighter.name,
          formerFighterId: fighter.id,
          skills: {
            matchmaking: fighter.technical.fightIQ,
            negotiation: fighter.mental.composure,
            marketing: fighter.career.popularity
          },
          roster: [],
          budget: 500000 + fighter.career.earnings * 0.1,
          reputation: fighter.career.popularity
        });
        break;
    }
  }

  /**
   * Check if we should generate new prospects
   * Dynamically adjusts to maintain target fighter count
   */
  shouldGenerateProspects() {
    const activeFighters = this.universe.getActiveFighters().length;
    const target = this.universe.config.targetFighterCount;
    const variance = this.universe.config.fighterCountVariance;

    // If well above target, don't generate
    if (activeFighters >= target + variance) return false;

    // Calculate generation probability based on how far below target we are
    const deficit = target - activeFighters;
    let probability = this.universe.config.baseProspectRate / 10;

    if (deficit > variance) {
      // Well below target - high generation rate
      probability = 0.8;
    } else if (deficit > 0) {
      // Below target - moderate rate
      probability = 0.3 + (deficit / variance) * 0.4;
    } else if (deficit > -variance) {
      // At target - low rate
      probability = 0.15;
    } else {
      // Above target - very low rate
      probability = 0.05;
    }

    return Math.random() < probability;
  }

  /**
   * Generate new prospects entering the pro ranks
   * Number of prospects scales with how far below target we are
   */
  generateNewProspects() {
    const events = [];

    // Import generator dynamically to avoid circular dependency
    const { FighterGenerator } = require('../generation/FighterGenerator.js');
    const generator = new FighterGenerator();

    const activeFighters = this.universe.getActiveFighters().length;
    const target = this.universe.config.targetFighterCount;
    const deficit = target - activeFighters;

    // Generate more prospects if well below target
    // Scale aggressively to maintain population
    let count;
    if (deficit > 500) {
      count = 10 + Math.floor(Math.random() * 6); // 10-15 (emergency replenishment)
    } else if (deficit > 200) {
      count = 6 + Math.floor(Math.random() * 5); // 6-10
    } else if (deficit > 100) {
      count = 4 + Math.floor(Math.random() * 4); // 4-7
    } else if (deficit > 50) {
      count = 3 + Math.floor(Math.random() * 3); // 3-5
    } else if (deficit > 0) {
      count = 2 + Math.floor(Math.random() * 2); // 2-3
    } else {
      count = 1; // At or above target, just 1 to replace retirees
    }

    for (let i = 0; i < count; i++) {
      const fighter = generator.generate({
        currentDate: this.universe.currentDate,
        age: 18 + Math.floor(Math.random() * 6) // 18-23
      });

      // Set as turning pro
      fighter.career.phase = CareerPhase.PRO_DEBUT;
      fighter.career.proDebutDate = { ...this.universe.currentDate };

      this.universe.addFighter(fighter);

      events.push({
        type: 'NEW_PROSPECT',
        fighterId: fighter.id,
        fighterName: fighter.name,
        nationality: fighter.nationality,
        tier: fighter.potential.tier,
        weightClass: this.universe.getDivisionForWeight(fighter.physical.weight)?.name,
        message: `${fighter.name} turns pro from ${fighter.nationality}`
      });
    }

    return events;
  }

  /**
   * Update rankings across all divisions
   */
  updateRankings() {
    const events = [];
    const { RankingsManager } = require('./RankingsManager.js');
    const rankingsManager = new RankingsManager(this.universe);

    for (const [name, division] of this.universe.divisions) {
      const changes = rankingsManager.updateDivisionRankings(division);
      events.push(...changes.map(change => ({
        type: 'RANKING_CHANGE',
        division: name,
        ...change
      })));
    }

    return events;
  }

  /**
   * Update per-body rankings (WBC, WBA, IBF, WBO)
   * Each body has unique ranking criteria
   */
  updateBodyRankings() {
    const events = [];

    try {
      // Update all body rankings
      this.bodyRankingsManager.updateAllBodyRankings();

      // Check for mandatory statuses and generate events
      events.push(...this.checkMandatoryStatuses());
    } catch (error) {
      // Body rankings are optional, don't crash if there's an issue
      console.error('Error updating body rankings:', error.message);
    }

    return events;
  }

  /**
   * Check for mandatory title defense deadlines across all bodies
   */
  checkMandatoryStatuses() {
    const events = [];
    const bodies = ['WBC', 'WBA', 'IBF', 'WBO'];

    for (const bodyCode of bodies) {
      for (const [divisionName] of this.universe.divisions) {
        try {
          const status = this.bodyRankingsManager.getMandatoryStatus(bodyCode, divisionName);

          if (status?.mandatoryDue) {
            const champion = this.universe.fighters.get(status.championId);
            const challenger = this.universe.fighters.get(status.mandatoryChallengerId);

            events.push({
              type: 'MANDATORY_DUE',
              body: bodyCode,
              division: divisionName,
              championId: status.championId,
              championName: champion?.name || 'Unknown',
              challengerId: status.mandatoryChallengerId,
              challengerName: challenger?.name || 'Unknown',
              weeksSinceDefense: status.weeksSinceDefense,
              message: `${bodyCode} ${divisionName}: ${champion?.name || 'Champion'} must defend against mandatory challenger ${challenger?.name || '#1 contender'}`
            });
          }
        } catch (error) {
          // Skip this body/division if there's an issue
        }
      }
    }

    return events;
  }
}

export default WeekProcessor;
