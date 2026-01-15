# Fighter Attributes

This document defines all fighter attributes used in the simulation. Every attribute uses a **1-100 scale** unless otherwise noted, and directly influences AI decision-making and combat calculations.

## Attribute Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| Physical | 6 | Fixed physical characteristics |
| Power | 5 | Knockout threat and punching force |
| Speed | 5 | Tempo, timing, and quickness |
| Stamina | 5 | Conditioning and energy management |
| Defense | 7 | Avoiding and absorbing damage |
| Offense | 7 | Landing punches effectively |
| Technical | 7 | Ring IQ and boxing skill |
| Mental | 8 | Heart, intangibles, psychology |
| **Total** | **50** | |

---

## Physical Attributes

Physical attributes define the fighter's body and are generally fixed (except age, which progresses).

### height
```yaml
attribute: height
type: physical
unit: centimeters
range: 150-220
description: Fighter's standing height
effects:
  - Determines natural reach advantage/disadvantage
  - Affects optimal fighting range
  - Influences inside vs outside effectiveness
  - Taller fighters have advantage at range
  - Shorter fighters have advantage inside
calculations:
  reach_baseline: height * 1.02 (average)
  optimal_range: derived from reach
  inside_modifier: -(height - 175) * 0.1 (shorter = better inside)
  outside_modifier: (height - 175) * 0.1 (taller = better outside)
```

### weight
```yaml
attribute: weight
type: physical
unit: kilograms (fight weight)
range: 47-140
description: Fighter's weight at weigh-in
effects:
  - Power modifier (heavier = more force)
  - Clinch effectiveness
  - Stamina drain rate
  - Movement speed modifier
calculations:
  power_modifier: 1 + (weight - class_average) * 0.005
  clinch_modifier: weight / opponent_weight
  stamina_drain: base_drain * (weight / 75)
weight_classes:
  minimumweight: 47.6
  light_flyweight: 49.0
  flyweight: 50.8
  super_flyweight: 52.2
  bantamweight: 53.5
  super_bantamweight: 55.3
  featherweight: 57.2
  super_featherweight: 59.0
  lightweight: 61.2
  super_lightweight: 63.5
  welterweight: 66.7
  super_welterweight: 69.9
  middleweight: 72.6
  super_middleweight: 76.2
  light_heavyweight: 79.4
  cruiserweight: 90.7
  heavyweight: unlimited
```

### reach
```yaml
attribute: reach
type: physical
unit: centimeters (arm span)
range: 150-230
description: Fighter's arm span from fingertip to fingertip
effects:
  - Jab effectiveness at range
  - Optimal fighting distance
  - Ability to fight on the outside
  - Difficulty for shorter-armed opponents to close
calculations:
  reach_advantage: (own_reach - opponent_reach) / 2.5
  jab_range_bonus: reach_advantage * 2 (to jabAccuracy)
  optimal_distance: reach * 0.45
correlation_with_height: typically reach = height * 1.00 to 1.06
  - stocky: height * 0.98-1.01
  - average: height * 1.01-1.04
  - lanky: height * 1.04-1.08
```

### age
```yaml
attribute: age
type: physical
unit: years
range: 16-50
description: Fighter's current age
effects:
  - Modifies multiple attributes based on age curve
  - Peak performance window: 25-32
  - Young fighters: higher potential, less experience
  - Older fighters: declining physical, higher experience
age_modifiers:
  18-21:
    speed_attrs: +5%
    power_attrs: -5%
    experience: -30%
    reflexes: +5%
    recovery: +10%
  22-25:
    all_physical: baseline
    experience: -10%
  26-32:
    all_physical: baseline (peak)
    experience: baseline
  33-35:
    speed_attrs: -5%
    reflexes: -8%
    chin: -5%
    recovery: -10%
    experience: +10%
  36-38:
    speed_attrs: -12%
    reflexes: -15%
    chin: -12%
    recovery: -20%
    cardio: -10%
    experience: +15%
  39+:
    speed_attrs: -20%
    reflexes: -25%
    chin: -20%
    recovery: -30%
    cardio: -20%
    power: -10%
    experience: +20%
```

### stance
```yaml
attribute: stance
type: physical
values: [orthodox, southpaw, switch]
description: Fighter's natural fighting stance
effects:
  - Angle advantages in matchups
  - Orthodox vs southpaw creates open stance
  - Switch-hitters can change dynamically
matchup_modifiers:
  orthodox_vs_orthodox: neutral
  southpaw_vs_southpaw: neutral
  orthodox_vs_southpaw:
    lead_hand_accuracy: -8% (both fighters)
    rear_hand_power_opportunity: +15%
    liver_shot_exposure: +20%
  switch_hitter:
    can_change_mid_fight: true
    adaptation_bonus: +10% when switching to exploit weakness
    mastery_penalty: -5% to both stances (jack of all trades)
```

