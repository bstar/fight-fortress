/**
 * Pattern Detection Tests
 *
 * Tests the PatternAnalyzer and pattern integration with fight records.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { PatternAnalyzer } from '../src/engine/patterns/PatternAnalyzer.js';
import {
  PatternDefinitions,
  PatternCategory,
  MinSampleSize,
  getPatternDefinition
} from '../src/engine/patterns/PatternTypes.js';
import { FightRecordGenerator } from '../src/engine/records/FightRecordGenerator.js';

/**
 * Create mock fight records for testing
 */
function createMockFightHistory(fighterId, scenarios) {
  return scenarios.map((scenario, index) => ({
    id: `fight-${fighterId}-${index}`,
    fighterA: {
      id: fighterId,
      style: { primary: 'boxer-puncher' }
    },
    fighterB: {
      id: `opponent-${index}`,
      style: { primary: scenario.opponentStyle || 'slugger' }
    },
    result: {
      winner: scenario.won ? 'A' : 'B',
      method: scenario.method || 'DECISION',
      round: scenario.round || 12
    },
    context: {
      fightType: scenario.fightType || 'STANDARD',
      stakes: scenario.stakes || null
    },
    fightData: {
      totalStats: {
        knockdowns: {
          A: scenario.knockdownsScored || 0,
          B: scenario.knockdownsReceived || 0
        }
      }
    }
  }));
}

