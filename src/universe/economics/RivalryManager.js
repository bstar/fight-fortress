/**
 * Rivalry Manager
 * Manages and "marinates" boxing rivalries to build anticipation and value
 * Tracks intensity, events, and determines optimal timing for resolution
 */

import { v4 as uuidv4 } from 'uuid';
import { MarketValue } from './MarketValue.js';

// Rivalry intensity levels
export const RivalryIntensity = {
  BREWING: 'BREWING',         // 0-30: Early stage, building tension
  HEATED: 'HEATED',           // 31-60: Public awareness, callouts
  BOILING: 'BOILING',         // 61-80: Peak interest
  OVERCOOKED: 'OVERCOOKED'    // 81-100: Risk of losing interest
};

// Events that affect rivalry intensity
export const RivalryEvent = {
  CALLOUT: 'CALLOUT',                 // Public callout
  INTERVIEW_EXCHANGE: 'INTERVIEW_EXCHANGE',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  NEAR_MISS: 'NEAR_MISS',             // Almost fought but didn't
  GYM_ENCOUNTER: 'GYM_ENCOUNTER',     // Confrontation at gym/event
  SAME_CARD: 'SAME_CARD',             // Both fought on same card
  DUCKING_ACCUSATION: 'DUCKING_ACCUSATION',
  PROMOTIONAL_WAR: 'PROMOTIONAL_WAR',  // Different promoters feuding
  TITLE_CLAIM: 'TITLE_CLAIM'           // Dispute over legitimate champion
};

export class RivalryManager {
  /**
   * Create a new rivalry between two fighters
   */
  static createRivalry(fighterA, fighterB, universe, initialEvent = null) {
    const rivalry = {
      id: uuidv4(),
      fighterA: fighterA.id,
      fighterAName: fighterA.name,
      fighterB: fighterB.id,
      fighterBName: fighterB.name,
      startDate: { ...universe.currentDate },
      intensity: 30,  // Start at "brewing"
      resolved: false,
      resolutionDate: null,
      resolutionFightId: null,
      history: []
    };

    // Add initial event if provided
    if (initialEvent) {
      this.addRivalryEvent(rivalry, initialEvent, universe);
    }

    // Add to fighters' rival lists
    if (!fighterA.relationships) fighterA.relationships = { rivals: [] };
    if (!fighterB.relationships) fighterB.relationships = { rivals: [] };

    if (!fighterA.relationships.rivals.includes(fighterB.id)) {
      fighterA.relationships.rivals.push(fighterB.id);
    }
    if (!fighterB.relationships.rivals.includes(fighterA.id)) {
      fighterB.relationships.rivals.push(fighterA.id);
    }

    // Add to universe tracking
    if (!universe.activeRivalries) {
      universe.activeRivalries = [];
    }
    universe.activeRivalries.push(rivalry);

    return rivalry;
  }

  /**
   * Add an event to a rivalry, affecting intensity
   */
  static addRivalryEvent(rivalry, eventType, universe, details = {}) {
    const intensityChanges = {
      [RivalryEvent.CALLOUT]: 8,
      [RivalryEvent.INTERVIEW_EXCHANGE]: 5,
      [RivalryEvent.SOCIAL_MEDIA]: 3,
      [RivalryEvent.NEAR_MISS]: 12,
      [RivalryEvent.GYM_ENCOUNTER]: 10,
      [RivalryEvent.SAME_CARD]: 6,
      [RivalryEvent.DUCKING_ACCUSATION]: 10,
      [RivalryEvent.PROMOTIONAL_WAR]: 7,
      [RivalryEvent.TITLE_CLAIM]: 8
    };

    const change = intensityChanges[eventType] || 5;

    rivalry.intensity = Math.min(100, rivalry.intensity + change);
    rivalry.history.push({
      type: eventType,
      date: universe?.currentDate ? { ...universe.currentDate } : null,
      intensityBefore: rivalry.intensity - change,
      intensityAfter: rivalry.intensity,
      details
    });

    return {
      newIntensity: rivalry.intensity,
      level: this.getIntensityLevel(rivalry.intensity),
      change
    };
  }

