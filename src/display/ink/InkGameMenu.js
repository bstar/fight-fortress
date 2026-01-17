/**
 * InkGameMenu - Ink-based main menu with fluid layouts
 * Uses React components for a modern, responsive terminal UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ThemeProvider, useTheme, getTheme, DEFAULT_THEME, THEMES } from './InkTheme.js';
import { Menu, MenuItem, TitleBanner, ProgressBar, LoadingSpinner, WhimsicalLoader, StatusBar, LayoutProvider, CenteredLayout } from './components.js';
import { Universe } from '../../universe/models/Universe.js';
import { FighterGenerator } from '../../universe/generation/FighterGenerator.js';
import { WeekProcessor } from '../../universe/simulation/WeekProcessor.js';
import { SaveManager } from '../../universe/persistence/SaveManager.js';
import { BoxingEra, RealismLevel } from '../../universe/economics/EraConfig.js';

const e = React.createElement;

/**
 * Fighter Card Component
 */
function FighterCard({ fighter, isSelected, corner }) {
  const theme = useTheme();
  const cornerColor = corner === 'A' ? theme.fighterA : theme.fighterB;

  if (!fighter) {
    return e(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: isSelected ? cornerColor : theme.border,
      padding: 1,
      width: 35,
      height: 12
    },
      e(Text, { color: theme.commentary, italic: true }, 'Select a fighter...')
    );
  }

  return e(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: isSelected ? cornerColor : theme.border,
    padding: 1,
    width: 35
  },
    e(Text, { bold: true, color: cornerColor }, fighter.name),
    fighter.nickname && e(Text, { italic: true, color: theme.commentary }, `"${fighter.nickname}"`),
    e(Box, { marginTop: 1 }),
    e(Text, { color: theme.foreground }, `Style: ${fighter.style || 'Unknown'}`),
    e(Text, { color: theme.foreground }, `Record: ${fighter.record || 'N/A'}`),
    e(Text, { dimColor: true }, `${fighter.weight || ''} ${fighter.stance || ''}`),
    e(Box, { marginTop: 1 }),
    e(Text, { color: theme.stamina }, `Power: ${fighter.power || 'N/A'}`),
    e(Text, { color: theme.health }, `Speed: ${fighter.speed || 'N/A'}`)
  );
}

/**
 * Fighter Selection Screen
 */
function FighterSelection({ fighters, onSelect, onBack, selectedA, selectedB, selectingCorner }) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');

  const filteredFighters = fighters.filter(f =>
    f.name.toLowerCase().includes(filterText.toLowerCase())
  );

  useInput((input, key) => {
    if (key.escape) {
      onBack?.();
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(filteredFighters.length - 1, prev + 1));
    } else if (key.return) {
      if (filteredFighters[selectedIndex]) {
        onSelect?.(filteredFighters[selectedIndex]);
      }
    }
  });

  return e(Box, { flexDirection: 'column', padding: 1 },
    e(TitleBanner, { title: 'SELECT FIGHTER', subtitle: `Corner ${selectingCorner}` }),

    e(Box, { flexDirection: 'row', gap: 2, marginTop: 1 },
      // Fighter list
      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 1,
        width: 40,
        height: 20
      },
        e(Text, { bold: true, color: theme.fighterA }, 'FIGHTERS'),
        e(Box, { marginTop: 1, flexDirection: 'column' },
          ...filteredFighters.slice(0, 15).map((fighter, i) =>
            e(MenuItem, {
              key: fighter.path,
              label: fighter.name,
              isSelected: i === selectedIndex
            })
          )
        )
      ),

      // Preview cards
      e(Box, { flexDirection: 'column', gap: 1 },
        e(FighterCard, {
          fighter: selectedA,
          isSelected: selectingCorner === 'A',
          corner: 'A'
        }),
        e(Text, { color: theme.round, bold: true }, '        VS'),
        e(FighterCard, {
          fighter: selectedB,
          isSelected: selectingCorner === 'B',
          corner: 'B'
        })
      )
    ),

    e(Box, { marginTop: 1 },
      e(StatusBar, {
        left: '\u2191\u2193/jk: Navigate',
        center: 'ENTER: Select',
        right: 'ESC: Back'
      })
    )
  );
}

