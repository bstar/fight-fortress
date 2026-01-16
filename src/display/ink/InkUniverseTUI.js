/**
 * InkUniverseTUI - Universe Mode UI with Ink
 * Features: Dashboard, Rankings, Fights, News, Hall of Fame
 * Uses dynamic layouts that adapt to terminal size
 */

import React, { useState, useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { ThemeProvider, useTheme, DEFAULT_THEME } from './InkTheme.js';
import { Menu, MenuItem, TitleBanner, ProgressBar, WhimsicalLoader, StatusBar, LayoutProvider, useLayout, TabBar, ContextBar, CenteredLayout, NewsBanner } from './components.js';
import { getEventNearWeek } from '../../universe/data/HistoricalEvents.js';
import { WeekProcessor } from '../../universe/simulation/WeekProcessor.js';
import { MatchmakingEngine } from '../../universe/simulation/MatchmakingEngine.js';

const e = React.createElement;

/**
 * Format body rankings for display
 * Shows all 4 bodies: "WBC: #3, WBA: #7, IBF: NR, WBO: #5"
 */
function formatBodyRankings(bodyRankings) {
  if (!bodyRankings || Object.keys(bodyRankings).length === 0) {
    return 'Unranked';
  }

  const bodies = ['WBC', 'WBA', 'IBF', 'WBO'];
  const parts = bodies.map(body => {
    const rank = bodyRankings[body];
    return `${body}: ${rank ? `#${rank}` : 'NR'}`;
  });

  return parts.join('  ');
}

/**
 * Main Menu View
 */
function MainMenuView({ universe, onNavigate, onExit }) {
  const theme = useTheme();
  const { width } = useLayout();
  const summary = universe.getSummary();
  const hofCount = universe.hallOfFame?.getInducteeCount?.() || 0;

  // Get historical news for current date - randomly select one event
  const currentDate = universe.currentDate || { year: 2000, week: 1 };
  const newsEvent = getEventNearWeek(currentDate.year, currentDate.week, 8);

  const menuItems = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'Simulate', value: 'simulate' },
    { label: 'Rankings', value: 'rankings' },
    { label: 'Upcoming Fights', value: 'upcoming' },
    { label: 'Recent Results', value: 'results' },
    { label: 'Money Fights', value: 'moneyfights' },
    { label: 'Boxing News', value: 'news' },
    { label: 'Fighters', value: 'fighters' },
    { label: 'Divisions', value: 'divisions' },
    { label: 'Hall of Fame', value: 'hof' },
    { label: 'Save & Exit', value: 'exit' }
  ];

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onExit?.();
    }
  });

  const menuWidth = Math.max(35, Math.floor(width * 0.4));

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'BOXING UNIVERSE', subtitle: universe.getDateString?.() || '' }),

    // Historical news ticker for immersion
    newsEvent && e(NewsBanner, {
      events: [newsEvent],
      year: currentDate.year,
      week: currentDate.week
    }),

    e(Box, { flexDirection: 'row', marginTop: 1, gap: 2, flexGrow: 1, overflow: 'hidden' },
      // Menu
      e(Box, { flexShrink: 0 },
        e(Menu, {
          items: menuItems,
          title: 'MAIN MENU',
          width: menuWidth,
          onSelect: (item) => {
            if (item.value === 'exit') onExit?.();
            else onNavigate?.(item.value);
          }
        })
      ),

      // Quick Stats - grows to fill remaining space
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        minWidth: 30,
        overflow: 'hidden'
      },
        e(Text, { bold: true, color: theme.fighterA }, 'QUICK STATS'),
        e(Box, { height: 1 }),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `Active Fighters: ${summary.activeFighters}`),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `Total Fights: ${summary.totalFights}`),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `KO Rate: ${summary.knockoutRate}`),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `Retirements: ${summary.retiredFighters}`),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `Hall of Fame: ${hofCount}`),
        e(Box, { height: 1 }),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `Trainers: ${summary.trainers}`),
        e(Text, { color: theme.foreground, wrap: 'truncate' }, `Promoters: ${summary.promoters}`)
      )
    ),

    e(ContextBar, {
      context: universe.getDateString?.() || 'Boxing Universe',
      actions: [
        { key: '↑/↓', label: 'Navigate' },
        { key: 'Enter', label: 'Select' },
        { key: 'Q', label: 'Exit' }
      ]
    })
  );
}

/**
 * Dashboard View
 */
