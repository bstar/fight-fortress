/**
 * Fight Logger
 * Generates detailed fight event logs and saves to file
 */

import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

export class FightLogger {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './logs',
      eventLogFile: options.eventLogFile || null,
      commentaryLogFile: options.commentaryLogFile || null,
      includeTimestamps: options.includeTimestamps !== false,
      detailLevel: options.detailLevel || 'full' // 'minimal', 'standard', 'full'
    };

    this.eventLog = [];
    this.commentaryLog = [];
    this.fightInfo = null;
    this.initialized = false;
  }

  /**
   * Initialize logger for a new fight
   */
  initialize(fight) {
    this.fightInfo = {
      fighterA: fight.fighterA.name,
      fighterB: fight.fighterB.name,
      date: new Date().toISOString(),
      config: {
        rounds: fight.config.rounds,
        type: fight.config.type
      }
    };

    this.eventLog = [];
    this.commentaryLog = [];

    // Create output directory
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Generate filenames if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fightName = `${this.sanitizeName(fight.fighterA.name)}_vs_${this.sanitizeName(fight.fighterB.name)}`;

    if (!this.options.eventLogFile) {
      this.options.eventLogFile = join(this.options.outputDir, `${fightName}_${timestamp}_events.log`);
    }
    if (!this.options.commentaryLogFile) {
      this.options.commentaryLogFile = join(this.options.outputDir, `${fightName}_${timestamp}_commentary.log`);
    }

    // Write headers
    this.writeEventHeader();
    this.writeCommentaryHeader();

    this.initialized = true;
  }

  /**
   * Sanitize name for filename
   */
  sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  }

  /**
   * Write event log header
   */
  writeEventHeader() {
    const header = `
================================================================================
                           FIGHT EVENT LOG
================================================================================
${this.fightInfo.fighterA} vs ${this.fightInfo.fighterB}
Date: ${this.fightInfo.date}
Scheduled Rounds: ${this.fightInfo.config.rounds}
Type: ${this.fightInfo.config.type}
================================================================================

`;
    writeFileSync(this.options.eventLogFile, header);
  }

  /**
   * Write commentary log header
   */
  writeCommentaryHeader() {
    const header = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                              FIGHT COMMENTARY                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ${this.fightInfo.fighterA.padEnd(30)} vs ${this.fightInfo.fighterB.padStart(30)}  ║
╚══════════════════════════════════════════════════════════════════════════════╝

`;
    writeFileSync(this.options.commentaryLogFile, header);
  }

  /**
   * Log an event
   */
  logEvent(event) {
    if (!this.initialized) return;

    const logEntry = this.formatEventEntry(event);
    this.eventLog.push(logEntry);

    // Append to file
    appendFileSync(this.options.eventLogFile, logEntry.formatted + '\n');
  }

  /**
   * Log commentary
   */
  logCommentary(text, priority = 'normal') {
    if (!this.initialized) return;

    const entry = {
      timestamp: new Date().toISOString(),
      text,
      priority
    };

    this.commentaryLog.push(entry);

    // Format and append
    const formatted = this.formatCommentaryEntry(entry);
    appendFileSync(this.options.commentaryLogFile, formatted + '\n');
  }

  /**
   * Format an event entry
   */
  formatEventEntry(event) {
    const time = this.formatTime(event.roundTime || 0);
    const round = event.round || 0;

    let formatted = '';

    switch (event.type) {
      case 'FIGHT_START':
        formatted = `\n[FIGHT START] ${event.fighterA} vs ${event.fighterB}`;
        break;

      case 'ROUND_START':
        formatted = `\n${'='.repeat(60)}\n[R${round}] ROUND ${round} START\n${'='.repeat(60)}`;
        break;

      case 'ROUND_END':
        formatted = this.formatRoundEndEvent(event);
        break;

      case 'PUNCH_THROWN':
        formatted = `[R${round} ${time}] ${event.attacker}: ${event.punchType.toUpperCase()} thrown`;
        break;

      case 'PUNCH_LANDED':
        formatted = `[R${round} ${time}] ${event.attacker} -> ${event.target}: ${event.punchType.toUpperCase()} LANDED (${event.quality}) - ${event.damage} dmg`;
        break;

      case 'PUNCH_BLOCKED':
        formatted = `[R${round} ${time}] ${event.target}: BLOCKED ${event.punchType} (${event.blockType})`;
        break;

      case 'PUNCH_EVADED':
        formatted = `[R${round} ${time}] ${event.target}: EVADED ${event.punchType} (${event.evadeType})`;
        break;

      case 'PUNCH_MISSED':
        formatted = `[R${round} ${time}] ${event.attacker}: ${event.punchType} MISSED`;
        break;

      case 'KNOCKDOWN':
        formatted = `\n[R${round} ${time}] *** KNOCKDOWN! ${event.fighter} IS DOWN! (${event.punch}) ***\n`;
        break;

      case 'COUNT':
        formatted = `[R${round} ${time}] COUNT: ${event.count}`;
        break;

      case 'RECOVERY':
        formatted = `[R${round} ${time}] ${event.fighter} BEATS THE COUNT AT ${event.count}`;
        break;

      case 'HURT':
        formatted = `[R${round} ${time}] !!! ${event.fighter} IS HURT !!!`;
        break;

      case 'CUT':
        formatted = `[R${round} ${time}] CUT: ${event.fighter} cut on ${event.location} (severity: ${event.severity})`;
        break;

      case 'STATE_CHANGE':
        if (this.options.detailLevel === 'full') {
          formatted = `[R${round} ${time}] ${event.fighter} -> ${event.state}${event.subState ? '/' + event.subState : ''}`;
        }
        break;

      case 'POSITION_UPDATE':
        if (this.options.detailLevel === 'full') {
          formatted = `[R${round} ${time}] POS: A(${event.A.x.toFixed(1)},${event.A.y.toFixed(1)}) B(${event.B.x.toFixed(1)},${event.B.y.toFixed(1)}) dist=${event.distance.toFixed(1)}`;
        }
        break;

      case 'STAMINA_UPDATE':
        if (this.options.detailLevel === 'full') {
          formatted = `[R${round} ${time}] STAMINA: ${event.fighter} ${(event.percent * 100).toFixed(0)}% (${event.tier})`;
        }
        break;

      case 'FIGHT_END':
        formatted = this.formatFightEndEvent(event);
        break;

      default:
        formatted = `[R${round} ${time}] ${event.type}: ${JSON.stringify(event)}`;
    }

    return {
      raw: event,
      formatted
    };
  }

  /**
   * Format round end event
   */
  formatRoundEndEvent(event) {
    let str = `\n[R${event.round}] ROUND ${event.round} END\n`;
    str += `-`.repeat(60) + '\n';

    if (event.stats) {
      const statsA = event.stats.stats?.A || {};
      const statsB = event.stats.stats?.B || {};

      str += `PUNCH STATS:\n`;
      str += `  ${this.fightInfo.fighterA}: ${statsA.punchesLanded || 0}/${statsA.punchesThrown || 0} `;
      str += `(${statsA.punchesThrown > 0 ? ((statsA.punchesLanded / statsA.punchesThrown) * 100).toFixed(0) : 0}%)\n`;
      str += `  ${this.fightInfo.fighterB}: ${statsB.punchesLanded || 0}/${statsB.punchesThrown || 0} `;
      str += `(${statsB.punchesThrown > 0 ? ((statsB.punchesLanded / statsB.punchesThrown) * 100).toFixed(0) : 0}%)\n`;
    }

    if (event.scores) {
      str += `SCORES: ${event.scores.map(s => `${s.A}-${s.B}`).join(', ')}\n`;
    }

    str += `-`.repeat(60);
    return str;
  }

  /**
   * Format fight end event
   */
  formatFightEndEvent(event) {
    let str = `\n${'='.repeat(60)}\n`;
    str += `[FIGHT END]\n`;
    str += `Winner: ${event.winner || 'DRAW'}\n`;
    str += `Method: ${event.method}\n`;

    if (event.round) {
      str += `Round: ${event.round}, Time: ${this.formatTime(event.time || 0)}\n`;
    }

    if (event.scorecards) {
      str += `Scorecards: ${event.scorecards.join(', ')}\n`;
    }

    str += `${'='.repeat(60)}\n`;
    return str;
  }

  /**
   * Format commentary entry
   */
  formatCommentaryEntry(entry) {
    const priorityMarkers = {
      critical: '!!!',
      high: '>>',
      normal: '',
      low: ''
    };

    const marker = priorityMarkers[entry.priority] || '';
    return marker ? `${marker} ${entry.text}` : entry.text;
  }

  /**
   * Format time as M:SS
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Log round summary
   */
  logRoundSummary(round, fighterA, fighterB, scores) {
    const summary = `
ROUND ${round.number} SUMMARY
─────────────────────────────────────────
                      ${fighterA.name.substring(0, 15).padEnd(15)}  ${fighterB.name.substring(0, 15).padEnd(15)}
Punches Landed/Thrown ${String(round.stats.A.punchesLanded).padStart(3)}/${String(round.stats.A.punchesThrown).padEnd(3)}           ${String(round.stats.B.punchesLanded).padStart(3)}/${String(round.stats.B.punchesThrown).padEnd(3)}
Power Punches         ${String(round.stats.A.powerPunchesLanded).padStart(3)}/${String(round.stats.A.powerPunchesThrown).padEnd(3)}           ${String(round.stats.B.powerPunchesLanded).padStart(3)}/${String(round.stats.B.powerPunchesThrown).padEnd(3)}
Damage Dealt          ${String(Math.round(round.stats.A.damageDealt)).padStart(5)}             ${String(Math.round(round.stats.B.damageDealt)).padStart(5)}
Knockdowns            ${String(round.knockdowns.A.length).padStart(5)}             ${String(round.knockdowns.B.length).padStart(5)}
─────────────────────────────────────────
`;

    appendFileSync(this.options.eventLogFile, summary);
    this.logCommentary(this.generateRoundSummaryCommentary(round, scores));
  }

  /**
   * Generate round summary commentary
   */
  generateRoundSummaryCommentary(round, scores) {
    const winner = round.getStatsWinner();
    let commentary = `End of round ${round.number}. `;

    if (winner.winner) {
      commentary += winner.margin > 20
        ? `Clear round for Fighter ${winner.winner}.`
        : `Close round, slight edge to Fighter ${winner.winner}.`;
    } else {
      commentary += `Very close round, could go either way.`;
    }

    return commentary;
  }

  /**
   * Log final fight summary
   */
  logFightSummary(fight) {
    const result = fight.result;
    const statsA = fight.fighterA.fightStats;
    const statsB = fight.fighterB.fightStats;

    const summary = `

${'═'.repeat(70)}
                           FINAL FIGHT STATISTICS
${'═'.repeat(70)}

RESULT: ${result.winner ? `${fight.getFighter(result.winner).name} wins by ${result.method}` : 'DRAW'}
${result.round ? `Round ${result.round}, ${this.formatTime(result.time)}` : ''}

                          ${fight.fighterA.name.substring(0, 20).padEnd(20)}  ${fight.fighterB.name.substring(0, 20).padEnd(20)}
${'─'.repeat(70)}
Total Punches           ${String(statsA.punchesLanded).padStart(4)}/${String(statsA.punchesThrown).padEnd(4)}           ${String(statsB.punchesLanded).padStart(4)}/${String(statsB.punchesThrown).padEnd(4)}
Accuracy                ${String((statsA.punchesThrown > 0 ? (statsA.punchesLanded / statsA.punchesThrown * 100).toFixed(1) : 0) + '%').padStart(7)}              ${String((statsB.punchesThrown > 0 ? (statsB.punchesLanded / statsB.punchesThrown * 100).toFixed(1) : 0) + '%').padStart(7)}
Jabs                    ${String(statsA.jabsLanded).padStart(4)}/${String(statsA.jabsThrown).padEnd(4)}           ${String(statsB.jabsLanded).padStart(4)}/${String(statsB.jabsThrown).padEnd(4)}
Power Punches           ${String(statsA.powerPunchesLanded).padStart(4)}/${String(statsA.powerPunchesThrown).padEnd(4)}           ${String(statsB.powerPunchesLanded).padStart(4)}/${String(statsB.powerPunchesThrown).padEnd(4)}
Knockdowns Scored       ${String(statsA.knockdownsScored).padStart(7)}              ${String(statsB.knockdownsScored).padStart(7)}
Total Damage Dealt      ${String(Math.round(statsA.damageDealt)).padStart(7)}              ${String(Math.round(statsB.damageDealt)).padStart(7)}
${'─'.repeat(70)}

${result.scorecards ? 'SCORECARDS:\n' + result.scorecards.map((s, i) => `  Judge ${i + 1}: ${s.A}-${s.B}`).join('\n') : ''}

${'═'.repeat(70)}
`;

    appendFileSync(this.options.eventLogFile, summary);
  }

  /**
   * Get log file paths
   */
  getLogPaths() {
    return {
      eventLog: this.options.eventLogFile,
      commentaryLog: this.options.commentaryLogFile
    };
  }
}

export default FightLogger;
