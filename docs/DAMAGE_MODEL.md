# Damage Model

This document defines how damage is accumulated, processed, and affects fighters. Includes the buff/debuff system, knockdown mechanics, cuts and swelling, and recovery.

## Damage Types

### Head Damage

```yaml
head_damage:
  description: Damage to the head affecting consciousness and reflexes
  accumulates: true (throughout fight)
  partial_recovery: between_rounds (10-20%)

  thresholds:
    flash_knockdown: 35-50 (based on chin)
    knockdown: 50-70 (based on chin)
    knockout: 75-100 (based on chin)
    tko_consideration: sustained > 80% threshold

  effects_at_levels:
    0-25%:
      description: fresh
      penalties: none
    25-50%:
      description: taking_punishment
      penalties:
        reflexes: -5%
        accuracy: -3%
    50-75%:
      description: hurt
      penalties:
        reflexes: -15%
        accuracy: -10%
        handSpeed: -8%
        composure_check: required
    75-90%:
      description: badly_hurt
      penalties:
        all_attributes: -20%
        knockdown_vulnerability: high
    90-100%:
      description: on_the_verge
      penalties:
        all_attributes: -35%
        flash_ko_risk: very_high
```

### Body Damage

```yaml
body_damage:
  description: Damage to torso affecting stamina and mobility
  accumulates: true
  partial_recovery: minimal (5-10% between rounds)

  effects:
    stamina_recovery_reduction: body_damage * 0.5%
    movement_speed_reduction: body_damage * 0.3%
    punch_output_reduction: body_damage * 0.2%

  critical_zones:
    liver:
      location: right_side (left hook target)
      critical_threshold: 25 damage in single shot
      effect: delayed_knockdown (2-4 seconds)
      recovery: very_slow
    solar_plexus:
      location: center_torso
      critical_threshold: 30 damage
      effect: wind_knocked_out
      recovery: 3-5 seconds inability to act
    floating_ribs:
      location: lower_sides
      critical_threshold: 20 damage repeated
      effect: severe_pain, movement_penalty
```

### Cut Damage

```yaml
cuts:
  description: Facial lacerations causing bleeding and vision issues
  locations:
    - eyebrow_left
    - eyebrow_right
    - cheekbone_left
    - cheekbone_right
    - nose
    - lip

  severity_levels:
    minor:
      blood: minimal
      vision_impact: none
      stoppage_risk: 0%
    moderate:
      blood: steady
      vision_impact: 5-10% (if near eye)
      stoppage_risk: 5%
    severe:
      blood: heavy
      vision_impact: 15-25%
      stoppage_risk: 25%
    critical:
      blood: profuse
      vision_impact: 30-50%
      stoppage_risk: 60%
      doctor_check: likely

  factors:
    skin_toughness: genetic (hidden attribute)
    scar_tissue: increases_cut_risk
    previous_cuts: compound_damage
    glove_lacing: can_cause_cuts
    headbutts: accidental_or_intentional

  between_rounds:
    cutman_effectiveness: corner_crew_skill
    reduce_severity: 1 level per round (good cutman)
    swelling_reduction: enswell_application
```

### Swelling

```yaml
swelling:
  description: Facial swelling affecting vision and vulnerability
  locations:
    - eye_left
    - eye_right
    - cheekbone_left
    - cheekbone_right

  severity_levels:
    minor:
      visual: slight_puffiness
      vision_impact: 0%
    moderate:
      visual: noticeable_swelling
      vision_impact: 10% (if eye area)
    severe:
      visual: eye_closing
      vision_impact: 30%
      peripheral_loss: 50%
    closed:
      visual: eye_shut
      vision_impact: 50% (one eye)
      stoppage_risk: high

  progression:
    accumulates: per_punch_to_area
    spreads: yes (eye swelling affects surrounding)
    reduction: enswell, ice (between rounds)
```

---

## Damage Calculation

### Base Damage Formula

```javascript
function calculateDamage(punch, attacker, defender, context) {
  // Base damage from punch type
  let damage = PUNCH_BASE_DAMAGE[punch.type];

  // Power attribute
  const powerAttr = punch.hand === 'lead'
    ? attacker.power.powerLeft
    : attacker.power.powerRight;
  damage *= (powerAttr / 70);

  // Punch type power modifier
  damage *= PUNCH_POWER_MODIFIERS[punch.type];

  // Weight factor
  damage *= 1 + (attacker.physical.weight - 70) * 0.008;

  // Counter bonus
  if (context.isCounter) {
    damage *= 1 + (attacker.offense.counterPunching / 200);
  }

  // Stamina factor (tired = less power)
  const staminaPercent = attacker.currentStamina / attacker.maxStamina;
  const punchingStaminaMod = attacker.power.punchingStamina / 100;
  damage *= staminaPercent + (1 - staminaPercent) * punchingStaminaMod;

  // Clean vs blocked
  if (context.blocked) {
    damage *= 0.3 + (1 - defender.defense.blocking / 200) * 0.3;
  }

  // Partial hit (glancing blow)
  damage *= context.cleanness; // 0.3 to 1.0

  // Defender's chin
  damage *= (100 / defender.mental.chin);

  // Hurt defender bonus
  if (defender.isHurt) {
    damage *= 1 + (attacker.mental.killerInstinct / 200);
  }

  return damage;
}
```

