import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { ScreenScrollView } from './ScreenScrollView';
import Colors from '../constants/colors';
import type { LegalSection } from '../constants/legalInAppCopy';
import { IN_APP_LEGAL_LAST_UPDATED, PRIVACY_POLICY_FOOTER_QUESTIONS_LINE } from '../constants/legalInAppCopy';
import { formatLegalDocumentContactFooter, getSupportEmail } from '../core/supportContact';

const SUPPORT_EMAIL_LITERAL = 'support@recoveryroad.app';

function LegalSectionBodyWithSupportMailtoLinks({ text }: { text: string }) {
  const segments = text.split(/(support@recoveryroad\.app)/g);
  const mailtoAddr = getSupportEmail() || SUPPORT_EMAIL_LITERAL;
  const handleSupportEmailPress = () => {
    void Haptics.selectionAsync();
    void Linking.openURL(`mailto:${mailtoAddr}?subject=${encodeURIComponent('RecoveryRoad privacy')}`);
  };

  return (
    <Text style={styles.body}>
      {segments.map((segment, index) =>
        segment === SUPPORT_EMAIL_LITERAL ? (
          <Text
            key={`mailto-${index}`}
            style={styles.supportEmailLink}
            onPress={handleSupportEmailPress}
            accessibilityRole="link"
            accessibilityLabel={`Email ${segment}`}
          >
            {segment}
          </Text>
        ) : (
          <Text key={`txt-${index}`}>{segment}</Text>
        ),
      )}
    </Text>
  );
}

type Props = {
  title: string;
  sections: LegalSection[];
  intro?: string;
  /** Optional content below the intro (for example a link to the publicly hosted policy). */
  headerAccessory?: React.ReactNode;
  /**
   * 'support' appends env-based Contact footer (default). 'privacySite' matches the end of
   * https://recoveryroad.app/privacy: lead line + PRIVACY_POLICY_FOOTER_QUESTIONS_LINE only.
   * 'termsSite' matches https://recoveryroad.app/terms (effective-date lead + same Questions line).
   */
  documentEndMatter?: 'support' | 'privacySite' | 'termsSite';
};

export function LegalDocumentLayout({
  title,
  sections,
  intro,
  headerAccessory,
  documentEndMatter = 'support',
}: Props) {
  const supportFooter = formatLegalDocumentContactFooter();
  const footerLead =
    documentEndMatter === 'termsSite'
      ? 'These terms are effective as of the date shown above.'
      : 'This document describes our practices as of the date shown above.';
  const footerContact =
    documentEndMatter === 'privacySite' || documentEndMatter === 'termsSite'
      ? PRIVACY_POLICY_FOOTER_QUESTIONS_LINE
      : supportFooter;

  return (
    <View style={styles.wrapper}>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.meta}>Last updated: {IN_APP_LEGAL_LAST_UPDATED}</Text>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        {headerAccessory ? <View style={styles.accessoryWrap}>{headerAccessory}</View> : null}
        {sections.map((s, i) => (
          <View key={i} style={styles.block}>
            <View style={styles.sectionRule} />
            <Text style={styles.heading}>{s.heading}</Text>
            <LegalSectionBodyWithSupportMailtoLinks text={s.body} />
          </View>
        ))}
        <View style={styles.sectionRule} />
        <Text style={styles.footerLead}>{footerLead}</Text>
        <Text style={styles.footerContact}>{footerContact}</Text>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 56 },
  meta: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  intro: { fontSize: 16, lineHeight: 24, color: Colors.textSecondary, marginBottom: 12 },
  accessoryWrap: { marginBottom: 8 },
  block: { marginBottom: 22 },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border ?? 'rgba(0,0,0,0.08)',
    marginBottom: 14,
    opacity: 0.9,
  },
  heading: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 24, color: Colors.textSecondary },
  supportEmailLink: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  footerLead: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  footerContact: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
