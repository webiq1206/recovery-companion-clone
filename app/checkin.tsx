import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  Heart,
  Brain,
  Moon,
  MapPin,
  Zap,
  Smile,
  Users,
  ChevronLeft,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

type QuestionKey =
  | 'mood'
  | 'energy'
  | 'stress'
  | 'cravings'
  | 'sleep'
  | 'support'
  | 'environment'
  | 'confidence';

interface Question {
  key: QuestionKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const QUESTIONS: Question[] = [
  { key: 'mood', label: 'Mood', description: 'How does your emotional world feel overall?', icon: <Heart size={18} color="#FF6B9D" /> },
  { key: 'energy', label: 'Energy', description: 'How much steady energy do you have today?', icon: <Activity size={18} color="#7C8CF8" /> },
  { key: 'stress', label: 'Stress', description: 'How tense or overwhelmed does today feel?', icon: <Zap size={18} color="#FFC107" /> },
  { key: 'cravings', label: 'Cravings & urges', description: 'How strong are any cravings or urges?', icon: <Brain size={18} color="#FF6B35" /> },
  { key: 'sleep', label: 'Rest', description: 'How rested does your body feel?', icon: <Moon size={18} color="#7C8CF8" /> },
  { key: 'support', label: 'Support', description: 'How supported and connected do you feel?', icon: <Users size={18} color="#2EC4B6" /> },
  { key: 'environment', label: 'Environment', description: 'How safe does your current environment feel?', icon: <MapPin size={18} color="#2EC4B6" /> },
  { key: 'confidence', label: 'Confidence', description: 'How confident do you feel in staying on track today?', icon: <Smile size={18} color="#CE93D8" /> },
];

const WEIGHTS: Record<QuestionKey, number> = {
  mood: 1.3,
  energy: 1.0,
  stress: 1.1,
  cravings: 1.3,
  sleep: 0.9,
  support: 1.0,
  environment: 1.0,
  confidence: 1.1,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);

type Tier = 'Critical' | 'Fragile' | 'Stabilizing' | 'Strong';

function getTier(score: number): Tier {
  if (score < 25) return 'Critical';
  if (score < 45) return 'Fragile';
  if (score < 70) return 'Stabilizing';
  return 'Strong';
}

function getTierDescription(tier: Tier): string {
  switch (tier) {
    case 'Critical':
      return 'Today needs extra care and support. Small, safe steps are more than enough.';
    case 'Fragile':
      return 'Things feel tender. Gentle routines and connection can help hold you.';
    case 'Stabilizing':
      return 'You’re finding your feet. Steady, respectful choices will keep building strength.';
    case 'Strong':
    default:
      return 'You’re standing on solid ground today. Keep honoring what’s working.';
  }
}

function normalizeAnswer(val: number): number {
  // answers are 1–10, convert to 0–100
  const clamped = Math.max(1, Math.min(10, val));
  return (clamped / 10) * 100;
}

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<QuestionKey, number>>({
    mood: 5,
    energy: 5,
    stress: 5,
    cravings: 5,
    sleep: 5,
    support: 5,
    environment: 5,
    confidence: 5,
  });

  const [submittedScores, setSubmittedScores] = useState<number[]>([]);

  const todayScore = useMemo(() => {
    let weighted = 0;
    Object.entries(answers).forEach(([key, val]) => {
      const k = key as QuestionKey;
      const normalized = normalizeAnswer(val);
      // For stress and cravings, invert the score so higher is safer.
      const safeScore =
        k === 'stress' || k === 'cravings' ? 100 - normalized : normalized;
      weighted += safeScore * WEIGHTS[k];
    });
    return Math.round(weighted / TOTAL_WEIGHT);
  }, [answers]);

  const smoothedAverage = useMemo(() => {
    if (submittedScores.length === 0) {
      return todayScore;
    }

    const previousAvg =
      submittedScores.reduce((sum, s) => sum + s, 0) / submittedScores.length;

    // Smoothing so one tough day doesn’t crash the trend.
    const mixed = previousAvg * 0.7 + todayScore * 0.3;
    return Math.round(mixed);
  }, [submittedScores, todayScore]);

  const sevenDayAverage = useMemo(() => {
    if (submittedScores.length === 0) {
      return todayScore;
    }
    const lastSeven = submittedScores.slice(-7);
    const avg =
      lastSeven.reduce((sum, s) => sum + s, 0) / lastSeven.length;
    return Math.round(avg);
  }, [submittedScores, todayScore]);

  const tier = useMemo(() => getTier(smoothedAverage), [smoothedAverage]);

  const handleChange = useCallback((key: QuestionKey, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmittedScores((prev) => {
      const next = [...prev, todayScore];
      // keep only last 14 scores for lightweight temp history
      return next.slice(-14);
    });
  }, [todayScore]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          hitSlop={12}
        >
          <ChevronLeft size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Daily Check-In</Text>
          <Text style={styles.headerSubtitle}>
            A quick moment to see how supported you are today.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TODAY'S STABILITY</Text>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryScore}>{todayScore}</Text>
              <Text style={styles.summaryScoreLabel}>Today</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryScore}>{sevenDayAverage}</Text>
              <Text style={styles.summaryScoreLabel}>7-day avg</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryTier}>{tier}</Text>
              <Text style={styles.summaryScoreLabel}>Stability tier</Text>
            </View>
          </View>
          <Text style={styles.summaryBody}>
            {getTierDescription(tier)}
          </Text>
        </View>

        {/* Questions */}
        <View style={styles.questionsCard}>
          {QUESTIONS.map((q) => (
            <View key={q.key} style={styles.questionBlock}>
              <View style={styles.questionHeader}>
                <View style={styles.iconCircle}>{q.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questionLabel}>{q.label}</Text>
                  <Text style={styles.questionDescription}>{q.description}</Text>
                </View>
                <Text style={styles.valueBubble}>{answers[q.key]}</Text>
              </View>

              <View style={styles.sliderRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const active = val <= answers[q.key];
                  return (
                    <Pressable
                      key={val}
                      onPress={() => handleChange(q.key, val)}
                      style={({ pressed }) => [
                        styles.sliderDot,
                        active && styles.sliderDotActive,
                        pressed && { opacity: 0.8 },
                      ]}
                      hitSlop={6}
                    />
                  );
                })}
              </View>

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1</Text>
                <Text style={styles.sliderLabelText}>10</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleSubmit}
        >
          <Check size={18} color={Colors.white} />
          <Text style={styles.submitText}>Save Today’s Check-In</Text>
        </Pressable>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryScore: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryScoreLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    opacity: 0.4,
  },
  summaryTier: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  summaryBody: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  questionsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questionBlock: {
    marginBottom: 18,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginRight: 10,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  questionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  valueBubble: {
    marginLeft: 8,
    minWidth: 30,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sliderDot: {
    flex: 1,
    height: 8,
    marginHorizontal: 2,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  sliderDotActive: {
    backgroundColor: Colors.primary,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  submitButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  submitText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});

