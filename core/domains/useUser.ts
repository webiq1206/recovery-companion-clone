import { useCallback, useMemo } from 'react';
import { useDaysSober, useHydrateRecoveryProfileStore, useRecoveryProfileStore } from '../../stores/useRecoveryProfileStore';
import type { UserDomain } from '../contracts/user';
import type { UserProfile } from '../../types';

export function useUser(): UserDomain {
  useHydrateRecoveryProfileStore();
  const profile = useRecoveryProfileStore.use.profile();
  const isLoading = useRecoveryProfileStore.use.isLoading();
  const daysSober = useDaysSober();

  /** Always delegate to the live store impl — avoids rare undefined from selector hooks on some builds. */
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    useRecoveryProfileStore.getState().updateProfile(updates);
  }, []);

  return useMemo(
    () => ({
      profile,
      daysSober,
      isOnboarded: !!profile.hasCompletedOnboarding,
      isLoading,
      updateProfile,
      // Note: setPrivacyControls/setSoberDate can be added later as narrow commands
      // once we stop exposing raw updateProfile in UI-heavy screens.
    }),
    [profile, daysSober, isLoading, updateProfile],
  );
}

