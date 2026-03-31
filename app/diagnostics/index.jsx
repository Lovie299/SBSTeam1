// app/diagnostics/index.jsx - Redesigned with Consistent Styling
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Brightness from 'expo-brightness';
import NetInfo from '@react-native-community/netinfo';
import * as Network from 'expo-network';

export default function DiagnosticsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('hardware');
  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [networkState, setNetworkState] = useState(null);
  const [lifecycleLogs, setLifecycleLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState('');

  useEffect(() => {
    loadHardwareInfo();
    setupNetworkListener();
    setupLifecycleListener();
  }, []);

  const loadHardwareInfo = async () => {
    try {
      const deviceInfo = {
        deviceName: Device.deviceName || Device.modelName || 'Unknown',
        brand: Device.brand || 'Unknown',
        modelName: Device.modelName || 'Unknown',
        osVersion: Device.osVersion || 'Unknown',
        osBuildId: Device.osBuildId || 'Unknown',
        totalMemory: Device.totalMemory || 0,
        manufacturer: Device.manufacturer || 'Unknown',
        deviceYear: Device.deviceYearClass || 'Unknown',
        isDevice: Device.isDevice,
      };
      
      const batteryLevel = await Battery.getBatteryLevelAsync();
      
      let brightness = 50;
      try {
        brightness = await Brightness.getBrightnessAsync();
      } catch (e) {}
      
      let networkType = 'Unknown';
      try {
        const netState = await Network.getNetworkStateAsync();
        networkType = netState.type || 'Unknown';
      } catch (e) {}
      
      let ip = 'Not available';
      try {
        ip = await Network.getIpAddressAsync();
      } catch (e) {}
      
      setHardwareInfo({
        ...deviceInfo,
        batteryLevel: Math.round(batteryLevel * 100),
        screenBrightness: Math.round(brightness * 100),
        networkType: networkType,
      });
      setIpAddress(ip);
    } catch (error) {
      setHardwareInfo({
        deviceName: 'Unknown Device',
        brand: 'Unknown',
        modelName: 'Unknown',
        osVersion: Platform.OS === 'ios' ? 'iOS' : 'Android',
        osBuildId: 'Unknown',
        totalMemory: 0,
        manufacturer: 'Unknown',
        deviceYear: 'Unknown',
        isDevice: false,
        batteryLevel: 50,
        screenBrightness: 50,
        networkType: 'Unknown',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
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
        description: event === 'OnResume' ? 'App resumed from background' : 'App paused, saving state'
      }, ...prev.slice(0, 9)]);
    });
    return () => subscription.remove();
  };

  const addLifecycleLog = (event) => {
    const descriptions = {
      'OnCreate': 'Activity created, initializing components',
      'OnStart': 'Activity becoming visible',
      'OnResume': 'Activity resumed, user interaction ready',
      'OnPause': 'Activity paused, saving unsaved data',
      'OnStop': 'Activity stopped, releasing resources',
      'OnDestroy': 'Activity destroyed, cleanup complete'
    };
    
    setLifecycleLogs(prev => [{
      id: Date.now(),
      event: event,
      timestamp: new Date().toLocaleTimeString(),
      description: descriptions[event] || 'State transition'
    }, ...prev.slice(0, 9)]);
  };

  const TabButton = ({ title, icon, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isActive ? (
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.tabButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={20} color="white" />
          <Text style={styles.tabButtonTextActive}>{title}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.tabButtonInactive}>
          <Ionicons name={icon} size={20} color="#9CA3AF" />
          <Text style={styles.tabButtonText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const InfoCard = ({ title, icon, children, gradient }) => (
    <LinearGradient
      colors={gradient || ['#FFFFFF', '#FAFAFA']}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>{icon}</Text>
        </View>
      </View>
      {children}
    </LinearGradient>
  );

  const InfoRow = ({ label, value, status }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {status ? (
        <View style={[styles.statusBadge, { backgroundColor: status === 'good' ? '#D1FAE5' : status === 'warning' ? '#FEF3C7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: status === 'good' ? '#10B981' : status === 'warning' ? '#F59E0B' : '#EF4444' }]}>
            {value}
          </Text>
        </View>
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );

  const renderHardwareTab = () => (
    <View style={styles.tabContent}>
      <InfoCard title="Device Information" icon="📱" gradient={['#FFFFFF', '#F8FAFC']}>
        <InfoRow label="Device Name" value={hardwareInfo?.deviceName || 'Unknown'} />
        <InfoRow label="Manufacturer" value={hardwareInfo?.manufacturer || hardwareInfo?.brand || 'Unknown'} />
        <InfoRow label="Model" value={hardwareInfo?.modelName || 'Unknown'} />
        <InfoRow label="OS Version" value={hardwareInfo?.osVersion || 'Unknown'} />
        <InfoRow label="Build ID" value={hardwareInfo?.osBuildId || 'Unknown'} />
        <InfoRow 
          label="RAM" 
          value={hardwareInfo?.totalMemory ? `${(hardwareInfo.totalMemory / (1024 ** 3)).toFixed(2)} GB` : '0 GB'} 
        />
      </InfoCard>

      <InfoCard title="Battery & Display" icon="🔋" gradient={['#FFFFFF', '#F8FAFC']}>
        <InfoRow 
          label="Battery Level" 
          value={`${hardwareInfo?.batteryLevel || 0}%`}
          status={hardwareInfo?.batteryLevel > 50 ? 'good' : hardwareInfo?.batteryLevel > 20 ? 'warning' : 'bad'}
        />
        <InfoRow label="Screen Brightness" value={`${hardwareInfo?.screenBrightness || 0}%`} />
        <InfoRow label="Device Year" value={hardwareInfo?.deviceYear || 'Unknown'} />
      </InfoCard>

      <InfoCard title="Available Sensors" icon="📡" gradient={['#FFFFFF', '#F8FAFC']}>
        <View style={styles.sensorList}>
          {['Accelerometer', 'Gyroscope', 'GPS / Location', 'Proximity Sensor', 'Light Sensor'].map(sensor => (
            <View key={sensor} style={styles.sensorItem}>
              <View style={styles.sensorDot} />
              <Text style={styles.sensorText}>{sensor}</Text>
            </View>
          ))}
        </View>
      </InfoCard>
    </View>
  );

  const renderNetworkTab = () => (
    <View style={styles.tabContent}>
      <InfoCard title="Network Status" icon="📡" gradient={['#FFFFFF', '#F8FAFC']}>
        <InfoRow 
          label="Connection" 
          value={networkState?.isConnected ? 'Connected' : 'Disconnected'}
          status={networkState?.isConnected ? 'good' : 'bad'}
        />
        <InfoRow label="Network Type" value={networkState?.type?.toUpperCase() || 'Unknown'} />
        <InfoRow 
          label="Internet Access" 
          value={networkState?.isInternetReachable ? 'Available' : 'Not Available'}
          status={networkState?.isInternetReachable ? 'good' : 'bad'}
        />
        <InfoRow label="IP Address" value={ipAddress || 'Fetching...'} />
        {networkState?.type === 'wifi' && networkState?.details && (
          <InfoRow label="Signal Strength" value={`${networkState.details.strength || 'N/A'} dBm`} />
        )}
      </InfoCard>

      <InfoCard title="Network States" icon="📊" gradient={['#FFFFFF', '#F8FAFC']}>
        <View style={styles.stateList}>
          <View style={styles.stateItem}>
            <View style={[styles.stateDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={styles.stateText}>Idle: No active data transfer</Text>
          </View>
          <View style={styles.stateItem}>
            <View style={[styles.stateDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.stateText}>Connected: Network available</Text>
          </View>
          <View style={styles.stateItem}>
            <View style={[styles.stateDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.stateText}>Active: Data transfer in progress</Text>
          </View>
        </View>
        <View style={styles.currentState}>
          <View style={[styles.stateDotLarge, networkState?.isConnected ? styles.activeDot : styles.inactiveDot]} />
          <Text style={styles.currentStateText}>
            Current State: {networkState?.isConnected ? 
              (networkState?.isInternetReachable ? 'Active' : 'Connected (Idle)') : 
              'Disconnected'}
          </Text>
        </View>
      </InfoCard>
    </View>
  );

  const renderLifecycleTab = () => (
    <View style={styles.tabContent}>
      <InfoCard title="Activity Lifecycle" icon="🔄" gradient={['#FFFFFF', '#F8FAFC']}>
        <Text style={styles.sectionSubtitle}>Simulate Lifecycle Events</Text>
        <View style={styles.buttonGrid}>
          {['OnCreate', 'OnStart', 'OnResume', 'OnPause', 'OnStop', 'OnDestroy'].map(event => (
            <TouchableOpacity
              key={event}
              style={styles.lifecycleButton}
              onPress={() => addLifecycleLog(event)}
            >
              <LinearGradient
                colors={['#1a1a2e', '#16213e']}
                style={styles.lifecycleButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.lifecycleButtonText}>{event}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.sectionSubtitle}>Lifecycle Events Log</Text>
        {lifecycleLogs.length === 0 ? (
          <View style={styles.emptyLogs}>
            <Text style={styles.emptyLogsText}>No events recorded yet</Text>
            <Text style={styles.emptyLogsSubtext}>Tap any lifecycle button above</Text>
          </View>
        ) : (
          lifecycleLogs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <View style={[styles.logBadge, { backgroundColor: log.event.includes('Resume') || log.event.includes('Create') ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={[styles.logBadgeText, { color: log.event.includes('Resume') || log.event.includes('Create') ? '#10B981' : '#F59E0B' }]}>
                    {log.event}
                  </Text>
                </View>
                <Text style={styles.logTime}>{log.timestamp}</Text>
              </View>
              <Text style={styles.logDescription}>{log.description}</Text>
            </View>
          ))
        )}
      </InfoCard>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading system information...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={[styles.headerGradient, { paddingTop: insets.top + 15 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <Text style={styles.headerSubtitle}>Monitor device health and performance</Text>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBarContainer}>
        <TabButton
          title="Hardware"
          icon="hardware-chip-outline"
          isActive={activeTab === 'hardware'}
          onPress={() => setActiveTab('hardware')}
        />
        <TabButton
          title="Network"
          icon="wifi-outline"
          isActive={activeTab === 'network'}
          onPress={() => setActiveTab('network')}
        />
        <TabButton
          title="Lifecycle"
          icon="sync-outline"
          isActive={activeTab === 'lifecycle'}
          onPress={() => setActiveTab('lifecycle')}
        />
      </View>

      {/* Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'hardware' && renderHardwareTab()}
        {activeTab === 'network' && renderNetworkTab()}
        {activeTab === 'lifecycle' && renderLifecycleTab()}
      </ScrollView>

      {/* Footer Info */}
      <LinearGradient
        colors={['#D1FAE5', '#A7F3D0']}
        style={styles.footer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name="information-circle" size={18} color="#059669" />
        <Text style={styles.footerText}>
          {activeTab === 'hardware' && 'Hardware diagnostics help rangers monitor device health in remote areas'}
          {activeTab === 'network' && 'Network monitoring enables offline-first data sync when signal returns'}
          {activeTab === 'lifecycle' && 'Lifecycle management preserves data during app state changes'}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  
  // Header
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  
  // Tab Bar
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#1a1a2e',
  },
  tabButton: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabButtonActive: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  tabButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    borderRadius: 24,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabButtonTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  // Content
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  tabContent: {
    gap: 12,
  },
  
  // Cards
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {
    fontSize: 18,
  },
  
  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Sensors
  sensorList: {
    padding: 16,
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sensorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sensorText: {
    fontSize: 14,
    color: '#374151',
  },
  
  // Network States
  stateList: {
    padding: 16,
    gap: 8,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  stateDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeDot: {
    backgroundColor: '#10B981',
  },
  inactiveDot: {
    backgroundColor: '#EF4444',
  },
  currentStateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  
  // Lifecycle
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  lifecycleButton: {
    width: '31%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  lifecycleButtonGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  lifecycleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyLogsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  emptyLogsSubtext: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  logItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  logDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 30,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    flex: 1,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});