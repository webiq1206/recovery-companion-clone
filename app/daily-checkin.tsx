import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronRight, Check, Activity, Brain, Moon, MapPin, Heart, Zap, Sun, Sunset, Clock, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRecovery } from '@/providers/RecoveryProvider';
import { calculateStability } from '@/utils/stabilityEngine';
import { useRetention } from '@/providers/RetentionProvider';
import { DailyCheckIn, CheckInTimeOfDay, EmotionalTag } from '@/types';
import {
  getRecoveryStage,
  getRiskLevel,
  getEmotionalInsight,
} from '@/constants/companion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80;
const THUMB_SIZE = 28;
const SLIDER_DAMPING = 0.4;

interface SliderMetric {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  lowLabel: string;
  highLabel: string;
}

const METRICS: SliderMetric[] = [
  { key: 'mood', label: 'Mood', icon: <Heart size={18} color="#FF6B9D" />, color: '#FF6B9D', lowLabel: 'Low', highLabel: 'Great' },
  { key: 'cravingLevel', label: 'Cravings', icon: <Zap size={18} color="#FF6B35" />, color: '#FF6B35', lowLabel: 'None', highLabel: 'Intense' },
  { key: 'stress', label: 'Stress', icon: <Activity size={18} color="#FFC107" />, color: '#FFC107', lowLabel: 'Calm', highLabel: 'High' },
  { key: 'sleepQuality', label: 'Sleep', icon: <Moon size={18} color="#7C8CF8" />, color: '#7C8CF8', lowLabel: 'Poor', highLabel: 'Restful' },
  { key: 'environment', label: 'Environment', icon: <MapPin size={18} color="#2EC4B6" />, color: '#2EC4B6', lowLabel: 'Risky', highLabel: 'Safe' },
  { key: 'emotionalState', label: 'Emotions', icon: <Brain size={18} color="#CE93D8" />, color: '#CE93D8', lowLabel: 'Unstable', highLabel: 'Balanced' },
];

const EMOTIONAL_TAGS: { key: EmotionalTag; label: string; helper: string }[] = [
  { key: 'anxious', label: 'Anxious', helper: 'on edge, keyed up, worried' },
  { key: 'lonely', label: 'Lonely', helper: 'disconnected, unseen, isolated' },
  { key: 'ashamed', label: 'Ashamed', helper: 'guilty, embarrassed, self-blaming' },
  { key: 'angry', label: 'Angry', helper: 'irritated, resentful, frustrated' },
  { key: 'hopeful', label: 'Hopeful', helper: 'light, optimistic, possibility' },
  { key: 'numb', label: 'Numb', helper: 'shut down, flat, checked out' },
];

const PERIOD_CONFIG: Record<CheckInTimeOfDay, { label: string; icon: React.ReactNode; color: string; greeting: string }> = {
  morning: { label: 'Morning', icon: <Sun size={18} color="#FFC107" />, color: '#FFC107', greeting: 'Good morning' },
  afternoon: { label: 'Afternoon', icon: <Sun size={18} color="#FF6B35" />, color: '#FF6B35', greeting: 'Good afternoon' },
  evening: { label: 'Evening', icon: <Sunset size={18} color="#7C8CF8" />, color: '#7C8CF8', greeting: 'Good evening' },
};

const REFLECTIONS: Record<string, string[]> = {
  excellent: [
    "You're in a strong place today. Keep riding this wave.",
    "Solid day. Your resilience is showing.",
    "You're building something powerful. One day at a time.",
  ],
  good: [
    "Steady progress. You're handling things well.",
    "Good awareness today. That's real strength.",
    "You're showing up for yourself. That matters.",
  ],
  moderate: [
    "It's okay to have mixed days. You're still here.",
    "Some tension is normal. You're navigating it.",
    "Take a breath. You've handled harder days than this.",
  ],
  challenging: [
    "Tough day, but you checked in. That's courage.",
    "Reach out to someone you trust today.",
    "This feeling will pass. You're stronger than you think.",
  ],
  difficult: [
    "You're brave for being honest. Consider calling a support contact.",
    "Right now is hard, but you've survived hard before.",
    "You don't have to do this alone. Reach out.",
  ],
};

