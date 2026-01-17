/**
 * ValidationRunner - Executes validation sets against the fight engine
 *
 * Runs multiple simulations for each matchup and compares results
 * against expected distributions to validate engine accuracy.
 */

import { Fighter, Fight } from '../../models/index.js';
import { ConfigLoader } from '../../utils/ConfigLoader.js';
import SimulationLoop from '../SimulationLoop.js';
import FighterAI from '../FighterAI.js';
import CombatResolver from '../CombatResolver.js';
import DamageCalculator from '../DamageCalculator.js';
import StaminaManager from '../StaminaManager.js';
import PositionTracker from '../PositionTracker.js';
import ModelParameters from '../model/ModelParameters.js';
import ValidationSet from './ValidationSet.js';

export class ValidationRunner {
  constructor(options = {}) {
    this.fightsPerMatchup = options.fightsPerMatchup || 100;
    this.verbose = options.verbose || false;
    this.progressCallback = options.progressCallback || null;

    // Statistics collection
    this.stats = {
      totalFights: 0,
      totalTime: 0,
      matchupsRun: 0
    };
  }

  /**
   * Run validation on a single matchup
   * @param {MatchupExpectation} matchup - Matchup to validate
   * @param {number} count - Number of fights to run
   * @returns {object} Matchup results
   */
  async runMatchup(matchup, count = this.fightsPerMatchup) {
    const results = {
      matchupId: matchup.id,
      totalFights: count,
      aWins: 0,
      bWins: 0,
      draws: 0,
      koWins: 0,
      tkoWins: 0,
      decisionWins: 0,
      totalRounds: 0,
      avgRounds: 0,
      aKOs: 0,
      bKOs: 0,
      fightDetails: []
    };

    // Load fighters
    const fighterAConfig = ConfigLoader.loadFighter(matchup.fighterAPath);
    const fighterBConfig = ConfigLoader.loadFighter(matchup.fighterBPath);

    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
      // Create fresh fighter instances
      const fighterA = fighterAConfig instanceof Fighter
        ? new Fighter(fighterAConfig.toConfig?.() || this.extractConfig(fighterAConfig))
        : new Fighter(fighterAConfig);

      const fighterB = fighterBConfig instanceof Fighter
        ? new Fighter(fighterBConfig.toConfig?.() || this.extractConfig(fighterBConfig))
        : new Fighter(fighterBConfig);

      // Create fight
      const fight = new Fight(fighterA, fighterB, { rounds: 12 });

      // Create simulation
      const simulation = new SimulationLoop(fight, {
        realTime: false,
        enableRenderer: false,
        enableLogging: false
      });

      simulation.setComponents({
        fighterAI: new FighterAI(),
        combatResolver: new CombatResolver(),
        damageCalculator: new DamageCalculator(),
        staminaManager: new StaminaManager(),
        positionTracker: new PositionTracker()
      });

      // Run fight
      await simulation.runInstant();

      // Collect result
      const result = fight.result;

      if (result.winner === 'A') {
        results.aWins++;
        if (result.method === 'KO') results.aKOs++;
      } else if (result.winner === 'B') {
        results.bWins++;
        if (result.method === 'KO') results.bKOs++;
      } else {
        results.draws++;
      }

      // Method tracking
      if (result.method === 'KO') {
        results.koWins++;
      } else if (result.method?.startsWith('TKO')) {
        results.tkoWins++;
      } else if (result.method === 'DECISION') {
        results.decisionWins++;
      }

      results.totalRounds += result.round || 12;

      // Store minimal fight detail
      results.fightDetails.push({
        winner: result.winner,
        method: result.method,
        round: result.round
      });

      // Progress callback
      if (this.progressCallback && i % 10 === 0) {
        this.progressCallback({
          matchupId: matchup.id,
          current: i + 1,
          total: count,
          aWins: results.aWins,
          bWins: results.bWins
        });
      }

      this.stats.totalFights++;
    }

    const elapsed = Date.now() - startTime;
    this.stats.totalTime += elapsed;
    this.stats.matchupsRun++;

    results.avgRounds = results.totalRounds / count;
    results.runTime = elapsed;

