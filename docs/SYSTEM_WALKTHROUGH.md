# System Walkthrough

This document traces the exact flow of data through the simulation, step by step. Use this to understand how systems interact in real time.

---

## Part 1: Single Punch Resolution

This walkthrough follows a single punch from AI decision to damage application.

### Step 1: AI Decision (FighterAI.decide)

```
Fighter A (Tyson): swarmer, inside-fighter
Fighter B (Lewis): boxer-puncher, out-boxer
Current distance: 3.2 units (close range)

┌─────────────────────────────────────────────────────────────────────┐
│ 1. Assess Situation                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ situation = {                                                       │
│   staminaPercent: 0.72,      // Tyson at 72% stamina                │
│   headDamagePercent: 0.15,   // Taken some punishment               │
│   bodyDamagePercent: 0.08,                                          │
│   isHurt: false,                                                    │
│   opponentIsHurt: false,                                            │
│   distance: 3.2,             // Close range                         │
│   optimalRange: 3.0,         // Tyson's preferred range             │
│   round: 6,                                                         │
│   scoreDiff: -0.5,           // Slightly behind                     │
│   momentum: 1                // Positive momentum                   │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: State Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Get Style Base Weights (inside-fighter)                          │
├─────────────────────────────────────────────────────────────────────┤
│ baseWeights = {                                                     │
│   OFFENSIVE: 0.48,   // Inside fighters are highly offensive        │
│   DEFENSIVE: 0.07,                                                  │
│   TIMING: 0.03,                                                     │
│   MOVING: 0.27,                                                     │
│   CLINCH: 0.15                                                      │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 3. Apply Situational Modifiers                                      │
├─────────────────────────────────────────────────────────────────────┤
│ // At close range (distance < 3) - Tyson's domain                   │
│ // Swarmer vs boxer-puncher inside boost                            │
│ OFFENSIVE *= 1.4  → 0.48 * 1.4 = 0.672                              │
│ MOVING *= 0.6     → 0.27 * 0.6 = 0.162  // Stay close               │
│                                                                     │
│ // Risk calculation: slightly behind, high heart (92)               │
│ baseRisk = ((92-50)*0.4 + (94-50)*0.3 + (85-50)*0.15) / 50 = 0.61   │
│ riskMultiplier = 1.0 (not far behind)                               │
│ effectiveRisk = 0.61 (risk-taking mode)                             │
│                                                                     │
│ // Risk boosts offense                                              │
│ riskBoost = 1 + (0.61 - 0.5) * 0.8 = 1.088                          │
│ OFFENSIVE *= 1.088  → 0.672 * 1.088 = 0.731                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 4. Final Weights (Normalized)                                       │
├─────────────────────────────────────────────────────────────────────┤
│ finalWeights = {                                                    │
│   OFFENSIVE: 0.731,                                                 │
│   DEFENSIVE: 0.062,                                                 │
│   TIMING: 0.027,                                                    │
│   MOVING: 0.162,                                                    │
│   CLINCH: 0.133                                                     │
│ }                                                                   │
│                                                                     │
│ Random roll: 0.45 → OFFENSIVE state selected                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Action Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Determine Offensive Sub-State                                    │
├─────────────────────────────────────────────────────────────────────┤
│ // Inside-fighter at close range                                    │
│ if (distance < 2) {                                                 │
│   roll = 0.4 → COMBINATION (60% chance)                             │
│ }                                                                   │
│                                                                     │
│ subState = OFFENSIVE.COMBINATION                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 6. Generate Combination                                             │
├─────────────────────────────────────────────────────────────────────┤
│ comboLength = 3 (randomly 2-4)                                      │
│                                                                     │
│ // At close range, start with lead hook (inside-fighter preference) │
│ punch_1: LEAD_HOOK                                                  │
│                                                                     │
│ // Follow-up from lead hook                                         │
│ punch_2: CROSS (from options: CROSS, REAR_HOOK, REAR_UPPERCUT)      │
│                                                                     │
│ // Follow-up from cross                                             │
│ punch_3: LEAD_HOOK                                                  │
│                                                                     │
│ combination = [LEAD_HOOK, CROSS, LEAD_HOOK]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 4: Punch Resolution (First Punch: Lead Hook)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Calculate Accuracy                                               │
├─────────────────────────────────────────────────────────────────────┤
│ // Base accuracy for lead hook                                      │
│ baseAccuracy = 0.30                                                 │
│                                                                     │
│ // Tyson's powerAccuracy (88) modifier                              │
│ accuracy *= (88 / 75) = 0.30 * 1.173 = 0.352                        │
│                                                                     │
│ // Distance modifier (at 50-75% optimal = inside)                   │
│ // Hooks are great inside: 1.1x                                     │
│ accuracy *= 1.1 = 0.387                                             │
│                                                                     │
│ // Lewis defensive modifier (high guard)                            │
│ // HIGH_GUARD vs hook = 0.75 (75% still get through)                │
│ accuracy *= 0.75 = 0.290                                            │
│                                                                     │
│ // Style matchup: inside-fighter vs boxer-puncher inside            │
│ // +18% accuracy bonus                                              │
│ accuracy += 0.18 = 0.470                                            │
│                                                                     │
│ // First step advantage: Tyson 98, Lewis 82 = +8 bonus              │
│ accuracy += (8 / 100) = 0.550                                       │
│                                                                     │
│ // Combination modifier (punch 1) = 1.0                             │
│ accuracy *= 1.0 = 0.550                                             │
│                                                                     │
│ Final accuracy = 55.0%                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 8. Roll for Hit                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Random roll: 0.42                                                   │
│ 0.42 < 0.55 → PUNCH LANDS                                           │
│                                                                     │
│ // Check cleanness (0.3-1.0)                                        │
│ cleanness roll: 0.78 → CLEAN HIT                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 5: Damage Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│ 9. Calculate Base Damage                                            │
├─────────────────────────────────────────────────────────────────────┤
│ // Punch base damage                                                │
│ baseDamage = 7 (lead hook)                                          │
│                                                                     │
│ // Power attribute (Tyson powerLeft = 94)                           │
│ damage = 7 * (94 / 70) = 9.4                                        │
│                                                                     │
│ // Punch type modifier (lead hook = 0.85)                           │
│ damage *= 0.85 = 7.99                                               │
│                                                                     │
│ // Weight factor (Tyson 99kg)                                       │
│ damage *= 1 + (99 - 70) * 0.008 = 1.232                             │
│ damage = 7.99 * 1.232 = 9.84                                        │
│                                                                     │
│ // Stamina factor (72% stamina, punchingStamina 85)                 │
│ staminaMod = 0.72 + (1 - 0.72) * 0.85 = 0.958                       │
│ damage *= 0.958 = 9.43                                              │
│                                                                     │
│ // Cleanness (0.78)                                                 │
│ damage *= 0.78 = 7.36                                               │
│                                                                     │
│ // Defender chin (Lewis chin = 88)                                  │
│ damage *= (100 / 88) = 8.36                                         │
│                                                                     │
│ Final damage = 8.36                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 10. Apply Damage                                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Lewis.headDamage += 8.36                                            │
│ Lewis.headDamage: 12 → 20.36                                        │
│ Lewis.headDamagePercent: 0.12 → 0.20                                │
│                                                                     │
│ // Check knockdown threshold                                        │
│ threshold = 35 + (88 * 0.35) = 65.8                                 │
│ currentDamageMod = 1 - (0.20 * 0.4) = 0.92                          │
│ effectiveThreshold = 65.8 * 0.92 = 60.54                            │
│                                                                     │
│ damage (8.36) < threshold (60.54) → No knockdown                    │
│                                                                     │
│ // Flash knockdown check                                            │
│ flashChance = (8.36 / 60.54) * 0.3 = 0.041 (4.1%)                   │
│ roll: 0.67 > 0.041 → No flash knockdown                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 6: Stamina Cost

```
┌─────────────────────────────────────────────────────────────────────┐
│ 11. Calculate Stamina Cost                                          │
├─────────────────────────────────────────────────────────────────────┤
│ // Punch cost                                                       │
│ punchCost = 0.40 (lead hook)                                        │
│                                                                     │
│ // Work rate modifier (Tyson workRate = 92)                         │
│ workRateMod = max(0.35, 1 - (92 - 50) * 0.016) = 0.328              │
│ cost *= 0.328 = 0.131                                               │
│                                                                     │
│ // Body damage modifier (8%)                                        │
│ bodyDamageMod = 1 + (8 / 150) = 1.053                               │
│ cost *= 1.053 = 0.138                                               │
│                                                                     │
│ // Fatigue modifier (72% stamina = 28% fatigued)                    │
│ fatigueMod = 1 + (0.28 * 0.25) = 1.07                               │
│ cost *= 1.07 = 0.148                                                │
│                                                                     │
│ Tyson stamina cost: 0.148                                           │
│ Tyson.currentStamina: 80.64 → 80.49                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 7: Effects Check

