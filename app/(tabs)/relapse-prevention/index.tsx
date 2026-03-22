import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldAlert, AlertTriangle, Target, FileText, Activity } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function RelapsePreventionTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Relapse Prevention</Text>
          <Text style={styles.subtitle}>
            Keep your warning signs, triggers, and safety plans one tap away.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryCard, pressed && styles.pressed]}
          onPress={() => router.push('/relapse-plan' as any)}
          testID="open-relapse-plan"
        >
          <View style={styles.iconWrapPrimary}>
            <ShieldAlert size={22} color={Colors.danger} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Relapse Plan</Text>
            <Text style={styles.cardSubtitle}>
              Review warning signs, triggers, and coping actions before urges spike.
            </Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Risk & Triggers</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/relapse-detection' as any)}
          testID="open-relapse-detection"
        >
          <View style={styles.iconWrap}>
            <Activity size={18} color={Colors.primary} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Relapse Detection</Text>
            <Text style={styles.cardSubtitle}>
              See your current risk level, patterns, and early warning signals.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/triggers' as any)}
          testID="open-triggers"
        >
          <View style={styles.iconWrap}>
            <AlertTriangle size={18} color={Colors.accent} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Trigger Map</Text>
            <Text style={styles.cardSubtitle}>
              Track situations, places, and emotions that increase vulnerability.
            </Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Accountability</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/accountability' as any)}
          testID="open-accountability"
        >
          <View style={styles.iconWrap}>
            <Target size={18} color={Colors.primary} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Accountability</Text>
            <Text style={styles.cardSubtitle}>
              Keep pledges, urges, and near misses visible for you and your circle.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/milestones' as any)}
          testID="open-milestones"
        >
          <View style={styles.iconWrap}>
            <FileText size={18} color={Colors.accentWarm} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Milestones</Text>
            <Text style={styles.cardSubtitle}>
              Celebrate sober streaks and key wins that prove relapse isn&apos;t the only story.
            </Text>
          </View>
        </Pressable>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.danger + '35',
  },
  iconWrapPrimary: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginRight: 12,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

