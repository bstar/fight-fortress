/**
 * Universe Module Index
 * Exports all universe simulation components
 */

// Models
export { Universe } from './models/Universe.js';
export { Division } from './models/Division.js';
export { UniverseFighter, CareerPhase, TalentTier } from './models/UniverseFighter.js';
export { SanctioningBody, SANCTIONING_BODIES } from './models/SanctioningBody.js';
export { HallOfFame, HOFCategory } from './models/HallOfFame.js';

// Generation
export { FighterGenerator } from './generation/FighterGenerator.js';
export { NameGenerator } from './generation/NameGenerator.js';

// Simulation
export { WeekProcessor } from './simulation/WeekProcessor.js';
export { RankingsManager } from './simulation/RankingsManager.js';
export { MatchmakingEngine, FightType, MatchupQuality } from './simulation/MatchmakingEngine.js';
export { FightIntegration } from './simulation/FightIntegration.js';

// Persistence
export { SaveManager } from './persistence/SaveManager.js';

import { Universe } from './models/Universe.js';
import { FighterGenerator } from './generation/FighterGenerator.js';
import { WeekProcessor } from './simulation/WeekProcessor.js';

/**
 * Create and initialize a new universe
 * @param {Object} config - Universe configuration
 * @returns {Universe}
 */
export function createUniverse(config = {}) {
  const universe = new Universe(config);
  const generator = new FighterGenerator();

  // Populate with initial fighters if specified
  if (config.initialFighters) {
    const count = config.initialFighters;
    console.log(`Generating ${count} initial fighters...`);

    const fighters = generator.generateBatch(count, {
      currentDate: universe.currentDate
    });

    for (const fighter of fighters) {
      universe.addFighter(fighter);
    }

    console.log(`Universe initialized with ${universe.fighters.size} fighters`);
  }

  return universe;
}

/**
 * Simulate a number of weeks (uses full SimulationLoop combat engine)
 * @param {Universe} universe
 * @param {number} weeks
 * @param {Function} onEvent - Callback for events
 * @returns {Promise<Object[]>} All events
 */
export async function simulateWeeks(universe, weeks, onEvent = null) {
  const processor = new WeekProcessor(universe);
  const allEvents = [];

  for (let i = 0; i < weeks; i++) {
    const events = await processor.processWeek();
    allEvents.push(...events);

    if (onEvent) {
      for (const event of events) {
        onEvent(event);
      }
    }
  }

  return allEvents;
}
