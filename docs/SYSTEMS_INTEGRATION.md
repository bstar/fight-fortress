# Systems Integration

This document explains how all simulation systems connect and interact. Understanding these relationships is critical for tuning fighter balance.

## System Overview

```
                           ┌─────────────────┐
                           │   Fight Loop    │
                           │  (SimulationLoop)│
                           └────────┬────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │  Fighter AI  │      │   Stamina    │      │   Damage     │
      │              │◄────►│   Manager    │◄────►│   Manager    │
      └──────────────┘      └──────────────┘      └──────────────┘
              │                     │                     │
              │                     ▼                     │
              │             ┌──────────────┐              │
              └────────────►│   Effects    │◄─────────────┘
                            │   Manager    │
                            └──────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │   Scoring    │
                            │   System     │
                            └──────────────┘
```

---

## Core Data Flow

### 1. Fighter Attributes → AI Decision

Fighter attributes directly influence AI behavior through STYLE_WEIGHTS:

```
style.primary ──► STYLE_WEIGHTS[style] ──► stateWeights, punchWeights
                                               │
mental.heart ─────────────────────────────────►│ Risk tolerance modifier
mental.killerInstinct ────────────────────────►│ Aggression vs hurt opponent
stamina.paceControl ──────────────────────────►│ Energy conservation
technical.fightIQ ────────────────────────────►│ Pacing in early rounds
```

### 2. Stamina ↔ AI Decision

Bidirectional relationship - stamina affects decisions, decisions affect stamina:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STAMINA → AI                                 │
├─────────────────────────────────────────────────────────────────────┤
│ staminaPercent < 0.4  → OFFENSIVE weight * 0.6                      │
│                       → CLINCH weight * 2.0                         │
│                       → DEFENSIVE weight * 1.3                      │
│                                                                     │
│ staminaPercent < 0.25 + behind on cards → "Go for broke" risk mode │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        AI → STAMINA                                 │
├─────────────────────────────────────────────────────────────────────┤
│ OFFENSIVE state  → baselineCost + punchCost                         │
│ DEFENSIVE state  → defenseCost * deltaTime                          │
│ MOVING state     → movementCost * deltaTime                         │
│ CLINCH state     → holdingCost * deltaTime (but +55% recovery)      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Damage ↔ Stamina

Body damage creates a stamina feedback loop:

```
Body Punch Lands
      │
      ▼
┌─────────────────────────────────────────┐
│ Immediate stamina drain: damage * 0.5   │
│ Liver shot: damage * 1.0 (15% chance)   │
│ Solar plexus: damage * 0.8 + 5 (10%)    │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ bodyDamage accumulates over fight       │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ Ongoing effects:                        │
│ • Stamina cost modifier: 1 + (bodyDamage / 150)    │
│ • Recovery penalty: 1 - (bodyDamage / 250)         │
│ • Between-round recovery: 1 - (bodyDamage / 250)   │
└─────────────────────────────────────────┘
```

### 4. Damage → AI (Defensive)

Head damage changes AI behavior:

```
headDamagePercent > 0.4 + low composure (< 65)
      │
      ▼
┌─────────────────────────────────────────┐
│ Conservative mode: risk * 0.6           │
│ Shell up, try to survive                │
└─────────────────────────────────────────┘

headDamagePercent > 0.4 + high composure (>= 85)
      │
      ▼
┌─────────────────────────────────────────┐
│ Warrior mode: risk * 1.1                │
│ Stay aggressive even when hurt          │
│ (Holyfield, Hagler behavior)            │
└─────────────────────────────────────────┘
```

### 5. Style Matchups → Accuracy

Style interactions modify accuracy calculations:

```
Attacker Style + Defender Style + Distance
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ slugger vs counter-puncher           → -12% accuracy            │
│ boxer-puncher vs swarmer (at range)  → +8% accuracy             │
│ boxer-puncher vs swarmer (inside)    → -8% accuracy             │
│ inside-fighter vs swarmer (inside)   → +18% accuracy            │
│ swarmer vs inside-fighter (inside)   → -12% accuracy            │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Reach → Positioning → Accuracy

```
fighterReach - opponentReach = reachAdvantage
                    │
         ┌─────────┴─────────┐
         ▼                   ▼
   reachAdvantage > 15   reachAdvantage < -15
   + distance >= 4       + distance < 3
         │                   │
         ▼                   ▼
   At optimal range      At optimal range
   OFFENSIVE * 1.3+      OFFENSIVE * 1.2
   DEFENSIVE * 0.7       (inside fighter)
