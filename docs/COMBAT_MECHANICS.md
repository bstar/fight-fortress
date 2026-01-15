# Combat Mechanics

This document defines how punches work, accuracy calculations, damage resolution, blocking, evasion, and all combat interactions in the simulation.

## Punch Types

### Overview

```
PUNCH HIERARCHY
├── Straight Punches
│   ├── Jab (lead hand)
│   ├── Cross (rear hand)
│   ├── Body Jab
│   └── Body Cross
├── Hooks
│   ├── Lead Hook (head)
│   ├── Rear Hook (head)
│   ├── Lead Body Hook
│   └── Rear Body Hook
├── Uppercuts
│   ├── Lead Uppercut
│   └── Rear Uppercut
└── Special
    ├── Overhand (looping power)
    ├── Shovel Hook (hybrid)
    └── Bolo Punch (showboat)
```

---

### Jab
```yaml
punch: jab
hand: lead
target: head (default)
category: straight

base_stats:
  power_modifier: 0.4  # Low damage, high utility
  speed_modifier: 1.2  # Fastest punch
  accuracy_modifier: 1.1  # Easiest to land
  stamina_cost: 1.5
  recovery_time: 0.25s  # Quick reset

attributes_used:
  power: powerLeft (orthodox) / powerRight (southpaw)
  accuracy: jabAccuracy
  speed: handSpeed * 1.2

purposes:
  - Range finding
  - Setting up power shots
  - Scoring points
  - Disrupting opponent rhythm
  - Controlling distance

variations:
  flick_jab:
    power_modifier: 0.25
    speed_modifier: 1.4
    purpose: range_finding
  stiff_jab:
    power_modifier: 0.6
    speed_modifier: 0.9
    purpose: stopping_power
  double_jab:
    second_jab_accuracy: -5%
    setup_bonus: +15% to follow-up
  triple_jab:
    accuracy_degradation: -5% per jab
    purpose: overwhelming

effective_range:
  optimal: 95-105% of fighter's reach
  effective: 85-115%
  ineffective: <80% or >120%

defense_difficulty:
  blocking: easy
  slipping: moderate
  parrying: easy
```

---

### Cross (Straight Right/Left)
```yaml
punch: cross
hand: rear
target: head (default)
category: straight

base_stats:
  power_modifier: 1.0  # Primary power punch
  speed_modifier: 0.85
  accuracy_modifier: 0.95
  stamina_cost: 3.5
  recovery_time: 0.4s

attributes_used:
  power: powerRight (orthodox) / powerLeft (southpaw)
  accuracy: powerAccuracy
  speed: handSpeed * 0.85

purposes:
  - Primary knockout punch
  - Counter after jab
  - Power statement
  - Finishing hurt opponents

mechanics:
  rotation: full_hip_and_shoulder
  weight_transfer: rear_to_front
  telegraph_risk: moderate-high

effective_range:
  optimal: 90-100% of reach
  effective: 80-110%
  ineffective: <75% (jammed) or >115% (reaching)

setup_bonuses:
  after_jab: +12% accuracy
  after_feint: +15% accuracy
  vs_jabbing_opponent: +10% (counter)

defense_difficulty:
  blocking: moderate
  slipping: moderate
  parrying: moderate
  shoulder_roll: easy (designed for this)
```

---

### Lead Hook
```yaml
punch: lead_hook
hand: lead
target: head
category: hook

base_stats:
  power_modifier: 0.85
  speed_modifier: 0.9
  accuracy_modifier: 0.85
  stamina_cost: 3.0
  recovery_time: 0.35s

attributes_used:
  power: powerLeft * 0.9 (orthodox)
  accuracy: powerAccuracy * 0.95
  speed: handSpeed * 0.9

purposes:
  - Knockout punch (temple/chin)
  - Breaking high guard
  - Catching slippers
  - Inside fighting staple

mechanics:
  motion: horizontal_arc
  rotation: hip_driven
  best_angle: 90_degrees

effective_range:
  optimal: 60-80% of reach (inside)
  effective: 50-90%
  ineffective: >100% (too far)

special_properties:
  catches_bobbers: true
  blind_spot_punch: true (peripheral_vision)
  guard_breaker: moderate

defense_difficulty:
  blocking: moderate (elbow position crucial)
  slipping: difficult (wide arc)
  parrying: difficult
  high_guard: vulnerable_from_side
```

