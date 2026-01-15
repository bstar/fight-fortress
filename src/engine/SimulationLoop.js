/**
 * Simulation Loop
 * The core engine that drives the fight simulation
 */

import { FightStatus, StoppageType } from '../models/Fight.js';
import { FighterState } from '../models/Fighter.js';
import { EventEmitter } from 'events';
import { FightRenderer } from '../display/FightRenderer.js';
import { FightEffectsManager } from './FightEffectsManager.js';

export class SimulationLoop extends EventEmitter {
  constructor(fight, options = {}) {
    super();

    this.fight = fight;
    this.options = {
      tickRate: options.tickRate || 0.5,       // Seconds per tick
      speedMultiplier: options.speedMultiplier || 1.0,
      realTime: options.realTime !== false,    // Run in real time with delays
      maxTicksPerFrame: options.maxTicksPerFrame || 10,
      enableRenderer: options.enableRenderer !== false,
      compactDisplay: options.compactDisplay || false,
      enableLogging: options.enableLogging !== false,
      logDir: options.logDir || './logs'
    };

    // Component references (will be injected)
    this.fighterAI = null;
    this.combatResolver = null;
    this.damageCalculator = null;
    this.staminaManager = null;
    this.positionTracker = null;

    // Display renderer
    this.renderer = options.enableRenderer !== false ? new FightRenderer({
      compactMode: this.options.compactDisplay,
      enableLogging: this.options.enableLogging,
      logDir: this.options.logDir,
      clearScreen: false  // Disable clear screen in tick mode
    }) : null;

    // TUI reference for round prompts
    this.tui = null;

    // Fight effects manager for buffs/debuffs
    this.effectsManager = new FightEffectsManager();

    // Simulation state
    this.isRunning = false;
    this.isPaused = false;
    this.tickCount = 0;
    this.lastTickTime = 0;

    // Pending actions from AI decisions
    this.pendingActions = {
      A: null,
      B: null
    };
  }

  /**
   * Inject dependencies
   */
  setComponents({ fighterAI, combatResolver, damageCalculator, staminaManager, positionTracker }) {
    this.fighterAI = fighterAI;
    this.combatResolver = combatResolver;
    this.damageCalculator = damageCalculator;
    this.staminaManager = staminaManager;
    this.positionTracker = positionTracker;

    // Wire up effectsManager to components that need it
    if (this.fighterAI) {
      this.fighterAI.setEffectsManager(this.effectsManager);
    }
    if (this.combatResolver) {
      this.combatResolver.setEffectsManager(this.effectsManager);
    }
  }

  /**
   * Set TUI reference for round prompts
   */
  setTUI(tui) {
    this.tui = tui;
  }

  /**
   * Start the simulation
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;

    // Initialize renderer
    if (this.renderer) {
      this.renderer.initialize(this.fight);
      this.setupRendererEvents();
    }

    // Start the fight if not already started
    if (this.fight.status === FightStatus.NOT_STARTED) {
      // Run the intro sequence before starting
      if (this.options.realTime) {
        await this.runIntroSequence();
      }

      this.fight.start();

      const fightStartEvent = {
        type: 'FIGHT_START',
        fighterA: this.fight.fighterA.name,
        fighterB: this.fight.fighterB.name,
        config: this.fight.config
      };

      this.emit('fightStart', fightStartEvent);
      this.renderEvent(fightStartEvent);

      // Pre-fight intimidation check - staredown in the ring
      // Intimidating fighters can mentally damage opponents before the bell
      this.applyPreFightIntimidation();

      // Small pause before round 1 starts
      if (this.options.realTime) {
        await this.sleep(1500 / this.options.speedMultiplier);
      }

      // Initialize effects manager for round 1
      this.effectsManager.resetForRound();

      // Emit round 1 start
      const roundStartEvent = {
        type: 'ROUND_START',
        round: 1
      };
      this.emit('roundStart', roundStartEvent);
      this.renderEvent(roundStartEvent);
    }

    // Initialize positions
    if (this.positionTracker) {
      this.positionTracker.initializePositions(this.fight.fighterA, this.fight.fighterB);
    }

    // Main simulation loop
    await this.runLoop();
  }

  /**
   * Apply pre-fight intimidation effects
   * Intimidating fighters (like Tyson) can mentally damage opponents before the bell
   * But fighters with elite heart (like Holyfield) are immune
   */
  applyPreFightIntimidation() {
    const fighterA = this.fight.fighterA;
    const fighterB = this.fight.fighterB;

    // Fighter A tries to intimidate Fighter B
    const aIntimidation = fighterA.mental?.intimidation || 50;
    const bHeart = fighterB.mental?.heart || 70;
    const bExperience = fighterB.mental?.experience || 70;

    const aIntimidatedB = this.effectsManager.onIntimidation(
      'B',
      aIntimidation,
      bHeart,
      bExperience
    );

    if (aIntimidatedB) {
      this.emit('intimidation', {
        type: 'INTIMIDATION',
        intimidator: fighterA.name,
        intimidated: fighterB.name,
        message: `${fighterB.name} looks nervous facing ${fighterA.name}`
      });
    }

    // Fighter B tries to intimidate Fighter A
    const bIntimidation = fighterB.mental?.intimidation || 50;
    const aHeart = fighterA.mental?.heart || 70;
    const aExperience = fighterA.mental?.experience || 70;

    const bIntimidatedA = this.effectsManager.onIntimidation(
      'A',
      bIntimidation,
      aHeart,
      aExperience
    );

    if (bIntimidatedA) {
      this.emit('intimidation', {
        type: 'INTIMIDATION',
        intimidator: fighterB.name,
        intimidated: fighterA.name,
        message: `${fighterA.name} looks nervous facing ${fighterB.name}`
      });
    }

    // Apply big fight mentality - fighters with high clutchFactor rise vs elite opponents
    // Lewis would elevate for big fights like Holyfield, Tyson but coast vs lesser opponents
    const aRoseUp = this.effectsManager.applyBigFightMentality('A', fighterA, fighterB);
    if (aRoseUp) {
      this.emit('bigFight', {
        type: 'BIG_FIGHT',
        fighter: fighterA.name,
        opponent: fighterB.name,
        message: `${fighterA.name} looks locked in for this big fight against ${fighterB.name}`
      });
    }

    const bRoseUp = this.effectsManager.applyBigFightMentality('B', fighterB, fighterA);
    if (bRoseUp) {
      this.emit('bigFight', {
        type: 'BIG_FIGHT',
        fighter: fighterB.name,
        opponent: fighterA.name,
        message: `${fighterB.name} looks locked in for this big fight against ${fighterA.name}`
      });
    }

    // Apply fast start buff - explosive fighters like Tyson come out blazing in early rounds
    const aFastStart = this.effectsManager.applyFastStart('A', fighterA);
    if (aFastStart) {
      this.emit('fastStart', {
        type: 'FAST_START',
        fighter: fighterA.name,
        message: `${fighterA.name} looks ready to explode out of the gate!`
      });
    }

    const bFastStart = this.effectsManager.applyFastStart('B', fighterB);
    if (bFastStart) {
      this.emit('fastStart', {
        type: 'FAST_START',
        fighter: fighterB.name,
        message: `${fighterB.name} looks ready to explode out of the gate!`
      });
    }
  }

