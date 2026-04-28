import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  getAllAccountDeletionAsyncStorageKeys,
  LOCAL_DIAGNOSTICS_CACHE_ASYNC_STORAGE_KEYS,
} from '../../../core/accountDeletionKeys';
import { calculateStability } from '../../../utils/stabilityEngine';
import { useRecoveryProfileStore, useHydrateRecoveryProfileStore } from '../../../stores/useRecoveryProfileStore';
import { useCheckInsStore, useHydrateCheckInsStore } from '../../../stores/useCheckInsStore';
import { usePledgesStore } from '../../pledges/state/usePledgesStore';
import { useJournalStore } from '../../journal/state/useJournalStore';
import { useSupportContactsStore } from '../../supportContacts/state/useSupportContactsStore';
import { useRebuildStore } from '../../rebuild/state/useRebuildStore';
import { useAccountabilityStore } from '../../accountability/state/useAccountabilityStore';
import { useWorkbookStore } from '../../workbook/state/useWorkbookStore';
import { useMediaStore } from '../../media/state/useMediaStore';
import { createSelectors } from '../../../stores/zustand/createSelectors';
import { useAppStore } from '../../../stores/useAppStore';
import { useWizardBehaviorStore } from '../../../stores/useWizardBehaviorStore';
import { DEFAULT_PROFILE } from '../../../core/persistence';
import { removePIN, secureDelete } from '../../../utils/secureStorage';

/** Keys passed to `secureSet` / `secureSetJSON` (data lives under `secure_` + key in AsyncStorage). */
const SECURE_ACCOUNT_DATA_KEYS = ['ro_security_settings', 'ro_audit_log'] as const;

const SECURE_DIAGNOSTICS_KEYS = ['ro_audit_log'] as const;

type AppMetaState = {
  /** Full local wipe: recovery data, persisted app store, subscriptions cache, social demo state, security prefs, scheduled notifications, PIN. */
  resetAllData: () => Promise<void>;
  /** Clears diagnostics / caches only; does not remove recovery content. */
  clearDiagnosticsCaches: () => Promise<void>;
};

const defaultOnboarding = {
  currentStep: 0,
  totalSteps: 0,
  answers: {} as Record<string, unknown>,
  isComplete: false,
};

const defaultProgress = {
  daysSober: 0,
  totalCheckIns: 0,
  relapseCount: 0,
  streakLength: 0,
};

const baseUseAppMetaStore = create<AppMetaState>()(
  subscribeWithSelector(() => ({
    resetAllData: async () => {
      const keys = getAllAccountDeletionAsyncStorageKeys();
      await AsyncStorage.multiRemove(keys);
      await Promise.all(SECURE_ACCOUNT_DATA_KEYS.map((k) => secureDelete(k)));
      try {
        await removePIN();
      } catch (e) {
        console.log('[resetAllData] removePIN:', e);
      }
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (e) {
        console.log('[resetAllData] cancel notifications:', e);
      }

      useAppStore.setState({
        userProfile: null,
        onboarding: defaultOnboarding,
        dailyCheckIns: [],
        relapseLogs: [],
        progress: defaultProgress,
      });

      // Reset each store slice to defaults in-memory (hydrate() is a no-op when already hydrated).
      useRecoveryProfileStore.setState({
        profile: DEFAULT_PROFILE,
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
      useWizardBehaviorStore.getState().reset();
    },

    clearDiagnosticsCaches: async () => {
      const asyncOnly = LOCAL_DIAGNOSTICS_CACHE_ASYNC_STORAGE_KEYS.filter(
        (k) => !SECURE_DIAGNOSTICS_KEYS.includes(k as (typeof SECURE_DIAGNOSTICS_KEYS)[number]),
      );
      await AsyncStorage.multiRemove([...asyncOnly]);
      await Promise.all(SECURE_DIAGNOSTICS_KEYS.map((k) => secureDelete(k)));
      useWizardBehaviorStore.getState().reset();
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

