# Fighter Styles

This document defines all boxing archetypes, sub-styles, and their interactions in the simulation. Each fighter has a primary style, defensive sub-style, and offensive sub-style that influence AI behavior and attribute effectiveness.

## Style System Overview

```yaml
style_composition:
  primary_style: core fighting approach
  defensive_style: how they avoid/absorb damage
  offensive_style: how they attack

example:
  name: "Mayweather"
  primary_style: counter-puncher
  defensive_style: philly-shell
  offensive_style: jab-and-move
```

---

## Primary Styles

### Out-Boxer
```yaml
style: out-boxer
aliases: [boxer, pure-boxer, stick-and-move]
description: |
  Uses range, footwork, and jab to control distance. Fights from the outside,
  using technical skill to outpoint opponents. Prefers to win on points rather
  than knockouts.

philosophy: "Hit and don't get hit"

historical_examples:
  - Muhammad Ali
  - Floyd Mayweather Jr.
  - Lennox Lewis
  - Wladimir Klitschko
  - Guillermo Rigondeaux

attribute_requirements:
  critical:
    footwork: ">= 70"
    jabAccuracy: ">= 70"
    distanceManagement: ">= 68"
  important:
    footSpeed: ">= 65"
    reach: ">= class_average + 5"
    outsideFighting: ">= 70"

attribute_tendencies:
  high: [footwork, jabAccuracy, distanceManagement, outsideFighting, footSpeed, reflexes]
  medium: [handSpeed, cardio, ringGeneralship, composure, ringAwareness]
  low: [insideFighting, clinchOffense, knockoutPower, bodyPunching]

ai_behavior:
  preferred_range: long (110-130% of optimal)
  preferred_states:
    - OFFENSIVE.JABBING (40%)
    - DEFENSIVE.DISTANCE (25%)
    - TIMING (20%)
    - MOVING.CIRCLING (15%)
  avoids:
    - CLINCH
    - close_range
    - trading_in_pocket
  tactics:
    - establish_jab_early
    - circle_away_from_power
    - use_reach_advantage
    - frustrate_and_outpoint
    - avoid_exchanges

strengths:
  - Difficult to hit cleanly
  - Controls pace of fight
  - Accumulates points safely
  - Makes opponents miss and pay
  - Conserves energy efficiently

weaknesses:
  - Vulnerable if cornered
  - Can be outworked by pressure
  - Limited knockout power
  - May lose close rounds on aggression
  - Struggles against aggressive swarmers

scoring_tendency:
  - Wins close decisions
  - Rarely knocked out
  - Rarely knocks out opponents
  - Favored by technical judges
```

---

### Swarmer (Pressure Fighter)
```yaml
style: swarmer
aliases: [pressure-fighter, volume-fighter, crowder]
description: |
  Applies relentless pressure, throwing high volume of punches while closing
  distance. Overwhelms opponents with work rate and cardio. Willing to take
  punches to land punches.

philosophy: "Drown them in punches"

historical_examples:
  - Joe Frazier
  - Julio César Chávez
  - Manny Pacquiao
  - Ricky Hatton
  - Brandon Rios
  - Marcos Maidana

attribute_requirements:
  critical:
    cardio: ">= 75"
    workRate: ">= 72"
    heart: ">= 70"
  important:
    chin: ">= 65"
    insideFighting: ">= 68"
    ringGeneralship: ">= 60"

attribute_tendencies:
  high: [cardio, workRate, heart, insideFighting, bodyPunching, chin, combinationPunching]
  medium: [combinationSpeed, clinchOffense, handSpeed, ringGeneralship]
  low: [outsideFighting, distanceManagement, footSpeed, jabAccuracy]

ai_behavior:
  preferred_range: close (60-80% of optimal)
  preferred_states:
    - OFFENSIVE.COMBINATION (35%)
    - OFFENSIVE.BODY_WORK (25%)
    - MOVING.CUTTING_OFF (20%)
    - OFFENSIVE.JABBING (stepping jab) (15%)
    - CLINCH (when needed) (5%)
  avoids:
    - long_range
    - TIMING (counter_fighting)
    - DEFENSIVE.DISTANCE
  tactics:
    - cut_off_ring
    - constant_pressure
    - work_body_early
    - high_punch_output
    - walk_through_punches
    - break_opponent_will

strengths:
  - Overwhelming work rate
  - Excellent conditioning
  - Takes opponent out of rhythm
  - Wins rounds on activity
  - Breaks down opponents over time

weaknesses:
  - Takes lots of punches
  - Vulnerable to counterpunchers
  - Struggles with movers
  - Can be timed and hurt
  - Power punchers dangerous

scoring_tendency:
  - Wins on activity and pressure
  - May lose early rounds while closing distance
  - Favored by judges who reward aggression
  - Can score late TKOs as opponent fades
```

