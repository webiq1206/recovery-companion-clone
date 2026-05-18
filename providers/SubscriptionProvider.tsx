import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesEntitlementInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { SubscriptionState, PremiumFeature } from '../types';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';
import { isProviderEnterpriseSuiteInBuild } from '../utils/isProviderEnterpriseSuiteInBuild';
import { REVENUECAT_PRO_ENTITLEMENT_ID } from '../constants/revenueCatPublicConfig';

export { REVENUECAT_PRO_ENTITLEMENT_ID };

const STORAGE_KEY = 'subscription_state';
const RC_USER_ID_KEY = 'rc_user_id';

const REFRESH_CUSTOMER_INFO_DELAYS_MS = [0, 1000, 2500, 5000] as const;

/** Short generic aliases only; canonical id is REVENUECAT_PRO_ENTITLEMENT_ID (RecoveryRoad Premium). */
const ENTITLEMENT_ALIASES = ['premium', 'pro'] as const;

export type PremiumEntitlementSource = 'configured' | 'alias' | 'sole_active' | null;

export type SubscriptionDiagnostics = {
  activeEntitlementKeys: string[];
  lastEntitlementSource: PremiumEntitlementSource;
  lastResolvedEntitlementId: string | null;
  expectedEntitlementId: string;
};

export type HostedPaywallOutcome = {
  result: string | null;
  premiumUnlocked: boolean;
  activeEntitlementKeys: string[];
};

/**
 * RevenueCat **SDK** public API key (e.g. `appl_…` / `goog_…`). Same resolution in dev and release
 * so subscription behavior matches store binaries.
 */
function getPurchasesSdkApiKey(): string {
  return (
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
      default: '',
    }) ?? ''
  );
}

function isNativeStorePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function isPurchasesApiKeyConfigured(): boolean {
  return getPurchasesSdkApiKey().length > 0;
}

function generateUserId(): string {
  return 'rc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

async function getOrCreateUserId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(RC_USER_ID_KEY);
    if (stored) return stored;
    const newId = generateUserId();
    await AsyncStorage.setItem(RC_USER_ID_KEY, newId);
    return newId;
  } catch (e) {
    console.log('Error getting RC user id:', e);
    return generateUserId();
  }
}

interface RCPackageProduct {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

interface RCPackage {
  identifier: string;
  packageType: string;
  product: RCPackageProduct;
}

export interface RCOffering {
  identifier: string;
  description: string;
  packages: RCPackage[];
}

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  subscribedAt: null,
  expiresAt: null,
};

const FREE_FEATURES: Set<PremiumFeature> = new Set([]);

const FEATURE_LABELS: Record<PremiumFeature, { title: string; description: string }> = {
  predictive_engine: {
    title: 'Pattern awareness',
    description:
      'Trend views from your own data (with Premium)—self-assessment only, not a diagnosis or medical risk score.',
  },
  advanced_analytics: {
    title: 'Advanced Analytics',
    description:
      'Extra charts from your on-device history—wellness-oriented trends, not clinical monitoring or provider reporting.',
  },
  deep_exercises: {
    title: 'Deep Emotional Exercises',
    description: 'Guided self-reflection prompts—wellness support, not psychotherapy or clinical treatment.',
  },
  rebuild_programs: {
    title: 'Life Rebuild Programs',
    description: 'Structured programs for habit replacement, routine building, and identity reconstruction.',
  },
    therapist_export: {
    title: 'Care-circle summaries',
    description:
      'Optional summaries you choose to share with people you trust. Available only in builds that include care-partner tools; not a medical record.',
  },
  recovery_rooms: {
    title: 'Guided group-style practice',
    description:
      'On-device practice scenarios inspired by group support—not a substitute for live moderated clinical groups.',
  },
  advanced_accountability: {
    title: 'Advanced Accountability',
    description:
      'Optional reminders, partner check-ins, and simple commitment tracking—wellness support, not clinical monitoring.',
  },
};