---

### Rear Hook
```yaml
punch: rear_hook
hand: rear
target: head
category: hook

base_stats:
  power_modifier: 1.05  # More power than lead hook
  speed_modifier: 0.75  # Slower (more travel distance)
  accuracy_modifier: 0.8
  stamina_cost: 4.0
  recovery_time: 0.5s

attributes_used:
  power: powerRight * 1.05
  accuracy: powerAccuracy * 0.9
  speed: handSpeed * 0.75

purposes:
  - Maximum power hook
  - Knockout punch
  - Following lead hook
  - Wide angle attack

mechanics:
  telegraph_risk: high
  commitment: full

effective_range:
  optimal: 65-85% of reach
  effective: 55-95%

defense_difficulty:
  blocking: moderate
  slipping: moderate-difficult
  parrying: difficult
```

---

### Lead Uppercut
```yaml
punch: lead_uppercut
hand: lead
target: head (chin)
category: uppercut

base_stats:
  power_modifier: 0.75
  speed_modifier: 0.85
  accuracy_modifier: 0.75
  stamina_cost: 2.5
  recovery_time: 0.35s

attributes_used:
  power: powerLeft * 0.8
  accuracy: powerAccuracy * 0.85
  speed: handSpeed * 0.85

purposes:
  - Catching bobbing opponents
  - Inside fighting
  - Breaking philly shell
  - Setting up rear hand

mechanics:
  motion: upward_vertical
  best_position: inside

effective_range:
  optimal: 50-70% of reach (close)
  effective: 40-80%
  ineffective: >90%

special_properties:
  catches_bobbers: +25% vs HEAD_MOVEMENT
  breaks_high_guard: vertical_angle
  chin_targeting: natural_upward_trajectory

defense_difficulty:
  blocking: moderate (elbows must be down)
  slipping: difficult (upward)
  bobbing: COUNTER_PRODUCTIVE (walks_into_it)
```

---

### Rear Uppercut
```yaml
punch: rear_uppercut
hand: rear
target: head (chin)
category: uppercut

base_stats:
  power_modifier: 1.1  # Devastating
  speed_modifier: 0.7
  accuracy_modifier: 0.7
  stamina_cost: 4.5
  recovery_time: 0.5s

attributes_used:
  power: powerRight * 1.15
  accuracy: powerAccuracy * 0.8
  speed: handSpeed * 0.7

purposes:
  - Knockout punch
  - Inside fighting finisher
  - vs crouching opponents
  - Ultimate close-range weapon

effective_range:
  optimal: 45-65% of reach
  effective: 35-75%

special_properties:
  knockout_multiplier: 1.25
  catches_bobbers: +30%
  risky_if_missed: high_commitment

defense_difficulty:
  blocking: difficult (comes from below)
  clinching: best_defense
```

---

### Body Punches

```yaml
body_jab:
  base_damage: 0.35
  stamina_drain: 1.5 (to opponent)
  accuracy_modifier: 1.0
  stamina_cost: 1.5

body_cross:
  base_damage: 0.8
  stamina_drain: 4.0 (to opponent)
  liver_shot_chance: 15% (if left_side)
  stamina_cost: 3.5

lead_body_hook:
  base_damage: 0.7
  stamina_drain: 3.5
  liver_shot_chance: 40% (left hook to body)
  stamina_cost: 3.0

rear_body_hook:
  base_damage: 0.85
  stamina_drain: 4.5
  spleen_side: right_side_target
  stamina_cost: 3.5

body_uppercut:
  base_damage: 0.75
  stamina_drain: 3.0
  solar_plexus_chance: 25%
  stamina_cost: 3.0
```

---

## Accuracy System

### Base Accuracy Calculation

```javascript
function calculateAccuracy(attacker, defender, punch, context) {
  // Start with base accuracy for punch type
  let accuracy = getPunchBaseAccuracy(punch);

  // Apply attacker's accuracy attribute
  const accuracyAttr = punch.isJab ? attacker.jabAccuracy : attacker.powerAccuracy;
  accuracy *= (accuracyAttr / 75);

  // Distance modifier
  const distanceMod = calculateDistanceModifier(attacker, defender, punch);
  accuracy *= distanceMod;

  // Defender's defense
  const defenseMod = calculateDefenseModifier(defender, punch);
  accuracy *= defenseMod;

  // Situational modifiers
  accuracy *= getStateModifier(attacker.state, defender.state);
  accuracy *= getMovementModifier(attacker, defender);
  accuracy *= getCombinationModifier(context.punchNumber);
  accuracy *= getFatigueModifier(attacker.stamina);

  // Reach advantage
  accuracy += getReachAdvantage(attacker, defender) * 0.02;

  return clamp(accuracy, 0.05, 0.95);
}
```

