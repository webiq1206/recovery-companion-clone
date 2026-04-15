import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack, useFocusEffect } from 'expo-router';
import {
  Info,
  Shield,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import { useCheckin } from '../core/domains/useCheckin';
import { useJournal } from '../core/domains/useJournal';
import { usePledges } from '../core/domains/usePledges';
import { useUser } from '../core/domains/useUser';
import { useEngagement } from '../providers/EngagementProvider';

export default function GrowthInsightsScreen() {
  const { profile } = useUser();
  const { checkIns } = useCheckin();
  const { journal } = useJournal();
  const { currentStreak: pledgeStreak } = usePledges();
  const { growthDimensions, overallGrowthScore, updateGrowthDimensions } = useEngagement();

  const daysSoberCalc = useMemo(() => {
    const soberDate = new Date(profile.soberDate);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - soberDate.getTime()) / 86400000));
  }, [profile.soberDate]);

  const growthInputsRef = useRef({
    checkIns,
    daysSoberCalc,
    journalLength: journal.length,
    pledgeStreak,
  });
  growthInputsRef.current = {
    checkIns,
    daysSoberCalc,
    journalLength: journal.length,
    pledgeStreak,
  };

  const updateGrowthDimensionsRef = useRef(updateGrowthDimensions);
  updateGrowthDimensionsRef.current = updateGrowthDimensions;

  useFocusEffect(
    useCallback(() => {
      const i = growthInputsRef.current;
      updateGrowthDimensionsRef.current(i.checkIns, i.daysSoberCalc, i.journalLength, i.pledgeStreak);
    }, []),
  );

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
    } else {
      const muted = Colors.textMuted;
      items.push({ label: 'Mood Trend', value: 'Need more check-ins', color: muted });
      items.push({ label: 'Craving Level', value: 'Need more check-ins', color: muted });
    }

    items.push({
      label: 'Growth Score',
      value: `${overallGrowthScore}/100`,
      color: overallGrowthScore >= 50 ? Colors.primary : Colors.accentWarm,
    });

    return items;
  }, [checkIns, overallGrowthScore]);

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="insights-hub-screen"
    >
      <Stack.Screen options={{ title: 'Growth Insights' }} />

      <View style={[styles.footerCard, styles.heroBanner]}>
        <Shield size={16} color={Colors.primary} />
        <Text style={styles.footerText}>
          These insights are here to inform and support you - not to judge you. Use them as
          a compass, then keep listening to your own wisdom and needs.
        </Text>
      </View>

      {/* Growth Insights */}
      {insights.length > 0 && (
        <>
          <Text style={styles.growthSectionLabel}>GROWTH INSIGHTS</Text>

          <View style={styles.insightsGrid}>
            {insights.map((item) => (
              <View key={item.label} style={styles.insightCard}>
                <View
                  style={[styles.insightDot, { backgroundColor: item.color }]}
                />

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

      <View style={[styles.introCard, styles.introCardBottom]}>
        <Info size={18} color={Colors.primary} />
        <Text style={styles.introText}>
          Explore advanced analytics and educational explainers that help you understand your
          scores, patterns, and recovery systems.
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
  heroBanner: {
    marginTop: 0,
    marginBottom: 24,
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
  introCardBottom: {
    marginTop: 16,
    marginBottom: 0,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
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