/**
 * Fight Options Screen
 */
function FightOptions({ options, onChange, onStart, onBack }) {
  const theme = useTheme();
  const [selectedOption, setSelectedOption] = useState(0);

  const optionsList = [
    { key: 'rounds', label: 'Rounds', value: options.rounds, min: 4, max: 15 },
    { key: 'speed', label: 'Speed', value: options.speed, min: 1, max: 10 },
    { key: 'display', label: 'Display', value: options.display, choices: ['arcade', 'hbo'] },
    { key: 'theme', label: 'Theme', value: options.theme, choices: Object.keys(THEMES) }
  ];

  useInput((input, key) => {
    if (key.escape) {
      onBack?.();
    } else if (key.upArrow || input === 'k') {
      setSelectedOption(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedOption(prev => Math.min(optionsList.length - 1, prev + 1));
    } else if (key.leftArrow || input === 'h') {
      const opt = optionsList[selectedOption];
      if (opt.choices) {
        const idx = opt.choices.indexOf(opt.value);
        const newIdx = (idx - 1 + opt.choices.length) % opt.choices.length;
        onChange?.({ ...options, [opt.key]: opt.choices[newIdx] });
      } else if (opt.min !== undefined) {
        onChange?.({ ...options, [opt.key]: Math.max(opt.min, opt.value - 1) });
      }
    } else if (key.rightArrow || input === 'l') {
      const opt = optionsList[selectedOption];
      if (opt.choices) {
        const idx = opt.choices.indexOf(opt.value);
        const newIdx = (idx + 1) % opt.choices.length;
        onChange?.({ ...options, [opt.key]: opt.choices[newIdx] });
      } else if (opt.max !== undefined) {
        onChange?.({ ...options, [opt.key]: Math.min(opt.max, opt.value + 1) });
      }
    } else if (key.return) {
      onStart?.();
    }
  });

  return e(Box, { flexDirection: 'column', padding: 1 },
    e(TitleBanner, { title: 'FIGHT OPTIONS' }),

    e(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: theme.border,
      padding: 2,
      marginTop: 1
    },
      ...optionsList.map((opt, i) =>
        e(Box, { key: opt.key, flexDirection: 'row', gap: 2 },
          e(Text, {
            color: i === selectedOption ? 'red' : 'white',
            bold: i === selectedOption
          }, (i === selectedOption ? '> ' : '  ') + opt.label.padEnd(10)),
          e(Text, { color: theme.stamina }, '< '),
          e(Text, {
            color: theme.fighterB,
            bold: i === selectedOption
          }, ` ${String(opt.value).padStart(8)} `),
          e(Text, { color: theme.stamina }, ' >')
        )
      ),

      e(Box, { marginTop: 2 },
        e(Text, { color: theme.health, bold: true }, '[ ENTER to START FIGHT ]')
      )
    ),

    e(Box, { marginTop: 1 },
      e(StatusBar, {
        left: '\u2190\u2192/hl: Change',
        center: 'ENTER: Start',
        right: 'ESC: Back'
      })
    )
  );
}

/**
 * Universe Creation Screen
 */
