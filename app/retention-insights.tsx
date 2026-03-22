import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Shield,
  Users,
  Heart,
  Eye,
  CalendarCheck,
  Mountain,
  Sparkles,
  Bell,
  ChevronRight,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRetention } from '@/providers/RetentionProvider';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useJournal } from '@/core/domains/useJournal';
import { usePledges } from '@/core/domains/usePledges';
import { useEngagement } from '@/providers/EngagementProvider';
import { RETENTION_LOOPS, MICRO_PROGRESS_DEFINITIONS } from '@/constants/retention';
import { RetentionLoop, MicroProgressMarker, TriggerReductionMilestone, SupportiveNotification, RetentionLoopType } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOOP_ICONS: Record<RetentionLoopType, typeof Leaf> = {
  relief: Leaf,
  growth: TrendingUp,
  control: Shield,
  belonging: Users,
};

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  emotional_regulation: Heart,
  trigger_reduction: TrendingDown,
  confidence_growth: Mountain,
  consistency: CalendarCheck,
  connection: Users,
  self_awareness: Eye,
};

function LoopCard({ loop, index }: { loop: RetentionLoop; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loopDef = RETENTION_LOOPS.find(l => l.id === loop.id);
  const color = loopDef?.color ?? Colors.primary;
  const Icon = LOOP_ICONS[loop.id] ?? Leaf;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: loop.score / 100,
      duration: 800,
      delay: index * 100 + 200,
      useNativeDriver: false,
    }).start();
  }, [loop.score]);

  const widthInterp = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const scoreChange = loop.score - loop.previousScore;

  return (
    <Animated.View
      style={[
        loopStyles.card,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          borderLeftColor: color,
        },
      ]}
    >
      <View style={loopStyles.header}>
        <View style={[loopStyles.iconBg, { backgroundColor: color + '18' }]}>
          <Icon size={18} color={color} />
        </View>
        <View style={loopStyles.headerText}>
          <Text style={loopStyles.label}>{loop.label}</Text>
          <Text style={loopStyles.desc}>{loop.description}</Text>
        </View>
        <View style={loopStyles.scoreContainer}>
          <Text style={[loopStyles.score, { color }]}>{loop.score}</Text>
          {scoreChange !== 0 && (
            <View style={loopStyles.changeRow}>
              {scoreChange > 0 ? (
                <ArrowUpRight size={10} color="#66BB6A" />
              ) : (
                <ArrowDownRight size={10} color="#EF5350" />
              )}
              <Text style={[loopStyles.changeText, { color: scoreChange > 0 ? '#66BB6A' : '#EF5350' }]}>
                {Math.abs(scoreChange)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={loopStyles.progressTrack}>
        <Animated.View style={[loopStyles.progressFill, { width: widthInterp, backgroundColor: color }]} />
      </View>
      <View style={loopStyles.meta}>
        <Text style={loopStyles.metaText}>
          {loop.triggerCount} activation{loop.triggerCount !== 1 ? 's' : ''}
        </Text>
        {loop.lastTriggeredAt ? (
          <Text style={loopStyles.metaText}>
            Last: {new Date(loop.lastTriggeredAt).toLocaleDateString()}
          </Text>
        ) : (
          <Text style={loopStyles.metaText}>Not yet activated</Text>
        )}
      </View>
    </Animated.View>
  );
}

function MicroProgressCard({ marker, index }: { marker: MicroProgressMarker; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const def = MICRO_PROGRESS_DEFINITIONS.find(d => d.category === marker.category);
  const color = def?.color ?? Colors.primary;
  const Icon = CATEGORY_ICONS[marker.category] ?? Heart;
  const progress = marker.targetValue > 0 ? Math.min(marker.currentValue / marker.targetValue, 1) : 0;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 700,
      delay: index * 80 + 150,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterp = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const trendColor = marker.trend === 'improving' ? '#66BB6A' : marker.trend === 'declining' ? '#EF5350' : Colors.textMuted;
  const trendLabel = marker.trend === 'improving' ? 'Improving' : marker.trend === 'declining' ? 'Needs attention' : 'Stable';

  return (
    <Animated.View style={[progressStyles.card, { opacity: fadeAnim }]}>
      <View style={progressStyles.header}>
        <View style={[progressStyles.iconBg, { backgroundColor: color + '18' }]}>
          <Icon size={16} color={color} />
        </View>
        <View style={progressStyles.headerInfo}>
          <Text style={progressStyles.title}>{marker.title}</Text>
          <Text style={progressStyles.subtitle}>{marker.description}</Text>
        </View>
      </View>
      <View style={progressStyles.valueRow}>
        <Text style={[progressStyles.value, { color }]}>
          {marker.currentValue}
        </Text>
        <Text style={progressStyles.unit}>
          {marker.unit}
        </Text>
        <View style={progressStyles.trendBadge}>
          {marker.trend === 'improving' ? (
            <TrendingUp size={11} color={trendColor} />
          ) : marker.trend === 'declining' ? (
            <TrendingDown size={11} color={trendColor} />
          ) : (
            <Minus size={11} color={trendColor} />
          )}
          <Text style={[progressStyles.trendText, { color: trendColor }]}>{trendLabel}</Text>
        </View>
      </View>
      <View style={progressStyles.progressTrack}>
        <Animated.View style={[progressStyles.progressFill, { width: widthInterp, backgroundColor: color }]} />
      </View>
      <View style={progressStyles.footer}>
        <Text style={progressStyles.footerText}>
          Target: {marker.targetValue} {marker.unit}
        </Text>
        {marker.bestStreak > 0 && (
          <Text style={progressStyles.footerText}>
            Best: {marker.bestStreak} days
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

function TriggerMilestoneCard({ milestone }: { milestone: TriggerReductionMilestone }) {
  return (
    <View style={milestoneStyles.card}>
      <View style={milestoneStyles.badge}>
        <Text style={milestoneStyles.badgePct}>{milestone.threshold}%</Text>
      </View>
      <View style={milestoneStyles.info}>
        <Text style={milestoneStyles.title}>{milestone.title}</Text>
        <Text style={milestoneStyles.desc}>{milestone.description}</Text>
        <Text style={milestoneStyles.date}>
          Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

function NotificationCard({ notification }: { notification: SupportiveNotification }) {
  const typeColors: Record<string, string> = {
    relief: '#66BB6A',
    growth: '#42A5F5',
    control: '#FFB347',
    belonging: '#AB47BC',
    milestone: '#2EC4B6',
    gentle_nudge: Colors.textSecondary,
  };
  const color = typeColors[notification.type] ?? Colors.textSecondary;

  return (
    <View style={notifStyles.card}>
      <View style={[notifStyles.dot, { backgroundColor: color }]} />
      <View style={notifStyles.content}>
        <Text style={notifStyles.title}>{notification.title}</Text>
        <Text style={notifStyles.message}>{notification.message}</Text>
        <Text style={notifStyles.time}>
          {new Date(notification.deliveredAt).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={emptyStyles.container}>
      <Sparkles size={24} color={Colors.textMuted} />
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export default function RetentionInsightsScreen() {
  const {
    loops,
    microProgress,
    emotionalRegulation,
    triggerMilestones,
    overallRetentionScore,
    activeLoops,
    topMicroProgress,
    recentNotifications,
    latestConfidence,
    runFullEvaluation,
  } = useRetention();

  const { checkIns } = useCheckin();
  const { daysSober } = useUser();
  const { journal } = useJournal();
  const { currentStreak } = usePledges();

  const { microWins } = useEngagement();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const communityInteractions = microWins.filter(w => w.category === 'social').length;
    runFullEvaluation(checkIns, daysSober, journal.length, currentStreak, communityInteractions);
  }, [checkIns.length, daysSober, journal.length, currentStreak]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    Animated.spring(scoreAnim, {
      toValue: overallRetentionScore,
      tension: 30,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [overallRetentionScore]);

  const confidenceScore = latestConfidence?.score ?? 0;
  const confidenceTrend = latestConfidence
    ? (latestConfidence.score > latestConfidence.previousScore ? 'up' : latestConfidence.score < latestConfidence.previousScore ? 'down' : 'stable')
    : 'stable';

  return (
    <>
      <Stack.Screen options={{ title: 'Recovery Insights' }} />
      <ScreenScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="retention-insights-screen"
      >
        <Animated.View style={[styles.heroCard, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroInner}>
            <Sparkles size={22} color="#FFD54F" />
            <Text style={styles.heroLabel}>Recovery Momentum</Text>
            <Text style={styles.heroScore}>{overallRetentionScore}</Text>
            <Text style={styles.heroScoreLabel}>overall strength</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{emotionalRegulation.currentStreak}</Text>
                <Text style={styles.heroStatLabel}>Stable days</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{confidenceScore}</Text>
                <Text style={styles.heroStatLabel}>Confidence</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{activeLoops.length}</Text>
                <Text style={styles.heroStatLabel}>Active loops</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Reinforcement Loops</Text>
        <Text style={styles.sectionSubtitle}>
          Emotional patterns that strengthen your recovery
        </Text>
        {loops.map((loop, i) => (
          <LoopCard key={loop.id} loop={loop} index={i} />
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Micro-Progress</Text>
        <Text style={styles.sectionSubtitle}>
          Growth beyond sobriety days
        </Text>
        {topMicroProgress.length > 0 ? (
          topMicroProgress.map((marker, i) => (
            <MicroProgressCard key={marker.id} marker={marker} index={i} />
          ))
        ) : (
          <EmptyState
            title="Progress Tracking Starting"
            subtitle="Complete daily check-ins to build your micro-progress profile"
          />
        )}

        {triggerMilestones.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Trigger Reduction Milestones</Text>
            <Text style={styles.sectionSubtitle}>
              Your craving intensity is decreasing
            </Text>
            {triggerMilestones.map(m => (
              <TriggerMilestoneCard key={m.id} milestone={m} />
            ))}
          </>
        )}

        {latestConfidence && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Confidence Growth</Text>
            <View style={confidenceStyles.card}>
              <View style={confidenceStyles.header}>
                <Mountain size={18} color="#42A5F5" />
                <Text style={confidenceStyles.title}>{latestConfidence.title}</Text>
                <View style={confidenceStyles.trendRow}>
                  {confidenceTrend === 'up' ? (
                    <ArrowUpRight size={14} color="#66BB6A" />
                  ) : confidenceTrend === 'down' ? (
                    <ArrowDownRight size={14} color="#EF5350" />
                  ) : (
                    <Minus size={14} color={Colors.textMuted} />
                  )}
                </View>
              </View>
              <Text style={confidenceStyles.desc}>{latestConfidence.description}</Text>
              <View style={confidenceStyles.scoreRow}>
                <Text style={confidenceStyles.score}>{latestConfidence.score}</Text>
                <Text style={confidenceStyles.scoreMax}>/100</Text>
              </View>
              {latestConfidence.factors.length > 0 && (
                <View style={confidenceStyles.factorsRow}>
                  {latestConfidence.factors.slice(0, 4).map(f => (
                    <View key={f} style={confidenceStyles.factorBadge}>
                      <Text style={confidenceStyles.factorText}>
                        {f.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {recentNotifications.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Recent Encouragements</Text>
            <Text style={styles.sectionSubtitle}>
              Supportive messages based on your patterns
            </Text>
            {recentNotifications.slice(0, 5).map(n => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </>
        )}

        <View style={{ height: 50 }} />
      </ScreenScrollView>
    </>
  );
}

const loopStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  progressTrack: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

const progressStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
    gap: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  unit: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});

const milestoneStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF535018',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgePct: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#EF5350',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  date: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

const confidenceStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  score: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#42A5F5',
  },
  scoreMax: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  factorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#42A5F512',
  },
  factorText: {
    fontSize: 10,
    color: '#42A5F5',
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
});

const notifStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  message: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  time: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
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
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFD54F',
    opacity: 0.04,
    borderRadius: 20,
  },
  heroInner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD54F20',
  },
  heroLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroScore: {
    fontSize: 52,
    fontWeight: '800' as const,
    color: '#FFD54F',
    marginTop: 4,
    lineHeight: 60,
  },
  heroScoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  heroStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 19,
  },
});
