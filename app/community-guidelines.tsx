import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { ScreenScrollView } from '../components/ScreenScrollView';
import Colors from '../constants/colors';

export default function CommunityGuidelinesScreen() {
  return (
    <View style={styles.wrapper}>
      <Stack.Screen
        options={{
          title: 'Community guidelines',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.lead}>
          Recovery Companion includes <Text style={styles.em}>on-device practice</Text> areas inspired by peer support.
          They are not live clinical services, not moderated by staff in real time, and not a crisis hotline.
        </Text>

        <Text style={styles.section}>Be respectful</Text>
        <Text style={styles.body}>
          No harassment, hate, threats, or sexual content toward others—even in sample threads. Keep language
          recovery-focused and kind.
        </Text>

        <Text style={styles.section}>Your wellbeing first</Text>
        <Text style={styles.body}>
          If you are in immediate danger, contact local emergency services. Use the in-app crisis tools when you need
          grounding in the moment.
        </Text>

        <Text style={styles.section}>Reporting</Text>
        <Text style={styles.body}>
          In recovery rooms, long-press a message to report it. Reports are stored on this device for your records;
          they are not sent to a moderation queue unless your organization configures a separate pipeline.
        </Text>

        <Text style={styles.section}>Blocking</Text>
        <Text style={styles.body}>
          You can block a display name in a room to hide those messages and reduce automated practice replies from
          that name. Blocking is local to this device.
        </Text>

        <Text style={styles.section}>Enforcement</Text>
        <Text style={styles.body}>
          There is no guarantee of human review. These tools exist so you can curate your own experience and document
          concerns to share with a sponsor, clinician, or trusted person outside the app if you choose.
        </Text>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  lead: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginBottom: 20 },
  em: { fontWeight: '700', color: Colors.text },
  section: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 16, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
});
