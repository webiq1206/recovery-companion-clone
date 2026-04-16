import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { isProviderEnterpriseSuiteInBuild } from '../utils/isProviderEnterpriseSuiteInBuild';

const STORAGE_KEY = 'ro_provider_mode_enabled';

async function loadProviderMode(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

async function saveProviderMode(value: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}

export const [ProviderModeProvider, useProviderMode] = createContextHook(() => {
  const queryClient = useQueryClient();
  const suiteInBuild = isProviderEnterpriseSuiteInBuild();

  const { data: storedProviderMode = false, isLoading } = useQuery({
    queryKey: ['provider_mode'],
    queryFn: loadProviderMode,
    enabled: suiteInBuild,
  });

  const mutation = useMutation({
    mutationFn: saveProviderMode,
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(['provider_mode'], enabled);
    },
  });

  const setProviderModeEnabled = useCallback(
    (enabled: boolean) => {
      if (!suiteInBuild) return;
      mutation.mutate(enabled);
    },
    [mutation, suiteInBuild],
  );

  const providerModeEnabled = suiteInBuild && !!storedProviderMode;

  return {
    providerModeEnabled,
    setProviderModeEnabled,
    /** When the suite is not in this binary, treat as loaded so gates do not flash. */
    isLoading: suiteInBuild ? isLoading : false,
  };
});
