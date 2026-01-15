# Ring Geometry

This document defines the ring dimensions, coordinate system, positioning mechanics, distance calculations, and spatial aspects of the boxing simulation.

## Ring Specifications

### Standard Ring Dimensions

```yaml
ring_sizes:
  small:
    inside_rope: 16ft (4.88m)
    actual_canvas: 18ft (5.49m)
    use_case: small_venues, club_fights

  standard:
    inside_rope: 18ft (5.49m)
    actual_canvas: 20ft (6.1m)
    use_case: most_professional_fights

  large:
    inside_rope: 20ft (6.1m)
    actual_canvas: 22ft (6.71m)
    use_case: championship_fights, large_venues

  championship:
    inside_rope: 22ft (6.71m)
    actual_canvas: 24ft (7.32m)
    use_case: major_championship_events

default: standard (20ft / 6.1m canvas)
```

### Ring Features

```yaml
ring_components:
  canvas:
    material: padded
    bounce: minimal
    slip_factor: 0.1

  ropes:
    count: 4
    height: [18in, 30in, 42in, 54in]
    tension: firm
    give: 6-12 inches when leaned on

  corners:
    neutral: [top_left, top_right]
    red: bottom_left
    blue: bottom_right
    padding: 2_inches_foam

  turnbuckles:
    padding: required
    location: corners
    danger_zone: true

  apron:
    width: 2ft outside ropes
    not_fighting_area: true
```

---

## Coordinate System

### Ring Grid

```
        Y (North)
        ↑
        │
   ─────┼─────→ X (East)
        │
        │

Ring Center = (0, 0)
Units: Feet (can be configured to meters)
Range: -10 to +10 (for 20ft ring)
```

### Coordinate Representation

```javascript
const position = {
  x: 3.5,      // feet from center (-10 to 10)
  y: -2.0,     // feet from center (-10 to 10)
  facing: 45,  // degrees (0 = North, 90 = East)
};

// Helper functions
function getDistanceFromCenter(pos) {
  return Math.sqrt(pos.x ** 2 + pos.y ** 2);
}

function getDistanceFromRopes(pos, ringSize = 10) {
  const distFromCenter = getDistanceFromCenter(pos);
  return ringSize - distFromCenter;
}

function isNearRopes(pos, threshold = 2) {
  return getDistanceFromRopes(pos) < threshold;
}

function isInCorner(pos, threshold = 3) {
  const absX = Math.abs(pos.x);
  const absY = Math.abs(pos.y);
  return absX > 7 && absY > 7; // Near corner
}
```

---

## Distance System

### Fighter Distance

```yaml
distance_calculation:
  formula: |
    distance = sqrt((fighterA.x - fighterB.x)^2 + (fighterA.y - fighterB.y)^2)

  units: feet

  interpretation:
    0-2ft: clinch_range
    2-3ft: inside_fighting
    3-4ft: close_range
    4-5ft: medium_range
    5-7ft: long_range
    7+ft: out_of_range
```

### Range Zones

```
┌────────────────────────────────────────┐
│                                        │
│    OUT OF RANGE (>7ft)                 │
│    ┌────────────────────────────────┐  │
│    │    LONG RANGE (5-7ft)          │  │
│    │    ┌────────────────────────┐  │  │
│    │    │  MEDIUM RANGE (4-5ft)  │  │  │
│    │    │  ┌──────────────────┐  │  │  │
│    │    │  │ CLOSE (3-4ft)    │  │  │  │
│    │    │  │  ┌────────────┐  │  │  │  │
│    │    │  │  │INSIDE(2-3) │  │  │  │  │
│    │    │  │  │ ┌────────┐ │  │  │  │  │
│    │    │  │  │ │CLINCH  │ │  │  │  │  │
│    │    │  │  │ │(<2ft)  │ │  │  │  │  │
│    │    │  │  │ └────────┘ │  │  │  │  │
│    │    │  │  └────────────┘  │  │  │  │
│    │    │  └──────────────────┘  │  │  │
│    │    └────────────────────────┘  │  │
│    └────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Optimal Range

```javascript
function calculateOptimalRange(fighter) {
  // Base on reach
  const reachFactor = fighter.reach * 0.02; // ~3.6-4.4ft for avg reach

  // Style modifier
  const styleMod = {
    'out-boxer': 1.15,
    'swarmer': 0.75,
    'slugger': 0.9,
    'boxer-puncher': 1.0,
    'counter-puncher': 1.1,
    'inside-fighter': 0.7,
    'volume-puncher': 0.85
  }[fighter.style.primary] || 1.0;

  // Height factor
  const heightMod = 1 + (fighter.height - 175) * 0.003;

  return reachFactor * styleMod * heightMod;
}
```

---

## Movement System

### Movement Types

```yaml
movement_types:
  step_forward:
    distance: 0.5-1.0ft per tick
    stamina_cost: 0.5
    speed_factor: footSpeed

  step_backward:
    distance: 0.4-0.8ft per tick
    stamina_cost: 0.4
    speed_factor: footSpeed * 0.9

  lateral_step:
    distance: 0.4-0.7ft per tick
    stamina_cost: 0.6
    speed_factor: footwork

  pivot:
    rotation: 15-45 degrees per tick
    stamina_cost: 0.3
    speed_factor: footwork

  shuffle:
    distance: 0.3-0.5ft per tick
    stamina_cost: 0.3
    maintains: defensive_ready

  burst:
    distance: 1.5-2.5ft
    stamina_cost: 2.0
    requires: firstStep
    cooldown: 1.5s