function getReflection(score: number): string {
  let category: string;
  if (score >= 80) category = 'excellent';
  else if (score >= 65) category = 'good';
  else if (score >= 45) category = 'moderate';
  else if (score >= 25) category = 'challenging';
  else category = 'difficult';

  const options = REFLECTIONS[category];
  return options[Math.floor(Math.random() * options.length)];
}

function getEmotionalReflection(
  score: number,
  values: Record<string, number>,
  checkIns: DailyCheckIn[],
  daysSober: number,
): { reflection: string; emotionalNote: string } {
  const baseReflection = getReflection(score);
  const stage = getRecoveryStage(daysSober);
  const risk = getRiskLevel(checkIns, daysSober);

  let emotionalNote = '';

  if (values.cravingLevel > 70 && values.mood < 40) {
    emotionalNote = "High cravings with low mood is a signal worth paying attention to. Consider reaching out to your support network today.";
  } else if (values.emotionalState < 30) {
    emotionalNote = "Your emotions feel unstable right now. That's okay \u2014 awareness is the first step. Try a grounding exercise.";
  } else if (values.sleepQuality < 25) {
    emotionalNote = "Poor sleep affects everything. Tonight, try winding down 30 minutes earlier. Your recovery body needs rest.";
  } else if (values.stress > 75 && values.cravingLevel > 60) {
    emotionalNote = "Stress and cravings often travel together. Break the cycle with one small healthy action right now.";
  } else if (score >= 75) {
    const { insight } = getEmotionalInsight(checkIns, stage, risk);
    emotionalNote = insight;
  } else if (values.environment < 35) {
    emotionalNote = "Your environment feels risky. Can you change your surroundings, even temporarily? A new space can shift your state.";
  }

  console.log('[CheckIn] Emotional reflection generated:', { score, stage, risk, hasNote: !!emotionalNote });
  return { reflection: baseReflection, emotionalNote };
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#2EC4B6';
  if (score >= 50) return '#FFC107';
  if (score >= 30) return '#FF6B35';
  return '#EF5350';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 65) return 'Steady';
  if (score >= 45) return 'Managing';
  if (score >= 25) return 'Tough';
  return 'Struggling';
}

interface CustomSliderProps {
  metric: SliderMetric;
  value: number;
  onValueChange: (val: number) => void;
  readOnly?: boolean;
  locked?: boolean;
}

