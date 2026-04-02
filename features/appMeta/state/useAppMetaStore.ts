import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { RECOVERY_KEYS_TO_CLEAR } from '@/core/persistence';
import { calculateStability } from '@/utils/stabilityEngine';
import { useRecoveryProfileStore, useHydrateRecoveryProfileStore } from '@/stores/useRecoveryProfileStore';
import { useCheckInsStore, useHydrateCheckInsStore } from '@/stores/useCheckInsStore';
import { usePledgesStore } from '@/features/pledges/state/usePledgesStore';
import { useJournalStore } from '@/features/journal/state/useJournalStore';
import { useSupportContactsStore } from '@/features/supportContacts/state/useSupportContactsStore';
import { useRebuildStore } from '@/features/rebuild/state/useRebuildStore';
import { useAccountabilityStore } from '@/features/accountability/state/useAccountabilityStore';
import { useWorkbookStore } from '@/features/workbook/state/useWorkbookStore';
import { useMediaStore } from '@/features/media/state/useMediaStore';
import { createSelectors } from '@/stores/zustand/createSelectors';

type AppMetaState = {
  resetAllData: () => Promise<void>;
};

const baseUseAppMetaStore = create<AppMetaState>()(
  subscribeWithSelector(() => ({
    resetAllData: async () => {
      await AsyncStorage.multiRemove(RECOVERY_KEYS_TO_CLEAR);

      // Reset each store slice to defaults in-memory.
      useRecoveryProfileStore.getState().hydrate?.();
      useRecoveryProfileStore.setState({
        profile: useRecoveryProfileStore.getState().profile,
        timelineEvents: [],
        relapsePlan: null,
        isLoading: false,
        hasHydrated: true,
      } as any, true);

      useCheckInsStore.setState({ checkIns: [], nearMissEvents: [], isLoading: false, hasHydrated: true } as any, true);
      usePledgesStore.getState().reset();
      useJournalStore.getState().reset();
      useMediaStore.getState().reset();
      useWorkbookStore.getState().reset();
      useSupportContactsStore.getState().reset();
      useRebuildStore.getState().reset();
      useAccountabilityStore.getState().reset();
    },
  }))
);

export const useAppMetaStore = createSelectors(baseUseAppMetaStore);

export function useHydrateAppMetaStores() {
  // Ensure the big slices hydrate when app meta is used.
  useHydrateRecoveryProfileStore();
  useHydrateCheckInsStore();
}

export function useStabilityScore(): number {
  useHydrateAppMetaStores();
  const profile = useRecoveryProfileStore.use.profile();
  const checkIns = useCheckInsStore.use.checkIns();

  return useMemo(() => {
    const sorted = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = sorted.slice(0, 7);
    if (recent.length === 0) {
      const rp = profile.recoveryProfile;
      const input = {
        intensity: rp.struggleLevel,
        sleepQuality: (rp.sleepQuality === 'fair' ? 'okay' : rp.sleepQuality === 'excellent' ? 'good' : rp.sleepQuality === 'poor' ? 'poor' : 'good') as 'poor' | 'okay' | 'good',
        triggers: rp.triggers ?? [],
        supportLevel: rp.supportAvailability,
        dailyActionsCompleted: 0,
        relapseLogged: (rp.relapseCount ?? 0) > 0,
      };
      return calculateStability(input).score;
    }
    const avg = recent.reduce((sum, c) => sum + c.stabilityScore, 0) / recent.length;
    return Math.round(avg);
  }, [checkIns, profile.recoveryProfile]);
}

