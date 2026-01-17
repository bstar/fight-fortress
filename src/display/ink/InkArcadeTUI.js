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
  const knockdowns = state?.knockdowns?.total || 0;
  const isHurt = fighterState === 'HURT' || fighterState === 'STUNNED';

  const name = fighter.getShortName?.() || fighter.name || 'Unknown';

  return e(Box, {
    flexDirection: 'column',
    borderStyle: isHurt ? 'double' : 'round',
    borderColor: isHurt ? theme.hurt : cornerColor,
    padding: 1,
    width: 34
  },
    // Name and corner
    e(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      e(Text, { bold: true, color: cornerColor }, name),
      e(Text, { color: cornerColor, dimColor: true }, `[${corner}]`)
    ),

    // Style
    e(Text, { dimColor: true, wrap: 'truncate' }, fighter.style?.primary || 'Unknown Style'),

    e(Box, { height: 1 }),

    // Health bar
    e(StatBar, {
      label: 'HP',
      value: health,
      max: 100,
      width: 18,
      color: theme.health,
      lowColor: theme.healthLow,
      lowThreshold: 30,
      reverse: isRight
    }),

    // Stamina bar
    e(StatBar, {
      label: 'STA',
      value: stamina,
      max: 100,
      width: 18,
      color: theme.stamina,
      lowColor: theme.staminaLow,
      lowThreshold: 25,
      reverse: isRight
    }),

    e(Box, { height: 1 }),

    // State and knockdowns
    e(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      e(Text, {
        color: isHurt ? theme.hurt : theme.foreground,
        bold: isHurt
      }, fighterState),
      knockdowns > 0 && e(Text, { color: theme.knockdown, bold: true }, `KD: ${knockdowns}`)
    )
  );
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
 * Harold Lederman Scorecard - Round by round scoring
 */
function LedermanScorecard({ scores, currentRound, fighterA, fighterB }) {
  const theme = useTheme();

  const nameA = fighterA?.getShortName?.() || 'A';
  const nameB = fighterB?.getShortName?.() || 'B';

  // Calculate totals
  let totalA = 0;
  let totalB = 0;
  const roundScores = scores || [];

  roundScores.forEach(score => {
    totalA += score.a || 0;
    totalB += score.b || 0;
  });

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: 28
  },
    e(Text, { bold: true, color: '#FFD700' }, "LEDERMAN'S CARD"),
    e(Box, { height: 1 }),

    // Header
    e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.commentary, dimColor: true }, 'RND '),
      e(Text, { color: theme.fighterA, bold: true }, nameA.substring(0, 6).padEnd(7)),
      e(Text, { color: theme.fighterB, bold: true }, nameB.substring(0, 6))
    ),

    // Round scores
    ...roundScores.slice(0, 12).map((score, i) =>
      e(Box, { key: i, flexDirection: 'row' },
        e(Text, { color: theme.commentary }, ` ${(i + 1).toString().padStart(2)}  `),
        e(Text, { color: score.a > score.b ? theme.fighterA : theme.foreground }, `${score.a}`.padEnd(7)),
        e(Text, { color: score.b > score.a ? theme.fighterB : theme.foreground }, `${score.b}`)
      )
    ),

    // Show placeholder for current round if in progress
    currentRound > roundScores.length && e(Box, { flexDirection: 'row' },
      e(Text, { color: theme.commentary }, ` ${currentRound.toString().padStart(2)}  `),
      e(Text, { color: theme.commentary, dimColor: true }, '-      -')
    ),

    e(Box, { height: 1 }),

    // Totals
    e(Box, { flexDirection: 'row' },
      e(Text, { bold: true, color: theme.commentary }, 'TOT '),
      e(Text, { bold: true, color: totalA >= totalB ? theme.fighterA : theme.foreground }, `${totalA}`.padEnd(7)),
      e(Text, { bold: true, color: totalB >= totalA ? theme.fighterB : theme.foreground }, `${totalB}`)
    )
  );
}

/**
 * Round Timer Display
 */
