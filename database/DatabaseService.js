// database/DatabaseService.js
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

// Database version tracking
export const DATABASE_VERSION = 2; // Start with version 2 to test migrations

export class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      // Open database
      this.db = await SQLite.openDatabaseAsync('silverback_sentry.db');
      
      // Get current database version
      const currentVersion = await this.getDatabaseVersion();
      console.log(`Current database version: ${currentVersion}, App version: ${DATABASE_VERSION}`);
      
      // Run migrations if needed
      await this.runMigrations(currentVersion);
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async getDatabaseVersion() {
    try {
      // Check if user_version table exists
      const tableExists = await this.db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_version'"
      );
      
      if (!tableExists) {
        return 0;
      }
      
      const result = await this.db.getFirstAsync('SELECT version FROM user_version');
      return result ? result.version : 0;
    } catch (error) {
      console.log('No version table found, returning 0');
      return 0;
    }
  }

  async setDatabaseVersion(version) {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO user_version (id, version) VALUES (1, ?)',
      version
    );
  }

  async runMigrations(currentVersion) {
    console.log(`Running migrations from version ${currentVersion} to ${DATABASE_VERSION}`);
    
    // Create migrations in order
    const migrations = [
      { version: 1, migrate: () => this.migrateToV1() },
      { version: 2, migrate: () => this.migrateToV2() },
    ];
    
    // Execute migrations in sequence
    for (const migration of migrations) {
      if (currentVersion < migration.version) {
        console.log(`Applying migration to version ${migration.version}`);
        await migration.migrate();
        await this.setDatabaseVersion(migration.version);
      }
    }
    
    // Final version set
    if (currentVersion < DATABASE_VERSION) {
      await this.setDatabaseVersion(DATABASE_VERSION);
    }
  }

  // Migration to Version 1 - Initial schema
  async migrateToV1() {
    console.log('Creating initial schema (Version 1)...');
    
    // Create user_version table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_version (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL
      );
    `);
    
    // Create observations table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        local_id TEXT,
        gorilla_group TEXT NOT NULL,
        location TEXT NOT NULL,
        location_name TEXT,
        health_status TEXT,
        notes TEXT,
        user_name TEXT,
        user_email TEXT,
        user_id TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        synced_at TEXT,
        status TEXT DEFAULT 'pending',
        attended_at TEXT,
        attended_by TEXT,
        attended_by_name TEXT,
        firestore_id TEXT,
        created_at_timestamp INTEGER
      );
    `);
    
    // Create indexes for better query performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_observations_synced ON observations(synced);
      CREATE INDEX IF NOT EXISTS idx_observations_status ON observations(status);
      CREATE INDEX IF NOT EXISTS idx_observations_created_at ON observations(created_at);
      CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id);
    `);
    
    console.log('Version 1 migration complete');
  }

  // Migration to Version 2 - Add new fields
  async migrateToV2() {
    console.log('Migrating to Version 2 - Adding new fields...');
    
    // Add new columns for better tracking
    const alterQueries = [
      "ALTER TABLE observations ADD COLUMN group_size INTEGER DEFAULT 0;",
      "ALTER TABLE observations ADD COLUMN threat_level TEXT DEFAULT 'low';",
      "ALTER TABLE observations ADD COLUMN photo_uri TEXT;",
      "ALTER TABLE observations ADD COLUMN last_modified INTEGER;",
    ];
    
    for (const query of alterQueries) {
      try {
        await this.db.execAsync(query);
        console.log(`Executed: ${query}`);
      } catch (error) {
        console.log(`Column might already exist: ${error.message}`);
      }
    }
    
    console.log('Version 2 migration complete');
  }

  // CRUD Operations
  
  // Create observation
  async insertObservation(observation) {
    try {
      const query = `
        INSERT INTO observations (
          id, local_id, gorilla_group, location, location_name, health_status, notes,
          user_name, user_email, user_id, created_at, synced, synced_at, status,
          attended_at, attended_by, attended_by_name, firestore_id, created_at_timestamp,
          group_size, threat_level, last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await this.db.runAsync(query, [
        observation.id,
        observation.localId || observation.id,
        observation.gorillaGroup,
        observation.location,
        observation.locationName || null,
        observation.healthStatus || null,
        observation.notes || null,
        observation.userName || null,
        observation.userEmail || null,
        observation.userId || null,
        observation.createdAt,
        observation.synced ? 1 : 0,
        observation.syncedAt || null,
        observation.status || 'pending',
        observation.attendedAt || null,
        observation.attendedBy || null,
        observation.attendedByName || null,
        observation.firestoreId || null,
        observation.createdAtTimestamp || Date.now(),
        observation.groupSize || 0,
        observation.threatLevel || 'low',
        observation.lastModified || Date.now()
      ]);
      
      console.log('Observation inserted:', observation.id);
      return result;
    } catch (error) {
      console.error('Error inserting observation:', error);
      throw error;
    }
  }

  // Read all observations
  async getAllObservations() {
    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM observations 
        ORDER BY created_at DESC
      `);
      
      return results.map(row => ({
        id: row.id,
        gorillaGroup: row.gorilla_group,
        location: row.location,
        locationName: row.location_name,
        healthStatus: row.health_status,
        notes: row.notes,
        userName: row.user_name,
        userEmail: row.user_email,
        userId: row.user_id,
        createdAt: row.created_at,
        synced: row.synced === 1,
        syncedAt: row.synced_at,
        status: row.status,
        attendedAt: row.attended_at,
        attendedBy: row.attended_by,
        attendedByName: row.attended_by_name,
        firestoreId: row.firestore_id,
        groupSize: row.group_size,
        threatLevel: row.threat_level,
        photoUri: row.photo_uri,
        lastModified: row.last_modified,
      }));
    } catch (error) {
      console.error('Error getting observations:', error);
      return [];
    }
  }

  // Get unsynced observations
  async getUnsyncedObservations() {
    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM observations 
        WHERE synced = 0 
        ORDER BY created_at ASC
      `);
      
      return results;
    } catch (error) {
      console.error('Error getting unsynced observations:', error);
      return [];
    }
  }

  // Get observations by status
  async getObservationsByStatus(status) {
    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM observations 
        WHERE status = ? 
        ORDER BY created_at DESC
      `, status);
      
      return results;
    } catch (error) {
      console.error('Error getting observations by status:', error);
      return [];
    }
  }

  // Update observation
  async updateObservation(id, updates) {
    try {
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
      
      values.push(id);
      
      const query = `UPDATE observations SET ${fields.join(', ')}, last_modified = ? WHERE id = ?`;
      values.splice(values.length - 1, 0, Date.now());
      
      await this.db.runAsync(query, values);
      console.log('Observation updated:', id);
      return true;
    } catch (error) {
      console.error('Error updating observation:', error);
      return false;
    }
  }

  // Mark observation as synced
  async markAsSynced(id, firestoreId) {
    try {
      await this.db.runAsync(`
        UPDATE observations 
        SET synced = 1, synced_at = ?, firestore_id = ?
        WHERE id = ?
      `, new Date().toISOString(), firestoreId, id);
      
      console.log('Observation marked as synced:', id);
      return true;
    } catch (error) {
      console.error('Error marking as synced:', error);
      return false;
    }
  }

  // Mark observation as attended
  async markAsAttended(id, userId, userName) {
    try {
      await this.db.runAsync(`
        UPDATE observations 
        SET status = 'attended', attended_at = ?, attended_by = ?, attended_by_name = ?
        WHERE id = ?
      `, new Date().toISOString(), userId, userName, id);
      
      console.log('Observation marked as attended:', id);
      return true;
    } catch (error) {
      console.error('Error marking as attended:', error);
      return false;
    }
  }

  // Delete observation
  async deleteObservation(id) {
    try {
      await this.db.runAsync('DELETE FROM observations WHERE id = ?', id);
      console.log('Observation deleted:', id);
      return true;
    } catch (error) {
      console.error('Error deleting observation:', error);
      return false;
    }
  }

  // Get observation by ID
  async getObservationById(id) {
    try {
      const result = await this.db.getFirstAsync(`
        SELECT * FROM observations WHERE id = ?
      `, id);
      
      return result;
    } catch (error) {
      console.error('Error getting observation by ID:', error);
      return null;
    }
  }

  // Get observations count
  async getObservationsCount() {
    try {
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM observations');
      return result ? result.count : 0;
    } catch (error) {
      console.error('Error getting count:', error);
      return 0;
    }
  }

  // Get pending sync count
  async getPendingSyncCount() {
    try {
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM observations WHERE synced = 0');
      return result ? result.count : 0;
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  }

  // Clear synced observations older than N days
  async clearOldSyncedObservations(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await this.db.runAsync(`
        DELETE FROM observations 
        WHERE synced = 1 AND status = 'attended' AND created_at < ?
      `, cutoffDate.toISOString());
      
      console.log(`Cleared ${result.changes} old synced observations`);
      return result.changes;
    } catch (error) {
      console.error('Error clearing old observations:', error);
      return 0;
    }
  }

  // Close database connection
  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.isInitialized = false;
      console.log('Database closed');
    }
  }
}

// Singleton instance
let databaseInstance = null;

export const getDatabase = async () => {
  if (!databaseInstance) {
    databaseInstance = new DatabaseService();
    await databaseInstance.init();
  }
  return databaseInstance;
};