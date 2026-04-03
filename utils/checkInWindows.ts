import type { CheckInTimeOfDay } from '@/types';

/**
 * When true, all check-in periods are tappable from the home screen regardless of
 * time-of-day windows. Set to `false` before release (restore normal morning/afternoon/evening windows).
 */
export const BYPASS_CHECK_IN_TIME_WINDOWS = true;

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
