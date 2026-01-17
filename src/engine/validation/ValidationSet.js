/**
 * ValidationSet - Defines expected outcomes for historical matchups
 *
 * Used to calibrate the fight engine against known boxing history.
 * Each matchup specifies expected win probability ranges and method distributions.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

/**
 * Single matchup expectation
 */
export class MatchupExpectation {
  constructor(config) {
    this.id = config.id;
    this.name = config.name || config.id;
    this.description = config.description || '';

    // Fighter file paths
    this.fighterAPath = config.fighterA;
    this.fighterBPath = config.fighterB;

    // Fighter names for display
    this.fighterAName = config.fighterAName || 'Fighter A';
    this.fighterBName = config.fighterBName || 'Fighter B';

    // Expected win probability ranges [min, max]
    this.expectedWinRate = {
      A: this.parseRange(config.expectedWinRate?.A || config.aWins || [0.4, 0.6]),
      B: this.parseRange(config.expectedWinRate?.B || config.bWins || [0.4, 0.6]),
      draw: this.parseRange(config.expectedWinRate?.draw || config.drawRate || [0.01, 0.05])
    };

    // Expected method distribution ranges
    this.expectedMethods = {
      ko: this.parseRange(config.expectedMethods?.ko || [0.2, 0.5]),
      tko: this.parseRange(config.expectedMethods?.tko || [0.1, 0.3]),
      decision: this.parseRange(config.expectedMethods?.decision || [0.3, 0.6])
    };

    // Expected fight characteristics
    this.expectedRounds = config.expectedRounds || { min: 6, max: 12 };

    // Validation weight (importance in overall score)
    this.weight = config.weight || 1.0;

    // Tags for filtering
    this.tags = config.tags || [];

    // Historical context notes
    this.notes = config.notes || '';

    // Actual historical result (if known)
    this.actualResult = config.actualResult || null;
  }

  /**
   * Parse a range value - can be [min, max] array or "min-max" string
   */
  parseRange(value) {
    if (Array.isArray(value)) {
      return { min: value[0], max: value[1] };
    }
    if (typeof value === 'string' && value.includes('-')) {
      const [min, max] = value.split('-').map(parseFloat);
      return { min, max };
    }
    if (typeof value === 'number') {
      return { min: value - 0.05, max: value + 0.05 };
    }
    return { min: 0.4, max: 0.6 };
  }

  /**
   * Check if an actual rate falls within expected range
   */
  isWithinRange(actual, expected) {
    return actual >= expected.min && actual <= expected.max;
  }

  /**
   * Calculate deviation from expected range
   */
  calculateDeviation(actual, expected) {
    if (actual < expected.min) {
      return expected.min - actual;
    }
    if (actual > expected.max) {
      return actual - expected.max;
    }
    return 0;
  }

  /**
   * Validate results against expectations
   */
  validate(results) {
    const validation = {
      matchupId: this.id,
      name: this.name,
      sampleSize: results.totalFights,
      passed: true,
      details: {}
    };

    // Check Fighter A win rate
    const aWinRate = results.aWins / results.totalFights;
    validation.details.aWinRate = {
      actual: aWinRate,
      expected: this.expectedWinRate.A,
      passed: this.isWithinRange(aWinRate, this.expectedWinRate.A),
      deviation: this.calculateDeviation(aWinRate, this.expectedWinRate.A)
    };

    // Check Fighter B win rate
    const bWinRate = results.bWins / results.totalFights;
    validation.details.bWinRate = {
      actual: bWinRate,
      expected: this.expectedWinRate.B,
      passed: this.isWithinRange(bWinRate, this.expectedWinRate.B),
      deviation: this.calculateDeviation(bWinRate, this.expectedWinRate.B)
    };

    // Check KO rate
    const koRate = (results.koWins + results.tkoWins) / results.totalFights;
    const expectedKORate = {
      min: this.expectedMethods.ko.min + this.expectedMethods.tko.min,
      max: this.expectedMethods.ko.max + this.expectedMethods.tko.max
    };
    validation.details.koRate = {
      actual: koRate,
      expected: expectedKORate,
      passed: this.isWithinRange(koRate, expectedKORate),
      deviation: this.calculateDeviation(koRate, expectedKORate)
    };

    // Check decision rate
    const decisionRate = results.decisionWins / results.totalFights;
    validation.details.decisionRate = {
      actual: decisionRate,
      expected: this.expectedMethods.decision,
      passed: this.isWithinRange(decisionRate, this.expectedMethods.decision),
      deviation: this.calculateDeviation(decisionRate, this.expectedMethods.decision)
    };

    // Check average rounds
    validation.details.avgRounds = {
      actual: results.avgRounds,
      expected: this.expectedRounds,
      passed: results.avgRounds >= this.expectedRounds.min &&
              results.avgRounds <= this.expectedRounds.max,
      deviation: results.avgRounds < this.expectedRounds.min
        ? this.expectedRounds.min - results.avgRounds
        : results.avgRounds > this.expectedRounds.max
          ? results.avgRounds - this.expectedRounds.max
          : 0
    };

    // Overall pass/fail (win rates are most critical)
    validation.passed = validation.details.aWinRate.passed &&
                        validation.details.bWinRate.passed;

    // Calculate overall score (0-1)
    const scores = [
      validation.details.aWinRate.passed ? 1 : 0,
      validation.details.bWinRate.passed ? 1 : 0,
      validation.details.koRate.passed ? 1 : 0,
      validation.details.decisionRate.passed ? 1 : 0,
      validation.details.avgRounds.passed ? 1 : 0
    ];
    validation.score = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Total deviation (for ranking worst offenders)
    validation.totalDeviation =
      validation.details.aWinRate.deviation +
      validation.details.bWinRate.deviation +
      validation.details.koRate.deviation * 0.5 +
      validation.details.decisionRate.deviation * 0.5;

    return validation;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      fighterA: this.fighterAPath,
      fighterB: this.fighterBPath,
      fighterAName: this.fighterAName,
      fighterBName: this.fighterBName,
      expectedWinRate: this.expectedWinRate,
      expectedMethods: this.expectedMethods,
      expectedRounds: this.expectedRounds,
      weight: this.weight,
      tags: this.tags,
      notes: this.notes,
      actualResult: this.actualResult
    };
  }
}