```

---

## Effects System Integration

### Buff/Debuff Flow

```
Fight Event
     │
     ├── Knockdown survived ────► ADRENALINE_SURGE buff
     │                            • power: +15%
     │                            • speed: +10%
     │                            • duration: 30-45s
     │
     ├── Opponent hurt ──────────► KILLER_INSTINCT modifier
     │                            • aggression: +(killerInstinct/100)
     │
     ├── Clean combo landed ─────► IN_THE_ZONE buff (rare)
     │                            • accuracy: +10%
     │                            • power: +8%
     │                            • duration: 20-40s
     │
     ├── Body damage > 50% ──────► BODY_DAMAGE debuff
     │                            • recovery: -25%
     │                            • movement: -affected
     │
     └── Stamina < 25% ──────────► EXHAUSTION debuff
                                  • all physical: -15% to -30%
                                  • chin: -15%
```

### Effects → AI Decision

```
effectsManager.getAggressionModifier(fighterId)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ If aggrMod > 0:                                                 │
│   • OFFENSIVE weight *= 1 + aggrMod                             │
│   • TIMING weight *= 1 + aggrMod * 0.5                          │
│   • DEFENSIVE weight *= 1 - aggrMod * 0.5                       │
│                                                                 │
│ If aggrMod < 0:                                                 │
│   • OFFENSIVE weight *= 1 + aggrMod (reduces)                   │
│   • DEFENSIVE weight *= 1 - aggrMod (increases)                 │
│   • CLINCH weight *= 1 - aggrMod * 0.3 (more likely)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scoring Integration

### Round Scoring Inputs

```
Round Events
     │
     ├── Punches landed (clean) ────┐
     ├── Punches landed (power) ────┤
     ├── Punches blocked ───────────┤
     ├── Knockdowns ────────────────┤──► Scoring System
     ├── Ring control ──────────────┤
     ├── Effective aggression ──────┤
     └── Defense ───────────────────┘
                                       │
                                       ▼
                               10-Point Must Score
```

### Scorecard → AI Decision

```
scoreDiff = estimateScoreDiff(fight, fighterId)
                    │
         ┌─────────┴─────────┐
         ▼                   ▼
   scoreDiff < 0         scoreDiff > 0
   (behind)              (ahead)
         │                   │
         ▼                   ▼
   Calculate desperation  If killerInstinct >= 85:
   level based on:          → risk * 1.1 (go for kill)
   • deficit magnitude    Else if roundsLeft <= 3:
   • rounds remaining       → risk * 0.7 (protect lead)
```

---

## Physical Attributes Impact Map

### Power Flow

```
powerLeft/powerRight
        │
        ├────────────────────────────────► Base damage calculation
        │                                   damage *= (powerAttr / 70)
        │
knockoutPower ──────────────────────────► KO check modifier
        │                                   ko_check *= knockoutPower / 75
        │
        └── vs opponent.chin ───────────► Knockdown threshold
                                           threshold = 60 + (chin * 0.6)
```

### Speed Flow

```
handSpeed
    │
    ├── Punch execution speed
    ├── Counter-punch window size
    └── Block difficulty for opponent

footSpeed
    │
    ├── Distance change rate
    ├── Escape success when hurt
    └── Ring cut effectiveness

reflexes
    │
    ├── Defensive reaction success
    ├── Counter window recognition
    └── Surprise punch vulnerability
```

### Stamina Attribute Flow

```
cardio ─────────► maxStamina = 80 + (cardio * 0.4)
                  baseRecoveryRate = cardio * 0.018

recoveryRate ───► betweenRoundRecovery = max * (recoveryRate / 100) * 0.45

workRate ───────► staminaCostMod = max(0.35, 1 - (workRate - 50) * 0.016)

paceControl ────► staminaCostMod *= max(0.7, 1 - (paceControl - 50) * 0.006)
                  AI pacing decisions in early/late rounds
```

---

## Cross-System Scenarios

### Scenario 1: Pressure Fighter vs Out-Boxer

