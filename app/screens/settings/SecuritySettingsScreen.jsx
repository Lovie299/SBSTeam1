// app/screens/settings/SecuritySettingsScreen.jsx
import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBiometric } from '../../contexts/BiometricContext';
import { Ionicons } from '@expo/vector-icons';

export default function SecuritySettingsScreen() {
  const { isBiometricSupported, isBiometricEnabled, enableBiometric, getBiometricName, getBiometricIcon } = useBiometric();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.header}
      >
        <Text style={styles.title}>Security Settings</Text>
        <Text style={styles.subtitle}>Protect your account with biometrics</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name={getBiometricIcon()} size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Biometric Authentication</Text>
          </View>
          <Text style={styles.cardDescription}>
            Use {getBiometricName()} to securely access sensitive features like marking sightings as attended.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable {getBiometricName()}</Text>
            <Switch
              value={isBiometricEnabled}
              onValueChange={enableBiometric}
              disabled={!isBiometricSupported}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {!isBiometricSupported && (
            <Text style={styles.warningText}>
              {getBiometricName()} is not available on this device. Please set up biometrics in your device settings.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 20, paddingVertical: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { padding: 16, flex: 1 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  cardDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  switchLabel: { fontSize: 16, fontWeight: '500', color: '#374151' },
  warningText: { fontSize: 12, color: '#EF4444', marginTop: 12, textAlign: 'center' },
});