# Commentary System

This document defines the dynamic color commentary generation system, including commentary types, triggers, contextual awareness, and narrative building.

## Commentary Overview

### Core Concept

```yaml
commentary:
  description: |
    Dynamic text generation that provides fight narrative, mimicking
    real boxing commentary with play-by-play and color analysis.

  modes:
    play_by_play: immediate_action_description
    color_commentary: analysis_and_context
    statistical: numbers_and_comparisons
    emotional: atmosphere_and_drama

  timing:
    immediate: during_action
    delayed: after_exchange_ends
    between_rounds: rest_period_analysis
    summary: round_end_and_fight_end
```

### Commentary Configuration

```javascript
const commentaryConfig = {
  enabled: true,
  verbosity: 'normal', // 'minimal', 'normal', 'verbose', 'full'

  style: {
    playByPlay: true,
    colorCommentary: true,
    statistics: true,
    emotional: true
  },

  frequency: {
    minTimeBetween: 2.0,      // seconds minimum between comments
    maxTimeBetween: 10.0,     // seconds maximum silence
    significantEventOverride: true // always comment on big moments
  },

  personalities: {
    primary: 'technical',     // 'technical', 'excited', 'analytical', 'old_school'
    secondary: 'color'        // 'color', 'statistical', 'historical'
  }
};
```

---

## Commentary Types

### Play-by-Play

```yaml
play_by_play:
  description: immediate_action_narration

  triggers:
    punch_landed:
      - "{fighter} lands a {punch_type}!"
      - "That's a clean {punch_type} from {fighter}"
      - "{punch_type} finds the mark for {fighter}"

    combination:
      - "{fighter} lets the hands go with a {count}-punch combination!"
      - "Beautiful combination from {fighter}!"
      - "{fighter} unloads a flurry of punches"

    knockdown:
      - "{fighter} IS DOWN! {opponent} catches him with the {punch_type}!"
      - "DOWN GOES {fighter}! DOWN GOES {fighter}!"
      - "{fighter} is on the canvas! What a {punch_type}!"

    clinch:
      - "They tie up in the clinch"
      - "{fighter} grabs hold, looking to smother"
      - "Referee breaks them apart"

    movement:
      - "{fighter} using the ring beautifully"
      - "{fighter} cuts off the ring"
      - "{fighter} has his back against the ropes"
```

### Color Commentary

```yaml
color_commentary:
  description: analysis_and_insight

  categories:
    strategy_observation:
      - "{fighter} seems to be targeting the body more this round"
      - "Look at {fighter} changing levels on every attack"
      - "{fighter} has figured out the timing on that jab"

    damage_assessment:
      - "You can see {fighter} is feeling those body shots now"
      - "That cut is starting to bother {fighter}"
      - "{fighter} looks hurt, his legs are gone"

    tactical_analysis:
      - "{fighter} needs to establish the jab if he wants to win"
      - "The inside game is where this fight will be decided"
      - "{fighter} can't let him fight at this pace"

    historical_comparison:
      - "This reminds me of {historical_fight}"
      - "He's showing that {style} style we saw in the old days"
      - "You don't see footwork like this very often anymore"
```

### Statistical Commentary

```yaml
statistical_commentary:
  description: numbers_and_data

  types:
    punch_stats:
      - "{fighter} is {connect_pct}% accurate with the jab so far"
      - "{fighter} has landed {count} of {thrown} power punches"
      - "The connect rate for {fighter}: {pct}%"

    round_comparison:
      - "{fighter} out-landed {opponent} {a_count} to {b_count} last round"
      - "That's the third round in a row {fighter} has won"
      - "{fighter} is building up a lead on the scorecards"

    damage_stats:
      - "{fighter} has taken {count} clean power shots"
      - "{knockdowns} knockdown(s) for {fighter} in this fight"
      - "The body work is adding up - {count} significant body shots"
```

### Emotional/Dramatic

```yaml
emotional_commentary:
  description: atmosphere_and_drama

  situations:
    close_fight:
      - "This one is razor close, folks"
      - "We could be looking at a split decision here"
      - "Every round is crucial now"

    momentum_shift:
      - "The tide is turning! {fighter} is taking over!"
      - "{fighter} has found his second wind!"
      - "The momentum has completely shifted"

    finishing_sequence:
      - "{fighter} smells blood! He's going for the finish!"
      - "The referee is watching closely..."
      - "Can {fighter} survive?!"

    championship_rounds:
      - "We're in the championship rounds now"
      - "This is where legends are made"
      - "These final rounds will decide everything"
```

---

## Commentary Generation

### Event-Based Generation

