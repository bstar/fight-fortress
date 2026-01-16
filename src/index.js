#!/usr/bin/env node

/**
 * Fight Fortress
 * CLI entry point
 */

import { Fighter, Fight } from './models/index.js';
import {
  SimulationLoop,
  FighterAI,
  CombatResolver,
  DamageCalculator,
  StaminaManager,
  PositionTracker
} from './engine/index.js';
import { ConfigLoader } from './utils/index.js';
// Ink-based components (fluid layout system)
import { InkGameMenu } from './display/ink/InkGameMenu.js';
import { InkArcadeTUI } from './display/ink/InkArcadeTUI.js';
import { InkUniverseTUI } from './display/ink/InkUniverseTUI.js';
import { SaveManager } from './universe/persistence/SaveManager.js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create and configure a simulation
 */
export function createSimulation(fighterAConfig, fighterBConfig, fightConfig = {}) {
  // Create fighters
  const fighterA = fighterAConfig instanceof Fighter
    ? fighterAConfig
    : new Fighter(fighterAConfig);

  const fighterB = fighterBConfig instanceof Fighter
    ? fighterBConfig
    : new Fighter(fighterBConfig);

  // Create fight
  const fight = new Fight(fighterA, fighterB, fightConfig);

  // Create engine components
  const fighterAI = new FighterAI();
  const combatResolver = new CombatResolver();
  const damageCalculator = new DamageCalculator();
  const staminaManager = new StaminaManager();
  const positionTracker = new PositionTracker();

  // Create simulation loop
  const simulation = new SimulationLoop(fight, {
    tickRate: fightConfig.simulation?.tickRate || 0.5,
    speedMultiplier: fightConfig.simulation?.speedMultiplier || 1.0,
    realTime: fightConfig.simulation?.realTime !== false,
    enableRenderer: fightConfig.simulation?.enableRenderer !== false,
    enableLogging: fightConfig.simulation?.enableLogging !== false,
    logDir: fightConfig.simulation?.logDir || './logs'
  });

  // Inject components
  simulation.setComponents({
    fighterAI,
    combatResolver,
    damageCalculator,
    staminaManager,
    positionTracker
  });

  return simulation;
}

/**
 * Run a quick simulation (no delays)
 */