### Damage Distribution

```yaml
damage_distribution:
  clean_head_shot:
    head_damage: 100%
    cut_chance: 5-15%
    swelling_chance: 10-20%

  blocked_head_shot:
    head_damage: 20-40%
    arm_damage: 10%
    cut_chance: 0%
    swelling_chance: 2%

  body_shot:
    body_damage: 100%
    stamina_drain: 50% of damage
    head_damage: 0%

  liver_shot:
    body_damage: 150%
    delayed_effect: true
    knockdown_check: if damage > threshold

  counter_punch:
    damage_multiplier: 1.2-1.4
    ko_check_bonus: +15%
```

---

## Knockdown System

### Knockdown Threshold

```javascript
function checkKnockdown(defender, damage, punchType) {
  // Base threshold from chin
  const baseThreshold = 35 + (defender.mental.chin * 0.35);

  // Current damage level affects threshold
  const currentDamagePercent = defender.currentHeadDamage / defender.maxHeadDamage;
  const damageModifier = 1 - (currentDamagePercent * 0.4);

  // Effective threshold
  const threshold = baseThreshold * damageModifier;

  // Check if damage exceeds threshold
  if (damage >= threshold) {
    return {
      knockdown: true,
      type: damage >= threshold * 1.5 ? 'KNOCKOUT' : 'KNOCKDOWN',
      severity: calculateKnockdownSeverity(damage, threshold)
    };
  }

  // Flash knockdown check (sudden impact even below threshold)
  const flashKDChance = (damage / threshold) * 0.3;
  if (Math.random() < flashKDChance) {
    return {
      knockdown: true,
      type: 'FLASH_KNOCKDOWN',
      severity: 'light'
    };
  }

  return { knockdown: false };
}
```

### Knockdown Severity

```yaml
knockdown_severity:
  flash:
    description: legs_buckled, touched_canvas
    count_likely: 2-4
    recovery_chance: 98%
    post_recovery_penalty: -10% for 30 seconds

  light:
    description: went_down, but_alert
    count_likely: 4-6
    recovery_chance: 90%
    post_recovery_penalty: -15% for 60 seconds

  moderate:
    description: hurt_badly, struggling_to_rise
    count_likely: 6-8
    recovery_chance: 70%
    post_recovery_penalty: -25% for 90 seconds

  severe:
    description: badly_hurt, barely_beating_count
    count_likely: 8-9
    recovery_chance: 40%
    post_recovery_penalty: -35% for remainder of round

  devastating:
    description: might_not_beat_count
    count_likely: 9-10
    recovery_chance: 15%
    post_recovery_penalty: -50% if gets up
```

### Recovery Check

```javascript
function checkKnockdownRecovery(fighter, knockdown, count) {
  // Base recovery chance from heart
  let recoveryChance = fighter.mental.heart / 100;

  // Severity modifier
  const severityMod = {
    'flash': 1.0,
    'light': 0.9,
    'moderate': 0.7,
    'severe': 0.4,
    'devastating': 0.15
  }[knockdown.severity];

  recoveryChance *= severityMod;

  // Count pressure (harder to recover at 8 than 4)
  recoveryChance *= 1 - (count / 15);

  // Previous knockdowns this fight
  const knockdownCount = fighter.knockdownsThisFight;
  recoveryChance *= Math.pow(0.85, knockdownCount);

  // Accumulated damage
  const damagePercent = fighter.currentHeadDamage / fighter.maxHeadDamage;
  recoveryChance *= 1 - (damagePercent * 0.5);

  // Check at each count
  if (count >= 4 && Math.random() < recoveryChance) {
    return { recovered: true, atCount: count };
  }

  return { recovered: false };
}
```

---

## Buff System

### Active Buffs

