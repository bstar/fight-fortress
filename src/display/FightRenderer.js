/**
 * Fight Renderer
 * Comprehensive CLI output combining all display elements
 */

import { RingDisplay } from './RingDisplay.js';
import { CommentaryGenerator } from './CommentaryGenerator.js';
import { FightLogger } from './FightLogger.js';

export class FightRenderer {
  constructor(options = {}) {
    this.options = {
      showRing: options.showRing !== false,
      showCommentary: options.showCommentary !== false,
      showStats: options.showStats !== false,
      compactMode: options.compactMode || false,
      enableLogging: options.enableLogging !== false,
      logDir: options.logDir || './logs',
      clearScreen: options.clearScreen !== false,
      colorOutput: options.colorOutput !== false
    };

    this.ringDisplay = new RingDisplay({
      width: options.ringWidth || 60,
      height: options.ringHeight || 25
    });

    this.commentary = new CommentaryGenerator();
    this.logger = options.enableLogging ? new FightLogger({
      outputDir: this.options.logDir
    }) : null;

    this.fight = null;
    this.commentaryQueue = [];
    this.maxCommentaryLines = 8;
    this.lastRenderTime = 0;
    this.initialized = false;
  }

  /**
   * Initialize renderer for a fight
   */
  initialize(fight) {
    this.fight = fight;
    this.commentaryQueue = [];

    // Initialize components
    this.ringDisplay.initialize(fight.fighterA, fight.fighterB);
    this.commentary.initialize(fight.fighterA, fight.fighterB);

    if (this.logger) {
      this.logger.initialize(fight);
    }

    this.initialized = true;

    // Print initial header
    this.printHeader();
  }

  /**
   * Print fight header
   */
  printHeader() {
    const f = this.fight;
    const header = `
${'='.repeat(70)}
${this.centerText('FIGHT FORTRESS', 70)}
${'='.repeat(70)}

${this.centerText(`${f.fighterA.name} vs ${f.fighterB.name}`, 70)}
${this.centerText(`${f.config.rounds} Rounds - ${f.config.type}`, 70)}

${'='.repeat(70)}
`;
    console.log(header);
  }

  /**
   * Handle simulation event
   */
  handleEvent(event, fightState) {
    if (!this.initialized) return;

    // Log the event
    if (this.logger) {
      this.logger.logEvent(event);
    }

    // Generate commentary
    const commentaries = this.commentary.generate(event, fightState);
    for (const c of commentaries) {
      this.addCommentary(c.text, c.priority);
    }

    // Render based on event type
    switch (event.type) {
      case 'INTRO_VENUE':
        this.renderIntroVenue(event);
        break;

      case 'INTRO_FIGHTER':
        this.renderIntroFighter(event);
        break;

      case 'INTRO_MATCHUP':
        this.renderIntroMatchup(event);
        break;

      case 'INTRO_INSTRUCTIONS':
        this.renderIntroInstructions();
        break;

      case 'FIGHT_START':
        this.renderFightStart();
        break;

      case 'ROUND_START':
        this.renderRoundStart(event.round);
        break;

      case 'ROUND_END':
        this.renderRoundEnd(event, fightState);
        break;

      case 'TICK':
        this.renderTick(fightState);
        break;

      case 'PUNCH_LANDED':
      case 'KNOCKDOWN':
      case 'HURT':
      case 'CUT':
        this.renderActionEvent(event, fightState);
        break;

      case 'FIGHT_END':
        this.renderFightEnd(event, fightState);
        break;
    }
  }

