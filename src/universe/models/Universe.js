/**
 * Universe Model
 * The master state container for the boxing simulation universe
 * Manages all fighters, divisions, staff, and progression through time
 */

import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import { SanctioningBody } from './SanctioningBody.js';
import { HallOfFame } from './HallOfFame.js';
const require = createRequire(import.meta.url);

export class Universe {
  constructor(config = {}) {
    // Universe metadata
    this.id = config.id || uuidv4();
    this.name = config.name || 'Boxing Universe';
    this.createdAt = config.createdAt || new Date().toISOString();

    // Time tracking - weekly progression
    this.currentDate = config.currentDate || { year: 2000, week: 1 };

    // Weight class divisions
    this.divisions = new Map();

    // All fighters indexed by ID
    this.fighters = new Map();

    // Post-career staff
    this.trainers = new Map();
    this.commentators = new Map();
    this.promoters = new Map();

    // Sanctioning bodies (WBC, WBA, IBF, WBO)
    this.sanctioningBodies = new Map();

    // Hall of Fame
    this.hallOfFame = config.hallOfFame || new HallOfFame();

    // Retired fighters (kept for HOF evaluation and history)
    this.retiredFighters = new Map();

    // Recent fight results (for dashboard display)
    this.lastWeekResults = [];
    this.recentResults = [];  // Rolling last 10 fight weeks

    // Scheduled events (fight cards)
    this.scheduledEvents = [];

    // Era tracking
    this.era = {
      championshipsInaugurated: false,
      inaugurationDate: null
    };

    // Historical records
    this.history = {
      champions: [],           // { fighterId, division, startDate, endDate, defenses }
      hallOfFame: [],          // Inducted legendary fighters
      fightOfYear: [],         // { year, fightId, fighterA, fighterB }
      knockoutOfYear: [],      // { year, fightId, knockout details }
      retirements: [],         // { fighterId, date, record, titles }
      upsets: []               // Major upsets recorded
    };

    // Universe statistics
    this.stats = {
      totalFightsSimulated: 0,
      totalKnockouts: 0,
      totalDecisions: 0,
      totalDraws: 0,
      fightersGenerated: 0,
      fightersRetired: 0
    };

    // Configuration
    this.config = {
      // Target number of active fighters
      targetFighterCount: config.targetFighterCount || 500,
      // Acceptable variance from target
      fighterCountVariance: config.fighterCountVariance || 100,
      // How many new prospects enter per week (dynamically adjusted)
      baseProspectRate: config.baseProspectRate || 2.0,
      // Minimum fighters per division
      minFightersPerDivision: config.minFightersPerDivision || 25,
      // Simulation speed multiplier
      simulationSpeed: config.simulationSpeed || 1,
      // Enable/disable features
      enableInjuries: config.enableInjuries !== false,
      enableRetirements: config.enableRetirements !== false,
      enablePostCareerRoles: config.enablePostCareerRoles !== false
    };

    // Initialize default divisions
    if (config.initializeDivisions !== false) {
      this.initializeDefaultDivisions();
    }
  }