---

### Slugger (Brawler)
```yaml
style: slugger
aliases: [brawler, puncher, knockout-artist, bomber]
description: |
  Relies on raw power and toughness to overwhelm opponents. Less technical
  but dangerous with every punch. Seeks knockout rather than points. Willing
  to get hit to land the big shot.

philosophy: "One punch can change everything"

historical_examples:
  - George Foreman
  - Deontay Wilder
  - Earnie Shavers
  - David Tua
  - Tommy Morrison
  - Shannon Briggs

attribute_requirements:
  critical:
    powerRight: ">= 80"
    knockoutPower: ">= 75"
    chin: ">= 68"
  important:
    powerLeft: ">= 70"
    heart: ">= 65"
    intimidation: ">= 60"

attribute_tendencies:
  high: [powerRight, powerLeft, knockoutPower, chin, intimidation, heart, killerInstinct]
  medium: [blocking, composure, bodyPunching]
  low: [cardio, footSpeed, headMovement, workRate, jabAccuracy, footwork]

ai_behavior:
  preferred_range: medium-close (80-100% of optimal)
  preferred_states:
    - OFFENSIVE.POWER_SHOT (35%)
    - OFFENSIVE.COMBINATION (short) (25%)
    - MOVING.CUTTING_OFF (20%)
    - DEFENSIVE.HIGH_GUARD (15%)
    - NEUTRAL (loading up) (5%)
  avoids:
    - long_combinations
    - TIMING (too patient)
    - constant_movement
  tactics:
    - land_big_punches
    - intimidate_opponent
    - walk_through_jabs
    - load_up_on_power
    - finish_hurt_opponent
    - seek_knockout

strengths:
  - Terrifying knockout power
  - Intimidating presence
  - Can end fight with one punch
  - Durable and tough
  - Keeps opponents honest

weaknesses:
  - Predictable offense
  - Poor conditioning
  - Vulnerable to movement
  - Easy to outbox
  - Wild swings miss often

scoring_tendency:
  - Wins by knockout or loses by decision
  - Often loses rounds on activity
  - Rarely wins close decisions
  - High knockout percentage
  - Can be stopped if caught without power
```

---

### Boxer-Puncher
```yaml
style: boxer-puncher
aliases: [complete-fighter, hybrid, all-arounder]
description: |
  Combines technical boxing skill with legitimate knockout power. Can adapt
  to fight any style. Dangerous in multiple phases of the fight. The most
  versatile but also the hardest style to master.

philosophy: "Be good at everything, great at adapting"

historical_examples:
  - Sugar Ray Robinson
  - Sugar Ray Leonard
  - Canelo Álvarez
  - Oscar De La Hoya
  - Roy Jones Jr.
  - Gennady Golovkin

attribute_requirements:
  critical:
    fightIQ: ">= 72"
    adaptability: ">= 70"
  important:
    powerRight: ">= 70"
    handSpeed: ">= 70"
    footwork: ">= 68"

attribute_tendencies:
  high: [powerRight, handSpeed, combinationPunching, fightIQ, adaptability, composure]
  medium: [footwork, blocking, counterPunching, jabAccuracy, insideFighting, outsideFighting]
  low: [] # No significant weaknesses

ai_behavior:
  preferred_range: medium (90-110% of optimal)
  preferred_states:
    - OFFENSIVE.COMBINATION (30%)
    - OFFENSIVE.JABBING (20%)
    - TIMING (20%)
    - OFFENSIVE.POWER_SHOT (15%)
    - adaptive based on opponent (15%)
  adapts_to_opponent:
    vs_out-boxer: pressure, cut_off_ring
    vs_swarmer: counter, create_distance
    vs_slugger: box, use_speed
    vs_boxer-puncher: identify_weakness
  tactics:
    - feel_out_early
    - identify_opponent_weakness
    - switch_between_boxing_and_punching
    - dominate_exchanges
    - close_show_late

strengths:
  - No significant weaknesses
  - Adaptable to any opponent
  - Can win by KO or decision
  - Effective at all ranges
  - Smart tactical adjustments

weaknesses:
  - Jack of all trades (not elite at anything)
  - May not have elite cardio
  - Requires high ring IQ to maximize
  - Can be outspecialized

scoring_tendency:
  - Wins by any method
  - Comfortable going to decision
  - Can stop opponents when opportunity arises
  - Favored by all judge types
```

