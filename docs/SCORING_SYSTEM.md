# Scoring System

This document defines how fights are scored by judges, including the 10-point must system, judge personalities, organizational preferences, and controversial decision mechanics.

## 10-Point Must System

### Basic Rules

```yaml
10_point_must:
  description: |
    The winner of each round receives 10 points. The loser receives 9 or fewer.
    Both fighters cannot receive the same score (except 10-10 even).

  standard_scores:
    10-9: clear_round_winner
    10-8: dominant_round_with_knockdown_or_domination
    10-7: multiple_knockdowns_or_extreme_domination
    10-10: even_round (rare, discouraged)

  knockdown_impact:
    one_knockdown: typically_10-8
    two_knockdowns: typically_10-7
    three_knockdowns: often_tko_before_scored

  must_score: the_winner_must_get_10
```

### Scoring Criteria

```yaml
scoring_criteria:
  clean_punching:
    weight: 35%
    definition: punches_that_land_cleanly
    preference: quality_over_quantity

  effective_aggression:
    weight: 25%
    definition: aggression_that_leads_to_landed_punches
    note: walking_forward_without_landing_not_rewarded

  ring_generalship:
    weight: 20%
    definition: controlling_the_pace_location_and_action
    includes: cutting_off_ring, dictating_distance

  defense:
    weight: 20%
    definition: making_opponent_miss, blocking_effectively
    note: often_undervalued_by_casual_judges
```

---

## Judge Personalities

### Judge Types

```yaml
judge_types:
  technical:
    description: values_clean_punching_and_defense
    preferences:
      clean_punching: 1.3x
      defense: 1.4x
      effective_aggression: 0.8x
      ring_generalship: 1.1x
    favors: [out-boxer, counter-puncher]
    dislikes: [sloppy_brawls]
    knockdown_weight: standard

  action:
    description: loves_aggression_and_activity
    preferences:
      clean_punching: 0.9x
      defense: 0.6x
      effective_aggression: 1.5x
      ring_generalship: 0.9x
    favors: [swarmer, slugger]
    dislikes: [defensive_fighters]
    knockdown_weight: standard

  punch_counter:
    description: counts_punches_regardless_of_effect
    preferences:
      clean_punching: 0.7x
      volume: 1.5x (custom)
      defense: 0.5x
      effective_aggression: 1.0x
    favors: [volume-puncher]
    dislikes: [low_output_fighters]
    knockdown_weight: standard

  power_based:
    description: values_damage_over_volume
    preferences:
      clean_punching: 1.0x
      power_shots: 1.4x (custom)
      defense: 0.8x
      effective_aggression: 1.2x
    favors: [slugger, boxer-puncher]
    dislikes: [pillow_fisted_pointers]
    knockdown_weight: 1.3x

  balanced:
    description: applies_criteria_evenly
    preferences:
      clean_punching: 1.0x
      defense: 1.0x
      effective_aggression: 1.0x
      ring_generalship: 1.0x
    favors: no_particular_style
    knockdown_weight: standard

  home_biased:
    description: tends_to_favor_local_fighter
    bias_modifier: 5-15% toward home fighter
    rarely_gives_controversial: true
    knockdown_weight: standard
```

### Judge Configuration

```javascript
const judge = {
  name: "Harold Lederman",
  type: "technical",
  experience: 95,
  consistency: 88,
  preferences: {
    cleanPunching: 1.3,
    defense: 1.4,
    effectiveAggression: 0.8,
    ringGeneralship: 1.1,
    powerShots: 1.0,
    volume: 0.9
  },
  knockdownWeight: 1.0,
  homeBias: 0, // 0-15
  compuboxReliance: 0.3 // How much raw numbers matter
};
```

---

## Round Scoring

### Score Calculation

