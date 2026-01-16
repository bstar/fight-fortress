/**
 * Reusable Ink UI Components
 * Building blocks for the fight simulation interface
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import chalk from 'chalk';
import { useTheme } from './InkTheme.js';

const e = React.createElement;

/**
 * Layout Context - provides terminal dimensions to child components
 */
const LayoutContext = createContext({ width: 100, height: 30 });

export function useLayout() {
  return useContext(LayoutContext);
}

export function LayoutProvider({ children }) {
  const { stdout } = useStdout();
  const width = stdout?.columns || 100;
  const height = stdout?.rows || 30;
  return e(LayoutContext.Provider, { value: { width, height } }, children);
}

/**
 * Centered Layout - Centers content horizontally with a max width
 * Uses padding-based centering for better border rendering
 */
export function CenteredLayout({ children, maxWidth = 120, minWidth = 60 }) {
  const { width: termWidth, height: termHeight } = useLayout();

  // Calculate content width (use terminal width if smaller than max)
  const contentWidth = Math.min(maxWidth, Math.max(minWidth, termWidth - 4));

  // Calculate left padding to center the content
  const leftPadding = Math.max(0, Math.floor((termWidth - contentWidth) / 2));

  return e(Box, {
    flexDirection: 'column',
    width: termWidth,
    height: termHeight,
    paddingLeft: leftPadding,
    overflow: 'hidden'
  },
    e(Box, {
      flexDirection: 'column',
      width: contentWidth,
      height: '100%',
      overflow: 'hidden'
    }, children)
  );
}

/**
 * Themed Box with border - Supports flex widths
 */
export function ThemedBox({ title, children, width, height, borderStyle = 'single', padding = 1, flexGrow, minWidth, ...props }) {
  const theme = useTheme();

  return e(Box, {
    flexDirection: 'column',
    borderStyle,
    borderColor: theme.border,
    width,
    height,
    padding,
    flexGrow,
    minWidth,
    ...props
  },
    title && e(Box, { marginBottom: 1 },
      e(Text, { bold: true, color: theme.fighterA, wrap: 'truncate' }, title)
    ),
    children
  );
}

/**
 * Progress Bar Component
 */
export function ProgressBar({ value, max = 100, width = 20, color, lowColor, lowThreshold = 25, showPercent = false, label }) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const barColor = percent <= lowThreshold ? (lowColor || theme.healthLow) : (color || theme.health);
  const filledBar = chalk.hex(barColor)('\u2588'.repeat(filled));
  const emptyBar = chalk.hex(theme.border)('\u2591'.repeat(empty));

  return e(Box, { flexDirection: 'row', gap: 1 },
    label && e(Text, { color: theme.foreground }, label.padEnd(8)),
    e(Text, null, filledBar + emptyBar),
    showPercent && e(Text, { color: barColor }, ` ${Math.round(percent)}%`)
  );
}

/**
 * Fighter Stats Panel - Responsive with flexGrow support
 */
export function FighterPanel({ fighter, state, corner = 'A', width, flexGrow, minWidth = 25 }) {
  const theme = useTheme();
  const cornerColor = corner === 'A' ? theme.fighterA : theme.fighterB;

  const health = state?.damage?.headPercent != null ? (1 - state.damage.headPercent) * 100 : 100;
  const stamina = state?.stamina?.percent != null ? state.stamina.percent * 100 : 100;
  const knockdowns = state?.knockdowns?.total || 0;

  // Calculate bar width - if using flexGrow, use a reasonable default
  const barWidth = width ? width - 14 : 16;

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: cornerColor,
    padding: 1,
    width,
    flexGrow,
    minWidth
  },
    // Name
    e(Text, { bold: true, color: cornerColor, wrap: 'truncate' }, fighter.getShortName?.() || fighter.name),
    e(Text, { dimColor: true, wrap: 'truncate' }, fighter.style?.primary || 'Unknown Style'),
    e(Box, { marginTop: 1 }),

    // Health bar
    e(ProgressBar, {
      label: 'HP',
      value: health,
      max: 100,
      width: barWidth,
      color: theme.health,
      lowColor: theme.healthLow,
      lowThreshold: 30
    }),

    // Stamina bar
    e(ProgressBar, {
      label: 'STA',
      value: stamina,
      max: 100,
      width: barWidth,
      color: theme.stamina,
      lowColor: theme.staminaLow,
      lowThreshold: 25
    }),

    e(Box, { marginTop: 1 }),
    e(Text, { color: theme.foreground, wrap: 'truncate' },
      `State: ${state?.state || 'NEUTRAL'}`
    ),
    e(Text, { color: knockdowns > 0 ? theme.knockdown : theme.foreground },
      `Knockdowns: ${knockdowns}`
    )
  );
}