function mapPurchasesOfferingToRC(offering: PurchasesOffering): RCOffering {
  return {
    identifier: offering.identifier,
    description: offering.serverDescription ?? '',
    packages: offering.availablePackages.map((pkg: PurchasesPackage) => ({
      identifier: pkg.identifier,
      packageType: String(pkg.packageType),
      product: {
        identifier: pkg.product.identifier,
        title: pkg.product.title,
        description: pkg.product.description,
        price: typeof pkg.product.price === 'number' ? pkg.product.price : 0,
        priceString: pkg.product.priceString,
        currencyCode: pkg.product.currencyCode ?? 'USD',
      },
    })),
  };
}

function repopulateNativePackageMap(
  mapRef: MutableRefObject<Map<string, PurchasesPackage>>,
  offering: PurchasesOffering | null | undefined,
) {
  mapRef.current.clear();
  if (!offering) return;
  for (const pkg of offering.availablePackages) {
    mapRef.current.set(pkg.product.identifier, pkg);
  }
}

export type ResolvedPremiumEntitlement = {
  entitlement: PurchasesEntitlementInfo | null;
  identifier: string | null;
  source: PremiumEntitlementSource;
};

export function resolveActivePremiumEntitlement(info: CustomerInfo): ResolvedPremiumEntitlement {
  const configured = info.entitlements.active[REVENUECAT_PRO_ENTITLEMENT_ID];
  if (configured?.isActive) {
    return {
      entitlement: configured,
      identifier: REVENUECAT_PRO_ENTITLEMENT_ID,
      source: 'configured',
    };
  }

  const seen = new Set<string>([REVENUECAT_PRO_ENTITLEMENT_ID]);
  for (const alias of ENTITLEMENT_ALIASES) {
    if (seen.has(alias)) continue;
    seen.add(alias);
    const ent = info.entitlements.active[alias];
    if (ent?.isActive) {
      if (__DEV__ && alias !== REVENUECAT_PRO_ENTITLEMENT_ID) {
        console.log('[Subscription] Using alias entitlement:', alias);
      }
      return { entitlement: ent, identifier: alias, source: 'alias' };
    }
  }

  const activeKeys = Object.keys(info.entitlements.active);
  if (activeKeys.length === 1) {
    const key = activeKeys[0];
    const ent = info.entitlements.active[key];
    if (ent?.isActive) {
      if (__DEV__) {
        console.log('[Subscription] Using sole active entitlement:', key);
      }
      return { entitlement: ent, identifier: key, source: 'sole_active' };
    }
  }

  return { entitlement: null, identifier: null, source: null };
}

function subscriptionStateFromCustomerInfo(info: CustomerInfo): SubscriptionState {
  const { entitlement: pro } = resolveActivePremiumEntitlement(info);
  if (!pro) {
    return DEFAULT_STATE;
  }
  const expiresAt = pro.expirationDate ?? null;
  return {
    tier: 'premium',
    subscribedAt: pro.originalPurchaseDate ?? new Date().toISOString(),
    expiresAt,
  };
}

function activeEntitlementKeys(info: CustomerInfo): string[] {
  return Object.keys(info.entitlements.active);
}

function diagnosticsFromCustomerInfo(info: CustomerInfo): SubscriptionDiagnostics {
  const resolved = resolveActivePremiumEntitlement(info);
  return {
    activeEntitlementKeys: activeEntitlementKeys(info),
    lastEntitlementSource: resolved.source,
    lastResolvedEntitlementId: resolved.identifier,
    expectedEntitlementId: REVENUECAT_PRO_ENTITLEMENT_ID,
  };
}

async function syncStorePurchasesIfSupported(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const purchases = Purchases as typeof Purchases & { syncPurchases?: () => Promise<void> };
  if (typeof purchases.syncPurchases === 'function') {
    try {
      await purchases.syncPurchases();
    } catch (e) {
      console.log('[Subscription] syncPurchases failed:', e);
    }
  }
}

