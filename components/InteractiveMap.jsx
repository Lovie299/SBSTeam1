// app/components/InteractiveMap.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import * as Location from 'expo-location';

export default function InteractiveMap() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [gorillaSightings, setGorillaSightings] = useState([]);
  const [mapType, setMapType] = useState('standard');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      
      // Mock gorilla sightings data
      setGorillaSightings([
        {
          id: 1,
          latitude: currentLocation.coords.latitude + 0.01,
          longitude: currentLocation.coords.longitude + 0.008,
          title: 'Susa Group',
          description: '12 gorillas spotted, including 2 infants',
          time: new Date().toISOString(),
        },
        {
          id: 2,
          latitude: currentLocation.coords.latitude - 0.008,
          longitude: currentLocation.coords.longitude - 0.005,
          title: 'Pablo\'s Group',
          description: '8 gorillas, one silverback observed',
          time: new Date().toISOString(),
        },
        {
          id: 3,
          latitude: currentLocation.coords.latitude + 0.005,
          longitude: currentLocation.coords.longitude - 0.01,
          title: 'Kwitonda Group',
          description: '15 gorillas, healthy and feeding',
          time: new Date().toISOString(),
        },
      ]);
    })();
  }, []);

  const addCurrentSighting = () => {
    if (!location) return;
    
    const newSighting = {
      id: gorillaSightings.length + 1,
      latitude: location.latitude,
      longitude: location.longitude,
      title: 'New Sighting',
      description: 'Report gorilla sighting at this location',
      time: new Date().toISOString(),
    };
    
    setGorillaSightings([...gorillaSightings, newSighting]);
    Alert.alert('Success', 'Sighting marker added to map!');
  };

  const toggleMapType = () => {
    setMapType(current => {
      if (current === 'standard') return 'satellite';
      if (current === 'satellite') return 'hybrid';
      return 'standard';
    });
  };

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2c5f2d" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {gorillaSightings.map(sighting => (
          <Marker
            key={sighting.id}
            coordinate={{
              latitude: sighting.latitude,
              longitude: sighting.longitude,
            }}
            title={sighting.title}
            description={sighting.description}
            pinColor="#2c5f2d"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{sighting.title}</Text>
                <Text style={styles.calloutText}>{sighting.description}</Text>
                <Text style={styles.calloutTime}>
                  {new Date(sighting.time).toLocaleString()}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
        
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={500}
          strokeColor="rgba(44, 95, 45, 0.5)"
          fillColor="rgba(44, 95, 45, 0.1)"
        />
      </MapView>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={addCurrentSighting}>
          <Text style={styles.controlButtonText}>📍 Add Sighting</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Text style={styles.controlButtonText}>🗺️ {mapType === 'standard' ? 'Satellite' : 'Standard'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>🦍 Gorilla Activity Zones</Text>
        <Text style={styles.infoText}>
          Green markers show recent gorilla sightings.
          Blue circle shows your current monitoring radius (500m).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 150,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  retryButton: {
    backgroundColor: '#2c5f2d',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: '#2c5f2d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
  },
  controlButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoPanel: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5f2d',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  callout: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5f2d',
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  calloutTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});