function DashboardView({ universe, onBack }) {
  const theme = useTheme();
  const { width } = useLayout();
  const summary = universe.getSummary();
  const hofCount = universe.hallOfFame?.getInducteeCount?.() || 0;
  const hw = universe.divisions?.get('Heavyweight');
  const recentFights = universe.lastWeekResults || [];

  // Get historical news for current date - randomly select one event
  const currentDate = universe.currentDate || { year: 2000, week: 1 };
  const newsEvent = getEventNearWeek(currentDate.year, currentDate.week, 8);

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
  });

  // Get champions
  const bodies = universe.getAllSanctioningBodies?.() || [];
  const champLines = [];
  for (const body of bodies) {
    const champId = body.getChampion?.('Heavyweight');
    const champ = champId ? universe.fighters?.get(champId) : null;
    if (champ) {
      champLines.push(`${body.shortName}: ${champ.name} (${champ.getRecordString?.()})`);
    } else {
      champLines.push(`${body.shortName}: VACANT`);
    }
  }

  // Calculate panel width - divide available space into thirds
  const panelWidth = Math.floor((width - 8) / 3);
  const nameWidth = Math.max(12, panelWidth - 15);

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'UNIVERSE DASHBOARD', subtitle: universe.getDateString?.() || '' }),

    // Historical news ticker
    newsEvent && e(NewsBanner, {
      events: [newsEvent],
      year: currentDate.year,
      week: currentDate.week
    }),

    e(Box, { flexDirection: 'row', marginTop: 1, gap: 1 },
      // Stats Panel
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0,
        overflow: 'hidden'
      },
        e(Text, { bold: true, color: theme.fighterA }, 'STATS'),
        e(Box, { height: 1 }),
        e(Text, { wrap: 'truncate' }, `Active: ${summary.activeFighters}`),
        e(Text, { wrap: 'truncate' }, `Retired: ${summary.retiredFighters}`),
        e(Text, { wrap: 'truncate' }, `Fights: ${summary.totalFights}`),
        e(Text, { wrap: 'truncate' }, `KO Rate: ${summary.knockoutRate}`),
        e(Text, { wrap: 'truncate' }, `HOF: ${hofCount}`)
      ),

      // Champions Panel
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0,
        overflow: 'hidden'
      },
        e(Text, { bold: true, color: theme.fighterA }, 'HW CHAMPIONS'),
        e(Box, { height: 1 }),
        ...champLines.slice(0, 4).map((line, i) =>
          e(Text, { key: i, color: theme.foreground, wrap: 'truncate' }, line)
        )
      ),

      // Recent Fights
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0,
        overflow: 'hidden'
      },
        e(Text, { bold: true, color: theme.fighterA }, 'RECENT'),
        e(Box, { height: 1 }),
        ...recentFights.slice(0, 4).map((fight, i) =>
          e(Text, { key: i, color: theme.foreground, wrap: 'truncate' },
            `${fight.winnerName} def. ${fight.loserName}`
          )
        ),
        recentFights.length === 0 && e(Text, { color: theme.commentary }, 'No recent fights')
      )
    ),

    // Top Contenders
    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 1,
      marginTop: 1,
      flexGrow: 1,
      overflow: 'hidden'
    },
      e(Text, { bold: true, color: theme.fighterA }, 'TOP 10 HEAVYWEIGHT CONTENDERS'),
      e(Box, { height: 1 }),
      e(Box, { flexDirection: 'row', gap: 4 },
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          ...(hw?.rankings || []).slice(0, 5).map((fighterId, i) => {
            const fighter = universe.fighters?.get(fighterId);
            if (!fighter) return null;
            const name = fighter.name.substring(0, nameWidth).padEnd(nameWidth);
            return e(Text, { key: i, color: theme.foreground, wrap: 'truncate' },
              `${String(i + 1).padStart(2)}. ${name} ${fighter.getRecordString?.() || ''}`
            );
          })
        ),
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          ...(hw?.rankings || []).slice(5, 10).map((fighterId, i) => {
            const fighter = universe.fighters?.get(fighterId);
            if (!fighter) return null;
            const name = fighter.name.substring(0, nameWidth).padEnd(nameWidth);
            return e(Text, { key: i, color: theme.foreground, wrap: 'truncate' },
              `${String(i + 6).padStart(2)}. ${name} ${fighter.getRecordString?.() || ''}`
            );
          })
        )
      )
    ),

    e(ContextBar, {
      context: 'Dashboard',
      actions: [{ key: 'ESC', label: 'Back to Menu' }]
    })
  );
}

/**
 * Simulate Menu View
 */