/**
 * Round Timer Display
 */
export function RoundTimer({ round, time, maxRounds = 12 }) {
  const theme = useTheme();
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return e(Box, {
    flexDirection: 'column',
    alignItems: 'center',
    borderStyle: 'round',
    borderColor: theme.round,
    paddingX: 2,
    paddingY: 1
  },
    e(Text, { bold: true, color: theme.round }, `ROUND ${round}`),
    e(Text, { color: theme.timer }, `${timeStr} / 3:00`),
    e(Text, { dimColor: true }, `of ${maxRounds}`)
  );
}

/**
 * Selection indicator character - right-pointing triangle
 */
export const SELECTOR = '>';  // Simple ASCII arrow for consistent width

/**
 * Menu Item Component - Unified styling for all selectable items
 * - Arrow indicator on left when selected
 * - Red color for selected items
 * - Proper alignment (same prefix width for all items)
 */
export function MenuItem({ label, isSelected, icon, width, flexGrow }) {
  const displayLabel = icon ? `${icon} ${label}` : label;
  // Prefix is always same width: ">" or " " followed by space
  const prefix = isSelected ? '> ' : '  ';

  return e(Box, { flexDirection: 'row', width, flexGrow },
    e(Text, {
      bold: isSelected,
      color: isSelected ? 'red' : 'white',
      wrap: 'truncate'
    }, `${prefix}${displayLabel}`)
  );
}

/**
 * Selectable Menu Component - Responsive with flexGrow support
 */
export function Menu({ items, onSelect, title, width, flexGrow, minWidth = 30 }) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => (prev + 1) % items.length);
    } else if (key.return) {
      onSelect?.(items[selectedIndex], selectedIndex);
    }
  });

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    width,
    flexGrow,
    minWidth,
    paddingX: 1,
    paddingY: 1
  },
    title && e(Text, { bold: true, color: theme.fighterA, wrap: 'truncate' }, title),
    title && e(Box, { height: 1 }),
    ...items.map((item, index) =>
      e(MenuItem, {
        key: index,
        label: typeof item === 'string' ? item : item.label,
        icon: item.icon,
        isSelected: index === selectedIndex
      })
    )
  );
}

/**
 * Commentary Box
 */
export function CommentaryBox({ lines = [], maxLines = 6 }) {
  const theme = useTheme();
  const displayLines = lines.slice(-maxLines);

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: '100%'
  },
    e(Text, { bold: true, color: theme.commentary }, 'COMMENTARY'),
    e(Box, { marginTop: 1, flexDirection: 'column' },
      ...displayLines.map((line, i) =>
        e(Text, {
          key: i,
          color: i === displayLines.length - 1 ? theme.commentaryHighlight : theme.commentary,
          wrap: 'wrap'
        }, line)
      )
    )
  );
}

/**
 * Action Log - Responsive width
 */
