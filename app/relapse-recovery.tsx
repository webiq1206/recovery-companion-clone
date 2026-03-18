import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HeartCrack, Target, Brain, Shield, ArrowRight } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useRelapse } from '@/core/domains/useRelapse';
import { useAppStore } from '@/stores/useAppStore';

type TriggerId = 'access' | 'conflict' | 'stress' | 'lonely' | 'bored' | 'other';
type EmotionId = 'ashamed' | 'numb' | 'anxious' | 'overwhelmed' | 'hopeless' | 'angry';

const TRIGGERS: { id: TriggerId; label: string }[] = [
  { id: 'access', label: 'Easy access / opportunity' },
  { id: 'conflict', label: 'Conflict or argument' },
  { id: 'stress', label: 'Stress / pressure' },
  { id: 'lonely', label: 'Lonely / disconnected' },
  { id: 'bored', label: 'Bored / unstructured time' },
  { id: 'other', label: 'Something else' },
];

const EMOTIONS: { id: EmotionId; label: string }[] = [
  { id: 'ashamed', label: 'Ashamed' },
  { id: 'numb', label: 'Numb / checked out' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'overwhelmed', label: 'Overwhelmed' },
  { id: 'hopeless', label: 'Hopeless' },
  { id: 'angry', label: 'Frustrated / angry' },
];

export default function RelapseRecoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logRelapse } = useRelapse();
  const logRelapseToCentralStore = useAppStore.use.logRelapse();

  const [selectedTrigger, setSelectedTrigger] = useState<TriggerId | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionId | null>(null);
  const [hasLogged, setHasLogged] = useState(false);

  const canSubmit = useMemo(
    () => selectedTrigger != null && selectedEmotion != null,
    [selectedTrigger, selectedEmotion]
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const triggerLabel = TRIGGERS.find(t => t.id === selectedTrigger)?.label;
    const emotionalStateLabel = EMOTIONS.find(e => e.id === selectedEmotion)?.label;

    // Domain: increment relapse count + timeline event, non-judgmental.
    logRelapse();

    // Central app store: enrich relapse logs for progress views.
    logRelapseToCentralStore({
      triggerLabel,
      emotionalStateLabel,
    });

    setHasLogged(true);
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/rebuild' as any);
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerIconWrap}>
          <HeartCrack size={32} color={Colors.danger} />
        </View>
        <Text style={styles.title}>This doesn&apos;t erase your work.</Text>
        <Text style={styles.subtitle}>
          Relapse is data, not a verdict. Let&apos;s understand what happened and choose the next right step.
        </Text>

        <Text style={styles.sectionLabel}>What most likely pulled you off track?</Text>
        <View style={styles.pillGrid}>
          {TRIGGERS.map((trigger) => {
            const active = trigger.id === selectedTrigger;
            return (
              <Pressable
                key={trigger.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedTrigger(trigger.id)}
                testID={`relapse-trigger-${trigger.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {trigger.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Right now I feel mostly…
        </Text>
        <View style={styles.pillGrid}>
          {EMOTIONS.map((emotion) => {
            const active = emotion.id === selectedEmotion;
            return (
              <Pressable
                key={emotion.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedEmotion(emotion.id)}
                testID={`relapse-emotion-${emotion.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {emotion.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {hasLogged ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
              Recovery steps for the next hour
            </Text>
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Target size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Stabilize your system</Text>
                <Text style={styles.cardSubtitle}>
                  Do one short check-in so your Stability and Early Warning systems include today.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.cardCta, pressed && styles.cardCtaPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/daily-checkin' as any);
                }}
                testID="relapse-recovery-checkin"
              >
                <Text style={styles.cardCtaLabel}>Open check-in</Text>
                <ArrowRight size={16} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Brain size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Rebuild protection</Text>
                <Text style={styles.cardSubtitle}>
                  Spend a few minutes in Rebuild to reinforce routines and coping skills.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.cardCta, pressed && styles.cardCtaPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/rebuild' as any);
                }}
                testID="relapse-recovery-rebuild"
              >
                <Text style={styles.cardCtaLabel}>Go to Rebuild</Text>
                <ArrowRight size={16} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Shield size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Activate connection</Text>
                <Text style={styles.cardSubtitle}>
                  If you can, let one trusted person know what happened. You don&apos;t have to share details.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.cardCta, pressed && styles.cardCtaPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/crisis-mode' as any);
                }}
                testID="relapse-recovery-support"
              >
                <Text style={styles.cardCtaLabel}>Open support tools</Text>
                <ArrowRight size={16} color={Colors.primary} />
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (!canSubmit || pressed) && styles.primaryButtonPressed,
            ]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            testID="relapse-recovery-submit"
          >
            <Text style={styles.primaryButtonText}>
              Log this and suggest steps
            </Text>
          </Pressable>
        )}

        {hasLogged && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={handleClose}
            testID="relapse-recovery-done"
          >
            <Text style={styles.secondaryButtonText}>I&apos;m ready to continue</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.danger + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  pillPressed: {
    opacity: 0.9,
  },
  pillLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pillLabelActive: {
    color: Colors.text,
  },
  primaryButton: {
    marginTop: 28,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryButton: {
    marginTop: 18,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  secondaryButtonPressed: {
    opacity: 0.95,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  card: {
    marginTop: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  cardCtaPressed: {
    opacity: 0.9,
  },
  cardCtaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});