### Distance Modifier

```yaml
distance_modifiers:
  # Relative to optimal range
  50%_optimal:  # Very close (inside)
    jab: 0.6
    cross: 0.7
    hook: 1.15
    uppercut: 1.2

  75%_optimal:  # Close
    jab: 0.85
    cross: 0.9
    hook: 1.1
    uppercut: 1.05

  100%_optimal:  # Perfect range
    jab: 1.0
    cross: 1.0
    hook: 0.9
    uppercut: 0.8

  125%_optimal:  # Long range
    jab: 0.9
    cross: 0.8
    hook: 0.6
    uppercut: 0.5

  150%_optimal:  # Too far
    jab: 0.5
    cross: 0.4
    hook: 0.2
    uppercut: 0.1
```

### Defense Modifier

```yaml
defense_vs_punch:
  # How effective each defense is vs each punch type

  HIGH_GUARD:
    vs_jab: 0.7 (30% still lands)
    vs_cross: 0.65
    vs_hook: 0.75
    vs_uppercut: 0.4 (vulnerable)
    vs_body: 0.8

  PHILLY_SHELL:
    vs_jab: 0.8
    vs_cross: 0.85
    vs_lead_hook: 0.5 (vulnerable)
    vs_rear_hook: 0.6
    vs_body: 0.55 (vulnerable)

  HEAD_MOVEMENT:
    vs_jab: 0.75
    vs_cross: 0.7
    vs_hook: 0.65
    vs_uppercut: 0.4 (CATCHES bobbers)
    effectiveness: headMovement / 100

  DISTANCE:
    at_range: 0.9-1.0 (most effective)
    requires: being_at_range

  PARRYING:
    vs_straight: 0.8
    vs_hook: 0.5 (difficult angle)
    vs_uppercut: 0.4
    timing_window: 0.15s
```

### Combination Accuracy Degradation

```yaml
combination_accuracy:
  punch_1: 100%
  punch_2: 90% + (combinationPunching * 0.1)%
  punch_3: 80% + (combinationPunching * 0.2)%
  punch_4: 70% + (combinationPunching * 0.3)%
  punch_5: 60% + (combinationPunching * 0.4)%
  punch_6+: 50% + (combinationPunching * 0.5)%

# Example with combinationPunching = 80:
  punch_1: 100%
  punch_2: 98%
  punch_3: 96%
  punch_4: 94%
  punch_5: 92%
  punch_6: 90%
```

---

## Damage System

### Base Damage Calculation

```javascript
function calculateDamage(attacker, defender, punch, landed) {
  if (!landed) return 0;

  // Base damage from punch type
  let damage = punch.baseDamage;

  // Power attribute
  const powerAttr = punch.hand === 'lead'
    ? attacker.powerLeft
    : attacker.powerRight;
  damage *= (powerAttr / 70);

  // Punch type modifier
  damage *= punch.powerModifier;

  // Weight/size factor
  damage *= 1 + (attacker.weight - 70) * 0.005;

  // Clean hit vs partial
  damage *= landed.cleanness; // 0.3 (glancing) to 1.0 (clean)

  // Counter punch bonus
  if (landed.isCounter) {
    damage *= 1 + (attacker.counterPunching / 200);
  }

  // Defender chin
  damage *= (100 / defender.chin);

  // Blocked damage reduction
  if (landed.blocked) {
    damage *= (1 - defender.blocking / 200);
  }

  // Fatigue affects power
  damage *= attacker.staminaPercent * 0.3 + 0.7;

  // Hurt opponent bonus
  if (defender.state === 'HURT') {
    damage *= 1 + (attacker.killerInstinct / 200);
  }

  return damage;
}
```

### Damage Types

