import { describe, expect, it } from 'bun:test';
import { mergeTodayCheckInsFromSources } from '@/utils/mergeProfile';
import type { DailyCheckIn } from '@/types';

const base = (partial: Partial<DailyCheckIn>): DailyCheckIn => ({
  id: '1',
  date: '2026-03-28',
  timeOfDay: 'morning',
  mood: 50,
  cravingLevel: 50,
  stress: 50,
  sleepQuality: 50,
  environment: 50,
  emotionalState: 50,
  stabilityScore: 50,
  reflection: '',
  completedAt: '2026-03-28T08:00:00.000Z',
  ...partial,
});

describe('mergeTodayCheckInsFromSources', () => {
  it('merges slice and central rows per period for the same calendar day', () => {
    const slice: DailyCheckIn[] = [
      base({ id: 'm1', timeOfDay: 'morning', mood: 40, completedAt: '2026-03-28T08:00:00.000Z' }),
      base({ id: 'a1', timeOfDay: 'afternoon', stress: 30, completedAt: '2026-03-28T14:00:00.000Z' }),
    ];
    const central: DailyCheckIn[] = [
      base({
        id: 'e1',
        timeOfDay: 'evening',
        mood: 60,
        completedAt: '2026-03-28T22:00:00.000Z',
      }),
      base({
        id: 'other',
        date: '2026-03-27',
        timeOfDay: 'evening',
        completedAt: '2026-03-27T22:00:00.000Z',
      }),
    ];
    const merged = mergeTodayCheckInsFromSources(slice, central, '2026-03-28');
    const byPeriod = new Map(merged.map((c) => [c.timeOfDay, c]));
    expect(byPeriod.size).toBe(3);
    expect(byPeriod.get('morning')?.id).toBe('m1');
    expect(byPeriod.get('afternoon')?.id).toBe('a1');
    expect(byPeriod.get('evening')?.id).toBe('e1');
  });

  it('merges duplicate period from both sources (newer wins metrics; fills missing from older)', () => {
    const slice: DailyCheckIn[] = [
      base({
        id: 'older',
        timeOfDay: 'morning',
        mood: 40,
        cravingLevel: 10,
        completedAt: '2026-03-28T08:00:00.000Z',
      }),
    ];
    const central: DailyCheckIn[] = [
      base({
        id: 'newer',
        timeOfDay: 'morning',
        mood: 55,
        cravingLevel: Number.NaN,
        completedAt: '2026-03-28T09:00:00.000Z',
      }),
    ];
    const merged = mergeTodayCheckInsFromSources(slice, central, '2026-03-28');
    expect(merged.length).toBe(1);
    expect(merged[0].mood).toBe(55);
    expect(merged[0].cravingLevel).toBe(10);
  });
});
