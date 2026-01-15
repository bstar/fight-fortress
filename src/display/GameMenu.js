/**
 * GameMenu - Game-style interactive menu system
 * Arrow-key navigation, fighter selection with preview, VS screens
 */

import blessed from 'blessed';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

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
      display: 'hbo'  // 'hbo' or 'arcade'
    };
    this.onStartFight = null;
    this.onExit = null;
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
  createStatBar(value, maxWidth = 20, color = 'green') {
    const filled = Math.round((value / 100) * maxWidth);
    const empty = maxWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `{${color}-fg}${bar}{/${color}-fg}`;
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

    const menuItems = [
      { label: 'START FIGHT', action: 'startFight', icon: '⚔' },
      { label: 'QUICK FIGHT', action: 'quickFight', icon: '⚡' },
      { label: 'VIEW ROSTER', action: 'viewRoster', icon: '📋' },
      { label: 'EXIT', action: 'exit', icon: '🚪' }
    ];

    // Background
    const bg = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: '#1a1a2e' }
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
        fg: '#e94560',
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
      content: '{center}{gray-fg}Boxing Simulation Engine{/gray-fg}{/center}',
      style: { fg: 'gray' }
    });

    // Menu container
    const menuContainer = blessed.box({
      parent: this.screen,
      top: 14,
      left: 'center',
      width: 40,
      height: menuItems.length * 3 + 2,
      style: { bg: '#16213e' },
      border: { type: 'line' },
      style: {
        border: { fg: '#0f3460' },
        bg: '#16213e'
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
          bg: index === this.selectedIndex ? '#e94560' : '#16213e',
          fg: index === this.selectedIndex ? 'white' : '#aaa'
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
      content: '{center}{gray-fg}↑/↓ Navigate  •  ENTER Select  •  Q Quit{/gray-fg}{/center}'
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
    const icon = item.icon || '>';
    const prefix = selected ? '  ►  ' : '     ';
    const suffix = selected ? '  ◄' : '';
    box.setContent(`\n${prefix}${icon}  ${item.label}${suffix}`);
    box.style.bg = selected ? '#e94560' : '#16213e';
    box.style.fg = selected ? 'white' : '#aaa';
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

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: '#1a1a2e' }
    });

    // Title
    const title = blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 50,
      height: 3,
      tags: true,
      content: `{center}{bold}SELECT FIGHTER ${slot}{/bold}\n{gray-fg}${slot === 'A' ? 'Red Corner' : 'Blue Corner'}{/gray-fg}{/center}`,
      style: { fg: slot === 'A' ? '#e94560' : '#4a90d9' }
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
        border: { fg: '#0f3460' },
        bg: '#16213e',
        selected: { bg: '#e94560', fg: 'white' },
        item: { fg: '#aaa' }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        style: { fg: '#e94560' }
      }
    });

    // Populate fighter list
    this.fighters.forEach((fighter, idx) => {
      const record = `${fighter.record.wins}-${fighter.record.losses}`;
      const isSelected = (slot === 'B' && this.selectedFighterA?.path === fighter.path);
      const prefix = isSelected ? '{gray-fg}[SELECTED] ' : '';
      const suffix = isSelected ? '{/gray-fg}' : '';
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
        border: { fg: '#0f3460' },
        bg: '#16213e',
        fg: 'white'
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
      content: '{center}{gray-fg}↑/↓ Browse  •  ENTER Select  •  ESC Back{/gray-fg}{/center}'
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
{bold}{#e94560-fg}${fighter.name}{/#e94560-fg}{/bold}
{gray-fg}"${fighter.nickname || 'The Fighter'}"{/gray-fg}

{yellow-fg}RECORD:{/yellow-fg} ${record.wins || 0}W - ${record.losses || 0}L - ${record.draws || 0}D (${record.kos || 0} KOs)
{yellow-fg}STYLE:{/yellow-fg}  ${style.primary || 'Orthodox'}

{cyan-fg}━━━ PHYSICAL ━━━{/cyan-fg}
Height: ${heightFt}'${heightIn}" (${phys.height || 180}cm)
Weight: ${weightLbs} lbs (${phys.weight || 90}kg)
Reach:  ${phys.reach || 180}cm
Stance: ${phys.stance || 'Orthodox'}

{cyan-fg}━━━ ATTRIBUTES ━━━{/cyan-fg}
Power     ${this.createStatBar(power.powerRight || 70, 15)}  ${power.powerRight || 70}
Speed     ${this.createStatBar(speed.handSpeed || 70, 15, 'yellow')}  ${speed.handSpeed || 70}
Defense   ${this.createStatBar(defense.headMovement || 70, 15, 'blue')}  ${defense.headMovement || 70}
Chin      ${this.createStatBar(mental.chin || 70, 15, 'magenta')}  ${mental.chin || 70}
Heart     ${this.createStatBar(mental.heart || 70, 15, 'red')}  ${mental.heart || 70}

{bold}{yellow-fg}OVERALL: ${overall}{/yellow-fg}{/bold}
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

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: '#1a1a2e' }
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
      style: { bg: '#1a1a2e' }
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
        border: { fg: '#0f3460' },
        bg: '#16213e'
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
      content: '{center}{bold}{green-fg}[ START FIGHT ]{/green-fg}{/bold}{/center}'
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
      content: '{center}{gray-fg}←/→ Adjust  •  ↑/↓ Navigate  •  ENTER Start  •  ESC Back{/gray-fg}{/center}'
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
    const a = this.selectedFighterA;
    const b = this.selectedFighterB;
    const recA = `${a.record.wins}-${a.record.losses}`;
    const recB = `${b.record.wins}-${b.record.losses}`;

    return `{center}
{bold}{red-fg}${a.name.toUpperCase()}{/red-fg}{/bold}
{gray-fg}(${recA}) "${a.nickname}"{/gray-fg}

{bold}{yellow-fg}━━━  VS  ━━━{/yellow-fg}{/bold}

{bold}{blue-fg}${b.name.toUpperCase()}{/blue-fg}{/bold}
{gray-fg}(${recB}) "${b.nickname}"{/gray-fg}
{/center}`;
  }

  /**
   * Update options display
   */
  updateOptionsDisplay() {
    const roundsSelected = this.optionIndex === 0;
    const speedSelected = this.optionIndex === 1;
    const displaySelected = this.optionIndex === 2;
    const startSelected = this.optionIndex === 3;

    const roundsPrefix = roundsSelected ? '{yellow-fg}► ' : '  ';
    const roundsSuffix = roundsSelected ? ' ◄{/yellow-fg}' : '';
    const speedPrefix = speedSelected ? '{yellow-fg}► ' : '  ';
    const speedSuffix = speedSelected ? ' ◄{/yellow-fg}' : '';
    const displayPrefix = displaySelected ? '{yellow-fg}► ' : '  ';
    const displaySuffix = displaySelected ? ' ◄{/yellow-fg}' : '';

    this.roundsValue.setContent(
      `${roundsPrefix}Rounds:  ◀  {bold}${this.fightOptions.rounds}{/bold}  ▶${roundsSuffix}`
    );

    this.speedValue.setContent(
      `${speedPrefix}Speed:   ◀  {bold}${this.fightOptions.speed}x{/bold}  ▶${speedSuffix}`
    );

    // Display mode names
    const displayName = this.fightOptions.display === 'arcade' ? 'ARCADE' : 'CLASSIC';
    const displayColor = this.fightOptions.display === 'arcade' ? '{#ff4444-fg}' : '{cyan-fg}';
    const displayColorEnd = this.fightOptions.display === 'arcade' ? '{/#ff4444-fg}' : '{/cyan-fg}';

    this.displayValue.setContent(
      `${displayPrefix}Display: ◀  ${displayColor}{bold}${displayName}{/bold}${displayColorEnd}  ▶${displaySuffix}`
    );

    if (startSelected) {
      this.startButton.setContent('{center}{bold}{#1a1a2e-bg}{green-fg}[ ★ START FIGHT ★ ]{/green-fg}{/#1a1a2e-bg}{/bold}{/center}');
    } else {
      this.startButton.setContent('{center}{gray-fg}[ START FIGHT ]{/gray-fg}{/center}');
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
        this.fightOptions.display
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
      this.fightOptions = { rounds: 10, speed: 3, display: 'hbo' };
      this.launchFight();
    } else if (this.fighters.length >= 2) {
      // Use first two fighters if defaults not found
      this.selectedFighterA = this.fighters[0];
      this.selectedFighterB = this.fighters[1];
      this.fightOptions = { rounds: 10, speed: 3, display: 'hbo' };
      this.launchFight();
    }
  }

  /**
   * Show roster view
   */
  showRoster() {
    this.currentView = 'roster';
    this.clearScreen();

    // Remove old key bindings
    this.screen.unkey(['up', 'k', 'down', 'j', 'enter', 'space', 'q', 'escape']);

    // Background
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: '#1a1a2e' }
    });

    // Title
    blessed.box({
      parent: this.screen,
      top: 1,
      left: 'center',
      width: 30,
      height: 1,
      tags: true,
      content: '{center}{bold}{yellow-fg}FIGHTER ROSTER{/yellow-fg}{/bold}{/center}'
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
        border: { fg: '#0f3460' },
        bg: '#16213e',
        selected: { bg: '#e94560', fg: 'white' },
        item: { fg: '#aaa' }
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
        border: { fg: '#0f3460' },
        bg: '#16213e'
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
{bold}{#e94560-fg}${fighter.name}{/#e94560-fg}{/bold}
{gray-fg}"${fighter.nickname}"{/gray-fg}

{yellow-fg}RECORD:{/yellow-fg} ${record.wins}W - ${record.losses}L - ${record.draws}D (${record.kos} KOs)

{cyan-fg}━━━ FIGHTING STYLE ━━━{/cyan-fg}
Primary:   ${style.primary || '-'}
Defensive: ${style.defensive || '-'}
Offensive: ${style.offensive || '-'}

{cyan-fg}━━━ PHYSICAL ━━━{/cyan-fg}
Height: ${heightFt}'${heightIn}" | Weight: ${weightLbs}lbs | Reach: ${phys.reach}cm

{cyan-fg}━━━ KEY ATTRIBUTES ━━━{/cyan-fg}
Power      ${this.createStatBar(power.powerRight || 70, 12)}  ${power.powerRight || '-'}
KO Power   ${this.createStatBar(power.knockoutPower || 70, 12)}  ${power.knockoutPower || '-'}
Hand Speed ${this.createStatBar(speed.handSpeed || 70, 12, 'yellow')}  ${speed.handSpeed || '-'}
Reflexes   ${this.createStatBar(speed.reflexes || 70, 12, 'yellow')}  ${speed.reflexes || '-'}
Head Mvmt  ${this.createStatBar(defense.headMovement || 70, 12, 'blue')}  ${defense.headMovement || '-'}
Chin       ${this.createStatBar(mental.chin || 70, 12, 'magenta')}  ${mental.chin || '-'}
Heart      ${this.createStatBar(mental.heart || 70, 12, 'red')}  ${mental.heart || '-'}
Fight IQ   ${this.createStatBar(data.technical?.fightIQ || 70, 12, 'cyan')}  ${data.technical?.fightIQ || '-'}

{cyan-fg}━━━ CORNER ━━━{/cyan-fg}
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
      content: '{center}{gray-fg}↑/↓ Browse  •  ESC Back{/gray-fg}{/center}'
    });

    rosterList.key(['escape', 'q'], () => this.showMainMenu());
    rosterList.focus();
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
      this.onStartFight = (pathA, pathB, rounds, speed, display) => {
        resolve({ pathA, pathB, rounds, speed, display });
      };
      this.onExit = () => {
        resolve(null);
      };
      this.initialize();
    });
  }
}
