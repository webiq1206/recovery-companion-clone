import type { CheckInTimeOfDay, DailyCheckIn } from '../types';
import { getGuidanceDateKey } from './checkInDate';
import { isCheckInPeriodInWindow } from './checkInWindows';
import { mergeTodayCheckInsFromSources } from './mergeProfile';

const ORDER: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];

/**
 * First M→A→E period that is in its local-time window and not completed for the
 * guidance day (5:00 AM rollover). Pass the full local check-in slice; rows are
 * filtered to `getGuidanceDateKey(now)` before merging with central.
 */
export function getFirstTappableCheckInPeriod(
  now: Date,
  sliceCheckIns: DailyCheckIn[],
  centralDailyCheckIns: DailyCheckIn[],
): CheckInTimeOfDay | null {
  const guidanceDayKey = getGuidanceDateKey(now);
  const sliceForGuidanceDay = sliceCheckIns.filter((c) => c.date === guidanceDayKey);
  const mergedToday = mergeTodayCheckInsFromSources(
    sliceForGuidanceDay,
    centralDailyCheckIns,
    guidanceDayKey,
  );
  for (const period of ORDER) {
    if (!isCheckInPeriodInWindow(period, now)) continue;
    const done = mergedToday.some((c) => c.timeOfDay === period);
    if (!done) return period;
  }
  return null;
}
