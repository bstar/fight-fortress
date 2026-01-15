# Stamina System

This document defines energy mechanics, stamina expenditure, recovery, fatigue effects, and pacing strategy in the simulation.

## Stamina Overview

### Core Concept

```yaml
stamina:
  description: |
    Represents a fighter's energy reserve. Depletes through activity
    and recovers through rest. Low stamina severely impacts performance.

  base_pool: 80 + (cardio * 0.4) = 80-120 units
  regeneration: variable based on activity and attributes
  critical_threshold: 25% (below this, severe penalties)
```

### Stamina Pool Calculation

```javascript
function calculateMaxStamina(fighter) {
  // Base from cardio
  let maxStamina = 80 + (fighter.stamina.cardio * 0.4);

  // Weight modifier (heavier = slightly lower)
  maxStamina *= 1 - (fighter.physical.weight - 70) * 0.002;

  // Age modifier
  const ageMod = getAgeStaminaModifier(fighter.physical.age);
  maxStamina *= ageMod;

  // Body type modifier
  const bodyMod = {
    'lean': 1.05,
    'average': 1.0,
    'muscular': 0.97,
    'stocky': 0.98,
    'lanky': 1.02
  }[fighter.physical.bodyType];
  maxStamina *= bodyMod;

  return maxStamina;
}
```

---

## Stamina Expenditure

### Action Costs

```yaml
stamina_costs:
  punches:
    jab: 1.5
    double_jab: 2.5
    cross: 3.5
    lead_hook: 3.0
    rear_hook: 4.0
    lead_uppercut: 2.5
    rear_uppercut: 4.5
    body_jab: 1.5
    body_cross: 3.5
    body_hook: 3.0
    overhand: 5.0

  combinations:
    2_punch: sum + 0.5 bonus
    3_punch: sum + 1.0 bonus
    4_punch: sum + 2.0 bonus
    5+_punch: sum + 3.0 bonus

  defensive:
    blocking_per_second: 1.5
    high_guard_per_second: 2.0
    head_movement_per_second: 2.5
    philly_shell_per_second: 1.0
    slipping: 1.5 per slip
    ducking: 2.0 per duck

  movement:
    forward_step: 0.5
    backward_step: 0.4
    lateral_step: 0.6
    circling_per_second: 1.5
    cutting_off_per_second: 2.0
    retreating_per_second: 1.0
    burst_movement: 2.5

  other:
    clinch_initiation: 1.5
    clinch_holding_per_second: 0.5
    breaking_clinch: 2.0
    getting_hit: damage * 0.1
    being_hurt: 3.0 per second
    recovery_from_knockdown: 15.0
```

### Work Rate Modifier

```javascript
function calculateStaminaCost(action, fighter) {
  const baseCost = ACTION_COSTS[action.type];

  // Work rate reduces costs
  const workRateMod = 1 - (fighter.stamina.workRate - 50) * 0.01;
  // workRate 80 = 30% reduction
  // workRate 40 = 10% increase

  // Fatigue increases costs
  const fatigueLevel = 1 - (fighter.currentStamina / fighter.maxStamina);
  const fatigueMod = 1 + (fatigueLevel * 0.3);

  // Body damage increases costs
  const bodyDamageMod = 1 + (fighter.bodyDamage / 200);

  return baseCost * workRateMod * fatigueMod * bodyDamageMod;
}
```

---

## Stamina Recovery

### Passive Recovery

```yaml
passive_recovery:
  base_rate: cardio * 0.008 per second

  state_modifiers:
    NEUTRAL: 100% of base
    DEFENSIVE.HIGH_GUARD: 50% of base
    DEFENSIVE.PHILLY_SHELL: 80% of base
    DEFENSIVE.DISTANCE: 60% of base
    TIMING: 90% of base
    CLINCH: 150% of base
    MOVING: 0% (no recovery while moving)
    OFFENSIVE: 0% (no recovery while attacking)
    HURT: 0% (no recovery while hurt)

  factors:
    body_damage: reduces_by_body_damage_percent * 0.5
    head_damage: reduces_by_head_damage_percent * 0.2
    age_factor: decreases_after_32
```

### Between-Round Recovery

```javascript
function calculateBetweenRoundRecovery(fighter) {
  // Base recovery from recoveryRate attribute
  const baseRecovery = fighter.maxStamina * (fighter.stamina.recoveryRate / 100) * 0.4;
  // At recoveryRate 100: 40% of max stamina
  // At recoveryRate 50: 20% of max stamina

  // Corner effectiveness bonus
  const cornerBonus = fighter.corner.effectiveness * 0.1;

  // Body damage penalty
  const bodyPenalty = 1 - (fighter.bodyDamage / 200);

  // Age factor
  const ageMod = getAgeRecoveryModifier(fighter.physical.age);

  // Calculate total recovery
  let recovery = baseRecovery * (1 + cornerBonus) * bodyPenalty * ageMod;

  // Cap at reasonable maximum
  recovery = Math.min(recovery, fighter.maxStamina * 0.5);

  return recovery;
}
```

