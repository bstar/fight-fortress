/**
 * FightRecordStore - Persistence layer for fight records
 *
 * Handles saving, loading, and querying fight records.
 * Supports both file-based storage and in-memory caching.
 */

import fs from 'fs/promises';
import path from 'path';
import FightRecord from './FightRecord.js';

export class FightRecordStore {
  /**
   * Create a store instance
   * @param {object} options - Store configuration
   */
  constructor(options = {}) {
    this.basePath = options.basePath || './data/fight-records';
    this.inMemoryCache = new Map();
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.useCache = options.useCache !== false;
    this.initialized = false;
  }

  /**
   * Initialize the store (create directories if needed)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'by-date'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'by-fighter'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'by-version'), { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize FightRecordStore:', error);
      throw error;
    }
  }

  /**
   * Save a fight record
   * @param {FightRecord} record - Record to save
   * @returns {string} Record ID
   */
  async save(record) {
    await this.initialize();

    const recordData = record.toJSON();
    const recordId = recordData.id;

    // Save to main storage
    const filePath = this.getRecordPath(recordId);
    await fs.writeFile(filePath, JSON.stringify(recordData, null, 2));

    // Update cache
    if (this.useCache) {
      this.addToCache(recordId, record);
    }

    // Create index entries
    await this.updateIndices(recordData);

    return recordId;
  }

