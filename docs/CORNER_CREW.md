# Corner Crew

This document defines the corner team roles, their effects on fighters between rounds, and strategic adjustments they provide.

## Corner Composition

### Team Roles

```yaml
corner_positions:
  head_trainer:
    role: primary_strategist
    responsibilities:
      - fight_strategy
      - between_round_instructions
      - tactical_adjustments
      - calling_fight_if_needed
    attributes:
      - strategy_skill (1-100)
      - communication (1-100)
      - adaptability (1-100)

  assistant_trainer:
    role: support_and_backup
    responsibilities:
      - water_and_towel
      - mouthpiece
      - backup_instructions
    attributes:
      - efficiency (1-100)

  cutman:
    role: medical_treatment
    responsibilities:
      - stop_bleeding
      - reduce_swelling
      - prevent_stoppages
    attributes:
      - cut_treatment_skill (1-100)
      - swelling_treatment_skill (1-100)
      - speed (1-100)
```

### Corner Configuration

```javascript
const cornerCrew = {
  headTrainer: {
    name: "Freddie Roach",
    strategySkill: 95,
    communication: 88,
    adaptability: 92,
    specialty: "counter-punching", // Bonus to related advice
    experience: 98
  },

  assistantTrainer: {
    name: "Marvin Somodio",
    efficiency: 85
  },

  cutman: {
    name: "Jacob "Stitch" Duran",
    cutTreatment: 98,
    swellingTreatment: 95,
    speed: 90
  },

  // Calculated effectiveness
  effectiveness: calculateCornerEffectiveness(this)
};
```

---

## Between-Round Functions

### Cutman Treatment

```yaml
cut_treatment:
  process:
    1. assess_cut_location_and_severity
    2. apply_adrenaline_chloride (stops_bleeding)
    3. apply_vaseline (prevents_reopening)
    4. apply_pressure_if_needed

  effectiveness_formula: |
    severity_reduction = cutman_skill / 100 * time_available
    reopening_resistance = cutman_skill * 0.5

  skill_levels:
    novice (40-60):
      - can stop minor bleeding
      - struggles with severe cuts
      - 50% chance of reopening
    professional (60-80):
      - handles most cuts
      - reduces severity by 1
      - 30% chance of reopening
    elite (80-95):
      - excellent treatment
      - reduces severity by 1-2
      - 15% chance of reopening
    legendary (95+):
      - miraculous treatment
      - can save fights
      - 5% chance of reopening
```

### Swelling Treatment

```yaml
swelling_treatment:
  tools:
    enswell:
      description: cold_metal_device
      effect: reduces_swelling
      application: direct_pressure
    ice:
      description: ice_pack
      effect: slows_swelling_progression
      application: between_active_treatment

  effectiveness_formula: |
    swelling_reduction = (swelling_skill / 100) * time_available * 0.8

  outcomes:
    excellent_treatment: reduces_severity_by_1
    good_treatment: prevents_worsening
    poor_treatment: swelling_continues
```

---

## Strategic Advice

### Corner Instructions

```yaml
instruction_types:
  offensive_adjustments:
    - "Double up the jab"
    - "Go to the body"
    - "Work behind the jab"
    - "Load up on the right hand"
    - "Attack when he shells up"

  defensive_adjustments:
    - "Keep your hands up"
    - "Move your head"
    - "Don't get backed up"
    - "Circle away from his right"
    - "Tie him up inside"

  tactical_adjustments:
    - "Box him, don't brawl"
    - "Make him fight your fight"
    - "Control the center"
    - "Take away his jab"
    - "Time his lead hand"

  urgency_based:
    - "You need this round"
    - "Stay on him, he's hurt"
    - "Let your hands go"
    - "You're winning, don't take risks"
```

### Advice Generation

```javascript
function generateCornerAdvice(fighter, fight, roundNumber) {
  const trainer = fighter.corner.headTrainer;
  const situation = assessFightSituation(fighter, fight);

  const advice = {
    primary: null,
    secondary: null,
    urgency: 'normal'
  };

  // Determine advice based on situation
  if (situation.losing && situation.margin > 3) {
    advice.urgency = 'high';
    advice.primary = selectOffensiveAdjustment(trainer, fight);
    advice.secondary = "You need to let your hands go";
  } else if (situation.winning && situation.margin > 3) {
    advice.primary = "Smart boxing, don't take risks";
    advice.secondary = selectDefensiveAdjustment(trainer, fight);
  } else if (fighter.isHurt) {
    advice.primary = "Tie him up, survive";
    advice.secondary = selectRecoveryAdvice(trainer);
  } else if (fight.opponent.isHurt) {
    advice.urgency = 'high';
    advice.primary = "Stay on him, he's ready to go";
  } else {
    // Tactical adjustment based on what's working
    advice.primary = identifyTacticalAdjustment(trainer, fight);
    advice.secondary = selectSecondaryAdvice(trainer, situation);
  }

  // Trainer skill affects quality
  advice.quality = trainer.strategySkill * trainer.communication / 100;

  return advice;
}
```

