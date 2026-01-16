/**
 * InkArcadeTUI - Arcade-style fight display using Ink
 * Street Fighter/Tekken inspired UI with fluid layouts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import chalk from 'chalk';
import { ThemeProvider, useTheme, DEFAULT_THEME } from './InkTheme.js';
import { ProgressBar, FighterPanel, RoundTimer, CommentaryBox, ActionLog, StatusBar } from './components.js';
import { CommentaryGenerator } from '../CommentaryGenerator.js';

const e = React.createElement;

/**
 * Health Bar - Large arcade-style health display
 */
function HealthBar({ value, max = 100, width = 30, corner = 'A', name }) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const isLow = percent < 30;
  const cornerColor = corner === 'A' ? theme.fighterA : theme.fighterB;
  const barColor = isLow ? theme.healthLow : theme.health;

  // Reverse direction for corner B
  const filledBar = chalk.hex(barColor)('\u2588'.repeat(filled));
  const emptyBar = chalk.hex(theme.border)('\u2591'.repeat(empty));

  return e(Box, { flexDirection: 'column' },
    e(Box, { flexDirection: 'row', justifyContent: corner === 'A' ? 'flex-start' : 'flex-end' },
      e(Text, { bold: true, color: cornerColor }, name)
    ),
    e(Box, { flexDirection: 'row' },
      corner === 'A'
        ? e(Text, null, filledBar + emptyBar)
        : e(Text, null, emptyBar + filledBar)
    ),
    e(Box, { flexDirection: 'row', justifyContent: corner === 'A' ? 'flex-start' : 'flex-end' },
      e(Text, { color: barColor }, `${Math.round(percent)}%`)
    )
  );
}

/**
 * Stamina Bar - Smaller stamina display
 */
function StaminaBar({ value, max = 100, width = 25, corner = 'A' }) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const isLow = percent < 25;
  const barColor = isLow ? theme.staminaLow : theme.stamina;

  const filledBar = chalk.hex(barColor)('\u2593'.repeat(filled));
  const emptyBar = chalk.hex(theme.border)('\u2591'.repeat(empty));

  return e(Box, { flexDirection: 'row', justifyContent: corner === 'A' ? 'flex-start' : 'flex-end' },
    e(Text, { dimColor: true }, 'STA '),
    corner === 'A'
      ? e(Text, null, filledBar + emptyBar)
      : e(Text, null, emptyBar + filledBar)
  );
}

/**
 * Fighter Display - Full fighter panel with ASCII art
 */
function FighterDisplay({ fighter, state, corner = 'A' }) {
  const theme = useTheme();
  const cornerColor = corner === 'A' ? theme.fighterA : theme.fighterB;

  const health = state?.damage?.headPercent != null ? (1 - state.damage.headPercent) * 100 : 100;
  const stamina = state?.stamina?.percent != null ? state.stamina.percent * 100 : 100;
  const fighterState = state?.state || 'NEUTRAL';
  const knockdowns = state?.knockdowns?.total || 0;

  // ASCII fighter representation
  const stance = fighter.physical?.stance === 'southpaw' ? 'southpaw' : 'orthodox';
  const isHurt = fighterState === 'HURT' || fighterState === 'STUNNED';

  const asciiArt = corner === 'A' ? [
    isHurt ? '  \\O/' : '   O ',
    isHurt ? '   |  ' : '  /|\\ ',
    isHurt ? '  / \\' : '  / \\ '
  ] : [
    isHurt ? '\\O/  ' : ' O   ',
    isHurt ? '  |  ' : ' /|\\ ',
    isHurt ? '/ \\  ' : ' / \\ '
  ];

  return e(Box, {
    flexDirection: 'column',
    width: 35,
    borderStyle: 'round',
    borderColor: isHurt ? theme.hurt : cornerColor,
    padding: 1
  },
    // Health bar
    e(HealthBar, {
      value: health,
      max: 100,
      width: 28,
      corner,
      name: fighter.getShortName?.() || fighter.name
    }),

    // Stamina bar
    e(StaminaBar, { value: stamina, max: 100, width: 25, corner }),

    // ASCII fighter
    e(Box, {
      flexDirection: 'column',
      alignItems: corner === 'A' ? 'flex-start' : 'flex-end',
      marginY: 1
    },
      ...asciiArt.map((line, i) =>
        e(Text, { key: i, color: isHurt ? theme.hurt : cornerColor }, line)
      )
    ),

    // State and knockdowns
    e(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      e(Text, {
        color: isHurt ? theme.hurt : theme.foreground,
        bold: isHurt
      }, fighterState),
      knockdowns > 0 && e(Text, { color: theme.knockdown }, `KD: ${knockdowns}`)
    )
  );
}

