import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown,
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  Star,
  Clock,
  Infinity as InfinityIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import {
  getFreemiumHighlights,
  FREEMIUM_SECTION_TITLE,
  getPremiumFeatureMarketingCards,
  type PremiumMarketingCard,
} from '../constants/subscriptionPlans';
import { WELLNESS_APP_DISCLAIMER } from '../constants/wellnessDisclaimer';
import { useSubscription } from '../providers/SubscriptionProvider';

/** App Store–style auto-renewal summary; shown on the paywall before purchase. */
function storeAutoRenewalSummary(): string {
  if (Platform.OS === 'ios') {
    return (
      'Payment will be charged to your Apple ID account at confirmation of purchase. Your subscription automatically renews ' +
      'unless you turn off auto-renew at least 24 hours before the end of the current period. Your account will be charged ' +
      'for renewal within 24 hours prior to the end of the current period at the subscription price in effect. You can manage ' +
      'or cancel subscriptions in Apple ID settings → Subscriptions.'
    );
  }
  if (Platform.OS === 'android') {
    return (
      'Payment will be charged to your Google Play account at confirmation of purchase. Unless you cancel in Google Play ' +
      'at least 24 hours before the end of the current period, your subscription renews at the then-current price. Manage or ' +
      'cancel in the Play Store app under Payments & subscriptions → Subscriptions.'
    );
  }
  return (
    'Subscriptions renew automatically until canceled in your App Store or Google Play account, generally at least 24 hours ' +
    'before the next renewal date. Charges and refunds follow that store’s rules.'
  );
}

interface PlanOption {
  id: string;
  identifier: string;
  label: string;
  price: string;
  /** Short line next to price, e.g. "per month" */
  period: string;
  /** Shown under the price: billing period + renewal behavior */
  billingDetail: string;
  badge?: string;
  icon: typeof Clock;
  productId: string;
  savings?: string;
  /** Monthly / annual auto-renew vs one-time lifetime */
  billingType: 'subscription' | 'lifetime';
}

const FeatureItem = React.memo(({ item, index }: { item: PremiumMarketingCard; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 100 + index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 100 + index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const IconComp = item.icon;

  return (
    <Animated.View style={[styles.featureItem, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.featureIconWrap, { backgroundColor: `${item.color}18` }]}>
        <IconComp size={20} color={item.color} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDesc}>{item.desc}</Text>
      </View>
    </Animated.View>
  );
});

