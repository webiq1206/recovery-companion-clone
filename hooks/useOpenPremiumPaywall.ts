import { useCallback } from 'react';
import { Alert, InteractionManager, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { REVENUECAT_PRO_ENTITLEMENT_ID } from '../constants/revenueCatPublicConfig';
import { useSubscription } from '../providers/SubscriptionProvider';

function buildPurchaseVerifyFailedMessage(activeKeys: string[]): string {
  const keysLine =
    activeKeys.length > 0
      ? `Active entitlements from store: ${activeKeys.join(', ')}. Expected: ${REVENUECAT_PRO_ENTITLEMENT_ID}.`
      : `No active entitlements returned yet. Expected: ${REVENUECAT_PRO_ENTITLEMENT_ID}.`;
  return `Purchase completed, but Premium could not be activated yet. ${keysLine} Try Restore purchases in Settings. If this continues, contact support.`;
}

/**
 * Presents the RevenueCat hosted paywall from any screen (Settings, Plans & benefits, gates, etc.).
 * Returns true only when premium is actually unlocked in app state.
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
    const outcome = await presentHostedPaywall();
    if (!outcome) {
      return false;
    }

    if (outcome.premiumUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    }

    if (outcome.result === PAYWALL_RESULT.PURCHASED) {
      Alert.alert('Premium not activated', buildPurchaseVerifyFailedMessage(outcome.activeEntitlementKeys), [
        { text: 'OK' },
      ]);
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
