import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useUser } from '../core/domains/useUser';
import { useCheckin } from '../core/domains/useCheckin';
import { useAppStore } from '../stores/useAppStore';
import { useCheckInsStore } from '../stores/useCheckInsStore';
import { getFirstTappableCheckInPeriod } from '../utils/getFirstTappableCheckInPeriod';
import Colors from '../constants/colors';

/**
 * Root routing: onboarding → Check-in Now (tappable M/A/E) → Today Hub when none.
 */
export function AppEntryRedirect() {
  const { isLoading: userLoading, profile } = useUser();
  const { todayCheckIns } = useCheckin();
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const centralProfile = useAppStore((s) => s.userProfile);
  const checkInsHydrated = useCheckInsStore.use.hasHydrated();

  const tappablePeriod = useMemo(
    () => getFirstTappableCheckInPeriod(new Date(), todayCheckIns, centralDailyCheckIns),
    [todayCheckIns, centralDailyCheckIns],
  );

  const onboarded =
    (centralProfile?.hasCompletedOnboarding ?? profile.hasCompletedOnboarding) === true;

  if (!checkInsHydrated || userLoading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href={'/onboarding' as any} />;
  }

  if (tappablePeriod) {
    return (
      <Redirect
        href={
          {
            pathname: '/check-in-now',
            params: { period: tappablePeriod },
          } as any
        }
      />
    );
  }

  return <Redirect href={'/(tabs)/(home)/today-hub' as any} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
