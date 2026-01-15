# Complete Formulas Reference

This document consolidates all mathematical formulas used in the simulation. Use this as a single source of truth for calculations.

---

## Stamina Formulas

### Maximum Stamina Pool

```javascript
maxStamina = 80 + (cardio * 0.4)
// cardio 70 → 108 units
// cardio 90 → 116 units
```

### Stamina Cost Calculation

```javascript
// Base costs per action
PUNCH_COSTS = {
  jab: 0.22,
  cross: 0.45,
  lead_hook: 0.40,
  rear_hook: 0.55,
  lead_uppercut: 0.38,
  rear_uppercut: 0.60,
  body_jab: 0.22,
  body_cross: 0.45,
  body_hook_lead: 0.40,
  body_hook_rear: 0.55
}

COMBINATION_BONUS = {
  2: 0.1, 3: 0.2, 4: 0.3, 5: 0.4
}

DEFENSE_COSTS_PER_SECOND = {
  high_guard: 0.12,
  philly_shell: 0.06,
  head_movement: 0.25,
  distance: 0.10,
  parrying: 0.15
}

MOVEMENT_COSTS_PER_SECOND = {
  forward: 0.08,
  backward: 0.06,
  lateral: 0.10,
  circling: 0.15,
  cutting: 0.20,
  retreating: 0.10,
  burst: 0.35
}

BASELINE_COST = 0.07  // per second, always applied
```

### Total Stamina Cost Per Tick

```javascript
function calculateCost(fighter, decision, deltaTime) {
  // Baseline (always applies)
  cost = 0.07 * deltaTime

  // Action cost
  cost += actionCost

  // State ongoing cost
  cost += stateCost * deltaTime

  // If hurt
  if (fighter.isHurt) {
    cost += 1.0 * deltaTime
  }

  // Work rate modifier (elite = 65% reduction, average = 25% reduction)
  workRateMod = max(0.35, 1 - (workRate - 50) * 0.016)
  cost *= workRateMod

  // Pace control modifier
  paceControlMod = max(0.7, 1 - (paceControl - 50) * 0.006)
  cost *= paceControlMod

  // Body damage modifier
  bodyDamageMod = 1 + (bodyDamage / 150)
  cost *= bodyDamageMod

  // Fatigue modifier
  fatigueLevel = 1 - staminaPercent
  fatigueMod = 1 + (fatigueLevel * 0.25)
  cost *= fatigueMod

  return cost
}
```

### Stamina Recovery Per Tick

```javascript
function calculateRecovery(fighter, deltaTime) {
  // Base rate from cardio
  baseRate = cardio * 0.018

  // State modifiers
  STATE_RECOVERY = {
    neutral: 0.4,
    defensive: 0.25,
    timing: 0.2,
    moving: 0.15,
    offensive: 0.4,
    clinch: 0.55,
    hurt: 0.0
  }
  stateMod = STATE_RECOVERY[state]

  // Damage penalties
  bodyDamageMod = 1 - (bodyDamage / 250)
  headDamageMod = 1 - (headDamage / 500)

  // Age modifier
  ageMod = getAgeRecoveryModifier(age)

  recovery = baseRate * stateMod * bodyDamageMod * headDamageMod * ageMod * deltaTime

  return recovery
}
```

### Between-Round Recovery

```javascript
function calculateBetweenRoundRecovery(fighter) {
  // Base recovery
  baseRecovery = maxStamina * (recoveryRate / 100) * 0.45

  // Corner bonus (up to 12% extra)
  cornerBonus = (corner.strategySkill / 100) * 0.12

  // Body damage penalty
  bodyPenalty = 1 - (bodyDamage / 250)

  // Age modifier
  ageMod = getAgeRecoveryModifier(age)

  recovery = baseRecovery * (1 + cornerBonus) * bodyPenalty * ageMod

  // Cap at 55% of max
  return min(recovery, maxStamina * 0.55)
}
```

### Age Recovery Modifier

