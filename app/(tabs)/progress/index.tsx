import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import {
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Heart,
  Brain,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Minus,
  Activity,
  ChevronRight,
  Eye,
  AlertTriangle,
  Moon,
  Sun,
  Sunset,
  CloudMoon,
  Check,
  Trophy,
  Crown,
  Gem,
  Medal,
  Infinity,
  Mountain,
  Star,
  Award,
  Flame,
  Sunrise,
  Lock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useAppStore } from '@/stores/useAppStore';
import { useRelapse } from '@/core/domains/useRelapse';
import { usePledges } from '@/core/domains/usePledges';
import { useRebuild } from '@/core/domains/useRebuild';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { PremiumSectionOverlay } from '@/components/PremiumGate';
import { getStabilityPhrase, getMoodPhrase, getCravingsPhrase } from '@/constants/emotionalRisk';
import { MILESTONE_DATA } from '@/constants/milestones';
import {
  buildProgressStabilitySeries,
  buildDailyAverageStabilitySeries,
  computeDailyAverageScoreForDate,
  countNonNullScores,
  type StabilityWindowDays,
} from '@/utils/progressStabilitySeries';
import { StabilityRollingChart } from '@/components/progress/StabilityRollingChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 72;
const CHART_HEIGHT = 112;

const RECOVERY_STAGES = [
  { minDays: 0, label: 'Withdrawal', color: '#EF5350', desc: 'Your body is adjusting. Every hour counts.' },
  { minDays: 3, label: 'Early Abstinence', color: '#FF9800', desc: 'Building new patterns. Stay close to support.' },
  { minDays: 14, label: 'Protracted Abstinence', color: '#FFC107', desc: 'Deeper healing underway. Keep going.' },
  { minDays: 30, label: 'Stabilization', color: '#66BB6A', desc: 'New habits forming. You are getting stronger.' },
  { minDays: 90, label: 'Early Recovery', color: '#26A69A', desc: 'Real change is taking hold. Trust the process.' },
  { minDays: 180, label: 'Sustained Recovery', color: '#2EC4B6', desc: 'Growth is compounding. You are transforming.' },
  { minDays: 365, label: 'Advanced Recovery', color: '#42A5F5', desc: 'A new life is unfolding. Inspire others.' },
];

const REINFORCEMENT_MESSAGES = [
  "Every single day you choose yourself is a victory.",
  "You are rewriting your story, one brave moment at a time.",
  "The strength you show today builds the life you deserve tomorrow.",
  "Progress isn't always visible - but it's always happening inside you.",
  "You've already survived 100% of your hardest days.",
  "Healing isn't linear, but you're on the right path.",
  "The person you're becoming is worth every effort.",
  "Your courage to keep going is extraordinary.",
  "Small steps still move you forward.",
  "You are more resilient than you know.",
];

function getRecoveryStage(days: number) {
  let stage = RECOVERY_STAGES[0];
  for (const s of RECOVERY_STAGES) {
    if (days >= s.minDays) stage = s;
  }
  const nextIdx = RECOVERY_STAGES.indexOf(stage) + 1;
  const next = nextIdx < RECOVERY_STAGES.length ? RECOVERY_STAGES[nextIdx] : null;
  const progress = next
    ? Math.min((days - stage.minDays) / (next.minDays - stage.minDays), 1)
    : 1;
  return { ...stage, progress, nextStage: next };
}

function getReinforcementMessage(days: number): string {
  return REINFORCEMENT_MESSAGES[days % REINFORCEMENT_MESSAGES.length];
}

function computeTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const recent = values.slice(0, Math.min(3, values.length));
  const older = values.slice(Math.min(3, values.length), Math.min(7, values.length));
  if (older.length === 0) return 'stable';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (Math.abs(diff) < 3) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

const TRIGGER_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TRIGGER_TIME_BLOCKS = [
  { label: 'Morning', key: 'morning', icon: Sun, hours: [6, 7, 8, 9, 10, 11] },
  { label: 'Afternoon', key: 'afternoon', icon: Sunset, hours: [12, 13, 14, 15, 16, 17] },
  { label: 'Evening', key: 'evening', icon: CloudMoon, hours: [18, 19, 20, 21] },
  { label: 'Night', key: 'night', icon: Moon, hours: [22, 23, 0, 1, 2, 3, 4, 5] },
] as const;

const HEAT_COLORS = [
  'rgba(46, 196, 182, 0.08)',
  'rgba(46, 196, 182, 0.2)',
  'rgba(255, 193, 7, 0.35)',
  'rgba(255, 107, 53, 0.5)',
  'rgba(239, 83, 80, 0.7)',
];

function getHeatLevel(value: number): number {
  if (value <= 20) return 0;
  if (value <= 40) return 1;
  if (value <= 60) return 2;
  if (value <= 80) return 3;
  return 4;
}

interface TriggerHeatmapData {
  [dayIndex: number]: {
    [timeBlock: string]: number;
  };
}

interface TriggerPatternInsight {
  id: string;
  type: 'warning' | 'pattern' | 'positive';
  title: string;
  description: string;
}

const EARLY_ENCOURAGEMENT: Record<string, string> = {
  'day1': "Every journey starts with a single step. You've taken yours.",
  'day2-3': "The hardest days are the first ones. You're still here.",
  'day4-7': "A week is within reach. Each day you show up, you're rewriting your story.",
};