  /**
   * Run the pre-fight intro sequence
   */
  async runIntroSequence() {
    const fighterA = this.fight.fighterA;
    const fighterB = this.fight.fighterB;

    // Venue announcement
    const venueEvent = {
      type: 'INTRO_VENUE',
      rounds: this.fight.config.rounds,
      fightType: this.fight.config.type
    };
    this.emit('introVenue', venueEvent);
    this.renderEvent(venueEvent);
    await this.sleep(3000 / this.options.speedMultiplier);

    // Fighter A intro
    const fighterAIntro = {
      type: 'INTRO_FIGHTER',
      fighter: 'A',
      name: fighterA.name,
      nickname: fighterA.nickname,
      record: fighterA.record,
      physical: fighterA.physical,
      style: fighterA.style,
      hometown: fighterA.hometown,
      nationality: fighterA.nationality
    };
    this.emit('introFighter', fighterAIntro);
    this.renderEvent(fighterAIntro);
    await this.sleep(4000 / this.options.speedMultiplier);

    // Fighter B intro
    const fighterBIntro = {
      type: 'INTRO_FIGHTER',
      fighter: 'B',
      name: fighterB.name,
      nickname: fighterB.nickname,
      record: fighterB.record,
      physical: fighterB.physical,
      style: fighterB.style,
      hometown: fighterB.hometown,
      nationality: fighterB.nationality
    };
    this.emit('introFighter', fighterBIntro);
    this.renderEvent(fighterBIntro);
    await this.sleep(4000 / this.options.speedMultiplier);

    // Matchup analysis
    const matchupEvent = {
      type: 'INTRO_MATCHUP',
      fighterA: {
        name: fighterA.name,
        style: fighterA.style,
        physical: fighterA.physical,
        power: fighterA.power,
        speed: fighterA.speed
      },
      fighterB: {
        name: fighterB.name,
        style: fighterB.style,
        physical: fighterB.physical,
        power: fighterB.power,
        speed: fighterB.speed
      }
    };
    this.emit('introMatchup', matchupEvent);
    this.renderEvent(matchupEvent);
    await this.sleep(4000 / this.options.speedMultiplier);

    // Final instructions
    const instructionsEvent = {
      type: 'INTRO_INSTRUCTIONS'
    };
    this.emit('introInstructions', instructionsEvent);
    this.renderEvent(instructionsEvent);
    await this.sleep(2500 / this.options.speedMultiplier);
  }

  /**
   * Setup renderer event connections
   */
  setupRendererEvents() {
    // The renderer handles events directly via renderEvent calls
    // This ensures proper sequencing of render operations
  }

  /**
   * Send event to renderer
   */
  renderEvent(event) {
    if (!this.renderer) return;

    const fightState = {
      fighterA: this.getFighterState('A'),
      fighterB: this.getFighterState('B'),
      positions: this.positionTracker ? {
        A: { ...this.fight.fighterA.position },
        B: { ...this.fight.fighterB.position },
        distance: this.positionTracker.getDistance()
      } : {
        A: { x: 8, y: 10 },
        B: { x: 12, y: 10 },
        distance: 4
      },
      currentRound: this.fight.currentRound,
      roundTime: this.fight.roundTime
    };

    this.renderer.handleEvent(event, fightState);
  }

  /**
   * Pause the simulation
   */
  pause() {
    this.isPaused = true;
    this.emit('pause');
  }

  /**
   * Resume the simulation
   */
  resume() {
    this.isPaused = false;
    this.emit('resume');
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
    this.emit('stop');
  }

  /**
   * Set simulation speed
   */
  setSpeed(multiplier) {
    this.options.speedMultiplier = Math.max(0.1, Math.min(10, multiplier));
    this.emit('speedChange', this.options.speedMultiplier);
  }

