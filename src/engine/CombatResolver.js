/**
 * Combat Resolver
 * Resolves combat interactions between fighters, determining hits, blocks, and outcomes
 */

import { FighterState, DefensiveSubState } from '../models/Fighter.js';
import { ActionType, PunchType } from './FighterAI.js';

/**
 * Weight class profiles - control punch output and activity rates
 * Real boxing stats per round:
 * - Heavyweight: 40-60 punches thrown, ~30% accuracy
 * - Middleweight: 50-70 punches thrown, ~35% accuracy
 * - Welterweight: 60-80 punches thrown, ~38% accuracy
 * - Lightweight: 70-90 punches thrown, ~40% accuracy
 */
const WEIGHT_CLASS_PROFILES = {
  heavyweight: {
    activityRate: 0.35,      // Chance to throw when in offensive state (per tick)
    maxComboLength: 4,       // Heavyweights can throw 4-punch combos (Tyson style)
    comboChance: 0.30,       // Can throw combos
    recoveryTicks: 3,        // Ticks between punch opportunities
    staminaMultiplier: 1.15, // Punches cost slightly more stamina (was 1.3 - too punishing)
    damageMultiplier: 1.25,  // Hit harder
    punchesPerRound: { min: 35, max: 55 }  // Target range
  },
  cruiserweight: {
    activityRate: 0.40,
    maxComboLength: 4,
    comboChance: 0.30,
    recoveryTicks: 2,
    staminaMultiplier: 1.2,
    damageMultiplier: 1.12,
    punchesPerRound: { min: 45, max: 65 }
  },
  'light-heavyweight': {
    activityRate: 0.45,
    maxComboLength: 4,
    comboChance: 0.35,
    recoveryTicks: 2,
    staminaMultiplier: 1.15,
    damageMultiplier: 1.08,
    punchesPerRound: { min: 50, max: 70 }
  },
  middleweight: {
    activityRate: 0.50,
    maxComboLength: 5,
    comboChance: 0.40,
    recoveryTicks: 2,
    staminaMultiplier: 1.0,
    damageMultiplier: 1.0,
    punchesPerRound: { min: 55, max: 75 }
  },
  welterweight: {
    activityRate: 0.55,
    maxComboLength: 5,
    comboChance: 0.45,
    recoveryTicks: 1,
    staminaMultiplier: 0.95,
    damageMultiplier: 0.9,
    punchesPerRound: { min: 60, max: 85 }
  },
  lightweight: {
    activityRate: 0.60,
    maxComboLength: 6,
    comboChance: 0.50,
    recoveryTicks: 1,
    staminaMultiplier: 0.9,
    damageMultiplier: 0.8,
    punchesPerRound: { min: 70, max: 95 }
  },
  featherweight: {
    activityRate: 0.65,
    maxComboLength: 6,
    comboChance: 0.55,
    recoveryTicks: 1,
    staminaMultiplier: 0.85,
    damageMultiplier: 0.7,
    punchesPerRound: { min: 75, max: 100 }
  },
  bantamweight: {
    activityRate: 0.70,
    maxComboLength: 7,
    comboChance: 0.60,
    recoveryTicks: 1,
    staminaMultiplier: 0.8,
    damageMultiplier: 0.65,
    punchesPerRound: { min: 80, max: 110 }
  },
  flyweight: {
    activityRate: 0.75,
    maxComboLength: 8,
    comboChance: 0.65,
    recoveryTicks: 1,
    staminaMultiplier: 0.75,
    damageMultiplier: 0.6,
    punchesPerRound: { min: 85, max: 120 }
  }
};

// Default profile for unknown weight classes
const DEFAULT_PROFILE = WEIGHT_CLASS_PROFILES.middleweight;

// Base punch statistics - damage scaled for 10-12 round fights
// Target: Fighter takes ~100-150 punches landed over full fight
// With maxHeadDamage 100-180, each punch should average ~0.5-1.0 damage
// Damage values REDUCED to allow fights to go the distance
const PUNCH_BASE_STATS = {
  [PunchType.JAB]: {
    baseDamage: 0.5,      // Light scoring punch - mostly for points
    baseAccuracy: 0.42,
    speed: 1.0,
    range: 5.0,
    staminaCost: 1.5
  },
  [PunchType.CROSS]: {
    baseDamage: 2.0,      // Power punch
    baseAccuracy: 0.32,
    speed: 0.85,
    range: 4.5,
    staminaCost: 3.5
  },
  [PunchType.LEAD_HOOK]: {
    baseDamage: 1.5,
    baseAccuracy: 0.28,
    speed: 0.88,
    range: 3.0,
    staminaCost: 3.0
  },
  [PunchType.REAR_HOOK]: {
    baseDamage: 2.5,      // Big power punch
    baseAccuracy: 0.26,
    speed: 0.82,
    range: 3.0,
    staminaCost: 4.0
  },
  [PunchType.LEAD_UPPERCUT]: {
    baseDamage: 1.2,
    baseAccuracy: 0.25,
    speed: 0.80,
    range: 2.5,
    staminaCost: 2.5
  },
  [PunchType.REAR_UPPERCUT]: {
    baseDamage: 3.0,      // Biggest power punch - KO threat
    baseAccuracy: 0.22,
    speed: 0.75,
    range: 2.5,
    staminaCost: 4.5
  },
  [PunchType.BODY_JAB]: {
    baseDamage: 0.6,
    baseAccuracy: 0.40,
    speed: 0.95,
    range: 4.5,
    staminaCost: 1.5
  },
  [PunchType.BODY_CROSS]: {
    baseDamage: 1.8,
    baseAccuracy: 0.30,
    speed: 0.83,
    range: 4.0,
    staminaCost: 3.5
  },
  [PunchType.BODY_HOOK_LEAD]: {
    baseDamage: 1.5,
    baseAccuracy: 0.30,
    speed: 0.85,
    range: 2.5,
    staminaCost: 3.0
  },
  [PunchType.BODY_HOOK_REAR]: {
    baseDamage: 2.0,
    baseAccuracy: 0.28,
    speed: 0.80,
    range: 2.5,
    staminaCost: 4.0
  }
};

