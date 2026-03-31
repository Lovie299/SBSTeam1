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
  getDoc, 
  setDoc,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { getRepository } from '../../database/ObservationRepository';

const ObservationContext = createContext();

const STORAGE_KEY = '@silverback_observations';

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

  // Listen to ALL observations from Firestore
  useEffect(() => {
    if (!isOnline) return;

    console.log('📡 Setting up real-time listener for ALL observations...');
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
    }, (error) => {
      console.error('Error listening to observations:', error);
    });

    return () => unsubscribe();
  }, [isOnline]);

  // Merge observations
  useEffect(() => {
    const observationMap = new Map();
    
    firestoreObservations.forEach(obs => {
      const uniqueKey = `${obs.userId}-${obs.gorillaGroup}-${obs.location}-${obs.createdAt}`;
      observationMap.set(uniqueKey, { ...obs, dedupKey: uniqueKey, synced: true });
    });
    
    localObservations.forEach(localObs => {
      const uniqueKey = `${localObs.userId}-${localObs.gorillaGroup}-${localObs.location}-${localObs.createdAt}`;
      const existsInFirestore = firestoreObservations.some(fireObs => 
        fireObs.userId === localObs.userId && 
        fireObs.gorillaGroup === localObs.gorillaGroup &&
        fireObs.location === localObs.location &&
        Math.abs(new Date(fireObs.createdAt).getTime() - new Date(localObs.createdAt).getTime()) < 2000
      );
      
      if (!existsInFirestore) {
        observationMap.set(uniqueKey, { ...localObs, dedupKey: uniqueKey });
      }
    });
    
    const merged = Array.from(observationMap.values());
    const sorted = merged.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });
    
    setObservations(sorted);
  }, [firestoreObservations, localObservations]);

  // Load local observations
  const loadObservations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalObservations(parsed);
      }
    } catch (error) {
      console.error('Failed to load observations', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save observations
  const saveObservations = useCallback(async (newObservations) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newObservations));
      setLocalObservations(newObservations);
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
        ...observationData,
        userName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
        userEmail: user?.email,
        userId: user?.uid || 'anonymous',
        createdAt: new Date().toISOString(),
        localId: uuid.v4(),
        status: 'pending',
      };
      
      if (isOnline) {
        const { localId, ...firestoreData } = newObservation;
        const docRef = await addDoc(collection(db, 'observations'), {
          ...firestoreData,
          createdAtTimestamp: serverTimestamp(),
        });
        return { ...newObservation, id: docRef.id, synced: true };
      } else {
        const localObservation = {
          ...newObservation,
          id: newObservation.localId,
          synced: false,
        };
        const updated = [localObservation, ...localObservations];
        await saveObservations(updated);
        return localObservation;
      }
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

    setIsSyncing(true);
    try {
      let successCount = 0;
      const updatedObservations = [...localObservations];
      
      for (const obs of unsynced) {
        try {
          const { id, localId, synced, ...observationForFirestore } = obs;
          const docRef = await addDoc(collection(db, 'observations'), {
            ...observationForFirestore,
            syncedAt: new Date().toISOString(),
          });
          
          const index = updatedObservations.findIndex(o => o.id === obs.id);
          if (index !== -1) {
            updatedObservations[index] = {
              ...updatedObservations[index],
              synced: true,
              syncedAt: new Date().toISOString(),
              firestoreId: docRef.id
            };
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to sync observation ${obs.id}:`, error);
        }
      }
      
      if (successCount > 0) {
        await saveObservations(updatedObservations);
      }
      
      setLastSyncTime(new Date().toISOString());
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, [localObservations, isOnline, isSyncing, saveObservations]);

  // Network listener - EXISTING IMPLEMENTATION
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online && localObservations.length > 0) {
        const hasUnsynced = localObservations.some(obs => !obs.synced);
        if (hasUnsynced) syncNow();
      }
    });
    return () => unsubscribe();
  }, [localObservations, syncNow]);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  const getPendingCount = useCallback(() => {
    return localObservations.filter(obs => !obs.synced).length;
  }, [localObservations]);

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
    getPendingCount,
    markAsAttended,
    
    // New repository features (optional)
    enableRepositoryMode,
    addObservationViaRepository,
    syncViaRepository,
    repositoryMode: useRepository,
  };

  return (
    <ObservationContext.Provider value={value}>
      {children}
    </ObservationContext.Provider>
  );
};

export const useObservations = () => {
  const context = useContext(ObservationContext);
  if (!context) throw new Error('useObservations must be used within an ObservationProvider');
  return context;
};

export default ObservationProvider;