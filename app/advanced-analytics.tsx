import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack, useRouter } from 'expo-router';
import { BarChart3, Activity, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';

export default function AdvancedAnalyticsScreen() {
  const router = useRouter();

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="advanced-analytics-screen"
    >
      <Stack.Screen options={{ title: 'Advanced Analytics' }} />

      <View style={styles.cardShell} testID="advanced-analytics-recovery-insights-card">
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/retention-insights' as any)}
          testID="advanced-analytics-retention-link"
        >
          <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '18' }]}>
            <BarChart3 size={18} color={Colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Your Recovery Journey</Text>
            <Text style={styles.cardSubtitle}>
              Momentum, stability, and micro-progress across your last 30 days.
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.explainedBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/recovery-insights-explained' as any);
          }}
          testID="advanced-analytics-recovery-insights-explained-link"
        >
          <Text style={styles.explainedBtnText}>Explained</Text>
        </Pressable>
      </View>

      <View style={styles.cardShell} testID="advanced-analytics-growth-insights-card">
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/insights' as any)}
          testID="advanced-analytics-growth-insights-link"
        >
          <View style={[styles.iconCircle, { backgroundColor: Colors.success + '18' }]}>
            <Sparkles size={18} color={Colors.success} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Growth Insights</Text>
            <Text style={styles.cardSubtitle}>
              Mood, cravings, and growth scores from your check-ins and daily engagement.
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.explainedBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/insights-explained' as any);
          }}
          testID="advanced-analytics-growth-insights-explained-link"
        >
          <Text style={styles.explainedBtnText}>Explained</Text>
        </Pressable>
      </View>

      <View style={styles.cardShell} testID="advanced-analytics-risk-warning-card">
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/relapse-detection' as any)}
          testID="advanced-analytics-relapse-detection-link"
        >
          <View style={[styles.iconCircle, { backgroundColor: Colors.accent + '18' }]}>
            <Activity size={18} color={Colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Wellness signals</Text>
            <Text style={styles.cardSubtitle}>
              Optional summaries and trends from your check-ins—for self-reflection, not diagnosis or monitoring.
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.explainedBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/early-warning-explained' as any);
          }}
          testID="advanced-analytics-risk-warning-explained-link"
        >
          <Text style={styles.explainedBtnText}>Explained</Text>
        </Pressable>
      </View>
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
  cardShell: {
    position: 'relative',
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
  explainedBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primary + '14',
    borderWidth: 0.5,
    borderColor: Colors.primary + '30',
  },
  explainedBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
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
});
