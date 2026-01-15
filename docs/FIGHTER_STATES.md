# Fighter States

This document defines the state machine that governs fighter behavior during simulation. Each fighter exists in exactly one state at any given tick, and state transitions are determined by AI decisions, combat outcomes, and external events.

## State Machine Overview

```
                                    ┌─────────────┐
                                    │   NEUTRAL   │
                                    │  (Default)  │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
             ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
             │  OFFENSIVE  │        │   TIMING    │        │  DEFENSIVE  │
             │             │        │  (Counter)  │        │             │
             └──────┬──────┘        └─────────────┘        └──────┬──────┘
                    │                                             │
     ┌──────────────┼──────────────┐               ┌──────────────┼──────────────┐
     │       │      │      │       │               │       │      │      │       │
     ▼       ▼      ▼      ▼       ▼               ▼       ▼      ▼      ▼       ▼
  JABBING COMBO  POWER  BODY   FEINT          HIGH    PHILLY  HEAD  DISTANCE PARRY
                 SHOT   WORK                  GUARD   SHELL   MOVE

                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  ┌─────────────┐        ┌─────────────┐
                  │   MOVING    │        │   CLINCH    │
                  └──────┬──────┘        └─────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      CUTTING_OFF   CIRCLING     RETREATING


              ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
              │    HURT     │ ────▶  │ KNOCKED_DOWN│ ────▶  │  RECOVERED  │
              │             │        │             │        │             │
              └─────────────┘        └─────────────┘        └─────────────┘
```

---

## Primary States

### NEUTRAL
The default reset state. Fighter is balanced, reading opponent, not committed to offense or defense.

```yaml
state: NEUTRAL
description: Reset stance, reading opponent, preparing next action
duration: 0.5-2.0 seconds typically
stamina_cost: minimal (base recovery rate applies)
vulnerability: moderate (can be caught transitioning)
transitions_to:
  - OFFENSIVE (initiating attack)
  - DEFENSIVE (opponent attacks)
  - TIMING (waiting for counter opportunity)
  - MOVING (repositioning)
  - CLINCH (seeking rest or smothering)
```

**AI Considerations:**
- Used to reset after exchanges
- Duration influenced by `paceControl` and `fightIQ`
- Stamina recovery occurs at base rate
- Can be shortened by `killerInstinct` when opponent is hurt

---

### OFFENSIVE
Fighter is actively looking to land punches. Parent state with sub-states for specific offensive actions.

```yaml
state: OFFENSIVE
description: Aggressive posture, seeking to land punches
stamina_cost: high (varies by sub-state)
vulnerability: moderate-high (committed to attack)
sub_states:
  - JABBING
  - COMBINATION
  - POWER_SHOT
  - BODY_WORK
  - FEINTING
```

#### Sub-State: JABBING
```yaml
state: OFFENSIVE.JABBING
description: Using jab to establish range, score points, set up power shots
punch_types: [jab, double_jab, triple_jab]
stamina_cost: low-moderate
attributes_used:
  primary: [jabAccuracy, handSpeed, reach]
  secondary: [footwork, distanceManagement]
risk_level: low
typical_duration: 1-3 seconds (1-6 jabs)
```

#### Sub-State: COMBINATION
```yaml
state: OFFENSIVE.COMBINATION
description: Throwing multi-punch combinations
punch_types: [jab, cross, hook, uppercut - any sequence]
stamina_cost: high
attributes_used:
  primary: [combinationPunching, combinationSpeed, handSpeed]
  secondary: [powerLeft, powerRight, accuracy]
risk_level: moderate (committed, can be countered)
typical_duration: 1-4 seconds (2-8 punches)
combo_length_factors:
  - workRate (higher = longer combos)
  - stamina (lower = shorter combos)
  - opponent_state (if HURT, extend combo)
```

