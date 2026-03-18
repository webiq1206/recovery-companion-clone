import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Zap,
  Clock,
  AlertTriangle,
  TrendingDown,
  Shield,
  ChevronRight,
  Moon,
  Sun,
  Sunset,
  CloudMoon,
  Activity,
  Brain,
  Eye,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getOverallRiskPhrase } from '@/constants/emotionalRisk';
import { DailyCheckIn } from '@/types';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_BLOCKS = [
  { label: 'Morning', key: 'morning', icon: Sun, hours: [6, 7, 8, 9, 10, 11] },
  { label: 'Afternoon', key: 'afternoon', icon: Sunset, hours: [12, 13, 14, 15, 16, 17] },
  { label: 'Evening', key: 'evening', icon: CloudMoon, hours: [18, 19, 20, 21] },
  { label: 'Night', key: 'night', icon: Moon, hours: [22, 23, 0, 1, 2, 3, 4, 5] },
] as const;

const EMOTION_LABELS: Record<string, string> = {
  mood: 'Low Mood',
  craving: 'High Cravings',
  stress: 'High Stress',
  sleep: 'Poor Sleep',
  environment: 'Risky Environment',
  emotional: 'Emotional Distress',
};

const EMOTION_COLORS: Record<string, string> = {
  mood: '#5C6BC0',
  craving: '#EF5350',
  stress: '#FF7043',
  sleep: '#7E57C2',
  environment: '#26A69A',
  emotional: '#EC407A',
};

function getHeatLevel(value: number): number {
  if (value <= 20) return 0;
  if (value <= 40) return 1;
  if (value <= 60) return 2;
  if (value <= 80) return 3;
  return 4;
}

const HEAT_COLORS = [
  'rgba(46, 196, 182, 0.08)',
  'rgba(46, 196, 182, 0.2)',
  'rgba(255, 193, 7, 0.35)',
  'rgba(255, 107, 53, 0.5)',
  'rgba(239, 83, 80, 0.7)',
];

interface HeatmapData {
  [dayIndex: number]: {
    [timeBlock: string]: number;
  };
}

interface PatternInsight {
  id: string;
  type: 'warning' | 'pattern' | 'positive';
  title: string;
  description: string;
  severity: number;
}

interface EmotionalPattern {
  key: string;
  label: string;
  average: number;
  trend: 'up' | 'down' | 'stable';
  isRisk: boolean;
}

function AnimatedCard({ children, delay, style }: { children: React.ReactNode; delay: number; style?: object }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
}

