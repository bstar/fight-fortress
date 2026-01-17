/**
 * Prediction Engine Tests
 *
 * Tests the PredictionEngine and MethodPredictor for fight outcome predictions.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { PredictionEngine } from '../src/engine/prediction/PredictionEngine.js';
import { MethodPredictor } from '../src/engine/prediction/MethodPredictor.js';
import { FightRecordGenerator } from '../src/engine/records/FightRecordGenerator.js';

/**
 * Create mock fighter data
 */
function createMockFighter(overrides = {}) {
  return {
    id: overrides.id || 'fighter-' + Math.random().toString(36).substr(2, 9),
    name: overrides.name || 'Test Fighter',
    identity: { name: overrides.name || 'Test Fighter' },
    physical: {
      height: overrides.height || 180,
      weight: overrides.weight || 90,
      reach: overrides.reach || 180,
      ...overrides.physical
    },
    style: {
      primary: overrides.style || 'boxer-puncher',
      ...overrides.styleObj
    },
    power: {
      powerLeft: overrides.powerLeft || 70,
      powerRight: overrides.powerRight || 75,
      knockoutPower: overrides.knockoutPower || 70,
      ...overrides.power
    },
    speed: {
      handSpeed: overrides.handSpeed || 70,
      footSpeed: overrides.footSpeed || 70,
      reflexes: overrides.reflexes || 70,
      ...overrides.speed
    },
    defense: {
      headMovement: overrides.headMovement || 70,
      blocking: overrides.blocking || 70,
      ...overrides.defense
    },
    offense: {
      jabAccuracy: overrides.jabAccuracy || 70,
      powerAccuracy: overrides.powerAccuracy || 70,
      combinationPunching: overrides.combinationPunching || 70,
      ...overrides.offense
    },
    stamina: {
      cardio: overrides.cardio || 75,
      recoveryRate: overrides.recoveryRate || 75,
      workRate: overrides.workRate || 70,
      ...overrides.stamina
    },
    mental: {
      chin: overrides.chin || 75,
      heart: overrides.heart || 75,
      fightIQ: overrides.fightIQ || 70,
      killerInstinct: overrides.killerInstinct || 70,
      ...overrides.mental
    },
    technical: {
      footwork: overrides.footwork || 70,
      distanceManagement: overrides.distanceManagement || 70,
      ringGeneralship: overrides.ringGeneralship || 70,
      ...overrides.technical
    },
    career: {
      record: { wins: overrides.wins || 10, losses: overrides.losses || 2 },
      weeksInactive: overrides.weeksInactive || 8,
      ...overrides.career
    }
  };
}

