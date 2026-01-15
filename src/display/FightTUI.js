/**
 * Fight TUI
 * Terminal User Interface using blessed for non-scrolling display
 */

import blessed from 'blessed';
import { CommentaryGenerator } from './CommentaryGenerator.js';

export class FightTUI {
  constructor(options = {}) {
    this.options = options;
    this.screen = null;
    this.components = {};
    this.commentary = new CommentaryGenerator();
    this.commentaryQueue = [];
    this.fight = null;
    this.isRunning = false;
  }

  /**
   * Initialize the TUI screen
   */
  initialize() {
    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Fight Fortress',
      fullUnicode: true
    });

    // Create layout components
    this.createLayout();

    // Set up key bindings
    this.setupKeys();

    // Initial render
    this.screen.render();
  }

  /**
   * Create the TUI layout
   */
  createLayout() {
    // Header
    this.components.header = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        bold: true
      }
    });

    // Ring display (left side)
    this.components.ring = blessed.box({
      parent: this.screen,
      top: 3,
      left: 0,
      width: '50%',
      height: '60%',
      border: {
        type: 'line'
      },
      label: ' Ring ',
      tags: true,
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Fighter A stats (top right)
    this.components.fighterA = blessed.box({
      parent: this.screen,
      top: 3,
      left: '50%',
      width: '25%',
      height: '30%',
      border: {
        type: 'line'
      },
      label: ' Fighter A ',
      tags: true,
      style: {
        fg: 'white',
        border: {
          fg: 'red'
        }
      }
    });

    // Fighter B stats (top right)
    this.components.fighterB = blessed.box({
      parent: this.screen,
      top: 3,
      left: '75%',
      width: '25%',
      height: '30%',
      border: {
        type: 'line'
      },
      label: ' Fighter B ',
      tags: true,
      style: {
        fg: 'white',
        border: {
          fg: 'blue'
        }
      }
    });

    // Round info (middle right)
    this.components.roundInfo = blessed.box({
      parent: this.screen,
      top: '33%',
      left: '50%',
      width: '50%',
      height: '15%',
      border: {
        type: 'line'
      },
      label: ' Round ',
      tags: true,
      style: {
        fg: 'yellow',
        border: {
          fg: 'yellow'
        }
      }
    });

    // Action log (middle)
    this.components.actionLog = blessed.box({
      parent: this.screen,
      top: '48%',
      left: '50%',
      width: '50%',
      height: '20%',
      border: {
        type: 'line'
      },
      label: ' Action ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        style: {
          bg: 'white'
        }
      },
      style: {
        fg: 'white',
        border: {
          fg: 'green'
        }
      }
    });

    // Commentary (bottom)
    this.components.commentary = blessed.box({
      parent: this.screen,
      top: '68%',
      left: 0,
      width: '100%',
      height: '27%',
      border: {
        type: 'line'
      },
      label: ' Commentary ',
      tags: true,
      style: {
        fg: 'white',
        border: {
          fg: 'magenta'
        }
      }
    });

    // Status bar (very bottom)
    this.components.status = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' [Q]uit  [P]ause  [+/-] Speed  [Space] Step ',
      tags: true,
      style: {
        fg: 'black',
        bg: 'white'
      }
    });
  }

  /**
   * Set up key bindings
   */
  setupKeys() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['p'], () => {
      if (this.simulation) {
        if (this.simulation.isPaused) {
          this.simulation.resume();
          this.setStatus('Resumed');
        } else {
          this.simulation.pause();
          this.setStatus('Paused');
        }
      }
    });

    this.screen.key(['+', '='], () => {
      if (this.simulation) {
        const newSpeed = Math.min(10, this.simulation.options.speedMultiplier * 1.5);
        this.simulation.setSpeed(newSpeed);
        this.setStatus(`Speed: ${newSpeed.toFixed(1)}x`);
      }
    });

    this.screen.key(['-', '_'], () => {
      if (this.simulation) {
        const newSpeed = Math.max(0.1, this.simulation.options.speedMultiplier / 1.5);
        this.simulation.setSpeed(newSpeed);
        this.setStatus(`Speed: ${newSpeed.toFixed(1)}x`);
      }
    });
  }

  /**
   * Start displaying a fight
   */
  startFight(fight, simulation) {
    this.fight = fight;
    this.simulation = simulation;
    this.isRunning = true;

    // Initialize commentary
    this.commentary.initialize(fight.fighterA, fight.fighterB);

    // Update header
    this.updateHeader();

    // Subscribe to simulation events
    this.subscribeToEvents();

    this.screen.render();
  }

  /**
   * Subscribe to simulation events
   */
  subscribeToEvents() {
    if (!this.simulation) return;

    this.simulation.on('tick', (data) => this.handleTick(data));
    this.simulation.on('roundStart', (data) => this.handleRoundStart(data));
    this.simulation.on('roundEnd', (data) => this.handleRoundEnd(data));
    this.simulation.on('punchLanded', (data) => this.handlePunchLanded(data));
    this.simulation.on('knockdown', (data) => this.handleKnockdown(data));
    this.simulation.on('hurt', (data) => this.handleHurt(data));
    this.simulation.on('fightEnd', (data) => this.handleFightEnd(data));
  }

  /**
   * Handle tick event
   */
  handleTick(data) {
    // Update ring display
    this.updateRing(data);

    // Update fighter stats
    this.updateFighterStats('A', data.fighterA);
    this.updateFighterStats('B', data.fighterB);

    // Update round info
    this.updateRoundInfo(data.round, data.roundTime || 0);

    this.screen.render();
  }

  /**
   * Handle round start
   */
  handleRoundStart(data) {
    this.addCommentary(`{bold}Round ${data.round} begins!{/bold}`);
    this.updateRoundInfo(data.round, 0);
    this.screen.render();
  }

  /**
   * Handle round end
   */
  handleRoundEnd(data) {
    this.addCommentary(`{bold}End of Round ${data.round}{/bold}`);
    if (data.scores) {
      const scoreStr = data.scores.map(s => `${s.A}-${s.B}`).join(', ');
      this.addCommentary(`Scores: ${scoreStr}`);
    }
    this.screen.render();
  }

  /**
   * Handle punch landed
   */
  handlePunchLanded(data) {
    const attacker = data.attacker === 'A' ? this.fight.fighterA.getShortName() : this.fight.fighterB.getShortName();
    const punchName = this.formatPunchName(data.punchType);

    let message = `${attacker} lands ${punchName}`;
    if (data.damage >= 8) {
      message = `{bold}${message}!{/bold}`;
    }

    this.addAction(message);

    // Generate commentary for significant punches
    if (data.damage >= 6) {
      const commentary = this.commentary.generate({ type: 'PUNCH_LANDED', ...data }, {});
      for (const c of commentary) {
        this.addCommentary(c.text);
      }
    }

    this.screen.render();
  }

  /**
   * Handle knockdown
   */
  handleKnockdown(data) {
    const downed = data.fighter === 'A' ? this.fight.fighterA.getShortName() : this.fight.fighterB.getShortName();
    this.addAction(`{bold}{red-fg}KNOCKDOWN! ${downed} IS DOWN!{/red-fg}{/bold}`);
    this.addCommentary(`{bold}{red-fg}DOWN GOES ${downed.toUpperCase()}!{/red-fg}{/bold}`);
    this.screen.render();
  }

  /**
   * Handle hurt
   */
  handleHurt(data) {
    const hurt = data.fighter === 'A' ? this.fight.fighterA.getShortName() : this.fight.fighterB.getShortName();
    this.addAction(`{yellow-fg}${hurt} IS HURT!{/yellow-fg}`);
    this.addCommentary(`{yellow-fg}${hurt} is in trouble!{/yellow-fg}`);
    this.screen.render();
  }

  /**
   * Handle fight end
   */
  handleFightEnd(data) {
    this.isRunning = false;

    let resultText = '';
    if (data.winner) {
      const winner = this.fight.getFighter(data.winner);
      resultText = `{bold}{green-fg}WINNER: ${winner.name}{/green-fg}{/bold}\nMethod: ${data.method}`;
    } else {
      resultText = `{bold}DRAW{/bold}\n${data.method}`;
    }

    this.components.roundInfo.setContent(resultText);
    this.addCommentary(`{bold}FIGHT OVER!{/bold}`);
    this.addCommentary(resultText.replace(/{[^}]+}/g, ''));

    this.setStatus(' Fight Complete - Press Q to exit ');
    this.screen.render();
  }

  /**
   * Update header
   */
  updateHeader() {
    const fighterA = this.fight.fighterA;
    const fighterB = this.fight.fighterB;

    const header = `{center}{bold}${fighterA.name}  vs  ${fighterB.name}{/bold}{/center}`;
    this.components.header.setContent(header);
  }

  /**
   * Update ring display
   */
  updateRing(data) {
    const positions = data.positions || {
      A: { x: 8, y: 10 },
      B: { x: 12, y: 10 },
      distance: 4
    };

    // Get component dimensions
    const width = this.components.ring.width - 4;
    const height = this.components.ring.height - 4;

    // Create ring visualization
    const lines = [];

    // Ring boundaries
    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        // Map fighter positions to grid
        const gridAx = Math.round((positions.A?.x || 8) / 20 * width);
        const gridAy = Math.round((positions.A?.y || 10) / 20 * height);
        const gridBx = Math.round((positions.B?.x || 12) / 20 * width);
        const gridBy = Math.round((positions.B?.y || 10) / 20 * height);

        // Draw boundaries
        if (y === 0 || y === height - 1) {
          line += '═';
        } else if (x === 0 || x === width - 1) {
          line += '║';
        }
        // Draw fighters
        else if (Math.abs(x - gridAx) <= 1 && y === gridAy) {
          if (x - gridAx === -1) line += '[';
          else if (x - gridAx === 0) line += 'A';
          else line += ']';
        } else if (Math.abs(x - gridBx) <= 1 && y === gridBy) {
          if (x - gridBx === -1) line += '{';
          else if (x - gridBx === 0) line += 'B';
          else line += '}';
        }
        // Empty space
        else {
          line += ' ';
        }
      }
      lines.push(line);
    }

    // Add distance info
    lines.push('');
    lines.push(`  Distance: ${(positions.distance || 4).toFixed(1)} ft`);

    this.components.ring.setContent(lines.join('\n'));
  }

  /**
   * Update fighter stats panel
   */
  updateFighterStats(fighterId, state) {
    const component = fighterId === 'A' ? this.components.fighterA : this.components.fighterB;
    const fighter = fighterId === 'A' ? this.fight.fighterA : this.fight.fighterB;

    const name = fighter.getShortName();
    const stamina = state?.stamina?.percent || 1;
    const damage = state?.damage?.headPercent || 0;
    const knockdowns = state?.knockdowns?.total || 0;

    // Create stamina bar
    const staminaBar = this.createBar(stamina * 100, 100, 12, 'green');
    const healthBar = this.createBar((1 - damage) * 100, 100, 12, 'red');

    const content = [
      `{bold}${name}{/bold}`,
      ``,
      `STA ${staminaBar}`,
      `HP  ${healthBar}`,
      ``,
      `State: ${state?.state || 'NEUTRAL'}`,
      `KDs: ${knockdowns}`
    ];

    component.setContent(content.join('\n'));
  }

  /**
   * Update round info
   */
  updateRoundInfo(round, time) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const content = [
      `{center}{bold}ROUND ${round}{/bold}{/center}`,
      ``,
      `{center}Time: ${timeStr} / 3:00{/center}`
    ];

    this.components.roundInfo.setContent(content.join('\n'));
  }

  /**
   * Add action to action log
   */
  addAction(text) {
    const current = this.components.actionLog.getContent();
    const lines = current.split('\n').filter(l => l);
    lines.push(text);

    // Keep only last 8 lines
    while (lines.length > 8) {
      lines.shift();
    }

    this.components.actionLog.setContent(lines.join('\n'));
  }

  /**
   * Add commentary
   */
  addCommentary(text) {
    this.commentaryQueue.unshift(text);

    // Keep only last 6 lines
    while (this.commentaryQueue.length > 6) {
      this.commentaryQueue.pop();
    }

    this.components.commentary.setContent(this.commentaryQueue.join('\n'));
  }

  /**
   * Set status bar text
   */
  setStatus(text) {
    this.components.status.setContent(` ${text} | [Q]uit  [P]ause  [+/-] Speed `);
    this.screen.render();
  }

  /**
   * Create a progress bar
   */
  createBar(value, max, width, color) {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `{${color}-fg}${bar}{/${color}-fg} ${Math.round(percent)}%`;
  }

  /**
   * Format punch name
   */
  formatPunchName(punchType) {
    const names = {
      'jab': 'jab',
      'cross': 'right hand',
      'lead_hook': 'left hook',
      'rear_hook': 'right hook',
      'lead_uppercut': 'left uppercut',
      'rear_uppercut': 'right uppercut'
    };
    return names[punchType] || punchType?.replace(/_/g, ' ') || 'punch';
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

export default FightTUI;