function SimulateMenuView({ universe, processor, saveManager, onBack, onSimComplete }) {
  const theme = useTheme();
  const { width } = useLayout();
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState({ week: 0, total: 0, fights: 0 });

  const menuItems = [
    { label: 'Simulate 1 Week', value: 1 },
    { label: 'Simulate 1 Month (4 weeks)', value: 4 },
    { label: 'Simulate 1 Year (52 weeks)', value: 52 },
    { label: 'Back to Menu', value: 'back' }
  ];

  const runSimulation = useCallback(async (weeks) => {
    setSimulating(true);
    setProgress({ week: 0, total: weeks, fights: 0 });

    const events = [];
    for (let i = 0; i < weeks; i++) {
      const weekEvents = processor.processWeek();
      events.push(...weekEvents);

      setProgress({
        week: i + 1,
        total: weeks,
        fights: events.filter(e => e.type === 'FIGHT_RESULT').length
      });

      // Yield to UI - use setImmediate for faster animation
      await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 0));
    }

    // Auto-save
    saveManager?.save?.(universe, 'universe-autosave');

    setSimulating(false);
    onSimComplete?.(events);
  }, [processor, universe, saveManager, onSimComplete]);

  useInput((input, key) => {
    if (simulating) return;
    if (key.escape || input === 'q') onBack?.();
  });

  if (simulating) {
    const pct = progress.total > 0 ? Math.round((progress.week / progress.total) * 100) : 0;
    return e(Box, { flexDirection: 'column', width: '100%', alignItems: 'center', padding: 2 },
      e(TitleBanner, { title: 'SIMULATING', width }),
      e(Box, {
        flexDirection: 'column',
        alignItems: 'center',
        borderStyle: 'round',
        borderColor: theme.fighterA,
        padding: 2,
        marginTop: 2
      },
        e(WhimsicalLoader, {
          primaryMessage: `Week ${progress.week} of ${progress.total}`,
          showWhimsy: true
        }),
        e(Box, { marginTop: 1, width: Math.min(50, width - 20) },
          e(ProgressBar, {
            value: pct,
            max: 100,
            width: Math.min(40, width - 30),
            color: theme.fighterA,
            showPercent: true
          })
        ),
        e(Text, { color: theme.commentary, marginTop: 1 },
          `Fights: ${progress.fights}`
        )
      )
    );
  }

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'SIMULATE TIME', subtitle: universe.getDateString?.() || '', width }),

    e(Box, { marginTop: 1 },
      e(Menu, {
        items: menuItems,
        title: 'SIMULATION OPTIONS',
        width: Math.min(50, width - 4),
        onSelect: (item) => {
          if (item.value === 'back') onBack?.();
          else runSimulation(item.value);
        }
      })
    ),

    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 1,
      marginTop: 1,
      width: Math.min(55, width - 4)
    },
      e(Text, { color: theme.commentary }, 'Simulating will advance time,'),
      e(Text, { color: theme.commentary }, 'run scheduled fights, and update'),
      e(Text, { color: theme.commentary }, 'fighter records and rankings.')
    ),

    e(Box, { marginTop: 1 },
      e(StatusBar, { left: 'Navigate', center: 'Enter: Select', right: 'ESC: Back', width })
    )
  );
}

/**
 * Rankings View
 */
