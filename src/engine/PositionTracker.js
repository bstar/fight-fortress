/**
 * Position Tracker
 * Manages fighter positions in the ring, distance calculations, and movement
 */

import { FighterState, MovementSubState } from '../models/Fighter.js';
import { ActionType } from './FighterAI.js';

// Ring dimensions (in feet)
const RING = {
  size: 20,          // 20x20 feet standard ring
  center: { x: 0, y: 0 },
  ropeDistance: 10,  // Distance from center to ropes
  cornerDistance: 9  // Distance to corners
};

// Movement speeds (feet per second)
const MOVEMENT_SPEEDS = {
  forward: 2.0,
  backward: 1.5,
  lateral: 1.2,
  circling: 1.0,
  cutting: 2.5,
  retreating: 1.8
};

// Distance zones
const DISTANCE_ZONES = {
  clinch: { min: 0, max: 1.5 },
  inside: { min: 1.5, max: 2.5 },
  close: { min: 2.5, max: 3.5 },
  medium: { min: 3.5, max: 5.0 },
  long: { min: 5.0, max: 6.5 },
  outOfRange: { min: 6.5, max: Infinity }
};

/**
 * Calculate distance control modifier based on reach and distanceManagement
 * Returns modifiers for closing and retreating effectiveness
 *
 * Key insight: When Tyson (short reach) tries to close on Lewis (long reach),
 * Tyson's closing should be PENALIZED because Lewis controls the range.
 * The OPPONENT's reach/distanceManagement works AGAINST the fighter's closing.
 */
function calculateDistanceControlModifiers(fighter, opponent) {
  const fighterReach = fighter.physical?.reach || 180;
  const opponentReach = opponent.physical?.reach || 180;

  const fighterDistMgmt = fighter.technical?.distanceManagement || 50;
  const opponentDistMgmt = opponent.technical?.distanceManagement || 50;

  // CLOSING EFFICIENCY: Penalized by OPPONENT's reach/distance management
  // Tyson closing on Lewis: Lewis's +33cm reach should hurt Tyson's closing
  const opponentReachAdvantage = (opponentReach - fighterReach) / 50;  // Lewis has +0.66
  const opponentDistMgmtAdvantage = (opponentDistMgmt - fighterDistMgmt) / 100;

  // Combined opponent advantage for resisting being closed on
  // Higher = opponent controls range better
  const opponentRangeControl = (opponentReachAdvantage * 0.6) + (opponentDistMgmtAdvantage * 0.4);

  // RETREAT EFFICIENCY: Boosted by fighter's OWN reach/distance management
  const fighterReachAdvantage = (fighterReach - opponentReach) / 50;
  const fighterDistMgmtAdvantage = (fighterDistMgmt - opponentDistMgmt) / 100;
  const fighterRangeControl = (fighterReachAdvantage * 0.6) + (fighterDistMgmtAdvantage * 0.4);

  return {
    // How effective the fighter is at closing distance
    // REDUCED by opponent's range control (Lewis's reach hurts Tyson's closing)
    // Tyson vs Lewis: 1.0 - 0.43*1.5 = 0.35 (65% penalty)
    // Lewis's reach made it difficult but not impossible for Tyson
    closingEfficiency: Math.max(0.25, 1.0 - (opponentRangeControl * 1.5)),

    // How effective the fighter is at retreating/maintaining distance
    // BOOSTED by fighter's own range control (Lewis's reach helps Lewis retreat)
    // Lewis vs Tyson: 1.0 + 0.43*1.5 = 1.65 (65% faster retreat)
    retreatEfficiency: Math.min(2.0, 1.0 + (fighterRangeControl * 1.5)),

    // Raw values for reference
    fighterReach,
    opponentReach,
    reachDiff: fighterReach - opponentReach,
    distMgmtDiff: fighterDistMgmt - opponentDistMgmt
  };
}

export class PositionTracker {
  constructor() {
    this.fighterA = null;
    this.fighterB = null;
  }

  /**
   * Initialize fighter positions
   */
  initializePositions(fighterA, fighterB) {
    this.fighterA = fighterA;
    this.fighterB = fighterB;

    // Start at opposite sides of ring
    fighterA.position = { x: -4, y: 0 };
    fighterB.position = { x: 4, y: 0 };
  }

