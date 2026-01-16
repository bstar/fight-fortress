/**
 * Manager System Tests
 * Tests for manager mentalities, career damage, fight frequency, and opposition quality
 */

import { Manager, ManagerMentality, FightFrequency } from '../src/universe/models/Manager.js';
import { CareerDamage } from '../src/universe/models/CareerDamage.js';
import { MarketValue } from '../src/universe/economics/MarketValue.js';

// Mock fighter for testing
function createMockFighter(overrides = {}) {
  return {
    id: overrides.id || 'fighter-1',
    name: overrides.name || 'Test Fighter',
    physical: {
      weight: overrides.weight || 200,
      height: overrides.height || 185,
      reach: overrides.reach || 190,
      ...overrides.physical
    },
    career: {
      record: { wins: 30, losses: 2, draws: 0, kos: 20, koLosses: 1, ...(overrides.record || {}) },
      popularity: overrides.popularity || 70,
      consecutiveWins: overrides.consecutiveWins || 5,
      consecutiveLosses: overrides.consecutiveLosses || 0,
      titles: overrides.titles || [],
      phase: overrides.phase || 'CONTENDER',
      weeksInactive: overrides.weeksInactive || 8,
      fightsThisYear: overrides.fightsThisYear || 2,
      ...overrides.career
    },
    potential: {
      tier: overrides.tier || 'CONTENDER',
      ceiling: overrides.ceiling || 80,
      ...overrides.potential
    },
    mental: {
      chin: overrides.chin || 80,
      heart: 85,
      ...overrides.mental
    },
    power: {
      knockoutPower: overrides.knockoutPower || 75,
      powerRight: 80,
      powerLeft: 70,
      ...overrides.power
    },
    style: {
      primary: overrides.style || 'boxer-puncher',
      ...overrides.styleObj
    },
    relationships: {
      manager: overrides.managerId || null,
      ...overrides.relationships
    },
    careerDamage: overrides.careerDamage || null,
    getKOPercentage: () => overrides.koPercentage || 60,
    getWinPercentage: () => overrides.winPercentage || 90,
    getAge: () => overrides.age || 28,
    canFight: () => overrides.canFight !== undefined ? overrides.canFight : true,
    ...overrides
  };
}

// Mock universe for testing
function createMockUniverse(overrides = {}) {
  return {
    currentDate: { year: 2020, week: 1 },
    managers: new Map(),
    ...overrides
  };
}

// Test utilities
function describe(name, fn) {
  console.log(`\n${'='.repeat(60)}\n${name}\n${'='.repeat(60)}`);
  fn();
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${error.message}`);
    process.exitCode = 1;
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(value > expected)) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(value < expected)) {
        throw new Error(`Expected ${value} to be less than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(value >= expected)) {
        throw new Error(`Expected ${value} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(value <= expected)) {
        throw new Error(`Expected ${value} to be <= ${expected}`);
      }
    },
    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected ${value} to be truthy`);
      }
    },
    toBeFalsy() {
      if (value) {
        throw new Error(`Expected ${value} to be falsy`);
      }
    }
  };
}

// ============================================================================
// MANAGER MENTALITY TESTS
// ============================================================================