export function ActionLog({ actions = [], maxActions = 8, width, flexGrow }) {
  const theme = useTheme();
  const displayActions = actions.slice(-maxActions);

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width: width || '100%',
    flexGrow
  },
    e(Text, { bold: true, color: theme.punch }, 'ACTION'),
    e(Box, { marginTop: 1, flexDirection: 'column' },
      ...displayActions.map((action, i) =>
        e(Text, {
          key: i,
          color: action.highlight ? theme.knockdown : theme.foreground,
          wrap: 'truncate'
        }, action.text || action)
      )
    )
  );
}

/**
 * Title Banner - Responsive centered title
 * If width is not provided, uses flexbox centering
 */
export function TitleBanner({ title, subtitle, width, centered = true }) {
  const theme = useTheme();
  const boxWidth = Math.max(title.length + 6, 30);

  // Build the banner content
  const topBorder = '\u2554' + '\u2550'.repeat(boxWidth - 2) + '\u2557';
  const titleLine = '\u2551' + title.padStart(Math.floor((boxWidth - 2 + title.length) / 2)).padEnd(boxWidth - 2) + '\u2551';
  const bottomBorder = '\u255A' + '\u2550'.repeat(boxWidth - 2) + '\u255D';

  return e(Box, {
    flexDirection: 'column',
    width: width || '100%',
    alignItems: centered ? 'center' : 'flex-start',
    marginY: 1
  },
    e(Text, { bold: true, color: theme.fighterA }, topBorder),
    e(Text, { bold: true, color: theme.fighterA }, titleLine),
    e(Text, { bold: true, color: theme.fighterA }, bottomBorder),
    subtitle && e(Box, { width: boxWidth, justifyContent: 'center' },
      e(Text, { color: theme.commentary }, subtitle)
    )
  );
}

/**
 * Status Bar - Uses Ink's Box borders for proper responsive width
 */
export function StatusBar({ left, center, right, width, flexGrow }) {
  const theme = useTheme();

  return e(Box, {
    flexDirection: 'row',
    borderStyle: 'single',
    borderColor: theme.border,
    paddingX: 1,
    width,
    flexGrow,
    justifyContent: 'space-between'
  },
    e(Text, { color: theme.foreground }, left || ''),
    e(Text, { color: theme.foreground }, center || ''),
    e(Text, { color: theme.commentary }, right || '')
  );
}

/**
 * Loading Spinner with message
 */
export function LoadingSpinner({ message = 'Loading...' }) {
  const theme = useTheme();
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return e(Box, { gap: 1 },
    e(Text, { color: theme.fighterA }, frames[frame]),
    e(Text, { color: theme.foreground }, message)
  );
}

/**
 * Whimsical loading messages - SimCity 2000 style
 */
const WHIMSICAL_MESSAGES = [
  // Classic tribute
  'Reticulating splines...',
  // Boxing training
  'Wrapping hands...',
  'Skipping rope...',
  'Hitting the heavy bag...',
  'Shadow boxing in mirrors...',
  'Running at 4am...',
  // Fight prep
  'Scheduling weigh-ins...',
  'Intimidating staredowns...',
  'Generating trash talk...',
  'Rehearsing press conferences...',
  // Technical
  'Calibrating chin durability...',
  'Computing punch resistance...',
  'Measuring reach advantages...',
  'Calculating knockout probability...',
  // Business
  'Negotiating purse splits...',
  'Polishing championship belts...',
  'Counting PPV buys...',
  'Marinating rivalries...',
  // Career
  'Aging fighters gracefully...',
  'Retiring legends...',
  'Discovering hungry prospects...',
  'Building hype trains...',
  // Atmosphere
  'Arranging corner men...',
  'Bribing judges...',
  'Preparing ice buckets...',
  'Testing ring canvas tension...',
  'Tuning arena speakers...',
  'Warming up ring card girls...',
  // Drama
  'Fabricating beef...',
  'Leaking sparring footage...',
  'Planting ringside celebrities...',
  'Scripting underdog narratives...',
  'Manifesting upsets...',
  // Misc fun
  'Inflating egos...',
  'Deflating hype...',
  'Applying vaseline...',
  'Checking glove padding...',
  'Consulting the boxing gods...',
];

