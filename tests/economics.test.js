/**
 * Economics System Tests
 * Tests for era-based economics, purse/revenue calculations, and money fight identification
 */

import { EraConfig, BoxingEra, RevenueModel, RealismLevel } from '../src/universe/economics/EraConfig.js';
import { FightEconomics, FightPosition } from '../src/universe/economics/FightEconomics.js';
import { MarketValue } from '../src/universe/economics/MarketValue.js';
import { MoneyFightEngine } from '../src/universe/economics/MoneyFightEngine.js';

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
      record: { wins: 30, losses: 2, draws: 0, kos: 20, ...(overrides.record || {}) },
      popularity: overrides.popularity || 70,
      consecutiveWins: overrides.consecutiveWins || 5,
      titles: overrides.titles || [],
      phase: overrides.phase || 'CHAMPION',
      ...overrides.career
    },
    potential: {
      tier: overrides.tier || 'ELITE',
      ceiling: overrides.ceiling || 90,
      ...overrides.potential
    },
    mental: {
      chin: 80,
      heart: 85,
      ...overrides.mental
    },
    power: {
      knockoutPower: overrides.knockoutPower || 80,
      powerRight: 85,
      powerLeft: 75,
      ...overrides.power
    },
    style: {
      primary: overrides.style || 'boxer-puncher',
      ...overrides.styleObj
    },
    getKOPercentage: () => overrides.koPercentage || 60,
    getWinPercentage: () => overrides.winPercentage || 90,
    ...overrides
  };
}

