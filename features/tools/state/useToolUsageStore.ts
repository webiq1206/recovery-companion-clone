import { useEffect } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_KEYS, loadStorageItem, saveStorageItem } from '@/core/persistence';
import { createSelectors } from '@/stores/zustand/createSelectors';
import type { ToolContext, ToolId, ToolUsageEvent } from '@/features/tools/types';

type ToolsUsageState = {
  events: ToolUsageEvent[];
  isLoading: boolean;
  hasHydrated: boolean;

  hydrate: () => Promise<void>;
  reset: () => void;
  logToolUsage: (input: { toolId: ToolId; context: ToolContext; action: ToolUsageEvent['action']; meta?: ToolUsageEvent['meta'] }) => void;
};

const baseUseToolUsageStore = create<ToolsUsageState>()(
  subscribeWithSelector((set, get) => ({
    events: [],
    isLoading: true,
    hasHydrated: false,

    hydrate: async () => {
      if (get().hasHydrated) return;
      set({ isLoading: true });
      const events = await loadStorageItem<ToolUsageEvent[]>(STORAGE_KEYS.TOOLS_USAGE, []);
      set({ events, isLoading: false, hasHydrated: true });
    },

    reset: () => {
      set({ events: [], isLoading: false, hasHydrated: true });
    },

    logToolUsage: ({ toolId, context, action, meta }) => {
      const event: ToolUsageEvent = {
        id: `${toolId}-${Date.now()}`,
        toolId,
        context,
        action,
        timestamp: new Date().toISOString(),
        meta,
      };
      const updated = [event, ...get().events].slice(0, 500);
      set({ events: updated });
      void saveStorageItem(STORAGE_KEYS.TOOLS_USAGE, updated);
    },
  }))
);

export const useToolUsageStore = createSelectors(baseUseToolUsageStore);

export function useHydrateToolUsageStore() {
  const hydrate = useToolUsageStore.use.hydrate();
  const hasHydrated = useToolUsageStore.use.hasHydrated();

  useEffect(() => {
    if (!hasHydrated) void hydrate();
  }, [hasHydrated, hydrate]);
}