```javascript
function getAgeRecoveryModifier(age) {
  if (age <= 25) return 1.0
  if (age <= 30) return 0.95
  if (age <= 32) return 0.90
  if (age <= 35) return 0.82
  if (age <= 38) return 0.72
  return 0.60
}
```

### Fatigue Penalties By Tier

```javascript
// Base penalties (before heart adjustment)
FATIGUE_PENALTIES = {
  fresh:     {},  // 80-100%
  good:      { power: -3, speed: -2 },  // 60-80%
  tired:     { power: -8, speed: -5, accuracy: -5, defense: -5 },  // 40-60%
  exhausted: { power: -15, speed: -12, accuracy: -10, defense: -15, movement: -10 },  // 25-40%
  gassed:    { power: -30, speed: -25, accuracy: -20, defense: -30, movement: -25, chin: -15 }  // 0-25%
}

// Heart reduces penalties
// 90 heart = penalties * 0.73
// 70 heart = penalties * 1.0
// 50 heart = penalties * 1.27
heartFactor = 1 - (heart - 70) / 75
adjustedPenalty = basePenalty * heartFactor
```

### Second Wind Check

```javascript
function checkSecondWind(fighter, roundNumber) {
  // Requirements
  if (roundNumber < 9) return false
  if (staminaPercent > 0.4) return false
  if (secondWindUsed) return false

  // Calculate chance
  chance = secondWind / 100
  heartBonus = (heart - 50) / 200
  totalChance = chance + heartBonus

  if (random() < totalChance) {
    // Trigger effects
    currentStamina += maxStamina * 0.25
    // Buff: +10% power, +5% speed, +50% recovery for 60s
    return true
  }
  return false
}
```

---

## Damage Formulas

### Base Damage Calculation

```javascript
function calculateDamage(punch, attacker, defender, context) {
  // Punch base damage
  PUNCH_BASE_DAMAGE = {
    jab: 3, cross: 8, lead_hook: 7, rear_hook: 9,
    lead_uppercut: 6, rear_uppercut: 10,
    body_jab: 2.5, body_cross: 6, body_hook_lead: 6, body_hook_rear: 7
  }
  damage = PUNCH_BASE_DAMAGE[punch.type]

  // Power attribute modifier
  powerAttr = (punch.hand === 'lead') ? powerLeft : powerRight
  damage *= (powerAttr / 70)

  // Punch type power modifier
  PUNCH_POWER_MODIFIERS = {
    jab: 0.4, cross: 1.0, lead_hook: 0.85, rear_hook: 1.05,
    lead_uppercut: 0.75, rear_uppercut: 1.1
  }
  damage *= PUNCH_POWER_MODIFIERS[punch.type]

  // Weight factor
  damage *= 1 + (attacker.weight - 70) * 0.008

  // Counter bonus
  if (context.isCounter) {
    damage *= 1 + (counterPunching / 200)
  }

  // Stamina factor
  staminaPercent = currentStamina / maxStamina
  punchingStaminaMod = punchingStamina / 100
  damage *= staminaPercent + (1 - staminaPercent) * punchingStaminaMod

  // Blocked reduction
  if (context.blocked) {
    damage *= 0.3 + (1 - defender.blocking / 200) * 0.3
  }

  // Cleanness (0.3 to 1.0)
  damage *= context.cleanness

  // Defender's chin
  damage *= (100 / defender.chin)

  // Hurt defender bonus
  if (defender.isHurt) {
    damage *= 1 + (attacker.killerInstinct / 200)
  }

  return damage
}
```

### Body Damage Stamina Drain

```javascript
function calculateBodyDamageStaminaDrain(damage, punchType) {
  drain = damage * 0.5

  // Liver shot (15% chance on body hooks)
  if (isBodyHook && random() < 0.15) {
    drain = damage * 1.0  // Double drain
  }

  // Solar plexus (10% chance on body cross)
  if (punchType === 'body_cross' && random() < 0.1) {
    drain = damage * 0.8 + 5  // Extra flat drain
  }

  return drain
}
```

### Knockdown Threshold

