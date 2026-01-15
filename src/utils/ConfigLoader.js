/**
 * Configuration Loader
 * Loads and parses YAML/JSON configuration files
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { Fighter } from '../models/Fighter.js';

export class ConfigLoader {
  /**
   * Load a configuration file (YAML or JSON)
   */
  static load(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');

    // Determine format from extension
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return parseYaml(content);
    } else if (filePath.endsWith('.json')) {
      return JSON.parse(content);
    } else {
      // Try YAML first, then JSON
      try {
        return parseYaml(content);
      } catch {
        return JSON.parse(content);
      }
    }
  }

  /**
   * Load a fighter configuration
   */
  static loadFighter(filePath) {
    const config = this.load(filePath);
    return Fighter.fromConfig(config);
  }

  /**
   * Load fight configuration
   */
  static loadFightConfig(filePath) {
    const config = this.load(filePath);

    // Load fighters if specified as paths
    if (typeof config.fighterA === 'string') {
      config.fighterA = this.loadFighter(config.fighterA);
    }
    if (typeof config.fighterB === 'string') {
      config.fighterB = this.loadFighter(config.fighterB);
    }

    return config;
  }

  /**
   * Validate fighter configuration
   */
  static validateFighter(config) {
    const errors = [];

    // Required fields
    if (!config.identity?.name) {
      errors.push('Missing required field: identity.name');
    }

    // Physical validation
    if (config.physical) {
      if (config.physical.height && (config.physical.height < 150 || config.physical.height > 220)) {
        errors.push('Height must be between 150 and 220 cm');
      }
      if (config.physical.weight && (config.physical.weight < 45 || config.physical.weight > 150)) {
        errors.push('Weight must be between 45 and 150 kg');
      }
      if (config.physical.age && (config.physical.age < 18 || config.physical.age > 50)) {
        errors.push('Age must be between 18 and 50');
      }
    }

    // Attribute validation (1-100 range)
    const attributeGroups = ['power', 'speed', 'stamina', 'defense', 'offense', 'technical', 'mental'];
    for (const group of attributeGroups) {
      if (config[group]) {
        for (const [key, value] of Object.entries(config[group])) {
          if (typeof value === 'number' && (value < 1 || value > 100)) {
            errors.push(`${group}.${key} must be between 1 and 100`);
          }
        }
      }
    }

    // Style validation
    const validStyles = {
      primary: ['out-boxer', 'swarmer', 'slugger', 'boxer-puncher', 'counter-puncher', 'inside-fighter', 'volume-puncher', 'switch-hitter'],
      defensive: ['peek-a-boo', 'philly-shell', 'high-guard', 'slick', 'distance'],
      offensive: ['jab-and-move', 'combo-puncher', 'body-snatcher', 'headhunter', 'hitman', 'mauler']
    };

    if (config.style) {
      if (config.style.primary && !validStyles.primary.includes(config.style.primary)) {
        errors.push(`Invalid primary style: ${config.style.primary}`);
      }
      if (config.style.defensive && !validStyles.defensive.includes(config.style.defensive)) {
        errors.push(`Invalid defensive style: ${config.style.defensive}`);
      }
      if (config.style.offensive && !validStyles.offensive.includes(config.style.offensive)) {
        errors.push(`Invalid offensive style: ${config.style.offensive}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge configuration with defaults
   */
  static mergeWithDefaults(config, defaults) {
    const merged = { ...defaults };

    for (const [key, value] of Object.entries(config)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.mergeWithDefaults(value, defaults[key] || {});
      } else if (value !== undefined) {
        merged[key] = value;
      }
    }

    return merged;
  }
}

export default ConfigLoader;