```yaml
damage_types:
  head_damage:
    accumulates: true
    affects: [chin, reflexes, composure]
    knockdown_threshold: based_on_chin
    ko_threshold: knockdown_threshold * 1.5

  body_damage:
    accumulates: true
    affects: [stamina, stamina_recovery, mobility]
    knockdown_threshold: rare (liver/solar plexus only)
    ko_threshold: very_rare

  cut_damage:
    requires: impact_location + skin_toughness
    accumulates: per_location
    affects: [vision, bleeding, referee_stoppage_risk]

  stamina_damage:
    from: body_shots, activity, being_hit
    affects: [all_attributes_when_low]
    recovery: between_rounds + corner_work
```

### Critical Hits

```yaml
critical_hits:
  clean_chin_shot:
    trigger: accuracy > 90% + chin_targeting
    damage_multiplier: 1.5-2.0
    flash_knockdown_chance: 10-30%

  liver_shot:
    trigger: left_body_hook + bodyPunching > 70
    damage_multiplier: 1.3
    delayed_effect: true (1-3 seconds)
    knockdown_chance: 15-40%

  solar_plexus:
    trigger: body_uppercut + accuracy > 85%
    effect: wind_knocked_out
    temporary_paralysis: 2-4 seconds

  temple_shot:
    trigger: hook + clean_hit
    damage_multiplier: 1.4
    flash_ko_chance: 5-15%

  behind_ear:
    trigger: hook + angle
    equilibrium_damage: true
    balance_disruption: 2-5 seconds
```

---

## Blocking System

### Block Detection

```javascript
function resolveBlock(defender, punch, context) {
  // Is defender in blocking state?
  if (!defender.state.includes('DEFENSIVE') &&
      !defender.state.includes('HIGH_GUARD')) {
    return { blocked: false };
  }

  // Base block chance
  let blockChance = defender.blocking / 100;

  // Punch type modifier
  blockChance *= getBlockVsPunchModifier(defender.state, punch.type);

  // Attacker feinting
  if (context.wasFeint) {
    blockChance *= 0.7;
  }

  // Speed differential
  blockChance *= defender.reflexes / punch.speed;

  // Fatigue
  blockChance *= 0.7 + (defender.staminaPercent * 0.3);

  // Roll for block
  const blocked = Math.random() < blockChance;

  if (blocked) {
    return {
      blocked: true,
      damageReduction: 0.4 + (defender.blocking / 200),
      armDamage: punch.power * 0.1,
      staminaCost: punch.power * 0.05
    };
  }

  return { blocked: false };
}
```

### Block Effectiveness

```yaml
block_effectiveness:
  HIGH_GUARD:
    head_front: 75%
    head_side: 60%
    body: 50%
    uppercuts: 30%
    stamina_drain: 2.0/second

  PHILLY_SHELL:
    jab: 85%
    cross: 80%
    lead_hook: 40%
    body: 45%
    stamina_drain: 1.0/second

  CATCH_AND_SHOOT:
    requires: parrying > 70
    straight_punches: 80%
    creates_counter_window: true

guard_deterioration:
  consecutive_blocked_punches: -5% per punch
  recovery_time: 1.5s to reset
  broken_guard_vulnerability: +30% damage
```

---

## Evasion System

### Evasion Types

```yaml
slip_left:
  avoids: [jab, rear_hook, rear_uppercut]
  timing_window: 0.2s
  stamina_cost: 1.5
  counter_opportunity: true
  attribute: headMovement

slip_right:
  avoids: [cross, lead_hook, lead_uppercut]
  timing_window: 0.2s
  stamina_cost: 1.5
  counter_opportunity: true
  attribute: headMovement

bob:
  avoids: [hooks, overhands]
  vulnerable_to: [uppercuts]
  timing_window: 0.25s
  stamina_cost: 2.0
  attribute: headMovement

weave:
  continuous_motion: true
  avoids: [straight_punches, hooks]
  stamina_cost: 3.0/second
  attribute: headMovement

pull_back:
  avoids: [all_head_punches]
  timing_window: 0.15s
  range_change: +15%
  stamina_cost: 1.0
  attribute: reflexes + footwork

duck:
  avoids: [hooks, overhands]
  vulnerable_to: [uppercuts, knees (clinch)]
  timing_window: 0.2s
  attribute: headMovement
```

### Evasion Calculation