#### Sub-State: POWER_SHOT
```yaml
state: OFFENSIVE.POWER_SHOT
description: Loading up a single power punch seeking knockout
punch_types: [cross, lead_hook, rear_hook, rear_uppercut]
stamina_cost: high
attributes_used:
  primary: [powerRight, powerLeft, knockoutPower, powerAccuracy]
  secondary: [timing, feinting]
risk_level: high (telegraph risk, counter vulnerability)
typical_duration: 0.5-1.5 seconds
telegraph_factor: inversely related to handSpeed and feinting
```

#### Sub-State: BODY_WORK
```yaml
state: OFFENSIVE.BODY_WORK
description: Targeting opponent's body to drain stamina and set up head shots
punch_types: [body_jab, body_cross, lead_body_hook, rear_body_hook]
stamina_cost: moderate-high
attributes_used:
  primary: [bodyPunching, bodyAccuracy, insideFighting]
  secondary: [power, timing]
risk_level: moderate (head exposed during body shots)
effects_on_opponent:
  - stamina_damage (immediate)
  - stamina_recovery_reduction (cumulative)
  - mobility_reduction (cumulative)
```

#### Sub-State: FEINTING
```yaml
state: OFFENSIVE.FEINTING
description: Fake attacks to draw defensive reactions and create openings
stamina_cost: low
attributes_used:
  primary: [feinting, fightIQ]
  secondary: [handSpeed, footwork]
risk_level: low
effects:
  - may_trigger_opponent_defensive_state
  - creates_counter_opening_on_success
  - success_rate: feinting vs opponent_fightIQ
typical_duration: 0.3-0.8 seconds
```

---

### DEFENSIVE
Fighter is protecting themselves, minimizing damage. Parent state with sub-states for defensive techniques.

```yaml
state: DEFENSIVE
description: Protective posture, absorbing or avoiding incoming attacks
stamina_cost: low-moderate (varies by technique)
vulnerability: low (but limited offense)
sub_states:
  - HIGH_GUARD
  - PHILLY_SHELL
  - HEAD_MOVEMENT
  - DISTANCE
  - PARRYING
```

#### Sub-State: HIGH_GUARD
```yaml
state: DEFENSIVE.HIGH_GUARD
description: Tight shell with gloves protecting head, elbows protecting body
damage_reduction: 60-80% (head), 40-60% (body)
stamina_cost: moderate (holding guard is tiring)
attributes_used:
  primary: [blocking]
  secondary: [stamina, composure]
vulnerabilities:
  - uppercuts can penetrate
  - body shots partially blocked
  - vision limited
best_against: hooks, overhands, wide punches
worst_against: uppercuts, precise straights, body combinations
```

#### Sub-State: PHILLY_SHELL
```yaml
state: DEFENSIVE.PHILLY_SHELL
description: Shoulder roll defense, lead shoulder absorbs punches, rear hand ready to counter
damage_reduction: 70-90% when executed correctly
stamina_cost: low
attributes_used:
  primary: [shoulderRoll, reflexes]
  secondary: [counterPunching, timing]
special_properties:
  - creates_counter_opportunity on successful roll
  - requires high shoulderRoll attribute (>70) for effectiveness
vulnerabilities:
  - body shots from lead side
  - hooks to rear side
best_against: jabs, straight rights, lead hooks
worst_against: right hooks, body shots, switch-hitters
```

#### Sub-State: HEAD_MOVEMENT
```yaml
state: DEFENSIVE.HEAD_MOVEMENT
description: Slipping, bobbing, weaving to avoid punches entirely
damage_reduction: 100% (complete miss) or 0% (still hit)
stamina_cost: moderate-high (constant motion)
attributes_used:
  primary: [headMovement, reflexes]
  secondary: [footwork, anticipation]
evasion_types:
  - slip_left: avoid straight right
  - slip_right: avoid jab
  - bob: duck under hooks
  - weave: continuous lateral head motion
  - pull_back: lean away from punches
counter_opportunity: high (opponent misses, balance compromised)
vulnerabilities:
  - can be timed with feints
  - uppercuts catch bobbing fighters
  - exhausting to maintain
```

