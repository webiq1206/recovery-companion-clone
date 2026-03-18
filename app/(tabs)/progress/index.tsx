import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
  TouchableOpacity,
} from 'react-native';
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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useRelapse } from '@/core/domains/useRelapse';
import { usePledges } from '@/core/domains/usePledges';
import { useRebuild } from '@/core/domains/useRebuild';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { DailyCheckIn } from '@/types';
import { PremiumSectionOverlay } from '@/components/PremiumGate';
import { getStabilityPhrase, getMoodPhrase, getCravingsPhrase, getProtectionReadingSummary } from '@/constants/emotionalRisk';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 72;
const CHART_HEIGHT = 100;

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
  "Progress isn't always visible — but it's always happening inside you.",
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

function MiniBarChart({ data, color, maxVal }: { data: number[]; color: string; maxVal: number }) {
  const bars = data.slice(0, 7).reverse();
  const barWidth = Math.min((CHART_WIDTH - (bars.length - 1) * 4) / Math.max(bars.length, 1), 28);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {bars.map((val, i) => {
          const height = maxVal > 0 ? Math.max((val / maxVal) * CHART_HEIGHT, 4) : 4;
          return (
            <View key={i} style={chartStyles.barWrapper}>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height,
                    width: barWidth,
                    backgroundColor: color,
                    opacity: i === bars.length - 1 ? 1 : 0.4 + (i / bars.length) * 0.5,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={chartStyles.labelsRow}>
        {bars.map((_, i) => (
          <Text key={i} style={[chartStyles.label, { width: barWidth }]}>
            {bars.length - i === 1 ? 'Today' : `${bars.length - i}d`}
          </Text>
        ))}
      </View>
    </View>
  );
}

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  const points = data.slice(0, 7).reverse();
  if (points.length < 2) {
    return (
      <View style={[chartStyles.container, { alignItems: 'center', justifyContent: 'center', height: CHART_HEIGHT }]}>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Need more data</Text>
      </View>
    );
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = CHART_WIDTH / (points.length - 1);

  return (
    <View style={[chartStyles.container, { height: CHART_HEIGHT + 30 }]}>
      <View style={{ height: CHART_HEIGHT, width: CHART_WIDTH, position: 'relative' }}>
        {points.map((val, i) => {
          if (i === points.length - 1) return null;
          const x1 = i * stepX;
          const y1 = CHART_HEIGHT - ((val - min) / range) * (CHART_HEIGHT - 8) - 4;
          const x2 = (i + 1) * stepX;
          const y2 = CHART_HEIGHT - ((points[i + 1] - min) / range) * (CHART_HEIGHT - 8) - 4;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: length,
                height: 2.5,
                backgroundColor: color,
                borderRadius: 1.5,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
                opacity: 0.8,
              }}
            />
          );
        })}
        {points.map((val, i) => {
          const x = i * stepX;
          const y = CHART_HEIGHT - ((val - min) / range) * (CHART_HEIGHT - 8) - 4;
          return (
            <View
              key={`dot-${i}`}
              style={{
                position: 'absolute',
                left: x - 4,
                top: y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === points.length - 1 ? color : 'transparent',
                borderWidth: 2,
                borderColor: color,
              }}
            />
          );
        })}
      </View>
      <View style={[chartStyles.labelsRow, { marginTop: 6 }]}>
        {points.map((_, i) => (
          <Text key={i} style={[chartStyles.label, { width: stepX, textAlign: 'center' }]}>
            {points.length - i === 1 ? 'Now' : `${points.length - i}d`}
          </Text>
        ))}
      </View>
    </View>
  );
}

function VulnerabilityMeter({ score }: { score: number }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animVal, {
      toValue: score,
      useNativeDriver: false,
      tension: 30,
      friction: 10,
    }).start();
  }, [score]);

  const level = score <= 25 ? 'Low' : score <= 50 ? 'Moderate' : score <= 75 ? 'Elevated' : 'High';
  const levelColor = score <= 25 ? '#66BB6A' : score <= 50 ? '#FFC107' : score <= 75 ? '#FF9800' : '#EF5350';
  const levelDesc = score <= 25
    ? 'You are in a strong place right now.'
    : score <= 50
      ? 'Stay mindful. Use your tools if needed.'
      : score <= 75
        ? 'Reach out to your support circle today.'
        : 'Consider activating Crisis Mode.';

  const widthInterp = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={meterStyles.container}>
      <View style={meterStyles.header}>
        <View style={meterStyles.headerLeft}>
          <Shield size={18} color={levelColor} />
          <Text style={meterStyles.title}>Relapse Vulnerability</Text>
        </View>
        <View style={[meterStyles.badge, { backgroundColor: levelColor + '22' }]}>
          <Text style={[meterStyles.badgeText, { color: levelColor }]}>{level}</Text>
        </View>
      </View>
      <View style={meterStyles.trackOuter}>
        <Animated.View style={[meterStyles.trackFill, { width: widthInterp, backgroundColor: levelColor }]} />
        <View style={[meterStyles.marker, { left: '25%' }]} />
        <View style={[meterStyles.marker, { left: '50%' }]} />
        <View style={[meterStyles.marker, { left: '75%' }]} />
      </View>
      <Text style={meterStyles.desc}>{levelDesc}</Text>
    </View>
  );
}

