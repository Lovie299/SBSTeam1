// app/contexts/BiometricContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BiometricContext = createContext();

const BIOMETRIC_SETTINGS_KEY = '@biometric_enabled';

export const BiometricProvider = ({ children }) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBiometricSupport();
    loadBiometricSettings();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setIsBiometricSupported(compatible && enrolled);
      
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('iris');
      }
    } catch (error) {
      console.error('Biometric support check failed:', error);
      setIsBiometricSupported(false);
    }
    setIsLoading(false);
  };

  const loadBiometricSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_SETTINGS_KEY);
      setIsBiometricEnabled(enabled === 'true');
    } catch (error) {
      console.error('Failed to load biometric settings:', error);
    }
  };

  const enableBiometric = async (enabled) => {
    try {
      if (enabled && !isBiometricSupported) {
        return { success: false, error: 'Biometric authentication not available on this device' };
      }
      
      await AsyncStorage.setItem(BIOMETRIC_SETTINGS_KEY, enabled.toString());
      setIsBiometricEnabled(enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to save biometric settings:', error);
      return { success: false, error: error.message };
    }
  };

  const authenticate = async (reason = 'Authenticate to access this feature') => {
    if (!isBiometricEnabled) {
      return { success: true, skipped: true };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: error.message };
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'fingerprint') return 'finger-print';
    if (biometricType === 'face') return 'face';
    if (biometricType === 'iris') return 'eye';
    return 'lock-closed';
  };

  const getBiometricName = () => {
    if (biometricType === 'fingerprint') return 'Fingerprint';
    if (biometricType === 'face') return 'Face ID';
    if (biometricType === 'iris') return 'Iris Scan';
    return 'Biometric';
  };

  return (
    <BiometricContext.Provider value={{
      isBiometricSupported,
      isBiometricEnabled,
      biometricType,
      isLoading,
      enableBiometric,
      authenticate,
      getBiometricIcon,
      getBiometricName,
    }}>
      {children}
    </BiometricContext.Provider>
  );
};

export const useBiometric = () => useContext(BiometricContext);