  /**
   * Initialize the standard boxing weight divisions
   */
  initializeDefaultDivisions() {
    // Import Division inline to avoid circular dependency at module level
    const { Division } = require('./Division.js');

    const divisions = [
      { name: 'Heavyweight', minWeight: 90.7, maxWeight: Infinity, displayWeight: '200+ lbs' },
      { name: 'Cruiserweight', minWeight: 79.4, maxWeight: 90.7, displayWeight: '175-200 lbs' },
      { name: 'Light Heavyweight', minWeight: 76.2, maxWeight: 79.4, displayWeight: '168-175 lbs' },
      { name: 'Super Middleweight', minWeight: 72.6, maxWeight: 76.2, displayWeight: '160-168 lbs' },
      { name: 'Middleweight', minWeight: 69.9, maxWeight: 72.6, displayWeight: '154-160 lbs' },
      { name: 'Super Welterweight', minWeight: 66.7, maxWeight: 69.9, displayWeight: '147-154 lbs' },
      { name: 'Welterweight', minWeight: 63.5, maxWeight: 66.7, displayWeight: '140-147 lbs' },
      { name: 'Super Lightweight', minWeight: 61.2, maxWeight: 63.5, displayWeight: '135-140 lbs' },
      { name: 'Lightweight', minWeight: 58.97, maxWeight: 61.2, displayWeight: '130-135 lbs' },
      { name: 'Super Featherweight', minWeight: 57.15, maxWeight: 58.97, displayWeight: '126-130 lbs' },
      { name: 'Featherweight', minWeight: 55.34, maxWeight: 57.15, displayWeight: '122-126 lbs' },
      { name: 'Super Bantamweight', minWeight: 53.52, maxWeight: 55.34, displayWeight: '118-122 lbs' },
      { name: 'Bantamweight', minWeight: 51.71, maxWeight: 53.52, displayWeight: '114-118 lbs' },
      { name: 'Super Flyweight', minWeight: 50.8, maxWeight: 51.71, displayWeight: '112-115 lbs' },
      { name: 'Flyweight', minWeight: 48.99, maxWeight: 50.8, displayWeight: '108-112 lbs' },
      { name: 'Light Flyweight', minWeight: 47.63, maxWeight: 48.99, displayWeight: '105-108 lbs' },
      { name: 'Minimumweight', minWeight: 0, maxWeight: 47.63, displayWeight: '105 lbs' }
    ];

    for (const div of divisions) {
      this.divisions.set(div.name, new Division(div));
    }
  }

  /**
   * Add a fighter to the universe
   */
  addFighter(fighter) {
    this.fighters.set(fighter.id, fighter);

    // Assign to appropriate division
    const division = this.getDivisionForWeight(fighter.physical.weight);
    if (division) {
      division.addFighter(fighter.id);
    }

    this.stats.fightersGenerated++;
    return fighter;
  }

  /**
   * Remove a fighter from active roster (retirement, etc.)
   */
  removeFighter(fighterId, reason = 'retirement') {
    const fighter = this.fighters.get(fighterId);
    if (!fighter) return null;

    // Remove from division
    const division = this.getDivisionForWeight(fighter.physical.weight);
    if (division) {
      division.removeFighter(fighterId);
    }

    // Record retirement
    if (reason === 'retirement') {
      this.history.retirements.push({
        fighterId,
        name: fighter.name,
        date: { ...this.currentDate },
        record: { ...fighter.career.record },
        titles: [...(fighter.career.titles || [])],
        finalRanking: fighter.career.rankings?.current
      });
      this.stats.fightersRetired++;

      // Add to retiredFighters for HOF evaluation
      this.retiredFighters.set(fighterId, fighter);
    }

    // Move to retired status but keep in universe for history
    fighter.career.phase = 'RETIRED';
    fighter.career.retirementDate = { ...this.currentDate };

    return fighter;
  }

  /**
   * Record fight results for dashboard display
   */
  recordWeekResults(results) {
    this.lastWeekResults = results;

    // Add to recent results (keep last 10 weeks)
    if (results.length > 0) {
      this.recentResults.push({
        date: { ...this.currentDate },
        fights: results
      });
      while (this.recentResults.length > 10) {
        this.recentResults.shift();
      }
    }
  }

  /**
   * Get the appropriate division for a fighter's weight
   */
  getDivisionForWeight(weight) {
    for (const [name, division] of this.divisions) {
      if (weight >= division.minWeight && weight < division.maxWeight) {
        return division;
      }
    }
    return this.divisions.get('Heavyweight'); // Default to heavyweight
  }

  /**
   * Get a fighter by ID
   */
  getFighter(fighterId) {
    return this.fighters.get(fighterId);
  }

  /**
   * Get all active (non-retired) fighters
   */
  getActiveFighters() {
    return Array.from(this.fighters.values())
      .filter(f => f.career.phase !== 'RETIRED');
  }

  /**
   * Get all retired fighters
   */
  getRetiredFighters() {
    return Array.from(this.fighters.values())
      .filter(f => f.career.phase === 'RETIRED');
  }