```javascript
function checkKnockdown(defender, damage, punchType) {
  // Base threshold from chin
  baseThreshold = 35 + (chin * 0.35)
  // chin 90 → threshold 66.5
  // chin 70 → threshold 59.5

  // Current damage reduces threshold
  currentDamagePercent = headDamage / 100
  damageModifier = 1 - (currentDamagePercent * 0.4)

  threshold = baseThreshold * damageModifier

  // Check knockdown
  if (damage >= threshold) {
    type = (damage >= threshold * 1.5) ? 'KNOCKOUT' : 'KNOCKDOWN'
    return { knockdown: true, type }
  }

  // Flash knockdown check
  flashKDChance = (damage / threshold) * 0.3
  if (random() < flashKDChance) {
    return { knockdown: true, type: 'FLASH_KNOCKDOWN' }
  }

  return { knockdown: false }
}
```

### Knockdown Recovery

```javascript
function checkKnockdownRecovery(fighter, knockdown, count) {
  // Base from heart
  recoveryChance = heart / 100

  // Severity modifier
  SEVERITY_MODS = {
    flash: 1.0, light: 0.9, moderate: 0.7, severe: 0.4, devastating: 0.15
  }
  recoveryChance *= SEVERITY_MODS[knockdown.severity]

  // Count pressure (harder at 8 than 4)
  recoveryChance *= 1 - (count / 15)

  // Previous knockdowns
  recoveryChance *= pow(0.85, knockdownsThisFight)

  // Accumulated damage
  damagePercent = headDamage / 100
  recoveryChance *= 1 - (damagePercent * 0.5)

  // Check at each count from 4
  if (count >= 4 && random() < recoveryChance) {
    return { recovered: true, atCount: count }
  }

  return { recovered: false }
}
```

---

## Accuracy Formulas

### Base Accuracy Calculation

```javascript
function calculateAccuracy(attacker, defender, punch, context) {
  // Punch base accuracy
  PUNCH_BASE_ACCURACY = {
    jab: 0.45, cross: 0.35, lead_hook: 0.30, rear_hook: 0.25,
    lead_uppercut: 0.25, rear_uppercut: 0.22
  }
  accuracy = PUNCH_BASE_ACCURACY[punch.type]

  // Attacker's accuracy attribute
  accuracyAttr = punch.isJab ? jabAccuracy : powerAccuracy
  accuracy *= (accuracyAttr / 75)

  // Distance modifier
  accuracy *= getDistanceModifier(distance, punch.type)

  // Defender's defense modifier
  accuracy *= getDefenseModifier(defender, punch)

  // Situational modifiers
  accuracy *= getStateModifier(attacker.state, defender.state)
  accuracy *= getMovementModifier(attacker, defender)
  accuracy *= getCombinationModifier(context.punchNumber)
  accuracy *= getFatigueModifier(attacker.staminaPercent)

  // Reach advantage
  accuracy += getReachAdvantage(attacker, defender) * 0.02

  return clamp(accuracy, 0.05, 0.95)
}
```

### Distance Modifier

```javascript
// Relative to optimal range
DISTANCE_MODIFIERS = {
  '50%': { jab: 0.6, cross: 0.7, hook: 1.15, uppercut: 1.2 },
  '75%': { jab: 0.85, cross: 0.9, hook: 1.1, uppercut: 1.05 },
  '100%': { jab: 1.0, cross: 1.0, hook: 0.9, uppercut: 0.8 },
  '125%': { jab: 0.9, cross: 0.8, hook: 0.6, uppercut: 0.5 },
  '150%': { jab: 0.5, cross: 0.4, hook: 0.2, uppercut: 0.1 }
}
```

### Defense Modifier

```javascript
DEFENSE_VS_PUNCH = {
  HIGH_GUARD: {
    jab: 0.7, cross: 0.65, hook: 0.75, uppercut: 0.4, body: 0.8
  },
  PHILLY_SHELL: {
    jab: 0.8, cross: 0.85, lead_hook: 0.5, rear_hook: 0.6, body: 0.55
  },
  HEAD_MOVEMENT: {
    jab: 0.75, cross: 0.7, hook: 0.65, uppercut: 0.4
  }
}
```