### Recovery Rate Table

| Recovery Rate | Between-Round Recovery | Passive Rate/sec |
|---------------|------------------------|------------------|
| 40 | 16% of max | 0.32 |
| 50 | 20% of max | 0.40 |
| 60 | 24% of max | 0.48 |
| 70 | 28% of max | 0.56 |
| 80 | 32% of max | 0.64 |
| 90 | 36% of max | 0.72 |
| 100 | 40% of max | 0.80 |

---

## Fatigue Effects

### Stamina Level Tiers

```yaml
stamina_tiers:
  fresh: # 80-100%
    penalties: none
    ai_behavior: normal

  good: # 60-80%
    penalties:
      power: -3%
      speed: -2%
    ai_behavior: normal

  tired: # 40-60%
    penalties:
      power: -8%
      speed: -5%
      accuracy: -5%
      defensive_reaction: -5%
    ai_behavior: |
      - considers_pacing
      - may_clinch_more
      - shorter_combinations

  exhausted: # 25-40%
    penalties:
      power: -15%
      speed: -12%
      accuracy: -10%
      defensive_reaction: -15%
      movement_speed: -10%
    ai_behavior: |
      - survival_mode_tendency
      - heavy_clinching
      - minimal_offense
      - looking_to_recover

  gassed: # 0-25%
    penalties:
      power: -30%
      speed: -25%
      accuracy: -20%
      defensive_reaction: -30%
      movement_speed: -25%
      chin: -15%
    ai_behavior: |
      - desperate
      - can't_sustain_offense
      - referee_watching_closely
      - tko_vulnerability_high
```

### Fatigue Calculation

```javascript
function applyFatiguePenalties(fighter) {
  const staminaPercent = fighter.currentStamina / fighter.maxStamina;

  // Determine tier
  let tier;
  if (staminaPercent >= 0.8) tier = 'fresh';
  else if (staminaPercent >= 0.6) tier = 'good';
  else if (staminaPercent >= 0.4) tier = 'tired';
  else if (staminaPercent >= 0.25) tier = 'exhausted';
  else tier = 'gassed';

  // Get penalties for tier
  const penalties = FATIGUE_PENALTIES[tier];

  // Apply to modified attributes
  for (const [attr, penalty] of Object.entries(penalties)) {
    fighter.modifiedAttributes[attr] *= (1 + penalty / 100);
  }

  // Pacing intelligence adjustment
  if (fighter.stamina.paceControl > 70 && tier !== 'gassed') {
    // Smart fighters manage fatigue better
    const pacingMitigation = (fighter.stamina.paceControl - 70) / 100;
    for (const attr of Object.keys(penalties)) {
      fighter.modifiedAttributes[attr] *= (1 + pacingMitigation * 0.3);
    }
  }

  return tier;
}
```

---

## Pacing Strategy

### AI Pacing Logic

```yaml
pacing_behavior:
  low_paceControl: # < 50
    tendencies:
      - fights_at_same_pace_regardless_of_stamina
      - may_gas_out_chasing_early_knockout
      - doesn't_conserve_for_later_rounds
      - no_adjustment_based_on_scorecard

  medium_paceControl: # 50-70
    tendencies:
      - basic_awareness_of_stamina
      - slows_when_very_tired
      - some_round_to_round_adjustment

  high_paceControl: # 70-90
    tendencies:
      - intelligent_energy_management
      - conserves_in_won_rounds
      - pushes_in_close_rounds
      - reserves_for_championship_rounds
      - adjusts_to_opponent_pace

  elite_paceControl: # 90+
    tendencies:
      - perfect_energy_management
      - pushes_exact_right_moments
      - never_gasses_out_unexpectedly
      - tactical_rest_periods
      - strategic_clinching
```

### Round Strategy

