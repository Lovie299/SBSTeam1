// app/settings.jsx
import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBiometric } from './contexts/BiometricContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isBiometricSupported, isBiometricEnabled, enableBiometric, getBiometricName, getBiometricIcon } = useBiometric();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={[styles.header, { paddingTop: insets.top + 15 }]}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name={getBiometricIcon()} size={24} color="#10B981" />
              <Text style={styles.cardTitle}>Biometric Authentication</Text>
            </View>
            <Text style={styles.cardDescription}>
              Use {getBiometricName()} to securely access sensitive features like marking sightings as attended.
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account:</Text>
              <Text style={styles.infoValue}>{user?.email || 'Not logged in'}</Text>
            </View>
            
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
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.warningText}>
                  {getBiometricName()} is not available on this device. Please set up biometrics in your device settings.
                </Text>
              </View>
            )}
            
            {isBiometricEnabled && isBiometricSupported && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                <Text style={styles.successText}>
                  {getBiometricName()} authentication is enabled for your account.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.card}>
            <View style={styles.aboutHeader}>
              <Text style={styles.aboutIcon}>🦍</Text>
              <View>
                <Text style={styles.aboutTitle}>SilverBack Sentry</Text>
                <Text style={styles.aboutVersion}>Version 2.0.0</Text>
              </View>
            </View>
            <Text style={styles.aboutDescription}>
              An offline-first gorilla conservation platform helping rangers protect and track mountain gorillas in remote areas.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  cardDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  switchLabel: { fontSize: 16, fontWeight: '500', color: '#374151' },
  warningContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginTop: 16 },
  warningText: { fontSize: 12, color: '#EF4444', flex: 1 },
  successContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 12, marginTop: 16 },
  successText: { fontSize: 12, color: '#10B981', flex: 1 },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  aboutIcon: { fontSize: 40 },
  aboutTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  aboutVersion: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  aboutDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});