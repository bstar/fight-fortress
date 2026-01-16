/**
 * Fighter Generator
 * Procedurally generates fighters based on archetypes with controlled randomization
 */

import { UniverseFighter, TalentTier, CareerPhase } from '../models/UniverseFighter.js';
import { NameGenerator } from './NameGenerator.js';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Talent tier modifiers and distribution
// Heavily weighted toward "tomato cans" - elite talent is RARE
const TALENT_CONFIG = {
  [TalentTier.GENERATIONAL]: { chance: 0.002, ceilingMod: 1.25, baseMod: 1.18 },  // 0.2% - Once in a generation
  [TalentTier.ELITE]: { chance: 0.008, ceilingMod: 1.12, baseMod: 1.10 },         // 0.8% - World champion caliber
  [TalentTier.WORLD_CLASS]: { chance: 0.03, ceilingMod: 1.05, baseMod: 1.04 },    // 3% - Can compete for titles
  [TalentTier.CONTENDER]: { chance: 0.06, ceilingMod: 0.96, baseMod: 0.98 },      // 6% - Top 15 material
  [TalentTier.GATEKEEPER]: { chance: 0.15, ceilingMod: 0.88, baseMod: 0.92 },     // 15% - Tests prospects
  [TalentTier.JOURNEYMAN]: { chance: 0.30, ceilingMod: 0.78, baseMod: 0.82 },     // 30% - Fills cards
  [TalentTier.CLUB]: { chance: 0.35, ceilingMod: 0.68, baseMod: 0.72 }            // 35% - Local level only
};

// Weight class configuration
const WEIGHT_CLASSES = [
  { name: 'Heavyweight', min: 90.7, max: 120 },
  { name: 'Cruiserweight', min: 79.4, max: 90.7 },
  { name: 'Light Heavyweight', min: 76.2, max: 79.4 },
  { name: 'Super Middleweight', min: 72.6, max: 76.2 },
  { name: 'Middleweight', min: 69.9, max: 72.6 },
  { name: 'Super Welterweight', min: 66.7, max: 69.9 },
  { name: 'Welterweight', min: 63.5, max: 66.7 },
  { name: 'Super Lightweight', min: 61.2, max: 63.5 },
  { name: 'Lightweight', min: 58.97, max: 61.2 },
  { name: 'Super Featherweight', min: 57.15, max: 58.97 },
  { name: 'Featherweight', min: 55.34, max: 57.15 }
];

export class FighterGenerator {
  constructor() {
    this.nameGenerator = new NameGenerator();
    this.archetypes = new Map();
    this.loadArchetypes();
  }

  /**
   * Load archetype YAML files
   */
  loadArchetypes() {
    const archetypeDir = path.join(__dirname, 'archetypes');

    try {
      const files = fs.readdirSync(archetypeDir).filter(f => f.endsWith('.yaml'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(archetypeDir, file), 'utf8');
        const archetype = yaml.parse(content);
        const key = file.replace('.yaml', '');
        this.archetypes.set(key, archetype);
      }

      // Archetypes loaded silently
    } catch (error) {
      console.error('Error loading archetypes:', error.message);
      // Create default archetypes if files don't exist
      this.createDefaultArchetypes();
    }
  }

  /**
   * Create minimal default archetypes if YAML loading fails
   */
  createDefaultArchetypes() {
    this.archetypes.set('balanced', {
      name: 'Balanced Fighter',
      attributes: this.getDefaultAttributeRanges()
    });
  }

  /**
   * Get default attribute ranges for fallback
   */
  getDefaultAttributeRanges() {
    const defaultRange = { base: 70, variance: 10 };
    return {
      power: {
        powerLeft: defaultRange,
        powerRight: defaultRange,
        knockoutPower: defaultRange,
        bodyPunching: defaultRange,
        punchingStamina: defaultRange
      },
      speed: {
        handSpeed: defaultRange,
        footSpeed: defaultRange,
        reflexes: defaultRange,
        firstStep: defaultRange,
        combinationSpeed: defaultRange
      },
      stamina: {
        cardio: defaultRange,
        recoveryRate: defaultRange,
        workRate: defaultRange,
        secondWind: defaultRange,
        paceControl: defaultRange
      },
      defense: {
        headMovement: defaultRange,
        blocking: defaultRange,
        parrying: defaultRange,
        shoulderRoll: defaultRange,
        clinchDefense: defaultRange,
        clinchOffense: defaultRange,
        ringAwareness: defaultRange
      },
      offense: {
        jabAccuracy: defaultRange,
        powerAccuracy: defaultRange,
        bodyAccuracy: defaultRange,
        punchSelection: defaultRange,
        feinting: defaultRange,
        counterPunching: defaultRange,
        combinationPunching: defaultRange
      },
      technical: {
        footwork: defaultRange,
        distanceManagement: defaultRange,
        insideFighting: defaultRange,
        outsideFighting: defaultRange,
        ringGeneralship: defaultRange,
        adaptability: defaultRange,
        fightIQ: defaultRange
      },
      mental: {
        chin: defaultRange,
        heart: defaultRange,
        killerInstinct: defaultRange,
        composure: defaultRange,
        intimidation: defaultRange,
        confidence: defaultRange,
        experience: { base: 50, variance: 10 },
        clutchFactor: defaultRange
      }
    };
  }