  /**
   * Get intensity level from numeric value
   */
  static getIntensityLevel(intensity) {
    if (intensity >= 81) return RivalryIntensity.OVERCOOKED;
    if (intensity >= 61) return RivalryIntensity.BOILING;
    if (intensity >= 31) return RivalryIntensity.HEATED;
    return RivalryIntensity.BREWING;
  }

  /**
   * Process weekly decay/growth for all rivalries
   */
  static processWeeklyRivalries(universe) {
    const events = [];

    if (!universe.activeRivalries) return events;

    for (const rivalry of universe.activeRivalries) {
      if (rivalry.resolved) continue;

      const weeksActive = this.getWeeksActive(rivalry, universe);

      // Natural intensity decay over time if no events
      const lastEventWeeks = this.getWeeksSinceLastEvent(rivalry, universe);
      if (lastEventWeeks > 4) {
        // Decay 1 point per week after 4 weeks of quiet
        rivalry.intensity = Math.max(10, rivalry.intensity - 1);
      }

      // Check for overcooked rivalries (risk of staleness)
      if (rivalry.intensity >= 80 && weeksActive > 52) {
        events.push({
          type: 'RIVALRY_OVERCOOKED',
          rivalry,
          message: `${rivalry.fighterAName} vs ${rivalry.fighterBName} rivalry losing steam`
        });
      }

      // Random events can happen
      if (Math.random() < 0.05) { // 5% chance per week
        const randomEvent = this.generateRandomEvent(rivalry, universe);
        if (randomEvent) {
          events.push(randomEvent);
        }
      }
    }

    return events;
  }

  /**
   * Check if a rivalry should be resolved (fight made)
   */
  static shouldResolve(rivalry, universe) {
    const weeksActive = this.getWeeksActive(rivalry, universe);

    // Minimum marination: 12 weeks (3 months)
    if (weeksActive < 12) {
      return {
        shouldResolve: false,
        reason: 'Too early - needs more marination',
        weeksUntilOptimal: 12 - weeksActive
      };
    }

    // Maximum marination: 104 weeks (2 years)
    if (weeksActive > 104) {
      return {
        shouldResolve: true,
        reason: 'Maximum marination reached - fight must happen',
        urgency: 'CRITICAL'
      };
    }

    // Optimal window: intensity 60-80
    const intensityLevel = this.getIntensityLevel(rivalry.intensity);

    if (intensityLevel === RivalryIntensity.BOILING) {
      return {
        shouldResolve: true,
        reason: 'Peak interest - optimal time to make fight',
        urgency: 'HIGH'
      };
    }

    if (intensityLevel === RivalryIntensity.OVERCOOKED) {
      return {
        shouldResolve: true,
        reason: 'Risk of staleness - should resolve soon',
        urgency: 'VERY_HIGH'
      };
    }

    // Calculate probability based on time and intensity
    const timeFactor = (weeksActive - 12) / 92; // 0-1 over 2 years
    const intensityFactor = rivalry.intensity / 100;
    const resolveProbability = timeFactor * intensityFactor * 0.3;

    return {
      shouldResolve: Math.random() < resolveProbability,
      reason: 'Natural progression',
      probability: Math.round(resolveProbability * 100),
      urgency: 'NORMAL'
    };
  }

