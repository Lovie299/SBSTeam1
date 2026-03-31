// app/tracking/index.jsx - Complete working version with multiple photos
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
  Image,
  FlatList,
} from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useObservations } from '../contexts/ObservationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { checkFreeSpace } from '../utils/storageHelper';

const { width } = Dimensions.get('window');

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locationProvider, setLocationProvider] = useState('');
  const [gorillaSightings, setGorillaSightings] = useState([]);
  const [mapType, setMapType] = useState('standard');
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [imageUris, setImageUris] = useState([]);
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

  // Reverse geocoding – get location name from coordinates
  const getLocationName = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result && result.length > 0) {
        const { name, district, city, region } = result[0];
        const parts = [name, district, city, region].filter(p => p && p !== '');
        if (parts.length > 0) return parts.join(', ');
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
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

  // Get user's current location with fused approach (balanced power/accuracy)
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoadingLocation(false);
          return;
        }

        // Balanced accuracy (PRIORITY_BALANCED_POWER_ACCURACY)
        const options = {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        };
        let currentLocation = await Location.getCurrentPositionAsync(options);
        let bestLocation = currentLocation.coords;
        let bestAccuracy = currentLocation.coords.accuracy;
        let provider = 'GPS';

        // Fallback to last known location (if available and more accurate)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && lastKnown.coords) {
          const lastAccuracy = lastKnown.coords.accuracy;
          if (lastAccuracy && (!bestAccuracy || lastAccuracy < bestAccuracy)) {
            bestLocation = lastKnown.coords;
            bestAccuracy = lastAccuracy;
            provider = 'Last Known';
          }
        }

        setLocation(bestLocation);
        setAccuracy(bestAccuracy);
        setLocationProvider(provider);

        const name = await getLocationName(bestLocation.latitude, bestLocation.longitude);
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
    setImageUris([]);
    setModalVisible(true);
  };

  // Helper function to save image with proper error handling
  const saveImage = async (uri) => {
    try {
      const filename = `gorilla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const newUri = FileSystem.documentDirectory + filename;
      
      // Method 1: Try using copyAsync (most reliable)
      try {
        await FileSystem.copyAsync({ from: uri, to: newUri });
        return newUri;
      } catch (copyError) {
        console.log('Copy failed, trying alternative method...');
        
        // Method 2: Try using the file URI directly
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            await FileSystem.copyAsync({ from: uri, to: newUri });
            return newUri;
          }
        } catch (e) {
          console.log('Alternative copy failed');
        }
        
        // Method 3: Return original URI as fallback
        return uri;
      }
    } catch (error) {
      console.error('Error in saveImage:', error);
      return uri; // Return original URI as fallback
    }
  };

  const takePhoto = async () => {
    try {
      // Check storage space
      let hasSpace = true;
      try {
        hasSpace = await checkFreeSpace();
      } catch (storageError) {
        console.log('Storage check note:', storageError?.message);
        hasSpace = true;
      }
      
      if (!hasSpace) return;
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        
        // Show loading indicator
        Alert.alert('Saving', 'Processing photo...', [{ text: 'OK' }], { cancelable: false });
        
        const savedUri = await saveImage(uri);
        setImageUris(prev => [...prev, savedUri]);
        
        Alert.alert('Success', `Photo added! Total: ${imageUris.length + 1}`);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Unable to access camera. Please check permissions.');
    }
  };

  const removeImage = (uriToRemove) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setImageUris(prev => prev.filter(uri => uri !== uriToRemove));
          }
        }
      ]
    );
  };

  const handleAddSighting = async () => {
    if (!newSighting.gorillaGroup.trim()) {
      Alert.alert('Error', 'Please enter the gorilla group name');
      return;
    }

    setSubmitting(true);
    try {
      const locationString = `${newSighting.latitude}, ${newSighting.longitude}`;
      
      await addObservation(
        {
          gorillaGroup: newSighting.gorillaGroup.trim(),
          location: locationString,
          locationName: newSighting.locationName,
          healthStatus: newSighting.healthStatus.trim() || 'Not specified',
          notes: newSighting.notes.trim(),
          imageUris: imageUris,
        },
        imageUris[0]
      );

      setModalVisible(false);
      setNewSighting({
        gorillaGroup: '',
        healthStatus: '',
        notes: '',
        latitude: null,
        longitude: null,
        locationName: '',
      });
      setImageUris([]);

      Alert.alert(
        'Success!',
        isOnline
          ? `Sighting saved with ${imageUris.length} photo(s)! Shared with all rangers.`
          : `Sighting saved locally with ${imageUris.length} photo(s). Will sync when online.`
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

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const renderImagePreview = ({ item }) => (
    <View style={styles.imagePreviewItem}>
      <Image source={{ uri: item }} style={styles.previewImage} />
      <TouchableOpacity 
        style={styles.removeImageButton} 
        onPress={() => removeImage(item)}
      >
        <Ionicons name="close-circle" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

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

        <View style={styles.accuracyBadge}>
          <Ionicons name="location-sharp" size={14} color="#10B981" />
          <Text style={styles.accuracyText}>
            Accuracy: {accuracy ? `${Math.round(accuracy)}m` : 'N/A'} • {locationProvider}
          </Text>
        </View>
      </LinearGradient>

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
          center={{ latitude: location.latitude, longitude: location.longitude }}
          radius={500}
          strokeColor="rgba(16, 185, 129, 0.5)"
          fillColor="rgba(16, 185, 129, 0.1)"
        />

        {gorillaSightings.map(sighting => (
          <Marker
            key={sighting.id}
            coordinate={{ latitude: sighting.latitude, longitude: sighting.longitude }}
            title={sighting.title}
            pinColor={sighting.status === 'attended' ? '#9CA3AF' : '#10B981'}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>🦍 {sighting.title}</Text>
                <Text style={styles.calloutText}>📍 {sighting.locationName || 'Unknown'}</Text>
                <Text style={styles.calloutText}>🏥 {sighting.healthStatus || 'N/A'}</Text>
                <Text style={styles.calloutText}>👤 {sighting.userName || 'Anonymous'}</Text>
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

      <TouchableOpacity 
        style={styles.fab} 
        onPress={addSightingAtCurrentLocation}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>Add Sighting</Text>
          <Ionicons name="add" size={26} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.8)']}
        style={styles.infoPanel}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.infoTitle}>🦍 Gorilla Activity Zones</Text>
        <Text style={styles.infoText}>
          Green markers: active sightings • Gray: attended
          Blue circle: 500m monitoring radius
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>Active: {gorillaSightings.filter(s => s.status !== 'attended').length}</Text>
          <Text style={styles.statsText}>Attended: {gorillaSightings.filter(s => s.status === 'attended').length}</Text>
        </View>
      </LinearGradient>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
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

              {/* Camera / Image capture section with multiple photos */}
              <View style={styles.cameraSection}>
                <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#10B981" />
                  <Text style={styles.cameraButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                {imageUris.length > 0 && (
                  <View style={styles.imageGallery}>
                    <Text style={styles.imageGalleryTitle}>
                      Photos ({imageUris.length}):
                    </Text>
                    <FlatList
                      data={imageUris}
                      renderItem={renderImagePreview}
                      keyExtractor={(item, index) => index.toString()}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.imageGalleryContent}
                    />
                  </View>
                )}
              </View>

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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
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
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,185,129,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6B7280' },
  onlineActive: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },
  onlineText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  accuracyText: { fontSize: 11, color: '#10B981', marginLeft: 6 },
  map: { width: width, height: Dimensions.get('window').height },
  topControls: {
    position: 'absolute',
    top: 180,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  controlButtonText: { color: 'white', fontSize: 12, fontWeight: '500' },
  fab: {
    position: 'absolute',
    bottom: 140,
    right: 17,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 1000,
  },
  fabGradient: {
    width: 85,
    height: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#E5E7EB',
    lineHeight: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  statsText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  callout: { width: 240, padding: 10 },
  calloutTitle: { fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  calloutText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  attendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 6, alignSelf: 'flex-start' },
  attendedText: { fontSize: 10, fontWeight: '600', color: '#10B981' },
  calloutTime: { fontSize: 10, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 20 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginTop: 12, marginBottom: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  loadingSubtext: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },
  retryButton: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalScrollContent: { paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  locationPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 12, marginBottom: 20 },
  locationText: { fontSize: 13, color: '#059669', flex: 1, fontWeight: '500' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#374151' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16, backgroundColor: '#FAFAFA', color: '#1F2937' },
  textArea: { height: 100, textAlignVertical: 'top' },
  cameraSection: {
    marginBottom: 16,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  cameraButtonText: { fontSize: 14, fontWeight: '500', color: '#10B981' },
  imageGallery: {
    marginTop: 12,
  },
  imageGalleryTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  imageGalleryContent: {
    paddingRight: 16,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  previewImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  cancelButtonText: { color: '#6B7280', fontWeight: '500', fontSize: 16 },
  submitButton: { backgroundColor: '#10B981' },
  submitButtonDisabled: { backgroundColor: '#D1D5DB' },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  syncNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', fontStyle: 'italic', marginTop: 8 },
});