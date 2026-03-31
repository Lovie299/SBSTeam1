import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Network from 'expo-network';

export default function ConnectivityManager() {
  const [networkState, setNetworkState] = useState({
    type: 'unknown',
    isConnected: false,
    isInternetReachable: false,
    details: null,
  });
  const [networkHistory, setNetworkHistory] = useState([]);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const newState = {
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      };
      setNetworkState(newState);
      
      // Log network changes for history
      setNetworkHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          state: newState.isConnected ? 'Connected' : 'Disconnected',
          type: newState.type,
        },
        ...prev.slice(0, 9) // Keep last 10 entries
      ]);
    });

    return () => unsubscribe();
  }, []);

  const checkNetworkDetails = async () => {
    try {
      const ip = await Network.getIpAddressAsync();
      const networkStateExpo = await Network.getNetworkStateAsync();
      Alert.alert(
        'Network Details',
        `IP Address: ${ip}\n` +
        `Type: ${networkState.type}\n` +
        `Connected: ${networkState.isConnected ? 'Yes' : 'No'}\n` +
        `Internet Reachable: ${networkState.isInternetReachable ? 'Yes' : 'No'}`
      );
    } catch (error) {
      Alert.alert('Error', 'Could not fetch network details');
    }
  };

  const getConnectionIcon = () => {
    if (!networkState.isConnected) return '📡';
    switch (networkState.type) {
      case 'wifi': return '📶';
      case 'cellular': return '📱';
      case 'ethernet': return '🔌';
      default: return '🌐';
    }
  };

  const getConnectionColor = () => {
    if (!networkState.isConnected) return '#d32f2f';
    if (networkState.isInternetReachable) return '#2c5f2d';
    return '#f57c00';
  };

  const getConnectionStatusText = () => {
    if (!networkState.isConnected) return 'Disconnected';
    if (networkState.isInternetReachable) return 'Connected (Active)';
    return 'Connected (Idle)';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.statusCard, { borderLeftColor: getConnectionColor() }]}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusIcon}>{getConnectionIcon()}</Text>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Network State</Text>
            <Text style={[styles.statusValue, { color: getConnectionColor() }]}>
              {getConnectionStatusText()}
            </Text>
          </View>
        </View>
        
        {networkState.isConnected && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network Type:</Text>
              <Text style={styles.detailValue}>{networkState.type.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Internet Reachable:</Text>
              <Text style={styles.detailValue}>
                {networkState.isInternetReachable ? '✅ Yes' : '❌ No'}
              </Text>
            </View>
            {networkState.details && networkState.type === 'wifi' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Signal Strength:</Text>
                <Text style={styles.detailValue}>
                  {networkState.details.strength || 'N/A'} dBm
                </Text>
              </View>
            )}
          </>
        )}
        
        <TouchableOpacity style={styles.checkButton} onPress={checkNetworkDetails}>
          <Text style={styles.checkButtonText}>View Network Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Network History</Text>
        {networkHistory.length === 0 ? (
          <Text style={styles.emptyText}>No network changes recorded</Text>
        ) : (
          networkHistory.map((record, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyTime}>
                {new Date(record.timestamp).toLocaleTimeString()}
              </Text>
              <Text style={[styles.historyState, record.state === 'Connected' ? styles.online : styles.offline]}>
                {record.state}
              </Text>
              <Text style={styles.historyType}>{record.type}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📡 Mobile Network Architecture</Text>
        <Text style={styles.infoText}>
          <Text style={styles.boldText}>RAN (Radio Access Network):</Text> Handles wireless communication between device and network towers.{'\n\n'}
          <Text style={styles.boldText}>Core Network:</Text> Manages data routing, authentication, and connectivity to internet.{'\n\n'}
          <Text style={styles.boldText}>Network States:</Text> Idle → Connected → Active transitions are monitored in real-time.
        </Text>
      </View>
    </ScrollView>
  );
}

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
    borderLeftWidth: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  checkButton: {
    backgroundColor: '#2c5f2d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  checkButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    width: 80,
  },
  historyState: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  historyType: {
    fontSize: 12,
    color: '#666',
    width: 80,
    textAlign: 'right',
  },
  online: {
    color: '#2c5f2d',
  },
  offline: {
    color: '#d32f2f',
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
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
});