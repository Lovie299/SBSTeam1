// app/tracking/index.jsx - Redesigned with Consistent Header
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useObservations } from '../contexts/ObservationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [gorillaSightings, setGorillaSightings] = useState([]);
  const [mapType, setMapType] = useState('standard');
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [newSighting, setNewSighting] = useState({
    gorillaGroup: '',
    healthStatus: '',
    notes: '',
    latitude: null,
    longitude: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const { addObservation, isOnline, observations, markAsAttended } = useObservations();
  const { user } = useAuth();
  const mapRef = useRef(null);

  // Reverse geocoding - get location name from coordinates
  const getLocationName = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (result && result.length > 0) {
        const { name, district, city, region } = result[0];
        const parts = [name, district, city, region].filter(p => p && p !== '');
        if (parts.length > 0) {
          return parts.join(', ');
        }
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  // Load existing sightings from observations context
  useEffect(() => {
    if (observations && observations.length > 0) {
      const sightings = observations
        .filter(obs => obs.location && (obs.location.includes(',') || obs.locationName))
        .map(obs => {
          let latitude, longitude;
          if (obs.location && obs.location.includes(',')) {
            const coords = obs.location.split(',').map(coord => parseFloat(coord.trim()));
            latitude = coords[0];
            longitude = coords[1];
          }
          return {
            id: obs.id,
            latitude: latitude || 0,
            longitude: longitude || 0,
            title: obs.gorillaGroup || 'Unknown Group',
            locationName: obs.locationName || obs.location,
            description: `${obs.notes || 'No notes'}\nAdded by: ${obs.userName || 'Anonymous'}\nHealth: ${obs.healthStatus || 'N/A'}`,
            time: obs.createdAt,
            userName: obs.userName,
            healthStatus: obs.healthStatus,
            status: obs.status,
          };
        })
        .filter(s => !isNaN(s.latitude) && !isNaN(s.longitude));
      setGorillaSightings(sightings);
    }
  }, [observations]);

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoadingLocation(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation.coords);
        
        const name = await getLocationName(currentLocation.coords.latitude, currentLocation.coords.longitude);
        setLocationName(name);
        setLoadingLocation(false);
      } catch (error) {
        console.error('Location error:', error);
        setErrorMsg('Could not get your location');
        setLoadingLocation(false);
      }
    })();
  }, []);

  const addSightingAtCurrentLocation = async () => {
    if (!location) {
      Alert.alert('Location Unavailable', 'Waiting for GPS signal. Please try again.');
      return;
    }
    
    const name = await getLocationName(location.latitude, location.longitude);
    
    setNewSighting({
      gorillaGroup: '',
      healthStatus: '',
      notes: '',
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: name,
    });
    setModalVisible(true);
  };

  const handleAddSighting = async () => {
    if (!newSighting.gorillaGroup.trim()) {
      Alert.alert('Error', 'Please enter the gorilla group name');
      return;
    }

    setSubmitting(true);
    try {
      const locationString = `${newSighting.latitude}, ${newSighting.longitude}`;
      await addObservation({
        gorillaGroup: newSighting.gorillaGroup.trim(),
        location: locationString,
        locationName: newSighting.locationName,
        healthStatus: newSighting.healthStatus.trim() || 'Not specified',
        notes: newSighting.notes.trim(),
      });

      setModalVisible(false);
      setNewSighting({
        gorillaGroup: '',
        healthStatus: '',
        notes: '',
        latitude: null,
        longitude: null,
        locationName: '',
      });

      Alert.alert(
        'Success!',
        isOnline 
          ? 'Sighting saved and shared with all rangers!' 
          : 'Sighting saved locally. Will sync when online.'
      );
    } catch (error) {
      console.error('Error adding sighting:', error);
      Alert.alert('Error', 'Failed to save sighting');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMapType = () => {
    setMapType(current => {
      if (current === 'standard') return 'satellite';
      if (current === 'satellite') return 'hybrid';
      return 'standard';
    });
  };

  const centerOnUser = async () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="location-outline" size={50} color="#EF4444" />
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {}}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingLocation || !location) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Getting your location...</Text>
        <Text style={styles.loadingSubtext}>Make sure GPS is enabled</Text>
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
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="map" size={24} color="#10B981" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Gorilla Tracking</Text>
              <Text style={styles.headerSubtitle}>
                {gorillaSightings.length} active sightings • Live
              </Text>
            </View>
          </View>
          <View style={styles.onlineBadge}>
            <View style={[styles.onlineDot, isOnline && styles.onlineActive]} />
            <Text style={styles.onlineText}>{isOnline ? 'Live' : 'Offline'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
      >
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={500}
          strokeColor="rgba(16, 185, 129, 0.5)"
          fillColor="rgba(16, 185, 129, 0.1)"
        />

        {gorillaSightings.map(sighting => (
          <Marker
            key={sighting.id}
            coordinate={{
              latitude: sighting.latitude,
              longitude: sighting.longitude,
            }}
            title={sighting.title}
            pinColor={sighting.status === 'attended' ? '#9CA3AF' : '#10B981'}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>🦍 {sighting.title}</Text>
                <Text style={styles.calloutText}>📍 {sighting.locationName || 'Location unknown'}</Text>
                <Text style={styles.calloutText}>🏥 {sighting.healthStatus || 'Not specified'}</Text>
                <Text style={styles.calloutText}>👤 Added by: {sighting.userName || 'Anonymous'}</Text>
                {sighting.status === 'attended' && (
                  <View style={styles.attendedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.attendedText}>Attended</Text>
                  </View>
                )}
                <Text style={styles.calloutTime}>
                  🕒 {sighting.time ? new Date(sighting.time).toLocaleString() : 'Recently'}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Map Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Ionicons name="layers-outline" size={18} color="white" />
          <Text style={styles.controlButtonText}>
            {mapType === 'standard' ? 'Satellite' : mapType === 'satellite' ? 'Hybrid' : 'Standard'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={18} color="white" />
          <Text style={styles.controlButtonText}>My Location</Text>
        </TouchableOpacity>
      </View>

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={addSightingAtCurrentLocation}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="white" />
          <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>Add</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Info Panel */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.7)']}
        style={styles.infoPanel}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.infoTitle}>🦍 Gorilla Activity Zones</Text>
        <Text style={styles.infoText}>
          Green markers show active sightings. Gray markers are attended.
          Blue circle shows your monitoring radius (500m).
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>📍 Active: {gorillaSightings.filter(s => s.status !== 'attended').length}</Text>
          <Text style={styles.statsText}>✓ Attended: {gorillaSightings.filter(s => s.status === 'attended').length}</Text>
        </View>
      </LinearGradient>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Gorilla Sighting</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.locationPreview}>
                <Ionicons name="location" size={20} color="#10B981" />
                <Text style={styles.locationText}>
                  {newSighting.locationName || 'Getting location...'}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Gorilla Group *</Text>
              <TextInput
                style={styles.input}
                value={newSighting.gorillaGroup}
                onChangeText={text => setNewSighting({ ...newSighting, gorillaGroup: text })}
                placeholder="e.g., Susa Group, Pablo's Group"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Health Status</Text>
              <TextInput
                style={styles.input}
                value={newSighting.healthStatus}
                onChangeText={text => setNewSighting({ ...newSighting, healthStatus: text })}
                placeholder="e.g., Healthy, Respiratory signs, Injury"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newSighting.notes}
                onChangeText={text => setNewSighting({ ...newSighting, notes: text })}
                placeholder="Additional observations, behavior, group size, etc."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleAddSighting}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Sighting</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.syncNote}>
                {!isOnline
                  ? '📶 You are offline. This sighting will sync when you reconnect.'
                  : '✅ Online. Sighting will be shared with all rangers.'}
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  onlineActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  
  // Map
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  
  // Map Controls
  topControls: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    backdropFilter: 'blur(10px)',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Info Panel
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statsText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  
  // Callout
  callout: {
    width: 240,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  attendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  calloutTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  
  // Error/Loading States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 13,
    color: '#059669',
    flex: 1,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#10B981',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  syncNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});