### bodyType
```yaml
attribute: bodyType
type: physical
values: [lean, average, muscular, stocky, lanky]
description: Fighter's body composition and build
effects:
  lean:
    speed_bonus: +3%
    power_penalty: -3%
    reach_ratio: 1.02
    stamina_bonus: +5%
  average:
    all_modifiers: baseline
    reach_ratio: 1.02
  muscular:
    power_bonus: +5%
    speed_penalty: -2%
    reach_ratio: 1.00
    stamina_penalty: -3%
  stocky:
    power_bonus: +3%
    chin_bonus: +5%
    reach_ratio: 0.98
    inside_fighting_bonus: +5%
  lanky:
    reach_ratio: 1.06
    outside_fighting_bonus: +5%
    inside_fighting_penalty: -5%
    clinch_defense_penalty: -5%
```

---

## Power Attributes

Power attributes determine knockout threat and punching force.

### powerLeft
```yaml
attribute: powerLeft
type: power
range: 1-100
description: Raw power in left hand punches
effects:
  - Base damage for all left hand punches
  - Jab stopping power (orthodox fighters)
  - Lead hook knockout potential
  - Lead uppercut damage
damage_calculation: base_damage * (powerLeft / 70)
notable_ranges:
  1-40: pillow-fisted, relies on volume
  41-60: average power, can hurt with accumulation
  61-75: solid power, can score knockdowns
  76-90: heavy hands, knockout threat every punch
  91-100: devastating, historically elite power
```

### powerRight
```yaml
attribute: powerRight
type: power
range: 1-100
description: Raw power in right hand punches (rear hand for orthodox)
effects:
  - Base damage for all right hand punches
  - Cross/straight right damage
  - Rear hook knockout potential
  - Rear uppercut damage
damage_calculation: base_damage * (powerRight / 70)
importance: typically more important than powerLeft for orthodox fighters
  - Rear hand has more torque and leverage
  - Most knockouts come from rear hand
```

### knockoutPower
```yaml
attribute: knockoutPower
type: power
range: 1-100
description: Ability to finish fights when opponent is hurt
effects:
  - KO probability multiplier when opponent in HURT state
  - Flash knockdown conversion rate
  - Damage bonus against hurt opponents
calculations:
  ko_check_modifier: knockoutPower / 75
  hurt_opponent_damage_bonus: (knockoutPower - 50) * 0.5%
  flash_ko_chance: base_chance * (knockoutPower / 80)
notable_ranges:
  1-40: rarely finishes hurt opponents
  41-60: can finish if opponent badly hurt
  61-80: reliable finisher
  81-100: terrifying closer, one punch away from ending fight
```

### bodyPunching
```yaml
attribute: bodyPunching
type: power
range: 1-100
description: Effectiveness and damage of body shots
effects:
  - Body shot damage multiplier
  - Opponent stamina drain on body shots
  - Liver shot effectiveness
  - Cumulative body damage accumulation
calculations:
  body_damage_modifier: bodyPunching / 70
  stamina_drain_per_body_shot: base_drain * (bodyPunching / 65)
  liver_shot_multiplier: 1 + (bodyPunching - 50) * 0.02
importance:
  - Reduces opponent's stamina recovery
  - Sets up head shots in later rounds
  - Can cause TKO from body shot
```

### punchingStamina
```yaml
attribute: punchingStamina
type: power
range: 1-100
description: How well power is maintained when fatigued
effects:
  - Power retention as stamina depletes
  - Late-round knockout threat
  - Punch effectiveness in championship rounds
calculations:
  power_at_stamina_level: |
    effective_power = base_power * (
      stamina_percent +
      (1 - stamina_percent) * (punchingStamina / 100)
    )
example:
  at 50% stamina with punchingStamina 80:
    power_retained: 50% + 50% * 0.8 = 90%
  at 50% stamina with punchingStamina 40:
    power_retained: 50% + 50% * 0.4 = 70%
```

---

## Speed Attributes

Speed attributes govern tempo, timing, and quickness.

