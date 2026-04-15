import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { loadStorageItem, saveStorageItem } from '../core/persistence';
import { createSelectors } from './zustand/createSelectors';
import { useEffect } from 'react';

const STORAGE_KEY = 'recovery:wizard_behavior';

export interface ActionHistoryEntry {
  completionCount: number;
  skipCount: number;
  lastCompletedAt: string | null;
  lastSurfacedAt: string | null;
  avgCompletionHour: number;
}

export interface PeriodEngagement {
  sessionsStarted: number;
  actionsCompleted: number;
  avgActionsPerSession: number;
}

export interface WizardBehaviorState {
  actionHistory: Record<string, ActionHistoryEntry>;
  periodEngagement: Record<'morning' | 'afternoon' | 'evening', PeriodEngagement>;
  consecutiveLowStabilityDays: number;
  consecutiveHighStabilityDays: number;
  lastSessionDate: string | null;
  lastStabilityUpdateDate: string | null;
}

const DEFAULT_PERIOD_ENGAGEMENT: PeriodEngagement = {
  sessionsStarted: 0,
  actionsCompleted: 0,
  avgActionsPerSession: 0,
};

const DEFAULT_STATE: WizardBehaviorState = {
  actionHistory: {},
  periodEngagement: {
    morning: { ...DEFAULT_PERIOD_ENGAGEMENT },
    afternoon: { ...DEFAULT_PERIOD_ENGAGEMENT },
    evening: { ...DEFAULT_PERIOD_ENGAGEMENT },
  },
  consecutiveLowStabilityDays: 0,
  consecutiveHighStabilityDays: 0,
  lastSessionDate: null,
  lastStabilityUpdateDate: null,
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

type WizardBehaviorStore = WizardBehaviorState & {
  isLoading: boolean;
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  recordActionSurfaced: (actionId: string) => void;
  recordActionCompleted: (actionId: string) => void;
  recordSessionStart: (period: 'morning' | 'afternoon' | 'evening') => void;
  updateStabilityStreak: (score: number) => void;
  getDaysSinceLastSession: () => number;
};

function persist(state: WizardBehaviorState) {
  const serializable: WizardBehaviorState = {
    actionHistory: state.actionHistory,
    periodEngagement: state.periodEngagement,
    consecutiveLowStabilityDays: state.consecutiveLowStabilityDays,
    consecutiveHighStabilityDays: state.consecutiveHighStabilityDays,
    lastSessionDate: state.lastSessionDate,
    lastStabilityUpdateDate: state.lastStabilityUpdateDate,
  };
  saveStorageItem(STORAGE_KEY, serializable);
}

const baseStore = create<WizardBehaviorStore>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,
    isLoading: true,
    hasHydrated: false,

    hydrate: async () => {
      if (get().hasHydrated) return;
      const stored = await loadStorageItem<WizardBehaviorState | null>(STORAGE_KEY, null);
      if (stored) {
        set({
          actionHistory: stored.actionHistory ?? {},
          periodEngagement: {
            morning: stored.periodEngagement?.morning ?? { ...DEFAULT_PERIOD_ENGAGEMENT },
            afternoon: stored.periodEngagement?.afternoon ?? { ...DEFAULT_PERIOD_ENGAGEMENT },
            evening: stored.periodEngagement?.evening ?? { ...DEFAULT_PERIOD_ENGAGEMENT },
          },
          consecutiveLowStabilityDays: stored.consecutiveLowStabilityDays ?? 0,
          consecutiveHighStabilityDays: stored.consecutiveHighStabilityDays ?? 0,
          lastSessionDate: stored.lastSessionDate ?? null,
          lastStabilityUpdateDate: stored.lastStabilityUpdateDate ?? null,
          isLoading: false,
          hasHydrated: true,
        });
      } else {
        set({ isLoading: false, hasHydrated: true });
      }
    },

    reset: () => {
      set({ ...DEFAULT_STATE, isLoading: false, hasHydrated: true });
      saveStorageItem(STORAGE_KEY, DEFAULT_STATE);
    },

    recordActionSurfaced: (actionId: string) => {
      const { actionHistory } = get();
      const existing = actionHistory[actionId];
      const now = new Date().toISOString();

      const updated: ActionHistoryEntry = existing
        ? { ...existing, lastSurfacedAt: now }
        : {
            completionCount: 0,
            skipCount: 0,
            lastCompletedAt: null,
            lastSurfacedAt: now,
            avgCompletionHour: 0,
          };

      const next = { ...actionHistory, [actionId]: updated };
      set({ actionHistory: next });
      persist(get());
    },

    recordActionCompleted: (actionId: string) => {
      const state = get();
      const existing = state.actionHistory[actionId];
      const now = new Date();
      const hour = now.getHours() + now.getMinutes() / 60;

      const prev = existing ?? {
        completionCount: 0,
        skipCount: 0,
        lastCompletedAt: null,
        lastSurfacedAt: null,
        avgCompletionHour: hour,
      };

      const newCount = prev.completionCount + 1;
      const smoothing = 0.3;
      const newAvgHour =
        prev.completionCount === 0
          ? hour
          : prev.avgCompletionHour * (1 - smoothing) + hour * smoothing;

      const updated: ActionHistoryEntry = {
        ...prev,
        completionCount: newCount,
        lastCompletedAt: now.toISOString(),
        avgCompletionHour: newAvgHour,
      };

      const nextHistory = { ...state.actionHistory, [actionId]: updated };

      const currentPeriod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const pe = { ...state.periodEngagement[currentPeriod] };
      pe.actionsCompleted += 1;
      pe.avgActionsPerSession =
        pe.sessionsStarted > 0 ? pe.actionsCompleted / pe.sessionsStarted : pe.actionsCompleted;

      set({
        actionHistory: nextHistory,
        periodEngagement: { ...state.periodEngagement, [currentPeriod]: pe },
      });
      persist(get());
    },

    recordSessionStart: (period: 'morning' | 'afternoon' | 'evening') => {
      const state = get();
      const today = getToday();

      if (state.lastSessionDate === today) return;

      const pe = { ...state.periodEngagement[period] };
      pe.sessionsStarted += 1;

      set({
        lastSessionDate: today,
        periodEngagement: { ...state.periodEngagement, [period]: pe },
      });
      persist(get());
    },

    updateStabilityStreak: (score: number) => {
      const state = get();
      const today = getToday();

      if (state.lastStabilityUpdateDate === today) return;

      let lowDays = state.consecutiveLowStabilityDays;
      let highDays = state.consecutiveHighStabilityDays;

      if (score < 40) {
        lowDays += 1;
        highDays = 0;
      } else if (score >= 70) {
        highDays += 1;
        lowDays = 0;
      } else {
        lowDays = 0;
        highDays = 0;
      }

      set({
        consecutiveLowStabilityDays: lowDays,
        consecutiveHighStabilityDays: highDays,
        lastStabilityUpdateDate: today,
      });
      persist(get());
    },

    getDaysSinceLastSession: () => {
      const { lastSessionDate } = get();
      // Null = never recorded (new install / pre-hydrate). Do not treat as a multi-day gap.
      if (!lastSessionDate) return 0;
      const last = new Date(lastSessionDate);
      const now = new Date();
      return Math.max(0, Math.floor((now.getTime() - last.getTime()) / 86400000));
    },
  })),
);

export const useWizardBehaviorStore = createSelectors(baseStore);

export function useHydrateWizardBehaviorStore() {
  const hydrate = useWizardBehaviorStore.use.hydrate();
  const hasHydrated = useWizardBehaviorStore.use.hasHydrated();
  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hydrate, hasHydrated]);
}