  /**
   * Reset positions for new round
   */
  resetForRound() {
    if (this.fighterA && this.fighterB) {
      this.fighterA.position = { x: -4, y: 0 };
      this.fighterB.position = { x: 4, y: 0 };
    }
  }

  /**
   * Update positions based on decisions
   */
  update(fighterA, fighterB, decisionA, decisionB, deltaTime) {
    // Process explicit movement for fighter A
    if (decisionA.action?.type === ActionType.MOVE) {
      this.processMovement(fighterA, fighterB, decisionA.action, deltaTime);
    } else if (fighterA.state === FighterState.MOVING) {
      this.processStateMovement(fighterA, fighterB, fighterA.subState, deltaTime);
    } else {
      // Natural movement - always happens even when not explicitly moving
      this.applyNaturalMovement(fighterA, fighterB, decisionA, deltaTime);
    }

    // Process explicit movement for fighter B
    if (decisionB.action?.type === ActionType.MOVE) {
      this.processMovement(fighterB, fighterA, decisionB.action, deltaTime);
    } else if (fighterB.state === FighterState.MOVING) {
      this.processStateMovement(fighterB, fighterA, fighterB.subState, deltaTime);
    } else {
      // Natural movement - always happens even when not explicitly moving
      this.applyNaturalMovement(fighterB, fighterA, decisionB, deltaTime);
    }

    // Ensure fighters stay in ring
    this.clampToRing(fighterA);
    this.clampToRing(fighterB);

    // Prevent overlap
    this.preventOverlap(fighterA, fighterB);
  }

  /**
   * Apply natural movement - subtle adjustments boxers constantly make
   * Real boxers are never truly static - they're always making micro-adjustments
   */
  applyNaturalMovement(fighter, opponent, decision, deltaTime) {
    const distance = this.calculateDistanceBetween(fighter, opponent);
    const optimalRange = fighter.optimalRange || 4;

    // Movement intensity based on footwork skill
    const footworkFactor = (fighter.technical?.footwork || 50) / 100;
    // Significantly increased base movement for visible ring movement
    const baseMovement = 1.8 * footworkFactor * deltaTime;

    // Style-based circling preference
    const style = fighter.style?.primary || 'boxer-puncher';
    const isCircler = ['out-boxer', 'counter-puncher', 'boxer-puncher'].includes(style);
    const isStalker = ['swarmer', 'slugger', 'inside-fighter'].includes(style);

    // DISTANCE CONTROL: Calculate reach/distanceManagement modifiers
    // A fighter with longer reach and high distanceManagement can maintain range better
    const distControl = calculateDistanceControlModifiers(fighter, opponent);

    // Determine movement based on state
    if (decision.state === FighterState.OFFENSIVE) {
      // Offensive fighters press forward, close distance
      // Apply closing efficiency - harder to close on fighters with reach/distance control advantage
      const closingMod = distControl.closingEfficiency;

      if (distance > optimalRange + 0.5) {
        // Stalking styles cut off the ring rather than chase
        if (isStalker) {
          this.cutOffRing(fighter, opponent, baseMovement * 2.0 * closingMod);
          // Still circle to cut angles
          this.applyCirclingMovement(fighter, opponent, baseMovement * 1.2);
        } else {
          this.moveToward(fighter, opponent.position, baseMovement * 1.8 * closingMod);
          // Even when closing, circle significantly to find angles
          this.applyCirclingMovement(fighter, opponent, baseMovement * 1.4);
        }
      } else {
        // At range - strong lateral movement to find angles
        this.applyCirclingMovement(fighter, opponent, baseMovement * 2.0);
        // Slight forward pressure
        this.moveToward(fighter, opponent.position, baseMovement * 0.3 * closingMod);
      }
    } else if (decision.state === FighterState.DEFENSIVE) {
      // Defensive fighters circle away and create angles
      // Apply retreat efficiency - reach and distance management help maintain range
      const retreatMod = distControl.retreatEfficiency;

      if (distance < optimalRange - 0.5) {
        this.moveAway(fighter, opponent.position, baseMovement * 1.4 * retreatMod);
        // Circle heavily while retreating - key to not getting cornered
        this.applyCirclingMovement(fighter, opponent, baseMovement * 2.0);
      } else {
        // Circle constantly to avoid being a stationary target - primary defensive movement
        this.applyCirclingMovement(fighter, opponent, baseMovement * 2.8);
      }
    } else if (decision.state === FighterState.TIMING) {
      // Counter-punchers circle at range, waiting for opportunities
      // Apply distance control modifiers based on range adjustment direction
      const rangeDiff = distance - optimalRange;
      if (Math.abs(rangeDiff) > 0.3) {
        if (rangeDiff > 0) {
          // Moving forward to close gap
          this.moveToward(fighter, opponent.position, baseMovement * 0.5 * distControl.closingEfficiency);
        } else {
          // Moving back to create gap - reach advantage helps
          this.moveAway(fighter, opponent.position, baseMovement * 0.5 * distControl.retreatEfficiency);
        }
      }
      // Active circling is key for counter-punchers - constant heavy movement
      this.applyCirclingMovement(fighter, opponent, baseMovement * (isCircler ? 2.8 : 2.2));
    } else if (decision.state === FighterState.CLINCH) {
      // In clinch, fighters push for position
      this.applyCirclingMovement(fighter, opponent, baseMovement * 0.6);
    } else if (decision.state === FighterState.MOVING) {
      // Already in moving state - heavy circling
      if (isStalker && distance > optimalRange) {
        // Stalkers cut off ring when in MOVING state
        // Apply closing efficiency - harder against fighters with reach advantage
        this.cutOffRing(fighter, opponent, baseMovement * 2.5 * distControl.closingEfficiency);
        this.applyCirclingMovement(fighter, opponent, baseMovement * 1.5);
      } else {
        this.applyCirclingMovement(fighter, opponent, baseMovement * 3.5);
      }
    } else {
      // NEUTRAL or other states - active circling (boxers are always moving)
      this.applyCirclingMovement(fighter, opponent, baseMovement * 2.2);

      // Drift toward optimal range - apply distance control modifiers
      const rangeDiff = distance - optimalRange;
      if (Math.abs(rangeDiff) > 1) {
        if (rangeDiff > 0) {
          // Moving forward - apply closing efficiency
          if (isStalker) {
            this.cutOffRing(fighter, opponent, baseMovement * 0.8 * distControl.closingEfficiency);
          } else {
            this.moveToward(fighter, opponent.position, baseMovement * 0.4 * distControl.closingEfficiency);
          }
        } else {
          // Moving back - apply retreat efficiency (reach advantage helps)
          this.moveAway(fighter, opponent.position, baseMovement * 0.4 * distControl.retreatEfficiency);
        }
      }
    }

    // Add small random jitter for realism (boxers aren't robots)
    this.applyJitter(fighter, baseMovement * 0.3);
  }