```javascript
function calculateEvasion(defender, punch, evasionType) {
  // Base evasion from attribute
  let evasionChance = defender.headMovement / 100;

  // Evasion type vs punch type compatibility
  evasionChance *= getEvasionVsPunchModifier(evasionType, punch.type);

  // Attacker feinting penalty
  if (punch.wasFeinted) {
    evasionChance *= 0.6;
  }

  // Reflexes factor
  evasionChance *= (50 + defender.reflexes) / 150;

  // Fatigue penalty
  evasionChance *= 0.6 + (defender.staminaPercent * 0.4);

  // Already hurt penalty
  if (defender.state === 'HURT') {
    evasionChance *= 0.5;
  }

  // Punch speed factor
  evasionChance *= 100 / punch.effectiveSpeed;

  return {
    success: Math.random() < evasionChance,
    counterWindow: evasionChance > 0.7 ? 0.3 : 0
  };
}
```

---

## Counter System

### Counter Opportunities

```yaml
counter_windows:
  after_missed_jab:
    window: 0.2s
    bonus_accuracy: +10%
    bonus_damage: +15%

  after_missed_power:
    window: 0.35s
    bonus_accuracy: +15%
    bonus_damage: +25%

  after_blocked_punch:
    window: 0.15s
    bonus_accuracy: +8%
    bonus_damage: +10%

  after_successful_slip:
    window: 0.3s
    bonus_accuracy: +20%
    bonus_damage: +30%

  after_successful_parry:
    window: 0.25s
    bonus_accuracy: +18%
    bonus_damage: +25%

  catching_opponent_mid_punch:
    timing_required: 0.1s
    bonus_damage: +40%
    counter_ko_chance: +15%
```

### Counter Resolution

```javascript
function resolveCounter(attacker, defender, originalPunch, counterPunch) {
  // Attacker (original) is now defender
  // Defender (original) is now attacker

  // Counter timing check
  const counterWindow = getCounterWindow(originalPunch.outcome);

  // Counter-punching attribute
  const counterSkill = defender.counterPunching;

  // Check if counter lands
  const counterAccuracy = calculateAccuracy(
    defender,
    attacker,
    counterPunch,
    { isCounter: true }
  );

  // Counter bonuses
  const accuracyBonus = counterWindow.bonus_accuracy * (counterSkill / 100);
  const damageBonus = counterWindow.bonus_damage * (counterSkill / 100);

  return {
    lands: Math.random() < (counterAccuracy + accuracyBonus),
    damage: calculateDamage(...) * (1 + damageBonus),
    isCounterKO: checkCounterKO(...)
  };
}
```

---

## Exchange Resolution

### Simultaneous Action Resolution

```javascript
function resolveExchange(fighterA, fighterB, tick) {
  const events = [];

  // Get intended actions from AI
  const actionA = fighterA.getAction(fighterB, tick);
  const actionB = fighterB.getAction(fighterA, tick);

  // Determine action priority (speed-based)
  const priorityA = calculateActionPriority(actionA, fighterA);
  const priorityB = calculateActionPriority(actionB, fighterB);

  // Faster action resolves first
  const [first, second] = priorityA > priorityB
    ? [{ fighter: fighterA, action: actionA, target: fighterB },
       { fighter: fighterB, action: actionB, target: fighterA }]
    : [{ fighter: fighterB, action: actionB, target: fighterA },
       { fighter: fighterA, action: actionA, target: fighterB }];

  // Resolve first action
  const firstResult = resolveAction(first);
  events.push(firstResult);

  // Check if second action is still valid
  if (canStillAct(second.fighter, firstResult)) {
    const secondResult = resolveAction(second, firstResult);
    events.push(secondResult);
  }

  return events;
}
```

### Trading Punches

```yaml
trading_scenarios:
  both_throw_at_same_time:
    resolution: speed_determines_first_hit
    both_may_land: true (if neither_knocked_down)

  exchange:
    definition: >
      Multiple punches thrown by both fighters
      in short timeframe
    typical_duration: 1-3 seconds
    favor: fighter_with_better_chin_and_power

  firefight:
    definition: sustained_exchange, neither_backing_down
    risk: high_damage_both_fighters
    favor: fighter_with_better_heart_and_chin
```

---

## Clinch Combat

### Dirty Boxing

```yaml
dirty_boxing:
  enabled_when: clinch_state AND clinchOffense > 65

  available_punches:
    short_hook:
      power: 40% of normal
      accuracy: -20%
      no_windup: true
    short_uppercut:
      power: 50% of normal
      accuracy: -15%
    body_shot:
      power: 60% of normal
      accuracy: normal

  referee_intervention:
    warning_threshold: 3 punches
    break_after: 2-6 seconds
    point_deduction_risk: after_multiple_warnings
```

