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
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../../constants/colors';
import { useUser } from '../../../core/domains/useUser';
import { useAppStore } from '../../../stores/useAppStore';
import { useTodayHub } from '../../../features/home/hooks/useTodayHub';
import { useWizardEngineHook } from '../../../hooks/useWizardEngine';
import { HomeLoadingSkeleton } from '../../../components/LoadingSkeleton';
import { getStrictRedirectTarget, resolveCanonicalRoute } from '../../../utils/legacyRoutes';
import { isCheckInPeriodInWindow } from '../../../utils/checkInWindows';
import { getGuidanceCollapsedFocusIndex, type WizardAction } from '../../../utils/wizardEngine';
import { TabHeaderActions } from '../../../components/TabHeaderActions';
import { ProfileHeaderSummaryCard } from '../../../components/ProfileHeaderSummaryCard';


const PLEASE_WAIT_TOKEN = 'PLEASE WAIT';

function GuidanceRowSubtitle({
  subtitle,
  completed,
  locked,
}: {
  subtitle: string;
  completed: boolean;
  locked: boolean;
}) {
  const baseStyle = [
    styles.planRowSubtitle,
    completed && styles.planRowSubtitleDone,
    locked && styles.planRowSubtitleLocked,
  ];
  if (!locked || !subtitle.includes(PLEASE_WAIT_TOKEN)) {
    return <Text style={baseStyle}>{subtitle}</Text>;
  }
  const i = subtitle.indexOf(PLEASE_WAIT_TOKEN);
  const before = subtitle.slice(0, i);
  const after = subtitle.slice(i + PLEASE_WAIT_TOKEN.length);
  return (
    <Text style={baseStyle}>
      {before}
      <Text style={styles.planRowSubtitlePleaseWait}>{PLEASE_WAIT_TOKEN}</Text>
      {after}
    </Text>
  );
}

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

  const dailyGuidance = wizardPlan.dailyGuidance;
  const guidanceActions = dailyGuidance.actions;
  const guidanceMultiple = guidanceActions.length > 1;
  const guidanceFocusIndex = useMemo(
    () => getGuidanceCollapsedFocusIndex(guidanceActions, checkInNow),
    [guidanceActions, checkInNow],
  );

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

  const guidanceVisibleActions =
    guidanceMultiple && !guidanceExpanded
      ? guidanceActions.slice(guidanceFocusIndex, guidanceFocusIndex + 1)
      : guidanceActions;

  const checkInRowLocked = (action: WizardAction): boolean => {
    const period = action.params?.period;
    if (period !== 'morning' && period !== 'afternoon' && period !== 'evening') return false;
    if (action.completed) return false;
    return !isCheckInPeriodInWindow(period, checkInNow);
  };

  const handleActionPress = (action: WizardAction) => {
    if (action.completed) return;
    if (checkInRowLocked(action)) {
      Haptics.selectionAsync();
      return;
    }
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

        <ProfileHeaderSummaryCard
          profile={displayProfile}
          centeredHeadline="Recovery is one day at a time"
          testID="todayhub-recovery-journey-card"
        />

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
            <View style={styles.guidanceTitleRow}>
              <Text style={styles.planTitle}>
                {dailyGuidance.isReentryMode ? "Today's plan" : "Today's guidance"}
              </Text>
              {guidanceMultiple ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.guidanceTitleChevronHit,
                    pressed && { opacity: 0.75 },
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
                  {guidanceExpanded ? (
                    <ChevronUp size={22} color={Colors.primary} />
                  ) : (
                    <ChevronDown size={22} color={Colors.primary} />
                  )}
                </Pressable>
              ) : null}
            </View>
            <View style={styles.planCard}>
              {guidanceVisibleActions.map((action) => {
                const locked = checkInRowLocked(action);
                const rowDisabled = action.completed || locked;
                return (
                  <Pressable
                    key={action.id}
                    disabled={rowDisabled}
                    accessibilityState={{ disabled: rowDisabled }}
                    style={({ pressed }) => [
                      styles.planRow,
                      action.completed && styles.planRowDone,
                      locked && styles.planRowLocked,
                      pressed && !rowDisabled && styles.pressed,
                    ]}
                    onPress={() => handleActionPress(action)}
                    testID={`todayhub-action-${action.id}`}
                  >
                    <View
                      style={[
                        styles.planStepBadge,
                        action.completed && styles.planStepBadgeDone,
                        locked && styles.planStepBadgeLocked,
                      ]}
                    >
                      {action.completed ? (
                        <Check size={14} color="#FFF" />
                      ) : (
                        <ArrowRight
                          size={14}
                          color={locked ? Colors.textMuted : Colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.planTextWrap}>
                      <Text
                        style={[
                          styles.planRowTitle,
                          action.completed && styles.planRowTitleDone,
                          locked && styles.planRowTitleLocked,
                        ]}
                      >
                        {action.title}
                      </Text>
                      <GuidanceRowSubtitle
                        subtitle={action.subtitle}
                        completed={action.completed}
                        locked={locked}
                      />
                    </View>
                    {!rowDisabled && (
                      <ChevronRight size={18} color={Colors.textSecondary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
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
  guidanceTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
    gap: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    flexShrink: 1,
  },
  guidanceTitleChevronHit: {
    padding: 6,
    marginRight: -6,
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
  planRowLocked: {
    opacity: 0.72,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
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
  planStepBadgeLocked: {
    backgroundColor: Colors.surface,
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
  planRowTitleLocked: {
    color: Colors.textMuted,
  },
  planRowSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planRowSubtitleDone: {
    color: Colors.textMuted,
  },
  planRowSubtitleLocked: {
    color: Colors.textMuted,
  },
  planRowSubtitlePleaseWait: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFE082',
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


