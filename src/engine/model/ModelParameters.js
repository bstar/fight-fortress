/**
 * Model Parameters System
 *
 * Central accessor for all fight simulation parameters.
 * Loads versioned YAML parameter files and provides typed access.
 * Enables parameter tuning without code changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton instance
let instance = null;

export class ModelParameters {
  constructor(version = 'current') {
    this.version = version;
    this.params = {};
    this.overrides = new Map();
    this.loaded = false;
    this.loadVersion(version);
  }

  /**
   * Get the singleton instance (lazy initialization)
   */
  static getInstance(version = 'current') {
    if (!instance) {
      instance = new ModelParameters(version);
    }
    return instance;
  }

  /**
   * Reset singleton (useful for testing with different versions)
   */
  static reset() {
    instance = null;
  }

  /**
   * Get a parameter value by dot-notation path
   * @param {string} path - e.g., 'damage.thresholds.hurt.head'
   * @param {*} defaultValue - fallback if path not found
   */
  static get(path, defaultValue = undefined) {
    const inst = ModelParameters.getInstance();
    return inst.getParam(path, defaultValue);
  }

  /**
   * Get a parameter with an override applied (for testing/tuning)
   * @param {string} path - parameter path
   * @param {*} overrideValue - value to use instead
   */
  static getWithOverride(path, overrideValue) {
    const inst = ModelParameters.getInstance();
    inst.setOverride(path, overrideValue);
    return overrideValue;
  }

  /**
   * Load all parameter files for a version
   */
  loadVersion(version) {
    const versionsDir = path.join(__dirname, 'versions');
    let versionDir;

    if (version === 'current') {
      // Check for 'current' symlink or use latest version
      const currentLink = path.join(versionsDir, 'current');
      if (fs.existsSync(currentLink)) {
        const linkTarget = fs.readlinkSync(currentLink);
        versionDir = path.isAbsolute(linkTarget)
          ? linkTarget
          : path.join(versionsDir, linkTarget);
      } else {
        // Find latest version directory
        const versions = fs.readdirSync(versionsDir)
          .filter(d => d.startsWith('v') && fs.statSync(path.join(versionsDir, d)).isDirectory())
          .sort()
          .reverse();

        if (versions.length === 0) {
          console.warn('ModelParameters: No versions found, using defaults');
          this.loadDefaults();
          return;
        }
        versionDir = path.join(versionsDir, versions[0]);
      }
    } else {
      versionDir = path.join(versionsDir, version);
    }

    if (!fs.existsSync(versionDir)) {
      console.warn(`ModelParameters: Version ${version} not found, using defaults`);
      this.loadDefaults();
      return;
    }

    // Load all YAML files in the version directory
    const files = fs.readdirSync(versionDir).filter(f => f.endsWith('.yaml'));

    for (const file of files) {
      const filePath = path.join(versionDir, file);
      const category = path.basename(file, '.yaml');

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = YAML.parse(content);

        // Store under category name (combat, stamina, ai, scoring)
        this.params[category] = parsed;
      } catch (error) {
        console.error(`ModelParameters: Error loading ${file}:`, error.message);
      }
    }

    this.loaded = true;
    this.version = version;
  }

  /**
   * Load default parameters (hardcoded fallback)
   * These match the current behavior before extraction
   */
  loadDefaults() {
    this.params = {
      combat: {
        damage: {
          thresholds: {
            hurt: { head: 5, body: 8 },
            knockdown: { base: 8, cumulative: 50 },
            ko: { head: 100, body: 120 }
          },
          modifiers: {
            chin_factor: 0.005,
            counter_bonus: 1.25,
            stamina_threshold: 0.5
          }
        },
        accuracy: {
          base_miss_chance: 0.35,
          distance_penalty: 0.15,
          footwork_factor: 0.003
        },
        knockdown: {
          base_chance_at_threshold: 0.50,
          power_punch_multiplier: 1.3,
          counter_multiplier: 1.2,
          cumulative_damage_factor: 0.5,
          stamina_low_multiplier: 1.3
        },
        hurt: {
          base_chance: 0.25,
          damage_ratio_scaling: 0.3,
          chin_modifier_factor: 0.4,
          composure_factor: 300,
          damage_percent_threshold: 0.4,
          damage_percent_multiplier: 0.8,
          low_stamina_threshold: 0.3,
          low_stamina_multiplier: 1.3,
          medium_stamina_threshold: 0.5,
          medium_stamina_multiplier: 1.15,
          min_chance: 0.10,
          max_chance: 0.60
        }
      },
      stamina: {
        base_costs: {
          jab: 0.8,
          cross: 1.2,
          hook: 1.5,
          uppercut: 1.8,
          body_punch: 1.3,
          movement: 0.3,
          clinch: 0.5,
          defense: 0.4
        },
        recovery: {
          base_rate: 0.15,
          between_rounds: 8,
          hurt_penalty: 0.5,
          clinch_bonus: 0.3
        },
        thresholds: {
          conservation: { start: 0.4, aggressive: 0.6 },
          fatigue_warning: 0.3,
          exhaustion: 0.15
        }
      },
      ai: {
        pressure: {
          hurt_opponent_bonus: 0.3,
          winning_rounds_bonus: 0.1,
          behind_on_cards_increase: 0.15
        },
        defense: {
          hurt_priority: 0.8,
          low_stamina_priority: 0.6,
          losing_badly_priority: 0.5
        },
        style_weights: {
          outboxer: { distance: 0.7, movement: 0.8, jab: 0.9 },
          swarmer: { pressure: 0.9, inside: 0.8, volume: 0.9 },
          slugger: { power: 0.9, aggression: 0.8, patience: 0.3 },
          counterpuncher: { timing: 0.9, patience: 0.8, defense: 0.7 }
        }
      },
      scoring: {
        clean_punches: {
          jab: 1,
          power_punch: 2,
          body_punch: 1.5
        },
        effective_aggression: {
          weight: 0.25,
          minimum_output: 10
        },
        ring_generalship: {
          weight: 0.15,
          center_control_bonus: 5
        },
        defense: {
          weight: 0.15,
          clean_defense_bonus: 3
        },
        knockdown: {
          bonus: 20,
          ten_eight_threshold: 1
        },
        stagger: {
          bonus: 30,
          ten_eight_threshold: 2
        }
      }
    };

    this.loaded = true;
    this.version = 'defaults';
  }

  /**
   * Get a parameter value by dot-notation path
   */
  getParam(path, defaultValue = undefined) {
    // Check for override first
    if (this.overrides.has(path)) {
      return this.overrides.get(path);
    }

    const parts = path.split('.');
    let value = this.params;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[part];
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a temporary override for a parameter
   */
  setOverride(path, value) {
    this.overrides.set(path, value);
  }

  /**
   * Clear an override
   */
  clearOverride(path) {
    this.overrides.delete(path);
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides() {
    this.overrides.clear();
  }

  /**
   * Get all parameters as a plain object (for debugging/export)
   */
  getAllParams() {
    return JSON.parse(JSON.stringify(this.params));
  }

  /**
   * Get the current version string
   */
  getVersion() {
    return this.version;
  }

  /**
   * Check if parameters are loaded
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Create a new instance with specific overrides (for parameter sensitivity testing)
   */
  withOverrides(overridesMap) {
    const clone = new ModelParameters(this.version);
    for (const [path, value] of Object.entries(overridesMap)) {
      clone.setOverride(path, value);
    }
    return clone;
  }
}

export default ModelParameters;
