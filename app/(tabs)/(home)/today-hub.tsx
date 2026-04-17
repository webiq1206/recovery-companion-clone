import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Compass,
  Info,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../../constants/colors';
import { hairline, radius, shadows, spacing } from '../../../constants/theme';
import { useUser } from '../../../core/domains/useUser';
import { arePeerPracticeFeaturesEnabled } from '../../../core/socialLiveConfig';
import {
  DEFAULT_SMART_ENTRY_MOOD,
  getSmartEntryRecommendation,
  moodInputFromLatestCheckIn,
} from '../../../core/smartEntryRouting';
import { useAppStore } from '../../../stores/useAppStore';
import { useSubscription } from '../../../providers/SubscriptionProvider';
import { useTodayHub } from '../../../features/home/hooks/useTodayHub';
import { useWizardEngineHook } from '../../../hooks/useWizardEngine';
import { HomeLoadingSkeleton } from '../../../components/LoadingSkeleton';
import { getStrictRedirectTarget, resolveCanonicalRoute } from '../../../utils/legacyRoutes';
import { isCheckInPeriodInWindow } from '../../../utils/checkInWindows';
import { getGuidanceCollapsedFocusIndex, type WizardAction } from '../../../utils/wizardEngine';
import { formatGuidanceDateKeyUs, getGuidanceDateKey, getLocalDateKey } from '../../../utils/checkInDate';
import { TabHeaderActions } from '../../../components/TabHeaderActions';
import { ProfileHeaderSummaryCard } from '../../../components/ProfileHeaderSummaryCard';