function RankingsView({ universe, onBack }) {
  const theme = useTheme();
  const { width } = useLayout();
  const [selectedDiv, setSelectedDiv] = useState(0);
  const divisions = Array.from(universe.divisions?.keys() || []);
  const division = universe.divisions?.get(divisions[selectedDiv]);

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
    else if (key.leftArrow || input === 'h') {
      setSelectedDiv(prev => (prev - 1 + divisions.length) % divisions.length);
    }
    else if (key.rightArrow || input === 'l') {
      setSelectedDiv(prev => (prev + 1) % divisions.length);
    }
  });

  // Get champions for this division
  const bodies = universe.getAllSanctioningBodies?.() || [];
  const champLines = [];
  for (const body of bodies) {
    const champId = body.getChampion?.(divisions[selectedDiv]);
    const champ = champId ? universe.fighters?.get(champId) : null;
    if (champ) {
      champLines.push({ org: body.shortName, name: champ.name, record: champ.getRecordString?.() });
    } else {
      champLines.push({ org: body.shortName, name: 'VACANT', record: '' });
    }
  }

  const nameWidth = Math.max(12, Math.floor(width / 3) - 10);

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'WORLD RANKINGS' }),

    // Division tabs - shows all divisions with current one highlighted
    e(Box, { marginBottom: 1 },
      e(TabBar, { tabs: divisions, selectedIndex: selectedDiv, compact: true })
    ),

    e(Box, { flexDirection: 'row', gap: 2 },
      // Champions panel
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 30
      },
        e(Text, { bold: true, color: theme.fighterA }, 'WORLD CHAMPIONS'),
        e(Box, { height: 1 }),
        ...champLines.map((c, i) =>
          e(Text, { key: i, color: theme.foreground, wrap: 'truncate' },
            `${c.org.padEnd(5)} ${c.name}${c.record ? ` (${c.record})` : ''}`
          )
        )
      ),

      // Top 15 Contenders panel
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 2,
        flexBasis: 0,
        minWidth: 55
      },
        e(Text, { bold: true, color: theme.fighterA }, 'TOP 15 CONTENDERS'),
        e(Box, { height: 1 }),
        ...(division?.rankings || []).slice(0, 15).map((fighterId, i) => {
          const fighter = universe.fighters?.get(fighterId);
          if (!fighter) return null;
          const name = fighter.name.substring(0, nameWidth).padEnd(nameWidth);
          const bodyRankings = fighter.career?.bodyRankings || {};
          // Compact body ranking display: e.g., "WBC#3 IBF#5"
          const rankedBodies = ['WBC', 'WBA', 'IBF', 'WBO']
            .filter(b => bodyRankings[b])
            .map(b => `${b}#${bodyRankings[b]}`)
            .join(' ');
          return e(Text, { key: i, color: theme.foreground },
            `${String(i + 1).padStart(2)}. ${name} ${(fighter.getRecordString?.() || '').padEnd(15)} ${rankedBodies || 'NR'}`
          );
        }),
        (division?.rankings?.length || 0) === 0 && e(Text, { color: theme.commentary }, 'No ranked fighters')
      )
    ),

    // Context bar with actions
    e(ContextBar, {
      context: `${divisions[selectedDiv]} Division`,
      actions: [
        { key: '←/→', label: 'Change Division' },
        { key: 'ESC', label: 'Back' }
      ]
    })
  );
}

/**
 * Fighters List View
 */
function FightersView({ universe, onBack, onFighterSelect }) {
  const theme = useTheme();
  const { width } = useLayout();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewOffset, setViewOffset] = useState(0);
  const MAX_VISIBLE = 15;

  const fighters = (universe.getActiveFighters?.() || [])
    .sort((a, b) => (b.career?.record?.wins || 0) - (b.career?.record?.losses || 0) -
                    ((a.career?.record?.wins || 0) - (a.career?.record?.losses || 0)));

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
    else if (key.upArrow || input === 'k') {
      setSelectedIdx(prev => {
        const newIdx = Math.max(0, prev - 1);
        if (newIdx < viewOffset) setViewOffset(newIdx);
        return newIdx;
      });
    }
    else if (key.downArrow || input === 'j') {
      setSelectedIdx(prev => {
        const newIdx = Math.min(fighters.length - 1, prev + 1);
        if (newIdx >= viewOffset + MAX_VISIBLE) setViewOffset(newIdx - MAX_VISIBLE + 1);
        return newIdx;
      });
    }
    else if (key.return) {
      onFighterSelect?.(fighters[selectedIdx]);
    }
  });

  const visibleFighters = fighters.slice(viewOffset, viewOffset + MAX_VISIBLE);
  const selectedFighter = fighters[selectedIdx];

  // Calculate widths to prevent overflow
  const listPanelWidth = Math.floor(width * 0.55);
  const nameWidth = Math.max(15, listPanelWidth - 20);

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'FIGHTER ROSTER', subtitle: `${fighters.length} Active` }),

    e(Box, { flexDirection: 'row', marginTop: 1, gap: 2 },
      // Fighter list - fixed width to prevent overflow
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        width: listPanelWidth,
        flexShrink: 0
      },
        e(Text, { bold: true, color: theme.fighterA }, 'FIGHTERS'),
        e(Box, { height: 1 }),
        ...visibleFighters.map((fighter, i) => {
          const idx = viewOffset + i;
          const isSelected = idx === selectedIdx;
          const age = fighter.getAge?.(universe.currentDate) || '?';
          const record = fighter.getRecordString?.() || '';
          const name = fighter.name.substring(0, nameWidth);
          return e(Box, { key: fighter.id },
            e(Text, {
              bold: isSelected,
              color: isSelected ? 'red' : 'white',
              wrap: 'truncate'
            }, (isSelected ? '> ' : '  ') + `${name} (${age}) ${record}`)
          );
        })
      ),

      // Fighter details - grows to fill remaining space
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        minWidth: 30
      },
        e(Text, { bold: true, color: theme.fighterA }, 'PROFILE'),
        e(Box, { height: 1 }),
        selectedFighter ? e(Box, { flexDirection: 'column' },
          e(Text, { bold: true, color: theme.fighterA, wrap: 'truncate' }, selectedFighter.name),
          e(Text, { color: theme.commentary, wrap: 'truncate' }, `"${selectedFighter.nickname || 'The Fighter'}"`),
          e(Box, { height: 1 }),
          e(Text, { wrap: 'truncate' }, `Age: ${selectedFighter.getAge?.(universe.currentDate) || '?'}`),
          e(Text, { wrap: 'truncate' }, `Record: ${selectedFighter.getRecordString?.() || ''}`),
          e(Text, { wrap: 'truncate' }, `Phase: ${selectedFighter.career?.phase || '?'}`),
          e(Text, { wrap: 'truncate' }, `Style: ${selectedFighter.style?.primary || '?'}`),
          e(Box, { height: 1 }),
          // Per-body rankings
          e(Text, { bold: true }, 'RANKINGS'),
          e(Text, { wrap: 'truncate', color: theme.foreground },
            formatBodyRankings(selectedFighter.career?.bodyRankings)
          ),
          e(Box, { height: 1 }),
          e(Text, { bold: true }, 'ATTRIBUTES'),
          e(Text, { wrap: 'truncate' }, `Power: ${Math.round(selectedFighter.power?.powerRight || 70)}`),
          e(Text, { wrap: 'truncate' }, `Speed: ${Math.round(selectedFighter.speed?.handSpeed || 70)}`),
          e(Text, { wrap: 'truncate' }, `Defense: ${Math.round(selectedFighter.defense?.headMovement || 70)}`),
          e(Text, { wrap: 'truncate' }, `Chin: ${Math.round(selectedFighter.mental?.chin || 70)}`),
          e(Text, { wrap: 'truncate' }, `Heart: ${Math.round(selectedFighter.mental?.heart || 70)}`)
        ) : e(Text, { color: theme.commentary }, 'No fighter selected')
      )
    ),

    // Context bar
    e(ContextBar, {
      context: selectedFighter ? selectedFighter.name : 'Select a fighter',
      actions: [
        { key: '↑/↓', label: 'Navigate' },
        { key: 'Enter', label: 'View History' },
        { key: 'ESC', label: 'Back' }
      ]
    })
  );
}

