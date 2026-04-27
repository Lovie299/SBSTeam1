// app/screens/ai/AIInsightsScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import geminiService from '../../utils/geminiService';

export default function AIInsightsScreen() {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize Gemini service
    const init = geminiService.initialize();
    setInitialized(init);
  }, []);

  const suggestedQuestions = [
    { icon: '🩺', text: 'How to identify a sick gorilla?' },
    { icon: '🦍', text: 'What are common gorilla behaviors?' },
    { icon: '🌍', text: 'How can I protect gorillas?' },
    { icon: '👑', text: 'Tell me about silverback leadership' },
    { icon: '📍', text: 'Best practices for tracking gorillas?' },
  ];

  const askAI = async () => {
    if (!prompt.trim()) {
      Alert.alert('Empty Question', 'Please enter a question for the AI assistant');
      return;
    }

    setLoading(true);
    try {
      const aiResponse = await geminiService.generateConservationInsight(prompt);
      
      const newEntry = {
        id: Date.now(),
        question: prompt,
        answer: aiResponse,
        timestamp: new Date().toISOString(),
      };
      
      setConversation([newEntry, ...conversation]);
      setResponse(aiResponse);
      setPrompt('');
    } catch (error) {
      console.error('AI Error:', error);
      Alert.alert('Error', 'Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const askSuggestedQuestion = (question) => {
    setPrompt(question);
    setTimeout(() => askAI(), 100);
  };

  const ConversationCard = ({ item }) => (
    <View style={styles.conversationCard}>
      <View style={styles.questionBubble}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.questionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.questionText}>{item.question}</Text>
        </LinearGradient>
      </View>
      <View style={styles.answerBubble}>
        <LinearGradient
          colors={['#f0fdf4', '#dcfce7']}
          style={styles.answerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.answerText}>{item.answer}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={[styles.header, { paddingTop: insets.top + 15 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="bulb-outline" size={24} color="#10B981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Conservation Assistant</Text>
            <Text style={styles.headerSubtitle}>Powered by Google Gemini</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Conversation List */}
      <ScrollView 
        style={styles.conversationList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conversationContent}
      >
        {conversation.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIcon}>
              <Text style={styles.welcomeIconText}>🦍</Text>
            </View>
            <Text style={styles.welcomeTitle}>AI Conservation Assistant</Text>
            <Text style={styles.welcomeText}>
              Ask me anything about gorilla conservation, health assessment, behavior tracking, or field protocols.
            </Text>
            
            <Text style={styles.suggestedTitle}>Suggested questions:</Text>
            <View style={styles.suggestedGrid}>
              {suggestedQuestions.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedChip}
                  onPress={() => askSuggestedQuestion(q.text)}
                >
                  <Text style={styles.suggestedIcon}>{q.icon}</Text>
                  <Text style={styles.suggestedText} numberOfLines={2}>
                    {q.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {!initialized && (
              <View style={styles.apiWarning}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={styles.apiWarningText}>
                  Demo mode: Using mock responses. Add Gemini API key for live AI responses.
                </Text>
              </View>
            )}
          </View>
        ) : (
          conversation.map(item => (
            <ConversationCard key={item.id} item={item} />
          ))
        )}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Ask about gorilla conservation..."
            placeholderTextColor="#9CA3AF"
            multiline
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!prompt.trim() || loading) && styles.sendButtonDisabled]}
            onPress={askAI}
            disabled={!prompt.trim() || loading}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.sendGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,185,129,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  conversationList: { flex: 1 },
  conversationContent: { padding: 16, paddingBottom: 20 },
  welcomeContainer: { alignItems: 'center', paddingTop: 40 },
  welcomeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  welcomeIconText: { fontSize: 40 },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  welcomeText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20, marginBottom: 30 },
  suggestedTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, alignSelf: 'flex-start' },
  suggestedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  suggestedIcon: { fontSize: 16 },
  suggestedText: { fontSize: 13, color: '#374151', maxWidth: 150 },
  apiWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, marginTop: 20 },
  apiWarningText: { fontSize: 12, color: '#F59E0B', flex: 1 },
  conversationCard: { marginBottom: 20 },
  questionBubble: { alignItems: 'flex-end', marginBottom: 8 },
  questionGradient: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderBottomRightRadius: 4, maxWidth: '85%' },
  questionText: { fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  answerBubble: { alignItems: 'flex-start' },
  answerGradient: { padding: 14, borderRadius: 20, borderBottomLeftRadius: 4, maxWidth: '95%', backgroundColor: '#f0fdf4' },
  answerText: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  timestamp: { fontSize: 10, color: '#9CA3AF', marginTop: 8, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100, fontSize: 14, backgroundColor: '#FAFAFA', color: '#1F2937' },
  sendButton: { borderRadius: 24, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.5 },
  sendGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});