import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { SubscriptionTier, SubscriptionState, PremiumFeature } from '@/types';

const STORAGE_KEY = 'subscription_state';
const RC_USER_ID_KEY = 'rc_user_id';
const RC_BASE_URL = 'https://api.revenuecat.com/v1';

function getRCApiKey(): string {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '',
  }) ?? '';
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

interface RCOffering {
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

/** All premium-only keys; see `constants/subscriptionPlans.ts` for marketing copy and tier matrix. */
const FEATURE_LABELS: Record<PremiumFeature, { title: string; description: string }> = {
  predictive_engine: {
    title: 'Predictive Relapse Engine',
    description:
      'Full Premium early-warning engine (bundled with advanced analytics). Core charts and insights may still appear on Freemium; deep predictive modeling requires Premium.',
  },
  advanced_analytics: {
    title: 'Advanced Analytics',
    description:
      'Deep trajectory analytics and trend surfaces beyond core progress. Works with the predictive engine for subscribers.',
  },
  deep_exercises: {
    title: 'Deep Emotional Exercises',
    description: 'Guided therapeutic exercises for processing emotions and building resilience.',
  },
  ai_companion: {
    title: 'AI Adaptive Guidance',
    description: 'Personalized AI companion that adapts to your recovery stage and emotional state.',
  },
  rebuild_programs: {
    title: 'Life Rebuild Programs',
    description: 'Structured programs for habit replacement, routine building, and identity reconstruction.',
  },
  therapist_export: {
    title: 'Therapist Export Tools',
    description: 'Generate shareable recovery reports and progress summaries for your care team.',
  },
  recovery_rooms: {
    title: 'Recovery Rooms',
    description: 'Join moderated small-group sessions with peers on similar recovery journeys.',
  },
  advanced_accountability: {
    title: 'Advanced Accountability',
    description: 'Behavioral drift alerts, partner connections, and commitment contract analytics.',
  },
};

async function rcFetch(path: string, options?: RequestInit) {
  const apiKey = getRCApiKey();
  const res = await fetch(`${RC_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Platform': Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.log('RC API error:', res.status, text);
    throw new Error(`RevenueCat API error: ${res.status}`);
  }
  return res.json();
}

async function fetchSubscriberInfo(userId: string) {
  try {
    const data = await rcFetch(`/subscribers/${encodeURIComponent(userId)}`);
    console.log('RC subscriber info fetched');
    return data;
  } catch (e) {
    console.log('Error fetching subscriber info:', e);
    return null;
  }
}

async function fetchOfferings(userId: string): Promise<RCOffering[]> {
  try {
    const data = await rcFetch(`/subscribers/${encodeURIComponent(userId)}/offerings`);
    const currentOffering = data?.current_offering;
    if (!currentOffering) {
      console.log('No current offering found');
      return [];
    }
    const packages: RCPackage[] = (currentOffering.packages || []).map((pkg: any) => ({
      identifier: pkg.identifier,
      packageType: pkg.package_type,
      product: {
        identifier: pkg.platform_product_identifier,
        title: pkg.display_name || pkg.identifier,
        description: '',
        price: pkg.product?.price ?? 0,
        priceString: pkg.product?.price_string ?? '',
        currencyCode: pkg.product?.currency_code ?? 'USD',
      },
    }));
    return [{
      identifier: currentOffering.identifier,
      description: currentOffering.description || '',
      packages,
    }];
  } catch (e) {
    console.log('Error fetching offerings:', e);
    return [];
  }
}

function checkEntitlementActive(subscriberInfo: any): { isActive: boolean; expiresDate: string | null } {
  if (!subscriberInfo?.subscriber?.entitlements) {
    return { isActive: false, expiresDate: null };
  }
  const entitlements = subscriberInfo.subscriber.entitlements;
  const proEntitlement = entitlements['Recovery Companion Pro'];
  if (!proEntitlement) {
    return { isActive: false, expiresDate: null };
  }
  const expiresDate = proEntitlement.expires_date;
  if (!expiresDate) {
    return { isActive: true, expiresDate: null };
  }
  const isActive = new Date(expiresDate) > new Date();
  return { isActive, expiresDate };
}

async function purchaseProduct(userId: string, productId: string): Promise<any> {
  try {
    const data = await rcFetch(`/receipts`, {
      method: 'POST',
      headers: {
        'X-Is-Sandbox': 'true',
      },
      body: JSON.stringify({
        app_user_id: userId,
        fetch_token: `test_token_${Date.now()}`,
        product_id: productId,
        price: 0,
        currency: 'USD',
        is_restore: false,
      }),
    });
    console.log('RC purchase response:', JSON.stringify(data));
    return data;
  } catch (e) {
    console.log('Error making purchase:', e);
    throw e;
  }
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);
  const [rcUserId, setRcUserId] = useState<string>('');

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

  const subscriberQuery = useQuery({
    queryKey: ['rc_subscriber', rcUserId],
    queryFn: () => fetchSubscriberInfo(rcUserId),
    enabled: !!rcUserId,
    staleTime: 1000 * 60 * 5,
  });

  const offeringsQuery = useQuery({
    queryKey: ['rc_offerings', rcUserId],
    queryFn: () => fetchOfferings(rcUserId),
    enabled: !!rcUserId,
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
    if (subscriberQuery.data) {
      const { isActive, expiresDate } = checkEntitlementActive(subscriberQuery.data);
      if (isActive && subscription.tier !== 'premium') {
        const newState: SubscriptionState = {
          tier: 'premium',
          subscribedAt: new Date().toISOString(),
          expiresAt: expiresDate,
        };
        setSubscription(newState);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        queryClient.setQueryData(['subscription'], newState);
      } else if (!isActive && subscription.tier === 'premium') {
        const newState: SubscriptionState = DEFAULT_STATE;
        setSubscription(newState);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        queryClient.setQueryData(['subscription'], newState);
      }
    }
  }, [subscriberQuery.data]);

  useEffect(() => {
    if (subscriptionQuery.data && !subscriberQuery.data) {
      setSubscription(subscriptionQuery.data);
    }
  }, [subscriptionQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (state: SubscriptionState) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return state;
    },
    onSuccess: (data) => {
      setSubscription(data);
      queryClient.setQueryData(['subscription'], data);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!rcUserId) throw new Error('User ID not ready');
      console.log('Attempting purchase for product:', productId);
      await purchaseProduct(rcUserId, productId);
      await queryClient.invalidateQueries({ queryKey: ['rc_subscriber', rcUserId] });
      const updatedInfo = await fetchSubscriberInfo(rcUserId);
      const { isActive, expiresDate } = checkEntitlementActive(updatedInfo);
      if (!isActive) {
        console.log('Purchase completed but entitlement not active - verifying...');
        throw new Error('Purchase could not be verified. Please try restoring your purchase.');
      }
      const newState: SubscriptionState = {
        tier: 'premium',
        subscribedAt: new Date().toISOString(),
        expiresAt: expiresDate,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setSubscription(newState);
      queryClient.setQueryData(['subscription'], newState);
      return newState;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!rcUserId) throw new Error('User ID not ready');
      const info = await fetchSubscriberInfo(rcUserId);
      const { isActive, expiresDate } = checkEntitlementActive(info);
      if (isActive) {
        const newState: SubscriptionState = {
          tier: 'premium',
          subscribedAt: new Date().toISOString(),
          expiresAt: expiresDate,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        setSubscription(newState);
        queryClient.setQueryData(['subscription'], newState);
        return { restored: true };
      }
      return { restored: false };
    },
  });

  const isPremium = useMemo(() => subscription.tier === 'premium', [subscription.tier]);

  const hasFeature = useCallback((feature: PremiumFeature): boolean => {
    if (FREE_FEATURES.has(feature)) return true;
    if (subscription.tier === 'premium') return true;
    return false;
  }, [subscription.tier]);

  const getFeatureInfo = useCallback((feature: PremiumFeature) => {
    return FEATURE_LABELS[feature];
  }, []);

  const activatePremiumMutation = useMutation({
    mutationFn: async () => {
      console.log('[Subscription] Activating premium locally');
      const newState: SubscriptionState = {
        tier: 'premium',
        subscribedAt: new Date().toISOString(),
        expiresAt: null,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    },
    onSuccess: (data) => {
      setSubscription(data);
      queryClient.setQueryData(['subscription'], data);
      console.log('[Subscription] Premium activated successfully');
    },
  });

  const activatePremium = useCallback(() => {
    activatePremiumMutation.mutate();
  }, []);

  const upgradeToPremium = useCallback(() => {
    console.log('[Subscription] upgradeToPremium called');
    if (!rcUserId) {
      console.log('[Subscription] No RC user ID - activating locally');
      activatePremiumMutation.mutate();
      return;
    }
    const currentOfferings = offeringsQuery.data ?? [];
    if (currentOfferings.length > 0 && currentOfferings[0].packages.length > 0) {
      const defaultProduct = currentOfferings[0].packages[0].product.identifier;
      purchaseMutation.mutate(defaultProduct);
    } else {
      console.log('[Subscription] No offerings available - activating locally');
      activatePremiumMutation.mutate();
    }
  }, [rcUserId, offeringsQuery.data]);

  const restorePurchase = useCallback(() => {
    restoreMutation.mutate();
  }, []);

  const cancelSubscription = useCallback(() => {
    const newState: SubscriptionState = {
      tier: 'free',
      subscribedAt: null,
      expiresAt: null,
    };
    saveMutation.mutate(newState);
  }, []);

  const offerings = useMemo(() => offeringsQuery.data ?? [], [offeringsQuery.data]);

  const purchaseStatus = useMemo(() => ({
    isPending: purchaseMutation.isPending,
    isError: purchaseMutation.isError,
    error: purchaseMutation.error,
  }), [purchaseMutation.isPending, purchaseMutation.isError, purchaseMutation.error]);

  const restoreStatus = useMemo(() => ({
    isPending: restoreMutation.isPending,
    isError: restoreMutation.isError,
    error: restoreMutation.error,
  }), [restoreMutation.isPending, restoreMutation.isError, restoreMutation.error]);

  const purchase = useCallback((productId: string) => {
    purchaseMutation.mutate(productId);
  }, []);

  const restore = useCallback(() => {
    restoreMutation.mutate();
  }, []);

  return useMemo(() => ({
    subscription,
    isPremium,
    hasFeature,
    getFeatureInfo,
    upgradeToPremium,
    activatePremium,
    restorePurchase,
    cancelSubscription,
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
    activatePremiumMutation,
    rcUserId,
  }), [
    subscription, isPremium, hasFeature, getFeatureInfo,
    upgradeToPremium, activatePremium, restorePurchase, cancelSubscription,
    subscriptionQuery.isLoading, userIdQuery.isLoading,
    offerings, offeringsQuery.isLoading,
    purchase, purchaseStatus, restore, restoreStatus,
    purchaseMutation, restoreMutation, activatePremiumMutation, rcUserId,
  ]);
});
