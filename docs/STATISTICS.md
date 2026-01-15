# Statistics System

This document defines what statistics are tracked during fights, how they are calculated, and the format for post-fight reports.

## Statistics Overview

### Core Concept

```yaml
statistics:
  description: |
    Comprehensive tracking of all fight metrics for analysis,
    scoring support, and post-fight reporting.

  categories:
    punch_stats: landed, thrown, accuracy by type
    damage_stats: damage dealt, received, knockdowns
    defense_stats: blocks, slips, evasions
    activity_stats: work rate, pressure, clinching
    position_stats: ring control, time in zones
    round_stats: per-round breakdowns

  uses:
    - judge_scoring_support
    - ai_decision_input
    - post_fight_analysis
    - historical_comparison
    - display_and_commentary
```

---

## Punch Statistics

### Basic Punch Tracking

```yaml
punch_tracking:
  categories:
    total:
      thrown: all_punches_attempted
      landed: all_punches_connected
      accuracy: landed / thrown

    jabs:
      thrown: jab_attempts
      landed: jab_connects
      accuracy: jab_landed / jab_thrown

    power_punches:
      includes: [cross, hooks, uppercuts]
      thrown: power_attempts
      landed: power_connects
      accuracy: power_landed / power_thrown

    body_punches:
      thrown: body_attempts
      landed: body_connects
      accuracy: body_landed / body_thrown

    head_punches:
      thrown: head_attempts
      landed: head_connects
      accuracy: head_landed / head_thrown

  per_punch_type:
    - jab
    - cross
    - lead_hook
    - rear_hook
    - lead_uppercut
    - rear_uppercut
    - body_jab
    - body_cross
    - body_hook_lead
    - body_hook_rear
```

### Punch Quality Tracking

```yaml
punch_quality:
  clean_punches:
    definition: unblocked_unpartially_blocked
    tracking: count and percentage

  partial_connects:
    definition: partially_blocked_or_glancing
    tracking: count (contributes to landed)

  blocked_punches:
    definition: fully_blocked
    tracking: count (not in landed)

  missed_punches:
    definition: evaded_or_missed
    tracking: count (not in landed)

  power_shots:
    definition: landed_with_significant_force
    threshold: damage > base_damage * 0.8
    tracking: subset of landed

  flush_hits:
    definition: perfect_contact_on_target
    tracking: subset of clean punches
```

### Punch Statistics Object

```javascript
const punchStats = {
  total: {
    thrown: 456,
    landed: 187,
    accuracy: 0.410,
    clean: 142,
    partial: 45,
    blocked: 189,
    missed: 80
  },

  jabs: {
    thrown: 245,
    landed: 112,
    accuracy: 0.457,
    clean: 89,
    partial: 23
  },

  powerPunches: {
    thrown: 211,
    landed: 75,
    accuracy: 0.355,
    clean: 53,
    partial: 22,
    breakdown: {
      cross: { thrown: 78, landed: 28, accuracy: 0.359 },
      leadHook: { thrown: 45, landed: 18, accuracy: 0.400 },
      rearHook: { thrown: 38, landed: 12, accuracy: 0.316 },
      leadUppercut: { thrown: 22, landed: 9, accuracy: 0.409 },
      rearUppercut: { thrown: 28, landed: 8, accuracy: 0.286 }
    }
  },

  bodyPunches: {
    thrown: 89,
    landed: 45,
    accuracy: 0.506,
    clean: 38,
    partial: 7
  },

  headPunches: {
    thrown: 367,
    landed: 142,
    accuracy: 0.387,
    clean: 104,
    partial: 38
  },

  combinations: {
    attempted: 67,
    completed: 41,
    averageLength: 3.2,
    longestCompleted: 6
  }
};
```

---

## Damage Statistics

### Damage Tracking

```yaml
damage_tracking:
  dealt:
    total: sum_of_all_damage_dealt
    head: head_damage_dealt
    body: body_damage_dealt
    per_round: array of per-round totals

  received:
    total: sum_of_all_damage_received
    head: head_damage_received
    body: body_damage_received
    per_round: array of per-round totals

  knockdowns:
    caused: knockdowns_scored
    received: knockdowns_suffered
    rounds_with_knockdowns: [3, 7]

  significant_strikes:
    definition: damage > 15 or knockdown threat
    count: number landed
```

