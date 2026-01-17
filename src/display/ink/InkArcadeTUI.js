/**
 * InkArcadeTUI - Professional Boxing Broadcast Display
 * HBO-style presentation with CompuBox stats, Harold Lederman scoring, and ring visualization
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import chalk from 'chalk';
import { ThemeProvider, useTheme, DEFAULT_THEME } from './InkTheme.js';
import { CommentaryGenerator } from '../CommentaryGenerator.js';

const e = React.createElement;

/**
 * Health/Stamina Bar with label
 */
function StatBar({ label, value, max = 100, width = 20, color, lowColor, lowThreshold = 25, reverse = false }) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const barColor = percent <= lowThreshold ? (lowColor || theme.healthLow) : (color || theme.health);
  const filledChar = '\u2588';
  const emptyChar = '\u2591';

  const filledBar = chalk.hex(barColor)(filledChar.repeat(filled));
  const emptyBar = chalk.hex(theme.border)(emptyChar.repeat(empty));

  const bar = reverse ? emptyBar + filledBar : filledBar + emptyBar;

  return e(Box, { flexDirection: 'row', gap: 1 },
    e(Text, { color: theme.commentary, dimColor: true }, label.padEnd(4)),
    e(Text, null, bar),
    e(Text, { color: barColor, dimColor: true }, ` ${Math.round(percent).toString().padStart(3)}%`)
  );
}

/**
 * Fighter Info Panel - Compact display for each corner
 */
function FighterPanel({ fighter, state, corner = 'A' }) {
  const theme = useTheme();
  const cornerColor = corner === 'A' ? theme.fighterA : theme.fighterB;
  const isRight = corner === 'B';

  const health = state?.damage?.headPercent != null ? (1 - state.damage.headPercent) * 100 : 100;
  const stamina = state?.stamina?.percent != null ? state.stamina.percent * 100 : 100;
  const fighterState = state?.state || 'NEUTRAL';
  const isHurt = fighterState === 'HURT' || fighterState === 'STUNNED';

  // Buzzed state - fighter is vulnerable (health below 40% or very low stamina)
  const isBuzzed = !isHurt && (health < 40 || (health < 60 && stamina < 25));

  // Strategy from AI
  const strategy = state?.strategy;
  const strategyName = strategy?.name || '';
  const strategyPriority = strategy?.priority || 'normal';

  // Effects
  const buffs = state?.effects?.buffs || [];
  const debuffs = state?.effects?.debuffs || [];

  // Strategy color based on priority
  const getStrategyColor = (priority) => {
    switch (priority) {
      case 'critical': return '#ff4444';
      case 'urgent': return '#ff8800';
      case 'high': return '#ffcc00';
      case 'low': return '#888888';
      default: return '#88ccff';
    }
  };

  const name = fighter.name || fighter.getShortName?.() || 'Unknown';

  // Format effects inline
  const effectsText = [...buffs.slice(0, 2).map(b => `+${getEffectName(b.type)}`),
                       ...debuffs.slice(0, 1).map(d => `-${getEffectName(d.type)}`)].join(' ');

  // Status indicator
  let statusText = '';
  let statusColor = '';
  if (isHurt) {
    statusText = ' ★ HURT! ★';
    statusColor = '#ff0000';
  } else if (isBuzzed) {
    statusText = ' BUZZED ';
    statusColor = '#ff8800';
  }

  return e(Box, {
    flexDirection: 'column',
    borderStyle: isHurt ? 'double' : isBuzzed ? 'classic' : 'round',
    borderColor: isHurt ? theme.hurt : isBuzzed ? '#ff8800' : theme.border,
    paddingX: 1,
    paddingY: 0,
    width: 32,
    height: 8
  },
    // Name with status
    e(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      e(Text, { bold: true, color: cornerColor }, name),
      statusText && e(Text, { bold: true, color: statusColor, backgroundColor: isHurt ? '#330000' : undefined }, statusText)
    ),

    // Health bar
    e(StatBar, {
      label: 'HP',
      value: health,
      max: 100,
      width: 20,
      color: theme.health,
      lowColor: theme.healthLow,
      lowThreshold: 30,
      reverse: isRight
    }),

    // Stamina bar
    e(StatBar, {
      label: 'ST',
      value: stamina,
      max: 100,
      width: 20,
      color: theme.stamina,
      lowColor: theme.staminaLow,
      lowThreshold: 25,
      reverse: isRight
    }),

    // Strategy display
    e(Text, {
      color: getStrategyColor(strategyPriority),
      bold: strategyPriority === 'critical' || strategyPriority === 'urgent',
      dimColor: !strategyName
    }, strategyName ? `» ${strategyName}` : ' '),

    // Effects inline
    e(Text, {
      color: '#88ff88',
      dimColor: true
    }, effectsText || ' ')
  );
}

/**
 * Get display-friendly effect name
 */
function getEffectName(type) {
  const names = {
    'adrenaline_surge': 'ADRENALINE',
    'momentum': 'MOMENTUM',
    'second_wind': '2ND WIND',
    'killer_instinct': 'KILLER',
    'rhythm': 'RHYTHM',
    'crowd_energy': 'CROWD',
    'confidence_boost': 'CONFIDENT',
    'fresh_legs': 'FRESH',
    'big_fight_mentality': 'BIG FIGHT',
    'fast_start': 'FAST START',
    'cautious': 'CAUTIOUS',
    'rattled': 'RATTLED',
    'arm_weary': 'ARM TIRED',
    'vision_impaired': 'VISION',
    'desperate': 'DESPERATE',
    'demoralized': 'DEMORALIZED',
    'shell_shocked': 'SHELL SHOCK',
    'gassed': 'GASSED',
    'frozen': 'FROZEN',
    'hurt_hands': 'HURT HANDS',
    'focus_lapse': 'UNFOCUSED'
  };
  return names[type] || type?.toUpperCase?.() || 'EFFECT';
}

/**
 * Ring Visualization - ASCII ring with fighter positions
 *
 * Boxing rings are square (typically 16-20 feet per side).
 * Terminal characters are ~2:1 aspect ratio (taller than wide),
 * so we use width ≈ height * 2 to make it appear square.
 */
function RingDisplay({ positions }) {
  const theme = useTheme();

  // Use 2:1 width:height ratio to appear square in terminal
  // (terminal chars are roughly twice as tall as wide)
  const height = 13;
  const width = 26;  // 13 * 2 = 26 for square appearance

  // Inner dimensions (excluding borders)
  const innerWidth = width - 2;
  const innerHeight = height - 2;

  // Get positions with defaults
  const posA = positions?.A || { x: -4, y: 0 };
  const posB = positions?.B || { x: 4, y: 0 };
  const distance = positions?.distance || 8;

  // Map from simulation coords [-10, 10] to grid coords
  // Account for character aspect ratio so movement looks proportional
  const mapX = (x) => {
    const normalized = (x + 10) / 20; // 0 to 1
    const gridX = Math.round(normalized * (innerWidth - 4)) + 2;
    return Math.max(2, Math.min(width - 4, gridX));
  };

  const mapY = (y) => {
    const normalized = (y + 10) / 20; // 0 to 1
    const gridY = Math.round(normalized * (innerHeight - 2)) + 1;
    return Math.max(1, Math.min(height - 2, gridY));
  };

  const gridAx = mapX(posA.x);
  const gridAy = mapY(posA.y);
  const gridBx = mapX(posB.x);
  const gridBy = mapY(posB.y);

  // Build ring visualization
  const lines = [];

  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      // Corners (ring posts)
      if ((y === 0 || y === height - 1) && (x === 0 || x === width - 1)) {
        line += '\u25CB'; // Ring post
        continue;
      }

      // Top and bottom ropes
      if (y === 0 || y === height - 1) {
        line += '\u2550';
        continue;
      }

      // Left and right ropes
      if (x === 0 || x === width - 1) {
        line += '\u2551';
        continue;
      }

      // Fighter A marker [A]
      if (y === gridAy) {
        if (x === gridAx - 1) { line += '['; continue; }
        if (x === gridAx) { line += 'A'; continue; }
        if (x === gridAx + 1) { line += ']'; continue; }
      }

      // Fighter B marker {B}
      if (y === gridBy) {
        if (x === gridBx - 1) { line += '{'; continue; }
        if (x === gridBx) { line += 'B'; continue; }
        if (x === gridBx + 1) { line += '}'; continue; }
      }

      // Canvas (empty space)
      line += ' ';
    }
    lines.push(line);
  }

  return e(Box, { flexDirection: 'column' },
    e(Text, { bold: true, color: theme.foreground }, ' THE RING'),
    ...lines.map((line, i) => {
      // Color the fighters
      let coloredLine = line
        .replace('[A]', chalk.hex(theme.fighterA)('[A]'))
        .replace('{B}', chalk.hex(theme.fighterB)('{B}'));
      return e(Text, { key: i }, coloredLine);
    }),
    e(Text, { color: theme.commentary, dimColor: true },
      ` Distance: ${distance.toFixed(1)} ft`
    )
  );
}

/**
 * CompuBox Stats Panel - Punch statistics
 */
function CompuBoxPanel({ statsA, statsB, fighterA, fighterB }) {
  const theme = useTheme();

  const getStats = (stats) => ({
    thrown: stats?.punchesThrown || stats?.punches_thrown || 0,
    landed: stats?.punchesLanded || stats?.punches_landed || 0,
    jabsThrown: stats?.jabsThrown || stats?.jabs_thrown || 0,
    jabsLanded: stats?.jabsLanded || stats?.jabs_landed || 0,
    powerThrown: stats?.powerPunchesThrown || stats?.power_punches_thrown || 0,
    powerLanded: stats?.powerPunchesLanded || stats?.power_punches_landed || 0,
  });

  const a = getStats(statsA);
  const b = getStats(statsB);

  // Calculate accuracy
  const accA = a.thrown > 0 ? Math.round((a.landed / a.thrown) * 100) : 0;
  const accB = b.thrown > 0 ? Math.round((b.landed / b.thrown) * 100) : 0;

  // Estimate jabs vs power if not tracked separately
  if (a.jabsThrown === 0 && a.thrown > 0) {
    a.jabsThrown = Math.floor(a.thrown * 0.6);
    a.jabsLanded = Math.floor(a.landed * 0.5);
    a.powerThrown = a.thrown - a.jabsThrown;
    a.powerLanded = a.landed - a.jabsLanded;
  }
  if (b.jabsThrown === 0 && b.thrown > 0) {
    b.jabsThrown = Math.floor(b.thrown * 0.6);
    b.jabsLanded = Math.floor(b.landed * 0.5);
    b.powerThrown = b.thrown - b.jabsThrown;
    b.powerLanded = b.landed - b.jabsLanded;
  }

  const nameA = fighterA?.name || fighterA?.getShortName?.() || 'Fighter A';
  const nameB = fighterB?.name || fighterB?.getShortName?.() || 'Fighter B';

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: 36,
    height: 11
  },
    e(Text, { bold: true, color: theme.punch }, 'COMPUBOX PUNCH STATS'),
    e(Box, { height: 1 }),

    // Header row with fighter names
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA, bold: true }, nameA.substring(0, 10).padEnd(10)),
      e(Text, { color: theme.commentary }, '          '),
      e(Text, { color: theme.fighterB, bold: true }, nameB.substring(0, 10).padStart(10))
    ),

    e(Box, { height: 1 }),

    // Stats rows - consistent column widths: 10 | 10 | 10
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${a.landed}/${a.thrown}`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, '  TOTAL   '),
      e(Text, { color: theme.fighterB }, `${b.landed}/${b.thrown}`.padStart(10))
    ),
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${accA}%`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, ' ACCURACY '),
      e(Text, { color: theme.fighterB }, `${accB}%`.padStart(10))
    ),
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${a.jabsLanded}/${a.jabsThrown}`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, '   JABS   '),
      e(Text, { color: theme.fighterB }, `${b.jabsLanded}/${b.jabsThrown}`.padStart(10))
    ),
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${a.powerLanded}/${a.powerThrown}`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, '  POWER   '),
      e(Text, { color: theme.fighterB }, `${b.powerLanded}/${b.powerThrown}`.padStart(10))
    )
  );
}