  /**
   * Generate a new fighter
   * @param {Object} options - Generation options
   * @returns {UniverseFighter}
   */
  generate(options = {}) {
    const {
      archetype = this.selectRandomArchetype(),
      talentTier = this.rollTalentTier(),
      weightClass = this.selectRandomWeightClass(),
      age = this.rollAge(18, 24),
      currentDate = { year: 2000, week: 1 }
    } = options;

    const template = this.archetypes.get(archetype) || this.archetypes.values().next().value;
    const talentConfig = TALENT_CONFIG[talentTier];

    // Generate identity
    const nameData = this.nameGenerator.generate(options.region);
    const nickname = this.generateNickname(template);

    // Generate physical attributes
    const physical = this.generatePhysical(template, weightClass, talentConfig);

    // Generate style
    const style = this.generateStyle(template);

    // Generate all attribute categories
    const attributes = {};
    for (const category of ['power', 'speed', 'stamina', 'defense', 'offense', 'technical', 'mental']) {
      attributes[category] = this.generateAttributeCategory(
        template.attributes?.[category] || this.getDefaultAttributeRanges()[category],
        talentConfig,
        age
      );
    }

    // Generate potential
    const potential = this.generatePotential(talentTier, template, age);

    // Generate personality
    const personality = this.generatePersonality(template);

    // Calculate birth date
    const birthDate = {
      year: currentDate.year - age,
      week: Math.floor(Math.random() * 52) + 1
    };

    // Build fighter config
    const fighterConfig = {
      identity: {
        name: nameData.fullName,
        nickname,
        nationality: nameData.nationality,
        hometown: this.nameGenerator.generateHometown(nameData.nationality)
      },
      physical,
      style,
      ...attributes,
      record: { wins: 0, losses: 0, draws: 0, kos: 0 }
    };

    // Create universe fighter
    const fighter = new UniverseFighter(fighterConfig, {
      birthDate,
      tier: talentTier,
      ceiling: potential.ceiling,
      growthRate: potential.growthRate,
      peakAgePhysical: potential.peakAgePhysical,
      peakAgeMental: potential.peakAgeMental,
      resilience: potential.resilience,
      phase: age >= 18 ? CareerPhase.AMATEUR : CareerPhase.YOUTH,
      personality
    });

    return fighter;
  }

  /**
   * Roll for talent tier based on weighted distribution
   */
  rollTalentTier() {
    const roll = Math.random();
    let cumulative = 0;

    for (const [tier, config] of Object.entries(TALENT_CONFIG)) {
      cumulative += config.chance;
      if (roll < cumulative) {
        return tier;
      }
    }

    return TalentTier.JOURNEYMAN;
  }

  /**
   * Select a random archetype
   */
  selectRandomArchetype() {
    const archetypes = Array.from(this.archetypes.keys());
    return archetypes[Math.floor(Math.random() * archetypes.length)];
  }

  /**
   * Select a random weight class
   */
  selectRandomWeightClass() {
    return WEIGHT_CLASSES[Math.floor(Math.random() * WEIGHT_CLASSES.length)];
  }

  /**
   * Roll age with slight bias toward younger
   */
  rollAge(min, max) {
    // Slight bias toward younger ages
    const range = max - min;
    const roll = Math.pow(Math.random(), 0.8); // Bias toward 0
    return Math.floor(min + roll * range);
  }

  /**
   * Generate physical attributes
   */
  generatePhysical(template, weightClass, talentConfig) {
    const heightRange = template.physical?.height || { min: 170, max: 195 };
    const height = this.randomInRange(heightRange.min, heightRange.max);

    // Weight based on weight class
    const weight = this.randomInRange(weightClass.min, weightClass.max);

    // Reach based on height with archetype modifier
    const reachMod = template.physical?.reach?.modifier || 0;
    const baseReach = height * 1.02; // Typical reach/height ratio
    const reach = Math.round(baseReach + reachMod + this.randomInRange(-3, 3));

    // Body type from template
    const bodyType = this.selectWeighted(
      template.physical?.bodyType?.options || ['average'],
      template.physical?.bodyType?.weights || [100]
    );

    // Age will be set by caller
    const stance = Math.random() < 0.85 ? 'orthodox' : 'southpaw';

    return {
      height: Math.round(height),
      weight: Math.round(weight * 10) / 10,
      reach: Math.round(reach),
      age: 20, // Placeholder, will be updated
      stance,
      bodyType
    };
  }

