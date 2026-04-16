import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useRouter } from 'expo-router';
import { Check, X, Crown, Sparkles, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { TIER_COMPARISON_ROWS } from '../constants/subscriptionPlans';
import { useSubscription } from '../providers/SubscriptionProvider';

function openSubscriptionManagement() {
  if (Platform.OS === 'ios') {
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  } else if (Platform.OS === 'android') {
    Linking.openURL('https://play.google.com/store/account/subscriptions');
  } else {
    Alert.alert(
      'Manage subscription',
      'Open the App Store or Google Play on your phone to manage or cancel your subscription.',
    );
  }
}

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const {
    isPremium,
    restoreMutation,
    activatePremiumMutation,
    canUseDevLocalPremium,
  } = useSubscription();

  const isRestoring = restoreMutation.isPending;

  const handleRestore = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restoreMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.restored) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Restored', 'Your premium access has been restored.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else if (canUseDevLocalPremium) {
          activatePremiumMutation.mutate(undefined, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Premium Activated (dev)', 'Local bypass only — not used in store builds.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            },
            onError: () => {
              Alert.alert('No Purchase Found', 'We couldn\'t find a previous purchase to restore.');
            },
          });
        } else {
          Alert.alert(
            'No purchase found',
            'We could not find an active subscription. Use the same App Store / Google Play account you purchased with.',
          );
        }
      },
      onError: () => {
        if (canUseDevLocalPremium) {
          activatePremiumMutation.mutate(undefined, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Premium Activated (dev)', 'Local bypass only — not used in store builds.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            },
            onError: () => {
              Alert.alert('Error', 'Unable to restore purchases. Please try again.');
            },
          });
        } else {
          Alert.alert(
            'Restore failed',
            'Check your connection and try again, or open subscription management in the store.',
          );
        }
      },
    });
  }, [restoreMutation, activatePremiumMutation, router, canUseDevLocalPremium]);

  const handleUpgrade = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/premium-upgrade' as never);
  }, [router]);

  return (
    <View style={styles.container}>
      <ScreenScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          <Text style={styles.leadStrong}>Freemium</Text>
          {' '}is our free tier with full core recovery tools.{' '}
          <Text style={styles.leadStrong}>Premium</Text>
          {' '}unlocks deeper insights, structured programs, practice group tools, and export options.
        </Text>

        {isPremium ? (
          <View style={styles.premiumBanner}>
            <Crown size={22} color="#D4A574" />
            <Text style={styles.premiumBannerText}>You have Premium — thank you for your support.</Text>
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.tableFeatureCol]}> </Text>
            <View style={styles.tableHeadMini}>
              <Sparkles size={14} color={Colors.primary} />
              <Text style={styles.tableHeadLabel}>Freemium</Text>
            </View>
            <View style={styles.tableHeadMini}>
              <Crown size={14} color="#D4A574" />
              <Text style={styles.tableHeadLabelPremium}>Premium</Text>
            </View>
          </View>

          {TIER_COMPARISON_ROWS.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <View style={styles.tableFeatureCol}>
                <Text style={styles.tableFeatureText}>{row.label}</Text>
                {row.footnote ? (
                  <Text style={styles.tableFootnote}>{row.footnote}</Text>
                ) : null}
              </View>
              <View style={styles.tableIconCell}>
                {row.freemium ? (
                  <Check size={18} color={Colors.primary} strokeWidth={2.5} />
                ) : (
                  <X size={18} color={Colors.textMuted} strokeWidth={2} />
                )}
              </View>
              <View style={styles.tableIconCell}>
                {row.premium ? (
                  <Check size={18} color="#D4A574" strokeWidth={2.5} />
                ) : (
                  <X size={18} color={Colors.textMuted} strokeWidth={2} />
                )}
              </View>
            </View>
          ))}
        </View>

        {!isPremium ? (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={handleUpgrade}
            testID="subscription-plans-upgrade"
          >
            <Zap size={18} color={Colors.background} />
            <Text style={styles.primaryBtnText}>Upgrade to Premium</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
            onPress={openSubscriptionManagement}
          >
            <Text style={styles.secondaryBtnText}>Manage subscription in {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Play Store' : 'store'}</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.8 }]}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>Restore purchases</Text>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          Prices and renewal terms are shown on the next screen. You can cancel anytime; your recovery data stays on your device.
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  leadStrong: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(212,165,116,0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.25)',
  },
  premiumBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  table: {
    width: '100%',
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  tableHeaderCell: {
    textAlign: 'left',
  },
  tableFeatureCol: {
    flex: 1,
    minWidth: 0,
  },
  tableHeadMini: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  tableHeadLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.primary,
    textTransform: 'uppercase' as const,
  },
  tableHeadLabelPremium: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#D4A574',
    textTransform: 'uppercase' as const,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tableFeatureText: {
    fontSize: 13,
    color: Colors.text,
    marginRight: 8,
  },
  tableFootnote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  tableIconCell: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A574',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
   paddingHorizontal: 12,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  footerNote: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
});
