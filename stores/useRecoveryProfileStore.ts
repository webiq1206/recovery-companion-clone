/**
 * Recovery profile slice: profile, timeline, relapse plan.
 * Consumed by RecoveryProvider (facade). Can be used directly by screens for a lighter dependency.
 */

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UserProfile, TimelineEvent, RelapsePlan } from '@/types';
import {
  STORAGE_KEYS,
  DEFAULT_PROFILE,
  migrateProfile,
  loadStorageItem,
  saveStorageItem,
} from '@/core/persistence';
import { createSelectors } from '@/stores/zustand/createSelectors';

type RecoveryProfileState = {
  profile: UserProfile;
  timelineEvents: TimelineEvent[];
  relapsePlan: RelapsePlan | null;
  isLoading: boolean;
  hasHydrated: boolean;

  hydrate: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  logRelapse: (
    details?: Partial<
      Pick<
        TimelineEvent,
        | 'whatHappenedLabel'
        | 'whenLabel'
        | 'whereLabel'
        | 'wereYouLabel'
        | 'triggerLabel'
        | 'thinkingLabel'
        | 'happenedDuringLabel'
        | 'afterHaveYouLabel'
        | 'emotionalStateLabel'
      >
    >,
  ) => void;
  logCrisisActivation: () => void;
  saveRelapsePlan: (plan: RelapsePlan) => void;
};

function computeDaysSober(profile: UserProfile, now = new Date()): number {
  const soberDate = new Date(profile.soberDate);
  return Math.max(0, Math.floor((now.getTime() - soberDate.getTime()) / 86400000));
}

const baseUseRecoveryProfileStore = create<RecoveryProfileState>()(
  subscribeWithSelector((set, get) => ({
    profile: DEFAULT_PROFILE,
    timelineEvents: [],
    relapsePlan: null,
    isLoading: true,
    hasHydrated: false,

    hydrate: async () => {
      if (get().hasHydrated) return;
      set({ isLoading: true });

      const [storedProfile, timelineEvents, relapsePlan] = await Promise.all([
        loadStorageItem<UserProfile | null>(STORAGE_KEYS.PROFILE, null),
        loadStorageItem<TimelineEvent[]>(STORAGE_KEYS.TIMELINE_EVENTS, []),
        loadStorageItem<RelapsePlan | null>(STORAGE_KEYS.RELAPSE_PLAN, null),
      ]);

      const profile = storedProfile ? migrateProfile(storedProfile as unknown as Record<string, unknown>) : DEFAULT_PROFILE;

      set({ profile, timelineEvents, relapsePlan, isLoading: false, hasHydrated: true });
    },

    updateProfile: (updates) => {
      const updated = { ...get().profile, ...updates };
      set({ profile: updated });
      void saveStorageItem(STORAGE_KEYS.PROFILE, updated);
    },

    logRelapse: (details) => {
      const profile = get().profile;
      const rp = profile.recoveryProfile ?? DEFAULT_PROFILE.recoveryProfile;
      const updatedProfile: UserProfile = {
        ...profile,
        recoveryProfile: { ...rp, relapseCount: (rp.relapseCount ?? 0) + 1 },
      };

      const today = new Date().toISOString().split('T')[0];
      const event: TimelineEvent = {
        id: `relapse-${Date.now()}`,
        type: 'relapse',
        date: today,
        ...details,
      };
      const updatedEvents = [event, ...get().timelineEvents];

      set({ profile: updatedProfile, timelineEvents: updatedEvents });
      void saveStorageItem(STORAGE_KEYS.PROFILE, updatedProfile);
      void saveStorageItem(STORAGE_KEYS.TIMELINE_EVENTS, updatedEvents);
    },

    logCrisisActivation: () => {
      const today = new Date().toISOString().split('T')[0];
      const event: TimelineEvent = {
        id: `crisis-${Date.now()}`,
        type: 'crisis_activation',
        date: today,
      };
      const updatedEvents = [event, ...get().timelineEvents];
      set({ timelineEvents: updatedEvents });
      void saveStorageItem(STORAGE_KEYS.TIMELINE_EVENTS, updatedEvents);
    },

    saveRelapsePlan: (plan) => {
      set({ relapsePlan: plan });
      void saveStorageItem(STORAGE_KEYS.RELAPSE_PLAN, plan);
    },
  }))
);

export const useRecoveryProfileStore = createSelectors(baseUseRecoveryProfileStore);

export function useDaysSober(): number {
  const profile = useRecoveryProfileStore.use.profile();
  return useMemo(() => computeDaysSober(profile), [profile.soberDate]);
}

export function useHydrateRecoveryProfileStore() {
  const hydrate = useRecoveryProfileStore.use.hydrate();
  const hasHydrated = useRecoveryProfileStore.use.hasHydrated();

  useEffect(() => {
    if (!hasHydrated) void hydrate();
  }, [hasHydrated, hydrate]);
}