/**
 * Ring Visualization
 */
function RingDisplay({ positions, fighterA, fighterB }) {
  const theme = useTheme();
  const width = 40;
  const height = 12;

  // Calculate grid positions
  // Positions from simulation are in range [-10, 10], normalize to [0, 20]
  const posA = positions?.A || { x: -4, y: 0 };
  const posB = positions?.B || { x: 4, y: 0 };
  const distance = positions?.distance || 8;

  // Normalize from [-10, 10] to [0, 20] before scaling to grid
  const normalizedAx = posA.x + 10;
  const normalizedAy = posA.y + 10;
  const normalizedBx = posB.x + 10;
  const normalizedBy = posB.y + 10;

  const gridAx = Math.round((normalizedAx / 20) * (width - 4)) + 2;
  const gridAy = Math.round((normalizedAy / 20) * (height - 2)) + 1;
  const gridBx = Math.round((normalizedBx / 20) * (width - 4)) + 2;
  const gridBy = Math.round((normalizedBy / 20) * (height - 2)) + 1;

  // Build ring lines
  const lines = [];
  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1) {
        line += '\u2550';
      } else if (x === 0 || x === width - 1) {
        line += '\u2551';
      } else if (y === gridAy && x >= gridAx - 1 && x <= gridAx + 1) {
        line += x === gridAx ? 'A' : (x < gridAx ? '[' : ']');
      } else if (y === gridBy && x >= gridBx - 1 && x <= gridBx + 1) {
        line += x === gridBx ? 'B' : (x < gridBx ? '{' : '}');
      } else {
        line += ' ';
      }
    }
    lines.push(line);
  }

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 0
  },
    e(Text, { bold: true, color: theme.foreground }, ' RING '),
    ...lines.map((line, i) =>
      e(Text, { key: i, color: theme.foreground }, line)
    ),
    e(Text, { color: theme.commentary, dimColor: true },
      `  Distance: ${distance.toFixed(1)} ft`
    )
  );
}

/**
 * Center Display - Round, Timer, VS
 */
function CenterDisplay({ round, time, maxRounds }) {
  const theme = useTheme();
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);

  return e(Box, {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20
  },
    e(Text, { bold: true, color: theme.round }, `ROUND ${round}`),
    e(Text, { color: theme.timer }, `${mins}:${secs.toString().padStart(2, '0')}`),
    e(Text, { dimColor: true }, `of ${maxRounds}`),
    e(Box, { marginY: 1 },
      e(Text, { bold: true, color: theme.fighterA }, 'VS')
    )
  );
}

/**
 * Hit Effect Display
 */
function HitEffect({ effect, onComplete }) {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!effect) return null;

  const color = effect.isKnockdown ? theme.knockdown :
                effect.isBig ? theme.punch : theme.foreground;

  return e(Box, {
    position: 'absolute',
    top: '50%',
    left: '50%'
  },
    e(Text, { bold: true, color }, effect.text || 'HIT!')
  );
}

/**
 * Main Fight Display Component
 */
