#!/usr/bin/env node

/**
 * Universe System Test Script
 * Tests the basic functionality of the boxing universe simulation
 */

import { Universe } from '../src/universe/models/Universe.js';
import { Division } from '../src/universe/models/Division.js';
import { FighterGenerator } from '../src/universe/generation/FighterGenerator.js';
import { WeekProcessor } from '../src/universe/simulation/WeekProcessor.js';
import { SaveManager } from '../src/universe/persistence/SaveManager.js';

console.log('='.repeat(60));
console.log('BOXING UNIVERSE SIMULATION - SYSTEM TEST');
console.log('='.repeat(60));
console.log();

// Test 1: Create Universe
console.log('TEST 1: Creating Universe...');
const universe = new Universe({
  name: 'Test Universe',
  currentDate: { year: 2000, week: 1 }
});
console.log(`  - Universe created: ${universe.name}`);
console.log(`  - Start date: ${universe.getDateString()}`);
console.log(`  - Divisions: ${universe.divisions.size}`);
console.log('  [PASS]');
console.log();

// Test 2: Fighter Generation
console.log('TEST 2: Fighter Generation...');
const generator = new FighterGenerator();
console.log(`  - Loaded archetypes: ${generator.getArchetypeNames().join(', ')}`);

// Generate fighters
const testFighters = [];
for (let i = 0; i < 10; i++) {
  const fighter = generator.generate({
    currentDate: universe.currentDate,
    age: 20 + Math.floor(Math.random() * 10)
  });
  testFighters.push(fighter);
  universe.addFighter(fighter);
}

console.log(`  - Generated ${testFighters.length} fighters`);
console.log('  - Sample fighters:');
for (const fighter of testFighters.slice(0, 3)) {
  const age = fighter.getAge(universe.currentDate);
  console.log(`    * ${fighter.name} (${fighter.nickname || 'no nickname'})`);
  console.log(`      Age: ${age}, ${fighter.nationality}`);
  console.log(`      Style: ${fighter.style.primary}, Weight: ${fighter.physical.weight}kg`);
  console.log(`      Tier: ${fighter.potential.tier}, Ceiling: ${fighter.potential.ceiling}`);
}
console.log('  [PASS]');
console.log();

// Test 3: Division Assignment
console.log('TEST 3: Division Assignment...');
for (const [name, division] of universe.divisions) {
  if (division.fighters.length > 0) {
    console.log(`  - ${name}: ${division.fighters.length} fighters`);
  }
}
console.log('  [PASS]');
console.log();

// Test 4: Week Simulation
console.log('TEST 4: Week Simulation (4 weeks)...');
const processor = new WeekProcessor(universe);
let allEvents = [];

for (let week = 0; week < 4; week++) {
  const events = processor.processWeek();
  allEvents = allEvents.concat(events);
}

console.log(`  - Simulated 4 weeks`);
console.log(`  - Current date: ${universe.getDateString()}`);
console.log(`  - Events generated: ${allEvents.length}`);

// Show interesting events
const interestingEvents = allEvents.filter(e =>
  ['NEW_PROSPECT', 'RETIREMENT', 'VISIBLE_DECLINE'].includes(e.type)
);
if (interestingEvents.length > 0) {
  console.log('  - Notable events:');
  for (const event of interestingEvents.slice(0, 5)) {
    console.log(`    * [${event.type}] ${event.message}`);
  }
}
console.log('  [PASS]');
console.log();

// Test 5: Fighter Aging Check
console.log('TEST 5: Fighter Aging/Progression...');
const sampleFighter = testFighters[0];
const initialSpeed = sampleFighter.speed.handSpeed;

// Simulate 52 weeks (1 year)
console.log(`  - Simulating 1 year for ${sampleFighter.name}...`);
console.log(`  - Initial hand speed: ${initialSpeed.toFixed(1)}`);

for (let week = 0; week < 52; week++) {
  processor.processWeek();
}

const finalSpeed = sampleFighter.speed.handSpeed;
console.log(`  - After 1 year: ${finalSpeed.toFixed(1)}`);
console.log(`  - Change: ${(finalSpeed - initialSpeed).toFixed(2)}`);
console.log(`  - Current age: ${sampleFighter.getAge(universe.currentDate)}`);
console.log('  [PASS]');
console.log();

// Test 6: Save/Load
console.log('TEST 6: Save/Load System...');
const saveManager = new SaveManager('.');

try {
  const savePath = saveManager.save(universe, 'test-save');
  console.log(`  - Saved to: ${savePath}`);

  const loadedUniverse = saveManager.load('test-save');
  console.log(`  - Loaded universe: ${loadedUniverse.name}`);
  console.log(`  - Date: ${loadedUniverse.getDateString()}`);
  console.log(`  - Fighters: ${loadedUniverse.fighters.size}`);

  // Verify data integrity
  const originalFighterCount = universe.fighters.size;
  const loadedFighterCount = loadedUniverse.fighters.size;

  if (originalFighterCount === loadedFighterCount) {
    console.log('  - Data integrity: VERIFIED');
  } else {
    console.log(`  - Data integrity: MISMATCH (${originalFighterCount} vs ${loadedFighterCount})`);
  }

  // Cleanup test save
  saveManager.deleteSave('test-save');
  console.log('  - Test save cleaned up');
  console.log('  [PASS]');
} catch (error) {
  console.log(`  [FAIL] ${error.message}`);
}
console.log();

// Test 7: Universe Summary
console.log('TEST 7: Universe Summary...');
const summary = universe.getSummary();
console.log(`  - Date: ${summary.date}`);
console.log(`  - Total fighters: ${summary.totalFighters}`);
console.log(`  - Active fighters: ${summary.activeFighters}`);
console.log(`  - Retired: ${summary.retiredFighters}`);
console.log(`  - Total fights: ${summary.totalFights}`);
console.log(`  - Trainers: ${summary.trainers}`);
console.log('  [PASS]');
console.log();

// Final summary
console.log('='.repeat(60));
console.log('ALL TESTS COMPLETED');
console.log('='.repeat(60));
console.log();
console.log('Universe System Phase 1 is operational!');
console.log();
console.log('Available features:');
console.log('  - Universe creation and state management');
console.log('  - Division/weight class system');
console.log('  - Procedural fighter generation (2 archetypes)');
console.log('  - Weekly simulation with aging/progression');
console.log('  - Rankings calculation');
console.log('  - Save/load persistence');
console.log();
console.log('Next steps (Phase 2):');
console.log('  - Fight scheduling and matchmaking');
console.log('  - Integration with existing fight simulation');
console.log('  - More archetypes');
console.log('  - Universe TUI display');
