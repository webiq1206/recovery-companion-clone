import type { CheckInTimeOfDay, DailyCheckIn } from '../types';
import { getLocalDateKey } from './checkInDate';
import { isCheckInPeriodInWindow } from './checkInWindows';
import { mergeTodayCheckInsFromSources } from './mergeProfile';

const ORDER: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];

/**
 * First M→A→E period that is in its local-time window and not completed today
 * (merged local check-in slice + central app store), i.e. “TAP” on Today’s guidance.
 */
export function getFirstTappableCheckInPeriod(
  now: Date,
  sliceTodayCheckIns: DailyCheckIn[],
  centralDailyCheckIns: DailyCheckIn[],
): CheckInTimeOfDay | null {
  const todayStr = getLocalDateKey(now);
  const mergedToday = mergeTodayCheckInsFromSources(
    sliceTodayCheckIns,
    centralDailyCheckIns,
    todayStr,
  );
  for (const period of ORDER) {
    if (!isCheckInPeriodInWindow(period, now)) continue;
    const done = mergedToday.some((c) => c.timeOfDay === period);
    if (!done) return period;
  }
  return null;
}
