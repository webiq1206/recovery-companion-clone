import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldAlert, ClipboardCheck, Activity, Sparkles, Zap, TrendingUp, Heart,
  AlertTriangle, Target, ArrowRight, Shield, ChevronRight, ChevronDown, ChevronUp,
  Radio, Eye, X, BellRing, Brain, BookOpen, Users, MessageCircle, Check
} from 'lucide-react-native';
import { getRecoveryStage, getRiskLevel, getStageLabel, COMPANION_QUICK_PROMPTS } from '@/constants/companion';
import { HOME_COPY } from '@/constants/branding';
import { useStageDetection } from '@/providers/StageDetectionProvider';
import StageTransitionModal from '@/components/StageTransitionModal';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRecovery } from '@/providers/RecoveryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useEngagement } from '@/providers/EngagementProvider';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { MILESTONE_DATA } from '@/constants/milestones';
import { MicroWin, RiskAlert, DailyCheckIn, Pledge } from '@/types';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/constants/milestones';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getEmotionalState(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: 'Feeling Strong', color: '#4CAF50', bgColor: 'rgba(76,175,80,0.12)' };
  if (score >= 60) return { label: 'Steady & Calm', color: '#2EC4B6', bgColor: 'rgba(46,196,182,0.12)' };
  if (score >= 40) return { label: 'Managing', color: '#FFB347', bgColor: 'rgba(255,179,71,0.12)' };
  if (score >= 20) return { label: 'Struggling', color: '#FF9800', bgColor: 'rgba(255,152,0,0.12)' };
  return { label: 'In Need of Support', color: '#EF5350', bgColor: 'rgba(239,83,80,0.12)' };
}

function getTodayFocus(riskLevel: string, stabilityScore: number, hasCheckedIn: boolean, daysSober: number): { title: string; description: string; action: string; route: string } {
  if (!hasCheckedIn) {
    return {
      title: HOME_COPY.focusLabels.checkin.title,
      description: HOME_COPY.focusLabels.checkin.description,
      action: HOME_COPY.focusLabels.checkin.action,
      route: '/daily-checkin',
    };
  }
  if (riskLevel === 'high' || riskLevel === 'crisis') {
    return {
      title: HOME_COPY.focusLabels.crisis.title,
      description: HOME_COPY.focusLabels.crisis.description,
      action: HOME_COPY.focusLabels.crisis.action,
      route: '/crisis-mode',
    };
  }
  if (riskLevel === 'elevated') {
    return {
      title: HOME_COPY.focusLabels.elevated.title,
      description: HOME_COPY.focusLabels.elevated.description,
      action: HOME_COPY.focusLabels.elevated.action,
      route: '/crisis-mode',
    };
  }
  if (stabilityScore >= 70) {
    return {
      title: HOME_COPY.focusLabels.strong.title,
      description: HOME_COPY.focusLabels.strong.description,
      action: HOME_COPY.focusLabels.strong.action,
      route: '/(tabs)/rebuild',
    };
  }
  if (daysSober < 7) {
    return {
      title: HOME_COPY.focusLabels.early.title,
      description: HOME_COPY.focusLabels.early.description,
      action: HOME_COPY.focusLabels.early.action,
      route: '/(tabs)/journal',
    };
  }
  return {
    title: HOME_COPY.focusLabels.momentum.title,
    description: HOME_COPY.focusLabels.momentum.description,
    action: HOME_COPY.focusLabels.momentum.action,
    route: '/(tabs)/progress',
  };
}

function getInterventionSuggestion(riskLevel: string, stabilityScore: number): { message: string; actionLabel: string; route: string } | null {
  if (riskLevel === 'high' || riskLevel === 'crisis') {
    return {
      message: 'Your protection system detected elevated risk. Safety tools are ready.',
      actionLabel: 'Access Safety Tools',
      route: '/crisis-mode',
    };
  }
  if (riskLevel === 'elevated' || stabilityScore < 40) {
    return {
      message: 'Extra protection might help today. Your companion is here.',
      actionLabel: 'Talk to Companion',
      route: '/companion-chat',
    };
  }
  return null;
}

type StagePhase = 'Awareness' | 'Decision' | 'Stabilization' | 'Rebuild' | 'Growth';

interface StageTask {
  id: string;
  title: string;
  description: string;
  category: 'emotional' | 'physical' | 'connection';
}

function getStagePhase(daysSober: number): StagePhase {
  if (daysSober < 7) return 'Awareness';
  if (daysSober < 30) return 'Decision';
  if (daysSober < 90) return 'Stabilization';
  if (daysSober < 180) return 'Rebuild';
  return 'Growth';
}