  /**
   * Apply circling movement around opponent
   * This creates the classic boxing circling pattern, following the ring perimeter
   */
  applyCirclingMovement(fighter, opponent, amount) {
    // Initialize circle direction based on stance (southpaws often circle opposite)
    if (!fighter._circleDirection) {
      // Orthodox fighters typically circle left, southpaws circle right
      const isSouthpaw = fighter.physical?.stance === 'southpaw';
      fighter._circleDirection = isSouthpaw ? 'right' : 'left';
      fighter._circleTimer = 0;
    }

    // Increment timer and occasionally switch direction (every 3-8 seconds on average)
    fighter._circleTimer = (fighter._circleTimer || 0) + 1;
    if (fighter._circleTimer > 6 + Math.random() * 10) {
      // Switch direction
      fighter._circleDirection = fighter._circleDirection === 'left' ? 'right' : 'left';
      fighter._circleTimer = 0;
    }

    // Calculate distance from center - the closer to the ring edge, the more we follow the perimeter
    const distFromCenter = Math.sqrt(fighter.position.x ** 2 + fighter.position.y ** 2);
    const ringEdge = RING.ropeDistance - 1;
    const perimeterInfluence = Math.min(1, Math.max(0, (distFromCenter - 3) / (ringEdge - 3)));

    // If near the ropes/corner, emphasize perimeter movement
    if (perimeterInfluence > 0.3 || this.isOnRopes(fighter)) {
      // Calculate the tangent to the ring perimeter (circular path)
      const angle = Math.atan2(fighter.position.y, fighter.position.x);
      let tangentX, tangentY;

      if (fighter._circleDirection === 'left') {
        // Move counter-clockwise along perimeter
        tangentX = -Math.sin(angle);
        tangentY = Math.cos(angle);
      } else {
        // Move clockwise along perimeter
        tangentX = Math.sin(angle);
        tangentY = -Math.cos(angle);
      }

      // Blend between opponent-relative movement and perimeter movement
      const opponentCircle = this.getCircleVector(fighter, opponent, fighter._circleDirection);
      const blendFactor = perimeterInfluence * 0.7; // Up to 70% perimeter influence

      const finalX = opponentCircle.x * (1 - blendFactor) + tangentX * blendFactor;
      const finalY = opponentCircle.y * (1 - blendFactor) + tangentY * blendFactor;

      // Normalize and apply
      const mag = Math.sqrt(finalX * finalX + finalY * finalY);
      if (mag > 0.01) {
        fighter.position.x += (finalX / mag) * amount;
        fighter.position.y += (finalY / mag) * amount;
      }

      // Also escape corners/ropes by drifting toward center slightly
      if (this.isInCorner(fighter) || this.isOnRopes(fighter)) {
        const toCenterX = -fighter.position.x;
        const toCenterY = -fighter.position.y;
        const toCenterMag = Math.sqrt(toCenterX ** 2 + toCenterY ** 2);
        if (toCenterMag > 0.1) {
          fighter.position.x += (toCenterX / toCenterMag) * amount * 0.3;
          fighter.position.y += (toCenterY / toCenterMag) * amount * 0.3;
        }
      }
    } else {
      // In the middle of the ring - standard opponent-relative circling
      this.moveLateral(fighter, opponent.position, amount, fighter._circleDirection);
    }
  }

