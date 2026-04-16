import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  ActivityIndicator,
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
  FREEMIUM_HIGHLIGHTS,
  FREEMIUM_SECTION_TITLE,
  PREMIUM_FEATURE_CARDS,
} from '../constants/subscriptionPlans';
import { useSubscription } from '../providers/SubscriptionProvider';

interface PlanOption {
  id: string;
  identifier: string;
  label: string;
  price: string;
  period: string;
  badge?: string;
  icon: typeof Clock;
  productId: string;
  savings?: string;
}

const FALLBACK_PLANS: PlanOption[] = [
  {
    id: 'monthly',
    identifier: '$rc_monthly',
    label: 'Monthly',
    price: '$9.99',
    period: '/month',
    icon: Clock,
    productId: 'monthly',
  },
  {
    id: 'yearly',
    identifier: '$rc_annual',
    label: 'Yearly',
    price: '$29.99',
    period: '/year',
    badge: 'Best Value',
    icon: Star,
    productId: 'yearly',
    savings: 'Save 75%',
  },
  {
    id: 'lifetime',
    identifier: '$rc_lifetime',
    label: 'Lifetime',
    price: '$79.99',
    period: 'one-time',
    icon: InfinityIcon,
    productId: 'lifetime',
  },
];

const FeatureItem = React.memo(({ item, index }: { item: (typeof PREMIUM_FEATURE_CARDS)[number]; index: number }) => {
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
    activatePremiumMutation,
    canUseDevLocalPremium,
  } = useSubscription();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const crownAnim = useRef(new Animated.Value(0)).current;
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');

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
    if (!offerings || offerings.length === 0) return FALLBACK_PLANS;

    const currentOffering = offerings[0];
    if (!currentOffering?.packages || currentOffering.packages.length === 0) return FALLBACK_PLANS;

    return currentOffering.packages.map((pkg) => {
      const isMonthly = pkg.identifier === '$rc_monthly';
      const isYearly = pkg.identifier === '$rc_annual';
      const isLifetime = pkg.identifier === '$rc_lifetime';

      let label = pkg.product.title || pkg.identifier;
      let icon: typeof Clock = Clock;
      let badge: string | undefined;
      let savings: string | undefined;
      let period = '';
      let price = pkg.product.priceString || `$${pkg.product.price}`;
      let id = 'monthly';

      if (isMonthly) {
        label = 'Monthly';
        icon = Clock;
        period = '/month';
        id = 'monthly';
        if (!price || price === '$0') price = '$9.99';
      } else if (isYearly) {
        label = 'Yearly';
        icon = Star;
        badge = 'Best Value';
        savings = 'Save 75%';
        period = '/year';
        id = 'yearly';
        if (!price || price === '$0') price = '$29.99';
      } else if (isLifetime) {
        label = 'Lifetime';
        icon = InfinityIcon;
        period = 'one-time';
        id = 'lifetime';
        if (!price || price === '$0') price = '$79.99';
      }

      return {
        id,
        identifier: pkg.identifier,
        label,
        price,
        period,
        badge,
        icon,
        productId: pkg.product.identifier,
        savings,
      };
    });
  }, [offerings]);

  const handlePurchase = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    Alert.alert(
      `Subscribe to ${plan.label}`,
      `${plan.price} ${plan.period}\n\nThis will unlock all premium features.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () => {
            purchaseMutation.mutate(plan.productId, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Welcome to Premium',
                  'All features are now unlocked. Your recovery journey just got more powerful.',
                  [{ text: 'Continue', onPress: () => router.back() }]
                );
              },
              onError: (error) => {
                console.log('Purchase via RC failed:', error);
                if (canUseDevLocalPremium) {
                  activatePremiumMutation.mutate(undefined, {
                    onSuccess: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert(
                        'Premium Activated (dev)',
                        'Local bypass only — not used in store builds.',
                        [{ text: 'Continue', onPress: () => router.back() }],
                      );
                    },
                    onError: () => {
                      Alert.alert('Error', 'Unable to activate premium. Please try again.');
                    },
                  });
                } else {
                  Alert.alert(
                    'Purchase unavailable',
                    'We could not verify this purchase. Check your connection, confirm App Store / Play billing is set up, then try again or tap Restore.',
                  );
                }
              },
            });
          },
        },
      ]
    );
  }, [selectedPlan, plans, purchaseMutation, activatePremiumMutation, router, canUseDevLocalPremium]);

  const handleRestore = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restoreMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.restored) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Restored', 'Your premium access has been restored.', [
            { text: 'Great', onPress: () => router.back() },
          ]);
        } else if (canUseDevLocalPremium) {
          activatePremiumMutation.mutate(undefined, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Premium Activated (dev)', 'Local bypass only — not used in store builds.', [
                { text: 'Great', onPress: () => router.back() },
              ]);
            },
            onError: () => {
              Alert.alert('No Purchase Found', 'We couldn\'t find a previous purchase to restore.');
            },
          });
        } else {
          Alert.alert(
            'No purchase found',
            'We could not find an active subscription for this account. If you subscribed on another device, use Restore after signing into the same store account.',
          );
        }
      },
      onError: () => {
        if (canUseDevLocalPremium) {
          activatePremiumMutation.mutate(undefined, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Premium Activated (dev)', 'Local bypass only — not used in store builds.', [
                { text: 'Great', onPress: () => router.back() },
              ]);
            },
            onError: () => {
              Alert.alert('Error', 'Unable to restore purchases. Please try again.');
            },
          });
        } else {
          Alert.alert(
            'Restore failed',
            'Check your network connection and try again, or manage your subscription in the App Store / Google Play.',
          );
        }
      },
    });
  }, [restoreMutation, activatePremiumMutation, router, canUseDevLocalPremium]);

  if (isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
        </View>
        <View style={styles.alreadyPremium}>
          <View style={styles.premiumBadgeLarge}>
            <Crown size={40} color="#D4A574" />
          </View>
          <Text style={styles.alreadyTitle}>You're Premium</Text>
          <Text style={styles.alreadyDesc}>
            All features are unlocked. Thank you for supporting your recovery journey.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isPurchasing = purchaseMutation.isPending || activatePremiumMutation.isPending;
  const isRestoring = restoreMutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Pressable onPress={handleRestore} disabled={isRestoring}>
          {isRestoring ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>Restore</Text>
          )}
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
            Premium tools designed to deepen your healing, predict challenges, and build the life you deserve.
          </Text>
        </Animated.View>

        <View style={styles.plansSection}>
          {offeringsLoading ? (
            <View style={styles.loadingPlans}>
              <ActivityIndicator size="small" color="#D4A574" />
              <Text style={styles.loadingText}>Loading plans...</Text>
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
            isPurchasing && styles.upgradeBtnDisabled,
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing}
          testID="upgrade-button"
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <>
              <Zap size={18} color={Colors.background} />
              <Text style={styles.upgradeBtnText}>Start Premium</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.termsText}>
          Cancel anytime. Your recovery data is always yours.
        </Text>

        <View style={styles.freeSection}>
          <View style={styles.freeLabelRow}>
            <Sparkles size={14} color={Colors.primary} />
            <Text style={styles.freeSectionTitle}>{FREEMIUM_SECTION_TITLE}</Text>
          </View>
          {FREEMIUM_HIGHLIGHTS.map((feat, i) => (
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
          {PREMIUM_FEATURE_CARDS.map((item, index) => (
            <FeatureItem key={index} item={item} index={index} />
          ))}
        </View>

        <Text style={styles.disclaimer}>
          Downgrading preserves all your progress and journal entries. Payment will be charged at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
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
  restoreText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginBottom: 8,
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
  termsText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    marginHorizontal: 20,
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
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