describe('Manager Mentality Selection', () => {
  test('GENERATIONAL tier gets PROTECTIVE mentality', () => {
    const manager = new Manager();
    const fighter = createMockFighter({ tier: 'GENERATIONAL', record: { wins: 15, losses: 0 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.PROTECTIVE);
  });

  test('ELITE tier with 0-1 losses gets PROTECTIVE', () => {
    const manager = new Manager();
    const fighter = createMockFighter({ tier: 'ELITE', record: { wins: 20, losses: 1 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.PROTECTIVE);
  });

  test('ELITE tier with 2+ losses gets DEVELOPMENT', () => {
    const manager = new Manager();
    const fighter = createMockFighter({ tier: 'ELITE', record: { wins: 20, losses: 3 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.DEVELOPMENT);
  });

  test('Undefeated fighter with 10+ wins gets PROTECTIVE regardless of tier', () => {
    const manager = new Manager();
    const fighter = createMockFighter({
      tier: 'CONTENDER',
      record: { wins: 12, losses: 0 }
    });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.PROTECTIVE);
  });

  test('GATEKEEPER with winning record gets DEVELOPMENT (protects record)', () => {
    const manager = new Manager();
    // 71% win rate - valuable record to protect
    const fighter = createMockFighter({ tier: 'GATEKEEPER', record: { wins: 25, losses: 10 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.DEVELOPMENT);
  });

  test('GATEKEEPER with losing record gets AGGRESSIVE', () => {
    const manager = new Manager();
    // Below 50% win rate - needs activity to earn
    const fighter = createMockFighter({ tier: 'GATEKEEPER', record: { wins: 10, losses: 15 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.AGGRESSIVE);
  });

  test('JOURNEYMAN tier with losing record gets AGGRESSIVE', () => {
    const manager = new Manager({ personality: { ethics: 70 } });
    const fighter = createMockFighter({ tier: 'JOURNEYMAN', record: { wins: 10, losses: 15 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.AGGRESSIVE);
  });

  test('JOURNEYMAN with decent record gets OPPORTUNISTIC (respects record)', () => {
    const manager = new Manager({ personality: { ethics: 30 } });
    // 50% win rate with 20+ fights - worth protecting somewhat
    const fighter = createMockFighter({ tier: 'JOURNEYMAN', record: { wins: 12, losses: 12 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.OPPORTUNISTIC);
  });

  test('CLUB tier with unethical manager gets EXPLOITATIVE', () => {
    const manager = new Manager({ personality: { ethics: 40 } });
    const fighter = createMockFighter({ tier: 'CLUB', record: { wins: 5, losses: 20 } });

    const mentality = manager.getMentalityForFighter(fighter);
    expect(mentality).toBe(ManagerMentality.EXPLOITATIVE);
  });
});

// ============================================================================
// FIGHT FREQUENCY TESTS
// ============================================================================

describe('Fight Frequency by Mentality', () => {
  test('PROTECTIVE mentality has 8+ weeks minimum between fights', () => {
    expect(FightFrequency.PROTECTIVE.minWeeks).toBeGreaterThanOrEqual(8);
    expect(FightFrequency.PROTECTIVE.maxFightsPerYear).toBeLessThanOrEqual(5);
  });

  test('DEVELOPMENT mentality has 6+ weeks minimum', () => {
    expect(FightFrequency.DEVELOPMENT.minWeeks).toBeGreaterThanOrEqual(6);
    expect(FightFrequency.DEVELOPMENT.maxFightsPerYear).toBeLessThanOrEqual(8);
  });

  test('AGGRESSIVE mentality has 3-4 weeks minimum', () => {
    expect(FightFrequency.AGGRESSIVE.minWeeks).toBeLessThanOrEqual(4);
    expect(FightFrequency.AGGRESSIVE.maxFightsPerYear).toBeGreaterThanOrEqual(12);
  });

  test('EXPLOITATIVE mentality has 2-3 weeks minimum', () => {
    expect(FightFrequency.EXPLOITATIVE.minWeeks).toBeLessThanOrEqual(3);
    expect(FightFrequency.EXPLOITATIVE.maxFightsPerYear).toBeGreaterThanOrEqual(15);
  });

  test('Manager getFightFrequency returns correct frequency for fighter', () => {
    const manager = new Manager();

    const prospect = createMockFighter({ tier: 'ELITE', record: { wins: 10, losses: 0 } });
    const prospectFreq = manager.getFightFrequency(prospect);
    expect(prospectFreq.minWeeks).toBeGreaterThanOrEqual(8);

    const journeyman = createMockFighter({ tier: 'JOURNEYMAN', record: { wins: 10, losses: 15 } });
    const journeymanFreq = manager.getFightFrequency(journeyman);
    expect(journeymanFreq.minWeeks).toBeLessThanOrEqual(4);
  });
});

// ============================================================================
// FIGHT EVALUATION TESTS
// ============================================================================

describe('Manager Fight Evaluation', () => {
  test('PROTECTIVE manager rejects dangerous opponents', () => {
    const manager = new Manager();
    const prospect = createMockFighter({
      tier: 'ELITE',
      record: { wins: 15, losses: 0 },
      chin: 75
    });
    const dangerousOpponent = createMockFighter({
      tier: 'ELITE',
      knockoutPower: 95,
      record: { wins: 20, losses: 2 }
    });
    const universe = createMockUniverse();

    const evaluation = manager.evaluateFight(prospect, dangerousOpponent, 'MAIN_EVENT', universe);
    expect(evaluation.accept).toBeFalsy();
  });

  test('PROTECTIVE manager accepts title fights with good odds', () => {
    const manager = new Manager();
    const champion = createMockFighter({
      tier: 'ELITE',
      record: { wins: 20, losses: 0 },
      titles: [{ title: 'WBC', lostDate: null }]
    });
    const weakerChallenger = createMockFighter({
      tier: 'CONTENDER',
      record: { wins: 15, losses: 3 }
    });
    const universe = createMockUniverse();

    const evaluation = manager.evaluateFight(champion, weakerChallenger, 'TITLE_FIGHT', universe);
    expect(evaluation.accept).toBeTruthy();
  });

  test('AGGRESSIVE manager accepts most fights', () => {
    const manager = new Manager({ personality: { ethics: 70 } });
    const journeyman = createMockFighter({
      tier: 'GATEKEEPER',
      record: { wins: 20, losses: 8 }
    });
    const prospect = createMockFighter({
      tier: 'CONTENDER',
      record: { wins: 12, losses: 1 }
    });
    const universe = createMockUniverse();

    const evaluation = manager.evaluateFight(journeyman, prospect, 'UNDERCARD', universe);
    expect(evaluation.accept).toBeTruthy();
  });

  test('EXPLOITATIVE manager accepts any paid fight', () => {
    const manager = new Manager({ personality: { ethics: 30 } });
    const tomatoCan = createMockFighter({
      tier: 'CLUB',
      record: { wins: 5, losses: 25 }
    });
    const dangerousOpponent = createMockFighter({
      tier: 'ELITE',
      knockoutPower: 90,
      record: { wins: 25, losses: 0 }
    });
    const universe = createMockUniverse();

    const evaluation = manager.evaluateFight(tomatoCan, dangerousOpponent, 'UNDERCARD', universe);
    expect(evaluation.accept).toBeTruthy();
  });

  test('EXPLOITATIVE manager rejects if fighter has severe damage', () => {
    const manager = new Manager({ personality: { ethics: 30 } });
    const damagedFighter = createMockFighter({
      tier: 'CLUB',
      record: { wins: 5, losses: 25 },
      careerDamage: new CareerDamage({ totalAbuse: 90, koLosses: 6 })
    });
    const opponent = createMockFighter({
      tier: 'CONTENDER',
      record: { wins: 15, losses: 2 }
    });
    const universe = createMockUniverse();

    const evaluation = manager.evaluateFight(damagedFighter, opponent, 'CLUB', universe);
    expect(evaluation.accept).toBeFalsy();
  });
});

// ============================================================================
// CAREER DAMAGE TESTS
// ============================================================================

describe('Career Damage System', () => {
  test('KO loss increases damage significantly', () => {
    const damage = new CareerDamage();
    const initialAbuse = damage.totalAbuse;

    damage.recordFightDamage({
      result: 'L',
      method: 'KO',
      wasKnockedOut: true,
      rounds: 5,
      knockdowns: 1
    });

    expect(damage.totalAbuse).toBeGreaterThan(initialAbuse + 5);
    expect(damage.koLosses).toBe(1);
    expect(damage.chinDegradation).toBeGreaterThan(0);
  });

  test('TKO loss increases damage moderately', () => {
    const damage = new CareerDamage();

    damage.recordFightDamage({
      result: 'L',
      method: 'TKO',
      wasKnockedOut: false,
      rounds: 8,
      knockdowns: 2
    });

    expect(damage.tkoLosses).toBe(1);
    expect(damage.chinDegradation).toBeGreaterThan(0);
  });

  test('Multiple knockdowns accumulate damage', () => {
    const damage = new CareerDamage();

    damage.recordFightDamage({
      result: 'W',
      method: 'Decision',
      rounds: 12,
      knockdowns: 3
    });

    expect(damage.knockdownsReceived).toBe(3);
    expect(damage.totalAbuse).toBeGreaterThan(5);
  });

  test('War fights add extra damage', () => {
    const normalDamage = new CareerDamage();
    const warDamage = new CareerDamage();

    normalDamage.recordFightDamage({
      result: 'W',
      method: 'Decision',
      rounds: 12,
      wasWar: false
    });

    warDamage.recordFightDamage({
      result: 'W',
      method: 'Decision',
      rounds: 12,
      wasWar: true
    });

    expect(warDamage.totalAbuse).toBeGreaterThan(normalDamage.totalAbuse);
    expect(warDamage.warFights).toBe(1);
  });

  test('Attribute penalties are calculated correctly', () => {
    const damage = new CareerDamage({
      chinDegradation: 5,
      reflexDegradation: 3,
      speedDegradation: 2
    });

    const penalties = damage.getAttributePenalties();

    expect(penalties.chin).toBe(-5);
    expect(penalties.reflexes).toBe(-3);
    expect(penalties.handSpeed).toBe(-2);
    expect(penalties.footSpeed).toBe(-1);
  });

  test('shouldRetireDueToDamage returns true for severe damage', () => {
    const severeDamage = new CareerDamage({ koLosses: 5 });
    const result = severeDamage.shouldRetireDueToDamage();
    expect(result.retire).toBeTruthy();
  });

  test('shouldRetireDueToDamage returns warning for moderate damage', () => {
    const moderateDamage = new CareerDamage({ koLosses: 3 });
    const result = moderateDamage.shouldRetireDueToDamage();
    expect(result.retire).toBeFalsy();
    expect(result.warning).toBeTruthy();
  });

  test('shouldRetireDueToDamage returns false for minimal damage', () => {
    const minimalDamage = new CareerDamage({ totalAbuse: 20 });
    const result = minimalDamage.shouldRetireDueToDamage();
    expect(result.retire).toBeFalsy();
    expect(result.warning).toBeFalsy();
  });

  test('Damage level descriptions are correct', () => {
    expect(new CareerDamage({ totalAbuse: 10 }).getDamageLevel()).toBe('MINIMAL');
    expect(new CareerDamage({ totalAbuse: 30 }).getDamageLevel()).toBe('LIGHT');
    expect(new CareerDamage({ totalAbuse: 50 }).getDamageLevel()).toBe('MODERATE');
    expect(new CareerDamage({ totalAbuse: 70 }).getDamageLevel()).toBe('HEAVY');
    expect(new CareerDamage({ totalAbuse: 90 }).getDamageLevel()).toBe('SEVERE');
  });
});

// ============================================================================
// MARKET VALUE UNDEFEATED BONUS TESTS
// ============================================================================

describe('Market Value - Undefeated Bonuses', () => {
  test('Undefeated fighter with 20+ wins gets 2.5x bonus', () => {
    const undefeated = createMockFighter({
      tier: 'ELITE',
      popularity: 70,
      record: { wins: 22, losses: 0, draws: 0, kos: 15 }
    });
    const defeatedSame = createMockFighter({
      tier: 'ELITE',
      popularity: 70,
      record: { wins: 22, losses: 5, draws: 0, kos: 15 }
    });

    const undefeatedValue = MarketValue.calculate(undefeated);
    const defeatedValue = MarketValue.calculate(defeatedSame);

    // Undefeated should be worth significantly more
    expect(undefeatedValue).toBeGreaterThan(defeatedValue * 2);
  });

  test('Undefeated fighter with 10-14 wins gets 1.7x bonus', () => {
    const undefeated = createMockFighter({
      tier: 'CONTENDER',
      popularity: 60,
      record: { wins: 12, losses: 0, draws: 0, kos: 8 }
    });
    const defeated = createMockFighter({
      tier: 'CONTENDER',
      popularity: 60,
      record: { wins: 12, losses: 3, draws: 0, kos: 8 }
    });

    const undefeatedValue = MarketValue.calculate(undefeated);
    const defeatedValue = MarketValue.calculate(defeated);

    expect(undefeatedValue).toBeGreaterThan(defeatedValue * 1.5);
  });

  test('Single loss fighter with 15+ wins gets 1.4x bonus', () => {
    const singleLoss = createMockFighter({
      tier: 'ELITE',
      popularity: 70,
      record: { wins: 18, losses: 1, draws: 0, kos: 12 }
    });
    const multipleLosses = createMockFighter({
      tier: 'ELITE',
      popularity: 70,
      record: { wins: 18, losses: 5, draws: 0, kos: 12 }
    });

    const singleLossValue = MarketValue.calculate(singleLoss);
    const multipleLossesValue = MarketValue.calculate(multipleLosses);

    expect(singleLossValue).toBeGreaterThan(multipleLossesValue * 1.2);
  });
});

// ============================================================================
// MANAGER READINESS TESTS
// ============================================================================

describe('Manager Fighter Readiness', () => {
  test('Fighter not ready if too few weeks since last fight (PROTECTIVE)', () => {
    const manager = new Manager();
    const prospect = createMockFighter({
      tier: 'ELITE',
      record: { wins: 15, losses: 0 },
      weeksInactive: 4 // Less than 8 weeks for PROTECTIVE
    });

    expect(manager.isReadyToFight(prospect)).toBeFalsy();
  });

  test('Fighter ready if enough weeks since last fight (PROTECTIVE)', () => {
    const manager = new Manager();
    const prospect = createMockFighter({
      tier: 'ELITE',
      record: { wins: 15, losses: 0 },
      weeksInactive: 10
    });

    expect(manager.isReadyToFight(prospect)).toBeTruthy();
  });

  test('Tomato can can fight after just 2 weeks (EXPLOITATIVE)', () => {
    const manager = new Manager({ personality: { ethics: 30 } });
    const tomatoCan = createMockFighter({
      tier: 'CLUB',
      record: { wins: 5, losses: 20 },
      weeksInactive: 3
    });

    expect(manager.isReadyToFight(tomatoCan)).toBeTruthy();
  });

  test('Fighter not ready if max fights per year reached', () => {
    const manager = new Manager();
    const prospect = createMockFighter({
      tier: 'ELITE',
      record: { wins: 15, losses: 0 },
      weeksInactive: 12,
      fightsThisYear: 6 // More than 5 for PROTECTIVE
    });

    expect(manager.isReadyToFight(prospect)).toBeFalsy();
  });

  test('Fighter not ready if career damage requires retirement', () => {
    const manager = new Manager();
    const damaged = createMockFighter({
      tier: 'GATEKEEPER',
      record: { wins: 20, losses: 10 },
      weeksInactive: 8,
      careerDamage: new CareerDamage({ koLosses: 6, totalAbuse: 90 })
    });

    expect(manager.isReadyToFight(damaged)).toBeFalsy();
  });
});

// ============================================================================
// MANAGER SERIALIZATION TESTS
// ============================================================================

describe('Manager Serialization', () => {
  test('toJSON and fromJSON preserve all properties', () => {
    const original = new Manager({
      name: 'Don King',
      fighters: ['fighter-1', 'fighter-2'],
      skills: { negotiation: 85, matchmaking: 70, development: 60, networking: 90 },
      personality: { greed: 80, patience: 30, ambition: 95, ethics: 25 },
      cut: 0.20,
      earnings: 5000000
    });
    original.stats.championsManaged = 3;
    original.stats.fightsNegotiated = 150;

    const json = original.toJSON();
    const restored = Manager.fromJSON(json);

    expect(restored.name).toBe('Don King');
    expect(restored.fighters.length).toBe(2);
    expect(restored.skills.negotiation).toBe(85);
    expect(restored.personality.greed).toBe(80);
    expect(restored.cut).toBe(0.20);
    expect(restored.earnings).toBe(5000000);
    expect(restored.stats.championsManaged).toBe(3);
    expect(restored.stats.fightsNegotiated).toBe(150);
  });
});

// ============================================================================
// CAREER DAMAGE SERIALIZATION TESTS
// ============================================================================

describe('Career Damage Serialization', () => {
  test('toJSON and fromJSON preserve all properties', () => {
    const original = new CareerDamage({
      totalAbuse: 45,
      koLosses: 2,
      tkoLosses: 3,
      knockdownsReceived: 8,
      roundsFought: 150,
      chinDegradation: 4,
      reflexDegradation: 2,
      speedDegradation: 1,
      warFights: 3
    });

    const json = original.toJSON();
    const restored = CareerDamage.fromJSON(json);

    expect(restored.totalAbuse).toBe(45);
    expect(restored.koLosses).toBe(2);
    expect(restored.tkoLosses).toBe(3);
    expect(restored.knockdownsReceived).toBe(8);
    expect(restored.chinDegradation).toBe(4);
    expect(restored.warFights).toBe(3);
  });
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('MANAGER SYSTEM TEST SUITE');
console.log('='.repeat(60));

// Run all test suites (they auto-execute from the describe() calls above)

console.log('\n' + '='.repeat(60));
console.log('TEST RUN COMPLETE');
console.log('='.repeat(60) + '\n');