### Combination Accuracy Degradation

```javascript
function getCombinationModifier(punchNumber) {
  // Base degradation
  BASE = { 1: 1.0, 2: 0.90, 3: 0.80, 4: 0.70, 5: 0.60, 6: 0.50 }

  // combinationPunching attribute reduces degradation
  // punch_2 accuracy = 0.90 + (combinationPunching * 0.001)
  // punch_3 accuracy = 0.80 + (combinationPunching * 0.002)

  base = BASE[min(punchNumber, 6)]
  bonus = (punchNumber - 1) * (combinationPunching / 1000)

  return base + bonus
}
```

### Style Matchup Modifiers

```javascript
STYLE_MATCHUP_ACCURACY = {
  'slugger_vs_counter-puncher': -0.12,
  'boxer-puncher_vs_swarmer_at_range': +0.08,
  'boxer-puncher_vs_swarmer_inside': -0.08,
  'swarmer_vs_boxer-puncher_at_range': -0.08,
  'swarmer_vs_boxer-puncher_inside': +0.12,
  'inside-fighter_vs_swarmer_inside': +0.18,
  'swarmer_vs_inside-fighter_inside': -0.12
}
```

### First Step Advantage

```javascript
// When closing distance (distance < 3.5)
if (firstStep_advantage > 10) {
  bonus = (advantage - 10) / 100
  // Tyson (98) vs Holyfield (78) = +10% accuracy
}
```

### Early Round KO Power Boost

```javascript
// For elite finishers in early rounds (1-5)
if (knockoutPower >= 94) {
  round_1_bonus = (knockoutPower - 94) * 0.08  // KO 99 = +40%
  // Fades each round
}
```

---

## AI Decision Formulas

### Risk Tolerance Calculation

```javascript
function calculateRiskTolerance(fighter, situation) {
  // Base from mentality
  baseRisk = ((heart - 50) * 0.4 + (killerInstinct - 50) * 0.3 +
              (composure - 50) * 0.15 + (confidence - 50) * 0.15) / 50

  riskMultiplier = 1.0

  // Behind on cards
  if (scoreDiff < 0) {
    desperationLevel = abs(scoreDiff) / 10
    urgency = (roundsLeft <= 3) ? 1.5 : (roundsLeft <= 6) ? 1.2 : 1.0
    riskMultiplier += desperationLevel * urgency

    if (heart >= 80) {
      riskMultiplier *= 1 + (heart - 80) / 50  // Heart 90 = 1.2x
    } else if (heart < 60) {
      riskMultiplier *= 0.7  // Accepts loss
    }
  }

  // Ahead on cards
  if (scoreDiff > 0 && killerInstinct >= 85) {
    riskMultiplier *= 1.1  // Goes for KO anyway
  } else if (scoreDiff > 2 && roundsLeft <= 3) {
    riskMultiplier *= 0.7  // Protects lead
  }

  // Damaged and low composure
  if (totalDamagePercent > 0.4) {
    if (composure < 65) {
      riskMultiplier *= 0.6
    } else if (composure >= 85) {
      riskMultiplier *= 1.1
    }
  }

  return baseRisk * riskMultiplier
}
```

### State Weight Modifiers

```javascript
// Low stamina
if (staminaPercent < 0.4) {
  OFFENSIVE *= 0.6
  CLINCH *= 2.0
  DEFENSIVE *= 1.3
}

// Opponent hurt
if (opponentIsHurt) {
  OFFENSIVE *= 1.8
  TIMING *= 0.5
  OFFENSIVE *= (1 + killerInstinct / 200)  // Additional boost
}

// Reach advantage at distance
if (reachAdvantage > 15 && distance >= 4) {
  reachBonusFactor = 1 + (reachAdvantage - 15) / 50
  OFFENSIVE *= 1.3 * reachBonusFactor
  DEFENSIVE *= 0.7
}

// Swarmer vs boxer-puncher at range
if (style === 'swarmer' && opponentStyle === 'boxer-puncher' && distance >= 4) {
  MOVING *= 1.8
  OFFENSIVE *= 1.3
  DEFENSIVE *= 0.6
}
```

