import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { ArrowRight, AlertTriangle, Activity, Sparkles, BarChart3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/constants/milestones';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useAppStore } from '@/stores/useAppStore';
import { useTodayHub, type UiTodayPlanAction } from '@/features/home/hooks/useTodayHub';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';
import { RecoveryStabilityPanel } from '@/components/RecoveryStabilityPanel';

export default function TodayHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vm = useTodayHub();
  const { profile } = useUser();
  const centralProfile = useAppStore((s) => s.userProfile);
  const { todayCheckIn } = useCheckin();

  const displayProfile = centralProfile ?? profile;

  const greetingLabel = (() => {
    const hour = new Date().getHours();
    const base =
      hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName =
      displayProfile?.name?.split?.(' ')?.[0] || 'there';
    return `${base}, ${firstName}`;
  })();

  const moodEmoji =
    typeof todayCheckIn?.mood === 'number'
      ? MOOD_EMOJIS[Math.min(4, Math.max(0, Math.round((todayCheckIn.mood / 100) * 4)))]
      : '–';

  const moodLabel =
    typeof todayCheckIn?.mood === 'number'
      ? MOOD_LABELS[Math.min(4, Math.max(0, Math.round((todayCheckIn.mood / 100) * 4)))]
      : 'No check-in yet';

  const urgeLabel =
    typeof todayCheckIn?.cravingLevel === 'number'
      ? todayCheckIn.cravingLevel >= 70
        ? 'High urge'
        : todayCheckIn.cravingLevel >= 40
          ? 'Moderate urge'
          : 'Low urge'
      : 'Unknown';

  if (vm.isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (vm.shouldRedirectToOnboarding) {
    return <Redirect href={'/onboarding' as any} />;
  }

  const { stability, relapseRisk, todayPlan, primaryAction, showRelapsePlanCta } = vm;

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
          <Text style={styles.greetingLabel}>{greetingLabel}</Text>
          <Text style={styles.greetingSubtitle}>
            A quick snapshot of how you&apos;re doing and what to do next.
          </Text>
        </View>

        {/* Current state: mood + urge */}
        <View style={styles.stateCard}>
          <View style={styles.stateRow}>
            <View style={styles.stateMood}>
              <Text style={styles.stateMoodEmoji}>{moodEmoji}</Text>
              <View>
                <Text style={styles.stateLabel}>Mood</Text>
                <Text style={styles.stateValue}>{moodLabel}</Text>
              </View>
            </View>
            <View style={styles.stateDivider} />
            <View style={styles.stateUrge}>
              <Text style={styles.stateLabel}>Urge level</Text>
              <Text style={styles.stateValue}>{urgeLabel}</Text>
            </View>
          </View>
        </View>

        {/* Primary crisis entry */}
        <Pressable
          style={({ pressed }) => [
            styles.struggleButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/crisis-mode' as any);
          }}
          testID="todayhub-struggle-button"
        >
          <View style={styles.struggleIconWrap}>
            <AlertTriangle size={20} color={Colors.white} />
          </View>
          <Text style={styles.struggleText}>I&apos;m struggling right now</Text>
          <ArrowRight size={18} color={Colors.white} />
        </Pressable>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/daily-checkin' as any);
            }}
            testID="todayhub-quick-checkin"
          >
            <View style={styles.quickIconWrap}>
              <Activity size={18} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>Check-in</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/tools' as any);
            }}
            testID="todayhub-quick-tools"
          >
            <View style={styles.quickIconWrap}>
              <Sparkles size={18} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>Tools</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/progress' as any);
            }}
            testID="todayhub-quick-progress"
          >
            <View style={styles.quickIconWrap}>
              <BarChart3 size={18} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>Progress</Text>
          </Pressable>
        </View>

        {/* Stability + relapse risk panel */}
        <RecoveryStabilityPanel
          score={stability.score}
          stabilityTrend={stability.trend}
          relapseRiskCategory={relapseRisk.category}
          relapseRiskLabel={relapseRisk.label}
          relapseRiskTrendLabel={relapseRisk.trendLabel}
        />

        {showRelapsePlanCta && (
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
        {primaryAction ? (
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
        ) : (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>
              We&apos;ll suggest your next steps once you&apos;ve completed a few check-ins.
            </Text>
          </View>
        )}

        {/* Daily plan */}
        <Text style={styles.planTitle}>Daily plan</Text>
        <View style={styles.planCard}>
          {todayPlan.priorityActions.map((action: UiTodayPlanAction) => (
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
          {todayPlan.optionalActions.map((action: UiTodayPlanAction) => (
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
    marginBottom: 18,
  },
  greetingLabel: {
    fontSize: 24,
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
  stateCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stateMoodEmoji: {
    fontSize: 22,
  },
  stateUrge: {
    flex: 1,
    alignItems: 'flex-start',
  },
  stateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  stateDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  struggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.danger,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  struggleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Colors.danger + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  struggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
  },
  quickIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyStateCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
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

