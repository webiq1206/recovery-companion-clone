import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import {
  ArrowRight,
  Sun,
  AlertTriangle,
  Users,
  PhoneCall,
  Heart,
  Brain,
  BookOpenCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRecovery } from '@/providers/RecoveryProvider';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { useStageDetection } from '@/providers/StageDetectionProvider';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';
import { RecoveryStabilityPanel } from '@/components/RecoveryStabilityPanel';
import { calculateStability } from '@/utils/stabilityEngine';
import type { StabilityZoneId } from '@/components/RecoveryStabilityPanel';
import {
  generateTodayPlan,
  type TodayPlan,
  type TodayPlanAction,
} from '@/utils/todayPlanGenerator';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

type UiTodayPlanAction = TodayPlanAction & {
  icon: IconComponent;
};

type UiTodayPlan = TodayPlan & {
  priorityActions: UiTodayPlanAction[];
  optionalActions: UiTodayPlanAction[];
};

const ACTION_ICON_MAP: Record<string, IconComponent> = {
  'daily-checkin': Sun,
  'grounding-checkin': Sun,
  'rebuild-step': BookOpenCheck,
  'connection-touchpoint': Users,
  'supportive-connection': Users,
  'trigger-review': AlertTriangle,
  'trigger-planning': AlertTriangle,
  'coping-exercise': Brain,
  'brief-journal': Brain,
  'crisis-tools': AlertTriangle,
  'reach-out-support': PhoneCall,
  'relapse-plan': BookOpenCheck,
};

function attachIcons(plan: TodayPlan): UiTodayPlan {
  const mapAction = (action: TodayPlanAction): UiTodayPlanAction => ({
    ...action,
    icon: ACTION_ICON_MAP[action.id] ?? Sun,
  });

  return {
    ...plan,
    priorityActions: plan.priorityActions.map(mapAction),
    optionalActions: plan.optionalActions.map(mapAction),
  };
}

