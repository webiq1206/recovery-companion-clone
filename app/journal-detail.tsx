import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { useJournal } from '@/core/domains/useJournal';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/constants/milestones';

export default function JournalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { journal } = useJournal();

  const entry = useMemo(() => journal.find(e => e.id === id), [journal, id]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Entry' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Entry not found</Text>
        </View>
      </View>
    );
  }

  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: entry.title }} />

      <View style={styles.moodBadge}>
        <Text style={styles.moodEmoji}>{MOOD_EMOJIS[(entry.mood || 3) - 1]}</Text>
        <Text style={styles.moodText}>Feeling {MOOD_LABELS[(entry.mood || 3) - 1]}</Text>
      </View>

      <Text style={styles.title}>{entry.title}</Text>

      <Text style={styles.date}>{formattedDate} at {formattedTime}</Text>

      <View style={styles.divider} />

      <Text style={styles.bodyText}>{entry.content}</Text>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
  },
});
