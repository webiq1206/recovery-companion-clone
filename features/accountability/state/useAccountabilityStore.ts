import { useEffect } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { AccountabilityData, AccountabilityPartner, CommitmentContract, DriftAlert } from '../../../types';
import { DEFAULT_ACCOUNTABILITY, STORAGE_KEYS, loadStorageItem, saveStorageItem } from '../../../core/persistence';
import { getGuidanceDateKey } from '../../../utils/checkInDate';
import { createSelectors } from '../../../stores/zustand/createSelectors';

type AccountabilityState = {
  accountabilityData: AccountabilityData;
  isLoading: boolean;
  hasHydrated: boolean;

  hydrate: () => Promise<void>;
  reset: () => void;

  addContract: (contract: CommitmentContract) => void;
  updateContract: (id: string, updates: Partial<CommitmentContract>) => void;
  deleteContract: (id: string) => void;
  checkInContract: (contractId: string, honored: boolean, note?: string) => void;

  addPartner: (partner: AccountabilityPartner) => void;
  deletePartner: (id: string) => void;

  dismissAlert: (id: string) => void;
  useStreakProtection: () => boolean;
};

function persist(set: (partial: Partial<AccountabilityState>) => void, data: AccountabilityData) {
  set({ accountabilityData: data });
  void saveStorageItem(STORAGE_KEYS.ACCOUNTABILITY, data);
}

const baseUseAccountabilityStore = create<AccountabilityState>()(
  subscribeWithSelector((set, get) => ({
    accountabilityData: DEFAULT_ACCOUNTABILITY,
    isLoading: true,
    hasHydrated: false,

    hydrate: async () => {
      if (get().hasHydrated) return;
      set({ isLoading: true });
      const accountabilityData = await loadStorageItem<AccountabilityData>(STORAGE_KEYS.ACCOUNTABILITY, DEFAULT_ACCOUNTABILITY);
      set({ accountabilityData, isLoading: false, hasHydrated: true });
    },

    reset: () => {
      set({ accountabilityData: DEFAULT_ACCOUNTABILITY, isLoading: false, hasHydrated: true });
    },

    addContract: (contract) => {
      const d = get().accountabilityData;
      persist(set, { ...d, contracts: [contract, ...d.contracts] });
    },

    updateContract: (id, updates) => {
      const d = get().accountabilityData;
      persist(set, { ...d, contracts: d.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c)) });
    },

    deleteContract: (id) => {
      const d = get().accountabilityData;
      persist(set, { ...d, contracts: d.contracts.filter((c) => c.id !== id) });
    },

    checkInContract: (contractId, honored, note) => {
      const d = get().accountabilityData;
      const today = getGuidanceDateKey(new Date());
      const updatedContracts = d.contracts.map((c) => {
        if (c.id !== contractId) return c;
        const checkIn = {
          id: `${Date.now()}`,
          date: today,
          honored,
          note: note?.trim() || '',
        };
        const streakDays = honored ? (c.lastCheckedIn === today ? c.streakDays : c.streakDays + 1) : 0;
        return {
          ...c,
          checkIns: [checkIn as any, ...(c.checkIns ?? [])],
          lastCheckedIn: today,
          streakDays,
        };
      });
      persist(set, { ...d, contracts: updatedContracts });
    },

    addPartner: (partner) => {
      const d = get().accountabilityData;
      persist(set, { ...d, partners: [partner, ...d.partners] });
    },

    deletePartner: (id) => {
      const d = get().accountabilityData;
      persist(set, { ...d, partners: d.partners.filter((p) => p.id !== id) });
    },

    dismissAlert: (id) => {
      const d = get().accountabilityData;
      const updated: AccountabilityData = {
        ...d,
        alerts: (d.alerts ?? []).map((a: DriftAlert) => (a.id === id ? { ...a, isDismissed: true } : a)),
      };
      persist(set, updated);
    },

    useStreakProtection: () => {
      const d = get().accountabilityData;
      if (d.streakProtectionUsed >= d.streakProtectionMax) return false;
      const updated = { ...d, streakProtectionUsed: d.streakProtectionUsed + 1 };
      persist(set, updated);
      return true;
    },
  }))
);

export const useAccountabilityStore = createSelectors(baseUseAccountabilityStore);

export function useHydrateAccountabilityStore() {
  const hydrate = useAccountabilityStore.use.hydrate();
  const hasHydrated = useAccountabilityStore.use.hasHydrated();

  useEffect(() => {
    if (!hasHydrated) void hydrate();
  }, [hasHydrated, hydrate]);
}