export class CombatResolver {
  constructor() {
    this.lastResolution = null;
    // Track recovery ticks for each fighter (cooldown between punch opportunities)
    this.fighterCooldowns = { A: 0, B: 0 };
    // Effects manager reference (set by SimulationLoop)
    this.effectsManager = null;
  }

  /**
   * Set effects manager reference
   */
  setEffectsManager(effectsManager) {
    this.effectsManager = effectsManager;
  }

  /**
   * Get weight class profile for a fighter
   */
  getWeightClassProfile(fighter) {
    // Determine weight class from fighter's weight
    const weight = fighter.physical?.weight || 75; // kg

    if (weight >= 90.7) return WEIGHT_CLASS_PROFILES.heavyweight;
    if (weight >= 79.4) return WEIGHT_CLASS_PROFILES.cruiserweight;
    if (weight >= 76.2) return WEIGHT_CLASS_PROFILES['light-heavyweight'];
    if (weight >= 72.6) return WEIGHT_CLASS_PROFILES.middleweight;
    if (weight >= 66.7) return WEIGHT_CLASS_PROFILES.welterweight;
    if (weight >= 61.2) return WEIGHT_CLASS_PROFILES.lightweight;
    if (weight >= 57.2) return WEIGHT_CLASS_PROFILES.featherweight;
    if (weight >= 53.5) return WEIGHT_CLASS_PROFILES.bantamweight;
    return WEIGHT_CLASS_PROFILES.flyweight;
  }

  /**
   * Check if fighter can throw a punch based on activity rate and cooldown
   */
  canThrowPunch(fighter, fighterId) {
    const profile = this.getWeightClassProfile(fighter);

    // Check cooldown
    if (this.fighterCooldowns[fighterId] > 0) {
      this.fighterCooldowns[fighterId]--;
      return false;
    }

    // Activity rate check - determines if fighter actually throws
    if (Math.random() > profile.activityRate) {
      return false;
    }

    // Set cooldown for next punch opportunity
    this.fighterCooldowns[fighterId] = profile.recoveryTicks;
    return true;
  }

  /**
   * Resolve combat between two fighters
   */
  resolve(fighterA, fighterB, decisionA, decisionB, fight) {
    // Store current round for adaptability calculations
    this.currentRound = fight?.currentRound || 1;

    const result = {
      hits: [],
      blocks: [],
      evades: [],
      misses: [],
      actions: [],
      knockdown: null
    };

    // Process Fighter A's action - with activity rate check AND stun check
    if (decisionA.action?.type === ActionType.PUNCH) {
      // Check both weight class activity rate AND stun state
      if (this.canThrowPunch(fighterA, 'A') && fighterA.canThrowPunch()) {
        const punchResult = this.resolvePunch(fighterA, fighterB, decisionA, decisionB, 'A');
        this.addPunchResult(result, punchResult);
      }
    } else {
      // Decrement cooldown even when not throwing
      if (this.fighterCooldowns.A > 0) this.fighterCooldowns.A--;
    }

    // Process Fighter B's action - with activity rate check AND stun check
    if (decisionB.action?.type === ActionType.PUNCH) {
      // Check both weight class activity rate AND stun state
      if (this.canThrowPunch(fighterB, 'B') && fighterB.canThrowPunch()) {
        const punchResult = this.resolvePunch(fighterB, fighterA, decisionB, decisionA, 'B');
        this.addPunchResult(result, punchResult);
      }
    } else {
      // Decrement cooldown even when not throwing
      if (this.fighterCooldowns.B > 0) this.fighterCooldowns.B--;
    }

    // Check for knockdown from damage
    for (const hit of result.hits) {
      const knockdown = this.checkKnockdown(hit, fight);
      if (knockdown) {
        result.knockdown = knockdown;
        break; // Only one knockdown per tick
      }
    }

    this.lastResolution = result;
    return result;
  }

  /**
   * Add punch result to overall result
   */
  addPunchResult(result, punchResult) {
    if (punchResult.outcome === 'hit') {
      result.hits.push(punchResult);
    } else if (punchResult.outcome === 'blocked') {
      result.blocks.push(punchResult);
    } else if (punchResult.outcome === 'evaded') {
      result.evades.push(punchResult);
    } else {
      result.misses.push(punchResult);
    }

    result.actions.push({
      attacker: punchResult.attacker,
      type: 'punch',
      punchType: punchResult.punchType,
      outcome: punchResult.outcome
    });
  }

  /**
   * Resolve a single punch
   */
  resolvePunch(attacker, defender, attackerDecision, defenderDecision, attackerId) {
    const action = attackerDecision.action;
    const defenderId = attackerId === 'A' ? 'B' : 'A';

    // Handle combinations
    if (action.punchType === 'combination') {
      return this.resolveCombination(attacker, defender, action, defenderDecision, attackerId);
    }

    const punchType = action.punchType;
    const punchStats = PUNCH_BASE_STATS[punchType];

    if (!punchStats) {
      return { outcome: 'miss', punchType, attacker: attackerId };
    }

    // Calculate distance
    const distance = this.calculateDistance(attacker, defender);

    // Check if in range
    if (distance > punchStats.range + 1) {
      return {
        outcome: 'miss',
        punchType,
        attacker: attackerId,
        target: defenderId,
        reason: 'out_of_range'
      };
    }

    // Calculate accuracy (pass IDs for effects modifiers)
    const accuracy = this.calculateAccuracy(attacker, defender, punchType, distance, action.isCounter, attackerId, defenderId);

    // Roll for hit
    const hitRoll = Math.random();

    if (hitRoll > accuracy) {
      // Miss
      return {
        outcome: 'miss',
        punchType,
        attacker: attackerId,
        target: defenderId,
        accuracy,
        roll: hitRoll
      };
    }

    // Punch would land - check defense
    const defenseResult = this.resolveDefense(defender, defenderDecision, punchType, action.target, defenderId);

    if (defenseResult.blocked) {
      return {
        outcome: 'blocked',
        punchType,
        attacker: attackerId,
        target: defenderId,
        blockType: defenseResult.blockType,
        damageReduction: defenseResult.damageReduction
      };
    }

    if (defenseResult.evaded) {
      return {
        outcome: 'evaded',
        punchType,
        attacker: attackerId,
        target: defenderId,
        evadeType: defenseResult.evadeType
      };
    }

    // Hit lands
    let damage = this.calculateDamage(attacker, punchType, distance, action.isCounter, defenseResult.partial, attackerId, defender);

    // Apply stun vulnerability - stunned fighters take more damage
    const stunVulnerability = defender.getStunVulnerability ? defender.getStunVulnerability() : 1.0;
    damage = Math.round(damage * stunVulnerability);

    const quality = defenseResult.partial ? 'partial' : 'clean';

    return {
      outcome: 'hit',
      punchType,
      attacker: attackerId,
      target: defenderId,
      location: action.target || (punchType.includes('body') ? 'body' : 'head'),
      damage,
      quality,
      isCounter: action.isCounter || false,
      causedStun: damage >= 3 // Flag if this hit should cause stun (with new damage scale)
    };
  }