### handSpeed
```yaml
attribute: handSpeed
type: speed
range: 1-100
description: Velocity of punch delivery
effects:
  - Opponent's ability to block/evade
  - Combination fluidity
  - Counter-punch window size
  - Punch telegraph reduction
calculations:
  block_difficulty: handSpeed / opponent_reflexes
  combo_speed_bonus: handSpeed * 0.3 (added to combinationSpeed)
  telegraph_reduction: handSpeed / 100
notable_ranges:
  1-50: slow, telegraphed punches
  51-70: average speed, can be seen coming
  71-85: fast hands, difficult to react
  86-100: blur, elite hand speed
```

### footSpeed
```yaml
attribute: footSpeed
type: speed
range: 1-100
description: Speed of foot movement and ring mobility
effects:
  - Ring cutting ability
  - Escape speed when hurt
  - Ability to close/create distance
  - Lateral movement speed
calculations:
  distance_change_rate: footSpeed * 0.1 units/second
  escape_success: footSpeed vs opponent_footSpeed
  ring_cut_effectiveness: footSpeed * ringGeneralship / 100
importance:
  - Critical for out-boxers (creating distance)
  - Critical for swarmers (closing distance)
  - Affects ability to escape corners
```

### reflexes
```yaml
attribute: reflexes
type: speed
range: 1-100
description: Reaction time to incoming punches and openings
effects:
  - Defensive reaction success rate
  - Counter-punch window recognition
  - Slip/block decision speed
  - Ability to exploit momentary openings
calculations:
  defensive_reaction: reflexes vs opponent_handSpeed
  counter_window: base_window * (reflexes / 70)
  surprise_punch_vulnerability: 100 - reflexes
age_sensitivity: HIGH - reflexes decline fastest with age
notable_ranges:
  1-50: slow reactions, gets caught often
  51-70: average, can react to telegraphed punches
  71-85: sharp, catches most punches
  86-100: elite, seems to see punches before they're thrown
```

### firstStep
```yaml
attribute: firstStep
type: speed
range: 1-100
description: Explosive initial movement to close or create distance
effects:
  - Sudden attack initiation
  - Surprise factor in offense
  - Escape burst when trapped
  - Angle creation speed
calculations:
  engagement_speed: firstStep * 0.15 units per burst
  surprise_attack_bonus: (firstStep - opponent_reflexes) * 0.5%
  escape_burst: firstStep vs opponent_ringGeneralship
importance:
  - Critical for inside fighters (gap closing)
  - Important for creating punching angles
  - Enables hit-and-run tactics
```

### combinationSpeed
```yaml
attribute: combinationSpeed
type: speed
range: 1-100
description: Speed of throwing multiple punches in sequence
effects:
  - Time between punches in combinations
  - Number of punches before opponent can react
  - Combination length sustainability
calculations:
  inter_punch_delay: 0.3 - (combinationSpeed * 0.002) seconds
  max_combo_before_reaction: combinationSpeed / 20 punches
  combo_stamina_efficiency: combinationSpeed / 80
synergy: combines with combinationPunching for volume effectiveness
```

---

## Stamina Attributes

Stamina attributes govern conditioning and energy management.

### cardio
```yaml
attribute: cardio
type: stamina
range: 1-100
description: Total stamina pool and aerobic conditioning
effects:
  - Maximum stamina capacity
  - Sustain pace throughout fight
  - Recovery rate between rounds
  - Resistance to fatigue effects
calculations:
  max_stamina: 80 + (cardio * 0.4) units
  base_recovery_rate: cardio * 0.08 per second (at rest)
  fatigue_threshold: cardio * 0.4 (below this, penalties apply)
notable_ranges:
  1-50: gasses out quickly, limited to 4-6 rounds
  51-70: average conditioning, can go 8-10 rounds
  71-85: well-conditioned, 12-round fighter
  86-100: iron lungs, relentless pace possible
```

### recoveryRate
```yaml
attribute: recoveryRate
type: stamina
range: 1-100
description: Speed of stamina recovery between rounds
effects:
  - Stamina restored during 60-second rest
  - Ability to recover from high-output rounds
  - Late-fight energy availability
calculations:
  between_round_recovery: |
    recovered = max_stamina * (recoveryRate / 100) * 0.4
    (40% of max stamina at 100 recoveryRate)
  corner_bonus: recoveryRate * corner_effectiveness / 100
importance:
  - Critical for fighters with high work rate
  - Enables strategic high-output rounds
  - Compensates for lower cardio if high
```

