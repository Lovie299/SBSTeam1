// app/database-test.jsx (Create this temporary file)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { getDatabase, DATABASE_VERSION } from '../database/DatabaseService';
import { ObservationDao } from '../database/ObservationDao';
import { LinearGradient } from 'expo-linear-gradient';

export default function DatabaseTestScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [dbVersion, setDbVersion] = useState(null);
  const [observationCount, setObservationCount] = useState(0);

  const addLog = (message, isError = false) => {
    setResults(prev => [{
      id: Date.now(),
      message,
      isError,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev.slice(0, 49)]);
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    addLog('🔍 Testing database connection...');
    
    try {
      const db = await getDatabase();
      const version = await db.getDatabaseVersion();
      setDbVersion(version);
      addLog(`✅ Database connected! Version: ${version}`);
      return true;
    } catch (error) {
      addLog(`❌ Database connection failed: ${error.message}`, true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testInsertObservation = async () => {
    setLoading(true);
    addLog('📝 Testing insert observation...');
    
    try {
      const testObservation = {
        id: `test_${Date.now()}`,
        localId: `local_${Date.now()}`,
        gorillaGroup: 'Test Gorilla Group',
        location: 'Test Location, Volcanoes National Park',
        locationName: 'Volcanoes National Park Test Area',
        healthStatus: 'Healthy - Test',
        notes: 'This is a test observation to verify database functionality.',
        userName: 'Test Ranger',
        userEmail: 'test@silverback.com',
        userId: 'test_user_123',
        createdAt: new Date().toISOString(),
        synced: false,
        status: 'pending',
        createdAtTimestamp: Date.now(),
        groupSize: 8,
        threatLevel: 'low',
      };
      
      await ObservationDao.insert(testObservation);
      addLog(`✅ Observation inserted! ID: ${testObservation.id}`);
      await testGetAllObservations();
      return true;
    } catch (error) {
      addLog(`❌ Insert failed: ${error.message}`, true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testGetAllObservations = async () => {
    addLog('📖 Testing get all observations...');
    
    try {
      const observations = await ObservationDao.getAll();
      setObservationCount(observations.length);
      addLog(`✅ Retrieved ${observations.length} observations from database`);
      return observations;
    } catch (error) {
      addLog(`❌ Get all failed: ${error.message}`, true);
      return [];
    }
  };

  const testMarkAsAttended = async () => {
    setLoading(true);
    addLog('✅ Testing mark as attended...');
    
    try {
      const observations = await ObservationDao.getAll();
      const pendingObservation = observations.find(o => o.status !== 'attended');
      
      if (pendingObservation) {
        await ObservationDao.markAsAttended(
          pendingObservation.id,
          'test_user',
          'Test Ranger'
        );
        addLog(`✅ Marked observation ${pendingObservation.id} as attended`);
      } else {
        addLog('⚠️ No pending observations to mark as attended');
      }
      return true;
    } catch (error) {
      addLog(`❌ Mark as attended failed: ${error.message}`, true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testMarkAsSynced = async () => {
    setLoading(true);
    addLog('☁️ Testing mark as synced...');
    
    try {
      const observations = await ObservationDao.getAll();
      const unsyncedObservation = observations.find(o => !o.synced);
      
      if (unsyncedObservation) {
        await ObservationDao.markAsSynced(
          unsyncedObservation.id,
          `firestore_${Date.now()}`
        );
        addLog(`✅ Marked observation ${unsyncedObservation.id} as synced`);
      } else {
        addLog('⚠️ No unsynced observations to mark');
      }
      return true;
    } catch (error) {
      addLog(`❌ Mark as synced failed: ${error.message}`, true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testUpdateObservation = async () => {
    setLoading(true);
    addLog('✏️ Testing update observation...');
    
    try {
      const observations = await ObservationDao.getAll();
      if (observations.length > 0) {
        const testObs = observations[0];
        await ObservationDao.update(testObs.id, {
          notes: `Updated at ${new Date().toLocaleTimeString()} - Test successful!`,
          healthStatus: 'Updated Health Status',
        });
        addLog(`✅ Updated observation ${testObs.id}`);
      } else {
        addLog('⚠️ No observations to update');
      }
      return true;
    } catch (error) {
      addLog(`❌ Update failed: ${error.message}`, true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testDeleteObservation = async () => {
    setLoading(true);
    addLog('🗑️ Testing delete observation...');
    
    try {
      const observations = await ObservationDao.getAll();
      const testObservation = observations.find(o => o.gorillaGroup.includes('Test'));
      
      if (testObservation) {
        await ObservationDao.delete(testObservation.id);
        addLog(`✅ Deleted test observation ${testObservation.id}`);
        await testGetAllObservations();
      } else {
        addLog('⚠️ No test observations to delete');
      }
      return true;
    } catch (error) {
      addLog(`❌ Delete failed: ${error.message}`, true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    addLog('🚀 Starting comprehensive database tests...');
    addLog(`📱 App Database Version: ${DATABASE_VERSION}`);
    
    await testDatabaseConnection();
    await testInsertObservation();
    await testGetAllObservations();
    await testMarkAsAttended();
    await testMarkAsSynced();
    await testUpdateObservation();
    await testDeleteObservation();
    
    addLog('🎉 Database tests completed!');
  };

  const clearLogs = () => {
    setResults([]);
    addLog('📋 Logs cleared');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <Text style={styles.title}>Database Test Suite</Text>
        <Text style={styles.subtitle}>Room Database Verification</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Status Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dbVersion ?? '?'}</Text>
            <Text style={styles.statLabel}>DB Version</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{observationCount}</Text>
            <Text style={styles.statLabel}>Records</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: loading ? '#F59E0B' : '#10B981' }]}>
              {loading ? '...' : 'Ready'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={testDatabaseConnection}>
            <Text style={styles.buttonText}>🔌 Test Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testInsertObservation}>
            <Text style={styles.buttonText}>📝 Insert Test Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testGetAllObservations}>
            <Text style={styles.buttonText}>📖 Read All Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testMarkAsAttended}>
            <Text style={styles.buttonText}>✅ Mark as Attended</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testMarkAsSynced}>
            <Text style={styles.buttonText}>☁️ Mark as Synced</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testUpdateObservation}>
            <Text style={styles.buttonText}>✏️ Update Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testDeleteObservation}>
            <Text style={styles.buttonText}>🗑️ Delete Test Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.runAllButton]} onPress={runAllTests}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>▶️ Run All Tests</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
            <Text style={styles.clearButtonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Results Log */}
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Test Results Log</Text>
          {results.map((result) => (
            <View key={result.id} style={styles.logEntry}>
              <Text style={styles.logTime}>{result.timestamp}</Text>
              <Text style={[styles.logMessage, result.isError && styles.logError]}>
                {result.message}
              </Text>
            </View>
          ))}
          {results.length === 0 && (
            <Text style={styles.logEmpty}>
              Press "Run All Tests" to start testing the database
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  runAllButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  clearButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  buttonText: {
    fontSize: 14,
    color: '#333',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#fff',
  },
  logContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    minHeight: 300,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  logEntry: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 6,
  },
  logTime: {
    fontSize: 10,
    color: '#888',
  },
  logMessage: {
    fontSize: 12,
    color: '#ddd',
    marginTop: 2,
  },
  logError: {
    color: '#EF4444',
  },
  logEmpty: {
    textAlign: 'center',
    color: '#888',
    paddingVertical: 40,
  },
});