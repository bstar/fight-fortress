#!/usr/bin/env node

/**
 * Batch Test Script
 * Tests multiple fight simulations to verify balance
 */

import { createSimulation } from '../src/index.js';
import { ConfigLoader } from '../src/utils/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function runBatch(fighterAPath, fighterBPath, count = 100) {
  const fighterATemplate = ConfigLoader.loadFighter(fighterAPath);
  const fighterBTemplate = ConfigLoader.loadFighter(fighterBPath);

  const results = {
    aWins: 0,
    bWins: 0,
    draws: 0,
    aKOs: 0,
    bKOs: 0,
    decisions: 0,
    totalKnockdowns: 0,
    totalRounds: 0,
    aStaminaEnd: [],
    bStaminaEnd: []
  };

  for (let i = 0; i < count; i++) {
    // Clone fighters
    const fighterA = JSON.parse(JSON.stringify(fighterATemplate));
    const fighterB = JSON.parse(JSON.stringify(fighterBTemplate));

    const fightConfig = {
      rounds: 12,
      type: 'championship',
      simulation: {
        tickRate: 0.5,
        speedMultiplier: 1.0,
        realTime: false,
        enableRenderer: false,
        enableLogging: false
      }
    };

    const simulation = createSimulation(fighterA, fighterB, fightConfig);

    let knockdowns = 0;
    simulation.on('knockdown', () => knockdowns++);
    simulation.on('flashKnockdown', () => knockdowns++);

    const result = await simulation.runInstant();

    results.totalKnockdowns += knockdowns;
    results.totalRounds += result.result.round || 12;

    // Track stamina at end
    const fA = simulation.fight.fighterA;
    const fB = simulation.fight.fighterB;
    results.aStaminaEnd.push(fA.getStaminaPercent() * 100);
    results.bStaminaEnd.push(fB.getStaminaPercent() * 100);

    const winner = result.result.winner; // 'A', 'B', or null
    const method = result.result.method || '';
    const isKO = method.includes('KO') || method.includes('TKO');

    if (winner === 'A') {
      results.aWins++;
      if (isKO) {
        results.aKOs++;
      } else {
        results.decisions++;
      }
    } else if (winner === 'B') {
      results.bWins++;
      if (isKO) {
        results.bKOs++;
      } else {
        results.decisions++;
      }
    } else {
      results.draws++;
      results.decisions++;
    }
  }

  return {
    fighterA: fighterATemplate.name || fighterATemplate.identity?.name,
    fighterB: fighterBTemplate.name || fighterBTemplate.identity?.name,
    ...results,
    avgKnockdowns: (results.totalKnockdowns / count).toFixed(2),
    avgRounds: (results.totalRounds / count).toFixed(1),
    aAvgStamina: (results.aStaminaEnd.reduce((a,b) => a+b, 0) / count).toFixed(1),
    bAvgStamina: (results.bStaminaEnd.reduce((a,b) => a+b, 0) / count).toFixed(1),
    decisionRate: ((results.decisions / count) * 100).toFixed(1)
  };
}

async function main() {
  const count = 100;
  console.log(`\nRunning ${count} fights for each matchup...\n`);

  const matchups = [
    {
      name: 'Tyson vs Lewis',
      a: join(projectRoot, 'fighters/templates/historical/tyson-mike.yaml'),
      b: join(projectRoot, 'fighters/templates/historical/lewis-lennox.yaml'),
      target: 'Tyson ~40-60'
    },
    {
      name: 'Lewis vs Holyfield',
      a: join(projectRoot, 'fighters/templates/historical/lewis-lennox.yaml'),
      b: join(projectRoot, 'fighters/templates/historical/holyfield-evander.yaml'),
      target: 'Lewis ~55-45'
    },
    {
      name: 'Tyson vs Holyfield',
      a: join(projectRoot, 'fighters/templates/historical/tyson-mike.yaml'),
      b: join(projectRoot, 'fighters/templates/historical/holyfield-evander.yaml'),
      target: 'Holyfield ~55-60'
    }
  ];

  for (const matchup of matchups) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${matchup.name} (Target: ${matchup.target})`);
    console.log('='.repeat(60));

    const result = await runBatch(matchup.a, matchup.b, count);

    console.log(`\n${result.fighterA} vs ${result.fighterB}`);
    console.log(`  Record: ${result.aWins}-${result.bWins}-${result.draws}`);
    console.log(`  KOs: ${result.fighterA}: ${result.aKOs}, ${result.fighterB}: ${result.bKOs}`);
    console.log(`  Decision Rate: ${result.decisionRate}%`);
    console.log(`  Avg Knockdowns/Fight: ${result.avgKnockdowns}`);
    console.log(`  Avg Rounds: ${result.avgRounds}`);
    console.log(`  Avg End Stamina: ${result.fighterA}: ${result.aAvgStamina}%, ${result.fighterB}: ${result.bAvgStamina}%`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('BATCH TEST COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
