import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNotificationPermissionOfferFromParams } from '../hooks/useNotificationPermissionOfferFromParams';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowRight, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useHydrateRecoveryProfileStore, useRecoveryProfileStore } from '../stores/useRecoveryProfileStore';

function mapRiskLevelLabel(
  relapseRiskLevel?: 'low' | 'moderate' | 'high' | 'critical',
): string {
  switch (relapseRiskLevel) {
    case 'critical':
      return 'Extra support suggested';
    case 'high':
      return 'Higher support focus';
    case 'moderate':
      return 'Moderate support focus';
    case 'low':
    default:
      return 'Steady support focus';
  }
}

function buildFocusRecommendation(
  stage: string,
  relapseRiskLevel?: 'low' | 'moderate' | 'high' | 'critical',
): string {
  if (relapseRiskLevel === 'critical' || relapseRiskLevel === 'high') {
    return 'Lean on safety tools, grounding check-ins, and people you trust when things feel intense.';
  }
  if (stage === 'crisis' || stage === 'stabilize') {
    return 'Focus on stabilizing routines, sleep, and asking for support when urges rise.';
  }
  if (stage === 'rebuild') {
    return 'Strengthen new habits, reduce key triggers, and build consistent check-ins.';
  }
  return 'Maintain what is working, protect your routines, and invest in long-term goals.';
}

export default function RecoverySnapshotScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useNotificationPermissionOfferFromParams();
  useHydrateRecoveryProfileStore();
  const { profile } = useRecoveryProfileStore();

  const rp = profile.recoveryProfile;

  const baselineStability = rp.baselineStability ?? rp.baselineStabilityScore;
  const relapseRiskLabel = mapRiskLevelLabel(rp.relapseRiskLevel);
  const keyTriggers = (rp.triggers ?? []).slice(0, 4);
  const focusRecommendation = useMemo(
    () => buildFocusRecommendation(rp.recoveryStage, rp.relapseRiskLevel),
    [rp.recoveryStage, rp.relapseRiskLevel],
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <ScreenScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your Recovery Snapshot</Text>
        <Text style={styles.subtitle}>
          Here&apos;s a quick view of where you&apos;re starting from today.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Recovery stage</Text>
          <View style={styles.row}>
            <Heart size={20} color={Colors.primary} />
            <Text style={styles.primaryValue}>{rp.recoveryStage}</Text>
          </View>
          <Text style={styles.helperText}>
            This only adjusts in-app prompts and suggestions—not medical care.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Support focus</Text>
          <View style={styles.row}>
            <AlertTriangle size={20} color={Colors.danger} />
            <Text style={styles.primaryValue}>{relapseRiskLabel}</Text>
          </View>
          <Text style={styles.helperText}>
            A simple label from your onboarding answers—wellness self-help only, not a clinical risk score or treatment
            plan.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Key triggers</Text>
          {keyTriggers.length === 0 ? (
            <Text style={styles.helperText}>
              You haven&apos;t listed specific triggers yet. You can add them any time in the
              Triggers tab.
            </Text>
          ) : (
            <View style={styles.chipRow}>
              {keyTriggers.map(trigger => (
                <View key={trigger} style={styles.chip}>
                  <Text style={styles.chipText}>{trigger}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Baseline stability</Text>
          <Text style={styles.baselineValue}>{baselineStability}</Text>
          <Text style={styles.helperText}>
            Higher scores mean more stability day to day. We&apos;ll keep recalculating this as you
            check in and use the app.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Recommended focus (next 14 days)</Text>
          <Text style={styles.focusText}>{focusRecommendation}</Text>
        </View>
      </ScreenScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/home' as any);
          }}
          testID="snapshot-continue-todayhub"
        >
          <Text style={styles.primaryButtonText}>Go to TodayHub</Text>
          <ArrowRight size={18} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  primaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 13,
    color: Colors.text,
  },
  baselineValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  focusText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

