import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';
import { getSupportEmail } from '../../core/supportContact';
import { formatDeleteAccountDetailsMessage } from '../../core/accountDeletionCopy';
import { useAppMeta } from '../../core/domains/useAppMeta';

/**
 * Settings → Account (delete account). Hidden via SHOW_SETTINGS_ACCOUNT_SECTION; keep this file when off.
 */
export function SettingsAccountSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resetAllData } = useAppMeta();
  const supportEmail = getSupportEmail();

  const executeFullLocalReset = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await resetAllData();
    queryClient.clear();
    router.replace('/onboarding' as any);
  }, [resetAllData, queryClient, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert('Delete account?', formatDeleteAccountDetailsMessage(), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete account permanently?',
            'You will set up the app again from the beginning.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete account',
                style: 'destructive',
                onPress: () => {
                  void executeFullLocalReset();
                },
              },
            ],
          );
        },
      },
    ]);
  }, [executeFullLocalReset]);

  const openAccountDeletionSupportEmail = useCallback(() => {
    const addr = supportEmail || 'support@recoveryroad.app';
    void Haptics.selectionAsync();
    void Linking.openURL(
      `mailto:${addr}?subject=${encodeURIComponent('RecoveryRoad — account data deletion request')}`,
    );
  }, [supportEmail]);

  return (
    <>
      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>ACCOUNT</Text>
      <View style={styles.deleteAccountBlock}>
        <Pressable
          style={({ pressed }) => [styles.deleteAccountTitlePress, pressed && { opacity: 0.85 }]}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          testID="settings-delete-account"
        >
          <View style={styles.settingLeft}>
            <View
              style={[styles.settingIcon, { backgroundColor: 'rgba(239,83,80,0.12)' }]}
            >
              <Trash2 size={17} color={Colors.danger} />
            </View>
            <Text style={[styles.settingLabel, { color: Colors.danger, flex: 1 }]}>
              Delete account
            </Text>
          </View>
        </Pressable>
        <Text style={styles.deleteAccountDescription}>
          If you also need operator-held social data removed beyond what this device stores, email{' '}
          <Text
            style={styles.deleteAccountEmailLink}
            accessibilityRole="link"
            accessibilityLabel={`Email ${supportEmail || 'support@recoveryroad.app'}`}
            onPress={openAccountDeletionSupportEmail}
          >
            {supportEmail || 'support@recoveryroad.app'}
          </Text>{' '}
          with your request.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteAccountBlock: {
    backgroundColor: Colors.danger + '08',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.danger + '20',
    marginBottom: 8,
  },
  deleteAccountTitlePress: {
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  deleteAccountDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  deleteAccountEmailLink: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
