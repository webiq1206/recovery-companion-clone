import type { IdentityProgramData } from '../../../types';
import { countLocalCalendarDaysSinceInstant } from '../../../utils/checkInDate';

/** Stored week from persistence (manual unlocks), clamped 1–8; `0` if no program object. */
export function getIdentityProgramStoredWeek(program: IdentityProgramData | null | undefined): number {
  if (!program) return 0;
  return Math.min(8, Math.max(1, program.currentWeek ?? 1));
}

/**
 * Week used to unlock program modules: at least the stored week, and at least one week per
 * 7 local calendar days since `startedAt` (so time-based progression matches the device timezone).
 */
export function getIdentityProgramEffectiveWeek(program: IdentityProgramData | null | undefined): number {
  if (!program) return 0;
  if (!program.startedAt) {
    return getIdentityProgramStoredWeek(program);
  }
  const storedWeek = getIdentityProgramStoredWeek(program);
  const daysSinceStart = countLocalCalendarDaysSinceInstant(program.startedAt);
  const calendarWeek = Math.min(8, Math.floor(daysSinceStart / 7) + 1);
  return Math.min(8, Math.max(storedWeek, calendarWeek));
}
