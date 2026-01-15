# Configuration Schema

This document defines the complete YAML/JSON schemas for all configuration files in the simulation, including fighters, judges, fight settings, and system configuration.

## Overview

### Configuration Files

```yaml
configuration_structure:
  fighters:
    format: yaml (primary), json (supported)
    location: fighters/custom/, fighters/templates/
    purpose: define individual fighter attributes

  judges:
    format: yaml/json
    location: config/judges/
    purpose: define judge personalities

  referees:
    format: yaml/json
    location: config/referees/
    purpose: define referee behavior

  fight_settings:
    format: yaml/json
    location: config/
    purpose: fight configuration and rules

  system_settings:
    format: yaml/json
    location: config/
    purpose: simulation parameters
```

---

## Fighter Schema

### Complete Fighter Configuration

```yaml
# Fighter configuration schema
# All attributes use 1-100 scale unless noted

fighter:
  # Identity
  identity:
    name: string (required)
    nickname: string (optional)
    nationality: string (optional)
    hometown: string (optional)

  # Physical attributes (fixed)
  physical:
    height: number (cm, 150-220)
    weight: number (kg, fight weight)
    reach: number (cm, typically height * 1.0-1.06)
    age: number (18-50)
    stance: enum [orthodox, southpaw, switch]
    bodyType: enum [lean, average, muscular, stocky, lanky]

  # Fighting style
  style:
    primary: enum [out-boxer, swarmer, slugger, boxer-puncher,
                   counter-puncher, inside-fighter, volume-puncher,
                   switch-hitter]
    defensive: enum [peek-a-boo, philly-shell, high-guard, slick, distance]
    offensive: enum [jab-and-move, combo-puncher, body-snatcher,
                     headhunter, hitman, mauler]

  # Power attributes
  power:
    powerLeft: number (1-100)
    powerRight: number (1-100)
    knockoutPower: number (1-100)
    bodyPunching: number (1-100)
    punchingStamina: number (1-100)

  # Speed attributes
  speed:
    handSpeed: number (1-100)
    footSpeed: number (1-100)
    reflexes: number (1-100)
    firstStep: number (1-100)
    combinationSpeed: number (1-100)

  # Stamina attributes
  stamina:
    cardio: number (1-100)
    recoveryRate: number (1-100)
    workRate: number (1-100)
    secondWind: number (1-100)
    paceControl: number (1-100)

  # Defense attributes
  defense:
    headMovement: number (1-100)
    blocking: number (1-100)
    parrying: number (1-100)
    shoulderRoll: number (1-100)
    clinchDefense: number (1-100)
    clinchOffense: number (1-100)
    ringAwareness: number (1-100)

  # Offense attributes
  offense:
    jabAccuracy: number (1-100)
    powerAccuracy: number (1-100)
    bodyAccuracy: number (1-100)
    punchSelection: number (1-100)
    feinting: number (1-100)
    counterPunching: number (1-100)
    combinationPunching: number (1-100)

  # Technical attributes
  technical:
    footwork: number (1-100)
    distanceManagement: number (1-100)
    insideFighting: number (1-100)
    outsideFighting: number (1-100)
    ringGeneralship: number (1-100)
    adaptability: number (1-100)
    fightIQ: number (1-100)

  # Mental attributes
  mental:
    chin: number (1-100)
    heart: number (1-100)
    killerInstinct: number (1-100)
    composure: number (1-100)
    intimidation: number (1-100)
    confidence: number (1-100)
    experience: number (1-100)
    clutchFactor: number (1-100)

  # Corner team (optional, can use defaults)
  corner:
    headTrainer:
      name: string
      strategySkill: number (1-100)
      communication: number (1-100)
      adaptability: number (1-100)
      specialty: string
    cutman:
      name: string
      cutTreatment: number (1-100)
      swellingTreatment: number (1-100)
      speed: number (1-100)

  # Record (optional, for display)
  record:
    wins: number
    losses: number
    draws: number
    kos: number
    koPercentage: number (calculated)

  # Metadata
  meta:
    version: string (schema version)
    created: datetime
    author: string
    notes: string
```

### Example Fighter YAML