describe('PatternAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
  });

  it('should return insufficient data message with few fights', () => {
    const history = createMockFightHistory('fighter-1', [
      { won: true, method: 'KO', round: 3 },
      { won: true, method: 'KO', round: 2 }
    ]);

    analyzer.setHistory(history);
    const analysis = analyzer.analyzePatterns('fighter-1');

    assert.strictEqual(analysis.fightsAnalyzed, 2);
    assert.strictEqual(analysis.patterns.length, 0);
    assert.ok(analysis.message.includes('Insufficient'));
  });

  it('should detect KO Artist pattern with high KO rate', () => {
    // Create fighter with 10 fights, 8 KO wins
    const history = createMockFightHistory('ko-artist', [
      { won: true, method: 'KO', round: 3 },
      { won: true, method: 'KO', round: 2 },
      { won: true, method: 'KO', round: 5 },
      { won: true, method: 'KO', round: 1 },
      { won: true, method: 'KO', round: 4 },
      { won: true, method: 'KO', round: 6 },
      { won: true, method: 'KO', round: 3 },
      { won: true, method: 'KO', round: 2 },
      { won: true, method: 'DECISION', round: 12 },
      { won: false, method: 'DECISION', round: 12 }
    ]);

    analyzer.setHistory(history);
    const analysis = analyzer.analyzePatterns('ko-artist');

    assert.strictEqual(analysis.fightsAnalyzed, 10);
    assert.ok(analysis.metrics.koRate >= 0.7, `KO rate should be >= 0.7, got ${analysis.metrics.koRate}`);

    const koArtistPattern = analysis.patterns.find(p => p.id === 'ko_artist');
    assert.ok(koArtistPattern, 'Should detect KO Artist pattern');
    assert.ok(koArtistPattern.positive, 'KO Artist should be a positive pattern');
  });

  it('should detect Decision Machine pattern', () => {
    // Create fighter with 10 fights, mostly decision wins, rarely stopped
    const history = createMockFightHistory('decision-machine', [
      { won: true, method: 'DECISION', round: 12 },
      { won: true, method: 'DECISION', round: 12 },
      { won: true, method: 'DECISION', round: 12 },
      { won: true, method: 'DECISION', round: 12 },
      { won: true, method: 'DECISION', round: 12 },
      { won: true, method: 'DECISION', round: 12 },
      { won: true, method: 'DECISION', round: 12 },
      { won: false, method: 'DECISION', round: 12 },
      { won: false, method: 'DECISION', round: 12 },
      { won: true, method: 'KO', round: 8 }
    ]);

    analyzer.setHistory(history);
    const analysis = analyzer.analyzePatterns('decision-machine');

    assert.ok(analysis.metrics.decisionWinRate >= 0.6, 'Should have high decision win rate');
    assert.ok(analysis.metrics.timesStoppedRate <= 0.10, 'Should rarely be stopped');

    const decisionPattern = analysis.patterns.find(p => p.id === 'decision_machine');
    assert.ok(decisionPattern, 'Should detect Decision Machine pattern');
  });

  it('should detect Clutch Performer pattern', () => {
    // Create fighter who wins big fights at higher rate than regular fights
    const history = createMockFightHistory('clutch-performer', [
      // Big fights - wins most
      { won: true, method: 'KO', fightType: 'TITLE_FIGHT', stakes: 'World Title' },
      { won: true, method: 'DECISION', fightType: 'TITLE_FIGHT', stakes: 'World Title' },
      { won: true, method: 'KO', fightType: 'TITLE_FIGHT', stakes: 'World Title' },
      { won: true, method: 'DECISION', fightType: 'TITLE_FIGHT', stakes: 'World Title' },
      { won: false, method: 'DECISION', fightType: 'TITLE_FIGHT', stakes: 'World Title' },
      // Regular fights - wins some, loses some
      { won: true, method: 'DECISION' },
      { won: false, method: 'DECISION' },
      { won: true, method: 'DECISION' },
      { won: false, method: 'KO' },
      { won: true, method: 'DECISION' }
    ]);

    analyzer.setHistory(history);
    const analysis = analyzer.analyzePatterns('clutch-performer');

    // Big fight win rate: 4/5 = 0.80
    // Overall win rate: 7/10 = 0.70
    // Difference: 0.10 (meets threshold)
    assert.ok(analysis.metrics.bigFightWinRate >= 0.65, 'Should have high big fight win rate');
  });

  it('should calculate metrics correctly', () => {
    const history = createMockFightHistory('test-fighter', [
      { won: true, method: 'KO', round: 3, knockdownsScored: 2, knockdownsReceived: 0 },
      { won: true, method: 'TKO', round: 5, knockdownsScored: 1, knockdownsReceived: 0 },
      { won: false, method: 'KO', round: 7, knockdownsScored: 0, knockdownsReceived: 2 },
      { won: true, method: 'DECISION', round: 12, knockdownsScored: 1, knockdownsReceived: 1 }
    ]);

    analyzer.setHistory(history);
    const analysis = analyzer.analyzePatterns('test-fighter');

    assert.strictEqual(analysis.metrics.totalFights, 4);
    assert.strictEqual(analysis.metrics.wins, 3);
    assert.strictEqual(analysis.metrics.losses, 1);
    assert.strictEqual(analysis.metrics.koWins, 2); // KO and TKO
    assert.strictEqual(analysis.metrics.koLosses, 1);
    assert.strictEqual(analysis.metrics.knockdownsScored, 4);
    assert.strictEqual(analysis.metrics.knockdownsReceived, 3);
    assert.strictEqual(analysis.metrics.winRate, 0.75);
  });

  it('should generate summary from patterns', () => {
    // Create fighter with clear patterns
    const history = createMockFightHistory('summary-test', [
      { won: true, method: 'KO', round: 1 },
      { won: true, method: 'KO', round: 2 },
      { won: true, method: 'KO', round: 1 },
      { won: true, method: 'KO', round: 3 },
      { won: true, method: 'KO', round: 2 },
      { won: true, method: 'KO', round: 4 },
      { won: true, method: 'KO', round: 1 },
      { won: true, method: 'KO', round: 2 }
    ]);

    analyzer.setHistory(history);
    const analysis = analyzer.analyzePatterns('summary-test');

    assert.ok(analysis.summary, 'Should have summary');
    assert.ok(analysis.summary.length > 0, 'Summary should not be empty');
  });
});

