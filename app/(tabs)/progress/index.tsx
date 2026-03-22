import React, { useMemo, useRef, useEffect, useCallback, useState, Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
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
import {
  buildProgressStabilitySeries,
  countNonNullScores,
  type StabilityWindowDays,
} from '@/utils/progressStabilitySeries';

/** Load SVG chart only when Progress mounts — avoids native RNSVG init on cold start / other tabs. */
const StabilityRollingChartLazy = lazy(() =>
  import('@/components/progress/StabilityRollingChart').then((mod) => ({ default: mod.StabilityRollingChart })),
);

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

const EARLY_MILESTONES = [
  { day: 1, label: 'Day 1', message: 'You started. That decision alone is powerful.' },
  { day: 3, label: '3 Days', message: 'You made it through the hardest beginning.' },
  { day: 7, label: '1 Week', message: 'A full week of choosing yourself.' },
  { day: 14, label: '2 Weeks', message: 'Real patterns are forming.' },
  { day: 30, label: '1 Month', message: "A month of building something new." },
];

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

function ProgressStabilityChartCard({
  windowDays,
  onChangeWindow,
  dates,
  scores,
  pointCount,
  planCompletedSet,
}: {
  windowDays: StabilityWindowDays;
  onChangeWindow: (d: StabilityWindowDays) => void;
  dates: string[];
  scores: (number | null)[];
  pointCount: number;
  planCompletedSet: Set<string>;
}) {
  return (
    <View style={styles.chartCard} testID="progress-stability-chart-card">
      <Text style={styles.chartTitle}>Rolling stability</Text>
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
        <Suspense
          fallback={
            <View style={[styles.emptyChart, { height: CHART_HEIGHT + 36 }]}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          }
        >
          <StabilityRollingChartLazy
            dates={dates}
            scores={scores}
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            color={Colors.primary}
            planCompletedSet={planCompletedSet}
            windowDays={windowDays}
          />
        </Suspense>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Complete daily check-ins on at least two days to see stability over time.</Text>
        </View>
      )}
    </View>
  );
}

