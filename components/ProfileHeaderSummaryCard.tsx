import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { User, EyeOff, Crown } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useUser } from '../core/domains/useUser';
import { usePledges } from '../core/domains/usePledges';
import { useJournal } from '../core/domains/useJournal';
import { useSubscription } from '../providers/SubscriptionProvider';
import type { RecoveryStage, UserProfile } from '../types';

const STAGE_CONFIG: Record<
  RecoveryStage,
  { label: string; color: string; icon: string; description: string }
> = {
  crisis: { label: 'Crisis', color: '#EF5350', icon: 'alert', description: 'Navigating the hardest moments' },
  stabilize: { label: 'Stabilize', color: '#FF9800', icon: 'anchor', description: 'Building a steady foundation' },
  rebuild: { label: 'Rebuild', color: '#42A5F5', icon: 'hammer', description: 'Reconstructing your life with purpose' },
  maintain: { label: 'Maintain', color: '#66BB6A', icon: 'shield', description: 'Sustaining long-term growth' },
};

export type ProfileHeaderSummaryCardProps = {
  /** When set (e.g. merged central + local profile), used for name, dates, stage, privacy. */
  profile?: UserProfile | null;
  /** When set, replaces the name row with this text, centered across the full card width. */
  centeredHeadline?: string;
  testID?: string;
};

export function ProfileHeaderSummaryCard({
  profile: profileProp,
  centeredHeadline,
  testID,
}: ProfileHeaderSummaryCardProps) {
  const { profile: userProfile, daysSober } = useUser();
  const profile = profileProp ?? userProfile;
  const { currentStreak } = usePledges();
  const { journal } = useJournal();
  const { isPremium } = useSubscription();

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerOpacity]);

  const anonymousName = useMemo(() => {
    if (centeredHeadline) return '';
    if (!profile.privacyControls?.isAnonymous) return profile.name || 'Friend';
    const hash = (profile.soberDate || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const adjectives = ['Brave', 'Calm', 'Kind', 'Strong', 'Steady', 'Wise', 'Gentle', 'Bold'];
    const nouns = ['Phoenix', 'River', 'Mountain', 'Star', 'Oak', 'Wave', 'Light', 'Path'];
    return `${adjectives[hash % adjectives.length]} ${nouns[(hash * 7) % nouns.length]}`;
  }, [centeredHeadline, profile.privacyControls?.isAnonymous, profile.name, profile.soberDate]);

  const soberDate = new Date(profile.soberDate);
  const formattedSoberDate = soberDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const currentStage = profile.recoveryProfile?.recoveryStage ?? 'crisis';
  const stageConfig = STAGE_CONFIG[currentStage];
  const privacyControls = profile.privacyControls ?? {
    isAnonymous: false,
    shareProgress: false,
    shareMood: false,
    allowCommunityMessages: true,
  };

  return (
    <Animated.View style={[styles.headerCard, { opacity: headerOpacity }]} testID={testID}>
      {centeredHeadline ? (
        <View style={styles.headlineCenteredWrap}>
          <Text style={styles.headlineCenteredText}>{centeredHeadline}</Text>
        </View>
      ) : null}
      <View style={styles.avatarRow}>
        <View style={[styles.avatarCircle, { borderColor: stageConfig.color }]}>
          <User size={30} color={stageConfig.color} />
        </View>
        <View style={styles.headerInfo}>
          {!centeredHeadline ? (
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {anonymousName}
              </Text>
              {privacyControls.isAnonymous && (
                <View style={styles.anonBadge}>
                  <EyeOff size={10} color={Colors.textSecondary} />
                  <Text style={styles.anonBadgeText}>Anonymous</Text>
                </View>
              )}
            </View>
          ) : null}
          <Text style={styles.soberSince}>Sober since {formattedSoberDate}</Text>
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{daysSober}</Text>
              <Text style={styles.quickStatLabel} numberOfLines={2}>
                {'Days\nsober'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{currentStreak}</Text>
              <Text style={styles.quickStatLabel} numberOfLines={2}>
                {'Pledge\nstreak'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{journal.length}</Text>
              <Text style={styles.quickStatLabel} numberOfLines={2}>
                {'Journal\nentries'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {isPremium && (
        <View style={styles.premiumStrip}>
          <Crown size={13} color="#D4A574" />
          <Text style={styles.premiumStripText}>Premium Member</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  headlineCenteredWrap: {
    width: '100%',
    marginBottom: 14,
    alignItems: 'center',
  },
  headlineCenteredText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    marginRight: 14,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    flexShrink: 1,
  },
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  anonBadgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  soberSince: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  quickStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
    lineHeight: 13,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  premiumStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,165,116,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  premiumStripText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#D4A574',
  },
});