```javascript
function generateCommentary(event, fightState) {
  const templates = getTemplatesForEvent(event.type);
  const context = buildCommentaryContext(fightState);

  // Select appropriate template
  const template = selectTemplate(templates, context, event);

  // Fill in template variables
  const commentary = fillTemplate(template, {
    fighter: event.fighter?.name || getFighterName(event.fighterId),
    opponent: getOpponentName(event.fighterId, fightState),
    punch_type: event.punchType ? formatPunchType(event.punchType) : null,
    count: event.count,
    round: fightState.currentRound,
    ...context.stats
  });

  // Add personality flavor
  const flavored = applyPersonality(commentary, context.personality);

  return {
    text: flavored,
    priority: event.priority || calculatePriority(event),
    type: event.commentaryType || 'play_by_play',
    timestamp: fightState.currentTime
  };
}
```

### Context Building

```javascript
function buildCommentaryContext(fightState) {
  return {
    round: fightState.currentRound,
    roundTime: fightState.roundTime,

    // Fight situation
    scoreDiff: calculateScoreDifference(fightState),
    momentum: assessMomentum(fightState),
    fightPhase: determineFightPhase(fightState),

    // Fighter states
    fighterA: {
      state: fightState.fighterA.state,
      staminaPercent: fightState.fighterA.currentStamina / fightState.fighterA.maxStamina,
      isHurt: fightState.fighterA.state === 'HURT',
      damage: assessDamageLevel(fightState.fighterA)
    },
    fighterB: {
      state: fightState.fighterB.state,
      staminaPercent: fightState.fighterB.currentStamina / fightState.fighterB.maxStamina,
      isHurt: fightState.fighterB.state === 'HURT',
      damage: assessDamageLevel(fightState.fighterB)
    },

    // Recent events
    recentEvents: fightState.events.slice(-10),
    lastCommentaryTime: fightState.lastCommentaryTime,

    // Statistics
    stats: calculateRunningStats(fightState)
  };
}
```

### Priority System

```yaml
commentary_priority:
  critical: # Always show immediately
    - knockdown
    - knockout
    - tko_stoppage
    - corner_stoppage
    - fight_end

  high: # Show as soon as possible
    - significant_punch
    - hurt_badly
    - cut_opened
    - round_end
    - comeback_moment

  medium: # Show when appropriate
    - clean_combination
    - defensive_highlight
    - momentum_shift
    - statistical_milestone

  low: # Show during quiet moments
    - general_observation
    - color_commentary
    - filler_commentary
```

---

## Commentary Templates

### Punch Templates

```javascript
const punchTemplates = {
  jab: {
    landed: [
      "{fighter} touches him with the jab",
      "Good jab from {fighter}",
      "The jab finds a home",
      "{fighter}'s jab is working"
    ],
    clean: [
      "Stiff jab from {fighter}!",
      "That jab snapped {opponent}'s head back",
      "Beautiful jab, right on the button"
    ],
    counter: [
      "{fighter} times him with the jab counter",
      "Counter jab right down the pipe"
    ]
  },

  cross: {
    landed: [
      "Right hand from {fighter}",
      "{fighter} connects with the right",
      "That's the cross landing for {fighter}"
    ],
    clean: [
      "HUGE right hand from {fighter}!",
      "That right hand was on the money!",
      "{fighter} unloads the right!"
    ],
    power: [
      "Thunderous right hand!",
      "What a shot! The cross lands flush!"
    ]
  },

  hook: {
    head: [
      "Left hook from {fighter}",
      "Hook to the head connects",
      "{fighter} swings the hook around the guard"
    ],
    body: [
      "Hook to the body!",
      "{fighter} digs to the body",
      "That's a nasty body shot"
    ],
    liver: [
      "Liver shot! That one hurt!",
      "Right on the liver! {opponent} felt that!",
      "The body work is paying off - another liver shot!"
    ]
  },

  uppercut: {
    landed: [
      "Uppercut from {fighter}",
      "Sneaky uppercut inside",
      "{fighter} threads the uppercut through"
    ],
    clean: [
      "UPPERCUT! Right on the chin!",
      "Devastating uppercut from {fighter}!",
      "That uppercut was picture perfect!"
    ]
  }
};
```

### Situation Templates