async function refreshPremiumStateAfterStoreAction(
  applyCustomerInfo: (info: CustomerInfo) => void,
): Promise<{
  tier: SubscriptionState['tier'];
  activeEntitlementKeys: string[];
  customerInfo: CustomerInfo | null;
}> {
  await syncStorePurchasesIfSupported();
  let lastInfo: CustomerInfo | null = null;
  for (const delayMs of REFRESH_CUSTOMER_INFO_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    lastInfo = await Purchases.getCustomerInfo();
    applyCustomerInfo(lastInfo);
    const tier = subscriptionStateFromCustomerInfo(lastInfo).tier;
    if (tier === 'premium') {
      return {
        tier,
        activeEntitlementKeys: activeEntitlementKeys(lastInfo),
        customerInfo: lastInfo,
      };
    }
  }
  const tier = lastInfo ? subscriptionStateFromCustomerInfo(lastInfo).tier : 'free';
  return {
    tier,
    activeEntitlementKeys: lastInfo ? activeEntitlementKeys(lastInfo) : [],
    customerInfo: lastInfo,
  };
}

function isPurchaseCancelledError(e: unknown): boolean {
  const err = e as { code?: PURCHASES_ERROR_CODE; userCancelled?: boolean | null };
  return (
    err?.userCancelled === true ||
    err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);
  const [rcUserId, setRcUserId] = useState<string>('');
  const [storePurchasesReady, setStorePurchasesReady] = useState(false);
  const [subscriptionDiagnostics, setSubscriptionDiagnostics] = useState<SubscriptionDiagnostics>({
    activeEntitlementKeys: [],
    lastEntitlementSource: null,
    lastResolvedEntitlementId: null,
    expectedEntitlementId: REVENUECAT_PRO_ENTITLEMENT_ID,
  });

  const nativePackagesByProductId = useRef<Map<string, PurchasesPackage>>(new Map());

  const purchasesApiKeyConfigured = isPurchasesApiKeyConfigured();
  const shouldUseNativePurchases =
    isNativeStorePlatform() && purchasesApiKeyConfigured;

  const userIdQuery = useQuery({
    queryKey: ['rc_user_id'],
    queryFn: getOrCreateUserId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (userIdQuery.data) {
      setRcUserId(userIdQuery.data);
    }
  }, [userIdQuery.data]);

  const persistSubscription = useCallback(async (next: SubscriptionState) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSubscription(next);
    queryClient.setQueryData(['subscription'], next);
  }, [queryClient]);

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo) => {
      setSubscriptionDiagnostics(diagnosticsFromCustomerInfo(info));
      const next = subscriptionStateFromCustomerInfo(info);
      void persistSubscription(next);
    },
    [persistSubscription],
  );

  const applyCustomerInfoRef = useRef(applyCustomerInfo);
  applyCustomerInfoRef.current = applyCustomerInfo;

  useEffect(() => {
    if (!shouldUseNativePurchases || !rcUserId) {
      setStorePurchasesReady(false);
      return;
    }

    let cancelled = false;
    let listener: CustomerInfoUpdateListener | null = null;

    (async () => {
      try {
        const apiKey = getPurchasesSdkApiKey();
        const already = await Purchases.isConfigured();
        if (!already) {
          Purchases.configure({ apiKey, appUserID: rcUserId });
        } else {
          await Purchases.logIn(rcUserId);
        }
        if (__DEV__) {
          await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        }
        const info = await Purchases.getCustomerInfo();
        if (cancelled) return;
        applyCustomerInfoRef.current(info);

        listener = (customerInfo) => {
          applyCustomerInfoRef.current(customerInfo);
        };
        Purchases.addCustomerInfoUpdateListener(listener);
        setStorePurchasesReady(true);
      } catch (e) {
        console.log('[Subscription] Purchases setup failed:', e);
        setStorePurchasesReady(false);
      }
    })();

    return () => {
      cancelled = true;
      if (listener) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [shouldUseNativePurchases, rcUserId]);

  const offeringsQuery = useQuery({
    queryKey: ['rc_offerings', rcUserId, storePurchasesReady],
    queryFn: async (): Promise<RCOffering[]> => {
      if (!shouldUseNativePurchases || !storePurchasesReady) {
        return [];
      }
      const data = await Purchases.getOfferings();
      const current = data.current;
      repopulateNativePackageMap(nativePackagesByProductId, current);
      if (!current) {
        return [];
      }
      return [mapPurchasesOfferingToRC(current)];
    },
    enabled: !!rcUserId && storePurchasesReady && shouldUseNativePurchases,
    staleTime: 1000 * 60 * 30,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SubscriptionState;
          if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
            const expired: SubscriptionState = { tier: 'free', subscribedAt: null, expiresAt: null };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
            return expired;
          }
          return parsed;
        }
        return DEFAULT_STATE;
      } catch (e) {
        console.log('Error loading subscription:', e);
        return DEFAULT_STATE;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!subscriptionQuery.isSuccess || subscriptionQuery.data === undefined) return;
    const useCachedOnly =
      Platform.OS === 'web' || !shouldUseNativePurchases || !storePurchasesReady;
    if (useCachedOnly) {
      setSubscription(subscriptionQuery.data);
    }
  }, [
    subscriptionQuery.isSuccess,
    subscriptionQuery.data,
    shouldUseNativePurchases,
    storePurchasesReady,
  ]);

  const refreshOfferingsPackageMap = useCallback(async () => {
    if (!storePurchasesReady || !shouldUseNativePurchases) return;
    const data = await Purchases.getOfferings();
    repopulateNativePackageMap(nativePackagesByProductId, data.current);
  }, [storePurchasesReady, shouldUseNativePurchases]);

  const purchaseMutation = useMutation({
    mutationFn: async (storeProductId: string) => {
      if (!shouldUseNativePurchases) {
        throw new Error('Store purchases are only available in the iOS and Android apps.');
      }
      if (!storePurchasesReady) {
        throw new Error('The store is still connecting. Please try again in a moment.');
      }
      let pkg = nativePackagesByProductId.current.get(storeProductId);
      if (!pkg) {
        await refreshOfferingsPackageMap();
        pkg = nativePackagesByProductId.current.get(storeProductId);
      }
      if (!pkg) {
        throw new Error('That plan could not be loaded yet. Try this screen again in a moment.');
      }
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        await queryClient.invalidateQueries({ queryKey: ['rc_offerings', rcUserId] });
        const refreshed = await refreshPremiumStateAfterStoreAction(applyCustomerInfoRef.current);
        if (refreshed.tier !== 'premium') {
          if (__DEV__) {
            console.log(
              '[Subscription] Package purchase completed but entitlement not active. Active keys:',
              refreshed.activeEntitlementKeys,
              'Expected:',
              REVENUECAT_PRO_ENTITLEMENT_ID,
            );
          }
          throw new Error('Purchase could not be verified. Please try Restore purchases.');
        }
        return subscriptionStateFromCustomerInfo(refreshed.customerInfo!);
      } catch (e) {
        if (isPurchaseCancelledError(e)) {
          throw new Error('PURCHASE_CANCELLED');
        }
        throw e;
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!shouldUseNativePurchases || !storePurchasesReady) {
        throw new Error('Restore is only available in the iOS and Android apps once the store has finished connecting.');
      }
      await Purchases.restorePurchases();
      const refreshed = await refreshPremiumStateAfterStoreAction(applyCustomerInfoRef.current);
      return { restored: refreshed.tier === 'premium' };
    },
  });

  const isPremium = useMemo(() => subscription.tier === 'premium', [subscription.tier]);

  const hasFeature = useCallback(
    (feature: PremiumFeature): boolean => {
      if (!isProviderEnterpriseSuiteInBuild() && feature === 'therapist_export') return false;
      if (feature === 'recovery_rooms' && !arePeerPracticeFeaturesEnabled()) return false;
      if (FREE_FEATURES.has(feature)) return true;
      if (subscription.tier === 'premium') return true;
      return false;
    },
    [subscription.tier],
  );

  const getFeatureInfo = useCallback((feature: PremiumFeature) => {
    return FEATURE_LABELS[feature];
  }, []);

  const restorePurchase = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  const offerings = useMemo(() => offeringsQuery.data ?? [], [offeringsQuery.data]);

  const purchaseStatus = useMemo(
    () => ({
      isPending: purchaseMutation.isPending,
      isError: purchaseMutation.isError,
      error: purchaseMutation.error,
    }),
    [purchaseMutation.isPending, purchaseMutation.isError, purchaseMutation.error],
  );

  const restoreStatus = useMemo(
    () => ({
      isPending: restoreMutation.isPending,
      isError: restoreMutation.isError,
      error: restoreMutation.error,
    }),
    [restoreMutation.isPending, restoreMutation.isError, restoreMutation.error],
  );

  const purchase = useCallback(
    (productId: string) => {
      purchaseMutation.mutate(productId);
    },
    [purchaseMutation],
  );

  const restore = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  /**
   * Presents RevenueCat’s hosted paywall (dashboard-designed). No-op on web or when the SDK is not ready.
   * Refreshes entitlement state after a successful purchase or restore and verifies premium unlock.
   */
  const presentHostedPaywall = useCallback(async (): Promise<HostedPaywallOutcome | null> => {
    if (Platform.OS === 'web' || !shouldUseNativePurchases || !storePurchasesReady) {
      return null;
    }
    try {
      const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_PRO_ENTITLEMENT_ID,
      });

      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        const refreshed = await refreshPremiumStateAfterStoreAction(applyCustomerInfoRef.current);
        await queryClient.invalidateQueries({ queryKey: ['rc_offerings', rcUserId] });
        if (__DEV__ && result === PAYWALL_RESULT.PURCHASED && refreshed.tier !== 'premium') {
          console.log(
            '[Subscription] Paywall purchase completed but entitlement not active. Active keys:',
            refreshed.activeEntitlementKeys,
            'Expected:',
            REVENUECAT_PRO_ENTITLEMENT_ID,
          );
        }
        return {
          result,
          premiumUnlocked: refreshed.tier === 'premium',
          activeEntitlementKeys: refreshed.activeEntitlementKeys,
        };
      }

      if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        const info = await Purchases.getCustomerInfo();
        applyCustomerInfoRef.current(info);
        const tier = subscriptionStateFromCustomerInfo(info).tier;
        return {
          result,
          premiumUnlocked: tier === 'premium',
          activeEntitlementKeys: activeEntitlementKeys(info),
        };
      }

      return { result, premiumUnlocked: false, activeEntitlementKeys: [] };
    } catch (e) {
      console.log('[Subscription] presentHostedPaywall failed:', e);
      return null;
    }
  }, [
    shouldUseNativePurchases,
    storePurchasesReady,
    queryClient,
    rcUserId,
  ]);

  return useMemo(
    () => ({
      subscription,
      isPremium,
      hasFeature,
      getFeatureInfo,
      restorePurchase,
      /** Native StoreKit / Play Billing is configured and the Purchases SDK finished startup. */
      storePurchasesReady,
      /** Public SDK key is present for the current platform (required for real IAP). */
      purchasesApiKeyConfigured,
      isLoading: subscriptionQuery.isLoading || userIdQuery.isLoading,
      featureLabels: FEATURE_LABELS,
      offerings,
      offeringsLoading: offeringsQuery.isLoading,
      purchase,
      purchaseStatus,
      restore,
      restoreStatus,
      purchaseMutation,
      restoreMutation,
      rcUserId,
      presentHostedPaywall,
      subscriptionDiagnostics,
      /** @deprecated Use purchasesApiKeyConfigured */
      revenueCatConfigured: purchasesApiKeyConfigured,
    }),
    [
      subscription,
      isPremium,
      hasFeature,
      getFeatureInfo,
      restorePurchase,
      subscriptionQuery.isLoading,
      userIdQuery.isLoading,
      offerings,
      offeringsQuery.isLoading,
      purchase,
      purchaseStatus,
      restore,
      restoreStatus,
      purchaseMutation,
      restoreMutation,
      rcUserId,
      presentHostedPaywall,
      subscriptionDiagnostics,
      purchasesApiKeyConfigured,
      storePurchasesReady,
    ],
  );
});