function getStageTasks(phase: StagePhase): StageTask[] {
  switch (phase) {
    case 'Awareness':
      return [
        {
          id: 'awareness-emotional-checkin',
          title: 'Name what you’re feeling',
          description: 'Take 30 seconds to quietly notice and name 1–2 emotions without judging them.',
          category: 'emotional',
        },
        {
          id: 'awareness-physical-grounding',
          title: 'Ground your body',
          description: 'Place both feet on the floor, feel the chair beneath you, and take 5 slow breaths.',
          category: 'physical',
        },
        {
          id: 'awareness-connection-text',
          title: 'Send a small check-in',
          description: 'Text or message someone you trust with a simple “Hey, I’m here today.”',
          category: 'connection',
        },
      ];
    case 'Decision':
      return [
        {
          id: 'decision-emotional-intention',
          title: 'Set today’s intention',
          description: 'Finish this sentence: “Today, I want to treat myself with…” and hold it gently in mind.',
          category: 'emotional',
        },
        {
          id: 'decision-physical-move',
          title: 'One caring action for your body',
          description: 'Choose one simple action: drink water, stretch for 1 minute, or step outside briefly.',
          category: 'physical',
        },
        {
          id: 'decision-connection-share',
          title: 'Let someone in',
          description: 'Share one honest sentence with a person or journal about how today really feels.',
          category: 'connection',
        },
        {
          id: 'decision-physical-rest',
          title: 'Plan one rest moment',
          description: 'Choose a time today when you’ll pause for 3 calm breaths or a quiet break.',
          category: 'physical',
        },
      ];
    case 'Stabilization':
      return [
        {
          id: 'stabilization-emotional-scan',
          title: 'Do a gentle body scan',
          description: 'Notice where tension sits in your body and soften one small area with your breath.',
          category: 'emotional',
        },
        {
          id: 'stabilization-physical-routine',
          title: 'Keep one steady routine',
          description: 'Choose and honor one stabilizing habit today (meal, sleep time, walk, or hygiene).',
          category: 'physical',
        },
        {
          id: 'stabilization-connection-ping',
          title: 'Touch base with support',
          description: 'Ping a support person, group, or community space—even a short emoji counts.',
          category: 'connection',
        },
        {
          id: 'stabilization-emotional-kindness',
          title: 'Offer yourself one kind phrase',
          description: 'When self-criticism shows up, gently replace it with one kinder sentence.',
          category: 'emotional',
        },
      ];
    case 'Rebuild':
      return [
        {
          id: 'rebuild-emotional-vision',
          title: 'Remember why you’re rebuilding',
          description: 'Write or think of one reason your future self is grateful you stayed on this path.',
          category: 'emotional',
        },
        {
          id: 'rebuild-physical-step',
          title: 'Take a small forward step',
          description: 'Do one small action toward work, home, or health that future you will appreciate.',
          category: 'physical',
        },
        {
          id: 'rebuild-connection-offer',
          title: 'Reach out or respond',
          description: 'Reply to a message, check in on someone, or say “thank you” to a person who supports you.',
          category: 'connection',
        },
        {
          id: 'rebuild-physical-environment',
          title: 'Tidy one small space',
          description: 'Reset a tiny area—a desk, nightstand, or counter—to support a calmer mind.',
          category: 'physical',
        },
      ];
    case 'Growth':
    default:
      return [
        {
          id: 'growth-emotional-gratitude',
          title: 'Notice one point of gratitude',
          description: 'Name one thing in your life today that you’re quietly grateful for.',
          category: 'emotional',
        },
        {
          id: 'growth-physical-energize',
          title: 'Gently energize your body',
          description: 'Choose a short walk, stretch, or movement that reminds you you’re alive and growing.',
          category: 'physical',
        },
        {
          id: 'growth-connection-giveback',
          title: 'Offer a small kindness',
          description: 'Send encouragement, hold the door, or show a simple kindness to someone else.',
          category: 'connection',
        },
        {
          id: 'growth-emotional-reflect',
          title: 'Reflect on progress',
          description: 'Remember one moment from the past week that shows how far you’ve come.',
          category: 'emotional',
        },
      ];
  }
}

const StabilityRing = React.memo(({ score, size }: { score: number; size: number }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  const getScoreColor = (s: number): string => {
    if (s >= 70) return '#4CAF50';
    if (s >= 50) return '#2EC4B6';
    if (s >= 30) return '#FFB347';
    return '#EF5350';
  };

  const scoreColor = getScoreColor(score);

  return (
    <View style={[stabilityStyles.container, { width: size, height: size }]}>
      <Animated.View style={[stabilityStyles.glowRing, { width: size, height: size, borderRadius: size / 2, borderColor: scoreColor, opacity: glowAnim }]} />
      <View style={[stabilityStyles.outerRing, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, borderColor: scoreColor + '30' }]}>
        <View style={[stabilityStyles.innerRing, { width: size - 24, height: size - 24, borderRadius: (size - 24) / 2 }]}>
          <Text style={[stabilityStyles.scoreText, { color: scoreColor }]}>{score}</Text>
          <Text style={stabilityStyles.scoreLabel}>{HOME_COPY.stabilityLabel}</Text>
        </View>
      </View>
    </View>
  );
});

const stabilityStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  outerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  innerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,27,42,0.8)',
  },
  scoreText: {
    fontSize: 42,
    fontWeight: '200' as const,
    letterSpacing: -1,
    lineHeight: 48,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 3,
    marginTop: 2,
  },
});

const EmotionalBadge = React.memo(({ score }: { score: number }) => {
  const state = getEmotionalState(score);
  return (
    <View style={[emotionalStyles.badge, { backgroundColor: state.bgColor }]}>
      <Text style={[emotionalStyles.label, { color: state.color }]}>{state.label}</Text>
    </View>
  );
});

const emotionalStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