```
Round 1-4:
┌─────────────────────────────────────────────────────────────────┐
│ Swarmer at distance (>= 4):                                     │
│   • MOVING weight * 1.8 (close distance priority)               │
│   • OFFENSIVE weight * 1.3 (stay active while moving)           │
│   • DEFENSIVE weight * 0.6 (accept taking shots)                │
│                                                                 │
│ Out-boxer at distance (>= 4):                                   │
│   • Comfortable at preferred range                              │
│   • OFFENSIVE.JABBING primary                                   │
│   • Accumulating points                                         │
└─────────────────────────────────────────────────────────────────┘

Round 5-8 (body work accumulates):
┌─────────────────────────────────────────────────────────────────┐
│ Swarmer body punching effect:                                   │
│   • Out-boxer bodyDamage increasing                             │
│   • Out-boxer stamina recovery reducing                         │
│   • Out-boxer movement slowing                                  │
│                                                                 │
│ If swarmer closing gap successfully:                            │
│   • Inside (< 3): swarmer OFFENSIVE * 1.4                       │
│   • Out-boxer MOVING * 1.5 (trying to escape)                   │
└─────────────────────────────────────────────────────────────────┘

Round 9-12 (championship rounds):
┌─────────────────────────────────────────────────────────────────┐
│ Scorecard assessment:                                           │
│   • Fighter behind calculates desperation level                 │
│   • High heart fighters embrace risk                            │
│   • Low heart fighters become conservative                      │
│                                                                 │
│ Second wind check (if stamina < 40%):                           │
│   • Trigger chance: secondWind/100 + (heart-50)/200             │
│   • Effect: +25% stamina, +10% power, +5% speed                 │
└─────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Slugger vs Counter-Puncher

```
┌─────────────────────────────────────────────────────────────────┐
│ Slugger attacking:                                              │
│   • Base accuracy penalty: -12% (counter-puncher timing)        │
│   • Telegraph risk: high (loading up power shots)               │
│                                                                 │
│ Counter-puncher waiting:                                        │
│   • TIMING state: 40% of time                                   │
│   • Counter window: 0.2 + (counterPunching * 0.003) seconds     │
│   • Counter accuracy bonus: counterPunching * 0.3%              │
│   • Counter damage bonus: counterPunching * 0.4%                │
└─────────────────────────────────────────────────────────────────┘

Risk calculation:
┌─────────────────────────────────────────────────────────────────┐
│ Slugger with high killerInstinct (>= 85):                       │
│   • Continues aggression even if being countered                │
│   • May find one big punch                                      │
│                                                                 │
│ Slugger with low composure (< 65) being countered:              │
│   • Becomes frustrated                                          │
│   • Loads up more (more telegraphing)                           │
│   • Wild swings miss more often                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Integration Points for Balance Tuning

### To Make Fighter More Aggressive
1. Increase `killerInstinct` → more aggression when opponent hurt
2. Increase `heart` → takes more risks when behind
3. Increase `composure` → stays aggressive when damaged
4. Set style to `swarmer` or `inside-fighter` → higher OFFENSIVE weights

### To Improve Fighter Conditioning
1. Increase `cardio` → larger stamina pool, faster recovery
2. Increase `recoveryRate` → better between-round recovery
3. Increase `workRate` → lower stamina costs per action
4. Increase `paceControl` → smarter energy management

### To Improve Fighter Defense
1. Increase `headMovement` → better evasion
2. Increase `blocking` → better damage reduction
3. Increase `reflexes` → better reaction to punches
4. Set defensive style to `philly-shell` or `slick`

### To Improve Fighter Power
1. Increase `powerRight`/`powerLeft` → more base damage
2. Increase `knockoutPower` → better finishing ability
3. Increase `bodyPunching` → more stamina drain on opponent
4. Set offensive style to `headhunter` or `body-snatcher`

---

## Debugging Integration Issues

### Fighter Not Closing Distance
Check:
- `firstStep` attribute (explosive closing)
- Style weights for MOVING state
- `ringGeneralship` (ring cutting ability)
- Opponent's `footSpeed` (escape ability)

### Fighter Gassing Too Early
Check:
- `cardio`, `workRate`, `recoveryRate` attributes
- OFFENSIVE state weight (throwing too many punches?)
- `bodyDamage` accumulation (opponent working body?)
- Style configuration (pressure fighter needs high cardio)

### Fighter Not Finishing Hurt Opponent
Check:
- `killerInstinct` attribute
- `knockoutPower` attribute
- OFFENSIVE state weight modifier when `opponentIsHurt`
- Distance (needs to be in range to finish)

### Fights Ending Too Early/Late
Check:
- `chin` attributes on both fighters
- `knockoutPower` vs `chin` matchup
- Knockdown threshold calculations
- KO probability multipliers
