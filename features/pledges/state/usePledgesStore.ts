import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { Pledge } from '../../../types';
import { STORAGE_KEYS, loadStorageItem, saveStorageItem } from '../../../core/persistence';
import { addDaysToDateKey, getGuidanceDateKey } from '../../../utils/checkInDate';
import { createSelectors } from '../../../stores/zustand/createSelectors';

type PledgesState = {
  pledges: Pledge[];
  isLoading: boolean;
  hasHydrated: boolean;

  hydrate: () => Promise<void>;
  reset: () => void;
  addPledge: (pledge: Pledge) => void;
};

const baseUsePledgesStore = create<PledgesState>()(
  subscribeWithSelector((set, get) => ({
    pledges: [],
    isLoading: true,
    hasHydrated: false,

    hydrate: async () => {
      if (get().hasHydrated) return;
      set({ isLoading: true });
      const pledges = await loadStorageItem<Pledge[]>(STORAGE_KEYS.PLEDGES, []);
      set({ pledges, isLoading: false, hasHydrated: true });
    },

    reset: () => {
      set({ pledges: [], isLoading: false, hasHydrated: true });
    },

    addPledge: (pledge) => {
      const updated = [pledge, ...get().pledges];
      set({ pledges: updated });
      void saveStorageItem(STORAGE_KEYS.PLEDGES, updated);
    },
  }))
);

export const usePledgesStore = createSelectors(baseUsePledgesStore);

export function useHydratePledgesStore() {
  const hydrate = usePledgesStore.use.hydrate();
  const hasHydrated = usePledgesStore.use.hasHydrated();

  useEffect(() => {
    if (!hasHydrated) void hydrate();
  }, [hasHydrated, hydrate]);
}

export function useTodayPledge(): Pledge | null {
  const pledges = usePledgesStore.use.pledges();
  return useMemo(() => {
    const guidanceDay = getGuidanceDateKey(new Date());
    return pledges.find((p) => p.date === guidanceDay) ?? null;
  }, [pledges]);
}

export function usePledgeStreak(): number {
  const pledges = usePledgesStore.use.pledges();
  return useMemo(() => {
    if (pledges.length === 0) return 0;

    const anchor = getGuidanceDateKey(new Date());
    const sorted = [...pledges].sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? 1 : -1;
    });

    let streak = 0;
    for (let i = 0; i < sorted.length; i++) {
      const expected = addDaysToDateKey(anchor, -i);
      if (sorted[i]!.date === expected && sorted[i]!.completed) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [pledges]);
}