```javascript
function determinePaceForRound(fighter, roundNumber, scorecards) {
  const paceControl = fighter.stamina.paceControl;
  const totalRounds = 12; // Championship
  const currentStaminaPercent = fighter.currentStamina / fighter.maxStamina;

  // Base pace (1.0 = normal)
  let pace = 1.0;

  // Championship rounds (10-12) consideration
  if (roundNumber >= 10 && paceControl > 60) {
    pace *= 1.1; // Push harder in late rounds
  }

  // Scorecard consideration
  const scoreDiff = calculateScoreDifference(scorecards, fighter);
  if (paceControl > 70) {
    if (scoreDiff > 2) {
      // Winning comfortably, conserve
      pace *= 0.85;
    } else if (scoreDiff < -2) {
      // Losing, need to push
      pace *= 1.2;
    }
  }

  // Stamina conservation
  if (currentStaminaPercent < 0.5 && paceControl > 60) {
    pace *= 0.8;
  }

  // Opponent hurt/tired consideration
  if (fighter.opponent.isHurt || fighter.opponent.staminaPercent < 0.3) {
    pace *= 1.3; // Go for finish regardless of paceControl
  }

  return clamp(pace, 0.5, 1.5);
}
```

---

## Second Wind

### Second Wind Trigger

```yaml
second_wind:
  description: |
    Sudden burst of energy in late rounds when running on empty.
    Rare and based on secondWind attribute and heart.

  trigger_conditions:
    round: 9-12 only
    stamina: below 40%
    not_triggered_yet: once per fight
    roll_chance: secondWind / 100 per qualifying round

  effects:
    stamina_restore: 25% of max
    recovery_bonus: +50% passive recovery for 60 seconds
    power_boost: +10% for 60 seconds
    psychological: confidence boost

  duration: 60 seconds or end of round
  limit: once per fight
```

### Implementation

```javascript
function checkSecondWind(fighter, roundNumber) {
  // Must be championship rounds
  if (roundNumber < 9) return false;

  // Must be low on stamina
  if (fighter.currentStamina > fighter.maxStamina * 0.4) return false;

  // Must not have triggered already
  if (fighter.secondWindUsed) return false;

  // Roll for second wind
  const chance = fighter.stamina.secondWind / 100;

  // Heart bonus
  const heartBonus = (fighter.mental.heart - 50) / 200;

  // Behind on scorecards bonus
  const scoreDiff = getScoreDifference(fighter);
  const desperationBonus = scoreDiff < -2 ? 0.1 : 0;

  const totalChance = chance + heartBonus + desperationBonus;

  if (Math.random() < totalChance) {
    // Trigger second wind
    fighter.secondWindUsed = true;

    // Apply effects
    fighter.currentStamina += fighter.maxStamina * 0.25;
    applyBuff(fighter, 'second_wind', 'internal');

    emitEvent('SECOND_WIND', {
      fighter: fighter.id,
      round: roundNumber,
      staminaRestored: fighter.maxStamina * 0.25
    });

    return true;
  }

  return false;
}
```

---

## Body Damage Impact on Stamina

### Cumulative Effect

```yaml
body_damage_stamina_effects:
  description: |
    Body shots drain stamina immediately and reduce recovery capacity.

  immediate_drain:
    per_body_shot: damage * 0.5 stamina points
    liver_shot: damage * 1.0 stamina points
    solar_plexus: damage * 0.8 + 3-5 second inability

  cumulative_effects:
    at_25_body_damage:
      recovery_rate: -10%
      passive_regen: -10%
    at_50_body_damage:
      recovery_rate: -25%
      passive_regen: -20%
      breathing: affected
    at_75_body_damage:
      recovery_rate: -40%
      passive_regen: -35%
      movement: impacted
    at_100_body_damage:
      recovery_rate: -60%
      passive_regen: -50%
      tko_consideration: likely
```

---

## Stamina Visualization

### CLI Display

```
STAMINA
Fighter A: ██████████████████░░░░░░░░░░░░ 62% [TIRED]
Fighter B: ███████████████████████████░░░ 89% [FRESH]

Round 6 Stamina Usage:
A: Punches: -45  Movement: -12  Defense: -8   Recovery: +18  Net: -47
B: Punches: -28  Movement: -15  Defense: -12  Recovery: +25  Net: -30
```

---

## Implementation Notes

### Stamina State Object

```javascript
const fighterStamina = {
  current: 72,
  max: 112,
  percent: 0.643,
  tier: 'good',

  recovery: {
    passiveRate: 0.56,
    betweenRound: 31.4,
    modifiers: {
      bodyDamage: -15,
      age: -5
    }
  },

  thisRound: {
    spent: 45,
    recovered: 12,
    net: -33
  },

  secondWind: {
    available: true,
    used: false
  },

  fatiguePenalties: {
    power: -3,
    speed: -2
  }
};
```

### Stamina Event

```javascript
const staminaEvent = {
  type: 'STAMINA_CHANGE',
  fighter: 'A',
  timestamp: 156.5,
  change: -3.5,
  reason: 'cross_thrown',
  newValue: 68.5,
  newPercent: 0.612,
  tier: 'good'
};
```
