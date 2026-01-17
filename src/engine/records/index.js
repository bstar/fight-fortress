/**
 * Fight Records Module
 *
 * Exports all record-related classes for capturing and persisting fight data.
 */

export { FighterSnapshot } from './FighterSnapshot.js';
export { FightRecord } from './FightRecord.js';
export { FightRecordGenerator } from './FightRecordGenerator.js';
export { FightRecordStore, defaultStore } from './FightRecordStore.js';

// Re-export pattern analysis for convenience
export { PatternAnalyzer } from '../patterns/PatternAnalyzer.js';
export {
  PatternDefinitions,
  PatternCategory,
  ConfidenceLevel,
  MinSampleSize,
  getPatternDefinition
} from '../patterns/PatternTypes.js';