#### Sub-State: DISTANCE
```yaml
state: DEFENSIVE.DISTANCE
description: Using footwork to stay out of range, avoiding engagement
damage_reduction: 100% (out of range)
stamina_cost: moderate (constant movement)
attributes_used:
  primary: [footSpeed, footwork, distanceManagement]
  secondary: [ringAwareness, cardio]
limitations:
  - ring_is_finite (can be cut off)
  - may_lose_round (judges see running)
  - requires good cardio
best_for: out-boxers, fighters with reach advantage
```

#### Sub-State: PARRYING
```yaml
state: DEFENSIVE.PARRYING
description: Deflecting punches with gloves, redirecting force
damage_reduction: 80-100%
stamina_cost: low
attributes_used:
  primary: [parrying, reflexes, timing]
  secondary: [fightIQ, handSpeed]
special_properties:
  - creates_immediate_counter_window
  - can_disrupt_opponent_combination
  - requires anticipation of punch type
success_factors:
  - parrying_skill vs opponent_feinting
  - timing window is small
```

---

### TIMING
Fighter is waiting to counter, not initiating but ready to capitalize on opponent's offense.

```yaml
state: TIMING
description: Counter-punching stance, baiting opponent to attack
stamina_cost: low
vulnerability: appears open (intentionally)
attributes_used:
  primary: [counterPunching, reflexes, timing]
  secondary: [composure, fightIQ, anticipation]
counter_triggers:
  - opponent_enters_OFFENSIVE_state
  - opponent_throws_specific_punch_type
  - opponent_misses_or_overextends
counter_bonus:
  damage: +20-40% (catching opponent in motion)
  accuracy: +10-20% (opponent committed)
risk: can be feinted into premature counter
```

---

### MOVING
Fighter is primarily repositioning, not engaged in offense or defense.

```yaml
state: MOVING
description: Ring movement without direct combat engagement
stamina_cost: varies by sub-state
sub_states:
  - CUTTING_OFF
  - CIRCLING
  - RETREATING
```

#### Sub-State: CUTTING_OFF
```yaml
state: MOVING.CUTTING_OFF
description: Reducing ring space for opponent, cornering them
stamina_cost: moderate
attributes_used:
  primary: [ringGeneralship, footwork, footSpeed]
  secondary: [fightIQ, anticipation]
effects:
  - reduces_opponent_movement_options
  - increases_opponent_defensive_stamina_cost
  - creates_offensive_opportunities
success_factors:
  - ringGeneralship vs opponent_footwork
  - anticipating opponent's escape direction
```

#### Sub-State: CIRCLING
```yaml
state: MOVING.CIRCLING
description: Lateral movement to create angles, avoid being cornered
stamina_cost: moderate
attributes_used:
  primary: [footwork, footSpeed]
  secondary: [ringAwareness]
direction_factors:
  - typically_circle_away_from_power_hand
  - southpaw_matchup_affects_optimal_direction
effects:
  - creates_angle_for_attack
  - avoids_opponent_power
  - maintains_ring_position
```

#### Sub-State: RETREATING
```yaml
state: MOVING.RETREATING
description: Moving backward, creating distance, resetting
stamina_cost: low-moderate
attributes_used:
  primary: [footSpeed, ringAwareness]
  secondary: [composure]
risks:
  - can_be_cornered
  - may_trip_or_lose_balance
  - judges_may_score_negatively
uses:
  - escaping_pressure
  - recovering_after_being_hurt
  - resetting_after_exchange
```

---

### CLINCH
Fighter initiates or is in a clinch, holding opponent.

```yaml
state: CLINCH
description: Close-range holding, smothering opponent's offense
stamina_cost: varies (can recover or expend)
sub_states:
  - INITIATING_CLINCH
  - HOLDING
  - DIRTY_BOXING
  - BREAKING_AWAY
```

