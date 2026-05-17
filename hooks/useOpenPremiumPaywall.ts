import { useCallback } from 'react';
import { Alert, InteractionManager, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscription } from '../providers/SubscriptionProvider';

/**
 * Presents the RevenueCat hosted paywall from any screen (Settings, Plans & benefits, gates, etc.).
 * Returns true when the user purchased or restored premium.
 */
export function useOpenPremiumPaywall() {
  const {
    presentHostedPaywall,
    storePurchasesReady,
    purchasesApiKeyConfigured,
    isPremium,
  } = useSubscription();

  const openPremiumPaywall = useCallback(async (): Promise<boolean> => {
    if (isPremium) {
      return true;
    }
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile app required',
        'Subscriptions are purchased through the App Store or Google Play in the RecoveryRoad mobile app.',
        [{ text: 'OK' }],
      );
      return false;
    }
    if (!purchasesApiKeyConfigured || !storePurchasesReady) {
      Alert.alert(
        'Please wait',
        'The App Store or Google Play is still connecting. Try again in a moment.',
        [{ text: 'OK' }],
      );
      return false;
    }
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    const result = await presentHostedPaywall();
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    }
    return false;
  }, [isPremium, purchasesApiKeyConfigured, storePurchasesReady, presentHostedPaywall]);

  return {
    openPremiumPaywall,
    isPremium,
    storePurchasesReady,
    purchasesApiKeyConfigured,
  };
}
