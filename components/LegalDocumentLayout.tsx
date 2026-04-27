import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { ScreenScrollView } from './ScreenScrollView';
import Colors from '../constants/colors';
import type { LegalSection } from '../constants/legalInAppCopy';
import { IN_APP_LEGAL_LAST_UPDATED, PRIVACY_POLICY_FOOTER_QUESTIONS_LINE } from '../constants/legalInAppCopy';
import { formatLegalDocumentContactFooter } from '../core/supportContact';

type Props = {
  title: string;
  sections: LegalSection[];
  intro?: string;
  /** Optional content below the intro (for example a link to the publicly hosted policy). */
  headerAccessory?: React.ReactNode;
  /**
   * 'support' appends env-based Contact footer (default). 'privacySite' matches the end of
   * https://recoveryroad.app/privacy: lead line + PRIVACY_POLICY_FOOTER_QUESTIONS_LINE only.
   */
  documentEndMatter?: 'support' | 'privacySite';
};

export function LegalDocumentLayout({
  title,
  sections,
  intro,
  headerAccessory,
  documentEndMatter = 'support',
}: Props) {
  const supportFooter = formatLegalDocumentContactFooter();

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
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
        <View style={styles.sectionRule} />
        <Text style={styles.footerLead}>This document describes our practices as of the date shown above.</Text>
        <Text style={styles.footerContact}>
          {documentEndMatter === 'privacySite' ? PRIVACY_POLICY_FOOTER_QUESTIONS_LINE : supportFooter}
        </Text>
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