/**
 * Harold Lederman Scorecard - Compact horizontal layout
 * Shows round scores in a single row, doesn't grow with rounds
 */
function LedermanScorecard({ scores, currentRound, fighterA, fighterB, maxRounds = 12 }) {
  const theme = useTheme();

  const nameA = fighterA?.name || fighterA?.getShortName?.() || 'A';
  const nameB = fighterB?.name || fighterB?.getShortName?.() || 'B';

  // Calculate totals
  let totalA = 0;
  let totalB = 0;
  const roundScores = scores || [];

  roundScores.forEach(score => {
    totalA += score.a || 0;
    totalB += score.b || 0;
  });

  // Determine leader
  const leader = totalA > totalB ? 'A' : totalB > totalA ? 'B' : 'EVEN';
  const leaderName = leader === 'A' ? nameA : leader === 'B' ? nameB : 'EVEN';

  // Column width for each round score (consistent alignment)
  const COL_WIDTH = 4;  // " 10 " = 4 chars
  const NAME_WIDTH = 14; // Fighter name column - enough for most names

  // Calculate total width needed
  // Name column + all round columns + some padding
  const totalWidth = NAME_WIDTH + (maxRounds * COL_WIDTH) + 4;

  // Build all rounds (1 to maxRounds)
  const allRounds = [];
  for (let i = 1; i <= maxRounds; i++) {
    allRounds.push(i);
  }

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    paddingX: 1,
    paddingY: 0,
    width: totalWidth,
    height: 7
  },
    // Header with totals
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
      e(Text, { bold: true, color: '#FFD700' }, "LEDERMAN'S CARD"),
      e(Text, { bold: true, color: leader === 'EVEN' ? theme.foreground : (leader === 'A' ? theme.fighterA : theme.fighterB) },
        `${totalA}-${totalB} ${leaderName}`
      )
    ),

    // Round numbers header row
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.commentary, dimColor: true }, ' '.repeat(NAME_WIDTH)),
      ...allRounds.map(r =>
        e(Text, {
          key: `rh${r}`,
          color: r === currentRound ? theme.round : theme.commentary,
          bold: r === currentRound,
          dimColor: r !== currentRound
        }, r.toString().padStart(COL_WIDTH - 1).padEnd(COL_WIDTH))
      )
    ),

    // Fighter A scores row
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA, bold: true }, nameA.padEnd(NAME_WIDTH).substring(0, NAME_WIDTH)),
      ...allRounds.map(r => {
        const score = roundScores[r - 1];
        const hasScore = score !== undefined;
        const isCurrentRound = r === currentRound && !hasScore;
        const wonRound = hasScore && score.a > score.b;

        return e(Text, {
          key: `a${r}`,
          color: wonRound ? theme.fighterA : (hasScore ? theme.foreground : theme.commentary),
          bold: wonRound,
          dimColor: !hasScore && !isCurrentRound
        }, hasScore
          ? score.a.toString().padStart(COL_WIDTH - 1).padEnd(COL_WIDTH)
          : (isCurrentRound ? ' *'.padEnd(COL_WIDTH) : ' -'.padEnd(COL_WIDTH))
        );
      })
    ),

    // Fighter B scores row
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterB, bold: true }, nameB.padEnd(NAME_WIDTH).substring(0, NAME_WIDTH)),
      ...allRounds.map(r => {
        const score = roundScores[r - 1];
        const hasScore = score !== undefined;
        const isCurrentRound = r === currentRound && !hasScore;
        const wonRound = hasScore && score.b > score.a;

        return e(Text, {
          key: `b${r}`,
          color: wonRound ? theme.fighterB : (hasScore ? theme.foreground : theme.commentary),
          bold: wonRound,
          dimColor: !hasScore && !isCurrentRound
        }, hasScore
          ? score.b.toString().padStart(COL_WIDTH - 1).padEnd(COL_WIDTH)
          : (isCurrentRound ? ' *'.padEnd(COL_WIDTH) : ' -'.padEnd(COL_WIDTH))
        );
      })
    )
  );
}

/**
 * Round Timer Display
 */
function RoundTimer({ round, time, maxRounds = 12, isPaused, roundDuration = 180, knockdownsA = 0, knockdownsB = 0 }) {
  const theme = useTheme();
  // Calculate remaining time (countdown from 3:00)
  const remaining = Math.max(0, roundDuration - time);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return e(Box, {
    flexDirection: 'column',
    alignItems: 'center',
    borderStyle: 'double',
    borderColor: theme.border,
    paddingX: 2,
    paddingY: 0,
    height: 8
  },
    e(Text, { bold: true, color: theme.round }, `ROUND ${round}/${maxRounds}`),
    e(Text, { bold: true, color: theme.timer }, `${mins}:${secs.toString().padStart(2, '0')}`),

    // Knockdown display - always show for consistent height
    e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: knockdownsA > 0 ? theme.knockdown : theme.commentary, bold: knockdownsA > 0 },
        `KD: ${knockdownsA}`),
      e(Text, { color: theme.commentary }, ' - '),
      e(Text, { color: knockdownsB > 0 ? theme.knockdown : theme.commentary, bold: knockdownsB > 0 },
        `${knockdownsB}`)
    ),

    e(Text, { color: isPaused ? theme.hurt : theme.commentary, bold: isPaused },
      isPaused ? 'PAUSED' : ' ')
  );
}

/**
 * Commentary Box - HBO broadcast team style
 */
function CommentaryPanel({ lines = [], maxLines = 6 }) {
  const theme = useTheme();
  const displayLines = lines.slice(-maxLines);

  // Pad to ensure consistent height
  const paddedLines = [...displayLines];
  while (paddedLines.length < maxLines) {
    paddedLines.unshift(' ');
  }

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    flexGrow: 1,
    height: maxLines + 4
  },
    e(Text, { bold: true, color: theme.commentary }, ' BROADCAST TEAM'),
    e(Box, { marginTop: 1, flexDirection: 'column' },
      ...paddedLines.map((line, i) => {
        // Parse speaker prefix if present
        let speaker = '';
        let text = typeof line === 'string' ? line : line.text || '';
        let color = theme.commentary;

        if (text.startsWith('LAMPLEY:')) {
          speaker = 'LAMPLEY: ';
          text = text.substring(9);
          color = '#FFFFFF';
        } else if (text.startsWith('FOREMAN:')) {
          speaker = 'FOREMAN: ';
          text = text.substring(9);
          color = theme.stamina;
        } else if (text.startsWith('MERCHANT:')) {
          speaker = 'MERCHANT: ';
          text = text.substring(10);
          color = '#FFD700';
        } else if (text.startsWith('LEDERMAN:')) {
          speaker = 'LEDERMAN: ';
          text = text.substring(10);
          color = '#90EE90';
        }

        const isLatest = i === paddedLines.length - 1;

        return e(Text, {
          key: i,
          color: isLatest ? color : theme.commentary,
          dimColor: !isLatest,
          wrap: 'wrap'
        }, speaker ? chalk.bold(speaker) + text : text);
      })
    )
  );
}

/**
 * Action Log - Recent punch activity
 */
function ActionPanel({ actions = [], maxActions = 4 }) {
  const theme = useTheme();
  const displayActions = actions.slice(-maxActions);

  // Pad to ensure consistent height
  const paddedActions = [...displayActions];
  while (paddedActions.length < maxActions) {
    paddedActions.unshift({ text: ' ', highlight: false });
  }

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: 44,
    height: maxActions + 4
  },
    e(Text, { bold: true, color: theme.punch }, ' RECENT ACTION'),
    e(Box, { marginTop: 1, flexDirection: 'column' },
      ...paddedActions.map((action, i) => {
        const isLatest = i === paddedActions.length - 1;
        const text = typeof action === 'string' ? action : action.text;
        const isHighlight = action.highlight || action.isBig;

        return e(Text, {
          key: i,
          color: isHighlight ? theme.knockdown : (isLatest ? theme.foreground : theme.commentary),
          bold: isHighlight,
          dimColor: !isLatest && !isHighlight,
          wrap: 'truncate'
        }, text);
      })
    )
  );
}

/**
 * Status Bar
 */
function StatusBar({ left, center, right }) {
  const theme = useTheme();

  return e(Box, {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderStyle: 'single',
    borderColor: theme.border,
    paddingX: 1
  },
    e(Text, { color: left === 'PAUSED' ? theme.hurt : theme.stamina, bold: true }, left || ''),
    e(Text, { color: theme.foreground, bold: true }, center || ''),
    e(Text, { color: theme.commentary }, right || '')
  );
}

/**
 * Knockdown Overlay
 */
function KnockdownOverlay({ fighter, count, onDismiss }) {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss?.(), 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return e(Box, {
    position: 'absolute',
    top: '30%',
    left: '30%',
    borderStyle: 'double',
    borderColor: theme.knockdown,
    padding: 2,
    backgroundColor: '#000000'
  },
    e(Text, { bold: true, color: theme.knockdown }, `KNOCKDOWN!`),
    e(Text, { color: theme.foreground }, `${fighter} IS DOWN!`),
    count && e(Text, { bold: true, color: theme.timer }, `COUNT: ${count}`)
  );
}

/**
 * Tale of the Tape Panel - Pre-fight comparison and betting odds
 */