---

### Counter-Puncher
```yaml
style: counter-puncher
aliases: [counter-puncher, defensive-wizard, slickster]
description: |
  Defensive master who waits for opponents to attack, then capitalizes on
  openings with precise counters. Makes opponents miss and pay. Patient
  style requiring excellent timing and reflexes.

philosophy: "Make them miss, make them pay"

historical_examples:
  - Floyd Mayweather Jr.
  - Juan Manuel Márquez
  - Pernell Whitaker
  - James Toney
  - Nicolino Locche
  - Willie Pep

attribute_requirements:
  critical:
    reflexes: ">= 75"
    counterPunching: ">= 75"
    headMovement: ">= 72"
  important:
    timing: ">= 70"
    composure: ">= 70"
    fightIQ: ">= 70"

attribute_tendencies:
  high: [reflexes, counterPunching, headMovement, composure, parrying, fightIQ, timing]
  medium: [footwork, distanceManagement, shoulderRoll, handSpeed]
  low: [workRate, cardio, killerInstinct, ringGeneralship]

ai_behavior:
  preferred_range: medium-long (95-120% of optimal)
  preferred_states:
    - TIMING (40%)
    - DEFENSIVE.HEAD_MOVEMENT (20%)
    - DEFENSIVE.PHILLY_SHELL (15%)
    - DEFENSIVE.PARRYING (10%)
    - OFFENSIVE (counter only) (15%)
  avoids:
    - initiating_offense
    - MOVING.CUTTING_OFF (pressure)
    - sustained_combinations
  tactics:
    - wait_for_opponent_attack
    - counter_with_precision
    - make_opponent_miss_badly
    - frustrate_into_mistakes
    - time_power_counter
    - rely_on_defense

strengths:
  - Extremely hard to hit
  - Devastating counter timing
  - Makes opponents look bad
  - Energy efficient
  - Rarely hurt

weaknesses:
  - Can be outworked
  - Needs opponent to lead
  - May lose on activity
  - Struggles vs pressure
  - Risk of being passive

scoring_tendency:
  - Wins close decisions on clean punching
  - May lose to aggressive fighters with bad judges
  - High accuracy percentage
  - Low knockout rate (but flash knockdowns)
  - Rarely knocked out
```

---

### Inside Fighter
```yaml
style: inside-fighter
aliases: [infighter, phone-booth-fighter, pocket-fighter]
description: |
  Specializes in close-range combat with hooks and uppercuts. Gets inside
  opponent's reach to neutralize range disadvantage. Extremely dangerous
  in tight spaces.

philosophy: "Get inside where they can't breathe"

historical_examples:
  - Mike Tyson (early)
  - Roberto Durán
  - Jake LaMotta
  - Joe Frazier (also swarmer)
  - Rocky Marciano

attribute_requirements:
  critical:
    insideFighting: ">= 78"
    headMovement: ">= 70"
    firstStep: ">= 68"
  important:
    powerLeft: ">= 70" (lead hooks)
    bodyPunching: ">= 68"
    chin: ">= 65"

attribute_tendencies:
  high: [insideFighting, bodyPunching, clinchOffense, powerLeft, firstStep, headMovement]
  medium: [chin, heart, handSpeed, blocking, combinationPunching]
  low: [outsideFighting, distanceManagement, jabAccuracy, reach_utilization]

ai_behavior:
  preferred_range: close (50-75% of optimal)
  preferred_states:
    - OFFENSIVE.COMBINATION (close) (35%)
    - OFFENSIVE.BODY_WORK (30%)
    - MOVING.CUTTING_OFF (15%)
    - CLINCH.DIRTY_BOXING (10%)
    - DEFENSIVE.HEAD_MOVEMENT (bobbing in) (10%)
  avoids:
    - long_range
    - TIMING (wants to be in pocket)
    - DEFENSIVE.DISTANCE
  tactics:
    - close_distance_quickly
    - get_inside_reach
    - work_body
    - short_hooks_uppercuts
    - smother_opponent
    - dirty_boxing_when_needed

strengths:
  - Devastating at close range
  - Neutralizes reach disadvantage
  - Excellent body puncher
  - Smothering defense
  - Can clinch and rest

weaknesses:
  - Must get inside (vulnerable approaching)
  - Struggles at range
  - Can be kept on outside
  - Requires excellent head movement
  - Takes punches closing distance

scoring_tendency:
  - High knockout rate (body shots and hooks)
  - Can struggle in early rounds getting in
  - Takes punishment to deal punishment
  - Body shot TKOs common
```

