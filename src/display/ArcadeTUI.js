/**
 * ArcadeTUI - Fighting Game Style Display
 * Street Fighter / Tekken inspired interface with dramatic visuals
 * Alternate to the HBO broadcast style SimpleTUI
 */

import blessed from 'blessed';
import { CommentaryGenerator } from './CommentaryGenerator.js';
import { getTheme, DEFAULT_THEME, getThemeList } from './themes.js';

export class ArcadeTUI {
  constructor(options = {}) {
    this.screen = null;
    this.boxes = {};
    this.fight = null;
    this.simulation = null;
    this.currentRound = 1;
    this.roundTime = 0;
    this.roundDuration = 180;
    this.isPaused = false;
    this.commentaryGenerator = new CommentaryGenerator();
    this.actionLog = [];

    // Theme
    this.themeName = options.theme || DEFAULT_THEME;
    this.theme = getTheme(this.themeName);

    // Visual effects state
    this.lastHit = { fighter: null, time: 0, damage: 0, type: '' };
    this.comboCount = { A: 0, B: 0 };
    this.comboTimer = { A: 0, B: 0 };
    this.flashEffect = { A: false, B: false };

    // Fight end state
    this.fightEnded = false;
    this.exitResolver = null;
  }

  /**
   * Set theme by name
   */
  setTheme(themeName) {
    this.themeName = themeName;
    this.theme = getTheme(themeName);
  }

  /**
   * Get available themes
   */
  static getAvailableThemes() {
    return getThemeList();
  }

