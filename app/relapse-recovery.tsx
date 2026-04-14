import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HeartCrack, Target, Brain, Shield, Users, ArrowRight } from 'lucide-react-native';

import Colors from '../constants/colors';
import { useRelapse } from '../core/domains/useRelapse';
import { useAppStore } from '../stores/useAppStore';
import { useSubscription } from '../providers/SubscriptionProvider';

type WhatHappenedId = 'alcohol' | 'drugs' | 'gambling' | 'food' | 'pornography' | 'other';
type WhenId = 'morning' | 'afternoon' | 'evening' | 'night';
type WhereId = 'home' | 'work' | 'social';
type WereYouId = 'alone' | 'with_friends';
type TriggerId = 'access' | 'conflict' | 'stress' | 'lonely' | 'bored' | 'other';
type ThinkingId = 'just_one' | 'can_control' | 'deserve' | 'dont_care' | 'nobody_will_know' | 'other';
type DuringId = 'tried_stop' | 'paused' | 'went_all_in';
type AfterHaveYouId = 'sponsor' | 'messaged_friend' | 'meeting' | 'grounding' | 'journal' | 'did_nothing';
type EmotionId =
  | 'ashamed'
  | 'numb'
  | 'anxious'
  | 'overwhelmed'
  | 'hopeless'
  | 'angry'
  | 'guilty'
  | 'relieved';

const WHAT_HAPPENED: { id: WhatHappenedId; label: string }[] = [
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'drugs', label: 'Drugs' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'food', label: 'Food' },
  { id: 'pornography', label: 'Pornography' },
  { id: 'other', label: 'Other' },
];

const WHEN_OPTIONS: { id: WhenId; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];

const WHERE_OPTIONS: { id: WhereId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'social', label: 'Social Setting' },
];

const WERE_YOU_OPTIONS: { id: WereYouId; label: string }[] = [
  { id: 'alone', label: 'Alone' },
  { id: 'with_friends', label: 'With Friends' },
];

const WHAT_THINKING: { id: ThinkingId; label: string }[] = [
  { id: 'just_one', label: "Just one won't hurt" },
  { id: 'can_control', label: 'I can control it' },
  { id: 'deserve', label: 'I deserve this' },
  { id: 'dont_care', label: "I don't care anymore" },
  { id: 'nobody_will_know', label: 'Nobody will know' },
  { id: 'other', label: 'Other' },
];

const WHAT_HAPPENED_DURING: { id: DuringId; label: string }[] = [
  { id: 'tried_stop', label: 'I tried to stop' },
  { id: 'paused', label: 'I paused or hesitated' },
  { id: 'went_all_in', label: 'I went all in' },
];

const AFTER_HAVE_YOU: { id: AfterHaveYouId; label: string }[] = [
  { id: 'sponsor', label: 'Called sponsor' },
  { id: 'messaged_friend', label: 'Messaged friend' },
  { id: 'meeting', label: 'Joined a meeting' },
  { id: 'grounding', label: 'Grounding exercise' },
  { id: 'journal', label: 'Journal entry' },
  { id: 'did_nothing', label: 'Did Nothing' },
];

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
  { id: 'guilty', label: 'Guilty' },
  { id: 'relieved', label: 'Relieved' },
];