```yaml
buffs:
  second_wind:
    trigger: |
      - rounds 9-12
      - stamina below 40%
      - secondWind attribute check
    effect:
      stamina_restore: 25% of max
      stamina_recovery_bonus: +50% for 60 seconds
    duration: 60 seconds or end of round
    limit: once_per_fight

  adrenaline_surge:
    trigger: |
      - after being knocked down and recovering
      - after hurting opponent badly
    effect:
      power: +15%
      speed: +10%
      pain_resistance: +20%
    duration: 30-45 seconds

  crowd_momentum:
    trigger: home_fighter OR momentum_shift
    effect:
      confidence: +10%
      heart: +5%
    duration: until_momentum_shifts

  corner_advice:
    trigger: between_rounds, good_corner
    effect:
      based_on_corner_instructions
      may_reveal_opponent_weakness
      tactical_adjustment_bonus
    duration: next_round

  successful_knockdown:
    trigger: knocking_opponent_down
    effect:
      confidence: +15%
      killerInstinct: +10%
      stamina_recovery: burst
    duration: until_opponent_recovers_fully

  in_the_zone:
    trigger: |
      - landed 3+ clean power shots in sequence
      - all_attributes_temporarily_elevated
    effect:
      accuracy: +10%
      power: +8%
      confidence: +15%
    duration: 20-40 seconds
    rare: true
```

### Buff Application

```javascript
function applyBuff(fighter, buffType, source) {
  const buff = BUFF_DEFINITIONS[buffType];

  // Check if already active
  if (fighter.activeBuffs[buffType]) {
    // Refresh duration if same buff
    fighter.activeBuffs[buffType].remainingDuration = buff.duration;
    return;
  }

  // Apply buff
  fighter.activeBuffs[buffType] = {
    effects: buff.effects,
    remainingDuration: buff.duration,
    source: source
  };

  // Apply attribute modifications
  for (const [attr, mod] of Object.entries(buff.effects)) {
    fighter.modifiedAttributes[attr] =
      (fighter.modifiedAttributes[attr] || 1.0) * (1 + mod / 100);
  }

  // Emit event
  emitEvent('BUFF_APPLIED', { fighter, buffType, effects: buff.effects });
}
```

---

## Debuff System

### Active Debuffs

```yaml
debuffs:
  cut_bleeding:
    trigger: cut_opened
    severity_levels: [minor, moderate, severe, critical]
    effects:
      vision_impairment: based_on_severity_and_location
      blood_in_eyes: accuracy_penalty
      referee_attention: stoppage_risk
    progression: may_worsen_if_hit_again
    treatment: cutman_between_rounds

  eye_swelling:
    trigger: accumulated_damage_to_eye_area
    severity_levels: [minor, moderate, severe, closed]
    effects:
      vision: -10% to -50%
      peripheral_vision: reduced
      defensive_penalty: can't_see_hooks_from_side
    progression: worsens_over_fight
    treatment: enswell_between_rounds

  broken_hand:
    trigger: |
      - fragile_hands_hidden_flaw
      - hard_punch_to_skull
      - accumulated_blocked_punches
    effects:
      power_affected_hand: -30% to -50%
      accuracy_affected_hand: -20%
      pain_on_punching: stamina_cost_increase
    progression: does_not_heal_during_fight
    fighter_adaptation: may_avoid_using_hand

  body_damage_accumulation:
    trigger: accumulated_body_shots
    effects:
      stamina_recovery: -10% to -40%
      movement_speed: -5% to -20%
      punch_output: -5% to -15%
    progression: worsens_with_more_body_shots
    treatment: minimal_recovery_between_rounds

  concussive_damage:
    trigger: head_damage_above_50%
    effects:
      reflexes: -10% to -30%
      balance: affected
      ko_vulnerability: increased
    progression: accumulates_throughout_fight
    treatment: only_full_recovery_between_fights

  exhaustion:
    trigger: stamina_below_25%
    effects:
      all_physical_attributes: -15% to -30%
      defensive_effectiveness: -20%
      punch_output: severely_limited
    recovery: rest_or_end_of_round

  hurt_state:
    trigger: damage_threshold_exceeded
    severity_levels: [minor, moderate, severe, critical]
    effects:
      see_FIGHTER_STATES.md_for_details
    duration: 3-20 seconds based on severity
    recovery: time + not_being_hit

  cornered:
    trigger: position_trapped_in_corner
    effects:
      defensive_effectiveness: -15%
      movement_options: severely_limited
      psychological_pressure: composure_check
    escape: referee_break OR successful_escape_movement

  intimidated:
    trigger: opponent_intimidation > own_composure
    effects:
      confidence: -10%
      aggression: -15%
      risk_aversion: increased
    duration: until_landing_clean_or_not_being_hit

  front_runner_collapse:
    trigger: |
      - has_front_runner_flaw
      - going_behind_on_scorecards OR been_knocked_down
    effects:
      all_mental_attributes: -20% to -40%
      heart: severely_impacted
      quit_risk: elevated
    duration: remainder_of_fight
```

