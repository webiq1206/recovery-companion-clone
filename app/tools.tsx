import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Wind, Timer, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { TOOL_REGISTRY } from '@/features/tools/registry';
import type { ToolExperienceCategory, ToolDefinition } from '@/features/tools/types';

const EXPERIENCE_CATEGORY_LABELS: Record<ToolExperienceCategory, string> = {
  calm: 'Calm',
  handle_urges: 'Handle urges',
  emotional_support: 'Emotional support',
};

const EXPERIENCE_CATEGORY_ORDER: ToolExperienceCategory[] = [
  'calm',
  'handle_urges',
  'emotional_support',
];

function getToolIcon(toolId: ToolDefinition['id']) {
  switch (toolId) {
    case 'breathing':
      return Wind;
    case 'urge-timer':
      return Timer;
    case 'journal-prompt':
      return BookOpen;
    default:
      return Wind;
  }
}

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const toolsByCategory = useMemo(() => {
    const grouped: Partial<Record<ToolExperienceCategory, ToolDefinition[]>> = {};
    TOOL_REGISTRY.forEach((tool) => {
      if (!tool.experienceCategory) return;
      if (!grouped[tool.experienceCategory]) grouped[tool.experienceCategory] = [];
      grouped[tool.experienceCategory]!.push(tool);
    });
    EXPERIENCE_CATEGORY_ORDER.forEach((cat) => {
      if (grouped[cat]) {
        grouped[cat] = grouped[cat]!.slice().sort((a, b) => a.title.localeCompare(b.title));
      }
    });
    return grouped;
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Text style={styles.title}>Tools</Text>
      <Text style={styles.subtitle}>
        Quick, interactive tools to help you calm down, ride out urges, and feel supported.
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {EXPERIENCE_CATEGORY_ORDER.map((categoryKey) => {
          const tools = toolsByCategory[categoryKey];
          if (!tools || tools.length === 0) return null;
          return (
            <View key={categoryKey} style={styles.section}>
              <Text style={styles.sectionLabel}>{EXPERIENCE_CATEGORY_LABELS[categoryKey]}</Text>
              <View style={styles.cardGroup}>
                {tools.map((tool) => {
                  const Icon = getToolIcon(tool.id);
                  const href = tool.route?.href;
                  if (!href) return null;
                  return (
                    <Pressable
                      key={tool.id}
                      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(href as any);
                      }}
                      testID={`tools-${tool.id}`}
                    >
                      <View style={styles.iconWrap}>
                        <Icon size={22} color={Colors.primary} />
                      </View>
                      <View style={styles.cardTextWrap}>
                        <Text style={styles.cardTitle}>{tool.title}</Text>
                        <Text style={styles.cardSubtitle}>{tool.subtitle}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardGroup: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