/**
 * Fight History View for a fighter
 */
function FighterHistoryView({ fighter, onBack, onReplay }) {
  const theme = useTheme();
  const { width } = useLayout();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const history = [...(fighter.fightHistory || [])].reverse();

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
    else if (key.upArrow || input === 'k') {
      setSelectedIdx(prev => Math.max(0, prev - 1));
    }
    else if (key.downArrow || input === 'j') {
      setSelectedIdx(prev => Math.min(history.length - 1, prev + 1));
    }
    else if (key.return) {
      const fight = history[selectedIdx];
      if (fight?.replayData) onReplay?.(fight);
    }
  });

  const selectedFight = history[selectedIdx];
  const nameWidth = Math.max(12, Math.floor((width - 10) / 2) - 15);

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: `${fighter.name} - HISTORY`, subtitle: `${history.length} Fights`, width }),

    e(Box, { flexDirection: 'row', marginTop: 1, gap: 2 },
      // Fight list
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0
      },
        e(Text, { bold: true, color: theme.fighterA }, 'FIGHTS'),
        e(Box, { height: 1 }),
        ...history.slice(0, 12).map((fight, i) => {
          const isSelected = i === selectedIdx;
          const resultColor = fight.result === 'W' ? 'green' : fight.result === 'L' ? 'red' : 'yellow';
          const hasReplay = fight.replayData ? ' [R]' : '';
          const oppName = (fight.opponentName || 'Unknown').substring(0, nameWidth);
          const prefix = isSelected ? '> ' : '  ';
          return e(Box, { key: i, flexDirection: 'row' },
            e(Text, {
              bold: isSelected,
              color: isSelected ? 'red' : 'white'
            }, prefix),
            e(Text, { color: resultColor }, `${fight.result} `),
            e(Text, {
              bold: isSelected,
              color: isSelected ? 'red' : 'white'
            }, `vs ${oppName}${hasReplay}`)
          );
        })
      ),

      // Fight details
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0
      },
        e(Text, { bold: true, color: theme.fighterA }, 'FIGHT DETAILS'),
        e(Box, { height: 1 }),
        selectedFight ? e(Box, { flexDirection: 'column' },
          e(Text, { bold: true, color: selectedFight.result === 'W' ? 'green' : selectedFight.result === 'L' ? 'red' : 'yellow' },
            selectedFight.result === 'W' ? 'VICTORY' : selectedFight.result === 'L' ? 'DEFEAT' : 'DRAW'
          ),
          e(Box, { height: 1 }),
          e(Text, { wrap: 'truncate' }, `vs ${selectedFight.opponentName || 'Unknown'}`),
          e(Text, null, `Date: Week ${selectedFight.date?.week || '?'}, ${selectedFight.date?.year || '?'}`),
          e(Text, null, `Result: ${selectedFight.method || '?'}${selectedFight.method !== 'Decision' ? ` R${selectedFight.round}` : ''}`),
          e(Text, null, `Scheduled: ${selectedFight.totalRounds || '?'} rounds`),
          selectedFight.wasTitle && e(Text, { color: 'yellow' }, 'TITLE FIGHT'),
          e(Box, { height: 1 }),
          selectedFight.replayData
            ? e(Text, { color: theme.fighterA, bold: true }, 'Press ENTER to replay!')
            : e(Text, { color: theme.commentary }, 'No replay available')
        ) : e(Text, { color: theme.commentary }, 'No fight selected')
      )
    ),

    e(Box, { marginTop: 1 },
      e(StatusBar, { left: 'jk: Navigate', center: 'Enter: Replay', right: 'ESC: Back', width })
    )
  );
}

