// app/contexts/ObservationContext.jsx
// Hybrid Version - Preserves existing functionality with Repository Pattern

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
import { getRepository } from '../../database/ObservationRepository';

const ObservationContext = createContext();
const STORAGE_KEY = '@silverback_observations';
const IMAGES_STORAGE_KEY = '@silverback_observation_images';

export const ObservationProvider = ({ children }) => {
  // Existing states
  const [observations, setObservations] = useState([]);
  const [localObservations, setLocalObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [firestoreObservations, setFirestoreObservations] = useState([]);
  const isAddingRef = useRef(false);
  
  // New repository state
  const [repository, setRepository] = useState(null);
  const [useRepository, setUseRepository] = useState(false); // Flag to switch between implementations

  // Initialize repository (optional - can be toggled)
  useEffect(() => {
    const initRepository = async () => {
      try {
        const repo = await getRepository();
        setRepository(repo);
        console.log('✅ Repository initialized (available as alternative)');
        
        // You can test repository by setting useRepository to true
        // setUseRepository(true);
      } catch (error) {
        console.log('Repository not available, using existing implementation');
      }
    };
    initRepository();
  }, []);

  // ==================== EXISTING IMPLEMENTATION (KEPT INTACT) ====================

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

  // Add observation - EXISTING IMPLEMENTATION
  const addObservation = useCallback(async (observationData) => {
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
        localId: uuid.v4(),
        status: 'pending',
      };

      // If online, save to Firestore immediately (without images)
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
        // Offline: save locally only
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

  // Mark observation as attended - EXISTING IMPLEMENTATION
  const markAsAttended = useCallback(async (observationId) => {
    console.log('✅ Marking observation as attended:', observationId);
    
    try {
      const observation = observations.find(obs => obs.id === observationId);
      if (!observation) {
        console.error('Observation not found');
        return false;
      }

      if (isOnline) {
        const observationRef = doc(db, 'observations', observationId);
        await updateDoc(observationRef, {
          status: 'attended',
          attendedAt: new Date().toISOString(),
          attendedBy: auth.currentUser?.uid,
          attendedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0],
        });
        console.log('Updated status in Firestore');
      }
      
      const updatedLocal = localObservations.map(obs => 
        obs.id === observationId 
          ? { 
              ...obs, 
              status: 'attended', 
              attendedAt: new Date().toISOString(), 
              attendedBy: auth.currentUser?.uid,
              attendedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]
            }
          : obs
      );
      await saveObservations(updatedLocal);
      
      setObservations(prev => prev.map(obs =>
        obs.id === observationId
          ? { 
              ...obs, 
              status: 'attended', 
              attendedAt: new Date().toISOString(), 
              attendedBy: auth.currentUser?.uid,
              attendedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]
            }
          : obs
      ));
      
      return true;
    } catch (error) {
      console.error('Error marking as attended:', error);
      return false;
    }
  }, [observations, localObservations, isOnline, saveObservations]);

  // Sync unsynced observations - EXISTING IMPLEMENTATION
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
          
          // Remove synced observation from local storage
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

  // Network listener - EXISTING IMPLEMENTATION
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

  const getPendingCount = useCallback(() => localObservations.filter(obs => !obs.synced).length, [localObservations]);

  // ==================== NEW REPOSITORY METHODS (OPTIONAL) ====================
  
  // Method to switch to repository mode (for testing)
  const enableRepositoryMode = useCallback(async () => {
    if (!repository) {
      console.log('Repository not available');
      return false;
    }
    setUseRepository(true);
    
    // Subscribe to repository changes
    const unsubscribe = repository.subscribe((data) => {
      setObservations(data);
    });
    
    // Start Firestore listener
    repository.startFirestoreListener();
    
    return () => unsubscribe();
  }, [repository]);

  // Repository-based add (if you want to test)
  const addObservationViaRepository = useCallback(async (data) => {
    if (!repository) return null;
    
    const user = auth.currentUser;
    const newObservation = {
      id: uuid.v4(),
      localId: uuid.v4(),
      gorillaGroup: data.gorillaGroup,
      location: data.location,
      locationName: data.locationName || null,
      healthStatus: data.healthStatus || 'Not specified',
      notes: data.notes || null,
      userName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
      userEmail: user?.email,
      userId: user?.uid || 'anonymous',
      createdAt: new Date().toISOString(),
      synced: false,
      status: 'pending',
    };
    
    return await repository.addObservation(newObservation);
  }, [repository]);

  // Repository-based sync
  const syncViaRepository = useCallback(async () => {
    if (!repository || !isOnline) return false;
    await repository.syncNow();
    setLastSyncTime(new Date().toISOString());
    return true;
  }, [repository, isOnline]);

  const value = {
    // Existing values (kept as-is)
    observations,
    localObservations,
    isLoading,
    isSyncing,
    isOnline,
    lastSyncTime,
    addObservation,
    syncNow,
    markAsAttended,
    
    // New repository features (optional)
    enableRepositoryMode,
    addObservationViaRepository,
    syncViaRepository,
    repositoryMode: useRepository,
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

export default ObservationProvider;