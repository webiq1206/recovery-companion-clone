import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, BookOpen, Trash2, Lock, CheckCircle, BookMarked, PenLine, ChevronRight, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import Colors from '@/constants/colors';
import { useJournal } from '@/core/domains/useJournal';
import { useUser } from '@/core/domains/useUser';
import { useWorkbook } from '@/core/domains/useWorkbook';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { MOOD_EMOJIS } from '@/constants/milestones';
import { WORKBOOK_SECTIONS } from '@/constants/workbook';
import { JournalEntry } from '@/types';

type TabMode = 'journal' | 'workbook';

export default function JournalWorkbookScreen() {
  const router = useRouter();
  const { journal, deleteJournalEntry } = useJournal();
  const { daysSober } = useUser();
  const { getSectionProgress } = useWorkbook();
  const { hasFeature } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabMode>('journal');

  const handleNewEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/new-journal' as any);
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteJournalEntry(id);
        },
      },
    ]);
  }, [deleteJournalEntry]);

  const handleViewEntry = useCallback((entry: JournalEntry) => {
    router.push({ pathname: '/journal-detail' as any, params: { id: entry.id } });
  }, []);

  const hasPremium = hasFeature('deep_exercises');

  const handleSectionPress = useCallback((sectionId: string, isUnlocked: boolean, unlockDays: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!hasPremium) {
      router.push('/premium-upgrade' as any);
      return;
    }
    if (isUnlocked) {
      router.push({ pathname: '/workbook-section' as any, params: { id: sectionId } });
    } else {
      Alert.alert(
        'Section Locked',
        `Reach ${unlockDays} days sober to unlock this section. You need ${unlockDays - daysSober} more days!`
      );
    }
  }, [router, daysSober, hasPremium]);

  const handleTabSwitch = useCallback((tab: TabMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const renderJournalItem = useCallback(({ item }: { item: JournalEntry }) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <Pressable
        style={({ pressed }) => [styles.entryCard, pressed && styles.entryPressed]}
        onPress={() => handleViewEntry(item)}
        testID={`journal-entry-${item.id}`}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryMeta}>
            <Text style={styles.entryMood}>{MOOD_EMOJIS[(item.mood || 3) - 1]}</Text>
            <View>
              <Text style={styles.entryDate}>{formattedDate}</Text>
              <Text style={styles.entryTime}>{formattedTime}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleDelete(item.id)}
            hitSlop={12}
            style={styles.deleteBtn}
          >
            <Trash2 size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.entryTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.entryContent} numberOfLines={2}>{item.content}</Text>
      </Pressable>
    );
  }, [handleViewEntry, handleDelete]);

  const renderJournalEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <BookOpen size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Journal Entries</Text>
      <Text style={styles.emptyText}>
        Start documenting your recovery journey. Writing helps process emotions and track your growth.
      </Text>
    </View>
  ), []);

  const totalWorkbookProgress = useMemo(() => {
    let total = 0;
    let completed = 0;
    WORKBOOK_SECTIONS.forEach(section => {
      total += section.questions.length;
      completed += Math.round(getSectionProgress(section.id, section.questions.length) * section.questions.length);
    });
    return total > 0 ? completed / total : 0;
  }, [getSectionProgress]);

  return (
    <View style={styles.container}>
      <View style={styles.tabSwitcher}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'journal' && styles.tabBtnActive]}
          onPress={() => handleTabSwitch('journal')}
        >
          <PenLine size={16} color={activeTab === 'journal' ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'journal' && styles.tabBtnTextActive]}>Journal</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'workbook' && styles.tabBtnActive]}
          onPress={() => handleTabSwitch('workbook')}
        >
          <BookMarked size={16} color={activeTab === 'workbook' ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'workbook' && styles.tabBtnTextActive]}>Exercises</Text>
        </Pressable>
      </View>

      {activeTab === 'journal' ? (
        <View style={styles.journalContainer}>
          <FlatList
            data={journal}
            renderItem={renderJournalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderJournalEmpty}
          />
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={handleNewEntry}
            testID="new-journal-entry"
          >
            <Plus size={26} color={Colors.white} />
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.workbookContainer} contentContainerStyle={styles.workbookContent} showsVerticalScrollIndicator={false}>
          {!hasPremium ? (
            <Pressable
              style={({ pressed }) => [styles.upgradeBanner, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/premium-upgrade' as any);
              }}
              testID="exercises-upgrade-banner"
            >
              <View style={styles.upgradeBannerIcon}>
                <Crown size={22} color="#D4A574" />
              </View>
              <View style={styles.upgradeBannerText}>
                <Text style={styles.upgradeBannerTitle}>Recovery Exercises</Text>
                <Text style={styles.upgradeBannerDesc}>Upgrade to Premium to unlock all 25 exercises</Text>
              </View>
              <ChevronRight size={18} color="#D4A574" />
            </Pressable>
          ) : (
            <View style={styles.workbookHeader}>
              <Text style={styles.workbookTitle}>Recovery Exercises</Text>
              <Text style={styles.workbookSubtitle}>25 sections to guide your journey</Text>
              <View style={styles.overallProgressRow}>
                <View style={styles.overallProgressBg}>
                  <View style={[styles.overallProgressFill, { width: `${totalWorkbookProgress * 100}%` }]} />
                </View>
                <Text style={styles.overallProgressText}>{Math.round(totalWorkbookProgress * 100)}%</Text>
              </View>
            </View>
          )}

          {WORKBOOK_SECTIONS.map((section, index) => {
            const isMilestoneLocked = daysSober < section.unlockMilestoneDays;
            const isLocked = !hasPremium || isMilestoneLocked;
            const progress = hasPremium ? getSectionProgress(section.id, section.questions.length) : 0;
            const answeredCount = Math.round(progress * section.questions.length);

            return (
              <Pressable
                key={section.id}
                style={({ pressed }) => [styles.sectionCard, pressed && styles.entryPressed, isLocked && styles.sectionLocked]}
                onPress={() => handleSectionPress(section.id, !isLocked, section.unlockMilestoneDays)}
                testID={`workbook-section-${section.id}`}
              >
                <View style={styles.sectionLeft}>
                  <View style={[styles.sectionNumber, !isLocked ? styles.sectionNumberUnlocked : styles.sectionNumberLocked]}>
                    {!isLocked ? (
                      progress >= 1 ? (
                        <CheckCircle size={16} color={Colors.white} />
                      ) : (
                        <Text style={styles.sectionNumberText}>{index + 1}</Text>
                      )
                    ) : (
                      <Lock size={14} color={Colors.textMuted} />
                    )}
                  </View>
                </View>
                <View style={styles.sectionRight}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, isLocked && styles.sectionTitleLocked]} numberOfLines={1}>
                      {section.title}
                    </Text>
                    {!hasPremium ? (
                      <Crown size={14} color="#D4A574" />
                    ) : (
                      <ChevronRight size={16} color={!isLocked ? Colors.textSecondary : Colors.textMuted} />
                    )}
                  </View>
                  <Text style={[styles.sectionDescription, isLocked && styles.sectionDescLocked]} numberOfLines={1}>
                    {section.description}
                  </Text>
                  {!isLocked ? (
                    <View style={styles.sectionProgressRow}>
                      <View style={styles.sectionProgressBg}>
                        <View style={[styles.sectionProgressFill, { width: `${progress * 100}%` }]} />
                      </View>
                      <Text style={styles.sectionProgressText}>{answeredCount}/{section.questions.length}</Text>
                    </View>
                  ) : !hasPremium ? (
                    <Text style={styles.sectionPremiumText}>Premium</Text>
                  ) : (
                    <Text style={styles.sectionUnlockText}>
                      Unlock at {section.unlockMilestoneDays} days
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  journalContainer: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  entryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  entryPressed: {
    opacity: 0.85,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entryMood: {
    fontSize: 22,
  },
  entryDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  entryTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  entryContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  workbookContainer: {
    flex: 1,
  },
  workbookContent: {
    padding: 20,
    paddingBottom: 40,
  },
  workbookHeader: {
    marginBottom: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  workbookTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  workbookSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  overallProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overallProgressBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  overallProgressText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  sectionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
    alignItems: 'center',
  },
  sectionLocked: {
    opacity: 0.55,
  },
  sectionLeft: {
    alignItems: 'center',
  },
  sectionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberUnlocked: {
    backgroundColor: Colors.primary,
  },
  sectionNumberLocked: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  sectionRight: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  sectionTitleLocked: {
    color: Colors.textMuted,
  },
  sectionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  sectionDescLocked: {
    color: Colors.textMuted,
  },
  sectionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionProgressBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sectionProgressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  sectionProgressText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    minWidth: 32,
    textAlign: 'right',
  },
  sectionUnlockText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
    gap: 12,
  },
  upgradeBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(212,165,116,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#D4A574',
    marginBottom: 2,
  },
  upgradeBannerDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionPremiumText: {
    fontSize: 11,
    color: '#D4A574',
    fontWeight: '600' as const,
  },
});
