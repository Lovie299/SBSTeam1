// database/ObservationRepository.js
// Room Database is the SINGLE SOURCE OF TRUTH

import { ObservationDao } from './ObservationDao';
import { getDatabase } from './DatabaseService';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

export class ObservationRepository {
  constructor() {
    this.db = null;
    this.firestoreUnsubscribe = null;
    this.networkUnsubscribe = null;
    this.uiSubscribers = new Set();  // UI components that listen to Room changes
    this.isSyncing = false;
    this.isOnline = true;
  }

  // ==================== INITIALIZATION ====================
  
  async initialize() {
    this.db = await getDatabase();
    this.setupNetworkListener();
    this.startFirestoreListener();
    console.log('✅ Repository initialized - Room is Single Source of Truth');
  }

  setupNetworkListener() {
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      const wasOnline = this.isOnline;
      this.isOnline = online;
      
      if (online && !wasOnline) {
        console.log('🌐 Network restored - syncing Room to Firestore');
        this.syncNow();
      }
    });
  }

  // ==================== READ OPERATIONS (FROM ROOM) ====================
  
  async getAllObservations() {
    return await ObservationDao.getAll();
  }

  async getUnsyncedObservations() {
    return await ObservationDao.getUnsynced();
  }

  async getObservationById(id) {
    return await ObservationDao.getById(id);
  }

  async getObservationsByStatus(status) {
    return await ObservationDao.getByStatus(status);
  }

  // ==================== WRITE OPERATIONS (TO ROOM FIRST) ====================
  
  async addObservation(observationData) {
    console.log('📝 Writing to Room FIRST (Single Source of Truth)');
    
    // 1. Save to Room
    const result = await ObservationDao.insert(observationData);
    
    // 2. Notify UI immediately
    await this.notifySubscribers();
    
    // 3. Sync to Firestore in background if online
    if (this.isOnline) {
      this.syncObservationToFirestore(observationData.id).catch(console.error);
    }
    
    return result;
  }

  async updateObservation(id, updates) {
    console.log(`✏️ Updating Room: ${id}`);
    
    // 1. Update Room
    const success = await ObservationDao.update(id, updates);
    
    // 2. Notify UI
    await this.notifySubscribers();
    
    // 3. Sync to Firestore if online
    if (this.isOnline && success) {
      this.syncUpdateToFirestore(id, updates).catch(console.error);
    }
    
    return success;
  }

  async markAsAttended(id, userId, userName) {
    console.log(`✅ Marking as attended in Room: ${id}`);
    
    // 1. Update Room
    await ObservationDao.markAsAttended(id, userId, userName);
    
    // 2. Notify UI
    await this.notifySubscribers();
    
    // 3. Sync to Firestore
    if (this.isOnline) {
      this.updateFirestoreStatus(id, 'attended', userId, userName).catch(console.error);
    }
    
    return true;
  }

  async deleteObservation(id) {
    console.log(`🗑️ Deleting from Room: ${id}`);
    
    // Get Firestore ID before deletion
    const observation = await ObservationDao.getById(id);
    const firestoreId = observation?.firestoreId;
    
    // 1. Delete from Room
    await ObservationDao.delete(id);
    
    // 2. Notify UI
    await this.notifySubscribers();
    
    // 3. Delete from Firestore if online
    if (this.isOnline && firestoreId) {
      this.deleteFromFirestore(firestoreId).catch(console.error);
    }
    
    return true;
  }

  // ==================== SYNC OPERATIONS ====================
  
  async syncNow() {
    if (!this.isOnline) {
      console.log('❌ Cannot sync - offline');
      return;
    }
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return;
    }
    
    this.isSyncing = true;
    
    try {
      const unsynced = await ObservationDao.getUnsynced();
      console.log(`📤 Found ${unsynced.length} unsynced observations in Room`);
      
      if (unsynced.length === 0) {
        console.log('✅ No unsynced observations');
        return;
      }
      
      let synced = 0;
      
      for (const obs of unsynced) {
        try {
          const { id, firestoreId, ...data } = obs;
          
          const firestoreData = {
            ...data,
            syncedAt: new Date().toISOString(),
          };
          
          const docRef = await addDoc(collection(db, 'observations'), firestoreData);
          await ObservationDao.markAsSynced(obs.id, docRef.id);
          synced++;
          
          console.log(`✅ Synced: ${obs.id} → ${docRef.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync ${obs.id}:`, error);
        }
      }
      
      // Notify UI after sync
      await this.notifySubscribers();
      
      console.log(`🎉 Sync complete: ${synced}/${unsynced.length} observations synced`);
      
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== FIRESTORE LISTENER (REMOTE → ROOM) ====================
  
 
startFirestoreListener() {
  if (this.firestoreUnsubscribe) return;
  
  console.log('📡 Starting Firestore listener');
  
  // ✅ Get current user ID
  const currentUserId = auth.currentUser?.uid;
  
  const q = query(collection(db, 'observations'), orderBy('createdAt', 'desc'));
  
  this.firestoreUnsubscribe = onSnapshot(q, async (snapshot) => {
    console.log(`📡 Received ${snapshot.size} Firestore observations`);
    
    for (const change of snapshot.docChanges()) {
      const data = { id: change.doc.id, ...change.doc.data() };
      
      // ✅ CRITICAL FIX: Skip observations added by current user
      if (data.userId === currentUserId) {
        console.log(`⏭️ Skipping own observation: ${data.id} (added by current user)`);
        continue;
      }
      
      if (change.type === 'added') {
        const exists = await ObservationDao.getById(data.id);
        if (!exists) {
          await ObservationDao.insert({
            id: data.id,
            firestoreId: data.id,
            gorillaGroup: data.gorillaGroup,
            location: data.location,
            locationName: data.locationName,
            healthStatus: data.healthStatus,
            notes: data.notes,
            userName: data.userName,
            userEmail: data.userEmail,
            userId: data.userId,
            createdAt: data.createdAt,
            synced: true,
            status: data.status || 'pending',
          });
          console.log(`📥 Added remote observation from other user: ${data.id}`);
        }
      } else if (change.type === 'modified') {
        await ObservationDao.update(data.id, {
          status: data.status,
          attendedAt: data.attendedAt,
          attendedBy: data.attendedBy,
          attendedByName: data.attendedByName,
        });
        console.log(`🔄 Updated remote observation: ${data.id}`);
      } else if (change.type === 'removed') {
        await ObservationDao.delete(data.id);
        console.log(`🗑️ Removed remote observation: ${data.id}`);
      }
    }
    
    await this.notifySubscribers();
  });
}
  stopFirestoreListener() {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
      console.log('🛑 Firestore listener stopped');
    }
  }

  // ==================== UI SUBSCRIPTION SYSTEM ====================
  
  subscribe(callback) {
    this.uiSubscribers.add(callback);
    console.log(`👥 UI subscriber added. Total: ${this.uiSubscribers.size}`);
    
    // Send initial data
    this.getAllObservations().then(data => callback(data));
    
    return () => {
      this.uiSubscribers.delete(callback);
      console.log(`👥 UI subscriber removed. Total: ${this.uiSubscribers.size}`);
    };
  }

  async notifySubscribers() {
    if (this.uiSubscribers.size === 0) return;
    
    const data = await this.getAllObservations();
    console.log(`📢 Notifying ${this.uiSubscribers.size} UI subscribers`);
    
    this.uiSubscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  // ==================== PRIVATE HELPERS ====================
  
  async syncObservationToFirestore(observationId) {
    const obs = await ObservationDao.getById(observationId);
    if (!obs || obs.synced) return;
    
    try {
      const { id, firestoreId, ...data } = obs;
      const docRef = await addDoc(collection(db, 'observations'), {
        ...data,
        syncedAt: new Date().toISOString(),
      });
      await ObservationDao.markAsSynced(observationId, docRef.id);
      await this.notifySubscribers();
    } catch (error) {
      console.error(`Sync failed for ${observationId}:`, error);
    }
  }

  async syncUpdateToFirestore(id, updates) {
    const obs = await ObservationDao.getById(id);
    if (!obs?.firestoreId) return;
    
    try {
      const ref = doc(db, 'observations', obs.firestoreId);
      await updateDoc(ref, updates);
    } catch (error) {
      console.error(`Update Firestore failed:`, error);
    }
  }

  async updateFirestoreStatus(id, status, userId, userName) {
    const obs = await ObservationDao.getById(id);
    if (!obs?.firestoreId) return;
    
    try {
      const ref = doc(db, 'observations', obs.firestoreId);
      await updateDoc(ref, {
        status,
        attendedAt: new Date().toISOString(),
        attendedBy: userId,
        attendedByName: userName,
      });
    } catch (error) {
      console.error(`Firestore status update failed:`, error);
    }
  }

  async deleteFromFirestore(firestoreId) {
    try {
      await deleteDoc(doc(db, 'observations', firestoreId));
    } catch (error) {
      console.error(`Firestore delete failed:`, error);
    }
  }

  // ==================== CLEANUP ====================
  
  cleanup() {
    this.stopFirestoreListener();
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    this.uiSubscribers.clear();
    console.log('🧹 Repository cleaned up');
  }
}

// Singleton instance
let instance = null;

export const getRepository = async () => {
  if (!instance) {
    instance = new ObservationRepository();
    await instance.initialize();
  }
  return instance;
};