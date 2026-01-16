/**
 * UniverseTUI - Complete Universe Mode UI with proper menu navigation
 * Features: Dashboard, Rankings, Fights, News/Publications, Hall of Fame
 */

import blessed from 'blessed';
import { THEMES, DEFAULT_THEME } from './themes.js';
import { WeekProcessor } from '../universe/simulation/WeekProcessor.js';
import { MatchmakingEngine } from '../universe/simulation/MatchmakingEngine.js';
import { PublicationGenerator } from './PublicationGenerator.js';

export class UniverseTUI {
  constructor(universe, saveManager, theme = DEFAULT_THEME) {
    this.universe = universe;
    this.saveManager = saveManager;
    this.themeName = theme;
    this.screen = null;
    this.processor = new WeekProcessor(universe);
    this.matchmaker = new MatchmakingEngine(universe);
    this.publication = new PublicationGenerator(universe);

    // Navigation state
    this.currentView = 'main';
    this.menuStack = [];
    this.selectedIndex = 0;

    // Store events from simulation
    this.lastEvents = [];
    this.pendingArticles = [];

    // Track unsaved changes
    this.hasUnsavedChanges = false;
    this.lastSaveTime = Date.now();

    // Callback for fight replay
    this.onFightReplay = null;
  }

  get theme() {
    return THEMES[this.themeName] || THEMES[DEFAULT_THEME];
  }

  /**
   * Initialize and run the universe TUI
   */
  run() {
    return new Promise((resolve) => {
      this.onExit = resolve;
      this.initialize();
    });
  }