/**
 * Recent Results View
 */
function RecentResultsView({ universe, onBack }) {
  const theme = useTheme();
  const recentWeeks = universe.recentResults || [];

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
  });

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'RECENT RESULTS' }),

    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 1,
      marginTop: 1,
      flexGrow: 1,
      overflow: 'hidden'
    },
      e(Text, { bold: true, color: theme.fighterA }, 'FIGHT RESULTS'),
      e(Box, { height: 1 }),
      recentWeeks.length > 0 ? e(Box, { flexDirection: 'column' },
        ...recentWeeks.slice().reverse().slice(0, 3).flatMap((week, wi) => [
          e(Text, { key: `h${wi}`, bold: true, color: theme.round },
            `Week ${week.date?.week || '?'}, ${week.date?.year || '?'}`
          ),
          ...week.fights.slice(0, 5).map((fight, fi) => {
            return e(Text, { key: `${wi}-${fi}`, color: theme.foreground, wrap: 'truncate' },
              `  ${fight.winnerName} def. ${fight.loserName} (${fight.method}${fight.method !== 'Decision' ? ' R' + fight.round : ''})`
            );
          }),
          e(Box, { key: `s${wi}`, height: 1 })
        ])
      ) : e(Text, { color: theme.commentary }, 'No recent fight results.\nSimulate time to generate fights.')
    ),

    e(ContextBar, {
      context: `${recentWeeks.reduce((sum, w) => sum + (w.fights?.length || 0), 0)} Recent Fights`,
      actions: [{ key: 'ESC', label: 'Back' }]
    })
  );
}

/**
 * Upcoming Fights View
 */
function UpcomingFightsView({ universe, onBack }) {
  const theme = useTheme();
  const matchmaker = new MatchmakingEngine(universe);
  const potentialFights = matchmaker.generateWeeklyFights?.() || [];

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
  });

  const titleFights = potentialFights.filter(f => f.type === 'TITLE_FIGHT');
  const mainEvents = potentialFights.filter(f => f.type === 'MAIN_EVENT');

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'UPCOMING FIGHTS' }),

    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 1,
      marginTop: 1,
      flexGrow: 1,
      overflow: 'hidden'
    },
      potentialFights.length > 0 ? e(Box, { flexDirection: 'column' },
        titleFights.length > 0 && e(Box, { flexDirection: 'column' },
          e(Text, { bold: true, color: theme.round }, 'CHAMPIONSHIP FIGHTS'),
          e(Box, { height: 1 }),
          ...titleFights.slice(0, 3).map((fight, i) => {
            const fA = universe.fighters?.get(fight.fighterA);
            const fB = universe.fighters?.get(fight.fighterB);
            return e(Box, { key: i, flexDirection: 'column', marginBottom: 1 },
              e(Text, { color: 'yellow', wrap: 'truncate' }, `${fight.titleInfo?.organization || ''} ${fight.division} Title`),
              e(Text, { color: theme.fighterA, wrap: 'truncate' }, `${fA?.name || 'TBA'} vs ${fB?.name || 'TBA'}`),
              e(Text, { color: theme.commentary, wrap: 'truncate' }, `${fight.rounds} Rounds`)
            );
          })
        ),
        mainEvents.length > 0 && e(Box, { flexDirection: 'column', marginTop: 1 },
          e(Text, { bold: true, color: theme.round }, 'MAIN EVENTS'),
          e(Box, { height: 1 }),
          ...mainEvents.slice(0, 5).map((fight, i) => {
            const fA = universe.fighters?.get(fight.fighterA);
            const fB = universe.fighters?.get(fight.fighterB);
            return e(Text, { key: i, color: theme.foreground, wrap: 'truncate' },
              `${fA?.name || 'TBA'} vs ${fB?.name || 'TBA'} (${fight.division})`
            );
          })
        )
      ) : e(Text, { color: theme.commentary }, 'No fights currently scheduled.\nSimulate time to generate fight cards.')
    ),

    e(ContextBar, {
      context: `${potentialFights.length} Scheduled`,
      actions: [{ key: 'ESC', label: 'Back' }]
    })
  );
}

