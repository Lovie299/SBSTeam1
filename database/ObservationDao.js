// database/ObservationDao.js
import { getDatabase } from './DatabaseService';

export class ObservationDao {
  static async insert(observation) {
    const db = await getDatabase();
    return db.insertObservation(observation);
  }

  static async getAll() {
    const db = await getDatabase();
    return db.getAllObservations();
  }

  static async getById(id) {
    const db = await getDatabase();
    return db.getObservationById(id);
  }

  static async getUnsynced() {
    const db = await getDatabase();
    return db.getUnsyncedObservations();
  }

  static async getByStatus(status) {
    const db = await getDatabase();
    return db.getObservationsByStatus(status);
  }

  static async update(id, updates) {
    const db = await getDatabase();
    return db.updateObservation(id, updates);
  }

  static async markAsSynced(id, firestoreId) {
    const db = await getDatabase();
    return db.markAsSynced(id, firestoreId);
  }

  static async markAsAttended(id, userId, userName) {
    const db = await getDatabase();
    return db.markAsAttended(id, userId, userName);
  }

  static async delete(id) {
    const db = await getDatabase();
    return db.deleteObservation(id);
  }

  static async getCount() {
    const db = await getDatabase();
    return db.getObservationsCount();
  }

  static async getPendingCount() {
    const db = await getDatabase();
    return db.getPendingSyncCount();
  }

  static async clearOldData(daysOld = 30) {
    const db = await getDatabase();
    return db.clearOldSyncedObservations(daysOld);
  }
}