### workRate
```yaml
attribute: workRate
type: stamina
range: 1-100
description: Ability to maintain high punch output efficiently
effects:
  - Stamina cost reduction per action
  - Sustainable punches per round
  - Efficiency of offense
calculations:
  stamina_cost_modifier: 1 - (workRate - 50) * 0.01
  sustainable_output: cardio * workRate / 100 punches/round
example:
  workRate 80: stamina costs reduced by 30%
  workRate 40: stamina costs increased by 10%
notable_ranges:
  1-50: low output, tires quickly when active
  51-70: average output, standard pace
  71-85: high output, pressure style viable
  86-100: relentless, can throw all night
```

### secondWind
```yaml
attribute: secondWind
type: stamina
range: 1-100
description: Ability to find extra energy in championship rounds
effects:
  - Chance of stamina surge in rounds 9-12
  - Emergency energy reserve when depleted
  - Mental energy boost when behind on cards
calculations:
  second_wind_trigger_chance: secondWind / 100 per round (9-12)
  stamina_surge_amount: max_stamina * 0.25
  activation_conditions:
    - rounds 9-12 only
    - stamina below 40%
    - OR significantly behind on scorecards
  can_only_trigger: once per fight
```

### paceControl
```yaml
attribute: paceControl
type: stamina
range: 1-100
description: AI ability to manage energy expenditure appropriately
effects:
  - Intelligent stamina conservation
  - Knowing when to push and when to rest
  - Avoiding gassing out
  - Strategic pacing over 12 rounds
ai_behavior:
  low_paceControl:
    - poor round-to-round stamina management
    - may gas out chasing knockdowns
    - doesn't adjust pace to stamina level
  high_paceControl:
    - conserves energy in won rounds
    - pushes in close rounds
    - reserves energy for championship rounds
    - adjusts to opponent's pace
```

---

## Defense Attributes

Defense attributes determine ability to avoid and absorb damage.

### headMovement
```yaml
attribute: headMovement
type: defense
range: 1-100
description: Ability to slip, bob, and weave to avoid head punches
effects:
  - Evasion percentage for head-targeted punches
  - Sets up counter-punch opportunities
  - Reduces blocked damage (avoided entirely)
calculations:
  evasion_chance: |
    base_chance = headMovement / 2
    vs_jab: base_chance + 10%
    vs_cross: base_chance + 5%
    vs_hook: base_chance
    vs_uppercut: base_chance - 20% (catches bobbers)
  counter_opportunity: headMovement * 0.3% per evaded punch
techniques:
  slip: avoid straight punches (jab, cross)
  bob: duck under hooks
  weave: continuous lateral head motion
  pull: lean back from punches
notable_ranges:
  1-40: stationary head, easy target
  41-60: some movement, avoids obvious punches
  61-80: slick, hard to hit clean
  81-100: matrix-level, makes opponents miss badly
```

### blocking
```yaml
attribute: blocking
type: defense
range: 1-100
description: Ability to absorb punches on gloves and arms
effects:
  - Damage reduction when blocking
  - Guard integrity under pressure
  - Arm fatigue from blocking
calculations:
  damage_reduction: 40 + (blocking * 0.4)%
    - at blocking 50: 60% reduction
    - at blocking 100: 80% reduction
  arm_fatigue: punches_blocked * (100 - blocking) / 100
  guard_break_resistance: blocking vs opponent_power
synergy: works with DEFENSIVE.HIGH_GUARD state
```

### parrying
```yaml
attribute: parrying
type: defense
range: 1-100
description: Ability to deflect punches and create counter opportunities
effects:
  - Deflects punch with minimal damage
  - Creates immediate counter window
  - Disrupts opponent's combinations
calculations:
  parry_success: parrying vs opponent_handSpeed
  damage_on_parry: 10-20% of full damage
  counter_window: 0.3 + (parrying * 0.005) seconds
requirements:
  - Must anticipate punch type correctly
  - Timing window is small
  - Less effective vs combinations
```

### shoulderRoll
```yaml
attribute: shoulderRoll
type: defense
range: 1-100
description: Proficiency with Philly shell/shoulder roll defense
effects:
  - Damage absorbed by shoulder instead of head
  - Immediate counter-punch positioning
  - Style-specific defense effectiveness
calculations:
  roll_success: shoulderRoll vs opponent_accuracy
  damage_on_successful_roll: 5-15%
  counter_setup_bonus: shoulderRoll * 0.5%
requirements:
  - Requires shoulderRoll > 60 for viability
  - Works best vs straight punches
  - Vulnerable to body shots and hooks
  - Must be in DEFENSIVE.PHILLY_SHELL state
```

