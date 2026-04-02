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
