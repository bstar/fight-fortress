#!/usr/bin/env node
/**
 * Test script to verify the complete fight integration
 * Tests: Fighter generation, matchmaking, fight execution, result recording
 */

import { Universe } from '../src/universe/models/Universe.js';
import { FighterGenerator } from '../src/universe/generation/FighterGenerator.js';
import { WeekProcessor } from '../src/universe/simulation/WeekProcessor.js';
import { MatchmakingEngine } from '../src/universe/simulation/MatchmakingEngine.js';
import { FightIntegration } from '../src/universe/simulation/FightIntegration.js';

console.log('='.repeat(60));
console.log('FIGHT INTEGRATION TEST');
console.log('='.repeat(60));

// Create universe
console.log('\n1. Creating universe...');
const universe = new Universe({
  name: 'Test Universe',
  currentDate: { year: 2000, week: 1 },
  targetFighterCount: 100,
  fighterCountVariance: 20
});

// Generate fighters
console.log('\n2. Generating 100 fighters...');
const generator = new FighterGenerator();

for (let i = 0; i < 100; i++) {
  const age = 20 + Math.floor(Math.random() * 15);  // 20-34
  const fighter = generator.generate({
    currentDate: universe.currentDate,
    age
  });
  universe.addFighter(fighter);
}

console.log(`   Active fighters: ${universe.getActiveFighters().length}`);

// Show talent distribution
const talents = {};
for (const fighter of universe.fighters.values()) {
  talents[fighter.potential.tier] = (talents[fighter.potential.tier] || 0) + 1;
}
console.log('   Talent distribution:');
for (const [tier, count] of Object.entries(talents)) {
  console.log(`     ${tier}: ${count}`);
}

// Simulate a few weeks to build records and establish rankings
console.log('\n3. Simulating 10 weeks to build records...');
const processor = new WeekProcessor(universe);

let totalFights = 0;
let totalKOs = 0;
let titleFights = 0;

for (let week = 0; week < 10; week++) {
  const events = processor.processWeek();

  const fights = events.filter(e => e.type === 'FIGHT_RESULT');
  const kos = fights.filter(f => f.method === 'KO' || f.method === 'TKO');
  const titles = events.filter(e => e.type === 'TITLE_CHANGE');

  totalFights += fights.length;
  totalKOs += kos.length;
  titleFights += titles.length;

  if (fights.length > 0) {
    console.log(`   Week ${week + 1}: ${fights.length} fights (${kos.length} KOs)`);
  }
}

console.log(`\n   Total: ${totalFights} fights, ${totalKOs} KOs (${Math.round(totalKOs/totalFights*100)}% KO rate)`);

// Check fighter records
console.log('\n4. Checking fighter records...');
const activeFighters = universe.getActiveFighters();
const fightersWithRecords = activeFighters.filter(f =>
  f.career.record.wins > 0 || f.career.record.losses > 0
);

console.log(`   Fighters with fight history: ${fightersWithRecords.length}/${activeFighters.length}`);

// Show some example records
console.log('\n   Sample fighter records:');
const sorted = [...fightersWithRecords].sort((a, b) =>
  (b.career.record.wins - b.career.record.losses) - (a.career.record.wins - a.career.record.losses)
).slice(0, 5);

for (const fighter of sorted) {
  console.log(`     ${fighter.name}: ${fighter.getRecordString()} (${fighter.career.phase})`);
}

// Test matchmaking directly
console.log('\n5. Testing matchmaking engine...');
const matchmaker = new MatchmakingEngine(universe);
const fightCards = matchmaker.generateWeeklyFights();
console.log(`   Generated ${fightCards.length} fight cards for this week`);

if (fightCards.length > 0) {
  console.log('   Fight types:');
  const types = {};
  for (const card of fightCards) {
    types[card.type] = (types[card.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(types)) {
    console.log(`     ${type}: ${count}`);
  }
}

// Test fight integration
console.log('\n6. Testing fight integration...');
const fightIntegration = new FightIntegration(universe);

if (fightCards.length > 0) {
  const testCard = fightCards[0];
  const fighterA = universe.fighters.get(testCard.fighterA);
  const fighterB = universe.fighters.get(testCard.fighterB);

  console.log(`   Running: ${fighterA.name} vs ${fighterB.name}`);
  console.log(`   Type: ${testCard.type}, Rounds: ${testCard.rounds}`);

  const result = fightIntegration.runFightSync(testCard);

  if (!result.cancelled) {
    console.log(`   Result: ${result.winnerName} defeats ${result.loserName} by ${result.method}`);
    if (result.method !== 'Decision') {
      console.log(`   Round: ${result.round}`);
    }
  }
}

// Universe stats
console.log('\n7. Universe stats:');
const summary = universe.getSummary();
console.log(`   Date: ${summary.date}`);
console.log(`   Active fighters: ${summary.activeFighters}`);
console.log(`   Total fights: ${summary.totalFights}`);
console.log(`   KO rate: ${summary.knockoutRate}`);

// Test sanctioning bodies
console.log('\n8. Testing championship system...');
universe.inaugurateChampionships();
const bodies = universe.getAllSanctioningBodies();
console.log(`   Sanctioning bodies created: ${bodies.length}`);

for (const body of bodies) {
  const hwChamp = body.getChampion('Heavyweight');
  if (hwChamp) {
    const champ = universe.fighters.get(hwChamp);
    console.log(`   ${body.shortName} Heavyweight Champion: ${champ?.name || 'Unknown'}`);
  } else {
    console.log(`   ${body.shortName} Heavyweight: VACANT`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));

// Success check based on actual universe stats
const actualFights = universe.stats.totalFightsSimulated;
if (actualFights > 0 && fightersWithRecords.length > 0) {
  console.log('\n SUCCESS: Fight integration is working!');
  console.log(` - ${actualFights} fights simulated`);
  console.log(` - ${fightersWithRecords.length} fighters have records`);
  process.exit(0);
} else {
  console.log('\n WARNING: No fights occurred - check matchmaking');
  console.log(` - Fights in stats: ${actualFights}`);
  console.log(` - Fighters with records: ${fightersWithRecords.length}`);
  process.exit(1);
}
