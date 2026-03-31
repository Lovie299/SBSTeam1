// app/components/NotificationManager.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NotificationManager() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [message, setMessage] = useState('');
  const [notificationsList, setNotificationsList] = useState([]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token || ''));
    
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      setNotificationsList(prev => [{
        id: Date.now(),
        title: notification.request.content.title,
        body: notification.request.content.body,
        timestamp: new Date().toISOString(),
      }, ...prev]);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      Alert.alert('Notification Tapped', JSON.stringify(response.notification.request.content));
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Failed to get push token for push notification!');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id',
      })).data;
      return token;
    } else {
      Alert.alert('Must use physical device for Push Notifications');
    }
  };

  const sendLocalNotification = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a notification message');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "SilverBack Sentry Alert 📢",
        body: message,
        data: { data: message },
        sound: true,
      },
      trigger: null, // Send immediately
    });
    
    setMessage('');
    Alert.alert('Success', 'Notification sent!');
  };

  const scheduleReminder = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🦍 Gorilla Observation Reminder",
        body: "Time to log today's gorilla sightings!",
        data: { type: 'reminder' },
      },
      trigger: {
        seconds: 10, // For demo, schedule 10 seconds later
      },
    });
    Alert.alert('Reminder', 'Notification scheduled for 10 seconds');
  };

  const sendSMSStyleNotification = () => {
    // Simulate SMS-like notification
    Alert.alert(
      'SMS Style Notification',
      'New Gorilla Sighting Alert!\nGroup: Susa\nLocation: Volcanoes National Park\nTime: Just now',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📨 Push Notifications (FCM)</Text>
        {expoPushToken ? (
          <Text style={styles.tokenText}>Token: {expoPushToken.substring(0, 50)}...</Text>
        ) : (
          <Text style={styles.tokenText}>Requesting permission...</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send Notification</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter notification message"
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendLocalNotification}>
          <Text style={styles.buttonText}>Send Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={scheduleReminder}>
          <Text style={styles.actionButtonText}>⏰ Schedule Reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={sendSMSStyleNotification}>
          <Text style={styles.actionButtonText}>📱 SMS Style Alert</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Notifications</Text>
        {notificationsList.length === 0 ? (
          <Text style={styles.emptyText}>No notifications received</Text>
        ) : (
          notificationsList.map(notif => (
            <View key={notif.id} style={styles.notificationItem}>
              <Text style={styles.notificationTitle}>{notif.title}</Text>
              <Text style={styles.notificationBody}>{notif.body}</Text>
              <Text style={styles.notificationTime}>
                {new Date(notif.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📱 Messaging History</Text>
        <Text style={styles.infoText}>
          Based on SMS standards (1984) and modern FCM (Firebase Cloud Messaging),
          this system provides offline queuing and rich media notifications.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5f2d',
    marginBottom: 12,
  },
  tokenText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#2c5f2d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: '#97bc62',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  notificationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationBody: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5f2d',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
});