```

### Movement Calculation

```javascript
function calculateMovement(fighter, direction, intensity = 1.0) {
  // Base movement speed
  const baseSpeed = fighter.footSpeed / 100;

  // Direction modifier
  const dirMod = {
    'forward': 1.0,
    'backward': 0.85,
    'left': 0.9,
    'right': 0.9
  }[direction];

  // Stamina penalty
  const staminaMod = 0.7 + (fighter.currentStamina / fighter.maxStamina) * 0.3;

  // Weight factor (heavier = slower)
  const weightMod = 1 - (fighter.weight - 70) * 0.003;

  // Ring position factor (harder to move when cornered)
  const positionMod = fighter.isNearRopes ? 0.8 : 1.0;

  // Calculate final distance
  const distance = baseSpeed * dirMod * staminaMod * weightMod * positionMod * intensity;

  return {
    distance: distance,
    staminaCost: 0.5 * intensity,
    newPosition: calculateNewPosition(fighter.position, direction, distance)
  };
}
```

---

## Ring Position

### Position States

```yaml
position_states:
  center:
    definition: within 3ft of ring center
    advantage: maximum_mobility
    disadvantage: none

  neutral:
    definition: 3-6ft from center
    advantage: normal
    disadvantage: none

  near_ropes:
    definition: within 2ft of ropes
    advantage: some_escape_routes
    disadvantage: limited_movement_options

  on_ropes:
    definition: within 1ft of ropes
    advantage: can_lean_for_rest
    disadvantage: |
      limited_movement
      defensive_penalties
      judges_may_score_against

  corner:
    definition: within 3ft of corner
    advantage: none
    disadvantage: |
      severely_limited_movement
      trapped
      easy_target
      -15% defensive_effectiveness

  cornered:
    definition: in corner with opponent blocking exit
    advantage: none
    disadvantage: |
      -20% defensive
      no_retreat
      referee_may_intervene
```

### Position Penalties

```javascript
function getPositionPenalties(fighter) {
  const penalties = {
    defensive: 0,
    offensive: 0,
    movement: 0,
    stamina_drain: 0
  };

  const distFromRopes = getDistanceFromRopes(fighter.position);
  const inCorner = isInCorner(fighter.position);

  if (distFromRopes < 1) {
    // On ropes
    penalties.defensive = -0.1;
    penalties.movement = -0.3;
    penalties.stamina_drain = 0.5;
  } else if (distFromRopes < 2) {
    // Near ropes
    penalties.defensive = -0.05;
    penalties.movement = -0.15;
  }

  if (inCorner) {
    penalties.defensive = -0.15;
    penalties.movement = -0.5;
    penalties.stamina_drain = 1.0;
  }

  return penalties;
}
```

---

## Ring Control

### Cutting Off the Ring

```yaml
ring_cutting:
  description: |
    Reducing opponent's available space by anticipating
    their movement and positioning to cut off escape routes.

  mechanics:
    lateral_positioning: move_to_cut_angle
    anticipation: predict_escape_direction
    pressure: maintain_threatening_distance

  attributes_used:
    primary: ringGeneralship
    secondary: [footSpeed, footwork, fightIQ]

  effectiveness:
    vs_stationary: 100%
    vs_lateral_movement: ringGeneralship vs opponent_footwork
    vs_retreat: ringGeneralship vs opponent_footSpeed

  success_result:
    reduces_opponent_space: true
    forces_ropes_or_corner: goal
    scoring_benefit: ring_generalship_points
```

### Ring Control Calculation

```javascript
function calculateRingControl(fighterA, fighterB) {
  // Who controls the center?
  const distA = getDistanceFromCenter(fighterA.position);
  const distB = getDistanceFromCenter(fighterB.position);

  let controlScore = 0;

  // Closer to center = more control
  controlScore += (distB - distA) * 5;

  // Ring generalship attribute
  controlScore += (fighterA.ringGeneralship - fighterB.ringGeneralship) * 0.3;

  // Aggression/pressure bonus
  if (fighterA.state.includes('OFFENSIVE') || fighterA.state.includes('CUTTING_OFF')) {
    controlScore += 10;
  }

  // Position quality
  if (fighterB.isNearRopes) controlScore += 15;
  if (fighterB.isInCorner) controlScore += 30;

  return {
    controller: controlScore > 0 ? 'A' : 'B',
    magnitude: Math.abs(controlScore),
    ringPosition: {
      fighterA: distA,
      fighterB: distB
    }
  };
}
```

---

## Angles

### Angle Creation

```yaml
angles:
  description: |
    Creating off-angle positions to attack from advantageous
    positions and avoid opponent's power hand.

  types:
    inside_angle:
      position: between_opponent_feet
      advantage: both_hands_dangerous
      risk: opponent_both_hands_dangerous

    outside_angle:
      position: outside_opponent_lead_foot
      advantage: away_from_power_hand
      orthodox_vs_orthodox: circle_left
      southpaw_vs_southpaw: circle_right

    pivot_angle:
      created_by: pivoting_after_punch
      advantage: opponent_must_reset

  measurement:
    facing_angle: degrees_between_fighter_facings
    optimal_attack_angle: 15-45_degrees_off_center
    worst_attack_angle: 0_degrees (head_on, predictable)