/**
 * Hall of Fame View
 */
function HallOfFameView({ universe, onBack }) {
  const theme = useTheme();
  const { width } = useLayout();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inductees = universe.hallOfFame?.getInductees?.() || [];

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack?.();
    else if (key.upArrow || input === 'k') {
      setSelectedIdx(prev => Math.max(0, prev - 1));
    }
    else if (key.downArrow || input === 'j') {
      setSelectedIdx(prev => Math.min(inductees.length - 1, prev + 1));
    }
  });

  const selected = inductees[selectedIdx];

  if (inductees.length === 0) {
    return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
      e(TitleBanner, { title: 'HALL OF FAME' }),
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 2,
        marginTop: 2,
        alignItems: 'center',
        flexGrow: 1
      },
        e(Text, { color: theme.commentary }, 'No Hall of Fame inductees yet.'),
        e(Text, { color: theme.commentary }, ''),
        e(Text, { color: theme.commentary }, 'Fighters become eligible for induction'),
        e(Text, { color: theme.commentary }, '3 years after retirement.')
      ),
      e(ContextBar, {
        context: 'Hall of Fame',
        actions: [{ key: 'ESC', label: 'Back' }]
      })
    );
  }

  const nameWidth = Math.max(12, Math.floor((width - 10) / 2) - 10);

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title: 'HALL OF FAME', subtitle: `${inductees.length} Inductees` }),

    e(Box, { flexDirection: 'row', marginTop: 1, gap: 2, flexGrow: 1, overflow: 'hidden' },
      // Inductee list
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0,
        overflow: 'hidden'
      },
        e(Text, { bold: true, color: theme.fighterA }, 'INDUCTEES'),
        e(Box, { height: 1 }),
        ...inductees.slice(0, 12).map((ind, i) => {
          const isSelected = i === selectedIdx;
          const icon = ind.category === 'FIRST_BALLOT' ? '*' : ' ';
          const name = ind.name.substring(0, nameWidth);
          return e(Box, { key: i },
            e(Text, {
              bold: isSelected,
              color: isSelected ? 'red' : 'white',
              wrap: 'truncate'
            }, (isSelected ? '> ' : '  ') + `${icon} ${name}`)
          );
        })
      ),

      // Details
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        flexGrow: 1,
        flexBasis: 0,
        overflow: 'hidden'
      },
        e(Text, { bold: true, color: theme.fighterA }, 'PROFILE'),
        e(Box, { height: 1 }),
        selected ? e(Box, { flexDirection: 'column' },
          e(Text, { bold: true, color: theme.fighterA, wrap: 'truncate' }, selected.name),
          selected.nickname && e(Text, { color: theme.commentary, wrap: 'truncate' }, `"${selected.nickname}"`),
          e(Box, { height: 1 }),
          e(Text, { wrap: 'truncate' }, `Category: ${(selected.category || '').replace('_', ' ')}`),
          e(Text, { wrap: 'truncate' }, `Inducted: ${selected.inductionDate?.year || '?'}`),
          e(Text, { wrap: 'truncate' }, `Career: ${selected.careerSpan || '?'}`),
          e(Box, { height: 1 }),
          e(Text, { bold: true }, 'RECORD'),
          e(Text, { wrap: 'truncate' }, `${selected.record?.wins || 0}-${selected.record?.losses || 0} (${selected.record?.kos || 0} KOs)`),
          e(Text, { wrap: 'truncate' }, `Peak Ranking: #${selected.peakRanking || '?'}`)
        ) : e(Text, { color: theme.commentary }, 'No inductee selected')
      )
    ),

    e(ContextBar, {
      context: selected ? selected.name : 'Hall of Fame',
      actions: [
        { key: '↑/↓', label: 'Navigate' },
        { key: 'ESC', label: 'Back' }
      ]
    })
  );
}

/**
 * Placeholder View - For features coming soon
 */
