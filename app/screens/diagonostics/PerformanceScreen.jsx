// app/screens/diagnostics/PerformanceScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import performanceMonitor from '../../utils/performanceMonitor';

export default function PerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    batteryPercentage: 0,
    batteryState: 'unknown',
    batteryIcon: 'battery-dead',
    batteryColor: '#EF4444',
    memoryUsageMB: 0,
    memoryPercentage: 0,
    storageFreeMB: 0,
    storageUsedPercentage: 0,
    isLowBattery: false,
  });

  useEffect(() => {
    const init = async () => {
      await performanceMonitor.initialize();
      setLoading(false);
    };
    init();

    const unsubscribe = performanceMonitor.addListener((data) => {
      setMetrics(data);
    });

    return () => {
      unsubscribe();
      performanceMonitor.stopMonitoring();
    };
  }, []);

  const MetricCard = ({ title, value, unit, icon, color, percentage }) => (
    <LinearGradient
      colors={['#FFFFFF', '#FAFAFA']}
      style={styles.metricCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>
        {value}
        <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
      {percentage !== undefined && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      )}
      {title === 'Battery' && metrics.batteryState !== 'unknown' && (
        <Text style={styles.metricSubtext}>
          Status: {metrics.batteryState === 'charging' ? '🔌 Charging' : metrics.batteryState === 'full' ? '✓ Full' : '⚡ Discharging'}
        </Text>
      )}
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Monitoring device performance...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Performance Monitor</Text>
        <Text style={styles.headerSubtitle}>Real-time device health</Text>
      </LinearGradient>

      <View style={styles.content}>
        <MetricCard
          title="Battery"
          value={metrics.batteryPercentage}
          unit="%"
          icon={metrics.batteryIcon}
          color={metrics.batteryColor}
          percentage={metrics.batteryPercentage}
        />

        <MetricCard
          title="Memory Usage"
          value={metrics.memoryUsageMB}
          unit=" MB"
          icon="hardware-chip-outline"
          color="#3B82F6"
          percentage={metrics.memoryPercentage}
        />

        <MetricCard
          title="Free Storage"
          value={metrics.storageFreeMB}
          unit=" MB"
          icon="save-outline"
          color="#8B5CF6"
          percentage={100 - metrics.storageUsedPercentage}
        />

        {metrics.isLowBattery && (
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.warningCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="warning-outline" size={24} color="#DC2626" />
            <View>
              <Text style={styles.warningTitle}>Low Battery Warning</Text>
              <Text style={styles.warningText}>
                Battery level is below 20%. Consider conserving power or connecting to a charger.
              </Text>
            </View>
          </LinearGradient>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { paddingHorizontal: 20, paddingVertical: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { padding: 16, gap: 16 },
  metricCard: { borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  metricIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  metricTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  metricValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  metricUnit: { fontSize: 14, fontWeight: 'normal', color: '#6B7280' },
  progressBarContainer: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, borderRadius: 3 },
  metricSubtext: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: '#991B1B' },
  warningText: { fontSize: 12, color: '#991B1B', marginTop: 2, opacity: 0.8 },
});