  /**
   * Generate fighting style
   */
  generateStyle(template) {
    const primary = this.selectWeighted(
      template.style?.primary?.options || ['boxer-puncher'],
      template.style?.primary?.weights || [100]
    );

    const defensive = this.selectWeighted(
      template.style?.defensive?.options || ['high-guard'],
      template.style?.defensive?.weights || [100]
    );

    const offensive = this.selectWeighted(
      template.style?.offensive?.options || ['combo-puncher'],
      template.style?.offensive?.weights || [100]
    );

    return { primary, defensive, offensive };
  }

  /**
   * Generate attributes for a category
   */
  generateAttributeCategory(categoryTemplate, talentConfig, age) {
    const result = {};

    for (const [attr, config] of Object.entries(categoryTemplate)) {
      const base = config.base || 65;
      const variance = config.variance || 10;

      // Apply talent modifier
      let value = base * talentConfig.baseMod;

      // Add variance
      value += (Math.random() * 2 - 1) * variance;

      // Age modifier - young fighters start lower
      const ageModifier = this.getAgeStartModifier(age, attr);
      value *= ageModifier;

      // Clamp to valid range
      result[attr] = Math.round(Math.max(30, Math.min(99, value)));
    }

    return result;
  }

  /**
   * Get age-based starting modifier
   * Young fighters haven't reached their potential yet
   */
  getAgeStartModifier(age, attr) {
    if (age >= 26) return 1.0;

    // Experience always starts very low for young fighters
    if (attr === 'experience') {
      return 0.3 + (age - 18) * 0.05;
    }

    // Physical attributes closer to natural level
    const physicalAttrs = ['powerLeft', 'powerRight', 'handSpeed', 'footSpeed', 'reflexes', 'chin'];
    if (physicalAttrs.includes(attr)) {
      return 0.85 + (age - 18) * 0.02;
    }

    // Technical/mental develop more with age
    return 0.75 + (age - 18) * 0.03;
  }

  /**
   * Generate potential stats
   */
  generatePotential(talentTier, template, age) {
    const talentConfig = TALENT_CONFIG[talentTier];
    const devConfig = template.development || {};

    // Ceiling based on talent tier
    const baseCeiling = 75;
    const ceiling = Math.round(baseCeiling * talentConfig.ceilingMod);

    // Growth rate with some variance
    const baseGrowth = devConfig.growthModifier || 1.0;
    const growthRate = baseGrowth * (0.9 + Math.random() * 0.2);

    // Peak ages
    const peakPhysicalRange = devConfig.peakAgePhysical || { min: 26, max: 30 };
    const peakMentalRange = devConfig.peakAgeMental || { min: 28, max: 33 };

    const peakAgePhysical = this.randomInRange(peakPhysicalRange.min, peakPhysicalRange.max);
    const peakAgeMental = this.randomInRange(peakMentalRange.min, peakMentalRange.max);

    // Resilience (how well they age)
    const resilience = 0.3 + Math.random() * 0.5;

    return {
      ceiling,
      growthRate,
      peakAgePhysical,
      peakAgeMental,
      resilience
    };
  }

  /**
   * Generate personality traits
   */
  generatePersonality(template) {
    const personalityConfig = template.personality || {};
    const result = {};

    for (const trait of ['ambition', 'riskTolerance', 'loyalty', 'workEthic']) {
      const config = personalityConfig[trait] || { base: 50, variance: 25 };
      let value = config.base + (Math.random() * 2 - 1) * config.variance;
      result[trait] = Math.round(Math.max(0, Math.min(100, value)));
    }

    return result;
  }

  /**
   * Generate nickname from archetype templates
   */
  generateNickname(template) {
    const nicknames = template.nicknames || ['The Fighter'];

    // 30% chance of no nickname
    if (Math.random() < 0.3) return null;

    return nicknames[Math.floor(Math.random() * nicknames.length)];
  }

  /**
   * Select from weighted options
   */
  selectWeighted(options, weights) {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < options.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return options[i];
      }
    }

    return options[0];
  }

  /**
   * Random value in range
   */
  randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Generate a batch of fighters
   * @param {number} count - Number of fighters to generate
   * @param {Object} options - Generation options
   * @returns {UniverseFighter[]}
   */
  generateBatch(count, options = {}) {
    const fighters = [];

    for (let i = 0; i < count; i++) {
      fighters.push(this.generate(options));
    }

    return fighters;
  }

  /**
   * Generate fighters to populate a weight class
   * @param {Object} weightClass - Weight class config
   * @param {number} count - Number of fighters
   * @param {Object} options - Additional options
   */
  generateForWeightClass(weightClass, count, options = {}) {
    return this.generateBatch(count, { ...options, weightClass });
  }

  /**
   * Get available archetypes
   */
  getArchetypeNames() {
    return Array.from(this.archetypes.keys());
  }

  /**
   * Reset name generator for new universe
   */
  reset() {
    this.nameGenerator.reset();
  }
}

export default FighterGenerator;