const MicroWinToast = React.memo(({ win, onDismiss }: { win: MicroWin | null; onDismiss: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (win) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [win]);

  if (!win) return null;

  return (
    <Animated.View style={[styles.winToast, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.winToastIcon}>
        <Zap size={14} color="#FFD54F" />
      </View>
      <View style={styles.winToastText}>
        <Text style={styles.winToastTitle}>{win.title}</Text>
        <Text style={styles.winToastDesc}>{win.description}</Text>
      </View>
    </Animated.View>
  );
});

const RiskMeter = React.memo(({ label, value, color }: { label: string; value: number; color: string }) => {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, { toValue: value, duration: 800, useNativeDriver: false }).start();
  }, [value]);

  const width = barWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={riskStyles.meterItem}>
      <View style={riskStyles.meterLabelRow}>
        <Text style={riskStyles.meterLabel}>{label}</Text>
        <Text style={[riskStyles.meterValue, { color }]}>{value}</Text>
      </View>
      <View style={riskStyles.meterTrack}>
        <Animated.View style={[riskStyles.meterFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
});

const CheckInMeter = React.memo(({ label, value, color }: { label: string; value: number; color: string }) => {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, { toValue: value, duration: 800, useNativeDriver: false }).start();
  }, [value]);

  const width = barWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={riskStyles.meterItem}>
      <View style={riskStyles.meterLabelRow}>
        <Text style={riskStyles.meterLabel}>{label}</Text>
        <Text style={[riskStyles.meterValue, { color }]}>{value}</Text>
      </View>
      <View style={riskStyles.meterTrack}>
        <Animated.View style={[riskStyles.meterFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
});