function getEarlyEncouragement(daysSober: number): string {
  if (daysSober <= 1) return EARLY_ENCOURAGEMENT['day1'];
  if (daysSober <= 3) return EARLY_ENCOURAGEMENT['day2-3'];
  return EARLY_ENCOURAGEMENT['day4-7'];
}

function getStabilityStatusLabel(score: number): string {
  if (score >= 70) return 'Steady';
  if (score >= 50) return 'Guarded';
  if (score >= 30) return 'Fragile';
  return 'High Risk';
}

const WINDOW_OPTIONS: StabilityWindowDays[] = [7, 14, 30];
const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  sunrise: Sunrise,
  flame: Flame,
  shield: Shield,
  star: Star,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
  medal: Medal,
  infinity: Infinity,
  mountain: Mountain,
  sun: Sun,
};

function formatLocalDateYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ProgressStabilityChartCard({
  windowDays,
  onChangeWindow,
  title,
  showSectionLabel = true,
  dates,
  scores,
  pointCount,
  planCompletedSet,
  currentScore,
  lineColor,
  trendLineColor,
  emptyTimeLabel,
}: {
  windowDays: StabilityWindowDays;
  onChangeWindow: (d: StabilityWindowDays) => void;
  title: string;
  showSectionLabel?: boolean;
  dates: string[];
  scores: (number | null)[];
  pointCount: number;
  planCompletedSet: Set<string>;
  currentScore: number | null;
  lineColor: string;
  trendLineColor?: string;
  emptyTimeLabel: string;
}) {
  return (
    <View testID="progress-stability-chart-card">
      {showSectionLabel ? <Text style={styles.chartBlockSectionLabel}>Rolling stability</Text> : null}
      <View style={styles.chartCard}>
        <View style={styles.chartTitleRow}>
          <Text style={styles.chartTitleMornings}>{title}</Text>
          <Text style={styles.chartCurrentScoreLine}>
            Stability Score{' '}
            <Text style={styles.chartCurrentScoreValue}>
              {currentScore != null && Number.isFinite(currentScore) ? String(Math.round(currentScore)) : '—'}
            </Text>
          </Text>
        </View>
      <View style={styles.chartWindowRow}>
        {WINDOW_OPTIONS.map((d) => {
          const active = windowDays === d;
          return (
            <Pressable
              key={d}
              onPress={() => {
                Haptics.selectionAsync();
                onChangeWindow(d);
              }}
              style={[styles.chartWindowChip, active && styles.chartWindowChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${d} day chart`}
            >
              <Text style={[styles.chartWindowChipText, active && styles.chartWindowChipTextActive]}>{d}d</Text>
            </Pressable>
          );
        })}
      </View>
      {pointCount >= 2 && dates.length >= 2 ? (
        <StabilityRollingChart
          dates={dates}
          scores={scores}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          color={lineColor}
          trendLineColor={trendLineColor}
          planCompletedSet={planCompletedSet}
          windowDays={windowDays}
        />
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>
            Complete {emptyTimeLabel} check-ins on at least two days to see stability over time.
          </Text>
        </View>
      )}
      </View>
    </View>
  );
}

function StabilityTimelineScreen() {
  const router = useRouter();
  const { pledges } = usePledges();
  const { rebuildData } = useRebuild();
  const { profile, daysSober } = useUser();
  const { checkIns } = useCheckin();
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const centralProgress = useAppStore((s) => s.progress);
  const { timelineEvents } = useRelapse();
  const { trendLabel: riskTrendLabel, timeOfDayRisk } = useRiskPrediction();

  const sourceCheckIns = useMemo(
    () => (centralDailyCheckIns.length > 0 ? centralDailyCheckIns : checkIns),
    [centralDailyCheckIns, checkIns],
  );

  const [stabilityWindowDays, setStabilityWindowDays] = useState<StabilityWindowDays>(14);
  const [milestonesExpanded, setMilestonesExpanded] = useState<boolean>(false);
  const [selectedMomentumMetric, setSelectedMomentumMetric] = useState<null | 'change' | 'plans' | 'crisis' | 'setbacks'>(null);

  const stabilitySeries = useMemo(
    () =>
      buildProgressStabilitySeries(sourceCheckIns, stabilityWindowDays, { timeOfDay: 'morning' }),
    [sourceCheckIns, stabilityWindowDays],
  );
  const afternoonStabilitySeries = useMemo(
    () =>
      buildProgressStabilitySeries(sourceCheckIns, stabilityWindowDays, { timeOfDay: 'afternoon' }),
    [sourceCheckIns, stabilityWindowDays],
  );
  const eveningStabilitySeries = useMemo(
    () =>
      buildProgressStabilitySeries(sourceCheckIns, stabilityWindowDays, { timeOfDay: 'evening' }),
    [sourceCheckIns, stabilityWindowDays],
  );
  const dailyAverageStabilitySeries = useMemo(
    () => buildDailyAverageStabilitySeries(sourceCheckIns, stabilityWindowDays),
    [sourceCheckIns, stabilityWindowDays],
  );

  const stabilityPointCount = useMemo(
    () => countNonNullScores(stabilitySeries.scores),
    [stabilitySeries.scores],
  );
  const afternoonStabilityPointCount = useMemo(
    () => countNonNullScores(afternoonStabilitySeries.scores),
    [afternoonStabilitySeries.scores],
  );
  const eveningStabilityPointCount = useMemo(
    () => countNonNullScores(eveningStabilitySeries.scores),
    [eveningStabilitySeries.scores],
  );
  const dailyAveragePointCount = useMemo(
    () => countNonNullScores(dailyAverageStabilitySeries.scores),
    [dailyAverageStabilitySeries.scores],
  );

  const todayMorningScore = useMemo(() => {
    const todayStr = formatLocalDateYYYYMMDD(new Date());
    const todays = sourceCheckIns.filter(
      (c) => c.date === todayStr && c.timeOfDay === 'morning',
    );
    if (todays.length === 0) return null;
    const best = todays.reduce((a, b) => (a.completedAt >= b.completedAt ? a : b));
    const raw = best.stabilityScore;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    return Math.min(100, Math.max(0, raw));
  }, [sourceCheckIns]);
  const todayAfternoonScore = useMemo(() => {
    const todayStr = formatLocalDateYYYYMMDD(new Date());
    const todays = sourceCheckIns.filter(
      (c) => c.date === todayStr && c.timeOfDay === 'afternoon',
    );
    if (todays.length === 0) return null;
    const best = todays.reduce((a, b) => (a.completedAt >= b.completedAt ? a : b));
    const raw = best.stabilityScore;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    return Math.min(100, Math.max(0, raw));
  }, [sourceCheckIns]);
  const todayEveningScore = useMemo(() => {
    const todayStr = formatLocalDateYYYYMMDD(new Date());
    const todays = sourceCheckIns.filter(
      (c) => c.date === todayStr && c.timeOfDay === 'evening',
    );
    if (todays.length === 0) return null;
    const best = todays.reduce((a, b) => (a.completedAt >= b.completedAt ? a : b));
    const raw = best.stabilityScore;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    return Math.min(100, Math.max(0, raw));
  }, [sourceCheckIns]);
  const todayDailyAverageScore = useMemo(
    () =>
      computeDailyAverageScoreForDate(sourceCheckIns, formatLocalDateYYYYMMDD(new Date())),
    [sourceCheckIns],
  );

  const dailyPlansCompleted = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      const hasCheckIn = sourceCheckIns.some(c => c.date === dateStr);
      const hasPledge = pledges.some(p => p.date === dateStr);
      if (hasCheckIn || hasPledge) count++;
    }
    return count;
  }, [sourceCheckIns, pledges]);

  const relapseCount = centralProgress.relapseCount ?? (profile.recoveryProfile?.relapseCount ?? 0);
  const crisisActivationsCount = useMemo(() => {
    return timelineEvents.filter((e) => e.type === 'crisis_activation').length;
  }, [timelineEvents]);

  const sevenDayChange = useMemo(() => {
    const scores = [...sourceCheckIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7).map(c => c.stabilityScore);
    if (scores.length < 2) return 0;
    const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
    const older = scores.slice(3, 7);
    if (older.length === 0) return 0;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return Math.round(recent - olderAvg);
  }, [sourceCheckIns]);

  const weeklyPlansCompleted = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      if (sourceCheckIns.some(c => c.date === dateStr) || pledges.some(p => p.date === dateStr)) count++;
    }
    return count;
  }, [sourceCheckIns, pledges]);

  const rebuildActionsCount = useMemo(() => rebuildData.habits.reduce((s, h) => s + (h.streak || 0), 0), [rebuildData.habits]);

  const consistentCheckInDays = useMemo(() => {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const has = sourceCheckIns.some(c => c.date === dateStr) || pledges.some(p => p.date === dateStr);
      if (has) streak++;
      else break;
    }
    return streak;
  }, [sourceCheckIns, pledges]);

  const badge7CheckIns = consistentCheckInDays >= 7;
  const badge14NoCrisis = consistentCheckInDays >= 14 || crisisActivationsCount === 0;
  const badge10Rebuild = rebuildActionsCount >= 10;
  const nextMilestone = useMemo(() => MILESTONE_DATA.find(m => m.days > daysSober), [daysSober]);
  const unlockedCount = useMemo(() => MILESTONE_DATA.filter(m => m.days <= daysSober).length, [daysSober]);

  const weeklyInsights = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];

    const recentCheckIns = sourceCheckIns
      .filter(c => c.date >= startStr && c.date <= endStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stabilityValues = recentCheckIns.map(c => c.stabilityScore);
    const stabilityTrend = stabilityValues.length > 0 ? computeTrend(stabilityValues) : 'stable';

    const weeklyPledges = pledges.filter(p => p.date >= startStr && p.date <= endStr);
    const completedActions = recentCheckIns.length + weeklyPledges.length;

    const tagCounts: Record<string, number> = {};
    for (const ci of recentCheckIns) {
      if (!ci.emotionalTags) continue;
      for (const tag of ci.emotionalTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    let topEmotionTag: string | null = null;
    let topEmotionCount = 0;
    for (const [tag, count] of Object.entries(tagCounts)) {
      if (count > topEmotionCount) {
        topEmotionTag = tag;
        topEmotionCount = count;
      }
    }

    const emotionLabel = topEmotionTag
      ? topEmotionTag === 'anxious'
        ? 'anxiety'
        : topEmotionTag === 'lonely'
          ? 'loneliness'
          : topEmotionTag === 'ashamed'
            ? 'shame'
            : topEmotionTag === 'angry'
              ? 'anger'
              : topEmotionTag === 'hopeful'
                ? 'hope'
                : 'feeling numb'
      : null;
    const riskEmotionLabel = topEmotionTag && topEmotionTag !== 'hopeful' ? emotionLabel : null;

    const period = timeOfDayRisk?.highRiskPeriod;
    const periodLabel =
      period === 'night'
        ? 'late nights'
        : period === 'evening'
          ? 'evenings'
          : period === 'afternoon'
            ? 'afternoons'
            : period === 'morning'
              ? 'mornings'
              : null;

    const stabilitySentence =
      stabilityTrend === 'up'
        ? 'Your stability improved this week.'
        : stabilityTrend === 'down'
          ? 'Your stability dipped this week - that awareness matters.'
          : 'Your stability held fairly steady this week.';

    let triggerSentence = '';
    if (riskEmotionLabel && periodLabel) {
      triggerSentence = `${riskEmotionLabel.charAt(0).toUpperCase() + riskEmotionLabel.slice(1)} and ${periodLabel} were your most common triggers.`;
    } else if (riskEmotionLabel) {
      triggerSentence = `${riskEmotionLabel.charAt(0).toUpperCase() + riskEmotionLabel.slice(1)} was your most common trigger.`;
    } else if (periodLabel) {
      triggerSentence = `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} were your most vulnerable times.`;
    } else {
      triggerSentence = 'You did not record clear trigger patterns yet - keep logging check-ins.';
    }

    const riskSentence =
      riskTrendLabel && riskTrendLabel.length > 0
        ? `Relapse risk was ${riskTrendLabel.toLowerCase().trim()} overall.`
        : '';

    const actionsSentence =
      completedActions > 0
        ? `You completed ${completedActions} recovery actions.`
        : 'You can strengthen next week by completing a few small recovery actions.';

    const narrativeParts = [stabilitySentence, triggerSentence, riskSentence, actionsSentence].filter(Boolean);

    return {
      stabilityTrend,
      relapseRiskTrendLabel: riskTrendLabel || 'Stable',
      topEmotionTrigger: emotionLabel,
      highRiskTimeLabel: periodLabel,
      completedActions,
      narrative: narrativeParts.join(' '),
    };
  }, [sourceCheckIns, pledges, timeOfDayRisk, riskTrendLabel]);

  const planCompletedSet = useMemo(() => {
    const set = new Set<string>();
    sourceCheckIns.forEach(c => set.add(c.date));
    pledges.forEach(p => set.add(p.date));
    return set;
  }, [sourceCheckIns, pledges]);

  const uniqueCheckInDays = useMemo(() => {
    return new Set(sourceCheckIns.map((c) => c.date)).size;
  }, [sourceCheckIns]);

  const momentumDetails = useMemo(() => {
    const sortedRecent = [...sourceCheckIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentScores = sortedRecent.slice(0, 7).map(c => c.stabilityScore);
    const recentBucket = recentScores.slice(0, 3);
    const olderBucket = recentScores.slice(3, 7);
    const recentAvg = recentBucket.length > 0 ? recentBucket.reduce((a, b) => a + b, 0) / recentBucket.length : null;
    const olderAvg = olderBucket.length > 0 ? olderBucket.reduce((a, b) => a + b, 0) / olderBucket.length : null;
    const weeklyCheckInDays = new Set<string>();
    const weeklyPledgeDays = new Set<string>();
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      if (sourceCheckIns.some(c => c.date === dateStr)) weeklyCheckInDays.add(dateStr);
      if (pledges.some(p => p.date === dateStr)) weeklyPledgeDays.add(dateStr);
    }
    const crisisEvents = timelineEvents.filter((e) => e.type === 'crisis_activation');
    return {
      changeText:
        recentAvg != null && olderAvg != null
          ? `Based on ${recentBucket.length} recent check-ins (avg ${Math.round(recentAvg)}) compared with ${olderBucket.length} older check-ins (avg ${Math.round(olderAvg)}).`
          : 'Not enough check-ins yet to compare recent and older periods.',
      plansText: `${weeklyCheckInDays.size} days with check-ins + ${weeklyPledgeDays.size} days with pledges over the last 7 days (unique days total: ${weeklyPlansCompleted}).`,
      crisisText: `${crisisEvents.length} total crisis activation events recorded in your timeline.`,
      setbacksText: `${relapseCount} total setbacks recorded in your profile progress.`,
    };
  }, [sourceCheckIns, pledges, timelineEvents, weeklyPlansCompleted, relapseCount]);

  const isEarlyDays = uniqueCheckInDays < 7;

  const latestScore = useMemo(() => {
    if (sourceCheckIns.length === 0) return 50;
    const sorted = [...sourceCheckIns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return sorted[0].stabilityScore;
  }, [sourceCheckIns]);

  if (isEarlyDays) {
    const soberDate = new Date(profile.soberDate);
    const formattedSoberDate = soberDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <ScreenScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="stability-timeline-screen"
      >
        {/* Status header */}
        <View style={earlyStyles.statusHeader}>
          <Text style={earlyStyles.statusLabel}>
            Your stability is{' '}
            <Text style={{ color: Colors.primary }}>
              {getStabilityStatusLabel(latestScore)}
            </Text>
          </Text>
        </View>

        {/* Hero */}
        <View style={earlyStyles.heroCard}>
          <Text style={earlyStyles.heroTitle}>Your recovery journey has begun</Text>
          <Text style={earlyStyles.heroDays}>{daysSober}</Text>
          <Text style={earlyStyles.heroDaysCaption}>Days Completed</Text>
          <Text style={earlyStyles.heroSub}>
            Since {formattedSoberDate}
          </Text>
        </View>

        {/* Encouragement */}
        <View style={earlyStyles.encouragementCard}>
          <Heart size={18} color={Colors.primary} />
          <Text style={earlyStyles.encouragementText}>
            {getEarlyEncouragement(daysSober)}
          </Text>
        </View>

        <Text style={earlyStyles.sectionTitle}>Your stability progress so far</Text>

        <ProgressStabilityChartCard
          windowDays={stabilityWindowDays}
          onChangeWindow={setStabilityWindowDays}
          title="Mornings"
          showSectionLabel
          dates={stabilitySeries.dates}
          scores={stabilitySeries.scores}
          pointCount={stabilityPointCount}
          planCompletedSet={planCompletedSet}
          currentScore={todayMorningScore}
          lineColor={Colors.primary}
          emptyTimeLabel="morning"
        />
        <ProgressStabilityChartCard
          windowDays={stabilityWindowDays}
          onChangeWindow={setStabilityWindowDays}
          title="Afternoons"
          showSectionLabel={false}
          dates={afternoonStabilitySeries.dates}
          scores={afternoonStabilitySeries.scores}
          pointCount={afternoonStabilityPointCount}
          planCompletedSet={planCompletedSet}
          currentScore={todayAfternoonScore}
          lineColor="#FF9800"
          trendLineColor="rgba(255, 152, 0, 0.55)"
          emptyTimeLabel="afternoon"
        />
        <ProgressStabilityChartCard
          windowDays={stabilityWindowDays}
          onChangeWindow={setStabilityWindowDays}
          title="Evenings"
          showSectionLabel={false}
          dates={eveningStabilitySeries.dates}
          scores={eveningStabilitySeries.scores}
          pointCount={eveningStabilityPointCount}
          planCompletedSet={planCompletedSet}
          currentScore={todayEveningScore}
          lineColor="#EF5350"
          trendLineColor="rgba(239, 83, 80, 0.55)"
          emptyTimeLabel="evening"
        />
        <ProgressStabilityChartCard
          windowDays={stabilityWindowDays}
          onChangeWindow={setStabilityWindowDays}
          title="Daily Average"
          showSectionLabel={false}
          dates={dailyAverageStabilitySeries.dates}
          scores={dailyAverageStabilitySeries.scores}
          pointCount={dailyAveragePointCount}
          planCompletedSet={planCompletedSet}
          currentScore={todayDailyAverageScore}
          lineColor="#0D47A1"
          trendLineColor="rgba(13, 71, 161, 0.55)"
          emptyTimeLabel="Morning, afternoon, or evening"
        />

        <View style={earlyStyles.reinforcementCard}>
          <Sparkles size={16} color={Colors.primary} />
          <Text style={earlyStyles.reinforcementText}>
            {getReinforcementMessage(daysSober)}
          </Text>
        </View>

        <View style={styles.milestonesSection}>
          <View style={styles.milestonesDivider}>
            <View style={styles.milestonesDividerLine} />
            <Text style={styles.milestonesDividerLabel}>MILESTONES</Text>
            <View style={styles.milestonesDividerLine} />
          </View>
          <View style={styles.milestonesSectionHeader}>
            <View style={styles.milestonesTitleRow}>
              <Trophy size={18} color={Colors.primary} />
              <Text style={styles.milestonesSectionTitle}>Milestones</Text>
            </View>
            <Text style={styles.milestonesSubtitle}>
              {unlockedCount}/{MILESTONE_DATA.length} unlocked
              {nextMilestone ? ` · ${nextMilestone.days - daysSober}d to next` : ''}
            </Text>
          </View>

          {(milestonesExpanded ? MILESTONE_DATA : MILESTONE_DATA.slice(0, 4)).map((milestone, index, arr) => {
            const unlocked = daysSober >= milestone.days;
            const IconComponent = ICON_MAP[milestone.icon] ?? Star;
            const progress = unlocked ? 1 : Math.min(daysSober / milestone.days, 1);
            return (
              <View key={milestone.days} style={styles.msCard} testID={`progress-milestone-${milestone.days}`}>
                <View style={styles.msLeft}>
                  <View style={[styles.msIconContainer, unlocked ? styles.msIconUnlocked : styles.msIconLocked]}>
                    {unlocked ? <IconComponent size={18} color={Colors.white} /> : <Lock size={14} color={Colors.textMuted} />}
                  </View>
                  {index < arr.length - 1 && (
                    <View style={[styles.msConnector, unlocked && styles.msConnectorUnlocked]} />
                  )}
                </View>
                <View style={styles.msRight}>
                  <View style={styles.msHeader}>
                    <Text style={[styles.msTitle, !unlocked && styles.msTextLocked]}>{milestone.title}</Text>
                    <Text style={[styles.msDays, unlocked && styles.msDaysUnlocked]}>{milestone.days}d</Text>
                  </View>
                  <Text style={[styles.msDesc, !unlocked && styles.msTextLocked]} numberOfLines={2}>
                    {milestone.description}
                  </Text>
                  {!unlocked && (
                    <View style={styles.msProgressContainer}>
                      <View style={styles.msProgressBg}>
                        <View style={[styles.msProgressFill, { width: `${progress * 100}%` }]} />
                      </View>
                    </View>
                  )}
                  {unlocked && <Text style={styles.msUnlockedText}>Achieved</Text>}
                </View>
              </View>
            );
          })}

          <Pressable
            style={styles.msToggle}
            onPress={() => {
              Haptics.selectionAsync();
              setMilestonesExpanded(!milestonesExpanded);
            }}
            testID="progress-toggle-milestones"
          >
            {milestonesExpanded ? (
              <ChevronUp size={16} color={Colors.primary} />
            ) : (
              <ChevronDown size={16} color={Colors.primary} />
            )}
            <Text style={styles.msToggleText}>
              {milestonesExpanded ? 'Show Less' : `Show All ${MILESTONE_DATA.length} Milestones`}
            </Text>
          </Pressable>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="stability-timeline-screen"
    >
      {/* Status header */}
      <View style={earlyStyles.statusHeader}>
        <Text style={earlyStyles.statusLabel}>
          Your stability is{' '}
          <Text style={{ color: Colors.primary }}>
            {getStabilityStatusLabel(latestScore)}
          </Text>
        </Text>
      </View>

      <View style={styles.taglineCard}>
        <Text style={styles.tagline}>You are building stability.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Weekly Recovery Insights</Text>
        <Text style={styles.summaryLabel}>{weeklyInsights.narrative}</Text>
      </View>

      <ProgressStabilityChartCard
        windowDays={stabilityWindowDays}
        onChangeWindow={setStabilityWindowDays}
        title="Mornings"
        showSectionLabel
        dates={stabilitySeries.dates}
        scores={stabilitySeries.scores}
        pointCount={stabilityPointCount}
        planCompletedSet={planCompletedSet}
        currentScore={todayMorningScore}
        lineColor={Colors.primary}
        emptyTimeLabel="morning"
      />
      <ProgressStabilityChartCard
        windowDays={stabilityWindowDays}
        onChangeWindow={setStabilityWindowDays}
        title="Afternoons"
        showSectionLabel={false}
        dates={afternoonStabilitySeries.dates}
        scores={afternoonStabilitySeries.scores}
        pointCount={afternoonStabilityPointCount}
        planCompletedSet={planCompletedSet}
        currentScore={todayAfternoonScore}
        lineColor="#FF9800"
        trendLineColor="rgba(255, 152, 0, 0.55)"
        emptyTimeLabel="afternoon"
      />
      <ProgressStabilityChartCard
        windowDays={stabilityWindowDays}
        onChangeWindow={setStabilityWindowDays}
        title="Evenings"
        showSectionLabel={false}
        dates={eveningStabilitySeries.dates}
        scores={eveningStabilitySeries.scores}
        pointCount={eveningStabilityPointCount}
        planCompletedSet={planCompletedSet}
        currentScore={todayEveningScore}
        lineColor="#EF5350"
        trendLineColor="rgba(239, 83, 80, 0.55)"
        emptyTimeLabel="evening"
      />
      <ProgressStabilityChartCard
        windowDays={stabilityWindowDays}
        onChangeWindow={setStabilityWindowDays}
        title="Daily Average"
        showSectionLabel={false}
        dates={dailyAverageStabilitySeries.dates}
        scores={dailyAverageStabilitySeries.scores}
        pointCount={dailyAveragePointCount}
        planCompletedSet={planCompletedSet}
        currentScore={todayDailyAverageScore}
        lineColor="#0D47A1"
        trendLineColor="rgba(13, 71, 161, 0.55)"
        emptyTimeLabel="Morning, afternoon, or evening"
      />

      <View style={styles.momentumCard}>
        <Text style={styles.momentumTitle}>Momentum summary</Text>
        <View style={styles.momentumRow}>
          <Pressable style={({ pressed }) => [styles.momentumItem, pressed && styles.momentumItemPressed]} onPress={() => setSelectedMomentumMetric('change')}>
            <Text style={styles.momentumValue}>{sevenDayChange >= 0 ? '+' : ''}{sevenDayChange}</Text>
            <Text style={styles.momentumLabel}>7-day change</Text>
          </Pressable>
          <View style={styles.momentumDivider} />
          <Pressable style={({ pressed }) => [styles.momentumItem, pressed && styles.momentumItemPressed]} onPress={() => setSelectedMomentumMetric('plans')}>
            <Text style={styles.momentumValue}>{weeklyPlansCompleted}</Text>
            <Text style={styles.momentumLabel}>Weekly plans completed</Text>
          </Pressable>
        </View>
        <View style={styles.momentumRow}>
          <Pressable style={({ pressed }) => [styles.momentumItem, pressed && styles.momentumItemPressed]} onPress={() => setSelectedMomentumMetric('crisis')}>
            <Text style={styles.momentumValue}>{crisisActivationsCount}</Text>
            <Text style={styles.momentumLabel}>Crisis activations</Text>
          </Pressable>
          <View style={styles.momentumDivider} />
          <Pressable style={({ pressed }) => [styles.momentumItem, pressed && styles.momentumItemPressed]} onPress={() => setSelectedMomentumMetric('setbacks')}>
            <Text style={styles.momentumValue}>{relapseCount}</Text>
            <Text style={styles.momentumLabel}>Setbacks (total)</Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={selectedMomentumMetric !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMomentumMetric(null)}
      >
        <Pressable style={styles.momentumModalBackdrop} onPress={() => setSelectedMomentumMetric(null)}>
          <Pressable style={styles.momentumModalCard} onPress={() => {}}>
            <Text style={styles.momentumModalTitle}>
              {selectedMomentumMetric === 'change'
                ? '7-day change'
                : selectedMomentumMetric === 'plans'
                  ? 'Weekly plans completed'
                  : selectedMomentumMetric === 'crisis'
                    ? 'Crisis activations'
                    : 'Setbacks (total)'}
            </Text>
            <Text style={styles.momentumModalBody}>
              {selectedMomentumMetric === 'change'
                ? momentumDetails.changeText
                : selectedMomentumMetric === 'plans'
                  ? momentumDetails.plansText
                  : selectedMomentumMetric === 'crisis'
                    ? momentumDetails.crisisText
                    : momentumDetails.setbacksText}
            </Text>
            <Pressable style={styles.momentumModalClose} onPress={() => setSelectedMomentumMetric(null)}>
              <Text style={styles.momentumModalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.badgesCard}>
        <Text style={styles.badgesTitle}>Milestones</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badgeIcon, badge7CheckIns && styles.badgeUnlocked]}>
            <Activity size={20} color={badge7CheckIns ? '#4CAF50' : Colors.textMuted} />
          </View>
          <Text style={styles.badgeLabel}>7 days consistent check-ins</Text>
          {badge7CheckIns ? <Text style={styles.badgeDone}>Done</Text> : <Text style={styles.badgeCount}>{consistentCheckInDays}/7</Text>}
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badgeIcon, badge14NoCrisis && styles.badgeUnlocked]}>
            <Shield size={20} color={badge14NoCrisis ? '#4CAF50' : Colors.textMuted} />
          </View>
          <Text style={styles.badgeLabel}>14 days without crisis activation</Text>
          {badge14NoCrisis ? <Text style={styles.badgeDone}>Done</Text> : <Text style={styles.badgeCount}>Building</Text>}
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badgeIcon, badge10Rebuild && styles.badgeUnlocked]}>
            <Zap size={20} color={badge10Rebuild ? '#4CAF50' : Colors.textMuted} />
          </View>
          <Text style={styles.badgeLabel}>10 rebuild actions completed</Text>
          {badge10Rebuild ? <Text style={styles.badgeDone}>Done</Text> : <Text style={styles.badgeCount}>{rebuildActionsCount}/10</Text>}
        </View>
      </View>

      <Pressable
        style={styles.detectionLink}
        onPress={() => { Haptics.selectionAsync(); router.push('/relapse-detection' as any); }}
        testID="timeline-relapse-detection-link"
      >
        <View style={styles.detectionLinkLeft}>
          <View style={styles.detectionLinkIcon}>
            <Eye size={16} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.detectionLinkTitle}>How your protection is reading you</Text>
            <Text style={styles.detectionLinkSub}>Patterns and early support</Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      <Pressable
        style={styles.detectionLink}
        onPress={() => { Haptics.selectionAsync(); router.push('/retention-insights' as any); }}
        testID="timeline-retention-insights-link"
      >
        <View style={styles.detectionLinkLeft}>
          <View style={styles.detectionLinkIcon}>
            <TrendingUp size={16} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.detectionLinkTitle}>View Recovery Insights</Text>
            <Text style={styles.detectionLinkSub}>Engagement and long-term recovery signals</Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      <View style={styles.milestonesSection}>
        <View style={styles.milestonesDivider}>
          <View style={styles.milestonesDividerLine} />
          <Text style={styles.milestonesDividerLabel}>MILESTONES</Text>
          <View style={styles.milestonesDividerLine} />
        </View>
        <View style={styles.milestonesSectionHeader}>
          <View style={styles.milestonesTitleRow}>
            <Trophy size={18} color={Colors.primary} />
            <Text style={styles.milestonesSectionTitle}>Milestones</Text>
          </View>
          <Text style={styles.milestonesSubtitle}>
            {unlockedCount}/{MILESTONE_DATA.length} unlocked
            {nextMilestone ? ` · ${nextMilestone.days - daysSober}d to next` : ''}
          </Text>
        </View>

        {(milestonesExpanded ? MILESTONE_DATA : MILESTONE_DATA.slice(0, 4)).map((milestone, index, arr) => {
          const unlocked = daysSober >= milestone.days;
          const IconComponent = ICON_MAP[milestone.icon] ?? Star;
          const progress = unlocked ? 1 : Math.min(daysSober / milestone.days, 1);
          return (
            <View key={milestone.days} style={styles.msCard} testID={`progress-milestone-${milestone.days}`}>
              <View style={styles.msLeft}>
                <View style={[styles.msIconContainer, unlocked ? styles.msIconUnlocked : styles.msIconLocked]}>
                  {unlocked ? <IconComponent size={18} color={Colors.white} /> : <Lock size={14} color={Colors.textMuted} />}
                </View>
                {index < arr.length - 1 && (
                  <View style={[styles.msConnector, unlocked && styles.msConnectorUnlocked]} />
                )}
              </View>
              <View style={styles.msRight}>
                <View style={styles.msHeader}>
                  <Text style={[styles.msTitle, !unlocked && styles.msTextLocked]}>{milestone.title}</Text>
                  <Text style={[styles.msDays, unlocked && styles.msDaysUnlocked]}>{milestone.days}d</Text>
                </View>
                <Text style={[styles.msDesc, !unlocked && styles.msTextLocked]} numberOfLines={2}>
                  {milestone.description}
                </Text>
                {!unlocked && (
                  <View style={styles.msProgressContainer}>
                    <View style={styles.msProgressBg}>
                      <View style={[styles.msProgressFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>
                )}
                {unlocked && <Text style={styles.msUnlockedText}>Achieved</Text>}
              </View>
            </View>
          );
        })}

        <Pressable
          style={styles.msToggle}
          onPress={() => {
            Haptics.selectionAsync();
            setMilestonesExpanded(!milestonesExpanded);
          }}
          testID="progress-toggle-milestones"
        >
          {milestonesExpanded ? (
            <ChevronUp size={16} color={Colors.primary} />
          ) : (
            <ChevronDown size={16} color={Colors.primary} />
          )}
          <Text style={styles.msToggleText}>
            {milestonesExpanded ? 'Show Less' : `Show All ${MILESTONE_DATA.length} Milestones`}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScreenScrollView>
  );
}

export default StabilityTimelineScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  taglineCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  sobrietyHero: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    opacity: 0.06,
    borderRadius: 20,
  },
  heroInner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  heroLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroDays: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: Colors.primary,
    marginTop: 4,
    lineHeight: 64,
  },
  heroDaysLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 24,
  },
  heroMetaItem: {
    alignItems: 'center',
  },
  heroMetaValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  heroMetaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reinforcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFD54F12',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#FFD54F30',
  },
  reinforcementText: {
    flex: 1,
    fontSize: 13,
    color: '#FFD54F',
    fontWeight: '500' as const,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  stageCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  stageName: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  stageDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  stageProgressOuter: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stageProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  stageNext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  metricValuePhrase: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chartBlockSectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },
  chartTitleMornings: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flexShrink: 0,
  },
  chartCurrentScoreLine: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  chartCurrentScoreValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  chartWindowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  chartWindowChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartWindowChipActive: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    borderColor: Colors.primary,
  },
  chartWindowChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  chartWindowChipTextActive: {
    color: Colors.primary,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  momentumCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  momentumTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  momentumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  momentumItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 4,
  },
  momentumItemPressed: {
    backgroundColor: Colors.primary + '10',
  },
  momentumValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  momentumLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  momentumDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  momentumModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  momentumModalCard: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  momentumModalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  momentumModalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  momentumModalClose: {
    alignSelf: 'flex-end',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary + '16',
  },
  momentumModalCloseText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  badgesCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  badgesTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUnlocked: {
    backgroundColor: Colors.primary + '18',
  },
  badgeLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  badgeDone: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#4CAF50',
  },
  badgeCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  premiumGateCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(212,165,116,0.2)',
    overflow: 'hidden',
  },
  detectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  detectionLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detectionLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionLinkTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  detectionLinkSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  milestonesDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  milestonesDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  milestonesDividerLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  milestonesSection: {
    marginTop: 18,
    marginBottom: 20,
    paddingTop: 8,
  },
  milestonesSectionHeader: {
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  milestonesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  milestonesSectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  milestonesSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 26,
  },
  msCard: {
    flexDirection: 'row',
    minHeight: 80,
  },
  msLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: 12,
  },
  msIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  msIconUnlocked: {
    backgroundColor: Colors.primary,
  },
  msIconLocked: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  msConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: -2,
    marginBottom: -2,
  },
  msConnectorUnlocked: {
    backgroundColor: Colors.primary,
  },
  msRight: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  msHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  msTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  msDays: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  msDaysUnlocked: {
    color: Colors.primary,
  },
  msDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  msTextLocked: {
    opacity: 0.5,
  },
  msProgressContainer: {
    marginTop: 8,
  },
  msProgressBg: {
    height: 3,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  msProgressFill: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  msUnlockedText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  msToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  msToggleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});

const trigStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  headerStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '800' as const,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
    gap: 14,
  },
  heatmapContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 10,
  },
  heatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heatLabelCell: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  heatDayLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  heatColHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 1,
  },
  heatColLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  heatCellWrap: {
    flex: 1,
  },
  heatCell: {
    height: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1.5,
  },
  heatCellText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 8,
  },
  heatLegendLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginHorizontal: 3,
  },
  heatLegendBox: {
    width: 16,
    height: 10,
    borderRadius: 2,
  },
  riskTimesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  riskTimesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  riskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  riskTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskTimeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  riskTimeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  riskTimeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  riskTimeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  insightsContainer: {
    gap: 8,
  },
  insightCard: {
    borderRadius: 10,
    padding: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  knownTriggersWrap: {
    gap: 8,
  },
  knownTriggersLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  triggerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  triggerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  triggerChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  triggerChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  patternsBody: {
    padding: 16,
    paddingTop: 12,
    gap: 14,
  },
  patternRow: {
    gap: 6,
  },
  patternLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  patternEmpty: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  peakTimesList: {
    gap: 6,
  },
  peakTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peakTimeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  peakTimePct: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  fullAnalysisLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  fullAnalysisLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});

const earlyStyles = StyleSheet.create({
  statusHeader: {
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  heroCard: {
    backgroundColor: Colors.primary + '0C',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  heroDays: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: Colors.primary,
    marginTop: 4,
  },
  heroDaysCaption: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 2,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  heroSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  encouragementCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    gap: 10,
  },
  encouragementText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  reinforcementCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: Colors.primary + '0A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    gap: 8,
  },
  reinforcementText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
});
