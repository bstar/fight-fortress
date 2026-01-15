/**
 * Fighter AI
 * Makes decisions for fighters based on their style, attributes, and fight situation
 */

import { FighterState, OffensiveSubState, DefensiveSubState, MovementSubState } from '../models/Fighter.js';

// Action types
export const ActionType = {
  PUNCH: 'punch',
  BLOCK: 'block',
  EVADE: 'evade',
  MOVE: 'move',
  CLINCH: 'clinch',
  FEINT: 'feint',
  WAIT: 'wait'
};

// Punch types
export const PunchType = {
  JAB: 'jab',
  CROSS: 'cross',
  LEAD_HOOK: 'lead_hook',
  REAR_HOOK: 'rear_hook',
  LEAD_UPPERCUT: 'lead_uppercut',
  REAR_UPPERCUT: 'rear_uppercut',
  BODY_JAB: 'body_jab',
  BODY_CROSS: 'body_cross',
  BODY_HOOK_LEAD: 'body_hook_lead',
  BODY_HOOK_REAR: 'body_hook_rear'
};

// Style base weights for action selection
const STYLE_WEIGHTS = {
  'out-boxer': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.30,
      [FighterState.DEFENSIVE]: 0.20,
      [FighterState.TIMING]: 0.15,
      [FighterState.MOVING]: 0.30,  // Out-boxers move a LOT
      [FighterState.CLINCH]: 0.05
    },
    punchWeights: {
      [PunchType.JAB]: 0.40,
      [PunchType.CROSS]: 0.20,
      [PunchType.LEAD_HOOK]: 0.10,
      [PunchType.REAR_HOOK]: 0.05,
      [PunchType.LEAD_UPPERCUT]: 0.05,
      [PunchType.REAR_UPPERCUT]: 0.05,
      [PunchType.BODY_JAB]: 0.10,
      [PunchType.BODY_CROSS]: 0.05
    }
  },

  'swarmer': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.52,  // Swarmers are relentlessly offensive
      [FighterState.DEFENSIVE]: 0.05,
      [FighterState.TIMING]: 0.03,
      [FighterState.MOVING]: 0.30,  // Swarmers constantly closing distance
      [FighterState.CLINCH]: 0.10
    },
    punchWeights: {
      [PunchType.JAB]: 0.20,
      [PunchType.CROSS]: 0.15,
      [PunchType.LEAD_HOOK]: 0.20,
      [PunchType.REAR_HOOK]: 0.10,
      [PunchType.LEAD_UPPERCUT]: 0.05,
      [PunchType.REAR_UPPERCUT]: 0.05,
      [PunchType.BODY_JAB]: 0.05,
      [PunchType.BODY_HOOK_LEAD]: 0.15,
      [PunchType.BODY_HOOK_REAR]: 0.05
    }
  },

  'slugger': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.45,  // Sluggers are aggressive but need to pick shots
      [FighterState.DEFENSIVE]: 0.10,
      [FighterState.TIMING]: 0.08,     // Some timing to set up bombs
      [FighterState.MOVING]: 0.27,     // Sluggers stalk and cut off ring
      [FighterState.CLINCH]: 0.10
    },
    punchWeights: {
      // Sluggers use jabs but favor power when they throw
      // ~45% jabs, ~55% power punches
      [PunchType.JAB]: 0.30,           // Jabs to close distance and set up
      [PunchType.CROSS]: 0.28,         // Big right hand - money punch
      [PunchType.LEAD_HOOK]: 0.18,     // Lead hook
      [PunchType.REAR_HOOK]: 0.10,     // Rear hook
      [PunchType.LEAD_UPPERCUT]: 0.03,
      [PunchType.REAR_UPPERCUT]: 0.06,
      [PunchType.BODY_CROSS]: 0.05
    }
  },

  'boxer-puncher': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.40,  // More active - they box AND punch
      [FighterState.DEFENSIVE]: 0.12,
      [FighterState.TIMING]: 0.13,
      [FighterState.MOVING]: 0.28,  // Boxer-punchers use angles
      [FighterState.CLINCH]: 0.07
    },
    punchWeights: {
      [PunchType.JAB]: 0.25,
      [PunchType.CROSS]: 0.25,
      [PunchType.LEAD_HOOK]: 0.15,
      [PunchType.REAR_HOOK]: 0.10,
      [PunchType.LEAD_UPPERCUT]: 0.05,
      [PunchType.REAR_UPPERCUT]: 0.05,
      [PunchType.BODY_JAB]: 0.05,
      [PunchType.BODY_HOOK_LEAD]: 0.10
    }
  },

  'counter-puncher': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.15,
      [FighterState.DEFENSIVE]: 0.22,
      [FighterState.TIMING]: 0.28,
      [FighterState.MOVING]: 0.30,  // Counter-punchers circle constantly
      [FighterState.CLINCH]: 0.05
    },
    punchWeights: {
      [PunchType.JAB]: 0.20,
      [PunchType.CROSS]: 0.30,
      [PunchType.LEAD_HOOK]: 0.15,
      [PunchType.REAR_HOOK]: 0.10,
      [PunchType.LEAD_UPPERCUT]: 0.10,
      [PunchType.REAR_UPPERCUT]: 0.10,
      [PunchType.BODY_CROSS]: 0.05
    }
  },

  'inside-fighter': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.48,  // Inside fighters explode offensively when close
      [FighterState.DEFENSIVE]: 0.07,
      [FighterState.TIMING]: 0.03,
      [FighterState.MOVING]: 0.27,  // Inside fighters constantly closing distance
      [FighterState.CLINCH]: 0.15
    },
    punchWeights: {
      [PunchType.JAB]: 0.10,
      [PunchType.CROSS]: 0.10,
      [PunchType.LEAD_HOOK]: 0.25,
      [PunchType.REAR_HOOK]: 0.15,
      [PunchType.LEAD_UPPERCUT]: 0.15,
      [PunchType.REAR_UPPERCUT]: 0.10,
      [PunchType.BODY_HOOK_LEAD]: 0.10,
      [PunchType.BODY_HOOK_REAR]: 0.05
    }
  },

  'volume-puncher': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.42,
      [FighterState.DEFENSIVE]: 0.10,
      [FighterState.TIMING]: 0.05,
      [FighterState.MOVING]: 0.38,  // Volume punchers move constantly to find angles
      [FighterState.CLINCH]: 0.05
    },
    punchWeights: {
      [PunchType.JAB]: 0.30,
      [PunchType.CROSS]: 0.20,
      [PunchType.LEAD_HOOK]: 0.15,
      [PunchType.REAR_HOOK]: 0.10,
      [PunchType.LEAD_UPPERCUT]: 0.05,
      [PunchType.REAR_UPPERCUT]: 0.05,
      [PunchType.BODY_JAB]: 0.10,
      [PunchType.BODY_HOOK_LEAD]: 0.05
    }
  },

  'switch-hitter': {
    stateWeights: {
      [FighterState.OFFENSIVE]: 0.30,
      [FighterState.DEFENSIVE]: 0.15,
      [FighterState.TIMING]: 0.12,
      [FighterState.MOVING]: 0.38,  // Switch-hitters move to switch stances effectively
      [FighterState.CLINCH]: 0.05
    },
    punchWeights: {
      [PunchType.JAB]: 0.25,
      [PunchType.CROSS]: 0.20,
      [PunchType.LEAD_HOOK]: 0.20,
      [PunchType.REAR_HOOK]: 0.10,
      [PunchType.LEAD_UPPERCUT]: 0.10,
      [PunchType.REAR_UPPERCUT]: 0.05,
      [PunchType.BODY_JAB]: 0.05,
      [PunchType.BODY_HOOK_LEAD]: 0.05
    }
  }
};

