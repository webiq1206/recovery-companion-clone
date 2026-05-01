import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';
import { useJournal } from '../../core/domains/useJournal';
import { useEngagement } from '../../providers/EngagementProvider';
import { useRetention } from '../../providers/RetentionProvider';
import type { JournalEntry } from '../../types';
import { useToolUsageStore } from '../../features/tools/state/useToolUsageStore';

/** Extra scroll padding so Save Entry stays reachable above the software keyboard. */
const KEYBOARD_SCROLL_PADDING = 280;

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Quick journal',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: insets.bottom + KEYBOARD_SCROLL_PADDING,
          },
        ]}
      >
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
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </Pressable>
          </View>
        </View>
      </ScreenScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  card: {
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
    minHeight: 200,
    borderRadius: 14,
    padding: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