function UniverseCreation({ onComplete, onBack }) {
  const theme = useTheme();
  const [stage, setStage] = useState('era'); // era, generating, simulating, done
  const [selectedEra, setSelectedEra] = useState(0);
  const [progress, setProgress] = useState({ year: 0, total: 5, fighters: 0 });

  // Era definitions - order matters for UI display
  const eras = [
    { id: BoxingEra.GOLDEN_AGE, label: 'Golden Age (1925)', year: 1925, desc: 'Gate-only economics, Dempsey era' },
    { id: BoxingEra.TV_ERA, label: 'TV Era (1965)', year: 1965, desc: 'Closed-circuit TV, Ali era' },
    { id: BoxingEra.PPV_ERA, label: 'PPV Era (1995)', year: 1995, desc: 'Pay-per-view dominance, Tyson era' },
    { id: BoxingEra.MODERN, label: 'Modern (2020)', year: 2020, desc: 'Streaming hybrid, mega-purses' }
  ];

  // Define startUniverseCreation BEFORE useInput to avoid closure issues
  const startUniverseCreation = useCallback(async () => {
    setStage('generating');
    const era = eras[selectedEra];

    if (!era) {
      console.error('No era selected, selectedEra:', selectedEra);
      return;
    }

    // Target ~1500 active fighters across all 17 divisions (~88 per division)
    const targetFighters = 1500;

    // Create universe
    const universe = new Universe({
      name: 'Boxing Universe',
      currentDate: { year: era.year, week: 1 },
      era: era.id,
      startYear: era.year,
      realismLevel: RealismLevel.SIMPLIFIED,
      targetFighterCount: targetFighters,
      fighterCountVariance: 200
    });

    // Generate fighters
    const generator = new FighterGenerator();
    for (let i = 0; i < targetFighters; i++) {
      let age;
      const roll = Math.random();
      if (roll < 0.35) age = 18 + Math.floor(Math.random() * 4);
      else if (roll < 0.65) age = 22 + Math.floor(Math.random() * 5);
      else if (roll < 0.85) age = 27 + Math.floor(Math.random() * 5);
      else age = 32 + Math.floor(Math.random() * 6);

      try {
        const fighter = generator.generate({ currentDate: universe.currentDate, age });
        universe.addFighter(fighter);
      } catch (e) { /* continue */ }

      // Yield frequently to keep UI responsive (every 10 fighters)
      if (i % 10 === 0) {
        setProgress(p => ({ ...p, fighters: i }));
        await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 0));
      }
    }

    setProgress(p => ({ ...p, fighters: targetFighters }));
    setStage('simulating');

    // Simulate 5 years using full SimulationLoop combat engine
    const processor = new WeekProcessor(universe);
    const totalWeeks = 5 * 52;

    for (let week = 0; week < totalWeeks; week++) {
      await processor.processWeek();

      // Yield frequently to keep UI responsive (every 4 weeks)
      if (week % 4 === 0) {
        setProgress({
          year: Math.floor(week / 52) + 1,
          total: 5,
          fighters: universe.getActiveFighters().length
        });
        // Use setImmediate for faster yielding, fall back to setTimeout
        await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 0));
      }
    }

    // Inaugurate championships
    universe.inaugurateChampionships();

    // Save
    const saveManager = new SaveManager();
    saveManager.save(universe, 'universe-autosave');

    setStage('done');
    setTimeout(() => onComplete?.(universe), 500);
  }, [selectedEra, onComplete]);

  // Handle keyboard input for era selection
  useInput((input, key) => {
    if (stage !== 'era') return;

    if (key.escape) {
      onBack?.();
    } else if (key.upArrow || input === 'k') {
      setSelectedEra(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedEra(prev => Math.min(eras.length - 1, prev + 1));
    } else if (key.return) {
      startUniverseCreation();
    }
  });

  if (stage === 'era') {
    return e(Box, { flexDirection: 'column', padding: 1 },
      e(TitleBanner, { title: 'SELECT ERA', subtitle: 'Choose your starting point' }),

      e(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: theme.border,
        padding: 2,
        marginTop: 1
      },
        ...eras.map((era, i) =>
          e(Box, { key: era.id, flexDirection: 'column', marginBottom: 1 },
            e(Text, {
              color: i === selectedEra ? 'red' : 'white',
              bold: i === selectedEra
            }, (i === selectedEra ? '> ' : '  ') + era.label),
            i === selectedEra && e(Text, {
              color: theme.commentary,
              italic: true,
              marginLeft: 2
            }, '  ' + era.desc)
          )
        )
      ),

      e(Box, { marginTop: 1 },
        e(StatusBar, { left: '\u2191\u2193: Select', center: 'ENTER: Create', right: 'ESC: Back' })
      )
    );
  }

  // Loading screens
  return e(Box, {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2
  },
    e(TitleBanner, { title: 'CREATING UNIVERSE' }),

    e(Box, {
      flexDirection: 'column',
      alignItems: 'center',
      borderStyle: 'round',
      borderColor: theme.fighterA,
      padding: 3,
      marginTop: 2
    },
      e(WhimsicalLoader, {
        primaryMessage: stage === 'generating'
          ? `Generating fighters... ${progress.fighters}/1500`
          : `Simulating Year ${progress.year} of ${progress.total}...`,
        showWhimsy: true
      }),

      e(Box, { marginTop: 2, width: 40 },
        e(ProgressBar, {
          value: stage === 'generating'
            ? (progress.fighters / 1500) * 100
            : (progress.year / progress.total) * 100,
          max: 100,
          width: 30,
          color: theme.fighterA,
          showPercent: true
        })
      ),

      e(Box, { marginTop: 1 },
        e(Text, { color: theme.commentary },
          `Active Fighters: ${progress.fighters}`
        )
      )
    )
  );
}

