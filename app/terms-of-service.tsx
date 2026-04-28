import React, { useCallback } from 'react';
import { Pressable, Text, Linking, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LegalDocumentLayout } from '../components/LegalDocumentLayout';
import { TERMS_OF_SERVICE_SECTIONS } from '../constants/legalInAppCopy';
import Colors from '../constants/colors';
import { getTermsOfServicePublicUrl } from '../core/supportContact';

export default function TermsOfServiceScreen() {
  const publicUrl = getTermsOfServicePublicUrl();

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
        accessibilityLabel="Open terms of service in browser"
      >
        <Text style={styles.linkText}>Open published terms in browser</Text>
      </Pressable>
    ) : null;

  return (
    <LegalDocumentLayout
      title="Terms of Service"
      sections={TERMS_OF_SERVICE_SECTIONS}
      headerAccessory={headerAccessory}
      documentEndMatter="termsSite"
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