function RoundTimer({ round, time, maxRounds = 12, isPaused }) {
  const theme = useTheme();
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);

  return e(Box, {
    flexDirection: 'column',
    alignItems: 'center',
    borderStyle: 'double',
    borderColor: theme.round,
    paddingX: 3,
    paddingY: 1
  },
    e(Text, { bold: true, color: theme.round }, `ROUND ${round} of ${maxRounds}`),
    e(Text, { bold: true, color: theme.timer }, `${mins}:${secs.toString().padStart(2, '0')}`),
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
    width: 32
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
        addCommentary(`LAMPLEY: Round ${data.round} is underway!`);
        if (data.round > 1) {
          addCommentary(`FOREMAN: Both fighters coming out ${Math.random() > 0.5 ? 'aggressively' : 'cautiously'} to start this round.`);
        }
      },

      roundEnd: (data) => {
        setIsBetweenRounds(true);

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

        setRoundScores(prev => [...prev, { a: scoreA, b: scoreB }]);

        addCommentary(`LAMPLEY: That's the end of Round ${data.round}!`);

        // Lederman commentary
        const totalA = roundScores.reduce((sum, s) => sum + s.a, 0) + scoreA;
        const totalB = roundScores.reduce((sum, s) => sum + s.b, 0) + scoreB;
        const leader = totalA > totalB ? fight.fighterA.getShortName() : fight.fighterB.getShortName();
        addCommentary(`LEDERMAN: I have it ${totalA}-${totalB}. ${leader} is ahead on my card.`);
      },

      punchLanded: (data) => {
        const attacker = data.attacker === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        const defender = data.attacker === 'A'
          ? fight.fighterB.getShortName()
          : fight.fighterA.getShortName();
        const punchName = formatPunch(data.punchType);
        const damage = data.damage || 0;

        // Always add to action log
        const actionText = `${attacker} lands ${punchName}`;
        const isBig = damage >= 5;
        addAction({ text: actionText, highlight: isBig, isBig });

        // Commentary based on damage
        const now = Date.now();
        const timeSinceLastCommentary = now - lastCommentaryTime.current;

        if (damage >= 8) {
          // Devastating shot - always comment
          addCommentary(`LAMPLEY: OH! ${attacker.toUpperCase()} LANDS A HUGE ${punchName.toUpperCase()}!`);
          addCommentary(`FOREMAN: That hurt ${defender}! You can see it in his legs!`);
          lastCommentaryTime.current = now;
        } else if (damage >= 5 && timeSinceLastCommentary > 2000) {
          // Big shot - comment if not too recent
          const comments = [
            `LAMPLEY: Beautiful ${punchName} by ${attacker}!`,
            `FOREMAN: ${attacker} is finding a home for that ${punchName}.`,
            `MERCHANT: That's the kind of punch that wins rounds.`
          ];
          addCommentary(comments[Math.floor(Math.random() * comments.length)]);
          lastCommentaryTime.current = now;
        } else if (damage >= 3 && timeSinceLastCommentary > 4000 && Math.random() > 0.6) {
          // Solid shot - occasional comment
          const comments = [
            `LAMPLEY: Good ${punchName} lands for ${attacker}.`,
            `FOREMAN: ${attacker} is working well tonight.`
          ];
          addCommentary(comments[Math.floor(Math.random() * comments.length)]);
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

        addAction({ text: `KNOCKDOWN! ${downed} IS DOWN!`, highlight: true });
        addCommentary(`LAMPLEY: DOWN GOES ${downed.toUpperCase()}! DOWN GOES ${downed.toUpperCase()}!`);
        addCommentary(`FOREMAN: ${scorer} caught him clean! The referee is counting!`);
        setKnockdownOverlay({ fighter: downed, count: 1 });
        lastCommentaryTime.current = Date.now();
      },

      count: (data) => {
        setKnockdownOverlay(prev => prev ? { ...prev, count: data.count } : null);
      },

      recovered: () => {
        setKnockdownOverlay(null);
        addCommentary(`LAMPLEY: He's up! The fight continues!`);
      },

      hurt: (data) => {
        const hurt = data.fighter === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        addAction({ text: `${hurt} IS HURT!`, highlight: true });
        addCommentary(`LAMPLEY: ${hurt} is in trouble!`);
        addCommentary(`FOREMAN: He needs to hold on here!`);
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
        } else {
          addCommentary(`LAMPLEY: The fight is over! ${winnerName || 'DRAW'}!`);
        }
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
  }, [simulation, fight, commentaryGen, stateA, stateB, statsA, statsB, roundScores]);

  const addAction = useCallback((action) => {
    setActions(prev => [...prev.slice(-9), action]);
  }, []);

  const addCommentary = useCallback((text) => {
    setCommentary(prev => [...prev.slice(-9), text]);
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

  // Main layout
  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },

    // Row 1: Fighter panels + Round timer
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', padding: 1 },
      e(FighterPanel, { fighter: fight.fighterA, state: stateA, corner: 'A', stats: statsA }),
      e(RoundTimer, { round, time, maxRounds: fight.config?.rounds || 12, isPaused }),
      e(FighterPanel, { fighter: fight.fighterB, state: stateB, corner: 'B', stats: statsB })
    ),

    // Row 2: Ring + Action log
    e(Box, { flexDirection: 'row', padding: 1, gap: 1 },
      e(RingDisplay, { positions }),
      e(ActionPanel, { actions, maxActions: 5 })
    ),

    // Row 3: CompuBox + Lederman Scorecard + Commentary
    e(Box, { flexDirection: 'row', padding: 1, gap: 1 },
      e(CompuBoxPanel, { statsA, statsB, fighterA: fight.fighterA, fighterB: fight.fighterB }),
      e(LedermanScorecard, { scores: roundScores, currentRound: round, fighterA: fight.fighterA, fighterB: fight.fighterB }),
      e(CommentaryPanel, { lines: commentary, maxLines: 5 })
    ),

    // Status bar
    e(StatusBar, {
      left: isPaused ? 'PAUSED' : (isEnded ? 'ENDED' : 'LIVE'),
      center: isEnded ? (result?.winnerName ? `Winner: ${result.winnerName} by ${result.displayMethod}` : 'DRAW') : '',
      right: '[Q]uit [P/Space]ause [+/-]Speed'
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
    if (this.inkInstance) {
      this.inkInstance.unmount();
    }
    if (this.exitResolve) {
      this.exitResolve();
    }
  }
}

export default InkArcadeTUI;
