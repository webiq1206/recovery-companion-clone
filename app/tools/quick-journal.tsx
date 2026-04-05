import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useJournal } from '@/core/domains/useJournal';
import { useEngagement } from '@/providers/EngagementProvider';
import { useRetention } from '@/providers/RetentionProvider';
import type { JournalEntry } from '@/types';
import { useToolUsageStore } from '@/features/tools/state/useToolUsageStore';

export default function QuickJournalToolScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addJournalEntry } = useJournal();
  const { recordMicroWin } = useEngagement();
  const { triggerLoop } = useRetention();
  const logToolUsage = useToolUsageStore.use.logToolUsage();

  const [prompt] = useState("What's the one thing on your mind right now?");
  const [content, setContent] = useState('');

  React.useEffect(() => {
    logToolUsage({ toolId: 'journal-prompt', context: 'any', action: 'opened' });
  }, [logToolUsage]);

  const handleSave = useCallback(() => {
    if (!content.trim()) {
      Haptics.selectionAsync();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: 'Quick journal',
      content: content.trim(),
      mood: 3,
    };

    addJournalEntry(entry);
    recordMicroWin('journal_written');
    triggerLoop('growth', 'journal_written');

    logToolUsage({
      toolId: 'journal-prompt',
      context: 'any',
      action: 'completed',
      meta: { length: content.trim().length },
    });

    router.back();
  }, [content, addJournalEntry, recordMicroWin, triggerLoop, logToolUsage, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <Stack.Screen
          options={{
            title: 'Quick journal',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
          }}
        />

        <View style={styles.card}>
          <Text style={styles.label}>ONE SHORT ENTRY</Text>
          <Text style={styles.title}>Get it out of your head</Text>
          <Text style={styles.subtitle}>
            Take 1–2 minutes to describe what&apos;s happening, without editing yourself.
          </Text>

          <View style={styles.promptBox}>
            <Text style={styles.promptLabel}>Prompt</Text>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Start writing here..."
            placeholderTextColor={Colors.textMuted}
            multiline
            textAlignVertical="top"
            maxLength={800}
            value={content}
            onChangeText={setContent}
            testID="quick-journal-input"
          />

          <View style={styles.footerRow}>
            <Text style={styles.charCount}>{content.length}/800</Text>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (!content.trim() || pressed) && styles.saveButtonPressed,
              ]}
              onPress={handleSave}
              disabled={!content.trim()}
              testID="quick-journal-save"
            >
              <Text style={styles.saveButtonText}>
                {content.trim() ? 'Save entry' : 'Write a few words'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 18,
  },
  promptBox: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  promptText: {
    fontSize: 14,
    color: Colors.text,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});

