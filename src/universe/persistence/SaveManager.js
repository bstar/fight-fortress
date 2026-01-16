/**
 * Save Manager
 * Handles saving and loading universe state to/from disk
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Universe } from '../models/Universe.js';

const SAVE_DIR = 'saves';
const AUTOSAVE_INTERVAL = 52; // Autosave every year (52 weeks)

export class SaveManager {
  constructor(basePath = '.') {
    this.basePath = basePath;
    this.savePath = path.join(basePath, SAVE_DIR);
    this.ensureSaveDirectory();
  }

  /**
   * Ensure save directory exists
   */
  ensureSaveDirectory() {
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }
  }

  /**
   * Save universe to disk
   * @param {Universe} universe
   * @param {string} slotName - Save slot name
   * @returns {string} Path to save file
   */
  save(universe, slotName = 'quicksave') {
    const saveData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      universe: universe.toJSON()
    };

    const filename = `${slotName}.yaml`;
    const filepath = path.join(this.savePath, filename);

    // Write main save file
    fs.writeFileSync(filepath, yaml.stringify(saveData));

    // Also save a metadata file for quick listing
    this.updateMetadata(slotName, universe);

    console.log(`Universe saved to ${filepath}`);
    return filepath;
  }

  /**
   * Load universe from disk
   * @param {string} slotName - Save slot name
   * @returns {Universe}
   */
  load(slotName = 'quicksave') {
    const filename = `${slotName}.yaml`;
    const filepath = path.join(this.savePath, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Save file not found: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const saveData = yaml.parse(content);

    // Version check
    if (!saveData.version) {
      console.warn('Loading save file without version info');
    }

    const universe = Universe.fromJSON(saveData.universe);
    console.log(`Universe loaded from ${filepath}`);
    console.log(`Date: ${universe.getDateString()}, Fighters: ${universe.fighters.size}`);

    return universe;
  }

  /**
   * Check if autosave is needed
   * @param {Universe} universe
   * @returns {boolean}
   */
  shouldAutosave(universe) {
    return universe.currentDate.week % AUTOSAVE_INTERVAL === 0;
  }

  /**
   * Perform autosave
   * @param {Universe} universe
   */
  autosave(universe) {
    const slotName = `autosave-${universe.currentDate.year}`;
    this.save(universe, slotName);

    // Keep only last 3 autosaves
    this.cleanupAutosaves(3);
  }

  /**
   * Update save metadata for quick listing
   */
  updateMetadata(slotName, universe) {
    const metadataPath = path.join(this.savePath, 'saves.json');

    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (e) {
        metadata = {};
      }
    }

    metadata[slotName] = {
      name: universe.name,
      date: universe.getDateString(),
      fighters: universe.fighters.size,
      savedAt: new Date().toISOString()
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * List all available saves
   * @returns {Object[]}
   */
  listSaves() {
    const metadataPath = path.join(this.savePath, 'saves.json');

    if (!fs.existsSync(metadataPath)) {
      return [];
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      return Object.entries(metadata).map(([slot, data]) => ({
        slot,
        ...data
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Delete a save
   * @param {string} slotName
   */
  deleteSave(slotName) {
    const filename = `${slotName}.yaml`;
    const filepath = path.join(this.savePath, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Update metadata
    const metadataPath = path.join(this.savePath, 'saves.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      delete metadata[slotName];
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
  }

  /**
   * Cleanup old autosaves, keeping only the most recent N
   * @param {number} keepCount
   */
  cleanupAutosaves(keepCount) {
    const saves = this.listSaves()
      .filter(s => s.slot.startsWith('autosave-'))
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    const toDelete = saves.slice(keepCount);
    for (const save of toDelete) {
      this.deleteSave(save.slot);
    }
  }

  /**
   * Export universe summary as JSON (for external tools)
   */
  exportSummary(universe, filename = 'universe-summary.json') {
    const summary = universe.getSummary();
    const filepath = path.join(this.savePath, filename);

    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    return filepath;
  }

  /**
   * Create a backup of current save
   */
  backup(slotName) {
    const sourcePath = path.join(this.savePath, `${slotName}.yaml`);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Save file not found: ${slotName}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.savePath, 'backups');

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const destPath = path.join(backupPath, `${slotName}-${timestamp}.yaml`);
    fs.copyFileSync(sourcePath, destPath);

    return destPath;
  }

  /**
   * Check save integrity
   */
  verifySave(slotName) {
    try {
      const universe = this.load(slotName);
      return {
        valid: true,
        fighters: universe.fighters.size,
        date: universe.getDateString()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default SaveManager;