  /**
   * Main simulation loop
   */
  async runLoop() {
    while (this.isRunning && !this.fight.isOver()) {
      // Handle pause
      if (this.isPaused) {
        await this.sleep(100);
        continue;
      }

      const tickStart = Date.now();

      // Process fight based on status
      switch (this.fight.status) {
        case FightStatus.IN_PROGRESS:
          await this.processFightTick();
          break;

        case FightStatus.BETWEEN_ROUNDS:
          await this.processRestPeriod();
          break;

        default:
          break;
      }

      // Calculate delay for real-time simulation
      if (this.options.realTime) {
        const tickDuration = this.options.tickRate * 1000 / this.options.speedMultiplier;
        const elapsed = Date.now() - tickStart;
        const delay = Math.max(0, tickDuration - elapsed);

        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    // Fight is over
    const fightEndEvent = {
      type: 'FIGHT_END',
      ...this.fight.result,
      scorecards: this.fight.result?.scorecards?.map(s => `${s.A}-${s.B}`) || []
    };
    this.emit('fightEnd', fightEndEvent);
    this.renderEvent(fightEndEvent);
  }

  /**
   * Process a single tick of the fight
   */
  async processFightTick() {
    const round = this.fight.getCurrentRound();
    if (!round) return;

    // Update time
    this.fight.totalTime += this.options.tickRate;
    this.fight.roundTime += this.options.tickRate;
    round.tick(this.options.tickRate);
    this.tickCount++;

    // Check for round end
    if (round.isComplete) {
      await this.handleRoundEnd();
      return;
    }

    // Get AI decisions for both fighters
    const decisionA = this.getAIDecision('A');
    const decisionB = this.getAIDecision('B');

    // Process state updates
    this.processStateUpdates(decisionA, decisionB);

    // Resolve combat interactions
    const combatResult = this.resolveCombat(decisionA, decisionB);

    // Apply damage
    if (combatResult.hits.length > 0) {
      await this.applyDamage(combatResult);
    }

    // Update stamina
    this.updateStamina(decisionA, decisionB);

    // Update positions
    this.updatePositions(decisionA, decisionB);

    // Check for knockdown
    if (combatResult.knockdown) {
      await this.handleKnockdown(combatResult.knockdown);
    }

    // Check for TKO conditions
    await this.checkTKOConditions();

    // Update stun state (decrement stun duration)
    this.fight.fighterA.updateStun(this.options.tickRate);
    this.fight.fighterB.updateStun(this.options.tickRate);

    // Update buzzed state (decrement buzzed duration)
    this.fight.fighterA.updateBuzzed();
    this.fight.fighterB.updateBuzzed();

    // Update modified attributes (after buffs/debuffs)
    this.fight.fighterA.updateModifiedAttributes();
    this.fight.fighterB.updateModifiedAttributes();

    // Tick the effects manager (update effect durations)
    this.effectsManager.tick();

    // Check for stamina-based effects
    const staminaA = this.fight.fighterA.getStaminaPercent();
    const staminaB = this.fight.fighterB.getStaminaPercent();
    if (staminaA < 0.3) this.effectsManager.onStaminaLow('A', staminaA);
    if (staminaB < 0.3) this.effectsManager.onStaminaLow('B', staminaB);

    // Check for second wind in late rounds
    if (round.number >= this.fight.config.rounds - 2) {
      this.effectsManager.checkSecondWind('A', this.fight.fighterA, round.number, this.fight.config.rounds);
      this.effectsManager.checkSecondWind('B', this.fight.fighterB, round.number, this.fight.config.rounds);
    }

    // Check for focus lapses - fighters with low focus attribute have momentary vulnerabilities
    this.effectsManager.checkFocusLapse('A', this.fight.fighterA);
    this.effectsManager.checkFocusLapse('B', this.fight.fighterB);

    // Emit tick event
    const tickEvent = {
      type: 'TICK',
      round: round.number,
      roundTime: round.currentTime,
      totalTime: this.fight.totalTime,
      fighterA: this.getFighterState('A'),
      fighterB: this.getFighterState('B'),
      positions: this.positionTracker ? {
        A: { ...this.fight.fighterA.position },
        B: { ...this.fight.fighterB.position },
        distance: this.positionTracker.getDistance()
      } : {
        A: { x: -4, y: 0 },
        B: { x: 4, y: 0 },
        distance: 8
      },
      actions: combatResult.actions
    };
    this.emit('tick', tickEvent);
    this.renderEvent(tickEvent);

    // 10-second warning
    if (round.duration - round.currentTime <= 10 &&
        round.duration - round.currentTime > 10 - this.options.tickRate) {
      this.emit('tenSecondWarning', { round: round.number });
    }
  }

  /**
   * Get AI decision for a fighter
   */
  getAIDecision(fighterId) {
    const fighter = this.fight.getFighter(fighterId);
    const opponent = this.fight.getOpponent(fighterId);

    if (!this.fighterAI) {
      // Fallback to basic decision
      return {
        state: fighter.state,
        subState: fighter.subState,
        action: null,
        target: null
      };
    }

    return this.fighterAI.decide(fighter, opponent, this.fight);
  }

  /**
   * Process state updates based on AI decisions
   */
  processStateUpdates(decisionA, decisionB) {
    const fighterA = this.fight.fighterA;
    const fighterB = this.fight.fighterB;

    // Update states if changed
    if (decisionA.state !== fighterA.state || decisionA.subState !== fighterA.subState) {
      fighterA.transitionTo(decisionA.state, decisionA.subState);
      this.emit('stateChange', { fighter: 'A', state: decisionA.state, subState: decisionA.subState });
    }

    if (decisionB.state !== fighterB.state || decisionB.subState !== fighterB.subState) {
      fighterB.transitionTo(decisionB.state, decisionB.subState);
      this.emit('stateChange', { fighter: 'B', state: decisionB.state, subState: decisionB.subState });
    }

    // Store pending actions
    this.pendingActions.A = decisionA.action;
    this.pendingActions.B = decisionB.action;
  }

  /**
   * Resolve combat interactions
   */
  resolveCombat(decisionA, decisionB) {
    if (!this.combatResolver) {
      return { hits: [], actions: [], knockdown: null, misses: [], blocks: [], evades: [] };
    }

    const result = this.combatResolver.resolve(
      this.fight.fighterA,
      this.fight.fighterB,
      decisionA,
      decisionB,
      this.fight
    );

    // Record all punches thrown (regardless of outcome)
    const round = this.fight.getCurrentRound();
    if (round) {
      this.recordPunchesThrown(result, round);
    }

    return result;
  }

  /**
   * Record all punches thrown from combat result
   */
  recordPunchesThrown(combatResult, round) {
    // Record all attempts - hits, misses, blocks, evades
    const allAttempts = [
      ...combatResult.hits,
      ...combatResult.misses,
      ...combatResult.blocks,
      ...combatResult.evades
    ];

    for (const attempt of allAttempts) {
      const isBody = attempt.location === 'body' || attempt.punchType?.includes('body');
      const isJab = attempt.punchType === 'jab' || attempt.punchType === 'body_jab';

      round.recordPunchThrown(attempt.attacker, attempt.punchType, isBody);

      // Also update fighter stats
      const attacker = this.fight.getFighter(attempt.attacker);
      if (attacker) {
        attacker.roundStats.punchesThrown = (attacker.roundStats.punchesThrown || 0) + 1;
        attacker.fightStats.punchesThrown = (attacker.fightStats.punchesThrown || 0) + 1;

        // Track jabs vs power punches
        if (isJab) {
          attacker.roundStats.jabsThrown = (attacker.roundStats.jabsThrown || 0) + 1;
          attacker.fightStats.jabsThrown = (attacker.fightStats.jabsThrown || 0) + 1;
        } else {
          attacker.roundStats.powerPunchesThrown = (attacker.roundStats.powerPunchesThrown || 0) + 1;
          attacker.fightStats.powerPunchesThrown = (attacker.fightStats.powerPunchesThrown || 0) + 1;
        }

        // Track body punches
        if (isBody) {
          attacker.roundStats.bodyPunchesThrown = (attacker.roundStats.bodyPunchesThrown || 0) + 1;
          attacker.fightStats.bodyPunchesThrown = (attacker.fightStats.bodyPunchesThrown || 0) + 1;
        }
      }
    }
  }

  /**
   * Apply damage from combat
   */
  async applyDamage(combatResult) {
    const round = this.fight.getCurrentRound();

    for (const hit of combatResult.hits) {
      const target = this.fight.getFighter(hit.target);
      const attacker = this.fight.getFighter(hit.attacker);

      // Calculate damage
      let damage = hit.damage;
      if (this.damageCalculator) {
        damage = this.damageCalculator.calculateDamage(hit, attacker, target);
      }

      // Apply damage
      target.takeDamage(damage, hit.location);

      // Record stats
      const isJab = hit.punchType === 'jab' || hit.punchType === 'body_jab';
      const isBody = hit.location === 'body' || hit.punchType?.includes('body');

      round.recordPunchLanded(hit.attacker, hit.punchType, hit.quality, damage, isBody);
      attacker.roundStats.punchesLanded++;
      attacker.roundStats.damageDealt += damage;
      attacker.fightStats.punchesLanded++;
      attacker.fightStats.damageDealt += damage;

      // Track jabs vs power punches landed
      if (isJab) {
        attacker.roundStats.jabsLanded = (attacker.roundStats.jabsLanded || 0) + 1;
        attacker.fightStats.jabsLanded = (attacker.fightStats.jabsLanded || 0) + 1;
      } else {
        attacker.roundStats.powerPunchesLanded = (attacker.roundStats.powerPunchesLanded || 0) + 1;
        attacker.fightStats.powerPunchesLanded = (attacker.fightStats.powerPunchesLanded || 0) + 1;
      }

      // Track body punches landed
      if (isBody) {
        attacker.roundStats.bodyPunchesLanded = (attacker.roundStats.bodyPunchesLanded || 0) + 1;
        attacker.fightStats.bodyPunchesLanded = (attacker.fightStats.bodyPunchesLanded || 0) + 1;
      }

      // Emit hit event
      const punchEvent = {
        type: 'PUNCH_LANDED',
        attacker: hit.attacker,
        target: hit.target,
        punchType: hit.punchType,
        location: hit.location,
        damage,
        quality: hit.quality,
        isCounter: hit.isCounter || false,
        round: round.number,
        roundTime: round.currentTime
      };
      this.emit('punchLanded', punchEvent);
      this.renderEvent(punchEvent);

      // Trigger effects manager for punch landed
      const attackerId = hit.attacker;
      const defenderId = hit.target;
      this.effectsManager.onPunchLanded(attackerId, defenderId, {
        damage,
        punchType: hit.punchType,
        isCounter: hit.isCounter || false,
        isCritical: damage > 15
      });

      // Check for cut
      if (hit.location === 'head' && damage > 15 && Math.random() < 0.1) {
        const cutLocation = this.determineCutLocation();
        target.addCut(cutLocation, 1);
        const cutEvent = {
          type: 'CUT',
          fighter: hit.target,
          location: cutLocation,
          severity: 1,
          round: round.number
        };
        this.emit('cut', cutEvent);
        this.renderEvent(cutEvent);
      }

      // Apply stun from significant hits (3+ damage causes stun with new scale)
      if (hit.causedStun || damage >= 3) {
        target.applyStun(damage, hit.punchType);
      }

      // Check for buzzed state (medium damage hits)
      // Buzzed triggers on 3-5 damage, less severe than hurt but fighter must recover
      if (!target.isHurt && !target.isBuzzed && damage >= 3 && damage < 6 && hit.location === 'head') {
        // Probability increases with damage
        const buzzChance = (damage - 2) * 0.15 + (1 - target.mental.chin / 150);
        if (Math.random() < buzzChance) {
          target.setBuzzed(damage, hit.punchType);
          const buzzedEvent = {
            type: 'BUZZED',
            fighter: hit.target,
            duration: target.buzzedDuration,
            severity: target.buzzedSeverity,
            round: round.number
          };
          this.emit('buzzed', buzzedEvent);
          this.renderEvent(buzzedEvent);
        }
      }

      // Check for hurt state (higher damage threshold)
      if (this.damageCalculator?.checkHurt(target, damage)) {
        // Clear buzzed if becoming hurt (hurt supersedes buzzed)
        if (target.isBuzzed) {
          target.clearBuzzed();
        }
        target.setHurt(3 + Math.random() * 3);
        const hurtEvent = {
          type: 'HURT',
          fighter: hit.target,
          duration: target.hurtDuration,
          round: round.number
        };
        this.emit('hurt', hurtEvent);
        this.renderEvent(hurtEvent);

        // Trigger effects manager for hurt
        const opponentId = hit.target === 'A' ? 'B' : 'A';
        this.effectsManager.onFighterHurt(hit.target, opponentId, { damage });
      }
    }
  }

  /**
   * Determine cut location
   */
  determineCutLocation() {
    const locations = ['left_eyebrow', 'right_eyebrow', 'left_eye', 'right_eye', 'nose', 'lip'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  /**
   * Update stamina for both fighters
   */
  updateStamina(decisionA, decisionB) {
    if (!this.staminaManager) {
      // Basic stamina update
      this.basicStaminaUpdate(this.fight.fighterA, decisionA);
      this.basicStaminaUpdate(this.fight.fighterB, decisionB);
      return;
    }

    this.staminaManager.update(this.fight.fighterA, decisionA, this.options.tickRate);
    this.staminaManager.update(this.fight.fighterB, decisionB, this.options.tickRate);
  }

  /**
   * Basic stamina update (fallback)
   */
  basicStaminaUpdate(fighter, decision) {
    // Cost for offensive actions
    if (decision.action && decision.action.type === 'punch') {
      fighter.spendStamina(2);
    }

    // Passive recovery in defensive states
    if (fighter.state === FighterState.DEFENSIVE || fighter.state === FighterState.NEUTRAL) {
      fighter.recoverStamina(0.2);
    }
  }

  /**
   * Update positions for both fighters
   */
  updatePositions(decisionA, decisionB) {
    if (!this.positionTracker) return;

    this.positionTracker.update(
      this.fight.fighterA,
      this.fight.fighterB,
      decisionA,
      decisionB,
      this.options.tickRate
    );

    // Track position-based stats for scoring
    const round = this.fight.getCurrentRound();
    if (round) {
      const tickTime = this.options.tickRate;

      // Track rope time (pass fighter objects, not IDs)
      if (this.positionTracker.isOnRopes(this.fight.fighterA)) {
        round.stats.A.ropeTime += tickTime;
      }
      if (this.positionTracker.isOnRopes(this.fight.fighterB)) {
        round.stats.B.ropeTime += tickTime;
      }

      // Track corner time
      if (this.positionTracker.isInCorner(this.fight.fighterA)) {
        round.stats.A.cornerTime += tickTime;
      }
      if (this.positionTracker.isInCorner(this.fight.fighterB)) {
        round.stats.B.cornerTime += tickTime;
      }

      // Track center control (who is closer to center)
      const centerControl = this.positionTracker.getCenterControl();
      if (centerControl === 'A') {
        round.stats.A.centerControlTime += tickTime;
      } else if (centerControl === 'B') {
        round.stats.B.centerControlTime += tickTime;
      }

      // Track forward/backward movement from decisions
      if (decisionA.action?.type === 'MOVE') {
        if (decisionA.action.direction === 'forward' || decisionA.action.cutting) {
          round.stats.A.forwardMovementTime += tickTime;
        } else if (decisionA.action.direction === 'backward' || decisionA.action.retreating) {
          round.stats.A.backwardMovementTime += tickTime;
        }
      }
      if (decisionB.action?.type === 'MOVE') {
        if (decisionB.action.direction === 'forward' || decisionB.action.cutting) {
          round.stats.B.forwardMovementTime += tickTime;
        } else if (decisionB.action.direction === 'backward' || decisionB.action.retreating) {
          round.stats.B.backwardMovementTime += tickTime;
        }
      }
    }

    // Emit position update
    this.emit('positionUpdate', {
      A: { ...this.fight.fighterA.position },
      B: { ...this.fight.fighterB.position },
      distance: this.positionTracker.getDistance()
    });
  }

  /**
   * Handle knockdown event
   * Supports regular knockdowns and flash knockdowns (fighter pops right back up)
   */
  async handleKnockdown(knockdown) {
    const round = this.fight.getCurrentRound();
    const fighter = this.fight.getFighter(knockdown.target);
    const attacker = this.fight.getFighter(knockdown.attacker);
    const isFlash = knockdown.flash === true;

    fighter.knockdownsThisRound++;
    fighter.knockdownsTotal++;
    attacker.fightStats.knockdownsScored++;
    fighter.fightStats.knockdownsSuffered++;

    // Transition to appropriate state
    fighter.transitionTo(isFlash ? FighterState.FLASH_DOWN : FighterState.KNOCKED_DOWN);

    const knockdownEvent = {
      type: isFlash ? 'FLASH_KNOCKDOWN' : 'KNOCKDOWN',
      fighter: knockdown.target,
      attacker: knockdown.attacker,
      punch: knockdown.punchType,
      round: round.number,
      time: round.currentTime,
      flash: isFlash
    };
    this.emit(isFlash ? 'flashKnockdown' : 'knockdown', knockdownEvent);
    this.renderEvent(knockdownEvent);

    // Trigger effects manager for knockdown
    this.effectsManager.onKnockdown(knockdown.target, knockdown.attacker, {
      punchType: knockdown.punchType,
      flash: isFlash
    });

    // Check for three knockdown rule
    if (this.fight.referee.rules.threeKnockdownRule && fighter.knockdownsThisRound >= 3) {
      this.fight.stopFight(StoppageType.TKO_THREE_KNOCKDOWNS, knockdown.attacker);
      return;
    }

    // Process count - flash knockdowns have quick recovery
    const recoveryResult = isFlash
      ? await this.processFlashKnockdown(fighter, knockdown)
      : await this.processKnockdownCount(fighter, knockdown);

    if (!recoveryResult.recovered) {
      // KO
      this.fight.stopFight(StoppageType.KO, knockdown.attacker);
    } else {
      // Fighter beats the count
      round.recordKnockdown(knockdown.target, knockdown.punchType, recoveryResult.count);
      fighter.transitionTo(FighterState.RECOVERED);

      const recoveryEvent = {
        type: 'RECOVERY',
        fighter: knockdown.target,
        count: recoveryResult.count,
        round: round.number,
        flash: isFlash
      };
      this.emit('recovery', recoveryEvent);
      this.renderEvent(recoveryEvent);

      // Trigger effects manager for recovery
      this.effectsManager.onRecovery(knockdown.target);

      // Apply post-knockdown debuff (lighter for flash knockdowns)
      fighter.addDebuff({
        type: 'post_knockdown',
        duration: isFlash ? 15 : 30,
        effects: {
          speed: isFlash ? -5 : -10,
          power: isFlash ? -3 : -5,
          defense: isFlash ? -8 : -15
        }
      });

      // Flash knockdowns should trigger buzzed state
      if (isFlash && !fighter.isHurt) {
        fighter.setBuzzed(3, knockdown.punchType);
      }
    }
  }

  /**
   * Process flash knockdown - fighter gets up very quickly (count 2-4)
   * Flash knockdowns are when a fighter gets caught but isn't truly hurt
   * HOWEVER - some fighters (low heart) can still fail to get up even from flash KDs
   */
  async processFlashKnockdown(fighter, knockdown) {
    const countSpeed = this.fight.referee.tendencies.countSpeed || 1.0;
    const heart = fighter.mental.heart;
    const chin = fighter.mental.chin;

    // CRITICAL: Flash knockdowns can still result in KO for fighters with low heart
    // Lennox Lewis (heart 82) historically never got up when knocked down
    // High heart fighters (90+) almost always get up from flash KDs
    // Low heart fighters (< 85) have real chance of staying down

    let flashRecoveryChance;
    if (heart >= 95) {
      flashRecoveryChance = 0.98; // Almost always get up
    } else if (heart >= 90) {
      flashRecoveryChance = 0.92; // Very likely to get up
    } else if (heart >= 85) {
      flashRecoveryChance = 0.80; // Usually get up
    } else if (heart >= 80) {
      flashRecoveryChance = 0.55; // Coin flip
    } else if (heart >= 75) {
      flashRecoveryChance = 0.35; // Unlikely
    } else {
      flashRecoveryChance = 0.20; // Rarely gets up
    }

    // Prior knockdowns in fight reduce recovery chance
    const priorKnockdowns = fighter.knockdownsThisRound + (fighter.totalKnockdowns || 0);
    if (priorKnockdowns >= 2) {
      flashRecoveryChance *= 0.5; // Each additional KD makes it harder
    } else if (priorKnockdowns >= 1) {
      flashRecoveryChance *= 0.75;
    }

    // Accumulated damage reduces chance
    const damagePercent = fighter.getHeadDamagePercent?.() || 0;
    if (damagePercent > 0.5) {
      flashRecoveryChance *= 0.6;
    } else if (damagePercent > 0.3) {
      flashRecoveryChance *= 0.8;
    }

    // Roll for recovery
    if (Math.random() > flashRecoveryChance) {
      // Fighter doesn't get up - flash KD becomes a real KO
      // Count to 10 dramatically
      for (let i = 1; i <= 10; i++) {
        this.emit('count', { fighter: knockdown.target, count: i });
        if (this.options.realTime) {
          await this.sleep(countSpeed * 1000);
        }
      }
      return { recovered: false, count: 10 };
    }

    // Fighter recovers - quick count 2-4
    const recoveryBonus = (chin + heart) / 200; // 0.5-1.0 range
    const targetCount = Math.max(2, Math.min(4, Math.round(4 - recoveryBonus * 2)));

    for (let i = 1; i <= targetCount; i++) {
      this.emit('count', { fighter: knockdown.target, count: i });

      if (this.options.realTime) {
        await this.sleep(countSpeed * 800 / this.options.speedMultiplier);
      }
    }

    return { recovered: true, count: targetCount };
  }

  /**
   * Process knockdown count
   */
  async processKnockdownCount(fighter, knockdown) {
    const countSpeed = this.fight.referee.tendencies.countSpeed || 1.0;
    let count = 0;
    let recovered = false;

    // Check for immediate KO - fighter might not get up at all
    // This can happen even with health remaining (cold KO)
    const immediateKOChance = this.calculateImmediateKOChance(fighter, knockdown);
    if (Math.random() < immediateKOChance) {
      // Fighter is out cold - count to 10 for dramatic effect
      // Use real-time count (ignore speed multiplier for dramatic effect)
      for (let i = 1; i <= 10; i++) {
        this.emit('count', { fighter: knockdown.target, count: i });
        if (this.options.realTime) {
          await this.sleep(countSpeed * 1000); // Real-time 1 second per count
        }
      }
      return { recovered: false, count: 10 };
    }

    // Count from 1 to 10
    // Use real-time count (ignore speed multiplier for dramatic knockdown moments)
    for (let i = 1; i <= 10; i++) {
      count = i;

      // Emit count
      this.emit('count', { fighter: knockdown.target, count: i });

      // Wait for count timing - real time for drama
      if (this.options.realTime) {
        await this.sleep(countSpeed * 1000); // Real-time 1 second per count
      }

      // Check recovery at key counts (4, 8, 9)
      if (i >= 4) {
        const recoveryChance = this.calculateRecoveryChance(fighter, knockdown.damage, i);

        if (Math.random() < recoveryChance) {
          // Fighter can get up
          if (i >= 8 || !this.fight.referee.rules.mandatoryEightCount) {
            recovered = true;
            break;
          }
        }
      }
    }

    return { recovered, count };
  }

  /**
   * Calculate chance of immediate KO (fighter doesn't get up at all)
   * This allows for "cold" knockouts even when health isn't depleted
   */
  calculateImmediateKOChance(fighter, knockdown) {
    const attacker = this.fight.getFighter(knockdown.attacker);

    // Base KO chance from attacker's knockout power
    // Elite KO power (95+) has real finishing ability
    const koPower = attacker?.power?.knockoutPower || 70;
    let koChance = Math.max(0, (koPower - 60) / 200); // 0-0.2 base range

    // Defender's chin resistance
    const chin = fighter.mental.chin;
    const chinResist = chin / 150; // 0.5-0.67 for good chins
    koChance *= (1 - chinResist);

    // Damage of the knockdown punch matters
    const punchDamage = knockdown.damage || 5;
    if (punchDamage >= 8) {
      koChance *= 2.0; // Huge shot
    } else if (punchDamage >= 6) {
      koChance *= 1.5; // Big shot
    }

    // Accumulated damage increases KO chance significantly
    const damagePercent = fighter.getHeadDamagePercent();
    if (damagePercent > 0.7) {
      koChance *= 2.5; // Very damaged = very vulnerable
    } else if (damagePercent > 0.5) {
      koChance *= 1.8;
    } else if (damagePercent > 0.3) {
      koChance *= 1.3;
    }

    // Multiple knockdowns in round = much higher KO chance
    if (fighter.knockdownsThisRound >= 2) {
      koChance *= 2.0;
    } else if (fighter.knockdownsThisRound >= 1) {
      koChance *= 1.4;
    }

    // Low stamina = harder to recover
    const staminaPercent = fighter.getStaminaPercent();
    if (staminaPercent < 0.2) {
      koChance *= 1.8;
    } else if (staminaPercent < 0.4) {
      koChance *= 1.3;
    }

    // Heart can help you survive
    const heart = fighter.mental.heart;
    koChance *= (1 - heart / 300); // Great heart reduces KO chance

    // Cap at reasonable maximum (even Tyson doesn't KO everyone)
    return Math.min(0.35, koChance);
  }

  /**
   * Calculate recovery chance from knockdown
   * HEART is the primary factor - fighters with low heart stay down
   * Lewis (heart 82) rarely got up when hurt, Holyfield (heart 98) ALWAYS got up
   */
  calculateRecoveryChance(fighter, damage, count) {
    const chin = fighter.mental.chin;
    const heart = fighter.mental.heart;
    const experience = fighter.mental.experience;
    const composure = fighter.mental.composure ?? 75;

    // HEART IS KING for getting up
    // Elite heart (95+): almost always gets up
    // Good heart (85-94): usually gets up
    // Average heart (75-84): sometimes stays down
    // Low heart (<75): often stays down
    let heartFactor;
    if (heart >= 95) {
      heartFactor = 0.95 + (heart - 95) * 0.01; // 0.95-1.0
    } else if (heart >= 85) {
      heartFactor = 0.75 + (heart - 85) * 0.02; // 0.75-0.95
    } else if (heart >= 75) {
      heartFactor = 0.50 + (heart - 75) * 0.025; // 0.50-0.75
    } else {
      heartFactor = 0.30 + (heart - 50) * 0.008; // 0.30-0.50
    }

    // Base chance from chin and experience (secondary factors)
    const baseFactor = (chin + experience + composure) / 300; // 0.5-0.9 range

    // Combined chance - heart dominates
    let chance = heartFactor * 0.7 + baseFactor * 0.3;

    // Modify by damage taken - heavily damaged fighters struggle more
    const damagePercent = fighter.headDamage / fighter.maxHeadDamage;
    if (damagePercent > 0.6) {
      chance *= (1 - (damagePercent - 0.6) * 1.5); // Steep penalty above 60% damage
    } else {
      chance *= (1 - damagePercent * 0.3);
    }

    // Modify by count (easier to get up at lower counts)
    if (count <= 4) chance *= 1.2;
    else if (count <= 6) chance *= 1.0;
    else if (count === 7) chance *= 0.9;
    else if (count === 8) chance *= 0.75;
    else chance *= 0.5; // Count 9+ very hard to beat

    // Modify by stamina - exhausted fighters struggle
    const staminaPercent = fighter.getStaminaPercent();
    if (staminaPercent < 0.2) {
      chance *= 0.5;
    } else if (staminaPercent < 0.4) {
      chance *= 0.7;
    } else {
      chance *= 0.8 + staminaPercent * 0.2;
    }

    // Previous knockdowns in fight reduce recovery (accumulated damage)
    const priorKnockdowns = fighter.knockdownsTotal || 0;
    if (priorKnockdowns > 0) {
      chance *= Math.pow(0.85, priorKnockdowns); // 15% reduction per prior KD
    }

    return Math.min(0.92, Math.max(0.15, chance));
  }

  /**
   * Check for TKO conditions
   */
  async checkTKOConditions() {
    // Check fighter A
    const tkoCheckA = this.evaluateTKO(this.fight.fighterA, 'A');
    if (tkoCheckA.shouldStop) {
      this.fight.stopFight(tkoCheckA.type, 'B');
      return;
    }

    // Check fighter B
    const tkoCheckB = this.evaluateTKO(this.fight.fighterB, 'B');
    if (tkoCheckB.shouldStop) {
      this.fight.stopFight(tkoCheckB.type, 'A');
      return;
    }
  }

  /**
   * Evaluate TKO conditions for a fighter
   * TKO should be RARE - only in extreme circumstances
   * Most fights should go to decision unless there are knockdowns or corner stoppages
   */
  evaluateTKO(fighter, fighterId) {
    const round = this.fight.getCurrentRound();
    const referee = this.fight.referee;

    let stopProbability = 0;
    let type = StoppageType.TKO_REFEREE;

    // Damage level - calculated early for stamina check
    const damageLevel = fighter.headDamage / fighter.maxHeadDamage;

    // Stamina affects TKO probability but doesn't cause automatic stoppage
    // Fighters can continue even when exhausted - they just perform poorly
    // Only stop if exhausted AND taking damage they can't defend
    const staminaPercent = fighter.getStaminaPercent();
    if (staminaPercent <= 0) {
      // Fighter is completely exhausted - increases stoppage chance significantly
      // But only automatic stop if also hurt or taking heavy damage
      if (fighter.isHurt || damageLevel >= 0.8) {
        return { shouldStop: true, type: StoppageType.TKO_REFEREE, probability: 1.0, reason: 'exhaustion_and_damage' };
      }
      // Otherwise add to probability - ref is watching closely
      stopProbability += 0.35;
    } else if (staminaPercent < 0.15) {
      // Very low stamina - ref is concerned
      stopProbability += 0.15;
    }

    // Damage level - but damage alone shouldn't cause TKO
    // Fighters regularly take 80-90% damage and continue
    if (damageLevel >= 1.0) {
      // Only stop at 100% damage if combined with other factors
      if (fighter.knockdownsTotal > 0 || staminaPercent < 0.15) {
        return { shouldStop: true, type: StoppageType.TKO_REFEREE, probability: 1.0, reason: 'damage' };
      }
      // Otherwise just add to probability
      stopProbability += 0.2;
    }

    // Body damage causing stoppage is rare (liver shot etc)
    const bodyDamageLevel = fighter.bodyDamage / (fighter.maxBodyDamage || 100);
    if (bodyDamageLevel >= 1.0 && fighter.knockdownsTotal > 0) {
      return { shouldStop: true, type: StoppageType.TKO_REFEREE, probability: 1.0, reason: 'body_damage' };
    }

    // KNOCKDOWNS are the primary driver of TKO
    // 3 knockdowns in a round = automatic TKO (three knockdown rule)
    if (fighter.knockdownsThisRound >= 3) {
      return { shouldStop: true, type: StoppageType.TKO_THREE_KNOCKDOWNS, probability: 1.0, reason: 'three_knockdowns' };
    }

    // 2 knockdowns in a round - high probability of stoppage
    if (fighter.knockdownsThisRound >= 2) {
      stopProbability += 0.4;
    }

    // Multiple knockdowns total in the fight
    if (fighter.knockdownsTotal >= 4) {
      stopProbability += 0.3;
    } else if (fighter.knockdownsTotal >= 3) {
      stopProbability += 0.2;
    } else if (fighter.knockdownsTotal >= 2) {
      stopProbability += 0.1;
    }

    // Hurt AND recently knocked down = high stop chance
    if (fighter.isHurt && fighter.knockdownsThisRound >= 1) {
      stopProbability += 0.3;
    }

    // Hurt state for extended period while taking damage
    if (fighter.isHurt && fighter.hurtDuration > 10) {
      const recentDamage = fighter.roundStats.damageReceived || 0;
      if (recentDamage > 30) {
        stopProbability += 0.15;
      }
    }

    // Severe cut
    const severeCut = fighter.cuts.find(c => c.severity >= 3);
    if (severeCut) {
      stopProbability += 0.15;
      type = StoppageType.TKO_DOCTOR;
    }

    // Very severe cut
    const veryBadCut = fighter.cuts.find(c => c.severity >= 4);
    if (veryBadCut) {
      stopProbability += 0.3;
      type = StoppageType.TKO_DOCTOR;
    }

    // Apply referee protectiveness (ranges from 0.3 to 0.7 typically)
    stopProbability *= referee.protectiveness;

    // Very high threshold - TKOs should be rare without knockdowns
    // Only stop when there's a clear case for fighter safety
    const shouldStop = stopProbability > 0.5 && Math.random() < stopProbability * 0.15;

    return { shouldStop, type, probability: stopProbability };
  }

  /**
   * Handle round end
   */
  async handleRoundEnd() {
    this.fight.endRound();

    const roundEndEvent = {
      type: 'ROUND_END',
      round: this.fight.currentRound,
      stats: this.fight.getCurrentRound()?.getSummary(),
      scores: this.fight.getCurrentScores()
    };
    this.emit('roundEnd', roundEndEvent);
    this.renderEvent(roundEndEvent);

    // Check if fight is over
    if (this.fight.isOver()) {
      return;
    }

    // Enter rest period
    this.fight.status = FightStatus.BETWEEN_ROUNDS;
    this.fight.restTime = 0;
  }

  /**
   * Process rest period between rounds
   */
  async processRestPeriod() {
    // If we have a TUI, use the interactive prompt with auto-advance
    if (this.tui && this.options.realTime) {
      // Wait for user input or 5-second timeout
      await this.tui.waitForNextRound(5000);
    } else {
      // Fallback: simple time-based rest period
      const restDuration = this.fight.config.restDuration;

      while (this.fight.restTime < restDuration && this.isRunning && !this.isPaused) {
        this.fight.restTime += this.options.tickRate;

        // Emit rest period update every few seconds
        if (Math.floor(this.fight.restTime) % 5 === 0) {
          this.emit('restPeriod', {
            timeRemaining: restDuration - this.fight.restTime,
            fighterA: this.getFighterState('A'),
            fighterB: this.getFighterState('B')
          });
        }

        // Delay for real-time
        if (this.options.realTime) {
          const delay = this.options.tickRate * 1000 / this.options.speedMultiplier;
          await this.sleep(delay);
        }
      }
    }

    // Start next round
    if (this.isRunning && !this.fight.isOver()) {
      this.fight.startNextRound();

      // Reset effects manager for new round (gives fresh legs buff, clears counters)
      this.effectsManager.resetForRound();

      // Update fast start effect - intensity decreases each round, removed after round 4
      const currentRound = this.fight.currentRound;
      this.effectsManager.updateFastStartForRound('A', currentRound);
      this.effectsManager.updateFastStartForRound('B', currentRound);

      const roundStartEvent = {
        type: 'ROUND_START',
        round: currentRound
      };
      this.emit('roundStart', roundStartEvent);
      this.renderEvent(roundStartEvent);
    }
  }

  /**
   * Get current fighter state for events
   */
  getFighterState(fighterId) {
    const fighter = this.fight.getFighter(fighterId);

    return {
      name: fighter.name,
      state: fighter.state,
      subState: fighter.subState,
      stamina: {
        current: fighter.currentStamina,
        max: fighter.maxStamina,
        percent: fighter.getStaminaPercent(),
        tier: fighter.staminaTier
      },
      damage: {
        head: fighter.headDamage,
        body: fighter.bodyDamage,
        headPercent: fighter.getHeadDamagePercent(),
        bodyPercent: fighter.getBodyDamagePercent()
      },
      knockdowns: {
        round: fighter.knockdownsThisRound,
        total: fighter.knockdownsTotal
      },
      isHurt: fighter.isHurt,
      isBuzzed: fighter.isBuzzed,
      buzzedSeverity: fighter.buzzedSeverity,
      isStunned: fighter.isStunned,
      stunLevel: fighter.stunLevel,
      stunDuration: fighter.stunDuration,
      position: { ...fighter.position },
      cuts: fighter.cuts.length,
      swelling: fighter.swelling.length,
      // Include fight stats for final summary
      fightStats: {
        punchesThrown: fighter.fightStats?.punchesThrown || 0,
        punchesLanded: fighter.fightStats?.punchesLanded || 0,
        jabsThrown: fighter.fightStats?.jabsThrown || 0,
        jabsLanded: fighter.fightStats?.jabsLanded || 0,
        powerPunchesThrown: fighter.fightStats?.powerPunchesThrown || 0,
        powerPunchesLanded: fighter.fightStats?.powerPunchesLanded || 0,
        bodyPunchesThrown: fighter.fightStats?.bodyPunchesThrown || 0,
        bodyPunchesLanded: fighter.fightStats?.bodyPunchesLanded || 0,
        knockdownsScored: fighter.fightStats?.knockdownsScored || 0,
        knockdownsSuffered: fighter.fightStats?.knockdownsSuffered || 0,
        damageDealt: fighter.fightStats?.damageDealt || 0
      },
      accumulatedDamage: fighter.headDamage + fighter.bodyDamage,
      // Active effects (buffs/debuffs)
      effects: this.effectsManager.getEffectsSummary(fighterId)
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run simulation instantly (no delays)
   */
  async runInstant() {
    this.options.realTime = false;
    await this.start();
    return this.fight.getSummary();
  }
}

export default SimulationLoop;