export default function TodayHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, isLoading, checkIns } = useRecovery();
  const { currentStage, currentProgram } = useStageDetection();
  const {
    riskCategory,
    riskLabel,
    trendLabel: riskTrendLabel,
    missedEngagement,
    currentPrediction,
  } = useRiskPrediction();

  const stabilityResult = useMemo(() => {
    const rp = profile.recoveryProfile;
    const sorted = [...checkIns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const previousScores = sorted.slice(0, 7).map(c => c.stabilityScore);
    const today = new Date().toISOString().split('T')[0];
    const dailyActionsCompleted = checkIns.filter(c => c.date === today).length;

    const input = {
      intensity: rp.struggleLevel,
      sleepQuality: (rp.sleepQuality === 'fair'
        ? 'okay'
        : rp.sleepQuality === 'excellent'
          ? 'good'
          : rp.sleepQuality === 'poor'
            ? 'poor'
            : 'good') as 'poor' | 'okay' | 'good',
      triggers: rp.triggers ?? [],
      supportLevel: rp.supportAvailability,
      dailyActionsCompleted,
      relapseLogged: (rp.relapseCount ?? 0) > 0,
    };

    return calculateStability(input, previousScores);
  }, [profile.recoveryProfile, checkIns]);

  const todayPlanDomain = useMemo(
    () =>
      generateTodayPlan({
        stabilityScore: stabilityResult.score,
        relapseRisk: riskCategory,
        recoveryStage: currentStage ?? profile.recoveryProfile.recoveryStage,
        missedEngagementScore: missedEngagement,
        triggerRiskScore: currentPrediction?.triggerRisk ?? 0,
        stageProgramDay: currentProgram?.day,
        stageProgramDuration: currentProgram?.duration,
      }),
    [
      stabilityResult.score,
      riskCategory,
      currentStage,
      missedEngagement,
      currentPrediction?.triggerRisk,
    ],
  );

  const todayPlan = useMemo(
    () => attachIcons(todayPlanDomain),
    [todayPlanDomain],
  );

  const primaryAction =
    todayPlan.priorityActions[0] ??
    todayPlan.optionalActions[0];

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (!profile.hasCompletedOnboarding) {
    return <Redirect href={'/onboarding' as any} />;
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + 72 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greetingLabel}>TodayHub</Text>
          <Text style={styles.greetingSubtitle}>
            Your stability, risk, and next best step — all in one place.
          </Text>
        </View>

        {/* Stability + relapse risk panel */}
        <RecoveryStabilityPanel
          score={stabilityResult.score}
          stabilityTrend={stabilityResult.trend}
          relapseRiskCategory={riskCategory}
          relapseRiskLabel={riskLabel}
          relapseRiskTrendLabel={riskTrendLabel || 'Stable'}
        />

        {riskCategory === 'high' && (
          <Pressable
            style={({ pressed }) => [
              styles.relapsePlanCard,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push('/relapse-plan' as any);
            }}
            testID="todayhub-relapse-plan-cta"
          >
            <View style={styles.relapsePlanIconWrap}>
              <AlertTriangle size={20} color={Colors.danger} />
            </View>
            <View style={styles.relapsePlanTextWrap}>
              <Text style={styles.relapsePlanTitle}>Open your Relapse Plan</Text>
              <Text style={styles.relapsePlanSubtitle}>
                Review warning signs, triggers, and coping strategies while risk is high.
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.danger} />
          </Pressable>
        )}

        {/* Immediate next action */}
        <Text style={styles.sectionLabel}>Immediate next action</Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryActionCard,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push(primaryAction.route as any);
          }}
          testID="todayhub-primary-action"
        >
          <View style={styles.primaryIconWrap}>
            <primaryAction.icon size={24} color={Colors.primary} />
          </View>
          <View style={styles.primaryTextWrap}>
            <Text style={styles.primaryTitle}>{primaryAction.title}</Text>
            <Text style={styles.primarySubtitle}>{primaryAction.subtitle}</Text>
          </View>
          <ArrowRight size={20} color={Colors.primary} />
        </Pressable>

        {/* Today's Plan */}
        <Text style={styles.planTitle}>Today&apos;s Plan</Text>
        <View style={styles.planCard}>
          {todayPlan.priorityActions.map(action => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.planRow,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.route as any);
              }}
              testID={`todayhub-plan-priority-${action.id}`}
            >
              <View style={styles.planIconWrap}>
                <action.icon size={20} color={Colors.primary} />
              </View>
              <View style={styles.planTextWrap}>
                <Text style={styles.planRowTitle}>{action.title}</Text>
                <Text style={styles.planRowSubtitle}>{action.subtitle}</Text>
              </View>
              <ArrowRight size={18} color={Colors.textSecondary} />
            </Pressable>
          ))}
          {todayPlan.optionalActions.map(action => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.planRow,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.route as any);
              }}
              testID={`todayhub-plan-${action.id}`}
            >
              <View style={styles.planIconWrap}>
                <action.icon size={20} color={Colors.primary} />
              </View>
              <View style={styles.planTextWrap}>
                <Text style={styles.planRowTitle}>{action.title}</Text>
                <Text style={styles.planRowSubtitle}>{action.subtitle}</Text>
              </View>
              <ArrowRight size={18} color={Colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        {!!todayPlan.riskWarnings.length && (
          <View style={styles.warningCard}>
            {todayPlan.riskWarnings.map((warning, index) => (
              <View key={index} style={styles.warningRow}>
                <AlertTriangle size={16} color={Colors.danger} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  greetingLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: Colors.primary + '55',
    marginBottom: 18,
  },
  primaryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  primaryTextWrap: {
    flex: 1,
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  primarySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  planCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  warningCard: {
    backgroundColor: Colors.danger + '08',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '35',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTextWrap: {
    flex: 1,
  },
  planRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  planRowSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  relapsePlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger + '10',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.danger + '35',
    marginBottom: 18,
  },
  relapsePlanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.danger + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  relapsePlanTextWrap: {
    flex: 1,
  },
  relapsePlanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.danger,
  },
  relapsePlanSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