  /**
   * Add commentary to queue
   */
  addCommentary(text, priority = 'normal') {
    if (!text) return;

    const entry = {
      text,
      priority,
      timestamp: Date.now()
    };

    // Critical and high priority go to front
    if (priority === 'critical' || priority === 'high') {
      this.commentaryQueue.unshift(entry);
    } else {
      this.commentaryQueue.push(entry);
    }

    // Keep queue manageable
    while (this.commentaryQueue.length > this.maxCommentaryLines * 2) {
      // Remove oldest low priority
      const idx = this.commentaryQueue.findIndex(c => c.priority === 'low');
      if (idx >= 0) {
        this.commentaryQueue.splice(idx, 1);
      } else {
        this.commentaryQueue.pop();
      }
    }

    // Log commentary
    if (this.logger) {
      this.logger.logCommentary(text, priority);
    }
  }

  /**
   * Render venue intro
   */
  renderIntroVenue(event) {
    console.log('\n');
    console.log('╔' + '═'.repeat(68) + '╗');
    console.log('║' + this.centerText('🥊  LIVE BOXING  🥊', 68) + '║');
    console.log('╚' + '═'.repeat(68) + '╝');
    console.log('\n');
    this.renderIntroCommentary();
  }

  /**
   * Render fighter intro
   */
  renderIntroFighter(event) {
    const isCornerA = event.fighter === 'A';
    const corner = isCornerA ? 'RED CORNER' : 'BLUE CORNER';
    const nickname = event.nickname ? `"${event.nickname}"` : '';
    const record = event.record || { wins: 0, losses: 0, draws: 0, kos: 0 };
    const physical = event.physical || {};
    const style = event.style?.primary || 'boxer-puncher';

    console.log('\n' + '─'.repeat(70));
    console.log(this.centerText(`━━━ ${corner} ━━━`, 70));
    console.log('─'.repeat(70));

    // Name with nickname
    if (nickname) {
      console.log(this.centerText(nickname, 70));
    }
    console.log(this.centerText(event.name.toUpperCase(), 70));
    console.log('');

    // Fighter details box
    const recordStr = `${record.wins}-${record.losses}-${record.draws || 0} (${record.kos} KOs)`;
    const heightStr = physical.height ? `${physical.height} cm` : 'N/A';
    const reachStr = physical.reach ? `${physical.reach} cm` : 'N/A';
    const weightStr = physical.weight ? `${physical.weight} kg` : 'N/A';
    const stanceStr = physical.stance ? physical.stance.charAt(0).toUpperCase() + physical.stance.slice(1) : 'Orthodox';

    console.log(`    Record:  ${recordStr.padEnd(20)} Weight: ${weightStr}`);
    console.log(`    Height:  ${heightStr.padEnd(20)} Reach:  ${reachStr}`);
    console.log(`    Stance:  ${stanceStr.padEnd(20)} Style:  ${this.formatStyle(style)}`);

    if (event.hometown) {
      console.log(`    From:    ${event.hometown}`);
    }

    console.log('');
    this.renderIntroCommentary();
  }

  /**
   * Format style name for display
   */
  formatStyle(style) {
    const styleNames = {
      'out-boxer': 'Out-Boxer',
      'swarmer': 'Swarmer',
      'slugger': 'Slugger',
      'boxer-puncher': 'Boxer-Puncher',
      'counter-puncher': 'Counter-Puncher',
      'inside-fighter': 'Inside Fighter',
      'volume-puncher': 'Volume Puncher'
    };
    return styleNames[style] || style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
  }