  initialize() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Boxing Universe',
      fullUnicode: true
    });

    // Global escape handler
    this.screen.key(['C-c'], () => {
      this.promptSaveAndExit();
    });

    this.showMainMenu();
  }

  /**
   * Clear screen and remove key bindings
   */
  clearScreen() {
    while (this.screen.children.length) {
      this.screen.children[0].detach();
    }
    this.screen.unkey(['up', 'down', 'enter', 'escape', 'q', 'left', 'right']);
  }

  /**
   * Create standard background
   */
  createBackground() {
    const t = this.theme;
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: t.background }
    });
  }

  /**
   * Create standard header with date
   */
  createHeader(title) {
    const t = this.theme;
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      style: { bg: t.background },
      content: `{center}{bold}{${t.fighterA}-fg}${title}{/${t.fighterA}-fg}{/bold}
{${t.round}-fg}${this.universe.getDateString()}{/${t.round}-fg}{/center}`
    });
  }

  /**
   * Create a menu list component
   */
  createMenuList(items, options = {}) {
    const t = this.theme;
    const {
      top = 4,
      left = 'center',
      width = 50,
      height = items.length + 2,
      label = '',
      showIcons = true
    } = options;

    const list = blessed.list({
      parent: this.screen,
      top,
      left,
      width,
      height,
      tags: true,
      border: { type: 'line' },
      label: label ? ` ${label} ` : '',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background, bold: true },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      mouse: true
    });

    items.forEach(item => {
      const icon = showIcons && item.icon ? `${item.icon}  ` : '';
      list.addItem(`${icon}${item.label}`);
    });

    return list;
  }

  /**
   * Show main universe menu
   */
  showMainMenu() {
    this.currentView = 'main';
    this.clearScreen();
    this.createBackground();
    this.createHeader('BOXING UNIVERSE');

    const t = this.theme;

    const menuItems = [
      { label: 'Dashboard', action: 'dashboard', icon: '📊' },
      { label: 'Simulate', action: 'simulate', icon: '⏩' },
      { label: 'Rankings', action: 'rankings', icon: '🏆' },
      { label: 'Upcoming Fights', action: 'upcoming', icon: '📅' },
      { label: 'Recent Results', action: 'results', icon: '📰' },
      { label: 'Boxing News', action: 'news', icon: '📝' },
      { label: 'Fighters', action: 'fighters', icon: '🥊' },
      { label: 'Divisions', action: 'divisions', icon: '⚖️' },
      { label: 'Hall of Fame', action: 'hof', icon: '🏅' },
      { label: 'Save & Exit', action: 'exit', icon: '💾' }
    ];

    const menu = this.createMenuList(menuItems, {
      top: 5,
      width: 40,
      label: 'MAIN MENU'
    });

    // Quick stats panel
    const statsPanel = blessed.box({
      parent: this.screen,
      top: 5,
      right: 2,
      width: 35,
      height: 12,
      tags: true,
      border: { type: 'line' },
      label: ' QUICK STATS ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    const summary = this.universe.getSummary();
    const hofCount = this.universe.hallOfFame?.getInducteeCount() || 0;

    statsPanel.setContent(`
{${t.stamina}-fg}Active Fighters:{/${t.stamina}-fg} ${summary.activeFighters}
{${t.stamina}-fg}Total Fights:{/${t.stamina}-fg} ${summary.totalFights}
{${t.stamina}-fg}KO Rate:{/${t.stamina}-fg} ${summary.knockoutRate}
{${t.stamina}-fg}Retirements:{/${t.stamina}-fg} ${summary.retiredFighters}
{${t.stamina}-fg}Hall of Fame:{/${t.stamina}-fg} ${hofCount}

{${t.stamina}-fg}Trainers:{/${t.stamina}-fg} ${summary.trainers}
{${t.stamina}-fg}Promoters:{/${t.stamina}-fg} ${summary.promoters}
`);

    // Controls hint
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 60,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Navigate  •  ENTER Select  •  ESC Exit{/${t.commentary}-fg}{/center}`
    });

    // Menu selection handler
    menu.on('select', (item, index) => {
      const action = menuItems[index].action;
      this.handleMainMenuAction(action);
    });

    menu.key(['escape', 'q'], () => this.promptSaveAndExit());

    menu.focus();
    this.screen.render();
  }

  /**
   * Handle main menu actions
   */
  handleMainMenuAction(action) {
    switch (action) {
      case 'dashboard':
        this.showDashboard();
        break;
      case 'simulate':
        this.showSimulateMenu();
        break;
      case 'rankings':
        this.showRankings();
        break;
      case 'upcoming':
        this.showUpcomingFights();
        break;
      case 'results':
        this.showRecentResults();
        break;
      case 'news':
        this.showNews();
        break;
      case 'fighters':
        this.showFighters();
        break;
      case 'divisions':
        this.showDivisions();
        break;
      case 'hof':
        this.showHallOfFame();
        break;
      case 'exit':
        this.saveAndExit();
        break;
    }
  }

  /**
   * Show dashboard overview
   */
  showDashboard() {
    this.currentView = 'dashboard';
    this.clearScreen();
    this.createBackground();
    this.createHeader('UNIVERSE DASHBOARD');

    const t = this.theme;

    // Left panel - Universe Stats
    const statsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '32%',
      height: '40%',
      tags: true,
      border: { type: 'line' },
      label: ' UNIVERSE STATS ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    const summary = this.universe.getSummary();
    const hofCount = this.universe.hallOfFame?.getInducteeCount() || 0;

    statsPanel.setContent(`
{${t.stamina}-fg}Active Fighters:{/${t.stamina}-fg} ${summary.activeFighters}
{${t.stamina}-fg}Retired:{/${t.stamina}-fg} ${summary.retiredFighters}
{${t.stamina}-fg}Total Fights:{/${t.stamina}-fg} ${summary.totalFights}
{${t.stamina}-fg}KO Rate:{/${t.stamina}-fg} ${summary.knockoutRate}

{${t.stamina}-fg}━━ HALL OF FAME ━━{/${t.stamina}-fg}
Inductees: {${t.round}-fg}${hofCount}{/${t.round}-fg}

{${t.stamina}-fg}━━ STAFF ━━{/${t.stamina}-fg}
Trainers: ${summary.trainers}
Commentators: ${summary.commentators}
Promoters: ${summary.promoters}
`);

    // Center panel - Heavyweight Champions
    const champPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '34%',
      width: '32%',
      height: '40%',
      tags: true,
      border: { type: 'line' },
      label: ' HEAVYWEIGHT CHAMPIONS ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true
    });

    let champContent = '';
    const bodies = this.universe.getAllSanctioningBodies();

    if (bodies.length > 0) {
      for (const body of bodies) {
        const champId = body.getChampion('Heavyweight');
        const champ = champId ? this.universe.fighters.get(champId) : null;
        const beltColor = body.beltColor === 'green' ? 'green' :
                          body.beltColor === 'gold' ? 'yellow' :
                          body.beltColor === 'red' ? 'red' : 'white';

        if (champ) {
          champContent += `{${beltColor}-fg}${body.shortName}{/${beltColor}-fg} ${champ.name}\n`;
          champContent += `    ${champ.getRecordString()}\n\n`;
        } else {
          champContent += `{${beltColor}-fg}${body.shortName}{/${beltColor}-fg} {${t.commentary}-fg}VACANT{/${t.commentary}-fg}\n\n`;
        }
      }
    } else {
      champContent = `{${t.commentary}-fg}Championships not\ninaugurated{/${t.commentary}-fg}`;
    }

    champPanel.setContent(champContent);

    // Right panel - Recent Fights
    const recentPanel = blessed.box({
      parent: this.screen,
      top: 4,
      right: 1,
      width: '32%',
      height: '40%',
      tags: true,
      border: { type: 'line' },
      label: ' RECENT FIGHTS ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true
    });

    let recentContent = '';
    const recentFights = this.universe.lastWeekResults || [];

    if (recentFights.length > 0) {
      for (const fight of recentFights.slice(0, 6)) {
        const methodColor = (fight.method === 'KO' || fight.method === 'TKO') ? t.health : t.foreground;
        const methodStr = fight.method === 'Decision' ? 'DEC' : fight.method;
        recentContent += `{${t.fighterA}-fg}${fight.winnerName}{/${t.fighterA}-fg}\n`;
        recentContent += `  def. ${fight.loserName}\n`;
        recentContent += `  {${methodColor}-fg}${methodStr}${fight.round < fight.totalRounds ? ' R' + fight.round : ''}{/${methodColor}-fg}`;
        if (fight.titleChange) recentContent += ` {yellow-fg}TITLE{/yellow-fg}`;
        recentContent += '\n\n';
      }
    } else {
      recentContent = `{${t.commentary}-fg}No recent fights{/${t.commentary}-fg}`;
    }

    recentPanel.setContent(recentContent);

    // Bottom panel - Top Contenders
    const contendersPanel = blessed.box({
      parent: this.screen,
      top: '46%',
      left: 1,
      width: '98%',
      height: '45%',
      tags: true,
      border: { type: 'line' },
      label: ' TOP 10 HEAVYWEIGHT CONTENDERS ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    const hw = this.universe.divisions.get('Heavyweight');
    let contenderContent = '';

    if (hw && hw.rankings.length > 0) {
      const rows = [];
      for (let i = 0; i < Math.min(10, hw.rankings.length); i++) {
        const fighter = this.universe.fighters.get(hw.rankings[i]);
        if (fighter) {
          const rank = String(i + 1).padStart(2);
          const name = fighter.name.substring(0, 20).padEnd(20);
          const record = fighter.getRecordString().padEnd(18);
          const age = fighter.getAge(this.universe.currentDate);
          rows.push(`{${t.stamina}-fg}${rank}.{/${t.stamina}-fg} ${name} ${record} Age: ${age}`);
        }
      }
      // Display in two columns
      const mid = Math.ceil(rows.length / 2);
      for (let i = 0; i < mid; i++) {
        contenderContent += rows[i] || '';
        if (rows[i + mid]) {
          contenderContent += '    ' + rows[i + mid];
        }
        contenderContent += '\n';
      }
    } else {
      contenderContent = `{${t.commentary}-fg}Rankings being calculated...{/${t.commentary}-fg}`;
    }

    contendersPanel.setContent(contenderContent);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}ESC Return to Menu{/${t.commentary}-fg}{/center}`
    });

    this.screen.key(['escape', 'q'], () => this.showMainMenu());
    this.screen.render();
  }

  /**
   * Show simulate sub-menu
   */
  showSimulateMenu() {
    this.currentView = 'simulate';
    this.clearScreen();
    this.createBackground();
    this.createHeader('SIMULATE TIME');

    const t = this.theme;

    const menuItems = [
      { label: 'Simulate 1 Week', action: 'week1', icon: '▶' },
      { label: 'Simulate 1 Month (4 weeks)', action: 'month', icon: '▶▶' },
      { label: 'Simulate 1 Year (52 weeks)', action: 'year', icon: '⏩' },
      { label: 'Back to Menu', action: 'back', icon: '←' }
    ];

    const menu = this.createMenuList(menuItems, {
      top: 6,
      width: 45,
      label: 'SIMULATION OPTIONS'
    });

    // Info panel
    const infoPanel = blessed.box({
      parent: this.screen,
      top: 12,
      left: 'center',
      width: 50,
      height: 6,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: t.border }, bg: t.background },
      content: `{center}
{${t.commentary}-fg}Simulating will advance time,
run scheduled fights, and update
fighter records and rankings.{/${t.commentary}-fg}
{/center}`
    });

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Navigate  •  ENTER Select  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    menu.on('select', (item, index) => {
      const action = menuItems[index].action;
      switch (action) {
        case 'week1':
          this.runSimulation(1);
          break;
        case 'month':
          this.runSimulation(4);
          break;
        case 'year':
          this.runSimulation(52);
          break;
        case 'back':
          this.showMainMenu();
          break;
      }
    });

    menu.key(['escape', 'q'], () => this.showMainMenu());
    menu.focus();
    this.screen.render();
  }

  /**
   * Run simulation with progress display
   */
  runSimulation(weeks) {
    this.clearScreen();
    this.createBackground();

    const t = this.theme;

    const progressBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 12,
      tags: true,
      border: { type: 'line' },
      label: ' SIMULATING ',
      style: { border: { fg: t.fighterA }, bg: t.background }
    });

    this.screen.render();

    // Collect all events during simulation
    this.lastEvents = [];
    let currentWeek = 0;

    const simulateBatch = () => {
      const batchSize = Math.min(4, weeks - currentWeek);

      for (let i = 0; i < batchSize; i++) {
        const events = this.processor.processWeek();
        this.lastEvents.push(...events);
        currentWeek++;
      }

      const progress = Math.floor((currentWeek / weeks) * 100);
      const fights = this.lastEvents.filter(e => e.type === 'FIGHT_RESULT').length;
      const kos = this.lastEvents.filter(e => e.type === 'FIGHT_RESULT' && (e.method === 'KO' || e.method === 'TKO')).length;
      const titleChanges = this.lastEvents.filter(e => e.type === 'TITLE_CHANGE').length;

      progressBox.setContent(`{center}
{bold}{${t.fighterA}-fg}Simulating ${weeks} week${weeks > 1 ? 's' : ''}...{/${t.fighterA}-fg}{/bold}

${this.universe.getDateString()}

{${t.stamina}-fg}[${'█'.repeat(Math.floor(progress / 5))}${'░'.repeat(20 - Math.floor(progress / 5))}] ${progress}%{/${t.stamina}-fg}

Fights: ${fights}  |  KOs: ${kos}  |  Title Changes: ${titleChanges}
{/center}`);
      this.screen.render();

      if (currentWeek < weeks) {
        setTimeout(simulateBatch, 20);
      } else {
        // Simulation complete - generate news articles
        this.pendingArticles = this.publication.generateArticles(this.lastEvents);

        // Mark as having unsaved changes (auto-save happens but track for user awareness)
        this.hasUnsavedChanges = true;

        // Auto-save
        this.saveManager.save(this.universe, 'universe-autosave');
        this.hasUnsavedChanges = false; // Saved successfully

        setTimeout(() => {
          this.showSimulationSummary();
        }, 500);
      }
    };

    setTimeout(simulateBatch, 100);
  }

  /**
   * Show simulation summary
   */
  showSimulationSummary() {
    this.clearScreen();
    this.createBackground();
    this.createHeader('SIMULATION COMPLETE');

    const t = this.theme;

    const fights = this.lastEvents.filter(e => e.type === 'FIGHT_RESULT');
    const kos = fights.filter(e => e.method === 'KO' || e.method === 'TKO');
    const titleChanges = this.lastEvents.filter(e => e.type === 'TITLE_CHANGE');
    const retirements = this.lastEvents.filter(e => e.type === 'RETIREMENT');
    const hofInductions = this.lastEvents.filter(e => e.type === 'HOF_INDUCTION');
    const prospects = this.lastEvents.filter(e => e.type === 'NEW_PROSPECT');

    const summaryPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: 'center',
      width: 60,
      height: 16,
      tags: true,
      border: { type: 'line' },
      label: ' SUMMARY ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    let content = `
{${t.stamina}-fg}Fights Held:{/${t.stamina}-fg}        ${fights.length}
{${t.stamina}-fg}Knockouts:{/${t.stamina}-fg}          ${kos.length} (${fights.length > 0 ? Math.round(kos.length/fights.length*100) : 0}%)
{${t.stamina}-fg}Title Changes:{/${t.stamina}-fg}      ${titleChanges.length}

{${t.stamina}-fg}New Prospects:{/${t.stamina}-fg}      ${prospects.length}
{${t.stamina}-fg}Retirements:{/${t.stamina}-fg}        ${retirements.length}
{${t.stamina}-fg}HOF Inductions:{/${t.stamina}-fg}     ${hofInductions.length}
`;

    if (titleChanges.length > 0) {
      content += `\n{${t.round}-fg}━━ TITLE CHANGES ━━{/${t.round}-fg}\n`;
      for (const tc of titleChanges.slice(0, 3)) {
        content += `{yellow-fg}${tc.organization}{/yellow-fg} ${tc.newChampion || tc.champion}\n`;
      }
    }

    summaryPanel.setContent(content);

    // News available notification
    if (this.pendingArticles.length > 0) {
      blessed.box({
        parent: this.screen,
        top: 21,
        left: 'center',
        width: 50,
        height: 3,
        tags: true,
        border: { type: 'line' },
        style: { border: { fg: t.fighterA }, bg: t.background },
        content: `{center}{${t.fighterA}-fg}${this.pendingArticles.length} new articles available in Boxing News!{/${t.fighterA}-fg}{/center}`
      });
    }

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}ENTER Continue{/${t.commentary}-fg}{/center}`
    });

    this.screen.key(['enter', 'escape', 'q'], () => this.showMainMenu());
    this.screen.render();
  }

  /**
   * Show rankings by division
   */
  showRankings() {
    this.currentView = 'rankings';
    this.clearScreen();
    this.createBackground();
    this.createHeader('WORLD RANKINGS');

    const t = this.theme;

    const divisions = Array.from(this.universe.divisions.keys());

    const divisionList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '30%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' DIVISIONS ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    divisions.forEach(name => {
      const div = this.universe.divisions.get(name);
      const count = div.fighters.length;
      divisionList.addItem(`${name} (${count})`);
    });

    const rankingsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '32%',
      width: '67%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' RANKINGS ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    const updateRankings = (idx) => {
      const divName = divisions[idx];
      const division = this.universe.divisions.get(divName);
      if (!division) return;

      let content = `{bold}{${t.fighterA}-fg}${divName} Rankings{/${t.fighterA}-fg}{/bold}\n`;
      content += `{${t.commentary}-fg}${division.displayWeight}{/${t.commentary}-fg}\n\n`;

      // Show champions from each sanctioning body
      const bodies = this.universe.getAllSanctioningBodies();
      if (bodies.length > 0) {
        content += `{${t.round}-fg}━━ WORLD CHAMPIONS ━━{/${t.round}-fg}\n`;
        for (const body of bodies) {
          const champId = body.getChampion(divName);
          const champ = champId ? this.universe.fighters.get(champId) : null;
          const beltColor = body.beltColor === 'green' ? 'green' :
                            body.beltColor === 'gold' ? 'yellow' :
                            body.beltColor === 'red' ? 'red' : 'white';

          if (champ) {
            content += `{${beltColor}-fg}${body.shortName}{/${beltColor}-fg} ${champ.name} (${champ.getRecordString()})\n`;
          } else {
            content += `{${beltColor}-fg}${body.shortName}{/${beltColor}-fg} {${t.commentary}-fg}VACANT{/${t.commentary}-fg}\n`;
          }
        }
        content += '\n';
      }

      content += `{${t.round}-fg}━━ TOP 15 CONTENDERS ━━{/${t.round}-fg}\n`;

      if (division.rankings.length > 0) {
        for (let i = 0; i < Math.min(15, division.rankings.length); i++) {
          const fighter = this.universe.fighters.get(division.rankings[i]);
          if (fighter) {
            const age = fighter.getAge(this.universe.currentDate);
            const tier = fighter.potential.tier.substring(0, 4);
            content += `{${t.stamina}-fg}${String(i+1).padStart(2)}.{/${t.stamina}-fg} ${fighter.name}\n`;
            content += `    ${fighter.getRecordString()} | Age ${age} | ${tier}\n`;
          }
        }
      } else {
        content += `{${t.commentary}-fg}No ranked fighters{/${t.commentary}-fg}\n`;
      }

      rankingsPanel.setContent(content);
      this.screen.render();
    };

    divisionList.on('select item', () => updateRankings(divisionList.selected));
    updateRankings(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Select Division  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    divisionList.key(['escape', 'q'], () => this.showMainMenu());
    divisionList.focus();
    this.screen.render();
  }

  /**
   * Show upcoming fights
   */
  showUpcomingFights() {
    this.currentView = 'upcoming';
    this.clearScreen();
    this.createBackground();
    this.createHeader('UPCOMING FIGHTS');

    const t = this.theme;

    // Generate potential fights for next week
    const potentialFights = this.matchmaker.generateWeeklyFights();

    const fightsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: 'center',
      width: '90%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' SCHEDULED BOUTS ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    let content = '';

    if (potentialFights.length > 0) {
      // Group by fight type
      const titleFights = potentialFights.filter(f => f.type === 'TITLE_FIGHT');
      const mainEvents = potentialFights.filter(f => f.type === 'MAIN_EVENT');
      const undercard = potentialFights.filter(f => f.type === 'UNDERCARD' || f.type === 'CLUB');

      if (titleFights.length > 0) {
        content += `{${t.round}-fg}━━ CHAMPIONSHIP FIGHTS ━━{/${t.round}-fg}\n\n`;
        for (const fight of titleFights) {
          const fighterA = this.universe.fighters.get(fight.fighterA);
          const fighterB = this.universe.fighters.get(fight.fighterB);
          if (fighterA && fighterB) {
            const org = fight.titleInfo?.organization || '';
            content += `{yellow-fg}${org} ${fight.division} Title{/yellow-fg}\n`;
            content += `{${t.fighterA}-fg}${fighterA.name}{/${t.fighterA}-fg} (${fighterA.getRecordString()})\n`;
            content += `   VS\n`;
            content += `{${t.fighterB}-fg}${fighterB.name}{/${t.fighterB}-fg} (${fighterB.getRecordString()})\n`;
            content += `${fight.rounds} Rounds | ${fight.quality}\n\n`;
          }
        }
      }

      if (mainEvents.length > 0) {
        content += `{${t.round}-fg}━━ MAIN EVENTS ━━{/${t.round}-fg}\n\n`;
        for (const fight of mainEvents) {
          const fighterA = this.universe.fighters.get(fight.fighterA);
          const fighterB = this.universe.fighters.get(fight.fighterB);
          if (fighterA && fighterB) {
            content += `{${t.fighterA}-fg}${fighterA.name}{/${t.fighterA}-fg} vs {${t.fighterB}-fg}${fighterB.name}{/${t.fighterB}-fg}\n`;
            content += `${fighterA.getRecordString()} vs ${fighterB.getRecordString()}\n`;
            content += `${fight.division} | ${fight.rounds} Rounds\n\n`;
          }
        }
      }

      if (undercard.length > 0) {
        content += `{${t.round}-fg}━━ UNDERCARD ━━{/${t.round}-fg}\n\n`;
        for (const fight of undercard.slice(0, 10)) {
          const fighterA = this.universe.fighters.get(fight.fighterA);
          const fighterB = this.universe.fighters.get(fight.fighterB);
          if (fighterA && fighterB) {
            content += `${fighterA.name} vs ${fighterB.name}\n`;
            content += `{${t.commentary}-fg}${fight.division} | ${fight.rounds} Rounds{/${t.commentary}-fg}\n\n`;
          }
        }
      }
    } else {
      content = `{${t.commentary}-fg}No fights currently scheduled.\n\nSimulate time to generate new fight cards.{/${t.commentary}-fg}`;
    }

    fightsPanel.setContent(content);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}ESC Return to Menu{/${t.commentary}-fg}{/center}`
    });

    this.screen.key(['escape', 'q'], () => this.showMainMenu());
    this.screen.render();
  }

  /**
   * Show recent fight results
   */
  showRecentResults() {
    this.currentView = 'results';
    this.clearScreen();
    this.createBackground();
    this.createHeader('RECENT RESULTS');

    const t = this.theme;

    const resultsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: 'center',
      width: '90%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHT RESULTS ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    let content = '';

    // Get results from recent weeks
    const recentWeeks = this.universe.recentResults || [];

    if (recentWeeks.length > 0) {
      for (const week of recentWeeks.slice().reverse()) {
        content += `{${t.round}-fg}━━ Week ${week.date.week}, ${week.date.year} ━━{/${t.round}-fg}\n\n`;

        for (const fight of week.fights) {
          const methodColor = (fight.method === 'KO' || fight.method === 'TKO') ? t.health : t.foreground;
          const methodStr = fight.method === 'Decision' ? 'DEC' : fight.method;

          content += `{${t.fighterA}-fg}${fight.winnerName}{/${t.fighterA}-fg} def. ${fight.loserName}\n`;
          content += `  {${methodColor}-fg}${methodStr}`;
          if (fight.method !== 'Decision') {
            content += ` Round ${fight.round}`;
          }
          content += `{/${methodColor}-fg}`;

          if (fight.titleChange) {
            content += ` {yellow-fg}[${fight.titleChange.organization} TITLE]{/yellow-fg}`;
          }
          if (fight.isUpset) {
            content += ` {${t.fighterB}-fg}[UPSET]{/${t.fighterB}-fg}`;
          }
          content += '\n';
          content += `  {${t.commentary}-fg}${fight.division}{/${t.commentary}-fg}\n\n`;
        }
      }
    } else {
      content = `{${t.commentary}-fg}No recent fight results.\n\nSimulate time to generate fights.{/${t.commentary}-fg}`;
    }

    resultsPanel.setContent(content);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 40,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}ESC Return to Menu{/${t.commentary}-fg}{/center}`
    });

    this.screen.key(['escape', 'q'], () => this.showMainMenu());
    this.screen.render();
  }

  /**
   * Show boxing news/publications
   */
  showNews() {
    this.currentView = 'news';
    this.clearScreen();
    this.createBackground();
    this.createHeader('THE BOXING CHRONICLE');

    const t = this.theme;

    // Get all articles (pending + archived)
    const allArticles = [
      ...this.pendingArticles,
      ...(this.universe.newsArchive || [])
    ].slice(0, 20);

    if (allArticles.length === 0) {
      const emptyPanel = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 7,
        tags: true,
        border: { type: 'line' },
        style: { border: { fg: t.border }, bg: t.background },
        content: `{center}
{${t.commentary}-fg}No news articles yet.

Simulate fights to generate
boxing news and coverage.{/${t.commentary}-fg}
{/center}`
      });

      blessed.box({
        parent: this.screen,
        bottom: 0,
        left: 'center',
        width: 40,
        height: 1,
        tags: true,
        content: `{center}{${t.commentary}-fg}ESC Return to Menu{/${t.commentary}-fg}{/center}`
      });

      this.screen.key(['escape', 'q'], () => this.showMainMenu());
      this.screen.render();
      return;
    }

    const articleList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '35%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' HEADLINES ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    allArticles.forEach(article => {
      const typeIcon = article.type === 'TITLE_FIGHT' ? '🏆' :
                       article.type === 'UPSET' ? '⚡' :
                       article.type === 'KO' ? '💥' :
                       article.type === 'HOF' ? '🏅' :
                       article.type === 'RETIREMENT' ? '👋' : '📰';
      articleList.addItem(`${typeIcon} ${article.headline.substring(0, 30)}`);
    });

    const articlePanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '37%',
      width: '62%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' ARTICLE ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    const showArticle = (idx) => {
      const article = allArticles[idx];
      if (!article) return;

      let content = `{bold}{${t.fighterA}-fg}${article.headline}{/${t.fighterA}-fg}{/bold}\n`;
      content += `{${t.commentary}-fg}${article.date || this.universe.getDateString()}{/${t.commentary}-fg}\n\n`;
      content += article.body;

      articlePanel.setContent(content);
      this.screen.render();
    };

    articleList.on('select item', () => showArticle(articleList.selected));
    showArticle(0);

    // Mark pending articles as read
    if (this.pendingArticles.length > 0) {
      if (!this.universe.newsArchive) this.universe.newsArchive = [];
      this.universe.newsArchive.unshift(...this.pendingArticles);
      // Keep only last 50 articles
      this.universe.newsArchive = this.universe.newsArchive.slice(0, 50);
      this.pendingArticles = [];
    }

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse Headlines  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    articleList.key(['escape', 'q'], () => this.showMainMenu());
    articleList.focus();
    this.screen.render();
  }

  /**
   * Show fighters list
   */
  showFighters() {
    this.currentView = 'fighters';
    this.clearScreen();
    this.createBackground();
    this.createHeader('FIGHTER ROSTER');

    const t = this.theme;

    const fighters = this.universe.getActiveFighters()
      .sort((a, b) => (b.career.record.wins - b.career.record.losses) -
                      (a.career.record.wins - a.career.record.losses));

    const fighterList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '40%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ` FIGHTERS (${fighters.length}) `,
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    fighters.forEach(fighter => {
      const age = fighter.getAge(this.universe.currentDate);
      const record = fighter.getRecordString();
      fighterList.addItem(`${fighter.name} (${age}) ${record}`);
    });

    const detailsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '42%',
      width: '57%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' PROFILE ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true
    });

    const showFighter = (idx) => {
      const fighter = fighters[idx];
      if (!fighter) return;

      const age = fighter.getAge(this.universe.currentDate);
      const division = this.universe.getDivisionForWeight(fighter.physical.weight);
      const ranking = division?.getFighterRanking(fighter.id);

      let content = `{bold}{${t.fighterA}-fg}${fighter.name}{/${t.fighterA}-fg}{/bold}\n`;
      content += `{${t.commentary}-fg}"${fighter.nickname || 'The Fighter'}"{/${t.commentary}-fg}\n\n`;

      content += `{${t.round}-fg}Age:{/${t.round}-fg} ${age}  |  {${t.round}-fg}Phase:{/${t.round}-fg} ${fighter.career.phase}\n`;
      content += `{${t.round}-fg}Record:{/${t.round}-fg} ${fighter.getRecordString()}\n`;
      content += `{${t.round}-fg}Division:{/${t.round}-fg} ${division?.name || 'None'}\n`;
      content += `{${t.round}-fg}Ranking:{/${t.round}-fg} ${ranking ? '#' + ranking : 'Unranked'}\n`;
      content += `{${t.round}-fg}Style:{/${t.round}-fg} ${fighter.style?.primary || 'Unknown'}\n\n`;

      content += `{${t.stamina}-fg}━━ ATTRIBUTES ━━{/${t.stamina}-fg}\n`;
      content += `Power:    ${this.createStatBar(fighter.power?.powerRight || 70, 15)} ${Math.round(fighter.power?.powerRight || 70)}\n`;
      content += `Speed:    ${this.createStatBar(fighter.speed?.handSpeed || 70, 15)} ${Math.round(fighter.speed?.handSpeed || 70)}\n`;
      content += `Defense:  ${this.createStatBar(fighter.defense?.headMovement || 70, 15)} ${Math.round(fighter.defense?.headMovement || 70)}\n`;
      content += `Chin:     ${this.createStatBar(fighter.mental?.chin || 70, 15)} ${Math.round(fighter.mental?.chin || 70)}\n`;
      content += `Heart:    ${this.createStatBar(fighter.mental?.heart || 70, 15)} ${Math.round(fighter.mental?.heart || 70)}\n`;
      content += `Fight IQ: ${this.createStatBar(fighter.technical?.fightIQ || 70, 15)} ${Math.round(fighter.technical?.fightIQ || 70)}\n\n`;

      content += `{${t.stamina}-fg}━━ POTENTIAL ━━{/${t.stamina}-fg}\n`;
      content += `Tier: ${fighter.potential.tier}\n`;
      content += `Ceiling: ${fighter.potential.ceiling}\n`;
      content += `Peak Age: ${fighter.potential.peakAgePhysical}\n`;

      // Recent fights
      if (fighter.fightHistory && fighter.fightHistory.length > 0) {
        content += `\n{${t.stamina}-fg}━━ RECENT FIGHTS ━━{/${t.stamina}-fg}\n`;
        for (const fight of fighter.fightHistory.slice(-5).reverse()) {
          const resultColor = fight.result === 'W' ? 'green' : fight.result === 'L' ? 'red' : 'yellow';
          content += `{${resultColor}-fg}${fight.result}{/${resultColor}-fg} vs ${fight.opponentName} (${fight.method})\n`;
        }
      }

      detailsPanel.setContent(content);
      this.screen.render();
    };

    fighterList.on('select item', () => showFighter(fighterList.selected));
    showFighter(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 60,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ENTER View History  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    fighterList.key(['enter'], () => {
      const fighter = fighters[fighterList.selected];
      if (fighter && fighter.fightHistory && fighter.fightHistory.length > 0) {
        this.showFighterHistory(fighter);
      }
    });

    fighterList.key(['escape', 'q'], () => this.showMainMenu());
    fighterList.focus();
    this.screen.render();
  }

  /**
   * Show fight history for a specific fighter with replay option
   */
  showFighterHistory(fighter) {
    this.currentView = 'fighterHistory';
    this.clearScreen();
    this.createBackground();
    this.createHeader(`${fighter.name} - FIGHT HISTORY`);

    const t = this.theme;

    const history = [...fighter.fightHistory].reverse(); // Most recent first

    const fightList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '45%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ` FIGHTS (${history.length}) `,
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    history.forEach(fight => {
      const resultColor = fight.result === 'W' ? 'green' : fight.result === 'L' ? 'red' : 'yellow';
      const title = fight.wasTitle ? ' 🏆' : '';
      const canReplay = fight.replayData ? ' ▶' : '';
      fightList.addItem(`{${resultColor}-fg}${fight.result}{/${resultColor}-fg} vs ${fight.opponentName}${title}${canReplay}`);
    });

    const detailsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '47%',
      width: '52%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' FIGHT DETAILS ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    const showFightDetails = (idx) => {
      const fight = history[idx];
      if (!fight) return;

      const resultColor = fight.result === 'W' ? 'green' : fight.result === 'L' ? 'red' : 'yellow';
      const methodColor = (fight.method === 'KO' || fight.method === 'TKO') ? t.health : t.foreground;

      let content = `{bold}{${resultColor}-fg}${fight.result === 'W' ? 'VICTORY' : fight.result === 'L' ? 'DEFEAT' : 'DRAW'}{/${resultColor}-fg}{/bold}\n\n`;

      content += `{${t.round}-fg}Opponent:{/${t.round}-fg} ${fight.opponentName}\n`;
      content += `{${t.round}-fg}Date:{/${t.round}-fg} Week ${fight.date.week}, ${fight.date.year}\n`;
      content += `{${t.round}-fg}Result:{/${t.round}-fg} {${methodColor}-fg}${fight.method}`;
      if (fight.method !== 'Decision') {
        content += ` Round ${fight.round}`;
      }
      content += `{/${methodColor}-fg}\n`;
      content += `{${t.round}-fg}Scheduled:{/${t.round}-fg} ${fight.totalRounds || '?'} rounds\n\n`;

      if (fight.wasTitle) {
        content += `{yellow-fg}━━ TITLE FIGHT ━━{/yellow-fg}\n`;
        content += `${fight.title || 'World Title'}\n\n`;
      }

      if (fight.replayData) {
        content += `{${t.stamina}-fg}━━ REPLAY AVAILABLE ━━{/${t.stamina}-fg}\n`;
        content += `{${t.fighterA}-fg}Press ENTER to watch this fight!{/${t.fighterA}-fg}\n\n`;

        content += `{${t.commentary}-fg}Fighter A:{/${t.commentary}-fg} ${fight.replayData.fighterA?.identity?.name || 'Unknown'}\n`;
        content += `{${t.commentary}-fg}Fighter B:{/${t.commentary}-fg} ${fight.replayData.fighterB?.identity?.name || 'Unknown'}\n`;
      } else {
        content += `{${t.commentary}-fg}Replay data not available for this fight{/${t.commentary}-fg}\n`;
      }

      detailsPanel.setContent(content);
      this.screen.render();
    };

    fightList.on('select item', () => showFightDetails(fightList.selected));
    showFightDetails(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 70,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse  •  ENTER Replay Fight  •  ESC Back to Fighters{/${t.commentary}-fg}{/center}`
    });

    fightList.key(['enter'], () => {
      const fight = history[fightList.selected];
      if (fight && fight.replayData) {
        this.launchFightReplay(fight);
      }
    });

    fightList.key(['escape', 'q'], () => this.showFighters());
    fightList.focus();
    this.screen.render();
  }

  /**
   * Launch a fight replay
   */
  launchFightReplay(fight) {
    if (!fight.replayData) return;

    // Save current universe state
    this.saveManager.save(this.universe, 'universe-autosave');

    // Destroy screen before replay
    this.screen.destroy();

    // Call the replay callback if set
    if (this.onFightReplay) {
      this.onFightReplay(fight.replayData);
    }
  }

  /**
   * Show divisions
   */
  showDivisions() {
    this.currentView = 'divisions';
    this.clearScreen();
    this.createBackground();
    this.createHeader('WEIGHT DIVISIONS');

    const t = this.theme;

    const divisions = Array.from(this.universe.divisions.entries());

    const divisionList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '35%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' DIVISIONS ',
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true
    });

    divisions.forEach(([name, div]) => {
      const count = div.fighters.length;
      divisionList.addItem(`${name} (${count})`);
    });

    const detailsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '37%',
      width: '62%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' DIVISION INFO ',
      style: { border: { fg: t.border }, bg: t.background },
      scrollable: true
    });

    const showDivision = (idx) => {
      const [name, division] = divisions[idx];
      let content = `{bold}{${t.fighterA}-fg}${name}{/${t.fighterA}-fg}{/bold}\n`;
      content += `{${t.commentary}-fg}${division.displayWeight}{/${t.commentary}-fg}\n\n`;

      content += `{${t.round}-fg}━━ CHAMPIONS ━━{/${t.round}-fg}\n`;
      const bodies = this.universe.getAllSanctioningBodies();
      for (const body of bodies) {
        const champId = body.getChampion(name);
        const champ = champId ? this.universe.fighters.get(champId) : null;
        const beltColor = body.beltColor === 'green' ? 'green' :
                          body.beltColor === 'gold' ? 'yellow' :
                          body.beltColor === 'red' ? 'red' : 'white';

        if (champ) {
          content += `{${beltColor}-fg}${body.shortName}{/${beltColor}-fg} ${champ.name} (${champ.getRecordString()})\n`;
        } else {
          content += `{${beltColor}-fg}${body.shortName}{/${beltColor}-fg} {${t.commentary}-fg}VACANT{/${t.commentary}-fg}\n`;
        }
      }

      content += `\n{${t.round}-fg}━━ TOP 15 ━━{/${t.round}-fg}\n`;
      for (let i = 0; i < Math.min(15, division.rankings.length); i++) {
        const fighter = this.universe.fighters.get(division.rankings[i]);
        if (fighter) {
          content += `${String(i+1).padStart(2)}. ${fighter.name} (${fighter.getRecordString()})\n`;
        }
      }

      if (division.rankings.length === 0) {
        content += `{${t.commentary}-fg}No ranked fighters{/${t.commentary}-fg}\n`;
      }

      detailsPanel.setContent(content);
      this.screen.render();
    };

    divisionList.on('select item', () => showDivision(divisionList.selected));
    showDivision(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse Divisions  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    divisionList.key(['escape', 'q'], () => this.showMainMenu());
    divisionList.focus();
    this.screen.render();
  }

  /**
   * Show Hall of Fame
   */
  showHallOfFame() {
    this.currentView = 'hof';
    this.clearScreen();
    this.createBackground();
    this.createHeader('HALL OF FAME');

    const t = this.theme;

    const inductees = this.universe.hallOfFame?.getInductees() || [];

    if (inductees.length === 0) {
      const emptyPanel = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 7,
        tags: true,
        border: { type: 'line' },
        style: { border: { fg: t.border }, bg: t.background },
        content: `{center}
{${t.commentary}-fg}No Hall of Fame inductees yet.

Fighters become eligible for induction
3 years after retirement.{/${t.commentary}-fg}
{/center}`
      });

      blessed.box({
        parent: this.screen,
        bottom: 0,
        left: 'center',
        width: 40,
        height: 1,
        tags: true,
        content: `{center}{${t.commentary}-fg}ESC Return to Menu{/${t.commentary}-fg}{/center}`
      });

      this.screen.key(['escape', 'q'], () => this.showMainMenu());
      this.screen.render();
      return;
    }

    const hofList = blessed.list({
      parent: this.screen,
      top: 4,
      left: 1,
      width: '40%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ` INDUCTEES (${inductees.length}) `,
      style: {
        border: { fg: t.border },
        bg: t.background,
        selected: { bg: t.fighterA, fg: t.background },
        item: { fg: t.foreground }
      },
      keys: true,
      vi: true,
      scrollbar: { ch: ' ', track: { bg: t.background }, style: { bg: t.fighterA } }
    });

    inductees.forEach(inductee => {
      const categoryIcon = inductee.category === 'FIRST_BALLOT' ? '★' : '○';
      hofList.addItem(`${categoryIcon} ${inductee.name}`);
    });

    const detailsPanel = blessed.box({
      parent: this.screen,
      top: 4,
      left: '42%',
      width: '57%',
      height: '85%',
      tags: true,
      border: { type: 'line' },
      label: ' PROFILE ',
      style: { border: { fg: t.border }, bg: t.background }
    });

    const showInductee = (idx) => {
      const inductee = inductees[idx];
      if (!inductee) return;

      let content = `{bold}{${t.fighterA}-fg}${inductee.name}{/${t.fighterA}-fg}{/bold}\n`;
      if (inductee.nickname) {
        content += `{${t.commentary}-fg}"${inductee.nickname}"{/${t.commentary}-fg}\n`;
      }
      content += '\n';

      content += `{${t.round}-fg}Category:{/${t.round}-fg} ${inductee.category.replace('_', ' ')}\n`;
      content += `{${t.round}-fg}Inducted:{/${t.round}-fg} ${inductee.inductionDate.year}\n`;
      content += `{${t.round}-fg}Career:{/${t.round}-fg} ${inductee.careerSpan}\n\n`;

      content += `{${t.stamina}-fg}━━ CAREER RECORD ━━{/${t.stamina}-fg}\n`;
      const r = inductee.record;
      content += `${r.wins}-${r.losses}${r.draws > 0 ? '-' + r.draws : ''} (${r.kos} KOs)\n`;
      content += `Peak Ranking: #${inductee.peakRanking || '?'}\n\n`;

      if (inductee.titles && inductee.titles.length > 0) {
        content += `{${t.stamina}-fg}━━ CHAMPIONSHIP TITLES ━━{/${t.stamina}-fg}\n`;
        for (const title of inductee.titles) {
          content += `${title.title}\n`;
          content += `  Won: ${title.wonDate.year} | Defenses: ${title.defenses || 0}\n`;
        }
      }

      detailsPanel.setContent(content);
      this.screen.render();
    };

    hofList.on('select item', () => showInductee(hofList.selected));
    showInductee(0);

    // Controls
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 'center',
      width: 50,
      height: 1,
      tags: true,
      content: `{center}{${t.commentary}-fg}↑/↓ Browse Inductees  •  ESC Back{/${t.commentary}-fg}{/center}`
    });

    hofList.key(['escape', 'q'], () => this.showMainMenu());
    hofList.focus();
    this.screen.render();
  }

  /**
   * Create a stat bar
   */
  createStatBar(value, width = 15) {
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Show a loading overlay with spinner
   */
  showLoader(message = 'Loading...') {
    const t = this.theme;

    this.loaderBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: t.fighterA },
        bg: t.background
      }
    });

    this.loaderSpinnerIndex = 0;
    this.loaderMessage = message;

    this.updateLoader();
    this.loaderInterval = setInterval(() => this.updateLoader(), 100);
    this.screen.render();
  }

  /**
   * Update loader spinner animation
   */
  updateLoader() {
    if (!this.loaderBox) return;

    const t = this.theme;
    const spinners = ['◐', '◓', '◑', '◒'];
    const spinner = spinners[this.loaderSpinnerIndex % spinners.length];
    this.loaderSpinnerIndex++;

    this.loaderBox.setContent(`{center}

{${t.fighterA}-fg}${spinner}{/${t.fighterA}-fg} ${this.loaderMessage}

{${t.commentary}-fg}Please wait...{/${t.commentary}-fg}
{/center}`);
    this.screen.render();
  }

  /**
   * Hide the loading overlay
   */
  hideLoader() {
    if (this.loaderInterval) {
      clearInterval(this.loaderInterval);
      this.loaderInterval = null;
    }
    if (this.loaderBox) {
      this.loaderBox.detach();
      this.loaderBox = null;
    }
    this.screen.render();
  }

  /**
   * Prompt to save before exiting
   */
  promptSaveAndExit() {
    if (!this.hasUnsavedChanges) {
      this.doExit();
      return;
    }

    const t = this.theme;

    // Create overlay
    const overlay = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: 'black', transparent: true }
    });

    const dialog = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 11,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: t.fighterA },
        bg: t.background
      }
    });

    dialog.setContent(`{center}
{bold}{${t.fighterA}-fg}UNSAVED CHANGES{/${t.fighterA}-fg}{/bold}

{${t.commentary}-fg}You have unsaved progress.{/${t.commentary}-fg}
{${t.commentary}-fg}What would you like to do?{/${t.commentary}-fg}

{${t.stamina}-fg}[S]{/${t.stamina}-fg} Save and Exit
{${t.stamina}-fg}[D]{/${t.stamina}-fg} Discard and Exit
{${t.stamina}-fg}[C]{/${t.stamina}-fg} Cancel
{/center}`);

    this.screen.render();

    const cleanup = () => {
      overlay.detach();
      dialog.detach();
      this.screen.unkey(['s', 'd', 'c', 'escape']);
      this.screen.render();
    };

    this.screen.key(['s'], () => {
      cleanup();
      this.saveAndExit();
    });

    this.screen.key(['d'], () => {
      cleanup();
      this.doExit();
    });

    this.screen.key(['c', 'escape'], () => {
      cleanup();
    });
  }

  /**
   * Save and exit
   */
  saveAndExit() {
    this.showLoader('Saving universe...');

    setTimeout(() => {
      this.saveManager.save(this.universe, 'universe-autosave');
      this.hasUnsavedChanges = false;
      this.hideLoader();
      this.doExit();
    }, 300);
  }

  /**
   * Exit without saving
   */
  doExit() {
    this.screen.destroy();
    if (this.onExit) {
      this.onExit();
    }
  }
}

export default UniverseTUI;
