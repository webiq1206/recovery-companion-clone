import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
  Alert,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect, usePathname } from 'expo-router';
import {
  ArrowRight,
  AlertTriangle,
  Activity,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/constants/milestones';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useAppStore } from '@/stores/useAppStore';
import { useTodayHub } from '@/features/home/hooks/useTodayHub';
import { useWizardEngineHook } from '@/hooks/useWizardEngine';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';
import { RecoveryStabilityPanel } from '@/components/RecoveryStabilityPanel';
import { useRelapse } from '@/core/domains/useRelapse';
import { getStrictRedirectTarget, resolveCanonicalRoute } from '@/utils/legacyRoutes';
import {
  getCheckInWindowHint,
  isCheckInPeriodInWindow,
} from '@/utils/checkInWindows';
import type { CheckInTimeOfDay } from '@/types';
import type { WizardAction } from '@/utils/wizardEngine';
import { mergeTodayCheckInsFromSources } from '@/utils/mergeProfile';

const CHECK_IN_PERIODS: { period: CheckInTimeOfDay; title: string }[] = [
  { period: 'morning', title: 'Morning\nCheck-In' },
  { period: 'afternoon', title: 'Afternoon\nCheck-In' },
  { period: 'evening', title: 'Evening\nCheck-In' },
];

function ActionToast({ title, onDone }: { title: string; onDone: () => void }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.sequence([
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      RNAnimated.delay(2500),
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <RNAnimated.View style={[styles.toastCard, { opacity }]}>
      <CheckCircle2 size={18} color={Colors.primary} />
      <Text style={styles.toastText}>{title} done</Text>
    </RNAnimated.View>
  );
}

export default function TodayHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const vm = useTodayHub();
  const { profile } = useUser();
  const centralProfile = useAppStore((s) => s.userProfile);
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const { todayCheckIn: sliceTodayCheckIn, todayCheckIns: sliceTodayCheckIns } = useCheckin();
  const { logRelapse } = useRelapse();
  const logRelapseToCentralStore = useAppStore.use.logRelapse();

  const mergedTodayCheckIns = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return mergeTodayCheckInsFromSources(sliceTodayCheckIns, centralDailyCheckIns, todayStr);
  }, [sliceTodayCheckIns, centralDailyCheckIns]);

  const todayCheckIns = mergedTodayCheckIns;
  const todayCheckIn = useMemo(() => {
    if (mergedTodayCheckIns.length === 0) return null;
    return mergedTodayCheckIns.reduce((latest, c) =>
      new Date(c.completedAt).getTime() > new Date(latest.completedAt).getTime() ? c : latest,
    mergedTodayCheckIns[0]);
  }, [mergedTodayCheckIns]);
  const { plan: wizardPlan, recentCompletion, clearRecentCompletion } =
    useWizardEngineHook();

  /** Re-render every minute so check-in windows update at period boundaries. */
  const [, setCheckInWindowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCheckInWindowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const dateTimeLabel = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${mm}/${dd}/${yyyy} · ${time}`;
  }, [setCheckInWindowTick]);

  const displayProfile = centralProfile ?? profile;

  const greetingLabel = (() => {
    const hour = new Date().getHours();
    const base =
      hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = displayProfile?.name?.split?.(' ')?.[0] || 'there';
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

  const strictTarget = getStrictRedirectTarget('/(tabs)/(home)/today-hub');
  if (strictTarget && pathname !== strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  if (vm.isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (vm.shouldRedirectToOnboarding) {
    return <Redirect href={'/onboarding' as any} />;
  }

  const { stability, relapseRisk, showRelapsePlanCta } = vm;
  const { setupProgress, dailyGuidance } = wizardPlan;

  const isPeriodComplete = (period: CheckInTimeOfDay) =>
    todayCheckIns.some((c) => c.timeOfDay === period);

  const handleActionPress = (action: WizardAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(resolveCanonicalRoute(action.route) as any);
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <ScreenScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.header}>
          <Text style={styles.greetingLabel}>{greetingLabel}</Text>
          <Text style={styles.greetingDateTime}>{dateTimeLabel}</Text>
          <Text style={styles.greetingSubtitle}>
            {dailyGuidance.isReentryMode
              ? 'Welcome back. Let\u2019s ease into today.'
              : 'A quick snapshot of how you\u2019re doing and what to do next.'}
          </Text>
        </View>

        {/* Setup progress banner for new/incomplete users */}
        {setupProgress &&
          setupProgress.completedSteps < setupProgress.totalSteps &&
          setupProgress.nextStep && (
          <Pressable
            style={({ pressed }) => [
              styles.setupBanner,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const step =
                setupProgress.nextStep ?? setupProgress.remainingSteps[0];
              if (step) {
                router.push(resolveCanonicalRoute(step.route) as any);
              }
            }}
            testID="todayhub-setup-banner"
          >
            <View style={styles.setupProgressBar}>
              <View
                style={[
                  styles.setupProgressFill,
                  {
                    width: `${(setupProgress.completedSteps / setupProgress.totalSteps) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.setupTextWrap}>
              <Text style={styles.setupTitle}>
                {setupProgress.completedSteps} of {setupProgress.totalSteps} setup
                steps done
              </Text>
              <Text style={styles.setupNext}>
                Next: {setupProgress.nextStep.title}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.primary} />
          </Pressable>
        )}

        {/* Context hint (replaces PersonalizationCard) */}
        {dailyGuidance.contextHint && (
          <View style={styles.contextHintCard}>
            <Info size={16} color={Colors.accent} />
            <Text style={styles.contextHintText}>
              {dailyGuidance.contextHint}
            </Text>
          </View>
        )}

        {/* Primary crisis entry — above encouragement so support is one tap away */}
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

        {/* Encouragement message */}
        {dailyGuidance.encouragement && (
          <View style={styles.encouragementCard}>
            <Text style={styles.encouragementText}>
              {dailyGuidance.encouragement}
            </Text>
          </View>
        )}

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

        {/* Comprehensive Stability — directly under mood & urge */}
        <RecoveryStabilityPanel
          score={stability.score}
          stabilityTrend={stability.trend}
          relapseRiskCategory={relapseRisk.category}
          relapseRiskLabel={relapseRisk.label}
          relapseRiskTrendLabel={relapseRisk.trendLabel}
          relapseRiskWhySentence={relapseRisk.whySentence}
          relapseRiskFactors={relapseRisk.factors}
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
                Review warning signs, triggers, and coping strategies while risk is
                high.
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.danger} />
          </Pressable>
        )}

        {/* Time-of-day check-ins */}
        <Text style={styles.sectionLabel}>Check-ins today</Text>
        <View style={styles.checkInRow}>
          {CHECK_IN_PERIODS.map(({ period, title }) => {
            const done = isPeriodComplete(period);
            const inWindow = isCheckInPeriodInWindow(period);
            const locked = !done && !inWindow;
            const a11yPeriod = title.replace('\n', ' ');
            return (
              <Pressable
                key={period}
                style={({ pressed }) => [
                  styles.checkInChip,
                  done && styles.checkInChipDone,
                  locked && styles.checkInChipLocked,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  if (locked) {
                    Haptics.selectionAsync();
                    Alert.alert(
                      title.replace('\n', ' '),
                      `${getCheckInWindowHint(period)}. You can complete this check-in during that window.`,
                    );
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/daily-checkin',
                    params: { period },
                  } as any);
                }}
                testID={`todayhub-checkin-${period}`}
                accessibilityLabel={
                  done
                    ? `${a11yPeriod} completed`
                    : locked
                      ? `${a11yPeriod}, not available until ${getCheckInWindowHint(period)}`
                      : a11yPeriod
                }
              >
                <View style={styles.checkInChipIconWrap}>
                  {done ? (
                    <Check size={16} color={Colors.primary} />
                  ) : (
                    <Activity size={16} color={locked ? Colors.textMuted : Colors.primary} />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkInChipLabel,
                    done && styles.checkInChipLabelDone,
                    locked && styles.checkInChipLabelLocked,
                  ]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                <Text style={[styles.checkInChipSub, locked && styles.checkInChipSubLocked]}>
                  {done ? 'Done' : locked ? 'Locked' : 'Tap'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.planCard, { marginTop: 8, marginBottom: 14 }]}>
          <Pressable
            style={({ pressed }) => [styles.planRow, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Log a setback',
                "Recording a setback doesn't erase your progress. You'll see supportive next steps and can strengthen your system.",
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log setback',
                    style: 'default',
                    onPress: () => {
                      logRelapse();
                      logRelapseToCentralStore();
                    },
                  },
                ],
              );
            }}
            testID="todayhub-log-relapse"
          >
            <View style={[styles.planStepBadge, { backgroundColor: Colors.danger + '18' }]}>
              <AlertTriangle size={14} color={Colors.danger} />
            </View>
            <View style={styles.planTextWrap}>
              <Text style={styles.planRowTitle}>Today was hard - log a setback</Text>
              <Text style={styles.planRowSubtitle}>One event doesn't erase your progress</Text>
            </View>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>
        </View>

        {/* Completion card */}
        {dailyGuidance.isComplete && dailyGuidance.completionMessage && (
          <View style={styles.completionCard}>
            <CheckCircle2 size={22} color={Colors.primary} />
            <View style={styles.completionTextWrap}>
              <Text style={styles.completionMessage}>
                {dailyGuidance.completionMessage}
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/progress' as any);
                }}
              >
                <Text style={styles.completionLink}>See your progress</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/journal' as any);
                }}
                testID="todayhub-completion-journal-link"
              >
                <Text style={styles.completionLink}>Open journal — past entries & new entry</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Post-action feedback toast */}
        {recentCompletion &&
          Date.now() - recentCompletion.timestamp < 4000 && (
            <ActionToast
              title={recentCompletion.actionTitle}
              onDone={clearRecentCompletion}
            />
          )}

        {/* Daily actions list (from wizard engine) */}
        {dailyGuidance.actions.length > 0 && (
          <>
            <Text style={styles.planTitle}>
              {dailyGuidance.isReentryMode ? "Today's plan" : "Today's guidance"}
            </Text>
            <View style={styles.planCard}>
              {dailyGuidance.actions.map((action) => (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.planRow,
                    action.completed && styles.planRowDone,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleActionPress(action)}
                  testID={`todayhub-action-${action.id}`}
                >
                  <View
                    style={[
                      styles.planStepBadge,
                      action.completed && styles.planStepBadgeDone,
                    ]}
                  >
                    {action.completed ? (
                      <Check size={14} color="#FFF" />
                    ) : (
                      <ArrowRight size={14} color={Colors.primary} />
                    )}
                  </View>
                  <View style={styles.planTextWrap}>
                    <Text
                      style={[
                        styles.planRowTitle,
                        action.completed && styles.planRowTitleDone,
                      ]}
                    >
                      {action.title}
                    </Text>
                    <Text
                      style={[
                        styles.planRowSubtitle,
                        action.completed && styles.planRowSubtitleDone,
                      ]}
                    >
                      {action.subtitle}
                    </Text>
                  </View>
                  {!action.completed && (
                    <ChevronRight size={18} color={Colors.textSecondary} />
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Risk warnings (from wizard engine) */}
        {dailyGuidance.riskWarnings.length > 0 && (
          <View style={styles.warningCard}>
            {dailyGuidance.riskWarnings.map((warning, index) => (
              <View key={index} style={styles.warningRow}>
                <AlertTriangle size={16} color={Colors.danger} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Short-term / QA: remove when no longer needed */}
        <View style={styles.devOnboardingBlock}>
          <Text style={styles.devOnboardingLabel}>Testing</Text>
          <Pressable
            style={({ pressed }) => [
              styles.devOnboardingBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/onboarding' as any);
            }}
            testID="todayhub-dev-onboarding"
          >
            <Sparkles size={18} color={Colors.primary} />
            <Text style={styles.devOnboardingBtnText}>Open onboarding</Text>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </ScreenScrollView>
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
  greetingDateTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
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
  devOnboardingBlock: {
    marginTop: 28,
    gap: 8,
  },
  devOnboardingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  devOnboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devOnboardingBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: 14,
    gap: 12,
  },
  setupProgressBar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupProgressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
  },
  setupTextWrap: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  setupNext: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  contextHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    gap: 8,
  },
  contextHintText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  encouragementCard: {
    backgroundColor: Colors.primary + '0A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    marginBottom: 14,
  },
  encouragementText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    lineHeight: 21,
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
  checkInRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  checkInChip: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 88,
  },
  checkInChipDone: {
    borderColor: Colors.primary + '55',
    backgroundColor: Colors.primary + '08',
  },
  checkInChipLocked: {
    opacity: 0.65,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  checkInChipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkInChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  checkInChipLabelDone: {
    color: Colors.textSecondary,
  },
  checkInChipLabelLocked: {
    color: Colors.textMuted,
  },
  checkInChipSub: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  checkInChipSubLocked: {
    color: Colors.textMuted,
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '0C',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: 14,
    gap: 12,
  },
  completionTextWrap: {
    flex: 1,
    gap: 6,
  },
  completionMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  completionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
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
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  planRowDone: {
    opacity: 0.6,
  },
  planStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStepBadgeDone: {
    backgroundColor: Colors.primary,
  },
  planTextWrap: {
    flex: 1,
  },
  planRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  planRowTitleDone: {
    color: Colors.textSecondary,
  },
  planRowSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planRowSubtitleDone: {
    color: Colors.textMuted,
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
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  pressed: {
    opacity: 0.9,
  },
});