  /**
   * Resolve a rivalry (fight happened)
   */
  static resolveRivalry(rivalry, fightResult, universe) {
    rivalry.resolved = true;
    rivalry.resolutionDate = { ...universe.currentDate };
    rivalry.resolutionFightId = fightResult.id;

    // Add resolution to history
    rivalry.history.push({
      type: 'RESOLUTION',
      date: { ...universe.currentDate },
      winner: fightResult.winner,
      method: fightResult.method,
      round: fightResult.round
    });

    // Move from active to resolved
    if (universe.activeRivalries) {
      universe.activeRivalries = universe.activeRivalries.filter(r => r.id !== rivalry.id);
    }
    if (!universe.resolvedRivalries) {
      universe.resolvedRivalries = [];
    }
    universe.resolvedRivalries.push(rivalry);

    // Check if rematch is warranted (controversial ending, etc.)
    const shouldRematch = this.shouldCreateRematchRivalry(rivalry, fightResult);

    return {
      resolved: true,
      finalIntensity: rivalry.intensity,
      totalWeeks: this.getWeeksActive(rivalry, universe),
      eventCount: rivalry.history.length,
      shouldRematch
    };
  }

  /**
   * Check if a rematch rivalry should be created
   */
  static shouldCreateRematchRivalry(rivalry, fightResult) {
    // Controversial ending
    if (fightResult.method === 'DQ' || fightResult.method === 'NC') {
      return { create: true, reason: 'Controversial ending demands rematch' };
    }

    // Very close fight
    if (fightResult.method === 'Decision' && fightResult.stats?.scorecardSpread < 2) {
      return { create: true, reason: 'Close decision - fans want rematch' };
    }

    // High-intensity rivalry that was resolved early
    if (rivalry.intensity >= 70 && fightResult.round <= 3) {
      return { create: true, reason: 'Quick ending to heated rivalry' };
    }

    return { create: false };
  }

  /**
   * Generate a random rivalry event
   */
  static generateRandomEvent(rivalry, universe) {
    const fighterA = universe.fighters?.get(rivalry.fighterA);
    const fighterB = universe.fighters?.get(rivalry.fighterB);

    if (!fighterA || !fighterB) return null;

    // Weight events by what makes sense
    const eventWeights = [
      { event: RivalryEvent.CALLOUT, weight: 30 },
      { event: RivalryEvent.INTERVIEW_EXCHANGE, weight: 25 },
      { event: RivalryEvent.SOCIAL_MEDIA, weight: 20 },
      { event: RivalryEvent.DUCKING_ACCUSATION, weight: 15 },
      { event: RivalryEvent.GYM_ENCOUNTER, weight: 5 },
      { event: RivalryEvent.TITLE_CLAIM, weight: 5 }
    ];

    // Select weighted random event
    const totalWeight = eventWeights.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedEvent = eventWeights[0].event;
    for (const { event, weight } of eventWeights) {
      random -= weight;
      if (random <= 0) {
        selectedEvent = event;
        break;
      }
    }

    // Add the event
    const result = this.addRivalryEvent(rivalry, selectedEvent, universe, {
      instigator: Math.random() < 0.5 ? fighterA.id : fighterB.id
    });

    return {
      type: 'RIVALRY_EVENT',
      event: selectedEvent,
      rivalry,
      ...result,
      headline: this.generateEventHeadline(selectedEvent, fighterA, fighterB)
    };
  }