```javascript
const situationTemplates = {
  round_start: [
    "Round {round} begins",
    "Here we go, round {round}",
    "The bell sounds for round {round}"
  ],

  round_end: [
    "And that's the bell for round {round}",
    "Round {round} in the books",
    "The round comes to an end"
  ],

  knockdown: [
    "{fighter} IS DOWN!",
    "HE'S DOWN! {fighter} is on the canvas!",
    "KNOCKDOWN! {opponent} drops {fighter}!",
    "DOWN GOES {fighter}! DOWN GOES {fighter}!"
  ],

  recovery: [
    "{fighter} beats the count at {count}",
    "He's up at {count}, but is he okay?",
    "{fighter} rises at {count}, showing heart"
  ],

  knockout: [
    "IT'S OVER! KNOCKOUT!",
    "{fighter} WINS BY KNOCKOUT!",
    "THAT'S IT! {fighter} scores the KO!"
  ],

  tko: [
    "The referee waves it off! TKO!",
    "Referee stoppage! It's over!",
    "The corner has seen enough - TKO!"
  ],

  hurt_badly: [
    "{fighter} is in serious trouble!",
    "{fighter} is hurt! His legs are gone!",
    "HE'S HURT! {opponent} needs to pounce!",
    "{fighter} is on shaky legs!"
  ],

  cut_opened: [
    "{fighter} has been cut above the {location}",
    "Blood! {fighter} is cut now",
    "There's a nasty cut opening up on {fighter}"
  ],

  clinch: [
    "{fighter} ties up",
    "They clinch in the center",
    "{fighter} holds on, trying to recover"
  ],

  break_clinch: [
    "Referee breaks them",
    "They're separated",
    "Back to boxing"
  ]
};
```

### Round Analysis Templates

```javascript
const roundAnalysisTemplates = {
  clear_winner: [
    "{winner} takes that round clearly. {stats}",
    "No doubt about that one - {winner}'s round. {stats}",
    "{winner} dominates round {round}. {stats}"
  ],

  close_round: [
    "That's a close one. Could go either way.",
    "Tough round to score. {fighter_a} with volume, {fighter_b} with power.",
    "The judges will have a hard time with that one."
  ],

  momentum_round: [
    "{fighter} is building momentum now",
    "The fight is swinging in {fighter}'s direction",
    "{fighter} has found a rhythm"
  ],

  stat_summary: [
    "{winner} out-landed {loser} {w_count} to {l_count}",
    "{fighter} connected on {pct}% of power punches that round",
    "{fighter} landed {body_shots} body shots in round {round}"
  ],

  scorecard_projection: [
    "I have it {a_score} to {b_score} for {leader}",
    "On my card, {fighter} is up {margin} points",
    "This fight is dead even on my scorecard"
  ]
};
```

---

## Commentary Personalities

### Personality Types

```yaml
personalities:
  technical:
    description: focuses_on_technique_and_skill
    vocabulary:
      - "textbook"
      - "technically sound"
      - "fundamental"
      - "proper mechanics"
    favored_topics:
      - punch_technique
      - footwork
      - defensive_skill
      - ring_generalship

  excited:
    description: high_energy_dramatic
    vocabulary:
      - "INCREDIBLE!"
      - "UNBELIEVABLE!"
      - "OH MY!"
      - "WHAT A FIGHT!"
    favored_topics:
      - knockdowns
      - exchanges
      - finishes
      - dramatic_moments

  analytical:
    description: numbers_and_statistics
    vocabulary:
      - "statistically"
      - "the numbers show"
      - "percentage-wise"
      - "looking at the data"
    favored_topics:
      - punch_stats
      - connect_rates
      - scorecard_analysis
      - historical_comparisons

  old_school:
    description: traditional_boxing_perspective
    vocabulary:
      - "in my day"
      - "old school"
      - "the sweet science"
      - "real fighters"
    favored_topics:
      - heart_and_grit
      - body_punching
      - warrior_spirit
      - classic_matchups
```

### Personality Application

```javascript
function applyPersonality(baseCommentary, personality) {
  const mods = PERSONALITY_MODIFIERS[personality];

  let modified = baseCommentary;

  // Add personality-specific interjections
  if (Math.random() < mods.interjectionChance) {
    const interjection = selectRandom(mods.interjections);
    modified = `${interjection} ${modified}`;
  }

  // Apply vocabulary substitutions
  for (const [generic, specific] of Object.entries(mods.vocabulary)) {
    modified = modified.replace(generic, specific);
  }

  // Adjust punctuation/emphasis
  if (personality === 'excited' && modified.includes('!')) {
    modified = modified.toUpperCase();
  }

  return modified;
}
```

---

## Between-Round Commentary

### Rest Period Analysis

```javascript
function generateBetweenRoundCommentary(fight, completedRound) {
  const commentary = [];

  // Round summary
  commentary.push(generateRoundSummary(fight, completedRound));

  // Scorecard projection
  commentary.push(generateScorecardProjection(fight));

  // Fighter assessment
  commentary.push(assessFighterCondition(fight.fighterA, 'A'));
  commentary.push(assessFighterCondition(fight.fighterB, 'B'));

  // Corner work observation
  if (hasCutWork(fight)) {
    commentary.push(generateCutworkComment(fight));
  }

  // Strategic observation
  commentary.push(generateStrategicObservation(fight));

  // Preview next round
  if (completedRound < fight.config.rounds) {
    commentary.push(generateNextRoundPreview(fight, completedRound + 1));
  }

  return commentary.filter(c => c !== null);
}
```

### Round Summary

