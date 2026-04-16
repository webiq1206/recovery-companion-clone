import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  BarChart3,
  Sparkles,
  MessageCircle,
  Bell,
  BellOff,
  Lock,
  ChevronRight,
  Building2,
  Scale,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Gauge,
  Crown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useUser } from '../core/domains/useUser';
import { useAppMeta } from '../core/domains/useAppMeta';
import { useEngagement } from '../providers/EngagementProvider';
import { useSubscription } from '../providers/SubscriptionProvider';
import { useNotifications } from '../providers/NotificationProvider';
import { useProviderMode } from '../providers/ProviderModeProvider';
import type { PrivacyControls, NotificationIntensityLevel } from '../types';
import {
  NOTIFICATION_INTENSITY_CONFIG,
  type NotificationIntensity,
} from '../constants/notifications';

const ANONYMOUS_NAMES = [
  'Quiet Phoenix',
  'Mountain Ember',
  'Steady River',
  'Calm Harbor',
  'Gentle Flame',
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, updateProfile } = useUser();
  const { resetAllData } = useAppMeta();
  const { notificationPreferences, updateNotificationPrefs } = useEngagement();
  const {
    isPremium,
    restoreMutation,
    activatePremiumMutation,
    canUseDevLocalPremium,
  } = useSubscription();
  const {
    intensity,
    setIntensity,
    isPaused,
    todayNotificationCount,
    effectiveMaxPerDay,
    frequencyMultiplier,
    pauseNotifications,
    resumeNotifications,
    isPermissionGranted,
    promptForNotificationPermission,
  } = useNotifications();
  const { providerModeEnabled } = useProviderMode();

  const privacyControls = profile.privacyControls ?? {
    isAnonymous: false,
    shareProgress: false,
    shareMood: false,
    allowCommunityMessages: false,
  };

  const anonymousName = useMemo(() => {
    const hash = (profile.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return ANONYMOUS_NAMES[hash % ANONYMOUS_NAMES.length];
  }, [profile.name]);

  const handleTogglePrivacy = useCallback(
    (key: keyof PrivacyControls) => {
      Haptics.selectionAsync();
      const current = privacyControls[key];
      updateProfile({
        privacyControls: { ...privacyControls, [key]: !current },
      });
    },
    [privacyControls, updateProfile],
  );

  const handleDeleteAllDataOnDevice = useCallback(() => {
    Alert.alert(
      'Delete all data on this device?',
      'Recovery Companion keeps your recovery data on this device. There is no separate cloud login to delete—this removes everything stored in the app on this phone or tablet.\n\nRemoved: profile & check-ins, journal, pledges, contacts, practice community & room data, subscription status cache, reminders, and security settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete everything?',
              'You will need to set up the app again from the beginning.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete all data',
                  style: 'destructive',
                  onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    await resetAllData();
                    queryClient.clear();
                    router.replace('/onboarding' as any);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [resetAllData, queryClient, router]);

  const handleRestorePurchases = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restoreMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.restored) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Restored', 'Your premium access has been restored.');
        } else if (canUseDevLocalPremium) {
          activatePremiumMutation.mutate(undefined, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Premium Activated (dev)', 'Local bypass only — not used in store builds.');
            },
            onError: () => {
              Alert.alert('No Purchase Found', 'We couldn\'t find a previous purchase to restore.');
            },
          });
        } else {
          Alert.alert(
            'No purchase found',
            'We could not find an active subscription for this device’s store account.',
          );
        }
      },
      onError: () => {
        if (canUseDevLocalPremium) {
          activatePremiumMutation.mutate(undefined, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Premium Activated (dev)', 'Local bypass only — not used in store builds.');
            },
            onError: () => {
              Alert.alert('Error', 'Unable to restore purchases. Please try again.');
            },
          });
        } else {
          Alert.alert(
            'Restore failed',
            'Check your connection and try again, or manage your subscription in the App Store / Google Play.',
          );
        }
      },
    });
  }, [restoreMutation, activatePremiumMutation, canUseDevLocalPremium]);

  const openManageSubscription = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      Alert.alert(
        'Manage subscription',
        'Use the App Store or Google Play on your phone to manage your subscription.',
      );
    }
  }, []);

  return (
    <View style={styles.wrapper}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription */}
        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        {isPremium ? (
          <View style={styles.premiumActiveCard} testID="settings-premium-active">
            <View style={styles.premiumActiveRow}>
              <Crown size={20} color="#D4A574" />
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumActiveTitle}>Premium active</Text>
                <Text style={styles.premiumActiveSubtitle}>
                  Full access to insights, programs, practice tools & more
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        <View style={styles.groupCard}>
          <Pressable
            style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/subscription-plans' as any);
            }}
            testID="settings-plans-benefits"
          >
            <View style={styles.settingLeft}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Plans & benefits</Text>
                <Text style={styles.settingValue}>
                  See Freemium vs Premium side by side
                </Text>
              </View>
            </View>
            {isPremium ? (
              <View style={styles.plansBenefitsPlansPill} testID="settings-premium-plans-link">
                <Text style={styles.plansBenefitsPlansPillText}>Plans</Text>
              </View>
            ) : (
              <ChevronRight size={16} color={Colors.textMuted} />
            )}
          </Pressable>

          {!isPremium ? (
            <>
              <View style={styles.groupSeparator} />
              <Pressable
                style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/premium-upgrade' as any);
                }}
                testID="settings-upgrade"
              >
                <View style={styles.settingLeft}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Upgrade to Premium</Text>
                    <Text style={styles.settingValue}>Pricing & subscribe</Text>
                  </View>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
              </Pressable>
            </>
          ) : null}

          <View style={styles.groupSeparator} />
          <Pressable
            style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
            onPress={openManageSubscription}
          >
            <View style={styles.settingLeft}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Manage in store</Text>
                <Text style={styles.settingValue}>
                  {Platform.OS === 'ios'
                    ? 'App Store subscriptions'
                    : Platform.OS === 'android'
                      ? 'Google Play subscriptions'
                      : 'Subscription management'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.groupSeparator} />
          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { opacity: 0.85 },
              restoreMutation.isPending && { opacity: 0.6 },
            ]}
            onPress={handleRestorePurchases}
            disabled={restoreMutation.isPending}
            testID="settings-restore"
          >
            <View style={styles.settingLeft}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Restore purchases</Text>
                <Text style={styles.settingValue}>
                  If you subscribed on another device
                </Text>
              </View>
            </View>
            {restoreMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            ) : (
              <ChevronRight size={16} color={Colors.textMuted} />
            )}
          </Pressable>
        </View>

        {/* Privacy & Identity */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>PRIVACY & IDENTITY</Text>
        <View style={styles.groupCard}>
          <View style={styles.groupRow}>
            <View style={styles.groupRowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: privacyControls.isAnonymous
                      ? 'rgba(46,196,182,0.12)'
                      : 'rgba(90,106,122,0.12)',
                  },
                ]}
              >
                {privacyControls.isAnonymous ? (
                  <EyeOff size={17} color={Colors.primary} />
                ) : (
                  <Eye size={17} color={Colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Anonymous Mode</Text>
                <Text style={styles.settingValue}>
                  {privacyControls.isAnonymous
                    ? `Shown as "${anonymousName}"`
                    : 'Your real name is visible'}
                </Text>
              </View>
            </View>
            <Switch
              value={privacyControls.isAnonymous}
              onValueChange={() => handleTogglePrivacy('isAnonymous')}
              trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
              thumbColor={
                privacyControls.isAnonymous ? Colors.primary : Colors.textMuted
              }
            />
          </View>

          <View style={styles.groupSeparator} />

          <View style={styles.groupRow}>
            <View style={styles.groupRowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(66,165,245,0.12)' },
                ]}
              >
                <BarChart3 size={17} color="#42A5F5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Share Progress</Text>
                <Text style={styles.settingValue}>
                  Let community see your milestones
                </Text>
              </View>
            </View>
            <Switch
              value={privacyControls.shareProgress}
              onValueChange={() => handleTogglePrivacy('shareProgress')}
              trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
              thumbColor={
                privacyControls.shareProgress ? Colors.primary : Colors.textMuted
              }
            />
          </View>

          <View style={styles.groupSeparator} />

          <View style={styles.groupRow}>
            <View style={styles.groupRowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(255,152,0,0.12)' },
                ]}
              >
                <Sparkles size={17} color="#FF9800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Share Mood</Text>
                <Text style={styles.settingValue}>
                  Show emotional state to peers
                </Text>
              </View>
            </View>
            <Switch
              value={privacyControls.shareMood}
              onValueChange={() => handleTogglePrivacy('shareMood')}
              trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
              thumbColor={
                privacyControls.shareMood ? Colors.primary : Colors.textMuted
              }
            />
          </View>

          <View style={styles.groupSeparator} />

          <View style={styles.groupRow}>
            <View style={styles.groupRowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(156,39,176,0.12)' },
                ]}
              >
                <MessageCircle size={17} color="#9C27B0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Community Messages</Text>
                <Text style={styles.settingValue}>
                  Allow peers to message you
                </Text>
              </View>
            </View>
            <Switch
              value={privacyControls.allowCommunityMessages}
              onValueChange={() =>
                handleTogglePrivacy('allowCommunityMessages')
              }
              trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
              thumbColor={
                privacyControls.allowCommunityMessages
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
          </View>
        </View>

        {/* Security */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>SECURITY</Text>
        <Pressable
          style={({ pressed }) => [
            styles.settingRow,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/security-settings' as any);
          }}
          testID="security-settings-link"
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: 'rgba(46,196,182,0.12)' },
              ]}
            >
              <Lock size={17} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Security & Privacy</Text>
              <Text style={styles.settingValue}>
                PIN, biometrics, encryption, audit log
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
          NOTIFICATIONS
        </Text>
        <View style={styles.groupCard}>
          <View style={styles.groupRow}>
            <View style={styles.groupRowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(46,196,182,0.12)' },
                ]}
              >
                {notificationPreferences?.enabled ? (
                  <Bell size={17} color={Colors.primary} />
                ) : (
                  <BellOff size={17} color={Colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>
                  Notifications{' '}
                  {notificationPreferences?.enabled ? 'On' : 'Off'}
                </Text>
                <Text style={styles.settingValue}>
                  Daily reminders and check-in prompts
                </Text>
              </View>
            </View>
            <Switch
              value={notificationPreferences?.enabled ?? false}
              onValueChange={async (val) => {
                Haptics.selectionAsync();
                if (val && Platform.OS !== 'web') {
                  const ok = await promptForNotificationPermission();
                  if (!ok) {
                    Alert.alert(
                      'Notifications not enabled',
                      'Reminders need notification permission. You can allow them in system Settings when you are ready.',
                      [{ text: 'OK' }],
                    );
                    return;
                  }
                }
                updateNotificationPrefs({ enabled: val });
              }}
              trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
              thumbColor={
                notificationPreferences?.enabled
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
          </View>

          {notificationPreferences?.enabled && (
            <>
              <View style={styles.groupSeparator} />
              <View style={styles.groupRow}>
                <View style={styles.groupRowLeft}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Morning Check-In</Text>
                  </View>
                </View>
                <Switch
                  value={notificationPreferences?.morningCheckin ?? false}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    updateNotificationPrefs({ morningCheckin: val });
                  }}
                  trackColor={{
                    false: Colors.surface,
                    true: Colors.primary + '40',
                  }}
                  thumbColor={
                    notificationPreferences?.morningCheckin
                      ? Colors.primary
                      : Colors.textMuted
                  }
                />
              </View>
              <View style={styles.groupSeparator} />
              <View style={styles.groupRow}>
                <View style={styles.groupRowLeft}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Evening Reflection</Text>
                  </View>
                </View>
                <Switch
                  value={notificationPreferences?.eveningReflection ?? false}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    updateNotificationPrefs({ eveningReflection: val });
                  }}
                  trackColor={{
                    false: Colors.surface,
                    true: Colors.primary + '40',
                  }}
                  thumbColor={
                    notificationPreferences?.eveningReflection
                      ? Colors.primary
                      : Colors.textMuted
                  }
                />
              </View>
              <View style={styles.groupSeparator} />
              <View style={styles.groupRow}>
                <View style={styles.groupRowLeft}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Risk-Based Alerts</Text>
                  </View>
                </View>
                <Switch
                  value={notificationPreferences?.riskBasedAlerts ?? false}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    updateNotificationPrefs({ riskBasedAlerts: val });
                  }}
                  trackColor={{
                    false: Colors.surface,
                    true: Colors.primary + '40',
                  }}
                  thumbColor={
                    notificationPreferences?.riskBasedAlerts
                      ? Colors.primary
                      : Colors.textMuted
                  }
                />
              </View>
              <View style={styles.groupSeparator} />
              <View style={styles.groupRow}>
                <View style={styles.groupRowLeft}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>
                      Milestone Reminders
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notificationPreferences?.milestoneReminders ?? false}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    updateNotificationPrefs({ milestoneReminders: val });
                  }}
                  trackColor={{
                    false: Colors.surface,
                    true: Colors.primary + '40',
                  }}
                  thumbColor={
                    notificationPreferences?.milestoneReminders
                      ? Colors.primary
                      : Colors.textMuted
                  }
                />
              </View>
            </>
          )}
        </View>

        {/* Notification Intensity */}
        {notificationPreferences?.enabled && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              NOTIFICATION INTENSITY
            </Text>
            <View style={styles.intensityContainer}>
              {(
                Object.keys(
                  NOTIFICATION_INTENSITY_CONFIG,
                ) as NotificationIntensity[]
              ).map((level) => {
                const config = NOTIFICATION_INTENSITY_CONFIG[level];
                const isActive = intensity === level;
                return (
                  <Pressable
                    key={level}
                    style={[
                      styles.intensityOption,
                      isActive && styles.intensityOptionActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIntensity(level as NotificationIntensityLevel);
                    }}
                  >
                    <Text
                      style={[
                        styles.intensityLabel,
                        isActive && styles.intensityLabelActive,
                      ]}
                    >
                      {config.label}
                    </Text>
                    <Text style={styles.intensityDesc}>
                      {config.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.frequencyRow}>
              <Gauge size={14} color={Colors.textMuted} />
              <Text style={styles.frequencyText}>
                Today: {todayNotificationCount}/{effectiveMaxPerDay}{' '}
                notifications
              </Text>
            </View>

            {!isPermissionGranted && (
              <Pressable
                style={({ pressed }) => [
                  styles.frequencyRow,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={async () => {
                  Haptics.selectionAsync();
                  if (Platform.OS === 'web') return;
                  const ok = await promptForNotificationPermission();
                  if (!ok) {
                    Alert.alert(
                      'Still blocked',
                      'Open system Settings for this app and turn on notifications.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
                      ],
                    );
                  }
                }}
              >
                <Text
                  style={[styles.frequencyText, { color: Colors.danger }]}
                >
                  Notification permission not granted — tap to request
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                if (isPaused) {
                  resumeNotifications();
                } else {
                  pauseNotifications(4);
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: 'rgba(90,106,122,0.12)' },
                  ]}
                >
                  {isPaused ? (
                    <PlayCircle size={17} color={Colors.primary} />
                  ) : (
                    <PauseCircle size={17} color={Colors.textMuted} />
                  )}
                </View>
                <View>
                  <Text style={styles.settingLabel}>
                    {isPaused
                      ? 'Resume Notifications'
                      : 'Pause for 4 Hours'}
                  </Text>
                  <Text style={styles.settingValue}>
                    {isPaused
                      ? 'Notifications are currently paused'
                      : 'Take a break from reminders'}
                  </Text>
                </View>
              </View>
            </Pressable>
          </>
        )}

        {providerModeEnabled && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
              PROFESSIONAL TOOLS
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/provider-portal' as any);
              }}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: 'rgba(90,106,122,0.12)' },
                  ]}
                >
                  <Building2 size={17} color={Colors.textSecondary} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Provider Portal</Text>
                  <Text style={styles.settingValue}>
                    Provider tools and shared progress (with consent)
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/compliance-mode' as any);
              }}
              testID="compliance-mode-link"
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: 'rgba(90,106,122,0.12)' },
                  ]}
                >
                  <Scale size={17} color={Colors.textSecondary} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Compliance Mode</Text>
                  <Text style={styles.settingValue}>
                    Optional structured accountability tools
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/enterprise-dashboard' as any);
              }}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: 'rgba(90,106,122,0.12)' },
                  ]}
                >
                  <Building2 size={17} color={Colors.textSecondary} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Enterprise Dashboard</Text>
                  <Text style={styles.settingValue}>
                    Analytics, reports, billing & white label
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>ACCOUNT</Text>
        <Pressable
          style={styles.dangerRow}
          onPress={handleDeleteAllDataOnDevice}
          testID="settings-delete-all-data-on-device"
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: 'rgba(239,83,80,0.12)' },
              ]}
            >
              <RotateCcw size={17} color={Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: Colors.danger }]}>
                Delete all data on this device
              </Text>
              <Text style={styles.settingValue}>
                Remove every trace of this app from this device (no separate cloud account)
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  groupRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  groupSeparator: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginLeft: 48,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  settingValue: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger + '08',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.danger + '20',
    marginBottom: 8,
  },
  intensityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  intensityOption: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  intensityOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  intensityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  intensityLabelActive: {
    color: Colors.primary,
  },
  intensityDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  frequencyText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  premiumActiveCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  premiumActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  premiumActiveSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  plansBenefitsPlansPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  plansBenefitsPlansPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