  /**
   * Render matchup analysis
   */
  renderIntroMatchup(event) {
    const fighterA = event.fighterA;
    const fighterB = event.fighterB;

    console.log('\n' + '═'.repeat(70));
    console.log(this.centerText('TALE OF THE TAPE', 70));
    console.log('═'.repeat(70));
    console.log('');

    // Side by side comparison
    const nameA = (fighterA.name || 'Fighter A').substring(0, 25);
    const nameB = (fighterB.name || 'Fighter B').substring(0, 25);

    console.log(nameA.padStart(30) + '          ' + nameB.padEnd(30));
    console.log('─'.repeat(70));

    // Compare stats
    this.printComparison('Height',
      fighterA.physical?.height ? `${fighterA.physical.height} cm` : 'N/A',
      fighterB.physical?.height ? `${fighterB.physical.height} cm` : 'N/A');
    this.printComparison('Reach',
      fighterA.physical?.reach ? `${fighterA.physical.reach} cm` : 'N/A',
      fighterB.physical?.reach ? `${fighterB.physical.reach} cm` : 'N/A');
    this.printComparison('Weight',
      fighterA.physical?.weight ? `${fighterA.physical.weight} kg` : 'N/A',
      fighterB.physical?.weight ? `${fighterB.physical.weight} kg` : 'N/A');
    this.printComparison('Stance',
      fighterA.physical?.stance || 'Orthodox',
      fighterB.physical?.stance || 'Orthodox');
    this.printComparison('Style',
      this.formatStyle(fighterA.style?.primary || 'boxer-puncher'),
      this.formatStyle(fighterB.style?.primary || 'boxer-puncher'));

    console.log('─'.repeat(70));
    console.log('');
    this.renderIntroCommentary();
  }

  /**
   * Print comparison row
   */
  printComparison(label, valueA, valueB) {
    const paddedA = valueA.padStart(25);
    const paddedB = valueB.padEnd(25);
    console.log(`${paddedA}    ${label.padStart(8).padEnd(16)}    ${paddedB}`);
  }

  /**
   * Render pre-fight instructions
   */
  renderIntroInstructions() {
    console.log('\n' + '═'.repeat(70));
    console.log(this.centerText('FINAL INSTRUCTIONS', 70));
    console.log('═'.repeat(70) + '\n');
    this.renderIntroCommentary();
  }

  /**
   * Render fight start
   */
  renderFightStart() {
    console.log('\n' + '█'.repeat(70));
    console.log(this.centerText('🔔  ROUND 1  🔔', 70));
    console.log('█'.repeat(70) + '\n');
    this.renderIntroCommentary();
  }

  /**
   * Render intro commentary - fully clears queue after display
   */
  renderIntroCommentary() {
    if (this.commentaryQueue.length === 0) return;

    console.log('─'.repeat(50));

    // Show all commentary entries for intro sections
    for (const entry of this.commentaryQueue) {
      const prefix = this.getCommentaryPrefix(entry.priority);
      console.log(`${prefix}${entry.text}`);
    }

    // Fully clear the queue for intro sections
    this.commentaryQueue = [];

    console.log('─'.repeat(50) + '\n');
  }

  /**
   * Render round start
   */
  renderRoundStart(round) {
    const roundHeader = `
${'─'.repeat(70)}
${this.centerText(`ROUND ${round}`, 70)}
${'─'.repeat(70)}
`;
    console.log(roundHeader);
    this.commentary.resetForRound();
    this.renderCommentary();
  }

  /**
   * Render round end
   */
  renderRoundEnd(event, fightState) {
    console.log('\n' + '─'.repeat(70));

    // Show round stats
    const statsA = event.stats?.stats?.A || {};
    const statsB = event.stats?.stats?.B || {};

    console.log(`\nRound ${event.round} Statistics:`);
    console.log(this.formatRoundStats(statsA, statsB));

    // Show scores
    if (event.scores) {
      console.log('\nCurrent Scores:');
      event.scores.forEach((score, i) => {
        console.log(`  Judge ${i + 1}: ${score.A} - ${score.B}`);
      });
    }

    console.log('─'.repeat(70));
    this.renderCommentary();
  }