  /**
   * Generate headline for rivalry event
   */
  static generateEventHeadline(eventType, fighterA, fighterB) {
    const headlines = {
      [RivalryEvent.CALLOUT]: [
        `${fighterA.name} calls out ${fighterB.name}: "Let's settle this!"`,
        `${fighterA.name} demands ${fighterB.name} fight after victory`,
        `"You're next!" - ${fighterA.name} targets ${fighterB.name}`
      ],
      [RivalryEvent.INTERVIEW_EXCHANGE]: [
        `${fighterA.name} and ${fighterB.name} trade barbs in heated interview`,
        `War of words escalates between ${fighterA.name} and ${fighterB.name}`,
        `${fighterA.name} responds to ${fighterB.name}'s claims`
      ],
      [RivalryEvent.SOCIAL_MEDIA]: [
        `${fighterA.name} fires shots at ${fighterB.name} on social media`,
        `Twitter feud erupts between ${fighterA.name} and ${fighterB.name}`,
        `${fighterA.name}'s post about ${fighterB.name} goes viral`
      ],
      [RivalryEvent.DUCKING_ACCUSATION]: [
        `${fighterA.name} accuses ${fighterB.name} of ducking`,
        `"He's running!" - ${fighterA.name} calls ${fighterB.name} out for avoiding fight`,
        `${fighterA.name}: "${fighterB.name} doesn't want this smoke"`
      ],
      [RivalryEvent.GYM_ENCOUNTER]: [
        `${fighterA.name} and ${fighterB.name} have heated confrontation`,
        `Security separates ${fighterA.name} and ${fighterB.name} at event`,
        `Tension explodes between ${fighterA.name} and ${fighterB.name}`
      ],
      [RivalryEvent.TITLE_CLAIM]: [
        `${fighterA.name} disputes ${fighterB.name}'s claim as true champion`,
        `"I'm the real champion" - ${fighterA.name} challenges ${fighterB.name}'s legitimacy`,
        `${fighterA.name} says ${fighterB.name}'s title means nothing`
      ]
    };

    const options = headlines[eventType] || [`${fighterA.name} and ${fighterB.name} rivalry heats up`];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Calculate weeks active for a rivalry
   */
  static getWeeksActive(rivalry, universe) {
    if (!rivalry.startDate || !universe?.currentDate) return 0;

    const startWeeks = rivalry.startDate.year * 52 + rivalry.startDate.week;
    const currentWeeks = universe.currentDate.year * 52 + universe.currentDate.week;

    return currentWeeks - startWeeks;
  }

  /**
   * Calculate weeks since last event
   */
  static getWeeksSinceLastEvent(rivalry, universe) {
    if (!rivalry.history || rivalry.history.length === 0) {
      return this.getWeeksActive(rivalry, universe);
    }

    const lastEvent = rivalry.history[rivalry.history.length - 1];
    if (!lastEvent.date || !universe?.currentDate) return 0;

    const eventWeeks = lastEvent.date.year * 52 + lastEvent.date.week;
    const currentWeeks = universe.currentDate.year * 52 + universe.currentDate.week;

    return currentWeeks - eventWeeks;
  }

  /**
   * Calculate fight value boost from rivalry
   */
  static calculateRivalryValueBoost(rivalry) {
    const intensityBoost = rivalry.intensity / 100;
    const historyBoost = Math.min(0.2, rivalry.history.length * 0.02);

    // Total boost to fight value (up to 50% extra)
    return 1 + (intensityBoost * 0.3) + historyBoost;
  }

  /**
   * Get all rivalries for a specific fighter
   */
  static getFighterRivalries(fighterId, universe) {
    const active = (universe.activeRivalries || []).filter(r =>
      r.fighterA === fighterId || r.fighterB === fighterId
    );

    const resolved = (universe.resolvedRivalries || []).filter(r =>
      r.fighterA === fighterId || r.fighterB === fighterId
    );

    return { active, resolved };
  }

  /**
   * Find or create rivalry between two fighters
   */
  static findOrCreateRivalry(fighterA, fighterB, universe) {
    // Check existing
    const existing = (universe.activeRivalries || []).find(r =>
      (r.fighterA === fighterA.id && r.fighterB === fighterB.id) ||
      (r.fighterA === fighterB.id && r.fighterB === fighterA.id)
    );

    if (existing) return existing;

    // Create new
    return this.createRivalry(fighterA, fighterB, universe, RivalryEvent.CALLOUT);
  }

  /**
   * Serialize rivalry for saving
   */
  static serializeRivalry(rivalry) {
    return { ...rivalry };
  }

  /**
   * Deserialize rivalry from saved data
   */
  static deserializeRivalry(data) {
    return { ...data };
  }
}

export default RivalryManager;