---

### Volume Puncher
```yaml
style: volume-puncher
aliases: [punch-machine, busy-fighter]
description: |
  Overwhelming output of punches that breaks opponents down. Not pure power
  but constant activity. Throws more punches than any other style. Wins by
  accumulation.

philosophy: "Death by a thousand punches"

historical_examples:
  - Manny Pacquiao
  - Aaron Pryor
  - Antonio Margarito
  - Timothy Bradley
  - Keith Thurman

attribute_requirements:
  critical:
    workRate: ">= 78"
    cardio: ">= 76"
    combinationSpeed: ">= 75"
  important:
    combinationPunching: ">= 72"
    handSpeed: ">= 70"
    recoveryRate: ">= 68"

attribute_tendencies:
  high: [workRate, cardio, combinationSpeed, combinationPunching, handSpeed, recoveryRate]
  medium: [footwork, heart, jabAccuracy]
  low: [powerRight, knockoutPower, paceControl]

ai_behavior:
  preferred_range: medium (85-105% of optimal)
  preferred_states:
    - OFFENSIVE.COMBINATION (50%)
    - OFFENSIVE.JABBING (25%)
    - OFFENSIVE.BODY_WORK (15%)
    - MOVING.* (between_combos) (10%)
  avoids:
    - TIMING (counter_waiting)
    - extended_rest
    - single_power_shots
  tactics:
    - constant_output
    - 6-10_punch_combinations
    - punish_any_opening
    - break_opponent_down
    - win_every_round_on_activity

strengths:
  - Overwhelming activity
  - Wins rounds on output
  - Breaks down opponents
  - Excellent conditioning
  - Hard to outwork

weaknesses:
  - Limited knockout power
  - Can be countered by precision
  - Power punchers can time
  - May not hurt opponents
  - Relies on judges rewarding activity

scoring_tendency:
  - Wins decisions on activity
  - Low knockout percentage
  - Rarely knocked out (active defense)
  - Throws 100+ punches per round
  - Favored by judges who count punches
```

---

### Switch-Hitter
```yaml
style: switch-hitter
aliases: [ambidextrous, switch-fighter]
description: |
  Can fight effectively from orthodox or southpaw stance, switching mid-fight
  to exploit angles and confuse opponents. Highly unpredictable and technically
  advanced.

philosophy: "Be twice the problem"

historical_examples:
  - Marvin Hagler
  - Terence Crawford
  - Andre Ward
  - Naseem Hamed

attribute_requirements:
  critical:
    fightIQ: ">= 78"
    adaptability: ">= 75"
    footwork: ">= 72"
  important:
    powerLeft: ">= 70" # Must be competent both hands
    powerRight: ">= 70"
    experience: ">= 65"

attribute_tendencies:
  high: [fightIQ, adaptability, footwork, experience]
  medium: [all_other_attributes] # Balanced
  low: [] # No weaknesses, but not elite in one thing

special_mechanics:
  stance_switching:
    trigger: tactical_advantage or confusion
    cooldown: 3_seconds minimum
    stamina_cost: minimal
    benefits:
      - angle_changes
      - power_hand_switch
      - defensive_reset
      - opponent_confusion

ai_behavior:
  preferred_range: varies by situation
  preferred_states: context_dependent
  switches_when:
    - opponent_adapted_to_current_stance
    - angle_opportunity
    - every_30-60_seconds_randomly
    - after_landing_clean
  tactics:
    - constantly_change_angles
    - switch_to_exploit_weakness
    - confuse_opponent_timing
    - both_hands_dangerous

strengths:
  - Unpredictable
  - Double the angles
  - Hard to time
  - Both hands power
  - Creates confusion

weaknesses:
  - May not master either stance
  - Complexity can cause mistakes
  - Requires elite fight IQ
  - Transitions can be vulnerable
```