  /**
   * Render a simulation tick
   */
  renderTick(fightState) {
    // Only render periodically in real-time mode to avoid flooding
    const now = Date.now();
    if (now - this.lastRenderTime < 500) return;
    this.lastRenderTime = now;

    if (this.options.clearScreen) {
      console.clear();
    }

    // Render ring view
    if (this.options.showRing) {
      const fighterStates = {
        A: {
          state: fightState.fighterA.state,
          subState: fightState.fighterA.subState,
          stamina: fightState.fighterA.stamina?.current || 100,
          damage: fightState.fighterA.accumulatedDamage || 0
        },
        B: {
          state: fightState.fighterB.state,
          subState: fightState.fighterB.subState,
          stamina: fightState.fighterB.stamina?.current || 100,
          damage: fightState.fighterB.accumulatedDamage || 0
        }
      };

      if (this.options.compactMode) {
        console.log(this.ringDisplay.renderCompact(fightState.positions, fighterStates));
      } else {
        console.log(this.ringDisplay.render(fightState.positions, fighterStates));
      }
    }

    // Render commentary
    if (this.options.showCommentary) {
      this.renderCommentary();
    }
  }

  /**
   * Render action event (punch, knockdown, etc.)
   */
  renderActionEvent(event, fightState) {
    // For important events, show immediately
    if (event.type === 'KNOCKDOWN' || event.type === 'HURT') {
      console.log('\n' + '!'.repeat(70));
      this.renderCommentary();
      console.log('!'.repeat(70) + '\n');
    } else {
      this.renderTick(fightState);
    }
  }

  /**
   * Render fight end
   */
  renderFightEnd(event, fightState) {
    console.log('\n' + '='.repeat(70));
    console.log(this.centerText('FIGHT OVER', 70));
    console.log('='.repeat(70) + '\n');

    this.renderCommentary();

    // Show final result
    console.log('\n' + this.createResultBox(event));

    // Show detailed scorecards if decision
    if (this.fight && this.fight.scorecards && this.fight.scorecards[0]?.rounds?.length > 0) {
      console.log('\n' + this.createDetailedScorecards());
    }

    // Show final stats
    if (fightState) {
      console.log('\n' + this.createFinalStats(fightState));
    }

    // Log final summary
    if (this.logger) {
      this.logger.logFightSummary(this.fight);
      const paths = this.logger.getLogPaths();
      console.log(`\nLogs saved to:`);
      console.log(`  Events: ${paths.eventLog}`);
      console.log(`  Commentary: ${paths.commentaryLog}`);
    }
  }

  /**
   * Render commentary queue
   */
  renderCommentary() {
    if (this.commentaryQueue.length === 0) return;

    console.log('\n' + '─'.repeat(50));

    // Get most recent commentary entries
    const toShow = this.commentaryQueue.slice(0, this.maxCommentaryLines);

    for (const entry of toShow) {
      const prefix = this.getCommentaryPrefix(entry.priority);
      console.log(`${prefix}${entry.text}`);
    }

    // Clear shown entries (keep some recent ones)
    this.commentaryQueue = this.commentaryQueue.slice(this.maxCommentaryLines / 2);

    console.log('─'.repeat(50) + '\n');
  }

  /**
   * Get commentary prefix based on priority
   */
  getCommentaryPrefix(priority) {
    const prefixes = {
      critical: '!!! ',
      high: '>> ',
      normal: '   ',
      low: '   '
    };
    return prefixes[priority] || '   ';
  }

  /**
   * Format round statistics
   */
  formatRoundStats(statsA, statsB) {
    const nameA = this.fight.fighterA.name.substring(0, 18).padEnd(18);
    const nameB = this.fight.fighterB.name.substring(0, 18).padEnd(18);

    return `
                          ${nameA}  ${nameB}
  Punches Landed/Thrown   ${String(statsA.punchesLanded || 0).padStart(3)}/${String(statsA.punchesThrown || 0).padEnd(3)}              ${String(statsB.punchesLanded || 0).padStart(3)}/${String(statsB.punchesThrown || 0).padEnd(3)}
  Power Punches           ${String(statsA.powerPunchesLanded || 0).padStart(3)}/${String(statsA.powerPunchesThrown || 0).padEnd(3)}              ${String(statsB.powerPunchesLanded || 0).padStart(3)}/${String(statsB.powerPunchesThrown || 0).padEnd(3)}
  Accuracy                ${this.formatPercent(statsA.punchesLanded, statsA.punchesThrown).padStart(6)}              ${this.formatPercent(statsB.punchesLanded, statsB.punchesThrown).padStart(6)}
`;
  }

