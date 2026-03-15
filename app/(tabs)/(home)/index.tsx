<<<<<<< HEAD
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import {
  ArrowRight, BookOpen, Sun, AlertTriangle, TrendingUp, Users,
  TrendingDown, Minus, Heart, AlertCircle, ListChecks,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
=======
import React from 'react';
import { Redirect } from 'expo-router';
>>>>>>> 75b52c54d2e5ec0c8d295246829ed77117437b62
import { useRecovery } from '@/providers/RecoveryProvider';
import { HomeLoadingSkeleton } from '@/components/LoadingSkeleton';

export default function HomeScreenRedirect() {
  const { profile, isLoading } = useRecovery();

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (!profile.hasCompletedOnboarding) {
    return <Redirect href={'/onboarding' as any} />;
  }

<<<<<<< HEAD
  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + 72 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Stability Score — Primary Focus */}
        <Text style={styles.stabilityScoreLabel}>Stability Score</Text>
        <View style={styles.scoreSection}>
          <ProtectionScoreCircle
            score={stabilityResult.score}
            status={stabilityResult.status as ProtectionStatus}
            size={160}
          />
          <View style={styles.scoreMetaRow}>
            <Text style={styles.scoreStatusText}>{stabilityResult.status}</Text>
            <View style={styles.trendBadge}>
              <TrendIcon size={14} color={Colors.textSecondary} />
              <Text style={styles.trendText}>{trendLabel}</Text>
            </View>
            <Text style={styles.changeText}>
              {stabilityResult.changeFromYesterday >= 0 ? '+' : ''}{stabilityResult.changeFromYesterday} from yesterday
            </Text>
          </View>
          <Text style={styles.buildingToward}>
            Building toward: {userRebuildGoal}
          </Text>
        </View>

        {/* 2. Impact Section — What's Impacting Your Stability */}
        <Text style={styles.sectionTitle}>What's Impacting Your Stability</Text>
        <View style={styles.impactCard}>
          {stabilityResult.drivers.positive.length > 0 && (
            <View style={styles.driverBlock}>
              <View style={styles.driverHeader}>
                <Heart size={14} color="#4CAF50" />
                <Text style={styles.driverLabel}>Positive</Text>
              </View>
              {stabilityResult.drivers.positive.map((d, i) => (
                <Text key={`p-${i}`} style={styles.driverItem}>• {d}</Text>
              ))}
            </View>
          )}
          {stabilityResult.drivers.negative.length > 0 && (
            <View style={styles.driverBlock}>
              <View style={styles.driverHeader}>
                <AlertCircle size={14} color={Colors.textMuted} />
                <Text style={styles.driverLabel}>To watch</Text>
              </View>
              {stabilityResult.drivers.negative.map((d, i) => (
                <Text key={`n-${i}`} style={styles.driverItem}>• {d}</Text>
              ))}
            </View>
          )}
          {stabilityResult.drivers.positive.length === 0 && stabilityResult.drivers.negative.length === 0 && (
            <Text style={styles.driverEmpty}>Complete a check-in to see what's impacting your stability.</Text>
          )}
        </View>

        {/* 3. Stability Builder — Visually dominant required actions */}
        <Pressable
          style={({ pressed }) => [styles.dailyGuidanceCard, pressed && styles.dailyGuidanceCardPressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/daily-guidance' as any);
          }}
          testID="daily-guidance-cta"
        >
          <ListChecks size={24} color={Colors.primary} />
          <View style={styles.dailyGuidanceTextWrap}>
            <Text style={styles.dailyGuidanceTitle}>What to do today</Text>
            <Text style={styles.dailyGuidanceSubtitle}>
              Get a prioritized list of actions based on your progress and state.
            </Text>
          </View>
          <ArrowRight size={20} color={Colors.primary} />
        </Pressable>

        <Text style={styles.builderTitle}>Build Stability Today</Text>
        <View style={styles.builderCard}>
          <Pressable
            style={({ pressed }) => [styles.builderRow, pressed && styles.builderRowPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/daily-checkin' as any);
            }}
            testID="plan-checkin"
          >
            <View style={styles.builderIconWrap}>
              <Sun size={22} color={Colors.primary} />
            </View>
            <View style={styles.builderTextWrap}>
              <Text style={styles.builderRowTitle}>
                {period === 'morning' ? 'Morning' : period === 'afternoon' ? 'Afternoon' : 'Evening'} Check-In
              </Text>
              <Text style={styles.builderRowSubtitle}>
                Set how you're arriving and one gentle intention.
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.builderRow, pressed && styles.builderRowPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/triggers' as any);
            }}
            testID="plan-triggers"
          >
            <View style={styles.builderIconWrap}>
              <AlertTriangle size={22} color={Colors.primary} />
            </View>
            <View style={styles.builderTextWrap}>
              <Text style={styles.builderRowTitle}>Trigger Review</Text>
              <Text style={styles.builderRowSubtitle}>
                Plan around one situation today.
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.builderRow, pressed && styles.builderRowPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/rebuild' as any);
            }}
            testID="plan-rebuild"
          >
            <View style={styles.builderIconWrap}>
              <TrendingUp size={22} color={Colors.primary} />
            </View>
            <View style={styles.builderTextWrap}>
              <Text style={styles.builderRowTitle}>One Rebuild Action</Text>
              <Text style={styles.builderRowSubtitle}>
                One small action toward your goal.
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* 4. Optional Tools — Secondary */}
        <Text style={styles.optionalTitle}>Optional tools</Text>
        <View style={styles.quickActionsRow}>
          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/journal' as any);
            }}
            testID="journal-exercises-cta"
          >
            <BookOpen size={22} color={Colors.primary} />
            <Text style={styles.quickActionText}>Journal</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/crisis-mode' as any);
            }}
            testID="crisis-mode-cta"
          >
            <AlertTriangle size={22} color={Colors.primary} />
            <Text style={styles.quickActionText}>Crisis Mode</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/community' as any);
            }}
            testID="community-cta"
          >
            <Users size={22} color={Colors.primary} />
            <Text style={styles.quickActionText}>Community</Text>
          </Pressable>
        </View>
        {/* 5. Conditional support banner (calm, not alarming) — when score < 40 */}
        {showSupportBanner && (
          <View style={styles.supportBanner}>
            <Heart size={20} color={Colors.primary} />
            <Text style={styles.supportBannerText}>
              Today may require extra support. You're still building.
            </Text>
          </View>
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
  },
  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(46,196,182,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.25)',
  },
  supportBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  stabilityScoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  scoreStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  changeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  buildingToward: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  impactCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverBlock: {
    marginBottom: 12,
  },
  driverBlockLast: {
    marginBottom: 0,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  driverLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  driverItem: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
    marginBottom: 2,
  },
  driverEmpty: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  dailyGuidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.primary + '14',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  dailyGuidanceCardPressed: {
    opacity: 0.95,
  },
  dailyGuidanceTextWrap: {
    flex: 1,
  },
  dailyGuidanceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  dailyGuidanceSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  builderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  builderCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  builderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 14,
  },
  builderRowPressed: {
    opacity: 0.9,
  },
  builderIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(46,196,182,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderTextWrap: {
    flex: 1,
  },
  builderRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  builderRowSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  optionalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionPressed: {
    opacity: 0.9,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
});
=======
  return <Redirect href={'/(tabs)/(home)/today-hub' as any} />;
}
>>>>>>> 75b52c54d2e5ec0c8d295246829ed77117437b62