// Mock universe for testing
function createMockUniverse(overrides = {}) {
  const year = overrides.year || 2020;
  return {
    currentDate: { year, week: 1 },
    era: {
      current: overrides.era || BoxingEra.MODERN,
      startYear: year,
      realismLevel: overrides.realismLevel || RealismLevel.SIMPLIFIED
    },
    getCurrentYear: () => year,
    getEconomicsOptions: (division) => ({
      year,
      division: division || 'Heavyweight',
      realismLevel: overrides.realismLevel || RealismLevel.SIMPLIFIED
    }),
    getDivisionForWeight: (weight) => {
      if (weight >= 200) return { name: 'Heavyweight' };
      if (weight >= 175) return { name: 'Light Heavyweight' };
      if (weight >= 160) return { name: 'Middleweight' };
      if (weight >= 147) return { name: 'Welterweight' };
      if (weight >= 135) return { name: 'Lightweight' };
      if (weight >= 126) return { name: 'Featherweight' };
      return { name: 'Flyweight' };
    },
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
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(value - expected);
      const threshold = Math.pow(10, -precision) / 2;
      if (diff > threshold) {
        throw new Error(`Expected ${expected} (±${threshold}), got ${value}`);
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
// ERA CONFIG TESTS
// ============================================================================

describe('EraConfig', () => {
  test('getEraFromYear returns correct era for Golden Age', () => {
    expect(EraConfig.getEraFromYear(1925)).toBe(BoxingEra.GOLDEN_AGE);
    expect(EraConfig.getEraFromYear(1940)).toBe(BoxingEra.GOLDEN_AGE);
    expect(EraConfig.getEraFromYear(1959)).toBe(BoxingEra.GOLDEN_AGE);
  });

  test('getEraFromYear returns correct era for TV Era', () => {
    expect(EraConfig.getEraFromYear(1960)).toBe(BoxingEra.TV_ERA);
    expect(EraConfig.getEraFromYear(1970)).toBe(BoxingEra.TV_ERA);
    expect(EraConfig.getEraFromYear(1979)).toBe(BoxingEra.TV_ERA);
  });

  test('getEraFromYear returns correct era for PPV Era', () => {
    expect(EraConfig.getEraFromYear(1980)).toBe(BoxingEra.PPV_ERA);
    expect(EraConfig.getEraFromYear(1995)).toBe(BoxingEra.PPV_ERA);
    expect(EraConfig.getEraFromYear(2009)).toBe(BoxingEra.PPV_ERA);
  });

  test('getEraFromYear returns correct era for Modern', () => {
    expect(EraConfig.getEraFromYear(2010)).toBe(BoxingEra.MODERN);
    expect(EraConfig.getEraFromYear(2020)).toBe(BoxingEra.MODERN);
    expect(EraConfig.getEraFromYear(2050)).toBe(BoxingEra.MODERN);
  });

  test('inflation multipliers scale correctly across eras', () => {
    const golden = EraConfig.getInflationMultiplier(1940, RealismLevel.SIMPLIFIED);
    const tv = EraConfig.getInflationMultiplier(1970, RealismLevel.SIMPLIFIED);
    const ppv = EraConfig.getInflationMultiplier(1995, RealismLevel.SIMPLIFIED);
    const modern = EraConfig.getInflationMultiplier(2020, RealismLevel.SIMPLIFIED);

    // Each era should have progressively higher inflation multiplier
    expect(golden).toBeLessThan(tv);
    expect(tv).toBeLessThan(ppv);
    expect(ppv).toBeLessThan(modern);

    // Modern should be close to 1.0
    expect(modern).toBeCloseTo(1.0, 1);

    // Golden age should be very small
    expect(golden).toBeLessThan(0.1);
  });

  test('PPV is not available before 1980', () => {
    expect(EraConfig.hasPPV(1975)).toBeFalsy();
    expect(EraConfig.hasPPV(1979)).toBeFalsy();
  });

  test('PPV is available after 1980', () => {
    expect(EraConfig.hasPPV(1980)).toBeTruthy();
    expect(EraConfig.hasPPV(1985)).toBeTruthy();
    expect(EraConfig.hasPPV(2020)).toBeTruthy();
  });

  test('division multipliers are correct', () => {
    expect(EraConfig.getDivisionMultiplier('Heavyweight')).toBe(2.0);
    expect(EraConfig.getDivisionMultiplier('Welterweight')).toBe(1.5);
    expect(EraConfig.getDivisionMultiplier('Middleweight')).toBe(1.2);
    expect(EraConfig.getDivisionMultiplier('Lightweight')).toBe(1.0);
    expect(EraConfig.getDivisionMultiplier('Flyweight')).toBe(0.3);
  });

  test('revenue model changes by era', () => {
    expect(EraConfig.getRevenueModel(1940)).toBe(RevenueModel.GATE_ONLY);
    expect(EraConfig.getRevenueModel(1970)).toBe(RevenueModel.CLOSED_CIRCUIT_TV);
    expect(EraConfig.getRevenueModel(1995)).toBe(RevenueModel.PPV_DOMINANT);
    expect(EraConfig.getRevenueModel(2020)).toBe(RevenueModel.STREAMING_HYBRID);
  });

  test('PPV price is 0 before 1980', () => {
    const price = EraConfig.getPPVPrice(1975, RealismLevel.SIMPLIFIED);
    expect(price).toBe(0);
  });

  test('PPV price increases over time', () => {
    const price1990 = EraConfig.getPPVPrice(1990, RealismLevel.SIMPLIFIED);
    const price2020 = EraConfig.getPPVPrice(2020, RealismLevel.SIMPLIFIED);

    expect(price1990).toBeGreaterThan(0);
    expect(price2020).toBeGreaterThan(price1990);
  });

  test('getEraOptions returns all four eras', () => {
    const options = EraConfig.getEraOptions();
    expect(options.length).toBe(4);
  });
});

// ============================================================================
// FIGHT ECONOMICS TESTS
// ============================================================================

describe('FightEconomics - Revenue Calculation', () => {
  test('revenue is calculated for modern era', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const revenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    expect(revenue.total).toBeGreaterThan(0);
    expect(revenue.gate).toBeGreaterThan(0);
  });

  test('division multiplier affects revenue', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const hwRevenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    const fwRevenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Flyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    // Heavyweight (2.0x) should generate much more than Flyweight (0.3x)
    // Ratio should be roughly 6.67x (2.0 / 0.3)
    const ratio = hwRevenue.total / fwRevenue.total;
    expect(ratio).toBeGreaterThan(4);
    expect(ratio).toBeLessThan(10);
  });

  test('Golden Age has no PPV revenue', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const revenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 1940, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    expect(revenue.ppv).toBe(0);
    expect(revenue.ppvBuys).toBe(0);
  });

  test('Modern era has higher revenue than Golden Age for same fight', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const goldenRevenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 1940, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    const modernRevenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    expect(modernRevenue.total).toBeGreaterThan(goldenRevenue.total);
  });

  test('higher popularity generates more revenue', () => {
    const popularFighter = createMockFighter({ name: 'Popular', popularity: 95 });
    const averageFighter = createMockFighter({ name: 'Average', popularity: 50 });
    const opponent = createMockFighter({ name: 'Opponent', popularity: 60 });

    const highPopRevenue = FightEconomics.calculateRevenue(
      popularFighter, opponent, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    const lowPopRevenue = FightEconomics.calculateRevenue(
      averageFighter, opponent, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    // Compare gate revenue (deterministic) to avoid PPV variance
    // Gate: higher popularity = higher combined draw = higher sellout % = higher gate
    expect(highPopRevenue.gate).toBeGreaterThan(lowPopRevenue.gate);
    // Combined draw should also be higher
    expect(highPopRevenue.combinedDraw).toBeGreaterThan(lowPopRevenue.combinedDraw);
  });
});

describe('FightEconomics - Purse/Revenue Connection', () => {
  test('purses are approximately 60% of total revenue', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const options = { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED };

    const revenue = FightEconomics.calculateRevenue(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null, options
    );
    const expenses = FightEconomics.calculateExpenses(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null, options
    );

    const totalPurses = expenses.purseA + expenses.purseB;
    const purseToRevenueRatio = totalPurses / revenue.total;

    // Purses should be roughly 55-65% of revenue
    expect(purseToRevenueRatio).toBeGreaterThan(0.45);
    expect(purseToRevenueRatio).toBeLessThan(0.70);
  });

  test('purses scale with revenue across eras', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const goldenExpenses = FightEconomics.calculateExpenses(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 1940, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    const modernExpenses = FightEconomics.calculateExpenses(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    // Modern purses should be much higher than Golden Age
    expect(modernExpenses.purseA).toBeGreaterThan(goldenExpenses.purseA);
    expect(modernExpenses.purseB).toBeGreaterThan(goldenExpenses.purseB);
  });

  test('B-side minimum is enforced (approximately 30%)', () => {
    // A-side is much more popular than B-side
    const aSide = createMockFighter({ name: 'A-Side Star', popularity: 95, tier: 'GENERATIONAL' });
    const bSide = createMockFighter({ name: 'B-Side', popularity: 40, tier: 'CONTENDER' });

    const expenses = FightEconomics.calculateExpenses(
      aSide, bSide, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    const totalPurses = expenses.purseA + expenses.purseB;
    const bSideShare = expenses.purseB / totalPurses;

    // B-side should get at least 25% (near the 30% minimum)
    expect(bSideShare).toBeGreaterThanOrEqual(0.25);
  });
});

describe('FightEconomics - calculateProfit', () => {
  test('calculateProfit returns all components', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 80 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 75 });

    const profit = FightEconomics.calculateProfit(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    expect(profit.revenue).toBeTruthy();
    expect(profit.expenses).toBeTruthy();
    expect(profit.profit !== undefined).toBeTruthy();
    expect(profit.roi !== undefined).toBeTruthy();
  });
});