```
┌─────────────────────────────────────────────────────────────────────┐
│ 12. Check for Effects/Events                                        │
├─────────────────────────────────────────────────────────────────────┤
│ Clean power punch landed:                                           │
│ - Check momentum shift: Yes (Tyson momentum +1)                     │
│ - Check IN_THE_ZONE trigger: Need 3+ clean power shots in sequence  │
│   → Current streak: 1 (not triggered)                               │
│                                                                     │
│ Commentary event generated:                                         │
│ - "Tyson with a lead hook! Right on the temple!"                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Complete Round Flow

This walkthrough follows an entire round from bell to bell.

### Round Start

```
┌─────────────────────────────────────────────────────────────────────┐
│ ROUND 6 START                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Time: 0:00                                                          │
│                                                                     │
│ Fighter A (Tyson):                                                  │
│   stamina: 72% (80.64/112)                                          │
│   headDamage: 12%                                                   │
│   bodyDamage: 8%                                                    │
│   state: NEUTRAL                                                    │
│   position: corner A                                                │
│                                                                     │
│ Fighter B (Lewis):                                                  │
│   stamina: 81% (88.29/109)                                          │
│   headDamage: 20%                                                   │
│   bodyDamage: 15%                                                   │
│   state: NEUTRAL                                                    │
│   position: corner B                                                │
│                                                                     │
│ Distance: 8.0 units (starting positions)                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Tick 1-50 (0:00 - 0:10): Closing Distance

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE: Distance Establishment                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Tick 1-10:                                                          │
│   Tyson: MOVING.CUTTING_OFF (closing distance)                      │
│   Lewis: MOVING.CIRCLING (establishing range)                       │
│   Distance: 8.0 → 6.5                                               │
│                                                                     │
│ Tick 11-30:                                                         │
│   Tyson: MOVING.CUTTING_OFF + occasional jabs                       │
│   Lewis: OFFENSIVE.JABBING (using reach advantage)                  │
│   Distance: 6.5 → 5.0                                               │
│   Events:                                                           │
│     - Lewis jab lands (tick 15)                                     │
│     - Lewis jab lands (tick 22)                                     │
│     - Tyson jab misses (tick 28)                                    │
│                                                                     │
│ Tick 31-50:                                                         │
│   Tyson: More aggressive closing                                    │
│   Lewis: Mixing jabs with movement                                  │
│   Distance: 5.0 → 4.2                                               │
│                                                                     │
│ Stamina at 0:10:                                                    │
│   Tyson: 72% → 70% (-2% from movement + baseline)                   │
│   Lewis: 81% → 79% (-2% from jabbing + movement)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Tick 51-150 (0:10 - 0:30): First Exchange

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE: First Major Exchange                                         │
├─────────────────────────────────────────────────────────────────────┤
│ Tick 51-75:                                                         │
│   Tyson closes to 3.5 (inside-fighter range)                        │
│   Lewis attempts to create distance                                 │
│                                                                     │
│ Tick 76: EXCHANGE BEGINS                                            │
│   Tyson: OFFENSIVE.COMBINATION [JAB, CROSS, LEAD_HOOK]              │
│   Lewis: DEFENSIVE.HIGH_GUARD                                       │
│                                                                     │
│   Resolution:                                                       │
│     - Tyson jab: BLOCKED (Lewis blocking 85, damage reduced 65%)    │
│     - Tyson cross: LANDS CLEAN (8.5 damage)                         │
│     - Tyson lead hook: LANDS PARTIAL (5.2 damage)                   │
│                                                                     │
│ Tick 77-90:                                                         │
│   Lewis: MOVING.RETREATING (creating space)                         │
│   Tyson: MOVING.CUTTING_OFF (following)                             │
│   Distance: 3.5 → 4.0                                               │
│                                                                     │
│ Tick 91-120:                                                        │
│   Lewis establishes range, jabbing                                  │
│   Tyson walking through jabs                                        │
│   Lewis: 3 jabs landed (6 damage total)                             │
│   Tyson: Taking damage to close distance                            │
│                                                                     │
│ Tick 121-150:                                                       │
│   Tyson back inside (3.2)                                           │
│   Exchange: Tyson hooks, Lewis clinches                             │
│   Referee break at tick 145                                         │
│                                                                     │
│ Stamina at 0:30:                                                    │
│   Tyson: 70% → 65% (-5% from combos + pressure)                     │
│   Lewis: 79% → 76% (-3% from jabbing + clinch)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Tick 151-350 (0:30 - 1:10): Mid-Round Action

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE: Sustained Action                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Tick 151-200: Lewis boxing phase                                    │
│   Lewis at preferred range (5.5)                                    │
│   Establishing jab, occasional right hand                           │
│   Tyson struggling to close                                         │
│   Punches landed: Lewis 8, Tyson 2                                  │
│                                                                     │
│ Tick 201-250: Tyson pressure phase                                  │
│   Tyson cuts off ring successfully                                  │
│   Forces Lewis to ropes                                             │
│   Exchange at close range                                           │
│   Punches landed: Lewis 3, Tyson 7                                  │
│                                                                     │
│   EVENT: Lewis takes body hook, stamina drain                       │
│   Lewis.bodyDamage: 15% → 20%                                       │
│   Lewis stamina recovery now reduced by 8%                          │
│                                                                     │
│ Tick 251-300: Lewis escape and reset                                │
│   Lewis clinches, referee breaks                                    │
│   Lewis circles away, reestablishes range                           │
│   Both fighters catching breath                                     │
│                                                                     │
│ Tick 301-350: Second major exchange                                 │
│   Tyson closes again                                                │
│   BIG MOMENT: Tyson lands clean right uppercut                      │
│   Damage: 12.5 (high damage from power + clean hit)                 │
│                                                                     │
│   Lewis headDamage: 28% → 40%                                       │
│   Lewis enters MINOR_HURT state (3 seconds)                         │
│   Tyson KILLER_INSTINCT activates                                   │
│                                                                     │
│ Stamina at 1:10:                                                    │
│   Tyson: 65% → 55% (-10% from sustained pressure)                   │
│   Lewis: 76% → 68% (-8% from damage + output)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tick 351-450 (1:10 - 1:30): Hurt Sequence

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE: Lewis Hurt, Tyson Pressing                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Tick 351-360: Tyson smells blood                                    │
│   AI Decision: OFFENSIVE.POWER_SHOT (killerInstinct 94)             │
│   OFFENSIVE weight: base 0.48 * 1.8 (opponent hurt) = 0.864         │
│   Additional boost: 1 + (94/200) = 1.47                             │
│   Final OFFENSIVE weight: 1.27 (dominant)                           │
│                                                                     │
│ Tick 361-375: Sustained attack                                      │
│   Tyson throws 8 power punches                                      │
│   Lewis: DEFENSIVE.HIGH_GUARD + CLINCH attempts                     │
│   Punches landed: 4 (blocked: 2, missed: 2)                         │
│   Lewis additional damage: 15                                       │
│                                                                     │
│ Tick 376: Lewis recovers from HURT state                            │
│   Heart attribute (88) helps recovery                               │
│   Composure (88) prevents panic                                     │
│                                                                     │
│ Tick 377-400: Lewis survival mode                                   │
│   Lewis: MOVING.RETREATING + CLINCH                                 │
│   Successfully creates distance (3.2 → 5.0)                         │
│   Tyson pursuing but Lewis footwork holding                         │
│                                                                     │
│ Tick 401-450: Lewis stabilizes                                      │
│   Lewis resumes jabbing (carefully)                                 │
│   Tyson tiring from sustained pressure                              │
│   Exchange rate slows                                               │
│                                                                     │
│ Stamina at 1:30:                                                    │
│   Tyson: 55% → 45% (-10% from aggressive pursuit)                   │
│   Lewis: 68% → 62% (-6% from damage + movement)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tick 451-600 (1:30 - 2:00): Late Round

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE: Round Winds Down                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Tick 451-500: Both fighters pacing                                  │
│   Tyson: staminaPercent 45% → AI reduces offense                    │
│   paceControl 90 kicks in: conserving for next round                │
│   Lewis: recovering, establishing jab rhythm                        │
│                                                                     │
│ Tick 501-550: Lewis takes initiative                                │
│   Tyson tired (45%), Lewis fresher (62%)                            │
│   Lewis: OFFENSIVE.JABBING more frequently                          │
│   Landing jabs, controlling distance                                │
│   Punches: Lewis 6, Tyson 2                                         │
│                                                                     │
│ Tick 551-590: Final exchanges                                       │
│   Tyson makes one more push (killerInstinct)                        │
│   Lewis clinches twice                                              │
│   Referee warns for holding                                         │
│                                                                     │
│ Tick 591-600: 10-second warning                                     │
│   Both fighters increase output (last impression)                   │
│   Tyson: lands body hook                                            │
│   Lewis: lands jab-cross                                            │
│                                                                     │
│ ROUND END                                                           │
│                                                                     │
│ Final stamina:                                                      │
│   Tyson: 45% → 42%                                                  │
│   Lewis: 62% → 58%                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Round End: Scoring & Recovery