### clinchDefense
```yaml
attribute: clinchDefense
type: defense
range: 1-100
description: Ability to avoid and escape clinches
effects:
  - Resist opponent's clinch attempts
  - Break free from established clinch
  - Avoid being smothered
calculations:
  clinch_resist: clinchDefense vs opponent_clinchOffense
  break_free_chance: clinchDefense / 100 per second
  avoid_dirty_boxing: clinchDefense - 20 vs opponent_clinchOffense
importance:
  - Critical for out-boxers (avoid getting smothered)
  - Important vs pressure fighters
```

### clinchOffense
```yaml
attribute: clinchOffense
type: defense
range: 1-100
description: Ability to use clinch strategically and offensively
effects:
  - Initiate clinch success rate
  - Dirty boxing damage
  - Recovery rate while clinching
  - Smothering opponent's offense
calculations:
  clinch_initiate: clinchOffense vs opponent_clinchDefense
  dirty_boxing_damage: base_damage * (clinchOffense / 100)
  recovery_in_clinch: base_recovery * 1.5
techniques:
  - holding to recover stamina
  - smothering opponent's offense
  - short shots inside (dirty boxing)
  - wearing down opponent
```

### ringAwareness
```yaml
attribute: ringAwareness
type: defense
range: 1-100
description: Spatial awareness of ring position
effects:
  - Avoid getting cornered/trapped on ropes
  - Know distance to ropes at all times
  - Escape routes recognition
  - Use ring space efficiently
calculations:
  corner_avoidance: ringAwareness / 100
  rope_escape: ringAwareness vs opponent_ringGeneralship
  positional_penalty_reduction: ringAwareness * 0.5%
importance:
  - Critical when fighting pressure fighters
  - Enables effective movement strategy
  - Reduces cornered vulnerability
```

---

## Offense Attributes

Offense attributes determine ability to land punches effectively.

### jabAccuracy
```yaml
attribute: jabAccuracy
type: offense
range: 1-100
description: Base accuracy for jab punches
effects:
  - Landing percentage for jabs
  - Range-finding effectiveness
  - Setup punch success rate
calculations:
  jab_land_rate: jabAccuracy - opponent_defense_modifier
  double_jab_accuracy: jabAccuracy * 0.9
  triple_jab_accuracy: jabAccuracy * 0.8
modifiers:
  - reach_advantage: +5-15% per inch
  - moving_forward: -10%
  - stationary: baseline
  - moving_backward: -15%
```

### powerAccuracy
```yaml
attribute: powerAccuracy
type: offense
range: 1-100
description: Base accuracy for power punches (cross, hooks, uppercuts)
effects:
  - Landing percentage for power shots
  - Knockout opportunity conversion
  - Combination finishing rate
calculations:
  cross_accuracy: powerAccuracy
  hook_accuracy: powerAccuracy * 0.95
  uppercut_accuracy: powerAccuracy * 0.85
modifiers:
  - opponent_HURT: +15-25%
  - loading_up: -10%
  - in_combination: -5% per previous punch
```

### bodyAccuracy
```yaml
attribute: bodyAccuracy
type: offense
range: 1-100
description: Precision for body-targeted punches
effects:
  - Body shot landing rate
  - Liver shot targeting
  - Solar plexus accuracy
calculations:
  body_land_rate: bodyAccuracy - opponent_body_defense
  liver_shot_precision: bodyAccuracy * 0.8
  solar_plexus_precision: bodyAccuracy * 0.75
importance:
  - Critical for body snatchers
  - Sets up head shots
  - Drains opponent stamina
```

### punchSelection
```yaml
attribute: punchSelection
type: offense
range: 1-100
description: AI ability to choose optimal punch for situation
effects:
  - Picks right punch for opponent's state
  - Exploits defensive openings
  - Avoids ineffective punches
ai_behavior:
  low_punchSelection:
    - throws same punches regardless of situation
    - doesn't exploit openings
    - predictable patterns
  high_punchSelection:
    - uppercut vs bobbing opponent
    - body shot vs high guard
    - jab vs charging opponent
    - exploits every opening
```

### feinting
```yaml
attribute: feinting
type: offense
range: 1-100
description: Deception effectiveness to create openings
effects:
  - Opponent defensive reaction rate
  - Creates false openings to exploit
  - Freezes opponent momentarily
calculations:
  feint_success: feinting vs opponent_fightIQ
  opening_created: feinting * 0.3% accuracy bonus
  opponent_freeze_duration: feinting * 0.005 seconds
techniques:
  - jab feint into cross
  - body feint into head shot
  - step feint into angle change
  - shoulder feint
```