### Debuff Application

```javascript
function applyDebuff(fighter, debuffType, severity, source) {
  const debuff = DEBUFF_DEFINITIONS[debuffType];

  // Stack or replace existing
  if (fighter.activeDebuffs[debuffType]) {
    // Most debuffs stack in severity
    const current = fighter.activeDebuffs[debuffType];
    current.severity = Math.min(current.severity + 1, debuff.maxSeverity);
    current.source = source;
  } else {
    fighter.activeDebuffs[debuffType] = {
      severity: severity,
      effects: debuff.effects[severity],
      source: source,
      appliedAt: getCurrentFightTime()
    };
  }

  // Apply attribute penalties
  const effects = debuff.effects[severity];
  for (const [attr, penalty] of Object.entries(effects)) {
    if (typeof penalty === 'number') {
      fighter.modifiedAttributes[attr] =
        (fighter.modifiedAttributes[attr] || 1.0) * (1 + penalty / 100);
    }
  }

  // Emit event
  emitEvent('DEBUFF_APPLIED', {
    fighter,
    debuffType,
    severity,
    effects
  });
}
```

---

## Recovery System

### Between-Round Recovery

```yaml
between_round_recovery:
  base_duration: 60 seconds

  head_damage_recovery:
    base: 10% of accumulated
    modifier: recoveryRate / 100
    corner_bonus: up to +5%
    maximum: 20% per round

  body_damage_recovery:
    base: 5% of accumulated
    modifier: recoveryRate / 100
    corner_bonus: up to +3%
    maximum: 10% per round

  stamina_recovery:
    formula: |
      recovered = maxStamina * (recoveryRate / 100) * 0.4
      + cornerBonus
    corner_water: +5%
    corner_advice: +3% (if calm)

  cut_treatment:
    good_cutman: reduce_severity_by_1
    average_cutman: stop_bleeding_temporarily
    poor_cutman: minimal_effect
    reopening_risk: based_on_next_hit

  swelling_treatment:
    enswell_application: reduce_severity_by_1
    ice: slow_progression
    no_treatment: continues_worsening

  corner_activities:
    seconds_0-30: water, breathing, initial_assessment
    seconds_30-45: cut_treatment, swelling_treatment
    seconds_45-55: advice, strategy_adjustment
    seconds_55-60: mouthpiece, stand_up
```

### In-Fight Recovery

```yaml
in_fight_recovery:
  stamina:
    passive_recovery: 0.5-1.0 per second (based on cardio)
    clinch_recovery: +50% passive rate
    backing_off_recovery: +25% passive rate
    active_fighting: no recovery

  hurt_state:
    recovery_time: based_on_severity
    clinching: extends_recovery_time
    not_being_hit: reduces_recovery_time
    being_hit_while_hurt: resets_or_extends

  knockdown_recovery:
    see_knockdown_system: above
    post_recovery_fog: 30-90 seconds reduced attributes
```

---

## Damage Visualization

### Health Display

```
Fighter A                                        Fighter B
HEAD:  ████████████████████░░░░░░ 78%           HEAD:  ██████████████░░░░░░░░░ 62%
BODY:  █████████████████████████░ 95%           BODY:  ██████████████████░░░░░ 72%
STAM:  ██████████████████░░░░░░░░ 65%           STAM:  ████████████████████░░░ 81%

[CUT: L.Eyebrow - Moderate]                     [SWELLING: R.Eye - Minor]
[DEBUFF: Exhaustion]                            [BUFF: Crowd Momentum]
```

---

## Implementation Notes

### Damage State Object

```javascript
const fighterDamageState = {
  headDamage: {
    current: 45,
    max: 100,
    threshold: 65 // Based on chin
  },

  bodyDamage: {
    current: 28,
    max: 100,
    zones: {
      liver: 15,
      solarPlexus: 8,
      ribs: 5
    }
  },

  cuts: {
    leftEyebrow: { severity: 2, bleeding: true },
    rightCheek: null
  },

  swelling: {
    leftEye: { severity: 1 },
    rightEye: null
  },

  activeBuffs: {
    'adrenaline_surge': {
      remainingDuration: 25,
      effects: { power: 15, speed: 10 }
    }
  },

  activeDebuffs: {
    'exhaustion': {
      severity: 1,
      effects: { allPhysical: -15 }
    }
  },

  knockdowns: {
    thisRound: 0,
    thisFight: 1,
    lastKnockdown: { round: 4, time: 125.5 }
  }
};
```