  /**
   * Get the vector for circling in a direction
   */
  getCircleVector(fighter, opponent, direction) {
    const dx = opponent.position.x - fighter.position.x;
    const dy = opponent.position.y - fighter.position.y;
    if (direction === 'left') {
      return { x: -dy, y: dx };
    } else {
      return { x: dy, y: -dx };
    }
  }

  /**
   * Apply lateral drift - simpler version for small adjustments
   */
  applyLateralDrift(fighter, opponent, amount) {
    this.applyCirclingMovement(fighter, opponent, amount);
  }

  /**
   * Apply small random jitter
   */
  applyJitter(fighter, amount) {
    fighter.position.x += (Math.random() - 0.5) * amount * 2;
    fighter.position.y += (Math.random() - 0.5) * amount * 2;
  }

  /**
   * Calculate distance between two fighters
   */
  calculateDistanceBetween(fighter, opponent) {
    const dx = opponent.position.x - fighter.position.x;
    const dy = opponent.position.y - fighter.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Process explicit movement action
   */
  processMovement(fighter, opponent, action, deltaTime) {
    const speed = this.getMovementSpeed(fighter, action);
    const distance = speed * deltaTime;

    switch (action.direction) {
      case 'forward':
        this.moveToward(fighter, opponent.position, distance);
        break;

      case 'backward':
        this.moveAway(fighter, opponent.position, distance);
        break;

      case 'left':
        this.moveLateral(fighter, opponent.position, distance, 'left');
        break;

      case 'right':
        this.moveLateral(fighter, opponent.position, distance, 'right');
        break;
    }

    if (action.cutting) {
      // Cut off ring - move toward predicted opponent position
      this.cutOffRing(fighter, opponent, distance);
    }
  }

  /**
   * Process movement from state
   */
  processStateMovement(fighter, opponent, subState, deltaTime) {
    const baseSpeed = 1.5;
    const distance = baseSpeed * deltaTime;

    switch (subState) {
      case MovementSubState.CUTTING_OFF:
        this.cutOffRing(fighter, opponent, distance);
        break;

      case MovementSubState.CIRCLING:
        const direction = Math.random() > 0.5 ? 'left' : 'right';
        this.moveLateral(fighter, opponent.position, distance, direction);
        break;

      case MovementSubState.RETREATING:
        this.moveAway(fighter, opponent.position, distance);
        break;
    }
  }

  /**
   * Get movement speed based on fighter attributes and action
   */
  getMovementSpeed(fighter, action) {
    const baseSpeed = MOVEMENT_SPEEDS[action.direction] || 1.5;

    // Foot speed modifier
    const footSpeedMod = 0.5 + fighter.speed.footSpeed / 100;

    // Fatigue modifier
    const staminaMod = 0.6 + fighter.getStaminaPercent() * 0.4;

    // Footwork modifier
    const footworkMod = 0.8 + fighter.technical.footwork / 250;

    return baseSpeed * footSpeedMod * staminaMod * footworkMod;
  }

  /**
   * Move toward a target position
   */
  moveToward(fighter, target, distance) {
    const dx = target.x - fighter.position.x;
    const dy = target.y - fighter.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) return;

    const ratio = Math.min(1, distance / dist);
    fighter.position.x += dx * ratio;
    fighter.position.y += dy * ratio;
  }