  /**
   * Advance time by one week
   */
  advanceWeek() {
    this.currentDate.week++;
    if (this.currentDate.week > 52) {
      this.currentDate.week = 1;
      this.currentDate.year++;
    }
  }

  /**
   * Get current date as string
   */
  getDateString() {
    return `Week ${this.currentDate.week}, ${this.currentDate.year}`;
  }

  /**
   * Calculate weeks elapsed since a given date
   */
  weeksSince(date) {
    const totalWeeksCurrent = this.currentDate.year * 52 + this.currentDate.week;
    const totalWeeksThen = date.year * 52 + date.week;
    return totalWeeksCurrent - totalWeeksThen;
  }

  /**
   * Add a trainer (post-career role)
   */
  addTrainer(trainer) {
    this.trainers.set(trainer.id, trainer);
    return trainer;
  }

  /**
   * Add a commentator (post-career role)
   */
  addCommentator(commentator) {
    this.commentators.set(commentator.id, commentator);
    return commentator;
  }

  /**
   * Add a promoter (post-career role)
   */
  addPromoter(promoter) {
    this.promoters.set(promoter.id, promoter);
    return promoter;
  }

  /**
   * Schedule a fight event
   */
  scheduleEvent(event) {
    this.scheduledEvents.push(event);
    // Sort by date
    this.scheduledEvents.sort((a, b) => {
      const aTotal = a.date.year * 52 + a.date.week;
      const bTotal = b.date.year * 52 + b.date.week;
      return aTotal - bTotal;
    });
    return event;
  }

  /**
   * Get events scheduled for current week
   */
  getCurrentWeekEvents() {
    return this.scheduledEvents.filter(e =>
      e.date.year === this.currentDate.year &&
      e.date.week === this.currentDate.week
    );
  }

  /**
   * Record a completed fight
   */
  recordFight(fightResult) {
    this.stats.totalFightsSimulated++;

    if (fightResult.method === 'KO' || fightResult.method === 'TKO') {
      this.stats.totalKnockouts++;
    } else if (fightResult.method === 'Decision') {
      this.stats.totalDecisions++;
    } else if (fightResult.method === 'Draw') {
      this.stats.totalDraws++;
    }

    // Check for upset
    if (fightResult.isUpset) {
      this.history.upsets.push({
        date: { ...this.currentDate },
        winner: fightResult.winner,
        loser: fightResult.loser,
        method: fightResult.method
      });
    }
  }

  /**
   * Get universe summary statistics
   */
  getSummary() {
    const activeFighters = this.getActiveFighters();
    const divisionStats = {};

    for (const [name, division] of this.divisions) {
      divisionStats[name] = {
        totalFighters: division.fighters.length,
        champion: division.champion,
        topContenders: division.rankings.slice(0, 3)
      };
    }

    return {
      date: this.getDateString(),
      totalFighters: this.fighters.size,
      activeFighters: activeFighters.length,
      retiredFighters: this.stats.fightersRetired,
      totalFights: this.stats.totalFightsSimulated,
      knockoutRate: this.stats.totalFightsSimulated > 0
        ? (this.stats.totalKnockouts / this.stats.totalFightsSimulated * 100).toFixed(1) + '%'
        : '0%',
      trainers: this.trainers.size,
      commentators: this.commentators.size,
      promoters: this.promoters.size,
      divisions: divisionStats
    };
  }