const RiskAlertCard = React.memo(({ alert, onDismiss, onAct }: { alert: RiskAlert; onDismiss: () => void; onAct: () => void }) => {
  const severityColors: Record<string, string> = {
    info: '#2EC4B6',
    caution: '#FFC107',
    warning: '#FF9800',
    critical: '#EF5350',
  };
  const borderColor = severityColors[alert.severity] ?? '#FF9800';

  return (
    <View style={[riskStyles.alertCard, { borderLeftColor: borderColor }]}>
      <View style={riskStyles.alertTop}>
        <View style={[riskStyles.alertIconBg, { backgroundColor: borderColor + '15' }]}>
          <AlertTriangle size={16} color={borderColor} />
        </View>
        <View style={riskStyles.alertTextWrap}>
          <Text style={riskStyles.alertTitle}>{alert.title}</Text>
          <Text style={riskStyles.alertMessage}>{alert.message}</Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12} style={riskStyles.alertDismiss}>
          <X size={14} color={Colors.textMuted} />
        </Pressable>
      </View>
      <Pressable
        style={({ pressed }) => [riskStyles.alertAction, { borderColor: borderColor + '30' }, pressed && { opacity: 0.8 }]}
        onPress={onAct}
      >
        <Text style={[riskStyles.alertActionText, { color: borderColor }]}>{alert.suggestion}</Text>
        <ArrowRight size={14} color={borderColor} />
      </Pressable>
    </View>
  );
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, todayPledge, currentStreak, daysSober, isLoading, todayCheckIn, todayCheckIns, currentCheckInPeriod, currentPeriodCheckIn, checkIns, stabilityScore, addPledge } = useRecovery();
  const { isPremium, hasFeature } = useSubscription();
  const { recordMicroWin, updateStreak, todayMicroWins, weeklyWinCount, getEncouragementMessage, getRiskTimingMessage, overallGrowthScore } = useEngagement();
  const { currentPrediction, criticalAlerts, currentIntensity, riskLabel, riskColor, trendLabel, reassuringMessage, dismissAlert: dismissRiskAlert, actOnAlert } = useRiskPrediction();
  const { currentStage, stageConfig, pendingTransition, isProgressing, stageConfigs, acknowledgeTransition, dismissTransition, stageProgress } = useStageDetection();
  const [showTransitionModal, setShowTransitionModal] = useState<boolean>(false);
  const [latestWin, setLatestWin] = useState<MicroWin | null>(null);
  const [riskExpanded, setRiskExpanded] = useState<boolean>(false);
  const [checkinExpanded, setCheckinExpanded] = useState<boolean>(false);
  const [pledgeExpanded, setPledgeExpanded] = useState<boolean>(false);
  const [pledgeMood, setPledgeMood] = useState<number>(3);
  const [wins, setWins] = useState({
    reflection: false,
    connection: false,
    healthyChoice: false,
  });
  const heroFadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(20)).current;

  const recoveryStage = useMemo(() => getRecoveryStage(daysSober), [daysSober]);
  const riskLevel = useMemo(() => getRiskLevel(checkIns, daysSober), [checkIns, daysSober]);
  const encouragement = useMemo(() => getEncouragementMessage(daysSober, riskLevel), [daysSober, riskLevel, getEncouragementMessage]);
  const riskMessage = useMemo(() => getRiskTimingMessage(checkIns), [checkIns, getRiskTimingMessage]);
  const greeting = useMemo(() => getGreeting(), []);

  const displayScore = useMemo(() => {
    if (todayCheckIn) return todayCheckIn.stabilityScore;
    return stabilityScore;
  }, [todayCheckIn, stabilityScore]);

  const todayFocus = useMemo(() =>
    getTodayFocus(riskLevel, displayScore, !!todayCheckIn, daysSober),
    [riskLevel, displayScore, todayCheckIn, daysSober]
  );

  const intervention = useMemo(() =>
    getInterventionSuggestion(riskLevel, displayScore),
    [riskLevel, displayScore]
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(heroSlideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (pendingTransition && !pendingTransition.acknowledged) {
      const timer = setTimeout(() => setShowTransitionModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pendingTransition]);

  useEffect(() => {
    if (todayCheckIn) {
      const win = recordMicroWin('checkin_completed');
      if (win) {
        setLatestWin(win);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      updateStreak(true);
    }
  }, [todayCheckIn?.id]);

  useEffect(() => {
    if (todayPledge?.completed) {
      const win = recordMicroWin('pledge_honored');
      if (win) {
        setLatestWin(win);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [todayPledge?.completed]);

  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const soberDate = new Date(profile.soberDate);
      const now = new Date();
      const diff = now.getTime() - soberDate.getTime();
      if (diff < 0) {
        setElapsed({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      setElapsed({ days, hours, minutes });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [profile.soberDate]);

  const nextMilestone = useMemo(() => MILESTONE_DATA.find(m => m.days > elapsed.days), [elapsed.days]);
  const daysToNext = nextMilestone ? nextMilestone.days - elapsed.days : 0;
  const totalSaved = useMemo(() => (profile.dailySavings * daysSober).toFixed(2), [profile.dailySavings, daysSober]);

  const milestoneProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    const prevMilestone = MILESTONE_DATA[MILESTONE_DATA.indexOf(nextMilestone) - 1];
    const prevDays = prevMilestone?.days ?? 0;
    return Math.min(((elapsed.days - prevDays) / (nextMilestone.days - prevDays)) * 100, 100);
  }, [nextMilestone, elapsed.days]);

  const handleTakePledge = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date().toISOString().split('T')[0];
    const newPledge: Pledge = {
      id: Date.now().toString(),
      date: today,
      completed: true,
      feeling: pledgeMood,
      note: '',
    };
    addPledge(newPledge);
  }, [pledgeMood, addPledge]);

  const handleToggleWin = useCallback((key: 'reflection' | 'connection' | 'healthyChoice') => {
    setWins((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const stagePhase = useMemo<StagePhase>(() => getStagePhase(daysSober), [daysSober]);
  const stageTasks = useMemo(() => getStageTasks(stagePhase), [stagePhase]);
  const [completedStageTasks, setCompletedStageTasks] = useState<Record<string, boolean>>({});
  const [checklistStreak, setChecklistStreak] = useState(0);
  const [lastChecklistCompletionDate, setLastChecklistCompletionDate] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    stageTasks.forEach((task) => {
      initial[task.id] = false;
    });
    setCompletedStageTasks(initial);
  }, [stagePhase, stageTasks]);

  const toggleStageTask = useCallback((id: string) => {
    setCompletedStageTasks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const allStageTasksComplete = useMemo(
    () => stageTasks.length > 0 && stageTasks.every((task) => completedStageTasks[task.id]),
    [stageTasks, completedStageTasks],
  );

  useEffect(() => {
    if (!allStageTasksComplete) return;
    const todayKey = new Date().toISOString().split('T')[0];
    if (lastChecklistCompletionDate === todayKey) return;
    setChecklistStreak((prev) => prev + 1);
    setLastChecklistCompletionDate(todayKey);
  }, [allStageTasksComplete, lastChecklistCompletionDate]);

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (!profile.hasCompletedOnboarding) {
    return <Redirect href={"/onboarding" as any} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <Text style={styles.greeting}>
            {greeting}, {profile.name || 'Friend'}
          </Text>
          <View style={styles.stageBadge}>
            <View style={[styles.stageDotIndicator, { backgroundColor: stageConfig.accentColor }]} />
            <Text style={[styles.stageTag, { color: stageConfig.accentColor }]}>{stageConfig.label}</Text>
            {stageProgress > 0 && <Text style={styles.stageDaysText}> · {stageProgress}d</Text>}
          </View>
          <Text style={styles.checkinSub}>
            {encouragement}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.crisisBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/emergency' as any);
          }}
          testID="crisis-mode-btn"
        >
          <ShieldAlert size={16} color="#FFFFFF" />
          <Text style={styles.crisisBtnText}>I need help right now</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.heroSection, { opacity: heroFadeAnim, transform: [{ translateY: heroSlideAnim }] }]}>
        <LinearGradient
          colors={['#0F2233', '#152A3D', '#0D1B2A']}
          style={styles.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <StabilityRing score={displayScore} size={120} />
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{elapsed.days}</Text>
                <Text style={styles.heroStatLabel}>{HOME_COPY.freedomLabel}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{currentStreak}</Text>
                <Text style={styles.heroStatLabel}>{HOME_COPY.streakLabel}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>${totalSaved}</Text>
                <Text style={styles.heroStatLabel}>{HOME_COPY.savedLabel}</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <EmotionalBadge score={displayScore} />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.todayFocusCard}>
        <View style={styles.todayFocusHeader}>
          <View style={styles.todayFocusIconBg}>
            <Target size={16} color="#2EC4B6" />
          </View>
          <Text style={styles.todayFocusLabel}>TODAY'S FOCUS</Text>
        </View>
        <Text style={styles.todayFocusTitle}>{todayFocus.title}</Text>
        <Text style={styles.todayFocusDesc}>{todayFocus.description}</Text>
        <Pressable
          style={({ pressed }) => [styles.todayFocusBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(todayFocus.route as any);
          }}
          testID="today-focus-action"
        >
          <Text style={styles.todayFocusBtnText}>{todayFocus.action}</Text>
          <ArrowRight size={16} color={Colors.white} />
        </Pressable>
      </View>

      <View style={styles.encouragementCard}>
        <Sparkles size={15} color="#FFD54F" />
        <Text style={styles.encouragementText}>{encouragement}</Text>
      </View>

      {/* Today's Small Wins checklist */}
      <View style={styles.todayFocusCard}>
        <View style={styles.todayFocusHeader}>
          <View style={styles.todayFocusIconBg}>
            <Sparkles size={16} color="#FFD54F" />
          </View>
          <Text style={styles.todayFocusLabel}>TODAY'S SMALL WINS</Text>
        </View>
        <Text style={styles.todayFocusDesc}>
          Gentle, doable steps for today. Tap to check off what you’ve honored.
        </Text>

        {/* Win 1 – data-driven check-in */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: todayCheckIn ? Colors.primary : Colors.border,
              backgroundColor: todayCheckIn ? Colors.primary + '20' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            {todayCheckIn && <Check size={14} color={Colors.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkinTitle}>Check in with yourself</Text>
            <Text style={styles.checkinSub}>
              Notice how your body, mind, and heart are doing.
            </Text>
          </View>
        </View>

        {/* Win 2 – reflection */}
        <Pressable
          onPress={() => handleToggleWin('reflection')}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
          hitSlop={8}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: wins.reflection ? Colors.primary : Colors.border,
              backgroundColor: wins.reflection ? Colors.primary + '20' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            {wins.reflection && <Check size={14} color={Colors.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkinTitle}>One kind thought</Text>
            <Text style={styles.checkinSub}>
              Offer yourself a single gentle sentence about today.
            </Text>
          </View>
        </Pressable>

        {/* Win 3 – connection */}
        <Pressable
          onPress={() => handleToggleWin('connection')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          hitSlop={8}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: wins.connection ? Colors.primary : Colors.border,
              backgroundColor: wins.connection ? Colors.primary + '20' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            {wins.connection && <Check size={14} color={Colors.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkinTitle}>Reach toward support</Text>
            <Text style={styles.checkinSub}>
              A message, call, or community moment that reminds you you’re not alone.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Stage-based daily checklist */}
      <View style={styles.todayFocusCard}>
        <View style={styles.todayFocusHeader}>
          <View style={styles.todayFocusIconBg}>
            <Heart size={16} color="#2EC4B6" />
          </View>
          <Text style={styles.todayFocusLabel}>TODAY'S STAGE ACTIONS</Text>
        </View>
        <Text style={styles.todayFocusTitle}>{stagePhase} focus</Text>
        <Text style={styles.todayFocusDesc}>
          Gentle actions matched to where you are in recovery today.
        </Text>

        {stageTasks.map((task) => {
          const done = completedStageTasks[task.id];
          return (
            <Pressable
              key={task.id}
              onPress={() => toggleStageTask(task.id)}
              style={({ pressed }) => [
                styles.stageTaskRow,
                done && styles.stageTaskRowDone,
                pressed && { opacity: 0.9 },
              ]}
              hitSlop={8}
            >
              <View
                style={[
                  styles.stageTaskCheck,
                  done && styles.stageTaskCheckDone,
                ]}
              >
                {done && <Check size={14} color={Colors.background} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stageTaskTitle}>{task.title}</Text>
                <Text style={styles.stageTaskDescription}>{task.description}</Text>
              </View>
              <View style={styles.stageTaskTag}>
                <Text style={styles.stageTaskTagText}>
                  {task.category === 'emotional'
                    ? 'Emotional'
                    : task.category === 'physical'
                    ? 'Body'
                    : 'Connection'}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {checklistStreak > 0 && (
          <View style={styles.stageStreakRow}>
            <Zap size={14} color={Colors.accent} />
            <Text style={styles.stageStreakText}>
              You’ve honored your stage checklist for {checklistStreak} day
              {checklistStreak === 1 ? '' : 's'} in a row.
            </Text>
          </View>
        )}
      </View>

      {intervention && (
        <Pressable
          style={({ pressed }) => [styles.interventionCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(intervention.route as any);
          }}
          testID="intervention-suggestion"
        >
          <View style={styles.interventionLeft}>
            <View style={styles.interventionIconBg}>
              <Shield size={16} color="#FF9800" />
            </View>
            <View style={styles.interventionTextWrap}>
              <Text style={styles.interventionMessage}>{intervention.message}</Text>
            </View>
          </View>
          <View style={styles.interventionAction}>
            <Text style={styles.interventionActionText}>{intervention.actionLabel}</Text>
            <ChevronRight size={14} color="#FF9800" />
          </View>
        </Pressable>
      )}

      {currentPrediction && (
        <View style={riskStyles.predictionCard}>
          <Pressable
            style={riskStyles.predictionHeader}
            onPress={() => {
              Haptics.selectionAsync();
              setRiskExpanded(!riskExpanded);
            }}
            testID="risk-prediction-toggle"
          >
            <View style={riskStyles.predictionHeaderLeft}>
              <View style={[riskStyles.riskDot, { backgroundColor: riskColor }]} />
              <View>
                <Text style={riskStyles.predictionTitle}>Early Warning</Text>
                <Text style={riskStyles.predictionSubtitle}>
                  {riskLabel} · {trendLabel}
                </Text>
              </View>
            </View>
            <View style={riskStyles.headerRight}>
              <View style={[riskStyles.riskBadge, { backgroundColor: riskColor + '18' }]}>
                <Text style={[riskStyles.riskBadgeText, { color: riskColor }]}>{currentPrediction.overallRisk}</Text>
              </View>
              {riskExpanded ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
            </View>
          </Pressable>

          {riskExpanded && (
            <View style={riskStyles.predictionBody}>
              <View style={riskStyles.metersRow}>
                <RiskMeter label="Emotional" value={currentPrediction.emotionalRisk} color="#7C8CF8" />
                <RiskMeter label="Behavioral" value={currentPrediction.behavioralRisk} color="#FF9800" />
                <RiskMeter label="Triggers" value={currentPrediction.triggerRisk} color="#EF5350" />
                <RiskMeter label="Stability" value={currentPrediction.stabilityRisk} color="#2EC4B6" />
              </View>
            </View>
          )}

          <View style={riskStyles.reassuringRow}>
            <Heart size={13} color={Colors.primary} />
            <Text style={riskStyles.reassuringText}>{reassuringMessage}</Text>
          </View>
        </View>
      )}

      {criticalAlerts.length > 0 && (
        <View style={riskStyles.alertsContainer}>
          {criticalAlerts.slice(0, 2).map((alert) => (
            <RiskAlertCard
              key={alert.id}
              alert={alert}
              onDismiss={() => dismissRiskAlert(alert.id)}
              onAct={() => {
                actOnAlert(alert.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(alert.route as any);
              }}
            />
          ))}
        </View>
      )}

      {riskMessage && !intervention && (
        <View style={styles.riskAlertCard}>
          <AlertTriangle size={15} color="#FF9800" />
          <Text style={styles.riskAlertText}>{riskMessage}</Text>
        </View>
      )}

      {currentPeriodCheckIn && todayCheckIn ? (
        <View style={checkinExpandStyles.card}>
          <Pressable
            style={checkinExpandStyles.header}
            onPress={() => {
              Haptics.selectionAsync();
              setCheckinExpanded(!checkinExpanded);
            }}
            testID="daily-checkin-cta"
          >
            <View style={styles.checkinLeft}>
              <View style={[styles.checkinIconBg, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
                <Activity size={20} color="#2EC4B6" />
              </View>
              <View style={styles.checkinTextWrap}>
                <View style={checkinExpandStyles.titleRow}>
                  <Text style={styles.checkinTitle}>Start Daily Check-In</Text>
                  <View style={checkinExpandStyles.completedBadge}>
                    <Check size={10} color="#2EC4B6" />
                    <Text style={checkinExpandStyles.completedText}>{todayCheckIns.length}/3</Text>
                  </View>
                </View>
                <Text style={styles.checkinSub}>
                  Stability: {todayCheckIn.stabilityScore} · Mood: {Math.round(todayCheckIn.mood)}%
                </Text>
              </View>
            </View>
            <View style={riskStyles.headerRight}>
              <View style={[styles.checkinBadge, { backgroundColor: todayCheckIn.stabilityScore >= 60 ? 'rgba(46,196,182,0.15)' : 'rgba(255,193,7,0.15)' }]}>
                <Text style={[styles.checkinBadgeText, { color: todayCheckIn.stabilityScore >= 60 ? '#2EC4B6' : '#FFC107' }]}>
                  {todayCheckIn.stabilityScore}
                </Text>
              </View>
              {checkinExpanded ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
            </View>
          </Pressable>

          {checkinExpanded && (
            <View style={checkinExpandStyles.body}>
              <CheckInMeter label="Mood" value={Math.round(todayCheckIn.mood)} color="#FF6B9D" />
              <CheckInMeter label="Cravings" value={Math.round(todayCheckIn.cravingLevel)} color="#FF6B35" />
              <CheckInMeter label="Stress" value={Math.round(todayCheckIn.stress)} color="#FFC107" />
              <CheckInMeter label="Sleep" value={Math.round(todayCheckIn.sleepQuality)} color="#7C8CF8" />
              <CheckInMeter label="Environment" value={Math.round(todayCheckIn.environment)} color="#2EC4B6" />
              <CheckInMeter label="Emotions" value={Math.round(todayCheckIn.emotionalState)} color="#CE93D8" />
            </View>
          )}
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.checkinCard, pressed && styles.pressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/checkin' as any);
          }}
          testID="daily-checkin-cta"
        >
          <View style={styles.checkinLeft}>
            <View style={styles.checkinIconBg}>
              <ClipboardCheck size={20} color="#7C8CF8" />
            </View>
            <View style={styles.checkinTextWrap}>
              <Text style={styles.checkinTitle}>Start Daily Check-In</Text>
              <Text style={styles.checkinSub}>{todayCheckIns.length > 0 ? `${todayCheckIns.length}/3 done — check in now` : 'A gentle, guided check-in for today.'}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [styles.companionCard, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hasFeature('ai_companion')) {
            router.push('/companion-chat' as any);
          } else {
            router.push('/premium-upgrade' as any);
          }
        }}
        testID="companion-chat-cta"
      >
        <LinearGradient
          colors={['#1A3A4B', '#0F2A3A']}
          style={styles.companionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.companionTop}>
            <View style={styles.companionIconWrap}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View style={styles.companionTextWrap}>
              <Text style={styles.companionTitle}>Recovery Companion</Text>
              <Text style={styles.companionSub}>
                {hasFeature('ai_companion')
                  ? `${getStageLabel(recoveryStage)} · ${riskLevel === 'low' ? 'Feeling stable' : riskLevel === 'moderate' ? 'Here if you need me' : "Let's talk"}`
                  : 'Unlock AI-powered guidance'}
              </Text>
            </View>
            {!hasFeature('ai_companion') && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
            <ChevronRight size={18} color={Colors.textMuted} />
          </View>
        </LinearGradient>
      </Pressable>

      {!todayPledge ? (
        <View style={pledgeStyles.card} testID="pledge-cta">
          <Pressable
            style={pledgeStyles.header}
            onPress={() => {
              Haptics.selectionAsync();
              setPledgeExpanded(!pledgeExpanded);
            }}
          >
            <LinearGradient
              colors={['#1A3A4B', '#0F2A3A']}
              style={pledgeStyles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={pledgeStyles.headerContent}>
                <View style={pledgeStyles.headerLeft}>
                  <View style={pledgeStyles.iconBg}>
                    <Shield size={20} color={Colors.primary} />
                  </View>
                  <View style={pledgeStyles.headerTextWrap}>
                    <Text style={pledgeStyles.headerTitle}>Today's Pledge</Text>
                    <Text style={pledgeStyles.headerSub}>
                      Commit to your recovery today
                    </Text>
                  </View>
                </View>
                {pledgeExpanded ? <ChevronUp size={18} color={Colors.textMuted} /> : <ChevronDown size={18} color={Colors.textMuted} />}
              </View>
            </LinearGradient>
          </Pressable>
          {pledgeExpanded && (
            <View style={pledgeStyles.body}>
              <Text style={pledgeStyles.pledgeText}>
                I pledge to stay free from {profile.addictions?.length > 0 ? profile.addictions.join(', ') : 'my addiction'} today
              </Text>
              <Text style={pledgeStyles.moodLabel}>HOW ARE YOU FEELING?</Text>
              <View style={pledgeStyles.moodRow}>
                {MOOD_EMOJIS.map((emoji, index) => (
                  <Pressable
                    key={index}
                    style={[pledgeStyles.moodBtn, pledgeMood === index + 1 && pledgeStyles.moodBtnActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPledgeMood(index + 1);
                    }}
                    testID={`home-pledge-mood-${index + 1}`}
                  >
                    <Text style={pledgeStyles.moodEmoji}>{emoji}</Text>
                    <Text style={[pledgeStyles.moodBtnLabel, pledgeMood === index + 1 && pledgeStyles.moodBtnLabelActive]}>
                      {MOOD_LABELS[index]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [pledgeStyles.pledgeBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                onPress={handleTakePledge}
                testID="home-take-pledge"
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={pledgeStyles.pledgeBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={pledgeStyles.pledgeBtnText}>I Take This Pledge</Text>
                </LinearGradient>
              </Pressable>
              {currentStreak > 0 && (
                <View style={pledgeStyles.streakRow}>
                  <Zap size={14} color={Colors.accent} />
                  <Text style={pledgeStyles.streakText}>{currentStreak} day pledge streak</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.journalCard, pressed && styles.pressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(tabs)/journal' as any);
        }}
        testID="journal-exercises-cta"
      >
        <View style={styles.checkinLeft}>
          <View style={[styles.checkinIconBg, { backgroundColor: 'rgba(124,140,248,0.12)' }]}>
            <BookOpen size={20} color="#7C8CF8" />
          </View>
          <View style={styles.checkinTextWrap}>
            <Text style={styles.checkinTitle}>Journal & Exercises</Text>
            <Text style={styles.checkinSub}>Reflect and build recovery skills</Text>
          </View>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </Pressable>

      {todayPledge && (
        <View style={pledgeStyles.completedCard}>
          <View style={pledgeStyles.completedIcon}>
            <Check size={18} color={Colors.primary} />
          </View>
          <View style={pledgeStyles.completedTextWrap}>
            <Text style={pledgeStyles.completedTitle}>Pledge Complete</Text>
            <Text style={pledgeStyles.completedSub}>
              Feeling {MOOD_LABELS[todayPledge.feeling - 1] ?? 'Good'} · {currentStreak} day streak
            </Text>
          </View>
        </View>
      )}

      {todayMicroWins.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.winsPreviewCard, pressed && styles.pressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/milestones' as any);
          }}
          testID="wins-preview"
        >
          <View style={styles.winsPreviewLeft}>
            <View style={styles.winsPreviewIconBg}>
              <TrendingUp size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.winsPreviewTitle}>
                {todayMicroWins.length} win{todayMicroWins.length !== 1 ? 's' : ''} today
              </Text>
              <Text style={styles.winsPreviewSub}>
                {weeklyWinCount} this week · Growth: {overallGrowthScore}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      )}

      {nextMilestone && (
        <View style={styles.nextMilestoneCard}>
          <Text style={styles.nextMilestoneLabel}>NEXT MILESTONE</Text>
          <Text style={styles.nextMilestoneTitle}>{nextMilestone.title}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${milestoneProgress}%` }]} />
          </View>
          <Text style={styles.nextMilestoneDays}>
            {daysToNext} {daysToNext === 1 ? 'day' : 'days'} remaining
          </Text>
        </View>
      )}

      {profile.motivation ? (
        <View style={styles.motivationCard}>
          <Text style={styles.motivationQuote}>"{profile.motivation}"</Text>
          <Text style={styles.motivationLabel}>Your Motivation</Text>
        </View>
      ) : null}

      {currentStage === 'crisis' && (
        <View style={stageStyles.stageSupportCard}>
          <View style={[stageStyles.stageSupportAccent, { backgroundColor: '#EF5350' }]} />
          <View style={stageStyles.stageSupportContent}>
            <Text style={stageStyles.stageSupportTitle}>Crisis Support Active</Text>
            <Text style={stageStyles.stageSupportDesc}>
              You have extra support around you right now. Calm, safety-focused tools are being gently prioritized while things feel intense.
            </Text>
          </View>
        </View>
      )}

      {currentStage === 'stabilize' && (
        <View style={stageStyles.stageSupportCard}>
          <View style={[stageStyles.stageSupportAccent, { backgroundColor: '#FFB347' }]} />
          <View style={stageStyles.stageSupportContent}>
            <Text style={stageStyles.stageSupportTitle}>Building Stability</Text>
            <Text style={stageStyles.stageSupportDesc}>
              You're finding your footing. Proactive support and regular check-ins are here for you.
            </Text>
          </View>
        </View>
      )}

      <MicroWinToast win={latestWin} onDismiss={() => setLatestWin(null)} />

      <StageTransitionModal
        visible={showTransitionModal}
        transition={pendingTransition}
        stageConfigs={stageConfigs}
        isProgressing={isProgressing}
        onAccept={() => {
          acknowledgeTransition();
          setShowTransitionModal(false);
        }}
        onDismiss={() => {
          dismissTransition();
          setShowTransitionModal(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stageDotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  stageTag: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  stageDaysText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  crisisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF5350',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 48,
  },
  crisisBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  heroSection: {
    marginBottom: 20,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.1)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
  },
  heroStats: {
    flex: 1,
    gap: 10,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  heroStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  heroStatDivider: {
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  heroBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  todayFocusCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.15)',
  },
  todayFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  todayFocusIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayFocusLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 2,
  },
  todayFocusTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 24,
  },
  todayFocusDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  todayFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  todayFocusBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  stageTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  stageTaskRowDone: {
    opacity: 0.7,
  },
  stageTaskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stageTaskCheckDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stageTaskTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  stageTaskDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stageTaskTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  stageTaskTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  stageStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  stageStreakText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  encouragementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,213,79,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,213,79,0.12)',
  },
  encouragementText: {
    flex: 1,
    fontSize: 13,
    color: '#FFD54F',
    fontWeight: '500' as const,
    lineHeight: 19,
    fontStyle: 'italic' as const,
  },
  interventionCard: {
    backgroundColor: 'rgba(255,152,0,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,152,0,0.15)',
  },
  interventionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  interventionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,152,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  interventionTextWrap: {
    flex: 1,
  },
  interventionMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  interventionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 48,
  },
  interventionActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF9800',
  },
  riskAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,152,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,152,0,0.12)',
  },
  riskAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500' as const,
    lineHeight: 19,
  },
  checkinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    minHeight: 72,
  },
  journalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    minHeight: 72,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  checkinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkinIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(124,140,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinTextWrap: {
    flex: 1,
  },
  checkinTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  checkinSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkinBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinBadgeText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  companionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  companionGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  companionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46,196,182,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.25)',
  },
  companionTextWrap: {
    flex: 1,
  },
  companionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  companionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  proBadge: {
    backgroundColor: 'rgba(212,165,116,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#D4A574',
    letterSpacing: 0.5,
  },
  pledgeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  pledgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    minHeight: 72,
  },
  pledgeContent: {
    flex: 1,
  },
  pledgeTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  pledgeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  pledgeCompletedCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.3)',
  },
  pledgeCompletedIcon: {
    fontSize: 24,
    color: Colors.primary,
    width: 42,
    height: 42,
    lineHeight: 42,
    textAlign: 'center',
    backgroundColor: 'rgba(46,196,182,0.15)',
    borderRadius: 21,
    overflow: 'hidden',
  },
  pledgeCompletedTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  pledgeCompletedSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  winsPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.primary + '25',
    minHeight: 64,
  },
  winsPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  winsPreviewIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winsPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  winsPreviewSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  nextMilestoneCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  nextMilestoneLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  nextMilestoneTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  nextMilestoneDays: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  motivationCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  motivationQuote: {
    fontSize: 15,
    color: Colors.text,
    fontStyle: 'italic' as const,
    lineHeight: 22,
    marginBottom: 8,
  },
  motivationLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  winToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A4B',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFD54F30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  winToastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD54F18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winToastText: {
    flex: 1,
  },
  winToastTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFD54F',
    marginBottom: 1,
  },
  winToastDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

const riskStyles = StyleSheet.create({
  predictionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 64,
  },
  predictionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  predictionSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskBadgeText: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  predictionBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  metersRow: {
    gap: 10,
  },
  meterItem: {
    gap: 4,
  },
  meterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  meterValue: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  meterTrack: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: 5,
    borderRadius: 3,
  },
  reassuringRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  reassuringText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    fontStyle: 'italic' as const,
  },
  alertsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  alertTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  alertIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  alertMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  alertDismiss: {
    padding: 6,
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});

const checkinExpandStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(46,196,182,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#2EC4B6',
    letterSpacing: 0.3,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
    gap: 10,
  },
});

const stageStyles = StyleSheet.create({
  stageSupportCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  stageSupportAccent: {
    width: 4,
  },
  stageSupportContent: {
    flex: 1,
    padding: 14,
  },
  stageSupportTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  stageSupportDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

const pledgeStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  header: {
    overflow: 'hidden',
    borderRadius: 17,
  },
  headerGradient: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(46,196,182,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.25)',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  body: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  pledgeText: {
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    fontStyle: 'italic' as const,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 18,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  moodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.1)',
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodBtnLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  moodBtnLabelActive: {
    color: Colors.primary,
  },
  pledgeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  pledgeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  pledgeBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.25)',
  },
  completedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(46,196,182,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTextWrap: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  completedSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