### counterPunching
```yaml
attribute: counterPunching
type: offense
range: 1-100
description: Ability to land punches on attacking opponent
effects:
  - Counter accuracy bonus
  - Counter damage bonus
  - Timing recognition
  - Exploiting opponent's commitment
calculations:
  counter_accuracy_bonus: counterPunching * 0.3%
  counter_damage_bonus: counterPunching * 0.4%
  timing_window: 0.2 + (counterPunching * 0.003) seconds
synergy:
  - combines with TIMING state
  - combines with reflexes for opportunity recognition
  - combines with handSpeed for execution
```

### combinationPunching
```yaml
attribute: combinationPunching
type: offense
range: 1-100
description: Accuracy retention through multi-punch sequences
effects:
  - Accuracy drop-off per punch in combo
  - Maximum effective combo length
  - Transition smoothness between punches
calculations:
  accuracy_per_punch: |
    punch_1: base_accuracy
    punch_2: base_accuracy * (0.85 + combinationPunching * 0.0015)
    punch_3: base_accuracy * (0.70 + combinationPunching * 0.003)
    punch_4+: base_accuracy * (0.55 + combinationPunching * 0.0045)
example:
  combinationPunching 80:
    punch_2: 97% of base
    punch_3: 94% of base
    punch_4: 91% of base
  combinationPunching 40:
    punch_2: 91% of base
    punch_3: 82% of base
    punch_4: 73% of base
```

---

## Technical Attributes

Technical attributes represent ring IQ and boxing skill.

### footwork
```yaml
attribute: footwork
type: technical
range: 1-100
description: Overall quality of foot movement and balance
effects:
  - Angle creation ability
  - Balance maintenance
  - Pivot effectiveness
  - Movement efficiency (stamina cost)
calculations:
  angle_creation: footwork / 100 angles per exchange
  balance_after_punch: footwork * 0.8%
  movement_stamina_cost: base_cost * (100 - footwork) / 100
techniques:
  - lateral movement
  - pivoting off punches
  - step-through combinations
  - angle changes
```

### distanceManagement
```yaml
attribute: distanceManagement
type: technical
range: 1-100
description: Ability to fight at optimal range
effects:
  - Maintains preferred distance
  - Recognizes optimal range
  - Adjusts to opponent's range
calculations:
  optimal_distance_maintenance: distanceManagement / 100
  range_recognition_speed: distanceManagement * 0.01 seconds
  distance_adjustment_rate: distanceManagement * 0.1 units/tick
importance:
  - Critical for out-boxers (keep distance)
  - Critical for inside fighters (close distance)
  - Key to implementing style effectively
```

### insideFighting
```yaml
attribute: insideFighting
type: technical
range: 1-100
description: Effectiveness at close range (phone booth)
effects:
  - Accuracy bonus at close range
  - Power bonus inside
  - Ability to operate in tight space
  - Short punch effectiveness
calculations:
  close_range_accuracy_bonus: insideFighting * 0.3%
  close_range_power_bonus: insideFighting * 0.2%
  tight_space_comfort: insideFighting / 100
range_definition:
  close_range: < 60% of optimal distance
techniques:
  - short hooks
  - uppercuts
  - body work
  - shoulder bumps
```

### outsideFighting
```yaml
attribute: outsideFighting
type: technical
range: 1-100
description: Effectiveness at long range
effects:
  - Accuracy bonus at range
  - Jab effectiveness
  - Ability to fight off back foot
  - Range maintenance
calculations:
  long_range_accuracy_bonus: outsideFighting * 0.3%
  jab_effectiveness_bonus: outsideFighting * 0.2%
  back_foot_comfort: outsideFighting / 100
range_definition:
  long_range: > 100% of optimal distance
techniques:
  - stiff jab
  - straight right at range
  - long hooks
  - pot shots
```

### ringGeneralship
```yaml
attribute: ringGeneralship
type: technical
range: 1-100
description: Ability to control ring position and location
effects:
  - Corner opponent effectively
  - Dictate where fight takes place
  - Cut off ring successfully
  - Control pace through positioning
calculations:
  corner_opponent_rate: ringGeneralship vs opponent_footwork
  ring_control_score: ringGeneralship / 100 per tick
  escape_prevention: ringGeneralship - opponent_footSpeed
scoring_impact:
  - Judges favor ring generals
  - Bonus points for effective aggression
```

