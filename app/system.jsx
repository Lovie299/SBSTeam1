// app/system.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBiometric } from './contexts/BiometricContext';
import { useAuth } from './contexts/AuthContext';
import DiagnosticsContent from './components/DiagnosticsContent';
import PerformanceMonitor from './utils/performanceMonitor';

export default function SystemScreen() {
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState('diagnostics');
  const { isBiometricSupported, isBiometricEnabled, enableBiometric, getBiometricName, getBiometricIcon } = useBiometric();
  const { user } = useAuth();
  const [performanceMetrics, setPerformanceMetrics] = useState({
    batteryPercentage: 100,
    batteryState: 'unknown',
    batteryIcon: 'battery-full',
    batteryColor: '#10B981',
    memoryUsageMB: 0,
    memoryPercentage: 0,
    storageFreeMB: 0,
    storageUsedPercentage: 0,
    isLowBattery: false,
  });

  useEffect(() => {
    const init = async () => {
      await PerformanceMonitor.initialize();
      const unsubscribe = PerformanceMonitor.addListener((data) => {
        setPerformanceMetrics(data);
      });
      return () => unsubscribe();
    };
    init();
  }, []);

  const sections = [
    { id: 'diagnostics', label: 'Diagnostics', icon: 'hardware-chip-outline' },
    { id: 'performance', label: 'Performance', icon: 'speedometer-outline' },
    { id: 'security', label: 'Security', icon: 'shield-checkmark-outline' },
  ];

  const renderPerformance = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Performance Monitor</Text>
      
      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Ionicons name={performanceMetrics.batteryIcon} size={24} color={performanceMetrics.batteryColor} />
          <Text style={[styles.metricValue, { color: performanceMetrics.batteryColor }]}>{performanceMetrics.batteryPercentage}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${performanceMetrics.batteryPercentage}%`, backgroundColor: performanceMetrics.batteryColor }]} />
        </View>
        <Text style={styles.metricLabel}>Battery</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Ionicons name="hardware-chip-outline" size={24} color="#3B82F6" />
          <Text style={[styles.metricValue, { color: '#3B82F6' }]}>{performanceMetrics.memoryUsageMB} MB</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${performanceMetrics.memoryPercentage}%`, backgroundColor: '#3B82F6' }]} />
        </View>
        <Text style={styles.metricLabel}>Memory Used</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Ionicons name="save-outline" size={24} color="#8B5CF6" />
          <Text style={[styles.metricValue, { color: '#8B5CF6' }]}>{performanceMetrics.storageFreeMB} MB free</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${performanceMetrics.storageUsedPercentage}%`, backgroundColor: '#8B5CF6' }]} />
        </View>
        <Text style={styles.metricLabel}>Storage Used</Text>
      </View>

      {performanceMetrics.isLowBattery && (
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#EF4444" />
          <Text style={styles.warningText}>Low battery - consider charging</Text>
        </View>
      )}
    </View>
  );

  const renderSecurity = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Security Settings</Text>
      
      <View style={styles.biometricCard}>
        <View style={styles.biometricHeader}>
          <Ionicons name={getBiometricIcon()} size={24} color="#10B981" />
          <Text style={styles.biometricTitle}>Biometric Authentication</Text>
        </View>
        <Text style={styles.biometricDescription}>
          Use {getBiometricName()} to securely access sensitive features:
        </Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.featureText}>Marking sightings as attended</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.featureText}>Adding new gorilla sightings</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.featureText}>Accessing group chat</Text>
          </View>
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
            <Text style={styles.warningContainerText}>
              {getBiometricName()} is not available. Set up biometrics in device settings.
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account:</Text>
          <Text style={styles.infoValue}>{user?.email || 'Not logged in'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={[styles.header, { paddingTop: insets.top + 15 }]}
      >
        <Text style={styles.headerTitle}>System</Text>
        <Text style={styles.headerSubtitle}>Diagnostics & Security</Text>
      </LinearGradient>

      <View style={styles.sectionTabs}>
        {sections.map(section => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionTab, activeSection === section.id && styles.activeSectionTab]}
            onPress={() => setActiveSection(section.id)}
          >
            <Ionicons name={section.icon} size={20} color={activeSection === section.id ? '#10B981' : '#6B7280'} />
            <Text style={[styles.sectionTabText, activeSection === section.id && styles.activeSectionTabText]}>
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeSection === 'diagnostics' && <DiagnosticsContent />}
        {activeSection === 'performance' && renderPerformance()}
        {activeSection === 'security' && renderSecurity()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  sectionTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  sectionTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  activeSectionTab: { backgroundColor: '#E8F5E9' },
  sectionTabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  activeSectionTabText: { color: '#10B981', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  metricCard: { marginBottom: 20 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metricValue: { fontSize: 20, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  metricLabel: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginTop: 8 },
  warningText: { fontSize: 12, color: '#EF4444', flex: 1 },
  biometricCard: { padding: 0 },
  biometricHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  biometricTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  biometricDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  featureList: { gap: 10, marginBottom: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#374151' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  switchLabel: { fontSize: 16, fontWeight: '500', color: '#374151' },
  warningContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginTop: 16 },
  warningContainerText: { fontSize: 12, color: '#EF4444', flex: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
});