  /**
   * Resolve a combination of punches
   */
  resolveCombination(attacker, defender, action, defenderDecision, attackerId) {
    const defenderId = attackerId === 'A' ? 'B' : 'A';
    const results = [];

    // Get weight class profile for combo limits
    const profile = this.getWeightClassProfile(attacker);

    // Limit combination length based on weight class
    const maxPunches = Math.min(action.combination.length, profile.maxComboLength);

    // Accuracy penalty accumulates through combo
    let comboAccuracyMod = 1.0;

    for (let i = 0; i < maxPunches; i++) {
      const punchType = action.combination[i];
      const punchStats = PUNCH_BASE_STATS[punchType];

      if (!punchStats) continue;

      const distance = this.calculateDistance(attacker, defender);

      // Check range
      if (distance > punchStats.range + 1) {
        results.push({
          outcome: 'miss',
          punchType,
          attacker: attackerId,
          target: defenderId,
          reason: 'out_of_range'
        });
        continue;
      }

      // Calculate accuracy with combo modifier
      const accuracy = this.calculateAccuracy(attacker, defender, punchType, distance, false, attackerId, defenderId) * comboAccuracyMod;

      // Roll for hit
      if (Math.random() > accuracy) {
        results.push({
          outcome: 'miss',
          punchType,
          attacker: attackerId,
          target: defenderId
        });
        // Combo broken on miss (chance)
        if (Math.random() > 0.5) break;
        continue;
      }

      // Check defense
      const defenseResult = this.resolveDefense(defender, defenderDecision, punchType, 'head', defenderId);

      if (defenseResult.blocked) {
        results.push({
          outcome: 'blocked',
          punchType,
          attacker: attackerId,
          target: defenderId,
          blockType: defenseResult.blockType
        });
        // Combo continues through blocks
        comboAccuracyMod *= 0.95;
        continue;
      }

      if (defenseResult.evaded) {
        results.push({
          outcome: 'evaded',
          punchType,
          attacker: attackerId,
          target: defenderId,
          evadeType: defenseResult.evadeType
        });
        // Evade might break combo
        if (Math.random() > 0.6) break;
        continue;
      }

      // Hit
      const damage = this.calculateDamage(attacker, punchType, distance, false, defenseResult.partial, attackerId, defender);

      results.push({
        outcome: 'hit',
        punchType,
        attacker: attackerId,
        target: defenderId,
        location: punchType.includes('body') ? 'body' : 'head',
        damage,
        quality: defenseResult.partial ? 'partial' : 'clean'
      });

      // Combo continues with slight accuracy decrease
      comboAccuracyMod *= 0.92;
    }

    // Return the first significant result (hit or miss)
    const hitResult = results.find(r => r.outcome === 'hit');
    if (hitResult) {
      hitResult.combinationHits = results.filter(r => r.outcome === 'hit').length;
      hitResult.combinationTotal = action.combination.length;
      return hitResult;
    }

    // Return first result
    return results[0] || {
      outcome: 'miss',
      punchType: 'combination',
      attacker: attackerId,
      target: defenderId
    };
  }

