#!/usr/bin/env node
/**
 * Batch Simulation Script
 * Run many fights and analyze results
 */

import { Fight } from '../src/models/Fight.js';
import { SimulationLoop } from '../src/engine/SimulationLoop.js';
import { FighterAI } from '../src/engine/FighterAI.js';
import { CombatResolver } from '../src/engine/CombatResolver.js';
import { DamageCalculator } from '../src/engine/DamageCalculator.js';
import { StaminaManager } from '../src/engine/StaminaManager.js';
import { PositionTracker } from '../src/engine/PositionTracker.js';
import ConfigLoader from '../src/utils/ConfigLoader.js';

async function runBatchSimulation(fighterAPath, fighterBPath, numFights = 100) {
  console.log(`\n=== BATCH SIMULATION: ${numFights} fights ===\n`);

  // Load fighters and store original paths
  const fighterAConfig = ConfigLoader.loadFighter(fighterAPath);
  const fighterBConfig = ConfigLoader.loadFighter(fighterBPath);
  fighterAConfig._originalPath = fighterAPath;
  fighterBConfig._originalPath = fighterBPath;

  // Convert to imperial
  const kgToLbs = (kg) => Math.round(kg * 2.205);
  const cmToFtIn = (cm) => {
    const inches = Math.round(cm / 2.54);
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  console.log(`Fighter A: ${fighterAConfig.name} (${cmToFtIn(fighterAConfig.physical.height)}, ${kgToLbs(fighterAConfig.physical.weight)} lbs)`);
  console.log(`Fighter B: ${fighterBConfig.name} (${cmToFtIn(fighterBConfig.physical.height)}, ${kgToLbs(fighterBConfig.physical.weight)} lbs)`);
  console.log(`Weight diff: ${kgToLbs(fighterAConfig.physical.weight) - kgToLbs(fighterBConfig.physical.weight)} lbs`);
  console.log('');

  const results = {
    fighterAWins: 0,
    fighterBWins: 0,
    draws: 0,
    fighterAKOs: 0,
    fighterBKOs: 0,
    decisions: 0,
    totalRounds: 0,
    knockdowns: { A: 0, B: 0 },
    totalDamage: { A: 0, B: 0 },
    totalPunches: { A: 0, B: 0 }
  };

  for (let i = 0; i < numFights; i++) {
    const result = await runSingleFight(fighterAPath, fighterBPath, i < 3);

    results.totalRounds += result.rounds;

    if (result.winner === 'A') {
      results.fighterAWins++;
      if (result.method.includes('KO') || result.method.includes('TKO')) {
        results.fighterAKOs++;
      }
    } else if (result.winner === 'B') {
      results.fighterBWins++;
      if (result.method.includes('KO') || result.method.includes('TKO')) {
        results.fighterBKOs++;
      }
    } else {
      results.draws++;
    }

    if (result.method.toUpperCase().includes('DECISION')) {
      results.decisions++;
    }

    results.knockdowns.A += result.knockdownsA || 0;
    results.knockdowns.B += result.knockdownsB || 0;
    results.totalDamage.A += result.damageA || 0;
    results.totalDamage.B += result.damageB || 0;
    results.totalPunches.A += result.punchesA || 0;
    results.totalPunches.B += result.punchesB || 0;

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\rCompleted ${i + 1}/${numFights} fights...`);
    }
  }

  console.log('\n\n=== RESULTS ===\n');
  console.log(`${fighterAConfig.name}: ${results.fighterAWins} wins (${(results.fighterAWins/numFights*100).toFixed(1)}%)`);
  console.log(`  - KO/TKO: ${results.fighterAKOs}`);
  console.log(`  - Decision: ${results.fighterAWins - results.fighterAKOs}`);
  console.log(`  - Knockdowns scored: ${results.knockdowns.B}`);
  console.log('');
  console.log(`${fighterBConfig.name}: ${results.fighterBWins} wins (${(results.fighterBWins/numFights*100).toFixed(1)}%)`);
  console.log(`  - KO/TKO: ${results.fighterBKOs}`);
  console.log(`  - Decision: ${results.fighterBWins - results.fighterBKOs}`);
  console.log(`  - Knockdowns scored: ${results.knockdowns.A}`);
  console.log('');
  console.log(`Draws: ${results.draws}`);
  console.log('');
  console.log(`Average fight length: ${(results.totalRounds / numFights).toFixed(1)} rounds`);
  console.log(`Decision rate: ${(results.decisions/numFights*100).toFixed(1)}%`);
  console.log('');
  console.log(`--- AVERAGES PER FIGHT ---`);
  console.log(`${fighterAConfig.name}: ${(results.totalPunches.A/numFights).toFixed(0)} punches, ${(results.totalDamage.A/numFights).toFixed(0)} damage dealt`);
  console.log(`${fighterBConfig.name}: ${(results.totalPunches.B/numFights).toFixed(0)} punches, ${(results.totalDamage.B/numFights).toFixed(0)} damage dealt`);

  return results;
}

async function runSingleFight(pathA, pathB, debug = false) {
  const fightConfig = {
    rounds: 12,
    roundDuration: 180,
    restDuration: 60
  };

  // Create fresh fighter instances for each fight
  const fighterA = ConfigLoader.loadFighter(pathA);
  const fighterB = ConfigLoader.loadFighter(pathB);

  const fight = new Fight(fighterA, fighterB, fightConfig);

  const simulation = new SimulationLoop(fight, {
    realTime: false,
    enableRenderer: false,
    enableLogging: false
  });

  // Debug: track damage dealt by each fighter
  let damageA = 0, damageB = 0;
  let punchesA = 0, punchesB = 0;

  simulation.on('punchLanded', (event) => {
    if (event.attacker === 'A') {
      damageA += event.damage;
      punchesA++;
    } else {
      damageB += event.damage;
      punchesB++;
    }
  });

  // Set up components
  const fighterAI = new FighterAI();
  const combatResolver = new CombatResolver();
  const damageCalculator = new DamageCalculator();
  const staminaManager = new StaminaManager();
  const positionTracker = new PositionTracker();

  simulation.setComponents({
    fighterAI,
    combatResolver,
    damageCalculator,
    staminaManager,
    positionTracker
  });

  await simulation.runInstant();

  const result = fight.result || {};

  // Debug output for first few fights
  if (debug) {
    console.log(`\n  Fight: ${fight.fighterA.name} vs ${fight.fighterB.name}`);
    console.log(`    Winner: ${result.winner === 'A' ? fight.fighterA.name : fight.fighterB.name} by ${result.method}`);
    console.log(`    Rounds: ${fight.currentRound}`);
    console.log(`    ${fight.fighterA.name}: ${punchesA} punches, ${damageA.toFixed(0)} dmg dealt, ${fight.fighterA.headDamage?.toFixed(0) || '?'} dmg taken`);
    console.log(`      Stamina: ${(fight.fighterA.currentStamina / fight.fighterA.maxStamina * 100).toFixed(0)}%, KDs: ${fight.fighterA?.knockdownsTotal || 0}`);
    console.log(`    ${fight.fighterB.name}: ${punchesB} punches, ${damageB.toFixed(0)} dmg dealt, ${fight.fighterB.headDamage?.toFixed(0) || '?'} dmg taken`);
    console.log(`      Stamina: ${(fight.fighterB.currentStamina / fight.fighterB.maxStamina * 100).toFixed(0)}%, KDs: ${fight.fighterB?.knockdownsTotal || 0}`);

    // Debug stamina costs
    if (staminaManager.debugCounts) {
      for (const [name, counts] of Object.entries(staminaManager.debugCounts)) {
        console.log(`    ${name} stamina: total cost ${counts.totalCost.toFixed(0)}, total recovery ${counts.totalRecovery.toFixed(0)}, net ${(counts.totalRecovery - counts.totalCost).toFixed(0)}`);
      }
    }
  }

  return {
    winner: result.winner,
    method: result.method || 'Unknown',
    rounds: fight.currentRound || 12,
    knockdownsA: fight.fighterA?.knockdownsTotal || 0,
    knockdownsB: fight.fighterB?.knockdownsTotal || 0,
    damageA,
    damageB,
    punchesA,
    punchesB
  };
}

// Get fighter paths from command line
const args = process.argv.slice(2);
const numFights = parseInt(args[2]) || 100;

if (args.length < 2) {
  console.log('Usage: node scripts/batch-sim.js <fighter1.yaml> <fighter2.yaml> [numFights]');
  console.log('Example: node scripts/batch-sim.js fighters/templates/historical/tyson-mike.yaml fighters/custom/martinez-roberto.yaml 100');
  process.exit(1);
}

runBatchSimulation(args[0], args[1], numFights).catch(console.error);
