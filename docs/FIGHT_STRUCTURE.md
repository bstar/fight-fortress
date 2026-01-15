# Fight Structure

This document defines the structure of a boxing match including rounds, time, knockdown rules, referee behavior, stoppage conditions, and fight flow.

## Fight Configuration

### Fight Types

```yaml
fight_types:
  championship:
    rounds: 12
    round_duration: 180 seconds (3 minutes)
    rest_duration: 60 seconds (1 minute)
    title_on_line: true

  non_title:
    rounds: 10
    round_duration: 180 seconds
    rest_duration: 60 seconds

  eight_rounder:
    rounds: 8
    round_duration: 180 seconds
    rest_duration: 60 seconds
    typical_use: co_main_events

  six_rounder:
    rounds: 6
    round_duration: 180 seconds
    rest_duration: 60 seconds
    typical_use: undercard

  four_rounder:
    rounds: 4
    round_duration: 180 seconds
    rest_duration: 60 seconds
    typical_use: debut_fights

  women:
    rounds: 10 # Championship (some 12)
    round_duration: 120 seconds (2 minutes)
    rest_duration: 60 seconds
```

### Fight Configuration Object

```javascript
const fightConfig = {
  type: 'championship',
  rounds: 12,
  roundDuration: 180,
  restDuration: 60,

  rules: {
    knockdownRule: 'three_knockdowns', // or 'none'
    standingEightCount: false,
    mandatoryEightCount: true,
    saveByTheBell: { round1: false, otherRounds: true }
  },

  location: {
    venue: "MGM Grand",
    city: "Las Vegas",
    homeFighter: null
  },

  sanctioning: ['WBA', 'WBC'], // Multiple belts possible

  simulation: {
    tickRate: 0.5, // seconds per tick
    speedMultiplier: 1.0
  }
};
```

---

## Round Structure

### Round Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND START                             │
│                     (Bell rings at 0:00)                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ACTIVE FIGHTING                          │
│                    (0:00 - 3:00 / 2:00)                         │
│                                                                 │
│  • Fighters in ring                                             │
│  • Simulation ticks every 0.5s                                  │
│  • Referee monitors                                             │
│  • Knockdowns processed                                         │
│  • Damage/stamina updated                                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │   KO     │      │   TKO    │      │ BELL     │
        │ STOPPAGE │      │ STOPPAGE │      │ (Round   │
        │          │      │          │      │  Ends)   │
        └──────────┘      └──────────┘      └────┬─────┘
                                                 │
                                                 ▼
                          ┌─────────────────────────────────────┐
                          │            REST PERIOD              │
                          │           (60 seconds)              │
                          │                                     │
                          │  • Corner work                      │
                          │  • Stamina recovery                 │
                          │  • Damage assessment                │
                          │  • Strategy adjustments             │
                          │  • Cutman treatment                 │
                          └─────────────────────────────────────┘
                                                 │
                                                 ▼
                          ┌─────────────────────────────────────┐
                          │         NEXT ROUND / DECISION       │
                          └─────────────────────────────────────┘
```

### Round Events

```javascript
const roundEvents = {
  ROUND_START: {
    timestamp: 0,
    actions: [
      'reset_fighter_positions',
      'clear_round_stats',
      'referee_instructions'
    ]
  },

  TEN_SECONDS: {
    timestamp: 170, // 10 seconds remaining
    actions: ['clapper_warning']
  },

  ROUND_END: {
    timestamp: 180,
    actions: [
      'bell_rings',
      'separate_fighters',
      'finalize_round_stats',
      'judge_scoring',
      'begin_rest_period'
    ]
  }
};
```

---

## Knockdown Rules

### Knockdown Processing

```yaml
knockdown_processing:
  detection:
    trigger: damage_exceeds_knockdown_threshold
    OR: flash_knockdown_roll_succeeds

  sequence:
    1. fighter_goes_down
    2. referee_starts_count
    3. opponent_sent_to_neutral_corner
    4. count_progresses (1 per second)
    5. recovery_checks at counts 4, 8, 9
    6. outcome: recovered OR knockout

  mandatory_eight_count:
    enabled: most_jurisdictions
    effect: even_if_fighter_rises_early_count_reaches_8
    purpose: assess_fighter_fitness
