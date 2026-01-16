/**
 * GameMenu - Game-style interactive menu system
 * Arrow-key navigation, fighter selection with preview, VS screens
 * Fully themed using the themes system
 */

import blessed from 'blessed';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { THEMES, getThemeList, DEFAULT_THEME } from './themes.js';
import { Universe } from '../universe/models/Universe.js';
import { FighterGenerator } from '../universe/generation/FighterGenerator.js';
import { WeekProcessor } from '../universe/simulation/WeekProcessor.js';
import { SaveManager } from '../universe/persistence/SaveManager.js';
import { UniverseTUI } from './UniverseTUI.js';

export class GameMenu {
  constructor() {
    this.screen = null;
    this.currentView = 'main';
    this.selectedIndex = 0;
    this.fighters = [];
    this.selectedFighterA = null;
    this.selectedFighterB = null;
    this.fightOptions = {
      rounds: 12,
      speed: 3,
      display: 'arcade',  // 'hbo' or 'arcade'
      theme: DEFAULT_THEME
    };
    this.availableThemes = getThemeList();
    this.onStartFight = null;
    this.onExit = null;
  }

  /**
   * Get current theme colors
   */
  get theme() {
    return THEMES[this.fightOptions.theme] || THEMES[DEFAULT_THEME];
  }

  /**
   * Load all available fighters from disk
   */
  loadFighters() {
    const fighterDirs = [
      'fighters/custom',
      'fighters/templates/historical'
    ];

    this.fighters = [];

    for (const dir of fighterDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

        const filePath = path.join(dir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = yaml.parse(content);

          this.fighters.push({
            path: filePath,
            data: data,
            name: data.identity?.name || file.replace(/\.(yaml|yml)$/, ''),
            nickname: data.identity?.nickname || '',
            record: data.record || { wins: 0, losses: 0, draws: 0, kos: 0 }
          });
        } catch (e) {
          // Skip invalid files
        }
      }
    }

