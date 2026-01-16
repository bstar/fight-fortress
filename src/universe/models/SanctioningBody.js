/**
 * Sanctioning Body Model
 * Represents boxing organizations like WBC, WBA, IBF, WBO
 * Each maintains their own champions and rankings per division
 */

import { v4 as uuidv4 } from 'uuid';

// The "Big Four" sanctioning bodies
export const SANCTIONING_BODIES = {
  WBC: {
    id: 'wbc',
    name: 'World Boxing Council',
    shortName: 'WBC',
    founded: 1963,
    headquarters: 'Mexico City, Mexico',
    beltColor: 'green',
    prestige: 95
  },
  WBA: {
    id: 'wba',
    name: 'World Boxing Association',
    shortName: 'WBA',
    founded: 1921,
    headquarters: 'Panama City, Panama',
    beltColor: 'gold',
    prestige: 90
  },
  IBF: {
    id: 'ibf',
    name: 'International Boxing Federation',
    shortName: 'IBF',
    founded: 1983,
    headquarters: 'Springfield, New Jersey',
    beltColor: 'red',
    prestige: 88
  },
  WBO: {
    id: 'wbo',
    name: 'World Boxing Organization',
    shortName: 'WBO',
    founded: 1988,
    headquarters: 'San Juan, Puerto Rico',
    beltColor: 'black',
    prestige: 85
  }
};

export class SanctioningBody {
  constructor(config) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.shortName = config.shortName;
    this.founded = config.founded;
    this.headquarters = config.headquarters;
    this.beltColor = config.beltColor;
    this.prestige = config.prestige || 80;

    // Champions per division { divisionName: fighterId }
    this.champions = new Map();

    // Rankings per division { divisionName: [fighterId, ...] } (top 15)
    this.rankings = new Map();

    // Title history per division
    this.titleHistory = new Map();

    // Active status
    this.isActive = false;
    this.activatedDate = null;
  }

  /**
   * Activate this sanctioning body (start recognizing champions)
   */
  activate(date) {
    this.isActive = true;
    this.activatedDate = { ...date };
  }

  /**
   * Initialize rankings for a division based on universe rankings
   */
  initializeDivisionRankings(divisionName, fighterIds) {
    // Take top 15 and set as initial rankings
    this.rankings.set(divisionName, fighterIds.slice(0, 15));
  }

  /**
   * Get champion for a division
   */
  getChampion(divisionName) {
    return this.champions.get(divisionName) || null;
  }

  /**
   * Set champion for a division
   */
  setChampion(divisionName, fighterId, date, method = 'Won vacant title') {
    const previousChamp = this.champions.get(divisionName);

    // Record in title history
    if (!this.titleHistory.has(divisionName)) {
      this.titleHistory.set(divisionName, []);
    }

    if (previousChamp) {
      // Find the current reign and close it
      const history = this.titleHistory.get(divisionName);
      const currentReign = history.find(h => h.fighterId === previousChamp && !h.endDate);
      if (currentReign) {
        currentReign.endDate = { ...date };
        currentReign.lostTo = fighterId;
        currentReign.lostBy = method;
      }
    }

    // Start new reign
    this.titleHistory.get(divisionName).push({
      fighterId,
      startDate: { ...date },
      endDate: null,
      defenses: 0,
      wonFrom: previousChamp,
      wonBy: method
    });

    this.champions.set(divisionName, fighterId);

    // Remove new champion from rankings
    const rankings = this.rankings.get(divisionName) || [];
    this.rankings.set(divisionName, rankings.filter(id => id !== fighterId));
  }

  /**
   * Vacate a title
   */
  vacateTitle(divisionName, date, reason = 'Vacated') {
    const champion = this.champions.get(divisionName);
    if (!champion) return;

    // Close current reign
    const history = this.titleHistory.get(divisionName) || [];
    const currentReign = history.find(h => h.fighterId === champion && !h.endDate);
    if (currentReign) {
      currentReign.endDate = { ...date };
      currentReign.lostTo = null;
      currentReign.lostBy = reason;
    }

    this.champions.delete(divisionName);
  }

  /**
   * Record a successful title defense
   */
  recordDefense(divisionName) {
    const champion = this.champions.get(divisionName);
    if (!champion) return;

    const history = this.titleHistory.get(divisionName) || [];
    const currentReign = history.find(h => h.fighterId === champion && !h.endDate);
    if (currentReign) {
      currentReign.defenses++;
    }
  }

  /**
   * Get rankings for a division
   */
  getRankings(divisionName) {
    return this.rankings.get(divisionName) || [];
  }

  /**
   * Update rankings for a division
   */
  updateRankings(divisionName, rankedFighterIds) {
    // Exclude champion from rankings
    const champion = this.champions.get(divisionName);
    const filtered = rankedFighterIds.filter(id => id !== champion);
    this.rankings.set(divisionName, filtered.slice(0, 15));
  }

  /**
   * Get mandatory challenger for a division
   */
  getMandatoryChallenger(divisionName) {
    const rankings = this.rankings.get(divisionName) || [];
    return rankings[0] || null;
  }

  /**
   * Get all divisions with champions
   */
  getActiveDivisions() {
    return Array.from(this.champions.keys());
  }

  /**
   * Get title history for a division
   */
  getTitleHistory(divisionName) {
    return this.titleHistory.get(divisionName) || [];
  }

  /**
   * Check if a fighter holds this organization's title
   */
  isChampion(fighterId) {
    for (const [division, champId] of this.champions) {
      if (champId === fighterId) {
        return division;
      }
    }
    return null;
  }

  /**
   * Get all titles held by a fighter
   */
  getFighterTitles(fighterId) {
    const titles = [];
    for (const [division, champId] of this.champions) {
      if (champId === fighterId) {
        titles.push({
          organization: this.shortName,
          division,
          beltColor: this.beltColor
        });
      }
    }
    return titles;
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      founded: this.founded,
      headquarters: this.headquarters,
      beltColor: this.beltColor,
      prestige: this.prestige,
      isActive: this.isActive,
      activatedDate: this.activatedDate,
      champions: Array.from(this.champions.entries()),
      rankings: Array.from(this.rankings.entries()),
      titleHistory: Array.from(this.titleHistory.entries()).map(([div, history]) => [div, history])
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    const body = new SanctioningBody(data);
    body.isActive = data.isActive;
    body.activatedDate = data.activatedDate;

    for (const [div, champ] of data.champions || []) {
      body.champions.set(div, champ);
    }
    for (const [div, rankings] of data.rankings || []) {
      body.rankings.set(div, rankings);
    }
    for (const [div, history] of data.titleHistory || []) {
      body.titleHistory.set(div, history);
    }

    return body;
  }

  /**
   * Create all major sanctioning bodies
   */
  static createAllBodies() {
    return Object.values(SANCTIONING_BODIES).map(config => new SanctioningBody(config));
  }
}

export default SanctioningBody;