  /**
   * Move away from a target position
   */
  moveAway(fighter, target, distance) {
    const dx = fighter.position.x - target.x;
    const dy = fighter.position.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      // Too close, move in a random direction
      const angle = Math.random() * Math.PI * 2;
      fighter.position.x += Math.cos(angle) * distance;
      fighter.position.y += Math.sin(angle) * distance;
      return;
    }

    fighter.position.x += (dx / dist) * distance;
    fighter.position.y += (dy / dist) * distance;
  }

  /**
   * Move laterally relative to opponent
   */
  moveLateral(fighter, target, distance, direction) {
    const dx = target.x - fighter.position.x;
    const dy = target.y - fighter.position.y;

    // Perpendicular direction
    let perpX, perpY;
    if (direction === 'left') {
      perpX = -dy;
      perpY = dx;
    } else {
      perpX = dy;
      perpY = -dx;
    }

    const dist = Math.sqrt(perpX * perpX + perpY * perpY);
    if (dist < 0.1) return;

    fighter.position.x += (perpX / dist) * distance;
    fighter.position.y += (perpY / dist) * distance;
  }

  /**
   * Cut off the ring
   */
  cutOffRing(fighter, opponent, distance) {
    // Predict where opponent might go (toward center usually)
    const opponentToCenter = {
      x: RING.center.x - opponent.position.x,
      y: RING.center.y - opponent.position.y
    };

    // Move toward interception point
    const interceptX = opponent.position.x + opponentToCenter.x * 0.3;
    const interceptY = opponent.position.y + opponentToCenter.y * 0.3;

    this.moveToward(fighter, { x: interceptX, y: interceptY }, distance * 1.2);
  }

  /**
   * Clamp fighter position to ring boundaries
   */
  clampToRing(fighter) {
    const maxDist = RING.ropeDistance - 0.5;

    fighter.position.x = Math.max(-maxDist, Math.min(maxDist, fighter.position.x));
    fighter.position.y = Math.max(-maxDist, Math.min(maxDist, fighter.position.y));
  }

  /**
   * Prevent fighters from overlapping
   */
  preventOverlap(fighterA, fighterB) {
    const minDistance = 1.0; // Minimum separation

    const dx = fighterB.position.x - fighterA.position.x;
    const dy = fighterB.position.y - fighterA.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDistance && dist > 0) {
      const overlap = minDistance - dist;
      const pushX = (dx / dist) * overlap * 0.5;
      const pushY = (dy / dist) * overlap * 0.5;

      fighterA.position.x -= pushX;
      fighterA.position.y -= pushY;
      fighterB.position.x += pushX;
      fighterB.position.y += pushY;
    }
  }

  /**
   * Get distance between fighters
   */
  getDistance() {
    if (!this.fighterA || !this.fighterB) return 5;

    const dx = this.fighterB.position.x - this.fighterA.position.x;
    const dy = this.fighterB.position.y - this.fighterA.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get current distance zone
   */
  getDistanceZone() {
    const distance = this.getDistance();

    for (const [zone, range] of Object.entries(DISTANCE_ZONES)) {
      if (distance >= range.min && distance < range.max) {
        return zone;
      }
    }

    return 'outOfRange';
  }

  /**
   * Separate fighters to a target distance (used by referee breaks)
   * Pushes both fighters back from center point between them
   */
  separateFighters(targetDistance) {
    if (!this.fighterA || !this.fighterB) return;

    // Get center point between fighters
    const centerX = (this.fighterA.position.x + this.fighterB.position.x) / 2;
    const centerY = (this.fighterA.position.y + this.fighterB.position.y) / 2;

    // Get angle from A to B
    const dx = this.fighterB.position.x - this.fighterA.position.x;
    const dy = this.fighterB.position.y - this.fighterA.position.y;
    const angle = Math.atan2(dy, dx);

    // Position fighters at target distance apart, centered
    const halfDist = targetDistance / 2;
    this.fighterA.position = {
      x: centerX - Math.cos(angle) * halfDist,
      y: centerY - Math.sin(angle) * halfDist
    };
    this.fighterB.position = {
      x: centerX + Math.cos(angle) * halfDist,
      y: centerY + Math.sin(angle) * halfDist
    };

    // Keep both fighters facing each other
    this.fighterA.facing = angle;
    this.fighterB.facing = angle + Math.PI;
  }

  /**
   * Check if fighter is in corner
   */
  isInCorner(fighter) {
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x > RING.cornerDistance - 2 && y > RING.cornerDistance - 2;
  }

  /**
   * Check if fighter is on ropes
   */
  isOnRopes(fighter) {
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x > RING.ropeDistance - 2 || y > RING.ropeDistance - 2;
  }

  /**
   * Check if fighter is in center
   */
  isInCenter(fighter) {
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x < 3 && y < 3;
  }

  /**
   * Get which fighter is controlling the center
   * Returns 'A', 'B', or null if roughly equal
   */
  getCenterControl() {
    if (!this.fighterA || !this.fighterB) return null;

    const distA = Math.sqrt(
      this.fighterA.position.x ** 2 +
      this.fighterA.position.y ** 2
    );
    const distB = Math.sqrt(
      this.fighterB.position.x ** 2 +
      this.fighterB.position.y ** 2
    );

    // Need at least 2ft difference to count as controlling
    const diff = distB - distA;
    if (diff > 2) return 'A';  // A is closer to center
    if (diff < -2) return 'B'; // B is closer to center
    return null; // Roughly equal
  }

  /**
   * Get ring control percentage for each fighter
   */
  getRingControl() {
    const distA = Math.sqrt(
      this.fighterA.position.x ** 2 +
      this.fighterA.position.y ** 2
    );
    const distB = Math.sqrt(
      this.fighterB.position.x ** 2 +
      this.fighterB.position.y ** 2
    );

    // Fighter closer to center has more control
    const totalDist = distA + distB;
    if (totalDist === 0) return { A: 50, B: 50 };

    const controlA = (1 - distA / totalDist) * 100;
    const controlB = (1 - distB / totalDist) * 100;

    return {
      A: Math.round(controlA),
      B: Math.round(controlB)
    };
  }

  /**
   * Calculate angle between fighters
   */
  getAngle() {
    if (!this.fighterA || !this.fighterB) return 0;

    const dx = this.fighterB.position.x - this.fighterA.position.x;
    const dy = this.fighterB.position.y - this.fighterA.position.y;

    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  /**
   * Get position advantage
   */
  getPositionAdvantage() {
    const control = this.getRingControl();
    const inCornerA = this.isInCorner(this.fighterA);
    const inCornerB = this.isInCorner(this.fighterB);
    const onRopesA = this.isOnRopes(this.fighterA);
    const onRopesB = this.isOnRopes(this.fighterB);

    let advantageA = 0, advantageB = 0;

    // Ring control
    advantageA += (control.A - 50) * 0.02;
    advantageB += (control.B - 50) * 0.02;

    // Corner penalty
    if (inCornerA) advantageB += 0.15;
    if (inCornerB) advantageA += 0.15;

    // Ropes penalty
    if (onRopesA && !inCornerA) advantageB += 0.08;
    if (onRopesB && !inCornerB) advantageA += 0.08;

    return {
      A: Math.max(-0.3, Math.min(0.3, advantageA)),
      B: Math.max(-0.3, Math.min(0.3, advantageB))
    };
  }

  /**
   * Get ring state for display
   */
  getRingState() {
    return {
      fighterA: {
        position: { ...this.fighterA.position },
        inCorner: this.isInCorner(this.fighterA),
        onRopes: this.isOnRopes(this.fighterA),
        inCenter: this.isInCenter(this.fighterA)
      },
      fighterB: {
        position: { ...this.fighterB.position },
        inCorner: this.isInCorner(this.fighterB),
        onRopes: this.isOnRopes(this.fighterB),
        inCenter: this.isInCenter(this.fighterB)
      },
      distance: this.getDistance(),
      zone: this.getDistanceZone(),
      control: this.getRingControl(),
      angle: this.getAngle()
    };
  }
}

export default PositionTracker;
