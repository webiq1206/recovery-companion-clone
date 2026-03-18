import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useJournal } from '@/core/domains/useJournal';
import { useEngagement } from '@/providers/EngagementProvider';
import { useRetention } from '@/providers/RetentionProvider';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/constants/milestones';
import { JournalEntry } from '@/types';

export default function NewJournalScreen() {
  const router = useRouter();
  const { addJournalEntry } = useJournal();
  const { recordMicroWin } = useEngagement();
  const { triggerLoop } = useRetention();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [mood, setMood] = useState<number>(3);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please add a title for your entry.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Content Required', 'Please write something in your journal entry.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: title.trim(),
      content: content.trim(),
      mood,
    };

    addJournalEntry(entry);
    recordMicroWin('journal_written');
    triggerLoop('growth', 'journal_written');
    router.back();
  }, [title, content, mood, addJournalEntry]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: 'New Entry',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerRight: () => (
            <Pressable onPress={handleSave} hitSlop={12}>
              <Text style={styles.saveButton}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <Text style={styles.label}>HOW ARE YOU FEELING?</Text>
      <View style={styles.moodRow}>
        {MOOD_EMOJIS.map((emoji, index) => (
          <Pressable
            key={index}
            style={[styles.moodBtn, mood === index + 1 && styles.moodBtnSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              setMood(index + 1);
            }}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
            <Text style={[styles.moodLabel, mood === index + 1 && styles.moodLabelActive]}>
              {MOOD_LABELS[index]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>TITLE</Text>
      <TextInput
        style={styles.titleInput}
        placeholder="Give your entry a title"
        placeholderTextColor={Colors.textMuted}
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        testID="journal-title"
      />

      <Text style={styles.label}>YOUR THOUGHTS</Text>
      <TextInput
        style={styles.contentInput}
        placeholder="Write about your day, feelings, challenges, or victories..."
        placeholderTextColor={Colors.textMuted}
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        testID="journal-content"
      />

      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        onPress={handleSave}
        testID="save-journal"
      >
        <Text style={styles.saveBtnText}>Save Entry</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 8,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 6,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  moodBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.1)',
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  moodLabelActive: {
    color: Colors.primary,
  },
  titleInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  contentInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 15,
    minHeight: 180,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 24,
    lineHeight: 22,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