describe('PredictionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PredictionEngine();
  });

  it('should create prediction engine with defaults', () => {
    assert.ok(engine.patternAnalyzer);
    assert.strictEqual(engine.baseDrawRate, 0.03);
  });

  it('should generate prediction for two fighters', () => {
    const fighterA = createMockFighter({ name: 'Fighter A' });
    const fighterB = createMockFighter({ name: 'Fighter B' });

    const prediction = engine.predict(fighterA, fighterB);

    assert.ok(prediction.winProbability);
    assert.ok(prediction.expectedMethod);
    assert.ok(prediction.expectedRounds);
    assert.ok(prediction.confidence);
    assert.ok(Array.isArray(prediction.keyFactors));
  });

  it('should produce probabilities that sum to 1', () => {
    const fighterA = createMockFighter();
    const fighterB = createMockFighter();

    const prediction = engine.predict(fighterA, fighterB);
    const total = prediction.winProbability.fighterA +
                  prediction.winProbability.fighterB +
                  prediction.winProbability.draw;

    assert.ok(Math.abs(total - 1.0) < 0.01, `Probabilities should sum to 1, got ${total}`);
  });

  it('should favor stronger fighter in base prediction', () => {
    const strongFighter = createMockFighter({
      name: 'Strong',
      knockoutPower: 90,
      handSpeed: 85,
      chin: 85,
      headMovement: 85
    });

    const weakFighter = createMockFighter({
      name: 'Weak',
      knockoutPower: 60,
      handSpeed: 60,
      chin: 60,
      headMovement: 60
    });

    const prediction = engine.predict(strongFighter, weakFighter);

    assert.ok(
      prediction.winProbability.fighterA > prediction.winProbability.fighterB,
      'Stronger fighter should be favored'
    );
    assert.ok(
      prediction.winProbability.fighterA > 0.50,
      `Stronger fighter should have >50% win probability, got ${prediction.winProbability.fighterA}`
    );
  });

  it('should apply style matchup adjustments', () => {
    // Out-boxer vs Slugger - out-boxer has advantage
    const outBoxer = createMockFighter({
      name: 'Out-Boxer',
      style: 'out-boxer'
    });

    const slugger = createMockFighter({
      name: 'Slugger',
      style: 'slugger'
    });

    const prediction = engine.predict(outBoxer, slugger);

    assert.ok(
      prediction.breakdown.styleAdjustment.A > prediction.breakdown.styleAdjustment.B,
      'Out-boxer should have style advantage over slugger'
    );
  });

  it('should apply condition modifiers', () => {
    const fighterA = createMockFighter({ name: 'Peak Fighter' });
    const fighterB = createMockFighter({ name: 'Drained Fighter' });

    const conditions = {
      fighterA: { physicalState: 'peak', mentalState: 'focused' },
      fighterB: { physicalState: 'drained', mentalState: 'nervous' }
    };

    const prediction = engine.predict(fighterA, fighterB, conditions);

    assert.ok(
      prediction.breakdown.conditionModifiers.A > prediction.breakdown.conditionModifiers.B,
      'Peak fighter should have condition advantage'
    );
  });

  it('should include reach advantage in key factors', () => {
    const longReach = createMockFighter({ name: 'Long', reach: 200 });
    const shortReach = createMockFighter({ name: 'Short', reach: 175 });

    const prediction = engine.predict(longReach, shortReach);

    const reachFactor = prediction.keyFactors.find(f => f.factor === 'reach_advantage');
    assert.ok(reachFactor, 'Should identify reach advantage');
    assert.strictEqual(reachFactor.favoredFighter, 'A');
  });

  it('should predict expected method distribution', () => {
    const fighterA = createMockFighter();
    const fighterB = createMockFighter();

    const prediction = engine.predict(fighterA, fighterB);

    assert.ok(prediction.expectedMethod.ko >= 0);
    assert.ok(prediction.expectedMethod.tko >= 0);
    assert.ok(prediction.expectedMethod.decision >= 0);
    assert.ok(prediction.expectedMethod.draw >= 0);

    const total = prediction.expectedMethod.ko +
                  prediction.expectedMethod.tko +
                  prediction.expectedMethod.decision +
                  prediction.expectedMethod.dq +
                  prediction.expectedMethod.draw;

    assert.ok(Math.abs(total - 1.0) < 0.01, `Method probs should sum to 1, got ${total}`);
  });

  it('should predict more KOs with high power fighters', () => {
    const heavyHitter1 = createMockFighter({ knockoutPower: 95 });
    const heavyHitter2 = createMockFighter({ knockoutPower: 90 });

    const slapper1 = createMockFighter({ knockoutPower: 55 });
    const slapper2 = createMockFighter({ knockoutPower: 50 });

    const powerPrediction = engine.predict(heavyHitter1, heavyHitter2);
    const slapPrediction = engine.predict(slapper1, slapper2);

    assert.ok(
      powerPrediction.expectedMethod.ko > slapPrediction.expectedMethod.ko,
      'High power fighters should have higher KO rate'
    );
  });

  it('should predict shorter fights with heavy hitters', () => {
    const heavyHitter1 = createMockFighter({ knockoutPower: 95, chin: 65 });
    const heavyHitter2 = createMockFighter({ knockoutPower: 90, chin: 60 });

    const techFighter1 = createMockFighter({ knockoutPower: 60, chin: 85 });
    const techFighter2 = createMockFighter({ knockoutPower: 55, chin: 90 });

    const powerPrediction = engine.predict(heavyHitter1, heavyHitter2, {}, { rounds: 12 });
    const techPrediction = engine.predict(techFighter1, techFighter2, {}, { rounds: 12 });

    assert.ok(
      powerPrediction.expectedRounds < techPrediction.expectedRounds,
      `Power fights should be shorter (${powerPrediction.expectedRounds} vs ${techPrediction.expectedRounds})`
    );
  });

  it('should have higher confidence for larger skill gaps', () => {
    const elite = createMockFighter({
      knockoutPower: 90,
      handSpeed: 90,
      headMovement: 90,
      chin: 90
    });
    const journeyman = createMockFighter({
      knockoutPower: 60,
      handSpeed: 60,
      headMovement: 60,
      chin: 60
    });

    const equal1 = createMockFighter();
    const equal2 = createMockFighter();

    const mismatchPrediction = engine.predict(elite, journeyman);
    const evenPrediction = engine.predict(equal1, equal2);

    assert.ok(
      mismatchPrediction.confidence > evenPrediction.confidence,
      'Mismatches should have higher confidence'
    );
  });
});