```yaml
# fighters/custom/martinez-roberto.yaml
identity:
  name: "Roberto Martinez"
  nickname: "El Trueno"
  nationality: "Mexico"
  hometown: "Guadalajara"

physical:
  height: 178
  weight: 66.5
  reach: 183
  age: 28
  stance: orthodox
  bodyType: muscular

style:
  primary: boxer-puncher
  defensive: high-guard
  offensive: combo-puncher

power:
  powerLeft: 72
  powerRight: 88
  knockoutPower: 80
  bodyPunching: 75
  punchingStamina: 70

speed:
  handSpeed: 78
  footSpeed: 72
  reflexes: 75
  firstStep: 70
  combinationSpeed: 80

stamina:
  cardio: 82
  recoveryRate: 78
  workRate: 75
  secondWind: 65
  paceControl: 70

defense:
  headMovement: 68
  blocking: 80
  parrying: 62
  shoulderRoll: 45
  clinchDefense: 70
  clinchOffense: 72
  ringAwareness: 74

offense:
  jabAccuracy: 76
  powerAccuracy: 74
  bodyAccuracy: 72
  punchSelection: 78
  feinting: 65
  counterPunching: 70
  combinationPunching: 82

technical:
  footwork: 74
  distanceManagement: 72
  insideFighting: 78
  outsideFighting: 70
  ringGeneralship: 68
  adaptability: 72
  fightIQ: 76

mental:
  chin: 78
  heart: 85
  killerInstinct: 82
  composure: 74
  intimidation: 70
  confidence: 80
  experience: 72
  clutchFactor: 76

corner:
  headTrainer:
    name: "Nacho Beristain"
    strategySkill: 92
    communication: 85
    adaptability: 88
    specialty: "counter-punching"
  cutman:
    name: "Miguel Diaz"
    cutTreatment: 88
    swellingTreatment: 85
    speed: 82

record:
  wins: 32
  losses: 2
  draws: 0
  kos: 24

meta:
  version: "1.0"
  created: "2024-01-15"
  author: "user"
  notes: "Based on Mexican boxer-puncher archetype"
```

---

## Judge Schema

### Judge Configuration

```yaml
# Judge configuration schema
judge:
  identity:
    name: string (required)
    nationality: string
    organization: enum [WBA, WBC, IBF, WBO, independent]

  # Judge type determines base preferences
  type: enum [technical, action, punch_counter, power_based, balanced, home_biased]

  # Experience and consistency
  attributes:
    experience: number (1-100)
    consistency: number (1-100)
    compuboxReliance: number (0-1, how much raw numbers matter)

  # Scoring preferences (multipliers, 1.0 = neutral)
  preferences:
    cleanPunching: number (0.5-1.5)
    defense: number (0.5-1.5)
    effectiveAggression: number (0.5-1.5)
    ringGeneralship: number (0.5-1.5)
    powerShots: number (0.5-1.5)
    volume: number (0.5-1.5)

  # Knockdown scoring weight
  knockdownWeight: number (0.8-1.5, default 1.0)

  # Home bias (0 = none, 15 = strong)
  homeBias: number (0-15)

  # 10-10 round tendency (how often they score even)
  evenRoundTendency: number (0-0.1, default 0.02)
```

### Example Judge YAML

```yaml
# config/judges/lederman-harold.yaml
identity:
  name: "Harold Lederman"
  nationality: "USA"
  organization: independent

type: technical

attributes:
  experience: 98
  consistency: 92
  compuboxReliance: 0.3

preferences:
  cleanPunching: 1.3
  defense: 1.4
  effectiveAggression: 0.8
  ringGeneralship: 1.1
  powerShots: 1.0
  volume: 0.9

knockdownWeight: 1.0
homeBias: 0
evenRoundTendency: 0.01
```

### Judge Pool Configuration

```yaml
# config/judge-pools.yaml
judge_pools:
  WBA:
    preferred_types: [action, balanced]
    mandatory_count: 3
    local_judge_required: true
    international_required: 1

  WBC:
    preferred_types: [balanced, technical]
    mandatory_count: 3
    local_judge_required: false
    international_required: 2

  IBF:
    preferred_types: [technical, balanced]
    mandatory_count: 3
    local_judge_required: true
    international_required: 1

  WBO:
    preferred_types: [balanced]
    mandatory_count: 3
    local_judge_required: true
    international_required: 1
```

---

## Referee Schema

### Referee Configuration