  /**
   * Calculate accuracy for a punch
   */
  calculateAccuracy(attacker, defender, punchType, distance, isCounter, attackerId = null, defenderId = null) {
    const punchStats = PUNCH_BASE_STATS[punchType];
    let accuracy = punchStats.baseAccuracy;

    // Apply effects manager accuracy modifier for attacker
    if (this.effectsManager && attackerId) {
      const accuracyMod = this.effectsManager.getAccuracyModifier(attackerId);
      accuracy *= 1 + accuracyMod;
    }

    // Attacker accuracy modifier
    const attackerAccuracy = punchType.includes('jab')
      ? attacker.offense.jabAccuracy
      : attacker.offense.powerAccuracy;
    accuracy *= (0.5 + attackerAccuracy / 100);

    // Hand speed bonus
    accuracy *= (0.8 + attacker.speed.handSpeed / 500);

    // Distance modifier
    const optimalRange = punchStats.range;
    const rangeDeviation = Math.abs(distance - optimalRange);
    accuracy *= Math.max(0.3, 1 - rangeDeviation * 0.15);

    // REACH ADVANTAGE: Longer reach = more effective at distance
    // Lewis (213cm) vs Tyson (180cm) = 33cm advantage at range
    const attackerReach = attacker.physical?.reach || 180;
    const defenderReach = defender.physical?.reach || 180;
    const reachDiff = attackerReach - defenderReach; // Positive = attacker has longer reach

    if (reachDiff !== 0 && distance >= 3.5) {
      // At long range (3.5+), reach advantage matters
      // REDUCED: Was too dominant, reach is helpful but not everything
      // +10cm reach = ~3.5% accuracy bonus at range
      // +23cm reach (like Lewis vs Holyfield) = ~8% bonus
      // +33cm reach (like Lewis vs Tyson) = ~11.5% bonus at peak distance
      const reachBonus = (reachDiff / 100) * 0.35;  // Reduced from 0.5
      const distanceFactor = Math.min(2.0, distance / 3.5);
      accuracy *= 1 + (reachBonus * distanceFactor);
    } else if (reachDiff < 0 && distance < 2.5) {
      // At close range, shorter fighter can get UNDER longer reach
      // INCREASED: Tyson's style was built to nullify reach advantages inside
      // Shorter reach is a real advantage in the phone booth
      const insideBonus = Math.abs(reachDiff / 100) * 0.35;  // Increased from 0.15
      accuracy *= 1 + insideBonus;
    }

    // Defender style bonus - rangy boxers are harder to hit at distance
    // REDUCED: Was too powerful on top of reach advantage
    const defenderStyle = defender.style?.primary;
    if (distance > 4 && (defenderStyle === 'out-boxer' || defenderStyle === 'counter-puncher' || defenderStyle === 'boxer-puncher')) {
      const outsideFightingDef = defender.technical?.outsideFighting || 50;
      // REDUCED: 92 outsideFighting = 12% harder to hit (was 28%), 50 = 5% harder to hit
      accuracy *= 0.95 - outsideFightingDef / 750;
    }

    // Defender movement penalty
    if (defender.state === FighterState.MOVING) {
      accuracy *= 0.85;
    }

    // Counter punch bonus
    if (isCounter) {
      accuracy *= 1.2;
      accuracy += attacker.offense.counterPunching / 200;
    }

    // Inside fighting bonus - sluggers and inside fighters excel at close range
    // INCREASED: Tyson with 98 insideFighting should dominate in the phone booth
    const attackerStyle = attacker.style?.primary;
    if (distance < 3.5 && (attackerStyle === 'slugger' || attackerStyle === 'inside-fighter' || attackerStyle === 'swarmer')) {
      // Inside fighting skill bonus for close range
      // 98 insideFighting = 58% bonus (increased from 39%)
      accuracy *= 1.0 + (attacker.technical?.insideFighting || 50) / 170;
      // Power punches are especially effective inside
      if (!punchType.includes('jab')) {
        accuracy *= 1.15;  // Increased from 1.1
      }
    }

    // Out-boxer penalty at close range
    if (distance < 3 && attackerStyle === 'out-boxer') {
      accuracy *= 0.85;
    }

    // OUTSIDE FIGHTING OFFENSIVE BONUS - Rangy boxers are more accurate at distance
    // Lewis's 92 outsideFighting = elite ability to land from range
    if (distance >= 4 && (attackerStyle === 'out-boxer' || attackerStyle === 'boxer-puncher')) {
      const outsideFighting = attacker.technical?.outsideFighting || 50;
      // 92 outsideFighting = +16.8% accuracy at range, 50 = 0%
      const outsideBonus = (outsideFighting - 50) / 250;
      accuracy *= 1 + outsideBonus;
    }

    // DISTANCE MANAGEMENT - Fighters with high distanceManagement control the range better
    // This translates to better accuracy when fighting at THEIR optimal distance
    const attackerDistMgmt = attacker.technical?.distanceManagement || 50;
    const defenderDistMgmt = defender.technical?.distanceManagement || 50;
    const distMgmtDiff = attackerDistMgmt - defenderDistMgmt;

    if (distMgmtDiff > 10) {
      // Attacker controls the distance better - fights where they want
      // Lewis (90) vs Holyfield (75) = 15 diff = ~6% bonus
      accuracy *= 1 + (distMgmtDiff / 250);
    } else if (distMgmtDiff < -10) {
      // Defender controls distance - attacker at disadvantage
      accuracy *= 1 + (distMgmtDiff / 300); // Smaller penalty
    }

    // STYLE MATCHUP MODIFIERS - "Styles make fights"
    // Certain styles have natural advantages against others
    // (defenderStyle already defined above)

    // Swarmer vs Inside-Fighter: Constant pressure disrupts inside-fighter's timing
    // Holyfield's relentless pressure never let Tyson settle into his rhythm
    if (attackerStyle === 'inside-fighter' && defenderStyle === 'swarmer') {
      accuracy *= 0.94; // 6% penalty - hard to time shots against constant pressure
    }
    // Swarmer advantage when attacking: Pressure creates openings
    if (attackerStyle === 'swarmer' && defenderStyle === 'inside-fighter') {
      accuracy *= 1.04; // 4% bonus - pressure creates openings
    }

    // Out-boxer vs Slugger: Movement frustrates power punchers
    if (attackerStyle === 'slugger' && defenderStyle === 'out-boxer') {
      accuracy *= 0.90; // 10% penalty
    }

    // Counter-puncher vs Slugger: Timing beats loading up
    if (attackerStyle === 'slugger' && defenderStyle === 'counter-puncher') {
      accuracy *= 0.88; // 12% penalty
    }

    // Boxer-puncher vs Swarmer: Range advantage at distance, but swarmers thrive inside
    // Lewis used his jab and size to keep Holyfield at bay... until Holyfield got inside
    if (attackerStyle === 'boxer-puncher' && defenderStyle === 'swarmer') {
      if (distance >= 4) {
        accuracy *= 1.08; // 8% bonus at range - can pick shots
      } else if (distance < 3) {
        accuracy *= 0.92; // 8% penalty inside - swarmers smother boxer-punchers
      }
    }
    if (attackerStyle === 'swarmer' && defenderStyle === 'boxer-puncher') {
      if (distance >= 4) {
        accuracy *= 0.92; // 8% penalty at range - running into counters
      } else if (distance < 3) {
        accuracy *= 1.12; // 12% bonus inside - swarmers dominate in close
      }
    }

    // Inside-fighter vs Swarmer: Explosive inside-fighters beat volume swarmers
    // Tyson's peek-a-boo and explosive short punches were devastating against pressure fighters
    // Inside-fighters get inside FASTER and land HARDER than swarmers
    if (attackerStyle === 'inside-fighter' && defenderStyle === 'swarmer') {
      if (distance < 3) {
        // Inside-fighters dominate at close range - shorter, more explosive punches
        accuracy *= 1.18; // 18% bonus - Tyson was devastating inside
      }
    }
    if (attackerStyle === 'swarmer' && defenderStyle === 'inside-fighter') {
      if (distance < 3) {
        // Swarmers less effective against elite inside-fighters - peek-a-boo defense
        accuracy *= 0.88; // 12% penalty - Holyfield's volume less effective vs Tyson's defense
      }
    }

    // FIRST STEP ADVANTAGE - Explosive starters dominate early in exchanges
    // Tyson's first step was legendary - he could close and land before opponents reacted
    const firstStepAdvantage = (attacker.speed?.firstStep || 70) - (defender.speed?.firstStep || 70);
    if (firstStepAdvantage > 10 && distance < 3.5) {
      // Big first step advantage at close-mid range
      const firstStepBonus = 1 + (firstStepAdvantage - 10) / 100;
      accuracy *= firstStepBonus; // 98 vs 78 = 1.10x bonus
    }

    // Defender hurt bonus (easier to hit)
    if (defender.isHurt) {
      accuracy *= 1.3;
    }

    // Fatigue penalty
    const staminaPercent = attacker.getStaminaPercent();
    if (staminaPercent < 0.4) {
      accuracy *= 0.8;
    } else if (staminaPercent < 0.6) {
      accuracy *= 0.9;
    }

    // ADAPTABILITY BONUS: Fighters with high adaptability "figure out" their opponent
    // As rounds progress, adaptable fighters get more accurate
    // Holyfield (85 adaptability) vs Tyson (75) should gain edge over 12 rounds
    const adaptability = attacker.technical?.adaptability || 70;
    const round = this.currentRound || 1;
    if (adaptability > 70 && round > 2) {
      // Each round after round 2, gain up to 1.5% accuracy per point over 70
      // By round 12, an 85 adaptability fighter gains up to 15% accuracy
      const roundBonus = (round - 2) * 0.015;  // 0-15% over 10 rounds
      const adaptBonus = (adaptability - 70) / 100;  // 0-0.30 for 70-100 adaptability
      accuracy *= 1 + (roundBonus * adaptBonus);
    }

    // EXPERIENCE BONUS: Veterans read opponents better
    const experience = attacker.mental?.experience || 70;
    if (experience > 80) {
      // Small accuracy bonus for experienced fighters
      accuracy *= 1 + (experience - 80) / 500; // Up to 4% bonus at 100 experience
    }

    return Math.min(0.95, Math.max(0.1, accuracy));
  }