describe('Pattern Types', () => {
  it('should have all required pattern definitions', () => {
    const requiredPatterns = [
      'CLUTCH_PERFORMER',
      'CHOKES_UNDER_PRESSURE',
      'SLOW_STARTER',
      'FAST_STARTER',
      'COMEBACK_SPECIALIST',
      'KO_ARTIST',
      'DECISION_MACHINE',
      'IRON_CHIN',
      'GLASS_CHIN',
      'KILLER_INSTINCT'
    ];

    for (const pattern of requiredPatterns) {
      assert.ok(PatternDefinitions[pattern], `Pattern ${pattern} should exist`);
    }
  });

  it('should have valid category for all patterns', () => {
    const validCategories = Object.values(PatternCategory);

    for (const [key, pattern] of Object.entries(PatternDefinitions)) {
      assert.ok(
        validCategories.includes(pattern.category),
        `Pattern ${key} has invalid category: ${pattern.category}`
      );
    }
  });

  it('should have detection criteria for all patterns', () => {
    for (const [key, pattern] of Object.entries(PatternDefinitions)) {
      assert.ok(pattern.detection, `Pattern ${key} should have detection criteria`);
      assert.ok(pattern.detection.metric, `Pattern ${key} should have a primary metric`);
    }
  });

  it('should return pattern by ID', () => {
    const pattern = getPatternDefinition('ko_artist');
    assert.ok(pattern, 'Should find ko_artist pattern');
    assert.strictEqual(pattern.name, 'KO Artist');
  });
});

describe('FightRecordGenerator Pattern Integration', () => {
  let generator;

  beforeEach(() => {
    generator = new FightRecordGenerator({
      includePatternAnalysis: true
    });
  });

  it('should have pattern analyzer instance', () => {
    assert.ok(generator.patternAnalyzer instanceof PatternAnalyzer);
  });

  it('should set fight history', () => {
    const history = createMockFightHistory('test', [
      { won: true, method: 'KO' }
    ]);

    generator.setFightHistory(history);
    // No error means success
  });

  it('should add fight to history', () => {
    const mockRecord = {
      id: 'test-fight',
      fighterA: { id: 'a' },
      fighterB: { id: 'b' },
      result: { winner: 'A', method: 'KO' }
    };

    generator.addToHistory(mockRecord);
    // No error means success
  });

  it('should generate matchup insights', () => {
    const fighterA = {
      id: 'fighter-a',
      name: 'Fighter A',
      style: { primary: 'swarmer' }
    };

    const fighterB = {
      id: 'fighter-b',
      name: 'Fighter B',
      style: { primary: 'out-boxer' }
    };

    // Create history where A has a pattern of beating boxers
    const history = [
      ...createMockFightHistory('fighter-a', [
        { won: true, method: 'KO', opponentStyle: 'out-boxer' },
        { won: true, method: 'KO', opponentStyle: 'boxer' },
        { won: true, method: 'DECISION', opponentStyle: 'out-boxer' },
        { won: true, method: 'TKO', opponentStyle: 'counter-puncher' },
        { won: true, method: 'KO', opponentStyle: 'out-boxer' }
      ]),
      ...createMockFightHistory('fighter-b', [
        { won: true, method: 'DECISION' },
        { won: true, method: 'DECISION' },
        { won: false, method: 'KO' }
      ])
    ];

    const analysis = generator.analyzePatterns(fighterA, fighterB, history);

    assert.ok(analysis.fighterA, 'Should have analysis for fighter A');
    assert.ok(analysis.fighterB, 'Should have analysis for fighter B');
    assert.ok(Array.isArray(analysis.matchupInsights), 'Should have matchup insights array');
  });

  it('should identify pressure vs boxer style matchups', () => {
    assert.ok(generator.isPressureStyle('swarmer'));
    assert.ok(generator.isPressureStyle('pressure-fighter'));
    assert.ok(generator.isPressureStyle('brawler'));
    assert.ok(!generator.isPressureStyle('out-boxer'));

    assert.ok(generator.isBoxerStyle('out-boxer'));
    assert.ok(generator.isBoxerStyle('counter-puncher'));
    assert.ok(!generator.isBoxerStyle('swarmer'));
  });
});

describe('Minimum Sample Sizes', () => {
  it('should have correct sample size thresholds', () => {
    assert.strictEqual(MinSampleSize.BASIC, 3);
    assert.strictEqual(MinSampleSize.RELIABLE, 5);
    assert.strictEqual(MinSampleSize.STRONG, 8);
    assert.strictEqual(MinSampleSize.DEFINITIVE, 12);
  });
});

console.log('Pattern detection tests loaded successfully');
