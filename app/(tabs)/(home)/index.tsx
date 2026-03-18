import React from 'react';
import { Redirect } from 'expo-router';
import { useUser } from '@/core/domains/useUser';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';

export default function HomeScreenRedirect() {
  const { profile, isLoading } = useUser();

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (!profile.hasCompletedOnboarding) {
    return <Redirect href={'/onboarding' as any} />;
  }

  return <Redirect href={'/(tabs)/(home)/today-hub' as any} />;
}
