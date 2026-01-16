/**
 * Fighter Manager Model
 * Represents fighter interests and controls matchmaking decisions
 * Different management strategies create realistic career trajectories
 */

import { v4 as uuidv4 } from 'uuid';
import { MarketValue } from '../economics/MarketValue.js';

// Manager mentality types
export const ManagerMentality = {
  PROTECTIVE: 'PROTECTIVE',       // Shield prospects, strategic matchups only
  DEVELOPMENT: 'DEVELOPMENT',     // Build fighters gradually, step-up approach
  OPPORTUNISTIC: 'OPPORTUNISTIC', // Take good opportunities, moderate protection
  AGGRESSIVE: 'AGGRESSIVE',       // Maximize fights and income
  EXPLOITATIVE: 'EXPLOITATIVE'    // Push fighters hard, maximize short-term gain
};

// Fight frequency limits by mentality
export const FightFrequency = {
  PROTECTIVE: { minWeeks: 8, maxFightsPerYear: 5 },
  DEVELOPMENT: { minWeeks: 6, maxFightsPerYear: 8 },
  OPPORTUNISTIC: { minWeeks: 4, maxFightsPerYear: 10 },
  AGGRESSIVE: { minWeeks: 3, maxFightsPerYear: 15 },
  EXPLOITATIVE: { minWeeks: 2, maxFightsPerYear: 20 }
};

export class Manager {
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.name = config.name || this.generateName();

    // Roster management
    this.fighters = config.fighters || []; // Fighter IDs managed
    this.maxRoster = config.maxRoster || 8;

    // Manager attributes (0-100)
    this.skills = {
      negotiation: config.skills?.negotiation ?? 50,  // Better purses
      matchmaking: config.skills?.matchmaking ?? 50,  // Find good opponents
      development: config.skills?.development ?? 50,  // Help fighters improve
      networking: config.skills?.networking ?? 50     // Access to opportunities
    };

    // Personality affects strategy decisions
    this.personality = {
      greed: config.personality?.greed ?? 50,         // Prioritize money over fighter health
      patience: config.personality?.patience ?? 50,   // Willing to wait for right fight
      ambition: config.personality?.ambition ?? 50,   // Seek bigger opportunities
      ethics: config.personality?.ethics ?? 50        // Care about fighter wellbeing
    };

    // Track record
    this.stats = {
      championsManaged: config.stats?.championsManaged || 0,
      totalFighterEarnings: config.stats?.totalFighterEarnings || 0,
      fightsNegotiated: config.stats?.fightsNegotiated || 0,
      retiredFighters: config.stats?.retiredFighters || 0
    };