  /**
   * Check if fighter is in corner based on position
   */
  isInCorner(fighter) {
    if (!fighter.position) return false;
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x > 7 && y > 7; // Both axes near edge = corner
  }

  /**
   * Check if fighter is on ropes based on position
   */
  isOnRopes(fighter) {
    if (!fighter.position) return false;
    const x = Math.abs(fighter.position.x);
    const y = Math.abs(fighter.position.y);
    return x > 8 || y > 8; // Near either edge
  }

  /**
   * Resolve defense against a punch
   */
  resolveDefense(defender, defenderDecision, punchType, target, defenderId = null) {
    const result = {
      blocked: false,
      evaded: false,
      partial: false,
      blockType: null,
      evadeType: null,
      damageReduction: 0
    };

    // Get effects defense modifier (negative = worse defense)
    let effectsDefenseMod = 0;
    if (this.effectsManager && defenderId) {
      effectsDefenseMod = this.effectsManager.getDefenseModifier(defenderId);
    }

    // If defender is hurt, defense is impaired
    if (defender.isHurt) {
      // 30% chance to block/evade when hurt (modified by effects)
      const hurtDefenseChance = Math.max(0.1, 0.3 + effectsDefenseMod);
      if (Math.random() > hurtDefenseChance) {
        return result;
      }
    }

    // Fighters backed into corner or on ropes are more vulnerable
    // They have limited movement options and are easier targets
    const inCorner = this.isInCorner(defender);
    const onRopes = this.isOnRopes(defender);

    if (inCorner) {
      // In corner - severely limited defense options (40% defense chance)
      if (Math.random() > 0.4) {
        return result;
      }
    } else if (onRopes) {
      // On ropes - limited movement for evasion (60% defense chance)
      if (Math.random() > 0.6) {
        return result;
      }
    }

    // Fighters with critical damage are nearly defenseless
    // HP below 15% = very hard to defend, below 5% = practically defenseless
    const headDamagePercent = defender.getHeadDamagePercent();
    if (headDamagePercent >= 0.95) {
      // Nearly KO'd - almost no defense possible
      if (Math.random() > 0.1) {
        return result;
      }
    } else if (headDamagePercent >= 0.85) {
      // Critical damage - severely impaired defense
      if (Math.random() > 0.25) {
        return result;
      }
    } else if (headDamagePercent >= 0.70) {
      // High damage - impaired defense
      if (Math.random() > 0.5) {
        return result;
      }
    }

    const defenseState = defender.state === FighterState.DEFENSIVE;
    const defenseSubState = defender.subState;

    // Check for active evasion
    if (defenderDecision.action?.type === ActionType.EVADE ||
        defenseSubState === DefensiveSubState.HEAD_MOVEMENT) {
      const evadeChance = this.calculateEvadeChance(defender, punchType, target);

      if (Math.random() < evadeChance) {
        result.evaded = true;
        result.evadeType = defenderDecision.action?.evadeType || 'slip';
        return result;
      }
    }

    // Check for blocking
    if (defenderDecision.action?.type === ActionType.BLOCK ||
        defenseSubState === DefensiveSubState.HIGH_GUARD ||
        defenseSubState === DefensiveSubState.PHILLY_SHELL) {
      const blockResult = this.calculateBlock(defender, defenseSubState, punchType, target);

      if (blockResult.success) {
        result.blocked = true;
        result.blockType = blockResult.type;
        result.damageReduction = blockResult.damageReduction;
        return result;
      } else if (blockResult.partial) {
        result.partial = true;
        result.damageReduction = blockResult.damageReduction;
        return result;
      }
    }

    // Passive defense check (ring awareness, reflexes)
    const passiveDefense = this.calculatePassiveDefense(defender, punchType);
    if (Math.random() < passiveDefense) {
      result.partial = true;
      result.damageReduction = 0.3;
    }

    return result;
  }

