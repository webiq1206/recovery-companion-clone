import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sun,
  Shield,
  ShieldAlert,
  Users,
  AlertTriangle,
  Activity,
  BookOpen,
  Heart,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { useSupportContacts } from '@/core/domains/useSupportContacts';
import { useRebuild } from '@/core/domains/useRebuild';
import { useAccountability } from '@/core/domains/useAccountability';
import { useCheckin } from '@/core/domains/useCheckin';
import { useAppMeta } from '@/core/domains/useAppMeta';
import { useAppStore } from '@/stores/useAppStore';
import type { CheckInTimeOfDay } from '@/types';
import { resolveCanonicalRoute } from '@/utils/legacyRoutes';

type WizardTaskKind = 'onboarding' | 'daily';

interface WizardTask {
  id: string;
  kind: WizardTaskKind;
  title: string;
  description: string;
  ctaLabel: string;
  route: string;
  priority: number;
  isCompleted: boolean;
  icon: React.ReactNode;
  pill?: string;
}

function getCurrentPeriod(): CheckInTimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function IntelligentWizardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUser();
  const { emergencyContacts } = useSupportContacts();
  const { rebuildData } = useRebuild();
  const { accountabilityData } = useAccountability();
  const { todayCheckIns, currentCheckInPeriod } = useCheckin();
  const { stabilityScore } = useAppMeta();
  const centralProfile = useAppStore((s) => s.userProfile);

  const effectivePeriod = currentCheckInPeriod ?? getCurrentPeriod();

  const {
    onboardingTasks,
    dailyTasks,
  } = useMemo(() => {
    const hasAnyCheckIn = todayCheckIns.length > 0;
    const hasCurrentCheckIn = todayCheckIns.some(c => c.timeOfDay === effectivePeriod);
    const hasMorningCheckIn = todayCheckIns.some(c => c.timeOfDay === 'morning');
    const hasRebuildConfigured =
      rebuildData.habits.length > 0 ||
      rebuildData.routines.length > 0 ||
      rebuildData.goals.length > 0;
    const hasAccountabilityConfigured =
      accountabilityData.partners.length > 0 ||
      accountabilityData.contracts.length > 0;

    const onboarding: WizardTask[] = [
      {
        id: 'onboard-core-profile',
        kind: 'onboarding',
        title: 'Set up your core profile',
        description: 'Share your name, addiction focus, triggers, and goals so your plan can adapt around you.',
        ctaLabel: (centralProfile?.hasCompletedOnboarding ?? profile.hasCompletedOnboarding) ? 'Review setup' : 'Begin setup',
        route: '/onboarding',
        priority: 100,
        isCompleted: centralProfile?.hasCompletedOnboarding ?? profile.hasCompletedOnboarding,
        icon: <Shield size={20} color={Colors.primary} />,
        pill: profile.hasCompletedOnboarding ? 'Done' : 'Required',
      },
      {
        id: 'onboard-protection-profile',
        kind: 'onboarding',
        title: 'Review your protection profile',
        description: 'See how your triggers, sleep, and support create your current protection score.',
        ctaLabel: 'Open protection profile',
        route: '/protection-profile',
        priority: 80,
        isCompleted:
          (centralProfile?.hasCompletedOnboarding ?? profile.hasCompletedOnboarding) &&
          (centralProfile?.recoveryProfile.triggers.length ?? profile.recoveryProfile.triggers.length) > 0,
        icon: <ShieldAlert size={20} color={Colors.primary} />,
      },
      {
        id: 'onboard-emergency-contacts',
        kind: 'onboarding',
        title: 'Add crisis support contacts',
        description: 'Add 1–3 trusted people so Crisis Mode can connect you quickly when things spike.',
        ctaLabel: emergencyContacts.length > 0 ? 'Manage contacts' : 'Add contacts',
        route: '/crisis-mode',
        priority: 70,
        isCompleted: emergencyContacts.length > 0,
        icon: <Users size={20} color={Colors.primary} />,
      },
      {
        id: 'onboard-daily-flow',
        kind: 'onboarding',
        title: 'Learn the daily flow',
        description: 'Understand the 7-step daily rhythm this app is built around.',
        ctaLabel: 'View daily flow',
        route: '/how-to-use',
        priority: 60,
        isCompleted: hasAnyCheckIn,
        icon: <BookOpen size={20} color={Colors.primary} />,
      },
      {
        id: 'onboard-rebuild',
        kind: 'onboarding',
        title: 'Set one rebuild action',
        description: 'Create at least one replacement habit, routine block, or purpose goal to start rebuilding.',
        ctaLabel: hasRebuildConfigured ? 'Review rebuild plan' : 'Set rebuild plan',
        route: '/rebuild',
        priority: 50,
        isCompleted: hasRebuildConfigured,
        icon: <Activity size={20} color={Colors.primary} />,
      },
      {
        id: 'onboard-accountability',
        kind: 'onboarding',
        title: 'Add accountability',
        description: 'Connect a partner or create a commitment contract so you are not walking alone.',
        ctaLabel: hasAccountabilityConfigured ? 'Review accountability' : 'Add accountability',
        route: '/accountability',
        priority: 40,
        isCompleted: hasAccountabilityConfigured,
        icon: <Users size={20} color={Colors.primary} />,
      },
    ];

    const isHighRisk = stabilityScore < 40;
    const isVeryHighRisk = stabilityScore < 25;

    const daily: WizardTask[] = [];

    if (!hasCurrentCheckIn) {
      daily.push({
        id: 'daily-checkin-current',
        kind: 'daily',
        title: `${effectivePeriod.charAt(0).toUpperCase() + effectivePeriod.slice(1)} check-in`,
        description: 'Log how you are arriving right now so your Stability Score and guidance stay accurate.',
        ctaLabel: 'Complete check-in',
        route: '/daily-checkin',
        priority: 120,
        isCompleted: false,
        icon: <Sun size={20} color={Colors.primary} />,
        pill: 'Top priority',
      });
    }

    if (isVeryHighRisk) {
      daily.push({
        id: 'daily-crisis-mode',
        kind: 'daily',
        title: 'Use Crisis Mode tools',
        description: 'Your recent data suggests today may be intense. Walk through grounding and urge tools before things spike.',
        ctaLabel: 'Open Crisis Mode',
        route: '/crisis-mode',
        priority: 110,
        isCompleted: false,
        icon: <ShieldAlert size={20} color={Colors.danger} />,
        pill: 'High support',
      });
    }

    if (hasMorningCheckIn && stabilityScore >= 40) {
      daily.push({
        id: 'daily-review-stability',
        kind: 'daily',
        title: 'Review what is impacting you',
        description: 'Look at your Stability Score drivers so you know which levers to lean on or protect today.',
        ctaLabel: 'Open Home insights',
        route: '/home',
        priority: 70,
        isCompleted: false,
        icon: <Activity size={20} color={Colors.primary} />,
      });
    }

    if (hasRebuildConfigured) {
      daily.push({
        id: 'daily-rebuild',
        kind: 'daily',
        title: 'Take one rebuild step',
        description: 'Choose one habit, routine block, or goal step from Rebuild and complete it today.',
        ctaLabel: 'Open Rebuild',
        route: '/rebuild',
        priority: 65,
        isCompleted: false,
        icon: <Heart size={20} color={Colors.primary} />,
      });
    }

    if (emergencyContacts.length > 0 || accountabilityData.partners.length > 0) {
      daily.push({
        id: 'daily-connection',
        kind: 'daily',
        title: 'Send one connection touchpoint',
        description: 'Send a quick message or check in with someone in your support circle.',
        ctaLabel: 'Go to Connection',
        route: '/connection',
        priority: 55,
        isCompleted: false,
        icon: <Users size={20} color={Colors.primary} />,
      });
    }

    const sortedOnboarding = onboarding
      .slice()
      .sort((a, b) => b.priority - a.priority);

    const sortedDaily = daily
      .slice()
      .sort((a, b) => b.priority - a.priority);

    return {
      onboardingTasks: sortedOnboarding,
      dailyTasks: sortedDaily,
    };
  }, [
    profile.hasCompletedOnboarding,
    profile.recoveryProfile.triggers,
    emergencyContacts.length,
    rebuildData.habits.length,
    rebuildData.routines.length,
    rebuildData.goals.length,
    accountabilityData.partners.length,
    accountabilityData.contracts.length,
    todayCheckIns,
    effectivePeriod,
    stabilityScore,
  ]);

  const hasRemainingOnboarding = onboardingTasks.some(t => !t.isCompleted);

  const visibleOnboarding = onboardingTasks.filter(t => !t.isCompleted);
  const completedOnboarding = onboardingTasks.filter(t => t.isCompleted);

  const handlePressTask = (task: WizardTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(resolveCanonicalRoute(task.route) as any);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {profile.hasCompletedOnboarding ? 'Your guidance for today' : 'Let’s get you fully set up'}
        </Text>
        <Text style={styles.subtitle}>
          This wizard looks at your current data and only surfaces what will move you forward right now.
        </Text>

        <View style={styles.modeChipsRow}>
          <View
            style={[
              styles.modeChip,
              hasRemainingOnboarding ? styles.modeChipActive : styles.modeChipInactive,
            ]}
          >
            <Text
              style={[
                styles.modeChipLabel,
                hasRemainingOnboarding ? styles.modeChipLabelActive : styles.modeChipLabelInactive,
              ]}
            >
              Onboarding
            </Text>
          </View>
          <View
            style={[
              styles.modeChip,
              styles.modeChipActive,
            ]}
          >
            <Text style={[styles.modeChipLabel, styles.modeChipLabelActive]}>
              Today
            </Text>
          </View>
        </View>

        {hasRemainingOnboarding && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Onboarding — next best steps</Text>
              <Text style={styles.sectionMeta}>
                {visibleOnboarding.length} remaining
              </Text>
            </View>
            {visibleOnboarding.map(task => (
              <Pressable
                key={task.id}
                style={({ pressed }) => [
                  styles.taskCard,
                  pressed && styles.taskCardPressed,
                ]}
                onPress={() => handlePressTask(task)}
                testID={`wizard-${task.id}`}
              >
                <View style={styles.taskIconWrap}>
                  {task.icon}
                </View>
                <View style={styles.taskTextWrap}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                  <View style={styles.taskFooterRow}>
                    <Text style={styles.taskCta}>{task.ctaLabel}</Text>
                    {task.pill && (
                      <View style={styles.pill}>
                        <CheckCircle2 size={12} color={Colors.primary} />
                        <Text style={styles.pillText}>{task.pill}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>
            ))}

            {completedOnboarding.length > 0 && (
              <View style={styles.completedRow}>
                <CheckCircle2 size={14} color={Colors.success} />
                <Text style={styles.completedText}>
                  {completedOnboarding.length} setup steps already complete — we’ll skip them for you.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Today’s guidance</Text>
          {dailyTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Heart size={20} color={Colors.primary} />
              <Text style={styles.emptyText}>
                You’re in a steady place based on your latest data. Keep using your daily flow — check-ins,
                one rebuild action, and staying connected.
              </Text>
            </View>
          ) : (
            dailyTasks.map(task => (
              <Pressable
                key={task.id}
                style={({ pressed }) => [
                  styles.taskCard,
                  pressed && styles.taskCardPressed,
                ]}
                onPress={() => handlePressTask(task)}
                testID={`wizard-${task.id}`}
              >
                <View style={styles.taskIconWrap}>
                  {task.icon}
                </View>
                <View style={styles.taskTextWrap}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                  <View style={styles.taskFooterRow}>
                    <Text style={styles.taskCta}>{task.ctaLabel}</Text>
                    {task.pill && (
                      <View style={styles.pill}>
                        <CheckCircle2 size={12} color={Colors.primary} />
                        <Text style={styles.pillText}>{task.pill}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginTop: 4,
  },
  modeChipsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 16,
  },
  modeChip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modeChipActive: {
    backgroundColor: Colors.primary + '22',
  },
  modeChipInactive: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeChipLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  modeChipLabelActive: {
    color: Colors.primary,
  },
  modeChipLabelInactive: {
    color: Colors.textSecondary,
  },
  section: {
    marginTop: 8,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  sectionMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  taskCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskCardPressed: {
    opacity: 0.92,
  },
  taskIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.surface,
  },
  taskTextWrap: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  taskDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  taskFooterRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 4,
  },
  taskCta: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.primary + '15',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  completedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 4,
  },
  completedText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