### Damage Statistics Object

```javascript
const damageStats = {
  dealt: {
    total: 342,
    head: 245,
    body: 97,
    perRound: [32, 28, 45, 22, 35, 38, 52, 41, 28, 21],
    average: 34.2
  },

  received: {
    total: 198,
    head: 142,
    body: 56,
    perRound: [18, 22, 15, 25, 19, 21, 18, 22, 20, 18],
    average: 19.8
  },

  knockdowns: {
    caused: 2,
    received: 0,
    details: [
      { round: 3, time: 95.5, punch: 'left_hook', recovery: 8 },
      { round: 7, time: 142.0, punch: 'right_cross', recovery: 7 }
    ]
  },

  significantStrikes: {
    landed: 23,
    received: 8
  },

  damageRatio: 1.73  // dealt / received
};
```

---

## Defensive Statistics

### Defense Tracking

```yaml
defense_tracking:
  punches_faced:
    total: punches_opponent_threw_at_fighter
    evaded: punches_completely_avoided
    blocked: punches_blocked
    parried: punches_deflected
    taken: punches_that_landed

  evasion_types:
    slips: head_movement_evasions
    ducks: under_punch_evasions
    leans: lean_back_evasions
    footwork: footwork_evasions

  blocking:
    high_guard_blocks: blocks_in_high_guard
    shell_blocks: shoulder_roll_blocks
    arm_blocks: active_arm_blocks

  defensive_rate:
    formula: (evaded + blocked + parried) / punches_faced
```

### Defensive Statistics Object

```javascript
const defenseStats = {
  punchesFaced: {
    total: 312,
    evaded: 82,
    blocked: 112,
    parried: 20,
    landed: 98
  },

  evasionBreakdown: {
    slips: 42,
    ducks: 18,
    leans: 12,
    footwork: 10
  },

  blockingBreakdown: {
    highGuard: 65,
    shellBlocks: 28,
    activeArm: 19
  },

  rates: {
    evasionRate: 0.263,      // evaded / faced
    blockRate: 0.359,         // blocked / faced
    defenseRate: 0.686,       // (evaded + blocked + parried) / faced
    hitRate: 0.314            // landed / faced
  },

  cleanHitsTaken: 72,         // Unblocked punches
  cleanHitRate: 0.231         // clean / faced
};
```

---

## Activity Statistics

### Work Rate Tracking

```yaml
activity_tracking:
  punches_per_round:
    thrown: average punches thrown per round
    landed: average punches landed per round

  output_minutes:
    thrown_per_minute: punches_thrown / fight_minutes
    landed_per_minute: punches_landed / fight_minutes

  activity_phases:
    high_activity: seconds in high output (>1 punch/sec)
    low_activity: seconds in low output
    inactive: seconds with no punches

  pressure:
    forward_movement_time: seconds moving forward
    backward_movement_time: seconds moving backward
    pressure_score: aggregate pressure metric
```

### Activity Statistics Object

```javascript
const activityStats = {
  punchesPerRound: {
    thrown: 45.6,
    landed: 18.7
  },

  outputPerMinute: {
    thrown: 15.2,
    landed: 6.2
  },

  activityPhases: {
    highActivity: 420,      // seconds
    lowActivity: 680,
    inactive: 700
  },

  pressure: {
    forwardTime: 820,       // seconds
    backwardTime: 340,
    pressureScore: 72       // 0-100 scale
  },

  clinching: {
    initiated: 12,
    received: 8,
    totalTime: 45           // seconds
  },

  workRate: {
    overall: 68,            // 0-100 scale
    perRound: [72, 68, 75, 62, 70, 65, 72, 68, 65, 63]
  }
};
```

---

## Position Statistics

### Ring Position Tracking

```yaml
position_tracking:
  zones:
    center: time in center zone
    mid_ring: time in mid-ring area
    ropes: time against ropes
    corners: time in corners

  ring_control:
    controlled_center_time: time controlling center
    cut_off_success: successful ring cuts
    escape_success: successful escapes

  distance:
    average_distance: mean distance from opponent
    optimal_range_time: time at fighter's optimal range
    too_close_time: time closer than optimal
    too_far_time: time farther than optimal
```