function PlaceholderView({ title, description, onBack }) {
  const theme = useTheme();

  useInput((_input, key) => {
    if (key.escape) onBack?.();
  });

  return e(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    e(TitleBanner, { title }),

    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 2,
      marginTop: 1
    },
      e(Text, { color: theme.fighterA, bold: true }, 'Coming Soon'),
      e(Box, { height: 1 }),
      e(Text, { color: theme.commentary }, description),
      e(Box, { height: 1 }),
      e(Text, { color: theme.foreground }, 'This feature is under development.')
    ),

    e(ContextBar, {
      context: title,
      actions: [{ key: 'ESC', label: 'Back' }]
    })
  );
}

/**
 * Main Universe App
 */
function UniverseApp({ universe, saveManager, theme, onExit, onFightReplay }) {
  const [view, setView] = useState('main');
  const [selectedFighter, setSelectedFighter] = useState(null);
  const processor = React.useRef(new WeekProcessor(universe)).current;

  const handleSimComplete = () => {
    setView('main');
  };

  const handleFighterSelect = (fighter) => {
    if (fighter?.fightHistory?.length > 0) {
      setSelectedFighter(fighter);
      setView('fighterHistory');
    }
  };

  const handleReplay = (fight) => {
    if (fight?.replayData && onFightReplay) {
      saveManager?.save?.(universe, 'universe-autosave');
      onFightReplay(fight.replayData);
    }
  };

  return e(ThemeProvider, { themeName: theme },
    e(LayoutProvider, null,
      e(CenteredLayout, { maxWidth: 140, minWidth: 80 },
        e(Box, { flexDirection: 'column', padding: 1, width: '100%', height: '100%', overflow: 'hidden' },
          view === 'main' && e(MainMenuView, {
          universe,
          onNavigate: setView,
          onExit
        }),

        view === 'dashboard' && e(DashboardView, {
          universe,
          onBack: () => setView('main')
        }),

        view === 'simulate' && e(SimulateMenuView, {
          universe,
          processor,
          saveManager,
          onBack: () => setView('main'),
          onSimComplete: handleSimComplete
        }),

        view === 'rankings' && e(RankingsView, {
          universe,
          onBack: () => setView('main')
        }),

        view === 'fighters' && e(FightersView, {
          universe,
          onBack: () => setView('main'),
          onFighterSelect: handleFighterSelect
        }),

        view === 'fighterHistory' && selectedFighter && e(FighterHistoryView, {
          fighter: selectedFighter,
          onBack: () => setView('fighters'),
          onReplay: handleReplay
        }),

        view === 'results' && e(RecentResultsView, {
          universe,
          onBack: () => setView('main')
        }),

        view === 'upcoming' && e(UpcomingFightsView, {
          universe,
          onBack: () => setView('main')
        }),

        view === 'hof' && e(HallOfFameView, {
          universe,
          onBack: () => setView('main')
        }),

        // Placeholder views with proper ESC handling
        view === 'moneyfights' && e(PlaceholderView, {
          title: 'MONEY FIGHTS',
          description: 'Track potential blockbuster matchups and their projected revenue.',
          onBack: () => setView('main')
        }),

        view === 'news' && e(PlaceholderView, {
          title: 'NEWS & EVENTS',
          description: 'Boxing news, upcoming events, and recent headlines.',
          onBack: () => setView('main')
        }),

        view === 'divisions' && e(PlaceholderView, {
          title: 'DIVISION MANAGEMENT',
          description: 'View and manage weight class divisions.',
          onBack: () => setView('main')
        })
        )
      )
    )
  );
}

/**
 * InkUniverseTUI Class - Wrapper for programmatic usage
 */
export class InkUniverseTUI {
  constructor(universe, saveManager, theme = DEFAULT_THEME) {
    this.universe = universe;
    this.saveManager = saveManager;
    this.theme = theme;
    this.inkInstance = null;
    this.onFightReplay = null;
  }

  enterFullscreen() {
    process.stdout.write('\x1b[?1049h');
    process.stdout.write('\x1b[?25l');
    process.stdout.write('\x1b[2J');
    process.stdout.write('\x1b[H');
  }

  exitFullscreen() {
    process.stdout.write('\x1b[?25h');
    process.stdout.write('\x1b[?1049l');
  }

  async run() {
    this.enterFullscreen();

    return new Promise((resolve) => {
      this.inkInstance = render(
        e(UniverseApp, {
          universe: this.universe,
          saveManager: this.saveManager,
          theme: this.theme,
          onExit: () => {
            this.exitFullscreen();
            resolve({ exit: true });
          },
          onFightReplay: (replayData) => {
            this.exitFullscreen();
            resolve({ replayData, theme: this.theme });
          }
        })
      );
    });
  }

  destroy() {
    this.exitFullscreen();
    if (this.inkInstance) {
      this.inkInstance.unmount();
    }
  }
}

export default InkUniverseTUI;