  initialize() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'FIGHT FORTRESS - ARCADE MODE',
      fullUnicode: true
    });

    this.createLayout();
    this.setupKeys();
    this.screen.render();
  }

  createLayout() {
    const t = this.theme; // Shorthand for theme

    // Dark background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // ══════════════════════════════════════════════════════
    // TOP: Fighter names and health bars (Street Fighter style)
    // ══════════════════════════════════════════════════════

    // Fighter A name (top left)
    this.boxes.nameA = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '35%',
      height: 2,
      tags: true,
      style: { bg: '#1a0808' }
    });

    // Round indicator (top center)
    this.boxes.roundBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: '35%',
      width: '30%',
      height: 2,
      tags: true,
      style: { bg: '#12121a' }
    });

    // Fighter B name (top right)
    this.boxes.nameB = blessed.box({
      parent: this.screen,
      top: 0,
      left: '65%',
      width: '35%',
      height: 2,
      tags: true,
      style: { bg: '#08081a' }
    });

    // STAMINA bar A (PRIMARY - more prominent, top position)
    this.boxes.staminaA = blessed.box({
      parent: this.screen,
      top: 2,
      left: 0,
      width: '45%',
      height: 2,
      tags: true,
      style: { bg: '#050a0f' }
    });

    // Timer (center)
    this.boxes.timer = blessed.box({
      parent: this.screen,
      top: 2,
      left: '45%',
      width: '10%',
      height: 2,
      tags: true,
      style: { bg: '#0a0a12' }
    });

    // STAMINA bar B (PRIMARY - more prominent)
    this.boxes.staminaB = blessed.box({
      parent: this.screen,
      top: 2,
      left: '55%',
      width: '45%',
      height: 2,
      tags: true,
      style: { bg: '#050a0f' }
    });

    // Health bars (SECONDARY - smaller, below stamina)
    this.boxes.healthA = blessed.box({
      parent: this.screen,
      top: 4,
      left: 0,
      width: '45%',
      height: 1,
      tags: true,
      style: { bg: '#0a0505' }
    });

    this.boxes.healthB = blessed.box({
      parent: this.screen,
      top: 4,
      left: '55%',
      width: '45%',
      height: 1,
      tags: true,
      style: { bg: '#0a0505' }
    });

    // ══════════════════════════════════════════════════════
    // MIDDLE: Arena with fighter positions and action
    // ══════════════════════════════════════════════════════

    // Left fighter panel
    this.boxes.fighterA = blessed.box({
      parent: this.screen,
      top: 6,
      left: 0,
      width: '20%',
      height: 12,
      tags: true,
      border: { type: 'line' },
      style: { bg: '#0f0808', border: { fg: '#aa3333' } }
    });

    // Main arena
    this.boxes.arena = blessed.box({
      parent: this.screen,
      top: 6,
      left: '20%',
      width: '60%',
      height: 12,
      tags: true,
      border: { type: 'line' },
      style: { bg: '#0a0a12', border: { fg: '#444466' } }
    });

    // Right fighter panel
    this.boxes.fighterB = blessed.box({
      parent: this.screen,
      top: 6,
      left: '80%',
      width: '20%',
      height: 12,
      tags: true,
      border: { type: 'line' },
      style: { bg: '#08080f', border: { fg: '#3333aa' } }
    });

    // Hit effect overlay (center of arena)
    this.boxes.hitEffect = blessed.box({
      parent: this.screen,
      top: 9,
      left: '35%',
      width: '30%',
      height: 3,
      tags: true,
      hidden: true,
      style: { bg: '#0a0a12' }
    });

    // Combo display A (left side)
    this.boxes.comboA = blessed.box({
      parent: this.screen,
      top: 18,
      left: 0,
      width: '25%',
      height: 2,
      tags: true,
      style: { bg: '#0a0a12' }
    });

    // Action log (center bottom)
    this.boxes.actionLog = blessed.box({
      parent: this.screen,
      top: 18,
      left: '25%',
      width: '50%',
      height: 2,
      tags: true,
      style: { bg: '#0a0a12' }
    });

    // Combo display B (right side)
    this.boxes.comboB = blessed.box({
      parent: this.screen,
      top: 18,
      left: '75%',
      width: '25%',
      height: 2,
      tags: true,
      style: { bg: '#0a0a12' }
    });

    // ══════════════════════════════════════════════════════
    // BOTTOM: Stats and commentary
    // ══════════════════════════════════════════════════════

    // Stats panel
    this.boxes.stats = blessed.box({
      parent: this.screen,
      top: 20,
      left: 0,
      width: '100%',
      height: 5,
      tags: true,
      border: { type: 'line' },
      label: ' {bold}FIGHT STATS{/bold} ',
      style: { bg: '#0a0f0a', border: { fg: '#228822' } }
    });

    // Commentary (scrolling)
    this.boxes.commentary = blessed.box({
      parent: this.screen,
      top: 25,
      left: 0,
      width: '100%',
      height: '100%-26',
      tags: true,
      border: { type: 'line' },
      label: ' {bold}COMMENTARY{/bold} ',
      scrollable: true,
      alwaysScroll: true,
      style: { bg: '#08080c', border: { fg: '#446688' } }
    });

    // Status bar
    this.boxes.status = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: { fg: '#888', bg: '#111' }
    });

    // Knockdown counter overlay - fighting game style, hidden by default
    this.boxes.countOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 36,
      height: 11,
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        fg: '#ff4444',
        bg: '#1a0000',
        bold: true,
        border: { fg: '#ff0000' }
      }
    });

    // Fight ending overlay - dramatic announcement, hidden by default
    this.boxes.endingOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 46,
      height: 9,
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        fg: '#ffcc00',
        bg: '#1a1a00',
        bold: true,
        border: { fg: '#ffcc00' }
      }
    });

    this.updateStatus('{bold}[Q]{/bold}uit  {bold}[P]{/bold}ause  {bold}[+/-]{/bold} Speed');
  }

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
      }
    });

    this.screen.key(['p', 'space'], () => {
      if (this.simulation) {
        if (this.simulation.isPaused) {
          this.simulation.resume();
          this.isPaused = false;
          this.updateStatus('{bold}[Q]{/bold}uit  {bold}[P]{/bold}ause  {bold}[+/-]{/bold} Speed');
        } else {
          this.simulation.pause();
          this.isPaused = true;
          this.updateStatus('{yellow-fg}{bold}═══ PAUSED ═══{/bold} [P] or [SPACE] to resume{/yellow-fg}');
        }
        this.screen.render();
      }
    });

    this.screen.key(['+', '='], () => {
      if (this.simulation) {
        const newSpeed = Math.min(10, this.simulation.options.speedMultiplier * 2);
        this.simulation.setSpeed(newSpeed);
        this.updateStatus(`{green-fg}Speed: ${newSpeed.toFixed(1)}x{/green-fg}  [Q]uit [P]ause [+/-]Speed`);
        this.screen.render();
      }
    });

    this.screen.key(['-', '_'], () => {
      if (this.simulation) {
        const newSpeed = Math.max(0.25, this.simulation.options.speedMultiplier / 2);
        this.simulation.setSpeed(newSpeed);
        this.updateStatus(`{yellow-fg}Speed: ${newSpeed.toFixed(1)}x{/yellow-fg}  [Q]uit [P]ause [+/-]Speed`);
        this.screen.render();
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // HEALTH/STAMINA BAR RENDERING
  // ══════════════════════════════════════════════════════

  createHealthBar(percent, width, isLeft, flash = false) {
    // Health bar - SECONDARY display (smaller, below stamina)
    const filled = Math.round(percent * width);
    const empty = width - filled;

    let color = '#00ff00';
    if (percent < 0.25) color = '#ff0000';
    else if (percent < 0.5) color = '#ffaa00';
    else if (percent < 0.75) color = '#ffff00';

    if (flash) color = '#ffffff';

    const filledChar = '▬';
    const emptyChar = '─';

    const filledStr = `{${color}-fg}${filledChar.repeat(Math.max(0, filled))}{/${color}-fg}`;
    const emptyStr = `{#222-fg}${emptyChar.repeat(Math.max(0, empty))}{/#222-fg}`;

    if (isLeft) {
      return filledStr + emptyStr;
    } else {
      return emptyStr + filledStr;
    }
  }

  createStaminaBar(percent, width, isLeft) {
    // Stamina bar - PRIMARY display (larger, more prominent)
    const filled = Math.round(percent * width);
    const empty = width - filled;

    // More dramatic color transitions for stamina
    let color = '#00ddff';  // Bright cyan when full
    if (percent < 0.15) color = '#ff2222';      // Critical red
    else if (percent < 0.30) color = '#ff6600'; // Danger orange
    else if (percent < 0.50) color = '#ffcc00'; // Warning yellow
    else if (percent < 0.70) color = '#88ff00'; // Good green-yellow

    const filledChar = '░';  // Light shade for stamina (vs solid █ for health)
    const emptyChar = ' ';

    const filledStr = `{${color}-fg}${filledChar.repeat(Math.max(0, filled))}{/${color}-fg}`;
    const emptyStr = `{#222-fg}${emptyChar.repeat(Math.max(0, empty))}{/#222-fg}`;

    if (isLeft) {
      return filledStr + emptyStr;
    } else {
      return emptyStr + filledStr;
    }
  }

  // ══════════════════════════════════════════════════════
  // DISPLAY UPDATES
  // ══════════════════════════════════════════════════════

  updateFighterNames() {
    const a = this.fight.fighterA;
    const b = this.fight.fighterB;

    this.boxes.nameA.setContent(
      ` {bold}{#ff4444-fg}${a.getShortName().toUpperCase()}{/#ff4444-fg}{/bold}\n` +
      ` {gray-fg}"${a.config?.identity?.nickname || ''}"{/gray-fg}`
    );

    this.boxes.nameB.setContent(
      `{right}{bold}{#4488ff-fg}${b.getShortName().toUpperCase()}{/#4488ff-fg}{/bold} {/right}\n` +
      `{right}{gray-fg}"${b.config?.identity?.nickname || ''}"{/gray-fg} {/right}`
    );
  }

  updateRoundDisplay() {
    const totalRounds = this.fight?.config?.rounds || 12;
    const roundsRemaining = totalRounds - this.currentRound + 1;
    this.boxes.roundBox.setContent(
      `{center}{bold}{#ffcc00-fg}ROUND ${this.currentRound}{/#ffcc00-fg}{/bold}{/center}\n` +
      `{center}{gray-fg}${roundsRemaining} rounds left{/gray-fg}{/center}`
    );
  }

  updateTimer() {
    const remaining = Math.max(0, this.roundDuration - this.roundTime);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    let color = '#ffffff';
    if (remaining <= 10) color = '#ff4444';
    else if (remaining <= 30) color = '#ffcc00';

    this.boxes.timer.setContent(
      `{center}{bold}{${color}-fg}${timeStr}{/${color}-fg}{/bold}{/center}\n` +
      `{center}{#666-fg}TIME{/#666-fg}{/center}`
    );
  }

  updateHealthBars(stateA, stateB) {
    // Health bar - SECONDARY (single line, below stamina)
    const healthA = 1 - (stateA?.damage?.headPercent ?? 0);
    const healthB = 1 - (stateB?.damage?.headPercent ?? 0);
    const width = Math.floor(this.screen.width * 0.42);

    const barA = this.createHealthBar(healthA, width, true, this.flashEffect.A);
    const barB = this.createHealthBar(healthB, width, false, this.flashEffect.B);

    this.boxes.healthA.setContent(` ${barA} {gray-fg}HP{/gray-fg} {bold}${Math.round(healthA * 100)}%{/bold}`);
    this.boxes.healthB.setContent(`{right}{bold}${Math.round(healthB * 100)}%{/bold} {gray-fg}HP{/gray-fg} ${barB} {/right}`);
  }

  updateStaminaBars(stateA, stateB) {
    // Stamina bar - PRIMARY (two lines, prominent display)
    const stamA = stateA?.stamina?.percent ?? 1;
    const stamB = stateB?.stamina?.percent ?? 1;
    const width = Math.floor(this.screen.width * 0.42);

    const barA = this.createStaminaBar(stamA, width, true);
    const barB = this.createStaminaBar(stamB, width, false);

    // Add tier indicator for visual feedback
    const tierA = this.getStaminaTierLabel(stamA);
    const tierB = this.getStaminaTierLabel(stamB);

    this.boxes.staminaA.setContent(
      ` ${barA}\n` +
      ` {bold}${Math.round(stamA * 100)}%{/bold} {gray-fg}ENERGY{/gray-fg} ${tierA}`
    );

    this.boxes.staminaB.setContent(
      `${barB} \n` +
      `{right}${tierB} {gray-fg}ENERGY{/gray-fg} {bold}${Math.round(stamB * 100)}%{/bold} {/right}`
    );
  }

  getStaminaTierLabel(percent) {
    if (percent >= 0.8) return '{#00ddff-fg}FRESH{/#00ddff-fg}';
    if (percent >= 0.6) return '{#88ff00-fg}GOOD{/#88ff00-fg}';
    if (percent >= 0.4) return '{#ffcc00-fg}TIRED{/#ffcc00-fg}';
    if (percent >= 0.25) return '{#ff6600-fg}GASSED{/#ff6600-fg}';
    return '{#ff2222-fg}EMPTY{/#ff2222-fg}';
  }

  updateFighterPanel(id, state) {
    const box = id === 'A' ? this.boxes.fighterA : this.boxes.fighterB;
    const fighter = id === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const color = id === 'A' ? '#ff4444' : '#4488ff';

    const statusStr = this.getStatusString(state);
    const kds = state?.knockdowns?.total ?? 0;

    // Get stance/position info
    const stance = fighter.config?.physical?.stance || 'orthodox';

    // Fighter ASCII art based on state
    const art = this.getFighterArt(state?.state, id);

    const lines = [
      art,
      '',
      `{${color}-fg}${statusStr}{/${color}-fg}`,
      '',
      kds > 0 ? `{red-fg}KD: ${kds}{/red-fg}` : `{#444-fg}KD: 0{/#444-fg}`,
      `{#666-fg}${stance}{/#666-fg}`
    ];

    box.setContent(lines.join('\n'));
  }

  getFighterArt(state, id) {
    const color = id === 'A' ? '#ff4444' : '#4488ff';

    // Simple ASCII fighter representations
    const arts = {
      'NEUTRAL': `{${color}-fg}  O\n /|\\\n / \\{/${color}-fg}`,
      'OFFENSIVE': `{${color}-fg}  O\n<|/\n / \\{/${color}-fg}`,
      'DEFENSIVE': `{${color}-fg}  O\n[|]\n | {/${color}-fg}`,
      'HURT': `{#ff0000-fg}  x\n\\|/\n | {/#ff0000-fg}`,
      'KNOCKED_DOWN': `{#ff0000-fg}___\n x {/#ff0000-fg}`,
      'CLINCH': `{${color}-fg}  O\n<|>\n | {/${color}-fg}`
    };

    return arts[state] || arts['NEUTRAL'];
  }

  getStatusString(state) {
    if (state?.isHurt) return '{bold}HURT!{/bold}';
    if (state?.isBuzzed) return '{bold}BUZZED{/bold}';
    if (state?.isStunned) return 'Stunned';

    const states = {
      'NEUTRAL': 'Ready',
      'OFFENSIVE': 'Attacking',
      'DEFENSIVE': 'Defending',
      'TIMING': 'Counter',
      'MOVING': 'Moving',
      'CLINCH': 'Clinch',
      'HURT': 'HURT!',
      'KNOCKED_DOWN': 'DOWN!'
    };

    return states[state?.state] || 'Ready';
  }

  updateArena(data) {
    const distance = data?.positions?.distance ?? 4;

    // Range indicator
    let range = 'OUTSIDE';
    let rangeColor = '#666666';
    if (distance < 2) { range = 'CLINCH'; rangeColor = '#ff8800'; }
    else if (distance < 3) { range = 'INSIDE'; rangeColor = '#ff4444'; }
    else if (distance < 4.5) { range = 'MID RANGE'; rangeColor = '#ffcc00'; }

    // Create ring visualization
    const ring = this.createRingVis(data?.positions);

    // Last action
    let lastAction = '';
    if (this.lastHit.time > Date.now() - 1500 && this.lastHit.damage > 0) {
      const hitColor = this.lastHit.fighter === 'A' ? '#4488ff' : '#ff4444';
      lastAction = `{${hitColor}-fg}{bold}${this.lastHit.type}!{/bold}{/${hitColor}-fg}`;
      if (this.lastHit.damage > 10) {
        lastAction += ` {yellow-fg}-${Math.round(this.lastHit.damage)}{/yellow-fg}`;
      }
    }

    const lines = [
      ring,
      '',
      `{center}{${rangeColor}-fg}{bold}[ ${range} ]{/bold}{/${rangeColor}-fg}{/center}`,
      `{center}{#555-fg}${distance.toFixed(1)} ft{/#555-fg}{/center}`,
      '',
      `{center}${lastAction}{/center}`
    ];

    this.boxes.arena.setContent(lines.join('\n'));
  }

  createRingVis(positions) {
    const width = 30;
    const height = 5;

    const posA = positions?.A || { x: -3, y: 0 };
    const posB = positions?.B || { x: 3, y: 0 };

    const mapX = (x) => Math.round((x + 10) / 20 * (width - 1));
    const mapY = (y) => Math.round((y + 5) / 10 * (height - 1));

    const ax = Math.max(1, Math.min(width - 2, mapX(posA.x)));
    const ay = Math.max(0, Math.min(height - 1, mapY(posA.y)));
    const bx = Math.max(1, Math.min(width - 2, mapX(posB.x)));
    const by = Math.max(0, Math.min(height - 1, mapY(posB.y)));

    const lines = [];
    lines.push('{#444-fg}╔' + '═'.repeat(width) + '╗{/#444-fg}');

    for (let y = 0; y < height; y++) {
      let row = '{#444-fg}║{/#444-fg}';
      for (let x = 0; x < width; x++) {
        if (x === ax && y === ay) {
          row += '{#ff4444-fg}{bold}A{/bold}{/#ff4444-fg}';
        } else if (x === bx && y === by) {
          row += '{#4488ff-fg}{bold}B{/bold}{/#4488ff-fg}';
        } else {
          row += ' ';
        }
      }
      row += '{#444-fg}║{/#444-fg}';
      lines.push(row);
    }

    lines.push('{#444-fg}╚' + '═'.repeat(width) + '╝{/#444-fg}');

    return `{center}${lines.join('\n')}{/center}`;
  }

  updateCombos() {
    if (this.comboCount.A > 1) {
      this.boxes.comboA.setContent(
        `{center}{#ff4444-fg}{bold}${this.comboCount.A}{/bold}{/#ff4444-fg}{/center}\n` +
        `{center}{#ff4444-fg}HIT COMBO!{/#ff4444-fg}{/center}`
      );
    } else {
      this.boxes.comboA.setContent('');
    }

    if (this.comboCount.B > 1) {
      this.boxes.comboB.setContent(
        `{center}{#4488ff-fg}{bold}${this.comboCount.B}{/bold}{/#4488ff-fg}{/center}\n` +
        `{center}{#4488ff-fg}HIT COMBO!{/#4488ff-fg}{/center}`
      );
    } else {
      this.boxes.comboB.setContent('');
    }
  }

  updateActionLog() {
    const recent = this.actionLog.slice(-2);
    this.boxes.actionLog.setContent(recent.join('\n'));
  }

  addAction(text) {
    this.actionLog.push(text);
    if (this.actionLog.length > 50) {
      this.actionLog = this.actionLog.slice(-50);
    }
    this.updateActionLog();
  }

  updateStats(stateA, stateB) {
    const statsA = stateA?.fightStats || {};
    const statsB = stateB?.fightStats || {};

    const nameA = this.fight?.fighterA?.getShortName() || 'Fighter A';
    const nameB = this.fight?.fighterB?.getShortName() || 'Fighter B';

    const thrownA = statsA.punchesThrown || 0;
    const landedA = statsA.punchesLanded || 0;
    const thrownB = statsB.punchesThrown || 0;
    const landedB = statsB.punchesLanded || 0;

    const pctA = thrownA > 0 ? Math.round((landedA / thrownA) * 100) : 0;
    const pctB = thrownB > 0 ? Math.round((landedB / thrownB) * 100) : 0;

    const lines = [
      `{bold}           {#ff4444-fg}${this.padCenter(nameA, 15)}{/#ff4444-fg}     {#4488ff-fg}${this.padCenter(nameB, 15)}{/#4488ff-fg}{/bold}`,
      `  Punches  ${this.padCenter(landedA + '/' + thrownA, 15)}     ${this.padCenter(landedB + '/' + thrownB, 15)}`,
      `  Accuracy ${this.padCenter(pctA + '%', 15)}     ${this.padCenter(pctB + '%', 15)}`
    ];

    this.boxes.stats.setContent(lines.join('\n'));
  }

  showHitEffect(attacker, damage, punchType) {
    if (damage < 8) return;

    const target = attacker === 'A' ? 'B' : 'A';
    const color = target === 'A' ? '#ff4444' : '#4488ff';

    let effect = '';
    if (damage > 20) {
      effect = `{bold}{${color}-fg}★★★ DEVASTATING! ★★★{/${color}-fg}{/bold}`;
    } else if (damage > 15) {
      effect = `{bold}{${color}-fg}★★ BIG HIT! ★★{/${color}-fg}{/bold}`;
    } else if (damage > 10) {
      effect = `{bold}{${color}-fg}★ SOLID! ★{/${color}-fg}{/bold}`;
    }

    if (effect) {
      this.boxes.hitEffect.setContent(`{center}\n${effect}\n{/center}`);
      this.boxes.hitEffect.show();
      this.flashEffect[target] = true;

      setTimeout(() => {
        this.boxes.hitEffect.hide();
        this.flashEffect[target] = false;
        this.screen.render();
      }, 250);
    }
  }

  // ══════════════════════════════════════════════════════
  // FIGHT LIFECYCLE
  // ══════════════════════════════════════════════════════

  startFight(fight, simulation) {
    this.fight = fight;
    this.simulation = simulation;
    this.currentRound = 1;
    this.roundTime = 0;
    this.comboCount = { A: 0, B: 0 };

    this.commentaryGenerator.initialize(fight.fighterA, fight.fighterB);

    this.updateFighterNames();
    this.updateRoundDisplay();
    this.updateTimer();
    this.updateHealthBars();
    this.updateStaminaBars();

    this.subscribeToEvents();

    this.addCommentary('{bold}{#ffcc00-fg}════════════════════════════════════════{/#ffcc00-fg}{/bold}');
    this.addCommentary('{bold}{#ffcc00-fg}         FIGHT FORTRESS - ARCADE{/#ffcc00-fg}{/bold}');
    this.addCommentary('{bold}{#ffcc00-fg}════════════════════════════════════════{/#ffcc00-fg}{/bold}');
    this.addCommentary('');
    this.addCommentary(`{bold}{#ff4444-fg}${fight.fighterA.name}{/#ff4444-fg}  VS  {#4488ff-fg}${fight.fighterB.name}{/#4488ff-fg}{/bold}`);
    this.addCommentary('');

    this.screen.render();
  }

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
    sim.on('foul', (data) => this.onFoul(data));
    sim.on('pointDeduction', (data) => this.onPointDeduction(data));
    sim.on('refereeCommand', (data) => this.onRefereeCommand(data));
    sim.on('fightEnding', (data) => this.onFightEnding(data));
    sim.on('fightEnd', (data) => this.onFightEnd(data));
  }

  onRoundStart(data) {
    this.currentRound = data.round;
    this.roundTime = 0;
    this.comboCount = { A: 0, B: 0 };

    this.addCommentary('');
    this.addCommentary(`{bold}{#ffcc00-fg}══════ ROUND ${data.round} ══════{/#ffcc00-fg}{/bold}`);
    this.addAction(`{#ffcc00-fg}ROUND ${data.round} - FIGHT!{/#ffcc00-fg}`);

    // Broadcast team commentary
    const event = { type: 'ROUND_START', round: data.round };
    const fightState = { currentRound: this.currentRound, roundTime: 0, totalRounds: this.fight?.config?.rounds || 12 };
    const commentary = this.commentaryGenerator.generate(event, fightState);

    for (const line of commentary) {
      this.addCommentaryLine(line);
    }

    this.updateRoundDisplay();
    this.screen.render();
  }

  onRoundEnd(data) {
    const statsA = data.stats?.stats?.A || {};
    const statsB = data.stats?.stats?.B || {};

    const event = {
      type: 'ROUND_END',
      round: data.round,
      scores: data.scores,
      statsA,
      statsB
    };

    const fightState = { currentRound: this.currentRound, roundTime: this.roundTime, totalRounds: this.fight?.config?.rounds || 12 };

    this.addCommentary('');
    this.addCommentary(`{gray-fg}── Round ${data.round} Complete ──{/gray-fg}`);

    // Broadcast team commentary
    const commentary = this.commentaryGenerator.generate(event, fightState);
    for (const line of commentary) {
      this.addCommentaryLine(line);
    }

    this.screen.render();
  }

  waitForNextRound(timeout = 5000) {
    return new Promise((resolve) => {
      this.addCommentary('{yellow-fg}>>> Press any key...{/yellow-fg}');
      this.screen.render();

      let resolved = false;
      const onKey = () => {
        if (resolved) return;
        resolved = true;
        this.screen.removeListener('keypress', onKey);
        clearTimeout(timer);
        resolve('keypress');
      };

      this.screen.on('keypress', onKey);
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        this.screen.removeListener('keypress', onKey);
        resolve('timeout');
      }, timeout);
    });
  }

  onTick(data) {
    this.roundTime = data.roundTime || data.time || 0;
    this.currentRound = data.round;

    // Decay combos
    const now = Date.now();
    if (now - this.comboTimer.A > 2000) this.comboCount.A = 0;
    if (now - this.comboTimer.B > 2000) this.comboCount.B = 0;

    this.updateTimer();
    this.updateRoundDisplay();
    this.updateHealthBars(data.fighterA, data.fighterB);
    this.updateStaminaBars(data.fighterA, data.fighterB);
    this.updateFighterPanel('A', data.fighterA);
    this.updateFighterPanel('B', data.fighterB);
    this.updateArena(data);
    this.updateCombos();
    this.updateStats(data.fighterA, data.fighterB);

    this.screen.render();
  }

  onPunchLanded(data) {
    this.comboCount[data.attacker]++;
    this.comboTimer[data.attacker] = Date.now();

    const opponent = data.attacker === 'A' ? 'B' : 'A';
    this.comboCount[opponent] = 0;

    const punchName = this.getPunchName(data.punchType);

    this.lastHit = {
      fighter: data.attacker,
      time: Date.now(),
      damage: data.damage,
      type: punchName
    };

    // Action log
    const attackerName = data.attacker === 'A' ?
      `{#ff4444-fg}${this.fight.fighterA.getShortName()}{/#ff4444-fg}` :
      `{#4488ff-fg}${this.fight.fighterB.getShortName()}{/#4488ff-fg}`;

    let dmgStr = '';
    if (data.damage > 15) dmgStr = ' {yellow-fg}{bold}BIG!{/bold}{/yellow-fg}';
    else if (data.damage > 10) dmgStr = ' {yellow-fg}solid{/yellow-fg}';

    this.addAction(`${attackerName} ${punchName}${dmgStr}`);
    this.showHitEffect(data.attacker, data.damage, punchName);

    // Broadcast team commentary for significant punches
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

    const fightState = { currentRound: this.currentRound, roundTime: this.roundTime };
    const commentary = this.commentaryGenerator.generate(event, fightState);

    for (const line of commentary) {
      let text = line.text;
      if (line.speaker === 'Lampley') {
        if (line.priority === 'critical') {
          text = `{bold}{red-fg}LAMPLEY: ${text}{/red-fg}{/bold}`;
        } else if (line.priority === 'high') {
          text = `{bold}LAMPLEY:{/bold} ${text}`;
        } else {
          text = `LAMPLEY: ${text}`;
        }
      } else if (line.speaker === 'Foreman') {
        text = `{cyan-fg}{bold}FOREMAN:{/bold} ${text}{/cyan-fg}`;
      } else if (line.speaker === 'Merchant') {
        text = `{yellow-fg}{bold}MERCHANT:{/bold} ${text}{/yellow-fg}`;
      }
      this.addCommentary(text);
    }

    if (commentary.length > 0) {
      this.screen.render();
    }
  }

  onKnockdown(data) {
    const downed = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const color = data.fighter === 'A' ? '#ff4444' : '#4488ff';

    this.addCommentary('');
    this.addCommentary(`{bold}{#ff0000-fg}╔═══════════════════════════════════╗{/#ff0000-fg}{/bold}`);
    this.addCommentary(`{bold}{#ff0000-fg}║     ★★★  KNOCKDOWN!  ★★★          ║{/#ff0000-fg}{/bold}`);
    this.addCommentary(`{bold}{#ff0000-fg}╚═══════════════════════════════════╝{/#ff0000-fg}{/bold}`);
    this.addCommentary(`{bold}{${color}-fg}${downed.getShortName()} IS DOWN!{/${color}-fg}{/bold}`);
    this.addCommentary('');

    this.addAction(`{#ff0000-fg}{bold}★★★ KNOCKDOWN! ★★★{/bold}{/#ff0000-fg}`);

    // Broadcast team commentary
    const event = {
      type: 'KNOCKDOWN',
      fighter: data.fighter,
      attacker: data.fighter === 'A' ? 'B' : 'A',
      punch: data.punch,
      round: this.currentRound
    };

    const commentary = this.commentaryGenerator.generate(event, { currentRound: this.currentRound });
    for (const line of commentary) {
      if (line.priority === 'critical') {
        this.addCommentary(`{bold}{yellow-fg}${line.text}{/yellow-fg}{/bold}`);
      } else {
        this.addCommentaryLine(line);
      }
    }

    this.screen.render();
  }

  onFlashKnockdown(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;

    this.addCommentary('');
    this.addCommentary(`{#ffaa00-fg}{bold}★ FLASH KNOCKDOWN ★{/bold}{/#ffaa00-fg}`);
    this.addCommentary(`${fighter.getShortName()} goes down but pops right back up!`);

    this.addAction(`{#ffaa00-fg}Flash knockdown!{/#ffaa00-fg}`);

    this.screen.render();
  }

  onBuzzed(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const color = data.fighter === 'A' ? '#ff4444' : '#4488ff';

    if (data.severity >= 2) {
      this.addCommentary(`{${color}-fg}${fighter.getShortName()} is BUZZED!{/${color}-fg}`);
      this.addAction(`{${color}-fg}${fighter.getShortName()} buzzed!{/${color}-fg}`);
    }

    this.screen.render();
  }

  onHurt(data) {
    const hurt = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const other = data.fighter === 'A' ? this.fight.fighterB : this.fight.fighterA;
    const color = data.fighter === 'A' ? '#ff4444' : '#4488ff';

    this.addCommentary('');
    this.addCommentary(`{bold}{#ff0000-fg}★★★ ${hurt.getShortName().toUpperCase()} IS HURT! ★★★{/#ff0000-fg}{/bold}`);

    this.addAction(`{#ff0000-fg}{bold}${hurt.getShortName()} HURT!{/bold}{/#ff0000-fg}`);

    // Broadcast team commentary
    const event = { type: 'HURT', fighter: data.fighter };
    const commentary = this.commentaryGenerator.generate(event, { currentRound: this.currentRound });

    for (const line of commentary) {
      this.addCommentaryLine(line);
    }

    // Add urgency
    const urgentLines = [
      `${other.getShortName()} smells blood! Going for the finish!`,
      `Can ${hurt.getShortName()} survive?!`,
      `The crowd is on their feet!`
    ];
    this.addCommentary(urgentLines[Math.floor(Math.random() * urgentLines.length)]);

    this.screen.render();
  }

  onRecovery(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;

    // Hide the count overlay
    this.boxes.countOverlay.hide();

    this.addCommentary(`${fighter.getShortName()} beats the count at ${data.count}!`);
    this.screen.render();
  }

  /**
   * Handle foul event
   */
  onFoul(data) {
    const attacker = data.attacker === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const target = data.attacker === 'A' ? this.fight.fighterB : this.fight.fighterA;
    const color = '#ffaa00'; // Warning yellow

    // Only show detected fouls
    if (!data.detected) {
      // Undetected foul - subtle indication
      this.addAction(`{#666666-fg}${attacker.getShortName()} ${data.description}...{/#666666-fg}`);
      return;
    }

    // Detected foul
    this.addCommentary('');
    this.addCommentary(`{bold}{${color}-fg}⚠ FOUL! ${data.foulName.toUpperCase()} ⚠{/${color}-fg}{/bold}`);
    this.addCommentary(`${attacker.getShortName()} ${data.description}!`);

    if (data.intentional) {
      this.addCommentary(`{#ff4444-fg}That looked intentional!{/#ff4444-fg}`);
    }

    this.addAction(`{${color}-fg}⚠ ${data.foulName}!{/${color}-fg}`);

    // Show damage if significant
    if (data.damage > 3) {
      this.addCommentary(`{#ff4444-fg}${target.getShortName()} is hurt by the foul!{/#ff4444-fg}`);
    }

    if (data.cutCaused) {
      this.addCommentary(`{#ff0000-fg}The foul opens a cut!{/#ff0000-fg}`);
    }

    // Consequence
    if (data.warning) {
      this.addCommentary(`Referee issues a warning to ${attacker.getShortName()}`);
    }

    this.screen.render();
  }

  /**
   * Handle point deduction
   */
  onPointDeduction(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;

    this.addCommentary('');
    this.addCommentary(`{bold}{#ff0000-fg}★ POINT DEDUCTED ★{/#ff0000-fg}{/bold}`);
    this.addCommentary(`${fighter.getShortName()} loses a point for ${data.reason}`);
    this.addCommentary(`Total deductions: ${data.totalDeductions}`);

    this.addAction(`{#ff0000-fg}★ -1 POINT: ${fighter.getShortName()} ★{/#ff0000-fg}`);

    this.screen.render();
  }

  /**
   * Handle referee commands (BREAK, BOX, etc.)
   */
  onRefereeCommand(data) {
    const color = data.type === 'BREAK' ? '#ffaa00' : '#88ff88';

    // Show referee command in action feed
    this.addAction(`{${color}-fg}{bold}REF: "${data.text}"{/bold}{/${color}-fg}`);

    // For BREAK command, also show in commentary
    if (data.type === 'BREAK') {
      this.addCommentary(`{#ffaa00-fg}${data.refName}: "${data.text}" - Fighters separated{/#ffaa00-fg}`);
    } else if (data.type === 'WORK') {
      this.addCommentary(`{#aaaaaa-fg}${data.refName}: "${data.text}"{/#aaaaaa-fg}`);
    }

    this.screen.render();
  }

  /**
   * Handle referee count during knockdown - arcade style big numbers
   */
  onCount(data) {
    const fighter = data.fighter === 'A' ? this.fight.fighterA : this.fight.fighterB;
    const count = data.count;
    const isKO = data.isKO || false;
    const color = data.fighter === 'A' ? '#ff4444' : '#4488ff';

    // Show the count overlay
    this.boxes.countOverlay.show();

    // Build dramatic count display - fighting game style
    const bigNumber = this.getBigCountNumber(count);

    // Color intensifies as count gets higher
    let countColor = '#ffffff';
    let bgEffect = '';
    if (count >= 9) { countColor = '#ff0000'; bgEffect = '{bold}'; }
    else if (count >= 7) { countColor = '#ff4400'; }
    else if (count >= 5) { countColor = '#ffaa00'; }

    const fighterName = fighter.getShortName().toUpperCase();

    const content = [
      `{center}{${color}-fg}{bold}★ KNOCKDOWN ★{/bold}{/${color}-fg}{/center}`,
      '',
      `{center}{${countColor}-fg}{bold}${bigNumber}{/bold}{/${countColor}-fg}{/center}`,
      '',
      `{center}{bold}${fighterName}{/bold}{/center}`,
      '',
      isKO ? `{center}{#ff0000-fg}{bold}★★★ K.O.! ★★★{/bold}{/#ff0000-fg}{/center}` :
        count >= 8 ? `{center}{#ffaa00-fg}GET UP!{/#ffaa00-fg}{/center}` : ''
    ].join('\n');

    this.boxes.countOverlay.setContent(content);
    this.screen.render();

    // If count reaches 10, keep overlay briefly then hide
    if (count === 10) {
      setTimeout(() => {
        this.boxes.countOverlay.hide();
        this.screen.render();
      }, 1500);
    }
  }

  /**
   * Get big ASCII representation for count
   */
  getBigCountNumber(count) {
    // Arcade style - huge single digit display
    const numbers = {
      1: '  ╔═╗  \n  ║█║  \n  ╚═╝  ',
      2: ' ╔══╗ \n ╔═█║ \n ║█══╝',
      3: ' ╔══╗ \n ╔═█║ \n ╚══╝ ',
      4: ' ║ ║ \n ╚═█║ \n   ║ ',
      5: ' ╔══╗ \n ║█═╗ \n ╚══╝ ',
      6: ' ╔══╗ \n ║█═╗ \n ╚══╝ ',
      7: ' ╔══╗ \n   █║ \n   ║ ',
      8: ' ╔══╗ \n ║█═║ \n ╚══╝ ',
      9: ' ╔══╗ \n ╚═█║ \n ╚══╝ ',
      10: '╔═╗╔══╗\n║█║║  ║\n╚═╝╚══╝'
    };
    // Simpler arcade display with large text emphasis
    if (count === 10) return '★★★ 10 ★★★';
    return `>>> ${count} <<<`;
  }

  /**
   * Handle pre-fight-end announcement - cinematic buildup
   */
  onFightEnding(data) {
    const isKO = data.isKO || false;
    const winner = data.winner;
    const winnerFighter = winner ? this.fight.getFighter(winner) : null;
    const winnerColor = winner === 'A' ? '#ff4444' : '#4488ff';

    // Show ending overlay with dramatic arcade text
    this.boxes.endingOverlay.show();

    let content;
    if (isKO) {
      content = [
        '',
        `{center}{#ff0000-fg}{bold}★★★★★★★★★★★★★★★★★★★★★{/#ff0000-fg}{/bold}{/center}`,
        `{center}{#ff0000-fg}{bold}    IT\'S ALL OVER!    {/#ff0000-fg}{/bold}{/center}`,
        `{center}{#ff0000-fg}{bold}★★★★★★★★★★★★★★★★★★★★★{/#ff0000-fg}{/bold}{/center}`,
        '',
        winnerFighter ?
          `{center}{${winnerColor}-fg}{bold}${winnerFighter.getShortName().toUpperCase()} WINS!{/${winnerColor}-fg}{/bold}{/center}` : '',
        ''
      ].join('\n');
    } else {
      content = [
        '',
        `{center}{#ffcc00-fg}{bold}════════════════════════{/#ffcc00-fg}{/bold}{/center}`,
        `{center}{#ffcc00-fg}{bold}    THE FINAL BELL!    {/#ffcc00-fg}{/bold}{/center}`,
        `{center}{#ffcc00-fg}{bold}════════════════════════{/#ffcc00-fg}{/bold}{/center}`,
        '',
        `{center}{#ffffff-fg}{bold}WAITING FOR DECISION...{/#ffffff-fg}{/bold}{/center}`,
        ''
      ].join('\n');
    }

    this.boxes.endingOverlay.setContent(content);
    this.screen.render();
  }

  onFightEnd(data) {
    // Hide the ending overlay
    this.boxes.endingOverlay.hide();
    // Broadcast team commentary
    const event = {
      type: 'FIGHT_END',
      winner: data.winner,
      method: data.method,
      round: data.round || this.currentRound,
      scorecards: data.scorecards
    };

    const commentary = this.commentaryGenerator.generate(event, { currentRound: this.currentRound });

    this.addCommentary('');
    this.addCommentary(`{bold}{#ffcc00-fg}╔══════════════════════════════════════════╗{/#ffcc00-fg}{/bold}`);
    this.addCommentary(`{bold}{#ffcc00-fg}║         ★★★  FIGHT OVER!  ★★★           ║{/#ffcc00-fg}{/bold}`);
    this.addCommentary(`{bold}{#ffcc00-fg}╚══════════════════════════════════════════╝{/#ffcc00-fg}{/bold}`);
    this.addCommentary('');

    // Add broadcast commentary
    for (const line of commentary) {
      if (line.priority === 'critical') {
        this.addCommentary(`{bold}{green-fg}${line.text}{/green-fg}{/bold}`);
      } else if (line.priority === 'high') {
        this.addCommentary(`{bold}${line.text}{/bold}`);
      } else {
        this.addCommentaryLine(line);
      }
    }

    this.addCommentary('');

    if (data.winner) {
      const winner = this.fight.getFighter(data.winner);
      const color = data.winner === 'A' ? '#ff4444' : '#4488ff';
      this.addCommentary(`{bold}{${color}-fg}★ WINNER: ${winner.name.toUpperCase()} ★{/${color}-fg}{/bold}`);
      this.addCommentary(`{bold}By: ${this.formatMethod(data.method)}{/bold}`);
      if (data.round && !data.method.includes('DECISION')) {
        this.addCommentary(`{bold}Time: Round ${data.round}{/bold}`);
      }
    } else {
      this.addCommentary(`{bold}{#ffcc00-fg}★ DRAW ★{/#ffcc00-fg}{/bold}`);
    }

    this.fightEnded = true;
    this.updateStatus('{green-fg}{bold}FIGHT OVER{/bold} - Press any key to return to menu{/green-fg}');
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

  // ══════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════

  addCommentary(text) {
    // Re-use commentary box from SimpleTUI interface
    const box = this.boxes.commentary;
    const content = box.getContent();
    const lines = content.split('\n');
    lines.push(text);

    if (lines.length > 100) {
      lines.splice(0, lines.length - 100);
    }

    box.setContent(lines.join('\n'));
    box.setScrollPerc(100);
  }

  /**
   * Format commentary line with speaker styling
   */
  addCommentaryLine(line) {
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

  updateStatus(text) {
    this.boxes.status.setContent(` ${text}`);
  }

  padCenter(str, width) {
    const s = str.toString();
    if (s.length >= width) return s;
    const left = Math.floor((width - s.length) / 2);
    return ' '.repeat(left) + s + ' '.repeat(width - s.length - left);
  }

  getPunchName(punchType) {
    const names = {
      'jab': 'JAB',
      'cross': 'CROSS',
      'lead_hook': 'L.HOOK',
      'rear_hook': 'R.HOOK',
      'lead_uppercut': 'L.UPPER',
      'rear_uppercut': 'R.UPPER',
      'body_jab': 'BODY JAB',
      'body_cross': 'BODY SHOT',
      'body_hook_lead': 'BODY HOOK',
      'body_hook_rear': 'BODY HOOK'
    };
    return names[punchType] || 'PUNCH';
  }

  formatMethod(method) {
    const formats = {
      'KO': 'KNOCKOUT',
      'TKO_REFEREE': 'TKO (Ref Stop)',
      'TKO_CORNER': 'TKO (Corner)',
      'TKO_THREE_KNOCKDOWNS': 'TKO (3 KDs)',
      'DECISION_UNANIMOUS': 'Unanimous Decision',
      'DECISION_SPLIT': 'Split Decision',
      'DECISION_MAJORITY': 'Majority Decision'
    };
    return formats[method] || method;
  }

  cleanup() {
    if (this.screen) {
      this.screen.destroy();
    }
  }
}

export default ArcadeTUI;