```

### Three Knockdown Rule

```yaml
three_knockdown_rule:
  description: |
    Three knockdowns in a single round results in automatic TKO.
    Not universal - varies by jurisdiction.

  jurisdictions:
    nevada: disabled
    new_york: enabled
    uk: enabled
    mexico: enabled

  implementation:
    count: knockdowns_this_round
    trigger: count >= 3
    result: TKO (three_knockdown_rule)
```

### Knockdown Count

```javascript
function processKnockdown(fighter, knockdown) {
  const count = {
    current: 0,
    maxReached: 0,
    recovered: false,
    knockoutType: null
  };

  // Count from 1 to 10
  for (let i = 1; i <= 10; i++) {
    count.current = i;

    // Check recovery at key counts
    if (i >= 4) {
      const canRecover = checkRecovery(fighter, knockdown, i);

      if (canRecover && i >= 8) {
        // Mandatory 8 count satisfied
        count.recovered = true;
        count.maxReached = i;
        break;
      }
    }

    // Emit count event
    emitEvent('KNOCKDOWN_COUNT', { count: i, fighter: fighter.id });
  }

  if (!count.recovered) {
    count.knockoutType = 'KO';
    count.maxReached = 10;
  }

  return count;
}
```

---

## Stoppage Conditions

### Knockout (KO)

```yaml
knockout:
  definition: fighter_cannot_beat_10_count
  types:
    standard_ko:
      trigger: failed_to_rise_by_10
      immediate: fight_over
    flash_ko:
      trigger: unconscious_before_hitting_canvas
      immediate: no_count_needed
    standing_ko:
      trigger: out_on_feet_referee_stops
      immediate: fight_over
```

### Technical Knockout (TKO)

```yaml
tko_conditions:
  referee_stoppage:
    description: referee_determines_fighter_cannot_continue
    triggers:
      - taking_sustained_punishment
      - not_intelligently_defending
      - severely_hurt_and_vulnerable
    requires: professional_judgment

  corner_stoppage:
    description: corner_throws_in_towel
    triggers:
      - fighter_badly_hurt
      - corner_decision_to_protect_fighter
    result: TKO (corner_stoppage)

  doctor_stoppage:
    description: ringside_doctor_stops_fight
    triggers:
      - severe_cut_affecting_vision
      - dangerous_swelling
      - injury_preventing_continuation
    result: TKO (medical_stoppage)

  three_knockdown_rule:
    description: third_knockdown_in_round (where applicable)
    result: TKO (three_knockdown_rule)

  injury:
    description: fighter_cannot_continue_due_to_injury
    result: TKO (injury)
