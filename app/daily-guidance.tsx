import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { ChevronRight, Check, Sun, Shield, AlertTriangle, Target, BookOpen, Heart, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { usePledges } from '@/core/domains/usePledges';
import { useSupportContacts } from '@/core/domains/useSupportContacts';
import { useAccountability } from '@/core/domains/useAccountability';
import { useAppMeta } from '@/core/domains/useAppMeta';
import { useJournal } from '@/core/domains/useJournal';
import { useRebuild } from '@/core/domains/useRebuild';
import { getDailyGuidanceActions } from '@/utils/wizardSteps';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  checkin_morning: <Sun size={22} color={Colors.primary} />,
  checkin_afternoon: <Sun size={22} color={Colors.primary} />,
  checkin_evening: <Sun size={22} color={Colors.primary} />,
  pledge: <Shield size={22} color={Colors.primary} />,
  emergency_contact: <AlertTriangle size={22} color={Colors.primary} />,
  trigger_review: <AlertTriangle size={22} color={Colors.primary} />,
  rebuild_action: <Target size={22} color={Colors.primary} />,
  journal: <BookOpen size={22} color={Colors.primary} />,
  crisis_tools: <Heart size={22} color={Colors.primary} />,
  accountability: <Users size={22} color={Colors.primary} />,
};

function getIconForAction(id: string): React.ReactNode {
  return ACTION_ICONS[id] ?? <Target size={22} color={Colors.primary} />;
}

export default function DailyGuidanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUser();
  const { todayCheckIns, currentCheckInPeriod } = useCheckin();
  const { todayPledge } = usePledges();
  const { emergencyContacts } = useSupportContacts();
  const { accountabilityData } = useAccountability();
  const { stabilityScore } = useAppMeta();
  const { journal } = useJournal();
  const { rebuildData } = useRebuild();

  const hasJournalEntryToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return journal.some((e) => e.date === today);
  }, [journal]);

  const rebuildGoalsCount = useMemo(
    () => (rebuildData?.goals?.length ?? 0) + (rebuildData?.habits?.length ?? 0),
    [rebuildData]
  );

  const actions = useMemo(
    () =>
      getDailyGuidanceActions({
        profile,
        todayCheckIns,
        todayPledge,
        emergencyContacts,
        accountabilityData: accountabilityData ?? null,
        stabilityScore,
        currentCheckInPeriod,
        hasJournalEntryToday,
        rebuildGoalsCount,
        identityCurrentWeek: rebuildData?.identityProgram?.currentWeek ?? 0,
      }),
    [
      profile,
      todayCheckIns,
      todayPledge,
      emergencyContacts,
      accountabilityData,
      stabilityScore,
      currentCheckInPeriod,
      hasJournalEntryToday,
      rebuildGoalsCount,
      rebuildData?.identityProgram?.currentWeek,
    ]
  );

  const incompleteCount = actions.filter((a) => !a.completed).length;

  if (!profile.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>Your Day</Text>
      <Text style={styles.subtitle}>
        {incompleteCount === 0
          ? "You're all set for today. Come back tomorrow for new suggestions."
          : `Based on your progress, here are ${incompleteCount} recommended action${incompleteCount === 1 ? '' : 's'} for today.`}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {actions.map((action, index) => {
          const isCompleted = action.completed;
          const stepNum = index + 1;
          const icon = getIconForAction(action.id);

          return (
            <View key={action.id} style={[styles.card, isCompleted && styles.cardCompleted]}>
              <View style={styles.cardHeader}>
                <View style={[styles.stepBadge, isCompleted && styles.stepBadgeDone]}>
                  {isCompleted ? (
                    <Check size={18} color="#FFF" />
                  ) : (
                    <Text style={styles.stepNumber}>{stepNum}</Text>
                  )}
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={[styles.cardTitle, isCompleted && styles.cardTitleDone]}>{action.title}</Text>
                  {action.reason && !isCompleted && (
                    <Text style={styles.reason}>{action.reason}</Text>
                  )}
                </View>
              </View>
              <Text style={[styles.cardSubtitle, isCompleted && styles.cardSubtitleDone]}>{action.subtitle}</Text>
              {!isCompleted && (
                <Pressable
                  style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(action.route as any);
                  }}
                  testID={`daily-guidance-${action.id}`}
                >
                  <View style={styles.ctaIconWrap}>{icon}</View>
                  <Text style={styles.ctaText}>
                    {action.id.startsWith('checkin') ? 'Do check-in' : action.id === 'pledge' ? 'Take pledge' : 'Open'}
                  </Text>
                  <ChevronRight size={18} color={Colors.primary} />
                </Pressable>
              )}
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
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompleted: {
    borderColor: Colors.primary + '40',
    backgroundColor: 'rgba(46,196,182,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeDone: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  cardTitleDone: {
    color: Colors.textSecondary,
  },
  reason: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardSubtitleDone: {
    color: Colors.textMuted,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(46,196,182,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(46,196,182,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