```yaml
clinch_mechanics:
  initiation:
    success_rate: clinchOffense vs opponent_clinchDefense
    factors: [distance, opponent_state, referee_tolerance]

  while_clinched:
    stamina_recovery: +50% of base rate
    damage_possible: dirty_boxing only (limited)
    duration: 2-6 seconds typically (referee breaks)

  dirty_boxing:
    enabled_if: clinchOffense > 65
    punch_types: [short_hooks, uppercuts, body_shots]
    damage: reduced (no leverage)
    attributes: [clinchOffense, insideFighting]

  breaking_clinch:
    referee_breaks: 70% of clinches
    fighter_breaks: clinchDefense vs opponent_clinchOffense
```

---

### HURT
Fighter has taken significant damage and is in survival mode.

```yaml
state: HURT
description: Damaged, survival mode, reduced capabilities
triggers:
  - damage_threshold_exceeded (chin-based)
  - flash_knockdown_recovered
  - accumulation_critical_level
duration: 3-15 seconds (varies by damage and recovery)
effects:
  - all_attributes_reduced: 20-50% depending on severity
  - defensive_priority_forced
  - AI_shifts_to_survival
  - vulnerability_to_KO_increased
recovery_factors:
  - chin attribute
  - heart attribute
  - current_stamina
  - damage_severity
sub_levels:
  - HURT_MINOR: 10-20% reduction, 3-5 seconds
  - HURT_MODERATE: 20-35% reduction, 5-10 seconds
  - HURT_SEVERE: 35-50% reduction, 10-15 seconds
  - HURT_CRITICAL: 50%+ reduction, KO imminent
```

**Attribute Effects When Hurt:**
```yaml
hurt_modifiers:
  HURT_MINOR:
    handSpeed: -15%
    footSpeed: -10%
    reflexes: -20%
    power: -10%
    accuracy: -15%

  HURT_MODERATE:
    handSpeed: -25%
    footSpeed: -20%
    reflexes: -35%
    power: -15%
    accuracy: -25%
    blocking: -20%

  HURT_SEVERE:
    handSpeed: -40%
    footSpeed: -35%
    reflexes: -50%
    power: -25%
    accuracy: -40%
    blocking: -35%
    forced_state: DEFENSIVE or CLINCH only

  HURT_CRITICAL:
    all_attributes: -50% minimum
    KO_vulnerability: extreme
    recovery_required: immediate survival only
```

---

### KNOCKED_DOWN
Fighter is on the canvas after a knockdown.

```yaml
state: KNOCKED_DOWN
description: Fighter is down, count in progress
trigger: damage_exceeded_knockdown_threshold
duration: referee_count (1-10 seconds)
mechanics:
  count_start: immediate
  recovery_check_at: count_4, count_8, count_9
  recovery_factors:
    - heart (primary)
    - chin (how badly hurt)
    - knockdowns_this_round (cumulative)
    - knockdowns_this_fight (cumulative)
outcomes:
  - RECOVERED: beat the count, fight continues
  - KO: failed to beat count
  - TKO: beat count but deemed unable to continue
three_knockdown_rule:
  enabled: configurable
  effect: automatic TKO on third knockdown in round
```

---

### RECOVERED
Fighter has gotten up from a knockdown and is under mandatory 8-count.

```yaml
state: RECOVERED
description: Post-knockdown, mandatory count, fight about to resume
duration: until referee signals continue (typically 2-3 seconds post-count)
effects:
  - cannot_attack
  - referee_checks_fitness
  - enters_HURT state when fight resumes
forced_next_state: HURT_MODERATE or HURT_SEVERE
```

---

## State Transition Rules

### Valid Transitions Matrix

| From State | Valid Transitions To |
|------------|---------------------|
| NEUTRAL | OFFENSIVE, DEFENSIVE, TIMING, MOVING, CLINCH |
| OFFENSIVE | NEUTRAL, DEFENSIVE, MOVING, CLINCH, HURT |
| DEFENSIVE | NEUTRAL, OFFENSIVE (counter), MOVING, CLINCH, HURT |
| TIMING | OFFENSIVE (counter), DEFENSIVE, NEUTRAL, HURT |
| MOVING | NEUTRAL, OFFENSIVE, DEFENSIVE, CLINCH |
| CLINCH | NEUTRAL, OFFENSIVE, DEFENSIVE, HURT |
| HURT | DEFENSIVE, CLINCH, KNOCKED_DOWN, NEUTRAL (recovery) |
| KNOCKED_DOWN | RECOVERED, KO (fight end) |
| RECOVERED | HURT |

