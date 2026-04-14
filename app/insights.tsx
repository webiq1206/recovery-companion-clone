import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type ScrollView } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  RefreshCw,
  Info,
  Activity,
  Brain,
  Shield,
  Layers,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import * as Haptics from 'expo-haptics';
import { useCheckin } from '../core/domains/useCheckin';
import { useEngagement } from '../providers/EngagementProvider';

/** Matches `params.focus` from deep links to the Comprehensive Stability Explained card. */
export const INSIGHTS_FOCUS_COMPREHENSIVE_STABILITY = 'comprehensive-stability-explained';

/** Matches `params.focus` for the Recovery Stages Explained card. */
export const INSIGHTS_FOCUS_RECOVERY_STAGES = 'recovery-stages-explained';

export default function InsightsHubScreen() {
  const router = useRouter();
  const rawFocus = useLocalSearchParams<{ focus?: string | string[] }>().focus;
  const focusParam = Array.isArray(rawFocus) ? rawFocus[0] : rawFocus;
  const scrollRef = useRef<ScrollView>(null);
  const [comprehensiveStabilitySectionY, setComprehensiveStabilitySectionY] = useState<number | null>(
    null,
  );
  const [recoveryStagesSectionY, setRecoveryStagesSectionY] = useState<number | null>(null);
  const { checkIns } = useCheckin();
  const { growthDimensions, overallGrowthScore } = useEngagement();

  const insights = useMemo(() => {
    const items: { label: string; value: string; color: string }[] = [];
    const recentCheckins = checkIns.slice(0, 14);

    if (recentCheckins.length >= 3) {
      const avgMood = recentCheckins.reduce((s, c) => s + c.mood, 0) / recentCheckins.length;
      const moodTrend = avgMood >= 60 ? 'Improving' : avgMood >= 40 ? 'Steady' : 'Needs attention';
      const moodColor = avgMood >= 60 ? Colors.success : avgMood >= 40 ? Colors.accentWarm : Colors.danger;
      items.push({ label: 'Mood Trend', value: moodTrend, color: moodColor });

      const avgCraving = recentCheckins.reduce((s, c) => s + c.cravingLevel, 0) / recentCheckins.length;
      const cravingTrend = avgCraving <= 30 ? 'Low' : avgCraving <= 60 ? 'Moderate' : 'High';
      const cravingColor = avgCraving <= 30 ? Colors.success : avgCraving <= 60 ? Colors.accentWarm : Colors.danger;
      items.push({ label: 'Craving Level', value: cravingTrend, color: cravingColor });
    }

    items.push({
      label: 'Growth Score',
      value: `${overallGrowthScore}/100`,
      color: overallGrowthScore >= 50 ? Colors.primary : Colors.accentWarm,
    });

    return items;
  }, [checkIns, overallGrowthScore]);

  useEffect(() => {
    if (focusParam !== INSIGHTS_FOCUS_COMPREHENSIVE_STABILITY || comprehensiveStabilitySectionY == null) {
      return;
    }
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, comprehensiveStabilitySectionY - 44),
        animated: true,
      });
    }, 80);
    return () => clearTimeout(t);
  }, [focusParam, comprehensiveStabilitySectionY]);

  return (
    <ScreenScrollView
      ref={scrollRef}
      scrollToTopOnFocus={!focusParam}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="insights-hub-screen"
    >
      <Stack.Screen options={{ title: 'Insights Hub' }} />

      <View style={styles.introCard}>
        <Info size={18} color={Colors.primary} />
        <Text style={styles.introText}>
          Explore advanced analytics and educational explainers that help you understand your
          scores, patterns, and recovery systems.
        </Text>
      </View>

      {/* Growth Insights */}
      {insights.length > 0 && (
        <>
          <Text style={styles.growthSectionLabel}>GROWTH INSIGHTS</Text>

          <View style={styles.insightsGrid}>
            {insights.map((item) => (
              <View
                key={item.label}
                style={[
                  styles.insightCard,
                  item.label === 'Growth Score' && styles.insightCardWithButton,
                ]}
              >
                <View
                  style={[styles.insightDot, { backgroundColor: item.color }]}
                />

                {item.label === 'Growth Score' && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.growthScoreExplainedBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/insights-explained' as any);
                    }}
                    testID="growth-score-explained-link"
                  >
                    <Text style={styles.growthScoreExplainedBtnText}>
                      Explained
                    </Text>
                  </Pressable>
                )}

                <Text style={styles.insightLabel}>{item.label}</Text>
                <Text style={[styles.insightValue, { color: item.color }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {growthDimensions.length > 0 && (
            <View style={styles.growthCard}>
              {growthDimensions.map((dim) => (
                <View key={dim.id} style={styles.growthRow}>
                  <Text style={styles.growthLabel}>{dim.label}</Text>
                  <View style={styles.growthBarTrack}>
                    <View
                      style={[
                        styles.growthBarFill,
                        { width: `${dim.score}%`, backgroundColor: dim.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.growthScore, { color: dim.color }]}>
                    {dim.score}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>EXPLAINERS</Text>

      <View
        onLayout={(e) => setComprehensiveStabilitySectionY(e.nativeEvent.layout.y)}
        testID="insights-comprehensive-stability-explained-block"
      >
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/comprehensive-stability-explained' as any)}
          testID="insights-comprehensive-stability-explained-link"
        >
          <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '18' }]}>
            <Activity size={18} color={Colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Comprehensive Stability Explained</Text>
            <Text style={styles.cardSubtitle}>
              How your daily check-ins roll up into the score you see on Home.
            </Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push('/insights-explained' as any)}
        testID="insights-explained-link"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.accentWarm + '18' }]}>
          <RefreshCw size={18} color={Colors.accentWarm} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Growth Insights Explained</Text>
          <Text style={styles.cardSubtitle}>
            How Growth and related scores are calculated from your data.
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push('/recovery-insights-explained' as any)}
        testID="recovery-insights-explained-link"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '18' }]}>
          <Brain size={18} color={Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Your Recovery Journey Explained</Text>
          <Text style={styles.cardSubtitle}>
            The reinforcement loops that keep you engaged and how they grow.
          </Text>
        </View>
      </Pressable>

      <View
        onLayout={(e) => setRecoveryStagesSectionY(e.nativeEvent.layout.y)}
        testID="insights-recovery-stages-explained-block"
      >
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/recovery-stages-explained' as any)}
          testID="recovery-stages-explained-link"
        >
          <View style={[styles.iconCircle, { backgroundColor: '#42A5F518' }]}>
            <Layers size={18} color="#42A5F5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Recovery Stages Explained</Text>
            <Text style={styles.cardSubtitle}>
              How the app detects your stage and adapts support over time.
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.footerCard}>
        <Shield size={16} color={Colors.primary} />
        <Text style={styles.footerText}>
          These insights are here to inform and support you - not to judge you. Use them as
          a compass, then keep listening to your own wisdom and needs.
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(46,196,182,0.06)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,182,0.25)',
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  growthSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    width: '48%' as any,
    flexGrow: 1,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  insightCardWithButton: {
    position: 'relative',
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  growthScoreExplainedBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primary + '14',
    borderWidth: 0.5,
    borderColor: Colors.primary + '30',
  },
  growthScoreExplainedBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  growthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 14,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  growthLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    width: 90,
  },
  growthBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  growthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  growthScore: {
    fontSize: 12,
    fontWeight: '700' as const,
    width: 28,
    textAlign: 'right' as const,
  },
});