function CustomSlider({ metric, value, onValueChange, readOnly = false, locked = false }: CustomSliderProps) {
  const panX = useRef(new Animated.Value((value / 100) * SLIDER_WIDTH)).current;
  const lastValue = useRef(value);
  const isDisabled = readOnly || locked;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panX.setOffset(lastValue.current / 100 * SLIDER_WIDTH);
        panX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const dampedDx = gestureState.dx * SLIDER_DAMPING;
        const newX = Math.max(0, Math.min(SLIDER_WIDTH, (lastValue.current / 100 * SLIDER_WIDTH) + dampedDx));
        panX.setOffset(0);
        panX.setValue(newX);
        const newVal = Math.round((newX / SLIDER_WIDTH) * 100);
        if (newVal !== lastValue.current) {
          Haptics.selectionAsync();
        }
        onValueChange(newVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dampedDx = gestureState.dx * SLIDER_DAMPING;
        const finalX = Math.max(0, Math.min(SLIDER_WIDTH, (lastValue.current / 100 * SLIDER_WIDTH) + dampedDx));
        const finalVal = Math.round((finalX / SLIDER_WIDTH) * 100);
        lastValue.current = finalVal;
        panX.flattenOffset();
        onValueChange(finalVal);
      },
    })
  ).current;

  useEffect(() => {
    lastValue.current = value;
    panX.setValue((value / 100) * SLIDER_WIDTH);
  }, [value]);

  const fillWidth = panX.interpolate({
    inputRange: [0, SLIDER_WIDTH],
    outputRange: [0, SLIDER_WIDTH],
    extrapolate: 'clamp',
  });

  const thumbLeft = panX.interpolate({
    inputRange: [0, SLIDER_WIDTH],
    outputRange: [-(THUMB_SIZE / 2), SLIDER_WIDTH - (THUMB_SIZE / 2)],
    extrapolate: 'clamp',
  });

  const sliderOpacity = isDisabled ? 0.45 : 1;

  return (
    <View style={[sliderStyles.container, { opacity: sliderOpacity }]}>
      <View style={sliderStyles.labelRow}>
        <View style={sliderStyles.iconLabel}>
          {metric.icon}
          <Text style={sliderStyles.label}>{metric.label}</Text>
          {locked && <Lock size={12} color={Colors.textMuted} />}
        </View>
        <Text style={[sliderStyles.valueText, { color: locked ? Colors.textMuted : metric.color }]}>{value}</Text>
      </View>
      <View style={sliderStyles.trackContainer} {...(isDisabled ? {} : panResponder.panHandlers)}>
        <View style={sliderStyles.track}>
          <Animated.View
            style={[
              sliderStyles.fill,
              { width: fillWidth, backgroundColor: locked ? Colors.textMuted : metric.color },
            ]}
          />
        </View>
        <Animated.View
          style={[
            sliderStyles.thumb,
            {
              left: thumbLeft,
              backgroundColor: locked ? Colors.textMuted : metric.color,
              shadowColor: locked ? Colors.textMuted : metric.color,
            },
          ]}
        />
      </View>
      <View style={sliderStyles.rangeLabels}>
        <Text style={sliderStyles.rangeText}>{metric.lowLabel}</Text>
        {locked && <Text style={sliderStyles.lockedText}>From morning check-in</Text>}
        <Text style={sliderStyles.rangeText}>{metric.highLabel}</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
  },
  trackContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative' as const,
  },
  track: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute' as const,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (40 - THUMB_SIZE) / 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rangeText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  lockedText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
});

