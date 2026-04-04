import React from 'react';
import { Redirect } from 'expo-router';
import { useUser } from '@/core/domains/useUser';
import { useAppStore } from '@/stores/useAppStore';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';
import { getStrictRedirectTarget } from '@/utils/legacyRoutes';

export default function HomeScreenRedirect() {
  const { profile, isLoading } = useUser();
  const centralProfile = useAppStore((s) => s.userProfile);

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (!(centralProfile?.hasCompletedOnboarding ?? profile.hasCompletedOnboarding)) {
    return <Redirect href={'/onboarding' as any} />;
  }

  const strictTarget = getStrictRedirectTarget('/(tabs)/(home)');
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return <Redirect href={'/(tabs)/(home)/today-hub' as any} />;
}