---

## Scoring Formulas

### Round Scoring (10-Point Must)

```javascript
function scoreRound(roundStats, fighterA, fighterB) {
  // Clean punches (higher weight)
  cleanPunchDiff = (A.cleanPunches - B.cleanPunches) * 1.5

  // Power punches
  powerPunchDiff = (A.powerPunches - B.powerPunches) * 2.0

  // Effective aggression
  aggressionDiff = (A.effectiveAggression - B.effectiveAggression) * 1.0

  // Ring control
  ringControlDiff = (A.ringControl - B.ringControl) * 0.8

  // Defense
  defenseDiff = (A.defensiveWork - B.defensiveWork) * 0.5

  // Knockdowns
  knockdownDiff = (A.knockdowns - B.knockdowns) * 3.0

  totalDiff = cleanPunchDiff + powerPunchDiff + aggressionDiff +
              ringControlDiff + defenseDiff + knockdownDiff

  // Convert to 10-point must
  if (totalDiff > 2) return { A: 10, B: 9 }
  if (totalDiff < -2) return { A: 9, B: 10 }
  return { A: 10, B: 10 }  // Even round

  // Knockdown adjustments
  // 1 knockdown = 10-8
  // 2 knockdowns = 10-7
}
```

---

## Physical Attribute Formulas

### Reach Advantage

```javascript
reachAdvantage = (fighterReach - opponentReach) / 2.5
jabRangeBonus = reachAdvantage * 2  // Added to jabAccuracy
optimalDistance = reach * 0.45
```

### Weight Modifiers

```javascript
powerModifier = 1 + (weight - classAverage) * 0.005
clinchModifier = weight / opponentWeight
staminaDrain = baseDrain * (weight / 75)
```

### Body Type Modifiers

```javascript
BODY_TYPE_MODS = {
  lean:     { speed: +3%, power: -3%, stamina: +5%, reach: 1.02 },
  average:  { all: baseline, reach: 1.02 },
  muscular: { power: +5%, speed: -2%, stamina: -3%, reach: 1.00 },
  stocky:   { power: +3%, chin: +5%, insideFighting: +5%, reach: 0.98 },
  lanky:    { outsideFighting: +5%, insideFighting: -5%, reach: 1.06 }
}
```

### Age Modifiers

```javascript
AGE_MODS = {
  '18-21': { speed: +5%, power: -5%, experience: -30%, reflexes: +5%, recovery: +10% },
  '22-25': { all: baseline, experience: -10% },
  '26-32': { all: baseline (peak) },
  '33-35': { speed: -5%, reflexes: -8%, chin: -5%, recovery: -10%, experience: +10% },
  '36-38': { speed: -12%, reflexes: -15%, chin: -12%, recovery: -20%, cardio: -10%, experience: +15% },
  '39+':   { speed: -20%, reflexes: -25%, chin: -20%, recovery: -30%, cardio: -20%, power: -10%, experience: +20% }
}
```

---

## Derived Attribute Formulas

```javascript
effectiveReach = reach + (height - 175) * 0.3 + stanceMatchupModifier

optimalRange = effectiveReach * 0.45 + styleModifier

punchOutputCapacity = cardio * workRate * combinationSpeed / 10000

defensiveEfficiency = (headMovement + blocking + footwork) / 3

overallPower = (powerLeft + powerRight) / 2 * (1 + knockoutPower / 200)

overallSpeed = (handSpeed + footSpeed + reflexes) / 3

ringControl = ringGeneralship * footwork * distanceManagement / 10000

survivability = chin * heart * (1 + composure / 200)

counterThreat = counterPunching * reflexes * handSpeed / 10000

pressureEffectiveness = workRate * cardio * ringGeneralship / 10000
```