  /**
   * Format percentage
   */
  formatPercent(num, denom) {
    if (!denom || denom === 0) return '0%';
    return ((num / denom) * 100).toFixed(0) + '%';
  }

  /**
   * Create result box
   */
  createResultBox(event) {
    const lines = [];
    const width = 50;
    const border = '═'.repeat(width);

    lines.push('╔' + border + '╗');
    lines.push('║' + this.centerText('OFFICIAL RESULT', width) + '║');
    lines.push('╠' + border + '╣');

    if (event.winner) {
      const winnerName = this.fight.getFighter(event.winner).name;
      lines.push('║' + this.centerText(`WINNER: ${winnerName}`, width) + '║');
      lines.push('║' + this.centerText(`by ${event.method}`, width) + '║');

      if (event.round && !event.method.includes('DECISION')) {
        const timeStr = this.formatTime(event.time || 0);
        lines.push('║' + this.centerText(`Round ${event.round}, ${timeStr}`, width) + '║');
      }
    } else {
      lines.push('║' + this.centerText('DRAW', width) + '║');
      lines.push('║' + this.centerText(event.method, width) + '║');
    }

    // Show final scores summary for decisions
    if (event.scorecards && event.method?.includes('DECISION') || event.method?.includes('DRAW')) {
      lines.push('╠' + border + '╣');
      lines.push('║' + this.centerText('FINAL SCORES', width) + '║');
      for (let i = 0; i < event.scorecards.length; i++) {
        const card = event.scorecards[i];
        const judgeName = this.fight?.judges?.[i]?.name || `Judge ${i + 1}`;
        lines.push('║' + this.centerText(`${judgeName}: ${card}`, width) + '║');
      }
    }

    lines.push('╚' + border + '╝');

    return lines.join('\n');
  }