function TaleOfTheTape({ fighterA, fighterB, odds }) {
  const theme = useTheme();

  const nameA = fighterA?.name || fighterA?.getShortName?.() || 'Fighter A';
  const nameB = fighterB?.name || fighterB?.getShortName?.() || 'Fighter B';
  const nickA = fighterA?.identity?.nickname || '';
  const nickB = fighterB?.identity?.nickname || '';

  // Physical attributes
  const heightA = fighterA?.physical?.height || 0;
  const heightB = fighterB?.physical?.height || 0;
  const weightA = fighterA?.physical?.weight || 0;
  const weightB = fighterB?.physical?.weight || 0;
  const reachA = fighterA?.physical?.reach || 0;
  const reachB = fighterB?.physical?.reach || 0;
  const stanceA = fighterA?.physical?.stance || 'orthodox';
  const stanceB = fighterB?.physical?.stance || 'orthodox';

  // Records
  const winsA = fighterA?.record?.wins || 0;
  const lossesA = fighterA?.record?.losses || 0;
  const kosA = fighterA?.record?.kos || 0;
  const winsB = fighterB?.record?.wins || 0;
  const lossesB = fighterB?.record?.losses || 0;
  const kosB = fighterB?.record?.kos || 0;

  // Styles
  const styleA = fighterA?.style?.primary || 'boxer';
  const styleB = fighterB?.style?.primary || 'boxer';

  // Format height (cm to feet/inches for display)
  const formatHeight = (cm) => {
    if (!cm) return '--';
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  // Format odds
  const formatOdds = (o) => {
    if (o === undefined || o === null) return '--';
    return o > 0 ? `+${o}` : `${o}`;
  };

  const oddsA = odds?.oddsA;
  const oddsB = odds?.oddsB;

  // Determine which attributes favor which fighter
  const heightWinner = heightA > heightB ? 'A' : heightB > heightA ? 'B' : null;
  const reachWinner = reachA > reachB ? 'A' : reachB > reachA ? 'B' : null;
  const weightWinner = weightA > weightB ? 'A' : weightB > weightA ? 'B' : null;

  // Column widths
  const COL_A = 12;
  const COL_LABEL = 10;
  const COL_B = 12;

  const StatRow = ({ valueA, label, valueB, highlightA = false, highlightB = false }) => {
    return e(Box, { flexDirection: 'row' },
      e(Text, {
        color: highlightA ? theme.fighterA : theme.foreground,
        bold: highlightA
      }, String(valueA).padStart(COL_A)),
      e(Text, { color: theme.commentary, dimColor: true }, ` ${label.padStart(Math.floor((COL_LABEL + label.length) / 2)).padEnd(COL_LABEL)} `),
      e(Text, {
        color: highlightB ? theme.fighterB : theme.foreground,
        bold: highlightB
      }, String(valueB).padEnd(COL_B))
    );
  };

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    paddingX: 1,
    paddingY: 0,
    width: 40,
    height: 12
  },
    // Header
    e(Text, { bold: true, color: '#FFD700' }, ' TALE OF THE TAPE'),

    // Fighter names with odds
    e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: theme.fighterA, bold: true }, nameA.substring(0, COL_A).padStart(COL_A)),
      e(Text, { color: theme.commentary }, '          '),
      e(Text, { color: theme.fighterB, bold: true }, nameB.substring(0, COL_B).padEnd(COL_B))
    ),

    // Nicknames (if any)
    nickA || nickB ? e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA, dimColor: true }, nickA ? `"${nickA}"`.substring(0, COL_A).padStart(COL_A) : ' '.repeat(COL_A)),
      e(Text, { color: theme.commentary }, '          '),
      e(Text, { color: theme.fighterB, dimColor: true }, nickB ? `"${nickB}"`.substring(0, COL_B).padEnd(COL_B) : '')
    ) : null,

    // Odds row
    e(Box, { flexDirection: 'row' },
      e(Text, {
        color: oddsA < 0 ? '#00ff00' : '#ffaa00',
        bold: true
      }, formatOdds(oddsA).padStart(COL_A)),
      e(Text, { color: '#FFD700', bold: true }, '   ODDS   '),
      e(Text, {
        color: oddsB < 0 ? '#00ff00' : '#ffaa00',
        bold: true
      }, formatOdds(oddsB).padEnd(COL_B))
    ),

    // Physical stats
    e(StatRow, {
      valueA: formatHeight(heightA),
      label: 'HEIGHT',
      valueB: formatHeight(heightB),
      highlightA: heightWinner === 'A',
      highlightB: heightWinner === 'B'
    }),
    e(StatRow, {
      valueA: `${weightA} kg`,
      label: 'WEIGHT',
      valueB: `${weightB} kg`,
      highlightA: weightWinner === 'A',
      highlightB: weightWinner === 'B'
    }),
    e(StatRow, {
      valueA: `${reachA}"`,
      label: 'REACH',
      valueB: `${reachB}"`,
      highlightA: reachWinner === 'A',
      highlightB: reachWinner === 'B'
    }),

    // Record
    e(StatRow, {
      valueA: `${winsA}-${lossesA} (${kosA})`,
      label: 'RECORD',
      valueB: `${winsB}-${lossesB} (${kosB})`
    }),

    // Stance
    e(StatRow, {
      valueA: stanceA,
      label: 'STANCE',
      valueB: stanceB
    }),

    // Style
    e(StatRow, {
      valueA: styleA.replace(/-/g, ' ').substring(0, COL_A),
      label: 'STYLE',
      valueB: styleB.replace(/-/g, ' ').substring(0, COL_B)
    })
  );
}

/**
 * Format punch type for display
 */
function formatPunch(punchType) {
  const names = {
    'jab': 'jab',
    'cross': 'right hand',
    'lead_hook': 'left hook',
    'rear_hook': 'right hook',
    'lead_uppercut': 'left uppercut',
    'rear_uppercut': 'right uppercut',
    'body_jab': 'body jab',
    'body_hook': 'body hook'
  };
  return names[punchType] || punchType?.replace(/_/g, ' ') || 'punch';
}

/**
 * Main Fight Display Component
 */
