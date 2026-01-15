#!/usr/bin/env node

/**
 * Fight Fortress TUI Entry Point
 * Clean, simple terminal interface
 */

import { createSimulation } from './index.js';
import { ConfigLoader } from './utils/index.js';
import { SimpleTUI } from './display/SimpleTUI.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options = parseOptions(args);

  // Get fighter paths (skip options and their values)
  const pathArgs = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      // Skip option and its value if present
      if (['--rounds', '--speed', '--type'].includes(arg)) {
        i++; // Skip the value too
      }
    } else {
      pathArgs.push(arg);
    }
  }

  // Use default fighters if not specified
  let fighterAPath = pathArgs[0] || join(projectRoot, 'fighters/custom/martinez-roberto.yaml');
  let fighterBPath = pathArgs[1] || join(projectRoot, 'fighters/custom/johnson-james.yaml');

  try {
    // Load fighters
    const fighterA = ConfigLoader.loadFighter(fighterAPath);
    const fighterB = ConfigLoader.loadFighter(fighterBPath);

    // Create fight config
    const fightConfig = {
      rounds: options.rounds || 12,
      type: options.type || 'championship',
      simulation: {
        tickRate: 0.5,
        speedMultiplier: options.speed || 1.0,
        realTime: true,
        enableRenderer: false,  // Disable scrolling renderer
        enableLogging: options.log !== false
      }
    };

    // Create simulation
    const simulation = createSimulation(fighterA, fighterB, fightConfig);

    // Create and initialize TUI
    const tui = new SimpleTUI();
    tui.initialize();

    // Start TUI with fight
    tui.startFight(simulation.fight, simulation);

    // Run simulation
    await simulation.start();

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function parseOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--rounds' && args[i + 1]) {
      options.rounds = parseInt(args[++i], 10);
    } else if (arg === '--speed' && args[i + 1]) {
      options.speed = parseFloat(args[++i]);
    } else if (arg === '--type' && args[i + 1]) {
      options.type = args[++i];
    } else if (arg === '--no-log') {
      options.log = false;
    }
  }

  return options;
}

main();