```yaml
# Referee configuration schema
referee:
  identity:
    name: string (required)
    nationality: string

  # Behavioral tendencies
  tendencies:
    clinchTolerance: number (2-8, seconds before breaking)
    stoppageThreshold: number (0.3-0.9, higher = lets more go)
    warningFrequency: number (0.3-0.9, how often warns vs points)
    countSpeed: number (0.8-1.2, seconds per count)

  # Rule enforcement
  rules:
    standingEightCount: boolean
    mandatoryEightCount: boolean
    threeKnockdownRule: boolean

  # Protectiveness (affects TKO calls)
  protectiveness: number (0.3-0.9)

  # Foul tolerance
  foulTolerance:
    holding: number (1-5, warnings before point)
    lowBlows: number (1-3, warnings before point)
    headButts: number (1-3, warnings before point)
    rabbitPunches: number (1-2, warnings before point)
```

### Example Referee YAML

```yaml
# config/referees/bayless-kenny.yaml
identity:
  name: "Kenny Bayless"
  nationality: "USA"

tendencies:
  clinchTolerance: 4.5
  stoppageThreshold: 0.7
  warningFrequency: 0.6
  countSpeed: 1.0

rules:
  standingEightCount: false
  mandatoryEightCount: true
  threeKnockdownRule: false

protectiveness: 0.5

foulTolerance:
  holding: 3
  lowBlows: 2
  headButts: 2
  rabbitPunches: 1
```

---

## Fight Configuration Schema

### Fight Settings

```yaml
# Fight configuration schema
fight:
  # Fight type determines rounds and duration
  type: enum [championship, non_title, eight_rounder, six_rounder,
              four_rounder, women_championship]

  # Can override defaults
  rounds: number (4-12)
  roundDuration: number (120-180 seconds)
  restDuration: number (60 seconds)

  # Rules
  rules:
    knockdownRule: enum [three_knockdowns, none]
    standingEightCount: boolean
    mandatoryEightCount: boolean
    saveByTheBell:
      round1: boolean
      otherRounds: boolean

  # Sanctioning bodies (can be multiple)
  sanctioning: array [WBA, WBC, IBF, WBO]
  titleOnLine: boolean

  # Location (affects home bias)
  location:
    venue: string
    city: string
    country: string
    homeFighter: enum [A, B, none]

  # Simulation parameters
  simulation:
    tickRate: number (0.25-1.0 seconds per tick, default 0.5)
    speedMultiplier: number (0.5-4.0, playback speed)

  # Display options
  display:
    showRingVisualization: boolean
    showLiveStats: boolean
    showCommentary: boolean
    verbosity: enum [minimal, normal, verbose, full]

  # Fighters (reference or inline)
  fighterA: string (file path) | object (inline config)
  fighterB: string (file path) | object (inline config)

  # Officials (reference or auto-select)
  referee: string (file path) | auto
  judges: array [string] | auto  # 3 judges
```

### Example Fight Configuration

```yaml
# fights/main-event.yaml
type: championship
rounds: 12
roundDuration: 180
restDuration: 60

rules:
  knockdownRule: none  # Nevada rules
  standingEightCount: false
  mandatoryEightCount: true
  saveByTheBell:
    round1: false
    otherRounds: true

sanctioning: [WBA, WBC]
titleOnLine: true

location:
  venue: "T-Mobile Arena"
  city: "Las Vegas"
  country: "USA"
  homeFighter: none

simulation:
  tickRate: 0.5
  speedMultiplier: 1.0

display:
  showRingVisualization: true
  showLiveStats: true
  showCommentary: true
  verbosity: normal

fighterA: "fighters/custom/martinez-roberto.yaml"
fighterB: "fighters/custom/johnson-james.yaml"

referee: auto  # System selects appropriate referee
judges: auto   # System selects 3 judges based on sanctioning
```

---

## System Configuration Schema

### Global Settings

```yaml
# config/settings.yaml
system:
  # Random seed (for reproducible simulations)
  seed: number | null (null = random)

  # Performance
  performance:
    maxTicksPerSecond: number (default 60)
    statUpdateFrequency: number (ticks, default 10)

  # Display
  display:
    colorScheme: enum [default, colorblind, minimal]
    unicodeBoxDrawing: boolean (default true)
    animationEnabled: boolean (default true)

  # Logging
  logging:
    level: enum [error, warn, info, debug]
    logFile: string | null
    logEvents: boolean (default false)

  # Output
  output:
    saveReplay: boolean (default false)
    replayPath: string (default "replays/")
    saveStats: boolean (default true)
    statsPath: string (default "stats/")
    statsFormat: enum [yaml, json]

  # Commentary
  commentary:
    enabled: boolean (default true)
    personality: enum [technical, excited, analytical, old_school]
    verbosity: enum [minimal, normal, verbose]

  # Defaults for auto-selection
  defaults:
    referee: string (file path to default referee)
    judgePool: string (file path to judge pool)
```