### Position Statistics Object

```javascript
const positionStats = {
  zones: {
    center: 680,            // seconds
    midRing: 520,
    ropes: 420,
    corners: 180
  },

  ringControl: {
    centerControlled: 580,  // seconds where you owned center
    cutOffSuccess: 23,      // successful ring cuts
    cutOffAttempts: 31,
    escapeSuccess: 15,
    escapeAttempts: 22
  },

  distance: {
    average: 4.2,           // feet
    optimalRangeTime: 720,  // seconds at optimal
    tooCloseTime: 380,
    tooFarTime: 700
  },

  positioning: {
    advantageTime: 850,     // seconds with position advantage
    disadvantageTime: 450,
    neutralTime: 500
  },

  ringGeneralship: 74       // 0-100 composite score
};
```

---

## Round Statistics

### Per-Round Tracking

```javascript
const roundStats = {
  round: 5,

  punches: {
    A: { thrown: 48, landed: 21, accuracy: 0.438 },
    B: { thrown: 35, landed: 14, accuracy: 0.400 }
  },

  powerPunches: {
    A: { thrown: 22, landed: 8, accuracy: 0.364 },
    B: { thrown: 18, landed: 6, accuracy: 0.333 }
  },

  damage: {
    A: { dealt: 35, received: 22 },
    B: { dealt: 22, received: 35 }
  },

  knockdowns: {
    A: 0,
    B: 1
  },

  control: {
    ringControl: 'A',       // Who controlled ring
    pressureWinner: 'A',    // Who applied more pressure
    activityWinner: 'A'     // Who was more active
  },

  time: {
    fightingTime: 172,      // seconds of actual fighting
    clinchTime: 8,
    knockdownTime: 0        // Time spent on knockdown counts
  },

  scoring: {
    cleanPunchingWinner: 'A',
    effectiveAggressionWinner: 'A',
    ringGeneralshipWinner: 'A',
    defenseWinner: 'B',
    projectedScores: { A: 10, B: 9 }
  }
};
```

### Round History

```javascript
const roundHistory = [
  {
    round: 1,
    stats: { /* full round stats */ },
    scores: {
      judge1: { A: 10, B: 9 },
      judge2: { A: 10, B: 9 },
      judge3: { A: 9, B: 10 }
    },
    events: ['round_start', 'knockdown_A', 'round_end'],
    winner: 'A',
    margin: 'clear'
  },
  // ... more rounds
];
```

---

## Calculation Functions

### Accuracy Calculation

```javascript
function calculateAccuracy(stats, type = 'total') {
  let thrown, landed;

  switch (type) {
    case 'total':
      thrown = stats.total.thrown;
      landed = stats.total.landed;
      break;
    case 'jabs':
      thrown = stats.jabs.thrown;
      landed = stats.jabs.landed;
      break;
    case 'power':
      thrown = stats.powerPunches.thrown;
      landed = stats.powerPunches.landed;
      break;
    case 'body':
      thrown = stats.bodyPunches.thrown;
      landed = stats.bodyPunches.landed;
      break;
    default:
      return 0;
  }

  return thrown > 0 ? landed / thrown : 0;
}
```

### Effective Aggression Score

```javascript
function calculateEffectiveAggression(stats) {
  const forwardTime = stats.position.pressure.forwardTime;
  const totalTime = stats.fightDuration;
  const punchesWhileMovingForward = stats.punchesWhileAdvancing;
  const landed = stats.punches.total.landed;

  // Forward time component (0-40 points)
  const forwardScore = (forwardTime / totalTime) * 40;

  // Landing while pressing (0-40 points)
  const effectivenessRatio = punchesWhileMovingForward > 0
    ? landed / punchesWhileMovingForward
    : 0;
  const effectivenessScore = effectivenessRatio * 40;

  // Pure output bonus (0-20 points)
  const outputScore = Math.min(stats.workRate.overall / 5, 20);

  return Math.round(forwardScore + effectivenessScore + outputScore);
}
```

### Ring Generalship Score