---

## Defensive Sub-Styles

### Peek-a-Boo
```yaml
style: peek-a-boo
type: defensive_sub
description: |
  High guard with constant head movement, elbows tight to body. Named by
  Cus D'Amato. Explosive offense from defensive posture.

historical_examples:
  - Mike Tyson
  - Floyd Patterson

mechanics:
  guard_position: gloves_at_cheekbones
  head_movement: constant_bobbing_weaving
  body_position: crouched, elbows_protecting_body

attribute_requirements:
  headMovement: ">= 70"
  blocking: ">= 65"
  firstStep: ">= 70"

bonuses:
  headMovement: +10%
  blocking: +8%
  firstStep: +10% (explosive_entry)

penalties:
  stamina_cost: +15% (constant_movement)
  outsideFighting: -10%

best_for: [inside-fighter, swarmer]
worst_against: [long_jabs, uppercuts]
```

### Philly Shell (Shoulder Roll)
```yaml
style: philly-shell
type: defensive_sub
aliases: [shoulder-roll, crab-style]
description: |
  Lead shoulder absorbs punches while rear hand ready to counter.
  Highly efficient but requires mastery.

historical_examples:
  - Floyd Mayweather Jr.
  - James Toney
  - Bernard Hopkins

mechanics:
  guard_position: lead_shoulder_high, rear_hand_at_chin
  body_position: slightly_bladed
  weight_distribution: rear_foot_heavy

attribute_requirements:
  shoulderRoll: ">= 70"
  reflexes: ">= 68"
  counterPunching: ">= 70"

bonuses:
  shoulderRoll: active (required)
  counterPunching: +15%
  stamina_efficiency: +20%

penalties:
  body_shot_vulnerability: +20%
  lead_hook_vulnerability: +15%
  requires_timing: true

best_for: [counter-puncher, out-boxer]
worst_against: [body_punchers, switch_hitters]
```

### High Guard
```yaml
style: high-guard
type: defensive_sub
description: |
  Traditional tight guard with both gloves protecting head,
  elbows protecting body. Solid but limits vision.

historical_examples:
  - Joshua Clottey
  - Winky Wright
  - Arthur Abraham

mechanics:
  guard_position: both_gloves_at_temples
  elbows: tight_to_body
  chin: tucked

attribute_requirements:
  blocking: ">= 65"

bonuses:
  blocking: +15%
  chin_protection: excellent
  stamina_cost: moderate

penalties:
  vision: reduced
  counter_opportunities: limited
  uppercut_vulnerability: moderate

best_for: [swarmer, slugger, pressure]
worst_against: [uppercuts, angles]
```

### Slick (Head Movement)
```yaml
style: slick
type: defensive_sub
aliases: [head-movement, matador]
description: |
  Relies almost entirely on head movement to avoid punches.
  Makes opponents miss badly but high risk if timed.

historical_examples:
  - Pernell Whitaker
  - Nicolino Locche
  - Prince Naseem Hamed

mechanics:
  guard_position: hands_low_or_varied
  movement: slipping, bobbing, pulling
  emphasis: evasion_over_blocking

attribute_requirements:
  headMovement: ">= 78"
  reflexes: ">= 75"
  footwork: ">= 72"

bonuses:
  headMovement: +20%
  counter_opportunities: excellent
  style_points: judges_impressed

penalties:
  when_timed: devastating_damage
  stamina_cost: high
  consistency: variable

best_for: [counter-puncher, out-boxer]
worst_against: [feinters, volume_punchers]
```