```javascript
function scoreRound(judge, fighterA, fighterB, roundStats) {
  // Calculate raw scores for each criterion
  const scoresA = {
    cleanPunching: calculateCleanPunching(roundStats, 'A'),
    effectiveAggression: calculateEffectiveAggression(roundStats, 'A'),
    ringGeneralship: calculateRingGeneralship(roundStats, 'A'),
    defense: calculateDefense(roundStats, 'A'),
    powerShots: calculatePowerShots(roundStats, 'A'),
    volume: roundStats.punchesThrown.A
  };

  const scoresB = {
    cleanPunching: calculateCleanPunching(roundStats, 'B'),
    effectiveAggression: calculateEffectiveAggression(roundStats, 'B'),
    ringGeneralship: calculateRingGeneralship(roundStats, 'B'),
    defense: calculateDefense(roundStats, 'B'),
    powerShots: calculatePowerShots(roundStats, 'B'),
    volume: roundStats.punchesThrown.B
  };

  // Apply judge preferences
  let totalA = 0, totalB = 0;
  for (const criterion of Object.keys(scoresA)) {
    const preference = judge.preferences[criterion] || 1.0;
    totalA += scoresA[criterion] * preference;
    totalB += scoresB[criterion] * preference;
  }

  // Apply home bias if applicable
  if (judge.homeBias > 0 && fighterA.isHomeFighter) {
    totalA *= 1 + (judge.homeBias / 100);
  } else if (judge.homeBias > 0 && fighterB.isHomeFighter) {
    totalB *= 1 + (judge.homeBias / 100);
  }

  // Knockdown adjustments
  const knockdownsA = roundStats.knockdowns.causedBy.A;
  const knockdownsB = roundStats.knockdowns.causedBy.B;

  // Determine round score
  return determineRoundScore(totalA, totalB, knockdownsA, knockdownsB, judge);
}
```

### Score Determination

```javascript
function determineRoundScore(scoreA, scoreB, kdA, kdB, judge) {
  // Base round score
  let pointsA = 10, pointsB = 10;
  const diff = scoreA - scoreB;
  const threshold = 15; // Points needed to win round

  if (diff > threshold) {
    pointsB = 9;
  } else if (diff < -threshold) {
    pointsA = 9;
  } else if (Math.abs(diff) <= 5) {
    // Very close - judge consistency matters
    if (Math.random() > judge.consistency / 100) {
      // Inconsistent scoring
      if (Math.random() > 0.5) {
        pointsB = 9;
      } else {
        pointsA = 9;
      }
    } else {
      // Award to slight leader or even
      if (diff > 0) pointsB = 9;
      else if (diff < 0) pointsA = 9;
      // else 10-10
    }
  } else {
    // Clear but not dominant
    if (diff > 0) pointsB = 9;
    else pointsA = 9;
  }

  // Apply knockdown penalties
  const kdWeight = judge.knockdownWeight || 1.0;

  if (kdA > 0) {
    pointsB -= Math.min(kdA * kdWeight, 2);
  }
  if (kdB > 0) {
    pointsA -= Math.min(kdB * kdWeight, 2);
  }

  return {
    fighterA: Math.max(7, Math.round(pointsA)),
    fighterB: Math.max(7, Math.round(pointsB)),
    margin: Math.abs(diff),
    confidence: judge.consistency
  };
}
```

---

## Scoring Categories Detail

### Clean Punching

```javascript
function calculateCleanPunching(roundStats, fighter) {
  const landed = roundStats.punchesLanded[fighter];
  const cleanLanded = roundStats.cleanPunchesLanded[fighter];
  const powerLanded = roundStats.powerPunchesLanded[fighter];
  const damageDealt = roundStats.damageDealt[fighter];

  // Weighted score
  let score = 0;
  score += cleanLanded * 3;        // Clean punches worth more
  score += (landed - cleanLanded) * 1; // Partial hits
  score += powerLanded * 2;        // Power punch bonus
  score += damageDealt * 0.5;      // Damage bonus

  return score;
}
```

### Effective Aggression

