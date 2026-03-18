import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ClipboardCheck, Shield, Check, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { usePledges } from '@/core/domains/usePledges';
import { Pledge } from '@/types';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/constants/milestones';

export default function FirstDayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUser();
  const { todayCheckIn } = useCheckin();
  const { todayPledge, addPledge } = usePledges();
  const [pledgeMood, setPledgeMood] = useState<number>(3);

  const checkInDone = !!todayCheckIn;
  const pledgeDone = !!todayPledge;

  const handleOpenCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/daily-checkin' as any);
  };

  const handleTakePledge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date().toISOString().split('T')[0];
    const newPledge: Pledge = {
      id: Date.now().toString(),
      date: today,
      completed: true,
      feeling: pledgeMood,
      note: '',
    };
    addPledge(newPledge);
  };

  const handleGoToHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/(home)' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your First Day</Text>
        <Text style={styles.subtitle}>
          Two quick steps to set you up: your first check-in and your first pledge. Then you’re ready to use the app.
        </Text>

        {/* Step 1: First check-in */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepBadge, checkInDone && styles.stepBadgeDone]}>
              {checkInDone ? <Check size={18} color="#FFF" /> : <Text style={styles.stepNumber}>1</Text>}
            </View>
            <Text style={styles.cardTitle}>First check-in</Text>
          </View>
          {checkInDone ? (
            <View style={styles.doneRow}>
              <Check size={20} color={Colors.primary} />
              <Text style={styles.doneText}>You’ve completed your first check-in.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.cardDesc}>
                A short, guided check-in helps calibrate your protection. It only takes a minute.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                onPress={handleOpenCheckIn}
                testID="first-day-checkin-btn"
              >
                <ClipboardCheck size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Do my first check-in</Text>
                <ChevronRight size={18} color="#FFF" />
              </Pressable>
            </>
          )}
        </View>

        {/* Step 2: First pledge */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepBadge, pledgeDone && styles.stepBadgeDone]}>
              {pledgeDone ? <Check size={18} color="#FFF" /> : <Text style={styles.stepNumber}>2</Text>}
            </View>
            <Text style={styles.cardTitle}>First pledge</Text>
          </View>
          {pledgeDone ? (
            <View style={styles.doneRow}>
              <Check size={20} color={Colors.primary} />
              <Text style={styles.doneText}>You’ve taken today’s pledge.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.cardDesc}>
                Commit to today. Choose how you’re feeling and take your first pledge.
              </Text>
              <Text style={styles.moodLabel}>How are you feeling?</Text>
              <View style={styles.moodRow}>
                {MOOD_EMOJIS.map((emoji, index) => (
                  <Pressable
                    key={index}
                    style={[styles.moodBtn, pledgeMood === index + 1 && styles.moodBtnActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPledgeMood(index + 1);
                    }}
                    testID={`first-day-mood-${index + 1}`}
                  >
                    <Text style={styles.moodEmoji}>{emoji}</Text>
                    <Text style={[styles.moodBtnLabel, pledgeMood === index + 1 && styles.moodBtnLabelActive]}>
                      {MOOD_LABELS[index]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                onPress={handleTakePledge}
                testID="first-day-pledge-btn"
              >
                <Shield size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>I take this pledge</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Go to Home - show when at least check-in is done, or both; always show if both done */}
        {(checkInDone || pledgeDone) && (
          <Pressable
            style={({ pressed }) => [styles.homeBtn, pressed && styles.primaryBtnPressed]}
            onPress={handleGoToHome}
            testID="first-day-go-home"
          >
            <Text style={styles.homeBtnText}>
              {checkInDone && pledgeDone ? "You're all set — go to Home" : 'Go to Home'}
            </Text>
            <ChevronRight size={20} color={Colors.primary} />
          </Pressable>
        )}
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
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doneText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  moodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 64,
  },
  moodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  moodBtnLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  moodBtnLabelActive: {
    color: Colors.primary,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