function HeatmapCell({ value, onPress }: { value: number; onPress?: () => void }) {
  const level = getHeatLevel(value);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.();
  }, [onPress]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.heatCellTouchable}>
      <Animated.View
        style={[
          styles.heatCell,
          { backgroundColor: HEAT_COLORS[level], transform: [{ scale: scaleAnim }] },
        ]}
      >
        {value > 0 && (
          <Text style={[styles.heatCellText, level >= 3 && styles.heatCellTextHigh]}>
            {Math.round(value)}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function RiskBar({ value, color, label }: { value: number; color: string; label: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={styles.riskBarContainer}>
      <View style={styles.riskBarHeader}>
        <Text style={styles.riskBarLabel}>{label}</Text>
        <Text style={[styles.riskBarValue, { color }]}>{Math.round(value)}%</Text>
      </View>
      <View style={styles.riskBarTrack}>
        <Animated.View
          style={[
            styles.riskBarFill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function TriggersScreen() {
  const { profile } = useUser();
  const { checkIns } = useCheckin();
  const [selectedCell, setSelectedCell] = useState<{ day: number; time: string } | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const recentCheckIns = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return checkIns.filter(c => new Date(c.date) >= thirtyDaysAgo);
  }, [checkIns]);

  const heatmapData = useMemo<HeatmapData>(() => {
    const data: HeatmapData = {};
    for (let d = 0; d < 7; d++) {
      data[d] = {};
      for (const tb of TIME_BLOCKS) {
        data[d][tb.key] = 0;
      }
    }

    if (recentCheckIns.length === 0) return data;

    const counts: Record<string, number> = {};
    recentCheckIns.forEach(ci => {
      const date = new Date(ci.completedAt || ci.date);
      const dayOfWeek = (date.getDay() + 6) % 7;
      const hour = date.getHours();

      const timeBlock = TIME_BLOCKS.find(tb => (tb.hours as readonly number[]).includes(hour));
      if (!timeBlock) return;

      const key = `${dayOfWeek}-${timeBlock.key}`;
      const riskValue = ((ci.cravingLevel + ci.stress + (100 - ci.mood)) / 3);
      if (!counts[key]) counts[key] = 0;
      const prevTotal = (data[dayOfWeek][timeBlock.key] || 0) * counts[key];
      counts[key]++;
      data[dayOfWeek][timeBlock.key] = (prevTotal + riskValue) / counts[key];
    });

    return data;
  }, [recentCheckIns]);

  const highRiskTimes = useMemo(() => {
    const risks: { day: string; time: string; value: number; dayIdx: number; timeKey: string }[] = [];
    for (let d = 0; d < 7; d++) {
      for (const tb of TIME_BLOCKS) {
        const val = heatmapData[d]?.[tb.key] ?? 0;
        if (val > 50) {
          risks.push({ day: DAYS[d], time: tb.label, value: val, dayIdx: d, timeKey: tb.key });
        }
      }
    }
    return risks.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData]);

  const emotionalPatterns = useMemo<EmotionalPattern[]>(() => {
    if (recentCheckIns.length < 2) return [];

    const recent7 = recentCheckIns.slice(0, 7);
    const older7 = recentCheckIns.slice(7, 14);

    const calcAvg = (items: DailyCheckIn[], field: keyof DailyCheckIn) => {
      if (items.length === 0) return 0;
      return items.reduce((sum, c) => sum + (c[field] as number), 0) / items.length;
    };

    const fields: { key: string; field: keyof DailyCheckIn; invertRisk: boolean }[] = [
      { key: 'mood', field: 'mood', invertRisk: true },
      { key: 'craving', field: 'cravingLevel', invertRisk: false },
      { key: 'stress', field: 'stress', invertRisk: false },
      { key: 'sleep', field: 'sleepQuality', invertRisk: true },
      { key: 'environment', field: 'environment', invertRisk: true },
      { key: 'emotional', field: 'emotionalState', invertRisk: true },
    ];

    return fields.map(({ key, field, invertRisk }) => {
      const recentAvg = calcAvg(recent7, field);
      const olderAvg = older7.length > 0 ? calcAvg(older7, field) : recentAvg;
      const diff = recentAvg - olderAvg;
      const trend: 'up' | 'down' | 'stable' = Math.abs(diff) < 5 ? 'stable' : diff > 0 ? 'up' : 'down';
      const isRisk = invertRisk ? recentAvg < 40 : recentAvg > 60;

      return {
        key,
        label: EMOTION_LABELS[key],
        average: recentAvg,
        trend,
        isRisk,
      };
    });
  }, [recentCheckIns]);

  const insights = useMemo<PatternInsight[]>(() => {
    const result: PatternInsight[] = [];

    if (recentCheckIns.length < 3) {
      result.push({
        id: 'need-data',
        type: 'pattern',
        title: 'Building your pattern map',
        description: 'Complete a few more daily check-ins so we can identify your unique trigger patterns. Each check-in helps us understand your journey better.',
        severity: 0,
      });
      return result;
    }

    const avgCraving = recentCheckIns.reduce((s, c) => s + c.cravingLevel, 0) / recentCheckIns.length;
    const avgStress = recentCheckIns.reduce((s, c) => s + c.stress, 0) / recentCheckIns.length;
    const avgMood = recentCheckIns.reduce((s, c) => s + c.mood, 0) / recentCheckIns.length;

    if (avgCraving > 65) {
      result.push({
        id: 'high-craving',
        type: 'warning',
        title: 'Elevated craving pattern',
        description: 'Your cravings have been consistently elevated. This is a natural part of recovery. Consider engaging your crisis tools or reaching out to a trusted contact when urges feel strong.',
        severity: 3,
      });
    }

    if (avgStress > 60 && avgCraving > 50) {
      result.push({
        id: 'stress-craving-link',
        type: 'pattern',
        title: 'Stress-craving connection detected',
        description: 'When your stress rises, cravings tend to follow. Stress management techniques like breathing exercises or grounding may help break this cycle.',
        severity: 2,
      });
    }

    if (avgMood < 35) {
      result.push({
        id: 'low-mood',
        type: 'warning',
        title: 'Mood needs attention',
        description: 'Your mood has been running low recently. Low mood can increase vulnerability. Be gentle with yourself and consider journaling or talking to someone you trust.',
        severity: 2,
      });
    }

    if (highRiskTimes.length > 0) {
      const topRisk = highRiskTimes[0];
      result.push({
        id: 'peak-risk-time',
        type: 'pattern',
        title: `${topRisk.day} ${topRisk.time.toLowerCase()}s are high-risk`,
        description: `Your data shows elevated risk during ${topRisk.day} ${topRisk.time.toLowerCase()}s. Having a plan ready for these times can make a real difference.`,
        severity: 2,
      });
    }

    const weekendRisk = [5, 6].reduce((sum, d) => {
      return sum + Object.values(heatmapData[d] || {}).reduce((s, v) => s + v, 0);
    }, 0);
    const weekdayRisk = [0, 1, 2, 3, 4].reduce((sum, d) => {
      return sum + Object.values(heatmapData[d] || {}).reduce((s, v) => s + v, 0);
    }, 0);

    if (weekendRisk / 2 > weekdayRisk / 5 * 1.3) {
      result.push({
        id: 'weekend-risk',
        type: 'pattern',
        title: 'Weekends carry more risk',
        description: 'Your patterns show higher vulnerability on weekends. Planning structured activities or connecting with your support network on weekends may help.',
        severity: 1,
      });
    }

    if (avgCraving < 30 && avgMood > 60) {
      result.push({
        id: 'positive-trend',
        type: 'positive',
        title: 'Strong stability pattern',
        description: 'Your cravings are low and mood is good. This is real progress. Keep building on what\'s working for you.',
        severity: 0,
      });
    }

    if (result.length === 0) {
      result.push({
        id: 'stable',
        type: 'positive',
        title: 'Patterns look balanced',
        description: 'No concerning patterns detected right now. Continue your daily check-ins to maintain awareness.',
        severity: 0,
      });
    }

    return result.sort((a, b) => b.severity - a.severity);
  }, [recentCheckIns, highRiskTimes, heatmapData]);

  const userTriggers = profile.recoveryProfile?.triggers ?? [];

  const overallRiskLevel = useMemo(() => {
    if (recentCheckIns.length === 0) return 0;
    const recent = recentCheckIns.slice(0, 7);
    const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
    const avgStress = recent.reduce((s, c) => s + c.stress, 0) / recent.length;
    const avgMood = recent.reduce((s, c) => s + c.mood, 0) / recent.length;
    return Math.round((avgCraving * 0.4 + avgStress * 0.3 + (100 - avgMood) * 0.3));
  }, [recentCheckIns]);

  const riskColor = overallRiskLevel > 65 ? Colors.danger : overallRiskLevel > 40 ? Colors.warning : Colors.primary;

  const toggleInsight = useCallback((id: string) => {
    setExpandedInsight(prev => prev === id ? null : id);
  }, []);

  const handleCellPress = useCallback((day: number, time: string) => {
    setSelectedCell(prev => prev?.day === day && prev?.time === time ? null : { day, time });
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Triggers' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedCard delay={0} style={styles.riskOverviewCard}>
          <View style={styles.riskOverviewHeader}>
            <View style={styles.riskOverviewLeft}>
              <Shield size={18} color={Colors.primary} />
              <Text style={styles.riskOverviewTitle}>How you're doing</Text>
            </View>
          </View>
          <Text style={styles.riskOverviewHeadline}>
            {getOverallRiskPhrase(overallRiskLevel, recentCheckIns.length > 0).headline}
          </Text>
          <Text style={styles.riskOverviewSubtext}>
            {getOverallRiskPhrase(overallRiskLevel, recentCheckIns.length > 0).reassurance}
          </Text>
        </AnimatedCard>

        <AnimatedCard delay={100}>
          <View style={styles.sectionHeader}>
            <Zap size={18} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Trigger Heatmap</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Risk intensity by day and time of day
          </Text>

          <View style={styles.heatmapContainer}>
            <View style={styles.heatmapRow}>
              <View style={styles.heatmapLabelCell} />
              {TIME_BLOCKS.map(tb => {
                const Icon = tb.icon;
                return (
                  <View key={tb.key} style={styles.heatmapColHeader}>
                    <Icon size={14} color={Colors.textSecondary} />
                    <Text style={styles.heatmapColLabel}>{tb.label.slice(0, 4)}</Text>
                  </View>
                );
              })}
            </View>
            {DAYS.map((day, dayIdx) => (
              <View key={day} style={styles.heatmapRow}>
                <View style={styles.heatmapLabelCell}>
                  <Text style={styles.heatmapDayLabel}>{day}</Text>
                </View>
                {TIME_BLOCKS.map(tb => (
                  <HeatmapCell
                    key={`${dayIdx}-${tb.key}`}
                    value={heatmapData[dayIdx]?.[tb.key] ?? 0}
                    onPress={() => handleCellPress(dayIdx, tb.key)}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.heatLegend}>
            <Text style={styles.heatLegendLabel}>Low</Text>
            {HEAT_COLORS.map((color, i) => (
              <View key={i} style={[styles.heatLegendBox, { backgroundColor: color }]} />
            ))}
            <Text style={styles.heatLegendLabel}>High</Text>
          </View>

          {selectedCell && (
            <View style={styles.cellDetail}>
              <Text style={styles.cellDetailText}>
                {DAYS[selectedCell.day]} {TIME_BLOCKS.find(t => t.key === selectedCell.time)?.label}:{' '}
                <Text style={styles.cellDetailValue}>
                  {Math.round(heatmapData[selectedCell.day]?.[selectedCell.time] ?? 0)}% risk
                </Text>
              </Text>
            </View>
          )}
        </AnimatedCard>

        {highRiskTimes.length > 0 && (
          <AnimatedCard delay={200}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={Colors.warning} />
              <Text style={styles.sectionTitle}>High-Risk Windows</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Times when you may be most vulnerable
            </Text>
            <View style={styles.riskTimesContainer}>
              {highRiskTimes.map((rt, idx) => (
                <View key={idx} style={[styles.riskTimeRow, idx === highRiskTimes.length - 1 && styles.riskTimeRowLast]}>
                  <View style={styles.riskTimeLeft}>
                    <View style={[styles.riskTimeDot, {
                      backgroundColor: rt.value > 70 ? Colors.danger : Colors.warning,
                    }]} />
                    <View>
                      <Text style={styles.riskTimeDay}>{rt.day}</Text>
                      <Text style={styles.riskTimeTime}>{rt.time}</Text>
                    </View>
                  </View>
                  <View style={[styles.riskTimeBadge, {
                    backgroundColor: rt.value > 70
                      ? 'rgba(239, 83, 80, 0.15)'
                      : 'rgba(255, 193, 7, 0.15)',
                  }]}>
                    <Text style={[styles.riskTimeBadgeText, {
                      color: rt.value > 70 ? Colors.danger : Colors.warning,
                    }]}>
                      {Math.round(rt.value)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </AnimatedCard>
        )}

        {emotionalPatterns.length > 0 && (
          <AnimatedCard delay={300}>
            <View style={styles.sectionHeader}>
              <Activity size={18} color="#5C6BC0" />
              <Text style={styles.sectionTitle}>Emotional Patterns</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              How your emotions have been trending
            </Text>
            <View style={styles.patternsContainer}>
              {emotionalPatterns.map(ep => (
                <RiskBar
                  key={ep.key}
                  value={ep.average}
                  color={EMOTION_COLORS[ep.key] ?? Colors.textSecondary}
                  label={ep.label}
                />
              ))}
            </View>
          </AnimatedCard>
        )}

        {userTriggers.length > 0 && (
          <AnimatedCard delay={400}>
            <View style={styles.sectionHeader}>
              <Brain size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Your Known Triggers</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Identified during your recovery setup
            </Text>
            <View style={styles.triggerChipsContainer}>
              {userTriggers.map((trigger, idx) => (
                <View key={idx} style={styles.triggerChip}>
                  <View style={styles.triggerChipDot} />
                  <Text style={styles.triggerChipText}>{trigger}</Text>
                </View>
              ))}
            </View>
          </AnimatedCard>
        )}

        <AnimatedCard delay={500}>
          <View style={styles.sectionHeader}>
            <Eye size={18} color={Colors.accentWarm} />
            <Text style={styles.sectionTitle}>Awareness Insights</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Gentle observations from your data
          </Text>
          <View style={styles.insightsContainer}>
            {insights.map(insight => {
              const isExpanded = expandedInsight === insight.id;
              const iconColor = insight.type === 'warning'
                ? Colors.danger
                : insight.type === 'positive'
                  ? Colors.success
                  : Colors.accentWarm;
              const bgColor = insight.type === 'warning'
                ? 'rgba(239, 83, 80, 0.08)'
                : insight.type === 'positive'
                  ? 'rgba(76, 175, 80, 0.08)'
                  : 'rgba(255, 179, 71, 0.08)';
              const IconComp = insight.type === 'warning'
                ? AlertTriangle
                : insight.type === 'positive'
                  ? Shield
                  : TrendingDown;

              return (
                <TouchableOpacity
                  key={insight.id}
                  style={[styles.insightCard, { backgroundColor: bgColor }]}
                  onPress={() => toggleInsight(insight.id)}
                  activeOpacity={0.7}
                  testID={`insight-${insight.id}`}
                >
                  <View style={styles.insightHeader}>
                    <View style={styles.insightHeaderLeft}>
                      <IconComp size={16} color={iconColor} />
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                    </View>
                    <ChevronRight
                      size={16}
                      color={Colors.textMuted}
                      style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                    />
                  </View>
                  {isExpanded && (
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimatedCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  riskOverviewCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  riskOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskOverviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskOverviewTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  riskOverviewHeadline: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
    lineHeight: 24,
  },
  riskOverviewValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  riskOverviewSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
    marginLeft: 26,
  },
  heatmapContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatmapLabelCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  heatmapDayLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  heatmapColHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  heatmapColLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  heatCellTouchable: {
    flex: 1,
  },
  heatCell: {
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  heatCellText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  heatCellTextHigh: {
    color: Colors.text,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  heatLegendLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  heatLegendBox: {
    width: 20,
    height: 12,
    borderRadius: 3,
  },
  cellDetail: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  cellDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cellDetailValue: {
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  riskTimesContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  riskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  riskTimeRowLast: {
    borderBottomWidth: 0,
  },
  riskTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskTimeDay: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  riskTimeTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  riskTimeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskTimeBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  patternsContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    marginBottom: 8,
  },
  riskBarContainer: {
    gap: 6,
  },
  riskBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBarLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  riskBarValue: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  riskBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  triggerChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  triggerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  triggerChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  triggerChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  insightsContainer: {
    gap: 10,
    marginBottom: 8,
  },
  insightCard: {
    borderRadius: 12,
    padding: 14,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  insightDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
    paddingLeft: 26,
  },
  bottomSpacer: {
    height: 20,
  },
});
