// app/alerts/index.jsx - Redesigned Chat with Push Notifications
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ChatScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');
  const flatListRef = useRef();

  // Register for push notifications
  useEffect(() => {
    registerForPushNotifications();
    
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.log('No project ID found. Push notifications will not work.');
        console.log('Add "extra.eas.projectId" to your app.json');
        return;
      }

      console.log('Project ID found:', projectId);
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      console.log('Expo push token:', token.data);
      setExpoPushToken(token.data);
      
      // Save token to Firestore for this user
      if (user && token.data) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          expoPushToken: token.data,
          email: user.email,
          displayName: user.displayName,
          lastActive: new Date().toISOString(),
        }).catch(() => {
          // If document doesn't exist, create it
          const { setDoc } = require('firebase/firestore');
          setDoc(userRef, {
            expoPushToken: token.data,
            email: user.email,
            displayName: user.displayName,
            lastActive: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  // Listen for messages in real-time
  useEffect(() => {
    console.log('Setting up messages listener...');
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to messages:', error);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const sendPushNotificationToOthers = async (message) => {
    try {
      // Get all users except current user
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      const tokens = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (doc.id !== user.uid && userData.expoPushToken) {
          tokens.push(userData.expoPushToken);
        }
      });
      
      if (tokens.length === 0) {
        console.log('No other users with push tokens found');
        return;
      }
      
      console.log(`Sending notifications to ${tokens.length} users...`);
      
      // Send notifications to all tokens
      for (const token of tokens) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: token,
              title: `💬 New message from ${message.userName}`,
              body: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
              data: { 
                type: 'message', 
                userId: user.uid,
                messageId: message.id 
              },
              sound: 'default',
            }),
          });
        } catch (error) {
          console.error('Failed to send to token:', token, error);
        }
      }
      
      console.log('Push notifications sent');
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    try {
      const messageData = {
        text: inputText,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: new Date(),
        timestamp: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      setInputText('');
      
      // Send push notification to other users
      await sendPushNotificationToOthers({ ...messageData, id: docRef.id });
      
      // Scroll to top to see new message
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
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
              <Ionicons name="chatbubbles" size={24} color="#10B981" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Group Chat</Text>
              <Text style={styles.headerSubtitle}>
                {messages.length} members • Real-time
              </Text>
            </View>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Live</Text>
          </View>
        </View>
      </LinearGradient>

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
            />
            
            {/* Input Container - Fixed spacing */}
            <View style={styles.inputWrapper}>
              <LinearGradient
                colors={['#FFFFFF', '#FAFAFA']}
                style={styles.inputContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.inputRow}>
                  <TextInput
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
  
  // Header
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  
  // Chat Container
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
  
  // Message Styles
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
  
  // Input Container - Fixed spacing
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
});