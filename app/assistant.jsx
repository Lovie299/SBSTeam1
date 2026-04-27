// app/assistant.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AIContent from './components/AIContent';
import GroupChatContent from './components/GroupChatContent';

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('ai');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={[styles.header, { paddingTop: insets.top + 15 }]}
      >
        <Text style={styles.headerTitle}>Assistant</Text>
        <Text style={styles.headerSubtitle}>AI Insights & Team Chat</Text>
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ai' && styles.activeTab]} onPress={() => setActiveTab('ai')}>
          <Ionicons name="bulb-outline" size={20} color={activeTab === 'ai' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>AI Assistant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'chat' && styles.activeTab]} onPress={() => setActiveTab('chat')}>
          <Ionicons name="chatbubbles-outline" size={20} color={activeTab === 'chat' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Team Chat</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {activeTab === 'ai' ? <AIContent /> : <GroupChatContent />}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  activeTab: { backgroundColor: '#E8F5E9' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  activeTabText: { color: '#10B981', fontWeight: '600' },
  contentContainer: { flex: 1 },
});