  /**
   * Calculate evade chance
   * Evade should be relatively rare - even elite head movement shouldn't dodge most punches
   */
  calculateEvadeChance(defender, punchType, target) {
    let chance = 0.1;

    // Head movement skill (reduced from /300 to /500)
    chance += defender.defense.headMovement / 500;

    // Reflexes (reduced from /400 to /600)
    chance += defender.speed.reflexes / 600;

    // Body shots much harder to evade
    if (target === 'body') {
      chance *= 0.4;
    }

    // Hooks and uppercuts harder to evade (inside punches)
    if (punchType.includes('hook') || punchType.includes('uppercut')) {
      chance *= 0.7;
    }

    // Fatigue penalty
    if (defender.getStaminaPercent() < 0.4) {
      chance *= 0.7;
    }

    // EXPERIENCE BONUS: Veterans see punches coming
    const experience = defender.mental?.experience || 70;
    if (experience > 80) {
      chance *= 1 + (experience - 80) / 200; // Up to 10% at 100 experience
    }

    // ADAPTABILITY BONUS: Over rounds, adaptable fighters read patterns better
    const adaptability = defender.technical?.adaptability || 70;
    const round = this.currentRound || 1;
    if (adaptability > 70 && round > 3) {
      const roundBonus = (round - 3) * 0.01; // 0-9% over rounds 4-12
      const adaptBonus = (adaptability - 70) / 100;
      chance *= 1 + (roundBonus * adaptBonus);
    }

    // Cap evade at 45% - even the best head movement can't dodge everything
    return Math.min(0.45, chance);
  }

  /**
   * Calculate block result
   */
  calculateBlock(defender, defenseSubState, punchType, target) {
    let blockChance = 0.3;
    let damageReduction = 0.6;
    let blockType = 'arm';

    // Defense sub-state bonuses
    if (defenseSubState === DefensiveSubState.HIGH_GUARD) {
      blockChance += 0.25;
      damageReduction = 0.7;
      blockType = 'high_guard';

      // High guard weak to body
      if (target === 'body') {
        blockChance -= 0.15;
        damageReduction = 0.4;
      }
    } else if (defenseSubState === DefensiveSubState.PHILLY_SHELL) {
      // Philly shell good against straights
      if (punchType === PunchType.JAB || punchType === PunchType.CROSS) {
        blockChance += 0.3;
        damageReduction = 0.8;
      } else {
        // Weak to hooks
        blockChance += 0.1;
        damageReduction = 0.5;
      }
      blockType = 'shell';
    }

    // Blocking skill
    blockChance += defender.defense.blocking / 400;

    // Parrying skill (for straights)
    if ((punchType === PunchType.JAB || punchType === PunchType.CROSS) &&
        defender.defense.parrying > 60) {
      blockChance += 0.1;
      damageReduction = 0.9;
    }

    // Roll for block
    const roll = Math.random();

    if (roll < blockChance) {
      return { success: true, type: blockType, damageReduction };
    } else if (roll < blockChance + 0.15) {
      return { success: false, partial: true, damageReduction: 0.3 };
    }

    return { success: false, partial: false };
  }

  /**
   * Calculate passive defense (last resort)
   */
  calculatePassiveDefense(defender, punchType) {
    let chance = 0.1;

    // Ring awareness helps
    chance += defender.defense.ringAwareness / 500;

    // Experience helps
    chance += defender.mental.experience / 500;

    return chance;
  }

