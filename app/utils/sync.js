// utils/sync.js
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Sync unsynced observations to Firestore
 * This function uploads observations that were created while offline
 */
export const syncObservationsToRemote = async (observations) => {
  if (!observations || observations.length === 0) {
    return { success: true, message: 'No observations to sync' };
  }

  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    console.log(`[Sync] Syncing ${observations.length} observations to Firestore...`);
    
    const syncResults = [];
    
    for (const observation of observations) {
      try {
        // Reference to the user's observations collection
        const userObservationsRef = collection(db, 'observations', user.uid, 'items');
        
        // Prepare data for Firestore (remove local-only fields)
        const syncData = {
          ...observation,
          syncedAt: new Date().toISOString(),
          syncedFromLocal: true
        };
        
        // Remove fields that shouldn't be sent to server
        delete syncData.synced;
        delete syncData.syncedAt; // We'll add it again
        
        // Add to Firestore
        const docRef = await addDoc(userObservationsRef, {
          ...syncData,
          syncedAt: new Date().toISOString(),
          userId: user.uid
        });
        
        syncResults.push({
          id: observation.id,
          firestoreId: docRef.id,
          success: true
        });
        
        console.log(`[Sync] ✅ Synced observation ${observation.id} -> ${docRef.id}`);
        
      } catch (error) {
        console.error(`[Sync] ❌ Failed to sync observation ${observation.id}:`, error);
        syncResults.push({
          id: observation.id,
          success: false,
          error: error.message
        });
      }
    }
    
    const failedCount = syncResults.filter(r => !r.success).length;
    const successCount = syncResults.filter(r => r.success).length;
    
    if (failedCount > 0) {
      return {
        success: false,
        error: `Failed to sync ${failedCount} observations`,
        results: syncResults,
        successCount,
        failedCount
      };
    }
    
    return {
      success: true,
      message: `Successfully synced ${successCount} observations`,
      results: syncResults
    };
    
  } catch (error) {
    console.error('[Sync] Sync process error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fetch observations from Firestore for the current user
 */
export const fetchObservationsFromRemote = async () => {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }
  
  try {
    const userObservationsRef = collection(db, 'observations', user.uid, 'items');
    const querySnapshot = await getDocs(userObservationsRef);
    
    const observations = [];
    querySnapshot.forEach((doc) => {
      observations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      observations
    };
  } catch (error) {
    console.error('[Sync] Failed to fetch observations:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if user has unsynced observations (for offline-first approach)
 */
export const hasUnsyncedObservations = (observations) => {
  return observations.some(obs => !obs.synced);
};