import type { CheckInTimeOfDay } from '../types';

/**
 * When true, all check-in periods are tappable from the home screen regardless of
 * time-of-day windows. `getActiveCheckInPeriodForNow` still uses clock cuts so Today’s guidance
 * pins one period. Set to `false` for production window enforcement on chips and navigation.
 */
export const BYPASS_CHECK_IN_TIME_WINDOWS = false;

/**
 * Local-time windows for which period's check-in can be opened from the home screen.
 * Morning: 5:00 AM – 11:59 AM
 * Afternoon: 12:00 PM – 5:59 PM
 * Evening: 6:00 PM – 4:59 AM (wraps midnight)
 */
export function minutesSinceMidnightLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function isCheckInPeriodInWindow(period: CheckInTimeOfDay, now: Date = new Date()): boolean {
  if (BYPASS_CHECK_IN_TIME_WINDOWS) return true;
  const m = minutesSinceMidnightLocal(now);
  switch (period) {
    case 'morning':
      return m >= 5 * 60 && m <= 11 * 60 + 59;
    case 'afternoon':
      return m >= 12 * 60 && m <= 17 * 60 + 59;
    case 'evening':
      return m >= 18 * 60 || m <= 4 * 60 + 59;
    default:
      return false;
  }
}

/** Same morning / afternoon / evening boundaries as `isCheckInPeriodInWindow` (for bypass UI ordering). */
function primaryPeriodByClock(now: Date): CheckInTimeOfDay {
  const m = minutesSinceMidnightLocal(now);
  if (m >= 5 * 60 && m <= 11 * 60 + 59) return 'morning';
  if (m >= 12 * 60 && m <= 17 * 60 + 59) return 'afternoon';
  return 'evening';
}

/**
 * The single “current” check-in slot for prioritization (Today’s guidance).
 * With bypass on, chips stay open but this still follows local clock windows for pinning.
 */
export function getActiveCheckInPeriodForNow(now: Date = new Date()): CheckInTimeOfDay {
  if (BYPASS_CHECK_IN_TIME_WINDOWS) {
    return primaryPeriodByClock(now);
  }
  if (isCheckInPeriodInWindow('morning', now)) return 'morning';
  if (isCheckInPeriodInWindow('afternoon', now)) return 'afternoon';
  if (isCheckInPeriodInWindow('evening', now)) return 'evening';
  return primaryPeriodByClock(now);
}

/** One-line local-time window when that period’s check-in is available (matches `isCheckInPeriodInWindow`). */
export function getCheckInAvailabilityWindow(period: CheckInTimeOfDay): string {
  switch (period) {
    case 'morning':
      return '5:00 AM – 11:59 AM';
    case 'afternoon':
      return '12:00 PM – 5:59 PM';
    case 'evening':
      return '6:00 PM – 4:59 AM';
    default:
      return '';
  }
}

/** Short label for UI when a period is locked (when it next opens). */
export function getCheckInWindowHint(period: CheckInTimeOfDay): string {
  const window = getCheckInAvailabilityWindow(period);
  return window ? `Opens ${window}` : '';
}