/**
 * Spinner frame sets - different animation styles
 */
const SPINNER_STYLES = {
  // Boxing-themed punching animation
  boxing: {
    frames: [
      '       \\O ',
      '      --|O ',
      '     ---|O ',
      '      --|O ',
    ],
    interval: 150,
  },
  // Smooth braille dots (modern, clean)
  dots: {
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interval: 80,
  },
  // Classic line spinner
  classic: {
    frames: ['|', '/', '-', '\\'],
    interval: 100,
  },
  // Bouncing dots
  bounce: {
    frames: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
    interval: 100,
  },
  // Growing bar
  bar: {
    frames: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[====]', '[ ===]', '[  ==]', '[   =]'],
    interval: 120,
  },
  // Boxing gloves alternating
  gloves: {
    frames: ['🥊    ', ' 🥊   ', '  🥊  ', '   🥊 ', '    🥊', '   🥊 ', '  🥊  ', ' 🥊   '],
    interval: 100,
  },
  // Punch impact
  punch: {
    frames: ['( •_•)', '( •_•)/', '( •_•)>--', '( •_•)>--•', '💥', '  💥', '    •'],
    interval: 120,
  },
};

/**
 * Whimsical Loader - Cycling fun messages during long operations
 */
export function WhimsicalLoader({ primaryMessage, showWhimsy = true, spinnerStyle = 'dots' }) {
  const theme = useTheme();
  const [frame, setFrame] = useState(0);
  const [messageIndex, setMessageIndex] = useState(
    Math.floor(Math.random() * WHIMSICAL_MESSAGES.length)
  );

  const spinner = SPINNER_STYLES[spinnerStyle] || SPINNER_STYLES.dots;

  useEffect(() => {
    const spinnerTimer = setInterval(() => {
      setFrame(f => (f + 1) % spinner.frames.length);
    }, spinner.interval);
    return () => clearInterval(spinnerTimer);
  }, [spinner]);

  useEffect(() => {
    if (!showWhimsy) return;
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => {
        // Pick a random different message
        let next;
        do {
          next = Math.floor(Math.random() * WHIMSICAL_MESSAGES.length);
        } while (next === prev && WHIMSICAL_MESSAGES.length > 1);
        return next;
      });
    }, 2000); // Change message every 2 seconds
    return () => clearInterval(messageTimer);
  }, [showWhimsy]);

  return e(Box, { flexDirection: 'column', alignItems: 'center', gap: 1 },
    e(Box, { gap: 1 },
      e(Text, { color: theme.fighterA }, spinner.frames[frame]),
      e(Text, { color: theme.foreground, bold: true }, primaryMessage)
    ),
    showWhimsy && e(Text, {
      color: theme.commentary,
      dimColor: true,
      italic: true
    }, WHIMSICAL_MESSAGES[messageIndex])
  );
}

/**
 * Tab Bar - Horizontal tabs with selection indicator
 */
export function TabBar({ tabs, selectedIndex, compact = false, separator = '|' }) {
  const theme = useTheme();

  return e(Box, {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: compact ? 1 : 2
  },
    ...tabs.map((tab, i) => {
      const isSelected = i === selectedIndex;
      const label = typeof tab === 'string' ? tab : tab.label;
      const showSeparator = i < tabs.length - 1;

      return e(Box, { key: i, flexDirection: 'row', gap: compact ? 1 : 2 },
        e(Text, {
          bold: isSelected,
          color: isSelected ? theme.fighterA : theme.commentary,
          dimColor: !isSelected
        }, isSelected ? `[${label}]` : label),
        showSeparator && e(Text, { color: theme.border, dimColor: true }, separator)
      );
    })
  );
}

/**
 * Context Bar - Shows current context and available actions
 * Positioned at the bottom of views for consistent UX
 */
