import React, { useCallback } from 'react';
import { Pressable, Text, Linking, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LegalDocumentLayout } from '../components/LegalDocumentLayout';
import { PRIVACY_POLICY_SECTIONS } from '../constants/legalInAppCopy';
import Colors from '../constants/colors';
import { getPrivacyPolicyPublicUrl } from '../core/supportContact';

export default function PrivacyPolicyScreen() {
  const publicUrl = getPrivacyPolicyPublicUrl();

  const openPublic = useCallback(() => {
    if (!publicUrl) return;
    void Haptics.selectionAsync();
    void Linking.openURL(publicUrl);
  }, [publicUrl]);

  const headerAccessory =
    publicUrl.length > 0 ? (
      <Pressable
        onPress={openPublic}
        style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Open privacy policy in browser"
      >
        <Text style={styles.linkText}>Open published policy in browser</Text>
      </Pressable>
    ) : null;

  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      intro="This Privacy Policy is written for people who use RecoveryRoad. It explains what we collect, why we collect it, where it is stored, who we share it with, how long we keep it, and how you can exercise your choices."
      sections={PRIVACY_POLICY_SECTIONS}
      headerAccessory={headerAccessory}
      documentEndMatter="privacySite"
    />
  );
}

const styles = StyleSheet.create({
  linkBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  linkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
});