export default function RelapseRecoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logRelapse } = useRelapse();
  const logRelapseToCentralStore = useAppStore.use.logRelapse();
  const { isPremium } = useSubscription();

  const [selectedWhatHappened, setSelectedWhatHappened] = useState<WhatHappenedId | null>(null);
  const [selectedWhen, setSelectedWhen] = useState<WhenId | null>(null);
  const [selectedWhere, setSelectedWhere] = useState<WhereId | null>(null);
  const [selectedWereYou, setSelectedWereYou] = useState<WereYouId | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerId | null>(null);
  const [selectedThinking, setSelectedThinking] = useState<ThinkingId | null>(null);
  const [selectedDuring, setSelectedDuring] = useState<DuringId | null>(null);
  const [selectedAfterHaveYou, setSelectedAfterHaveYou] = useState<AfterHaveYouId | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionId | null>(null);
  const [hasLogged, setHasLogged] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const canSubmit = useMemo(
    () =>
      selectedWhatHappened != null &&
      selectedWhen != null &&
      selectedWhere != null &&
      selectedWereYou != null &&
      selectedTrigger != null &&
      selectedThinking != null &&
      selectedDuring != null &&
      selectedAfterHaveYou != null &&
      selectedEmotion != null,
    [
      selectedWhatHappened,
      selectedWhen,
      selectedWhere,
      selectedWereYou,
      selectedTrigger,
      selectedThinking,
      selectedDuring,
      selectedAfterHaveYou,
      selectedEmotion,
    ]
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const whatHappenedLabel = WHAT_HAPPENED.find(w => w.id === selectedWhatHappened)?.label;
    const whenLabel = WHEN_OPTIONS.find(w => w.id === selectedWhen)?.label;
    const whereLabel = WHERE_OPTIONS.find(w => w.id === selectedWhere)?.label;
    const wereYouLabel = WERE_YOU_OPTIONS.find(w => w.id === selectedWereYou)?.label;
    const triggerLabel = TRIGGERS.find(t => t.id === selectedTrigger)?.label;
    const thinkingLabel = WHAT_THINKING.find(t => t.id === selectedThinking)?.label;
    const happenedDuringLabel = WHAT_HAPPENED_DURING.find(d => d.id === selectedDuring)?.label;
    const afterHaveYouLabel = AFTER_HAVE_YOU.find(a => a.id === selectedAfterHaveYou)?.label;
    const emotionalStateLabel = EMOTIONS.find(e => e.id === selectedEmotion)?.label;

    const details = {
      whatHappenedLabel,
      whenLabel,
      whereLabel,
      wereYouLabel,
      triggerLabel,
      thinkingLabel,
      happenedDuringLabel,
      afterHaveYouLabel,
      emotionalStateLabel,
    };

    // Domain: increment relapse count + timeline event, non-judgmental.
    logRelapse(details);

    // Central app store: enrich relapse logs for progress views.
    logRelapseToCentralStore(details);

    setHasLogged(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/rebuild' as any);
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <ScreenScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerIconWrap}>
          <HeartCrack size={32} color={Colors.danger} />
        </View>
        <Text style={styles.title}>This doesn&apos;t erase your work.</Text>
        <Text style={styles.subtitle}>
          A setback is data, not a verdict. Let&apos;s understand what happened and choose the next right step.
        </Text>

        <Text style={styles.sectionLabel}>What happened</Text>
        <View style={styles.pillGrid}>
          {WHAT_HAPPENED.map((item) => {
            const active = item.id === selectedWhatHappened;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedWhatHappened(item.id)}
                testID={`relapse-what-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>When</Text>
        <View style={styles.pillGrid}>
          {WHEN_OPTIONS.map((item) => {
            const active = item.id === selectedWhen;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedWhen(item.id)}
                testID={`relapse-when-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Where</Text>
        <View style={styles.pillGrid}>
          {WHERE_OPTIONS.map((item) => {
            const active = item.id === selectedWhere;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedWhere(item.id)}
                testID={`relapse-where-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Were you</Text>
        <View style={styles.pillGrid}>
          {WERE_YOU_OPTIONS.map((item) => {
            const active = item.id === selectedWereYou;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedWereYou(item.id)}
                testID={`relapse-wereyou-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          What triggered your setback
        </Text>
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
          What were you thinking
        </Text>
        <View style={styles.pillGrid}>
          {WHAT_THINKING.map((item) => {
            const active = item.id === selectedThinking;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedThinking(item.id)}
                testID={`relapse-thinking-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          What happened during
        </Text>
        <View style={styles.pillGrid}>
          {WHAT_HAPPENED_DURING.map((item) => {
            const active = item.id === selectedDuring;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedDuring(item.id)}
                testID={`relapse-during-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          After have you
        </Text>
        <View style={styles.pillGrid}>
          {AFTER_HAVE_YOU.map((item) => {
            const active = item.id === selectedAfterHaveYou;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
                onPress={() => setSelectedAfterHaveYou(item.id)}
                testID={`relapse-after-${item.id}`}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {item.label}
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
                <Text style={styles.cardTitle}>Quick journal entry</Text>
                <Text style={styles.cardSubtitle}>
                  Capture your thoughts about your setback in one short entry.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.cardCta, pressed && styles.cardCtaPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/tools/quick-journal' as any);
                }}
                testID="relapse-recovery-quick-journal"
              >
                <Text style={styles.cardCtaLabel}>Open quick journal</Text>
                <ArrowRight size={16} color={Colors.primary} />
              </Pressable>
            </View>

            {isPremium ? (
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
                    router.push({ pathname: '/rebuild', params: { fromSetback: '1' } } as any);
                  }}
                  testID="relapse-recovery-rebuild"
                >
                  <Text style={styles.cardCtaLabel}>Go to Rebuild</Text>
                  <ArrowRight size={16} color={Colors.primary} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Shield size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Ground yourself</Text>
                <Text style={styles.cardSubtitle}>
                  Pause, regroup, and calm yourself.
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
                <Text style={styles.cardCtaLabel}>Open grounding exercise</Text>
                <ArrowRight size={16} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Users size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>Be accountable</Text>
                <Text style={styles.cardSubtitle}>
                  Contact accountability partner and review commitments.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.cardCta, pressed && styles.cardCtaPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/accountability', params: { fromSetback: '1' } } as any);
                }}
                testID="relapse-recovery-accountability"
              >
                <Text style={styles.cardCtaLabel}>Open accountability</Text>
                <ArrowRight size={16} color={Colors.primary} />
              </Pressable>
            </View>
          </>
        ) : (
          <View>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                !canSubmit && styles.primaryButtonDisabled,
                canSubmit && pressed && styles.primaryButtonPressed,
              ]}
              disabled={!canSubmit}
              onPress={handleSubmit}
              testID="relapse-recovery-submit"
            >
              <Text
                style={[styles.primaryButtonText, !canSubmit && styles.primaryButtonTextDisabled]}
              >
                Log this and suggest steps
              </Text>
            </Pressable>
            {!canSubmit && (
              <Text style={styles.submitHint}>Select an option in each section to continue.</Text>
            )}
          </View>
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
      </ScreenScrollView>
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
  primaryButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.85,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  primaryButtonTextDisabled: {
    color: Colors.textMuted,
  },
  submitHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
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

