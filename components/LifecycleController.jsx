// app/components/LifecycleController.jsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIFECYCLE_STORAGE_KEY = '@app_lifecycle_state';

export default function LifecycleController() {
  const [appState, setAppState] = useState(AppState.currentState);
  const [lifecycleLogs, setLifecycleLogs] = useState([]);
  const [savedData, setSavedData] = useState(null);
  const appStateRef = useRef(appState);

  useEffect(() => {
    // Load saved data on mount (OnCreate equivalent)
    loadSavedData();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(LIFECYCLE_STORAGE_KEY);
      if (saved) {
        setSavedData(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved data', error);
    }
  };

  const saveData = async (state) => {
    const dataToSave = {
      lastState: state,
      timestamp: new Date().toISOString(),
      appState: appState,
    };
    
    try {
      await AsyncStorage.setItem(LIFECYCLE_STORAGE_KEY, JSON.stringify(dataToSave));
      setSavedData(dataToSave);
    } catch (error) {
      console.error('Failed to save data', error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    const previousState = appStateRef.current;
    
    // OnPause (Background)
    if (previousState === 'active' && nextAppState === 'background') {
      addLog('OnPause', 'App moved to background - Saving state...');
      saveData('paused');
    }
    
    // OnResume (Active)
    if (previousState === 'background' && nextAppState === 'active') {
      addLog('OnResume', 'App resumed from background - Restoring state...');
      loadSavedData();
    }
    
    // OnStop (Inactive/Background)
    if (nextAppState === 'inactive') {
      addLog('OnStop', 'App is becoming inactive');
    }
    
    setAppState(nextAppState);
    appStateRef.current = nextAppState;
  };

  const addLog = (event, description) => {
    const newLog = {
      id: Date.now(),
      event,
      description,
      timestamp: new Date().toISOString(),
    };
    setLifecycleLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const simulateLifecycle = (event) => {
    switch(event) {
      case 'create':
        addLog('OnCreate', 'Activity created - Initializing components');
        loadSavedData();
        break;
      case 'start':
        addLog('OnStart', 'Activity becoming visible');
        break;
      case 'resume':
        addLog('OnResume', 'Activity resumed - User interaction ready');
        break;
      case 'pause':
        addLog('OnPause', 'Activity paused - Saving unsaved data');
        saveData('paused');
        break;
      case 'stop':
        addLog('OnStop', 'Activity stopped - Releasing resources');
        break;
      case 'destroy':
        addLog('OnDestroy', 'Activity destroyed - Cleanup complete');
        break;
    }
  };

  const clearLogs = () => {
    setLifecycleLogs([]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Current App State</Text>
        <Text style={[
          styles.statusValue,
          appState === 'active' ? styles.active : styles.background
        ]}>
          {appState === 'active' ? '🟢 Active (Foreground)' : '🔴 Background/Inactive'}
        </Text>
        <Text style={styles.statusNote}>
          {appState === 'active' 
            ? 'App is in foreground, user can interact' 
            : 'App is in background, saving battery and state'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💾 Saved State Data</Text>
        {savedData ? (
          <View>
            <Text style={styles.savedText}>
              Last State: {savedData.lastState}
            </Text>
            <Text style={styles.savedText}>
              Saved at: {new Date(savedData.timestamp).toLocaleString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No saved state data</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔄 Simulate Lifecycle Events</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.lifecycleButton} onPress={() => simulateLifecycle('create')}>
            <Text style={styles.buttonText}>OnCreate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleButton} onPress={() => simulateLifecycle('start')}>
            <Text style={styles.buttonText}>OnStart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleButton} onPress={() => simulateLifecycle('resume')}>
            <Text style={styles.buttonText}>OnResume</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleButton} onPress={() => simulateLifecycle('pause')}>
            <Text style={styles.buttonText}>OnPause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleButton} onPress={() => simulateLifecycle('stop')}>
            <Text style={styles.buttonText}>OnStop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleButton} onPress={() => simulateLifecycle('destroy')}>
            <Text style={styles.buttonText}>OnDestroy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.logHeader}>
          <Text style={styles.cardTitle}>📋 Lifecycle Event Log</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        {lifecycleLogs.length === 0 ? (
          <Text style={styles.emptyText}>No lifecycle events recorded</Text>
        ) : (
          lifecycleLogs.map(log => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeaderRow}>
                <Text style={[styles.logEvent, getEventStyle(log.event)]}>
                  {log.event}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.logDescription}>{log.description}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔄 Lifecycle Management</Text>
        <Text style={styles.infoText}>
          Based on Android Activity Lifecycle principles (OnCreate → OnStart → OnResume → OnPause → OnStop → OnDestroy).
          Data persistence ensures no loss during state transitions, even when app is in background.
        </Text>
      </View>
    </ScrollView>
  );
}

const getEventStyle = (event) => {
  switch(event) {
    case 'OnCreate':
    case 'OnStart':
    case 'OnResume':
      return styles.eventActive;
    case 'OnPause':
    case 'OnStop':
    case 'OnDestroy':
      return styles.eventPassive;
    default:
      return styles.eventInfo;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  active: {
    color: '#2c5f2d',
  },
  background: {
    color: '#f57c00',
  },
  statusNote: {
    fontSize: 12,
    color: '#999',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5f2d',
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  lifecycleButton: {
    backgroundColor: '#2c5f2d',
    padding: 10,
    borderRadius: 8,
    width: '31%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    color: '#d32f2f',
    fontSize: 14,
  },
  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logEvent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventActive: {
    color: '#2c5f2d',
  },
  eventPassive: {
    color: '#f57c00',
  },
  eventInfo: {
    color: '#2196f3',
  },
  logTime: {
    fontSize: 10,
    color: '#999',
  },
  logDescription: {
    fontSize: 12,
    color: '#666',
  },
  savedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5f2d',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
});