// app/components/HardwareDiagnostic.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import { getSystemInfoAsync } from 'expo-device';
import * as Network from 'expo-network';
import * as Brightness from 'expo-brightness';

export default function HardwareDiagnostic() {
  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHardwareInfo();
  }, []);

  const loadHardwareInfo = async () => {
    try {
      const deviceInfo = await getSystemInfoAsync();
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const networkState = await Network.getNetworkStateAsync();
      const brightness = await Brightness.getBrightnessAsync();

      setHardwareInfo({
        deviceName: deviceInfo.deviceName,
        brand: deviceInfo.brand,
        modelName: deviceInfo.modelName,
        osVersion: deviceInfo.osVersion,
        osBuildId: deviceInfo.osBuildId,
        totalMemory: deviceInfo.totalMemory,
        batteryLevel: Math.round(batteryLevel * 100),
        isCharging: await Battery.isBatteryOptimizationEnabledAsync(),
        networkType: networkState.type,
        isConnected: networkState.isConnected,
        screenBrightness: Math.round(brightness * 100),
        manufacturer: deviceInfo.manufacturer,
        deviceYear: deviceInfo.deviceYearClass,
      });
    } catch (error) {
      console.error('Failed to load hardware info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c5f2d" />
        <Text style={styles.loadingText}>Detecting hardware...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📱 Device Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Device:</Text>
          <Text style={styles.value}>{hardwareInfo.deviceName || hardwareInfo.modelName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Manufacturer:</Text>
          <Text style={styles.value}>{hardwareInfo.manufacturer || hardwareInfo.brand}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>OS Version:</Text>
          <Text style={styles.value}>{hardwareInfo.osVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Build ID:</Text>
          <Text style={styles.value}>{hardwareInfo.osBuildId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Device Year:</Text>
          <Text style={styles.value}>{hardwareInfo.deviceYear || 'Unknown'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚙️ System Resources</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Total Memory:</Text>
          <Text style={styles.value}>{(hardwareInfo.totalMemory / (1024 ** 3)).toFixed(2)} GB</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Battery Level:</Text>
          <Text style={[styles.value, hardwareInfo.batteryLevel < 20 && styles.lowBattery]}>
            {hardwareInfo.batteryLevel}%
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Screen Brightness:</Text>
          <Text style={styles.value}>{hardwareInfo.screenBrightness}%</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📶 Network & Sensors</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Network Status:</Text>
          <Text style={[styles.value, hardwareInfo.isConnected ? styles.online : styles.offline]}>
            {hardwareInfo.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Network Type:</Text>
          <Text style={styles.value}>{hardwareInfo.networkType || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Sensors Available:</Text>
          <Text style={styles.value}>Accelerometer, Gyroscope, GPS, Proximity</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5f2d',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  online: {
    color: '#2c5f2d',
    fontWeight: 'bold',
  },
  offline: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  lowBattery: {
    color: '#f57c00',
    fontWeight: 'bold',
  },
});