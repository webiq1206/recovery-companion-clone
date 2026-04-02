import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { DailyCheckIn, TimelineEvent, UserProfile } from '@/types';
import { createSelectors } from '@/stores/zustand/createSelectors';
import { getLocalDateKey } from '@/utils/checkInDate';

type OnboardingData = {
  currentStep: number;
  totalSteps: number;
  answers: Record<string, unknown>;
  isComplete: boolean;
};

export type ProgressStats = {
  daysSober: number;
  totalCheckIns: number;
  relapseCount: number;
  streakLength: number;
};

type AppStoreState = {
  userProfile: UserProfile | null;
  onboarding: OnboardingData;
  dailyCheckIns: DailyCheckIn[];
  relapseLogs: TimelineEvent[]; // constrained to type === 'relapse'
  progress: ProgressStats;

  updateUserState: (updates: Partial<UserProfile>) => void;
  addCheckIn: (checkIn: Omit<DailyCheckIn, 'id' | 'completedAt'>) => void;
  logRelapse: (event?: Partial<Omit<TimelineEvent, 'id' | 'type'>>) => void;

  recomputeProgress: () => void;
};

const defaultOnboarding: OnboardingData = {
  currentStep: 0,
  totalSteps: 0,
  answers: {},
  isComplete: false,
};

const defaultProgress: ProgressStats = {
  daysSober: 0,
  totalCheckIns: 0,
  relapseCount: 0,
  streakLength: 0,
};

function computeDaysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function computeDaysSober(profile: UserProfile | null, now = new Date()): number {
  if (!profile?.soberDate) return 0;
  return computeDaysBetween(profile.soberDate, now.toISOString());
}

function computeStreakLength(relapseLogs: TimelineEvent[], now = new Date()): number {
  const relapses = relapseLogs.filter((e) => e.type === 'relapse');
  if (relapses.length === 0) return 0;

  const mostRecent = relapses
    .map((e) => e.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return computeDaysBetween(mostRecent, now.toISOString());
}

const baseUseAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      userProfile: null,
      onboarding: defaultOnboarding,
      dailyCheckIns: [],
      relapseLogs: [],
      progress: defaultProgress,

      updateUserState: (updates) => {
        set((state) => {
          const nextProfile: UserProfile = {
            ...(state.userProfile ?? ({} as UserProfile)),
            ...updates,
          };

          const nextProgress: ProgressStats = {
            ...state.progress,
            daysSober: computeDaysSober(nextProfile),
          };

          return {
            userProfile: nextProfile,
            progress: nextProgress,
          };
        });
      },

      addCheckIn: (checkInInput) => {
        set((state) => {
          const now = new Date();
          const completedAt = now.toISOString();
          const next: DailyCheckIn = {
            id: `checkin-${now.getTime()}`,
            completedAt,
            ...checkInInput,
          };

          const rest = state.dailyCheckIns.filter(
            (c) => !(c.date === next.date && c.timeOfDay === next.timeOfDay),
          );
          const dailyCheckIns = [next, ...rest];

          const progress: ProgressStats = {
            ...state.progress,
            totalCheckIns: dailyCheckIns.length,
          };

          return { dailyCheckIns, progress };
        });
      },

      logRelapse: (eventInput) => {
        set((state) => {
          const now = new Date();
          const today = getLocalDateKey(now);

          const next: TimelineEvent = {
            id: `relapse-${now.getTime()}`,
            type: 'relapse',
            date: today,
            ...(eventInput ?? {}),
          };

          const relapseLogs = [next, ...state.relapseLogs];

          const progress: ProgressStats = {
            ...state.progress,
            relapseCount: relapseLogs.length,
            streakLength: computeStreakLength(relapseLogs, now),
          };

          return { relapseLogs, progress };
        });
      },

      recomputeProgress: () => {
        const { userProfile, dailyCheckIns, relapseLogs } = get();
        const now = new Date();

        const nextProgress: ProgressStats = {
          daysSober: computeDaysSober(userProfile, now),
          totalCheckIns: dailyCheckIns.length,
          relapseCount: relapseLogs.length,
          streakLength: computeStreakLength(relapseLogs, now),
        };

        set({ progress: nextProgress });
      },
    }),
    {
      name: 'recovery-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        onboarding: state.onboarding,
        dailyCheckIns: state.dailyCheckIns,
        relapseLogs: state.relapseLogs,
        progress: state.progress,
      }),
    }
  )
);

export const useAppStore = createSelectors(baseUseAppStore);