function FightDisplay({ fight, simulation, tui }) {
  const theme = useTheme();
  const { exit } = useApp();

  // Fight state
  const [round, setRound] = useState(1);
  const [time, setTime] = useState(0);
  const [stateA, setStateA] = useState(null);
  const [stateB, setStateB] = useState(null);
  const [positions, setPositions] = useState(null);
  const [statsA, setStatsA] = useState({});
  const [statsB, setStatsB] = useState({});

  // UI state
  const [actions, setActions] = useState([]);
  const [commentary, setCommentary] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [result, setResult] = useState(null);
  const [isBetweenRounds, setIsBetweenRounds] = useState(false);
  const [knockdownOverlay, setKnockdownOverlay] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(simulation?.options?.speedMultiplier || 1);
  const [roundPointDeductions, setRoundPointDeductions] = useState({ A: 0, B: 0 });
  const [fightOdds, setFightOdds] = useState(null);
  const [roundHurtStats, setRoundHurtStats] = useState({ A: 0, B: 0 });

  const commentaryGen = useRef(new CommentaryGenerator()).current;
  const lastCommentaryTime = useRef(0);
  const lastPeriodicCommentaryTime = useRef(0);
  const lastMomentumCommentaryTime = useRef(0);

  // Calculate pre-fight odds and generate analysis
  const calculateOdds = useCallback((fighterA, fighterB) => {
    // Get fighter attributes for comparison
    const getOverall = (f) => {
      const power = ((f.power?.powerLeft || 70) + (f.power?.powerRight || 70) + (f.power?.knockoutPower || 70)) / 3;
      const speed = ((f.speed?.handSpeed || 70) + (f.speed?.footSpeed || 70) + (f.speed?.reflexes || 70)) / 3;
      const defense = ((f.defense?.headMovement || 70) + (f.defense?.blocking || 70)) / 2;
      const stamina = ((f.stamina?.cardio || 70) + (f.stamina?.recoveryRate || 70)) / 2;
      const mental = ((f.mental?.chin || 70) + (f.mental?.heart || 70) + (f.mental?.killerInstinct || 70)) / 3;
      const technical = ((f.technical?.accuracy || 70) + (f.technical?.fightIQ || 70) + (f.technical?.ringGeneralship || 70)) / 3;
      return (power + speed + defense + stamina + mental + technical) / 6;
    };

    const overallA = getOverall(fighterA);
    const overallB = getOverall(fighterB);

    // Physical advantages
    const reachA = fighterA.physical?.reach || 180;
    const reachB = fighterB.physical?.reach || 180;
    const reachAdvantage = (reachA - reachB) * 0.15; // Each inch of reach = 0.15 points

    // Record factor (winning percentage matters)
    const getRecordBonus = (f) => {
      const wins = f.record?.wins || 0;
      const losses = f.record?.losses || 0;
      const total = wins + losses;
      if (total === 0) return 0;
      return ((wins / total) - 0.5) * 10; // +5 for 100% win rate, -5 for 0%
    };
    const recordA = getRecordBonus(fighterA);
    const recordB = getRecordBonus(fighterB);

    // Calculate adjusted scores
    const scoreA = overallA + reachAdvantage + recordA;
    const scoreB = overallB - reachAdvantage + recordB;

    // Convert to probability (logistic function)
    const diff = scoreA - scoreB;
    const probA = 1 / (1 + Math.exp(-diff / 8)); // Sigmoid with scale factor

    // Convert probability to American odds
    const toAmericanOdds = (prob) => {
      if (prob >= 0.5) {
        return Math.round(-100 * prob / (1 - prob));
      } else {
        return Math.round(100 * (1 - prob) / prob);
      }
    };

    const oddsA = toAmericanOdds(probA);
    const oddsB = toAmericanOdds(1 - probA);

    // Determine matchup type
    let matchupType;
    const probDiff = Math.abs(probA - 0.5);
    if (probDiff < 0.05) matchupType = 'PICK_EM';
    else if (probDiff < 0.12) matchupType = 'COMPETITIVE';
    else if (probDiff < 0.22) matchupType = 'CLEAR_FAVORITE';
    else if (probDiff < 0.32) matchupType = 'HEAVY_FAVORITE';
    else matchupType = 'MISMATCH';

    const favorite = probA > 0.5 ? 'A' : 'B';
    const favoriteProb = Math.max(probA, 1 - probA);

    return {
      probA,
      probB: 1 - probA,
      oddsA,
      oddsB,
      matchupType,
      favorite,
      favoriteProb,
      overallA,
      overallB,
      reachAdvantage
    };
  }, []);

  // Initialize commentary generator with pre-fight analysis
  useEffect(() => {
    if (fight) {
      commentaryGen.initialize(fight.fighterA, fight.fighterB);

      const nameA = fight.fighterA.name || fight.fighterA.getShortName();
      const nameB = fight.fighterB.name || fight.fighterB.getShortName();
      const shortA = fight.fighterA.getShortName();
      const shortB = fight.fighterB.getShortName();

      // Calculate odds and store for Tale of the Tape
      const odds = calculateOdds(fight.fighterA, fight.fighterB);
      setFightOdds(odds);
      const favorite = odds.favorite === 'A' ? shortA : shortB;
      const underdog = odds.favorite === 'A' ? shortB : shortA;

      // Format odds for display
      const formatOdds = (o) => o > 0 ? `+${o}` : `${o}`;

      addCommentary('═══════════════════════════════════════════');
      addCommentary(`LAMPLEY: Welcome to tonight's main event!`);
      addCommentary(`LAMPLEY: ${nameA} vs ${nameB}!`);
      addCommentary('');

      // Show betting odds
      addCommentary(`MERCHANT: The betting lines have ${shortA} at ${formatOdds(odds.oddsA)}, ${shortB} at ${formatOdds(odds.oddsB)}.`);

      // Matchup analysis based on type
      if (odds.matchupType === 'PICK_EM') {
        addCommentary(`FOREMAN: This is a true pick'em fight. Could go either way!`);
        addCommentary(`MERCHANT: The oddsmakers can't separate these two. Expect fireworks!`);
      } else if (odds.matchupType === 'COMPETITIVE') {
        addCommentary(`FOREMAN: ${favorite} is a slight favorite, but ${underdog} is very live here.`);
        addCommentary(`MERCHANT: This should be a competitive fight throughout.`);
      } else if (odds.matchupType === 'CLEAR_FAVORITE') {
        addCommentary(`FOREMAN: ${favorite} comes in as the clear favorite tonight.`);
        addCommentary(`MERCHANT: ${underdog} will need to pull off something special to win this one.`);
      } else if (odds.matchupType === 'HEAVY_FAVORITE') {
        addCommentary(`FOREMAN: ${favorite} is a heavy favorite. ${underdog} faces an uphill battle.`);
        addCommentary(`MERCHANT: The question is whether ${underdog} can survive, let alone win.`);
      } else if (odds.matchupType === 'MISMATCH') {
        addCommentary(`FOREMAN: I have to be honest - this looks like a mismatch on paper.`);
        addCommentary(`MERCHANT: ${favorite} should dominate unless something unexpected happens.`);
        addCommentary(`LAMPLEY: But that's why they fight the fights, anything can happen!`);
      }

      // Physical comparison
      const reachA = fight.fighterA.physical?.reach || 0;
      const reachB = fight.fighterB.physical?.reach || 0;
      const reachDiff = Math.abs(reachA - reachB);
      if (reachDiff >= 5) {
        const longerArms = reachA > reachB ? shortA : shortB;
        addCommentary(`FOREMAN: ${longerArms} has a ${reachDiff} inch reach advantage. That could be key.`);
      }

      // Style matchup insight
      const styleA = fight.fighterA.style?.primary || 'boxer';
      const styleB = fight.fighterB.style?.primary || 'boxer';
      if (styleA !== styleB) {
        addCommentary(`MERCHANT: Interesting style matchup - ${shortA}'s ${styleA} style against ${shortB}'s ${styleB} approach.`);
      }

      addCommentary('═══════════════════════════════════════════');
      addCommentary('');
    }
  }, [fight, commentaryGen, calculateOdds]);

  // Subscribe to simulation events
  useEffect(() => {
    if (!simulation) return;

    const handlers = {
      tick: (data) => {
        setTime(data.roundTime || 0);
        setStateA(data.fighterA);
        setStateB(data.fighterB);
        setPositions(data.positions);
        setStatsA(data.fighterA?.fightStats || data.stats?.fighterA || {});
        setStatsB(data.fighterB?.fightStats || data.stats?.fighterB || {});

        // Periodic commentary - observations about the fight state
        const now = Date.now();
        const timeSincePeriodicComment = now - lastPeriodicCommentaryTime.current;
        const timeSinceMomentumComment = now - lastMomentumCommentaryTime.current;
        const roundTime = data.roundTime || 0;

        // Only add periodic commentary during active fighting (after first 30s, not in last 30s)
        if (roundTime > 30 && roundTime < 150 && timeSincePeriodicComment > 8000) {
          const fighterAState = data.fighterA;
          const fighterBState = data.fighterB;
          const nameA = fight?.fighterA?.getShortName?.() || 'Fighter A';
          const nameB = fight?.fighterB?.getShortName?.() || 'Fighter B';
          const staminaA = fighterAState?.stamina?.percent || 1;
          const staminaB = fighterBState?.stamina?.percent || 1;
          const healthA = fighterAState?.damage?.headPercent != null ? (1 - fighterAState.damage.headPercent) : 1;
          const healthB = fighterBState?.damage?.headPercent != null ? (1 - fighterBState.damage.headPercent) : 1;

          // Get buffs/debuffs
          const buffsA = fighterAState?.effects?.buffs || [];
          const buffsB = fighterBState?.effects?.buffs || [];
          const debuffsA = fighterAState?.effects?.debuffs || [];
          const debuffsB = fighterBState?.effects?.debuffs || [];

          // MOMENTUM commentary (special, tracked separately)
          const hasMomentumA = buffsA.some(b => b.type === 'MOMENTUM');
          const hasMomentumB = buffsB.some(b => b.type === 'MOMENTUM');
          if ((hasMomentumA || hasMomentumB) && timeSinceMomentumComment > 15000) {
            const fighter = hasMomentumA ? nameA : nameB;
            const comments = [
              `FOREMAN: ${fighter} has got MOMENTUM now! You can feel it!`,
              `MERCHANT: ${fighter} is in complete control right now. This is his moment.`,
              `LAMPLEY: ${fighter} is in a rhythm! He's got the crowd behind him!`,
              `FOREMAN: ${fighter} is rolling now! When you get hot like this, you gotta keep throwing!`,
              `MERCHANT: ${fighter} has seized the initiative. His opponent needs to disrupt this flow.`
            ];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastMomentumCommentaryTime.current = now;
            lastPeriodicCommentaryTime.current = now;
            return;
          }

          // GASSED/STAMINA commentary
          const isGassedA = debuffsA.some(d => d.type === 'GASSED');
          const isGassedB = debuffsB.some(d => d.type === 'GASSED');
          if (isGassedA || isGassedB) {
            const gassedFighter = isGassedA ? nameA : nameB;
            const opponent = isGassedA ? nameB : nameA;
            if (Math.random() < 0.3) {
              const comments = [
                `FOREMAN: ${gassedFighter} is EXHAUSTED! He's got nothing left in the tank!`,
                `MERCHANT: ${gassedFighter} has punched himself out. ${opponent} needs to capitalize NOW.`,
                `LAMPLEY: ${gassedFighter} is breathing heavy! His punch output has dropped dramatically!`,
                `FOREMAN: Look at ${gassedFighter}'s body language! He's GASSED!`
              ];
              addCommentary(comments[Math.floor(Math.random() * comments.length)]);
              lastPeriodicCommentaryTime.current = now;
              return;
            }
          }

          // General periodic observations (random selection)
          const periodicRoll = Math.random();

          if (periodicRoll < 0.15 && staminaA < 0.5 && staminaB > 0.6) {
            // Stamina disparity
            const comments = [
              `FOREMAN: ${nameA} is slowing down. ${nameB} looks fresher.`,
              `MERCHANT: The conditioning difference is starting to show. ${nameA} is fading.`,
              `LAMPLEY: ${nameA}'s work rate has dropped. He looks tired.`
            ];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastPeriodicCommentaryTime.current = now;
          } else if (periodicRoll < 0.30 && staminaB < 0.5 && staminaA > 0.6) {
            const comments = [
              `FOREMAN: ${nameB} is fading! ${nameA} needs to pour it on!`,
              `MERCHANT: ${nameB}'s punch output has dropped significantly. Fatigue is setting in.`,
              `LAMPLEY: ${nameB} is slowing down! ${nameA} smells blood!`
            ];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastPeriodicCommentaryTime.current = now;
          } else if (periodicRoll < 0.40 && healthA < 0.45) {
            // Fighter A is hurt
            const comments = [
              `MERCHANT: ${nameA} has taken a lot of punishment. How much more can he absorb?`,
              `FOREMAN: ${nameA}'s face is starting to show the damage. ${nameB} is breaking him down.`,
              `LAMPLEY: ${nameA} is in survival mode now. He's just trying to stay in the fight.`
            ];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastPeriodicCommentaryTime.current = now;
          } else if (periodicRoll < 0.50 && healthB < 0.45) {
            const comments = [
              `MERCHANT: ${nameB} is hurt and ${nameA} knows it. He's looking for the finish.`,
              `FOREMAN: ${nameB} is in trouble! Look at his face - he's taken some shots!`,
              `LAMPLEY: ${nameB} is hanging on! Can he survive this onslaught?`
            ];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastPeriodicCommentaryTime.current = now;
          } else if (periodicRoll < 0.60 && roundTime > 90 && roundTime < 120) {
            // Mid-round general observations
            const comments = [
              `FOREMAN: Good action in this round! Both fighters are throwing leather!`,
              `MERCHANT: The chess match continues. Neither man wants to give an inch.`,
              `LAMPLEY: We're halfway through this round and the pace has been relentless!`,
              `FOREMAN: I love what I'm seeing! This is what boxing is all about!`,
              `MERCHANT: The tactical adjustments are fascinating. Both corners are working.`
            ];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastPeriodicCommentaryTime.current = now;
          } else if (periodicRoll < 0.70) {
            // Random style observations
            const styleA = fight?.fighterA?.style?.primary || 'boxer';
            const styleB = fight?.fighterB?.style?.primary || 'boxer';
            if (styleA === 'swarmer' || styleA === 'pressure-fighter') {
              const comments = [
                `FOREMAN: ${nameA} keeps bringing the pressure! He won't let ${nameB} breathe!`,
                `MERCHANT: ${nameA}'s aggression is paying off. He's smothering ${nameB}.`
              ];
              addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            } else if (styleA === 'out-boxer') {
              const comments = [
                `MERCHANT: ${nameA} is boxing beautifully. He's controlling the distance.`,
                `LAMPLEY: ${nameA}'s jab is finding a home. Beautiful outfighting.`
              ];
              addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            } else if (styleA === 'counter-puncher') {
              const comments = [
                `MERCHANT: ${nameA} is making ${nameB} pay for every mistake. Beautiful timing.`,
                `FOREMAN: ${nameA} is sitting in the pocket, waiting to counter. Dangerous!`
              ];
              addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            } else {
              const comments = [
                `FOREMAN: Both fighters are giving their all! Great action!`,
                `MERCHANT: The technique on display here is impressive.`,
                `LAMPLEY: What a round we're witnessing!`
              ];
              addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            }
            lastPeriodicCommentaryTime.current = now;
          }
        }
      },

      roundStart: (data) => {
        setRound(data.round);
        setTime(0);
        setIsBetweenRounds(false);
        setRoundPointDeductions({ A: 0, B: 0 }); // Reset point deductions for new round
        setRoundHurtStats({ A: 0, B: 0 }); // Reset stagger/hurt stats for new round

        const nameA = fight.fighterA.getShortName();
        const nameB = fight.fighterB.getShortName();
        const staminaA = stateA?.stamina?.percent || 1;
        const staminaB = stateB?.stamina?.percent || 1;
        const healthA = stateA?.damage?.headPercent != null ? (1 - stateA.damage.headPercent) : 1;
        const healthB = stateB?.damage?.headPercent != null ? (1 - stateB.damage.headPercent) : 1;

        if (data.round === 1) {
          addCommentary(`LAMPLEY: The bell sounds and we are UNDERWAY!`);
        } else if (data.round >= 10) {
          addCommentary(`LAMPLEY: Championship rounds! Round ${data.round} begins!`);
          addCommentary(`MERCHANT: This is where legends are made. Who wants it more?`);
        } else {
          const openers = [
            `LAMPLEY: Round ${data.round} is underway!`,
            `LAMPLEY: Here we go, round ${data.round}!`,
            `LAMPLEY: The bell sounds for round ${data.round}.`
          ];
          addCommentary(openers[Math.floor(Math.random() * openers.length)]);
        }

        // Tactical observations based on fighter states
        if (data.round > 1) {
          if (staminaA < 0.5 && staminaB > 0.7) {
            addCommentary(`FOREMAN: ${nameA} looks tired coming out. ${nameB} needs to capitalize.`);
          } else if (staminaB < 0.5 && staminaA > 0.7) {
            addCommentary(`FOREMAN: ${nameB} is showing fatigue. ${nameA} should push the pace.`);
          } else if (healthA < 0.5) {
            addCommentary(`MERCHANT: ${nameA} took a lot of damage last round. Can he recover?`);
          } else if (healthB < 0.5) {
            addCommentary(`MERCHANT: ${nameB} is hurt. ${nameA} needs to go for the finish.`);
          } else if (Math.random() > 0.5) {
            const insights = [
              `FOREMAN: Both fighters look fresh coming out of the corner.`,
              `MERCHANT: The corner work is paying off. Both men look ready.`,
              `FOREMAN: Watch for adjustments here. Good corners make changes.`
            ];
            addCommentary(insights[Math.floor(Math.random() * insights.length)]);
          }
        }
      },

      roundEnd: (data) => {
        setIsBetweenRounds(true);

        const nameA = fight.fighterA.getShortName();
        const nameB = fight.fighterB.getShortName();

        // Get round stats
        const statsAround = stateA?.fightStats || statsA;
        const statsBround = stateB?.fightStats || statsB;
        const landedA = statsAround?.punchesLanded || statsAround?.punches_landed || 0;
        const landedB = statsBround?.punchesLanded || statsBround?.punches_landed || 0;

        // Get power punches vs jabs
        const powerA = statsAround?.powerPunchesLanded || statsAround?.power_punches_landed || Math.floor(landedA * 0.4);
        const powerB = statsBround?.powerPunchesLanded || statsBround?.power_punches_landed || Math.floor(landedB * 0.4);
        const jabsA = landedA - powerA;
        const jabsB = landedB - powerB;

        // Get damage dealt this round (more important than volume)
        const damageA = stateA?.roundDamageDealt || (powerA * 1.5 + jabsA * 0.3);
        const damageB = stateB?.roundDamageDealt || (powerB * 1.5 + jabsB * 0.3);

        // Knockdowns this round
        const kdA = stateA?.roundKnockdowns || 0;
        const kdB = stateB?.roundKnockdowns || 0;

        // Get stagger/hurt stats for this round (who hurt who)
        // The fighter who STAGGERS their opponent gets huge scoring bonus
        const staggersA = roundHurtStats.A || 0;  // Times A staggered B
        const staggersB = roundHurtStats.B || 0;  // Times B staggered A

        // REALISTIC ROUND SCORING WITH JUDGE PERSONALITIES
        // Key insight: Even in one-sided fights, the losing fighter will win SOME rounds
        // - Maybe they caught the winner with a good shot
        // - Maybe the winner took a "rest round"
        // - Maybe the loser just out-worked them for 3 minutes
        //
        // Real boxing: A fighter being dominated might still win 2-3 rounds in a 12 rounder

        // Define judge scoring styles
        const getJudgeScore = (judgeType) => {
          let effectiveA, effectiveB;

          // STAGGER BONUS: Hurting/staggering your opponent is a HUGE scoring factor
          // This is one of the most impressive things you can do without scoring a knockdown
          // Base bonus: 30 points per stagger (roughly equivalent to 10-15 power punches)
          const staggerBonusA = staggersA * 30;
          const staggerBonusB = staggersB * 30;

          if (judgeType === 'POWER') {
            // Power judge: heavily weights damage, power punches, AND staggers
            effectiveA = (damageA * 2.0) + (powerA * 3.0) + (jabsA * 0.2) + (staggerBonusA * 1.5);
            effectiveB = (damageB * 2.0) + (powerB * 3.0) + (jabsB * 0.2) + (staggerBonusB * 1.5);
          } else if (judgeType === 'VOLUME') {
            // Volume judge: values activity but still recognizes staggers
            effectiveA = (damageA * 0.8) + (powerA * 1.0) + (jabsA * 1.2) + (landedA * 0.5) + staggerBonusA;
            effectiveB = (damageB * 0.8) + (powerB * 1.0) + (jabsB * 1.2) + (landedB * 0.5) + staggerBonusB;
          } else {
            // Balanced judge - staggers are very important
            effectiveA = (damageA * 1.2) + (powerA * 1.5) + (jabsA * 0.6) + (staggerBonusA * 1.2);
            effectiveB = (damageB * 1.2) + (powerB * 1.5) + (jabsB * 0.6) + (staggerBonusB * 1.2);
          }

          // Calculate base advantage
          const total = effectiveA + effectiveB + 0.1;
          let advantageA = effectiveA / total;

          // MAJOR VARIANCE FACTORS:
          // 1. Judge variance - judges see things differently (±10%)
          const judgeVariance = (Math.random() - 0.5) * 0.20;

          // 2. "Memorable moments" - sometimes a single punch or exchange wins a round
          //    This represents the loser landing something clean that sticks in the judge's mind
          const memorableMoment = (Math.random() - 0.5) * 0.15;

          // 3. "Swing round" factor - some rounds are just hard to score
          //    ~20% of rounds are genuine toss-ups regardless of stats
          const isSwingRound = Math.random() < 0.20;
          const swingFactor = isSwingRound ? (Math.random() - 0.5) * 0.25 : 0;

          advantageA += judgeVariance + memorableMoment + swingFactor;

          // 4. "Balancing" factor - judges subtly favor trailing fighter in close rounds
          //    This represents the subconscious tendency to keep fights competitive
          //    Only applies to close rounds (±0.12 from even) and when one fighter is behind
          const currentScores = roundScores || [];
          let totalA = 0, totalB = 0;
          currentScores.forEach(s => { totalA += s.a; totalB += s.b; });
          const scoreDiff = Math.abs(totalA - totalB);
          const aIsTrailing = totalA < totalB;
          const bIsTrailing = totalB < totalA;

          // If round is close and one fighter is clearly behind on cards, subtle nudge
          if (scoreDiff >= 3 && Math.abs(advantageA - 0.5) < 0.12) {
            const balancingStrength = Math.min(0.08, scoreDiff * 0.015); // Max 8% nudge
            if (aIsTrailing) {
              advantageA += balancingStrength; // Nudge toward A winning this round
            } else if (bIsTrailing) {
              advantageA -= balancingStrength; // Nudge toward B winning this round
            }
          }

          // Clamp to reasonable range (no one wins a round 90-10)
          advantageA = Math.max(0.25, Math.min(0.75, advantageA));

          // Determine this judge's round score
          let scoreA = 10, scoreB = 10;

          // Wider bands for "close" rounds - most rounds ARE close
          if (advantageA >= 0.42 && advantageA <= 0.58) {
            // Close round - genuinely could go either way
            // Give slight edge to the statistical leader but it's nearly a coin flip
            const winChanceA = 0.35 + (advantageA - 0.42) * 1.875; // 35% to 65%
            if (Math.random() < winChanceA) scoreB = 9;
            else scoreA = 9;
          } else if (advantageA > 0.58 && advantageA <= 0.68) {
            // A has the edge but B can still steal it (~25% chance)
            if (Math.random() < 0.75) scoreB = 9;
            else scoreA = 9;
          } else if (advantageA < 0.42 && advantageA >= 0.32) {
            // B has the edge but A can still steal it (~25% chance)
            if (Math.random() < 0.75) scoreA = 9;
            else scoreB = 9;
          } else if (advantageA > 0.68) {
            // Clear A round - but still ~10% upset chance
            if (Math.random() < 0.90) {
              scoreB = 9;
              if (advantageA > 0.72 && Math.random() < 0.20) scoreB = 8;
            } else {
              scoreA = 9; // Stolen round!
            }
          } else if (advantageA < 0.32) {
            // Clear B round - but still ~10% upset chance
            if (Math.random() < 0.90) {
              scoreA = 9;
              if (advantageA < 0.28 && Math.random() < 0.20) scoreA = 8;
            } else {
              scoreB = 9; // Stolen round!
            }
          }

          // Knockdowns override everything (no stealing a KD round)
          if (kdA > 0 && kdB === 0) {
            scoreB = 10;
            scoreA = 10 - kdA;
          } else if (kdB > 0 && kdA === 0) {
            scoreA = 10;
            scoreB = 10 - kdB;
          }
          // Multiple staggerings without knockdown can also be 10-8
          // This is a lopsided round - one fighter is getting dominated
          // staggersA = times A hurt/staggered B (A gets credit)
          // staggersB = times B hurt/staggered A (B gets credit)
          else if (staggersA >= 2 && staggersB === 0) {
            // A staggered B multiple times - A dominated and wins 10-8
            scoreA = 10;
            scoreB = 8;
          } else if (staggersB >= 2 && staggersA === 0) {
            // B staggered A multiple times - B dominated and wins 10-8
            scoreB = 10;
            scoreA = 8;
          }
          // Single stagger is significant but not 10-8 worthy on its own
          // However it should guarantee winning the round if already ahead
          else if (staggersA === 1 && staggersB === 0 && advantageA > 0.55) {
            // A hurt B and has the edge - A wins 10-9
            scoreA = 10;
            scoreB = 9;
          } else if (staggersB === 1 && staggersA === 0 && advantageA < 0.45) {
            // B hurt A and has the edge - B wins 10-9
            scoreB = 10;
            scoreA = 9;
          }

          return { scoreA, scoreB, advantageA, isSwingRound };
        };

        // Simulate 3 judges with different philosophies
        // Lederman (displayed) uses the average/consensus
        const judgeTypes = ['POWER', 'VOLUME', 'BALANCED'];
        const judgeScores = judgeTypes.map(type => getJudgeScore(type));

        // Use most common score for Lederman's card (or balanced judge if split)
        const scoreACounts = {};
        const scoreBCounts = {};
        judgeScores.forEach(js => {
          scoreACounts[js.scoreA] = (scoreACounts[js.scoreA] || 0) + 1;
          scoreBCounts[js.scoreB] = (scoreBCounts[js.scoreB] || 0) + 1;
        });

        // Lederman picks the majority view, or balanced if all different
        let scoreA = judgeScores[2].scoreA; // Default to balanced
        let scoreB = judgeScores[2].scoreB;

        // If 2+ judges agree, use that score
        for (const [score, count] of Object.entries(scoreACounts)) {
          if (count >= 2) scoreA = parseInt(score);
        }
        for (const [score, count] of Object.entries(scoreBCounts)) {
          if (count >= 2) scoreB = parseInt(score);
        }

        // For tracking split rounds in commentary
        const isSplitRound = new Set(judgeScores.map(j => j.scoreA > j.scoreB ? 'A' : j.scoreB > j.scoreA ? 'B' : 'E')).size > 1;

        // Check if any judge flagged this as a swing round
        const anySwingRound = judgeScores.some(j => j.isSwingRound);

        // Calculate final advantage for commentary (use balanced judge)
        const finalAdvantageA = judgeScores[2].advantageA;

        // Detect "stolen" rounds - where the statistical loser wins the round
        const damageWinner = damageA > damageB ? nameA : damageB > damageA ? nameB : null;

        // Adjust for point deductions this round
        scoreA -= roundPointDeductions.A;
        scoreB -= roundPointDeductions.B;

        // Ensure minimum scores
        scoreA = Math.max(7, scoreA);
        scoreB = Math.max(7, scoreB);

        setRoundScores(prev => [...prev, { a: scoreA, b: scoreB }]);

        addCommentary(`LAMPLEY: That's the end of Round ${data.round}!`);

        // Insightful round analysis
        const pointDeductionA = roundPointDeductions.A;
        const pointDeductionB = roundPointDeductions.B;
        const roundWinner = scoreA > scoreB ? nameA : scoreB > scoreA ? nameB : null;
        const statsWinner = landedA > landedB ? nameA : landedB > landedA ? nameB : null;
        const powerWinner = powerA > powerB ? nameA : powerB > powerA ? nameB : null;

        // Detect power puncher vs volume puncher scenario
        const isPowerVsVolume = powerWinner && statsWinner && powerWinner !== statsWinner;

        // Mention point deductions first - they're significant
        if (pointDeductionA > 0 || pointDeductionB > 0) {
          const penalizedFighter = pointDeductionA > 0 ? nameA : nameB;
          const pointsLost = pointDeductionA > 0 ? pointDeductionA : pointDeductionB;
          addCommentary(`LEDERMAN: Don't forget, ${penalizedFighter} lost ${pointsLost} point${pointsLost > 1 ? 's' : ''} this round!`);
          addCommentary(`MERCHANT: That point deduction could be crucial on the scorecards.`);
        }

        if (kdA > 0 || kdB > 0) {
          const scorer = kdA > 0 ? nameB : nameA;
          addCommentary(`MERCHANT: That knockdown makes it a clear 10-${10 - Math.max(kdA, kdB)} round for ${scorer}.`);
        } else if (roundWinner && damageWinner && roundWinner !== damageWinner && roundWinner !== statsWinner) {
          // Stolen round! The statistical loser won the round
          const stolenComments = [
            `MERCHANT: ${roundWinner} steals that round! Sometimes the stats don't tell the whole story.`,
            `FOREMAN: ${roundWinner} did just enough to take that round. Smart boxing.`,
            `LAMPLEY: An interesting round for ${roundWinner}. The judges saw something we might have missed.`,
            `MERCHANT: ${roundWinner} banks that round. Not every winner lands the most punches.`,
            `FOREMAN: ${roundWinner} picked their moments well. Quality work in that round.`
          ];
          addCommentary(stolenComments[Math.floor(Math.random() * stolenComments.length)]);
        } else if (anySwingRound && !isSplitRound && roundWinner) {
          // Swing round that judges happened to agree on
          const swingComments = [
            `MERCHANT: That was a genuine swing round, but the judges gave it to ${roundWinner}.`,
            `LEDERMAN: Close round. ${roundWinner} gets it, but it could have gone either way.`,
            `FOREMAN: Tough round to score. ${roundWinner} maybe did a little more.`
          ];
          addCommentary(swingComments[Math.floor(Math.random() * swingComments.length)]);
        } else if (isSplitRound && isPowerVsVolume) {
          // Classic power vs volume debate - judges might disagree
          const powerName = powerWinner;
          const volumeName = statsWinner;
          const splitComments = [
            `MERCHANT: This is a round where judges will disagree. ${powerName} landed the heavier shots, ${volumeName} was busier.`,
            `FOREMAN: ${powerName}'s power punches vs ${volumeName}'s volume - some judges go one way, some the other.`,
            `LAMPLEY: The eternal boxing debate - do you reward the harder punches or the higher output?`,
            `MERCHANT: A tale of two fighters - ${powerName} with quality, ${volumeName} with quantity.`
          ];
          addCommentary(splitComments[Math.floor(Math.random() * splitComments.length)]);
          if (roundWinner === powerName) {
            addCommentary(`LEDERMAN: I'm rewarding ${powerName}'s power. Those shots did more damage.`);
          } else {
            addCommentary(`LEDERMAN: I'm giving it to ${volumeName} for ring generalship and activity.`);
          }
        } else if (isSplitRound) {
          addCommentary(`MERCHANT: That's a swing round. Judges at ringside might score it differently.`);
          if (roundWinner) {
            addCommentary(`LEDERMAN: I'm giving it to ${roundWinner}, but I wouldn't argue with the other way.`);
          }
        } else if (roundWinner && roundWinner !== statsWinner && Math.abs(landedA - landedB) > 3) {
          // Power puncher won despite being outlanded
          const upsetComments = [
            `FOREMAN: ${roundWinner} landed the cleaner, harder shots. That's what I'm scoring.`,
            `MERCHANT: ${statsWinner} threw more, but ${roundWinner}'s punches were the ones that counted.`,
            `LEDERMAN: Volume doesn't win rounds, effective punching does. ${roundWinner}'s round.`,
            `FOREMAN: ${roundWinner} made every punch count. Quality over quantity.`
          ];
          addCommentary(upsetComments[Math.floor(Math.random() * upsetComments.length)]);
        } else if (finalAdvantageA > 0.65 || finalAdvantageA < 0.35) {
          const winner = finalAdvantageA > 0.5 ? nameA : nameB;
          addCommentary(`FOREMAN: ${winner} dominated that round. Clear 10-9.`);
        } else if (finalAdvantageA >= 0.45 && finalAdvantageA <= 0.55) {
          addCommentary(`MERCHANT: Very close round. Could go either way.`);
          if (roundWinner) {
            addCommentary(`LEDERMAN: I'm giving it to ${roundWinner}, but it's razor thin.`);
          }
        } else if (roundWinner) {
          addCommentary(`FOREMAN: I give that round to ${roundWinner}. Good work.`);
        }

        // Lederman's scoring
        const totalA = roundScores.reduce((sum, s) => sum + s.a, 0) + scoreA;
        const totalB = roundScores.reduce((sum, s) => sum + s.b, 0) + scoreB;
        const leader = totalA > totalB ? nameA : totalB > totalA ? nameB : null;
        const margin = Math.abs(totalA - totalB);

        // Show the round score explicitly
        addCommentary(`LEDERMAN: I scored that round ${scoreA}-${scoreB}.`);

        if (leader) {
          if (margin >= 4) {
            addCommentary(`LEDERMAN: Overall I have it ${totalA}-${totalB}. ${leader} is pulling away!`);
          } else if (margin >= 2) {
            addCommentary(`LEDERMAN: My card shows ${totalA}-${totalB}. ${leader} ahead.`);
          } else {
            addCommentary(`LEDERMAN: ${totalA}-${totalB} on my card. Still anybody's fight!`);
          }
        } else {
          addCommentary(`LEDERMAN: ${totalA}-${totalB}. Dead even on my card!`);
        }
      },

      punchLanded: (data) => {
        const attacker = data.attacker === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        const defender = data.attacker === 'A'
          ? fight.fighterB.getShortName()
          : fight.fighterA.getShortName();
        const attackerFighter = data.attacker === 'A' ? fight.fighterA : fight.fighterB;
        const defenderState = data.attacker === 'A' ? stateB : stateA;
        const attackerState = data.attacker === 'A' ? stateA : stateB;
        const punchName = formatPunch(data.punchType);
        const damage = data.damage || 0;
        const isBody = data.punchType?.includes('body');

        // Always add to action log
        const actionText = `${attacker} lands ${punchName}`;
        const isBig = damage >= 5;
        addAction({ text: actionText, highlight: isBig, isBig });

        // Commentary based on damage and context
        const now = Date.now();
        const timeSinceLastCommentary = now - lastCommentaryTime.current;
        const defenderStamina = defenderState?.stamina?.percent || 1;
        const defenderHealth = defenderState?.damage?.headPercent != null ? (1 - defenderState.damage.headPercent) : 1;
        const attackerStyle = attackerFighter.style?.primary || 'boxer';

        if (damage >= 8) {
          // Devastating shot - always comment with tactical insight
          addCommentary(`LAMPLEY: OH! ${attacker.toUpperCase()} LANDS A HUGE ${punchName.toUpperCase()}!`);
          const insights = [
            `FOREMAN: That hurt ${defender}! You can see it in his legs!`,
            `FOREMAN: ${defender}'s eyes went glassy for a second there! He felt that one!`,
            `MERCHANT: That's the punch ${attacker} has been setting up all night!`,
            `FOREMAN: ${defender} took that right on the chin. His equilibrium is gone!`,
            `MERCHANT: That punch changed the complexion of this entire round!`,
            `FOREMAN: WHOO! That's the kind of punch that ends careers!`,
            `LAMPLEY: ${defender} is in serious trouble after that shot!`,
            `FOREMAN: I've taken punches like that. Trust me, ${defender} doesn't know where he is right now!`
          ];
          addCommentary(insights[Math.floor(Math.random() * insights.length)]);
          lastCommentaryTime.current = now;
        } else if (damage >= 5 && timeSinceLastCommentary > 1200) {
          // Big shot - tactical commentary (reduced from 1500ms)
          const comments = [
            `LAMPLEY: Beautiful ${punchName} by ${attacker}!`,
            `FOREMAN: ${attacker} is timing that ${punchName} perfectly.`,
            `MERCHANT: That's the kind of punch that wins rounds.`,
            `LAMPLEY: ${attacker} is starting to find his range now!`,
            `FOREMAN: ${defender} walked right into that one!`,
            `LAMPLEY: ${attacker} lands flush with the ${punchName}!`,
            `FOREMAN: That ${punchName} had some MUSTARD on it!`,
            `MERCHANT: ${attacker} is building momentum with shots like that.`,
            `LAMPLEY: ${attacker} is zeroing in! That one connected!`,
            `FOREMAN: ${defender} felt THAT one! Good shot!`
          ];
          addCommentary(comments[Math.floor(Math.random() * comments.length)]);

          // Add tactical follow-up based on context (increased chance)
          if (defenderHealth < 0.5 && Math.random() > 0.4) {
            addCommentary(`MERCHANT: ${defender} is absorbing a lot of punishment. How much more can he take?`);
          } else if (isBody && Math.random() > 0.5) {
            addCommentary(`FOREMAN: That body work is going to pay dividends in the later rounds.`);
          }
          lastCommentaryTime.current = now;
        } else if (damage >= 3 && timeSinceLastCommentary > 2000) {
          // Solid shot - style-based commentary (reduced from 3000ms)
          if (Math.random() > 0.3) {
            const styleComments = {
              'swarmer': [`FOREMAN: ${attacker} keeps the pressure on!`, `LAMPLEY: ${attacker} is smothering ${defender} with punches.`, `FOREMAN: ${attacker} won't give ${defender} a moment's rest!`],
              'out-boxer': [`MERCHANT: ${attacker} is boxing beautifully from the outside.`, `LAMPLEY: That jab is finding a home.`, `MERCHANT: ${attacker} is controlling the range perfectly.`],
              'slugger': [`FOREMAN: ${attacker} is loading up on every punch!`, `LAMPLEY: ${attacker} looking for the big one.`, `FOREMAN: ${attacker} is dangerous every time he throws!`],
              'counter-puncher': [`MERCHANT: Beautiful timing from ${attacker}.`, `FOREMAN: ${attacker} is making ${defender} pay for every miss.`, `MERCHANT: ${attacker} is reading ${defender} like a book.`],
              'boxer-puncher': [`LAMPLEY: ${attacker} showing his versatility tonight.`, `FOREMAN: He can box and he can punch!`, `MERCHANT: ${attacker} is adapting to whatever ${defender} gives him.`]
            };
            const comments = styleComments[attackerStyle] || [`LAMPLEY: Good ${punchName} lands for ${attacker}.`, `FOREMAN: Nice shot from ${attacker}!`];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastCommentaryTime.current = now;
          }
        } else if (timeSinceLastCommentary > 4000 && Math.random() > 0.4) {
          // Periodic insight even on lighter action (reduced from 6000ms, increased chance)
          const insights = [
            `FOREMAN: ${attacker} is staying busy. That's good ring generalship.`,
            `MERCHANT: The punch stats are starting to favor ${attacker} in this round.`,
            `LAMPLEY: ${attacker} is controlling the distance well.`,
            `FOREMAN: I like what ${attacker} is doing here. Smart boxing.`,
            `LAMPLEY: ${attacker} continuing to work behind the jab.`,
            `FOREMAN: ${attacker} is finding his rhythm now.`,
            `MERCHANT: ${attacker} is making ${defender} work for every opening.`,
            `LAMPLEY: Good activity from ${attacker} here.`,
            `FOREMAN: ${attacker} is doing the little things right.`,
            `MERCHANT: Watch how ${attacker} cuts off the ring. That's ring generalship.`
          ];
          if (defenderStamina < 0.4) {
            insights.push(`MERCHANT: ${defender} is slowing down. You can see the fatigue setting in.`);
            insights.push(`FOREMAN: ${defender}'s punch output has dropped. He looks tired.`);
            insights.push(`LAMPLEY: ${defender} appears to be fading. His punches have lost their snap.`);
          }
          if (attackerState?.stamina?.percent < 0.4) {
            insights.push(`LAMPLEY: ${attacker} is breathing heavy. This pace might be catching up with him.`);
            insights.push(`FOREMAN: ${attacker} is slowing down too. Both fighters showing fatigue.`);
          }
          if (defenderHealth < 0.4) {
            insights.push(`MERCHANT: ${defender} has absorbed significant damage. The question is, how much fight does he have left?`);
            insights.push(`FOREMAN: Look at ${defender}'s face. He's taken some serious shots tonight.`);
          }
          addCommentary(insights[Math.floor(Math.random() * insights.length)]);
          lastCommentaryTime.current = now;
        }
      },

      knockdown: (data) => {
        const downed = data.fighter === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        const scorer = data.fighter === 'A'
          ? fight.fighterB.getShortName()
          : fight.fighterA.getShortName();
        const downedState = data.fighter === 'A' ? stateA : stateB;
        const knockdownCount = downedState?.knockdowns?.total || 1;

        addAction({ text: `KNOCKDOWN! ${downed} IS DOWN!`, highlight: true });

        // Varied knockdown calls
        const kdCalls = [
          `LAMPLEY: DOWN GOES ${downed.toUpperCase()}! DOWN GOES ${downed.toUpperCase()}!`,
          `LAMPLEY: ${downed.toUpperCase()} IS DOWN! HE'S BEEN DROPPED!`,
          `LAMPLEY: OH! ${downed.toUpperCase()} HIT THE CANVAS! KNOCKDOWN!`,
          `LAMPLEY: ${downed.toUpperCase()} CRUMBLES! HE'S DOWN!`,
          `LAMPLEY: TIMBER! ${downed.toUpperCase()} GOES DOWN FROM THAT SHOT!`
        ];
        addCommentary(kdCalls[Math.floor(Math.random() * kdCalls.length)]);

        // Contextual follow-up
        const followUps = [
          `FOREMAN: ${scorer} caught him clean! That punch had bad intentions!`,
          `MERCHANT: ${downed} didn't see that coming! Perfect timing from ${scorer}!`,
          `FOREMAN: Look at ${downed}'s legs! They're all over the place!`,
          `MERCHANT: That's the kind of punch that changes fights!`,
          `FOREMAN: I've been hit like that! Trust me, ${downed} doesn't know where he is!`,
          `MERCHANT: ${scorer} has been setting that punch up all fight. It finally landed flush!`,
          `FOREMAN: WHOO! That's POWER! ${scorer} put everything into that shot!`,
          `MERCHANT: The accumulation of damage finally took its toll. ${downed} was set up for that.`,
          `FOREMAN: ${scorer} TIMED that PERFECTLY! What a shot!`
        ];
        addCommentary(followUps[Math.floor(Math.random() * followUps.length)]);

        if (knockdownCount >= 2) {
          const multiKdComments = [
            `LAMPLEY: That's the ${knockdownCount === 2 ? 'second' : 'third'} knockdown! ${downed} is in serious trouble!`,
            `FOREMAN: ${knockdownCount === 2 ? 'SECOND' : 'THIRD'} knockdown! How much more can ${downed} take?!`,
            `MERCHANT: Multiple knockdowns now. ${downed}'s corner needs to consider stopping this.`
          ];
          addCommentary(multiKdComments[Math.floor(Math.random() * multiKdComments.length)]);
        }

        setKnockdownOverlay({ fighter: downed, count: 1 });
        lastCommentaryTime.current = Date.now();
      },

      count: (data) => {
        setKnockdownOverlay(prev => prev ? { ...prev, count: data.count } : null);
        if (data.count === 4) {
          const midCountComments = [
            `FOREMAN: Get up! Come on! You can do it!`,
            `LAMPLEY: Four... five... ${knockdownOverlay?.fighter || 'He'} is stirring.`
          ];
          addCommentary(midCountComments[Math.floor(Math.random() * midCountComments.length)]);
        }
        if (data.count === 8) {
          const lateCountComments = [
            `LAMPLEY: The count reaches eight... can he beat it?`,
            `FOREMAN: GET UP! Come on, you're running out of time!`,
            `LAMPLEY: Eight... nine is coming... will he make it?`
          ];
          addCommentary(lateCountComments[Math.floor(Math.random() * lateCountComments.length)]);
        }
      },

      recovered: () => {
        const fighter = knockdownOverlay?.fighter || 'He';
        setKnockdownOverlay(null);
        const recoveries = [
          `LAMPLEY: ${fighter} is up! The fight continues!`,
          `FOREMAN: ${fighter} beats the count! But look at those legs!`,
          `MERCHANT: ${fighter} is back up, but is he really there?`,
          `LAMPLEY: ${fighter} survives! Can he hold on?`,
          `FOREMAN: ${fighter} shows the heart of a champion! He's up!`,
          `MERCHANT: ${fighter} made it back to his feet, but the damage may be done.`,
          `LAMPLEY: ${fighter} beats the count! The question is, how much does he have left?`,
          `FOREMAN: That's HEART right there! ${fighter} is a WARRIOR!`
        ];
        addCommentary(recoveries[Math.floor(Math.random() * recoveries.length)]);
      },

      hurt: (data) => {
        const hurt = data.fighter === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        const attacker = data.fighter === 'A'
          ? fight.fighterB.getShortName()
          : fight.fighterA.getShortName();
        const hurtState = data.fighter === 'A' ? stateA : stateB;
        const stamina = hurtState?.stamina?.percent || 1;

        // Track who staggered their opponent for round scoring
        // The ATTACKER (who hurt their opponent) gets the credit
        const attackerSide = data.fighter === 'A' ? 'B' : 'A';
        setRoundHurtStats(prev => ({
          ...prev,
          [attackerSide]: prev[attackerSide] + 1
        }));

        addAction({ text: `${hurt} IS HURT!`, highlight: true });

        const hurtCalls = [
          `LAMPLEY: ${hurt} is in trouble! He's hurt badly!`,
          `LAMPLEY: ${hurt} is HURT! His legs buckled!`,
          `LAMPLEY: OH! ${hurt} is in serious trouble here!`,
          `LAMPLEY: ${hurt} IS WOBBLED! He's trying to hold on!`,
          `LAMPLEY: ${hurt} is STAGGERED! Can he survive?`,
          `LAMPLEY: ${hurt}'s legs are GONE! He's badly hurt!`
        ];
        addCommentary(hurtCalls[Math.floor(Math.random() * hurtCalls.length)]);

        // Tactical follow-up based on stamina
        if (stamina < 0.3) {
          const exhaustedHurtComments = [
            `FOREMAN: ${hurt} is exhausted AND hurt! This could be it!`,
            `MERCHANT: ${hurt} has nothing left in the tank AND he's hurt. This is a crisis.`,
            `FOREMAN: ${hurt} can't even run! He's too tired AND he's hurt!`
          ];
          addCommentary(exhaustedHurtComments[Math.floor(Math.random() * exhaustedHurtComments.length)]);
        } else {
          const insights = [
            `FOREMAN: ${attacker} smells blood! He needs to finish this!`,
            `MERCHANT: ${hurt} needs to survive these next few seconds!`,
            `FOREMAN: This is the moment! ${attacker} has to capitalize NOW!`,
            `MERCHANT: ${hurt}'s legs are gone! Can he hold on?`,
            `FOREMAN: ${attacker} is teeing off! ${hurt} has to clinch or get out of there!`,
            `MERCHANT: ${hurt} is in survival mode. He just needs to make it to the bell.`,
            `FOREMAN: GO FOR IT! ${attacker} has him where he wants him!`,
            `MERCHANT: The instinct now is to finish. ${attacker} has to be smart but aggressive.`
          ];
          addCommentary(insights[Math.floor(Math.random() * insights.length)]);
        }
        lastCommentaryTime.current = Date.now();
      },

      foul: (data) => {
        const fouler = data.attacker === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        const victim = data.attacker === 'A'
          ? fight.fighterB.getShortName()
          : fight.fighterA.getShortName();

        // Only comment on detected fouls
        if (!data.detected) return;

        const foulName = data.foulName || 'foul';
        const foulDescription = data.description || 'commits a foul';
        const warningCount = data.warningsForThisFoul || 0;
        const totalDeductions = data.totalPointDeductions || 0;

        addAction({ text: `FOUL: ${fouler} ${foulDescription}!`, highlight: true });

        if (data.disqualification) {
          // DQ - major event - show the specific foul that caused it
          addCommentary(`LAMPLEY: STOP THE FIGHT! ${fouler.toUpperCase()} HAS BEEN DISQUALIFIED FOR ${foulName.toUpperCase()}!`);
          if (totalDeductions >= 3) {
            addCommentary(`FOREMAN: ${fouler} has lost ${totalDeductions} points tonight. The referee had no choice!`);
          } else {
            addCommentary(`FOREMAN: That ${foulName.toLowerCase()} was too flagrant. The ref has seen enough!`);
          }
          addCommentary(`MERCHANT: What a terrible way to end the fight. ${victim} wins by disqualification.`);
        } else if (data.pointDeduction) {
          // Point deduction - track it for scoring
          const foulerId = data.attacker;
          setRoundPointDeductions(prev => ({
            ...prev,
            [foulerId]: prev[foulerId] + 1
          }));

          addCommentary(`LAMPLEY: The referee is taking a point from ${fouler} for ${foulName.toLowerCase()}!`);
          if (totalDeductions >= 2) {
            addCommentary(`FOREMAN: That's ${totalDeductions} points now! One more and he could be disqualified!`);
          } else if (warningCount > 1) {
            addCommentary(`MERCHANT: ${fouler} was warned for this before. Now it costs him a point.`);
          } else {
            addCommentary(`FOREMAN: That's the right call. You have to penalize that.`);
          }
        } else if (data.warning) {
          // Warning - show warning count context
          addCommentary(`LAMPLEY: The referee is warning ${fouler} for ${foulName.toLowerCase()}.`);
          if (warningCount >= 2) {
            addCommentary(`FOREMAN: That's the ${warningCount === 2 ? 'second' : warningCount === 3 ? 'third' : 'fourth'} warning for ${foulName.toLowerCase()}! Next one will cost a point!`);
          } else {
            const followUps = [
              `FOREMAN: ${fouler} needs to be careful. Another one of those and he'll lose a point.`,
              `MERCHANT: That's borderline. The ref is keeping a close eye on ${fouler}.`,
              `FOREMAN: The referee letting him know that won't be tolerated.`
            ];
            addCommentary(followUps[Math.floor(Math.random() * followUps.length)]);
          }
        }

        lastCommentaryTime.current = Date.now();
      },

      momentumShift: (data) => {
        const { leaderName, previousName, type } = data;

        // Add to action log
        addAction({ text: `${leaderName} seizing control!`, highlight: true });

        // Commentary based on shift type
        if (type === 'TAKEOVER') {
          // Major momentum swing - previous leader loses control
          addCommentary(`LAMPLEY: ${leaderName.toUpperCase()} HAS TURNED THIS FIGHT AROUND!`);
          const takeoverComments = [
            `FOREMAN: Look at the shift in body language! ${leaderName} smells blood now!`,
            `MERCHANT: ${previousName} was in control but that's all changed! ${leaderName} has found his rhythm!`,
            `FOREMAN: This is a completely different fight now! ${leaderName} has figured him out!`,
            `MERCHANT: The momentum has swung dramatically! ${previousName} needs to stop the bleeding!`
          ];
          addCommentary(takeoverComments[Math.floor(Math.random() * takeoverComments.length)]);
        } else if (type === 'CONTROL') {
          // Taking control when it was even
          const controlComments = [
            `LAMPLEY: ${leaderName} is starting to take control of this fight!`,
            `FOREMAN: ${leaderName} is asserting himself now. He's found his range.`,
            `MERCHANT: You can see ${leaderName} gaining confidence with every exchange.`,
            `LAMPLEY: The tide is turning in ${leaderName}'s favor!`
          ];
          addCommentary(controlComments[Math.floor(Math.random() * controlComments.length)]);
        } else if (type === 'DOMINATION') {
          // Building a dominant lead
          addCommentary(`LAMPLEY: ${leaderName} is DOMINATING this fight!`);
          const domComments = [
            `FOREMAN: This is a one-sided affair right now! ${leaderName} is in complete control!`,
            `MERCHANT: I don't see how ${previousName || 'his opponent'} can turn this around!`,
            `FOREMAN: ${leaderName} is putting on a clinic out there!`,
            `MERCHANT: The corner needs to make an adjustment or this fight is getting away from them!`
          ];
          addCommentary(domComments[Math.floor(Math.random() * domComments.length)]);
        }

        lastCommentaryTime.current = Date.now();
      },

      fightEnd: (data) => {
        setIsEnded(true);

        // Get full fighter names for Buffer announcement
        const winner = data.winner === 'A' ? fight.fighterA : data.winner === 'B' ? fight.fighterB : null;
        const loser = data.winner === 'A' ? fight.fighterB : data.winner === 'B' ? fight.fighterA : null;
        const winnerName = winner?.getShortName() || null;
        const winnerFullName = winner?.name || winnerName;
        const loserName = loser?.getShortName() || null;

        // Format method for display (TKO_REFEREE -> TKO, DECISION_UNANIMOUS -> UD, etc.)
        const formatMethod = (method) => {
          if (!method) return 'Unknown';
          if (method === 'KO') return 'KO';
          if (method.startsWith('TKO')) return 'TKO';
          if (method === 'DECISION_UNANIMOUS') return 'UD';
          if (method === 'DECISION_MAJORITY') return 'MD';
          if (method === 'DECISION_SPLIT') return 'SD';
          if (method.startsWith('DRAW')) return 'DRAW';
          if (method === 'DISQUALIFICATION') return 'DQ';
          if (method === 'NO_CONTEST') return 'NC';
          return method;
        };

        const displayMethod = formatMethod(data.method);

        // Format time for announcement
        const formatTime = (seconds) => {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Store formatted result for status bar
        setResult({
          ...data,
          winnerName,
          displayMethod
        });

        // Commentary team reaction first - with detailed KO breakdown
        if (data.method === 'KO' || data.method?.startsWith('TKO')) {
          addCommentary(`LAMPLEY: IT'S OVER! ${winnerName?.toUpperCase()} WINS BY ${displayMethod}!`);

          // Show finishing sequence details
          if (data.finishingPunch) {
            addCommentary('');
            addCommentary('═══════════ FINISHING SEQUENCE ═══════════');

            // Format punch type for display
            const punchName = formatPunch(data.finishingPunch);
            const location = data.finishingLocation || 'head';

            addCommentary(`LAMPLEY: The finishing blow - a ${punchName.toUpperCase()} to the ${location.toUpperCase()}!`);

            if (data.finishingDamage) {
              const dmgDesc = data.finishingDamage >= 8 ? 'DEVASTATING' :
                             data.finishingDamage >= 5 ? 'powerful' : 'precise';
              addCommentary(`FOREMAN: What a ${dmgDesc} shot! That punch did ${data.finishingDamage} damage!`);
            }

            if (data.wasCounter) {
              addCommentary(`MERCHANT: It was a counter punch! ${loserName} walked right into it!`);
            }

            // Fighter condition at stoppage
            if (data.loserHealth !== undefined || data.loserStamina !== undefined) {
              const healthPct = data.loserHealth || 0;
              const staminaPct = data.loserStamina || 0;
              addCommentary(`FOREMAN: ${loserName} was at ${healthPct}% health, ${staminaPct}% stamina when it ended.`);
            }

            // Knockdown count
            if (data.totalKnockdowns && data.totalKnockdowns > 0) {
              if (data.knockdownsInRound && data.knockdownsInRound > 1) {
                addCommentary(`LAMPLEY: That was knockdown #${data.knockdownsInRound} of the round, #${data.totalKnockdowns} of the fight!`);
              } else if (data.totalKnockdowns > 1) {
                addCommentary(`LAMPLEY: ${loserName} had been down ${data.totalKnockdowns} times total in this fight.`);
              }
            }

            // TKO specific reason
            if (data.method?.startsWith('TKO') && data.tkoReason) {
              const reasonText = {
                'exhaustion_and_damage': `${loserName} was exhausted and taking too much punishment.`,
                'damage': `${loserName} had absorbed too much damage to continue.`,
                'body_damage': `${loserName} couldn't recover from that body work.`,
                'three_knockdowns': `Three knockdowns in one round - the referee had to stop it.`,
                'accumulation': `The accumulation of punishment was too much.`
              };
              if (reasonText[data.tkoReason]) {
                addCommentary(`MERCHANT: ${reasonText[data.tkoReason]}`);
              }
            }

            addCommentary('═══════════════════════════════════════════');
            addCommentary('');
          }

          addCommentary(`FOREMAN: What a performance! ${winnerName} was simply too much tonight!`);
        } else if (data.method?.startsWith('DECISION')) {
          addCommentary(`LAMPLEY: We go to the scorecards!`);
        } else if (data.method?.startsWith('DRAW')) {
          addCommentary(`LAMPLEY: This fight is ruled a ${displayMethod}!`);
          addCommentary(`FOREMAN: Neither man could pull away. What a battle!`);
        } else if (data.method === 'DISQUALIFICATION') {
          addCommentary(`LAMPLEY: IT'S A DISQUALIFICATION!`);
          addCommentary(`FOREMAN: You can't do that in the ring. That's against the rules!`);
        } else if (data.method === 'NO_CONTEST') {
          addCommentary(`LAMPLEY: This fight has been ruled a NO CONTEST!`);
        }

        // Michael Buffer's official announcement
        addCommentary('');
        addCommentary('═══════════════════════════════════════════');
        addCommentary('BUFFER: Ladies and gentlemen...');

        if (data.method === 'KO') {
          addCommentary(`BUFFER: At ${formatTime(data.time)} of round ${data.round}...`);
          addCommentary(`BUFFER: The referee stops the contest for KNOCKOUT!`);
          addCommentary(`BUFFER: Your winner... ${winnerFullName?.toUpperCase()}!`);
        } else if (data.method?.startsWith('TKO')) {
          const tkoReason = data.method === 'TKO_CORNER' ? 'corner stoppage' :
                           data.method === 'TKO_REFEREE' ? 'referee stoppage' :
                           data.method === 'TKO_DOCTOR' ? 'doctor stoppage' : 'technical knockout';
          addCommentary(`BUFFER: At ${formatTime(data.time)} of round ${data.round}...`);
          addCommentary(`BUFFER: The referee stops the contest for ${tkoReason.toUpperCase()}!`);
          addCommentary(`BUFFER: Your winner by TKO... ${winnerFullName?.toUpperCase()}!`);
        } else if (data.method === 'DECISION_UNANIMOUS') {
          addCommentary(`BUFFER: After ${data.round} rounds, we go to the scorecards...`);
          if (data.scores) {
            data.scores.forEach((score, i) => {
              addCommentary(`BUFFER: Judge ${i + 1} scores the bout ${score.A}-${score.B}...`);
            });
          }
          addCommentary(`BUFFER: For the winner by UNANIMOUS DECISION...`);
          addCommentary(`BUFFER: ${winnerFullName?.toUpperCase()}!`);
        } else if (data.method === 'DECISION_SPLIT') {
          addCommentary(`BUFFER: After ${data.round} rounds, we have a SPLIT DECISION...`);
          if (data.scores) {
            data.scores.forEach((score, i) => {
              addCommentary(`BUFFER: Judge ${i + 1} scores the bout ${score.A}-${score.B}...`);
            });
          }
          addCommentary(`BUFFER: Your winner... ${winnerFullName?.toUpperCase()}!`);
        } else if (data.method === 'DECISION_MAJORITY') {
          addCommentary(`BUFFER: After ${data.round} rounds, we have a MAJORITY DECISION...`);
          if (data.scores) {
            data.scores.forEach((score, i) => {
              addCommentary(`BUFFER: Judge ${i + 1} scores the bout ${score.A}-${score.B}...`);
            });
          }
          addCommentary(`BUFFER: Your winner... ${winnerFullName?.toUpperCase()}!`);
        } else if (data.method?.startsWith('DRAW')) {
          addCommentary(`BUFFER: After ${data.round} rounds, we go to the scorecards...`);
          if (data.scores) {
            data.scores.forEach((score, i) => {
              addCommentary(`BUFFER: Judge ${i + 1} scores the bout ${score.A}-${score.B}...`);
            });
          }
          addCommentary(`BUFFER: This bout is declared a DRAW!`);
        } else if (data.method === 'DISQUALIFICATION') {
          addCommentary(`BUFFER: At ${formatTime(data.time)} of round ${data.round}...`);
          addCommentary(`BUFFER: ${loserName?.toUpperCase()} has been DISQUALIFIED!`);
          addCommentary(`BUFFER: Your winner... ${winnerFullName?.toUpperCase()}!`);
        }

        addCommentary('═══════════════════════════════════════════');
      },

      speedChange: (speed) => {
        setCurrentSpeed(speed);
      }
    };

    for (const [event, handler] of Object.entries(handlers)) {
      simulation.on(event, handler);
    }

    return () => {
      for (const event of Object.keys(handlers)) {
        simulation.off?.(event, handlers[event]);
      }
    };
  }, [simulation, fight, commentaryGen, stateA, stateB, statsA, statsB, roundScores, roundPointDeductions]);

  const addAction = useCallback((action) => {
    setActions(prev => [...prev.slice(-9), action]);
  }, []);

  const addCommentary = useCallback((text) => {
    setCommentary(prev => {
      // Prevent duplicate consecutive commentary
      if (prev.length > 0 && prev[prev.length - 1] === text) {
        return prev;
      }
      return [...prev.slice(-9), text];
    });
  }, []);

  // Input handling
  useInput((input, key) => {
    if (isBetweenRounds && tui) {
      tui.continueToNextRound();
      return;
    }

    if (key.escape || input === 'q') {
      tui?.destroy();
      exit();
    } else if (input === 'p' || input === ' ') {
      if (simulation) {
        if (isPaused) {
          simulation.resume?.();
          setIsPaused(false);
        } else {
          simulation.pause?.();
          setIsPaused(true);
        }
      }
    } else if (input === '+' || input === '=') {
      if (simulation) {
        const newSpeed = Math.min(10, (simulation.options?.speedMultiplier || 1) * 1.5);
        simulation.setSpeed?.(newSpeed);
      }
    } else if (input === '-') {
      if (simulation) {
        const newSpeed = Math.max(0.1, (simulation.options?.speedMultiplier || 1) / 1.5);
        simulation.setSpeed?.(newSpeed);
      }
    }
  });

  if (!fight) {
    return e(Box, { padding: 2 },
      e(Text, { color: theme.commentary }, 'Waiting for fight to start...')
    );
  }

  // Main layout - Symmetric HBO Style
  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },

    // Row 1: Fighter A | Round Timer | Fighter B (symmetric)
    e(Box, { flexDirection: 'row', justifyContent: 'center', paddingX: 1, gap: 2 },
      e(FighterPanel, { fighter: fight.fighterA, state: stateA, corner: 'A' }),
      e(RoundTimer, {
        round,
        time,
        maxRounds: fight.config?.rounds || 12,
        isPaused,
        knockdownsA: stateA?.knockdowns?.total || 0,
        knockdownsB: stateB?.knockdowns?.total || 0
      }),
      e(FighterPanel, { fighter: fight.fighterB, state: stateB, corner: 'B' })
    ),

    // Row 2: Tale of the Tape | Ring | CompuBox (centered stats row)
    e(Box, { flexDirection: 'row', justifyContent: 'center', paddingX: 1, gap: 1 },
      e(TaleOfTheTape, { fighterA: fight.fighterA, fighterB: fight.fighterB, odds: fightOdds }),
      e(RingDisplay, { positions }),
      e(CompuBoxPanel, { statsA, statsB, fighterA: fight.fighterA, fighterB: fight.fighterB })
    ),

    // Row 3: Lederman Scorecard (full width)
    e(Box, { flexDirection: 'row', justifyContent: 'center', paddingX: 1, gap: 1 },
      e(LedermanScorecard, { scores: roundScores, currentRound: round, fighterA: fight.fighterA, fighterB: fight.fighterB, maxRounds: fight.config?.rounds || 12 })
    ),

    // Row 4: Action Log + Commentary (full width)
    e(Box, { flexDirection: 'row', justifyContent: 'center', paddingX: 1, gap: 1 },
      e(ActionPanel, { actions, maxActions: 5 }),
      e(CommentaryPanel, { lines: commentary, maxLines: 5 })
    ),

    // Status bar
    e(StatusBar, {
      left: isPaused ? 'PAUSED' : (isEnded ? 'ENDED' : 'LIVE'),
      center: isEnded ? (result?.winnerName ? `${result.winnerName} wins by ${result.displayMethod}` : 'DRAW') : '',
      right: `[Q]uit [P]ause [+/-]Speed: ${currentSpeed.toFixed(1)}x`
    }),

    // Knockdown overlay
    knockdownOverlay && e(KnockdownOverlay, {
      fighter: knockdownOverlay.fighter,
      count: knockdownOverlay.count,
      onDismiss: () => setKnockdownOverlay(null)
    })
  );
}