### Distance
```yaml
style: distance
type: defensive_sub
description: |
  Uses footwork to stay out of range entirely. Never gets hit
  by not being there.

historical_examples:
  - Muhammad Ali
  - Guillermo Rigondeaux
  - Lennox Lewis

mechanics:
  emphasis: footwork_over_blocking
  position: outside_opponent_range
  movement: lateral_and_backward

attribute_requirements:
  footwork: ">= 75"
  footSpeed: ">= 72"
  ringAwareness: ">= 70"

bonuses:
  evasion: complete (out_of_range)
  stamina_conservation: good

penalties:
  can_be_cornered: true
  judges_may_penalize: running
  requires_ring_space: true

best_for: [out-boxer]
worst_against: [ring_cutters, pressure]
```

---

## Offensive Sub-Styles

### Jab-and-Move
```yaml
style: jab-and-move
type: offensive_sub
description: |
  Stick and move approach. Land jabs, score points, don't engage.

attribute_requirements:
  jabAccuracy: ">= 72"
  footwork: ">= 70"

bonuses:
  jabAccuracy: +10%
  footSpeed_after_jab: +15%

penalties:
  power_punches: -10%
  engagement_low: true

punch_distribution:
  jab: 70%
  other: 30%

best_for: [out-boxer, counter-puncher]
```

### Combo Puncher
```yaml
style: combo-puncher
type: offensive_sub
aliases: [combination-puncher]
description: |
  Fluid multi-punch combinations. Never throws just one punch.

attribute_requirements:
  combinationPunching: ">= 72"
  combinationSpeed: ">= 70"
  cardio: ">= 68"

bonuses:
  combinationPunching: +10%
  combination_length: +2 punches
  fluidity: excellent

penalties:
  single_power_shot: -15%
  stamina_per_exchange: higher

average_combo_length: 4-6 punches
best_for: [boxer-puncher, swarmer, volume-puncher]
```

### Body Snatcher
```yaml
style: body-snatcher
type: offensive_sub
description: |
  Prioritizes body work. Drains opponent stamina and sets up head shots.

historical_examples:
  - Julio César Chávez
  - Gennady Golovkin

attribute_requirements:
  bodyPunching: ">= 75"
  bodyAccuracy: ">= 70"

bonuses:
  bodyPunching: +15%
  body_damage: +20%
  liver_shot_targeting: +10%

penalties:
  head_exposure: while_throwing_body

punch_distribution:
  body: 50%
  head: 50%

best_for: [inside-fighter, swarmer]
```

### Headhunter
```yaml
style: headhunter
type: offensive_sub
description: |
  Focuses almost exclusively on head shots seeking knockout.

attribute_requirements:
  powerAccuracy: ">= 70"
  knockoutPower: ">= 70"

bonuses:
  head_targeting: +15%
  knockout_power: +10%

penalties:
  opponent_body_health: not_targeted
  predictability: high

punch_distribution:
  head: 85%
  body: 15%

best_for: [slugger]
```

### Hitman
```yaml
style: hitman
type: offensive_sub
aliases: [long-range-sniper]
description: |
  Long-range power punching. Uses reach to land big shots from distance.

historical_examples:
  - Thomas Hearns
  - Lennox Lewis

attribute_requirements:
  reach: ">= class_average + 8"
  powerRight: ">= 75"
  distanceManagement: ">= 72"

bonuses:
  long_range_power: +15%
  straight_punches: +10%
  reach_utilization: excellent

penalties:
  inside_fighting: -20%
  close_range: uncomfortable

best_for: [out-boxer, boxer-puncher with reach]
```

### Mauler
```yaml
style: mauler
type: offensive_sub
aliases: [roughhouse, dirty-boxer]
description: |
  Physical, uses clinch offensively, roughhouse tactics.

historical_examples:
  - Antonio Margarito
  - Roberto Durán

attribute_requirements:
  clinchOffense: ">= 72"
  insideFighting: ">= 70"
  heart: ">= 68"

bonuses:
  clinchOffense: +15%
  dirty_boxing_damage: +20%
  wearing_opponent: excellent

penalties:
  referee_warnings: increased
  point_deductions: risk

tactics:
  - use_clinch_offensively
  - rough_up_opponent
  - drain_opponent_will
  - shoulder_elbow_work

best_for: [inside-fighter, swarmer]
```

