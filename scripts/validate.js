#!/usr/bin/env node
/**
 * Validation CLI Script
 *
 * Runs validation sets against the fight engine to verify accuracy.
 *
 * Usage:
 *   node scripts/validate.js                     # Run all validation sets
 *   node scripts/validate.js --set heavyweight   # Run specific set
 *   node scripts/validate.js --fights 50         # Custom fight count
 *   node scripts/validate.js --verbose           # Detailed output
 *   node scripts/validate.js --report            # Generate full report
 */

import path from 'path';
import { ValidationRunner, ValidationSet } from '../src/engine/validation/index.js';
import ModelParameters from '../src/engine/model/ModelParameters.js';

// Parse arguments
const args = process.argv.slice(2);
const options = {
  setFilter: null,
  fightsPerMatchup: 100,
  verbose: false,
  report: false,
  help: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg === '--report' || arg === '-r') {
    options.report = true;
  } else if (arg === '--set' || arg === '-s') {
    options.setFilter = args[++i];
  } else if (arg === '--fights' || arg === '-f') {
    options.fightsPerMatchup = parseInt(args[++i], 10);
  }
}

// Help text
if (options.help) {
  console.log(`
Fight Engine Validation Tool
=============================

Runs validation sets against the fight engine to verify accuracy.

Usage:
  node scripts/validate.js [options]

Options:
  --set, -s <name>     Run only sets matching name (e.g., "heavyweight")
  --fights, -f <n>     Fights per matchup (default: 100)
  --verbose, -v        Show detailed progress
  --report, -r         Generate full report
  --help, -h           Show this help

Examples:
  node scripts/validate.js                        Run all validation sets
  node scripts/validate.js -s heavyweight -f 50   Run heavyweight set with 50 fights
  node scripts/validate.js -v -r                  Verbose mode with full report
`);
  process.exit(0);
}

// Main validation function
async function runValidation() {
  console.log('='.repeat(60));
  console.log('FIGHT ENGINE VALIDATION');
  console.log('='.repeat(60));
  console.log(`Model Version: ${ModelParameters.getVersion()}`);
  console.log(`Fights per matchup: ${options.fightsPerMatchup}`);
  console.log('');

  const runner = new ValidationRunner({
    fightsPerMatchup: options.fightsPerMatchup,
    verbose: options.verbose,
    progressCallback: options.verbose ? null : (progress) => {
      process.stdout.write(`\r  ${progress.matchupId}: ${progress.current}/${progress.total}`);
    }
  });

  const validationDir = path.join(process.cwd(), 'src/engine/validation/sets');

  try {
    // Load validation sets
    const sets = ValidationSet.loadFromDirectory(validationDir);

    // Filter if specified
    const filteredSets = options.setFilter
      ? sets.filter(s => s.id.includes(options.setFilter) || s.name.includes(options.setFilter))
      : sets;

    if (filteredSets.length === 0) {
      console.log('No validation sets found matching criteria.');
      process.exit(1);
    }

    console.log(`Running ${filteredSets.length} validation set(s)...\n`);

    const allResults = [];

    for (const set of filteredSets) {
      const summary = await runner.runValidationSet(set);
      allResults.push(summary);

      // Clear progress line
      if (!options.verbose) {
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
      }

      // Show quick summary
      console.log(runner.getQuickSummary(summary));

      // Show full report if requested
      if (options.report) {
        console.log('');
        console.log(runner.generateReport(summary));
      }
    }

    // Overall summary
    console.log('');
    console.log('='.repeat(60));
    console.log('OVERALL SUMMARY');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalMatchups = 0;

    for (const result of allResults) {
      totalPassed += result.passedMatchups;
      totalMatchups += result.totalMatchups;
    }

    const overallPassRate = (totalPassed / totalMatchups * 100).toFixed(1);

    console.log(`Total matchups: ${totalMatchups}`);
    console.log(`Passed: ${totalPassed}/${totalMatchups} (${overallPassRate}%)`);
    console.log(`Total fights: ${runner.stats.totalFights}`);
    console.log(`Total time: ${(runner.stats.totalTime / 1000).toFixed(1)}s`);
    console.log('');

    // Exit code based on pass rate
    const passThreshold = 0.7; // 70% must pass
    if (totalPassed / totalMatchups >= passThreshold) {
      console.log('VALIDATION PASSED');
      process.exit(0);
    } else {
      console.log('VALIDATION FAILED - Below 70% threshold');
      process.exit(1);
    }

  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  }
}

// Run
runValidation();