### adaptability
```yaml
attribute: adaptability
type: technical
range: 1-100
description: Ability to adjust strategy mid-fight
effects:
  - Recognizes what's working
  - Changes approach when losing
  - Exploits discovered weaknesses
  - Adjusts to opponent's changes
ai_behavior:
  adjustment_frequency: every (12 - adaptability/10) rounds
  adjustment_quality: adaptability / 100
  recognizes_patterns_after: (100 - adaptability) / 10 repetitions
examples:
  low_adaptability: keeps doing same thing even when failing
  high_adaptability: switches to body work when head guard tight
```

### fightIQ
```yaml
attribute: fightIQ
type: technical
range: 1-100
description: Overall boxing intelligence and decision-making
effects:
  - General decision quality
  - Situation recognition
  - Strategic awareness
  - Experience simulation
calculations:
  decision_quality: fightIQ / 100
  situation_recognition_speed: fightIQ * 0.01 seconds
  strategic_choices: weighted by fightIQ
ai_behavior:
  affects:
    - when to attack vs defend
    - when to clinch
    - energy conservation
    - risk assessment
    - opponent reading
```

---

## Mental Attributes

Mental attributes represent heart, psychology, and intangibles.

### chin
```yaml
attribute: chin
type: mental
range: 1-100
description: Ability to absorb punches without being knocked down
effects:
  - Damage threshold before knockdown
  - Recovery speed when hurt
  - Knockout resistance
calculations:
  knockdown_threshold: 60 + (chin * 0.6) damage points
  knockout_threshold: knockdown_threshold * 1.5
  hurt_recovery_speed: chin * 0.02 per second
degradation:
  - Chin can degrade with accumulated damage
  - Age affects chin significantly
  - KO losses may permanently reduce
notable_ranges:
  1-40: glass chin, goes down easy
  41-60: average chin, can be stopped
  61-80: solid chin, hard to drop
  81-100: granite chin, walks through shots
```

### heart
```yaml
attribute: heart
type: mental
range: 1-100
description: Determination and will to continue when hurt
effects:
  - Performance when damaged
  - Getting up from knockdowns
  - Refusing to quit
  - Mental toughness
calculations:
  hurt_performance: base_performance * (heart / 100)
  knockdown_recovery_chance: heart / 100 base
  quit_resistance: heart / 100
  come_from_behind: heart * 0.3% bonus when down on cards
notable_ranges:
  1-40: quits when hurt, won't fight through adversity
  41-60: average heart, can be broken
  61-80: determined, fights through pain
  81-100: warrior, never gives up
```

### killerInstinct
```yaml
attribute: killerInstinct
type: mental
range: 1-100
description: Aggression and ruthlessness when opponent is hurt
effects:
  - Aggression increase vs hurt opponent
  - Finishing ability
  - Risk tolerance when smelling blood
calculations:
  hurt_opponent_aggression: base_aggression * (1 + killerInstinct / 100)
  finish_attempt_rate: killerInstinct / 100
  risk_tolerance_increase: killerInstinct * 0.5%
ai_behavior:
  low_killerInstinct: lets hurt opponents recover
  high_killerInstinct: immediately swarms hurt opponent
```

### composure
```yaml
attribute: composure
type: mental
range: 1-100
description: Ability to stay calm under pressure
effects:
  - Performance when losing
  - Resistance to intimidation
  - Decision quality under pressure
  - Avoiding panic
calculations:
  pressure_penalty_reduction: composure / 100
  intimidation_resistance: composure vs opponent_intimidation
  losing_performance: base * (0.8 + composure * 0.002)
triggers:
  - behind on scorecards
  - been knocked down
  - facing heavy pressure
  - hostile crowd
```

### intimidation
```yaml
attribute: intimidation
type: mental
range: 1-100
description: Ability to mentally affect opponent
effects:
  - Opponent confidence reduction
  - Pre-fight mental advantage
  - In-ring presence
calculations:
  opponent_confidence_reduction: intimidation - opponent_composure
  pre_fight_bonus: intimidation * 0.1% to all attributes (first round)
  presence_effect: intimidation / 100 ongoing
sources:
  - reputation
  - knockout power
  - physical appearance
  - demeanor
```

### confidence
```yaml
attribute: confidence
type: mental
range: 1-100
description: Self-belief and current mental state
effects:
  - Starting morale
  - Risk-taking willingness
  - Performance baseline
  - Recovery from setbacks
calculations:
  starting_confidence: confidence / 100
  confidence_after_knockdown: current - (100 - heart) / 5
  confidence_after_landing_big: current + killerInstinct / 10
dynamic:
  - Changes throughout fight
  - Affected by landing/receiving big punches
  - Affected by knockdowns (both ways)
  - Affected by round scores
```

