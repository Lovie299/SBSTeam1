// app/contexts/ObservationContext.jsx - Add getPendingCount function
import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import uuid from 'react-native-uuid';
import { db, auth } from '../../firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';

const ObservationContext = createContext();
const STORAGE_KEY = '@silverback_observations';

export const ObservationProvider = ({ children }) => {
  const [observations, setObservations] = useState([]);
  const [localObservations, setLocalObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [firestoreObservations, setFirestoreObservations] = useState([]);
  const isAddingRef = useRef(false);

  // Listen to Firestore observations (real-time)
  useEffect(() => {
    if (!isOnline) return;
    console.log('📡 Setting up Firestore listener for observations...');
    const q = query(collection(db, 'observations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreObs = [];
      snapshot.forEach((doc) => {
        firestoreObs.push({
          id: doc.id,
          ...doc.data(),
          source: 'firestore',
        });
      });
      console.log(`📊 Received ${firestoreObs.length} observations from Firestore`);
      setFirestoreObservations(firestoreObs);
    });
    return unsubscribe;
  }, [isOnline]);

  // Merge Firestore observations with local unsynced ones
  useEffect(() => {
    const observationMap = new Map();
    
    firestoreObservations.forEach(obs => {
      observationMap.set(obs.id, { ...obs, source: 'firestore', synced: true });
    });
    
    const unsyncedLocals = localObservations.filter(localObs => !localObs.synced);
    unsyncedLocals.forEach(localObs => {
      const existsInFirestore = firestoreObservations.some(fireObs => 
        fireObs.userId === localObs.userId && 
        fireObs.gorillaGroup === localObs.gorillaGroup &&
        fireObs.location === localObs.location &&
        Math.abs(new Date(fireObs.createdAt).getTime() - new Date(localObs.createdAt).getTime()) < 2000
      );
      
      if (!existsInFirestore) {
        observationMap.set(localObs.id, { ...localObs, source: 'local', synced: false });
      }
    });
    
    const merged = Array.from(observationMap.values());
    const sorted = merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setObservations(sorted);
  }, [firestoreObservations, localObservations]);

  // Load local observations from storage
  const loadObservations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalObservations(parsed);
        console.log(`📂 Loaded ${parsed.length} observations from storage`);
      }
    } catch (error) {
      console.error('Failed to load observations', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveObservations = useCallback(async (newObservations) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newObservations));
      setLocalObservations(newObservations);
      console.log(`💾 Saved ${newObservations.length} observations to storage`);
    } catch (error) {
      console.error('Failed to save observations', error);
    }
  }, []);

  // Add observation
  const addObservation = useCallback(async (observationData, imageUris = []) => {
    if (isAddingRef.current) return null;
    isAddingRef.current = true;
    
    try {
      const user = auth.currentUser;
      const newObservation = {
        id: uuid.v4(),
        ...observationData,
        userName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
        userEmail: user?.email,
        userId: user?.uid || 'anonymous',
        createdAt: new Date().toISOString(),
        synced: false,
        syncedAt: null,
        status: 'pending',
        imageUris: imageUris,
      };

      if (isOnline) {
        const { id, imageUris: imgUris, ...firestoreData } = newObservation;
        const docRef = await addDoc(collection(db, 'observations'), {
          ...firestoreData,
          synced: true,
          syncedAt: new Date().toISOString(),
          hasImages: imgUris && imgUris.length > 0,
          imageCount: imgUris?.length || 0,
        });
        
        console.log('✅ Observation saved to Firestore, ID:', docRef.id);
        return { ...newObservation, id: docRef.id, synced: true };
      } else {
        const updated = [newObservation, ...localObservations];
        await saveObservations(updated);
        console.log('📶 Observation saved locally (offline)');
        return newObservation;
      }
    } catch (error) {
      console.error('Error adding observation:', error);
      return null;
    } finally {
      isAddingRef.current = false;
    }
  }, [localObservations, saveObservations, isOnline]);

  // Sync unsynced observations
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return false;
    const unsynced = localObservations.filter(obs => !obs.synced);
    if (unsynced.length === 0) {
      setLastSyncTime(new Date().toISOString());
      return true;
    }
    
    console.log(`🔄 Syncing ${unsynced.length} unsynced observations...`);
    setIsSyncing(true);
    
    try {
      let successCount = 0;
      for (const obs of unsynced) {
        try {
          const { id, imageUris, ...firestoreData } = obs;
          const docRef = await addDoc(collection(db, 'observations'), {
            ...firestoreData,
            synced: true,
            syncedAt: new Date().toISOString(),
            hasImages: imageUris && imageUris.length > 0,
            imageCount: imageUris?.length || 0,
          });
          
          const updatedLocal = localObservations.filter(o => o.id !== obs.id);
          await saveObservations(updatedLocal);
          successCount++;
          console.log(`✅ Synced observation ${obs.id} -> ${docRef.id}`);
        } catch (error) {
          console.error('Sync failed for observation', obs.id, error);
        }
      }
      
      setLastSyncTime(new Date().toISOString());
      console.log(`✅ Sync completed: ${successCount}/${unsynced.length} observations synced`);
      return successCount > 0;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [localObservations, isOnline, isSyncing, saveObservations]);

  // Mark observation as attended
  const markAsAttended = useCallback(async (observationId) => {
    console.log('✅ Marking as attended:', observationId);
    const observation = observations.find(obs => obs.id === observationId);
    if (!observation) {
      console.error('Observation not found');
      return false;
    }

    if (observation.source === 'firestore') {
      try {
        const obsRef = doc(db, 'observations', observationId);
        await updateDoc(obsRef, {
          status: 'attended',
          attendedAt: new Date().toISOString(),
          attendedBy: auth.currentUser?.uid,
          attendedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0],
        });
        console.log('✅ Firestore updated for attended');
      } catch (error) {
        console.error('Firestore update failed:', error);
      }
    } else {
      const updatedLocal = localObservations.map(obs =>
        obs.id === observationId
          ? { ...obs, status: 'attended', attendedAt: new Date().toISOString(), attendedBy: auth.currentUser?.uid }
          : obs
      );
      await saveObservations(updatedLocal);
    }
    return true;
  }, [observations, localObservations, saveObservations]);

  // Get count of pending sync observations
  const getPendingCount = useCallback(() => {
    return localObservations.filter(obs => !obs.synced).length;
  }, [localObservations]);

  // Auto-sync when network comes online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online && localObservations.some(obs => !obs.synced)) {
        console.log('🌐 Network came online, auto-syncing...');
        syncNow();
      }
    });
    return unsubscribe;
  }, [localObservations, syncNow]);

  useEffect(() => {
    loadObservations();
  }, []);

  const value = {
    observations,
    localObservations,
    isLoading,
    isSyncing,
    isOnline,
    lastSyncTime,
    addObservation,
    syncNow,
    markAsAttended,
    getPendingCount, // Make sure this is included in the value object
  };

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
};

export const useObservations = () => {
  const context = useContext(ObservationContext);
  if (!context) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }
  return context;
};