/**
 * Universe Load Screen - Load saved universes
 */
function UniverseLoad({ onComplete, onBack }) {
  const theme = useTheme();
  const [saves, setSaves] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saveManager = new SaveManager();
    const availableSaves = saveManager.listSaves();
    setSaves(availableSaves);
    setLoading(false);
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      onBack?.();
    } else if (saves.length > 0) {
      if (key.upArrow) {
        setSelectedIndex(prev => (prev - 1 + saves.length) % saves.length);
      } else if (key.downArrow) {
        setSelectedIndex(prev => (prev + 1) % saves.length);
      } else if (key.return) {
        const saveManager = new SaveManager();
        try {
          const universe = saveManager.load(saves[selectedIndex].slot);
          onComplete?.(universe);
        } catch (e) {
          // Handle error - stay on screen
        }
      }
    }
  });

  if (loading) {
    return e(Box, { flexDirection: 'column', width: '100%' },
      e(TitleBanner, { title: 'LOAD UNIVERSE', subtitle: 'Loading saves...' }),
      e(LoadingSpinner, { message: 'Loading saved universes...' })
    );
  }

  if (saves.length === 0) {
    return e(Box, { flexDirection: 'column', width: '100%' },
      e(TitleBanner, { title: 'LOAD UNIVERSE', subtitle: 'No saves found' }),

      e(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: theme.border,
        padding: 2,
        marginTop: 1
      },
        e(Text, { color: theme.fighterA, bold: true }, 'No Saved Universes'),
        e(Box, { height: 1 }),
        e(Text, { color: theme.commentary }, 'Create a new universe to get started.'),
        e(Text, { color: theme.foreground }, 'Your universes will be saved automatically.')
      ),

      e(Box, { marginTop: 1, flexGrow: 0 },
        e(StatusBar, { left: '', center: 'ESC: Back', right: '', flexGrow: 1 })
      )
    );
  }

  return e(Box, { flexDirection: 'column', width: '100%' },
    e(TitleBanner, { title: 'LOAD UNIVERSE', subtitle: 'Select a saved universe' }),

    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 1,
      marginTop: 1
    },
      e(Text, { bold: true, color: theme.fighterA }, 'SAVED UNIVERSES'),
      e(Box, { height: 1 }),
      ...saves.map((save, i) => {
        const isSelected = i === selectedIndex;
        const savedDate = save.savedAt ? new Date(save.savedAt).toLocaleDateString() : 'Unknown';
        return e(Box, { key: save.slot, flexDirection: 'row' },
          e(Text, { color: isSelected ? theme.fighterA : theme.foreground },
            isSelected ? '\u25B6 ' : '  '
          ),
          e(Text, {
            bold: isSelected,
            color: isSelected ? theme.fighterA : theme.foreground,
            inverse: isSelected
          }, ` ${save.slot} `),
          e(Text, { color: theme.commentary, dimColor: !isSelected },
            ` (${save.date || 'Unknown'}) - Saved: ${savedDate}`
          )
        );
      })
    ),

    e(Box, { marginTop: 1, flexGrow: 0 },
      e(StatusBar, { left: '\u2191\u2193: Navigate', center: 'ENTER: Load', right: 'ESC: Back', flexGrow: 1 })
    )
  );
}

/**
 * Main Menu Screen - Fixed width layout
 */