const PlanCard = React.memo(({ plan, selected, onSelect }: { plan: PlanOption; selected: boolean; onSelect: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconComp = plan.icon;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onSelect();
  };

  return (
    <Pressable onPress={handlePress} testID={`plan-${plan.id}`}>
      <Animated.View
        style={[
          styles.planCard,
          selected && styles.planCardSelected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {plan.badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
        ) : null}
        <View style={styles.planLeft}>
          <View style={[styles.planRadio, selected && styles.planRadioSelected]}>
            {selected ? <View style={styles.planRadioDot} /> : null}
          </View>
          <View style={[styles.planIconWrap, selected && styles.planIconWrapSelected]}>
            <IconComp size={18} color={selected ? '#D4A574' : Colors.textSecondary} />
          </View>
          <View>
            <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>{plan.label}</Text>
            {plan.savings ? <Text style={styles.planSavings}>{plan.savings}</Text> : null}
          </View>
        </View>
        <View style={styles.planRight}>
          <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
          <Text style={styles.planBillingDetail}>{plan.billingDetail}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

export default function PremiumUpgradeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isPremium,
    offerings,
    offeringsLoading,
    purchaseMutation,
    restoreMutation,
    storePurchasesReady,
    purchasesApiKeyConfigured,
  } = useSubscription();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const crownAnim = useRef(new Animated.Value(0)).current;
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');

  const openManageSubscription = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      void Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      void Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      Alert.alert(
        'Manage subscription',
        'Use the App Store or Google Play on your phone to manage or cancel a subscription.',
      );
    }
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(crownAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(crownAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [headerAnim, crownAnim]);

  const crownScale = crownAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });

  const plans: PlanOption[] = React.useMemo(() => {
    if (!offerings || offerings.length === 0) {
      return [];
    }

    const currentOffering = offerings[0];
    if (!currentOffering?.packages || currentOffering.packages.length === 0) {
      return [];
    }

    const monthlyPkg = currentOffering.packages.find((p) => p.identifier === '$rc_monthly');
    const yearlyPkg = currentOffering.packages.find((p) => p.identifier === '$rc_annual');
    let yearlySavingsLabel: string | undefined;
    if (
      monthlyPkg &&
      yearlyPkg &&
      typeof monthlyPkg.product.price === 'number' &&
      typeof yearlyPkg.product.price === 'number' &&
      monthlyPkg.product.price > 0
    ) {
      const annualizedMonthly = monthlyPkg.product.price * 12;
      if (annualizedMonthly > yearlyPkg.product.price) {
        const pct = Math.round((1 - yearlyPkg.product.price / annualizedMonthly) * 100);
        if (pct >= 1 && pct < 100) {
          yearlySavingsLabel = `About ${pct}% vs 12 monthly payments`;
        }
      }
    }

    return currentOffering.packages.map((pkg) => {
      const isMonthly = pkg.identifier === '$rc_monthly';
      const isYearly = pkg.identifier === '$rc_annual';
      const isLifetime = pkg.identifier === '$rc_lifetime';

      let label = pkg.product.title || pkg.identifier;
      let icon: typeof Clock = Clock;
      let badge: string | undefined;
      let savings: string | undefined;
      let period = '';
      let billingDetail = '';
      const price = pkg.product.priceString || `$${pkg.product.price}`;
      let id = 'monthly';
      let billingType: PlanOption['billingType'] = 'subscription';

      if (isMonthly) {
        label = 'Monthly';
        icon = Clock;
        period = 'per month';
        billingDetail = 'Billed every month · Renews automatically until you cancel';
        id = 'monthly';
      } else if (isYearly) {
        label = 'Yearly';
        icon = Star;
        badge = 'Annual';
        savings = yearlySavingsLabel;
        period = 'per year';
        billingDetail = 'Billed once per year · Renews automatically until you cancel';
        id = 'yearly';
      } else if (isLifetime) {
        label = 'Lifetime';
        icon = InfinityIcon;
        period = 'one-time';
        billingDetail = 'Single purchase · Does not renew (not a subscription)';
        id = 'lifetime';
        billingType = 'lifetime';
      } else {
        id = `pkg_${pkg.identifier}`;
        period = 'per term shown at checkout';
        billingDetail =
          pkg.packageType === 'CUSTOM' || pkg.identifier.toLowerCase().includes('lifetime')
            ? 'Billing and renewal terms are shown in the store before you confirm.'
            : 'Subscription renews automatically until you cancel. Term length and price are confirmed in the store before purchase.';
      }

      return {
        id,
        identifier: pkg.identifier,
        label,
        price,
        period,
        billingDetail,
        badge,
        icon,
        productId: pkg.product.identifier,
        savings,
        billingType,
      };
    });
  }, [offerings]);

  useEffect(() => {
    if (plans.length === 0) return;
    if (!plans.some((p) => p.id === selectedPlan)) {
      const preferred = plans.find((p) => p.id === 'yearly');
      setSelectedPlan(preferred?.id ?? plans[0].id);
    }
  }, [plans, selectedPlan]);

  const handlePurchase = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile app required',
        'Subscriptions are purchased through the App Store or Google Play in the Recovery Companion mobile app.',
        [{ text: 'OK' }],
      );
      return;
    }
    if (!purchasesApiKeyConfigured || !storePurchasesReady) {
      Alert.alert(
        'Please wait',
        'The App Store or Google Play is still connecting. Try again in a moment.',
        [{ text: 'OK' }],
      );
      return;
    }
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    const storeName = Platform.OS === 'ios' ? 'Apple' : Platform.OS === 'android' ? 'Google Play' : 'the store';
    const renewalNote =
      plan.billingType === 'lifetime'
        ? 'This is a one-time purchase. It does not renew automatically.'
        : `Charged to your ${storeName} account. Renews automatically until you cancel there (usually at least 24 hours before the next renewal). Exact timing, price, and any trial or offer are confirmed in the store at checkout. Billing details on this screen also apply.`;
    const confirmVerb = plan.billingType === 'lifetime' ? 'Buy' : 'Subscribe';

    Alert.alert(
      `${confirmVerb} — ${plan.label}`,
      `${plan.price} (${plan.period})\n${plan.billingDetail}\n\n${renewalNote}\n\nPremium unlocks in-app features while your purchase or subscription is active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: confirmVerb,
          onPress: () => {
            purchaseMutation.mutate(plan.productId, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Welcome to Premium',
                  'Premium features are now available on this device for as long as your entitlement is active.',
                  [{ text: 'Continue', onPress: () => router.back() }]
                );
              },
              onError: (error) => {
                const msg = error instanceof Error ? error.message : String(error);
                if (msg === 'PURCHASE_CANCELLED') {
                  return;
                }
                console.log('Store purchase failed:', error);
                Alert.alert(
                  'Purchase did not complete',
                  'Check your connection and try again, or tap Restore purchases if you already bought Premium with this store account.',
                );
              },
            });
          },
        },
      ]
    );
  }, [
    selectedPlan,
    plans,
    purchaseMutation,
    router,
    storePurchasesReady,
    purchasesApiKeyConfigured,
  ]);

  const handleRestore = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile app required',
        'Restore purchases in the Recovery Companion iOS or Android app, signed into the same App Store or Google Play account you used to subscribe.',
        [{ text: 'OK' }],
      );
      return;
    }
    if (!purchasesApiKeyConfigured || !storePurchasesReady) {
      Alert.alert(
        'Please wait',
        'The App Store or Google Play is still connecting. Try again in a moment.',
        [{ text: 'OK' }],
      );
      return;
    }
    restoreMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.restored) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Restored', 'Your premium access has been restored.', [
            { text: 'Great', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert(
            'No purchase found',
            'We could not find an active subscription for this account. If you subscribed on another device, use Restore after signing into the same store account.',
          );
        }
      },
      onError: () => {
        Alert.alert(
          'Restore failed',
          'Check your network connection and try again, or manage your subscription in the App Store / Google Play.',
        );
      },
    });
  }, [restoreMutation, router, storePurchasesReady, purchasesApiKeyConfigured]);

  const isRestoring = restoreMutation.isPending;

  if (isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            style={styles.restoreHeaderBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.restoreHeaderInner}>
              {isRestoring ? <ActivityIndicator size="small" color={Colors.textSecondary} /> : null}
              <Text style={styles.restorePurchasesText}>Restore purchases</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.alreadyPremium}>
          <View style={styles.premiumBadgeLarge}>
            <Crown size={40} color="#D4A574" />
          </View>
          <Text style={styles.alreadyTitle}>You're Premium</Text>
          <Text style={styles.alreadyDesc}>
            Premium features are available for as long as your subscription or purchase remains active with the store.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.secondaryOutlineBtn, pressed && { opacity: 0.85 }]}
            onPress={openManageSubscription}
          >
            <Text style={styles.secondaryOutlineBtnText}>
              Manage subscription in {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'store'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }, { marginTop: 12 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isPurchasing = purchaseMutation.isPending;
  const canStartCheckout =
    Platform.OS !== 'web' &&
    purchasesApiKeyConfigured &&
    storePurchasesReady &&
    plans.length > 0;
  const selectedPlanMeta = plans.find((p) => p.id === selectedPlan);
  const primaryCtaLabel =
    selectedPlanMeta?.billingType === 'lifetime' ? 'Purchase lifetime access' : 'Subscribe';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Pressable
          onPress={handleRestore}
          disabled={isRestoring}
          style={styles.restoreHeaderBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.restoreHeaderInner}>
            {isRestoring ? <ActivityIndicator size="small" color={Colors.textSecondary} /> : null}
            <Text style={styles.restorePurchasesText}>Restore purchases</Text>
          </View>
        </Pressable>
      </View>

      <ScreenScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroSection, { opacity: headerAnim, transform: [{ scale: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
          <Animated.View style={[styles.crownCircle, { transform: [{ scale: crownScale }] }]}>
            <Crown size={36} color="#D4A574" />
          </Animated.View>
          <Text style={styles.heroTitle}>Unlock Your Full{'\n'}Recovery Potential</Text>
          <Text style={styles.heroSubtitle}>
            Premium adds structured programs, optional charts from your own entries, and practice tools—for wellness and
            self-help only.
          </Text>
        </Animated.View>

        <View style={styles.plansSection}>
          {offeringsLoading ? (
            <View style={styles.loadingPlans}>
              <ActivityIndicator size="small" color="#D4A574" />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          ) : plans.length === 0 ? (
            <View style={styles.releaseBillingNotice}>
              <Text style={styles.releaseBillingNoticeTitle}>Subscriptions</Text>
              <Text style={styles.releaseBillingNoticeBody}>
                {Platform.OS === 'web'
                  ? 'Subscribe in the Recovery Companion iOS or Android app with your App Store or Google Play account.'
                  : 'We could not load subscription options right now. Check your internet connection, wait a moment, and open this screen again.'}
              </Text>
            </View>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.upgradeBtn,
            pressed && styles.upgradeBtnPressed,
            (isPurchasing || !canStartCheckout) && styles.upgradeBtnDisabled,
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing || !canStartCheckout}
          testID="upgrade-button"
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <>
              <Zap size={18} color={Colors.background} />
              <Text style={styles.upgradeBtnText}>{primaryCtaLabel}</Text>
            </>
          )}
        </Pressable>

        {Platform.OS === 'web' ? (
          <Text style={styles.subscriptionDisclosure}>
            Subscriptions are sold in the iOS and Android apps through Apple or Google Play. Prices, tax, and renewal dates
            are shown at checkout there.
          </Text>
        ) : (
          <Text style={styles.subscriptionDisclosure}>{storeAutoRenewalSummary()}</Text>
        )}

        <Pressable onPress={openManageSubscription} style={({ pressed }) => [styles.manageLinkWrap, pressed && { opacity: 0.75 }]}>
          <Text style={styles.manageLinkText}>
            {Platform.OS === 'ios'
              ? 'Manage or cancel in App Store subscriptions'
              : Platform.OS === 'android'
                ? 'Manage or cancel in Google Play subscriptions'
                : 'Manage subscription in the app store'}
          </Text>
        </Pressable>

        <View style={styles.legalLinksRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/terms-of-service' as never);
            }}
            hitSlop={6}
          >
            <Text style={styles.legalLink}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.legalSep}>·</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/privacy-policy' as never);
            }}
            hitSlop={6}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>

        <View style={styles.freeSection}>
          <View style={styles.freeLabelRow}>
            <Sparkles size={14} color={Colors.primary} />
            <Text style={styles.freeSectionTitle}>{FREEMIUM_SECTION_TITLE}</Text>
          </View>
          {getFreemiumHighlights().map((feat, i) => (
            <View key={i} style={styles.freeItem}>
              <Check size={14} color={Colors.primary} strokeWidth={3} />
              <Text style={styles.freeItemText}>{feat}</Text>
            </View>
          ))}
        </View>

        <View style={styles.premiumSection}>
          <View style={styles.premiumLabelRow}>
            <Crown size={14} color="#D4A574" />
            <Text style={styles.premiumSectionTitle}>Premium Features</Text>
          </View>
          {getPremiumFeatureMarketingCards().map((item, index) => (
            <FeatureItem key={index} item={item} index={index} />
          ))}
        </View>

        <Text style={styles.disclaimer}>
          {WELLNESS_APP_DISCLAIMER} If Premium ends, your on-device progress and journal entries stay on this device unless
          you delete them.
        </Text>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 24,
  },
  crownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,165,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  plansSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  releaseBillingNotice: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  releaseBillingNoticeTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  releaseBillingNoticeBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  loadingPlans: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#D4A574',
    backgroundColor: 'rgba(212,165,116,0.06)',
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#D4A574',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  planLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
    minWidth: 0,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    borderColor: '#D4A574',
  },
  planRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4A574',
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(150,150,150,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconWrapSelected: {
    backgroundColor: 'rgba(212,165,116,0.12)',
  },
  planLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planLabelSelected: {
    color: '#D4A574',
  },
  planSavings: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#2EC4B6',
    marginTop: 1,
  },
  planRight: {
    alignItems: 'flex-end',
    maxWidth: '52%',
  },
  planBillingDetail: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 5,
    textAlign: 'right',
    lineHeight: 14,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  planPriceSelected: {
    color: '#D4A574',
  },
  planPeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A574',
    borderRadius: 16,
    paddingVertical: 17,
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  upgradeBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  upgradeBtnDisabled: {
    opacity: 0.6,
  },
  upgradeBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  restoreHeaderBtn: {
    maxWidth: '56%',
  },
  restoreHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  restorePurchasesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    flexShrink: 1,
    textAlign: 'right',
  },
  subscriptionDisclosure: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  manageLinkWrap: {
    alignSelf: 'center',
    marginBottom: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    gap: 4,
  },
  legalSep: {
    color: Colors.textMuted,
    fontSize: 13,
    marginHorizontal: 4,
  },
  legalLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  freeSection: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(46,196,182,0.06)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.15)',
  },
  freeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  freeSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  freeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  freeItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  premiumSection: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  premiumLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  premiumSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#D4A574',
    letterSpacing: 0.5,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginHorizontal: 32,
    marginBottom: 20,
  },
  alreadyPremium: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  premiumBadgeLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(212,165,116,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(212,165,116,0.3)',
  },
  alreadyTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#D4A574',
    marginBottom: 10,
  },
  alreadyDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  backButton: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  secondaryOutlineBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  secondaryOutlineBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