export function ContextBar({ context, actions = [], width }) {
  const theme = useTheme();

  // Format actions as "key: action" pairs
  const actionStr = actions.map(a => `${a.key}: ${a.label}`).join('  ');

  return e(Box, {
    flexDirection: 'column',
    width: width || '100%',
    marginTop: 1
  },
    e(Box, {
      borderStyle: 'single',
      borderColor: theme.border,
      paddingX: 1,
      paddingY: 0,
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
      // Context info (left side)
      e(Box, { flexDirection: 'row', gap: 2 },
        context && e(Text, { color: theme.fighterA, bold: true }, context)
      ),
      // Actions (right side)
      e(Text, { color: theme.commentary }, actionStr)
    )
  );
}

/**
 * Info Panel - Displays key-value information in a bordered box
 */
export function InfoPanel({ title, items = [], width, flexGrow }) {
  const theme = useTheme();

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: theme.border,
    padding: 1,
    width,
    flexGrow
  },
    title && e(Text, { bold: true, color: theme.fighterA, wrap: 'truncate' }, title),
    title && e(Box, { height: 1 }),
    ...items.map((item, i) =>
      e(Box, { key: i, flexDirection: 'row', justifyContent: 'space-between' },
        e(Text, { color: theme.commentary }, item.label),
        e(Text, { color: item.highlight ? theme.fighterA : theme.foreground, bold: item.highlight },
          String(item.value))
      )
    )
  );
}

/**
 * News Ticker - Displays historical events for immersion
 */
export function NewsTicker({ headline, category, year, week, showDate = true }) {
  const theme = useTheme();

  // Category styling
  const categoryColors = {
    politics: theme.fighterA,
    world: '#FF6B6B',
    sports: theme.stamina,
    culture: '#DDA0DD',
    technology: theme.health,
    science: theme.health,
    economy: '#FFD700',
    disaster: '#FF4444',
    crime: '#FF6347',
    society: theme.fighterB
  };

  const categoryPrefixes = {
    politics: 'POLITICS',
    world: 'WORLD',
    sports: 'SPORTS',
    culture: 'CULTURE',
    technology: 'TECH',
    science: 'SCIENCE',
    economy: 'ECONOMY',
    disaster: 'BREAKING',
    crime: 'CRIME',
    society: 'SOCIETY'
  };

  const color = categoryColors[category] || theme.foreground;
  const prefix = categoryPrefixes[category] || 'NEWS';

  if (!headline) {
    return null;
  }

  return e(Box, {
    flexDirection: 'row',
    width: '100%',
    paddingX: 1,
    gap: 1
  },
    // Category badge
    e(Box, {
      paddingX: 1,
      backgroundColor: color
    },
      e(Text, { color: '#FFFFFF', bold: true }, prefix)
    ),
    // Headline
    e(Box, { flexGrow: 1 },
      e(Text, { color: theme.foreground, wrap: 'truncate' }, headline)
    ),
    // Date (optional)
    showDate && e(Text, { color: theme.commentary, dimColor: true },
      `Week ${week}, ${year}`
    )
  );
}

/**
 * News Banner - Full-width news ticker with border
 */
export function NewsBanner({ events = [], year, week }) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate through events
  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % events.length);
    }, 5000); // Rotate every 5 seconds
    return () => clearInterval(timer);
  }, [events.length]);

  const currentEvent = events[currentIndex];

  if (!currentEvent) {
    return null;
  }

  return e(Box, {
    flexDirection: 'column',
    width: '100%',
    borderStyle: 'single',
    borderColor: theme.border,
    paddingX: 1
  },
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      e(Text, { color: theme.fighterA, bold: true }, '📰 WORLD NEWS'),
      e(Text, { color: theme.commentary, dimColor: true },
        `Week ${week}, ${year}`
      )
    ),
    e(NewsTicker, {
      headline: currentEvent.headline,
      category: currentEvent.category,
      year,
      week,
      showDate: false
    })
  );
}
