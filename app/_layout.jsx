// app/_layout.jsx - Fixed with proper imports
import { Tabs } from 'expo-router';
import { ObservationProvider } from './contexts/ObservationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'; // Added View here
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import AuthScreen from './auth/index';
import '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';


// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }) {
  const currentRoute = usePathname();
  
  const tabs = [
    { 
      name: 'index', 
      label: 'Home', 
      icon: 'home-outline', 
      activeIcon: 'home',
      route: '/',
      gradient: ['#10B981', '#059669']
    },
    { 
      name: 'observations/index', 
      label: 'Sightings', 
      icon: 'leaf-outline', 
      activeIcon: 'leaf',
      route: '/observations',
      gradient: ['#3B82F6', '#2563EB']
    },
    { 
      name: 'tracking/index', 
      label: 'Map', 
      icon: 'map-outline', 
      activeIcon: 'map',
      route: '/tracking',
      gradient: ['#8B5CF6', '#6D28D9']
    },
    { 
      name: 'diagnostics/index', 
      label: 'System', 
      icon: 'hardware-chip-outline', 
      activeIcon: 'hardware-chip',
      route: '/diagnostics',
      gradient: ['#F59E0B', '#D97706']
    },
    { 
      name: 'alerts/index', 
      label: 'Chat', 
      icon: 'chatbubble-outline', 
      activeIcon: 'chatbubble',
      route: '/alerts',
      gradient: ['#EF4444', '#DC2626']
    },
  ];

  const getActiveIndex = () => {
    if (currentRoute === '/') return 0;
    if (currentRoute.includes('/observations')) return 1;
    if (currentRoute.includes('/tracking')) return 2;
    if (currentRoute.includes('/diagnostics')) return 3;
    if (currentRoute.includes('/alerts')) return 4;
    return 0;
  };

  const activeIndex = getActiveIndex();

  const handlePress = (index, route) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index === 0) navigation.navigate('index');
    else if (index === 1) navigation.navigate('observations/index');
    else if (index === 2) navigation.navigate('tracking/index');
    else if (index === 3) navigation.navigate('diagnostics/index');
    else if (index === 4) navigation.navigate('alerts/index');
  };

  return (
    <View style={styles.tabBarContainer}>
      {tabs.map((tab, index) => {
        const isActive = activeIndex === index;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => handlePress(index, tab.route)}
          >
            {isActive ? (
              <LinearGradient
                colors={tab.gradient}
                style={styles.activeTabGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.activeTabContent}>
                  <Ionicons name={tab.activeIcon} size={22} color="white" />
                  <Text style={styles.activeTabLabel}>{tab.label}</Text>
                  <View style={styles.activeIndicator} />
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTabContent}>
                <Ionicons name={tab.icon} size={22} color="#9CA3AF" />
                <Text style={styles.inactiveTabLabel}>{tab.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Main App Component with Auth Check
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <ObservationProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Tabs.Screen name="observations/index" options={{ title: 'Sightings' }} />
        <Tabs.Screen name="tracking/index" options={{ title: 'Gorilla Tracking' }} />
        <Tabs.Screen name="diagnostics/index" options={{ title: 'Diagnostics' }} />
        <Tabs.Screen name="alerts/index" options={{ title: 'Group Chat' }} />
        <Tabs.Screen name="database_test" options={{ title: 'DB Test',tabBarLabel: 'DB Test'}} />
      </Tabs>
    </ObservationProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 75,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 16,
  },
  activeTabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  activeTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  inactiveTabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  activeTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  inactiveTabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  activeIndicator: {
    width: 20,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    marginTop: 6,
  },
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