export class FighterAI {
  constructor() {
    // Learning/adaptation state per fighter
    this.fighterMemory = new Map();

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
   * Main decision function
   */
  decide(fighter, opponent, fight) {
    // Get or create memory for this fighter
    const memory = this.getOrCreateMemory(fighter.id);

    // Assess current situation
    const situation = this.assessSituation(fighter, opponent, fight);

    // Add effects modifiers if effectsManager is available
    if (this.effectsManager) {
      const fighterId = fighter.id || (fighter === fight.fighterA ? 'A' : 'B');
      situation.aggressionModifier = this.effectsManager.getAggressionModifier(fighterId);
      situation.defenseModifier = this.effectsManager.getDefenseModifier(fighterId);
      situation.accuracyModifier = this.effectsManager.getAccuracyModifier(fighterId);
      situation.powerModifier = this.effectsManager.getPowerModifier(fighterId);
      situation.speedModifier = this.effectsManager.getSpeedModifier(fighterId);
      situation.effects = this.effectsManager.getEffectsSummary(fighterId);
    } else {
      situation.aggressionModifier = 0;
      situation.defenseModifier = 0;
      situation.accuracyModifier = 0;
      situation.powerModifier = 0;
      situation.speedModifier = 0;
      situation.effects = { buffs: [], debuffs: [], momentum: 0 };
    }

    // Determine state transition
    const { state, subState } = this.decideState(fighter, opponent, situation, memory);

    // Determine action based on state
    const action = this.decideAction(fighter, opponent, state, subState, situation, memory);

    // Update memory for learning
    this.updateMemory(memory, situation, action);

    return {
      state,
      subState,
      action,
      target: action?.target || null
    };
  }

  /**
   * Get or create fighter memory
   */
  getOrCreateMemory(fighterId) {
    if (!this.fighterMemory.has(fighterId)) {
      this.fighterMemory.set(fighterId, {
        opponentPatterns: {},
        successfulActions: [],
        failedActions: [],
        lastActions: [],
        adaptationLevel: 0
      });
    }
    return this.fighterMemory.get(fighterId);
  }

  /**
   * Assess the current fight situation
   */
  assessSituation(fighter, opponent, fight) {
    const round = fight.getCurrentRound();

    return {
      // Fighter state
      staminaPercent: fighter.getStaminaPercent(),
      headDamagePercent: fighter.getHeadDamagePercent(),
      bodyDamagePercent: fighter.getBodyDamagePercent(),
      isHurt: fighter.isHurt,
      knockdownsThisRound: fighter.knockdownsThisRound,

      // Opponent state
      opponentStaminaPercent: opponent.getStaminaPercent(),
      opponentHeadDamagePercent: opponent.getHeadDamagePercent(),
      opponentBodyDamagePercent: opponent.getBodyDamagePercent(),
      opponentIsHurt: opponent.isHurt,
      opponentState: opponent.state,

      // Position
      distance: this.calculateDistance(fighter, opponent),
      optimalRange: fighter.optimalRange,
      inRange: this.isInRange(fighter, opponent),
      inCorner: this.isInCorner(fighter),
      onRopes: this.isOnRopes(fighter),

      // Fight context
      round: fight.currentRound,
      totalRounds: fight.config.rounds,
      roundTime: round?.currentTime || 0,
      roundDuration: fight.config.roundDuration,
      isChampionshipRounds: fight.currentRound >= 10,
      timeRemaining: fight.config.roundDuration - (round?.currentTime || 0),

      // Scoring
      scoreDiff: this.estimateScoreDiff(fight, fighter.id === 'A' ? 'A' : 'B'),

      // Momentum
      momentum: this.assessMomentum(fighter, opponent, round)
    };
  }

  /**
   * Calculate distance between fighters
   */
  calculateDistance(fighter, opponent) {
    const dx = fighter.position.x - opponent.position.x;
    const dy = fighter.position.y - opponent.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if fighters are in range
   */
  isInRange(fighter, opponent) {
    const distance = this.calculateDistance(fighter, opponent);
    const range = fighter.optimalRange;
    return distance >= range - 1 && distance <= range + 1;
  }

  /**
   * Check if fighter is in corner
   */
  isInCorner(fighter) {
    const { x, y } = fighter.position;
    const cornerDist = 8; // Ring corner boundary
    return (Math.abs(x) > cornerDist - 2 && Math.abs(y) > cornerDist - 2);
  }

  /**
   * Check if fighter is on ropes
   */
  isOnRopes(fighter) {
    const { x, y } = fighter.position;
    const ropesDist = 9; // Ring boundary
    return Math.abs(x) > ropesDist - 2 || Math.abs(y) > ropesDist - 2;
  }

  /**
   * Estimate score difference
   */
  estimateScoreDiff(fight, fighterId) {
    const scores = fight.getCurrentScores();
    if (!scores || scores.length === 0) return 0;

    let totalDiff = 0;
    for (const score of scores) {
      if (fighterId === 'A') {
        totalDiff += score.A - score.B;
      } else {
        totalDiff += score.B - score.A;
      }
    }
    return totalDiff / scores.length;
  }

  /**
   * Assess momentum
   */
  assessMomentum(fighter, opponent, round) {
    if (!round) return 0;

    const fighterId = fighter.id || 'A';
    const opponentId = opponent.id || 'B';

    const myLanded = round.stats[fighterId]?.punchesLanded || 0;
    const theirLanded = round.stats[opponentId]?.punchesLanded || 0;

    if (myLanded > theirLanded + 5) return 1;  // Positive momentum
    if (theirLanded > myLanded + 5) return -1; // Negative momentum
    return 0; // Neutral
  }

  /**
   * Decide which state to transition to
   */
  decideState(fighter, opponent, situation, memory) {
    // Override states for special conditions
    if (fighter.state === FighterState.KNOCKED_DOWN) {
      return { state: FighterState.KNOCKED_DOWN, subState: null };
    }

    if (fighter.state === FighterState.RECOVERED) {
      // Just got up, be defensive briefly
      return { state: FighterState.DEFENSIVE, subState: DefensiveSubState.HIGH_GUARD };
    }

    if (situation.isHurt) {
      // Survival mode when hurt
      return this.decideSurvivalState(fighter, situation);
    }

    // Get base weights from style
    const styleWeights = STYLE_WEIGHTS[fighter.style.primary] || STYLE_WEIGHTS['boxer-puncher'];
    const weights = { ...styleWeights.stateWeights };

    // Apply situational modifiers
    this.applyStateModifiers(weights, fighter, opponent, situation);

    // Select state
    const state = this.weightedSelect(weights);

    // Determine sub-state
    const subState = this.decideSubState(state, fighter, opponent, situation);

    return { state, subState };
  }

  /**
   * Decide survival state when hurt
   */
  decideSurvivalState(fighter, situation) {
    // Check for clinch option
    if (situation.distance < 3 && fighter.defense.clinchOffense > 50) {
      return { state: FighterState.CLINCH, subState: null };
    }

    // Defense based on style
    const defenseStyle = fighter.style.defensive;

    switch (defenseStyle) {
      case 'philly-shell':
        return { state: FighterState.DEFENSIVE, subState: DefensiveSubState.PHILLY_SHELL };
      case 'slick':
        return { state: FighterState.DEFENSIVE, subState: DefensiveSubState.HEAD_MOVEMENT };
      case 'distance':
        return { state: FighterState.MOVING, subState: MovementSubState.RETREATING };
      default:
        return { state: FighterState.DEFENSIVE, subState: DefensiveSubState.HIGH_GUARD };
    }
  }

  /**
   * Apply situational modifiers to state weights
   */
  applyStateModifiers(weights, fighter, opponent, situation) {
    // Low stamina - reduce offense, increase clinching
    if (situation.staminaPercent < 0.4) {
      weights[FighterState.OFFENSIVE] *= 0.6;
      weights[FighterState.CLINCH] *= 2.0;
      weights[FighterState.DEFENSIVE] *= 1.3;
    }

    // Opponent hurt - increase offense
    if (situation.opponentIsHurt) {
      weights[FighterState.OFFENSIVE] *= 1.8;
      weights[FighterState.TIMING] *= 0.5;

      // Killer instinct boost
      const killerInstinct = fighter.mental.killerInstinct / 100;
      weights[FighterState.OFFENSIVE] *= (1 + killerInstinct * 0.5);
    }

    // Behind on scorecards and late rounds
    if (situation.scoreDiff < -2 && situation.round >= situation.totalRounds - 2) {
      weights[FighterState.OFFENSIVE] *= 1.5;
      weights[FighterState.DEFENSIVE] *= 0.7;
    }

    // Ahead on scorecards - be more conservative
    if (situation.scoreDiff > 2 && situation.round >= situation.totalRounds - 2) {
      weights[FighterState.DEFENSIVE] *= 1.4;
      weights[FighterState.OFFENSIVE] *= 0.7;
    }

    // Out of range - need to move
    if (situation.distance > situation.optimalRange + 2) {
      weights[FighterState.MOVING] *= 1.5;
      weights[FighterState.OFFENSIVE] *= 0.5;
    }

    // SWARMER vs BOXER-PUNCHER: Swarmers should aggressively close distance
    // Holyfield's relentless pressure was key to beating boxers at range
    const fighterStyle = fighter.style?.primary;
    const opponentStyle = opponent.style?.primary;

    if (fighterStyle === 'swarmer' && (opponentStyle === 'boxer-puncher' || opponentStyle === 'out-boxer')) {
      // Swarmers need to close distance to be effective
      // Boost MOVING weight significantly when outside
      if (situation.distance >= 4) {
        // At range - prioritize closing distance over everything else
        // Holyfield constantly walked through jabs to get inside
        weights[FighterState.MOVING] *= 1.8;
        weights[FighterState.OFFENSIVE] *= 1.3; // Stay active while moving in
        weights[FighterState.DEFENSIVE] *= 0.6; // Accept taking shots to close

        // High heart and cardio allows sustained pressure
        const pressureAbility = ((fighter.mental?.heart || 70) + (fighter.stamina?.cardio || 70)) / 200;
        weights[FighterState.MOVING] *= (0.9 + pressureAbility * 0.3); // Heart 92 + Cardio 90 = 1.17x extra
      } else if (situation.distance < 3) {
        // Inside - swarmers are in their element
        weights[FighterState.OFFENSIVE] *= 1.4;
        weights[FighterState.MOVING] *= 0.6; // Stay in close, don't back out
      }
    }

    // REACH ADVANTAGE: If fighter has longer reach and is in their range, be more aggressive
    // Lewis at distance can jab freely while Tyson can't reach him
    const fighterReach = fighter.physical?.reach || 180;
    const opponentReach = opponent.physical?.reach || 180;
    const reachAdvantage = fighterReach - opponentReach;

    if (reachAdvantage > 15 && situation.distance >= 4) {
      // Long reach fighter at distance - sweet spot for jabbing
      // They can hit while opponent can't reach them
      // Lewis with 23cm reach advantage should be very aggressive from range
      const reachBonusFactor = 1 + (reachAdvantage - 15) / 50; // 23cm = 1.16
      weights[FighterState.OFFENSIVE] *= 1.3 * reachBonusFactor;
      weights[FighterState.DEFENSIVE] *= 0.7;
      weights[FighterState.TIMING] *= 1.2; // Counter when they rush in
    } else if (reachAdvantage > 15 && situation.distance < 3.5) {
      // Long reach fighter got stuck inside - need to create distance!
      // This is critical - Lewis should escape inside rather than trade
      weights[FighterState.MOVING] *= 2.0;
      weights[FighterState.CLINCH] *= 1.5; // Can use clinch to reset
      weights[FighterState.OFFENSIVE] *= 0.7; // Less effective inside
    } else if (reachAdvantage < -15 && situation.distance < 3) {
      // Short reach fighter inside - their sweet spot
      weights[FighterState.OFFENSIVE] *= 1.2;
    }

    // Too close for out-boxer OR boxer-puncher with reach advantage
    if (situation.distance < 3) {
      if (fighter.style.primary === 'out-boxer') {
        weights[FighterState.MOVING] *= 1.5;
        weights[FighterState.CLINCH] *= 1.3;
      } else if (fighter.style.primary === 'boxer-puncher' && reachAdvantage > 10) {
        // Boxer-puncher with reach doesn't want to be inside
        weights[FighterState.MOVING] *= 1.4;
        weights[FighterState.CLINCH] *= 1.2;
      }
    }

    // In corner or on ropes - need to escape
    if (situation.inCorner || situation.onRopes) {
      weights[FighterState.MOVING] *= 1.5;
      weights[FighterState.CLINCH] *= 1.3;
    }

    // Championship rounds - use clutch factor
    if (situation.isChampionshipRounds) {
      const clutchBonus = 1 + (fighter.mental.clutchFactor - 50) / 100;
      weights[FighterState.OFFENSIVE] *= clutchBonus;
    }

    // Fight IQ affects pacing
    if (fighter.technical.fightIQ > 80) {
      // Smart fighters pace themselves
      if (situation.round < 4 && situation.staminaPercent > 0.8) {
        weights[FighterState.TIMING] *= 1.2;
      }
    }

    // Apply effects modifiers (from FightEffectsManager)
    const aggrMod = situation.aggressionModifier || 0;
    const defMod = situation.defenseModifier || 0;

    // Aggression modifier affects offensive vs defensive balance
    if (aggrMod > 0) {
      // More aggressive - increase offense, decrease defense
      weights[FighterState.OFFENSIVE] *= 1 + aggrMod;
      weights[FighterState.TIMING] *= 1 + aggrMod * 0.5;  // Counter-punchers also more active
      weights[FighterState.DEFENSIVE] *= 1 - aggrMod * 0.5;
    } else if (aggrMod < 0) {
      // More cautious - decrease offense, increase defense
      weights[FighterState.OFFENSIVE] *= 1 + aggrMod;  // aggrMod is negative, so this reduces
      weights[FighterState.DEFENSIVE] *= 1 - aggrMod;  // aggrMod is negative, so this increases
      weights[FighterState.CLINCH] *= 1 - aggrMod * 0.3;  // More likely to clinch when scared
    }

    // Defense modifier affects defensive effectiveness preference
    if (defMod < 0) {
      // Poor defense - might want to stay busy or clinch instead
      weights[FighterState.DEFENSIVE] *= 1 + defMod;
      weights[FighterState.CLINCH] *= 1 - defMod * 0.5;
    }
  }

  /**
   * Decide sub-state based on primary state
   */
  decideSubState(state, fighter, opponent, situation) {
    switch (state) {
      case FighterState.OFFENSIVE:
        return this.decideOffensiveSubState(fighter, opponent, situation);

      case FighterState.DEFENSIVE:
        return this.decideDefensiveSubState(fighter, opponent, situation);

      case FighterState.MOVING:
        return this.decideMovementSubState(fighter, opponent, situation);

      default:
        return null;
    }
  }

  /**
   * Decide offensive sub-state
   */
  decideOffensiveSubState(fighter, opponent, situation) {
    const offensiveStyle = fighter.style.offensive;

    // Body snatcher - target body
    if (offensiveStyle === 'body-snatcher' && situation.opponentBodyDamagePercent < 0.6) {
      return OffensiveSubState.BODY_WORK;
    }

    // Jab and move
    if (offensiveStyle === 'jab-and-move') {
      return OffensiveSubState.JABBING;
    }

    // Combo puncher - throw combinations
    if (offensiveStyle === 'combo-puncher') {
      return OffensiveSubState.COMBINATION;
    }

    // When opponent is hurt, all power punchers go for the kill
    if (situation.opponentIsHurt) {
      if (fighter.power.knockoutPower > 75 || offensiveStyle === 'headhunter') {
        return OffensiveSubState.POWER_SHOT;
      }
      // Others throw combinations to finish
      return OffensiveSubState.COMBINATION;
    }

    const primaryStyle = fighter.style?.primary;

    // Distance-based offense selection
    // At range: jab to close distance or set up
    if (situation.distance > situation.optimalRange + 1) {
      // Even power punchers need to jab to get in range
      if (Math.random() < 0.7) {
        return OffensiveSubState.JABBING;
      }
    }

    // Headhunter style - looks for big shots but still needs setup
    if (offensiveStyle === 'headhunter') {
      const roll = Math.random();
      if (roll < 0.35) {
        return OffensiveSubState.POWER_SHOT;  // Load up
      } else if (roll < 0.65) {
        return OffensiveSubState.COMBINATION; // Combos ending with power
      }
      return OffensiveSubState.JABBING;        // Set up shots
    }

    // Slugger style - mix of jabs and power, picks moments for bombs
    // Sluggers should throw more power than out-boxers, but still use jabs to set up
    if (primaryStyle === 'slugger') {
      const roll = Math.random();
      if (roll < 0.40) {
        return OffensiveSubState.POWER_SHOT;  // Loading up big shot (40%)
      } else if (roll < 0.70) {
        return OffensiveSubState.COMBINATION; // Combos (30%)
      }
      return OffensiveSubState.JABBING;        // Jab to set up (30%)
    }

    // Inside fighter - combinations and body work at close range
    if (primaryStyle === 'inside-fighter') {
      if (situation.distance < 2) {
        return Math.random() < 0.6 ? OffensiveSubState.COMBINATION : OffensiveSubState.BODY_WORK;
      }
      return OffensiveSubState.JABBING;  // Close distance first
    }

    // Default - jab to set up (for out-boxers and neutral styles)
    if (situation.distance > situation.optimalRange) {
      return OffensiveSubState.JABBING;
    }

    // Close range - combinations
    return OffensiveSubState.COMBINATION;
  }

  /**
   * Decide defensive sub-state
   */
  decideDefensiveSubState(fighter, opponent, situation) {
    const defenseStyle = fighter.style.defensive;

    switch (defenseStyle) {
      case 'peek-a-boo':
        return DefensiveSubState.HIGH_GUARD;

      case 'philly-shell':
        if (fighter.defense.shoulderRoll > 60) {
          return DefensiveSubState.PHILLY_SHELL;
        }
        return DefensiveSubState.HIGH_GUARD;

      case 'high-guard':
        return DefensiveSubState.HIGH_GUARD;

      case 'slick':
        if (fighter.defense.headMovement > 70) {
          return DefensiveSubState.HEAD_MOVEMENT;
        }
        return DefensiveSubState.HIGH_GUARD;

      case 'distance':
        return DefensiveSubState.DISTANCE;

      default:
        // Use best defense based on attributes
        if (fighter.defense.headMovement > fighter.defense.blocking) {
          return DefensiveSubState.HEAD_MOVEMENT;
        }
        return DefensiveSubState.HIGH_GUARD;
    }
  }

  /**
   * Decide movement sub-state
   */
  decideMovementSubState(fighter, opponent, situation) {
    // Need to close distance
    if (situation.distance > situation.optimalRange + 1) {
      return MovementSubState.CUTTING_OFF;
    }

    // Too close - retreat
    if (situation.distance < situation.optimalRange - 1) {
      return MovementSubState.RETREATING;
    }

    // In corner or on ropes - circle out
    if (situation.inCorner || situation.onRopes) {
      return MovementSubState.CIRCLING;
    }

    // Default - circle to create angles
    return MovementSubState.CIRCLING;
  }

  /**
   * Decide action based on state
   */
  decideAction(fighter, opponent, state, subState, situation, memory) {
    switch (state) {
      case FighterState.OFFENSIVE:
        return this.decideOffensiveAction(fighter, opponent, subState, situation, memory);

      case FighterState.DEFENSIVE:
        return this.decideDefensiveAction(fighter, opponent, subState, situation);

      case FighterState.TIMING:
        return this.decideTimingAction(fighter, opponent, situation);

      case FighterState.MOVING:
        return this.decideMovementAction(fighter, opponent, subState, situation);

      case FighterState.CLINCH:
        return { type: ActionType.CLINCH };

      case FighterState.NEUTRAL:
        return { type: ActionType.WAIT };

      default:
        return { type: ActionType.WAIT };
    }
  }

  /**
   * Decide offensive action
   */
  decideOffensiveAction(fighter, opponent, subState, situation, memory) {
    // Check if in range
    if (situation.distance > situation.optimalRange + 2) {
      return { type: ActionType.MOVE, direction: 'forward' };
    }

    // Get punch weights from style
    const styleWeights = STYLE_WEIGHTS[fighter.style.primary] || STYLE_WEIGHTS['boxer-puncher'];
    const punchWeights = { ...styleWeights.punchWeights };

    // Modify weights based on sub-state
    switch (subState) {
      case OffensiveSubState.JABBING:
        punchWeights[PunchType.JAB] *= 2.0;
        punchWeights[PunchType.BODY_JAB] *= 1.5;
        break;

      case OffensiveSubState.POWER_SHOT:
        punchWeights[PunchType.CROSS] *= 2.0;
        punchWeights[PunchType.REAR_HOOK] *= 1.8;
        punchWeights[PunchType.REAR_UPPERCUT] *= 1.5;
        punchWeights[PunchType.JAB] *= 0.3;
        break;

      case OffensiveSubState.BODY_WORK:
        punchWeights[PunchType.BODY_JAB] *= 2.0;
        punchWeights[PunchType.BODY_CROSS] *= 2.0;
        punchWeights[PunchType.BODY_HOOK_LEAD] *= 2.0;
        punchWeights[PunchType.BODY_HOOK_REAR] *= 2.0;
        break;

      case OffensiveSubState.COMBINATION:
        // Combinations handled separately
        return this.generateCombination(fighter, opponent, situation);
    }

    // Modify weights based on distance
    if (situation.distance < 3) {
      // Inside - favor hooks and uppercuts
      punchWeights[PunchType.LEAD_HOOK] *= 1.5;
      punchWeights[PunchType.REAR_HOOK] *= 1.5;
      punchWeights[PunchType.LEAD_UPPERCUT] *= 1.5;
      punchWeights[PunchType.REAR_UPPERCUT] *= 1.5;
      punchWeights[PunchType.JAB] *= 0.5;
      punchWeights[PunchType.CROSS] *= 0.7;
    } else if (situation.distance > 4.5) {
      // Long range - favor jab
      punchWeights[PunchType.JAB] *= 1.5;
      punchWeights[PunchType.LEAD_HOOK] *= 0.5;
      punchWeights[PunchType.REAR_HOOK] *= 0.5;
    }

    // Select punch type
    const punchType = this.weightedSelect(punchWeights);

    return {
      type: ActionType.PUNCH,
      punchType,
      target: this.getPunchTarget(punchType)
    };
  }

  /**
   * Generate a combination
   */
  generateCombination(fighter, opponent, situation) {
    const comboPunches = [];
    const comboLength = 2 + Math.floor(Math.random() * 3); // 2-4 punches

    // Start with jab or lead hook
    if (situation.distance > 3.5) {
      comboPunches.push(PunchType.JAB);
    } else {
      comboPunches.push(Math.random() > 0.5 ? PunchType.JAB : PunchType.LEAD_HOOK);
    }

    // Add follow-up punches
    for (let i = 1; i < comboLength; i++) {
      const lastPunch = comboPunches[i - 1];

      // Logical follow-ups
      if (lastPunch === PunchType.JAB) {
        comboPunches.push(this.selectFrom([
          PunchType.CROSS,
          PunchType.JAB,
          PunchType.LEAD_HOOK,
          PunchType.BODY_CROSS
        ]));
      } else if (lastPunch === PunchType.CROSS) {
        comboPunches.push(this.selectFrom([
          PunchType.LEAD_HOOK,
          PunchType.BODY_HOOK_LEAD,
          PunchType.JAB
        ]));
      } else if (lastPunch === PunchType.LEAD_HOOK) {
        comboPunches.push(this.selectFrom([
          PunchType.CROSS,
          PunchType.REAR_HOOK,
          PunchType.REAR_UPPERCUT
        ]));
      } else {
        comboPunches.push(this.selectFrom([
          PunchType.JAB,
          PunchType.LEAD_HOOK,
          PunchType.CROSS
        ]));
      }
    }

    return {
      type: ActionType.PUNCH,
      punchType: 'combination',
      combination: comboPunches,
      target: 'head'
    };
  }

  /**
   * Decide defensive action
   */
  decideDefensiveAction(fighter, opponent, subState, situation) {
    // If opponent is offensive, we need to defend
    if (opponent.state === FighterState.OFFENSIVE) {
      switch (subState) {
        case DefensiveSubState.HIGH_GUARD:
          return { type: ActionType.BLOCK, blockType: 'high_guard' };

        case DefensiveSubState.PHILLY_SHELL:
          return { type: ActionType.BLOCK, blockType: 'philly_shell' };

        case DefensiveSubState.HEAD_MOVEMENT:
          return {
            type: ActionType.EVADE,
            evadeType: this.selectFrom(['slip', 'duck', 'lean'])
          };

        case DefensiveSubState.DISTANCE:
          return { type: ActionType.MOVE, direction: 'backward' };

        case DefensiveSubState.PARRYING:
          return { type: ActionType.BLOCK, blockType: 'parry' };
      }
    }

    // Not under attack - wait and observe
    return { type: ActionType.WAIT };
  }

  /**
   * Decide timing/counter action
   */
  decideTimingAction(fighter, opponent, situation) {
    // Looking for counter opportunity
    if (opponent.state === FighterState.OFFENSIVE) {
      // Opponent is attacking - counter!
      const counterPunch = this.selectFrom([
        PunchType.CROSS,
        PunchType.LEAD_HOOK,
        PunchType.REAR_UPPERCUT
      ]);

      return {
        type: ActionType.PUNCH,
        punchType: counterPunch,
        target: 'head',
        isCounter: true
      };
    }

    // Wait for opening
    return { type: ActionType.WAIT };
  }

  /**
   * Decide movement action
   */
  decideMovementAction(fighter, opponent, subState, situation) {
    switch (subState) {
      case MovementSubState.CUTTING_OFF:
        return { type: ActionType.MOVE, direction: 'forward', cutting: true };

      case MovementSubState.CIRCLING:
        const direction = Math.random() > 0.5 ? 'left' : 'right';
        return { type: ActionType.MOVE, direction, lateral: true };

      case MovementSubState.RETREATING:
        return { type: ActionType.MOVE, direction: 'backward' };

      default:
        return { type: ActionType.MOVE, direction: 'forward' };
    }
  }

  /**
   * Get target for a punch
   */
  getPunchTarget(punchType) {
    if (punchType.includes('body')) {
      return 'body';
    }
    return 'head';
  }

  /**
   * Weighted random selection
   */
  weightedSelect(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

    let random = Math.random() * total;

    for (const [key, weight] of entries) {
      random -= weight;
      if (random <= 0) {
        return key;
      }
    }

    return entries[0][0];
  }

  /**
   * Select from array
   */
  selectFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Update fighter memory for learning
   */
  updateMemory(memory, situation, action) {
    // Track last actions
    memory.lastActions.push({
      action,
      situation: {
        distance: situation.distance,
        opponentState: situation.opponentState
      }
    });

    // Keep last 20 actions
    if (memory.lastActions.length > 20) {
      memory.lastActions.shift();
    }

    // Track opponent patterns
    if (situation.opponentState) {
      if (!memory.opponentPatterns[situation.opponentState]) {
        memory.opponentPatterns[situation.opponentState] = 0;
      }
      memory.opponentPatterns[situation.opponentState]++;
    }
  }

  /**
   * Reset memory for new fight
   */
  resetMemory(fighterId) {
    this.fighterMemory.delete(fighterId);
  }
}

export default FighterAI;