```javascript
function generateRoundSummary(fight, round) {
  const roundStats = fight.roundHistory[round - 1].stats;
  const winner = determineRoundWinner(roundStats);

  const templates = winner.margin > 20
    ? roundAnalysisTemplates.clear_winner
    : roundAnalysisTemplates.close_round;

  const template = selectRandom(templates);

  return fillTemplate(template, {
    round,
    winner: winner.name,
    loser: winner.opponent,
    stats: formatRoundStats(roundStats),
    margin: winner.margin,
    w_count: roundStats.punchesLanded[winner.id],
    l_count: roundStats.punchesLanded[winner.opponentId]
  });
}
```

---

## Fight Summary Commentary

### Post-Fight Analysis

```javascript
function generateFightSummary(fight, result) {
  const summary = [];

  // Announce result
  summary.push(generateResultAnnouncement(result));

  // Key moment
  summary.push(identifyKeyMoment(fight));

  // Statistical summary
  summary.push(generateStatisticalSummary(fight));

  // Fighter performance grades
  summary.push(gradeFighterPerformance(fight.fighterA, 'A'));
  summary.push(gradeFighterPerformance(fight.fighterB, 'B'));

  // Decision analysis (if applicable)
  if (result.method.includes('decision')) {
    summary.push(analyzeDecision(fight, result));
  }

  return summary;
}
```

### Result Announcement Templates

```javascript
const resultTemplates = {
  ko: [
    "KNOCKOUT! {winner} wins by knockout in round {round}!",
    "What a finish! {winner} scores the KO at {time} of round {round}!",
    "{winner} stops {loser} with a devastating knockout!"
  ],

  tko: [
    "{winner} wins by TKO! The referee stops it in round {round}!",
    "Technical knockout! {winner} defeats {loser}!",
    "The corner throws in the towel! {winner} wins by TKO!"
  ],

  unanimous_decision: [
    "{winner} wins by unanimous decision! Scores: {scores}",
    "All three judges have it for {winner}. Unanimous decision!",
    "No controversy here - {winner} takes the unanimous decision!"
  ],

  split_decision: [
    "{winner} wins by split decision! Scores: {scores}",
    "It's a split! Two judges for {winner}, one for {loser}!",
    "Close fight! {winner} gets the split decision!"
  ],

  majority_decision: [
    "{winner} wins by majority decision! Scores: {scores}",
    "Two judges for {winner}, one has it a draw. Majority decision!"
  ],

  draw: [
    "IT'S A DRAW! The judges couldn't separate them!",
    "We have a split draw! No winner tonight!",
    "This one ends in a draw. Rematch?"
  ]
};
```

---

## Commentary Queue Management

### Queue System

```javascript
class CommentaryQueue {
  constructor(config) {
    this.queue = [];
    this.lastOutputTime = 0;
    this.config = config;
  }

  add(commentary) {
    // Insert by priority
    const insertIndex = this.queue.findIndex(
      c => c.priority < commentary.priority
    );

    if (insertIndex === -1) {
      this.queue.push(commentary);
    } else {
      this.queue.splice(insertIndex, 0, commentary);
    }

    // Limit queue size
    if (this.queue.length > 10) {
      this.queue = this.queue.slice(0, 10);
    }
  }

  getNext(currentTime) {
    if (this.queue.length === 0) return null;

    const timeSinceLast = currentTime - this.lastOutputTime;

    // Critical events bypass timing
    if (this.queue[0].priority === 'critical') {
      return this.dequeue(currentTime);
    }

    // Respect minimum time between commentary
    if (timeSinceLast < this.config.minTimeBetween) {
      return null;
    }

    // High priority or enough time passed
    if (this.queue[0].priority === 'high' ||
        timeSinceLast >= this.config.maxTimeBetween) {
      return this.dequeue(currentTime);
    }

    return null;
  }

  dequeue(currentTime) {
    this.lastOutputTime = currentTime;
    return this.queue.shift();
  }
}
```

---

## Implementation Notes

### Commentary State Object

```javascript
const commentaryState = {
  queue: [],
  lastCommentaryTime: 0,
  recentTopics: [],        // Avoid repetition
  personalityMode: 'technical',

  roundCommentary: {
    round: 5,
    observations: [],
    keyMoments: [],
    statsMentioned: []
  },

  fightNarrative: {
    momentum: 'fighter_a',
    theme: 'body_work',     // Current story thread
    pivotMoments: []        // Turning points mentioned
  },

  config: {
    verbosity: 'normal',
    minTimeBetween: 2.0,
    maxTimeBetween: 10.0
  }
};
```

### Commentary Event

```javascript
const commentaryEvent = {
  type: 'play_by_play',
  text: "Thunderous right hand from Martinez!",
  priority: 'high',
  timestamp: 156.5,
  round: 6,
  fighter: 'A',
  triggerEvent: 'clean_power_punch'
};
```
