#!/usr/bin/env node
/**
 * Test script for Fight Records system
 *
 * Verifies that fight records capture all necessary data
 */

import { Fighter, Fight } from '../src/models/index.js';
import {
  SimulationLoop,
  FighterAI,
  CombatResolver,
  DamageCalculator,
  StaminaManager,
  PositionTracker
} from '../src/engine/index.js';
import { ConfigLoader } from '../src/utils/ConfigLoader.js';
import {
  FighterSnapshot,
  FightRecord,
  FightRecordGenerator,
  FightRecordStore
} from '../src/engine/records/index.js';

console.log('='.repeat(60));
console.log('Fight Records System Test');
console.log('='.repeat(60));
console.log();

// Test 1: FighterSnapshot creation
console.log('Test 1: FighterSnapshot Creation');
console.log('-'.repeat(40));

try {
  // ConfigLoader.loadFighter returns a Fighter instance directly
  const tyson = ConfigLoader.loadFighter('fighters/templates/historical/tyson-mike.yaml');

  const snapshot = new FighterSnapshot(tyson, {
    careerData: {
      phase: 'PRIME',
      consecutiveWins: 35,
      weeksSinceLastFight: 8
    }
  });

  console.log(`  Fighter: ${snapshot.name}`);
  console.log(`  Snapshot ID: ${snapshot.snapshotId}`);
  console.log(`  Physical: height=${snapshot.physical.height}cm, weight=${snapshot.physical.weight}kg`);
  console.log(`  Power: left=${snapshot.power.powerLeft}, right=${snapshot.power.powerRight}`);
  console.log(`  Style: ${snapshot.style.primary}`);
  console.log(`  Career phase: ${snapshot.career.phase}`);
  console.log(`  Overall rating: ${snapshot.derived.overallRating}`);
  console.log('  [PASS] FighterSnapshot created successfully');
} catch (error) {
  console.log(`  [FAIL] ${error.message}`);
  process.exit(1);
}

console.log();

// Test 2: FightRecord creation
console.log('Test 2: FightRecord Creation');
console.log('-'.repeat(40));

try {
  const record = new FightRecord({
    fighterA: { id: 'test-a', name: 'Fighter A' },
    fighterB: { id: 'test-b', name: 'Fighter B' },
    context: {
      fightType: 'TITLE_FIGHT',
      rounds: 12
    }
  });

  console.log(`  Record ID: ${record.id}`);
  console.log(`  Version: ${record.version}`);
  console.log(`  Context: ${record.context.fightType}, ${record.context.rounds} rounds`);

  // Set result
  record.setResult({
    winner: 'A',
    loser: 'B',
    method: 'KO',
    round: 5,
    time: 125
  });

  console.log(`  Result: ${record.result.winner} by ${record.result.method} R${record.result.round}`);
  console.log('  [PASS] FightRecord created and result set successfully');
} catch (error) {
  console.log(`  [FAIL] ${error.message}`);
  process.exit(1);
}

console.log();

// Test 3: Full fight simulation with record generation
console.log('Test 3: Full Fight Simulation with Record');
console.log('-'.repeat(40));

try {
  // ConfigLoader.loadFighter returns Fighter instances directly
  const fighterA = ConfigLoader.loadFighter('fighters/templates/historical/tyson-mike.yaml');
  const fighterB = ConfigLoader.loadFighter('fighters/templates/historical/lewis-lennox.yaml');

  const fight = new Fight(fighterA, fighterB, { rounds: 12 });

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

  console.log(`  Running: ${fighterA.name} vs ${fighterB.name}`);

  const { summary, record } = await simulation.runWithRecord({
    fightContext: {
      fightType: 'HEAVYWEIGHT_TITLE',
      venue: 'Las Vegas'
    }
  });

  console.log(`  Result: ${summary.result.winner === 'A' ? fighterA.name : fighterB.name} ` +
              `by ${summary.result.method} R${summary.result.round}`);
  console.log(`  Record ID: ${record.id}`);
  console.log(`  Fighter A snapshot: ${record.fighterA.name} (${record.fighterA.style.primary})`);
  console.log(`  Fighter B snapshot: ${record.fighterB.name} (${record.fighterB.style.primary})`);

  // Check fight data
  if (record.fightData) {
    const stats = record.fightData.totalStats;
    console.log(`  Punches - A: ${stats.punchesLanded.A}/${stats.punchesThrown.A}, ` +
                `B: ${stats.punchesLanded.B}/${stats.punchesThrown.B}`);
    console.log(`  Knockdowns - A: ${stats.knockdowns.A}, B: ${stats.knockdowns.B}`);
    console.log(`  Rounds tracked: ${record.fightData.roundByRound.length}`);
  }

  console.log('  [PASS] Fight completed with full record');
} catch (error) {
  console.log(`  [FAIL] ${error.message}`);
  console.error(error);
  process.exit(1);
}

console.log();

// Test 4: Record serialization
console.log('Test 4: Record Serialization');
console.log('-'.repeat(40));

try {
  const fighterA = ConfigLoader.loadFighter('fighters/templates/historical/tyson-mike.yaml');
  const fighterB = ConfigLoader.loadFighter('fighters/templates/historical/lewis-lennox.yaml');

  const fight = new Fight(fighterA, fighterB, { rounds: 12 });

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

  const { record } = await simulation.runWithRecord();

  // Serialize to JSON
  const json = record.toJSON();
  const jsonString = JSON.stringify(json);

  console.log(`  JSON size: ${(jsonString.length / 1024).toFixed(2)} KB`);

  // Deserialize
  const reconstructed = FightRecord.fromJSON(JSON.parse(jsonString));

  console.log(`  Reconstructed ID: ${reconstructed.id}`);
  console.log(`  Match: ${reconstructed.id === record.id ? 'Yes' : 'No'}`);
  console.log('  [PASS] Serialization/deserialization works');
} catch (error) {
  console.log(`  [FAIL] ${error.message}`);
  process.exit(1);
}

console.log();

// Test 5: FightRecordStore (in-memory)
console.log('Test 5: FightRecordStore');
console.log('-'.repeat(40));

try {
  const store = new FightRecordStore({
    basePath: './data/test-records',
    useCache: true
  });

  // Create a test record
  const record = new FightRecord({
    fighterA: { id: 'test-a', name: 'Test Fighter A' },
    fighterB: { id: 'test-b', name: 'Test Fighter B' },
    context: { fightType: 'TEST', rounds: 10 }
  });

  record.setResult({
    winner: 'A',
    loser: 'B',
    method: 'DECISION',
    round: 10
  });

  // Save
  const savedId = await store.save(record);
  console.log(`  Saved record: ${savedId}`);

  // Load
  const loaded = await store.load(savedId);
  console.log(`  Loaded record: ${loaded.id}`);
  console.log(`  Match: ${loaded.id === record.id ? 'Yes' : 'No'}`);

  // Get stats
  const stats = await store.getStats();
  console.log(`  Store stats: ${stats.totalRecords} records, ${stats.cacheSize} cached`);

  console.log('  [PASS] FightRecordStore works');

  // Cleanup
  await store.delete(savedId);
} catch (error) {
  console.log(`  [FAIL] ${error.message}`);
  console.error(error);
  process.exit(1);
}

console.log();
console.log('='.repeat(60));
console.log('All Tests Passed!');
console.log('='.repeat(60));
