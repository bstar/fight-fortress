# AI Decision System

This document defines how fighter AI makes decisions during the simulation. The AI system evaluates the current situation and selects actions based on attributes, style, opponent state, and tactical considerations.

## Decision Architecture

### Decision Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DECISION CYCLE                           │
│                       (every 0.5s tick)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. SITUATION ASSESSMENT                                         │
│    - Own state (stamina, damage, position, current state)       │
│    - Opponent state (same)                                      │
│    - Distance and angles                                        │
│    - Round/fight context                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. STRATEGIC CONTEXT                                            │
│    - Scorecard situation                                        │
│    - Round number                                               │
│    - Fight history (what's working)                             │
│    - Corner instructions                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ACTION GENERATION                                            │
│    - Generate candidate actions based on style                  │
│    - Filter by current state validity                           │
│    - Weight by tactical preference                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ACTION SELECTION                                             │
│    - Score each candidate action                                │
│    - Apply randomness (prevent predictability)                  │
│    - Select highest-weighted action                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. EXECUTION                                                    │
│    - Execute selected action                                    │
│    - Update state                                               │
│    - Record for learning                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Situation Assessment

### Self Assessment

```javascript
function assessSelfState(fighter) {
  return {
    stamina: {
      percent: fighter.currentStamina / fighter.maxStamina,
      tier: getStaminaTier(fighter),
      trend: calculateStaminaTrend(fighter)
    },

    damage: {
      headPercent: fighter.headDamage / fighter.maxHeadDamage,
      bodyPercent: fighter.bodyDamage / 100,
      isHurt: fighter.state === 'HURT',
      hurtSeverity: fighter.hurtSeverity || null
    },

    position: {
      distanceFromCenter: getDistanceFromCenter(fighter.position),
      nearRopes: isNearRopes(fighter.position),
      inCorner: isInCorner(fighter.position),
      hasRingControl: calculateRingControl(fighter).controller === fighter.id
    },

    momentum: {
      lastPunchesLanded: fighter.recentLanded,
      lastPunchesTaken: fighter.recentTaken,
      trend: calculateMomentum(fighter)
    },

    currentState: fighter.state,
    stateTime: fighter.timeInCurrentState
  };
}
```

### Opponent Assessment

```javascript
function assessOpponent(fighter, opponent) {
  return {
    state: opponent.state,
    isHurt: opponent.state === 'HURT',
    hurtSeverity: opponent.hurtSeverity,

    stamina: {
      estimated: estimateOpponentStamina(opponent),
      showing_fatigue: opponent.staminaPercent < 0.4
    },

    damage: {
      estimated_head: estimateOpponentHeadDamage(opponent),
      estimated_body: estimateOpponentBodyDamage(opponent),
      visibly_hurt: opponent.headDamage > 60
    },

    tendencies: {
      style: opponent.style.primary,
      defensive_preference: getDefensiveTendency(opponent),
      offensive_pattern: getOffensivePattern(opponent),
      weakness_identified: identifyWeakness(opponent)
    },

    position: {
      distance: getDistance(fighter.position, opponent.position),
      nearRopes: isNearRopes(opponent.position),
      inCorner: isInCorner(opponent.position),
      angle: getAngle(fighter, opponent)
    },

    threat_level: calculateThreatLevel(opponent)
  };
}
```

---

## Strategic Context

### Scorecard Awareness

```javascript
function getScoreCardContext(fighter, roundNumber) {
  const scorecards = getCurrentScorecards();
  const myScore = averageScore(scorecards, fighter.id);
  const oppScore = averageScore(scorecards, fighter.opponent.id);
  const diff = myScore - oppScore;

  return {
    winning: diff > 0,
    margin: Math.abs(diff),
    needsKO: diff < -4 && roundNumber > 8,
    canCoast: diff > 3 && roundNumber > 9,
    closeRound: Math.abs(diff) <= 1,

    recommended_approach: diff < -2 ? 'aggressive'
      : diff > 2 ? 'conservative'
      : 'neutral'
  };
}
```

### Round Context

```javascript
function getRoundContext(roundNumber, totalRounds) {
  return {
    isEarlyRounds: roundNumber <= 3,
    isMiddleRounds: roundNumber > 3 && roundNumber <= 8,
    isChampionshipRounds: roundNumber >= 9,
    isFinalRound: roundNumber === totalRounds,

    roundProgress: getCurrentRoundTime() / 180, // 0-1

    strategy_modifier:
      roundNumber <= 2 ? 'feeling_out' :
      roundNumber >= 10 ? 'push_for_finish' :
      'normal'
  };
}
```

---

## Style-Based Decision Making

### Style Action Weights

```yaml
style_weights:
  out-boxer:
    OFFENSIVE.JABBING: 0.35
    OFFENSIVE.COMBINATION: 0.15
    DEFENSIVE.DISTANCE: 0.20
    TIMING: 0.15
    MOVING.CIRCLING: 0.15

  swarmer:
    OFFENSIVE.COMBINATION: 0.35
    OFFENSIVE.BODY_WORK: 0.25
    MOVING.CUTTING_OFF: 0.20
    OFFENSIVE.JABBING: 0.15
    CLINCH: 0.05

  slugger:
    OFFENSIVE.POWER_SHOT: 0.35
    OFFENSIVE.COMBINATION: 0.20
    MOVING.CUTTING_OFF: 0.15
    DEFENSIVE.HIGH_GUARD: 0.15
    NEUTRAL: 0.15

  boxer-puncher:
    OFFENSIVE.COMBINATION: 0.25
    OFFENSIVE.JABBING: 0.20
    TIMING: 0.20
    OFFENSIVE.POWER_SHOT: 0.15
    DEFENSIVE.*: 0.20

  counter-puncher:
    TIMING: 0.40
    DEFENSIVE.HEAD_MOVEMENT: 0.20
    DEFENSIVE.PHILLY_SHELL: 0.15
    OFFENSIVE.JABBING: 0.15
    NEUTRAL: 0.10

  inside-fighter:
    OFFENSIVE.COMBINATION: 0.30
    OFFENSIVE.BODY_WORK: 0.30
    MOVING.CUTTING_OFF: 0.15
    CLINCH.DIRTY_BOXING: 0.15
    DEFENSIVE.HEAD_MOVEMENT: 0.10

  volume-puncher:
    OFFENSIVE.COMBINATION: 0.50
    OFFENSIVE.JABBING: 0.25
    OFFENSIVE.BODY_WORK: 0.15
    MOVING: 0.10
```

---

## Action Generation

### Candidate Actions

```javascript
function generateCandidateActions(fighter, situation) {
  const candidates = [];
  const style = fighter.style.primary;
  const styleWeights = STYLE_WEIGHTS[style];

  // Generate actions based on style preferences
  for (const [action, weight] of Object.entries(styleWeights)) {
    if (isValidAction(action, fighter, situation)) {
      candidates.push({
        action,
        baseWeight: weight,
        situationalWeight: calculateSituationalWeight(action, situation)
      });
    }
  }

  // Add reactive actions based on opponent
  if (situation.opponent.isHurt) {
    candidates.push({
      action: 'OFFENSIVE.COMBINATION',
      baseWeight: 0.5,
      situationalWeight: 1.5,
      reason: 'opponent_hurt'
    });
  }

  if (situation.self.isHurt) {
    candidates.push({
      action: 'CLINCH',
      baseWeight: 0.3,
      situationalWeight: 2.0,
      reason: 'survival'
    });
    candidates.push({
      action: 'DEFENSIVE.DISTANCE',
      baseWeight: 0.3,
      situationalWeight: 1.5,
      reason: 'survival'
    });
  }

  return candidates;
}
```

### Situational Weights

```javascript
function calculateSituationalWeight(action, situation) {
  let weight = 1.0;

  // Distance-based adjustments
  const distance = situation.distance;
  const optimalRange = situation.self.optimalRange;

  if (action.includes('OFFENSIVE')) {
    if (distance > optimalRange * 1.3) {
      weight *= 0.3; // Too far to attack
    } else if (distance < optimalRange * 0.6) {
      weight *= action.includes('JABBING') ? 0.5 : 1.2; // Inside favors hooks
    }
  }

  // Stamina adjustments
  if (situation.self.stamina.percent < 0.3) {
    if (action.includes('OFFENSIVE.COMBINATION')) weight *= 0.5;
    if (action === 'CLINCH') weight *= 1.5;
    if (action.includes('DEFENSIVE')) weight *= 1.3;
  }

  // Opponent state adjustments
  if (situation.opponent.isHurt) {
    if (action.includes('OFFENSIVE')) weight *= 1.5;
    if (action.includes('DEFENSIVE') || action === 'TIMING') weight *= 0.5;
  }

  // Position adjustments
  if (situation.self.position.inCorner) {
    if (action === 'CLINCH') weight *= 1.5;
    if (action.includes('MOVING')) weight *= 1.3;
    if (action.includes('OFFENSIVE.POWER')) weight *= 1.2; // Fight way out
  }

  if (situation.opponent.position.nearRopes || situation.opponent.position.inCorner) {
    if (action.includes('OFFENSIVE')) weight *= 1.3;
    if (action === 'MOVING.CUTTING_OFF') weight *= 0.5; // Already cornered
  }

  return weight;
}
```

---

## Action Selection

### Weighted Selection

```javascript
function selectAction(candidates, fighter) {
  // Calculate final weights
  const weightedCandidates = candidates.map(c => ({
    ...c,
    finalWeight: c.baseWeight * c.situationalWeight *
                 getFightIQModifier(fighter) *
                 getRandomVariance()
  }));

  // Sort by weight
  weightedCandidates.sort((a, b) => b.finalWeight - a.finalWeight);

  // Select (with some randomness based on fightIQ)
  const randomThreshold = (100 - fighter.technical.fightIQ) / 100;

  if (Math.random() < randomThreshold * 0.3) {
    // Sometimes pick second or third choice
    const index = Math.floor(Math.random() * Math.min(3, weightedCandidates.length));
    return weightedCandidates[index];
  }

  return weightedCandidates[0];
}

function getRandomVariance() {
  // Adds unpredictability
  return 0.85 + Math.random() * 0.3;
}
```

---

## Attribute Influence

### How Attributes Affect Decisions

```yaml
attribute_decision_influence:
  fightIQ:
    role: overall_decision_quality
    effects:
      - better_action_selection
      - recognizes_opportunities
      - avoids_mistakes
    low_fightIQ: predictable, misses_opportunities
    high_fightIQ: exploits_weaknesses, optimal_choices

  adaptability:
    role: mid_fight_adjustments
    effects:
      - changes_strategy_when_losing
      - identifies_what_works
      - counters_opponent_adjustments
    frequency: checks_every_2-3_rounds

  paceControl:
    role: energy_management
    effects:
      - knows_when_to_push
      - conserves_in_won_rounds
      - paces_for_distance
    low_paceControl: same_pace_regardless
    high_paceControl: perfect_energy_allocation

  composure:
    role: performance_under_pressure
    effects:
      - maintains_strategy_when_hurt
      - doesn't_panic_when_losing
      - focused_decision_making
    low_composure: erratic_when_pressured
    high_composure: ice_cold_execution

  killerInstinct:
    role: finishing_behavior
    effects:
      - aggression_when_opponent_hurt
      - goes_for_knockout
      - risks_more_for_finish
    low_killerInstinct: lets_opponents_recover
    high_killerInstinct: ruthless_finisher

  experience:
    role: veteran_awareness
    effects:
      - knows_dirty_tricks
      - handles_adversity
      - reads_opponents
      - better_pacing
    unlocks: veteran_moves at experience > 70
```

---

## Reactive Decision Making

### Event-Triggered Decisions

```javascript
const REACTIVE_DECISIONS = {
  // When opponent throws
  'opponent_jab': {
    counter_puncher: ['slip_and_counter', 0.7],
    out_boxer: ['parry_and_jab', 0.5],
    swarmer: ['block_and_close', 0.6]
  },

  // When opponent is hurt
  'opponent_hurt': {
    all_styles: ['go_for_finish', 'killerInstinct'],
    adjust_by: (fighter) => fighter.mental.killerInstinct / 100
  },

  // When self is hurt
  'self_hurt': {
    options: ['clinch', 'distance', 'survive'],
    weights: {
      clinch: 'clinchOffense * 0.02',
      distance: 'footSpeed * 0.015',
      survive: 'heart * 0.01'
    }
  },

  // When cornered
  'self_cornered': {
    options: ['clinch', 'fight_out', 'lateral_escape'],
    urgency: 'high'
  },

  // When opponent clinches
  'opponent_clinches': {
    options: ['accept_clinch', 'dirty_box', 'break_free'],
    depends_on: ['clinchDefense', 'clinchOffense', 'stamina']
  }
};
```

---

## Pattern Recognition

### Learning From Fight

```javascript
function updateFightLearning(fighter, event) {
  // Track what's working
  if (event.type === 'PUNCH_LANDED' && event.attacker === fighter.id) {
    fighter.fightMemory.successfulActions.push({
      action: event.punch.type,
      context: event.context,
      damage: event.damage
    });
  }

  // Track what opponent does
  if (event.attacker === fighter.opponent.id) {
    fighter.fightMemory.opponentPatterns.push({
      situation: event.context,
      action: event.action,
      timing: event.timestamp
    });
  }

  // Periodically analyze (based on adaptability)
  if (shouldAnalyze(fighter)) {
    const insights = analyzePatterns(fighter.fightMemory);
    applyInsights(fighter, insights);
  }
}

function analyzePatterns(memory) {
  return {
    opponent_leads_with: getMostCommonLead(memory.opponentPatterns),
    opponent_defensive_tendency: getDefensiveTendency(memory.opponentPatterns),
    my_successful_attacks: getSuccessfulAttacks(memory.successfulActions),
    my_unsuccessful_attacks: getBlockedAttacks(memory.successfulActions)
  };
}
```

---

## Combination Selection

### Choosing Combinations

```javascript
function selectCombination(fighter, situation) {
  const combos = COMBINATION_LIBRARY[fighter.style.primary];
  const distance = situation.distance;
  const opponentState = situation.opponent.state;

  // Filter by range
  const validCombos = combos.filter(c =>
    isValidRange(c.requiredRange, distance, fighter.reach)
  );

  // Weight by situation
  const weighted = validCombos.map(combo => ({
    combo,
    weight: calculateComboWeight(combo, situation, fighter)
  }));

  // Select
  return selectWeighted(weighted);
}

const COMBINATION_LIBRARY = {
  'out-boxer': [
    { punches: ['jab', 'jab', 'cross'], requiredRange: 'long' },
    { punches: ['jab', 'cross'], requiredRange: 'medium' },
    { punches: ['jab', 'jab'], requiredRange: 'long' }
  ],

  'swarmer': [
    { punches: ['jab', 'cross', 'lead_hook', 'cross'], requiredRange: 'medium' },
    { punches: ['lead_body_hook', 'lead_hook'], requiredRange: 'close' },
    { punches: ['jab', 'lead_body_hook', 'lead_hook', 'cross'], requiredRange: 'medium' }
  ],

  'inside-fighter': [
    { punches: ['lead_hook', 'rear_uppercut', 'lead_hook'], requiredRange: 'close' },
    { punches: ['lead_body_hook', 'lead_body_hook', 'lead_hook'], requiredRange: 'close' },
    { punches: ['rear_uppercut', 'lead_hook'], requiredRange: 'close' }
  ]
  // ... more styles
};
```

---

## Implementation Notes

### Decision State Object

```javascript
const fighterDecision = {
  timestamp: 156.5,

  assessment: {
    self: { /* self assessment */ },
    opponent: { /* opponent assessment */ },
    context: { /* round/score context */ }
  },

  candidates: [
    { action: 'OFFENSIVE.COMBINATION', weight: 0.45 },
    { action: 'OFFENSIVE.JABBING', weight: 0.32 },
    { action: 'TIMING', weight: 0.23 }
  ],

  selected: {
    action: 'OFFENSIVE.COMBINATION',
    reason: 'opponent_hurt_and_cornered',
    confidence: 0.85
  },

  fightMemory: {
    landedPunches: 45,
    takenPunches: 32,
    successfulPatterns: ['jab_cross_hook'],
    opponentWeakness: 'slow_to_block_body'
  }
};
```
