/**
 * Simple TUI
 * Clean, focused terminal interface for fight visualization
 * HBO After Dark style commentary
 */

import blessed from 'blessed';
import { CommentaryGenerator } from './CommentaryGenerator.js';

export class SimpleTUI {
  constructor() {
    this.screen = null;
    this.boxes = {};
    this.fight = null;
    this.simulation = null;
    this.currentRound = 1;
    this.roundTime = 0;
    this.roundDuration = 180; // 3 minutes
    this.isPaused = false;
    this.commentaryLines = [];
    this.commentaryGenerator = new CommentaryGenerator();

    // Fight end state
    this.fightEnded = false;
    this.exitResolver = null;
  }

  /**
   * Initialize the TUI
   */
  initialize() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Fight Fortress',
      fullUnicode: true
    });

    this.createLayout();
    this.setupKeys();
    this.screen.render();
  }

  /**
   * Create simple, clear layout
   */
  createLayout() {
    // Main title bar
    this.boxes.title = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      style: {
        fg: 'white',
        bg: '#333333'
      }
    });

    // Round and Timer - BIG and prominent
    this.boxes.timer = blessed.box({
      parent: this.screen,
      top: 3,
      left: 'center',
      width: 40,
      height: 5,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'yellow',
        bold: true,
        border: {
          fg: 'yellow'
        }
      }
    });

    // Fighter A panel (left)
    this.boxes.fighterA = blessed.box({
      parent: this.screen,
      top: 8,
      left: 0,
      width: '35%',
      height: 10,
      tags: true,
      border: {
        type: 'line'
      },
      label: ' RED CORNER ',
      style: {
        fg: 'white',
        border: {
          fg: 'red'
        }
      }
    });

    // Center action area
    this.boxes.action = blessed.box({
      parent: this.screen,
      top: 8,
      left: '35%',
      width: '30%',
      height: 10,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'white'
        }
      }
    });

    // Fighter B panel (right)
    this.boxes.fighterB = blessed.box({
      parent: this.screen,
      top: 8,
      left: '65%',
      width: '35%',
      height: 10,
      tags: true,
      border: {
        type: 'line'
      },
      label: ' BLUE CORNER ',
      style: {
        fg: 'white',
        border: {
          fg: 'blue'
        }
      }
    });

    // CompuBox stats panel
    this.boxes.compubox = blessed.box({
      parent: this.screen,
      top: 18,
      left: 0,
      width: '100%',
      height: 9,
      tags: true,
      border: {
        type: 'line'
      },
      label: ' COMPUBOX ',
      style: {
        fg: 'white',
        border: {
          fg: 'green'
        }
      }
    });

    // Commentary box - below compubox
    this.boxes.commentary = blessed.box({
      parent: this.screen,
      top: 27,
      left: 0,
      width: '100%',
      height: '100%-28',
      tags: true,
      border: {
        type: 'line'
      },
      label: ' COMMENTARY ',
      scrollable: true,
      alwaysScroll: true,
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Status bar
    this.boxes.status = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        fg: 'black',
        bg: 'white'
      }
    });

    // Knockdown counter overlay - hidden by default
    this.boxes.countOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: 9,
      tags: true,
      hidden: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        bg: '#660000',
        bold: true,
        border: {
          fg: 'red'
        }
      }
    });

    // Fight ending overlay - hidden by default
    this.boxes.endingOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      tags: true,
      hidden: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'yellow',
        bg: '#333300',
        bold: true,
        border: {
          fg: 'yellow'
        }
      }
    });

    this.updateStatus('Press [Q] to quit, [P] to pause, [+/-] to change speed');
  }

  /**
   * Setup keyboard controls
   */
  setupKeys() {
    this.screen.key(['q', 'C-c', 'escape'], () => {
      if (this.fightEnded) {
        // Fight is over - cleanup and return to menu
        this.cleanup();
        if (this.exitResolver) {
          this.exitResolver();
        }
      } else {
        // Fight still in progress - exit program
        this.cleanup();
        process.exit(0);
      }
    });

    // Any key returns to menu after fight ends
    this.screen.key(['enter', 'space'], () => {
      if (this.fightEnded) {
        this.cleanup();
        if (this.exitResolver) {
          this.exitResolver();
        }
        return;
      }
    });

    this.screen.key(['p'], () => {
      if (this.simulation) {
        if (this.simulation.isPaused) {
          this.simulation.resume();
          this.isPaused = false;
          this.updateStatus('Resumed - [Q]uit [P]ause [+/-]Speed');
        } else {
          this.simulation.pause();
          this.isPaused = true;
          this.updateStatus('PAUSED - Press [P] or [Space] to resume');
        }
        this.screen.render();
      }
    });

    this.screen.key(['+', '='], () => {
      if (this.simulation) {
        const newSpeed = Math.min(10, this.simulation.options.speedMultiplier * 2);
        this.simulation.setSpeed(newSpeed);
        this.updateStatus(`Speed: ${newSpeed.toFixed(1)}x - [Q]uit [P]ause [+/-]Speed`);
        this.screen.render();
      }
    });

    this.screen.key(['-', '_'], () => {
      if (this.simulation) {
        const newSpeed = Math.max(0.25, this.simulation.options.speedMultiplier / 2);
        this.simulation.setSpeed(newSpeed);
        this.updateStatus(`Speed: ${newSpeed.toFixed(1)}x - [Q]uit [P]ause [+/-]Speed`);
        this.screen.render();
      }
    });
  }

  /**
   * Start displaying a fight
   */
  startFight(fight, simulation) {
    this.fight = fight;
    this.simulation = simulation;
    this.currentRound = 1;
    this.roundTime = 0;

    // Initialize commentary generator
    this.commentaryGenerator.initialize(fight.fighterA, fight.fighterB);

    // Set up title
    const titleText = `{center}{bold}${fight.fighterA.name}  VS  ${fight.fighterB.name}{/bold}{/center}`;
    this.boxes.title.setContent(titleText);

    // Initial fighter displays
    this.updateFighterDisplay('A');
    this.updateFighterDisplay('B');
    this.updateTimer();

    // Subscribe to events
    this.subscribeToEvents();

    // HBO-style opening with broadcast team
    this.addCommentary(`{bold}══════════════════════════════════════════{/bold}`);
    this.addCommentary(`{bold}           HBO BOXING AFTER DARK{/bold}`);
    this.addCommentary(`{bold}══════════════════════════════════════════{/bold}`);
    this.addCommentary('');

    // Generate fight start commentary from broadcast team
    const event = {
      type: 'FIGHT_START',
      fighterA: fight.fighterA,
      fighterB: fight.fighterB,
      rounds: fight.config.rounds,
      fightType: fight.config.type
    };

    const fightState = {
      currentRound: 0,
      totalRounds: fight.config.rounds
    };

    const commentary = this.commentaryGenerator.generate(event, fightState);

    for (const line of commentary) {
      let text = line.text;
      if (line.speaker === 'Lampley') {
        text = `{bold}LAMPLEY:{/bold} ${text}`;
      } else if (line.speaker === 'Foreman') {
        text = `{cyan-fg}{bold}FOREMAN:{/bold} ${text}{/cyan-fg}`;
      } else if (line.speaker === 'Merchant') {
        text = `{yellow-fg}{bold}MERCHANT:{/bold} ${text}{/yellow-fg}`;
      } else if (line.speaker === 'Lederman') {
        text = `{green-fg}{bold}LEDERMAN:{/bold} ${text}{/green-fg}`;
      }
      this.addCommentary(text);
    }

    this.addCommentary('');

    this.screen.render();
  }

  /**
   * Subscribe to simulation events
   */
  subscribeToEvents() {
    const sim = this.simulation;

    sim.on('roundStart', (data) => this.onRoundStart(data));
    sim.on('roundEnd', (data) => this.onRoundEnd(data));
    sim.on('tick', (data) => this.onTick(data));
    sim.on('punchLanded', (data) => this.onPunchLanded(data));
    sim.on('knockdown', (data) => this.onKnockdown(data));
    sim.on('flashKnockdown', (data) => this.onFlashKnockdown(data));
    sim.on('buzzed', (data) => this.onBuzzed(data));
    sim.on('hurt', (data) => this.onHurt(data));
    sim.on('recovery', (data) => this.onRecovery(data));
    sim.on('count', (data) => this.onCount(data));
    sim.on('fightEnding', (data) => this.onFightEnding(data));
    sim.on('fightEnd', (data) => this.onFightEnd(data));
    sim.on('foul', (data) => this.onFoul(data));
    sim.on('speedChange', (speed) => this.onSpeedChange(speed));
    sim.on('momentumShift', (data) => this.onMomentumShift(data));
  }

  /**
   * Handle round start - Use HBO broadcast team
   */
  onRoundStart(data) {
    this.currentRound = data.round;
    this.roundTime = 0;

    // Build event for broadcast team
    const event = {
      type: 'ROUND_START',
      round: data.round
    };

    const fightState = {
      currentRound: this.currentRound,
      roundTime: 0,
      totalRounds: this.fight?.config?.rounds || 12
    };

    this.addCommentary('');
    const totalRounds = this.fight?.config?.rounds || 12;
    const roundsRemaining = totalRounds - data.round + 1;
    this.addCommentary(`{bold}=== ROUND ${data.round} of ${totalRounds} (${roundsRemaining} remaining) ==={/bold}`);

    // Generate commentary using the broadcast team
    const commentary = this.commentaryGenerator.generate(event, fightState);

    for (const line of commentary) {
      let text = line.text;
      if (line.speaker === 'Lampley') {
        text = `{bold}LAMPLEY:{/bold} ${text}`;
      } else if (line.speaker === 'Foreman') {
        text = `{cyan-fg}{bold}FOREMAN:{/bold} ${text}{/cyan-fg}`;
      } else if (line.speaker === 'Merchant') {
        text = `{yellow-fg}{bold}MERCHANT:{/bold} ${text}{/yellow-fg}`;
      } else if (line.speaker === 'Lederman') {
        text = `{green-fg}{bold}LEDERMAN:{/bold} ${text}{/green-fg}`;
      }
      this.addCommentary(text);
    }

    this.updateTimer();
    this.screen.render();
  }

  /**
   * Handle round end - Use HBO broadcast team with Lederman scorecards
   */
  onRoundEnd(data) {
    // Build event for broadcast team
    const statsA = data.stats?.stats?.A || {};
    const statsB = data.stats?.stats?.B || {};

    const event = {
      type: 'ROUND_END',
      round: data.round,
      scores: data.scores,
      statsA: statsA,
      statsB: statsB
    };

    const fightState = {
      currentRound: this.currentRound,
      roundTime: this.roundTime,
      totalRounds: this.fight?.config?.rounds || 12
    };

    this.addCommentary('');
    const roundsLeft = (this.fight?.config?.rounds || 12) - data.round;
    const roundEndText = roundsLeft > 0
      ? `{bold}End of Round ${data.round} - ${roundsLeft} rounds to go{/bold}`
      : `{bold}End of Round ${data.round} - FINAL ROUND COMPLETE{/bold}`;
    this.addCommentary(roundEndText);

    // Generate commentary using the broadcast team
    const commentary = this.commentaryGenerator.generate(event, fightState);

    for (const line of commentary) {
      let text = line.text;
      if (line.speaker === 'Lampley') {
        text = `{bold}LAMPLEY:{/bold} ${text}`;
      } else if (line.speaker === 'Foreman') {
        text = `{cyan-fg}{bold}FOREMAN:{/bold} ${text}{/cyan-fg}`;
      } else if (line.speaker === 'Merchant') {
        text = `{yellow-fg}{bold}MERCHANT:{/bold} ${text}{/yellow-fg}`;
      } else if (line.speaker === 'Lederman') {
        text = `{green-fg}{bold}LEDERMAN:{/bold} ${text}{/green-fg}`;
      }
      this.addCommentary(text);
    }

    this.screen.render();
  }

  /**
   * Wait for user to press any key to continue, or auto-advance after timeout
   * @param {number} timeout - Time in ms before auto-advancing (default 5000)
   * @returns {Promise} - Resolves when key is pressed or timeout occurs
   */
  waitForNextRound(timeout = 5000) {
    return new Promise((resolve) => {
      // Show prompt
      this.addCommentary('');
      this.addCommentary('{yellow-fg}{bold}>>> Press any key for next round... (auto-continue in 5s){/bold}{/yellow-fg}');
      this.updateStatus('{yellow-fg}Press any key to continue to next round...{/yellow-fg}');
      this.screen.render();

      let resolved = false;

      // Set up one-time key listener for any key
      const onKeyPress = () => {
        if (resolved) return;
        resolved = true;
        this.screen.removeListener('keypress', onKeyPress);
        clearTimeout(timer);
        this.addCommentary('{green-fg}>>> Continuing to next round...{/green-fg}');
        this.updateStatus('Press [Q] to quit, [P] to pause, [+/-] to change speed');
        this.screen.render();
        resolve('keypress');
      };

      this.screen.on('keypress', onKeyPress);

      // Set up timeout for auto-advance
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        this.screen.removeListener('keypress', onKeyPress);
        this.addCommentary('{cyan-fg}>>> Auto-advancing to next round...{/cyan-fg}');
        this.updateStatus('Press [Q] to quit, [P] to pause, [+/-] to change speed');
        this.screen.render();
        resolve('timeout');
      }, timeout);
    });
  }

  /**
   * Handle tick - update displays
   */
  onTick(data) {
    this.roundTime = data.roundTime || data.time || 0;
    this.currentRound = data.round;

    this.updateTimer();
    this.updateFighterDisplay('A', data.fighterA);
    this.updateFighterDisplay('B', data.fighterB);
    this.updateActionDisplay(data);
    this.updateCompuBox(data.fighterA, data.fighterB);

    this.screen.render();
  }

  /**
   * Handle punch landed - Use HBO broadcast team for commentary
   */
  onPunchLanded(data) {
    // Build event for commentary generator
    const event = {
      type: 'PUNCH_LANDED',
      attacker: data.attacker,
      target: data.attacker === 'A' ? 'B' : 'A',
      punchType: data.punchType,
      damage: data.damage,
      location: data.location,
      isCounter: data.isCounter,
      round: this.currentRound
    };

    const fightState = {
      currentRound: this.currentRound,
      roundTime: this.roundTime
    };

    // Generate commentary using the broadcast team
    const commentary = this.commentaryGenerator.generate(event, fightState);

    // Display each line with speaker name and appropriate formatting
    for (const line of commentary) {
      let text = line.text;
      let prefix = '';

      // Add speaker name prefix with styling
      if (line.speaker === 'Lampley') {
        prefix = '{bold}LAMPLEY:{/bold} ';
        if (line.priority === 'critical') {
          text = `{bold}{red-fg}${prefix}${text}{/red-fg}{/bold}`;
        } else if (line.priority === 'high') {
          text = `{bold}${prefix}${text}{/bold}`;
        } else {
          text = `${prefix}${text}`;
        }
      } else if (line.speaker === 'Foreman') {
        text = `{cyan-fg}{bold}FOREMAN:{/bold} ${text}{/cyan-fg}`;
      } else if (line.speaker === 'Merchant') {
        text = `{yellow-fg}{bold}MERCHANT:{/bold} ${text}{/yellow-fg}`;
      } else if (line.speaker === 'Lederman') {
        text = `{green-fg}{bold}LEDERMAN:{/bold} ${text}{/green-fg}`;
      }

      this.addCommentary(text);
    }

    if (commentary.length > 0) {
      this.screen.render();
    }
  }

  /**
   * Select random item from array
   */
  randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Handle knockdown - HBO style
   */
  onKnockdown(data) {
    // Generate HBO-style commentary
    const event = {
      type: 'KNOCKDOWN',
      fighter: data.fighter,
      attacker: data.fighter === 'A' ? 'B' : 'A',
      punch: data.punch,
      round: this.currentRound
    };

    const commentary = this.commentaryGenerator.generate(event, { currentRound: this.currentRound });

    this.addCommentary('');
    this.addCommentary(`{bold}{red-fg}╔══════════════════════════════════════╗{/red-fg}{/bold}`);
    this.addCommentary(`{bold}{red-fg}║           >>> KNOCKDOWN! <<<         ║{/red-fg}{/bold}`);
    this.addCommentary(`{bold}{red-fg}╚══════════════════════════════════════╝{/red-fg}{/bold}`);
    this.addCommentary('');

    // Add all the generated commentary
    for (const line of commentary) {
      if (line.priority === 'critical') {
        this.addCommentary(`{bold}{yellow-fg}${line.text}{/yellow-fg}{/bold}`);
      } else {
        this.addCommentary(line.text);
      }
    }

    this.screen.render();
  }

  /**
   * Handle flash knockdown - quick knockdown where fighter pops right back up
   */
  onFlashKnockdown(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const attacker = data.fighter === 'A' ? this.fight.fighterB : this.fight.fighterA;

    this.addCommentary('');
    this.addCommentary(`{bold}{yellow-fg}╔══════════════════════════════════════╗{/yellow-fg}{/bold}`);
    this.addCommentary(`{bold}{yellow-fg}║         >>> FLASH KNOCKDOWN! <<<     ║{/yellow-fg}{/bold}`);
    this.addCommentary(`{bold}{yellow-fg}╚══════════════════════════════════════╝{/yellow-fg}{/bold}`);
    this.addCommentary('');

    const flashLines = [
      `{bold}LAMPLEY:{/bold} ${fighter.getShortName()} goes down but he's bouncing right back up!`,
      `{bold}LAMPLEY:{/bold} ${fighter.getShortName()} touches the canvas! He's up quickly though!`,
      `{bold}LAMPLEY:{/bold} DOWN! But ${fighter.getShortName()} is right back to his feet!`,
      `{bold}LAMPLEY:{/bold} A flash knockdown! ${fighter.getShortName()} pops right up!`
    ];
    this.addCommentary(flashLines[Math.floor(Math.random() * flashLines.length)]);

    const foremanLines = [
      `{cyan-fg}{bold}FOREMAN:{/bold} That's more of a slip than a knockdown, Jim. He got caught off balance.{/cyan-fg}`,
      `{cyan-fg}{bold}FOREMAN:{/bold} He wasn't hurt there, just surprised. You can tell by how fast he got up.{/cyan-fg}`,
      `{cyan-fg}{bold}FOREMAN:{/bold} Flash knockdowns happen. He'll shake that off, but it's still on the scorecards.{/cyan-fg}`,
      `{cyan-fg}{bold}FOREMAN:{/bold} That punch caught him stepping in. Not much power but perfect timing.{/cyan-fg}`
    ];
    this.addCommentary(foremanLines[Math.floor(Math.random() * foremanLines.length)]);

    this.screen.render();
  }

  /**
   * Handle buzzed state - fighter is dazed but not hurt
   */
  onBuzzed(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const severity = data.severity || 1;

    if (severity >= 2) {
      // More severe buzzed state
      const lines = [
        `{yellow-fg}{bold}LAMPLEY:{/bold} ${fighter.getShortName()} is buzzed! He's grabbing onto ${this.fight.getOpponent(data.fighter).getShortName()}!{/yellow-fg}`,
        `{yellow-fg}{bold}LAMPLEY:{/bold} ${fighter.getShortName()} is wobbling! He's trying to clear his head!{/yellow-fg}`,
        `{yellow-fg}{bold}LAMPLEY:{/bold} That one rattled ${fighter.getShortName()}! He's backing up!{/yellow-fg}`
      ];
      this.addCommentary(lines[Math.floor(Math.random() * lines.length)]);

      if (Math.random() < 0.5) {
        const foremanLines = [
          `{cyan-fg}{bold}FOREMAN:{/bold} He's hurt but trying not to show it. Smart fighter covers up.{/cyan-fg}`,
          `{cyan-fg}{bold}FOREMAN:{/bold} His legs are a little wobbly there. He needs to buy some time.{/cyan-fg}`
        ];
        this.addCommentary(foremanLines[Math.floor(Math.random() * foremanLines.length)]);
      }
    } else {
      // Light buzzed - only show occasionally
      if (Math.random() < 0.4) {
        const lines = [
          `${fighter.getShortName()} takes a step back after that shot.`,
          `That one got ${fighter.getShortName()}'s attention.`,
          `${fighter.getShortName()} is looking to clinch after that exchange.`
        ];
        this.addCommentary(lines[Math.floor(Math.random() * lines.length)]);
      }
    }

    this.screen.render();
  }

  /**
   * Handle hurt state - HBO style
   */
  onHurt(data) {
    const hurt = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const other = data.fighter === 'A' ? this.fight.fighterB : this.fight.fighterA;

    // Generate HBO commentary
    const event = { type: 'HURT', fighter: data.fighter };
    const commentary = this.commentaryGenerator.generate(event, { currentRound: this.currentRound });

    this.addCommentary('');
    this.addCommentary(`{bold}{yellow-fg}*** ${hurt.getShortName().toUpperCase()} IS HURT! ***{/yellow-fg}{/bold}`);

    for (const line of commentary) {
      this.addCommentary(line.text);
    }

    // Add urgency
    const urgentLines = [
      `${other.getShortName()} smells blood! He's going for the finish!`,
      `Can ${hurt.getShortName()} survive this onslaught?`,
      `The crowd is on their feet! This could be it!`,
      `${other.getShortName()} is teeing off! ${hurt.getShortName()} is in serious trouble!`
    ];
    this.addCommentary(urgentLines[Math.floor(Math.random() * urgentLines.length)]);

    this.screen.render();
  }

  /**
   * Handle recovery from knockdown
   */
  onRecovery(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;

    // Hide the count overlay
    this.boxes.countOverlay.hide();

    if (data.count <= 5) {
      this.addCommentary(`${fighter.getShortName()} is up quickly at ${data.count}! Looks okay.`);
    } else if (data.count <= 7) {
      this.addCommentary(`${fighter.getShortName()} beats the count at ${data.count}. Taking a moment to recover.`);
    } else {
      this.addCommentary(`${fighter.getShortName()} barely makes it up at ${data.count}! The referee checks him carefully.`);
    }

    this.screen.render();
  }

  /**
   * Handle referee count during knockdown - prominent counter display
   */
  onCount(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const count = data.count;
    const isKO = data.isKO || false;

    // Show the count overlay
    this.boxes.countOverlay.show();

    // Build dramatic count display
    const countArt = this.getCountArt(count);
    const fighterName = fighter.getShortName().toUpperCase();

    // Color changes as count gets higher
    let countColor = 'white';
    if (count >= 8) countColor = 'red';
    else if (count >= 5) countColor = 'yellow';

    const content = [
      '{center}{bold}THE COUNT{/bold}{/center}',
      '',
      `{center}{${countColor}-fg}{bold}${countArt}{/bold}{/${countColor}-fg}{/center}`,
      '',
      `{center}${fighterName}{/center}`,
      isKO ? '{center}{red-fg}{bold}OUT COLD!{/bold}{/red-fg}{/center}' : ''
    ].join('\n');

    this.boxes.countOverlay.setContent(content);
    this.screen.render();

    // If count reaches 10, keep overlay visible briefly
    if (count === 10) {
      setTimeout(() => {
        this.boxes.countOverlay.hide();
        this.screen.render();
      }, 1500);
    }
  }

  /**
   * Get ASCII art for count number
   */
  getCountArt(count) {
    const arts = {
      1: '  ██╗  \n ███║  \n ╚██║  \n  ██║  \n  ██║  \n  ╚═╝  ',
      2: ' ██████╗ \n ╚════██╗\n  █████╔╝\n ██╔═══╝ \n ███████╗\n ╚══════╝',
      3: ' ██████╗ \n ╚════██╗\n  █████╔╝\n  ╚═══██╗\n ██████╔╝\n ╚═════╝ ',
      4: ' ██╗  ██╗\n ██║  ██║\n ███████║\n ╚════██║\n      ██║\n      ╚═╝',
      5: ' ███████╗\n ██╔════╝\n ███████╗\n ╚════██║\n ███████║\n ╚══════╝',
      6: '  ██████╗\n ██╔════╝\n ███████╗\n ██╔═══██╗\n ╚██████╔╝\n  ╚═════╝',
      7: ' ███████╗\n ╚════██║\n     ██╔╝\n    ██╔╝ \n    ██║  \n    ╚═╝  ',
      8: '  █████╗ \n ██╔══██╗\n  █████╔╝\n ██╔══██╗\n ╚█████╔╝\n  ╚════╝ ',
      9: '  █████╗ \n ██╔══██╗\n ╚██████║\n  ╚═══██║\n  █████╔╝\n  ╚════╝ ',
      10: '  ██╗ ██████╗ \n ███║██╔═████╗\n ╚██║██║██╔██║\n  ██║████╔╝██║\n  ██║╚██████╔╝\n  ╚═╝ ╚═════╝ '
    };
    // Simpler display for terminal - just large numbers
    return `>>> ${count} <<<`;
  }

  /**
   * Handle pre-fight-end announcement - cinematic buildup
   */
  onFightEnding(data) {
    const isKO = data.isKO || false;

    // Show ending overlay with dramatic text
    this.boxes.endingOverlay.show();

    let content;
    if (isKO) {
      content = [
        '',
        '{center}{bold}{red-fg}IT\'S ALL OVER!{/red-fg}{/bold}{/center}',
        '',
        '{center}{bold}THE REFEREE WAVES IT OFF!{/bold}{/center}',
        ''
      ].join('\n');
    } else {
      content = [
        '',
        '{center}{bold}{yellow-fg}THE FINAL BELL!{/yellow-fg}{/bold}{/center}',
        '',
        '{center}{bold}WE GO TO THE SCORECARDS...{/bold}{/center}',
        ''
      ].join('\n');
    }

    this.boxes.endingOverlay.setContent(content);
    this.screen.render();
  }

  /**
   * Handle fight end - HBO style
   */
  onFightEnd(data) {
    // Hide the ending overlay
    this.boxes.endingOverlay.hide();
    // Generate HBO-style commentary
    const event = {
      type: 'FIGHT_END',
      winner: data.winner,
      method: data.method,
      round: data.round || this.currentRound,
      scorecards: data.scorecards
    };

    const commentary = this.commentaryGenerator.generate(event, { currentRound: this.currentRound });

    this.addCommentary('');
    this.addCommentary(`{bold}╔══════════════════════════════════════════════════╗{/bold}`);
    this.addCommentary(`{bold}║               THE FIGHT IS OVER!                 ║{/bold}`);
    this.addCommentary(`{bold}╚══════════════════════════════════════════════════╝{/bold}`);
    this.addCommentary('');

    // Add all the generated HBO commentary
    for (const line of commentary) {
      if (line.priority === 'critical') {
        this.addCommentary(`{bold}{green-fg}${line.text}{/green-fg}{/bold}`);
      } else if (line.priority === 'high') {
        this.addCommentary(`{bold}${line.text}{/bold}`);
      } else {
        this.addCommentary(line.text);
      }
    }

    // Final result summary
    this.addCommentary('');
    this.addCommentary(`{bold}════════════════════════════════════════════════════{/bold}`);
    if (data.winner) {
      const winner = this.fight.getFighter(data.winner);
      this.addCommentary(`{bold}{green-fg}OFFICIAL RESULT: ${winner.name.toUpperCase()} WINS{/green-fg}{/bold}`);
      this.addCommentary(`{bold}Method: ${this.formatMethod(data.method)}{/bold}`);
      if (data.round && !data.method.includes('DECISION')) {
        this.addCommentary(`{bold}Time: Round ${data.round}{/bold}`);
      }
    } else {
      this.addCommentary(`{bold}{yellow-fg}OFFICIAL RESULT: DRAW{/yellow-fg}{/bold}`);
    }
    this.addCommentary(`{bold}════════════════════════════════════════════════════{/bold}`);

    // Display official scorecards
    this.displayScorecards(data);

    this.fightEnded = true;
    this.updateStatus('Fight Complete - Press any key to return to menu');
    this.screen.render();
  }

  /**
   * Handle foul events
   */
  onFoul(data) {
    if (!data.detected) return;

    const fouler = this.fight.getFighter(data.attacker);
    const victim = this.fight.getFighter(data.target);
    const foulerName = fouler?.getShortName?.() || fouler?.name || 'Fighter';
    const victimName = victim?.getShortName?.() || victim?.name || 'Opponent';
    const foulName = data.foulName || 'foul';

    if (data.disqualification) {
      this.addCommentary('');
      this.addCommentary(`{bold}{red-fg}═══ DISQUALIFICATION ═══{/red-fg}{/bold}`);
      this.addCommentary(`{bold}{red-fg}${foulerName.toUpperCase()} HAS BEEN DISQUALIFIED!{/red-fg}{/bold}`);
      this.addCommentary(`{yellow-fg}${victimName} wins by DQ{/yellow-fg}`);
      this.addCommentary(`{bold}{red-fg}════════════════════════{/red-fg}{/bold}`);
    } else if (data.pointDeduction) {
      this.addCommentary(`{bold}{yellow-fg}POINT DEDUCTION: ${foulerName} loses a point for ${foulName}{/yellow-fg}{/bold}`);
    } else if (data.warning) {
      this.addCommentary(`{yellow-fg}WARNING: ${foulerName} warned for ${foulName}{/yellow-fg}`);
    }

    this.screen.render();
  }

  /**
   * Handle speed change events
   */
  onSpeedChange(speed) {
    const speedStr = speed.toFixed(1);
    this.updateStatus(`Speed: ${speedStr}x | [+/-] Speed | [P] Pause | [Q] Quit`);
    this.screen.render();
  }

  /**
   * Handle momentum shift events
   */
  onMomentumShift(data) {
    const { leaderName, previousName, type } = data;

    if (type === 'TAKEOVER') {
      // Major momentum swing - previous leader loses control
      this.addCommentary('');
      this.addCommentary(`{bold}{cyan-fg}═══ MOMENTUM SHIFT ═══{/cyan-fg}{/bold}`);
      this.addCommentary(`{bold}LAMPLEY:{/bold} ${leaderName.toUpperCase()} HAS TURNED THIS FIGHT AROUND!`);
      const takeoverComments = [
        `{cyan-fg}{bold}FOREMAN:{/bold} Look at the shift in body language! ${leaderName} smells blood now!{/cyan-fg}`,
        `{yellow-fg}{bold}MERCHANT:{/bold} ${previousName} was in control but that's all changed! ${leaderName} has found his rhythm!{/yellow-fg}`,
        `{cyan-fg}{bold}FOREMAN:{/bold} This is a completely different fight now! ${leaderName} has figured him out!{/cyan-fg}`,
        `{yellow-fg}{bold}MERCHANT:{/bold} The momentum has swung dramatically! ${previousName} needs to stop the bleeding!{/yellow-fg}`
      ];
      this.addCommentary(takeoverComments[Math.floor(Math.random() * takeoverComments.length)]);
    } else if (type === 'CONTROL') {
      // Taking control when it was even
      const controlComments = [
        `{bold}LAMPLEY:{/bold} ${leaderName} is starting to take control of this fight!`,
        `{cyan-fg}{bold}FOREMAN:{/bold} ${leaderName} is asserting himself now. He's found his range.{/cyan-fg}`,
        `{yellow-fg}{bold}MERCHANT:{/bold} You can see ${leaderName} gaining confidence with every exchange.{/yellow-fg}`,
        `{bold}LAMPLEY:{/bold} The tide is turning in ${leaderName}'s favor!`
      ];
      this.addCommentary(controlComments[Math.floor(Math.random() * controlComments.length)]);
    } else if (type === 'DOMINATION') {
      // Building a dominant lead
      this.addCommentary('');
      this.addCommentary(`{bold}{cyan-fg}═══ DOMINATION ═══{/cyan-fg}{/bold}`);
      this.addCommentary(`{bold}LAMPLEY:{/bold} ${leaderName} is DOMINATING this fight!`);
      const domComments = [
        `{cyan-fg}{bold}FOREMAN:{/bold} This is a one-sided affair right now! ${leaderName} is in complete control!{/cyan-fg}`,
        `{yellow-fg}{bold}MERCHANT:{/bold} I don't see how ${previousName || 'his opponent'} can turn this around!{/yellow-fg}`,
        `{cyan-fg}{bold}FOREMAN:{/bold} ${leaderName} is putting on a clinic out there!{/cyan-fg}`,
        `{yellow-fg}{bold}MERCHANT:{/bold} The corner needs to make an adjustment or this fight is getting away from them!{/yellow-fg}`
      ];
      this.addCommentary(domComments[Math.floor(Math.random() * domComments.length)]);
    }

    this.screen.render();
  }

  /**
   * Wait for user to exit after fight ends
   * Returns a promise that resolves when user presses a key
   */
  waitForExit() {
    return new Promise((resolve) => {
      this.exitResolver = resolve;
    });
  }

  /**
   * Display official scorecards at end of fight
   */
  displayScorecards(data) {
    const fighterA = this.fight.fighterA;
    const fighterB = this.fight.fighterB;

    this.addCommentary('');
    this.addCommentary(`{bold}{yellow-fg}╔══════════════════════════════════════════════════╗{/yellow-fg}{/bold}`);
    this.addCommentary(`{bold}{yellow-fg}║              OFFICIAL SCORECARDS                 ║{/yellow-fg}{/bold}`);
    this.addCommentary(`{bold}{yellow-fg}╚══════════════════════════════════════════════════╝{/yellow-fg}{/bold}`);
    this.addCommentary('');

    // Get scorecards from fight result
    const scorecards = this.fight.result?.scorecards || [];

    if (scorecards.length > 0) {
      // Header with fighter names
      const nameA = fighterA.getShortName();
      const nameB = fighterB.getShortName();
      this.addCommentary(`{bold}                ${this.padCenter(nameA, 12)}    ${this.padCenter(nameB, 12)}{/bold}`);
      this.addCommentary('');

      // Display each judge's scorecard
      const judgeNames = ['Judge 1', 'Judge 2', 'Judge 3'];
      for (let i = 0; i < scorecards.length; i++) {
        const card = scorecards[i];
        const judgeName = card.judgeName || judgeNames[i] || `Judge ${i + 1}`;
        const scoreA = card.A || card.scoreA || 0;
        const scoreB = card.B || card.scoreB || 0;

        let scoreColor = '';
        if (scoreA > scoreB) scoreColor = '{green-fg}';
        else if (scoreB > scoreA) scoreColor = '{red-fg}';
        else scoreColor = '{yellow-fg}';

        this.addCommentary(`{bold}${this.padRight(judgeName, 16)}{/bold}${scoreColor}   ${scoreA}     -     ${scoreB}{/${scoreColor.slice(1)}`);
      }

      // Calculate totals if multiple judges
      if (scorecards.length >= 2) {
        this.addCommentary('');
        const totalA = scorecards.reduce((sum, c) => sum + (c.A || c.scoreA || 0), 0);
        const totalB = scorecards.reduce((sum, c) => sum + (c.B || c.scoreB || 0), 0);
        this.addCommentary(`{bold}                ─────────────────────{/bold}`);

        let totalColor = '';
        if (totalA > totalB) totalColor = '{green-fg}';
        else if (totalB > totalA) totalColor = '{red-fg}';
        else totalColor = '{yellow-fg}';

        this.addCommentary(`{bold}TOTAL:          {/bold}${totalColor}   ${totalA}     -     ${totalB}{/${totalColor.slice(1)}`);
      }
    } else if (data.scorecards && data.scorecards.length > 0) {
      // Fallback to string scorecards if available
      this.addCommentary(`{bold}Scores: ${data.scorecards.join(', ')}{/bold}`);
    } else {
      // No scorecards available (early stoppage)
      this.addCommentary(`{bold}Fight ended before going to scorecards{/bold}`);
    }

    // Lederman's unofficial scorecard if available
    this.addCommentary('');
    if (Math.random() < 0.8) {
      const ledermanA = Math.floor(Math.random() * 3) + (data.winner === 'A' ? 115 : 113);
      const ledermanB = Math.floor(Math.random() * 3) + (data.winner === 'B' ? 115 : 113);
      this.addCommentary(`{green-fg}{bold}LEDERMAN:{/bold} JIM! My unofficial scorecard had it ${ledermanA}-${ledermanB}!{/green-fg}`);
    }

    this.addCommentary('');
  }

  /**
   * Pad string to the right
   */
  padRight(str, width) {
    const strLen = str.toString().length;
    if (strLen >= width) return str.toString();
    return str + ' '.repeat(width - strLen);
  }

  /**
   * Update the timer display
   */
  updateTimer() {
    const mins = Math.floor(this.roundTime / 60);
    const secs = Math.floor(this.roundTime % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const remaining = Math.max(0, this.roundDuration - this.roundTime);
    const remMins = Math.floor(remaining / 60);
    const remSecs = Math.floor(remaining % 60);
    const remStr = `${remMins}:${remSecs.toString().padStart(2, '0')}`;

    const totalRounds = this.fight?.config?.rounds || 12;
    const roundsRemaining = totalRounds - this.currentRound + 1;
    const content = [
      `{center}{bold}ROUND ${this.currentRound} of ${totalRounds}{/bold}{/center}`,
      `{center}(${roundsRemaining} rounds left){/center}`,
      `{center}{bold}${remStr}{/bold} in round{/center}`
    ].join('\n');

    this.boxes.timer.setContent(content);
  }

  /**
   * Update fighter display panel
   */
  updateFighterDisplay(fighterId, state) {
    const box = fighterId === 'A' ? this.boxes.fighterA : this.boxes.fighterB;
    const fighter = fighterId === 'A' ? this.fight.fighterA : this.fight.fighterB;

    const name = fighter.getShortName();
    const stamina = state?.stamina?.percent ?? 1;
    const health = 1 - (state?.damage?.headPercent ?? 0);
    const stateStr = this.formatState(state?.state, state?.subState);
    const kds = state?.knockdowns?.total ?? 0;
    const isStunned = state?.isStunned ?? false;
    const stunLevel = state?.stunLevel ?? 0;
    const isHurt = state?.isHurt ?? false;
    const isBuzzed = state?.isBuzzed ?? fighter?.isBuzzed ?? false;
    const effects = state?.effects || { buffs: [], debuffs: [], momentum: 0 };
    const strategy = state?.strategy;

    const staminaBar = this.createBar(stamina, 15);
    const healthBar = this.createBar(health, 15);

    // Build status line with stun/buzzed indicator
    let statusLine = `Status: ${stateStr}`;
    if (isStunned) {
      const stunDesc = stunLevel >= 2 ? '{red-fg}{bold}ROCKED!{/bold}{/red-fg}' : '{yellow-fg}Stunned{/yellow-fg}';
      statusLine = `Status: ${stunDesc}`;
    } else if (isBuzzed) {
      statusLine = `Status: {yellow-fg}{bold}BUZZED!{/bold}{/yellow-fg}`;
    }

    // Format name - blink red when hurt/buzzed (vulnerable), yellow when just stunned
    let nameDisplay;
    if (isHurt || stunLevel >= 2) {
      nameDisplay = `{red-fg}{bold}{blink}${name}{/blink}{/bold}{/red-fg}`;
    } else if (isBuzzed) {
      // Buzzed = vulnerable, blink red to show danger
      nameDisplay = `{red-fg}{bold}{blink}${name}{/blink}{/bold}{/red-fg}`;
    } else if (isStunned) {
      nameDisplay = `{yellow-fg}{bold}${name}{/bold}{/yellow-fg}`;
    } else {
      nameDisplay = `{bold}${name}{/bold}`;
    }

    // Format strategy display
    let strategyLine = '';
    if (strategy?.name) {
      const strategyColor = this.getStrategyColor(strategy.priority);
      strategyLine = `{${strategyColor}}» ${strategy.name}{/${strategyColor}}`;
    }

    // Format active effects (buffs in green, debuffs in red)
    const effectsLine = this.formatEffectsLine(effects);

    const lines = [
      nameDisplay,
      '',
      `Stamina: ${staminaBar} ${Math.round(stamina * 100)}%`,
      `Health:  ${healthBar} ${Math.round(health * 100)}%`,
      '',
      strategyLine,
      statusLine,
      kds > 0 ? `{red-fg}Knockdowns: ${kds}{/red-fg}` : '',
      effectsLine
    ].filter(line => line !== '');

    box.setContent(lines.join('\n'));
  }

  /**
   * Get color for strategy priority
   */
  getStrategyColor(priority) {
    switch (priority) {
      case 'critical': return 'red-fg}{bold';
      case 'urgent': return '#ff8800-fg}{bold';
      case 'high': return 'yellow-fg';
      case 'low': return 'gray-fg';
      default: return 'cyan-fg';
    }
  }

  /**
   * Format effects line for display
   */
  formatEffectsLine(effects) {
    if (!effects) return '';

    const parts = [];

    // Add buffs (green)
    if (effects.buffs && effects.buffs.length > 0) {
      const buffNames = effects.buffs.slice(0, 2).map(b => {
        const name = this.getShortEffectName(b.type);
        return `{green-fg}+${name}{/green-fg}`;
      });
      parts.push(...buffNames);
    }

    // Add debuffs (red)
    if (effects.debuffs && effects.debuffs.length > 0) {
      const debuffNames = effects.debuffs.slice(0, 2).map(d => {
        const name = this.getShortEffectName(d.type);
        return `{red-fg}-${name}{/red-fg}`;
      });
      parts.push(...debuffNames);
    }

    if (parts.length === 0) return '';
    return parts.join(' ');
  }

  /**
   * Get short display name for an effect
   */
  getShortEffectName(type) {
    const names = {
      'adrenaline_surge': 'ADRN',
      'momentum': 'MTM',
      'second_wind': '2ND',
      'killer_instinct': 'KILL',
      'rhythm': 'RTHM',
      'crowd_energy': 'CRWD',
      'confidence_boost': 'CONF',
      'fresh_legs': 'FRSH',
      'cautious': 'CAUT',
      'rattled': 'RATL',
      'arm_weary': 'WEARY',
      'vision_impaired': 'VIMP',
      'desperate': 'DESP',
      'demoralized': 'DEMR',
      'shell_shocked': 'SHCK',
      'gassed': 'GAS',
      'frozen': 'FRZN',
      'hurt_hands': 'HRTH'
    };
    return names[type] || type.substring(0, 4).toUpperCase();
  }

  /**
   * Update center action display with ring visualization
   */
  updateActionDisplay(data) {
    const stateA = this.formatState(data.fighterA?.state);
    const stateB = this.formatState(data.fighterB?.state);

    const distance = data.positions?.distance ?? 4;
    let rangeDesc = '';
    if (distance < 2) rangeDesc = '{bold}CLINCH{/bold}';
    else if (distance < 3) rangeDesc = 'Inside';
    else if (distance < 4.5) rangeDesc = 'Mid-range';
    else rangeDesc = 'Outside';

    // Create mini ring visualization
    const ringVis = this.createRingVisualization(data.positions);

    const lines = [
      ringVis,
      `{center}${rangeDesc} ({bold}${distance.toFixed(1)}{/bold} ft){/center}`,
      '',
      `{red-fg}A: ${stateA}{/red-fg}`,
      `{blue-fg}B: ${stateB}{/blue-fg}`
    ];

    this.boxes.action.setContent(lines.join('\n'));
  }

  /**
   * Update CompuBox statistics display
   */
  updateCompuBox(fighterAState, fighterBState) {
    const statsA = fighterAState?.fightStats || {};
    const statsB = fighterBState?.fightStats || {};

    // Calculate stats for each fighter
    const totalA = {
      thrown: statsA.punchesThrown || 0,
      landed: statsA.punchesLanded || 0
    };
    const totalB = {
      thrown: statsB.punchesThrown || 0,
      landed: statsB.punchesLanded || 0
    };

    // Jabs (approximate - count jabs from thrown)
    const jabsA = {
      thrown: statsA.jabsThrown || Math.floor(totalA.thrown * 0.4),
      landed: statsA.jabsLanded || Math.floor(totalA.landed * 0.35)
    };
    const jabsB = {
      thrown: statsB.jabsThrown || Math.floor(totalB.thrown * 0.4),
      landed: statsB.jabsLanded || Math.floor(totalB.landed * 0.35)
    };

    // Power punches (everything else)
    const powerA = {
      thrown: statsA.powerPunchesThrown || (totalA.thrown - jabsA.thrown),
      landed: statsA.powerPunchesLanded || (totalA.landed - jabsA.landed)
    };
    const powerB = {
      thrown: statsB.powerPunchesThrown || (totalB.thrown - jabsB.thrown),
      landed: statsB.powerPunchesLanded || (totalB.landed - jabsB.landed)
    };

    // Calculate percentages
    const pctA = totalA.thrown > 0 ? Math.round((totalA.landed / totalA.thrown) * 100) : 0;
    const pctB = totalB.thrown > 0 ? Math.round((totalB.landed / totalB.thrown) * 100) : 0;
    const jabPctA = jabsA.thrown > 0 ? Math.round((jabsA.landed / jabsA.thrown) * 100) : 0;
    const jabPctB = jabsB.thrown > 0 ? Math.round((jabsB.landed / jabsB.thrown) * 100) : 0;
    const powerPctA = powerA.thrown > 0 ? Math.round((powerA.landed / powerA.thrown) * 100) : 0;
    const powerPctB = powerB.thrown > 0 ? Math.round((powerB.landed / powerB.thrown) * 100) : 0;

    // Get fighter names
    const nameA = this.fight?.fighterA?.getShortName() || 'Fighter A';
    const nameB = this.fight?.fighterB?.getShortName() || 'Fighter B';

    // Build display - CompuBox style table
    const col1 = 18; // Name column width
    const col2 = 12; // Stat column width

    const lines = [
      `{bold}                    ${this.padCenter(nameA, col1)}    ${this.padCenter(nameB, col1)}{/bold}`,
      `{bold}TOTAL PUNCHES{/bold}       ${this.formatPunchStat(totalA, col1)}    ${this.formatPunchStat(totalB, col1)}`,
      `                    {green-fg}${this.padCenter(pctA + '%', col1)}{/green-fg}    {green-fg}${this.padCenter(pctB + '%', col1)}{/green-fg}`,
      `{bold}JABS{/bold}                ${this.formatPunchStat(jabsA, col1)}    ${this.formatPunchStat(jabsB, col1)}`,
      `                    {cyan-fg}${this.padCenter(jabPctA + '%', col1)}{/cyan-fg}    {cyan-fg}${this.padCenter(jabPctB + '%', col1)}{/cyan-fg}`,
      `{bold}POWER PUNCHES{/bold}       ${this.formatPunchStat(powerA, col1)}    ${this.formatPunchStat(powerB, col1)}`,
      `                    {yellow-fg}${this.padCenter(powerPctA + '%', col1)}{/yellow-fg}    {yellow-fg}${this.padCenter(powerPctB + '%', col1)}{/yellow-fg}`
    ];

    this.boxes.compubox.setContent(lines.join('\n'));
  }

  /**
   * Format punch stat as "landed/thrown"
   */
  formatPunchStat(stat, width) {
    const str = `${stat.landed}/${stat.thrown}`;
    return this.padCenter(str, width);
  }

  /**
   * Pad string to center within width
   */
  padCenter(str, width) {
    const strLen = str.toString().length;
    if (strLen >= width) return str.toString();
    const leftPad = Math.floor((width - strLen) / 2);
    const rightPad = width - strLen - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  }

  /**
   * Create a simple ring visualization showing fighter positions
   */
  createRingVisualization(positions) {
    const width = 15;
    const height = 5;

    // Get positions (default to center if not provided)
    const posA = positions?.A || { x: -2, y: 0 };
    const posB = positions?.B || { x: 2, y: 0 };

    // Map positions (-10 to 10) to grid (0 to width-1)
    const mapX = (x) => Math.round((x + 10) / 20 * (width - 1));
    const mapY = (y) => Math.round((y + 10) / 20 * (height - 1));

    const gridAx = Math.max(0, Math.min(width - 1, mapX(posA.x)));
    const gridAy = Math.max(0, Math.min(height - 1, mapY(posA.y)));
    const gridBx = Math.max(0, Math.min(width - 1, mapX(posB.x)));
    const gridBy = Math.max(0, Math.min(height - 1, mapY(posB.y)));

    // Build the grid
    const lines = [];
    for (let y = 0; y < height; y++) {
      let row = '';
      for (let x = 0; x < width; x++) {
        if (x === gridAx && y === gridAy) {
          row += '{red-fg}A{/red-fg}';
        } else if (x === gridBx && y === gridBy) {
          row += '{blue-fg}B{/blue-fg}';
        } else if (y === 0 || y === height - 1) {
          row += '─';
        } else if (x === 0 || x === width - 1) {
          row += '│';
        } else {
          row += '·';
        }
      }
      lines.push(row);
    }

    return lines.join('\n');
  }

  /**
   * Add commentary line
   */
  addCommentary(text) {
    // Prevent duplicate consecutive commentary
    if (this.commentaryLines.length > 0 &&
        this.commentaryLines[this.commentaryLines.length - 1] === text) {
      return;
    }

    this.commentaryLines.push(text);

    // Keep reasonable history
    if (this.commentaryLines.length > 200) {
      this.commentaryLines = this.commentaryLines.slice(-200);
    }

    // Show more lines for HBO broadcast feel
    const visible = this.commentaryLines.slice(-20);
    this.boxes.commentary.setContent(visible.join('\n'));

    // Auto-scroll to bottom
    this.boxes.commentary.setScrollPerc(100);
  }

  /**
   * Update status bar
   */
  updateStatus(text) {
    this.boxes.status.setContent(` ${text}`);
  }

  /**
   * Create a simple progress bar
   */
  createBar(percent, width) {
    const filled = Math.round(percent * width);
    const empty = width - filled;
    return '[' + '='.repeat(Math.max(0, filled)) + '-'.repeat(Math.max(0, empty)) + ']';
  }

  /**
   * Format fighter state for display
   */
  formatState(state, subState) {
    const stateNames = {
      'NEUTRAL': 'Ready',
      'OFFENSIVE': 'Attacking',
      'DEFENSIVE': 'Defending',
      'TIMING': 'Counter-punching',
      'MOVING': 'Moving',
      'CLINCH': 'Clinching',
      'BUZZED': 'BUZZED!',
      'HURT': 'HURT!',
      'KNOCKED_DOWN': 'DOWN!',
      'FLASH_DOWN': 'FLASH DOWN!',
      'RECOVERED': 'Recovering'
    };

    return stateNames[state] || state || 'Ready';
  }

  /**
   * Get human-readable punch name
   */
  getPunchName(punchType) {
    const names = {
      'jab': 'jab',
      'cross': 'right hand',
      'lead_hook': 'left hook',
      'rear_hook': 'right hook',
      'lead_uppercut': 'left uppercut',
      'rear_uppercut': 'right uppercut',
      'body_jab': 'jab to the body',
      'body_cross': 'right hand to the body',
      'body_hook_lead': 'left hook to the body',
      'body_hook_rear': 'right hook to the body'
    };
    return names[punchType] || punchType?.replace(/_/g, ' ') || 'punch';
  }

  /**
   * Format result method for display
   */
  formatMethod(method) {
    const formats = {
      'KO': 'Knockout',
      'TKO_REFEREE': 'TKO (Referee Stoppage)',
      'TKO_CORNER': 'TKO (Corner Stoppage)',
      'TKO_DOCTOR': 'TKO (Doctor Stoppage)',
      'TKO_INJURY': 'TKO (Injury)',
      'TKO_THREE_KNOCKDOWNS': 'TKO (Three Knockdowns)',
      'DECISION_UNANIMOUS': 'Unanimous Decision',
      'DECISION_SPLIT': 'Split Decision',
      'DECISION_MAJORITY': 'Majority Decision',
      'DRAW_UNANIMOUS': 'Unanimous Draw',
      'DRAW_SPLIT': 'Split Draw',
      'DRAW_MAJORITY': 'Majority Draw',
      'DISQUALIFICATION': 'Disqualification',
      'NO_CONTEST': 'No Contest'
    };
    return formats[method] || method || 'Unknown';
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.screen) {
      this.screen.destroy();
    }
  }
}

export default SimpleTUI;