/**
 * InkArcadeTUI Class - Wrapper for programmatic usage
 */
export class InkArcadeTUI {
  constructor(options = {}) {
    this.options = options;
    this.theme = options.theme || DEFAULT_THEME;
    this.fight = null;
    this.simulation = null;
    this.inkInstance = null;
    this.exitPromise = null;
    this.exitResolve = null;
    this.nextRoundResolve = null;
  }

  initialize() {
    this.exitPromise = new Promise(resolve => {
      this.exitResolve = resolve;
    });
  }

  startFight(fight, simulation) {
    this.fight = fight;
    this.simulation = simulation;

    this.inkInstance = render(
      e(ThemeProvider, { themeName: this.theme },
        e(FightDisplay, { fight, simulation, tui: this })
      )
    );
  }

  waitForNextRound(timeout = 5000) {
    return new Promise((resolve) => {
      let resolved = false;

      const doResolve = () => {
        if (!resolved) {
          resolved = true;
          this.nextRoundResolve = null;
          resolve();
        }
      };

      this.nextRoundResolve = doResolve;

      setTimeout(() => {
        doResolve();
      }, timeout);
    });
  }

  continueToNextRound() {
    if (this.nextRoundResolve) {
      this.nextRoundResolve();
    }
  }

  async waitForExit() {
    return this.exitPromise;
  }

  destroy() {
    // Stop the simulation first
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.inkInstance) {
      this.inkInstance.unmount();
    }
    if (this.exitResolve) {
      this.exitResolve();
    }
  }
}

export default InkArcadeTUI;
