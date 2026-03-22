/**
 * Build calendar-aligned stability series for Progress charts.
 * One value per day: when multiple check-ins exist on the same date, the latest by `completedAt` wins.
 */

import type { DailyCheckIn } from '@/types';

export type StabilityWindowDays = 7 | 14 | 30;

export type ProgressStabilitySeries = {
  dates: string[];
  scores: (number | null)[];
};

export function buildProgressStabilitySeries(
  checkIns: DailyCheckIn[],
  windowDays: StabilityWindowDays
): ProgressStabilitySeries {
  const today = new Date();
  const dates: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const byDayBuckets = new Map<string, DailyCheckIn[]>();
  for (const c of checkIns) {
    const list = byDayBuckets.get(c.date);
    if (list) list.push(c);
    else byDayBuckets.set(c.date, [c]);
  }

  const byDate = new Map<string, number>();
  for (const [day, list] of byDayBuckets) {
    if (!dates.includes(day)) continue;
    const best = list.reduce((a, b) => (a.completedAt >= b.completedAt ? a : b));
    const raw = best.stabilityScore;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      byDate.set(day, Math.min(100, Math.max(0, raw)));
    }
  }

  const scores = dates.map((d) => byDate.get(d) ?? null);
  return { dates, scores };
}

function isFiniteScore(x: number | null | undefined): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** 3-day trailing average per index (uses up to scores[i-2..i], only finite scores). */
export function computeTrailingAverage3(scores: (number | null)[]): (number | null)[] {
  return scores.map((_, i) => {
    const slice = [scores[i - 2], scores[i - 1], scores[i]].filter(isFiniteScore);
    if (slice.length === 0) return null;
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return Number.isFinite(avg) ? avg : null;
  });
}

export function countNonNullScores(scores: (number | null)[]): number {
  return scores.filter(isFiniteScore).length;
}