/**
 * Collection of matchup expectations
 */
export class ValidationSet {
  constructor(config = {}) {
    this.id = config.id || 'unnamed';
    this.name = config.name || 'Validation Set';
    this.description = config.description || '';
    this.version = config.version || '1.0.0';

    // Parse matchups
    this.matchups = (config.matchups || []).map(m => new MatchupExpectation(m));

    // Metadata
    this.createdAt = config.createdAt || new Date().toISOString();
    this.tags = config.tags || [];
  }

  /**
   * Load validation set from YAML file
   */
  static loadFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = yaml.parse(content);
    return new ValidationSet(config);
  }

  /**
   * Load all validation sets from a directory
   */
  static loadFromDirectory(dirPath) {
    const sets = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const fullPath = path.join(dirPath, file);
        sets.push(ValidationSet.loadFromFile(fullPath));
      }
    }

    return sets;
  }

  /**
   * Get matchups filtered by tag
   */
  getMatchupsByTag(tag) {
    return this.matchups.filter(m => m.tags.includes(tag));
  }

  /**
   * Get matchup by ID
   */
  getMatchup(id) {
    return this.matchups.find(m => m.id === id);
  }

  /**
   * Get all matchup IDs
   */
  getMatchupIds() {
    return this.matchups.map(m => m.id);
  }

  /**
   * Get total weight of all matchups
   */
  getTotalWeight() {
    return this.matchups.reduce((sum, m) => sum + m.weight, 0);
  }

  /**
   * Aggregate validation results
   */
  aggregateResults(matchupResults) {
    const summary = {
      setId: this.id,
      setName: this.name,
      totalMatchups: this.matchups.length,
      passedMatchups: 0,
      failedMatchups: 0,
      overallScore: 0,
      weightedScore: 0,
      results: matchupResults,
      worstDeviations: []
    };

    let totalWeight = 0;
    let weightedScoreSum = 0;

    for (const result of matchupResults) {
      if (result.passed) {
        summary.passedMatchups++;
      } else {
        summary.failedMatchups++;
      }

      const matchup = this.getMatchup(result.matchupId);
      const weight = matchup?.weight || 1.0;

      totalWeight += weight;
      weightedScoreSum += result.score * weight;
    }

    summary.overallScore = matchupResults.length > 0
      ? matchupResults.reduce((sum, r) => sum + r.score, 0) / matchupResults.length
      : 0;

    summary.weightedScore = totalWeight > 0
      ? weightedScoreSum / totalWeight
      : 0;

    // Find worst deviations
    summary.worstDeviations = matchupResults
      .filter(r => !r.passed)
      .sort((a, b) => b.totalDeviation - a.totalDeviation)
      .slice(0, 5)
      .map(r => ({
        matchupId: r.matchupId,
        name: r.name,
        deviation: r.totalDeviation,
        aWinRate: r.details.aWinRate
      }));

    return summary;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      createdAt: this.createdAt,
      tags: this.tags,
      matchups: this.matchups.map(m => m.toJSON())
    };
  }

  /**
   * Save to YAML file
   */
  saveToFile(filePath) {
    const content = yaml.stringify(this.toJSON(), { lineWidth: -1 });
    fs.writeFileSync(filePath, content);
  }
}

export default ValidationSet;