    // Financial
    this.cut = config.cut || 0.15; // 15% of purses
    this.earnings = config.earnings || 0;
  }

  /**
   * Generate a random manager name
   */
  generateName() {
    const firstNames = [
      'Don', 'Al', 'Bob', 'Frank', 'Eddie', 'Lou', 'Sam', 'Tony',
      'Rock', 'Dan', 'Jay', 'Mickey', 'Angelo', 'Teddy', 'Emanuel'
    ];
    const lastNames = [
      'King', 'Finkel', 'Arum', 'Duva', 'Futch', 'Roach', 'Steward',
      'Atlas', 'DiBella', 'Haymon', 'Warren', 'Hearn', 'Schaefer'
    ];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }

  /**
   * Determine mentality for a specific fighter based on their profile
   * Record matters - fighters who aren't terrible want to protect their records
   * @param {UniverseFighter} fighter - The fighter to evaluate
   * @returns {string} The appropriate mentality
   */
  getMentalityForFighter(fighter) {
    const tier = fighter.potential?.tier;
    const record = fighter.career?.record;
    const losses = record?.losses || 0;
    const wins = record?.wins || 0;
    const totalFights = wins + losses;
    const winPercentage = totalFights > 0 ? wins / totalFights : 0.5;

    // Undefeated with 10+ wins = maximum protection (the "0" is sacred)
    if (losses === 0 && wins >= 10) {
      return ManagerMentality.PROTECTIVE;
    }

    // Undefeated with 5+ wins = still very protective
    if (losses === 0 && wins >= 5) {
      return ManagerMentality.PROTECTIVE;
    }

    // High potential prospects
    if (tier === 'GENERATIONAL' || tier === 'ELITE') {
      return losses <= 1 ? ManagerMentality.PROTECTIVE : ManagerMentality.DEVELOPMENT;
    }

    if (tier === 'WORLD_CLASS' || tier === 'CONTENDER') {
      if (losses === 0) return ManagerMentality.PROTECTIVE;
      if (losses <= 2) return ManagerMentality.DEVELOPMENT;
      // Even with more losses, good win % means careful matchmaking
      if (winPercentage >= 0.70) return ManagerMentality.DEVELOPMENT;
      return ManagerMentality.OPPORTUNISTIC;
    }

    // GATEKEEPER tier - solid fighters who want to stay employable
    // They need to protect their records to stay relevant as "tests" for prospects
    if (tier === 'GATEKEEPER') {
      if (losses === 0 && wins >= 3) return ManagerMentality.DEVELOPMENT;
      // Gatekeepers with winning records are valuable - protect them
      if (winPercentage >= 0.60 && totalFights >= 10) return ManagerMentality.DEVELOPMENT;
      if (winPercentage >= 0.50) return ManagerMentality.OPPORTUNISTIC;
      // Only gatekeepers with losing records get aggressive
      return ManagerMentality.AGGRESSIVE;
    }

    // JOURNEYMAN tier - can still have pride if they have a decent record
    if (tier === 'JOURNEYMAN') {
      // A journeyman with a winning record still has value
      if (losses === 0 && wins >= 3) return ManagerMentality.DEVELOPMENT;
      if (winPercentage >= 0.50 && totalFights >= 8) return ManagerMentality.OPPORTUNISTIC;
      // Losing record journeymen take more fights
      return ManagerMentality.AGGRESSIVE;
    }

    // CLUB tier - truly limited fighters, but still not exploited unless desperate
    if (tier === 'CLUB') {
      // Even club fighters protect a winning record somewhat
      if (winPercentage >= 0.50 && totalFights >= 5) return ManagerMentality.AGGRESSIVE;
      // Ethical managers don't exploit even limited fighters
      return this.personality.ethics > 60
        ? ManagerMentality.AGGRESSIVE
        : ManagerMentality.EXPLOITATIVE;
    }

    // Default to opportunistic - take good fights, avoid bad ones
    return ManagerMentality.OPPORTUNISTIC;
  }

  /**
   * Get fight frequency limits for a fighter
   * @param {UniverseFighter} fighter
   * @returns {Object} { minWeeks, maxFightsPerYear }
   */
  getFightFrequency(fighter) {
    const mentality = this.getMentalityForFighter(fighter);
    return FightFrequency[mentality] || FightFrequency.OPPORTUNISTIC;
  }

  /**
   * Check if fighter is ready to fight again
   * @param {UniverseFighter} fighter
   * @returns {boolean}
   */
  isReadyToFight(fighter) {
    const frequency = this.getFightFrequency(fighter);
    const weeksInactive = fighter.career?.weeksInactive || 0;
    const fightsThisYear = fighter.career?.fightsThisYear || 0;

    // Check minimum rest period
    if (weeksInactive < frequency.minWeeks) {
      return false;
    }

    // Check max fights per year
    if (fightsThisYear >= frequency.maxFightsPerYear) {
      return false;
    }

    // Check for career damage concerns
    if (fighter.careerDamage) {
      const damageCheck = fighter.careerDamage.shouldRetireDueToDamage();
      if (damageCheck.retire) {
        return false;
      }
    }

    return true;
  }

  /**
   * Analyze a potential fight
   * @param {UniverseFighter} fighter - Our fighter
   * @param {UniverseFighter} opponent - The proposed opponent
   * @param {Universe} universe - Universe context
   * @returns {Object} Fight analysis
   */
  analyzeFight(fighter, opponent, universe) {
    const tierRanks = {
      'GENERATIONAL': 7, 'ELITE': 6, 'WORLD_CLASS': 5,
      'CONTENDER': 4, 'GATEKEEPER': 3, 'JOURNEYMAN': 2, 'CLUB': 1
    };

    const fighterTier = tierRanks[fighter.potential?.tier] || 2;
    const opponentTier = tierRanks[opponent.potential?.tier] || 2;
    const tierDifference = fighterTier - opponentTier;

    // Calculate danger rating (0-1)
    let dangerRating = 0;

    // KO power threat
    const opponentKOPower = opponent.power?.knockoutPower || 70;
    const fighterChin = fighter.mental?.chin || 70;
    dangerRating += Math.max(0, (opponentKOPower - fighterChin + 20) / 100) * 0.4;

    // Style matchup danger
    if (opponent.style?.primary === 'swarmer' || opponent.style?.primary === 'pressure-fighter') {
      dangerRating += 0.1;
    }

    // Youth advantage
    const fighterAge = fighter.getAge?.(universe?.currentDate) || 25;
    const opponentAge = opponent.getAge?.(universe?.currentDate) || 25;
    if (opponentAge < fighterAge - 5) {
      dangerRating += 0.1;
    }

    // Opponent momentum
    const opponentStreak = opponent.career?.consecutiveWins || 0;
    if (opponentStreak > 5) {
      dangerRating += 0.1;
    }

    // Undefeated opponents are dangerous
    if ((opponent.career?.record?.losses || 0) === 0 &&
        (opponent.career?.record?.wins || 0) > 10) {
      dangerRating += 0.15;
    }

    dangerRating = Math.min(1, Math.max(0, dangerRating));

    // Estimate win probability (simplified)
    let winProbability = 0.5 + (tierDifference * 0.1);
    winProbability -= dangerRating * 0.2;
    winProbability = Math.min(0.9, Math.max(0.1, winProbability));

    // Calculate purse
    const purse = MarketValue.calculate(fighter);

    return {
      tierDifference,
      dangerRating,
      winProbability,
      purse,
      opponentRecord: opponent.getRecordString?.() || 'Unknown',
      opponentRanking: opponent.career?.rankings?.current
    };
  }

  /**
   * Evaluate if a fight is acceptable for a fighter
   * @param {UniverseFighter} fighter
   * @param {UniverseFighter} opponent
   * @param {string} fightType
   * @param {Universe} universe
   * @returns {Object} { accept: boolean, reason: string }
   */
  evaluateFight(fighter, opponent, fightType, universe) {
    const mentality = this.getMentalityForFighter(fighter);
    const analysis = this.analyzeFight(fighter, opponent, universe);

    switch (mentality) {
      case ManagerMentality.PROTECTIVE:
        return this.evaluateProtectiveFight(fighter, opponent, analysis, fightType);
      case ManagerMentality.DEVELOPMENT:
        return this.evaluateDevelopmentFight(fighter, opponent, analysis, fightType);
      case ManagerMentality.OPPORTUNISTIC:
        return this.evaluateOpportunisticFight(fighter, opponent, analysis, fightType);
      case ManagerMentality.AGGRESSIVE:
        return this.evaluateAggressiveFight(fighter, opponent, analysis, fightType);
      case ManagerMentality.EXPLOITATIVE:
        return this.evaluateExploitativeFight(fighter, opponent, analysis, fightType);
      default:
        return this.evaluateOpportunisticFight(fighter, opponent, analysis, fightType);
    }
  }

  /**
   * PROTECTIVE evaluation - shield undefeated stars and elite prospects
   */
  evaluateProtectiveFight(_fighter, _opponent, analysis, fightType) {
    // Accept title fights if heavily favored
    if (fightType === 'TITLE_FIGHT' && analysis.winProbability >= 0.65) {
      return { accept: true, reason: 'Title opportunity with favorable odds' };
    }

    // Reject dangerous opponents
    if (analysis.dangerRating > 0.3) {
      return { accept: false, reason: 'Opponent too dangerous - protecting the record' };
    }

    // Only fight significantly lower-tier opponents
    if (analysis.tierDifference < 1) {
      return { accept: false, reason: 'Need a step-down opponent for safe development' };
    }

    // Reject ranked opponents unless very favorable
    if (analysis.opponentRanking && analysis.opponentRanking <= 10) {
      if (analysis.winProbability < 0.70) {
        return { accept: false, reason: 'Ranked opponent - risk too high' };
      }
    }

    return { accept: true, reason: 'Safe development fight approved' };
  }

  /**
   * DEVELOPMENT evaluation - good prospects with 1-2 losses
   */
  evaluateDevelopmentFight(_fighter, _opponent, analysis, fightType) {
    // Accept title eliminators with decent odds
    if (fightType === 'ELIMINATOR' && analysis.winProbability >= 0.55) {
      return { accept: true, reason: 'Elimination fight for ranking advancement' };
    }

    // Accept title fights with good odds
    if (fightType === 'TITLE_FIGHT' && analysis.winProbability >= 0.55) {
      return { accept: true, reason: 'Title opportunity - time to step up' };
    }

    // Accept reasonable step-up fights
    if (analysis.tierDifference >= -1 && analysis.winProbability >= 0.50) {
      return { accept: true, reason: 'Good step-up opportunity for development' };
    }

    // Reject mismatches (too easy = no development value)
    if (analysis.tierDifference > 3) {
      return { accept: false, reason: 'Opponent too weak - no development value' };
    }

    // Avoid heavy punchers if fighter has chin issues
    if (analysis.dangerRating > 0.6) {
      return { accept: false, reason: 'Too risky at this stage of development' };
    }

    return { accept: true, reason: 'Appropriate development fight' };
  }

  /**
   * OPPORTUNISTIC evaluation - balanced approach, still cares about record
   */
  evaluateOpportunisticFight(fighter, _opponent, analysis, fightType) {
    const record = fighter.career?.record;
    const wins = record?.wins || 0;
    const losses = record?.losses || 0;
    const hasGoodRecord = wins > losses && (wins + losses) >= 5;

    // Accept title opportunities with decent odds
    if (fightType === 'TITLE_FIGHT' || fightType === 'ELIMINATOR') {
      if (analysis.winProbability >= 0.40) {
        return { accept: true, reason: 'Seizing the opportunity' };
      }
      // Even for titles, need reasonable chance if record is good
      if (hasGoodRecord && analysis.winProbability < 0.35) {
        return { accept: false, reason: 'Odds too long - protecting the record' };
      }
    }

    // Fighters with good records avoid dangerous step-ups
    if (hasGoodRecord) {
      if (analysis.dangerRating > 0.5 && analysis.tierDifference < 0) {
        return { accept: false, reason: 'Dangerous step-up - not worth risking record' };
      }
      // Need reasonable win probability
      if (analysis.winProbability < 0.40) {
        return { accept: false, reason: 'Unfavorable matchup - protecting record' };
      }
    }

    // Reject clearly dangerous fights
    if (analysis.dangerRating > 0.7 && analysis.tierDifference < 0) {
      return { accept: false, reason: 'Risk outweighs reward' };
    }

    // Accept competitive fights
    if (analysis.winProbability >= 0.40) {
      return { accept: true, reason: 'Competitive matchup accepted' };
    }

    // Be more cautious by default
    if (analysis.winProbability < 0.35) {
      return { accept: false, reason: 'Matchup not favorable enough' };
    }

    return { accept: true, reason: 'Taking the fight' };
  }

  /**
   * AGGRESSIVE evaluation - fighters who need activity but still have some standards
   */
  evaluateAggressiveFight(fighter, _opponent, analysis, _fightType) {
    const record = fighter.career?.record;
    const wins = record?.wins || 0;
    const losses = record?.losses || 0;
    const hasWinningRecord = wins > losses;

    // Accept almost any fight with reasonable pay
    const minimumPurse = MarketValue.calculate(fighter) * 0.5;
    if (analysis.purse < minimumPurse) {
      return { accept: false, reason: 'Purse too low for the risk' };
    }

    // Even aggressive fighters with winning records avoid suicide missions
    if (hasWinningRecord && analysis.dangerRating > 0.7 && analysis.winProbability < 0.30) {
      return { accept: false, reason: 'Not throwing away a winning record' };
    }

    // Only reject extremely dangerous fights with low pay
    if (analysis.dangerRating > 0.8 && analysis.purse < 50000) {
      return { accept: false, reason: 'High risk for minimal reward' };
    }

    return { accept: true, reason: 'Taking the work - stay active' };
  }

  /**
   * EXPLOITATIVE evaluation - tomato cans who need any payday
   */
  evaluateExploitativeFight(fighter, _opponent, analysis, _fightType) {
    // Check if fighter is too damaged to continue
    if (fighter.careerDamage) {
      const damageCheck = fighter.careerDamage.shouldRetireDueToDamage();
      if (damageCheck.retire) {
        return { accept: false, reason: 'Fighter too damaged to continue' };
      }
    }

    // Accept any paid fight
    if (analysis.purse > 0) {
      return { accept: true, reason: 'Any payday is a good payday' };
    }

    return { accept: false, reason: 'Need compensation' };
  }

  /**
   * Record a fight for a fighter
   */
  recordFight(fighter, purse) {
    const managerCut = Math.round(purse * this.cut);
    this.earnings += managerCut;
    this.stats.fightsNegotiated++;
    this.stats.totalFighterEarnings += purse;
  }

  /**
   * Add a fighter to roster
   */
  addFighter(fighterId) {
    if (this.fighters.length >= this.maxRoster) {
      return false;
    }
    if (!this.fighters.includes(fighterId)) {
      this.fighters.push(fighterId);
    }
    return true;
  }

  /**
   * Remove a fighter from roster
   */
  removeFighter(fighterId) {
    const index = this.fighters.indexOf(fighterId);
    if (index !== -1) {
      this.fighters.splice(index, 1);
      this.stats.retiredFighters++;
      return true;
    }
    return false;
  }

  /**
   * Record that a fighter became champion
   */
  recordChampion() {
    this.stats.championsManaged++;
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      fighters: this.fighters,
      maxRoster: this.maxRoster,
      skills: this.skills,
      personality: this.personality,
      stats: this.stats,
      cut: this.cut,
      earnings: this.earnings
    };
  }

  /**
   * Create from saved data
   */
  static fromJSON(data) {
    return new Manager(data);
  }

  /**
   * Generate a random manager with varying ethics
   */
  static generateRandom() {
    const ethics = Math.random() * 100;
    const greed = 100 - ethics * 0.5 + Math.random() * 30;

    return new Manager({
      skills: {
        negotiation: 30 + Math.random() * 50,
        matchmaking: 30 + Math.random() * 50,
        development: 30 + Math.random() * 50,
        networking: 30 + Math.random() * 50
      },
      personality: {
        greed: Math.min(100, Math.max(0, greed)),
        patience: Math.random() * 100,
        ambition: Math.random() * 100,
        ethics: ethics
      }
    });
  }
}

export default Manager;