```

### Angle Calculation

```javascript
function calculateAngleAdvantage(attacker, defender) {
  // Calculate relative angle
  const attackerFacing = attacker.position.facing;
  const defenderFacing = defender.position.facing;

  // Vector from attacker to defender
  const dx = defender.position.x - attacker.position.x;
  const dy = defender.position.y - attacker.position.y;
  const angleToDefender = Math.atan2(dy, dx) * (180 / Math.PI);

  // How far off-center is attacker?
  const attackAngle = Math.abs(normalizeAngle(attackerFacing - angleToDefender));

  // How well can defender see attacker?
  const defenseAngle = Math.abs(normalizeAngle(defenderFacing - angleToDefender - 180));

  return {
    attackerAdvantage: attackAngle < 30 ? 1.0 : 0.9,
    defenderDisadvantage: defenseAngle > 45 ? 0.85 : 1.0,
    blindSpot: defenseAngle > 70,
    optimalPosition: attackAngle < 15 && defenseAngle > 30
  };
}
```

---

## Stance and Facing

### Stance Position

```yaml
orthodox_stance:
  lead_foot: left
  rear_foot: right
  lead_hand: left (jab)
  rear_hand: right (power)
  typical_facing: opponent

southpaw_stance:
  lead_foot: right
  rear_foot: left
  lead_hand: right (jab)
  rear_hand: left (power)
  typical_facing: opponent

switch_stance:
  can_change: mid_fight
  transition_time: 0.3s
  vulnerability_during_switch: true
```

### Facing Updates

```javascript
function updateFacing(fighter, target) {
  // Calculate angle to target
  const dx = target.position.x - fighter.position.x;
  const dy = target.position.y - fighter.position.y;
  const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);

  // Rotation speed based on footwork
  const maxRotation = fighter.footwork * 0.5; // degrees per tick

  // Current facing vs desired facing
  const currentFacing = fighter.position.facing;
  const angleDiff = normalizeAngle(angleToTarget - currentFacing);

  // Rotate toward target (limited by max rotation)
  const rotation = clamp(angleDiff, -maxRotation, maxRotation);

  return {
    newFacing: normalizeAngle(currentFacing + rotation),
    fullyFacing: Math.abs(angleDiff) < 10
  };
}
```

---

## Visual Representation (CLI)

### Ring Display

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║    ┌─────────────────────────────────────────────────────────────────────┐    ║
║    │                              ROPES                                   │    ║
║    │   ╭─────────────────────────────────────────────────────────────╮   │    ║
║    │   │                                                             │   │    ║
║    │   │                                                             │   │    ║
║    │   │                          ●                                  │   │    ║
║    │   │                        FIGHTER A                            │   │    ║
║    │   │                                                             │   │    ║
║    │   │                           ↕ 4.5ft                           │   │    ║
║    │   │                                                             │   │    ║
║    │   │                          ○                                  │   │    ║
║    │   │                        FIGHTER B                            │   │    ║
║    │   │                                                             │   │    ║
║    │   │                                                             │   │    ║
║    │   ╰─────────────────────────────────────────────────────────────╯   │    ║
║    │                                                                     │    ║
║    └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### Position Symbols

```yaml
display_symbols:
  fighter_a: "●"
  fighter_b: "○"
  fighter_a_hurt: "◉"
  fighter_b_hurt: "◎"
  fighter_down: "✕"
  referee: "R"
  center: "+"
  corner_red: "▣"
  corner_blue: "▤"
  corner_neutral: "□"
```

---

## Implementation Notes

### Position Object Structure

```javascript
const fighterPosition = {
  x: 2.5,           // feet from center
  y: -1.0,          // feet from center
  facing: 180,      // degrees (facing south)

  // Derived properties
  distanceFromCenter: 2.69,
  distanceFromRopes: 7.31,
  isNearRopes: false,
  isInCorner: false,
  zone: 'neutral'   // center, neutral, near_ropes, on_ropes, corner
};
```

### Ring State Object

```javascript
const ringState = {
  size: 'standard',
  dimensions: { width: 20, height: 20 }, // feet

  fighters: {
    A: { position: { x: 0, y: 2 }, facing: 180 },
    B: { position: { x: 0, y: -2 }, facing: 0 }
  },

  control: {
    controller: 'A',
    magnitude: 15
  },

  distance: 4.0 // feet between fighters
};
```
