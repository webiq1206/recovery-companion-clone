import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { ScreenFlatList } from '@/components/ScreenFlatList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, ShieldAlert, Sparkles, Heart, Brain, Eye, RefreshCw, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useSubscription } from '@/providers/SubscriptionProvider';
import {
  CompanionMessage,
  CompanionMessageType,
  getRecoveryStage,
  getRiskLevel,
  generateGreeting,
  generateContextualResponse,
  detectCrisisKeywords,
  detectEmotionalPattern,
  getStageLabel,
  getEmotionalInsight,
  COMPANION_QUICK_PROMPTS,
} from '@/constants/companion';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';

const TYPE_ICONS: Record<CompanionMessageType, typeof Heart> = {
  reflection: Eye,
  pattern: RefreshCw,
  identity: Sparkles,
  reframe: Brain,
  encouragement: Heart,
  crisis: ShieldAlert,
  greeting: MessageCircle,
  shame_response: Heart,
  hopelessness_response: Sparkles,
  rumination_response: RefreshCw,
  self_criticism_response: Heart,
  avoidance_response: Eye,
};

const TYPE_COLORS: Record<CompanionMessageType, string> = {
  reflection: '#4FC3F7',
  pattern: '#FFB74D',
  identity: '#CE93D8',
  reframe: '#81C784',
  encouragement: '#F48FB1',
  crisis: '#EF5350',
  greeting: Colors.primary,
  shame_response: '#E57373',
  hopelessness_response: '#7986CB',
  rumination_response: '#FFD54F',
  self_criticism_response: '#FF8A65',
  avoidance_response: '#4DB6AC',
};

const TYPE_LABELS: Record<CompanionMessageType, string> = {
  reflection: 'reflection',
  pattern: 'pattern',
  identity: 'identity',
  reframe: 'reframe',
  encouragement: 'encouragement',
  crisis: 'crisis',
  greeting: '',
  shame_response: 'compassion',
  hopelessness_response: 'hope',
  rumination_response: 'grounding',
  self_criticism_response: 'kindness',
  avoidance_response: 'gentle nudge',
};

