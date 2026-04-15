/**
 * Calendar day key for daily check-ins (local timezone).
 * Using local YYYY-MM-DD keeps morning/afternoon/evening on the same "today"
 * as the home screen, avoiding UTC midnight splits from toISOString().
 */
export function getLocalDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calendar day key for **Today’s guidance** (home wizard): the day advances at **5:00 AM**
 * local time, not midnight. Times before 5:00 AM belong to the previous calendar day.
 */
export function getGuidanceDateKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime());
  shifted.setHours(
    shifted.getHours() - 5,
    shifted.getMinutes(),
    shifted.getSeconds(),
    shifted.getMilliseconds(),
  );
  return getLocalDateKey(shifted);
}

/** Add calendar days to a local `YYYY-MM-DD` key (no `Date` UTC parse of the string). */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const parts = dateKey.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateKey;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

/** `YYYY-MM-DD` → `MM/DD/YYYY` for display (string split only, no UTC parsing). */
export function formatGuidanceDateKeyUs(key: string): string {
  const parts = key.split('-');
  if (parts.length !== 3) return key;
  const [y, m, d] = parts;
  return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
}

/**
 * Whole local calendar days since sober date (midnight-to-midnight in the device timezone).
 * Day 0 = the calendar day of `soberDateValue` through local 11:59:59 p.m.
 */
export function countLocalCalendarDaysSinceSober(
  soberDateValue: string,
  now: Date = new Date(),
): number {
  if (!soberDateValue) return 0;
  const sober = new Date(soberDateValue);
  if (Number.isNaN(sober.getTime())) return 0;
  const startKey = getLocalDateKey(sober);
  const endKey = getLocalDateKey(now);
  const [sy, sm, sd] = startKey.split('-').map((x) => parseInt(x, 10));
  const [ey, em, ed] = endKey.split('-').map((x) => parseInt(x, 10));
  const t0 = new Date(sy, sm - 1, sd).getTime();
  const t1 = new Date(ey, em - 1, ed).getTime();
  return Math.max(0, Math.round((t1 - t0) / 86400000));
}