```

### TKO Detection

```javascript
function checkTKOConditions(fighter, opponent, roundStats) {
  const conditions = [];

  // Sustained punishment
  if (roundStats.cleanHitsTaken[fighter.id] > 30 &&
      fighter.state === 'HURT' &&
      fighter.hurtDuration > 10) {
    conditions.push({
      type: 'sustained_punishment',
      confidence: 0.7 + (roundStats.cleanHitsTaken[fighter.id] - 30) * 0.01
    });
  }

  // Not defending
  if (fighter.state === 'HURT' &&
      roundStats.punchesBlocked[fighter.id] / roundStats.punchesReceived[fighter.id] < 0.2) {
    conditions.push({
      type: 'not_defending',
      confidence: 0.6
    });
  }

  // Multiple knockdowns
  if (roundStats.knockdowns[fighter.id] >= 2) {
    conditions.push({
      type: 'multiple_knockdowns',
      confidence: 0.5 + roundStats.knockdowns[fighter.id] * 0.2
    });
  }

  // Severe cut
  const worstCut = getWorstCut(fighter);
  if (worstCut && worstCut.severity >= 3) {
    conditions.push({
      type: 'severe_cut',
      confidence: worstCut.severity * 0.25
    });
  }

  return conditions;
}
```

---

## Referee Behavior

### Referee Actions

```yaml
referee_actions:
  break_clinch:
    trigger: clinch_duration > 3-5 seconds
    action: verbal_command, then_physical_break
    timing: varies_by_referee_tolerance

  standing_eight_count:
    trigger: fighter_badly_hurt_but_standing
    action: stops_action, counts_to_8
    jurisdictions: not_all (varies)

  point_deduction:
    triggers:
      - repeated_holding
      - low_blows
      - head_butts
      - rabbit_punches
    sequence: warning → warning → point → possible_DQ

  stoppage_consideration:
    continuous_assessment: true
    factors:
      - fighter_defense_quality
      - punishment_being_taken
      - recovery_likelihood
      - safety_first

  neutral_corner:
    trigger: knockdown
    action: send_standing_fighter_to_corner
    purpose: allow_clean_count
```

### Referee Configuration

```javascript
const referee = {
  name: "Kenny Bayless",

  tendencies: {
    clinchTolerance: 4.5,        // seconds before breaking
    stoppageThreshold: 0.7,     // 0-1 (higher = lets more go)
    warningFrequency: 0.6,      // How often warns vs points
    countSpeed: 1.0             // Seconds per count
  },

  rules: {
    standingEightCount: false,
    mandatoryEightCount: true,
    threeKnockdownRule: false
  }
};
```

---

## Fight Flow

### Complete Fight Sequence

```javascript
async function simulateFight(fighterA, fighterB, config) {
  const fight = initializeFight(fighterA, fighterB, config);

  // Pre-fight
  emitEvent('FIGHT_START', { fighterA, fighterB });

  for (let round = 1; round <= config.rounds; round++) {
    // Round start
    emitEvent('ROUND_START', { round });
    resetForRound(fight, round);

    // Simulate round
    const roundResult = await simulateRound(fight, round, config);

    // Check for stoppage
    if (roundResult.stoppage) {
      return finalizeFight(fight, roundResult);
    }

    // Round end
    emitEvent('ROUND_END', { round, stats: roundResult.stats });

    // Score round
    scoreRound(fight.judges, roundResult.stats);

    // Rest period (if not final round)
    if (round < config.rounds) {
      await simulateRestPeriod(fight);
    }
  }

  // Fight went to decision
  return finalizeDecision(fight);
}

async function simulateRound(fight, roundNumber, config) {
  const roundStats = initializeRoundStats();
  let time = 0;
  const duration = config.roundDuration;
  const tickRate = config.simulation.tickRate;

  while (time < duration) {
    // Simulate tick
    const tickResult = simulateTick(fight, time, roundStats);

    // Check for knockdown
    if (tickResult.knockdown) {
      const kdResult = processKnockdown(tickResult.knockdown);
      if (!kdResult.recovered) {
        return { stoppage: true, type: 'KO', time, round: roundNumber };
      }
      // Resume after knockdown
      roundStats.knockdowns[tickResult.knockdown.fighter]++;
    }

    // Check for TKO
    const tkoCheck = checkTKOConditions(fight, roundStats);
    if (tkoCheck.shouldStop) {
      return { stoppage: true, type: 'TKO', reason: tkoCheck.reason, time };
    }

    // 10-second warning
    if (Math.abs(time - (duration - 10)) < tickRate) {
      emitEvent('TEN_SECOND_WARNING');
    }

    time += tickRate;
  }

  return { stoppage: false, stats: roundStats };
}
```

---

## Between Rounds

### Rest Period Activities

```yaml
rest_period:
  duration: 60 seconds

  timeline:
    0-15s:
      - fighter_sits_on_stool
      - water_administered
      - initial_assessment

    15-40s:
      - cut_treatment (if needed)
      - swelling_treatment (enswell)
      - breathing_recovery

    40-55s:
      - corner_instructions
      - strategy_adjustments
      - mouthpiece_check

    55-60s:
      - seconds_out_called
      - fighter_stands
      - stool_removed
      - bell_ready

  recovery:
    stamina: see_STAMINA_SYSTEM.md
    damage: see_DAMAGE_MODEL.md
    mental: confidence_can_shift
