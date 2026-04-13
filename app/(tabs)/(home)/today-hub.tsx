import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
} from 'react-native';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
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
import Colors from '../../../constants/colors';
import { useUser } from '../../../core/domains/useUser';
import { useCheckin } from '../../../core/domains/useCheckin';
import { useAppStore } from '../../../stores/useAppStore';
import { useTodayHub } from '../../../features/home/hooks/useTodayHub';
import { useWizardEngineHook } from '../../../hooks/useWizardEngine';
import { HomeLoadingSkeleton } from '../../../components/LoadingSkeleton';
import { getStrictRedirectTarget, resolveCanonicalRoute } from '../../../utils/legacyRoutes';
import {
  getCheckInAvailabilityWindow,
  getCheckInWindowHint,
  isCheckInPeriodInWindow,
} from '../../../utils/checkInWindows';
import type { CheckInTimeOfDay } from '../../../types';
import type { WizardAction } from '../../../utils/wizardEngine';
import { mergeTodayCheckInsFromSources } from '../../../utils/mergeProfile';
import { getLocalDateKey } from '../../../utils/checkInDate';
import { TabHeaderActions } from '../../../components/TabHeaderActions';
// (kept import list clean)


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
  const { profile, daysSober } = useUser();
  const centralProfile = useAppStore((s) => s.userProfile);
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const { todayCheckIns: sliceTodayCheckIns, checkIns } = useCheckin();


  const mergedTodayCheckIns = useMemo(() => {
    const todayStr = getLocalDateKey();
    return mergeTodayCheckInsFromSources(sliceTodayCheckIns, centralDailyCheckIns, todayStr);
  }, [sliceTodayCheckIns, centralDailyCheckIns]);

  const sourceCheckIns = useMemo(
    () => (centralDailyCheckIns.length > 0 ? centralDailyCheckIns : checkIns),
    [centralDailyCheckIns, checkIns],
  );

  const uniqueCheckInDays = useMemo(
    () => new Set(sourceCheckIns.map((c) => c.date)).size,
    [sourceCheckIns],
  );

  const showRecoveryJourneyCard = uniqueCheckInDays < 7;

  const recoveryJourneySinceLabel = useMemo(() => {
    const soberDate = new Date(profile.soberDate);
    return soberDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [profile.soberDate]);

  const todayCheckIns = mergedTodayCheckIns;
  const { plan: wizardPlan, recentCompletion, clearRecentCompletion } =
    useWizardEngineHook();


  /** Re-render every minute so check-in windows update at period boundaries. */
  const [checkInWindowTick, setCheckInWindowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCheckInWindowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const checkInNow = useMemo(() => new Date(), [checkInWindowTick]);

  const [guidanceExpanded, setGuidanceExpanded] = useState(false);

  const guidanceActionIdsKey = useMemo(
    () => wizardPlan.dailyGuidance.actions.map((a) => a.id).join('|'),
    [wizardPlan.dailyGuidance.actions],
  );

  useEffect(() => {
    setGuidanceExpanded(false);
  }, [guidanceActionIdsKey]);

  const dateTimeLabel = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${mm}/${dd}/${yyyy} · ${time}`;
  }, [checkInWindowTick]);


  const displayProfile = centralProfile ?? profile;


  const greetingLabel = (() => {
    const hour = new Date().getHours();
    const base =
      hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = displayProfile?.name?.split?.(' ')?.[0] || 'there';
    return `${base}, ${firstName}`;
  })();


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


  const { showRelapsePlanCta } = vm;
  const { dailyGuidance } = wizardPlan;

  const guidanceActions = dailyGuidance.actions;
  const guidanceMultiple = guidanceActions.length > 1;
  const guidanceVisibleActions =
    guidanceMultiple && !guidanceExpanded
      ? guidanceActions.slice(0, 1)
      : guidanceActions;

  const isPeriodComplete = (period: CheckInTimeOfDay) =>
    todayCheckIns.some((c) => c.timeOfDay === period);


  const handleActionPress = (action: WizardAction) => {
    if (action.completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const period = action.params?.period;
    if (period === 'morning' || period === 'afternoon' || period === 'evening') {
      router.push({ pathname: '/daily-checkin', params: { period } } as any);
      return;
    }
    router.push(resolveCanonicalRoute(action.route) as any);
  };


  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={[styles.topRightHeaderWrap, { top: insets.top + 8 }]} testID="today-header-actions">
        <TabHeaderActions />
      </View>
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

        {showRecoveryJourneyCard && (
          <View style={styles.recoveryJourneyCard} testID="todayhub-recovery-journey-card">
            <Text style={styles.recoveryJourneyTitle}>Recovery is one day at a time</Text>
            <Text style={styles.recoveryJourneyDays}>{daysSober}</Text>
            <Text style={styles.recoveryJourneyDaysCaption}>Days Completed</Text>
            <Text style={styles.recoveryJourneySub}>Since {recoveryJourneySinceLabel}</Text>
          </View>
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


        {/* Encouragement message (hidden on day 0 — avoids "Today is Day 1" block on home) */}
        {dailyGuidance.encouragement && daysSober > 0 && (
          <View style={styles.encouragementCard}>
            <Text style={styles.encouragementText}>
              {dailyGuidance.encouragement}
            </Text>
          </View>
        )}


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
            const inWindow = isCheckInPeriodInWindow(period, checkInNow);
            const locked = !done && !inWindow;
            const a11yPeriod = title.replace('\n', ' ');
            return (
              <Pressable
                key={period}
                disabled={locked}
                accessibilityState={{ disabled: locked }}
                style={({ pressed }) => [
                  styles.checkInChip,
                  done && styles.checkInChipDone,
                  locked && styles.checkInChipLocked,
                  pressed && !locked && styles.pressed,
                ]}
                onPress={() => {
                  if (locked) return;
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
                      ? `${a11yPeriod}, please wait, ${getCheckInWindowHint(period)}`
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
                <Text style={styles.checkInChipWindow} numberOfLines={1}>
                  {getCheckInAvailabilityWindow(period)}
                </Text>
                <Text style={[styles.checkInChipSub, locked && styles.checkInChipSubLocked]}>
                  {done ? 'Done' : locked ? 'PLEASE WAIT' : 'Tap'}
                </Text>
              </Pressable>
            );
          })}
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
        {guidanceActions.length > 0 && (
          <>
            <Text style={styles.planTitle}>
              {dailyGuidance.isReentryMode ? "Today's plan" : "Today's guidance"}
            </Text>
            <View
              style={[
                styles.planCard,
                guidanceMultiple ? { marginBottom: 8 } : null,
              ]}
            >
              {guidanceVisibleActions.map((action) => (
                <Pressable
                  key={action.id}
                  disabled={action.completed}
                  accessibilityState={{ disabled: action.completed }}
                  style={({ pressed }) => [
                    styles.planRow,
                    action.completed && styles.planRowDone,
                    pressed && !action.completed && styles.pressed,
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
            {guidanceMultiple ? (
              <Pressable
                style={({ pressed }) => [
                  styles.guidanceExpandCollapse,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGuidanceExpanded((e) => !e);
                }}
                accessibilityRole="button"
                accessibilityLabel={guidanceExpanded ? 'Collapse guidance list' : 'Expand guidance list'}
                testID={
                  guidanceExpanded
                    ? 'todayhub-guidance-collapse'
                    : 'todayhub-guidance-expand'
                }
              >
                <Text style={styles.guidanceExpandCollapseText}>
                  {guidanceExpanded ? 'Collapse' : 'Expand'}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={[styles.planCard, { marginTop: 8, marginBottom: 14 }]}>
          <Pressable
            style={({ pressed }) => [styles.planRow, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/relapse-recovery' as any);
            }}
            testID="todayhub-log-relapse"
          >
            <View style={[styles.planStepBadge, { backgroundColor: Colors.danger + '18' }]}>
              <AlertTriangle size={14} color={Colors.danger} />
            </View>
            <View style={styles.planTextWrap}>
              <Text style={styles.planRowTitle}>Today was hard - log a setback</Text>
              <Text style={styles.planRowSubtitle}>One event doesn’t erase your progress</Text>
            </View>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>
        </View>

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


        {/* Dev-only: full onboarding walkthrough from the hero screen */}
        {__DEV__ ? (
          <View style={styles.devOnboardingBlock}>
            <Text style={styles.devOnboardingLabel}>Testing</Text>
            <Pressable
              style={({ pressed }) => [
                styles.devOnboardingBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/onboarding',
                  params: { devFullOnboarding: '1' },
                } as any);
              }}
              testID="todayhub-dev-onboarding"
            >
              <Sparkles size={18} color={Colors.primary} />
              <Text style={styles.devOnboardingBtnText}>Open onboarding</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}
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
  topRightHeaderWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 0.5,
    borderColor: Colors.border,
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
  recoveryJourneyCard: {
    backgroundColor: Colors.primary + '0C',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center' as const,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  recoveryJourneyTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  recoveryJourneyDays: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.primary,
    marginTop: 2,
  },
  recoveryJourneyDaysCaption: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 0,
    letterSpacing: 0.2,
  },
  recoveryJourneySub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center' as const,
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
    minHeight: 102,
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
  checkInChipWindow: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
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
  guidanceExpandCollapse: {
    alignSelf: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  guidanceExpandCollapseText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
    textAlign: 'center' as const,
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