    return results;
  }

  /**
   * Extract config from Fighter instance for cloning
   */
  extractConfig(fighter) {
    return {
      identity: {
        name: fighter.name,
        nickname: fighter.nickname,
        nationality: fighter.nationality,
        hometown: fighter.hometown
      },
      physical: { ...fighter.physical },
      style: { ...fighter.style },
      power: { ...fighter.power },
      speed: { ...fighter.speed },
      stamina: { ...fighter.stamina },
      defense: { ...fighter.defense },
      offense: { ...fighter.offense },
      technical: { ...fighter.technical },
      mental: { ...fighter.mental },
      tactics: { ...fighter.tactics },
      corner: fighter.corner,
      record: { ...fighter.record }
    };
  }

  /**
   * Run validation on an entire validation set
   * @param {ValidationSet} validationSet - Set to validate
   * @returns {object} Aggregated results
   */
  async runValidationSet(validationSet) {
    const matchupResults = [];

    if (this.verbose) {
      console.log(`\nRunning validation set: ${validationSet.name}`);
      console.log(`Matchups: ${validationSet.matchups.length}`);
      console.log(`Fights per matchup: ${this.fightsPerMatchup}`);
      console.log('-'.repeat(60));
    }

    for (const matchup of validationSet.matchups) {
      if (this.verbose) {
        process.stdout.write(`  ${matchup.name}... `);
      }

      const results = await this.runMatchup(matchup);
      const validation = matchup.validate(results);

      matchupResults.push(validation);

      if (this.verbose) {
        const status = validation.passed ? 'PASS' : 'FAIL';
        const aRate = (results.aWins / results.totalFights * 100).toFixed(1);
        const bRate = (results.bWins / results.totalFights * 100).toFixed(1);
        console.log(`${status} (A: ${aRate}%, B: ${bRate}%)`);
      }
    }

    // Aggregate results
    const summary = validationSet.aggregateResults(matchupResults);
    summary.modelVersion = ModelParameters.getVersion();
    summary.fightsPerMatchup = this.fightsPerMatchup;
    summary.stats = { ...this.stats };

    return summary;
  }

  /**
   * Run validation from a YAML file
   * @param {string} filePath - Path to validation set YAML
   * @returns {object} Validation results
   */
  async runFromFile(filePath) {
    const validationSet = ValidationSet.loadFromFile(filePath);
    return this.runValidationSet(validationSet);
  }

  /**
   * Run all validation sets in a directory
   * @param {string} dirPath - Directory containing validation YAMLs
   * @returns {Array} Results for each set
   */
  async runFromDirectory(dirPath) {
    const sets = ValidationSet.loadFromDirectory(dirPath);
    const allResults = [];

    for (const set of sets) {
      const result = await this.runValidationSet(set);
      allResults.push(result);
    }

    return allResults;
  }

  /**
   * Generate a detailed report from validation results
   * @param {object} summary - Validation summary
   * @returns {string} Formatted report
   */
  generateReport(summary) {
    const lines = [];

    lines.push('='.repeat(70));
    lines.push(`VALIDATION REPORT: ${summary.setName}`);
    lines.push('='.repeat(70));
    lines.push('');

    // Overview
    lines.push('OVERVIEW');
    lines.push('-'.repeat(40));
    lines.push(`Model Version: ${summary.modelVersion}`);
    lines.push(`Fights per matchup: ${summary.fightsPerMatchup}`);
    lines.push(`Total matchups: ${summary.totalMatchups}`);
    lines.push(`Passed: ${summary.passedMatchups} / ${summary.totalMatchups}`);
    lines.push(`Overall Score: ${(summary.overallScore * 100).toFixed(1)}%`);
    lines.push(`Weighted Score: ${(summary.weightedScore * 100).toFixed(1)}%`);
    lines.push('');

    // Detailed results
    lines.push('MATCHUP RESULTS');
    lines.push('-'.repeat(40));

    for (const result of summary.results) {
      const status = result.passed ? '[PASS]' : '[FAIL]';
      const aRate = (result.details.aWinRate.actual * 100).toFixed(1);
      const bRate = (result.details.bWinRate.actual * 100).toFixed(1);
      const aExpMin = (result.details.aWinRate.expected.min * 100).toFixed(0);
      const aExpMax = (result.details.aWinRate.expected.max * 100).toFixed(0);

      lines.push(`${status} ${result.name}`);
      lines.push(`       A: ${aRate}% (expected ${aExpMin}-${aExpMax}%)`);
      lines.push(`       B: ${bRate}%`);

      if (!result.passed) {
        const issues = [];
        if (!result.details.aWinRate.passed) {
          issues.push(`A win rate deviation: ${(result.details.aWinRate.deviation * 100).toFixed(1)}%`);
        }
        if (!result.details.bWinRate.passed) {
          issues.push(`B win rate deviation: ${(result.details.bWinRate.deviation * 100).toFixed(1)}%`);
        }
        lines.push(`       Issues: ${issues.join(', ')}`);
      }
      lines.push('');
    }

    // Worst deviations
    if (summary.worstDeviations.length > 0) {
      lines.push('WORST DEVIATIONS');
      lines.push('-'.repeat(40));

      for (const dev of summary.worstDeviations) {
        lines.push(`  ${dev.name}: deviation ${(dev.deviation * 100).toFixed(1)}%`);
      }
      lines.push('');
    }

    // Performance stats
    lines.push('PERFORMANCE');
    lines.push('-'.repeat(40));
    lines.push(`Total fights run: ${summary.stats.totalFights}`);
    lines.push(`Total time: ${(summary.stats.totalTime / 1000).toFixed(1)}s`);
    lines.push(`Fights/second: ${(summary.stats.totalFights / (summary.stats.totalTime / 1000)).toFixed(1)}`);
    lines.push('');

    lines.push('='.repeat(70));

    return lines.join('\n');
  }

  /**
   * Quick summary for CLI output
   * @param {object} summary - Validation summary
   * @returns {string} Short summary
   */
  getQuickSummary(summary) {
    const passRate = (summary.passedMatchups / summary.totalMatchups * 100).toFixed(0);
    return `${summary.setName}: ${summary.passedMatchups}/${summary.totalMatchups} passed (${passRate}%)`;
  }
}

export default ValidationRunner;
