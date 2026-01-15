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
      this.onStartFight = (pathA, pathB, rounds, speed, display, theme) => {
        resolve({ pathA, pathB, rounds, speed, display, theme });
      };
      this.onExit = () => {
        resolve(null);
      };
      this.initialize();
    });
  }
}
