import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack, useRouter } from 'expo-router';
import {
  BarChart3,
  RefreshCw,
  Info,
  Activity,
  Brain,
  Shield,
  Layers,
  Radio,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function InsightsHubScreen() {
  const router = useRouter();

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="insights-hub-screen"
    >
      <Stack.Screen options={{ title: 'Insights' }} />

      <View style={styles.introCard}>
        <Info size={18} color={Colors.primary} />
        <Text style={styles.introText}>
          Explore advanced analytics and educational explainers that help you understand your
          scores, patterns, and recovery systems.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>ADVANCED ANALYTICS</Text>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push('/retention-insights' as any)}
        testID="insights-retention-link"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '18' }]}>
          <BarChart3 size={18} color={Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Recovery Insights</Text>
          <Text style={styles.cardSubtitle}>
            Momentum, stability, and micro-progress across your last 30 days.
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push('/relapse-detection' as any)}
        testID="insights-relapse-detection-link"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.accent + '18' }]}>
          <Activity size={18} color={Colors.accent} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Relapse Detection</Text>
          <Text style={styles.cardSubtitle}>
            Real-time risk scoring, trends, and early warning signals.
          </Text>
        </View>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>EXPLAINERS</Text>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push('/insights-explained' as any)}
        testID="insights-explained-link"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.accentWarm + '18' }]}>
          <RefreshCw size={18} color={Colors.accentWarm} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Insights Explained</Text>
          <Text style={styles.cardSubtitle}>
            How Stability, Growth, and related scores are calculated from your data.
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
          <Text style={styles.cardTitle}>Recovery Insights Explained</Text>
          <Text style={styles.cardSubtitle}>
            The reinforcement loops that keep you engaged and how they grow.
          </Text>
        </View>
      </Pressable>

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

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push('/early-warning-explained' as any)}
        testID="early-warning-explained-link"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.danger + '12' }]}>
          <Radio size={18} color={Colors.danger} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Early Warning Explained</Text>
          <Text style={styles.cardSubtitle}>
            The four risk characteristics and how your overall risk level is computed.
          </Text>
        </View>
      </Pressable>

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
});

