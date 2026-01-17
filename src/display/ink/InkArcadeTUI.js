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

  const name = fighter.getShortName?.() || fighter.name || 'Unknown';

  // Format effects inline
  const effectsText = [...buffs.slice(0, 2).map(b => `+${getEffectName(b.type)}`),
                       ...debuffs.slice(0, 1).map(d => `-${getEffectName(d.type)}`)].join(' ');

  return e(Box, {
    flexDirection: 'column',
    borderStyle: isHurt ? 'double' : 'round',
    borderColor: isHurt ? theme.hurt : cornerColor,
    paddingX: 1,
    paddingY: 0,
    width: 32
  },
    // Name
    e(Text, { bold: true, color: cornerColor }, name),

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
    effectsText && e(Text, {
      color: '#88ff88',
      dimColor: true
    }, effectsText)
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

  const nameA = fighterA?.getShortName?.() || 'Fighter A';
  const nameB = fighterB?.getShortName?.() || 'Fighter B';

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: 36
  },
    e(Text, { bold: true, color: theme.punch }, 'COMPUBOX PUNCH STATS'),
    e(Box, { height: 1 }),

    // Header row with fighter names
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA, bold: true }, nameA.substring(0, 10).padEnd(10)),
      e(Text, { color: theme.commentary }, '          '),
      e(Text, { color: theme.fighterB, bold: true }, nameB.substring(0, 10))
    ),

    e(Box, { height: 1 }),

    // Stats rows
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${a.landed}/${a.thrown}`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, 'TOTAL     '),
      e(Text, { color: theme.fighterB }, `${b.landed}/${b.thrown}`)
    ),
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${accA}%`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, 'ACCURACY  '),
      e(Text, { color: theme.fighterB }, `${accB}%`)
    ),
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${a.jabsLanded}/${a.jabsThrown}`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, 'JABS      '),
      e(Text, { color: theme.fighterB }, `${b.jabsLanded}/${b.jabsThrown}`)
    ),
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.fighterA }, `${a.powerLanded}/${a.powerThrown}`.padEnd(10)),
      e(Text, { color: theme.commentary, dimColor: true }, 'POWER     '),
      e(Text, { color: theme.fighterB }, `${b.powerLanded}/${b.powerThrown}`)
    )
  );
}

/**
 * Harold Lederman Scorecard - Compact horizontal layout
 * Shows round scores in a single row, doesn't grow with rounds
 */
function LedermanScorecard({ scores, currentRound, fighterA, fighterB, maxRounds = 12 }) {
  const theme = useTheme();

  const nameA = fighterA?.getShortName?.()?.substring(0, 6) || 'A';
  const nameB = fighterB?.getShortName?.()?.substring(0, 6) || 'B';

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
  const NAME_WIDTH = 7; // Fighter name column

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
    borderColor: '#FFD700',
    paddingX: 1,
    paddingY: 0,
    width: totalWidth
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

  const hasKnockdowns = knockdownsA > 0 || knockdownsB > 0;

  return e(Box, {
    flexDirection: 'column',
    alignItems: 'center',
    borderStyle: 'double',
    borderColor: theme.round,
    paddingX: 2,
    paddingY: 0
  },
    e(Text, { bold: true, color: theme.round }, `ROUND ${round}/${maxRounds}`),
    e(Text, { bold: true, color: theme.timer }, `${mins}:${secs.toString().padStart(2, '0')}`),

    // Knockdown display - always show if any knockdowns occurred
    hasKnockdowns && e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: knockdownsA > 0 ? theme.knockdown : theme.commentary, bold: knockdownsA > 0 },
        `KD: ${knockdownsA}`),
      e(Text, { color: theme.commentary }, ' - '),
      e(Text, { color: knockdownsB > 0 ? theme.knockdown : theme.commentary, bold: knockdownsB > 0 },
        `${knockdownsB}`)
    ),

    isPaused && e(Text, { color: theme.hurt, bold: true }, 'PAUSED')
  );
}

/**
 * Commentary Box - HBO broadcast team style
 */
function CommentaryPanel({ lines = [], maxLines = 6 }) {
  const theme = useTheme();
  const displayLines = lines.slice(-maxLines);

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    flexGrow: 1
  },
    e(Text, { bold: true, color: theme.commentary }, ' BROADCAST TEAM'),
    e(Box, { marginTop: 1, flexDirection: 'column', height: maxLines },
      ...displayLines.map((line, i) => {
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

        const isLatest = i === displayLines.length - 1;

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

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: 44
  },
    e(Text, { bold: true, color: theme.punch }, ' RECENT ACTION'),
    e(Box, { marginTop: 1, flexDirection: 'column' },
      ...displayActions.map((action, i) => {
        const isLatest = i === displayActions.length - 1;
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

  const commentaryGen = useRef(new CommentaryGenerator()).current;
  const lastCommentaryTime = useRef(0);

  // Initialize commentary generator
  useEffect(() => {
    if (fight) {
      commentaryGen.initialize(fight.fighterA, fight.fighterB);
      addCommentary(`LAMPLEY: Welcome to the ring for what promises to be an exciting bout!`);
    }
  }, [fight, commentaryGen]);

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
      },

      roundStart: (data) => {
        setRound(data.round);
        setTime(0);
        setIsBetweenRounds(false);
        setRoundPointDeductions({ A: 0, B: 0 }); // Reset point deductions for new round

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

        // Score the round
        const statsAround = stateA?.fightStats || statsA;
        const statsBround = stateB?.fightStats || statsB;
        const landedA = statsAround?.punchesLanded || statsAround?.punches_landed || 0;
        const landedB = statsBround?.punchesLanded || statsBround?.punches_landed || 0;

        // Simple scoring: more punches = 10, fewer = 9, knockdown = -1
        let scoreA = landedA >= landedB ? 10 : 9;
        let scoreB = landedB >= landedA ? 10 : 9;

        // Adjust for knockdowns this round
        const kdA = stateA?.roundKnockdowns || 0;
        const kdB = stateB?.roundKnockdowns || 0;
        scoreA -= kdA;
        scoreB -= kdB;

        // Adjust for point deductions this round
        scoreA -= roundPointDeductions.A;
        scoreB -= roundPointDeductions.B;

        setRoundScores(prev => [...prev, { a: scoreA, b: scoreB }]);

        addCommentary(`LAMPLEY: That's the end of Round ${data.round}!`);

        // Insightful round analysis
        const landedDiff = Math.abs(landedA - landedB);
        const pointDeductionA = roundPointDeductions.A;
        const pointDeductionB = roundPointDeductions.B;

        // Mention point deductions first - they're significant
        if (pointDeductionA > 0 || pointDeductionB > 0) {
          const penalizedFighter = pointDeductionA > 0 ? nameA : nameB;
          const pointsLost = pointDeductionA > 0 ? pointDeductionA : pointDeductionB;
          addCommentary(`LEDERMAN: Don't forget, ${penalizedFighter} lost ${pointsLost} point${pointsLost > 1 ? 's' : ''} this round!`);
          addCommentary(`MERCHANT: That point deduction could be crucial on the scorecards.`);
        }

        if (kdA > 0 || kdB > 0) {
          const scorer = kdA > 0 ? nameB : nameA;
          addCommentary(`MERCHANT: That knockdown makes it a clear round for ${scorer}.`);
        } else if (landedDiff > 10) {
          const winner = landedA > landedB ? nameA : nameB;
          addCommentary(`FOREMAN: ${winner} dominated that round. Landed ${Math.max(landedA, landedB)} punches.`);
        } else if (landedDiff <= 3) {
          addCommentary(`MERCHANT: Very close round. Could go either way on the cards.`);
        } else {
          const roundWinner = scoreA > scoreB ? nameA : nameB;
          addCommentary(`FOREMAN: I give that round to ${roundWinner}. Good work.`);
        }

        // Lederman's scoring
        const totalA = roundScores.reduce((sum, s) => sum + s.a, 0) + scoreA;
        const totalB = roundScores.reduce((sum, s) => sum + s.b, 0) + scoreB;
        const leader = totalA > totalB ? nameA : totalB > totalA ? nameB : null;
        const margin = Math.abs(totalA - totalB);

        if (leader) {
          if (margin >= 3) {
            addCommentary(`LEDERMAN: I have it ${totalA}-${totalB}. ${leader} is building a lead.`);
          } else {
            addCommentary(`LEDERMAN: My card shows ${totalA}-${totalB}. ${leader} narrowly ahead.`);
          }
        } else {
          addCommentary(`LEDERMAN: I have it ${totalA}-${totalB}. Dead even on my card!`);
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
            `FOREMAN: ${defender} took that right on the chin. His equilibrium is gone!`
          ];
          addCommentary(insights[Math.floor(Math.random() * insights.length)]);
          lastCommentaryTime.current = now;
        } else if (damage >= 5 && timeSinceLastCommentary > 1500) {
          // Big shot - tactical commentary
          const comments = [
            `LAMPLEY: Beautiful ${punchName} by ${attacker}!`,
            `FOREMAN: ${attacker} is timing that ${punchName} perfectly.`,
            `MERCHANT: That's the kind of punch that wins rounds.`,
            `LAMPLEY: ${attacker} is starting to find his range now!`,
            `FOREMAN: ${defender} walked right into that one!`
          ];
          addCommentary(comments[Math.floor(Math.random() * comments.length)]);

          // Add tactical follow-up based on context
          if (defenderHealth < 0.5 && Math.random() > 0.5) {
            addCommentary(`MERCHANT: ${defender} is absorbing a lot of punishment. How much more can he take?`);
          } else if (isBody && Math.random() > 0.6) {
            addCommentary(`FOREMAN: That body work is going to pay dividends in the later rounds.`);
          }
          lastCommentaryTime.current = now;
        } else if (damage >= 3 && timeSinceLastCommentary > 3000) {
          // Solid shot - style-based commentary
          if (Math.random() > 0.4) {
            const styleComments = {
              'swarmer': [`FOREMAN: ${attacker} keeps the pressure on!`, `LAMPLEY: ${attacker} is smothering ${defender} with punches.`],
              'out-boxer': [`MERCHANT: ${attacker} is boxing beautifully from the outside.`, `LAMPLEY: That jab is finding a home.`],
              'slugger': [`FOREMAN: ${attacker} is loading up on every punch!`, `LAMPLEY: ${attacker} looking for the big one.`],
              'counter-puncher': [`MERCHANT: Beautiful timing from ${attacker}.`, `FOREMAN: ${attacker} is making ${defender} pay for every miss.`],
              'boxer-puncher': [`LAMPLEY: ${attacker} showing his versatility tonight.`, `FOREMAN: He can box and he can punch!`]
            };
            const comments = styleComments[attackerStyle] || [`LAMPLEY: Good ${punchName} lands for ${attacker}.`];
            addCommentary(comments[Math.floor(Math.random() * comments.length)]);
            lastCommentaryTime.current = now;
          }
        } else if (timeSinceLastCommentary > 6000 && Math.random() > 0.7) {
          // Periodic insight even on lighter action
          const insights = [
            `FOREMAN: ${attacker} is staying busy. That's good ring generalship.`,
            `MERCHANT: The punch stats are starting to favor ${attacker} in this round.`,
            `LAMPLEY: ${attacker} is controlling the distance well.`,
            `FOREMAN: I like what ${attacker} is doing here. Smart boxing.`
          ];
          if (defenderStamina < 0.4) {
            insights.push(`MERCHANT: ${defender} is slowing down. You can see the fatigue setting in.`);
            insights.push(`FOREMAN: ${defender}'s punch output has dropped. He looks tired.`);
          }
          if (attackerState?.stamina?.percent < 0.4) {
            insights.push(`LAMPLEY: ${attacker} is breathing heavy. This pace might be catching up with him.`);
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
        addCommentary(`LAMPLEY: DOWN GOES ${downed.toUpperCase()}! DOWN GOES ${downed.toUpperCase()}!`);

        // Contextual follow-up
        const followUps = [
          `FOREMAN: ${scorer} caught him clean! That punch had bad intentions!`,
          `MERCHANT: ${downed} didn't see that coming! Perfect timing from ${scorer}!`,
          `FOREMAN: Look at ${downed}'s legs! They're all over the place!`,
          `MERCHANT: That's the kind of punch that changes fights!`
        ];
        addCommentary(followUps[Math.floor(Math.random() * followUps.length)]);

        if (knockdownCount >= 2) {
          addCommentary(`LAMPLEY: That's the ${knockdownCount === 2 ? 'second' : 'third'} knockdown! ${downed} is in serious trouble!`);
        }

        setKnockdownOverlay({ fighter: downed, count: 1 });
        lastCommentaryTime.current = Date.now();
      },

      count: (data) => {
        setKnockdownOverlay(prev => prev ? { ...prev, count: data.count } : null);
        if (data.count === 8) {
          addCommentary(`LAMPLEY: The count reaches eight... can he beat it?`);
        }
      },

      recovered: () => {
        const fighter = knockdownOverlay?.fighter || 'He';
        setKnockdownOverlay(null);
        const recoveries = [
          `LAMPLEY: ${fighter} is up! The fight continues!`,
          `FOREMAN: ${fighter} beats the count! But look at those legs!`,
          `MERCHANT: ${fighter} is back up, but is he really there?`,
          `LAMPLEY: ${fighter} survives! Can he hold on?`
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

        addAction({ text: `${hurt} IS HURT!`, highlight: true });

        const hurtCalls = [
          `LAMPLEY: ${hurt} is in trouble! He's hurt badly!`,
          `LAMPLEY: ${hurt} is HURT! His legs buckled!`,
          `LAMPLEY: OH! ${hurt} is in serious trouble here!`
        ];
        addCommentary(hurtCalls[Math.floor(Math.random() * hurtCalls.length)]);

        // Tactical follow-up based on stamina
        if (stamina < 0.3) {
          addCommentary(`FOREMAN: ${hurt} is exhausted AND hurt! This could be it!`);
        } else {
          const insights = [
            `FOREMAN: ${attacker} smells blood! He needs to finish this!`,
            `MERCHANT: ${hurt} needs to survive these next few seconds!`,
            `FOREMAN: This is the moment! ${attacker} has to capitalize NOW!`,
            `MERCHANT: ${hurt}'s legs are gone! Can he hold on?`
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
        const { leaderName, previousName, magnitude, type, round } = data;

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

        // Convert winner 'A'/'B' to fighter name and format method
        const winnerName = data.winner === 'A'
          ? fight.fighterA.getShortName()
          : data.winner === 'B'
            ? fight.fighterB.getShortName()
            : null;

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

        // Store formatted result for status bar
        setResult({
          ...data,
          winnerName,
          displayMethod
        });

        if (data.method === 'KO' || data.method?.startsWith('TKO')) {
          addCommentary(`LAMPLEY: IT'S OVER! ${winnerName?.toUpperCase()} WINS BY ${displayMethod}!`);
          addCommentary(`FOREMAN: What a performance! ${winnerName} was simply too much tonight!`);
        } else if (data.method?.startsWith('DECISION')) {
          addCommentary(`LAMPLEY: We go to the scorecards!`);
          addCommentary(`LAMPLEY: And the winner by ${displayMethod}... ${winnerName?.toUpperCase()}!`);
        } else if (data.method?.startsWith('DRAW')) {
          addCommentary(`LAMPLEY: This fight is ruled a ${displayMethod}!`);
          addCommentary(`FOREMAN: Neither man could pull away. What a battle!`);
        } else if (data.method === 'DISQUALIFICATION') {
          addCommentary(`LAMPLEY: IT'S A DISQUALIFICATION! ${winnerName?.toUpperCase()} WINS!`);
          addCommentary(`FOREMAN: You can't do that in the ring. That's against the rules!`);
        } else if (data.method === 'NO_CONTEST') {
          addCommentary(`LAMPLEY: This fight has been ruled a NO CONTEST!`);
          addCommentary(`FOREMAN: An unfortunate end to what was shaping up to be a good fight.`);
        } else {
          addCommentary(`LAMPLEY: The fight is over! ${winnerName || 'DRAW'}!`);
        }
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

    // Row 2: Ring | CompuBox | Lederman (centered stats row)
    e(Box, { flexDirection: 'row', justifyContent: 'center', paddingX: 1, gap: 1 },
      e(RingDisplay, { positions }),
      e(CompuBoxPanel, { statsA, statsB, fighterA: fight.fighterA, fighterB: fight.fighterB }),
      e(LedermanScorecard, { scores: roundScores, currentRound: round, fighterA: fight.fighterA, fighterB: fight.fighterB, maxRounds: fight.config?.rounds || 12 })
    ),

    // Row 3: Action Log + Commentary (full width)
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
