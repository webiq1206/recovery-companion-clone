/**
 * Schedules local notifications for daily check-in windows: at window start and every 2 hours
 * while that period is still open and incomplete for the local calendar day.
 * Cancels prior check-in window reminders on each sync.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { CheckInTimeOfDay, DailyCheckIn } from '../types';
import { NOTIFICATION_CHANNEL_CONFIG } from '../constants/notifications';
import { getLocalDateKey } from './checkInDate';
import { BYPASS_CHECK_IN_TIME_WINDOWS, isCheckInPeriodInWindow } from './checkInWindows';

export const CHECKIN_WINDOW_REMINDER_DATA_TYPE = 'checkin_window_reminder';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const PERIOD_LABEL: Record<CheckInTimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000;
/** Avoid scheduling fires in the immediate past due to clock skew. */
const MIN_LEAD_MS = 15_000;

function parseDateKey(dateKey: string): { y: number; m0: number; d: number } {
  const [y, m, d] = dateKey.split('-').map((x) => parseInt(x, 10));
  return { y, m0: m - 1, d };
}

function periodCompleteForDate(
  checkIns: DailyCheckIn[],
  dateKey: string,
  period: CheckInTimeOfDay,
): boolean {
  return checkIns.some((c) => c.date === dateKey && c.timeOfDay === period);
}

function enumerateTwoHourAnchors(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let t = new Date(start.getTime());
  while (t.getTime() <= end.getTime()) {
    out.push(new Date(t.getTime()));
    t = new Date(t.getTime() + REMINDER_INTERVAL_MS);
  }
  return out;
}

/**
 * Segments for reminder anchors on calendar day `dateKey` (matches home check-in chips).
 * Evening uses 12:00–4:59am and 6:00–11:59pm on that date (same date key as stored check-ins).
 */
function getReminderSegmentsForPeriod(
  dateKey: string,
  period: CheckInTimeOfDay,
): { start: Date; end: Date }[] {
  const { y, m0, d } = parseDateKey(dateKey);
  if (period === 'morning') {
    return [
      {
        start: new Date(y, m0, d, 5, 0, 0, 0),
        end: new Date(y, m0, d, 11, 59, 59, 999),
      },
    ];
  }
  if (period === 'afternoon') {
    return [
      {
        start: new Date(y, m0, d, 12, 0, 0, 0),
        end: new Date(y, m0, d, 17, 59, 59, 999),
      },
    ];
  }
  return [
    {
      start: new Date(y, m0, d, 0, 0, 0, 0),
      end: new Date(y, m0, d, 4, 59, 59, 999),
    },
    {
      start: new Date(y, m0, d, 18, 0, 0, 0),
      end: new Date(y, m0, d, 23, 59, 59, 999),
    },
  ];
}

function maxSegmentEndMs(dateKey: string, period: CheckInTimeOfDay): number {
  return Math.max(...getReminderSegmentsForPeriod(dateKey, period).map((s) => s.end.getTime()));
}

function collectAnchorFireTimes(dateKey: string, period: CheckInTimeOfDay, now: Date): Date[] {
  const anchors: Date[] = [];
  for (const { start, end } of getReminderSegmentsForPeriod(dateKey, period)) {
    anchors.push(...enumerateTwoHourAnchors(start, end));
  }
  const cutoff = now.getTime() + MIN_LEAD_MS;
  const cap = maxSegmentEndMs(dateKey, period);
  return anchors.filter(
    (t) => t.getTime() >= cutoff && t.getTime() <= cap && isCheckInPeriodInWindow(period, t),
  );
}

async function cancelScheduledCheckInWindowReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const req of pending) {
      const data = req.content.data as { type?: string } | undefined;
      if (data?.type === CHECKIN_WINDOW_REMINDER_DATA_TYPE) {
        await Notifications.cancelScheduledNotificationAsync(req.identifier);
      }
    }
  } catch (e) {
    console.log('[CheckInReminders] Cancel scheduled error:', e);
  }
}

export interface SyncCheckInWindowRemindersParams {
  todayCheckIns: DailyCheckIn[];
  /** Defaults to `new Date()` */
  now?: Date;
}

/**
 * Reschedules check-in window reminders for the current local calendar day.
 * No-op on web and Expo Go. When `BYPASS_CHECK_IN_TIME_WINDOWS` is true, cancels reminders only.
 */
export async function syncCheckInWindowReminders(
  params: SyncCheckInWindowRemindersParams,
): Promise<void> {
  const { todayCheckIns, now: nowArg } = params;
  const now = nowArg ?? new Date();

  if (Platform.OS === 'web' || isExpoGo) {
    return;
  }

  if (BYPASS_CHECK_IN_TIME_WINDOWS) {
    await cancelScheduledCheckInWindowReminders();
    return;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await cancelScheduledCheckInWindowReminders();
      return;
    }
  } catch (e) {
    console.log('[CheckInReminders] Permission check error:', e);
    return;
  }

  await cancelScheduledCheckInWindowReminders();

  const dateKey = getLocalDateKey(now);
  const periods: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];

  for (const period of periods) {
    if (periodCompleteForDate(todayCheckIns, dateKey, period)) continue;

    const fireTimes = collectAnchorFireTimes(dateKey, period, now);
    for (const when of fireTimes) {
      const id = `checkin-win-${dateKey}-${period}-${when.getTime()}`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: `Time for your ${PERIOD_LABEL[period]} check-in`,
            body: "Take a minute to log how you're doing in RecoveryRoad.",
            sound: false,
            data: {
              type: CHECKIN_WINDOW_REMINDER_DATA_TYPE,
              period,
              dateKey,
            },
            categoryIdentifier: NOTIFICATION_CHANNEL_CONFIG.id,
            ...(Platform.OS === 'android'
              ? { android: { channelId: NOTIFICATION_CHANNEL_CONFIG.id } }
              : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
          },
        });
      } catch (e) {
        console.log('[CheckInReminders] Schedule error:', period, e);
      }
    }
  }
}
