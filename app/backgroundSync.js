// app/backgroundSync.js
import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { syncObservationsToRemote } from './utils/sync';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

// Define the background task (works on both platforms)
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      const stored = await AsyncStorage.getItem('@silverback_observations');
      if (stored) {
        const observations = JSON.parse(stored);
        const unsynced = observations.filter(obs => !obs.synced);
        if (unsynced.length > 0) {
          await syncObservationsToRemote(unsynced);
          // Mark as synced locally
          const updated = observations.map(obs =>
            unsynced.find(u => u.id === obs.id) ? { ...obs, synced: true, syncedAt: new Date().toISOString() } : obs
          );
          await AsyncStorage.setItem('@silverback_observations', JSON.stringify(updated));
        }
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync failed', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  // Skip iOS because it requires UIBackgroundModes configuration
  if (Platform.OS === 'ios') {
    console.log('Background sync skipped on iOS (requires fetch in UIBackgroundModes)');
    return;
  }
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    console.warn('Background sync registration failed:', error.message);
  }
}