### Example System Settings

```yaml
# config/settings.yaml
system:
  seed: null

  performance:
    maxTicksPerSecond: 60
    statUpdateFrequency: 10

  display:
    colorScheme: default
    unicodeBoxDrawing: true
    animationEnabled: true

  logging:
    level: info
    logFile: null
    logEvents: false

  output:
    saveReplay: false
    replayPath: "replays/"
    saveStats: true
    statsPath: "stats/"
    statsFormat: yaml

  commentary:
    enabled: true
    personality: technical
    verbosity: normal

  defaults:
    referee: "config/referees/bayless-kenny.yaml"
    judgePool: "config/judge-pools.yaml"
```

---

## Fighter Generator Configuration

### Generator Settings

```yaml
# config/generator.yaml
generator:
  # Name generation
  names:
    firstNames:
      usa: ["James", "Michael", "Robert", "John", ...]
      mexico: ["Roberto", "Carlos", "Miguel", "Jose", ...]
      uk: ["Anthony", "Tyson", "Billy", "Joe", ...]
      # ... more nationalities

    lastNames:
      usa: ["Johnson", "Williams", "Brown", "Jones", ...]
      mexico: ["Martinez", "Garcia", "Rodriguez", ...]
      uk: ["Joshua", "Fury", "Saunders", "Smith", ...]

    nicknameStyles:
      power: ["The Hammer", "Dynamite", "TNT", ...]
      speed: ["Lightning", "Flash", "Quicksilver", ...]
      style: ["The Technician", "The Professor", ...]
      animal: ["The Cobra", "The Lion", "The Spider", ...]
      intimidation: ["The Executioner", "Nightmare", ...]

  # Weight class definitions
  weightClasses:
    flyweight:
      maxWeight: 50.8
      heightRange: [157, 165]
      reachRange: [160, 170]
    bantamweight:
      maxWeight: 53.5
      heightRange: [160, 170]
      reachRange: [165, 175]
    # ... all weight classes

  # Style attribute tendencies
  styleTendencies:
    out-boxer:
      high: [footSpeed, footwork, jabAccuracy, distanceManagement]
      medium: [handSpeed, cardio, ringGeneralship]
      low: [insideFighting, clinchOffense, powerRight]
    swarmer:
      high: [cardio, workRate, heart, insideFighting]
      medium: [chin, combinationPunching, clinchOffense]
      low: [outsideFighting, distanceManagement, footSpeed]
    # ... all styles

  # Tier presets
  tiers:
    prospect:
      overallRange: [55, 68]
      description: "Raw talent, inconsistent"
    journeyman:
      overallRange: [60, 72]
      description: "Solid but limited"
    contender:
      overallRange: [70, 82]
      description: "Top 10-15 caliber"
    champion:
      overallRange: [78, 90]
      description: "Elite, world class"
    all-time:
      overallRange: [85, 98]
      description: "Legendary"

  # Realistic talent distribution
  distribution:
    realistic:
      club: 0.40
      journeyman: 0.30
      gatekeeper: 0.15
      contender: 0.10
      worldClass: 0.04
      elite: 0.009
      allTime: 0.001
```

---

## Fighter Progression Configuration

### Progression Settings

```yaml
# config/progression.yaml
progression:
  # Age modifiers
  ageModifiers:
    growth:
      18-21: 1.3
      22-25: 1.1
      26-28: 0.8
      29-32: 0.4
      33-35: 0.1
      36+: 0.0
    decline:
      18-28: 0.0
      29-32: 0.2
      33-35: 0.5
      36-38: 0.8
      39+: 1.2

  # Training camp definitions
  camps:
    strength-power:
      primaryFocus: [powerLeft, powerRight, knockoutPower]
      secondaryFocus: [punchingStamina, bodyPunching]
      attributeGains: [3, 6]
    speed-agility:
      primaryFocus: [handSpeed, footSpeed]
      secondaryFocus: [reflexes, firstStep]
      attributeGains: [3, 6]
    cardio-endurance:
      primaryFocus: [cardio, workRate]
      secondaryFocus: [recoveryRate, paceControl]
      attributeGains: [3, 6]
    # ... all camp types

  # Training intensity
  intensity:
    light:
      gainMultiplier: 0.5
      injuryRisk: 0.02
      burnoutRisk: 0.0
    moderate:
      gainMultiplier: 1.0
      injuryRisk: 0.08
      burnoutRisk: 0.05
    intense:
      gainMultiplier: 1.5
      injuryRisk: 0.18
      burnoutRisk: 0.15
    grueling:
      gainMultiplier: 2.0
      injuryRisk: 0.35
      burnoutRisk: 0.30

  # Event probabilities per training cycle
  eventProbabilities:
    minorSetback: 0.15
    majorSetback: 0.05
    minorBreakthrough: 0.10
    majorBreakthrough: 0.02
    uneventful: 0.68

  # Hidden flaw distribution
  hiddenFlaws:
    glassChin: 0.15
    fragileHands: 0.12
    cardioCeiling: 0.20
    weightBully: 0.10
    frontRunner: 0.25
    slowLearner: 0.18
    injuryProne: 0.10
    poorRecovery: 0.08
    weightIssues: 0.15
```