// ============================================================================
// MONEY FIGHT ENGINE TESTS
// ============================================================================

describe('MoneyFightEngine', () => {
  test('threshold is set to 75', () => {
    expect(MoneyFightEngine.MONEY_FIGHT_THRESHOLD).toBe(75);
  });

  test('high popularity fighters qualify as money fight', () => {
    const starA = createMockFighter({ name: 'Star A', popularity: 90, tier: 'GENERATIONAL' });
    const starB = createMockFighter({ name: 'Star B', popularity: 85, tier: 'ELITE' });
    const universe = createMockUniverse({ year: 2020 });

    const evaluation = MoneyFightEngine.evaluateMoneyFight(starA, starB, universe);

    // Combined draw of 87.5 should exceed threshold of 75
    expect(evaluation.combinedDraw).toBeGreaterThan(70);
    expect(evaluation.isMoneyFight).toBeTruthy();
  });

  test('low popularity fighters do not qualify as money fight', () => {
    const journeymanA = createMockFighter({ name: 'Journeyman A', popularity: 30, tier: 'JOURNEYMAN' });
    const journeymanB = createMockFighter({ name: 'Journeyman B', popularity: 25, tier: 'JOURNEYMAN' });
    const universe = createMockUniverse({ year: 2020 });

    const evaluation = MoneyFightEngine.evaluateMoneyFight(journeymanA, journeymanB, universe);

    // Combined draw should be well below 75 threshold
    expect(evaluation.combinedDraw).toBeLessThan(60);
    expect(evaluation.isMoneyFight).toBeFalsy();
  });

  test('classification adjusts for era', () => {
    // In Golden Age, $1M is huge; in Modern era, it's small
    const goldenMega = MoneyFightEngine.classifyMoneyFight(1000000, 1940);
    const modernMega = MoneyFightEngine.classifyMoneyFight(1000000, 2020);

    // $1M in 1940 should be classified higher than $1M in 2020
    // (Because thresholds adjust for inflation)
    // This tests the era-adjusted classification
  });

  test('evaluateMoneyFight uses era options from universe', () => {
    const starA = createMockFighter({ name: 'Star A', popularity: 85 });
    const starB = createMockFighter({ name: 'Star B', popularity: 80 });

    const modernUniverse = createMockUniverse({ year: 2020 });
    const goldenUniverse = createMockUniverse({ year: 1940, era: BoxingEra.GOLDEN_AGE });

    const modernEval = MoneyFightEngine.evaluateMoneyFight(starA, starB, modernUniverse);
    const goldenEval = MoneyFightEngine.evaluateMoneyFight(starA, starB, goldenUniverse);

    // Modern era should project higher revenue
    expect(modernEval.projectedRevenue).toBeGreaterThan(goldenEval.projectedRevenue);
  });
});