```javascript
function calculateRingGeneralship(stats) {
  const centerControl = stats.position.ringControl.centerControlled;
  const totalTime = stats.fightDuration;
  const cutOffSuccess = stats.position.ringControl.cutOffSuccess;
  const cutOffAttempts = stats.position.ringControl.cutOffAttempts;
  const optimalRangeTime = stats.position.distance.optimalRangeTime;

  // Center control (0-35 points)
  const centerScore = (centerControl / totalTime) * 35;

  // Cut off efficiency (0-30 points)
  const cutOffRate = cutOffAttempts > 0
    ? cutOffSuccess / cutOffAttempts
    : 0;
  const cutOffScore = cutOffRate * 30;

  // Distance management (0-35 points)
  const distanceScore = (optimalRangeTime / totalTime) * 35;

  return Math.round(centerScore + cutOffScore + distanceScore);
}
```

### Defense Score

```javascript
function calculateDefenseScore(stats) {
  const evasionRate = stats.defense.rates.evasionRate;
  const blockRate = stats.defense.rates.blockRate;
  const cleanHitRate = stats.defense.cleanHitRate;

  // Evasion component (0-40 points) - most valued
  const evasionScore = evasionRate * 40;

  // Blocking component (0-30 points)
  const blockScore = blockRate * 30;

  // Clean hit penalty (0-30 points, inverse)
  const cleanHitScore = (1 - cleanHitRate) * 30;

  return Math.round(evasionScore + blockScore + cleanHitScore);
}
```

---

## Post-Fight Report

### Report Structure

```yaml
post_fight_report:
  sections:
    header:
      - fight_result
      - final_scorecards
      - round_stopped (if applicable)

    summary:
      - winner_determination
      - key_statistics_comparison
      - fight_narrative

    detailed_stats:
      - total_punches
      - jabs
      - power_punches
      - body_punches
      - accuracy_comparison
      - knockdowns

    round_by_round:
      - each_round_stats
      - round_winners
      - scoring_progression

    advanced_metrics:
      - effective_aggression
      - ring_generalship
      - defense_ratings
      - damage_efficiency

    highlights:
      - key_moments
      - turning_points
      - biggest_punches
```

### Report Generation

```javascript
function generatePostFightReport(fight, result) {
  return {
    header: {
      fighters: {
        A: fight.fighterA.name,
        B: fight.fighterB.name
      },
      result: {
        winner: result.winner,
        method: result.method,
        round: result.round,
        time: result.time
      },
      scorecards: result.scorecards
    },

    summary: generateFightSummary(fight, result),

    compubox: generateCompuboxStyle(fight),

    roundByRound: fight.roundHistory.map(generateRoundSummary),

    advancedMetrics: {
      A: calculateAdvancedMetrics(fight, 'A'),
      B: calculateAdvancedMetrics(fight, 'B')
    },

    highlights: extractHighlights(fight),

    analysis: generateFightAnalysis(fight, result)
  };
}
```

### Compubox-Style Output

```javascript
function generateCompuboxStyle(fight) {
  const statsA = fight.fighterA.stats;
  const statsB = fight.fighterB.stats;

  return {
    totalPunches: {
      A: { thrown: statsA.punches.total.thrown, landed: statsA.punches.total.landed },
      B: { thrown: statsB.punches.total.thrown, landed: statsB.punches.total.landed }
    },
    jabs: {
      A: { thrown: statsA.punches.jabs.thrown, landed: statsA.punches.jabs.landed },
      B: { thrown: statsB.punches.jabs.thrown, landed: statsB.punches.jabs.landed }
    },
    powerPunches: {
      A: { thrown: statsA.punches.powerPunches.thrown, landed: statsA.punches.powerPunches.landed },
      B: { thrown: statsB.punches.powerPunches.thrown, landed: statsB.punches.powerPunches.landed }
    },
    percentages: {
      A: {
        total: (statsA.punches.total.landed / statsA.punches.total.thrown * 100).toFixed(1),
        jabs: (statsA.punches.jabs.landed / statsA.punches.jabs.thrown * 100).toFixed(1),
        power: (statsA.punches.powerPunches.landed / statsA.punches.powerPunches.thrown * 100).toFixed(1)
      },
      B: {
        total: (statsB.punches.total.landed / statsB.punches.total.thrown * 100).toFixed(1),
        jabs: (statsB.punches.jabs.landed / statsB.punches.jabs.thrown * 100).toFixed(1),
        power: (statsB.punches.powerPunches.landed / statsB.punches.powerPunches.thrown * 100).toFixed(1)
      }
    }
  };
}
```