```javascript
function calculateEffectiveAggression(roundStats, fighter) {
  const punchesThrown = roundStats.punchesThrown[fighter];
  const punchesLanded = roundStats.punchesLanded[fighter];
  const forwardMovement = roundStats.forwardMovement[fighter];
  const pressureTime = roundStats.pressureTime[fighter];

  // Aggression that lands is effective
  const landingRate = punchesLanded / Math.max(punchesThrown, 1);
  const effectivenessMultiplier = 0.5 + landingRate;

  let score = 0;
  score += forwardMovement * 0.3;
  score += pressureTime * 0.2;
  score += punchesThrown * 0.1;
  score *= effectivenessMultiplier;

  // Walking forward without landing = ineffective
  if (landingRate < 0.2 && forwardMovement > 50) {
    score *= 0.5;
  }

  return score;
}
```

### Ring Generalship

```javascript
function calculateRingGeneralship(roundStats, fighter) {
  const centerTime = roundStats.ringCenterTime[fighter];
  const cutOffSuccess = roundStats.cutOffRingSuccess[fighter];
  const corneredOpponent = roundStats.corneredOpponentTime[fighter];
  const wasCorned = roundStats.wasCorneredTime[fighter];

  let score = 0;
  score += centerTime * 0.3;
  score += cutOffSuccess * 5;
  score += corneredOpponent * 0.5;
  score -= wasCorned * 0.3;

  return Math.max(0, score);
}
```

### Defense

```javascript
function calculateDefense(roundStats, fighter) {
  const punchesAvoided = roundStats.punchesAvoided[fighter];
  const punchesBlocked = roundStats.punchesBlocked[fighter];
  const cleanHitsTaken = roundStats.cleanHitsTaken[fighter];
  const damageTaken = roundStats.damageTaken[fighter];

  let score = 0;
  score += punchesAvoided * 2;      // Full evasion rewarded
  score += punchesBlocked * 1;      // Blocking rewarded
  score -= cleanHitsTaken * 1.5;    // Clean hits penalized
  score -= damageTaken * 0.3;       // Damage penalized

  return Math.max(0, score);
}
```

---

## Boxing Organizations

### Major Organizations

```yaml
organizations:
  WBA:
    name: World Boxing Association
    founded: 1921
    scoring_tendency: slightly_favors_aggression
    judge_pool_bias: action (slight)
    belt_types: [super, world, intercontinental]

  WBC:
    name: World Boxing Council
    founded: 1963
    scoring_tendency: balanced
    judge_pool_bias: balanced
    belt_types: [world, silver, international]
    special_rules:
      - clean_punching_emphasis
      - knockdown_rule_variations

  IBF:
    name: International Boxing Federation
    founded: 1983
    scoring_tendency: favors_clean_punching
    judge_pool_bias: technical (slight)
    belt_types: [world, intercontinental]
    mandatory_defense: strict

  WBO:
    name: World Boxing Organization
    founded: 1988
    scoring_tendency: balanced
    judge_pool_bias: balanced
    belt_types: [world, international, youth]
```

### Organization Judge Selection

```javascript
function selectJudges(organization, location) {
  const judgePool = getJudgePool(organization);

  // Organization bias
  const orgBias = ORGANIZATION_BIAS[organization];

  // Select 3 judges
  const judges = [];

  // At least one local judge (common practice)
  const localJudge = selectLocalJudge(judgePool, location);
  if (localJudge) judges.push(localJudge);

  // Fill remaining with org-preferred types
  while (judges.length < 3) {
    const judge = selectJudgeByPreference(judgePool, orgBias);
    if (!judges.includes(judge)) {
      judges.push(judge);
    }
  }

  return judges;
}
```

---

## Decision Types

### Fight Outcomes

