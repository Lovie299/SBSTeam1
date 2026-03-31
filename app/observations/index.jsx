// app/observations/index.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useObservations } from '../contexts/ObservationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ObservationsScreen() {
  const insets = useSafeAreaInsets();
  const { observations, syncNow, isSyncing, getPendingCount } = useObservations();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const scrollViewRef = useRef(null);
  const chipPositions = useRef({});

  const pendingCount = getPendingCount();

  const filters = [
    { id: 'all', label: 'All', icon: 'apps-outline' },
    { id: 'pending', label: 'Pending', icon: 'time-outline' },
    { id: 'attended', label: 'Attended', icon: 'checkmark-circle-outline' },
    { id: 'needs', label: 'Needs Attention', icon: 'alert-circle-outline' },
  ];

  const filteredObservations = observations.filter(obs => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return !obs.synced;
    if (selectedFilter === 'attended') return obs.status === 'attended';
    if (selectedFilter === 'needs') return obs.status !== 'attended';
    return true;
  });

  const formatLocation = (item) => item.locationName || item.location || 'Location unknown';

  const getStatusConfig = (obs) => {
    if (!obs.synced) return { icon: 'cloud-offline-outline', color: '#F59E0B', label: 'Pending Sync', bg: '#FEF3C7' };
    if (obs.status === 'attended') return { icon: 'checkmark-circle', color: '#10B981', label: 'Attended', bg: '#D1FAE5' };
    return { icon: 'alert-circle', color: '#EF4444', label: 'Needs Attention', bg: '#FEE2E2' };
  };

  useEffect(() => {
    if (scrollViewRef.current && chipPositions.current[selectedFilter]) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: chipPositions.current[selectedFilter] - 20, animated: true });
      }, 100);
    }
  }, [selectedFilter]);

  const handleFilterPress = (filterId) => setSelectedFilter(filterId);
  const onChipLayout = (event, filterId) => {
    const { x } = event.nativeEvent.layout;
    chipPositions.current[filterId] = x;
  };

  const ObservationCard = ({ item }) => {
    const status = getStatusConfig(item);
    const isMyObservation = item.userId === user?.uid;
    const displayLocation = formatLocation(item);
    return (
      <View style={[styles.card, { borderLeftColor: status.color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.userSection}>
            <View style={[styles.userAvatar, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.userAvatarText, { color: status.color }]}>{item.userName?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.userName || 'Anonymous'}</Text>
                {isMyObservation && <View style={styles.myBadge}><Text style={styles.myBadgeText}>You</Text></View>}
              </View>
              <Text style={styles.userTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.gorillaSection}>
          <View style={styles.gorillaIcon}><Text style={styles.gorillaIconText}>🦍</Text></View>
          <View style={styles.gorillaInfo}>
            <Text style={styles.gorillaName}>{item.gorillaGroup || 'Unknown Group'}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={2}>{displayLocation}</Text>
            </View>
          </View>
        </View>
        {item.healthStatus && item.healthStatus !== 'Not specified' && item.healthStatus !== 'N/A' && (
          <View style={styles.healthRow}>
            <FontAwesome5 name="heartbeat" size={14} color="#F59E0B" style={styles.healthIcon} />
            <Text style={styles.healthText}>Health: {item.healthStatus}</Text>
          </View>
        )}
        {item.notes && (
          <View style={styles.notesRow}>
            <Ionicons name="document-text-outline" size={14} color="#6B7280" style={styles.notesIcon} />
            <Text style={styles.notesText} numberOfLines={0}>{item.notes}</Text>
          </View>
        )}
        {item.imageUrl && (
          <View style={styles.imageRow}>
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
          </View>
        )}
        <View style={styles.timestampRow}>
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <Text style={styles.timestampText}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  const FilterChip = ({ filter, isActive, onPress, onLayout }) => (
    <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => onPress(filter.id)} activeOpacity={0.8} onLayout={(e) => onLayout(e, filter.id)}>
      {isActive ? (
        <LinearGradient colors={['#10B981', '#059669']} style={styles.filterChipGradient}>
          <Ionicons name={filter.icon} size={14} color="white" />
          <Text style={styles.filterChipTextActive}>{filter.label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.filterChipInactive}>
          <Ionicons name={filter.icon} size={14} color="#9CA3AF" />
          <Text style={styles.filterChipText}>{filter.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={[styles.headerGradient, { paddingTop: insets.top + 15 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Sightings</Text>
          <Text style={styles.headerSubtitle}>{filteredObservations.length} total • {pendingCount} pending sync</Text>
        </View>
      </LinearGradient>

      <View style={styles.filterBar}>
        <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {filters.map(filter => <FilterChip key={filter.id} filter={filter} isActive={selectedFilter === filter.id} onPress={handleFilterPress} onLayout={onChipLayout} />)}
        </ScrollView>
      </View>

      <FlatList
        data={filteredObservations}
        renderItem={({ item }) => <ObservationCard item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncNow} colors={['#10B981']} tintColor="#10B981" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No Sightings Yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button on the map to add your first sighting</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20},
  headerContent: { marginBottom: 0 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  filterBar: { backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  filterContainer: { flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  filterChip: { borderRadius: 24, overflow: 'hidden' },
  filterChipActive: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  filterChipGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  filterChipInactive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  filterChipText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  filterChipTextActive: { fontSize: 13, color: 'white', fontWeight: '600' },
  listContainer: { padding: 16, paddingBottom: 30 },
  card: { backgroundColor: '#FFF', marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  userSection: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontSize: 16, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  userName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  myBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  myBadgeText: { fontSize: 9, color: 'white', fontWeight: '600' },
  userTime: { fontSize: 10, color: '#9CA3AF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  gorillaSection: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 12, gap: 12 },
  gorillaIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  gorillaIconText: { fontSize: 24 },
  gorillaInfo: { flex: 1 },
  gorillaName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#6B7280', flex: 1, lineHeight: 16 },
  healthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  healthIcon: { marginTop: 2 },
  healthText: { fontSize: 12, color: '#F59E0B', fontWeight: '500', flex: 1, flexWrap: 'wrap', lineHeight: 18 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  notesIcon: { marginTop: 2 },
  notesText: { fontSize: 12, color: '#6B7280', flex: 1, flexWrap: 'wrap', lineHeight: 18 },
  imageRow: { paddingHorizontal: 14, paddingBottom: 10 },
  cardImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingBottom: 14 },
  timestampText: { fontSize: 10, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});