  /**
   * Create detailed scorecards with round-by-round scoring
   */
  createDetailedScorecards() {
    const scorecards = this.fight.scorecards;
    const numRounds = scorecards[0]?.rounds?.length || 0;
    if (numRounds === 0) return '';

    const nameA = this.fight?.fighterA?.name?.substring(0, 15) || 'Fighter A';
    const nameB = this.fight?.fighterB?.name?.substring(0, 15) || 'Fighter B';

    const lines = [];
    lines.push('═'.repeat(70));
    lines.push(this.centerText('OFFICIAL SCORECARDS', 70));
    lines.push('═'.repeat(70));
    lines.push('');

    // Create header with round numbers
    let header = '                    ';
    for (let r = 1; r <= numRounds; r++) {
      header += `R${r}`.padStart(4);
    }
    header += '  TOTAL';
    lines.push(header);
    lines.push('─'.repeat(70));

    // For each judge, show their scoring
    for (let j = 0; j < scorecards.length; j++) {
      const sc = scorecards[j];
      const judgeName = (this.fight?.judges?.[j]?.name || `Judge ${j + 1}`).substring(0, 18).padEnd(18);

      // Fighter A's scores from this judge
      let lineA = `${judgeName}  `;
      lineA += nameA.substring(0, 12).padEnd(12) + ' ';
      for (const round of sc.rounds) {
        lineA += String(round.scoreA).padStart(4);
      }
      lineA += String(sc.totalA).padStart(6);
      lines.push(lineA);

      // Fighter B's scores from this judge
      let lineB = '                    ';
      lineB += nameB.substring(0, 12).padEnd(12) + ' ';
      for (const round of sc.rounds) {
        lineB += String(round.scoreB).padStart(4);
      }
      lineB += String(sc.totalB).padStart(6);
      lines.push(lineB);

      // Add spacing between judges
      if (j < scorecards.length - 1) {
        lines.push('');
      }
    }

    lines.push('─'.repeat(70));

    // Show legend/summary
    const totalRounds = numRounds;
    let roundsWonA = 0, roundsWonB = 0, evenRounds = 0;

    // Count rounds won by consensus (2+ judges)
    for (let r = 0; r < numRounds; r++) {
      let judgesForA = 0, judgesForB = 0;
      for (const sc of scorecards) {
        if (sc.rounds[r].scoreA > sc.rounds[r].scoreB) judgesForA++;
        else if (sc.rounds[r].scoreB > sc.rounds[r].scoreA) judgesForB++;
      }
      if (judgesForA >= 2) roundsWonA++;
      else if (judgesForB >= 2) roundsWonB++;
      else evenRounds++;
    }

    lines.push('');
    lines.push(`Rounds won: ${nameA.trim()}: ${roundsWonA}  |  ${nameB.trim()}: ${roundsWonB}  |  Even: ${evenRounds}`);
    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  /**
   * Create final statistics
   */
  createFinalStats(fightState) {
    // Get stats from fightState (populated from getFighterState)
    const statsA = fightState?.fighterA?.fightStats || {};
    const statsB = fightState?.fighterB?.fightStats || {};
    const nameA = this.fight?.fighterA?.name?.substring(0, 20) || 'Fighter A';
    const nameB = this.fight?.fighterB?.name?.substring(0, 20) || 'Fighter B';

    // Calculate accuracy
    const accA = statsA.punchesThrown > 0 ? ((statsA.punchesLanded / statsA.punchesThrown) * 100).toFixed(1) : '0.0';
    const accB = statsB.punchesThrown > 0 ? ((statsB.punchesLanded / statsB.punchesThrown) * 100).toFixed(1) : '0.0';

    return `
${'═'.repeat(70)}
${this.centerText('FIGHT STATISTICS', 70)}
${'═'.repeat(70)}

                          ${nameA.padEnd(20)}  ${nameB.padEnd(20)}
${'─'.repeat(70)}
Total Punches             ${String(statsA.punchesLanded || 0).padStart(4)}/${String(statsA.punchesThrown || 0).padEnd(4)}              ${String(statsB.punchesLanded || 0).padStart(4)}/${String(statsB.punchesThrown || 0).padEnd(4)}
Accuracy                  ${(accA + '%').padStart(7)}              ${(accB + '%').padStart(7)}
Jabs                      ${String(statsA.jabsLanded || 0).padStart(4)}/${String(statsA.jabsThrown || 0).padEnd(4)}              ${String(statsB.jabsLanded || 0).padStart(4)}/${String(statsB.jabsThrown || 0).padEnd(4)}
Power Punches             ${String(statsA.powerPunchesLanded || 0).padStart(4)}/${String(statsA.powerPunchesThrown || 0).padEnd(4)}              ${String(statsB.powerPunchesLanded || 0).padStart(4)}/${String(statsB.powerPunchesThrown || 0).padEnd(4)}
Body Punches              ${String(statsA.bodyPunchesLanded || 0).padStart(4)}/${String(statsA.bodyPunchesThrown || 0).padEnd(4)}              ${String(statsB.bodyPunchesLanded || 0).padStart(4)}/${String(statsB.bodyPunchesThrown || 0).padEnd(4)}
Knockdowns Scored         ${String(statsA.knockdownsScored || 0).padStart(7)}              ${String(statsB.knockdownsScored || 0).padStart(7)}
${'─'.repeat(70)}

${'═'.repeat(70)}
`;
  }

  /**
   * Format time
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Center text within width
   */
  centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    const result = ' '.repeat(padding) + text;
    return result.padEnd(width);
  }

  /**
   * Get log file paths
   */
  getLogPaths() {
    return this.logger ? this.logger.getLogPaths() : null;
  }
}

export default FightRenderer;