### experience
```yaml
attribute: experience
type: mental
range: 1-100
description: Ring experience and veteran savvy
effects:
  - Handles adversity better
  - Knows veteran tricks
  - Better pacing
  - Calmer in big moments
calculations:
  adversity_handling: experience * 0.3%
  veteran_moves_available: experience > 70
  pacing_bonus: experience * 0.1%
derived_from:
  - number of pro fights
  - rounds fought
  - quality of opposition
  - championship experience
veteran_moves:
  - holding when hurt (experience > 60)
  - spoiling tactics (experience > 70)
  - tactical fouling (experience > 75)
  - subtle rule bending (experience > 80)
```

### clutchFactor
```yaml
attribute: clutchFactor
type: mental
range: 1-100
description: Performance in crucial moments
effects:
  - Bonus in close rounds
  - Championship round performance
  - Big fight performance
  - Close fight mentality
calculations:
  close_round_bonus: clutchFactor * 0.2%
  championship_rounds_bonus: clutchFactor * 0.3% (rounds 10-12)
  big_moment_activation: |
    triggers when:
      - scorecards within 2 points
      - final round
      - opponent hurt (finish opportunity)
      - survived knockdown
```

---

## Attribute Interactions

Key relationships between attributes that create emergent behavior:

```yaml
interactions:
  effective_reach:
    formula: reach + (height - 175) * 0.3 + stance_matchup_modifier

  optimal_range:
    formula: effective_reach * 0.45 + style_modifier

  punch_output_capacity:
    formula: cardio * workRate * combinationSpeed / 10000

  defensive_efficiency:
    formula: (headMovement + blocking + footwork) / 3

  overall_power:
    formula: (powerLeft + powerRight) / 2 * (1 + knockoutPower / 200)

  overall_speed:
    formula: (handSpeed + footSpeed + reflexes) / 3

  ring_control:
    formula: ringGeneralship * footwork * distanceManagement / 10000

  survivability:
    formula: chin * heart * (1 + composure / 200)

  counter_threat:
    formula: counterPunching * reflexes * handSpeed / 10000

  pressure_effectiveness:
    formula: workRate * cardio * ringGeneralship / 10000
```

---

## Default Attribute Ranges by Tier

| Tier | Attribute Range | Standard Deviation |
|------|----------------|-------------------|
| Club Fighter | 35-55 | 8 |
| Journeyman | 50-68 | 7 |
| Gatekeeper | 60-76 | 6 |
| Contender | 68-84 | 5 |
| Champion | 76-92 | 5 |
| All-Time Great | 85-98 | 4 |

---

## Implementation Notes

### Fighter Attribute Object Structure

```javascript
const fighterAttributes = {
  physical: {
    height: 185,      // cm
    weight: 76,       // kg
    reach: 188,       // cm
    age: 28,
    stance: 'orthodox',
    bodyType: 'muscular'
  },
  power: {
    powerLeft: 72,
    powerRight: 88,
    knockoutPower: 80,
    bodyPunching: 75,
    punchingStamina: 70
  },
  speed: {
    handSpeed: 78,
    footSpeed: 72,
    reflexes: 75,
    firstStep: 70,
    combinationSpeed: 80
  },
  stamina: {
    cardio: 82,
    recoveryRate: 78,
    workRate: 75,
    secondWind: 65,
    paceControl: 70
  },
  defense: {
    headMovement: 68,
    blocking: 80,
    parrying: 62,
    shoulderRoll: 45,
    clinchDefense: 70,
    clinchOffense: 72,
    ringAwareness: 74
  },
  offense: {
    jabAccuracy: 76,
    powerAccuracy: 74,
    bodyAccuracy: 72,
    punchSelection: 78,
    feinting: 65,
    counterPunching: 70,
    combinationPunching: 82
  },
  technical: {
    footwork: 74,
    distanceManagement: 72,
    insideFighting: 78,
    outsideFighting: 70,
    ringGeneralship: 68,
    adaptability: 72,
    fightIQ: 76
  },
  mental: {
    chin: 78,
    heart: 85,
    killerInstinct: 82,
    composure: 74,
    intimidation: 70,
    confidence: 80,
    experience: 72,
    clutchFactor: 76
  }
};
```

### Attribute Validation

```javascript
const validateAttribute = (value, name) => {
  if (typeof value !== 'number') {
    throw new Error(`${name} must be a number`);
  }
  if (value < 1 || value > 100) {
    throw new Error(`${name} must be between 1-100, got ${value}`);
  }
  return true;
};
```
