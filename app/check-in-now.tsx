import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { ArrowRight, Check, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCheckin } from '../core/domains/useCheckin';
import { useAppStore } from '../stores/useAppStore';
import { useWizardEngineHook } from '../hooks/useWizardEngine';
import { getFirstTappableCheckInPeriod } from '../utils/getFirstTappableCheckInPeriod';
import { isCheckInPeriodInWindow } from '../utils/checkInWindows';
import type { WizardAction } from '../utils/wizardEngine';

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

function checkInRowLocked(action: WizardAction, checkInNow: Date): boolean {
  const period = action.params?.period;
  if (period !== 'morning' && period !== 'afternoon' && period !== 'evening') return false;
  if (action.completed) return false;
  return !isCheckInPeriodInWindow(period, checkInNow);
}

export default function CheckInNowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayCheckIns } = useCheckin();
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const { plan: wizardPlan } = useWizardEngineHook();

  const [checkInWindowTick, setCheckInWindowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCheckInWindowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const checkInNow = useMemo(() => new Date(), [checkInWindowTick]);

  const tappablePeriod = useMemo(
    () => getFirstTappableCheckInPeriod(checkInNow, todayCheckIns, centralDailyCheckIns),
    [checkInNow, todayCheckIns, centralDailyCheckIns],
  );

  const action = useMemo(() => {
    if (!tappablePeriod) return null;
    return wizardPlan.dailyGuidance.actions.find((a) => a.id === `check-in-${tappablePeriod}`) ?? null;
  }, [wizardPlan.dailyGuidance.actions, tappablePeriod]);

  if (!tappablePeriod || !action) {
    return <Redirect href={'/(tabs)/(home)/today-hub' as any} />;
  }

  const locked = checkInRowLocked(action, checkInNow);
  const rowDisabled = action.completed || locked;

  const goHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/(home)/today-hub' as any);
  };

  const onRowPress = () => {
    if (action.completed) return;
    if (locked) {
      Haptics.selectionAsync();
      return;
    }
    const period = action.params?.period;
    if (period === 'morning' || period === 'afternoon' || period === 'evening') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/daily-checkin', params: { period } } as any);
    }
  };

  return (
    <View style={styles.wrapper}>
        <ScreenScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            You have a check-in available in your current window. Tap below when you are ready.
          </Text>
          <View style={styles.planCard}>
            <Pressable
              disabled={rowDisabled}
              accessibilityState={{ disabled: rowDisabled }}
              style={({ pressed }) => [
                styles.planRow,
                action.completed && styles.planRowDone,
                locked && styles.planRowLocked,
                pressed && !rowDisabled && styles.pressed,
              ]}
              onPress={onRowPress}
              testID="checkin-now-row"
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
              {!rowDisabled ? (
                <ChevronRight size={18} color={Colors.textSecondary} />
              ) : null}
            </Pressable>
          </View>
          <Pressable
            onPress={goHome}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go to home without checking in"
            testID="checkin-now-go-home"
          >
            <Text style={styles.secondaryBtnText}>Go to Home</Text>
          </Pressable>
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
  lead: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
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
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