const SMART_ENTRY_BANNER_DISMISS_KEY = 'smart_entry_banner_dismissed_day';

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
  const { profile, daysSober } = useUser();
  const { hasFeature } = useSubscription();
  const centralProfile = useAppStore((s) => s.userProfile);
  const dailyCheckIns = useAppStore((s) => s.dailyCheckIns);

  const { plan: wizardPlan, recentCompletion, clearRecentCompletion } =
    useWizardEngineHook();

  const [smartBannerDismissedDay, setSmartBannerDismissedDay] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(SMART_ENTRY_BANNER_DISMISS_KEY).then((v) =>
      setSmartBannerDismissedDay(v ?? ''),
    );
  }, []);

  const { smartMoodInput, usedLatestCheckInForRouting } = useMemo(() => {
    const fromCheckIn = moodInputFromLatestCheckIn(dailyCheckIns);
    return {
      smartMoodInput: fromCheckIn ?? DEFAULT_SMART_ENTRY_MOOD,
      usedLatestCheckInForRouting: fromCheckIn !== null,
    };
  }, [dailyCheckIns]);

  const smartEntry = useMemo(
    () => getSmartEntryRecommendation(daysSober, smartMoodInput),
    [daysSober, smartMoodInput],
  );

  const todayDateKey = getLocalDateKey(new Date());
  const showSmartEntryBanner =
    smartBannerDismissedDay !== null && smartBannerDismissedDay !== todayDateKey;

  const dismissSmartEntryBanner = useCallback(() => {
    const key = getLocalDateKey(new Date());
    setSmartBannerDismissedDay(key);
    void AsyncStorage.setItem(SMART_ENTRY_BANNER_DISMISS_KEY, key);
  }, []);


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
    const wallClock = new Date();
    const guidanceKey = getGuidanceDateKey(checkInNow);
    const datePart = formatGuidanceDateKeyUs(guidanceKey);
    const time = wallClock.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${datePart} · ${time}`;
  }, [checkInNow, checkInWindowTick]);

  const dailyGuidance = wizardPlan.dailyGuidance;
  const guidanceActions = dailyGuidance.actions;
  const guidanceMultiple = guidanceActions.length > 1;
  const guidanceFocusIndex = useMemo(
    () => getGuidanceCollapsedFocusIndex(guidanceActions, checkInNow),
    [guidanceActions, checkInNow],
  );

  const guidanceHeadingScale = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    if (guidanceActions.length === 0 || dailyGuidance.isReentryMode) {
      guidanceHeadingScale.setValue(1);
      return;
    }
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(guidanceHeadingScale, {
          toValue: 1.14,
          duration: 900,
          useNativeDriver: true,
        }),
        RNAnimated.timing(guidanceHeadingScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [guidanceActions.length, dailyGuidance.isReentryMode, guidanceHeadingScale]);

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
          {dailyGuidance.isReentryMode ? (
            <Text style={styles.greetingSubtitle}>
              Welcome back. Let\u2019s ease into today.
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.struggleButton,
              styles.struggleButtonInHeader,
              dailyGuidance.isReentryMode && styles.struggleButtonAfterReentrySubtitle,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push('/crisis-mode' as any);
            }}
            testID="todayhub-struggle-button"
          >
            <View style={styles.struggleIconWrap}>
              <AlertTriangle size={16} color={Colors.white} />
            </View>
            <Text style={styles.struggleText}>Crisis tool... I&apos;m struggling</Text>
            <ArrowRight size={15} color={Colors.white} />
          </Pressable>
        </View>

        <ProfileHeaderSummaryCard
          profile={displayProfile}
          centeredHeadline="Recovery is one day at a time"
          testID="todayhub-recovery-journey-card"
        />

        {showSmartEntryBanner ? (
          <View style={styles.smartEntryCard} testID="todayhub-smart-entry-banner">
            <View style={styles.smartEntryHeaderRow}>
              <View style={styles.smartEntryIconWrap}>
                <Compass size={20} color={Colors.primary} />
              </View>
              <View style={styles.smartEntryHeaderText}>
                <Text style={styles.smartEntryTitle}>Suggested for you</Text>
                <Text style={styles.smartEntryKicker} numberOfLines={2}>
                  {usedLatestCheckInForRouting
                    ? 'Based on your latest check-in and time sober.'
                    : 'Signals use neutral defaults until you check in.'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss suggestion for today"
                hitSlop={12}
                onPress={() => {
                  Haptics.selectionAsync();
                  dismissSmartEntryBanner();
                }}
                style={({ pressed }) => [styles.smartEntryDismiss, pressed && styles.pressed]}
              >
                <X size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.smartEntryBody} numberOfLines={3}>
              Path: {smartEntry.recoveryPathTitle}. Room: {smartEntry.recoveryRoomName}.{' '}
              {smartEntry.reasons[0]}
            </Text>
            <View style={styles.smartEntryActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.smartEntryBtn,
                  styles.smartEntryBtnSecondary,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/recovery-paths/room-list',
                    params: { pathId: smartEntry.recoveryPathId },
                  } as never);
                }}
              >
                <Text style={styles.smartEntryBtnSecondaryText}>Recovery path</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.smartEntryBtn,
                  styles.smartEntryBtnPrimary,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const canRoomSession =
                    hasFeature('recovery_rooms') && arePeerPracticeFeaturesEnabled();
                  if (canRoomSession) {
                    router.push({
                      pathname: '/room-session',
                      params: { roomId: smartEntry.recoveryRoomId },
                    } as never);
                  } else {
                    router.push('/recovery-rooms' as never);
                  }
                }}
              >
                <Text style={styles.smartEntryBtnPrimaryText}>Recovery room</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Context hint (replaces PersonalizationCard) */}
        {dailyGuidance.contextHint && (
          <View style={styles.contextHintCard}>
            <Info size={16} color={Colors.accent} />
            <Text style={styles.contextHintText}>
              {dailyGuidance.contextHint}
            </Text>
          </View>
        )}

        {/* Completion card (only when there is a real plan — empty actions must not read as "all done") */}
        {guidanceActions.length > 0 &&
          dailyGuidance.isComplete &&
          dailyGuidance.completionMessage && (
          <View style={styles.completionCard}>
            <CheckCircle2 size={22} color={Colors.primary} />
            <View style={styles.completionTextWrap}>
              <Text style={styles.completionMessage}>
                {dailyGuidance.completionMessage}
              </Text>
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
              <View style={styles.guidanceTitleLeft}>
                {dailyGuidance.isReentryMode ? (
                  <Text style={styles.planTitle}>Today's plan</Text>
                ) : (
                  <RNAnimated.View
                    style={[styles.guidanceHeadingZoomWrap, { transform: [{ scale: guidanceHeadingScale }] }]}
                  >
                    <Text style={styles.planTitle}>Today's Actions</Text>
                  </RNAnimated.View>
                )}
                {!dailyGuidance.isReentryMode && dailyGuidance.isComplete ? (
                  <Text style={styles.guidanceAllComplete}>All Complete</Text>
                ) : null}
              </View>
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
                  accessibilityLabel={guidanceExpanded ? 'Collapse actions list' : 'Expand actions list'}
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
              <Text style={styles.relapsePlanRiskLine}>Your risk level is elevated right now.</Text>
              <Text style={styles.relapsePlanSubtitle}>
                Review warning signs, triggers, and coping strategies while risk is
                high.
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.danger} />
          </Pressable>
        )}
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
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  header: {
    marginBottom: spacing.xs + 2,
  },
  topRightHeaderWrap: {
    position: 'absolute',
    right: spacing.sm,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: Colors.cardBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
    ...shadows.soft,
  },
  greetingLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.35,
  },
  greetingDateTime: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  contextHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.cardBackground,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm - 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
    marginBottom: spacing.sm - 2,
    gap: spacing.xs,
    ...shadows.soft,
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
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm - 4,
    marginBottom: 0,
  },
  struggleButtonInHeader: {
    marginTop: 6,
  },
  struggleButtonAfterReentrySubtitle: {
    marginTop: 8,
  },
  struggleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.danger + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  struggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '0C',
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary + '35',
    marginBottom: spacing.sm - 2,
    gap: spacing.sm - 4,
    ...shadows.soft,
  },
  completionTextWrap: {
    flex: 1,
    gap: 6,
  },
  completionMessage: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.sm - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary + '50',
    marginBottom: spacing.md - 6,
    ...shadows.soft,
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
  smartEntryCard: {
    backgroundColor: Colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
    ...shadows.soft,
  },
  smartEntryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  smartEntryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartEntryHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  smartEntryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  smartEntryKicker: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  smartEntryDismiss: {
    padding: 4,
    marginTop: -2,
    marginRight: -4,
  },
  smartEntryBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  smartEntryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smartEntryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartEntryBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  smartEntryBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  smartEntryBtnSecondary: {
    backgroundColor: Colors.cardBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
  },
  smartEntryBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  guidanceTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
    gap: 12,
  },
  guidanceTitleLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    minWidth: 0,
  },
  guidanceHeadingZoomWrap: {
    flexShrink: 1,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  guidanceAllComplete: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  guidanceTitleChevronHit: {
    padding: 6,
    marginRight: -6,
  },
  planCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
    marginBottom: spacing.md,
    ...shadows.card,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: hairline,
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
    fontWeight: '700',
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
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm - 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.danger + '38',
    ...shadows.soft,
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
    borderRadius: radius.lg,
    paddingVertical: spacing.sm - 4,
    paddingHorizontal: spacing.sm - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.danger + '38',
    ...shadows.soft,
    marginTop: 12,
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
  relapsePlanRiskLine: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 6,
    lineHeight: 18,
  },
  relapsePlanSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
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