  /**
   * Inaugurate championship era - create sanctioning bodies and crown first champions
   * Called after initial simulation period when top fighters have emerged
   */
  inaugurateChampionships() {
    if (this.era.championshipsInaugurated) return;

    // Create the Big Four sanctioning bodies
    const bodies = SanctioningBody.createAllBodies();
    for (const body of bodies) {
      body.activate(this.currentDate);
      this.sanctioningBodies.set(body.shortName, body);
    }

    // For each division, set up initial rankings and prepare for title fights
    // The #1 ranked fighters in each division will fight for the inaugural titles
    for (const [divisionName, division] of this.divisions) {
      if (division.rankings.length < 2) continue;

      // Each sanctioning body gets its own rankings based on universe rankings
      for (const body of bodies) {
        // Slightly shuffle rankings for each body to create variety
        const shuffledRankings = [...division.rankings];
        for (let i = 0; i < Math.min(3, shuffledRankings.length); i++) {
          if (Math.random() < 0.3 && i + 1 < shuffledRankings.length) {
            [shuffledRankings[i], shuffledRankings[i + 1]] = [shuffledRankings[i + 1], shuffledRankings[i]];
          }
        }
        body.initializeDivisionRankings(divisionName, shuffledRankings);
      }
    }

    this.era.championshipsInaugurated = true;
    this.era.inaugurationDate = { ...this.currentDate };

    return bodies;
  }

  /**
   * Get a sanctioning body by short name
   */
  getSanctioningBody(shortName) {
    return this.sanctioningBodies.get(shortName);
  }

  /**
   * Get all active sanctioning bodies
   */
  getAllSanctioningBodies() {
    return Array.from(this.sanctioningBodies.values());
  }

  /**
   * Get all titles held by a fighter
   */
  getFighterTitles(fighterId) {
    const titles = [];
    for (const body of this.sanctioningBodies.values()) {
      titles.push(...body.getFighterTitles(fighterId));
    }
    return titles;
  }

  /**
   * Serialize universe to JSON for saving
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      currentDate: this.currentDate,
      config: this.config,
      stats: this.stats,
      history: this.history,
      era: this.era,
      divisions: Array.from(this.divisions.entries()).map(([name, div]) => [name, div.toJSON()]),
      fighters: Array.from(this.fighters.entries()).map(([id, f]) => [id, f.toJSON()]),
      retiredFighters: Array.from(this.retiredFighters.entries()).map(([id, f]) => [id, f.toJSON()]),
      trainers: Array.from(this.trainers.entries()),
      commentators: Array.from(this.commentators.entries()),
      promoters: Array.from(this.promoters.entries()),
      sanctioningBodies: Array.from(this.sanctioningBodies.entries()).map(([name, body]) => [name, body.toJSON()]),
      hallOfFame: this.hallOfFame.toJSON(),
      recentResults: this.recentResults,
      scheduledEvents: this.scheduledEvents
    };
  }

  /**
   * Create universe from saved JSON data
   */
  static fromJSON(data) {
    // Import dependencies inline to avoid circular dependency
    const { Division } = require('./Division.js');
    const { UniverseFighter } = require('./UniverseFighter.js');

    const universe = new Universe({
      ...data,
      initializeDivisions: false
    });

    // Restore era
    universe.era = data.era || { championshipsInaugurated: false, inaugurationDate: null };

    // Restore divisions
    for (const [name, divData] of data.divisions) {
      universe.divisions.set(name, Division.fromJSON(divData));
    }

    // Restore fighters
    for (const [id, fighterData] of data.fighters) {
      universe.fighters.set(id, UniverseFighter.fromJSON(fighterData));
    }

    // Restore staff
    for (const [id, trainer] of data.trainers || []) {
      universe.trainers.set(id, trainer);
    }
    for (const [id, commentator] of data.commentators || []) {
      universe.commentators.set(id, commentator);
    }
    for (const [id, promoter] of data.promoters || []) {
      universe.promoters.set(id, promoter);
    }

    // Restore sanctioning bodies
    for (const [name, bodyData] of data.sanctioningBodies || []) {
      universe.sanctioningBodies.set(name, SanctioningBody.fromJSON(bodyData));
    }

    // Restore retired fighters
    for (const [id, fighterData] of data.retiredFighters || []) {
      universe.retiredFighters.set(id, UniverseFighter.fromJSON(fighterData));
    }

    // Restore Hall of Fame
    if (data.hallOfFame) {
      universe.hallOfFame = HallOfFame.fromJSON(data.hallOfFame);
    }

    universe.recentResults = data.recentResults || [];
    universe.scheduledEvents = data.scheduledEvents || [];

    return universe;
  }
}

export default Universe;
