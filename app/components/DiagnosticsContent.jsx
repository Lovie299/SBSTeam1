// app/components/DiagnosticsContent.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';

export default function DiagnosticsContent() {
  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [networkState, setNetworkState] = useState(null);
  const [lifecycleLogs, setLifecycleLogs] = useState([]);

  useEffect(() => {
    loadHardwareInfo();
    setupNetworkListener();
    setupLifecycleListener();
  }, []);

  const loadHardwareInfo = async () => {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      setHardwareInfo({
        deviceName: Device.deviceName || 'Unknown',
        manufacturer: Device.manufacturer || 'Unknown',
        modelName: Device.modelName || 'Unknown',
        osVersion: Device.osVersion || 'Unknown',
        batteryLevel: Math.round(batteryLevel * 100),
      });
    } catch (error) {
      console.error('Failed to load hardware info:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });
    return () => unsubscribe();
  };

  const setupLifecycleListener = () => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const event = nextAppState === 'active' ? 'OnResume' : 'OnPause';
      setLifecycleLogs(prev => [{
        id: Date.now(),
        event: event,
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 4)]);
    });
    return () => subscription.remove();
  };

  const addLifecycleLog = (event) => {
    setLifecycleLogs(prev => [{
      id: Date.now(),
      event: event,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev.slice(0, 4)]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hardware Info */}
      <LinearGradient colors={['#FFFFFF', '#FAFAFA']} style={styles.card}>
        <Text style={styles.cardTitle}>📱 Device Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Device:</Text>
          <Text style={styles.value}>{hardwareInfo?.deviceName || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Manufacturer:</Text>
          <Text style={styles.value}>{hardwareInfo?.manufacturer || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Model:</Text>
          <Text style={styles.value}>{hardwareInfo?.modelName || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>OS Version:</Text>
          <Text style={styles.value}>{hardwareInfo?.osVersion || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Battery:</Text>
          <Text style={[styles.value, hardwareInfo?.batteryLevel < 20 && styles.lowBattery]}>
            {hardwareInfo?.batteryLevel || 0}%
          </Text>
        </View>
      </LinearGradient>

      {/* Network Info */}
      <LinearGradient colors={['#FFFFFF', '#FAFAFA']} style={styles.card}>
        <Text style={styles.cardTitle}>📡 Network Status</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Connection:</Text>
          <Text style={[styles.value, networkState?.isConnected ? styles.online : styles.offline]}>
            {networkState?.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Network Type:</Text>
          <Text style={styles.value}>{networkState?.type?.toUpperCase() || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Internet:</Text>
          <Text style={[styles.value, networkState?.isInternetReachable ? styles.online : styles.offline]}>
            {networkState?.isInternetReachable ? 'Available' : 'Not Available'}
          </Text>
        </View>
      </LinearGradient>

      {/* Lifecycle Events */}
      <LinearGradient colors={['#FFFFFF', '#FAFAFA']} style={styles.card}>
        <Text style={styles.cardTitle}>🔄 Lifecycle Events</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.lifecycleBtn} onPress={() => addLifecycleLog('OnCreate')}>
            <Text style={styles.btnText}>OnCreate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleBtn} onPress={() => addLifecycleLog('OnStart')}>
            <Text style={styles.btnText}>OnStart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleBtn} onPress={() => addLifecycleLog('OnResume')}>
            <Text style={styles.btnText}>OnResume</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleBtn} onPress={() => addLifecycleLog('OnPause')}>
            <Text style={styles.btnText}>OnPause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleBtn} onPress={() => addLifecycleLog('OnStop')}>
            <Text style={styles.btnText}>OnStop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lifecycleBtn} onPress={() => addLifecycleLog('OnDestroy')}>
            <Text style={styles.btnText}>OnDestroy</Text>
          </TouchableOpacity>
        </View>
        {lifecycleLogs.length === 0 ? (
          <Text style={styles.emptyText}>No events recorded yet</Text>
        ) : (
          lifecycleLogs.map(log => (
            <View key={log.id} style={styles.logItem}>
              <Text style={styles.logEvent}>{log.event}</Text>
              <Text style={styles.logTime}>{log.timestamp}</Text>
            </View>
          ))
        )}
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  lowBattery: { color: '#EF4444' },
  online: { color: '#10B981', fontWeight: 'bold' },
  offline: { color: '#EF4444', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  lifecycleBtn: { flex: 1, minWidth: '30%', backgroundColor: '#1a1a2e', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 11, fontWeight: '600' },
  logItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logEvent: { fontSize: 14, fontWeight: '500', color: '#10B981' },
  logTime: { fontSize: 12, color: '#9CA3AF' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 20 },
});