```

### Rest Period Simulation

```javascript
function simulateRestPeriod(fight) {
  const duration = 60;

  for (const fighter of [fight.fighterA, fight.fighterB]) {
    // Stamina recovery
    const staminaRecovered = calculateBetweenRoundRecovery(fighter);
    fighter.currentStamina = Math.min(
      fighter.maxStamina,
      fighter.currentStamina + staminaRecovered
    );

    // Damage recovery (minimal)
    fighter.headDamage *= 0.9; // 10% recovery
    fighter.bodyDamage *= 0.95; // 5% recovery

    // Cut treatment
    if (fighter.cuts.length > 0) {
      treatCuts(fighter, fighter.corner.cutman);
    }

    // Swelling treatment
    if (fighter.swelling.length > 0) {
      treatSwelling(fighter, fighter.corner.cutman);
    }

    // Corner advice
    const advice = generateCornerAdvice(fighter, fight);
    applyCornerAdvice(fighter, advice);
  }

  emitEvent('REST_PERIOD_END');
}
```

---

## Fight Results

### Result Types

```yaml
results:
  ko:
    description: Knockout
    format: "KO R{round} {time}"
    example: "KO R7 2:35"

  tko:
    description: Technical Knockout
    subtypes:
      - "TKO (referee stoppage)"
      - "TKO (corner stoppage)"
      - "TKO (doctor stoppage)"
      - "TKO (injury)"
      - "TKO (three knockdown rule)"
    format: "TKO R{round} {time}"

  decision:
    subtypes:
      - "UD" (Unanimous Decision)
      - "SD" (Split Decision)
      - "MD" (Majority Decision)
    format: "{type} ({scores})"
    example: "UD (116-112, 115-113, 116-112)"

  draw:
    subtypes:
      - "UD" (Unanimous Draw)
      - "MD" (Majority Draw)
      - "SD" (Split Draw)

  no_contest:
    trigger: accidental_foul_before_4_rounds
    abbreviation: NC

  disqualification:
    trigger: intentional_foul_or_repeated_fouls
    abbreviation: DQ
```

### Fight Result Object

```javascript
const fightResult = {
  winner: 'A', // or 'B' or null (draw)
  method: 'TKO',
  methodDetail: 'referee_stoppage',
  round: 8,
  time: '1:45',

  stats: {
    fighterA: {
      punchesThrown: 456,
      punchesLanded: 187,
      accuracy: 0.41,
      knockdowns: 2
    },
    fighterB: {
      punchesThrown: 312,
      punchesLanded: 98,
      accuracy: 0.31,
      knockdowns: 0
    }
  },

  scorecards: null, // Only for decisions

  highlights: [
    { round: 3, event: 'knockdown', description: 'A drops B with left hook' },
    { round: 8, event: 'stoppage', description: 'Referee stops fight' }
  ]
};
```

---

## Implementation Notes

### Fight State Object

```javascript
const fightState = {
  config: { /* fight configuration */ },

  currentRound: 7,
  roundTime: 95.5, // seconds into current round
  totalTime: 1175.5, // total fight time

  status: 'IN_PROGRESS', // or 'FINISHED'

  fighterA: { /* fighter state */ },
  fighterB: { /* fighter state */ },

  referee: { /* referee config */ },
  judges: [ /* judge configs */ ],

  roundHistory: [
    { round: 1, stats: {}, scores: {} },
    // ...
  ],

  events: [ /* fight events */ ]
};
```