### Advice Application

```javascript
function applyCornerAdvice(fighter, advice) {
  const receptiveness = fighter.mental.fightIQ / 100;
  const adviceQuality = advice.quality;

  // Chance fighter follows advice
  const followChance = receptiveness * adviceQuality;

  if (Math.random() < followChance) {
    // Apply strategic adjustment
    const adjustment = translateAdviceToAdjustment(advice);
    fighter.currentStrategy = {
      ...fighter.currentStrategy,
      ...adjustment
    };

    // Buff for following good advice
    if (adviceQuality > 0.8) {
      applyBuff(fighter, 'corner_advice', 'corner');
    }
  }

  // Emotional/confidence effects
  if (advice.urgency === 'high') {
    fighter.mental.currentConfidence *= 0.95; // Pressure
  } else if (advice.positive) {
    fighter.mental.currentConfidence *= 1.05; // Encouragement
  }
}
```

---

## Corner Decisions

### Throwing in the Towel

```yaml
towel_decision:
  factors:
    - fighter_health (damage_level)
    - fighter_capability (can_they_survive)
    - scorecards (can_they_still_win)
    - opponent_damage (is_opponent_also_hurt)
    - fighter_wishes (will_they_want_to_continue)
    - trainer_philosophy (protective_vs_warrior)

  consideration_triggers:
    - multiple_knockdowns_in_round
    - visible_severe_damage
    - fighter_not_defending
    - one_sided_round
    - concerning_injury

  formula: |
    stop_probability =
      (damage_level / 100) *
      (1 - comeback_chance) *
      trainer_protectiveness *
      (severity_factor)
```

### Corner Stoppage Check

```javascript
function checkCornerStoppage(fighter, roundStats, trainer) {
  let stopProbability = 0;

  // Damage factor
  const damageLevel = fighter.headDamage / fighter.maxHeadDamage;
  stopProbability += damageLevel * 0.4;

  // Knockdowns this round
  if (roundStats.knockdowns[fighter.id] >= 2) {
    stopProbability += 0.3;
  }

  // Not defending factor
  const defenseRate = roundStats.punchesBlocked[fighter.id] /
                      Math.max(roundStats.punchesReceived[fighter.id], 1);
  if (defenseRate < 0.2) {
    stopProbability += 0.2;
  }

  // Trainer protectiveness (personality)
  const protectiveness = trainer.protectiveness || 0.5;
  stopProbability *= protectiveness;

  // Can't stop if fighter can still win
  const scoreDiff = calculateScoreDiff(fighter);
  if (scoreDiff > 0) {
    stopProbability *= 0.5; // Less likely to stop winner
  }

  return {
    shouldStop: Math.random() < stopProbability,
    probability: stopProbability
  };
}
```

---

## Corner Effectiveness

### Overall Effectiveness

```javascript
function calculateCornerEffectiveness(corner) {
  const trainer = corner.headTrainer;
  const cutman = corner.cutman;

  return {
    strategy: trainer.strategySkill / 100,
    communication: trainer.communication / 100,
    adaptation: trainer.adaptability / 100,

    cutTreatment: cutman.cutTreatment / 100,
    swellingTreatment: cutman.swellingTreatment / 100,

    overall: (
      trainer.strategySkill * 0.4 +
      trainer.communication * 0.2 +
      trainer.adaptability * 0.2 +
      cutman.cutTreatment * 0.1 +
      cutman.swellingTreatment * 0.1
    ) / 100
  };
}
```

---

## Implementation Notes

### Corner State Object

```javascript
const cornerState = {
  crew: {
    headTrainer: { /* trainer config */ },
    assistantTrainer: { /* assistant config */ },
    cutman: { /* cutman config */ }
  },

  effectiveness: {
    strategy: 0.92,
    medical: 0.95,
    overall: 0.93
  },

  roundAdvice: [
    { round: 1, primary: "Establish the jab", followed: true },
    { round: 2, primary: "Go to the body", followed: false },
    // ...
  ],

  treatments: [
    { round: 4, type: 'cut', location: 'left_eyebrow', success: true },
    // ...
  ]
};
```