---

## Validation Rules

### Schema Validation

```javascript
const validationRules = {
  fighter: {
    required: ['identity.name', 'physical', 'style.primary'],
    ranges: {
      'physical.height': [150, 220],
      'physical.weight': [45, 150],
      'physical.reach': [140, 230],
      'physical.age': [18, 50],
      // All 1-100 attributes
      'power.*': [1, 100],
      'speed.*': [1, 100],
      'stamina.*': [1, 100],
      'defense.*': [1, 100],
      'offense.*': [1, 100],
      'technical.*': [1, 100],
      'mental.*': [1, 100]
    },
    enums: {
      'physical.stance': ['orthodox', 'southpaw', 'switch'],
      'physical.bodyType': ['lean', 'average', 'muscular', 'stocky', 'lanky'],
      'style.primary': ['out-boxer', 'swarmer', 'slugger', 'boxer-puncher',
                        'counter-puncher', 'inside-fighter', 'volume-puncher',
                        'switch-hitter'],
      'style.defensive': ['peek-a-boo', 'philly-shell', 'high-guard', 'slick', 'distance'],
      'style.offensive': ['jab-and-move', 'combo-puncher', 'body-snatcher',
                          'headhunter', 'hitman', 'mauler']
    }
  },

  judge: {
    required: ['identity.name', 'type'],
    ranges: {
      'attributes.experience': [1, 100],
      'attributes.consistency': [1, 100],
      'attributes.compuboxReliance': [0, 1],
      'preferences.*': [0.5, 1.5],
      'knockdownWeight': [0.8, 1.5],
      'homeBias': [0, 15],
      'evenRoundTendency': [0, 0.1]
    }
  },

  fight: {
    required: ['type', 'fighterA', 'fighterB'],
    ranges: {
      'rounds': [4, 12],
      'roundDuration': [120, 180],
      'restDuration': [30, 90],
      'simulation.tickRate': [0.25, 1.0],
      'simulation.speedMultiplier': [0.5, 4.0]
    }
  }
};
```

### Validation Function

```javascript
function validateConfig(config, schema) {
  const errors = [];

  // Check required fields
  for (const field of schema.required) {
    if (!getNestedValue(config, field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check ranges
  for (const [path, [min, max]] of Object.entries(schema.ranges)) {
    const values = getMatchingValues(config, path);
    for (const { key, value } of values) {
      if (value < min || value > max) {
        errors.push(`${key} must be between ${min} and ${max}, got ${value}`);
      }
    }
  }

  // Check enums
  for (const [path, allowed] of Object.entries(schema.enums)) {
    const value = getNestedValue(config, path);
    if (value && !allowed.includes(value)) {
      errors.push(`${path} must be one of: ${allowed.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## File Structure Summary

```
fight/
├── config/
│   ├── settings.yaml           # Global system settings
│   ├── generator.yaml          # Fighter generator config
│   ├── progression.yaml        # Training progression config
│   ├── judge-pools.yaml        # Organization judge pools
│   ├── judges/
│   │   ├── lederman-harold.yaml
│   │   ├── moretti-dave.yaml
│   │   └── ...
│   └── referees/
│       ├── bayless-kenny.yaml
│       ├── weeks-tony.yaml
│       └── ...
├── fighters/
│   ├── templates/
│   │   ├── styles/
│   │   │   ├── out-boxer.yaml
│   │   │   ├── swarmer.yaml
│   │   │   └── ...
│   │   └── historical/
│   │       ├── ali-prime.yaml
│   │       ├── tyson-peek-a-boo.yaml
│   │       └── ...
│   └── custom/
│       ├── martinez-roberto.yaml
│       └── ...
└── fights/
    └── main-event.yaml
```
