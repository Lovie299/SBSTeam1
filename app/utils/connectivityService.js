// app/utils/connectivityService.js
import NetInfo from '@react-native-community/netinfo';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let connectivityListener = null;
let appStateListener = null;

/**
 * Connectivity Service - Battery-efficient network monitoring
 * Uses event-driven listeners (no polling) to detect connectivity changes
 */
class ConnectivityService {
  constructor() {
    this.isOnline = false;
    this.syncCallback = null;
    this.isInitialized = false;
    this.networkHistory = [];
    this.maxHistorySize = 20;
  }

  /**
   * Initialize the connectivity service
   * @param {Function} syncCallback - Callback to trigger sync when network becomes available
   */
  initialize(syncCallback) {
    if (this.isInitialized) {
      console.log('📡 ConnectivityService already initialized');
      return;
    }

    this.syncCallback = syncCallback;
    this.isInitialized = true;

    // Register network listener (event-driven, zero polling)
    connectivityListener = NetInfo.addEventListener(this.handleNetworkChange.bind(this));

    // Register app state listener for foreground/background transitions
    appStateListener = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Initial connectivity check
    this.checkInitialConnectivity();

    console.log('✅ ConnectivityService initialized - ready for network changes');
  }

  /**
   * Handle network state changes (pure event-driven)
   */
  async handleNetworkChange(state) {
    const isConnected = state.isConnected && state.isInternetReachable !== false;
    const previousState = this.isOnline;
    const timestamp = new Date().toISOString();

    // Record in history
    this.addToHistory({
      timestamp,
      isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
    });

    console.log(`📡 Network: ${previousState ? 'Online' : 'Offline'} → ${isConnected ? 'Online' : 'Offline'}`);
    console.log(`   Type: ${state.type}, Internet: ${state.isInternetReachable}`);

    await AsyncStorage.setItem('@last_network_state', JSON.stringify({
      isConnected,
      timestamp,
      type: state.type,
    }));

    this.isOnline = isConnected;

    // CRITICAL: Trigger sync when transitioning from offline → online
    if (!previousState && isConnected && this.syncCallback) {
      console.log('🚀 Network came online - triggering background sync...');
      this.syncCallback();
    }
  }

  /**
   * Handle app state changes
   */
  async handleAppStateChange(nextAppState) {
    console.log(`📱 App state: ${nextAppState}`);
    
    if (nextAppState === 'active') {
      // Re-check connectivity when app comes to foreground
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable !== false;
      
      if (isConnected && !this.isOnline && this.syncCallback) {
        console.log('🚀 App came online - triggering sync...');
        this.syncCallback();
      }
      this.isOnline = isConnected;
    }
  }

  /**
   * Add network event to history
   */
  addToHistory(event) {
    this.networkHistory.unshift(event);
    if (this.networkHistory.length > this.maxHistorySize) {
      this.networkHistory.pop();
    }
  }

  /**
   * Get network history for debugging
   */
  getNetworkHistory() {
    return this.networkHistory;
  }

  /**
   * Check initial connectivity
   */
  async checkInitialConnectivity() {
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected && netInfo.isInternetReachable !== false;
    console.log(`📡 Initial connectivity: ${this.isOnline ? 'Online' : 'Offline'}`);
    console.log(`   Network type: ${netInfo.type}`);
  }

  /**
   * Get current online status
   */
  isDeviceOnline() {
    return this.isOnline;
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (connectivityListener) {
      connectivityListener();
      connectivityListener = null;
    }
    if (appStateListener) {
      appStateListener.remove();
      appStateListener = null;
    }
    this.isInitialized = false;
    console.log('📡 ConnectivityService cleaned up');
  }
}

// Singleton instance
const connectivityService = new ConnectivityService();
export default connectivityService;