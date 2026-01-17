/**
 * Fight Integration Tests
 * Tests to verify that weekly fights use the full SimulationLoop combat engine
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FightIntegration } from '../src/universe/simulation/FightIntegration.js';
import { WeekProcessor } from '../src/universe/simulation/WeekProcessor.js';
import { Universe } from '../src/universe/models/Universe.js';
import { UniverseFighter, TalentTier, CareerPhase } from '../src/universe/models/UniverseFighter.js';
import { FightType } from '../src/universe/simulation/MatchmakingEngine.js';

// Create a test fighter with all required attributes
function createTestFighter(overrides = {}) {
  const fighter = new UniverseFighter({
    // Identity must be nested for Fighter base class
    identity: {
      name: overrides.name || 'Test Fighter',
      nickname: overrides.nickname || 'The Test',
      nationality: 'USA',
      hometown: 'Test City'
    },

    physical: {
      height: overrides.height || 185,
      weight: overrides.weight || 90,
      reach: overrides.reach || 190,
      stance: 'orthodox'
    },

    style: {
      primary: overrides.style || 'boxer-puncher',
      defensive: 'high-guard',
      offensive: 'combo-puncher'
    },

    power: {
      powerLeft: overrides.powerLeft || 75,
      powerRight: overrides.powerRight || 80,
      knockoutPower: overrides.knockoutPower || 78
    },

    speed: {
      handSpeed: overrides.handSpeed || 75,
      footSpeed: overrides.footSpeed || 72,
      reflexes: overrides.reflexes || 73
    },

    stamina: {
      cardio: 80,
      recoveryRate: 75,
      workRate: 78
    },

    defense: {
      headMovement: 70,
      blocking: 75,
      parrying: 68,
      ringCutoff: 65
    },

    offense: {
      jabAccuracy: 72,
      powerAccuracy: 70,
      hookAccuracy: 68,
      uppercutAccuracy: 65
    },

    technical: {
      footwork: 70,
      distanceManagement: 72,
      ringGeneralship: 68,
      fightIQ: 75,
      adaptability: 70
    },

    mental: {
      chin: overrides.chin || 80,
      heart: 85,
      killerInstinct: 75,
      composure: 72,
      confidence: 78
    },

    record: overrides.record || { wins: 20, losses: 2, draws: 0, kos: 15 }
  }, {
    // Universe data (second parameter)
    birthDate: { year: 1990, week: 1 },
    phase: overrides.phase || CareerPhase.CONTENDER,
    potential: {
      tier: overrides.tier || TalentTier.ELITE,
      ceiling: 90,
      growthRate: 1.0,
      peakAgePhysical: 28,
      peakAgeMental: 32
    }
  });

  return fighter;
}

// Create minimal universe for testing
function createTestUniverse() {
  const universe = new Universe({
    name: 'Test Universe',
    currentDate: { year: 2000, week: 1 },
    era: 'PPV_ERA'
  });

  return universe;
}

describe('FightIntegration - Full Combat Engine', () => {
  let universe;
  let fightIntegration;
  let fighterA;
  let fighterB;

  beforeEach(() => {
    universe = createTestUniverse();
    fightIntegration = new FightIntegration(universe);

    fighterA = createTestFighter({
      name: 'Fighter A',
      nickname: 'The Champ',
      knockoutPower: 85,
      chin: 82
    });

    fighterB = createTestFighter({
      name: 'Fighter B',
      nickname: 'The Challenger',
      knockoutPower: 75,
      chin: 78
    });

    universe.addFighter(fighterA);
    universe.addFighter(fighterB);
  });

  it('runFight should return detailed fight statistics', async () => {
    const fightCard = {
      fighterA: fighterA.id,
      fighterB: fighterB.id,
      division: 'Heavyweight',
      type: FightType.MAIN_EVENT,
      rounds: 10
    };

    const result = await fightIntegration.runFight(fightCard);

    // Verify basic result structure
    assert.ok(result, 'Result should exist');
    assert.ok(!result.cancelled, 'Fight should not be cancelled');
    assert.ok(result.winner, 'Should have a winner');
    assert.ok(result.method, 'Should have a method');
    assert.ok(result.round, 'Should have a round number');

    // Verify stats exist (these come from full simulation)
    assert.ok(result.stats, 'Should have stats');
    assert.ok(result.stats.fighterA, 'Should have fighterA stats');
    assert.ok(result.stats.fighterB, 'Should have fighterB stats');

    // Verify punch statistics (only available from full simulation)
    assert.ok(typeof result.stats.fighterA.punchesThrown === 'number', 'Should have punchesThrown for A');
    assert.ok(typeof result.stats.fighterA.punchesLanded === 'number', 'Should have punchesLanded for A');
    assert.ok(typeof result.stats.fighterB.punchesThrown === 'number', 'Should have punchesThrown for B');
    assert.ok(typeof result.stats.fighterB.punchesLanded === 'number', 'Should have punchesLanded for B');
  });

  it('runFight should produce valid fight methods', async () => {
    const fightCard = {
      fighterA: fighterA.id,
      fighterB: fighterB.id,
      division: 'Heavyweight',
      type: FightType.MAIN_EVENT,
      rounds: 10
    };

    const result = await fightIntegration.runFight(fightCard);

    const validMethods = ['KO', 'TKO', 'Decision', 'UD', 'SD', 'MD', 'TD'];
    assert.ok(
      validMethods.some(m => result.method.includes(m) || m.includes(result.method)),
      `Method "${result.method}" should be a valid fight outcome`
    );
  });

  it('runFight should respect round limits', async () => {
    const fightCard = {
      fighterA: fighterA.id,
      fighterB: fighterB.id,
      division: 'Heavyweight',
      type: FightType.MAIN_EVENT,
      rounds: 12
    };

    const result = await fightIntegration.runFight(fightCard);

    assert.ok(result.round >= 1, 'Round should be at least 1');
    assert.ok(result.round <= 12, 'Round should not exceed scheduled rounds');
  });

  it('runFightsBatch should use full combat engine for all fights', async () => {
    // Create more fighters
    const fighterC = createTestFighter({ name: 'Fighter C' });
    const fighterD = createTestFighter({ name: 'Fighter D' });
    universe.addFighter(fighterC);
    universe.addFighter(fighterD);

    const fightCards = [
      {
        fighterA: fighterA.id,
        fighterB: fighterB.id,
        division: 'Heavyweight',
        type: FightType.MAIN_EVENT,
        rounds: 10
      },
      {
        fighterA: fighterC.id,
        fighterB: fighterD.id,
        division: 'Heavyweight',
        type: FightType.CO_MAIN,
        rounds: 8
      }
    ];

    const results = await fightIntegration.runFightsBatch(fightCards);

    assert.strictEqual(results.length, 2, 'Should have 2 results');

    // Both fights should have detailed stats
    for (const result of results) {
      assert.ok(result.stats, 'Each result should have stats');
      assert.ok(typeof result.stats.fighterA.punchesThrown === 'number',
        'Each fight should have punch statistics');
    }
  });

  it('runFightsBatchParallel should also use full combat engine', async () => {
    const fighterC = createTestFighter({ name: 'Fighter C' });
    const fighterD = createTestFighter({ name: 'Fighter D' });
    universe.addFighter(fighterC);
    universe.addFighter(fighterD);

    const fightCards = [
      {
        fighterA: fighterA.id,
        fighterB: fighterB.id,
        division: 'Heavyweight',
        type: FightType.MAIN_EVENT,
        rounds: 10
      },
      {
        fighterA: fighterC.id,
        fighterB: fighterD.id,
        division: 'Heavyweight',
        type: FightType.CO_MAIN,
        rounds: 8
      }
    ];

    const results = await fightIntegration.runFightsBatchParallel(fightCards);

    assert.strictEqual(results.length, 2, 'Should have 2 results');

    // Both fights should have detailed stats
    for (const result of results) {
      assert.ok(result.stats, 'Each result should have stats');
      assert.ok(typeof result.stats.fighterA.punchesThrown === 'number',
        'Parallel fights should also have punch statistics');
    }
  });

  it('fighter records should update after fight', async () => {
    const initialWinsA = fighterA.career.record.wins;
    const initialLossesA = fighterA.career.record.losses;
    const initialWinsB = fighterB.career.record.wins;
    const initialLossesB = fighterB.career.record.losses;

    const fightCard = {
      fighterA: fighterA.id,
      fighterB: fighterB.id,
      division: 'Heavyweight',
      type: FightType.MAIN_EVENT,
      rounds: 10
    };

    const result = await fightIntegration.runFight(fightCard);

    // Verify one fighter got a win and one got a loss
    const totalWins = fighterA.career.record.wins + fighterB.career.record.wins;
    const totalLosses = fighterA.career.record.losses + fighterB.career.record.losses;

    assert.strictEqual(
      totalWins,
      initialWinsA + initialWinsB + 1,
      'Total wins should increase by 1'
    );
    assert.strictEqual(
      totalLosses,
      initialLossesA + initialLossesB + 1,
      'Total losses should increase by 1'
    );
  });
});

describe('WeekProcessor - Async Integration', () => {
  it('processWeek should return a promise', async () => {
    const universe = createTestUniverse();
    const processor = new WeekProcessor(universe);

    const result = processor.processWeek();

    assert.ok(result instanceof Promise, 'processWeek should return a Promise');

    const events = await result;
    assert.ok(Array.isArray(events), 'Resolved value should be an array of events');
  });
});

console.log('============================================================');
console.log('FIGHT INTEGRATION TEST SUITE');
console.log('============================================================');