describe('MethodPredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new MethodPredictor();
  });

  it('should predict detailed method breakdown', () => {
    const fighterA = createMockFighter({ knockoutPower: 85 });
    const fighterB = createMockFighter({ knockoutPower: 80 });

    const prediction = predictor.predict(fighterA, fighterB);

    assert.ok(prediction.breakdown);
    assert.ok(prediction.breakdown.koByA >= 0);
    assert.ok(prediction.breakdown.koByB >= 0);
    assert.ok(prediction.breakdown.tkoByA >= 0);
    assert.ok(prediction.breakdown.tkoByB >= 0);
    assert.ok(prediction.breakdown.decisionA >= 0);
    assert.ok(prediction.breakdown.decisionB >= 0);
  });

  it('should predict stoppage round distribution', () => {
    const fighterA = createMockFighter();
    const fighterB = createMockFighter();

    const prediction = predictor.predict(fighterA, fighterB);

    assert.ok(prediction.roundPrediction);
    assert.ok(prediction.roundPrediction.expectedRound > 0);
    assert.ok(prediction.roundPrediction.earlyProbability >= 0);
    assert.ok(prediction.roundPrediction.middleProbability >= 0);
    assert.ok(prediction.roundPrediction.lateProbability >= 0);
  });

  it('should generate narrative description', () => {
    const fighterA = createMockFighter({ name: 'Fighter A', knockoutPower: 90 });
    const fighterB = createMockFighter({ name: 'Fighter B', knockoutPower: 60 });

    const prediction = predictor.predict(fighterA, fighterB);

    assert.ok(prediction.narrative);
    assert.ok(prediction.narrative.length > 0);
  });

  it('should predict higher early stoppage rate with heavy hitters', () => {
    const heavyHitter1 = createMockFighter({ knockoutPower: 95, chin: 60 });
    const heavyHitter2 = createMockFighter({ knockoutPower: 90, chin: 65 });

    const prediction = predictor.predict(heavyHitter1, heavyHitter2);

    assert.ok(
      prediction.roundPrediction.earlyProbability > 0.30,
      `Heavy hitters should have high early stoppage rate, got ${prediction.roundPrediction.earlyProbability}`
    );
  });
});

describe('FightRecordGenerator Prediction Integration', () => {
  let generator;

  beforeEach(() => {
    generator = new FightRecordGenerator({ includePrediction: true });
  });

  it('should have prediction engine', () => {
    assert.ok(generator.predictionEngine instanceof PredictionEngine);
  });

  it('should generate standalone prediction', () => {
    const fighterA = createMockFighter({ name: 'A' });
    const fighterB = createMockFighter({ name: 'B' });

    const prediction = generator.predictMatchup(fighterA, fighterB);

    assert.ok(prediction.winProbability);
    assert.ok(prediction.expectedMethod);
    assert.ok(prediction.confidence);
  });

  it('should generate prediction via generatePrediction method', () => {
    const fighterA = createMockFighter({ name: 'A' });
    const fighterB = createMockFighter({ name: 'B' });

    const prediction = generator.generatePrediction(fighterA, fighterB);

    assert.ok(prediction.winProbability);
    assert.ok(prediction.expectedMethod);
  });
});

describe('Style Matchup System', () => {
  let engine;

  beforeEach(() => {
    engine = new PredictionEngine();
  });

  const testStyleMatchup = (styleA, styleB, expectedFavored) => {
    const fighterA = createMockFighter({ style: styleA });
    const fighterB = createMockFighter({ style: styleB });

    const prediction = engine.predict(fighterA, fighterB);
    const styleAdj = prediction.breakdown.styleAdjustment;

    if (expectedFavored === 'A') {
      assert.ok(styleAdj.A > styleAdj.B, `${styleA} should have advantage over ${styleB}`);
    } else if (expectedFavored === 'B') {
      assert.ok(styleAdj.B > styleAdj.A, `${styleB} should have advantage over ${styleA}`);
    } else {
      assert.ok(Math.abs(styleAdj.A - styleAdj.B) < 0.05, `${styleA} vs ${styleB} should be even`);
    }
  };

  it('out-boxer beats slugger', () => testStyleMatchup('out-boxer', 'slugger', 'A'));
  it('swarmer beats out-boxer', () => testStyleMatchup('swarmer', 'out-boxer', 'A'));
  it('slugger beats swarmer', () => testStyleMatchup('slugger', 'swarmer', 'A'));
  it('counter-puncher beats slugger', () => testStyleMatchup('counter-puncher', 'slugger', 'A'));
  it('pressure-fighter beats out-boxer', () => testStyleMatchup('pressure-fighter', 'out-boxer', 'A'));
});

console.log('Prediction tests loaded successfully');