  /**
   * Load a fight record by ID
   * @param {string} recordId - Record ID
   * @returns {FightRecord|null} Record or null if not found
   */
  async load(recordId) {
    // Check cache first
    if (this.useCache && this.inMemoryCache.has(recordId)) {
      return this.inMemoryCache.get(recordId);
    }

    await this.initialize();

    const filePath = this.getRecordPath(recordId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const record = FightRecord.fromJSON(JSON.parse(data));

      if (this.useCache) {
        this.addToCache(recordId, record);
      }

      return record;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a fight record
   * @param {string} recordId - Record ID to delete
   * @returns {boolean} True if deleted
   */
  async delete(recordId) {
    await this.initialize();

    const filePath = this.getRecordPath(recordId);

    try {
      await fs.unlink(filePath);
      this.inMemoryCache.delete(recordId);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Query records by fighter
   * @param {string} fighterId - Fighter ID
   * @param {object} options - Query options
   * @returns {Array<FightRecord>} Matching records
   */
  async queryByFighter(fighterId, options = {}) {
    await this.initialize();

    const indexPath = path.join(this.basePath, 'by-fighter', `${fighterId}.json`);

    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const recordIds = JSON.parse(indexData);

      const records = await Promise.all(
        recordIds
          .slice(0, options.limit || 100)
          .map(id => this.load(id))
      );

      return records.filter(r => r !== null);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Query records by date range
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @param {object} options - Query options
   * @returns {Array<FightRecord>} Matching records
   */
  async queryByDateRange(startDate, endDate, options = {}) {
    await this.initialize();

    const datePath = path.join(this.basePath, 'by-date');

    try {
      const files = await fs.readdir(datePath);
      const matchingFiles = files.filter(f => {
        const dateStr = f.replace('.json', '');
        return dateStr >= startDate && dateStr <= endDate;
      });

      const allRecordIds = [];
      for (const file of matchingFiles) {
        const data = await fs.readFile(path.join(datePath, file), 'utf-8');
        allRecordIds.push(...JSON.parse(data));
      }

      const records = await Promise.all(
        allRecordIds
          .slice(0, options.limit || 100)
          .map(id => this.load(id))
      );

      return records.filter(r => r !== null);
    } catch (error) {
      return [];
    }
  }

  /**
   * Query records by model version
   * @param {string} version - Model version
   * @param {object} options - Query options
   * @returns {Array<FightRecord>} Matching records
   */
  async queryByVersion(version, options = {}) {
    await this.initialize();

    const indexPath = path.join(this.basePath, 'by-version', `${version}.json`);

    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const recordIds = JSON.parse(indexData);

      const records = await Promise.all(
        recordIds
          .slice(0, options.limit || 100)
          .map(id => this.load(id))
      );

      return records.filter(r => r !== null);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get all record IDs
   * @returns {Array<string>} All record IDs
   */
  async getAllIds() {
    await this.initialize();

    try {
      const files = await fs.readdir(this.basePath);
      return files
        .filter(f => f.endsWith('.json') && !f.startsWith('.'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get store statistics
   * @returns {object} Store stats
   */
  async getStats() {
    await this.initialize();

    const ids = await this.getAllIds();

    return {
      totalRecords: ids.length,
      cacheSize: this.inMemoryCache.size,
      basePath: this.basePath
    };
  }

  /**
   * Clear all records (use with caution!)
   */
  async clear() {
    await this.initialize();

    const files = await fs.readdir(this.basePath);

    for (const file of files) {
      const filePath = path.join(this.basePath, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        await fs.unlink(filePath);
      } else if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true });
      }
    }

    this.inMemoryCache.clear();

    // Recreate directory structure
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get file path for a record
   * @param {string} recordId - Record ID
   * @returns {string} File path
   */
  getRecordPath(recordId) {
    return path.join(this.basePath, `${recordId}.json`);
  }

  /**
   * Add record to in-memory cache
   * @param {string} recordId - Record ID
   * @param {FightRecord} record - Record to cache
   */
  addToCache(recordId, record) {
    // Evict oldest if at capacity
    if (this.inMemoryCache.size >= this.maxCacheSize) {
      const oldestKey = this.inMemoryCache.keys().next().value;
      this.inMemoryCache.delete(oldestKey);
    }

    this.inMemoryCache.set(recordId, record);
  }

  /**
   * Update index files for quick lookups
   * @param {object} recordData - Record data
   */
  async updateIndices(recordData) {
    // Index by fighter
    const fighterIds = [recordData.fighterA?.id, recordData.fighterB?.id].filter(Boolean);

    for (const fighterId of fighterIds) {
      await this.appendToIndex(
        path.join(this.basePath, 'by-fighter', `${fighterId}.json`),
        recordData.id
      );
    }

    // Index by date
    const dateKey = recordData.timestamp.split('T')[0];
    await this.appendToIndex(
      path.join(this.basePath, 'by-date', `${dateKey}.json`),
      recordData.id
    );

    // Index by version
    await this.appendToIndex(
      path.join(this.basePath, 'by-version', `${recordData.version}.json`),
      recordData.id
    );
  }

  /**
   * Append record ID to an index file
   * @param {string} indexPath - Index file path
   * @param {string} recordId - Record ID to append
   */
  async appendToIndex(indexPath, recordId) {
    let ids = [];

    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      ids = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start fresh
    }

    if (!ids.includes(recordId)) {
      ids.push(recordId);
      await fs.writeFile(indexPath, JSON.stringify(ids, null, 2));
    }
  }

  /**
   * Export records to a single file
   * @param {string} outputPath - Output file path
   * @param {object} options - Export options
   */
  async exportToFile(outputPath, options = {}) {
    await this.initialize();

    const ids = await this.getAllIds();
    const records = [];

    for (const id of ids.slice(0, options.limit || Infinity)) {
      const record = await this.load(id);
      if (record) {
        records.push(record.toJSON());
      }
    }

    await fs.writeFile(outputPath, JSON.stringify(records, null, 2));

    return records.length;
  }

  /**
   * Import records from a file
   * @param {string} inputPath - Input file path
   * @returns {number} Number of records imported
   */
  async importFromFile(inputPath) {
    await this.initialize();

    const data = await fs.readFile(inputPath, 'utf-8');
    const records = JSON.parse(data);

    let imported = 0;

    for (const recordData of records) {
      const record = FightRecord.fromJSON(recordData);
      await this.save(record);
      imported++;
    }

    return imported;
  }
}

// Default singleton instance
export const defaultStore = new FightRecordStore();

export default FightRecordStore;
