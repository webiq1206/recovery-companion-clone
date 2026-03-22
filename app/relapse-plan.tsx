import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { AlertTriangle, BookOpenCheck, ChevronRight, Shield, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRelapse } from '@/core/domains/useRelapse';
import { useSupportContacts } from '@/core/domains/useSupportContacts';

type WizardStep = 1 | 2 | 3 | 4 | 5;

export default function RelapsePlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { emergencyContacts } = useSupportContacts();
  const { relapsePlan, saveRelapsePlan } = useRelapse();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  const [warningSignsText, setWarningSignsText] = useState(
    relapsePlan?.warningSigns?.join('\n') ?? '',
  );
  const [triggersText, setTriggersText] = useState(
    relapsePlan?.triggers?.join('\n') ?? '',
  );
  const [copingStrategiesText, setCopingStrategiesText] = useState(
    relapsePlan?.copingStrategies?.join('\n') ?? '',
  );
  const [commitmentsText, setCommitmentsText] = useState(
    relapsePlan?.commitments ?? '',
  );

  const hasExistingPlan = !!relapsePlan;

  const stepTitle = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 'Identify warning signs';
      case 2:
        return 'Identify triggers';
      case 3:
        return 'Select coping strategies';
      case 4:
        return 'Add support contacts';
      case 5:
      default:
        return 'Create commitment statement';
    }
  }, [currentStep]);

  const stepSubtitle = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 'List early emotional, mental, or physical changes that usually show up before cravings spike.';
      case 2:
        return 'Name people, places, times, or emotions that tend to pull you toward using.';
      case 3:
        return 'Capture quick strategies that help you ride out urges and steady yourself.';
      case 4:
        return 'Confirm who you want this plan to lean on when things feel risky.';
      case 5:
      default:
        return 'Write a short promise to yourself that you can return to in hard moments.';
    }
  }, [currentStep]);

  const parseLines = (value: string) =>
    value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

  const goToStep = (step: WizardStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(step);
  };

  const goNext = () => {
    if (currentStep < 5) {
      goToStep((currentStep + 1) as WizardStep);
      return;
    }

    const warningSigns = parseLines(warningSignsText);
    const triggers = parseLines(triggersText);
    const copingStrategies = parseLines(copingStrategiesText);

    const plan = {
      warningSigns,
      triggers,
      copingStrategies,
      emergencyContacts,
      commitments: commitmentsText.trim(),
    };

    saveRelapsePlan(plan);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const progress = currentStep / 5;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <Stack.Screen
        options={{
          title: 'Relapse Plan',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {hasExistingPlan ? 'Update your relapse plan' : 'Build your relapse plan'}
          </Text>
          <Text style={styles.subtitle}>
            Capture warning signs, triggers, coping tools, and people to reach out to when risk feels
            high.
          </Text>
        </View>
      </View>

      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarInner, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.stepChipsRow}>
        {[1, 2, 3, 4, 5].map(step => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <Pressable
              key={step}
              onPress={() => goToStep(step as WizardStep)}
              style={[
                styles.stepChip,
                isActive && styles.stepChipActive,
                isCompleted && styles.stepChipCompleted,
              ]}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.stepChipLabel,
                  (isActive || isCompleted) && styles.stepChipLabelActive,
                ]}
              >
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScreenScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{stepTitle}</Text>
          <Text style={styles.stepSubtitle}>{stepSubtitle}</Text>
        </View>

        {currentStep === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <AlertTriangle size={18} color={Colors.warning} />
              <Text style={styles.cardTitle}>Warning signs</Text>
            </View>
            <Text style={styles.cardHint}>
              Examples: restless sleep, skipping routines, isolating, racing thoughts, “I can handle
              it this time”.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="One warning sign per line"
              placeholderTextColor={Colors.textMuted}
              value={warningSignsText}
              onChangeText={setWarningSignsText}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Shield size={18} color={Colors.accent} />
              <Text style={styles.cardTitle}>High-risk situations & triggers</Text>
            </View>
            <Text style={styles.cardHint}>
              Examples: being alone at night, getting paid, conflict with a partner, certain routes
              home, boredom, payday.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="One trigger or situation per line"
              placeholderTextColor={Colors.textMuted}
              value={triggersText}
              onChangeText={setTriggersText}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <BookOpenCheck size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Coping strategies</Text>
            </View>
            <Text style={styles.cardHint}>
              Examples: 5-minute breathing, texting a friend, going for a walk, delaying for 15
              minutes, grounding exercises, urge-surfing.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="One coping strategy per line"
              placeholderTextColor={Colors.textMuted}
              value={copingStrategiesText}
              onChangeText={setCopingStrategiesText}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {currentStep === 4 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Users size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Emergency contacts</Text>
            </View>
            <Text style={styles.cardHint}>
              Your plan will automatically include the crisis contacts you have saved in your
              profile. You can manage them in Crisis Mode.
            </Text>
            {emergencyContacts.length === 0 ? (
              <View style={styles.emptyContacts}>
                <Text style={styles.emptyContactsText}>
                  You have not added any emergency contacts yet. You can still continue, but consider
                  adding 1–3 trusted people in Crisis Mode.
                </Text>
              </View>
            ) : (
              <View style={styles.contactList}>
                {emergencyContacts.map(contact => (
                  <View key={contact.id} style={styles.contactRow}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {contact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactTextBlock}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {currentStep === 5 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Shield size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Commitment statement</Text>
            </View>
            <Text style={styles.cardHint}>
              This is a short promise you can read when cravings feel loud. Write it in your own
              words.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Example: When urges show up, I will pause, breathe, and reach for my tools or people before I act."
              placeholderTextColor={Colors.textMuted}
              value={commitmentsText}
              onChangeText={setCommitmentsText}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}
      </ScreenScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={goNext}
          testID="relapse-plan-next"
        >
          <Text style={styles.primaryButtonText}>
            {currentStep < 5 ? 'Continue' : hasExistingPlan ? 'Save plan' : 'Create plan'}
          </Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerText: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  progressBarOuter: {
    marginHorizontal: 20,
    marginTop: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  stepChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  stepChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  stepChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  stepChipCompleted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  stepChipLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  stepChipLabelActive: {
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 90,
  },
  stepHeader: {
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  stepSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  cardHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  emptyContacts: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyContactsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  contactList: {
    marginTop: 4,
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  contactTextBlock: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