const TypingIndicator = React.memo(() => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.companionBubble}>
        <View style={styles.typingDots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.typingDot,
                { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

const MessageBubble = React.memo(({ message }: { message: CompanionMessage }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(message.isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  if (message.isUser) {
    return (
      <Animated.View style={[styles.userRow, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </Animated.View>
    );
  }

  const IconComp = TYPE_ICONS[message.type] || MessageCircle;
  const iconColor = TYPE_COLORS[message.type] || Colors.primary;
  const isCrisis = message.type === 'crisis';

  return (
    <Animated.View style={[styles.companionRow, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <View style={[styles.companionAvatar, isCrisis && styles.crisisAvatar]}>
        <IconComp size={14} color={isCrisis ? '#EF5350' : iconColor} />
      </View>
      <View style={[styles.companionBubble, isCrisis && styles.crisisBubble]}>
        <Text style={[styles.companionText, isCrisis && styles.crisisText]}>
          {message.content}
        </Text>
        {!isCrisis && (
          <View style={[styles.typeTag, { backgroundColor: iconColor + '18' }]}>
            <Text style={[styles.typeTagText, { color: iconColor }]}>
              {TYPE_LABELS[message.type] || message.type}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

export default function CompanionChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string }>();
  const { profile, daysSober } = useUser();
  const { checkIns } = useCheckin();
  const { hasFeature } = useSubscription();
  const riskPrediction = useRiskPrediction();
  const isCrisisContext = params.context === 'crisis';
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const stage = useMemo(() => getRecoveryStage(daysSober), [daysSober]);
  const risk = useMemo(() => getRiskLevel(checkIns, daysSober), [checkIns, daysSober]);

  const companionTone = riskPrediction?.currentIntensity?.companionTone ?? 'encouraging';

  const [messages, setMessages] = useState<CompanionMessage[]>(() => {
    const greeting = generateGreeting(stage);
    if (params.context === 'crisis') {
      return [
        greeting,
        {
          id: (Date.now() + 1).toString(),
          content: "I can sense this is a difficult moment. I'm here with you. What's happening right now?",
          type: 'reframe' as CompanionMessageType,
          timestamp: new Date().toISOString(),
          isUser: false,
        },
      ];
    }

    const initialMessages: CompanionMessage[] = [greeting];
    if (checkIns.length >= 2) {
      const { insight, supportType } = getEmotionalInsight(checkIns, stage, risk);
      initialMessages.push({
        id: (Date.now() + 1).toString(),
        content: insight,
        type: supportType,
        timestamp: new Date().toISOString(),
        isUser: false,
      });
    }
    return initialMessages;
  });

  const handleSend = useCallback((text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');

    const userMessage: CompanionMessage = {
      id: Date.now().toString(),
      content: messageText,
      type: 'greeting',
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const isCrisis = detectCrisisKeywords(messageText);
    const emotionalPattern = detectEmotionalPattern(messageText);
    console.log('[CompanionChat] Emotional pattern:', emotionalPattern, 'Tone:', companionTone);
    const delay = isCrisis ? 800 : emotionalPattern !== 'none' ? 1000 : 1200 + Math.random() * 1000;

    setTimeout(() => {
      const response = generateContextualResponse(messageText, stage, risk, daysSober, checkIns);
      setMessages(prev => [...prev, response]);
      setIsTyping(false);

      if (isCrisis) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, delay);
  }, [inputText, stage, risk, daysSober, checkIns]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    Haptics.selectionAsync();
    handleSend(prompt);
  }, [handleSend]);

  const handleCrisisPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/crisis-mode' as any);
  }, [router]);

  const renderMessage = useCallback(({ item }: { item: CompanionMessage }) => (
    <MessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: CompanionMessage) => item.id, []);

  const showQuickPrompts = messages.length <= 2;

  if (!hasFeature('ai_companion') && !isCrisisContext) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
        </View>
        <View style={styles.premiumGate}>
          <View style={styles.premiumGateIcon}>
            <Sparkles size={32} color="#D4A574" />
          </View>
          <Text style={styles.premiumGateTitle}>AI Recovery Companion</Text>
          <Text style={styles.premiumGateDesc}>
            Get personalized support that adapts to your recovery stage, emotional state, and patterns.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.premiumGateBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/premium-upgrade' as never);
            }}
          >
            <Text style={styles.premiumGateBtnText}>Unlock Companion</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
          hitSlop={12}
          testID="companion-back"
        >
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarRow}>
            <View style={styles.headerAvatar}>
              <Sparkles size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Recovery Companion</Text>
              <Text style={styles.headerSubtitle}>
                {getStageLabel(stage)} · Day {daysSober}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.crisisHeaderBtn, pressed && { opacity: 0.7 }]}
          onPress={handleCrisisPress}
          testID="companion-crisis"
        >
          <ShieldAlert size={18} color="#EF5350" />
        </Pressable>
      </View>

      {risk === 'high' || risk === 'crisis' ? (
        <Pressable
          style={({ pressed }) => [styles.crisisBanner, pressed && { opacity: 0.9 }]}
          onPress={handleCrisisPress}
          testID="companion-crisis-banner"
        >
          <ShieldAlert size={16} color="#FFFFFF" />
          <Text style={styles.crisisBannerText}>
            If you're in crisis, tap here for immediate support
          </Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScreenFlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        {showQuickPrompts && (
          <View style={styles.quickPromptsContainer}>
            <FlatList
              horizontal
              data={COMPANION_QUICK_PROMPTS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsScroll}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.quickPromptChip, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
                  onPress={() => handleQuickPrompt(item)}
                  testID={`quick-prompt-${item}`}
                >
                  <Text style={styles.quickPromptText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Share what's on your mind..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
              returnKeyType="default"
              testID="companion-input"
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
                pressed && inputText.trim() ? { opacity: 0.8, transform: [{ scale: 0.95 }] } : {},
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim()}
              testID="companion-send"
            >
              <Send size={18} color={inputText.trim() ? '#FFFFFF' : Colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  crisisHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,83,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF5350',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  crisisBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    maxWidth: '88%',
  },
  companionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  crisisAvatar: {
    backgroundColor: 'rgba(239,83,80,0.15)',
  },
  companionBubble: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  crisisBubble: {
    borderColor: 'rgba(239,83,80,0.3)',
    backgroundColor: 'rgba(239,83,80,0.08)',
  },
  companionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  crisisText: {
    color: '#FFCDD2',
  },
  typeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    maxWidth: '40%',
    marginLeft: 36,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  quickPromptsContainer: {
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  quickPromptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  quickPromptText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.cardBackground,
  },
  premiumGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  premiumGateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212,165,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  premiumGateTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  premiumGateDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumGateBtn: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  premiumGateBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.background,
  },
});
