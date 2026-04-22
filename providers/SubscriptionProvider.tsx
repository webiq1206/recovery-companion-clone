import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { SubscriptionState, PremiumFeature } from '../types';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';
import { isProviderEnterpriseSuiteInBuild } from '../utils/isProviderEnterpriseSuiteInBuild';

const STORAGE_KEY = 'subscription_state';
const RC_USER_ID_KEY = 'rc_user_id';

/** Must match the entitlement identifier in RevenueCat (and mirrored offering access). */
export const REVENUECAT_PRO_ENTITLEMENT_ID = 'RecoveryRoad Pro';

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
    title: 'Recovery Rooms',
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

function subscriptionStateFromCustomerInfo(info: CustomerInfo): SubscriptionState {
  const pro = info.entitlements.active[REVENUECAT_PRO_ENTITLEMENT_ID];
  if (!pro || !pro.isActive) {
    return DEFAULT_STATE;
  }
  const expiresAt = pro.expirationDate ?? null;
  return {
    tier: 'premium',
    subscribedAt: pro.originalPurchaseDate ?? new Date().toISOString(),
    expiresAt,
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
        applyCustomerInfoRef.current(customerInfo);
        await queryClient.invalidateQueries({ queryKey: ['rc_offerings', rcUserId] });
        const next = subscriptionStateFromCustomerInfo(customerInfo);
        if (next.tier !== 'premium') {
          throw new Error('Purchase could not be verified. Please try Restore purchases.');
        }
        return next;
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
      const info = await Purchases.restorePurchases();
      applyCustomerInfoRef.current(info);
      const next = subscriptionStateFromCustomerInfo(info);
      return { restored: next.tier === 'premium' };
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
      purchasesApiKeyConfigured,
      storePurchasesReady,
    ],
  );
});