function TrendIcon({ trend, positiveDirection }: { trend: 'up' | 'down' | 'stable'; positiveDirection: 'up' | 'down' }) {
  const isGood = (trend === 'up' && positiveDirection === 'up') || (trend === 'down' && positiveDirection === 'down');
  const color = trend === 'stable' ? Colors.textMuted : isGood ? '#66BB6A' : '#EF5350';
  if (trend === 'up') return <ChevronUp size={14} color={color} />;
  if (trend === 'down') return <ChevronDown size={14} color={color} />;
  return <Minus size={14} color={color} />;
}

function ProtectionReadingCard({
  stabilityScore,
  hasCheckIns,
  onPress,
}: {
  stabilityScore: number;
  hasCheckIns: boolean;
  onPress: () => void;
}) {
  const { line, reassurance } = getProtectionReadingSummary(stabilityScore, hasCheckIns);
  return (
    <Pressable style={meterStyles.container} onPress={onPress} testID="progress-protection-reading-link">
      <View style={meterStyles.header}>
        <View style={meterStyles.headerLeft}>
          <Shield size={18} color={Colors.primary} />
          <Text style={meterStyles.title}>How your protection reads you</Text>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} />
      </View>
      <Text style={meterStyles.desc}>{line}</Text>
      <Text style={meterStyles.reassurance}>{reassurance}</Text>
      <Text style={meterStyles.seeDetail}>See detailed patterns & factors</Text>
    </Pressable>
  );
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

function StabilityTimelineScreen() {
  const router = useRouter();
  const { pledges } = usePledges();
  const { rebuildData } = useRebuild();
  const { profile } = useUser();
  const { checkIns } = useCheckin();
  const { timelineEvents } = useRelapse();
  const { trendLabel: riskTrendLabel, timeOfDayRisk } = useRiskPrediction();

  // 30-day stability scores (oldest to newest for graph), with null for missing days
  const thirtyDayData = useMemo(() => {
    const today = new Date();
    const dayKeys: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().split('T')[0]);
    }
    const byDate = new Map<string, number>();
    const sorted = [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach(c => {
      const day = c.date;
      if (dayKeys.includes(day)) byDate.set(day, c.stabilityScore);
    });
    return dayKeys.map(d => byDate.get(d) ?? null);
  }, [checkIns]);

  const stabilityScoresForChart = useMemo(() => thirtyDayData.map(v => v ?? 50), [thirtyDayData]);

  const dailyPlansCompleted = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      const hasCheckIn = checkIns.some(c => c.date === dateStr);
      const hasPledge = pledges.some(p => p.date === dateStr);
      if (hasCheckIn || hasPledge) count++;
    }
    return count;
  }, [checkIns, pledges]);

  const relapseCount = profile.recoveryProfile?.relapseCount ?? 0;
  const crisisActivationsCount = useMemo(() => {
    return timelineEvents.filter((e) => e.type === 'crisis_activation').length;
  }, [timelineEvents]);

  const sevenDayChange = useMemo(() => {
    const scores = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7).map(c => c.stabilityScore);
    if (scores.length < 2) return 0;
    const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
    const older = scores.slice(3, 7);
    if (older.length === 0) return 0;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return Math.round(recent - olderAvg);
  }, [checkIns]);

  const weeklyPlansCompleted = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      if (checkIns.some(c => c.date === dateStr) || pledges.some(p => p.date === dateStr)) count++;
    }
    return count;
  }, [checkIns, pledges]);

  const rebuildActionsCount = useMemo(() => rebuildData.habits.reduce((s, h) => s + (h.streak || 0), 0), [rebuildData.habits]);

  const consistentCheckInDays = useMemo(() => {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const has = checkIns.some(c => c.date === dateStr) || pledges.some(p => p.date === dateStr);
      if (has) streak++;
      else break;
    }
    return streak;
  }, [checkIns, pledges]);

  const badge7CheckIns = consistentCheckInDays >= 7;
  const badge14NoCrisis = consistentCheckInDays >= 14 || crisisActivationsCount === 0;
  const badge10Rebuild = rebuildActionsCount >= 10;

  const weeklyInsights = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];

    const recentCheckIns = checkIns
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
          ? 'Your stability dipped this week — that awareness matters.'
          : 'Your stability held fairly steady this week.';

    let triggerSentence = '';
    if (emotionLabel && periodLabel) {
      triggerSentence = `${emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1)} and ${periodLabel} were your most common triggers.`;
    } else if (emotionLabel) {
      triggerSentence = `${emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1)} was your most common trigger.`;
    } else if (periodLabel) {
      triggerSentence = `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} were your most vulnerable times.`;
    } else {
      triggerSentence = 'You did not record clear trigger patterns yet — keep logging check-ins.';
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
  }, [checkIns, pledges, timeOfDayRisk, riskTrendLabel]);

  const planCompletedSet = useMemo(() => {
    const set = new Set<string>();
    checkIns.forEach(c => set.add(c.date));
    pledges.forEach(p => set.add(p.date));
    return set;
  }, [checkIns, pledges]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="stability-timeline-screen"
    >
      <View style={styles.taglineCard}>
        <Text style={styles.tagline}>You are building stability.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Weekly RecoveryInsights</Text>
        <Text style={styles.summaryLabel}>{weeklyInsights.narrative}</Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>30-day stability</Text>
        {stabilityScoresForChart.length >= 2 ? (
          <StabilityTimelineLineChart
            data={stabilityScoresForChart}
            color={Colors.primary}
            planCompletedSet={planCompletedSet}
            relapseCount={relapseCount}
            crisisCount={crisisActivationsCount}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>Complete daily check-ins to see your stability over time.</Text>
          </View>
        )}
      </View>

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
    </ScrollView>
  );
}

