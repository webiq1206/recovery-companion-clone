import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HandHeart, Check, Flame, Sunrise, Shield, Star, Award, Trophy, Crown, Gem, Medal, Infinity, Mountain, Sun, Lock, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { usePledges } from '@/core/domains/usePledges';
import { MOOD_EMOJIS, MOOD_LABELS, MILESTONE_DATA } from '@/constants/milestones';
import { Pledge } from '@/types';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  sunrise: Sunrise,
  flame: Flame,
  shield: Shield,
  star: Star,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
  medal: Medal,
  infinity: Infinity,
  mountain: Mountain,
  sun: Sun,
};

export default function PledgesScreen() {
  const { profile, daysSober } = useUser();
  const { todayPledge, pledges, currentStreak, addPledge } = usePledges();
  const [selectedMood, setSelectedMood] = useState<number>(3);
  const [note, setNote] = useState<string>('');
  const [milestonesExpanded, setMilestonesExpanded] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'pledge' | 'milestones'>('pledge');
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<{ pledge: number; milestones: number }>({ pledge: 0, milestones: 0 });

  const nextMilestone = useMemo(() => {
    return MILESTONE_DATA.find(m => m.days > daysSober);
  }, [daysSober]);

  const unlockedCount = useMemo(() => {
    return MILESTONE_DATA.filter(m => m.days <= daysSober).length;
  }, [daysSober]);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (todayPledge) {
      Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
    }
  }, [todayPledge]);

  const handleTakePledge = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const today = new Date().toISOString().split('T')[0];
    const newPledge: Pledge = {
      id: Date.now().toString(),
      date: today,
      completed: true,
      feeling: selectedMood,
      note: note.trim(),
    };
    addPledge(newPledge);

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, tension: 100, friction: 5 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();
  }, [selectedMood, note, addPledge]);

  const recentPledges = pledges.slice(0, 7);

  const renderMilestonesSection = useCallback(() => {
    const displayMilestones = milestonesExpanded ? MILESTONE_DATA : MILESTONE_DATA.slice(0, 4);

    return (
      <View style={styles.milestonesSection}>
        <View style={styles.milestonesDivider}>
          <View style={styles.milestonesDividerLine} />
          <Text style={styles.milestonesDividerLabel}>MILESTONES</Text>
          <View style={styles.milestonesDividerLine} />
        </View>
        <View style={styles.milestonesSectionHeader}>
          <View style={styles.milestonesTitleRow}>
            <Trophy size={18} color={Colors.primary} />
            <Text style={styles.milestonesSectionTitle}>Milestones</Text>
          </View>
          <Text style={styles.milestonesSubtitle}>
            {unlockedCount}/{MILESTONE_DATA.length} unlocked
            {nextMilestone ? ` · ${nextMilestone.days - daysSober}d to next` : ''}
          </Text>
        </View>

        {displayMilestones.map((milestone, index) => {
          const unlocked = daysSober >= milestone.days;
          const IconComponent = ICON_MAP[milestone.icon] ?? Star;
          const progress = unlocked ? 1 : Math.min(daysSober / milestone.days, 1);

          return (
            <View
              key={milestone.days}
              style={styles.msCard}
              testID={`milestone-${milestone.days}`}
            >
              <View style={styles.msLeft}>
                <View style={[styles.msIconContainer, unlocked ? styles.msIconUnlocked : styles.msIconLocked]}>
                  {unlocked ? (
                    <IconComponent size={18} color={Colors.white} />
                  ) : (
                    <Lock size={14} color={Colors.textMuted} />
                  )}
                </View>
                {index < displayMilestones.length - 1 && (
                  <View style={[styles.msConnector, unlocked && styles.msConnectorUnlocked]} />
                )}
              </View>

              <View style={styles.msRight}>
                <View style={styles.msHeader}>
                  <Text style={[styles.msTitle, !unlocked && styles.msTextLocked]}>
                    {milestone.title}
                  </Text>
                  <Text style={[styles.msDays, unlocked && styles.msDaysUnlocked]}>
                    {milestone.days}d
                  </Text>
                </View>
                <Text style={[styles.msDesc, !unlocked && styles.msTextLocked]} numberOfLines={2}>
                  {milestone.description}
                </Text>
                {!unlocked && (
                  <View style={styles.msProgressContainer}>
                    <View style={styles.msProgressBg}>
                      <View style={[styles.msProgressFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>
                )}
                {unlocked && (
                  <Text style={styles.msUnlockedText}>Achieved</Text>
                )}
              </View>
            </View>
          );
        })}

        <Pressable
          style={styles.msToggle}
          onPress={() => {
            Haptics.selectionAsync();
            setMilestonesExpanded(!milestonesExpanded);
          }}
          testID="toggle-milestones"
        >
          {milestonesExpanded ? (
            <ChevronUp size={16} color={Colors.primary} />
          ) : (
            <ChevronDown size={16} color={Colors.primary} />
          )}
          <Text style={styles.msToggleText}>
            {milestonesExpanded ? 'Show Less' : `Show All ${MILESTONE_DATA.length} Milestones`}
          </Text>
        </Pressable>
      </View>
    );
  }, [milestonesExpanded, daysSober, unlockedCount, nextMilestone]);

  const renderNavButtons = useCallback(() => (
    <View style={styles.navButtonsContainer}>
      <Pressable
        style={[styles.navButton, activeSection === 'pledge' && styles.navButtonActive]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveSection('pledge');
          scrollRef.current?.scrollTo({ y: sectionOffsets.current.pledge, animated: true });
        }}
        testID="nav-pledge"
      >
        <HandHeart size={16} color={activeSection === 'pledge' ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.navButtonText, activeSection === 'pledge' && styles.navButtonTextActive]}>Pledge</Text>
      </Pressable>
      <Pressable
        style={[styles.navButton, activeSection === 'milestones' && styles.navButtonActive]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveSection('milestones');
          scrollRef.current?.scrollTo({ y: sectionOffsets.current.milestones, animated: true });
        }}
        testID="nav-milestones"
      >
        <Trophy size={16} color={activeSection === 'milestones' ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.navButtonText, activeSection === 'milestones' && styles.navButtonTextActive]}>Milestones</Text>
      </Pressable>
    </View>
  ), [activeSection]);

  if (todayPledge) {
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderNavButtons()}
        <View onLayout={(e: LayoutChangeEvent) => { sectionOffsets.current.pledge = e.nativeEvent.layout.y; }} />
        <Animated.View style={[styles.completedContainer, { transform: [{ scale: Animated.add(scaleAnim, checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })).interpolate({ inputRange: [0, 1, 2], outputRange: [0.8, 1, 1.05] }) }] }]}>
          <LinearGradient
            colors={['#1B3A4B', '#0D2137']}
            style={styles.completedGradient}
          >
            <View style={styles.checkCircle}>
              <Check size={36} color={Colors.white} strokeWidth={3} />
            </View>
            <Text style={styles.completedTitle}>Pledge Complete</Text>
            <Text style={styles.completedSubtitle}>
              You committed to being free from {profile.addictions?.length > 0 ? profile.addictions.join(', ') : 'your addiction'} today
            </Text>
            <View style={styles.completedMood}>
              <Text style={styles.moodEmoji}>{MOOD_EMOJIS[todayPledge.feeling - 1]}</Text>
              <Text style={styles.moodText}>Feeling {MOOD_LABELS[todayPledge.feeling - 1]}</Text>
            </View>
            {todayPledge.note ? (
              <Text style={styles.completedNote}>"{todayPledge.note}"</Text>
            ) : null}
          </LinearGradient>
        </Animated.View>

        <View style={styles.streakCard}>
          <Flame size={20} color={Colors.accent} />
          <Text style={styles.streakText}>{currentStreak} day pledge streak</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Pledges</Text>
        {recentPledges.map((pledge) => (
          <View key={pledge.id} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyEmoji}>{MOOD_EMOJIS[pledge.feeling - 1]}</Text>
              <View>
                <Text style={styles.historyDate}>
                  {new Date(pledge.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                {pledge.note ? <Text style={styles.historyNote} numberOfLines={1}>{pledge.note}</Text> : null}
              </View>
            </View>
            <Check size={16} color={Colors.primary} />
          </View>
        ))}
        <View onLayout={(e: LayoutChangeEvent) => { sectionOffsets.current.milestones = e.nativeEvent.layout.y; }} />
        {renderMilestonesSection()}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={[0]}
    >
      {renderNavButtons()}
      <View onLayout={(e: LayoutChangeEvent) => { sectionOffsets.current.pledge = e.nativeEvent.layout.y; }} />
      <View style={styles.pledgeHeader}>
        <HandHeart size={40} color={Colors.primary} />
        <Text style={styles.pledgeTitle}>Today's Pledge</Text>
        <Text style={styles.pledgeSubtitle}>
          I pledge to stay free from {profile.addictions?.length > 0 ? profile.addictions.join(', ') : 'my addiction'} today
        </Text>
      </View>

      <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
      <View style={styles.moodRow}>
        {MOOD_EMOJIS.map((emoji, index) => (
          <Pressable
            key={index}
            style={[styles.moodButton, selectedMood === index + 1 && styles.moodSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedMood(index + 1);
            }}
            testID={`mood-${index + 1}`}
          >
            <Text style={styles.moodButtonEmoji}>{emoji}</Text>
            <Text style={[styles.moodButtonLabel, selectedMood === index + 1 && styles.moodLabelSelected]}>
              {MOOD_LABELS[index]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ADD A NOTE (OPTIONAL)</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="How are you feeling today?"
        placeholderTextColor={Colors.textMuted}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={200}
        testID="pledge-note"
      />

      <Pressable
        style={({ pressed }) => [styles.pledgeButton, pressed && styles.pledgeButtonPressed]}
        onPress={handleTakePledge}
        testID="take-pledge"
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.pledgeButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.pledgeButtonText}>I Take This Pledge</Text>
        </LinearGradient>
      </Pressable>

      {currentStreak > 0 && (
        <View style={styles.streakCard}>
          <Flame size={20} color={Colors.accent} />
          <Text style={styles.streakText}>{currentStreak} day pledge streak</Text>
        </View>
      )}

      <View onLayout={(e: LayoutChangeEvent) => { sectionOffsets.current.milestones = e.nativeEvent.layout.y; }} />
      {renderMilestonesSection()}
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
    paddingBottom: 100,
  },
  pledgeHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  pledgeTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  pledgeSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 6,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  moodSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.1)',
  },
  moodButtonEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  moodButtonLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  moodLabelSelected: {
    color: Colors.primary,
  },
  noteInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    color: Colors.text,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  pledgeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  pledgeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  pledgeButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  pledgeButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  completedContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  completedGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  completedMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  completedNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyEmoji: {
    fontSize: 20,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  historyNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  navButtonTextActive: {
    color: Colors.white,
  },
  milestonesDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  milestonesDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  milestonesDividerLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  milestonesSection: {
    marginTop: 32,
    marginBottom: 20,
    paddingTop: 8,
  },
  milestonesSectionHeader: {
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  milestonesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  milestonesSectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  milestonesSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 26,
  },
  msCard: {
    flexDirection: 'row',
    minHeight: 80,
  },
  msLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: 12,
  },
  msIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  msIconUnlocked: {
    backgroundColor: Colors.primary,
  },
  msIconLocked: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  msConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: -2,
    marginBottom: -2,
  },
  msConnectorUnlocked: {
    backgroundColor: Colors.primary,
  },
  msRight: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  msHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  msTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  msDays: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  msDaysUnlocked: {
    color: Colors.primary,
  },
  msDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  msTextLocked: {
    opacity: 0.5,
  },
  msProgressContainer: {
    marginTop: 8,
  },
  msProgressBg: {
    height: 3,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  msProgressFill: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  msUnlockedText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  msToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  msToggleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