---

## Style Matchup Matrix

### Advantages and Disadvantages

```yaml
matchups:
  out-boxer:
    advantage_vs: [slugger, inside-fighter (if keeps distance)]
    disadvantage_vs: [swarmer, volume-puncher]
    even_vs: [boxer-puncher, counter-puncher]

  swarmer:
    advantage_vs: [out-boxer, counter-puncher]
    disadvantage_vs: [slugger, inside-fighter]
    even_vs: [boxer-puncher, volume-puncher]

  slugger:
    advantage_vs: [swarmer, volume-puncher]
    disadvantage_vs: [out-boxer, counter-puncher]
    even_vs: [boxer-puncher, inside-fighter]

  boxer-puncher:
    advantage_vs: depends_on_adaptation
    disadvantage_vs: specialists_if_not_adapted
    even_vs: all (wild_card)

  counter-puncher:
    advantage_vs: [slugger, headhunter]
    disadvantage_vs: [swarmer, volume-puncher]
    even_vs: [out-boxer]

  inside-fighter:
    advantage_vs: [out-boxer (if gets inside), counter-puncher]
    disadvantage_vs: [swarmer (outworked), slugger (power)]
    even_vs: [boxer-puncher]

  volume-puncher:
    advantage_vs: [counter-puncher, inside-fighter]
    disadvantage_vs: [slugger (power), out-boxer (movement)]
    even_vs: [swarmer]
```

### Numerical Modifiers

```yaml
matchup_modifiers:
  # Positive = advantage for first style
  out-boxer_vs_slugger: +15%
  out-boxer_vs_swarmer: -12%
  out-boxer_vs_counter-puncher: +3%

  swarmer_vs_out-boxer: +12%
  swarmer_vs_slugger: -15%
  swarmer_vs_counter-puncher: +10%

  slugger_vs_swarmer: +15%
  slugger_vs_out-boxer: -15%
  slugger_vs_counter-puncher: -12%

  counter-puncher_vs_slugger: +12%
  counter-puncher_vs_swarmer: -10%

  inside-fighter_vs_out-boxer: +10% (if_inside)
  inside-fighter_vs_out-boxer: -15% (at_range)

  boxer-puncher_vs_all: +/-5% (based_on_adaptation)
```

---

## Style Generation

### Style Assignment Based on Attributes

```javascript
function determineOptimalStyle(attributes) {
  const scores = {
    'out-boxer': calculateOutBoxerFit(attributes),
    'swarmer': calculateSwarmerFit(attributes),
    'slugger': calculateSluggerFit(attributes),
    'boxer-puncher': calculateBoxerPuncherFit(attributes),
    'counter-puncher': calculateCounterPuncherFit(attributes),
    'inside-fighter': calculateInsideFighterFit(attributes),
    'volume-puncher': calculateVolumePuncherFit(attributes)
  };

  return Object.entries(scores)
    .sort(([,a], [,b]) => b - a)[0][0];
}

function calculateOutBoxerFit(attrs) {
  return (
    attrs.technical.footwork * 1.5 +
    attrs.offense.jabAccuracy * 1.5 +
    attrs.technical.distanceManagement * 1.3 +
    attrs.speed.footSpeed * 1.2 +
    attrs.technical.outsideFighting * 1.2 -
    attrs.power.knockoutPower * 0.3
  ) / 7;
}

// Similar functions for each style...
```

---

## Implementation Notes

### Style Configuration Object

```javascript
const fighterStyle = {
  primary: 'boxer-puncher',
  defensive: 'high-guard',
  offensive: 'combo-puncher',

  // Calculated modifiers
  modifiers: {
    preferredRange: { min: 0.9, max: 1.1 },
    statePreferences: {
      'OFFENSIVE.COMBINATION': 0.30,
      'OFFENSIVE.JABBING': 0.20,
      'TIMING': 0.20,
      'OFFENSIVE.POWER_SHOT': 0.15,
      'DEFENSIVE.*': 0.15
    },
    attributeBonuses: {
      combinationPunching: 1.10,
      blocking: 1.08
    }
  }
};
```