    return this.fighters;
  }

  /**
   * Initialize the menu screen
   */
  initialize() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Fight Fortress',
      fullUnicode: true
    });

    this.loadFighters();
    this.showMainMenu();
  }

  /**
   * Create a stat bar visualization
   */
  createStatBar(value, maxWidth = 20, color = null) {
    const barColor = color || this.theme.health;
    const filled = Math.round((value / 100) * maxWidth);
    const empty = maxWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `{${barColor}-fg}${bar}{/${barColor}-fg}`;
  }

  /**
   * Clear all children from screen
   */
  clearScreen() {
    while (this.screen.children.length) {
      this.screen.children[0].detach();
    }
  }

  /**
   * Show the main menu
   */
  showMainMenu() {
    this.currentView = 'main';
    this.selectedIndex = 0;
    this.clearScreen();

    const t = this.theme;

    const menuItems = [
      { label: 'START FIGHT', action: 'startFight', icon: '⚔' },
      { label: 'QUICK FIGHT', action: 'quickFight', icon: '⚡' },
      { label: 'UNIVERSE MODE', action: 'universeMode', icon: '🌍' },
      { label: 'VIEW ROSTER', action: 'viewRoster', icon: '📋' },
      { label: 'THEME', action: 'selectTheme', icon: '🎨' },
      { label: 'EXIT', action: 'exit', icon: '🚪' }
    ];

    // Background
    const bg = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title box with ASCII art
    const titleBox = blessed.box({
      parent: this.screen,
      top: 2,
      left: 'center',
      width: 60,
      height: 10,
      tags: true,
      content: this.getAsciiTitle(),
      style: {
        fg: t.fighterA,
        bold: true
      }
    });

    // Subtitle
    const subtitle = blessed.box({
      parent: this.screen,
      top: 11,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}Boxing Simulation Engine{/${t.commentary}-fg}{/center}`,
      style: { fg: t.commentary }
    });

    // Menu container
    const menuContainer = blessed.box({
      parent: this.screen,
      top: 14,
      left: 'center',
      width: 40,
      height: menuItems.length * 3 + 2,
      border: { type: 'line' },
      style: {
        border: { fg: t.border },
        bg: t.background
      }
    });

    // Create menu item boxes
    this.menuItemBoxes = menuItems.map((item, index) => {
      const box = blessed.box({
        parent: menuContainer,
        top: index * 3,
        left: 0,
        width: '100%-2',
        height: 3,
        tags: true,
        style: {
          bg: index === this.selectedIndex ? t.fighterA : t.background,
          fg: index === this.selectedIndex ? t.background : t.foreground
        }
      });

      this.updateMenuItem(box, item, index === this.selectedIndex);
      return { box, item };
    });

    // Controls hint
    const controls = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 60,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Navigate  •  ENTER Select  •  Q Quit{/${t.commentary}-fg}{/center}`
    });

    // Key bindings
    this.screen.key(['up', 'k'], () => this.navigateMenu(-1));
    this.screen.key(['down', 'j'], () => this.navigateMenu(1));
    this.screen.key(['enter', 'space'], () => this.selectMenuItem());
    this.screen.key(['q', 'escape'], () => this.handleExit());

    this.screen.render();
  }

  /**
   * Get ASCII title art
   */
  getAsciiTitle() {
    return `{center}
╔═══════════════════════════════════════════════╗
║   ███████╗██╗ ██████╗ ██╗  ██╗████████╗       ║
║   ██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝       ║
║   █████╗  ██║██║  ███╗███████║   ██║          ║
║   ██╔══╝  ██║██║   ██║██╔══██║   ██║          ║
║   ██║     ██║╚██████╔╝██║  ██║   ██║          ║
║   ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝          ║
║            F O R T R E S S                    ║
╚═══════════════════════════════════════════════╝
{/center}`;
  }

  /**
   * Update a menu item's appearance
   */
  updateMenuItem(box, item, selected) {
    const t = this.theme;
    const icon = item.icon || '>';
    const prefix = selected ? '  ►  ' : '     ';
    const suffix = selected ? '  ◄' : '';
    box.setContent(`\n${prefix}${icon}  ${item.label}${suffix}`);
    box.style.bg = selected ? t.fighterA : t.background;
    box.style.fg = selected ? t.background : t.foreground;
  }

  /**
   * Navigate the menu
   */
  navigateMenu(direction) {
    if (this.currentView !== 'main') return;

    const oldIndex = this.selectedIndex;
    this.selectedIndex += direction;

    if (this.selectedIndex < 0) this.selectedIndex = this.menuItemBoxes.length - 1;
    if (this.selectedIndex >= this.menuItemBoxes.length) this.selectedIndex = 0;

    // Update visual state
    const oldItem = this.menuItemBoxes[oldIndex];
    const newItem = this.menuItemBoxes[this.selectedIndex];

    this.updateMenuItem(oldItem.box, oldItem.item, false);
    this.updateMenuItem(newItem.box, newItem.item, true);

    this.screen.render();
  }

  /**
   * Select current menu item
   */
  selectMenuItem() {
    if (this.currentView !== 'main') return;

    const item = this.menuItemBoxes[this.selectedIndex].item;

    switch (item.action) {
      case 'startFight':
        this.showFighterSelect('A');
        break;
      case 'quickFight':
        this.startQuickFight();
        break;
      case 'universeMode':
        this.showUniverseMenu();
        break;
      case 'viewRoster':
        this.showRoster();
        break;
      case 'selectTheme':
        this.showThemeSelection();
        break;
      case 'exit':
        this.handleExit();
        break;
    }
  }

  /**
   * Show fighter selection screen
   */
  showFighterSelect(slot) {
    this.currentView = 'selectFighter';
    this.selectingSlot = slot;
    this.selectedIndex = 0;
    this.clearScreen();

    const t = this.theme;

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    const slotColor = slot === 'A' ? t.fighterA : t.fighterB;
    const title = blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 50,
      height: 3,
      tags: true,
      content: `{center}{bold}SELECT FIGHTER ${slot}{/bold}\n{${t.commentary}-fg}${slot === 'A' ? 'Red Corner' : 'Blue Corner'}{/${t.commentary}-fg}{/center}`,
      style: { fg: slotColor }
    });

    // Fighter list (left side)
    this.fighterList = blessed.list({
      parent: this.screen,
      top: 5,
      left: 2,
      width: '40%',
      height: '70%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHTERS ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        style: { fg: t.fighterA }
      }
    });

    // Populate fighter list
    this.fighters.forEach((fighter, idx) => {
      const record = `${fighter.record.wins}-${fighter.record.losses}`;
      const isSelected = (slot === 'B' && this.selectedFighterA?.path === fighter.path);
      const prefix = isSelected ? `{${t.commentary}-fg}[SELECTED] ` : '';
      const suffix = isSelected ? `{/${t.commentary}-fg}` : '';
      this.fighterList.addItem(`${prefix}${fighter.name} (${record})${suffix}`);
    });

    // Fighter preview (right side)
    this.fighterPreview = blessed.box({
      parent: this.screen,
      top: 5,
      left: '45%',
      width: '53%',
      height: '70%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHTER PROFILE ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        fg: t.foreground
      }
    });

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 70,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ENTER Select  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    // Update preview when selection changes
    this.fighterList.on('select item', () => {
      this.updateFighterPreview(this.fighterList.selected);
    });

    // Initial preview
    this.updateFighterPreview(0);

    // Key bindings
    this.fighterList.key(['enter', 'space'], () => {
      const fighter = this.fighters[this.fighterList.selected];

      // Don't allow selecting same fighter twice
      if (slot === 'B' && this.selectedFighterA?.path === fighter.path) {
        return;
      }

      if (slot === 'A') {
        this.selectedFighterA = fighter;
        this.showFighterSelect('B');
      } else {
        this.selectedFighterB = fighter;
        this.showFightOptions();
      }
    });

    this.fighterList.key(['escape', 'q'], () => {
      if (slot === 'B') {
        this.selectedFighterA = null;
        this.showFighterSelect('A');
      } else {
        this.showMainMenu();
      }
    });

    this.fighterList.focus();
    this.screen.render();
  }

  /**
   * Update the fighter preview panel
   */
  updateFighterPreview(index) {
    const fighter = this.fighters[index];
    if (!fighter) return;

    const t = this.theme;
    const data = fighter.data;
    const phys = data.physical || {};
    const style = data.style || {};
    const record = data.record || {};
    const power = data.power || {};
    const speed = data.speed || {};
    const defense = data.defense || {};
    const mental = data.mental || {};

    // Calculate overall rating
    const overall = Math.round(
      ((power.powerRight || 70) + (speed.handSpeed || 70) +
       (defense.headMovement || 70) + (mental.chin || 70)) / 4
    );

    const heightFt = Math.floor((phys.height || 180) / 30.48);
    const heightIn = Math.round(((phys.height || 180) / 2.54) % 12);
    const weightLbs = Math.round((phys.weight || 90) * 2.205);

    const content = `
{bold}{${t.fighterA}-fg}${fighter.name}{/${t.fighterA}-fg}{/bold}
{${t.commentary}-fg}"${fighter.nickname || 'The Fighter'}"{/${t.commentary}-fg}

{${t.round}-fg}RECORD:{/${t.round}-fg} ${record.wins || 0}W - ${record.losses || 0}L - ${record.draws || 0}D (${record.kos || 0} KOs)
{${t.round}-fg}STYLE:{/${t.round}-fg}  ${style.primary || 'Orthodox'}

{${t.stamina}-fg}━━━ PHYSICAL ━━━{/${t.stamina}-fg}
Height: ${heightFt}'${heightIn}" (${phys.height || 180}cm)
Weight: ${weightLbs} lbs (${phys.weight || 90}kg)
Reach:  ${phys.reach || 180}cm
Stance: ${phys.stance || 'Orthodox'}

{${t.stamina}-fg}━━━ ATTRIBUTES ━━━{/${t.stamina}-fg}
Power     ${this.createStatBar(power.powerRight || 70, 15, t.health)}  ${power.powerRight || 70}
Speed     ${this.createStatBar(speed.handSpeed || 70, 15, t.round)}  ${speed.handSpeed || 70}
Defense   ${this.createStatBar(defense.headMovement || 70, 15, t.stamina)}  ${defense.headMovement || 70}
Chin      ${this.createStatBar(mental.chin || 70, 15, t.block)}  ${mental.chin || 70}
Heart     ${this.createStatBar(mental.heart || 70, 15, t.fighterA)}  ${mental.heart || 70}

{bold}{${t.round}-fg}OVERALL: ${overall}{/${t.round}-fg}{/bold}
`;

    this.fighterPreview.setContent(content);
    this.screen.render();
  }

  /**
   * Show fight options screen
   */
  showFightOptions() {
    this.currentView = 'options';
    this.clearScreen();

    const t = this.theme;

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // VS Header
    const vsBox = blessed.box({
      parent: this.screen,
      top: 2,
      left: 'center',
      width: 70,
      height: 7,
      tags: true,
      content: this.getVsHeader(),
      style: { bg: t.background }
    });

    // Options container
    const optionsBox = blessed.box({
      parent: this.screen,
      top: 10,
      left: 'center',
      width: 50,
      height: 15,
      tags: true,
      border: { type: 'line' },
      label: ' FIGHT OPTIONS ',
      style: {
        border: { fg: t.border },
        bg: t.background
      }
    });

    // Rounds option
    this.roundsValue = blessed.box({
      parent: optionsBox,
      top: 1,
      left: 2,
      width: '100%-6',
      height: 3,
      tags: true
    });

    // Speed option
    this.speedValue = blessed.box({
      parent: optionsBox,
      top: 4,
      left: 2,
      width: '100%-6',
      height: 3,
      tags: true
    });

    // Display mode option
    this.displayValue = blessed.box({
      parent: optionsBox,
      top: 7,
      left: 2,
      width: '100%-6',
      height: 3,
      tags: true
    });

    // Start button
    this.startButton = blessed.box({
      parent: optionsBox,
      top: 11,
      left: 'center',
      width: 20,
      height: 1,
      tags: true,
      content: `{center}{bold}{${t.health}-fg}[ START FIGHT ]{/${t.health}-fg}{/bold}{/center}`
    });

    this.optionIndex = 0;
    this.updateOptionsDisplay();

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 70,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}←/→ Adjust  •  ↑/↓ Navigate  •  ENTER Start  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    // Key bindings
    this.screen.key(['up', 'k'], () => this.navigateOptions(-1));
    this.screen.key(['down', 'j'], () => this.navigateOptions(1));
    this.screen.key(['left', 'h'], () => this.adjustOption(-1));
    this.screen.key(['right', 'l'], () => this.adjustOption(1));
    this.screen.key(['enter', 'space'], () => this.confirmOptions());
    this.screen.key(['escape', 'q'], () => {
      this.selectedFighterB = null;
      this.showFighterSelect('B');
    });

    this.screen.render();
  }

  /**
   * Get VS header display
   */
  getVsHeader() {
    const t = this.theme;
    const a = this.selectedFighterA;
    const b = this.selectedFighterB;
    const recA = `${a.record.wins}-${a.record.losses}`;
    const recB = `${b.record.wins}-${b.record.losses}`;

    return `{center}
{bold}{${t.fighterA}-fg}${a.name.toUpperCase()}{/${t.fighterA}-fg}{/bold}
{${t.commentary}-fg}(${recA}) "${a.nickname}"{/${t.commentary}-fg}

{bold}{${t.round}-fg}━━━  VS  ━━━{/${t.round}-fg}{/bold}

{bold}{${t.fighterB}-fg}${b.name.toUpperCase()}{/${t.fighterB}-fg}{/bold}
{${t.commentary}-fg}(${recB}) "${b.nickname}"{/${t.commentary}-fg}
{/center}`;
  }

  /**
   * Update options display
   */
  updateOptionsDisplay() {
    const t = this.theme;
    const roundsSelected = this.optionIndex === 0;
    const speedSelected = this.optionIndex === 1;
    const displaySelected = this.optionIndex === 2;
    const startSelected = this.optionIndex === 3;

    const roundsPrefix = roundsSelected ? `{${t.round}-fg}► ` : '  ';
    const roundsSuffix = roundsSelected ? ` ◄{/${t.round}-fg}` : '';
    const speedPrefix = speedSelected ? `{${t.round}-fg}► ` : '  ';
    const speedSuffix = speedSelected ? ` ◄{/${t.round}-fg}` : '';
    const displayPrefix = displaySelected ? `{${t.round}-fg}► ` : '  ';
    const displaySuffix = displaySelected ? ` ◄{/${t.round}-fg}` : '';

    this.roundsValue.setContent(
      `${roundsPrefix}Rounds:  ◀  {bold}${this.fightOptions.rounds}{/bold}  ▶${roundsSuffix}`
    );

    this.speedValue.setContent(
      `${speedPrefix}Speed:   ◀  {bold}${this.fightOptions.speed}x{/bold}  ▶${speedSuffix}`
    );

    // Display mode names
    const displayName = this.fightOptions.display === 'arcade' ? 'ARCADE' : 'CLASSIC';
    const displayColor = this.fightOptions.display === 'arcade' ? t.fighterA : t.stamina;

    this.displayValue.setContent(
      `${displayPrefix}Display: ◀  {${displayColor}-fg}{bold}${displayName}{/bold}{/${displayColor}-fg}  ▶${displaySuffix}`
    );

    if (startSelected) {
      this.startButton.setContent(`{center}{bold}{${t.health}-fg}[ ★ START FIGHT ★ ]{/${t.health}-fg}{/bold}{/center}`);
    } else {
      this.startButton.setContent(`{center}{${t.commentary}-fg}[ START FIGHT ]{/${t.commentary}-fg}{/center}`);
    }

    this.screen.render();
  }

  /**
   * Navigate options
   */
  navigateOptions(direction) {
    this.optionIndex += direction;
    if (this.optionIndex < 0) this.optionIndex = 3;
    if (this.optionIndex > 3) this.optionIndex = 0;
    this.updateOptionsDisplay();
  }

  /**
   * Adjust option value
   */
  adjustOption(direction) {
    if (this.optionIndex === 0) {
      // Rounds: 4, 6, 8, 10, 12, 15
      const roundOptions = [4, 6, 8, 10, 12, 15];
      const currentIdx = roundOptions.indexOf(this.fightOptions.rounds);
      let newIdx = currentIdx + direction;
      if (newIdx < 0) newIdx = roundOptions.length - 1;
      if (newIdx >= roundOptions.length) newIdx = 0;
      this.fightOptions.rounds = roundOptions[newIdx];
    } else if (this.optionIndex === 1) {
      // Speed: 1-10
      this.fightOptions.speed += direction;
      if (this.fightOptions.speed < 1) this.fightOptions.speed = 10;
      if (this.fightOptions.speed > 10) this.fightOptions.speed = 1;
    } else if (this.optionIndex === 2) {
      // Display mode: toggle between 'hbo' and 'arcade'
      this.fightOptions.display = this.fightOptions.display === 'hbo' ? 'arcade' : 'hbo';
    }
    this.updateOptionsDisplay();
  }

  /**
   * Confirm options and start fight
   */
  confirmOptions() {
    if (this.optionIndex === 3 || this.currentView === 'options') {
      this.launchFight();
    }
  }

  /**
   * Launch the fight
   */
  launchFight() {
    // Destroy menu screen
    this.screen.destroy();

    if (this.onStartFight) {
      this.onStartFight(
        this.selectedFighterA.path,
        this.selectedFighterB.path,
        this.fightOptions.rounds,
        this.fightOptions.speed,
        this.fightOptions.display,
        this.fightOptions.theme
      );
    }
  }

  /**
   * Start a quick fight with default fighters
   */
  startQuickFight() {
    const defaultA = this.fighters.find(f => f.path.includes('martinez'));
    const defaultB = this.fighters.find(f => f.path.includes('johnson'));

    if (defaultA && defaultB) {
      this.selectedFighterA = defaultA;
      this.selectedFighterB = defaultB;
      this.fightOptions.rounds = 10;
      this.fightOptions.speed = 3;
      this.fightOptions.display = 'arcade';
      this.launchFight();
    } else if (this.fighters.length >= 2) {
      // Use first two fighters if defaults not found
      this.selectedFighterA = this.fighters[0];
      this.selectedFighterB = this.fighters[1];
      this.fightOptions.rounds = 10;
      this.fightOptions.speed = 3;
      this.fightOptions.display = 'arcade';
      this.launchFight();
    }
  }

  /**
   * Show roster view
   */
  showRoster() {
    this.currentView = 'roster';
    this.clearScreen();

    const t = this.theme;

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 30,
      height: 1,
      tags: true,
      content: `{center}{bold}{${t.round}-fg}FIGHTER ROSTER{/${t.round}-fg}{/bold}{/center}`
    });

    // Fighter list
    const rosterList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 2,
      width: '40%',
      height: '80%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHTERS ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      mouse: true
    });

    this.fighters.forEach(fighter => {
      const record = `${fighter.record.wins}-${fighter.record.losses}`;
      rosterList.addItem(`${fighter.name} (${record})`);
    });

    // Fighter preview
    const preview = blessed.box({
      parent: this.screen,
      top: 4,
      left: '45%',
      width: '53%',
      height: '80%',
      tags: true,
      border: { type: 'line' },
      label: ' PROFILE ',
      style: {
        border: { fg: t.border },
        bg: t.background
      }
    });

    // Update preview on selection
    const updatePreview = (idx) => {
      const fighter = this.fighters[idx];
      if (!fighter) return;

      const data = fighter.data;
      const phys = data.physical || {};
      const style = data.style || {};
      const record = data.record || {};
      const power = data.power || {};
      const speed = data.speed || {};
      const defense = data.defense || {};
      const mental = data.mental || {};
      const corner = data.corner || {};

      const heightFt = Math.floor((phys.height || 180) / 30.48);
      const heightIn = Math.round(((phys.height || 180) / 2.54) % 12);
      const weightLbs = Math.round((phys.weight || 90) * 2.205);

      preview.setContent(`
{bold}{${t.fighterA}-fg}${fighter.name}{/${t.fighterA}-fg}{/bold}
{${t.commentary}-fg}"${fighter.nickname}"{/${t.commentary}-fg}

{${t.round}-fg}RECORD:{/${t.round}-fg} ${record.wins}W - ${record.losses}L - ${record.draws}D (${record.kos} KOs)

{${t.stamina}-fg}━━━ FIGHTING STYLE ━━━{/${t.stamina}-fg}
Primary:   ${style.primary || '-'}
Defensive: ${style.defensive || '-'}
Offensive: ${style.offensive || '-'}

{${t.stamina}-fg}━━━ PHYSICAL ━━━{/${t.stamina}-fg}
Height: ${heightFt}'${heightIn}" | Weight: ${weightLbs}lbs | Reach: ${phys.reach}cm

{${t.stamina}-fg}━━━ KEY ATTRIBUTES ━━━{/${t.stamina}-fg}
Power      ${this.createStatBar(power.powerRight || 70, 12, t.health)}  ${power.powerRight || '-'}
KO Power   ${this.createStatBar(power.knockoutPower || 70, 12, t.health)}  ${power.knockoutPower || '-'}
Hand Speed ${this.createStatBar(speed.handSpeed || 70, 12, t.round)}  ${speed.handSpeed || '-'}
Reflexes   ${this.createStatBar(speed.reflexes || 70, 12, t.round)}  ${speed.reflexes || '-'}
Head Mvmt  ${this.createStatBar(defense.headMovement || 70, 12, t.stamina)}  ${defense.headMovement || '-'}
Chin       ${this.createStatBar(mental.chin || 70, 12, t.block)}  ${mental.chin || '-'}
Heart      ${this.createStatBar(mental.heart || 70, 12, t.fighterA)}  ${mental.heart || '-'}
Fight IQ   ${this.createStatBar(data.technical?.fightIQ || 70, 12, t.stamina)}  ${data.technical?.fightIQ || '-'}

{${t.stamina}-fg}━━━ CORNER ━━━{/${t.stamina}-fg}
Trainer: ${corner.headTrainer?.name || 'Unknown'}
Cutman:  ${corner.cutman?.name || 'Unknown'}
`);
      this.screen.render();
    };

    rosterList.on('select item', () => updatePreview(rosterList.selected));
    updatePreview(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    rosterList.key(['escape', 'q'], () => this.showMainMenu());
    rosterList.focus();
    this.screen.render();
  }

  /**
   * Show theme selection screen
   * @param {number} startIndex - Optional index to start selection at
   */
  showThemeSelection(startIndex = null) {
    this.currentView = 'theme';
    this.clearScreen();

    const t = this.theme;

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape', 'right', 'l']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 30,
      height: 1,
      tags: true,
      content: `{center}{bold}{${t.round}-fg}SELECT THEME{/${t.round}-fg}{/bold}{/center}`
    });

    // Theme list
    const themeList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 'center',
      width: 50,
      height: this.availableThemes.length + 2,
      tags: true,
      border: { type: 'line' },
      label: ' THEMES ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      mouse: true
    });

    // Populate theme list
    this.availableThemes.forEach(theme => {
      const isActive = theme.id === this.fightOptions.theme;
      const prefix = isActive ? '★ ' : '  ';
      const suffix = isActive ? ' (active)' : '';
      themeList.addItem(`${prefix}${theme.name}${suffix}`);
    });

    // Select current theme or use provided start index
    const currentIdx = startIndex !== null
      ? startIndex
      : this.availableThemes.findIndex(th => th.id === this.fightOptions.theme);
    if (currentIdx >= 0) {
      themeList.select(currentIdx);
    }

    // Theme preview box
    const previewBox = blessed.box({
      parent: this.screen,
      top: 5 + this.availableThemes.length + 2,
      left: 'center',
      width: 60,
      height: 12,
      tags: true,
      border: { type: 'line' },
      label: ' PREVIEW ',
      style: {
        border: { fg: t.border },
        bg: t.background
      }
    });

    // Update preview when selection changes
    const updatePreview = (idx) => {
      const themeInfo = this.availableThemes[idx];
      if (!themeInfo) return;

      const colors = THEMES[themeInfo.id];

      // Update preview box background to show the theme
      previewBox.style.bg = colors.background;
      previewBox.style.border.fg = colors.border;

      previewBox.setContent(`
  {bold}{${colors.foreground}-fg}${colors.name}{/${colors.foreground}-fg}{/bold}

  {${colors.fighterA}-fg}■ Fighter A{/${colors.fighterA}-fg}   {${colors.fighterB}-fg}■ Fighter B{/${colors.fighterB}-fg}

  {${colors.health}-fg}████████{/${colors.health}-fg} Health   {${colors.stamina}-fg}████████{/${colors.stamina}-fg} Stamina

  {${colors.punch}-fg}●{/${colors.punch}-fg} Punch  {${colors.block}-fg}●{/${colors.block}-fg} Block  {${colors.evade}-fg}●{/${colors.evade}-fg} Evade  {${colors.ko}-fg}●{/${colors.ko}-fg} KO

  {${colors.commentary}-fg}Commentary text sample{/${colors.commentary}-fg}
`);
      this.screen.render();
    };

    themeList.on('select item', () => updatePreview(themeList.selected));
    updatePreview(currentIdx >= 0 ? currentIdx : 0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 60,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ENTER Select  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    // Key bindings - Apply theme immediately and refresh
    themeList.key(['enter', 'space'], () => {
      const selectedTheme = this.availableThemes[themeList.selected];
      if (selectedTheme && selectedTheme.id !== this.fightOptions.theme) {
        this.fightOptions.theme = selectedTheme.id;
        // Re-render theme selection with new theme applied, preserving position
        this.showThemeSelection(themeList.selected);
      }
    });

    // Right arrow also applies theme (for quick cycling)
    themeList.key(['right', 'l'], () => {
      const selectedTheme = this.availableThemes[themeList.selected];
      if (selectedTheme && selectedTheme.id !== this.fightOptions.theme) {
        this.fightOptions.theme = selectedTheme.id;
        this.showThemeSelection(themeList.selected);
      }
    });

    themeList.key(['escape', 'q'], () => this.showMainMenu());
    themeList.focus();
    this.screen.render();
  }

  /**
   * Show Universe Mode menu
   */
  showUniverseMenu() {
    this.currentView = 'universe';
    this.clearScreen();

    const t = this.theme;

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 2,
      left: 'center',
      width: 50,
      height: 5,
      tags: true,
      content: `{center}{bold}{${t.fighterA}-fg}
╔═══════════════════════════════════════╗
║         UNIVERSE MODE                 ║
╚═══════════════════════════════════════╝
{/${t.fighterA}-fg}{/bold}{/center}`,
      style: { fg: t.fighterA }
    });

    // Check for existing saves
    this.saveManager = new SaveManager('.');
    const saves = this.saveManager.listSaves();

    // Menu options
    const menuOptions = [
      { label: 'NEW UNIVERSE', action: 'newUniverse', icon: '✨' },
    ];

    if (saves.length > 0) {
      menuOptions.push({ label: 'LOAD UNIVERSE', action: 'loadUniverse', icon: '📂' });
    }

    menuOptions.push({ label: 'BACK', action: 'back', icon: '←' });

    // Menu container
    const menuContainer = blessed.box({
      parent: this.screen,
      top: 9,
      left: 'center',
      width: 40,
      height: menuOptions.length * 3 + 2,
      border: { type: 'line' },
      style: {
        border: { fg: t.border },
        bg: t.background
      }
    });

    this.universeMenuIndex = 0;
    this.universeMenuItems = menuOptions.map((item, index) => {
      const box = blessed.box({
        parent: menuContainer,
        top: index * 3,
        left: 0,
        width: '100%-2',
        height: 3,
        tags: true,
        style: {
          bg: index === 0 ? t.fighterA : t.background,
          fg: index === 0 ? t.background : t.foreground
        }
      });
      this.updateMenuItem(box, item, index === 0);
      return { box, item };
    });

    // Info box
    blessed.box({
      parent: this.screen,
      top: 9 + menuOptions.length * 3 + 3,
      left: 'center',
      width: 60,
      height: 6,
      tags: true,
      content: `{center}{${t.commentary}-fg}
Universe Mode simulates an entire boxing world!
Fighters are generated, age, fight, and retire.
Watch careers unfold over years of simulation.
{/${t.commentary}-fg}{/center}`
    });

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Navigate  •  ENTER Select  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    // Key bindings
    this.screen.key(['up', 'k'], () => this.navigateUniverseMenu(-1));
    this.screen.key(['down', 'j'], () => this.navigateUniverseMenu(1));
    this.screen.key(['enter', 'space'], () => this.selectUniverseMenuItem());
    this.screen.key(['escape', 'q'], () => this.showMainMenu());

    this.screen.render();
  }

  /**
   * Navigate universe menu
   */
  navigateUniverseMenu(direction) {
    if (this.currentView !== 'universe') return;

    const oldIndex = this.universeMenuIndex;
    this.universeMenuIndex += direction;

    if (this.universeMenuIndex < 0) this.universeMenuIndex = this.universeMenuItems.length - 1;
    if (this.universeMenuIndex >= this.universeMenuItems.length) this.universeMenuIndex = 0;

    const oldItem = this.universeMenuItems[oldIndex];
    const newItem = this.universeMenuItems[this.universeMenuIndex];

    this.updateMenuItem(oldItem.box, oldItem.item, false);
    this.updateMenuItem(newItem.box, newItem.item, true);

    this.screen.render();
  }

  /**
   * Select universe menu item
   */
  selectUniverseMenuItem() {
    if (this.currentView !== 'universe') return;

    const item = this.universeMenuItems[this.universeMenuIndex].item;

    switch (item.action) {
      case 'newUniverse':
        this.createNewUniverse();
        break;
      case 'loadUniverse':
        this.showLoadUniverse();
        break;
      case 'back':
        this.showMainMenu();
        break;
    }
  }

  /**
   * Create a new universe
   */
  createNewUniverse() {
    this.clearScreen();
    const t = this.theme;

    // Show loading screen
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    const loadingBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 14,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: t.fighterA }, bg: t.background },
      content: `{center}
{bold}{${t.fighterA}-fg}CREATING UNIVERSE{/${t.fighterA}-fg}{/bold}

{${t.fighterA}-fg}◐{/${t.fighterA}-fg} Initializing simulation engine...

{${t.commentary}-fg}This may take a moment...{/${t.commentary}-fg}
{/center}`
    });

    this.screen.render();

    // Create universe asynchronously
    setTimeout(() => {
      this.universe = new Universe({
        name: 'Boxing Universe',
        currentDate: { year: 1995, week: 1 },
        targetFighterCount: 500,
        fighterCountVariance: 100
      });

      const generator = new FighterGenerator();

      // Generate initial roster (500 fighters with varied ages)
      loadingBox.setContent(`{center}
{bold}{${t.fighterA}-fg}CREATING UNIVERSE{/${t.fighterA}-fg}{/bold}

{${t.fighterA}-fg}◓{/${t.fighterA}-fg} Generating 500 fighters...

{${t.commentary}-fg}Building the boxing world...{/${t.commentary}-fg}
{/center}`);
      this.screen.render();

      // Generate fighters with a range of ages to create an established scene
      for (let i = 0; i < 500; i++) {
        // Age distribution: more young fighters, fewer veterans
        let age;
        const roll = Math.random();
        if (roll < 0.35) {
          age = 18 + Math.floor(Math.random() * 4);  // 18-21 (prospects)
        } else if (roll < 0.65) {
          age = 22 + Math.floor(Math.random() * 5);  // 22-26 (rising)
        } else if (roll < 0.85) {
          age = 27 + Math.floor(Math.random() * 5);  // 27-31 (prime)
        } else {
          age = 32 + Math.floor(Math.random() * 6);  // 32-37 (veterans)
        }

        const fighter = generator.generate({
          currentDate: this.universe.currentDate,
          age: age
        });

        this.universe.addFighter(fighter);
      }

      // Now simulate 5 years
      this.simulateInitialYears(loadingBox, 5);
    }, 100);
  }

  /**
   * Simulate initial years before entering the universe
   */
  simulateInitialYears(loadingBox, years) {
    const t = this.theme;
    const totalWeeks = years * 52;
    const processor = new WeekProcessor(this.universe);

    let currentWeek = 0;

    const simulateBatch = () => {
      // Simulate 26 weeks at a time for responsiveness
      const batchSize = 26;
      const endWeek = Math.min(currentWeek + batchSize, totalWeeks);

      for (let i = currentWeek; i < endWeek; i++) {
        processor.processWeek();
      }

      currentWeek = endWeek;
      const yearsComplete = Math.floor(currentWeek / 52);
      const progress = Math.floor((currentWeek / totalWeeks) * 100);

      loadingBox.setContent(`{center}
{bold}{${t.fighterA}-fg}CREATING UNIVERSE{/${t.fighterA}-fg}{/bold}

Simulating boxing history...

Year ${yearsComplete + 1} of ${years}
${this.universe.getDateString()}

Active Fighters: ${this.universe.getActiveFighters().length}
Retirements: ${this.universe.stats.fightersRetired}

{${t.stamina}-fg}[${'█'.repeat(Math.floor(progress / 5))}${'░'.repeat(20 - Math.floor(progress / 5))}] ${progress}%{/${t.stamina}-fg}
{/center}`);
      this.screen.render();

      if (currentWeek < totalWeeks) {
        setTimeout(simulateBatch, 10);
      } else {
        // Simulation complete - inaugurate championships
        this.inaugurateChampionships(loadingBox);
      }
    };

    simulateBatch();
  }

  /**
   * Inaugurate championship era
   */
  inaugurateChampionships(loadingBox) {
    const t = this.theme;

    loadingBox.setContent(`{center}
{bold}{${t.fighterA}-fg}CHAMPIONSHIP ERA BEGINS{/${t.fighterA}-fg}{/bold}

{${t.fighterA}-fg}◑{/${t.fighterA}-fg} Creating sanctioning bodies...
{yellow-fg}WBC{/yellow-fg} - {white-fg}WBA{/white-fg} - {red-fg}IBF{/red-fg} - {green-fg}WBO{/green-fg}

{${t.commentary}-fg}The greatest fighters will now
compete for world titles!{/${t.commentary}-fg}
{/center}`);
    this.screen.render();

    setTimeout(() => {
      // Inaugurate championships
      this.universe.inaugurateChampionships();

      // Save the new universe (async to not block UI)
      setImmediate(() => {
        this.saveManager.save(this.universe, 'universe-autosave');
      });

      // Brief pause to show the message, then show dashboard
      setTimeout(() => {
        this.showUniverseDashboard();
      }, 400);
    }, 200);
  }

  /**
   * Show load universe screen
   */
  showLoadUniverse() {
    this.currentView = 'loadUniverse';
    this.clearScreen();

    const t = this.theme;
    const saves = this.saveManager.listSaves();

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 2,
      left: 'center',
      width: 30,
      height: 1,
      tags: true,
      content: `{center}{bold}{${t.fighterA}-fg}LOAD UNIVERSE{/${t.fighterA}-fg}{/bold}{/center}`
    });

    // Save list
    const saveList = blessed.list({
      parent: this.screen,
      top: 5,
      left: 'center',
      width: 60,
      height: Math.min(saves.length + 2, 15),
      tags: true,
      border: { type: 'line' },
      label: ' SAVED UNIVERSES ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true
    });

    saves.forEach(save => {
      saveList.addItem(`${save.slot}: ${save.date} - ${save.fighters} fighters`);
    });

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}ENTER Load  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    saveList.key(['enter', 'space'], () => {
      const save = saves[saveList.selected];
      if (save) {
        // Show loading indicator
        this.clearScreen();
        blessed.box({
          parent: this.screen,
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          style: { bg: t.background }
        });
        const loadingBox = blessed.box({
          parent: this.screen,
          top: 'center',
          left: 'center',
          width: 50,
          height: 7,
          tags: true,
          border: { type: 'line' },
          style: { border: { fg: t.fighterA }, bg: t.background },
          content: `{center}

{${t.fighterA}-fg}◐{/${t.fighterA}-fg} Loading universe...

{${t.commentary}-fg}Please wait...{/${t.commentary}-fg}
{/center}`
        });
        this.screen.render();

        // Load with slight delay to show loading state
        setTimeout(() => {
          this.universe = this.saveManager.load(save.slot);
          this.showUniverseDashboard();
        }, 200);
      }
    });

    saveList.key(['escape', 'q'], () => this.showUniverseMenu());
    saveList.focus();
    this.screen.render();
  }

  /**
   * Show universe dashboard - launches the new UniverseTUI
   */
  showUniverseDashboard() {
    // Destroy the current screen
    this.screen.destroy();

    // Create and run the UniverseTUI
    const universeTUI = new UniverseTUI(
      this.universe,
      this.saveManager,
      this.fightOptions.theme
    );

    // Handle fight replay
    universeTUI.onFightReplay = (replayData) => {
      this.launchFightReplay(replayData);
    };

    // Run the universe TUI and return to main menu when done
    universeTUI.run().then(() => {
      // Reinitialize main menu when universe mode exits
      this.initialize();
    });
  }

  /**
   * Launch a fight replay from universe mode
   */
  launchFightReplay(replayData) {
    if (this.onStartFight) {
      // Pass the replay data to the fight system
      this.onStartFight(
        null, // pathA (using replay data instead)
        null, // pathB (using replay data instead)
        replayData.rounds || 10,
        this.fightOptions.speed,
        this.fightOptions.display,
        this.fightOptions.theme,
        replayData // Pass the replay data
      );
    }
  }

  /**
   * Simulate one week
   */
  simulateWeek() {
    const t = this.theme;
    const processor = new WeekProcessor(this.universe);
    const events = processor.processWeek();

    // Count fight results
    const fights = events.filter(e => e.type === 'FIGHT_RESULT');
    const titleChanges = events.filter(e => e.type === 'TITLE_CHANGE');
    const koFinishes = fights.filter(f => f.method === 'KO' || f.method === 'TKO');

    let logContent = `{${t.round}-fg}${this.universe.getDateString()}{/${t.round}-fg}\n`;

    if (fights.length > 0) {
      logContent += `{${t.stamina}-fg}${fights.length} fights`;
      if (koFinishes.length > 0) {
        logContent += `, ${koFinishes.length} KOs`;
      }
      logContent += `{/${t.stamina}-fg}`;
    }

    if (titleChanges.length > 0) {
      logContent += `\n{yellow-fg}TITLE!{/yellow-fg}`;
    }

    this.eventLog.setContent(logContent);

    // Refresh dashboard
    this.showUniverseDashboard();
  }

  /**
   * Simulate one year (52 weeks)
   */
  simulateYear() {
    const t = this.theme;

    // Show progress
    this.eventLog.setContent(`{${t.fighterA}-fg}Simulating...{/${t.fighterA}-fg}`);
    this.screen.render();

    setTimeout(() => {
      const processor = new WeekProcessor(this.universe);
      let allEvents = [];

      for (let i = 0; i < 52; i++) {
        const events = processor.processWeek();
        allEvents = allEvents.concat(events);
      }

      // Count notable events
      const fights = allEvents.filter(e => e.type === 'FIGHT_RESULT').length;
      const kos = allEvents.filter(e => e.type === 'FIGHT_RESULT' && (e.method === 'KO' || e.method === 'TKO')).length;
      const titleChanges = allEvents.filter(e => e.type === 'TITLE_CHANGE').length;
      const retirements = allEvents.filter(e => e.type === 'RETIREMENT').length;
      const hofInductions = allEvents.filter(e => e.type === 'HOF_INDUCTION').length;

      let logContent = `{${t.round}-fg}${this.universe.getDateString()}{/${t.round}-fg}\n`;
      logContent += `{${t.stamina}-fg}${fights} fights, ${kos} KOs{/${t.stamina}-fg}`;

      if (titleChanges > 0) {
        logContent += `\n{yellow-fg}${titleChanges} title changes{/yellow-fg}`;
      }

      if (hofInductions > 0) {
        logContent += `\n{${t.round}-fg}${hofInductions} HOF inductions!{/${t.round}-fg}`;
      }

      this.eventLog.setContent(logContent);

      // Save and refresh
      this.saveManager.save(this.universe, 'universe-autosave');
      this.showUniverseDashboard();
    }, 100);
  }

  /**
   * Show all universe fighters
   */
  showUniverseFighters() {
    this.currentView = 'universeFighters';
    this.clearScreen();

    const t = this.theme;
    const fighters = this.universe.getActiveFighters()
      .sort((a, b) => (b.career.record.wins - b.career.record.losses) -
                      (a.career.record.wins - a.career.record.losses));

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape', 's', 'r', 'f', 'd']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{bold}{${t.fighterA}-fg}UNIVERSE FIGHTERS (${fighters.length}){/${t.fighterA}-fg}{/bold}{/center}`
    });

    // Fighter list
    const fighterList = blessed.list({
      parent: this.screen,
      top: 3,
      left: 2,
      width: '45%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHTERS ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      scrollbar: { ch: '│', style: { fg: t.fighterA } }
    });

    fighters.forEach(fighter => {
      const age = fighter.getAge(this.universe.currentDate);
      const record = fighter.getRecordString();
      const phase = fighter.career.phase.substring(0, 3);
      fighterList.addItem(`[${phase}] ${fighter.name} (${age}) ${record}`);
    });

    // Fighter details panel
    const detailsPanel = blessed.box({
      parent: this.screen,
      top: 3,
      left: '50%',
      width: '48%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHTER DETAILS ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    const updateDetails = (idx) => {
      const fighter = fighters[idx];
      if (!fighter) return;

      const age = fighter.getAge(this.universe.currentDate);
      const division = this.universe.getDivisionForWeight(fighter.physical.weight);
      const ranking = division?.getFighterRanking(fighter.id);

      detailsPanel.setContent(`
{bold}{${t.fighterA}-fg}${fighter.name}{/${t.fighterA}-fg}{/bold}
{${t.commentary}-fg}"${fighter.nickname || 'The Fighter'}"{/${t.commentary}-fg}

{${t.round}-fg}Age:{/${t.round}-fg} ${age}  {${t.round}-fg}Phase:{/${t.round}-fg} ${fighter.career.phase}
{${t.round}-fg}Record:{/${t.round}-fg} ${fighter.getRecordString()}
{${t.round}-fg}Division:{/${t.round}-fg} ${division?.name || 'None'}
{${t.round}-fg}Ranking:{/${t.round}-fg} ${ranking ? '#' + ranking : 'Unranked'}

{${t.stamina}-fg}━━ ATTRIBUTES ━━{/${t.stamina}-fg}
Power:   ${this.createStatBar(fighter.power.powerRight, 12, t.health)} ${fighter.power.powerRight}
Speed:   ${this.createStatBar(fighter.speed.handSpeed, 12, t.round)} ${fighter.speed.handSpeed}
Defense: ${this.createStatBar(fighter.defense.headMovement, 12, t.stamina)} ${fighter.defense.headMovement}
Chin:    ${this.createStatBar(fighter.mental.chin, 12, t.block)} ${fighter.mental.chin}

{${t.stamina}-fg}━━ POTENTIAL ━━{/${t.stamina}-fg}
Tier: ${fighter.potential.tier}
Ceiling: ${fighter.potential.ceiling}
Peak Age: ${fighter.potential.peakAgePhysical}
`);
      this.screen.render();
    };

    fighterList.on('select item', () => updateDetails(fighterList.selected));
    updateDetails(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    fighterList.key(['escape', 'q'], () => this.showUniverseDashboard());
    fighterList.focus();
    this.screen.render();
  }

  /**
   * Show divisions
   */
  showDivisions() {
    this.currentView = 'divisions';
    this.clearScreen();

    const t = this.theme;

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape', 's', 'r', 'f', 'd']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 30,
      height: 1,
      tags: true,
      content: `{center}{bold}{${t.fighterA}-fg}DIVISIONS{/${t.fighterA}-fg}{/bold}{/center}`
    });

    // Division list
    const divisionList = blessed.list({
      parent: this.screen,
      top: 3,
      left: 2,
      width: '35%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' WEIGHT CLASSES ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true
    });

    const divisions = Array.from(this.universe.divisions.entries());
    divisions.forEach(([name, div]) => {
      const count = div.fighters.length;
      const hasChamp = div.champion ? '★' : ' ';
      divisionList.addItem(`${hasChamp} ${name} (${count})`);
    });

    // Division details
    const detailsPanel = blessed.box({
      parent: this.screen,
      top: 3,
      left: '40%',
      width: '58%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' RANKINGS ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true
    });

    const updateDetails = (idx) => {
      const [name, division] = divisions[idx];
      let content = `{bold}{${t.fighterA}-fg}${name}{/${t.fighterA}-fg}{/bold}\n`;
      content += `{${t.commentary}-fg}${division.displayWeight}{/${t.commentary}-fg}\n\n`;

      // Champion
      if (division.champion) {
        const champ = this.universe.fighters.get(division.champion);
        if (champ) {
          content += `{${t.round}-fg}CHAMPION{/${t.round}-fg}\n`;
          content += `  {bold}${champ.name}{/bold} - ${champ.getRecordString()}\n`;
          content += `  Defenses: ${division.championDefenses}\n\n`;
        }
      } else {
        content += `{${t.round}-fg}CHAMPION:{/${t.round}-fg} {${t.commentary}-fg}VACANT{/${t.commentary}-fg}\n\n`;
      }

      // Rankings
      content += `{${t.stamina}-fg}TOP 15 RANKINGS{/${t.stamina}-fg}\n`;
      for (let i = 0; i < Math.min(15, division.rankings.length); i++) {
        const fighter = this.universe.fighters.get(division.rankings[i]);
        if (fighter) {
          const mandatory = division.mandatoryChallenger === fighter.id ? ' {yellow-fg}[M]{/yellow-fg}' : '';
          content += `  ${i + 1}. ${fighter.name} - ${fighter.getRecordString()}${mandatory}\n`;
        }
      }

      if (division.rankings.length === 0) {
        content += `  {${t.commentary}-fg}No ranked fighters{/${t.commentary}-fg}\n`;
      }

      detailsPanel.setContent(content);
      this.screen.render();
    };

    divisionList.on('select item', () => updateDetails(divisionList.selected));
    updateDetails(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    divisionList.key(['escape', 'q'], () => this.showUniverseDashboard());
    divisionList.focus();
    this.screen.render();
  }

  /**
   * Handle exit
   */
  handleExit() {
    this.screen.destroy();
    if (this.onExit) {
      this.onExit();
    } else {
      console.log('\n  Thanks for using Fight Fortress!\n');
      process.exit(0);
    }
  }

  /**
   * Run the menu
   */
  run() {
    return new Promise((resolve) => {
      this.onStartFight = (pathA, pathB, rounds, speed, display, theme, replayData = null) => {
        resolve({ pathA, pathB, rounds, speed, display, theme, replayData });
      };
      this.onExit = () => {
        resolve(null);
      };
      this.initialize();
    });
  }
}
