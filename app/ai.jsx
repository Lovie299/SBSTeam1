// app/ai.jsx - Keyboard dismisses on scroll
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import geminiService from './utils/geminiService';

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const init = geminiService.initialize();
    setInitialized(init);
    
    setMessages([
      {
        id: 'welcome',
        text: "Hello! I'm your AI Conservation Assistant. I can help with gorilla health assessment, behavior tracking, conservation strategies, and field protocols. What would you like to know?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Question', 'Please enter a question');
      return;
    }

    // Dismiss keyboard when sending
    Keyboard.dismiss();

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const aiResponse = await geminiService.generateConservationInsight(userMessage.text);
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Dismiss keyboard when user starts scrolling
  const handleScrollBeginDrag = () => {
    Keyboard.dismiss();
  };

  const suggestedQuestions = [
    { icon: '🩺', text: 'How to identify a sick gorilla?' },
    { icon: '🦍', text: 'What are common gorilla behaviors?' },
    { icon: '🌍', text: 'How can I protect gorillas?' },
    { icon: '👑', text: 'Tell me about silverback leadership' },
    { icon: '📍', text: 'How to track gorillas?' },
  ];

  const insertSuggestedQuestion = (question) => {
    setInputText(question);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.botRow]}>
      {!item.isUser && (
        <View style={styles.botAvatar}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>AI</Text>
          </LinearGradient>
        </View>
      )}
      <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, item.isUser ? styles.userText : styles.botText]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, item.isUser ? styles.userTime : styles.botTime]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
      {item.isUser && (
        <View style={styles.userAvatar}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.avatarGradient}
          >
            <Ionicons name="person" size={18} color="white" />
          </LinearGradient>
        </View>
      )}
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageRow, styles.botRow]}>
      <View style={styles.botAvatar}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>AI</Text>
        </LinearGradient>
      </View>
      <View style={[styles.messageBubble, styles.botBubble]}>
        <View style={styles.typingIndicator}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, styles.typingDotDelay]} />
          <View style={[styles.typingDot, styles.typingDotDelay2]} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
            <Text style={styles.headerSubtitle}>Powered by Expert Knowledge</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={true}
          onScrollBeginDrag={handleScrollBeginDrag}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={loading ? renderTypingIndicator : null}
        />

        {messages.length === 1 && (
          <View style={styles.suggestedContainer}>
            <Text style={styles.suggestedTitle}>Suggested questions:</Text>
            <View style={styles.suggestedGrid}>
              {suggestedQuestions.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedChip}
                  onPress={() => insertSuggestedQuestion(q.text)}
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
                  Using expert conservation knowledge base.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about gorilla conservation..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={inputText.trim() && !loading ? ['#10B981', '#059669'] : ['#D1D5DB', '#D1D5DB']}
                  style={styles.sendGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={18} color="white" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.15)',
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
  chatArea: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userAvatar: {
    marginLeft: 8,
  },
  botAvatar: {
    marginRight: 8,
  },
  avatarGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  botBubble: {
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
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#1F2937',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  botTime: {
    color: '#9CA3AF',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  typingDotDelay: {
    opacity: 0.4,
  },
  typingDotDelay2: {
    opacity: 0.2,
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  suggestedIcon: {
    fontSize: 16,
  },
  suggestedText: {
    fontSize: 13,
    color: '#374151',
    maxWidth: 150,
  },
  apiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  apiWarningText: {
    fontSize: 12,
    color: '#F59E0B',
    flex: 1,
  },
});