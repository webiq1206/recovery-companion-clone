import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  CreditCard,
  Check,
  ArrowUpCircle,
  Receipt,
  Calendar,
  Users,
  ChevronRight,
  CircleDollarSign,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRequireProviderMode } from '@/hooks/useRequireProviderMode';
import { useEnterprise } from '@/providers/EnterpriseProvider';
import { TIER_LABELS, TIER_PRICING } from '@/constants/enterprise';
import { OrgTier } from '@/types';

const TIER_FEATURES: Record<OrgTier, string[]> = {
  starter: ['Up to 5 seats', 'Basic dashboards', 'Email reports', 'Standard support'],
  professional: ['Up to 25 seats', 'Engagement heatmaps', 'Compliance summaries', 'Exportable reports', 'Alert thresholds', 'Priority support'],
  enterprise: ['Up to 100 seats', 'Everything in Professional', 'White-label branding', 'Custom domain', 'RBAC enforcement', 'API access', 'Dedicated support', 'Data isolation'],
};

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EnterpriseBilling() {
  const canAccess = useRequireProviderMode();
  const { billing, organization, updateOrganization } = useEnterprise();
  const [showPlans, setShowPlans] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const handleUpgrade = useCallback((tier: OrgTier) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const pricing = TIER_PRICING[tier];
    updateOrganization({
      tier,
      maxSeats: pricing.seats,
      isWhiteLabel: tier === 'enterprise',
    });
    setShowPlans(false);
    Alert.alert('Plan Updated', `Your organization has been upgraded to the ${TIER_LABELS[tier]} plan.`);
  }, [updateOrganization]);

  const monthlyTotal = billing.basePrice + (organization.usedSeats * billing.pricePerSeat);

  const statusColors: Record<string, string> = {
    active: Colors.success,
    past_due: Colors.danger,
    cancelled: Colors.textMuted,
    trialing: Colors.accentWarm,
  };

  if (!canAccess) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Billing', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScreenScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.currentPlan}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planLabel}>Current Plan</Text>
                <Text style={styles.planName}>{TIER_LABELS[billing.tier]}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColors[billing.status]}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[billing.status] }]} />
                <Text style={[styles.statusText, { color: statusColors[billing.status] }]}>
                  {billing.status.charAt(0).toUpperCase() + billing.status.slice(1).replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.planPricing}>
              <Text style={styles.priceAmount}>{formatCurrency(monthlyTotal)}</Text>
              <Text style={styles.pricePeriod}>/{billing.cycle === 'annual' ? 'mo (billed annually)' : 'month'}</Text>
            </View>

            <View style={styles.planDetails}>
              <View style={styles.planDetail}>
                <Users size={14} color={Colors.textSecondary} />
                <Text style={styles.planDetailText}>{organization.usedSeats}/{billing.seatsIncluded} seats</Text>
              </View>
              <View style={styles.planDetail}>
                <Calendar size={14} color={Colors.textSecondary} />
                <Text style={styles.planDetailText}>Renews {formatDate(billing.nextBillingDate)}</Text>
              </View>
              <View style={styles.planDetail}>
                <CreditCard size={14} color={Colors.textSecondary} />
                <Text style={styles.planDetailText}>{billing.paymentMethod}</Text>
              </View>
            </View>

            {billing.tier !== 'enterprise' && (
              <Pressable style={styles.upgradeBtn} onPress={() => setShowPlans(!showPlans)} testID="toggle-plans">
                <ArrowUpCircle size={16} color="#fff" />
                <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
              </Pressable>
            )}
          </View>

          {showPlans && (
            <View style={styles.plansSection}>
              <Text style={styles.sectionTitle}>Available Plans</Text>
              {(Object.keys(TIER_PRICING) as OrgTier[]).map(tier => {
                const pricing = TIER_PRICING[tier];
                const isCurrent = tier === billing.tier;
                const isUpgrade = ['starter', 'professional', 'enterprise'].indexOf(tier) > ['starter', 'professional', 'enterprise'].indexOf(billing.tier);

                return (
                  <View key={tier} style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
                    <View style={styles.planCardHeader}>
                      <View>
                        <Text style={styles.planCardName}>{TIER_LABELS[tier]}</Text>
                        <View style={styles.planCardPriceRow}>
                          <Text style={styles.planCardPrice}>{formatCurrency(pricing.annual)}</Text>
                          <Text style={styles.planCardPriceSub}>/mo billed annually</Text>
                        </View>
                      </View>
                      {isCurrent ? (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      ) : isUpgrade ? (
                        <Pressable style={styles.selectBtn} onPress={() => handleUpgrade(tier)} testID={`select-${tier}`}>
                          <Text style={styles.selectBtnText}>Select</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.featureList}>
                      {TIER_FEATURES[tier].map((feature, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <Check size={13} color={Colors.primary} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing Breakdown</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base plan ({TIER_LABELS[billing.tier]})</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(billing.basePrice)}/mo</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Additional seats ({organization.usedSeats} × {formatCurrency(billing.pricePerSeat)})</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(organization.usedSeats * billing.pricePerSeat)}/mo</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.breakdownTotalValue}>{formatCurrency(monthlyTotal)}/mo</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            {billing.invoices.map(invoice => (
              <View key={invoice.id} style={styles.invoiceRow}>
                <View style={styles.invoiceIcon}>
                  <Receipt size={16} color={Colors.textSecondary} />
                </View>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceDesc}>{invoice.description}</Text>
                  <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
                  <View style={[styles.invoiceStatus, {
                    backgroundColor: invoice.status === 'paid' ? 'rgba(76,175,80,0.12)' :
                      invoice.status === 'pending' ? 'rgba(255,179,71,0.12)' : 'rgba(239,83,80,0.12)'
                  }]}>
                    <Text style={[styles.invoiceStatusText, {
                      color: invoice.status === 'paid' ? Colors.success :
                        invoice.status === 'pending' ? Colors.accentWarm : Colors.danger
                    }]}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  currentPlan: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 182, 0.2)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  planName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  planDetails: {
    gap: 10,
    marginBottom: 16,
  },
  planDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planCardCurrent: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46, 196, 182, 0.05)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planCardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  planCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  planCardPriceSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 3,
  },
  currentBadge: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  selectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  breakdownCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  breakdownLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  breakdownTotal: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  invoiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceDesc: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  invoiceDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  invoiceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invoiceStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
});
