// app/components/GroupChatContent.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Keyboard,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';

export default function GroupChatContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  let unsubscribeMessages = null;

  // Check if biometric is enabled in settings
  useEffect(() => {
    checkBiometricSetting();
  }, []);

  const checkBiometricSetting = async () => {
    try {
      // Read the biometric setting from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const enabled = await AsyncStorage.getItem('@biometric_enabled');
      const isEnabled = enabled === 'true';
      setBiometricEnabled(isEnabled);
      console.log('Biometric enabled setting:', isEnabled);
      
      // Check what biometric types are available
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('Supported biometric types:', types);
      
      // Determine biometric type for display
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      }
      
      if (isEnabled) {
        // If biometric is enabled, show authentication
        await authenticateAndLoad();
      } else {
        // If not enabled, just load messages
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
        loadMessages();
      }
    } catch (error) {
      console.error('Error checking biometric setting:', error);
      setIsAuthenticated(true);
      setIsCheckingAuth(false);
      loadMessages();
    }
  };

  const authenticateAndLoad = async () => {
    setIsCheckingAuth(true);
    
    try {
      // First check if device has biometric hardware
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      console.log('Has biometric hardware:', hasHardware);
      console.log('Is enrolled:', isEnrolled);
      
      if (!hasHardware || !isEnrolled) {
        // No biometrics available on device
        Alert.alert(
          'Biometric Not Available',
          'Your device does not have biometric authentication set up. Please enable it in device settings or disable biometric in app settings.',
          [{ text: 'OK', onPress: () => {
            setIsAuthenticated(true);
            setIsCheckingAuth(false);
            loadMessages();
          }}]
        );
        return;
      }
      
      // Get the biometric type for the prompt message
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometricName = 'Biometric';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricName = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricName = 'Touch ID';
      }
      
      // Show biometric prompt
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate to access Team Chat`,
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });
      
      console.log('Authentication result:', result.success);
      console.log('Authentication error:', result.error);
      
      if (result.success) {
        setIsAuthenticated(true);
        loadMessages();
      } else {
        setIsAuthenticated(false);
        Alert.alert(
          'Authentication Failed',
          `You need to authenticate to access the team chat.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: () => authenticateAndLoad() }
          ]
        );
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const loadMessages = () => {
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
    
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    Keyboard.dismiss();
    try {
      await addDoc(collection(db, 'messages'), {
        text: inputText,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: new Date(),
        timestamp: serverTimestamp(),
      });
      setInputText('');
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.userId === user?.uid;
    const messageDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessage : styles.otherMessage]}>
        {!isMe && (
          <View style={styles.senderContainer}>
            <View style={styles.senderAvatar}>
              <Text style={styles.senderAvatarText}>
                {item.userName?.charAt(0) || 'U'}
              </Text>
            </View>
            <Text style={styles.senderName}>{item.userName}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
            {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Checking security...</Text>
      </View>
    );
  }

  // If authentication failed, show access denied screen
  if (!isAuthenticated && biometricEnabled) {
    return (
      <View style={styles.accessDeniedContainer}>
        <View style={styles.accessDeniedIcon}>
          {biometricType === 'Face ID' ? (
            <Ionicons name="scan-outline" size={60} color="#EF4444" />
          ) : (
            <Ionicons name="finger-print" size={60} color="#EF4444" />
          )}
        </View>
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          {biometricType || 'Biometric'} authentication is required to access the team chat.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={authenticateAndLoad}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.retryButtonGradient}
          >
            {biometricType === 'Face ID' ? (
              <Ionicons name="scan-outline" size={20} color="white" />
            ) : (
              <Ionicons name="finger-print" size={20} color="white" />
            )}
            <Text style={styles.retryButtonText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              inverted
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={Keyboard.dismiss}
            />
            
            {/* Input Container */}
            <View style={styles.inputWrapper}>
              <LinearGradient
                colors={['#FFFFFF', '#FAFAFA']}
                style={styles.inputContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.inputRow}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
                    onPress={sendMessage}
                    disabled={!inputText.trim()}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={inputText.trim() ? ['#10B981', '#059669'] : ['#D1D5DB', '#D1D5DB']}
                      style={styles.sendButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="send" size={18} color="white" />
                      <Text style={styles.sendButtonText}>Send</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 16,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    marginLeft: 8,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimestamp: {
    color: '#9CA3AF',
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#1F2937',
  },
  sendButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Access Denied Styles
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  accessDeniedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});