```
┌─────────────────────────────────────────────────────────────────────┐
│ ROUND SCORING                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Round Statistics:                                                   │
│                                                                     │
│                        Tyson    Lewis                               │
│   Jabs landed:           8        15                                │
│   Power punches:        12         5                                │
│   Clean punches:        14        11                                │
│   Total landed:         20        20                                │
│   Accuracy:            38%       42%                                │
│   Knockdowns:            0         0                                │
│                                                                     │
│ Scoring factors:                                                    │
│   - Clean punches even (14 vs 11)                                   │
│   - Power punches: Tyson +7 advantage                               │
│   - Ring aggression: Tyson clearly more aggressive                  │
│   - Effective defense: Lewis defensive work good                    │
│   - Damage done: Tyson did more damage (hurt Lewis)                 │
│                                                                     │
│ Judge scores: 10-9 Tyson (all three judges)                         │
│ Reason: Power punching, aggression, hurt opponent                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ BETWEEN-ROUND RECOVERY (60 seconds)                                 │
├─────────────────────────────────────────────────────────────────────┤
│ TYSON:                                                              │
│   Base recovery: 112 * (88/100) * 0.45 = 44.4                       │
│   Corner bonus: +5% (good corner)                                   │
│   Body damage penalty: 1 - (8/250) = 0.968                          │
│   Age modifier: 1.0 (peak age 28)                                   │
│   Final recovery: 44.4 * 1.05 * 0.968 = 45.1                        │
│   Stamina: 42% → 82% (47.0 → 92.1)                                  │
│                                                                     │
│ LEWIS:                                                              │
│   Base recovery: 109 * (82/100) * 0.45 = 40.2                       │
│   Corner bonus: +4%                                                 │
│   Body damage penalty: 1 - (20/250) = 0.92                          │
│   Age modifier: 0.95 (age 33)                                       │
│   Final recovery: 40.2 * 1.04 * 0.92 * 0.95 = 36.5                  │
│   Stamina: 58% → 91% (63.2 → 99.7)                                  │
│                                                                     │
│ DAMAGE RECOVERY:                                                    │
│   Tyson head: 12% → 10% (recovered 2%)                              │
│   Lewis head: 45% → 40% (recovered 5%, cutman work)                 │
│   Lewis body: 20% → 18% (recovered 2%)                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ROUND 7 START STATE                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Tyson:                                                              │
│   stamina: 82%                                                      │
│   headDamage: 10%                                                   │
│   bodyDamage: 8%                                                    │
│   momentum: positive                                                │
│                                                                     │
│ Lewis:                                                              │
│   stamina: 91%                                                      │
│   headDamage: 40%                                                   │
│   bodyDamage: 18%                                                   │
│   momentum: negative                                                │
│   Note: Accumulated damage starting to affect performance           │
│                                                                     │
│ Fight narrative:                                                    │
│   Tyson winning on aggression and power                             │
│   Lewis winning rounds early but fading                             │
│   Body work accumulating                                            │
│   Championship rounds will be decisive                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Critical Moment - Knockdown

This walkthrough shows what happens during a knockdown sequence.

```
┌─────────────────────────────────────────────────────────────────────┐
│ THE PUNCH                                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Round 9, Tick 234                                                   │
│ Lewis headDamage: 55%                                               │
│ Lewis stamina: 48%                                                  │
│                                                                     │
│ Tyson throws: REAR_UPPERCUT (inside range)                          │
│                                                                     │
│ Accuracy calculation:                                               │
│   Base: 0.22                                                        │
│   Tyson powerAccuracy (88): * 1.17 = 0.258                          │
│   Inside range: * 1.2 = 0.310                                       │
│   Lewis fatigue (tired tier): * 1.15 = 0.356                        │
│   Style matchup (inside-fighter advantage): + 0.18 = 0.536          │
│                                                                     │
│ Roll: 0.41 < 0.536 → LANDS CLEAN                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ DAMAGE CALCULATION                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Base: 10 (rear uppercut)                                            │
│ Power (powerRight 98): * 1.4 = 14.0                                 │
│ Type modifier (1.1): * 1.1 = 15.4                                   │
│ Weight (99kg): * 1.23 = 18.9                                        │
│ Stamina (65%, punchingStamina 85): * 0.93 = 17.6                    │
│ Clean hit (0.92): * 0.92 = 16.2                                     │
│ Chin (88): * 1.14 = 18.5                                            │
│ Accumulated damage (55%): defender more vulnerable                  │
│                                                                     │
│ Final damage: 18.5                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ KNOCKDOWN CHECK                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Base threshold: 35 + (88 * 0.35) = 65.8                             │
│                                                                     │
│ Current damage modifier:                                            │
│   headDamage before: 55%                                            │
│   modifier: 1 - (0.55 * 0.4) = 0.78                                 │
│                                                                     │
│ Effective threshold: 65.8 * 0.78 = 51.3                             │
│                                                                     │
│ Damage (18.5) < Threshold (51.3)?                                   │
│ Yes, but check flash knockdown:                                     │
│   flashChance = (18.5 / 51.3) * 0.3 = 0.108 (10.8%)                 │
│   Roll: 0.09 < 0.108 → FLASH KNOCKDOWN                              │
│                                                                     │
│ Result: KNOCKDOWN (flash type)                                      │
│ Severity: light                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ KNOCKDOWN SEQUENCE                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Lewis state → KNOCKED_DOWN                                          │
│ Tyson sent to neutral corner                                        │
│ Referee begins count                                                │
│                                                                     │
│ Count progression:                                                  │
│   Count 1-3: Automatic (no recovery check)                          │
│                                                                     │
│   Count 4:                                                          │
│     baseChance = 88/100 = 0.88 (Lewis heart)                        │
│     severityMod = 0.9 (light knockdown)                             │
│     countPressure = 1 - (4/15) = 0.73                               │
│     previousKD = 0.85^0 = 1.0 (first knockdown)                     │
│     damageMod = 1 - (0.55 * 0.5) = 0.725                            │
│     recoveryChance = 0.88 * 0.9 * 0.73 * 1.0 * 0.725 = 0.42         │
│     Roll: 0.38 < 0.42 → RECOVERY ATTEMPT                            │
│     Lewis stirring...                                               │
│                                                                     │
│   Count 5:                                                          │
│     countPressure = 1 - (5/15) = 0.67                               │
│     recoveryChance = 0.88 * 0.9 * 0.67 * 1.0 * 0.725 = 0.38         │
│     Roll: 0.52 > 0.38 → Still down                                  │
│                                                                     │
│   Count 6:                                                          │
│     countPressure = 1 - (6/15) = 0.60                               │
│     recoveryChance = 0.88 * 0.9 * 0.60 * 1.0 * 0.725 = 0.34         │
│     Roll: 0.22 < 0.34 → GETTING UP                                  │
│                                                                     │
│ Lewis beats the count at 6!                                         │
│ Lewis state → RECOVERED                                             │
│ Post-recovery penalty: -15% all attributes for 60 seconds           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ EFFECTS TRIGGERED                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ For Tyson:                                                          │
│   - SUCCESSFUL_KNOCKDOWN buff                                       │
│     • confidence: +15%                                              │
│     • killerInstinct: +10%                                          │
│     • stamina recovery burst                                        │
│   - Momentum: maximum positive                                      │
│                                                                     │
│ For Lewis:                                                          │
│   - ADRENALINE_SURGE buff (survived knockdown)                      │
│     • power: +15%                                                   │
│     • speed: +10%                                                   │
│     • pain resistance: +20%                                         │
│     • Duration: 30-45 seconds                                       │
│   - Post-knockdown fog: -15% attributes for 60s                     │
│                                                                     │
│ Fight state:                                                        │
│   - Round score now 10-8 Tyson (knockdown rule)                     │
│   - Lewis knockdownsThisRound: 1                                    │
│   - Lewis knockdownsThisFight: 1                                    │
│                                                                     │
│ Commentary:                                                         │
│   "DOWN GOES LEWIS! DOWN GOES LEWIS!"                               │
│   "He's getting up... Lewis beats the count!"                       │
│   "Can he survive the round?"                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary: Data Flow Diagram

```
                    ┌──────────────────────────────────────────┐
                    │            FIGHT LOOP (per tick)         │
                    └─────────────────┬────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │  Fighter A    │ │   Distance    │ │  Fighter B    │
            │  AI Decision  │ │  Calculation  │ │  AI Decision  │
            └───────┬───────┘ └───────────────┘ └───────┬───────┘
                    │                                   │
                    └─────────────┬─────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────────┐
                    │         ACTION RESOLUTION           │
                    │  (Accuracy → Hit Check → Damage)    │
                    └─────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
    │    Damage     │         │    Stamina    │         │    Effects    │
    │   Manager     │         │   Manager     │         │   Manager     │
    │               │         │               │         │               │
    │ • headDamage  │         │ • cost calc   │         │ • buffs       │
    │ • bodyDamage  │         │ • recovery    │         │ • debuffs     │
    │ • knockdown   │         │ • fatigue     │         │ • momentum    │
    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │          STATE UPDATE               │
                    │  (Fighter objects updated)          │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │          EVENT EMISSION             │
                    │  (Commentary, Display, Scoring)     │
                    └─────────────────────────────────────┘
```
