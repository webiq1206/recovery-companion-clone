import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenScrollView } from '../components/ScreenScrollView';
import Colors from '../constants/colors';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';

export default function CommunityGuidelinesScreen() {
  const router = useRouter();

  if (!arePeerPracticeFeaturesEnabled()) {
    return <Redirect href="/(tabs)/connection" />;
  }

  return (
    <View style={styles.wrapper}>
      <Stack.Screen
        options={{
          title: 'Connect safety',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.calloutTitle}>User-generated content & safety</Text>
        <Text style={styles.calloutBody}>
          RecoveryRoad may include recovery rooms and other areas where you see messages from other people.
          You can <Text style={styles.em}>report abuse</Text>, <Text style={styles.em}>block users</Text>, and read
          these rules at any time. This screen is part of how we meet platform expectations for apps with social or
          support-style features.
        </Text>

        <Text style={styles.section}>What is allowed</Text>
        <Text style={styles.body}>
          Be respectful and recovery-focused. No harassment, hate, threats, sexual content toward others, doxxing, or
          encouragement of self-harm or illegal activity. Keep graphic substance-use details out of public threads when
          others have not asked for that level of detail.
        </Text>

        <Text style={styles.section}>Report abuse</Text>
        <Text style={styles.body}>
          In <Text style={styles.em}>recovery rooms</Text>, long-press a message that is not yours. You can choose{' '}
          <Text style={styles.em}>Report message</Text> (flags that specific content), or <Text style={styles.em}>Report user</Text>{' '}
          (flags the participant for moderator review, not only one message). Add details when you can—moderators rely
          on context.
        </Text>
        <Text style={styles.body}>
          When your build is connected to the configured social backend, reports are delivered for staff review in line
          with our enforcement process. When that backend is not configured, reports may be stored only on your device so
          you can document concerns for a sponsor, clinician, or your platform’s support channel outside the app.
        </Text>

        <Text style={styles.section}>Block users</Text>
        <Text style={styles.body}>
          From the same long-press menu, choose <Text style={styles.em}>Block user</Text> to stop seeing messages from
          that participant. We block by display name and, when available, by account id so blocking is stronger than a
          name alone. Blocking applies to recovery rooms for your account; with live community, blocks are stored with
          your session on the server as well as in the app.
        </Text>

        <Text style={styles.section}>Moderation & review</Text>
        <Text style={styles.body}>
          When live community is on, moderators can review queued reports, remove content that violates these
          guidelines, and restrict or disable accounts that pose a risk to others. We do not promise a personal response
          to every report. Serious violations (for example threats, child safety, or illegal content) may be escalated
          according to law and platform policy.
        </Text>
        <Text style={styles.body}>
          We may update these guidelines. Continued use of social features after an update means you accept the current
          version.
        </Text>

        <Text style={styles.section}>Enforcement</Text>
        <Text style={styles.body}>
          Breaking these rules can result in removal of content, suspension of posting, loss of access to rooms, or
          termination of access to social features. Enforcement is applied at our reasonable discretion and may depend
          on what our moderation tools and staff can verify.
        </Text>

        <Text style={styles.section}>Escalation & emergencies</Text>
        <Text style={styles.body}>
          This app is <Text style={styles.em}>not</Text> a crisis service and is not monitored 24/7 for every message. If
          you or someone else is in immediate danger, contact local emergency services or a crisis hotline in your
          country. If you believe a user is at imminent risk of harm, prioritize real-world help.
        </Text>
        <Text style={styles.body}>
          For concerns about the app itself (billing, account, or safety), use the support contact shown on your App
          Store or Google Play listing.
        </Text>

        <Text style={styles.section}>Where to find these tools in the app</Text>
        <Text style={styles.body}>
          In a recovery room chat, use the <Text style={styles.em}>flag</Text> button in the header for a quick summary
          of reporting and blocking, the <Text style={styles.em}>book</Text> icon for this full document, and the banner
          under the tabs on the room screen. The Connection tab also links here from peer and room areas.
        </Text>

        <Text style={styles.section}>Privacy, terms, and data</Text>
        <Text style={styles.body}>
          Community participation is voluntary. Read how data is stored, what stays on your device, and when content may
          be sent to a backend (for example when live community is enabled).
        </Text>
        <View style={styles.relatedLinks}>
          <Pressable
            style={({ pressed }) => [styles.relatedPill, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/privacy-policy' as never);
            }}
          >
            <Text style={styles.relatedPillText}>Privacy Policy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.relatedPill, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/terms-of-service' as never);
            }}
          >
            <Text style={styles.relatedPillText}>Terms of Service</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.relatedPill, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/data-and-sharing' as never);
            }}
          >
            <Text style={styles.relatedPillText}>Your data & sharing</Text>
          </Pressable>
        </View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 48 },
  calloutTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  calloutBody: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    marginBottom: 8,
    padding: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  em: { fontWeight: '700' as const, color: Colors.text },
  section: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginTop: 22, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary, marginBottom: 10 },
  relatedLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  relatedPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
    marginBottom: 10,
  },
  relatedPillText: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
});