```yaml
decision_types:
  unanimous_decision:
    abbreviation: UD
    definition: all_three_judges_agree_on_winner
    confidence: high

  split_decision:
    abbreviation: SD
    definition: two_judges_for_winner_one_for_loser
    confidence: medium
    controversy_potential: moderate

  majority_decision:
    abbreviation: MD
    definition: two_judges_for_winner_one_draw
    confidence: medium
    rarity: uncommon

  draw:
    types:
      unanimous_draw: all_three_score_even
      majority_draw: two_draws_one_winner
      split_draw: one_for_each_one_draw
    rarity: very_rare

  technical_decision:
    abbreviation: TD
    definition: fight_stopped_due_to_accidental_foul_after_4_rounds
    goes_to_scorecards: true
```

### Controversial Decisions

```javascript
function assessControversy(finalScores, roundByRound, fightStats) {
  const officialWinner = getOfficialWinner(finalScores);
  const statsWinner = getStatsWinner(fightStats);
  const knockdowns = fightStats.totalKnockdowns;

  let controversyScore = 0;

  // Stats disagree with decision
  if (officialWinner !== statsWinner) {
    controversyScore += 30;

    // By how much do stats disagree?
    const statsDiff = fightStats[statsWinner].score - fightStats[officialWinner].score;
    controversyScore += Math.min(statsDiff * 2, 40);
  }

  // Wide scorecard variance
  const scoreVariance = calculateScoreVariance(finalScores);
  if (scoreVariance > 3) {
    controversyScore += scoreVariance * 5;
  }

  // Knockdowns didn't matter
  if (knockdowns.causedBy[officialWinner] === 0 &&
      knockdowns.causedBy[getLoser(finalScores)] > 0) {
    controversyScore += 25;
  }

  return {
    score: controversyScore,
    isControversial: controversyScore > 40,
    isRobbery: controversyScore > 70,
    reasons: getControversyReasons(controversyScore)
  };
}
```

---

## Scorecard Display

### Visual Representation

```
═══════════════════════════════════════════════════════════════════
                         OFFICIAL SCORECARDS
═══════════════════════════════════════════════════════════════════

Judge: Harold Lederman (Technical)
  RD │  1    2    3    4    5    6    7    8    9   10   11   12
 ────┼─────────────────────────────────────────────────────────────
   A │ 10   10    9   10   10    9   10    9   10   10   10    9  = 116
   B │  9    9   10    9    9   10    9   10    9    9    9   10  = 112

Judge: Julie Lederman (Action)
  RD │  1    2    3    4    5    6    7    8    9   10   11   12
 ────┼─────────────────────────────────────────────────────────────
   A │ 10   10   10   10    9    9   10    9   10   10   10    9  = 116
   B │  9    9    9    9   10   10    9   10    9    9    9   10  = 112

Judge: Dave Moretti (Balanced)
  RD │  1    2    3    4    5    6    7    8    9   10   11   12
 ────┼─────────────────────────────────────────────────────────────
   A │ 10    9    9   10   10   10   10    9   10   10   10    9  = 116
   B │  9   10   10    9    9    9    9   10    9    9    9   10  = 112

═══════════════════════════════════════════════════════════════════
                    WINNER: FIGHTER A by UNANIMOUS DECISION
                           (116-112, 116-112, 116-112)
═══════════════════════════════════════════════════════════════════
```

---

## Implementation Notes

### Scorecard Object

```javascript
const scorecard = {
  judges: [
    {
      name: "Harold Lederman",
      type: "technical",
      rounds: [
        { fighterA: 10, fighterB: 9, notes: "A controlled with jab" },
        { fighterA: 10, fighterB: 9, notes: "A knockdown" },
        // ... more rounds
      ],
      totalA: 116,
      totalB: 112,
      winner: 'A'
    },
    // ... more judges
  ],

  official: {
    winner: 'A',
    method: 'unanimous_decision',
    scores: ['116-112', '116-112', '116-112']
  },

  controversy: {
    score: 15,
    isControversial: false,
    reasons: []
  }
};
```
