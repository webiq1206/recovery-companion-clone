import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useProviderMode } from '../providers/ProviderModeProvider';
import { isProviderEnterpriseSuiteInBuild } from '../utils/isProviderEnterpriseSuiteInBuild';

/**
 * Call from provider/enterprise screens. Redirects when the suite is not in this build
 * or when Provider Mode is off, so care-partner / enterprise flows never appear in consumer store builds.
 */
export function useRequireProviderMode(): boolean {
  const { providerModeEnabled, isLoading } = useProviderMode();
  const router = useRouter();
  const suiteInBuild = isProviderEnterpriseSuiteInBuild();

  useEffect(() => {
    if (!suiteInBuild) {
      router.replace('/(tabs)/(home)/today-hub' as never);
      return;
    }
    if (isLoading) return;
    if (!providerModeEnabled) {
      router.replace('/(tabs)/(home)/today-hub' as never);
    }
  }, [suiteInBuild, providerModeEnabled, isLoading, router]);

  return suiteInBuild && providerModeEnabled && !isLoading;
}