function MainMenu({ onNavigate }) {
  const menuItems = [
    { label: 'Quick Fight', value: 'quickFight' },
    { label: 'Select Fighters', value: 'selectFighters' },
    { label: 'Universe Mode', value: 'universe' },
    { label: 'Settings', value: 'settings' },
    { label: 'Exit', value: 'exit' }
  ];

  return e(Box, { flexDirection: 'column', width: '100%' },
    e(TitleBanner, { title: 'FIGHT FORTRESS', subtitle: 'Boxing Simulation Engine' }),

    e(Box, { marginTop: 1, flexGrow: 1 },
      e(Menu, {
        items: menuItems,
        title: 'MAIN MENU',
        flexGrow: 1,
        onSelect: (item) => onNavigate?.(item.value)
      })
    ),

    e(Box, { marginTop: 1, flexGrow: 0 },
      e(StatusBar, {
        left: 'jk/Arrows: Move',
        center: 'Enter: Select',
        right: 'v0.1.0',
        flexGrow: 1
      })
    )
  );
}

/**
 * Universe Menu Screen - Fixed width layout
 */
function UniverseMenu({ onNavigate, onBack }) {
  const menuItems = [
    { label: 'New Universe', value: 'new' },
    { label: 'Load Universe', value: 'load' },
    { label: 'Back', value: 'back' }
  ];

  useInput((_input, key) => {
    if (key.escape) onBack?.();
  });

  return e(Box, { flexDirection: 'column', width: '100%' },
    e(TitleBanner, { title: 'UNIVERSE MODE', subtitle: 'Career Simulation' }),

    e(Box, { marginTop: 1 },
      e(Menu, {
        items: menuItems,
        title: 'OPTIONS',
        width: '100%',
        onSelect: (item) => {
          if (item.value === 'back') onBack?.();
          else onNavigate?.(item.value);
        }
      })
    ),

    e(Box, { marginTop: 1, flexGrow: 0 },
      e(StatusBar, { left: 'Navigate', center: 'Enter: Select', right: 'ESC: Back', flexGrow: 1 })
    )
  );
}

/**
 * Settings Placeholder
 */
function SettingsPlaceholder({ onBack }) {
  const theme = useTheme();

  useInput((_input, key) => {
    if (key.escape) onBack?.();
  });

  return e(Box, { flexDirection: 'column', width: '100%' },
    e(TitleBanner, { title: 'SETTINGS', subtitle: 'Configuration' }),
    e(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: theme.border,
      padding: 2,
      marginTop: 1
    },
      e(Text, { color: theme.fighterA, bold: true }, 'Coming Soon'),
      e(Text, { color: theme.commentary, marginTop: 1 }, 'Settings will include:'),
      e(Text, { color: theme.foreground }, '• Theme selection'),
      e(Text, { color: theme.foreground }, '• Sound options'),
      e(Text, { color: theme.foreground }, '• Display preferences'),
      e(Text, { color: theme.foreground }, '• Keybindings')
    ),
    e(Box, { marginTop: 1, flexGrow: 0 },
      e(StatusBar, { left: '', center: 'ESC: Back', right: '', flexGrow: 1 })
    )
  );
}

/**
 * Main App Component
 */