---

## Combat Modifiers Summary

### Accuracy Modifiers

| Factor | Modifier Range |
|--------|---------------|
| Distance (optimal) | 0.5x - 1.2x |
| Defender state | 0.4x - 1.0x |
| Combination position | 0.5x - 1.0x |
| Stamina (low) | 0.7x - 1.0x |
| Counter opportunity | 1.1x - 1.3x |
| Reach advantage | +/-15% |
| Hurt defender | 1.15x - 1.25x |

### Damage Modifiers

| Factor | Modifier Range |
|--------|---------------|
| Power attribute | 0.5x - 1.5x |
| Punch type | 0.3x - 1.1x |
| Counter bonus | 1.15x - 1.4x |
| Clean vs blocked | 0.3x - 1.0x |
| Stamina (attacker) | 0.7x - 1.0x |
| Chin (defender) | 0.7x - 1.5x |
| Critical location | 1.3x - 2.0x |

---

## Style Matchup Mechanics

The simulation includes style-specific accuracy modifiers that create realistic matchup dynamics. These are applied during accuracy calculations based on fighter styles and distance.

### Slugger vs Counter-Puncher
```yaml
slugger_attacking_counter_puncher:
  penalty: -12%
  reason: Sluggers telegraph punches, counter-punchers time them
```

### Boxer-Puncher vs Swarmer
Distance-dependent advantage:
```yaml
boxer_puncher_attacking_swarmer:
  at_range (distance >= 4):
    bonus: +8%
    reason: Can pick shots from distance
  inside (distance < 3):
    penalty: -8%
    reason: Swarmers smother boxer-punchers inside

swarmer_attacking_boxer_puncher:
  at_range (distance >= 4):
    penalty: -8%
    reason: Running into counters
  inside (distance < 3):
    bonus: +12%
    reason: Swarmers dominate in close
```

### Inside-Fighter vs Swarmer
Explosive inside-fighters have significant advantage over volume swarmers at close range:
```yaml
inside_fighter_attacking_swarmer:
  inside (distance < 3):
    bonus: +18%
    reason: Shorter, more explosive punches beat volume
    example: Tyson's peek-a-boo devastated pressure fighters

swarmer_attacking_inside_fighter:
  inside (distance < 3):
    penalty: -12%
    reason: Peek-a-boo defense nullifies volume approach
```

### First Step Advantage
Explosive starters get accuracy bonus when closing distance:
```yaml
first_step_mechanic:
  trigger: firstStep advantage > 10 points
  range: distance < 3.5 (close-mid)
  bonus: (advantage - 10) / 100
  example: Tyson (98) vs Holyfield (78) = +10% accuracy
  reason: Explosive closers land before opponents react
```

### Early Round KO Power Boost
Elite finishers are more dangerous in early rounds:
```yaml
early_round_ko_boost:
  trigger: knockoutPower >= 94
  rounds: 1-5 (fades each round)
  round_1_bonus:
    ko_power_99: +42%
    ko_power_94: +12%
  round_5_bonus: minimal
  reason: Fast starters like Tyson end fights early
```

---

## Implementation Notes

### Punch Object Structure

```javascript
const punch = {
  type: 'cross',
  hand: 'rear',
  target: 'head',
  category: 'straight',

  stats: {
    basePower: 1.0,
    speedModifier: 0.85,
    accuracyModifier: 0.95,
    staminaCost: 3.5,
    recoveryTime: 0.4
  },

  context: {
    inCombination: true,
    comboPosition: 2,
    isCounter: false,
    wasFeinted: false
  },

  result: null // Filled after resolution
};
```

### Combat Event Structure

```javascript
const combatEvent = {
  type: 'PUNCH_THROWN',
  timestamp: 45.5,
  attacker: 'A',
  defender: 'B',

  punch: {
    type: 'lead_hook',
    target: 'head'
  },

  resolution: {
    outcome: 'LANDED_CLEAN', // MISSED, BLOCKED, LANDED_PARTIAL, LANDED_CLEAN
    accuracy_roll: 0.72,
    accuracy_needed: 0.65,
    damage: 12.5,
    critical: false,
    knockdown: false
  },

  effects: {
    defender_health_change: -12.5,
    defender_state_change: null,
    attacker_stamina_change: -3.5
  }
};
```