export default function DailyCheckInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    addCheckIn,
    todayCheckIns,
    morningCheckIn,
    currentCheckInPeriod,
    currentPeriodCheckIn,
    checkIns,
    daysSober,
    logNearMiss,
  } = useRecovery();
  const { triggerLoop, generateSupportiveNotification } = useRetention();

  const triggerReliefLoop = useCallback((checkIn: DailyCheckIn) => {
    triggerLoop('relief', 'check_in_after_craving');
    if (checkIn.cravingLevel < 40) {
      triggerLoop('control', 'trigger_managed');
    }
    if (checkIn.mood >= 60) {
      generateSupportiveNotification('emotional_stability', checkIns);
    }
  }, [triggerLoop, generateSupportiveNotification, checkIns]);

  const isMorning = currentCheckInPeriod === 'morning';
  const sleepLocked = !isMorning && morningCheckIn !== null;
  const morningSleepValue = morningCheckIn?.sleepQuality ?? 50;

  const [values, setValues] = useState<Record<string, number>>({
    mood: 50,
    cravingLevel: 50,
    stress: 50,
    sleepQuality: sleepLocked ? morningSleepValue : 50,
    environment: 50,
    emotionalState: 50,
  });
  const [selectedTags, setSelectedTags] = useState<EmotionalTag[]>([]);
  const [phase, setPhase] = useState<'metrics' | 'tags'>('metrics');
  const [submitted, setSubmitted] = useState(false);
  const [reflection, setReflection] = useState('');
  const [emotionalNote, setEmotionalNote] = useState('');
  const [calculatedScore, setCalculatedScore] = useState(0);
  const [hadNearMiss, setHadNearMiss] = useState<boolean | null>(null);
  const [nearMissNote, setNearMissNote] = useState('');

  useEffect(() => {
    if (sleepLocked) {
      setValues(prev => ({ ...prev, sleepQuality: morningSleepValue }));
    }
  }, [sleepLocked, morningSleepValue]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(40)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleValueChange = useCallback((key: string, val: number) => {
    if (key === 'sleepQuality' && sleepLocked) return;
    setValues(prev => ({ ...prev, [key]: val }));
  }, [sleepLocked]);

  const stabilityScore = useMemo(() => {
    const rp = profile?.recoveryProfile;
    const mood = values.mood;
    const emotional = values.emotionalState;
    const intensity = Math.min(5, Math.max(1, Math.round(1 + (100 - (mood + emotional) / 2) / 100 * 4)));
    const sleepNum = values.sleepQuality;
    const sleepQuality: 'poor' | 'okay' | 'good' = sleepNum <= 33 ? 'poor' : sleepNum <= 66 ? 'okay' : 'good';
    const input = {
      intensity,
      sleepQuality,
      triggers: rp?.triggers ?? [],
      supportLevel: rp?.supportAvailability ?? 'limited',
      dailyActionsCompleted: 1,
      relapseLogged: false,
    };
    return calculateStability(input).score;
  }, [values, profile?.recoveryProfile]);

  const periodConfig = PERIOD_CONFIG[currentCheckInPeriod];

  const handleToggleTag = useCallback((tag: EmotionalTag) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      if (exists) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tag];
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (phase === 'metrics') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhase('tags');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const score = stabilityScore;
    const { reflection: ref, emotionalNote: note } = getEmotionalReflection(score, values, checkIns, daysSober);
    setCalculatedScore(score);
    setReflection(ref);
    setEmotionalNote(note);

    const checkIn: DailyCheckIn = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      timeOfDay: currentCheckInPeriod,
      mood: values.mood,
      cravingLevel: values.cravingLevel,
      stress: values.stress,
      sleepQuality: values.sleepQuality,
      environment: values.environment,
      emotionalState: values.emotionalState,
      stabilityScore: score,
      reflection: ref,
      completedAt: new Date().toISOString(),
      emotionalTags: selectedTags.length ? selectedTags : undefined,
    };

    console.log('[CheckIn] Submitted for period:', currentCheckInPeriod, checkIn);
    addCheckIn(checkIn);
    if (hadNearMiss) {
      const nearMissEvent = {
        timestamp: new Date().toISOString(),
        cravingLevel: values.cravingLevel,
        triggerContext: `${periodConfig.label} check-in; mood ${values.mood}; stress ${values.stress}; environment ${values.environment}`,
        note: nearMissNote.trim() || undefined,
      };
      console.log('[CheckIn] Logging near miss event:', nearMissEvent);
      logNearMiss(nearMissEvent);
    }
    triggerReliefLoop(checkIn);
    setSubmitted(true);

    Animated.parallel([
      Animated.timing(resultFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(resultSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [phase, stabilityScore, values, checkIns, daysSober, currentCheckInPeriod, selectedTags, addCheckIn, triggerReliefLoop, resultFade, resultSlide, scoreScale, hadNearMiss, nearMissNote, logNearMiss, periodConfig.label]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const completedPeriods = useMemo(() => {
    const periods: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];
    return periods.filter(p => todayCheckIns.some(c => c.timeOfDay === p));
  }, [todayCheckIns]);

  const allPeriodsComplete = completedPeriods.length >= 3;

  const getCheckInForPeriod = useCallback((period: CheckInTimeOfDay) => {
    return todayCheckIns.find(c => c.timeOfDay === period) ?? null;
  }, [todayCheckIns]);

  if (submitted) {
    const scoreColor = getScoreColor(calculatedScore);
    const scoreLabel = getScoreLabel(calculatedScore);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            styles.resultContainer,
            {
              opacity: resultFade,
              transform: [{ translateY: resultSlide }],
            },
          ]}
        >
          <View style={styles.periodBadgeResult}>
            {periodConfig.icon}
            <Text style={[styles.periodBadgeText, { color: periodConfig.color }]}>
              {periodConfig.label} Check-In
            </Text>
          </View>

          <Animated.View
            style={[
              styles.scoreCircle,
              {
                borderColor: scoreColor,
                transform: [{ scale: scoreScale }],
              },
            ]}
          >
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{calculatedScore}</Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
          </Animated.View>

          <Text style={styles.stabilityTitle}>Stability Score</Text>

          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionText}>{reflection}</Text>
          </View>

          {emotionalNote !== '' && (
            <View style={styles.emotionalNoteCard}>
              <Text style={styles.emotionalNoteText}>{emotionalNote}</Text>
            </View>
          )}

          <View style={styles.metricsGrid}>
            {METRICS.map((m) => (
              <View key={m.key} style={styles.metricPill}>
                {m.icon}
                <Text style={styles.metricPillLabel}>{m.label}</Text>
                <Text style={[styles.metricPillValue, { color: m.color }]}>
                  {values[m.key]}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.doneButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={handleClose}
            testID="checkin-done"
          >
            <Check size={20} color={Colors.white} />
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (currentPeriodCheckIn || allPeriodsComplete) {
    const periods: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];
    const noOp = () => {};

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeBtn} testID="checkin-close">
            <X size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Today's Check-Ins</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.ScrollView
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.periodProgressRow}>
            {periods.map((period) => {
              const completed = completedPeriods.includes(period);
              const isCurrent = period === currentCheckInPeriod;
              const config = PERIOD_CONFIG[period];
              return (
                <View
                  key={period}
                  style={[
                    styles.periodProgressItem,
                    completed && styles.periodProgressCompleted,
                    isCurrent && !completed && styles.periodProgressCurrent,
                  ]}
                >
                  {completed ? (
                    <Check size={14} color="#2EC4B6" />
                  ) : (
                    config.icon
                  )}
                  <Text
                    style={[
                      styles.periodProgressLabel,
                      completed && styles.periodProgressLabelDone,
                    ]}
                  >
                    {config.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {allPeriodsComplete && (
            <View style={styles.readOnlyBanner}>
              <Check size={16} color="#2EC4B6" />
              <Text style={styles.readOnlyBannerText}>All check-ins complete for today</Text>
            </View>
          )}

          {!allPeriodsComplete && currentPeriodCheckIn && (
            <View style={styles.readOnlyBanner}>
              <Check size={16} color="#2EC4B6" />
              <Text style={styles.readOnlyBannerText}>
                {periodConfig.label} check-in complete
              </Text>
            </View>
          )}

          {periods.map((period) => {
            const periodCheckIn = getCheckInForPeriod(period);
            if (!periodCheckIn) return null;
            const pConfig = PERIOD_CONFIG[period];
            const scoreColor = getScoreColor(periodCheckIn.stabilityScore);
            const scoreLabel = getScoreLabel(periodCheckIn.stabilityScore);

            return (
              <View key={period} style={styles.periodSection}>
                <View style={styles.periodSectionHeader}>
                  {pConfig.icon}
                  <Text style={styles.periodSectionTitle}>{pConfig.label}</Text>
                  <View style={[styles.periodScoreBadge, { backgroundColor: `${scoreColor}18` }]}>
                    <Text style={[styles.periodScoreBadgeText, { color: scoreColor }]}>
                      {periodCheckIn.stabilityScore} {scoreLabel}
                    </Text>
                  </View>
                </View>

                {periodCheckIn.reflection ? (
                  <Text style={styles.periodReflection}>{periodCheckIn.reflection}</Text>
                ) : null}

                <View style={styles.periodMetricsRow}>
                  {METRICS.map((m) => {
                    const val = periodCheckIn[m.key as keyof DailyCheckIn] as number;
                    return (
                      <View key={m.key} style={styles.periodMetricItem}>
                        {m.icon}
                        <Text style={styles.periodMetricValue}>{val}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeBtn} testID="checkin-close">
          <X size={22} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{periodConfig.label} Check-In</Text>
        <View style={{ width: 36 }} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.periodProgressRow}>
          {(['morning', 'afternoon', 'evening'] as CheckInTimeOfDay[]).map((period) => {
            const completed = completedPeriods.includes(period);
            const isCurrent = period === currentCheckInPeriod;
            const config = PERIOD_CONFIG[period];
            return (
              <View
                key={period}
                style={[
                  styles.periodProgressItem,
                  completed && styles.periodProgressCompleted,
                  isCurrent && !completed && styles.periodProgressCurrent,
                ]}
              >
                {completed ? (
                  <Check size={14} color="#2EC4B6" />
                ) : (
                  config.icon
                )}
                <Text
                  style={[
                    styles.periodProgressLabel,
                    completed && styles.periodProgressLabelDone,
                    isCurrent && !completed && styles.periodProgressLabelCurrent,
                  ]}
                >
                  {config.label}
                </Text>
              </View>
            );
          })}
        </View>

        {phase === 'metrics' ? (
          <>
            <Text style={styles.prompt}>{periodConfig.greeting}. How are you?</Text>
            <Text style={styles.promptSub}>
              {isMorning
                ? 'Slide to adjust each area. Be honest \u2014 this is just for you.'
                : 'Sleep carries over from your morning check-in. Adjust the rest.'}
            </Text>

            <View style={styles.liveScore}>
              <Text style={styles.liveScoreLabel}>Stability</Text>
              <Text style={[styles.liveScoreValue, { color: getScoreColor(stabilityScore) }]}>
                {stabilityScore}
              </Text>
            </View>

            <View style={styles.slidersContainer}>
              {METRICS.map((metric) => {
                const isSleepAndLocked = metric.key === 'sleepQuality' && sleepLocked;
                return (
                  <CustomSlider
                    key={metric.key}
                    metric={metric}
                    value={values[metric.key]}
                    onValueChange={(val) => handleValueChange(metric.key, val)}
                    locked={isSleepAndLocked}
                  />
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.tagsStepContainer}>
            <Text style={styles.prompt}>Which emotions stand out right now?</Text>
            <Text style={styles.promptSub}>
              Pick up to three. This helps your companion notice emotional patterns over time.
            </Text>

            <View style={styles.tagsGrid}>
              {EMOTIONAL_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.key);
                return (
                  <Pressable
                    key={tag.key}
                    onPress={() => handleToggleTag(tag.key)}
                    style={({ pressed }) => [
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={[styles.tagChipLabel, isSelected && styles.tagChipLabelSelected]}>
                      {tag.label}
                    </Text>
                    <Text style={[styles.tagChipHelper, isSelected && styles.tagChipHelperSelected]}>
                      {tag.helper}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.tagsFooterText}>
              You can skip this if nothing fits. Your honesty here helps the app learn when to step in supportively.
            </Text>

            <View style={styles.nearMissSection}>
              <Text style={styles.nearMissTitle}>Did cravings lead to a close call today?</Text>
              <Text style={styles.nearMissSubtitle}>
                This helps your relapse detection system treat near misses as important warning signs.
              </Text>
              <View style={styles.nearMissChoices}>
                <Pressable
                  style={({ pressed }) => [
                    styles.nearMissChoice,
                    hadNearMiss === true && styles.nearMissChoiceSelected,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => setHadNearMiss(true)}
                  testID="near-miss-yes"
                >
                  <Text
                    style={[
                      styles.nearMissChoiceText,
                      hadNearMiss === true && styles.nearMissChoiceTextSelected,
                    ]}
                  >
                    Yes, it was a close call
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.nearMissChoice,
                    hadNearMiss === false && styles.nearMissChoiceSelected,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => setHadNearMiss(false)}
                  testID="near-miss-no"
                >
                  <Text
                    style={[
                      styles.nearMissChoiceText,
                      hadNearMiss === false && styles.nearMissChoiceTextSelected,
                    ]}
                  >
                    No, cravings stayed manageable
                  </Text>
                </Pressable>
              </View>

              {hadNearMiss && (
                <View style={styles.nearMissNoteContainer}>
                  <Text style={styles.nearMissNoteLabel}>Optional note about this close call</Text>
                  <TextInput
                    style={styles.nearMissNoteInput}
                    placeholder="What was happening or what helped you hold the line?"
                    placeholderTextColor={Colors.textMuted}
                    value={nearMissNote}
                    onChangeText={setNearMissNote}
                    multiline
                    maxLength={280}
                    testID="near-miss-note"
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </Animated.ScrollView>

      <View style={[styles.submitBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.submitButton, { backgroundColor: periodConfig.color }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={handleSubmit}
          testID="checkin-submit"
        >
          <Text style={styles.submitButtonText}>
            {phase === 'metrics' ? 'Next: Tag Emotions' : `Complete ${periodConfig.label} Check-In`}
          </Text>
          <ChevronRight size={20} color={Colors.white} />
        </Pressable>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 28,
  },
  periodProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  periodProgressItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodProgressCompleted: {
    backgroundColor: 'rgba(46, 196, 182, 0.08)',
    borderColor: 'rgba(46, 196, 182, 0.3)',
  },
  periodProgressCurrent: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  periodProgressLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  periodProgressLabelDone: {
    color: '#2EC4B6',
  },
  periodProgressLabelCurrent: {
    color: Colors.text,
  },
  prompt: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  promptSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  liveScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  liveScoreLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  liveScoreValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
  },
  slidersContainer: {
    gap: 4,
  },
  tagsStepContainer: {
    marginTop: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    flexBasis: '48%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  tagChipSelected: {
    backgroundColor: 'rgba(124, 140, 248, 0.12)',
    borderColor: '#7C8CF8',
  },
  tagChipLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  tagChipLabelSelected: {
    color: '#7C8CF8',
  },
  tagChipHelper: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  tagChipHelperSelected: {
    color: Colors.text,
  },
  tagsFooterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 16,
    lineHeight: 18,
  },
  nearMissSection: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  nearMissTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nearMissSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  nearMissChoices: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  nearMissChoice: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  nearMissChoiceSelected: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderColor: '#EF5350',
  },
  nearMissChoiceText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  nearMissChoiceTextSelected: {
    color: '#EF5350',
    fontWeight: '600' as const,
  },
  nearMissNoteContainer: {
    marginTop: 6,
  },
  nearMissNoteLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  nearMissNoteInput: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.cardBackground,
    color: Colors.text,
    fontSize: 13,
    textAlignVertical: 'top' as const,
  },
  submitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  periodBadgeResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  periodBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: -2,
  },
  stabilityTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  reflectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 24,
    width: '100%',
  },
  reflectionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    fontStyle: 'italic' as const,
  },
  emotionalNoteCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#7C8CF8',
    marginBottom: 24,
    width: '100%',
  },
  emotionalNoteText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 32,
    width: '100%',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  metricPillLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  metricPillValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    gap: 8,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 196, 182, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  readOnlyBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2EC4B6',
  },
  periodSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  periodSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  periodSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  periodScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodScoreBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  periodReflection: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  periodMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodMetricItem: {
    alignItems: 'center',
    gap: 4,
  },
  periodMetricValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
});
