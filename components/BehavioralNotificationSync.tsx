import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useCheckin } from '../core/domains/useCheckin';
import { useUser } from '../core/domains/useUser';
import { useEngagement } from '../providers/EngagementProvider';
import { useNotifications } from '../providers/NotificationProvider';
import { useRiskPrediction } from '../providers/RiskPredictionProvider';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

/** Interval between behavioral trigger evaluations while the app may send immediate local notifications. */
const TICK_MS = 60_000;

/**
 * Periodically evaluates contextual “wellness” notifications (risk, streak, milestones, etc.).
 * Check-in window reminders are handled separately by {@link syncCheckInWindowReminders}.
 */
export function BehavioralNotificationSync() {
  const { evaluateBehavioralTriggers, isPermissionGranted } = useNotifications();
  const { notificationPreferences, streak } = useEngagement();
  const { riskCategory } = useRiskPrediction();
  const { daysSober } = useUser();
  const { checkIns } = useCheckin();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo) return;
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((n) => n + 1);
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const quietStart = notificationPreferences?.quietHoursStart ?? 22;
  const quietEnd = notificationPreferences?.quietHoursEnd ?? 7;
  const currentStreak = streak.currentStreak;

  const prefs = useMemo(
    () => ({
      riskBasedAlerts: notificationPreferences?.riskBasedAlerts !== false,
      milestoneReminders: notificationPreferences?.milestoneReminders !== false,
    }),
    [
      notificationPreferences?.riskBasedAlerts,
      notificationPreferences?.milestoneReminders,
    ],
  );

  const shouldEvaluate =
    Platform.OS !== 'web' &&
    !isExpoGo &&
    notificationPreferences?.enabled === true &&
    isPermissionGranted;

  useEffect(() => {
    if (!shouldEvaluate) return;
    void evaluateBehavioralTriggers(
      checkIns,
      riskCategory,
      currentStreak,
      daysSober,
      quietStart,
      quietEnd,
      prefs,
    );
  }, [
    shouldEvaluate,
    evaluateBehavioralTriggers,
    checkIns,
    riskCategory,
    currentStreak,
    daysSober,
    quietStart,
    quietEnd,
    prefs,
    tick,
  ]);

  return null;
}
