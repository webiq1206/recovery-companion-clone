/**
 * Check-ins slice: checkIns, nearMissEvents, and derived today/period state.
 * Client state lives in zustand; persistence is orchestrated via `core/persistence`.
 */

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { CheckInTimeOfDay, DailyCheckIn, NearMissEvent } from '@/types';
import { STORAGE_KEYS, loadStorageItem, saveStorageItem } from '@/core/persistence';
import { createSelectors } from '@/stores/zustand/createSelectors';

type CheckInsState = {
  checkIns: DailyCheckIn[];
  nearMissEvents: NearMissEvent[];
  isLoading: boolean;
  hasHydrated: boolean;

  hydrate: () => Promise<void>;
  addCheckIn: (checkIn: DailyCheckIn) => void;
  logNearMiss: (event: NearMissEvent) => void;
};

function getCurrentPeriod(now = new Date()): CheckInTimeOfDay {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const baseUseCheckInsStore = create<CheckInsState>()(
  subscribeWithSelector((set, get) => ({
    checkIns: [],
    nearMissEvents: [],
    isLoading: true,
    hasHydrated: false,

    hydrate: async () => {
      if (get().hasHydrated) return;
      set({ isLoading: true });
      const [checkIns, nearMissEvents] = await Promise.all([
        loadStorageItem<DailyCheckIn[]>(STORAGE_KEYS.CHECK_INS, []),
        loadStorageItem<NearMissEvent[]>(STORAGE_KEYS.NEAR_MISS_EVENTS, []),
      ]);
      set({ checkIns, nearMissEvents, isLoading: false, hasHydrated: true });
    },

    addCheckIn: (checkIn) => {
      const updated = [checkIn, ...get().checkIns];
      set({ checkIns: updated });
      void saveStorageItem(STORAGE_KEYS.CHECK_INS, updated);
    },

    logNearMiss: (event) => {
      const updated = [event, ...get().nearMissEvents];
      set({ nearMissEvents: updated });
      void saveStorageItem(STORAGE_KEYS.NEAR_MISS_EVENTS, updated);
    },
  }))
);

export const useCheckInsStore = createSelectors(baseUseCheckInsStore);

// Derived selectors (stable subscriptions)
export function useTodayCheckIns(): DailyCheckIn[] {
  const checkIns = useCheckInsStore.use.checkIns();
  return useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return checkIns.filter((c) => c.date === today);
  }, [checkIns]);
}

export function useTodayCheckIn(): DailyCheckIn | null {
  const todayCheckIns = useTodayCheckIns();
  return useMemo(() => {
    if (todayCheckIns.length === 0) return null;
    return todayCheckIns.reduce((latest, c) =>
      new Date(c.completedAt).getTime() > new Date(latest.completedAt).getTime() ? c : latest,
    todayCheckIns[0]);
  }, [todayCheckIns]);
}

export function useMorningCheckIn(): DailyCheckIn | null {
  const todayCheckIns = useTodayCheckIns();
  return useMemo(() => todayCheckIns.find((c) => c.timeOfDay === 'morning') ?? null, [todayCheckIns]);
}

export function useCurrentCheckInPeriod(): CheckInTimeOfDay {
  // Time-based; keep simple and stable.
  return useMemo(() => getCurrentPeriod(), []);
}

export function useCurrentPeriodCheckIn(): DailyCheckIn | null {
  const todayCheckIns = useTodayCheckIns();
  const period = useCurrentCheckInPeriod();
  return useMemo(() => todayCheckIns.find((c) => c.timeOfDay === period) ?? null, [todayCheckIns, period]);
}

// Ensure hydration happens once when any consumer mounts.
export function useHydrateCheckInsStore() {
  const hydrate = useCheckInsStore.use.hydrate();
  const hasHydrated = useCheckInsStore.use.hasHydrated();

  useEffect(() => {
    if (!hasHydrated) void hydrate();
  }, [hasHydrated, hydrate]);
}