function GameMenuApp({ onStartFight, onStartUniverse, onExit, initialTheme = DEFAULT_THEME }) {
  const [view, setView] = useState('main');
  const [themeName] = useState(initialTheme);
  const [fighters, setFighters] = useState([]);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [selectingCorner, setSelectingCorner] = useState('A');
  const [fightOptions, setFightOptions] = useState({
    rounds: 12,
    speed: 3,
    display: 'arcade',
    theme: initialTheme
  });

  const { exit } = useApp();

  // Load fighters on mount
  useEffect(() => {
    const fighterDirs = ['fighters/custom', 'fighters/templates/historical'];
    const loaded = [];

    for (const dir of fighterDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);

        for (const file of files) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            try {
              const filePath = path.join(dir, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const config = yaml.parse(content);

              loaded.push({
                name: config.identity?.name || file.replace(/\.(yaml|yml)$/, ''),
                nickname: config.identity?.nickname,
                style: config.style?.primary,
                record: config.record ? `${config.record.wins}-${config.record.losses}` : null,
                weight: config.physical?.weight ? `${config.physical.weight}kg` : null,
                stance: config.physical?.stance,
                power: config.power?.powerRight,
                speed: config.speed?.handSpeed,
                path: filePath,
                config
              });
            } catch (e) { /* skip bad files */ }
          }
        }
      } catch (e) { /* skip bad dirs */ }
    }

    setFighters(loaded);
  }, []);

  const handleNavigation = (destination) => {
    if (destination === 'exit') {
      exit();
      onExit?.();
    } else if (destination === 'quickFight') {
      // Random fight
      if (fighters.length >= 2) {
        const shuffled = [...fighters].sort(() => Math.random() - 0.5);
        onStartFight?.({
          pathA: shuffled[0].path,
          pathB: shuffled[1].path,
          ...fightOptions
        });
      }
    } else {
      setView(destination);
    }
  };

  const handleFighterSelect = (fighter) => {
    if (selectingCorner === 'A') {
      setSelectedA(fighter);
      setSelectingCorner('B');
    } else {
      setSelectedB(fighter);
      setView('options');
    }
  };

  const handleStartFight = () => {
    if (selectedA && selectedB) {
      exit();
      onStartFight?.({
        pathA: selectedA.path,
        pathB: selectedB.path,
        ...fightOptions
      });
    }
  };

  const handleUniverseComplete = (universe) => {
    exit();
    onStartUniverse?.(universe, fightOptions.theme);
  };

  return e(ThemeProvider, { themeName },
    e(LayoutProvider, null,
      e(CenteredLayout, { maxWidth: 120, minWidth: 60 },
        e(Box, { flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' },
          view === 'main' && e(MainMenu, { onNavigate: handleNavigation }),

          view === 'selectFighters' && e(FighterSelection, {
            fighters,
            selectedA,
            selectedB,
            selectingCorner,
            onSelect: handleFighterSelect,
            onBack: () => {
              if (selectingCorner === 'B' && selectedA) {
                setSelectingCorner('A');
              } else {
                setSelectedA(null);
                setSelectedB(null);
                setSelectingCorner('A');
                setView('main');
              }
            }
          }),

          view === 'options' && e(FightOptions, {
            options: fightOptions,
            onChange: setFightOptions,
            onStart: handleStartFight,
            onBack: () => setView('selectFighters')
          }),

          view === 'universe' && e(UniverseMenu, {
            onNavigate: (dest) => {
              if (dest === 'new') setView('universeCreate');
              else if (dest === 'load') setView('universeLoad');
            },
            onBack: () => setView('main')
          }),

          view === 'universeCreate' && e(UniverseCreation, {
            onComplete: handleUniverseComplete,
            onBack: () => setView('universe')
          }),

          view === 'universeLoad' && e(UniverseLoad, {
            onComplete: handleUniverseComplete,
            onBack: () => setView('universe')
          }),

          view === 'settings' && e(SettingsPlaceholder, {
            onBack: () => setView('main')
          })
        )
      )
    )
  );
}

/**
 * InkGameMenu Class - Wrapper for programmatic usage
 */
export class InkGameMenu {
  constructor(options = {}) {
    this.options = options;
    this.theme = options.theme || DEFAULT_THEME;
    this.onStartFight = null;
    this.onStartUniverse = null;
    this.onExit = null;
    this.inkInstance = null;
  }

  enterFullscreen() {
    // Enter alternate screen buffer and hide cursor
    process.stdout.write('\x1b[?1049h'); // Enter alternate buffer
    process.stdout.write('\x1b[?25l');   // Hide cursor
    process.stdout.write('\x1b[2J');     // Clear screen
    process.stdout.write('\x1b[H');      // Move to home position
  }

  exitFullscreen() {
    // Show cursor and exit alternate buffer
    process.stdout.write('\x1b[?25h');   // Show cursor
    process.stdout.write('\x1b[?1049l'); // Exit alternate buffer
  }

  async run() {
    this.enterFullscreen();

    return new Promise((resolve) => {
      this.inkInstance = render(
        e(GameMenuApp, {
          initialTheme: this.theme,
          onStartFight: (config) => {
            this.exitFullscreen();
            resolve(config);
          },
          onStartUniverse: (universe, theme) => {
            this.exitFullscreen();
            resolve({ universe, theme, mode: 'universe' });
          },
          onExit: () => {
            this.exitFullscreen();
            resolve(null);
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

export default InkGameMenu;
