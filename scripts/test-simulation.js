#!/usr/bin/env node

/**
 * Test Simulation Script
 * Tests the fight simulation with logging and display
 */

import { createSimulation } from '../src/index.js';
import { ConfigLoader } from '../src/utils/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function runTest() {
  console.log('='.repeat(70));
  console.log('              BOXING SIMULATION TEST');
  console.log('='.repeat(70));
  console.log();

  try {
    // Load fighters
    console.log('Loading fighters...');
    const fighterAPath = join(projectRoot, 'fighters/custom/martinez-roberto.yaml');
    const fighterBPath = join(projectRoot, 'fighters/custom/johnson-james.yaml');

    const fighterA = ConfigLoader.loadFighter(fighterAPath);
    const fighterB = ConfigLoader.loadFighter(fighterBPath);

    console.log(`Fighter A: ${fighterA.name}`);
    console.log(`  Style: ${fighterA.style.primary}`);
    console.log(`  Record: ${fighterA.record?.wins || 0}-${fighterA.record?.losses || 0}-${fighterA.record?.draws || 0}`);
    console.log();
    console.log(`Fighter B: ${fighterB.name}`);
    console.log(`  Style: ${fighterB.style.primary}`);
    console.log(`  Record: ${fighterB.record?.wins || 0}-${fighterB.record?.losses || 0}-${fighterB.record?.draws || 0}`);
    console.log();

    // Configure simulation
    const fightConfig = {
      rounds: 12,
      type: 'championship',
      simulation: {
        tickRate: 0.5,
        speedMultiplier: 1.0,
        realTime: false  // Run instantly for testing
      },
      enableRenderer: true,
      enableLogging: true,
      logDir: join(projectRoot, 'logs')
    };

    console.log('Fight Configuration:');
    console.log(`  Rounds: ${fightConfig.rounds}`);
    console.log(`  Type: ${fightConfig.type}`);
    console.log(`  Mode: Instant simulation (no delays)`);
    console.log();
    console.log('Starting simulation...');
    console.log('='.repeat(70));
    console.log();

    // Create simulation
    const simulation = createSimulation(fighterA, fighterB, fightConfig);

    // Track stats
    let totalPunches = 0;
    let knockdowns = 0;

    simulation.on('punchLanded', () => totalPunches++);
    simulation.on('knockdown', () => knockdowns++);

    // Run instant simulation
    const result = await simulation.runInstant();

    console.log();
    console.log('='.repeat(70));
    console.log('              TEST COMPLETE');
    console.log('='.repeat(70));
    console.log();
    console.log('Summary:');
    console.log(`  Winner: ${result.result.winner ? simulation.fight.getFighter(result.result.winner).name : 'DRAW'}`);
    console.log(`  Method: ${result.result.method}`);
    if (result.result.round) {
      console.log(`  Round: ${result.result.round}`);
    }
    console.log(`  Total Punches Landed: ${totalPunches}`);
    console.log(`  Knockdowns: ${knockdowns}`);
    console.log();

    // Check log files
    const renderer = simulation.renderer;
    if (renderer) {
      const paths = renderer.getLogPaths();
      if (paths) {
        console.log('Log Files Created:');
        console.log(`  Events: ${paths.eventLog}`);
        console.log(`  Commentary: ${paths.commentaryLog}`);
      }
    }

    console.log();
    console.log('Test passed successfully!');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