function StabilityTimelineScreen() {
  const router = useRouter();
  const { pledges } = usePledges();
  const { rebuildData } = useRebuild();
  const { profile, daysSober } = useUser();
  const { checkIns } = useCheckin();
  const centralProfile = useAppStore((s) => s.userProfile);
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const centralProgress = useAppStore((s) => s.progress);
  const { timelineEvents } = useRelapse();
  const { trendLabel: riskTrendLabel, timeOfDayRisk } = useRiskPrediction();

  const sourceCheckIns = useMemo(
    () => (centralDailyCheckIns.length > 0 ? centralDailyCheckIns : checkIns),
    [centralDailyCheckIns, checkIns],
  );

  const [stabilityWindowDays, setStabilityWindowDays] = useState<StabilityWindowDays>(14);

  const stabilitySeries = useMemo(
    () => buildProgressStabilitySeries(sourceCheckIns, stabilityWindowDays),
    [sourceCheckIns, stabilityWindowDays],
  );

  const stabilityPointCount = useMemo(
    () => countNonNullScores(stabilitySeries.scores),
    [stabilitySeries.scores],
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
    if (emotionLabel && periodLabel) {
      triggerSentence = `${emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1)} and ${periodLabel} were your most common triggers.`;
    } else if (emotionLabel) {
      triggerSentence = `${emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1)} was your most common trigger.`;
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

  const isEarlyDays = uniqueCheckInDays < 7;

  const latestScore = useMemo(() => {
    if (sourceCheckIns.length === 0) return 50;
    const sorted = [...sourceCheckIns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return sorted[0].stabilityScore;
  }, [sourceCheckIns]);

  if (isEarlyDays) {
    const soberDate = new Date((centralProfile ?? profile).soberDate);
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
            Since {soberDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        {/* Encouragement */}
        <View style={earlyStyles.encouragementCard}>
          <Heart size={18} color={Colors.primary} />
          <Text style={earlyStyles.encouragementText}>
            {getEarlyEncouragement(daysSober)}
          </Text>
        </View>

        {/* Milestone timeline */}
        <Text style={earlyStyles.sectionTitle}>Milestones ahead</Text>
        <View style={earlyStyles.milestoneCard}>
          {EARLY_MILESTONES.map((m, i) => {
            const isReached = daysSober >= m.day;
            const isNext =
              !isReached && (i === 0 || daysSober >= EARLY_MILESTONES[i - 1].day);
            return (
              <View
                key={m.day}
                style={[
                  earlyStyles.milestoneRow,
                  isNext && earlyStyles.milestoneRowActive,
                ]}
              >
                <View
                  style={[
                    earlyStyles.milestoneDot,
                    isReached && earlyStyles.milestoneDotDone,
                    isNext && earlyStyles.milestoneDotActive,
                  ]}
                >
                  {isReached && <Check size={12} color="#FFF" />}
                </View>
                <View style={earlyStyles.milestoneTextWrap}>
                  <Text
                    style={[
                      earlyStyles.milestoneLabel,
                      isReached && earlyStyles.milestoneLabelDone,
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text style={earlyStyles.milestoneMsg}>{m.message}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Simple stats */}
        <Text style={earlyStyles.sectionTitle}>Your progress so far</Text>
        <View style={earlyStyles.statsRow}>
          <View style={earlyStyles.statCard}>
            <Text style={earlyStyles.statNumber}>{uniqueCheckInDays}</Text>
            <Text style={earlyStyles.statLabel}>Check-ins</Text>
          </View>
          <View style={earlyStyles.statCard}>
            <Text style={earlyStyles.statNumber}>{consistentCheckInDays}</Text>
            <Text style={earlyStyles.statLabel}>Day streak</Text>
          </View>
          <View style={earlyStyles.statCard}>
            <Text style={earlyStyles.statNumber}>
              {latestScore}
            </Text>
            <Text style={earlyStyles.statLabel}>Stability</Text>
          </View>
        </View>

        {uniqueCheckInDays >= 2 ? (
          <ProgressStabilityChartCard
            windowDays={stabilityWindowDays}
            onChangeWindow={setStabilityWindowDays}
            dates={stabilitySeries.dates}
            scores={stabilitySeries.scores}
            pointCount={stabilityPointCount}
            planCompletedSet={planCompletedSet}
          />
        ) : null}

        <View style={earlyStyles.reinforcementCard}>
          <Sparkles size={16} color={Colors.primary} />
          <Text style={earlyStyles.reinforcementText}>
            {getReinforcementMessage(daysSober)}
          </Text>
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
        <Text style={styles.summaryTitle}>Weekly RecoveryInsights</Text>
        <Text style={styles.summaryLabel}>{weeklyInsights.narrative}</Text>
      </View>

      <ProgressStabilityChartCard
        windowDays={stabilityWindowDays}
        onChangeWindow={setStabilityWindowDays}
        dates={stabilitySeries.dates}
        scores={stabilitySeries.scores}
        pointCount={stabilityPointCount}
        planCompletedSet={planCompletedSet}
      />

      <View style={styles.momentumCard}>
        <Text style={styles.momentumTitle}>Momentum summary</Text>
        <View style={styles.momentumRow}>
          <View style={styles.momentumItem}>
            <Text style={styles.momentumValue}>{sevenDayChange >= 0 ? '+' : ''}{sevenDayChange}</Text>
            <Text style={styles.momentumLabel}>7-day change</Text>
          </View>
          <View style={styles.momentumDivider} />
          <View style={styles.momentumItem}>
            <Text style={styles.momentumValue}>{weeklyPlansCompleted}</Text>
            <Text style={styles.momentumLabel}>Weekly plans completed</Text>
          </View>
        </View>
        <View style={styles.momentumRow}>
          <View style={styles.momentumItem}>
            <Text style={styles.momentumValue}>{crisisActivationsCount}</Text>
            <Text style={styles.momentumLabel}>Crisis activations</Text>
          </View>
          <View style={styles.momentumDivider} />
          <View style={styles.momentumItem}>
            <Text style={styles.momentumValue}>{relapseCount}</Text>
            <Text style={styles.momentumLabel}>Setbacks (total)</Text>
          </View>
        </View>
      </View>

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
  milestoneCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    gap: 14,
  },
  milestoneRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    opacity: 0.5,
  },
  milestoneRowActive: {
    opacity: 1,
  },
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 2,
  },
  milestoneDotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    opacity: 1,
  },
  milestoneDotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  milestoneTextWrap: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  milestoneLabelDone: {
    color: Colors.text,
  },
  milestoneMsg: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
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