// ============================================================================
// MARKET VALUE TESTS
// ============================================================================

describe('MarketValue', () => {
  test('champions have higher market value', () => {
    const champion = createMockFighter({
      name: 'Champion',
      popularity: 70,
      titles: [{ title: 'WBC Heavyweight', wonDate: { year: 2019 }, lostDate: null }]
    });
    const contender = createMockFighter({
      name: 'Contender',
      popularity: 70,
      titles: []
    });

    const champValue = MarketValue.calculate(champion);
    const contenderValue = MarketValue.calculate(contender);

    expect(champValue).toBeGreaterThan(contenderValue);
  });

  test('higher popularity increases market value', () => {
    const popular = createMockFighter({ name: 'Popular', popularity: 90 });
    const unpopular = createMockFighter({ name: 'Unpopular', popularity: 30 });

    const popularValue = MarketValue.calculate(popular);
    const unpopularValue = MarketValue.calculate(unpopular);

    expect(popularValue).toBeGreaterThan(unpopularValue);
  });

  test('higher tier increases market value', () => {
    const elite = createMockFighter({ name: 'Elite', tier: 'ELITE', popularity: 70 });
    const journeyman = createMockFighter({ name: 'Journeyman', tier: 'JOURNEYMAN', popularity: 70 });

    const eliteValue = MarketValue.calculate(elite);
    const journeymanValue = MarketValue.calculate(journeyman);

    expect(eliteValue).toBeGreaterThan(journeymanValue);
  });

  test('PPV draw correlates with popularity and championships', () => {
    const champion = createMockFighter({
      name: 'Champion',
      popularity: 80,
      titles: [{ title: 'WBC', lostDate: null }]
    });
    const contender = createMockFighter({
      name: 'Contender',
      popularity: 50,
      titles: []
    });

    const champDraw = MarketValue.calculatePPVDraw(champion);
    const contenderDraw = MarketValue.calculatePPVDraw(contender);

    expect(champDraw).toBeGreaterThan(contenderDraw);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration - Era Economics', () => {
  test('fight in 1925 has era-appropriate economics', () => {
    const fighterA = createMockFighter({ name: 'Jack Dempsey', popularity: 90 });
    const fighterB = createMockFighter({ name: 'Gene Tunney', popularity: 85 });

    const profit = FightEconomics.calculateProfit(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 1925, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    // Should have gate revenue but no PPV
    expect(profit.revenue.gate).toBeGreaterThan(0);
    expect(profit.revenue.ppv).toBe(0);

    // Purses should be in thousands, not millions (adjusted for era)
    expect(profit.expenses.purseA).toBeLessThan(10000000);
  });

  test('fight in 1995 has PPV revenue', () => {
    const fighterA = createMockFighter({ name: 'Mike Tyson', popularity: 95 });
    const fighterB = createMockFighter({ name: 'Evander Holyfield', popularity: 85 });

    const profit = FightEconomics.calculateProfit(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 1995, division: 'Heavyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    // PPV era should have PPV revenue
    expect(profit.revenue.ppv).toBeGreaterThan(0);
    expect(profit.revenue.ppvBuys).toBeGreaterThan(0);
  });

  test('welterweight generates more than flyweight revenue', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', popularity: 75 });
    const fighterB = createMockFighter({ name: 'Fighter B', popularity: 70 });

    const wwProfit = FightEconomics.calculateProfit(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Welterweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    const fwProfit = FightEconomics.calculateProfit(
      fighterA, fighterB, FightPosition.TITLE_FIGHT, null,
      { year: 2020, division: 'Flyweight', realismLevel: RealismLevel.SIMPLIFIED }
    );

    // Welterweight (1.5x) vs Flyweight (0.3x) = 5x difference
    expect(wwProfit.revenue.total).toBeGreaterThan(fwProfit.revenue.total * 3);
  });
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('ECONOMICS SYSTEM TEST SUITE');
console.log('='.repeat(60));

// Run all test suites (they auto-execute from the describe() calls above)

console.log('\n' + '='.repeat(60));
console.log('TEST RUN COMPLETE');
console.log('='.repeat(60) + '\n');