  /**
   * Calculate damage for a landed punch
   */
  calculateDamage(attacker, punchType, distance, isCounter, isPartial, attackerId = null, defender = null) {
    const punchStats = PUNCH_BASE_STATS[punchType];
    let damage = punchStats.baseDamage;

    // Weight class damage multiplier (heavyweights hit harder)
    const profile = this.getWeightClassProfile(attacker);
    damage *= profile.damageMultiplier;

    // Weight differential modifier - bigger fighters hit smaller fighters MUCH harder
    // And smaller fighters struggle to hurt bigger opponents
    if (defender) {
      const attackerWeight = attacker.physical?.weight || 75;
      const defenderWeight = defender.physical?.weight || 75;
      const weightRatio = attackerWeight / defenderWeight;

      if (weightRatio > 1.1) {
        // Attacker is heavier - bonus damage
        // 10% heavier = 1.15x, 20% heavier = 1.35x, 50% heavier = 2.0x
        const weightBonus = 1 + (weightRatio - 1) * 2.0;
        damage *= Math.min(2.5, weightBonus);
      } else if (weightRatio < 0.9) {
        // Attacker is lighter - reduced damage
        // 10% lighter = 0.85x, 20% lighter = 0.65x, 50% lighter = 0.3x
        const weightPenalty = weightRatio;
        damage *= Math.max(0.3, weightPenalty);
      }
    }

    // Apply effects manager power modifier
    if (this.effectsManager && attackerId) {
      const powerMod = this.effectsManager.getPowerModifier(attackerId);
      damage *= 1 + powerMod;
    }

    // Power modifier - balanced for meaningful power differences
    // Low power (50): 0.6 + 0.2 = 0.8x damage
    // Average power (70): 0.6 + 0.28 = 0.88x damage
    // High power (95): 0.6 + 0.38 = 0.98x damage
    // With knockout power bonus for sluggers
    const power = punchType.includes('jab') || punchType.includes('body_jab')
      ? (attacker.power.powerLeft + attacker.power.powerRight) / 4
      : punchType.includes('lead')
        ? attacker.power.powerLeft
        : attacker.power.powerRight;

    // Base power modifier (0.6 to 1.0 based on power stat)
    let powerMultiplier = 0.6 + power / 250;

    // Knockout power bonus for power punches (not jabs)
    // High knockout power (90+) adds significant damage to power shots
    if (!punchType.includes('jab') && attacker.power.knockoutPower) {
      const koPower = attacker.power.knockoutPower;
      if (koPower >= 85) {
        powerMultiplier *= 1.15 + (koPower - 85) / 100; // 1.15-1.3x for elite KO power
      } else if (koPower >= 70) {
        powerMultiplier *= 1.0 + (koPower - 70) / 150; // 1.0-1.1x for good KO power
      }
    }

    damage *= powerMultiplier;

    // Distance modifier (sweet spot for each punch)
    const optimalRange = punchStats.range;
    const rangeDeviation = Math.abs(distance - optimalRange);
    damage *= Math.max(0.5, 1 - rangeDeviation * 0.1);

    // Counter punch bonus (multiplicative, not additive flat bonus)
    // Elite counter-punchers (90+) get up to 1.4x, average (70) gets 1.28x
    if (isCounter) {
      const counterSkill = attacker.offense.counterPunching || 70;
      const counterBonus = 1.15 + counterSkill / 400; // 1.15x to 1.4x
      damage *= counterBonus;
    }

    // Partial hit reduction
    if (isPartial) {
      damage *= 0.5;
    }

    // Body punching skill for body shots
    if (punchType.includes('body')) {
      damage *= (0.7 + attacker.power.bodyPunching / 150);
    }

    // Fatigue penalty
    const staminaPercent = attacker.getStaminaPercent();
    if (staminaPercent < 0.25) {
      damage *= 0.6;
    } else if (staminaPercent < 0.4) {
      damage *= 0.75;
    } else if (staminaPercent < 0.6) {
      damage *= 0.9;
    }

    // Random variance
    damage *= 0.85 + Math.random() * 0.3;

    return Math.max(1, Math.round(damage));
  }