### Forced Transitions

Certain events force immediate state transitions:

```yaml
forced_transitions:
  - trigger: damage_exceeds_hurt_threshold
    from: any
    to: HURT

  - trigger: damage_exceeds_knockdown_threshold
    from: any
    to: KNOCKED_DOWN

  - trigger: opponent_clinches_successfully
    from: [OFFENSIVE, NEUTRAL, MOVING]
    to: CLINCH

  - trigger: round_ends
    from: any
    to: NEUTRAL (between rounds)

  - trigger: referee_breaks_clinch
    from: CLINCH
    to: NEUTRAL
```

---

## State Duration Guidelines

| State | Minimum Duration | Typical Duration | Maximum Duration |
|-------|-----------------|------------------|------------------|
| NEUTRAL | 0.5s | 1-2s | 5s |
| OFFENSIVE.JABBING | 0.3s | 1-2s | 4s |
| OFFENSIVE.COMBINATION | 0.5s | 1-3s | 5s |
| OFFENSIVE.POWER_SHOT | 0.3s | 0.5-1s | 2s |
| DEFENSIVE.* | 0.5s | 2-5s | 15s |
| TIMING | 1s | 3-8s | 20s |
| MOVING.* | 0.5s | 2-4s | 10s |
| CLINCH | 1s | 3-5s | 8s |
| HURT | 3s | 5-10s | 20s |
| KNOCKED_DOWN | 1s | 4-8s | 10s |
| RECOVERED | 2s | 2-3s | 4s |

---

## State-Based Stamina Costs

| State | Stamina Cost/Second | Notes |
|-------|---------------------|-------|
| NEUTRAL | -0.5 (recovery) | Base recovery rate |
| OFFENSIVE.JABBING | 2.0 | Per jab thrown |
| OFFENSIVE.COMBINATION | 3.5 | High output |
| OFFENSIVE.POWER_SHOT | 4.0 | Loading up is expensive |
| OFFENSIVE.BODY_WORK | 3.0 | Moderate |
| DEFENSIVE.HIGH_GUARD | 1.5 | Holding guard |
| DEFENSIVE.PHILLY_SHELL | 0.8 | Efficient |
| DEFENSIVE.HEAD_MOVEMENT | 2.5 | Constant motion |
| DEFENSIVE.DISTANCE | 2.0 | Movement |
| TIMING | 0.5 | Waiting |
| MOVING.CUTTING_OFF | 2.0 | Pursuit |
| MOVING.CIRCLING | 1.5 | Lateral |
| MOVING.RETREATING | 1.0 | Backward |
| CLINCH | -1.0 (recovery) | Resting |
| HURT | 3.0 | Survival is exhausting |

---

## Implementation Notes

### State Object Structure

```javascript
const fighterState = {
  primary: 'OFFENSIVE',
  sub: 'COMBINATION',
  duration: 1.5,           // seconds in current state
  lockedUntil: 0,          // cannot transition until this time
  modifiers: {
    hurt: false,
    fatigued: false,
    cornered: false
  },
  lastTransition: {
    from: 'NEUTRAL',
    reason: 'ai_decision',
    timestamp: 45.5         // fight time in seconds
  }
};
```

### State Transition Event

```javascript
const transitionEvent = {
  type: 'STATE_TRANSITION',
  fighter: 'A',
  from: { primary: 'NEUTRAL', sub: null },
  to: { primary: 'OFFENSIVE', sub: 'COMBINATION' },
  reason: 'ai_decision',    // or 'forced', 'damage', 'referee'
  timestamp: 45.5,
  attributes_snapshot: { /* relevant attributes */ }
};
```
