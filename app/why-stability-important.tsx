import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack } from 'expo-router';
import { Info, Activity, Heart, Moon, Zap, Target } from 'lucide-react-native';
import Colors from '../constants/colors';

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export default function WhyStabilityImportantScreen() {
  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="why-stability-important-screen"
    >
      <Stack.Screen options={{ title: 'Why is Stability Important?' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          Stability is about how steady and resourced you feel day to day—not perfection. In recovery, small shifts in sleep,
          mood, stress, and urges often show up before bigger setbacks. Paying attention to stability helps you respond earlier,
          with kindness instead of surprise.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>WHAT STABILITY MEANS</Text>
      <Paragraph>
        Think of stability as your baseline: enough sleep, manageable stress, honest mood check-ins, and cravings you can
        name and ride out. When that baseline wobbles, the same situations can feel heavier. When it is stronger, the same
        challenges feel more workable.
      </Paragraph>
      <View style={styles.spacer} />
      <View style={styles.iconRow}>
        <View style={[styles.miniIcon, { backgroundColor: Colors.primary + '18' }]}>
          <Heart size={18} color={Colors.primary} />
        </View>
        <Text style={styles.iconRowText}>
          Emotional steadiness does not mean you never struggle—it means you are noticing patterns and staying connected to
          support and routines that ground you.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>STABILITY AND ADDICTION RECOVERY</Text>
      <Paragraph>
        Substance and behavioral addictions often thrive when life feels chaotic, lonely, or numb. Recovery is not only
        about saying no to a substance or behavior—it is about building a life where needs are met, stress has outlets, and
        shame does not run unchecked.
      </Paragraph>
      <View style={styles.spacer} />
      <Paragraph>
        Tracking stability does not predict the future—but it can highlight when your protective factors (sleep, connection,
        self-care) are slipping so you can reach for tools, people, or professional help sooner.
      </Paragraph>

      <Text style={styles.sectionLabel}>HOW THIS APP USES STABILITY</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}>
          <Activity size={18} color={Colors.accent} />
          <Text style={styles.bulletText}>
            <Text style={styles.bulletTitle}>Comprehensive Stability</Text>
            {' '}combines signals from your recent check-ins (such as mood, stress, cravings, and sleep) into a score you can
            watch over time—not to judge you, but to reflect how resourced you have been lately.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Target size={18} color={Colors.primary} />
          <Text style={styles.bulletText}>
            <Text style={styles.bulletTitle}>Today Hub and progress</Text>
            {' '}use that picture of stability alongside your goals and streaks so daily guidance can meet you where you are.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Moon size={18} color={Colors.textSecondary} />
          <Text style={styles.bulletText}>
            <Text style={styles.bulletTitle}>Sleep and stress</Text>
            {' '}matter because they are some of the fastest levers for nervous-system regulation—and the app surfaces them in
            check-ins for that reason.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Zap size={18} color={Colors.warning} />
          <Text style={styles.bulletText}>
            <Text style={styles.bulletTitle}>Risk awareness</Text>
            {' '}features may respond when several signals move together; stability is one piece of that puzzle, not the whole
            story—always pair scores with how you actually feel and with real-world support when you need it.
          </Text>
        </View>
      </View>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          If you are in crisis, use Crisis Mode or emergency resources. This screen is education only—not medical advice.
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  introText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    color: Colors.textMuted,
    marginBottom: 10,
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.text,
  },
  spacer: {
    height: 14,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  miniIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRowText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  bulletBlock: {
    gap: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  bulletTitle: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  footerNote: {
    marginTop: 28,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