function FightDisplay({ fight, simulation, tui }) {
  const theme = useTheme();
  const { exit } = useApp();

  const [round, setRound] = useState(1);
  const [time, setTime] = useState(0);
  const [stateA, setStateA] = useState(null);
  const [stateB, setStateB] = useState(null);
  const [positions, setPositions] = useState(null);
  const [actions, setActions] = useState([]);
  const [commentary, setCommentary] = useState([]);
  const [hitEffect, setHitEffect] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [result, setResult] = useState(null);
  const [isBetweenRounds, setIsBetweenRounds] = useState(false);

  const commentaryGen = React.useRef(new CommentaryGenerator()).current;

  // Initialize commentary
  useEffect(() => {
    if (fight) {
      commentaryGen.initialize(fight.fighterA, fight.fighterB);
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
      },
      roundStart: (data) => {
        setRound(data.round);
        setTime(0);
        setIsBetweenRounds(false);
        addCommentary(`Round ${data.round} begins!`);
      },
      roundEnd: (data) => {
        setIsBetweenRounds(true);
        addCommentary(`End of Round ${data.round}`);
        addCommentary('Press any key to continue...');
      },
      punchLanded: (data) => {
        const attacker = data.attacker === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        const punchName = formatPunch(data.punchType);

        addAction(`${attacker} lands ${punchName}`);

        if (data.damage >= 8) {
          setHitEffect({ text: 'POW!', isBig: true });
        } else if (data.damage >= 5) {
          setHitEffect({ text: 'HIT!' });
        }

        if (data.damage >= 6) {
          const lines = commentaryGen.generate({ type: 'PUNCH_LANDED', ...data }, {});
          lines.forEach(c => addCommentary(c.text));
        }
      },
      knockdown: (data) => {
        const downed = data.fighter === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();

        addAction(`KNOCKDOWN! ${downed} IS DOWN!`);
        addCommentary(`DOWN GOES ${downed.toUpperCase()}!`);
        setHitEffect({ text: 'KNOCKDOWN!', isKnockdown: true });
      },
      hurt: (data) => {
        const hurt = data.fighter === 'A'
          ? fight.fighterA.getShortName()
          : fight.fighterB.getShortName();
        addAction(`${hurt} IS HURT!`);
        addCommentary(`${hurt} is in trouble!`);
      },
      fightEnd: (data) => {
        setIsEnded(true);
        setResult(data);
        addCommentary('FIGHT OVER!');
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
  }, [simulation, fight, commentaryGen]);

  const addAction = useCallback((text) => {
    setActions(prev => [...prev.slice(-7), { text }]);
  }, []);

  const addCommentary = useCallback((text) => {
    setCommentary(prev => [...prev.slice(-5), text]);
  }, []);

  // Input handling
  useInput((input, key) => {
    // If between rounds, any key continues to next round
    if (isBetweenRounds && tui) {
      tui.continueToNextRound();
      return;
    }

    if (key.escape || input === 'q') {
      exit();
    } else if (input === 'p') {
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

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    // Top section - Health bars
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', padding: 1 },
      e(FighterDisplay, {
        fighter: fight.fighterA,
        state: stateA,
        corner: 'A'
      }),
      e(CenterDisplay, {
        round,
        time,
        maxRounds: fight.config?.rounds || 12
      }),
      e(FighterDisplay, {
        fighter: fight.fighterB,
        state: stateB,
        corner: 'B'
      })
    ),

    // Middle section - Ring and actions
    e(Box, { flexDirection: 'row', padding: 1, gap: 1 },
      e(RingDisplay, {
        positions,
        fighterA: fight.fighterA,
        fighterB: fight.fighterB
      }),
      e(Box, { flexDirection: 'column', flexGrow: 1 },
        e(ActionLog, { actions, maxActions: 6 })
      )
    ),

    // Bottom section - Commentary
    e(Box, { padding: 1 },
      e(CommentaryBox, { lines: commentary, maxLines: 4 })
    ),

    // Status bar
    e(StatusBar, {
      left: isPaused ? 'PAUSED' : 'LIVE',
      center: isEnded ? (result?.winner ? `Winner: ${result.winner}` : 'DRAW') : '',
      right: '[Q]uit [P]ause [+/-]Speed'
    }),

    // Hit effect overlay
    hitEffect && e(HitEffect, {
      effect: hitEffect,
      onComplete: () => setHitEffect(null)
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
    'rear_uppercut': 'right uppercut'
  };
  return names[punchType] || punchType?.replace(/_/g, ' ') || 'punch';
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
    // Create exit promise
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

  /**
   * Wait for user input or timeout to proceed to next round
   * @param {number} timeout - Time in ms before auto-advancing (default 5000)
   * @returns {Promise} - Resolves when key pressed or timeout occurs
   */
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

      // Store resolve so FightDisplay can call it on keypress
      this.nextRoundResolve = doResolve;

      // Auto-advance after timeout
      setTimeout(() => {
        doResolve();
      }, timeout);
    });
  }

  /**
   * Called by FightDisplay when user presses key during round break
   */
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
