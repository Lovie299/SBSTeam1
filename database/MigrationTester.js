// app/contexts/ObservationContext.jsx (Updated to use Room DB)
import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import uuid from 'react-native-uuid';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getDatabase } from '../../database/DatabaseService';
import { ObservationDao } from '../../database/ObservationDao';

const ObservationContext = createContext();

const STORAGE_KEY = '@silverback_observations';

export const ObservationProvider = ({ children }) => {
  const [observations, setObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const isAddingRef = useRef(false);

  // Load observations from Room database
  const loadObservations = useCallback(async () => {
    try {
      console.log('📂 Loading observations from Room database...');
      const dbObservations = await ObservationDao.getAll();
      
      // Convert database format to app format
      const formattedObservations = dbObservations.map(obs => ({
        id: obs.id,
        gorillaGroup: obs.gorillaGroup,
        location: obs.location,
        locationName: obs.locationName,
        healthStatus: obs.healthStatus,
        notes: obs.notes,
        userName: obs.userName,
        userEmail: obs.userEmail,
        userId: obs.userId,
        createdAt: obs.createdAt,
        synced: obs.synced === 1,
        syncedAt: obs.syncedAt,
        status: obs.status,
        attendedAt: obs.attendedAt,
        attendedBy: obs.attendedBy,
        attendedByName: obs.attendedByName,
        firestoreId: obs.firestoreId,
      }));
      
      setObservations(formattedObservations);
      console.log(`📂 Loaded ${formattedObservations.length} observations from Room DB`);
    } catch (error) {
      console.error('Failed to load observations from Room DB:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new observation (offline-first)
  const addObservation = useCallback(async (observationData) => {
    if (isAddingRef.current) {
      console.log('⚠️ Already adding an observation, skipping...');
      return null;
    }
    
    isAddingRef.current = true;
    
    try {
      console.log('➕ Adding new observation:', observationData);
      const user = auth.currentUser;
      
      const newObservation = {
        id: uuid.v4(),
        localId: uuid.v4(),
        gorillaGroup: observationData.gorillaGroup,
        location: observationData.location,
        locationName: observationData.locationName || null,
        healthStatus: observationData.healthStatus || 'Not specified',
        notes: observationData.notes || null,
        userName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
        userEmail: user?.email,
        userId: user?.uid || 'anonymous',
        createdAt: new Date().toISOString(),
        synced: false,
        syncedAt: null,
        status: 'pending',
        createdAtTimestamp: Date.now(),
      };
      
      // Save to Room database first
      await ObservationDao.insert(newObservation);
      console.log('✅ Observation saved to Room DB');
      
      // Update local state
      setObservations(prev => [{
        id: newObservation.id,
        gorillaGroup: newObservation.gorillaGroup,
        location: newObservation.location,
        locationName: newObservation.locationName,
        healthStatus: newObservation.healthStatus,
        notes: newObservation.notes,
        userName: newObservation.userName,
        userEmail: newObservation.userEmail,
        userId: newObservation.userId,
        createdAt: newObservation.createdAt,
        synced: false,
        status: 'pending',
      }, ...prev]);
      
      // If online, save to Firestore immediately
      if (isOnline) {
        try {
          console.log('🌐 Online, saving to Firestore...');
          const { id, localId, ...firestoreData } = newObservation;
          const docRef = await addDoc(collection(db, 'observations'), {
            ...firestoreData,
            syncedAt: new Date().toISOString(),
          });
          console.log('✅ Saved to Firestore with ID:', docRef.id);
          
          // Update Room DB as synced
          await ObservationDao.markAsSynced(newObservation.id, docRef.id);
          
          // Update local state
          setObservations(prev => prev.map(obs => 
            obs.id === newObservation.id 
              ? { ...obs, synced: true, syncedAt: new Date().toISOString(), firestoreId: docRef.id }
              : obs
          ));
        } catch (error) {
          console.error('Failed to save to Firestore:', error);
        }
      } else {
        console.log('📶 Offline, observation saved to Room DB only');
      }
      
      return newObservation;
    } catch (error) {
      console.error('Error adding observation:', error);
      return null;
    } finally {
      isAddingRef.current = false;
    }
  }, [isOnline]);

  // Sync unsynced observations from Room DB to Firestore
  const syncNow = useCallback(async () => {
    console.log('🔄 SyncNow called, isOnline:', isOnline, 'isSyncing:', isSyncing);
    if (!isOnline) {
      console.log('❌ Offline: cannot sync');
      return false;
    }
    if (isSyncing) {
      console.log('⏳ Already syncing, skipping...');
      return false;
    }

    setIsSyncing(true);
    try {
      const unsynced = await ObservationDao.getUnsynced();
      console.log(`📤 Found ${unsynced.length} unsynced observations from Room DB`);
      
      if (unsynced.length === 0) {
        setLastSyncTime(new Date().toISOString());
        console.log('✅ No unsynced observations, sync complete');
        return true;
      }

      let successCount = 0;
      
      for (const obs of unsynced) {
        try {
          console.log(`📤 Syncing observation ${obs.id}...`);
          const { id, local_id, ...firestoreData } = obs;
          const docRef = await addDoc(collection(db, 'observations'), {
            ...firestoreData,
            synced: true,
            syncedAt: new Date().toISOString(),
          });
          console.log(`✅ Observation synced with Firestore ID: ${docRef.id}`);
          
          await ObservationDao.markAsSynced(obs.id, docRef.id);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to sync observation ${obs.id}:`, error);
        }
      }
      
      // Refresh local observations
      await loadObservations();
      
      setLastSyncTime(new Date().toISOString());
      console.log(`✅ Sync completed: ${successCount}/${unsynced.length} observations synced`);
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, loadObservations]);

  // Mark observation as attended
  const markAsAttended = useCallback(async (observationId) => {
    console.log('✅ Marking observation as attended:', observationId);
    
    const user = auth.currentUser;
    
    // Update in Room DB
    const success = await ObservationDao.markAsAttended(
      observationId,
      user?.uid,
      user?.displayName || user?.email?.split('@')[0]
    );
    
    if (success) {
      // Update local state
      setObservations(prev => prev.map(obs => 
        obs.id === observationId 
          ? { 
              ...obs, 
              status: 'attended', 
              attendedAt: new Date().toISOString(),
              attendedBy: user?.uid,
              attendedByName: user?.displayName || user?.email?.split('@')[0]
            }
          : obs
      ));
      
      // If online, update Firestore
      if (isOnline) {
        const observation = observations.find(obs => obs.id === observationId);
        if (observation?.firestoreId) {
          try {
            const observationRef = doc(db, 'observations', observation.firestoreId);
            await updateDoc(observationRef, {
              status: 'attended',
              attendedAt: new Date().toISOString(),
              attendedBy: user?.uid,
              attendedByName: user?.displayName || user?.email?.split('@')[0],
            });
            console.log('✅ Updated status in Firestore');
          } catch (error) {
            console.error('Failed to update Firestore:', error);
          }
        }
      }
    }
    
    return success;
  }, [observations, isOnline]);

  const getPendingCount = useCallback(async () => {
    return await ObservationDao.getPendingCount();
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      console.log('📶 Network state changed, isOnline:', online);
      setIsOnline(online);
      if (online) {
        console.log('🌐 Network came online, checking for unsynced data...');
        syncNow();
      }
    });
    return () => unsubscribe();
  }, [syncNow]);

  // Load initial data
  useEffect(() => {
    console.log('🏗️ ObservationProvider mounted, loading from Room DB...');
    loadObservations();
    
    // Clean up old data periodically (every 7 days)
    const cleanupInterval = setInterval(() => {
      ObservationDao.clearOldData(30);
    }, 7 * 24 * 60 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [loadObservations]);

  const value = {
    observations,
    isLoading,
    isSyncing,
    isOnline,
    lastSyncTime,
    addObservation,
    syncNow,
    markAsAttended,
    getPendingCount,
  };

  return (
    <ObservationContext.Provider value={value}>
      {children}
    </ObservationContext.Provider>
  );
};

export const useObservations = () => {
  const context = useContext(ObservationContext);
  if (!context) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }
  return context;
};