function StabilityTimelineLineChart({
  data,
  color,
  planCompletedSet,
  relapseCount,
  crisisCount,
}: {
  data: number[];
  color: string;
  planCompletedSet: Set<string>;
  relapseCount: number;
  crisisCount: number;
}) {
  const points = data.length >= 2 ? data : [];
  if (points.length < 2) {
    return (
      <View style={[chartStyles.container, { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Need more data</Text>
      </View>
    );
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = CHART_WIDTH / (points.length - 1);
  const today = new Date();

  return (
    <View style={[chartStyles.container, { height: CHART_HEIGHT + 24 }]}>
      <View style={{ height: CHART_HEIGHT, width: CHART_WIDTH, position: 'relative' }}>
        {points.map((val, i) => {
          if (i === points.length - 1) return null;
          const x1 = i * stepX;
          const y1 = CHART_HEIGHT - ((val - min) / range) * (CHART_HEIGHT - 8) - 4;
          const x2 = (i + 1) * stepX;
          const y2 = CHART_HEIGHT - ((points[i + 1] - min) / range) * (CHART_HEIGHT - 8) - 4;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: length,
                height: 2.5,
                backgroundColor: color,
                borderRadius: 1.5,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
                opacity: 0.8,
              }}
            />
          );
        })}
        {points.map((val, i) => {
          const x = i * stepX;
          const y = CHART_HEIGHT - ((val - min) / range) * (CHART_HEIGHT - 8) - 4;
          const dayOffset = points.length - 1 - i;
          const d = new Date(today);
          d.setDate(d.getDate() - dayOffset);
          const dateStr = d.toISOString().split('T')[0];
          const planDone = planCompletedSet.has(dateStr);
          return (
            <View key={`dot-${i}`}>
              <View
                style={{
                  position: 'absolute',
                  left: x - 4,
                  top: y - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === points.length - 1 ? color : 'transparent',
                  borderWidth: 2,
                  borderColor: color,
                }}
              />
              {planDone && (
                <View
                  style={{
                    position: 'absolute',
                    left: x - 5,
                    top: CHART_HEIGHT - 2,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#4CAF50',
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
      <View style={[chartStyles.labelsRow, { marginTop: 8 }]}>
        <Text style={chartStyles.label}>30d ago</Text>
        <Text style={[chartStyles.label, { flex: 1, textAlign: 'center' }]}>Stability score</Text>
        <Text style={chartStyles.label}>Today</Text>
      </View>
    </View>
  );
}

export default StabilityTimelineScreen;

const chartStyles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_HEIGHT,
  },
  bar: {
    borderRadius: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  label: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

const meterStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  trackOuter: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  trackFill: {
    height: 8,
    borderRadius: 4,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 8,
    backgroundColor: Colors.border,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reassurance: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: 6,
  },
  seeDetail: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 10,
  },
});

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