export async function simulateFight(fighterAConfig, fighterBConfig, fightConfig = {}) {
  const simulation = createSimulation(fighterAConfig, fighterBConfig, {
    ...fightConfig,
    simulation: {
      ...fightConfig.simulation,
      realTime: false
    }
  });

  return await simulation.runInstant();
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  // No arguments - show interactive game menu
  if (args.length === 0) {
    await runGameMenu();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'fight':
      await runFight(args.slice(1));
      break;

    case 'generate':
      await generateFighter(args.slice(1));
      break;

    case 'validate':
      await validateConfig(args.slice(1));
      break;

    case 'batch':
      await runBatchTest(args.slice(1));
      break;

    case 'menu':
      await runGameMenu();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Fight Fortress

Usage: fight [command] [options]

Running with no arguments launches the interactive menu.

Commands:
  menu                                     Launch interactive menu
  fight <fighterA> <fighterB> [options]   Run a fight simulation
  generate [options]                       Generate a new fighter
  validate <config>                        Validate a configuration file
  batch <fighterA> <fighterB> [options]   Run batch tests (default 100 fights)

Fight Options:
  --rounds <n>          Number of rounds (default: 10)
  --speed <n>           Playback speed multiplier (default: 1.0)
  --instant             Run simulation instantly (no real-time display)
  --simple              Use simple text output instead of TUI
  --output <file>       Save results to file

Generate Options:
  --name <name>         Fighter name
  --style <style>       Primary fighting style
  --tier <tier>         Skill tier (prospect, journeyman, contender, champion)
  --weight-class <wc>   Weight class
  --format <format>     Output format (yaml, json)

Batch Options:
  --count <n>           Number of fights to run (default: 100)
  --rounds <n>          Number of rounds per fight (default: 12)

Examples:
  fight                                                    # Interactive menu
  fight fight fighters/custom/martinez.yaml fighters/custom/johnson.yaml
  fight fight fighters/custom/martinez.yaml fighters/custom/johnson.yaml --instant
  generate --style boxer-puncher --tier contender --format yaml
`);
}

/**
 * Run a fight simulation
 */
async function runFight(args) {
  if (args.length < 2) {
    console.error('Error: Two fighter configurations required');
    console.log('Usage: fight <fighterA> <fighterB> [options]');
    process.exit(1);
  }

  const fighterAPath = args[0];
  const fighterBPath = args[1];

  // Parse options
  const options = parseOptions(args.slice(2));

  try {
    // Load fighters
    console.log(`Loading fighters...`);
    const fighterA = ConfigLoader.loadFighter(fighterAPath);
    const fighterB = ConfigLoader.loadFighter(fighterBPath);

    console.log(`\n${fighterA.name} vs ${fighterB.name}\n`);

    // Run simulation
    if (options.instant) {
      // Instant mode - use basic renderer
      const fightConfig = {
        rounds: options.rounds || 10,
        simulation: {
          speedMultiplier: options.speed || 1.0,
          realTime: false,
          enableRenderer: true
        }
      };

      const simulation = createSimulation(fighterA, fighterB, fightConfig);
      setupEventHandlers(simulation, options);

      console.log('Running instant simulation...\n');
      const result = await simulation.runInstant();
      displayResult(result);
    } else {
      // Real-time mode - use SimpleTUI for better interface
      const fightConfig = {
        rounds: options.rounds || 10,
        simulation: {
          speedMultiplier: options.speed || 1.0,
          realTime: true,
          enableRenderer: false,  // Disable built-in renderer
          enableLogging: true
        }
      };

      const simulation = createSimulation(fighterA, fighterB, fightConfig);

      // Create and initialize TUI based on display mode
      const displayMode = options.display || 'arcade';
      const themeName = options.theme || 'cosmic';
      // Use Ink-based TUI (fluid layouts)
      const tui = new InkArcadeTUI({ theme: themeName });
      tui.initialize();

      // Connect TUI to simulation for round prompts
      simulation.setTUI(tui);

      // Start the fight with selected TUI
      tui.startFight(simulation.fight, simulation);

      // Run simulation
      await simulation.start();

      // Wait for user to exit the TUI
      await tui.waitForExit();
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Set up event handlers for simulation
 */
function setupEventHandlers(simulation, options) {
  simulation.on('roundStart', ({ round }) => {
    console.log(`\n=== ROUND ${round} ===\n`);
  });

  simulation.on('roundEnd', ({ round, scores }) => {
    console.log(`\n--- End of Round ${round} ---`);
    if (scores) {
      console.log('Current scores:', scores.map(s => `${s.A}-${s.B}`).join(', '));
    }
  });

  simulation.on('knockdown', ({ fighter, attacker, punch, round }) => {
    console.log(`\n*** KNOCKDOWN! Fighter ${fighter} is down from a ${punch}! ***\n`);
  });

  simulation.on('hurt', ({ fighter }) => {
    console.log(`Fighter ${fighter} is hurt!`);
  });

  simulation.on('fightEnd', (result) => {
    displayResult({ result });
  });

  if (options.verbose) {
    simulation.on('punchLanded', ({ attacker, punchType, damage }) => {
      console.log(`Fighter ${attacker} lands ${punchType} (${damage} damage)`);
    });
  }
}

/**
 * Display fight result
 */
function displayResult(summary) {
  const result = summary.result;

  console.log('\n' + '='.repeat(60));
  console.log('                    FIGHT RESULT');
  console.log('='.repeat(60));

  if (result.winner) {
    console.log(`\nWINNER: Fighter ${result.winner}`);
    console.log(`Method: ${result.method}`);
    console.log(`Round: ${result.round}, Time: ${formatTime(result.time)}`);
  } else {
    console.log(`\nRESULT: DRAW`);
    console.log(`Method: ${result.method}`);
  }

  if (result.scorecards) {
    console.log('\nScorecards:');
    for (const score of result.scorecards) {
      console.log(`  ${score.judge}: ${score.A}-${score.B}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Format time as MM:SS
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a new fighter
 */
async function generateFighter(args) {
  console.log('Fighter generator not yet implemented.');
  console.log('Check docs/CONFIG_SCHEMA.md for fighter configuration format.');
}

/**
 * Validate a configuration file
 */
async function validateConfig(args) {
  if (args.length === 0) {
    console.error('Error: Configuration file required');
    process.exit(1);
  }

  const filePath = args[0];

  try {
    const config = ConfigLoader.load(filePath);
    const result = ConfigLoader.validateFighter(config);

    if (result.valid) {
      console.log(`\u2713 Configuration is valid: ${filePath}`);
    } else {
      console.log(`\u2717 Configuration errors in: ${filePath}`);
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error loading configuration: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run batch test - multiple fights for statistical analysis
 */
async function runBatchTest(args) {
  if (args.length < 2) {
    console.error('Error: Two fighter configurations required');
    console.log('Usage: batch <fighterA> <fighterB> [--count N] [--rounds N]');
    process.exit(1);
  }

  const fighterAPath = args[0];
  const fighterBPath = args[1];
  const options = parseOptions(args.slice(2));
  const count = options.count || 100;
  const rounds = options.rounds || 12;

  try {
    // Load fighter configs
    const fighterAConfig = ConfigLoader.load(fighterAPath);
    const fighterBConfig = ConfigLoader.load(fighterBPath);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`BATCH TEST: ${count} Fights`);
    console.log(`${fighterAConfig.identity.name} vs ${fighterBConfig.identity.name}`);
    console.log(`${rounds} rounds per fight`);
    console.log(`${'='.repeat(60)}\n`);

    // Results tracking
    const results = {
      fighterAWins: 0,
      fighterBWins: 0,
      draws: 0,
      byMethod: {
        KO: { A: 0, B: 0 },
        TKO: { A: 0, B: 0 },
        Decision: { A: 0, B: 0 },
        Draw: 0
      },
      roundEndings: [],
      knockdowns: { A: 0, B: 0 },
      avgPunchesLanded: { A: 0, B: 0 },
      avgDamage: { A: 0, B: 0 }
    };

    // Progress bar
    process.stdout.write('Progress: ');

    for (let i = 0; i < count; i++) {
      // Create fresh fighters for each fight
      const fighterA = new Fighter(fighterAConfig);
      const fighterB = new Fighter(fighterBConfig);

      // Create fight
      const fight = new Fight(fighterA, fighterB, { rounds });

      // Create engine
      const simulation = new SimulationLoop(fight, {
        realTime: false,
        enableRenderer: false,
        enableLogging: false
      });

      simulation.setComponents({
        fighterAI: new FighterAI(),
        combatResolver: new CombatResolver(),
        damageCalculator: new DamageCalculator(),
        staminaManager: new StaminaManager(),
        positionTracker: new PositionTracker()
      });

      // Run fight
      await simulation.runInstant();

      // Collect results
      const result = fight.result;

      if (result.winner === 'A') {
        results.fighterAWins++;
      } else if (result.winner === 'B') {
        results.fighterBWins++;
      } else {
        results.draws++;
      }

      // Track method
      const method = result.method || 'Decision';
      if (method.includes('KO') && !method.includes('TKO')) {
        results.byMethod.KO[result.winner] = (results.byMethod.KO[result.winner] || 0) + 1;
      } else if (method.includes('TKO')) {
        results.byMethod.TKO[result.winner] = (results.byMethod.TKO[result.winner] || 0) + 1;
      } else if (method === 'DRAW' || !result.winner) {
        results.byMethod.Draw++;
      } else {
        results.byMethod.Decision[result.winner] = (results.byMethod.Decision[result.winner] || 0) + 1;
      }

      // Track round endings for stoppages
      if (result.round && result.method !== 'DECISION') {
        results.roundEndings.push(result.round);
      }

      // Track knockdowns
      results.knockdowns.A += fighterA.knockdownsTotal;
      results.knockdowns.B += fighterB.knockdownsTotal;

      // Track punches and damage
      results.avgPunchesLanded.A += fighterA.fightStats.punchesLanded;
      results.avgPunchesLanded.B += fighterB.fightStats.punchesLanded;
      results.avgDamage.A += fighterA.headDamage + fighterA.bodyDamage;
      results.avgDamage.B += fighterB.headDamage + fighterB.bodyDamage;

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write('█');
      }
    }

    console.log(' Done!\n');

    // Calculate averages
    results.avgPunchesLanded.A = Math.round(results.avgPunchesLanded.A / count);
    results.avgPunchesLanded.B = Math.round(results.avgPunchesLanded.B / count);
    results.avgDamage.A = Math.round(results.avgDamage.A / count);
    results.avgDamage.B = Math.round(results.avgDamage.B / count);

    // Display results
    console.log(`${'='.repeat(60)}`);
    console.log('RESULTS SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nOverall Record:`);
    console.log(`  ${fighterAConfig.identity.name}: ${results.fighterAWins} wins (${(results.fighterAWins/count*100).toFixed(1)}%)`);
    console.log(`  ${fighterBConfig.identity.name}: ${results.fighterBWins} wins (${(results.fighterBWins/count*100).toFixed(1)}%)`);
    console.log(`  Draws: ${results.draws} (${(results.draws/count*100).toFixed(1)}%)`);

    console.log(`\nBy Method:`);
    console.log(`  KOs:       ${fighterAConfig.identity.name} ${results.byMethod.KO.A || 0} | ${fighterBConfig.identity.name} ${results.byMethod.KO.B || 0}`);
    console.log(`  TKOs:      ${fighterAConfig.identity.name} ${results.byMethod.TKO.A || 0} | ${fighterBConfig.identity.name} ${results.byMethod.TKO.B || 0}`);
    console.log(`  Decisions: ${fighterAConfig.identity.name} ${results.byMethod.Decision.A || 0} | ${fighterBConfig.identity.name} ${results.byMethod.Decision.B || 0}`);
    console.log(`  Draws:     ${results.byMethod.Draw}`);

    const totalStoppages = results.roundEndings.length;
    if (totalStoppages > 0) {
      const avgStoppageRound = results.roundEndings.reduce((a, b) => a + b, 0) / totalStoppages;
      console.log(`\nStoppage Stats:`);
      console.log(`  Total Stoppages: ${totalStoppages} (${(totalStoppages/count*100).toFixed(1)}%)`);
      console.log(`  Avg Stoppage Round: ${avgStoppageRound.toFixed(1)}`);
      console.log(`  1st Round Stoppages: ${results.roundEndings.filter(r => r === 1).length}`);
    }

    console.log(`\nKnockdown Stats:`);
    console.log(`  ${fighterAConfig.identity.name}: ${results.knockdowns.A} total (${(results.knockdowns.A/count).toFixed(2)} avg/fight)`);
    console.log(`  ${fighterBConfig.identity.name}: ${results.knockdowns.B} total (${(results.knockdowns.B/count).toFixed(2)} avg/fight)`);

    console.log(`\nPunch Stats (avg per fight):`);
    console.log(`  ${fighterAConfig.identity.name}: ${results.avgPunchesLanded.A} landed`);
    console.log(`  ${fighterBConfig.identity.name}: ${results.avgPunchesLanded.B} landed`);

    console.log(`\nDamage Stats (avg per fight):`);
    console.log(`  ${fighterAConfig.identity.name}: ${results.avgDamage.A} total damage taken`);
    console.log(`  ${fighterBConfig.identity.name}: ${results.avgDamage.B} total damage taken`);

    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Run Universe Mode with the InkUniverseTUI
 */
async function runUniverseMode(universe, saveManager, theme) {
  while (true) {
    const universeTUI = new InkUniverseTUI(universe, saveManager, theme);
    const result = await universeTUI.run();

    if (result.exit) {
      // User chose to exit universe mode
      return;
    }

    if (result.replayData) {
      // User wants to replay a fight
      await runFightReplay({
        replayData: result.replayData,
        theme: result.theme || theme,
        rounds: result.replayData.rounds || 12,
        speed: 3,
        display: 'arcade'
      });
      // After replay, continue back to universe TUI
      continue;
    }

    // Shouldn't reach here, but just in case
    return;
  }
}

/**
 * Game-style Interactive Menu
 * Uses Ink for fluid React-based layouts
 */
async function runGameMenu() {
  while (true) {
    const menu = new InkGameMenu();
    const result = await menu.run();

    if (!result) {
      // User chose to exit
      return;
    }

    // Check if this is universe mode
    if (result.mode === 'universe' && result.universe) {
      // Launch Universe TUI
      const saveManager = new SaveManager();
      await runUniverseMode(result.universe, saveManager, result.theme || 'cosmic');
      continue;
    }

    // Check if this is a fight replay from universe mode
    if (result.replayData) {
      await runFightReplay(result);
    } else if (result.pathA && result.pathB) {
      // User selected a fight - run it
      await runFight([
        result.pathA,
        result.pathB,
        '--rounds', String(result.rounds),
        '--speed', String(result.speed),
        '--display', result.display || 'arcade',
        '--theme', result.theme || 'cosmic'
      ]);
    }

    // Loop back to menu automatically after fight ends
  }
}

/**
 * Run a fight replay from universe mode using fighter snapshots
 */
async function runFightReplay(result) {
  const { replayData, rounds, speed, display, theme } = result;

  try {
    // Create fighters from snapshot data
    const fighterA = new Fighter({
      identity: replayData.fighterA.identity,
      physical: replayData.fighterA.physical,
      style: replayData.fighterA.style,
      power: replayData.fighterA.power,
      speed: replayData.fighterA.speed,
      stamina: replayData.fighterA.stamina,
      defense: replayData.fighterA.defense,
      offense: replayData.fighterA.offense,
      technical: replayData.fighterA.technical,
      mental: replayData.fighterA.mental,
      tactics: replayData.fighterA.tactics,
      corner: replayData.fighterA.corner,
      record: replayData.fighterA.record
    });

    const fighterB = new Fighter({
      identity: replayData.fighterB.identity,
      physical: replayData.fighterB.physical,
      style: replayData.fighterB.style,
      power: replayData.fighterB.power,
      speed: replayData.fighterB.speed,
      stamina: replayData.fighterB.stamina,
      defense: replayData.fighterB.defense,
      offense: replayData.fighterB.offense,
      technical: replayData.fighterB.technical,
      mental: replayData.fighterB.mental,
      tactics: replayData.fighterB.tactics,
      corner: replayData.fighterB.corner,
      record: replayData.fighterB.record
    });

    console.log(`\nREPLAY: ${fighterA.name} vs ${fighterB.name}\n`);

    // Create fight configuration
    const fightConfig = {
      rounds: rounds || replayData.rounds || 10,
      simulation: {
        speedMultiplier: speed || 3,
        realTime: true,
        enableRenderer: false,
        enableLogging: true
      }
    };

    const simulation = createSimulation(fighterA, fighterB, fightConfig);

    // Create and initialize TUI based on display mode
    const themeName = theme || 'cosmic';
    // Use Ink-based TUI (fluid layouts)
    const tui = new InkArcadeTUI({ theme: themeName });
    tui.initialize();

    // Connect TUI to simulation for round prompts
    simulation.setTUI(tui);

    // Start the fight with selected TUI
    tui.startFight(simulation.fight, simulation);

    // Run simulation
    await simulation.start();

    // Wait for user to exit the TUI
    await tui.waitForExit();

  } catch (error) {
    console.error(`Error running fight replay: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

/**
 * Interactive Main Menu (Legacy text-based version)
 */
async function runMainMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.clear();

  while (true) {
    printMenuHeader();
    console.log('  1. Start a Fight');
    console.log('  2. Quick Fight (Default Fighters)');
    console.log('  3. Run Batch Test');
    console.log('  4. List Fighters');
    console.log('  5. View Fighter Profile');
    console.log('  6. Help');
    console.log('  0. Exit');
    console.log('');
    console.log('─'.repeat(50));

    const choice = await question('\n  Enter choice: ');

    switch (choice.trim()) {
      case '1':
        await menuStartFight(question);
        break;

      case '2':
        await menuQuickFight(rl);
        break;

      case '3':
        await menuBatchTest(question);
        break;

      case '4':
        await menuListFighters();
        await question('\n  Press Enter to continue...');
        break;

      case '5':
        await menuViewFighter(question);
        break;

      case '6':
        printHelp();
        await question('\n  Press Enter to continue...');
        break;

      case '0':
      case 'q':
      case 'quit':
      case 'exit':
        console.log('\n  Thanks for using Fight Fortress!\n');
        rl.close();
        return;

      default:
        console.log('\n  Invalid choice. Please try again.');
        await question('  Press Enter to continue...');
    }

    console.clear();
  }
}

/**
 * Print the menu header
 */
function printMenuHeader() {
  console.log('');
  console.log('╔' + '═'.repeat(48) + '╗');
  console.log('║' + '      🥊  FIGHT FORTRESS  🥊      '.padStart(40).padEnd(48) + '║');
  console.log('╠' + '═'.repeat(48) + '╣');
  console.log('║' + '              MAIN MENU              '.padStart(36).padEnd(48) + '║');
  console.log('╚' + '═'.repeat(48) + '╝');
  console.log('');
}

/**
 * Menu option: Start a fight with fighter selection
 */
async function menuStartFight(question) {
  console.clear();
  console.log('\n  ═══ START A FIGHT ═══\n');

  // Get available fighters
  const fighters = getAvailableFighters();

  if (fighters.length < 2) {
    console.log('  Not enough fighters available. Need at least 2.');
    await question('  Press Enter to continue...');
    return;
  }

  // Display fighters
  console.log('  Available Fighters:\n');
  fighters.forEach((f, i) => {
    console.log(`    ${i + 1}. ${f.name}`);
  });
  console.log('');

  // Select fighter A
  const choiceA = await question('  Select Fighter A (number): ');
  const indexA = parseInt(choiceA, 10) - 1;
  if (isNaN(indexA) || indexA < 0 || indexA >= fighters.length) {
    console.log('  Invalid selection.');
    await question('  Press Enter to continue...');
    return;
  }

  // Select fighter B
  const choiceB = await question('  Select Fighter B (number): ');
  const indexB = parseInt(choiceB, 10) - 1;
  if (isNaN(indexB) || indexB < 0 || indexB >= fighters.length) {
    console.log('  Invalid selection.');
    await question('  Press Enter to continue...');
    return;
  }

  if (indexA === indexB) {
    console.log('  Cannot select the same fighter twice.');
    await question('  Press Enter to continue...');
    return;
  }

  // Get fight options
  const roundsInput = await question('  Number of rounds (default 12): ');
  const rounds = parseInt(roundsInput, 10) || 12;

  const speedInput = await question('  Playback speed 1-10 (default 3): ');
  const speed = parseFloat(speedInput) || 3;

  console.log(`\n  Starting fight: ${fighters[indexA].name} vs ${fighters[indexB].name}`);
  console.log(`  Rounds: ${rounds}, Speed: ${speed}x\n`);

  await question('  Press Enter to begin...');

  // Run the fight
  await runFight([
    fighters[indexA].path,
    fighters[indexB].path,
    '--rounds', String(rounds),
    '--speed', String(speed)
  ]);

  await question('\n  Press Enter to return to menu...');
}

/**
 * Menu option: Quick fight with default fighters
 */
async function menuQuickFight(rl) {
  const defaultFighters = [
    'fighters/custom/martinez-roberto.yaml',
    'fighters/custom/johnson-james.yaml'
  ];

  // Check if default fighters exist
  const exists = defaultFighters.every(f => {
    try {
      fs.accessSync(f);
      return true;
    } catch {
      return false;
    }
  });

  if (!exists) {
    console.log('\n  Default fighters not found.');
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    await question('  Press Enter to continue...');
    return;
  }

  console.clear();
  console.log('\n  Starting Quick Fight...\n');

  await runFight([
    defaultFighters[0],
    defaultFighters[1],
    '--rounds', '10',
    '--speed', '3'
  ]);

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  await question('\n  Press Enter to return to menu...');
}

/**
 * Menu option: Run batch test
 */
async function menuBatchTest(question) {
  console.clear();
  console.log('\n  ═══ BATCH TEST ═══\n');

  const fighters = getAvailableFighters();

  if (fighters.length < 2) {
    console.log('  Not enough fighters available.');
    await question('  Press Enter to continue...');
    return;
  }

  // Display fighters
  console.log('  Available Fighters:\n');
  fighters.forEach((f, i) => {
    console.log(`    ${i + 1}. ${f.name}`);
  });
  console.log('');

  // Select fighters
  const choiceA = await question('  Select Fighter A (number): ');
  const indexA = parseInt(choiceA, 10) - 1;
  if (isNaN(indexA) || indexA < 0 || indexA >= fighters.length) {
    console.log('  Invalid selection.');
    await question('  Press Enter to continue...');
    return;
  }

  const choiceB = await question('  Select Fighter B (number): ');
  const indexB = parseInt(choiceB, 10) - 1;
  if (isNaN(indexB) || indexB < 0 || indexB >= fighters.length) {
    console.log('  Invalid selection.');
    await question('  Press Enter to continue...');
    return;
  }

  const countInput = await question('  Number of fights (default 50): ');
  const count = parseInt(countInput, 10) || 50;

  const roundsInput = await question('  Rounds per fight (default 12): ');
  const rounds = parseInt(roundsInput, 10) || 12;

  console.log(`\n  Running ${count} fights...\n`);

  await runBatchTest([
    fighters[indexA].path,
    fighters[indexB].path,
    '--count', String(count),
    '--rounds', String(rounds)
  ]);

  await question('\n  Press Enter to return to menu...');
}

/**
 * Menu option: List available fighters
 */
async function menuListFighters() {
  console.clear();
  console.log('\n  ═══ AVAILABLE FIGHTERS ═══\n');

  const fighters = getAvailableFighters();

  if (fighters.length === 0) {
    console.log('  No fighters found.\n');
    return;
  }

  for (const fighter of fighters) {
    try {
      const config = ConfigLoader.load(fighter.path);
      const name = config.identity?.name || fighter.name;
      const nickname = config.identity?.nickname ? `"${config.identity.nickname}"` : '';
      const style = config.style?.primary || 'unknown';
      const record = config.record
        ? `${config.record.wins}-${config.record.losses}-${config.record.draws || 0}`
        : 'N/A';

      console.log(`  ${nickname ? nickname + ' ' : ''}${name}`);
      console.log(`    Style: ${style.charAt(0).toUpperCase() + style.slice(1)}`);
      console.log(`    Record: ${record}`);
      console.log('');
    } catch (e) {
      console.log(`  ${fighter.name} (error loading details)`);
    }
  }
}

/**
 * Menu option: View fighter profile
 */
async function menuViewFighter(question) {
  console.clear();
  console.log('\n  ═══ VIEW FIGHTER ═══\n');

  const fighters = getAvailableFighters();

  if (fighters.length === 0) {
    console.log('  No fighters found.');
    await question('  Press Enter to continue...');
    return;
  }

  fighters.forEach((f, i) => {
    console.log(`    ${i + 1}. ${f.name}`);
  });
  console.log('');

  const choice = await question('  Select fighter (number): ');
  const index = parseInt(choice, 10) - 1;

  if (isNaN(index) || index < 0 || index >= fighters.length) {
    console.log('  Invalid selection.');
    await question('  Press Enter to continue...');
    return;
  }

  try {
    const config = ConfigLoader.load(fighters[index].path);

    console.clear();
    console.log('\n' + '═'.repeat(60));
    console.log(`  ${config.identity?.name || 'Unknown Fighter'}`);
    if (config.identity?.nickname) {
      console.log(`  "${config.identity.nickname}"`);
    }
    console.log('═'.repeat(60));

    console.log(`\n  Physical:`);
    console.log(`    Height: ${config.physical?.height || 'N/A'} cm`);
    console.log(`    Weight: ${config.physical?.weight || 'N/A'} kg`);
    console.log(`    Reach:  ${config.physical?.reach || 'N/A'} cm`);
    console.log(`    Age:    ${config.physical?.age || 'N/A'}`);
    console.log(`    Stance: ${config.physical?.stance || 'N/A'}`);

    console.log(`\n  Style:`);
    console.log(`    Primary:   ${config.style?.primary || 'N/A'}`);
    console.log(`    Defensive: ${config.style?.defensive || 'N/A'}`);
    console.log(`    Offensive: ${config.style?.offensive || 'N/A'}`);

    console.log(`\n  Record:`);
    const r = config.record || {};
    console.log(`    ${r.wins || 0}-${r.losses || 0}-${r.draws || 0} (${r.kos || 0} KOs)`);

    console.log(`\n  Key Attributes:`);
    console.log(`    Power:     L${config.power?.powerLeft || 'N/A'} / R${config.power?.powerRight || 'N/A'}`);
    console.log(`    Speed:     ${config.speed?.handSpeed || 'N/A'} (hands) / ${config.speed?.footSpeed || 'N/A'} (feet)`);
    console.log(`    Defense:   ${config.defense?.headMovement || 'N/A'} (head mvmt) / ${config.defense?.blocking || 'N/A'} (block)`);
    console.log(`    Chin:      ${config.mental?.chin || 'N/A'}`);
    console.log(`    Heart:     ${config.mental?.heart || 'N/A'}`);

    console.log('\n' + '═'.repeat(60));

  } catch (e) {
    console.log(`\n  Error loading fighter: ${e.message}`);
  }

  await question('\n  Press Enter to continue...');
}

/**
 * Get list of available fighters
 */
function getAvailableFighters() {
  const fighters = [];
  const fighterDirs = ['fighters/custom', 'fighters/templates/historical'];

  for (const dir of fighterDirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
          const filePath = path.join(dir, file);
          const name = file.replace(/\.(yaml|yml|json)$/, '').replace(/-/g, ' ');
          fighters.push({
            name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            path: filePath
          });
        }
      }
    } catch (e) {
      // Directory doesn't exist or can't be read
    }
  }

  return fighters;
}

/**
 * Parse command line options
 */
function parseOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--rounds' && args[i + 1]) {
      options.rounds = parseInt(args[++i], 10);
    } else if (arg === '--speed' && args[i + 1]) {
      options.speed = parseFloat(args[++i]);
    } else if (arg === '--instant') {
      options.instant = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--count' && args[i + 1]) {
      options.count = parseInt(args[++i], 10);
    } else if (arg === '--display' && args[i + 1]) {
      options.display = args[++i];  // 'hbo' or 'arcade'
    } else if (arg === '--theme' && args[i + 1]) {
      options.theme = args[++i];  // cosmic, catppuccin, tokyoNight, gruvbox, rosePine
    }
  }

  return options;
}

// Export for programmatic use
export { Fighter, Fight, SimulationLoop, ConfigLoader };

// Run CLI if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