---

## CLI Display Format

### Live Statistics Display

```
═══════════════════════════════════════════════════════════════════
                         ROUND 7 STATISTICS
═══════════════════════════════════════════════════════════════════

                    MARTINEZ              JOHNSON
TOTAL PUNCHES       187/456 (41%)         98/312 (31%)
JABS                112/245 (46%)         52/178 (29%)
POWER PUNCHES       75/211 (36%)          46/134 (34%)
BODY SHOTS          45/89 (51%)           28/67 (42%)

KNOCKDOWNS          2                     0
DAMAGE DEALT        342                   198

═══════════════════════════════════════════════════════════════════
```

### Post-Fight Report Display

```
╔═══════════════════════════════════════════════════════════════════╗
║                    OFFICIAL FIGHT STATISTICS                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  RESULT: Roberto Martinez def. James Johnson                       ║
║  METHOD: TKO (Referee Stoppage) - Round 8, 2:35                   ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════╣
║                    MARTINEZ          JOHNSON                       ║
╠═══════════════════════════════════════════════════════════════════╣
║  TOTAL PUNCHES     187/456 (41%)    98/312 (31%)                  ║
║  JABS              112/245 (46%)    52/178 (29%)                  ║
║  POWER PUNCHES     75/211 (36%)     46/134 (34%)                  ║
║  BODY PUNCHES      45/89 (51%)      28/67 (42%)                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  KNOCKDOWNS        2                 0                             ║
║  CLEAN HITS        142               72                            ║
╠═══════════════════════════════════════════════════════════════════╣
║  RING CONTROL      65%               35%                           ║
║  AGGRESSION        72                58                            ║
║  DEFENSE RATING    78                62                            ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  KEY MOMENTS:                                                      ║
║  • Round 3: Martinez scores knockdown with left hook               ║
║  • Round 5: Johnson briefly hurts Martinez to body                 ║
║  • Round 7: Second knockdown, Martinez dominant                    ║
║  • Round 8: Referee stoppage after sustained punishment            ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Implementation Notes

### Statistics State Object

```javascript
const fightStatistics = {
  fighterA: {
    punches: { /* punch stats */ },
    damage: { /* damage stats */ },
    defense: { /* defense stats */ },
    activity: { /* activity stats */ },
    position: { /* position stats */ }
  },

  fighterB: {
    punches: { /* punch stats */ },
    damage: { /* damage stats */ },
    defense: { /* defense stats */ },
    activity: { /* activity stats */ },
    position: { /* position stats */ }
  },

  rounds: [ /* round history */ ],

  derived: {
    effectiveAggression: { A: 72, B: 58 },
    ringGeneralship: { A: 74, B: 52 },
    defenseRating: { A: 78, B: 62 }
  },

  metadata: {
    fightDuration: 1800,    // seconds (if full 10 rounds)
    actualDuration: 1455,   // actual fight time
    roundsCompleted: 8
  }
};
```

### Stat Update Function

```javascript
function updateStatistics(stats, event) {
  const fighter = event.fighterId;
  const opponent = getOpponent(fighter);

  switch (event.type) {
    case 'PUNCH_THROWN':
      stats[fighter].punches.total.thrown++;
      stats[fighter].punches[event.punchCategory].thrown++;
      break;

    case 'PUNCH_LANDED':
      stats[fighter].punches.total.landed++;
      stats[fighter].punches[event.punchCategory].landed++;
      if (event.clean) {
        stats[fighter].punches.total.clean++;
      }
      stats[fighter].damage.dealt.total += event.damage;
      stats[opponent].damage.received.total += event.damage;
      break;

    case 'PUNCH_BLOCKED':
      stats[opponent].defense.punchesFaced.blocked++;
      break;

    case 'PUNCH_EVADED':
      stats[opponent].defense.punchesFaced.evaded++;
      stats[opponent].defense.evasionBreakdown[event.evasionType]++;
      break;

    case 'KNOCKDOWN':
      stats[fighter].damage.knockdowns.caused++;
      stats[opponent].damage.knockdowns.received++;
      break;

    // ... more event types
  }

  // Recalculate derived stats
  recalculateDerivedStats(stats);
}
```