  /**
   * Check for knockdown from damage
   * Knockdowns should be rare - maybe 0-2 per fight on average
   * Early knockdowns should be extremely rare (like real boxing)
   */
  checkKnockdown(hit, fight) {
    const target = fight.getFighter(hit.target);
    const attacker = fight.getFighter(hit.attacker);

    // Only head shots can cause knockdowns
    if (hit.location !== 'head') return null;

    // Check damage threshold
    const headDamagePercent = target.getHeadDamagePercent();
    const chin = target.mental.chin;
    const staminaPercent = target.getStaminaPercent();

    // PROTECTION: No knockdowns when fighter is fresh (< 15% accumulated damage)
    // This prevents unrealistic first-punch knockouts
    // Exception: Extremely powerful clean shots can still cause flash KDs
    const minDamageForKnockdown = 0.15;
    const isFresh = headDamagePercent < minDamageForKnockdown;

    // Base knockdown threshold - scales with chin
    // Higher chin = needs more single-punch damage to go down
    // With new lower punch damage values (max ~5-6 per punch), threshold should be lower
    // Range: ~8 (chin 30) to ~18 (chin 100)
    let knockdownThreshold = 5 + (chin / 8);

    // Reduce threshold if significantly damaged (> 50%)
    // Accumulated damage wears down resistance
    if (headDamagePercent > 0.5) {
      const damageReduction = (headDamagePercent - 0.5) * 0.3; // Max 15% reduction at 100%
      knockdownThreshold *= (1 - damageReduction);
    }

    // Reduce threshold if very low stamina (exhausted fighters go down easier)
    if (staminaPercent < 0.25) {
      knockdownThreshold *= 0.85;
    } else if (staminaPercent < 0.4) {
      knockdownThreshold *= 0.92;
    }

    // DIRECT KNOCKDOWN: Only possible when damaged enough or hit VERY hard
    // Fresh fighters can only be knocked down by exceptional shots
    const directKnockdownPossible = !isFresh || hit.damage >= knockdownThreshold * 1.3;

    if (directKnockdownPossible && hit.damage >= knockdownThreshold) {
      // Roll against chin - higher chin = much harder to knock down
      // chinResistance is the CHANCE to RESIST knockdown (higher = better)
      // ELITE CHIN SCALING: 85+ chins should be nearly impossible to drop
      // Base: chin 50 = 0.40 resist, chin 70 = 0.65 resist
      // Elite: chin 85 = 0.85 resist, chin 90 = 0.92 resist, chin 95 = 0.96 resist
      let chinResistance = (chin - 30) / 80; // Base: 0.25 - 0.875 range

      // Elite chin bonus - exponential resistance for 80+ chins
      if (chin >= 90) {
        chinResistance = 0.85 + (chin - 90) * 0.012; // 90=0.85, 95=0.91, 100=0.97
      } else if (chin >= 85) {
        chinResistance = 0.75 + (chin - 85) * 0.02; // 85=0.75, 90=0.85
      } else if (chin >= 80) {
        chinResistance = 0.65 + (chin - 80) * 0.02; // 80=0.65, 85=0.75
      }

      // Knockdown happens if random roll EXCEEDS resistance (i.e., chin fails to protect)
      if (Math.random() > chinResistance) {
        return {
          attacker: hit.attacker,
          target: hit.target,
          punchType: hit.punchType,
          damage: hit.damage
        };
      }
    }

    // FLASH KNOCKDOWN: Very rare - requires specific conditions
    // Only possible with:
    // 1. Clean hit (not partial/blocked)
    // 2. Significant damage (>= 70% of threshold)
    // 3. Some accumulated damage OR exceptionally powerful shot
    // 4. Random chance scaled by knockout power vs chin
    // With new damage scale, 8+ damage is a big shot
    const flashKnockdownPossible = !isFresh || hit.damage >= 8;

    // Flash knockdown: Any clean power punch can cause knockdown
    // Elite KO power (90+) makes this much more likely
    const isPowerPunch = hit.punchType && (
      hit.punchType.includes('hook') ||
      hit.punchType.includes('uppercut') ||
      hit.punchType === 'cross' ||
      hit.punchType === 'body_cross'
    );

    if (flashKnockdownPossible && hit.quality === 'clean' && isPowerPunch) {
      const knockoutPower = attacker.power.knockoutPower;

      // MISMATCH CHECK: Low KO power vs elite chin = virtually no knockdowns
      // If chin exceeds knockout power by 20+, knockdowns are extremely rare
      const chinAdvantage = chin - knockoutPower;
      if (chinAdvantage >= 25) {
        // Massive mismatch - weak puncher vs iron chin (e.g., 58 KO vs 85 chin)
        // Only possible if fighter is severely damaged (50%+)
        if (headDamagePercent < 0.5) {
          return null; // No knockdown possible
        }
      }

      // Flash knockdown chance - elite KO power DOMINATES
      // Base chance from KO power vs chin matchup
      // Tyson (99 KO) vs weak chin (68): should have good knockdown chances
      let flashChance = Math.max(0, (knockoutPower - 40) / 200) * (1 - chin / 150);

      // ELITE CHIN PROTECTION (85+): These fighters rarely go down
      // Prime Tyson, prime Holyfield, etc. - iron jaws
      if (chin >= 90) {
        flashChance *= 0.25; // 75% reduction
      } else if (chin >= 85) {
        flashChance *= 0.4; // 60% reduction
      } else if (chin >= 80) {
        flashChance *= 0.6; // 40% reduction
      }

      // LOW KNOCKOUT POWER PENALTY (< 70): Weak punchers struggle to drop anyone
      if (knockoutPower < 60) {
        flashChance *= 0.3; // Pillow fists
      } else if (knockoutPower < 70) {
        flashChance *= 0.5; // Below average power
      }

      // Elite knockout power (90+) gets bonus - but reduced for realism
      // Elite vs elite fights should mostly go to decision
      if (knockoutPower >= 95) {
        flashChance *= 1.6 + (knockoutPower - 95) / 50; // 1.6x to 1.7x for 95-100 KO (reduced from 2.5x)
      } else if (knockoutPower >= 90) {
        flashChance *= 1.4;
      } else if (knockoutPower >= 80) {
        flashChance *= 1.2;
      }

      // EARLY ROUND KO POWER BOOST - Fast starters like Tyson should have a window
      // Only ELITE KO power (94+) gets early round bonus - truly exceptional finishers
      // Tyson was most dangerous early - 22 of his 44 KOs came in first 2 rounds
      // This partially counteracts the "fresh fighter protection" for elite power punchers
      const currentRound = this.currentRound || 1;
      if (currentRound <= 5 && knockoutPower >= 94) {
        const roundFade = 1 - (currentRound - 1) / 5; // 1.0 in R1, 0.8 in R2, etc.
        const powerFactor = (knockoutPower - 92) / 25; // 99 KO = 0.28, 94 KO = 0.08
        const earlyRoundBonus = 1 + powerFactor * roundFade * 1.5;
        // Round 1: 99 KO = 1.42x, 94 KO = 1.12x
        // Round 3: 99 KO = 1.25x, bonus fading
        // Round 5: minimal bonus
        flashChance *= earlyRoundBonus;
      }

      // Scale up with accumulated damage (worn down fighters more vulnerable)
      // But less aggressive scaling - elite fighters can take punishment
      if (headDamagePercent > 0.4) {
        flashChance *= (1 + (headDamagePercent - 0.4) * 1.5); // Max ~1.9x at 100% damage
      }

      // Fresh fighters get strong protection - early KOs should be rare
      if (isFresh) {
        flashChance *= 0.25; // Reduced from 0.4
      }

      // Low stamina increases vulnerability but less dramatically
      if (staminaPercent < 0.2) {
        flashChance *= 1.3;
      } else if (staminaPercent < 0.4) {
        flashChance *= 1.1;
      }

      // Power punches have higher KO chance
      if (hit.punchType && (hit.punchType.includes('hook') || hit.punchType.includes('uppercut') || hit.punchType === 'cross')) {
        flashChance *= 1.2; // Reduced from 1.3
      }

      // Cap maximum flash knockdown chance - VERY LOW for elite vs elite
      // Knockdowns between elite heavyweights should be rare events
      // Target: ~0.3-0.5 knockdowns per fight, not 0.7-0.9
      let flashCap = 0.025; // Default 2.5% (reduced from 6%)
      if (chin >= 90) {
        flashCap = 0.008; // Only 0.8% max for 90+ chin (iron jaw)
      } else if (chin >= 85) {
        flashCap = 0.012; // 1.2% max for 85+ chin (elite chin)
      } else if (chin >= 80) {
        flashCap = 0.018; // 1.8% max for 80+ chin (good chin)
      }

      // Elite KO power raises the cap slightly - but not dramatically
      // Even Tyson couldn't drop Holyfield at will
      if (knockoutPower >= 95) {
        flashCap *= 1.8; // 99 KO vs 93 chin: cap becomes ~1.4% instead of 0.8%
      } else if (knockoutPower >= 90) {
        flashCap *= 1.5;
      } else if (knockoutPower >= 85) {
        flashCap *= 1.25;
      }

      flashChance = Math.min(flashCap, flashChance);

      if (Math.random() < flashChance) {
        return {
          attacker: hit.attacker,
          target: hit.target,
          punchType: hit.punchType,
          damage: hit.damage,
          flash: true
        };
      }
    }

    return null;
  }

  /**
   * Calculate distance between fighters
   */
  calculateDistance(fighterA, fighterB) {
    const dx = fighterA.position.x - fighterB.position.x;
    const dy = fighterA.position.y - fighterB.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export default CombatResolver;
