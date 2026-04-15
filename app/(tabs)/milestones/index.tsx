import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Alert,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
import {
  Sunrise,
  Flame,
  Shield,
  Star,
  Award,
  Trophy,
  Crown,
  Gem,
  Medal,
  Mountain,
  Sun,
  Lock,
  Heart,
  Zap,
  TrendingUp,
  CheckCircle,
  Users,
  Compass,
  Anchor,
  Sparkles,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Minus,
  Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../../constants/colors';
import { useUser } from '../../../core/domains/useUser';
import { useCheckin } from '../../../core/domains/useCheckin';
import { useJournal } from '../../../core/domains/useJournal';
import { usePledges } from '../../../core/domains/usePledges';
import { useEngagement } from '../../../providers/EngagementProvider';
import { MILESTONE_DATA } from '../../../constants/milestones';
import { MILESTONE_SHARE_MESSAGES, SHAREABLE_FOOTER, BRAND } from '../../../constants/branding';
import { MicroWin, GrowthDimension } from '../../../types';
import { Share2, X as XIcon, ShieldCheck as ShieldCheckBrand, Eye, EyeOff } from 'lucide-react-native';

const MILESTONE_ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  sunrise: Sunrise,
  flame: Flame,
  shield: Shield,
  star: Star,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
  medal: Medal,
  mountain: Mountain,
  sun: Sun,
};

const WIN_ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'clipboard-check': CheckCircle,
  'pen-line': Heart,
  'hand-heart': ShieldCheck,
  'check-circle': CheckCircle,
  'sprout': TrendingUp,
  'users': Users,
  'shield': Shield,
  'trending-up': TrendingUp,
  'flame': Flame,
  'star': Star,
  'award': Award,
  'trophy': Trophy,
  'compass': Compass,
  'mountain': Mountain,
  'anchor': Anchor,
};

const CATEGORY_COLORS: Record<string, string> = {
  consistency: '#2EC4B6',
  emotional: '#66BB6A',
  social: '#AB47BC',
  growth: '#42A5F5',
  resilience: '#FF9800',
  self_care: '#EF5350',
};

const GrowthRadar = React.memo(({ dimensions }: { dimensions: GrowthDimension[] }) => {
  const animValues = useRef(dimensions.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = dimensions.map((d, i) =>
      Animated.spring(animValues[i], {
        toValue: d.score / d.maxScore,
        useNativeDriver: false,
        tension: 20,
        friction: 8,
      })
    );
    Animated.stagger(80, anims).start();
  }, [dimensions]);

  return (
    <View style={radarStyles.container}>
      <Text style={radarStyles.title}>Growth Dimensions</Text>
      <Text style={radarStyles.subtitle}>Your recovery extends far beyond sobriety days</Text>
      {dimensions.map((dim, i) => {
        const change = dim.score - dim.previousScore;
        const widthInterp = animValues[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', '100%'],
        });

        return (
          <View key={dim.id} style={radarStyles.dimRow}>
            <View style={radarStyles.dimLabelRow}>
              <View style={[radarStyles.dimDot, { backgroundColor: dim.color }]} />
              <Text style={radarStyles.dimLabel}>{dim.label}</Text>
              <View style={radarStyles.dimScoreWrap}>
                <Text style={[radarStyles.dimScore, { color: dim.color }]}>{dim.score}</Text>
                {change !== 0 && (
                  <View style={radarStyles.dimChange}>
                    {change > 0 ? (
                      <ChevronUp size={10} color="#66BB6A" />
                    ) : (
                      <ChevronDown size={10} color="#EF5350" />
                    )}
                  </View>
                )}
                {change === 0 && dim.score > 0 && (
                  <Minus size={10} color={Colors.textMuted} />
                )}
              </View>
            </View>
            <View style={radarStyles.dimTrack}>
              <Animated.View
                style={[radarStyles.dimFill, { width: widthInterp, backgroundColor: dim.color }]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
});

const MicroWinCard = React.memo(({ win }: { win: MicroWin }) => {
  const IconComp = WIN_ICON_MAP[win.icon] ?? Star;
  const catColor = CATEGORY_COLORS[win.category] ?? Colors.primary;
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(win.earnedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }, [win.earnedAt]);

  return (
    <View style={winStyles.card}>
      <View style={[winStyles.iconWrap, { backgroundColor: catColor + '18' }]}>
        <IconComp size={16} color={catColor} />
      </View>
      <View style={winStyles.textWrap}>
        <Text style={winStyles.title}>{win.title}</Text>
        <Text style={winStyles.desc}>{win.description}</Text>
      </View>
      <Text style={winStyles.time}>{timeAgo}</Text>
    </View>
  );
});

const StreakSection = React.memo(({
  currentStreak,
  longestStreak,
  protectionTokens,
  maxTokens,
  gracePeriodActive,
  onUseProtection,
}: {
  currentStreak: number;
  longestStreak: number;
  protectionTokens: number;
  maxTokens: number;
  gracePeriodActive: boolean;
  onUseProtection: () => void;
}) => {
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (currentStreak > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.8, duration: 2200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 2200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [currentStreak]);

  return (
    <View style={streakStyles.container}>
      <View style={streakStyles.topRow}>
        <View style={streakStyles.streakCircle}>
          <Animated.View style={[streakStyles.streakGlow, { opacity: glowAnim }]} />
          <Flame size={22} color="#FF9800" />
          <Text style={streakStyles.streakNum}>{currentStreak}</Text>
          <Text style={streakStyles.streakLabel}>day streak</Text>
        </View>
        <View style={streakStyles.statsCol}>
          <View style={streakStyles.statRow}>
            <Trophy size={14} color={Colors.primary} />
            <Text style={streakStyles.statText}>Longest: {longestStreak} days</Text>
          </View>
          <View style={streakStyles.statRow}>
            <Shield size={14} color="#42A5F5" />
            <Text style={streakStyles.statText}>
              {protectionTokens}/{maxTokens} protection tokens
            </Text>
          </View>
          {gracePeriodActive && (
            <View style={[streakStyles.statRow, { marginTop: 4 }]}>
              <View style={streakStyles.graceBadge}>
                <Text style={streakStyles.graceText}>Grace period active</Text>
              </View>
            </View>
          )}
        </View>
      </View>
      {protectionTokens > 0 && currentStreak > 2 && !gracePeriodActive && (
        <Pressable
          style={({ pressed }) => [streakStyles.protectionBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onUseProtection}
          testID="use-streak-protection"
        >
          <ShieldCheck size={14} color="#42A5F5" />
          <Text style={streakStyles.protectionText}>
            Protect your streak (gives 36hr grace period)
          </Text>
        </Pressable>
      )}
      <Text style={streakStyles.kindNote}>
        Streaks celebrate consistency, not perfection. Missing a day doesn't erase your progress.
      </Text>
    </View>
  );
});

interface ShareableMilestone {
  days: number;
  title: string;
  headline: string;
  body: string;
}

const ShareMilestoneModal = React.memo(({ visible, milestone, onClose }: {
  visible: boolean;
  milestone: ShareableMilestone | null;
  onClose: () => void;
}) => {
  const [includeApp, setIncludeApp] = useState<boolean>(true);
  const [includeDetails, setIncludeDetails] = useState<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const getShareText = useCallback(() => {
    if (!milestone) return '';
    let text = `${milestone.headline}\n\n${milestone.body}`;
    if (includeDetails) {
      text += `\n\n${milestone.days} days of recovery protection.`;
    }
    if (includeApp) {
      text += `\n\n${SHAREABLE_FOOTER}`;
    }
    return text;
  }, [milestone, includeApp, includeDetails]);

  const handleShare = useCallback(async () => {
    if (!milestone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: getShareText(),
        title: milestone.headline,
      });
      onClose();
    } catch (error) {
      console.log('Share error:', error);
    }
  }, [milestone, getShareText, onClose]);

  if (!milestone) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={shareStyles.overlay}>
        <Animated.View style={[shareStyles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={shareStyles.header}>
            <Text style={shareStyles.headerTitle}>Share Milestone</Text>
            <Pressable onPress={onClose} hitSlop={12} style={shareStyles.closeBtn}>
              <XIcon size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={shareStyles.previewCard}>
            <View style={shareStyles.previewAccent} />
            <View style={shareStyles.previewContent}>
              <View style={shareStyles.previewBadge}>
                <ShieldCheckBrand size={14} color={Colors.primary} />
                <Text style={shareStyles.previewBadgeText}>{BRAND.tagline}</Text>
              </View>
              <Text style={shareStyles.previewHeadline}>{milestone.headline}</Text>
              <Text style={shareStyles.previewBody}>{milestone.body}</Text>
              {includeDetails && (
                <Text style={shareStyles.previewDays}>{milestone.days} days of recovery protection</Text>
              )}
              {includeApp && (
                <Text style={shareStyles.previewFooter}>{SHAREABLE_FOOTER}</Text>
              )}
            </View>
          </View>

          <View style={shareStyles.privacySection}>
            <View style={shareStyles.privacyHeader}>
              <Eye size={14} color={Colors.textSecondary} />
              <Text style={shareStyles.privacyTitle}>Privacy Controls</Text>
            </View>
            <Text style={shareStyles.privacyNote}>
              No personal data, addiction type, or identifying info is shared.
            </Text>
            <Pressable
              style={shareStyles.toggleRow}
              onPress={() => {
                Haptics.selectionAsync();
                setIncludeDetails(!includeDetails);
              }}
            >
              <Text style={shareStyles.toggleLabel}>Include day count</Text>
              <View style={[shareStyles.toggleDot, includeDetails && shareStyles.toggleDotActive]}>
                {includeDetails && <View style={shareStyles.toggleInner} />}
              </View>
            </Pressable>
            <Pressable
              style={shareStyles.toggleRow}
              onPress={() => {
                Haptics.selectionAsync();
                setIncludeApp(!includeApp);
              }}
            >
              <Text style={shareStyles.toggleLabel}>Include app attribution</Text>
              <View style={[shareStyles.toggleDot, includeApp && shareStyles.toggleDotActive]}>
                {includeApp && <View style={shareStyles.toggleInner} />}
              </View>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [shareStyles.shareBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleShare}
            testID="share-milestone-btn"
          >
            <Send size={16} color={Colors.white} />
            <Text style={shareStyles.shareBtnText}>Share</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
});

const shareStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
  },
  previewAccent: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  previewHeadline: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  previewDays: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  previewFooter: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  privacySection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  privacyNote: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDotActive: {
    borderColor: Colors.primary,
  },
  toggleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});

export default function MilestonesScreen() {
  const { profile, daysSober } = useUser();
  const { checkIns } = useCheckin();
  const { journal } = useJournal();
  const { currentStreak: pledgeStreak } = usePledges();
  const {
    streak,
    growthDimensions,
    todayMicroWins,
    recentWins,
    weeklyWinCount,
    overallGrowthScore,
    useStreakProtection: triggerStreakProtection,
    updateGrowthDimensions,
  } = useEngagement();

  const daysSoberCalc = useMemo(() => {
    const soberDate = new Date(profile.soberDate);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - soberDate.getTime()) / 86400000));
  }, [profile.soberDate]);

  const checkInsFingerprint = useMemo(
    () =>
      checkIns
        .map((c) =>
          [
            c.date,
            c.mood,
            c.cravingLevel,
            c.stress,
            c.sleepQuality,
            c.environment,
            c.reflection?.length ?? 0,
          ].join(':'),
        )
        .join('|'),
    [checkIns],
  );

  useEffect(() => {
    updateGrowthDimensions(checkIns, daysSoberCalc, journal.length, pledgeStreak);
  }, [checkIns, checkInsFingerprint, daysSoberCalc, journal.length, pledgeStreak, updateGrowthDimensions]);

  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);
  const [shareableMilestone, setShareableMilestone] = useState<ShareableMilestone | null>(null);

  const handleShareMilestone = useCallback((milestone: { days: number; title: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareMsg = MILESTONE_SHARE_MESSAGES[milestone.days];
    if (shareMsg) {
      setShareableMilestone({
        days: milestone.days,
        title: milestone.title,
        headline: shareMsg.headline,
        body: shareMsg.body,
      });
      setShareModalVisible(true);
    } else {
      setShareableMilestone({
        days: milestone.days,
        title: milestone.title,
        headline: `${milestone.title} Achieved`,
        body: `${milestone.days} days of protecting my recovery. Every day matters.`,
      });
      setShareModalVisible(true);
    }
  }, []);

  const handleUseProtection = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Protect Your Streak',
      'This gives you a 36-hour grace period if you miss a day. You won\'t lose your streak.\n\nThis isn\'t about pressure - it\'s a safety net for days when life gets in the way.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Use Protection',
          onPress: () => {
            const success = triggerStreakProtection();
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Streak Protected', 'You have a 36-hour grace period. Take care of yourself.');
            } else {
              Alert.alert('No Tokens Left', 'You\'ve used all your streak protection tokens. They refresh monthly.');
            }
          },
        },
      ]
    );
  }, [triggerStreakProtection]);

  const growthScoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(growthScoreAnim, {
      toValue: overallGrowthScore,
      useNativeDriver: false,
      tension: 15,
      friction: 8,
    }).start();
  }, [overallGrowthScore]);

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="milestones-screen"
    >
      <View style={styles.overallGrowthCard}>
        <View style={styles.growthScoreRow}>
          <View style={styles.growthScoreCircle}>
            <Sparkles size={18} color={Colors.primary} />
            <Text style={styles.growthScoreNum}>{overallGrowthScore}</Text>
            <Text style={styles.growthScoreLabel}>Growth</Text>
          </View>
          <View style={styles.growthSummary}>
            <Text style={styles.growthSummaryTitle}>Recovery Protection Score</Text>
            <Text style={styles.growthSummaryDesc}>
              {overallGrowthScore < 20
                ? "You're just getting started. Every step forward matters."
                : overallGrowthScore < 40
                ? "Building momentum. Your foundations are forming."
                : overallGrowthScore < 60
                ? "Real growth is happening. You're finding your rhythm."
                : overallGrowthScore < 80
                ? "Remarkable progress. You've come so far."
                : "Extraordinary growth. You're an inspiration."}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatValue}>{todayMicroWins.length}</Text>
          <Text style={styles.quickStatLabel}>Today's Wins</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={styles.quickStatValue}>{weeklyWinCount}</Text>
          <Text style={styles.quickStatLabel}>This Week</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={styles.quickStatValue}>{daysSoberCalc}</Text>
          <Text style={styles.quickStatLabel}>Protected</Text>
        </View>
      </View>

      <StreakSection
        currentStreak={streak.currentStreak}
        longestStreak={streak.longestStreak}
        protectionTokens={streak.protectionTokens}
        maxTokens={streak.maxProtectionTokens}
        gracePeriodActive={streak.gracePeriodActive}
        onUseProtection={handleUseProtection}
      />

      <GrowthRadar dimensions={growthDimensions} />

      {recentWins.length > 0 && (
        <View style={styles.winsSection}>
          <Text style={styles.winsSectionTitle}>Recent Wins</Text>
          <Text style={styles.winsSectionSub}>Small victories that build lasting change</Text>
          {recentWins.slice(0, 10).map((win) => (
            <MicroWinCard key={win.id} win={win} />
          ))}
        </View>
      )}

      {recentWins.length === 0 && (
        <View style={styles.emptyWins}>
          <Zap size={28} color={Colors.textMuted} />
          <Text style={styles.emptyWinsTitle}>Your wins will appear here</Text>
          <Text style={styles.emptyWinsDesc}>
            Complete check-ins, journal entries, and daily pledges to earn micro-wins that celebrate your progress.
          </Text>
        </View>
      )}

      <View style={styles.sectionDivider} />

      <Text style={styles.milestonesHeader}>Protection Milestones</Text>
      <Text style={styles.milestonesSubheader}>{daysSoberCalc} days of active protection</Text>

      {MILESTONE_DATA.map((milestone, index) => {
        const unlocked = daysSoberCalc >= milestone.days;
        const IconComponent = MILESTONE_ICON_MAP[milestone.icon] ?? Star;
        const progress = unlocked ? 1 : Math.min(daysSoberCalc / milestone.days, 1);

        return (
          <View
            key={milestone.days}
            style={[styles.milestoneCard, unlocked && styles.milestoneUnlocked]}
            testID={`milestone-${milestone.days}`}
          >
            <View style={styles.milestoneLeft}>
              <View style={[styles.iconContainer, unlocked ? styles.iconUnlocked : styles.iconLocked]}>
                {unlocked ? (
                  <IconComponent size={22} color={Colors.white} />
                ) : (
                  <Lock size={18} color={Colors.textMuted} />
                )}
              </View>
              {index < MILESTONE_DATA.length - 1 && (
                <View style={[styles.connector, unlocked && styles.connectorUnlocked]} />
              )}
            </View>

            <View style={styles.milestoneRight}>
              <View style={styles.milestoneHeader}>
                <Text style={[styles.milestoneTitle, !unlocked && styles.textLocked]}>
                  {milestone.title}
                </Text>
                <Text style={[styles.milestoneDays, unlocked && styles.daysUnlocked]}>
                  {milestone.days}d
                </Text>
              </View>
              <Text style={[styles.milestoneDesc, !unlocked && styles.textLocked]}>
                {milestone.description}
              </Text>
              {!unlocked && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {milestone.days - daysSoberCalc} days to go
                  </Text>
                </View>
              )}
              {unlocked && (
                <View style={styles.unlockedRow}>
                  <Text style={styles.unlockedText}>Achieved</Text>
                  <Pressable
                    style={({ pressed }) => [styles.shareIconBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleShareMilestone(milestone)}
                    hitSlop={8}
                    testID={`share-milestone-${milestone.days}`}
                  >
                    <Share2 size={14} color={Colors.primary} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        );
      })}

      <View style={{ height: 40 }} />

      <ShareMilestoneModal
        visible={shareModalVisible}
        milestone={shareableMilestone}
        onClose={() => setShareModalVisible(false)}
      />
    </ScreenScrollView>
  );
}

const radarStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 17,
  },
  dimRow: {
    marginBottom: 14,
  },
  dimLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dimDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dimLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  dimScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dimScore: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  dimChange: {
    marginLeft: 2,
  },
  dimTrack: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dimFill: {
    height: 5,
    borderRadius: 3,
  },
});

const winStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 8,
  },
});

const streakStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 12,
  },
  streakCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF980010',
    borderWidth: 2,
    borderColor: '#FF980030',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  streakGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF980015',
  },
  streakNum: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FF9800',
    marginTop: 2,
  },
  streakLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  statsCol: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  graceBadge: {
    backgroundColor: 'rgba(66,165,245,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  graceText: {
    fontSize: 11,
    color: '#42A5F5',
    fontWeight: '600' as const,
  },
  protectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(66,165,245,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(66,165,245,0.2)',
  },
  protectionText: {
    fontSize: 12,
    color: '#42A5F5',
    fontWeight: '500' as const,
  },
  kindNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    lineHeight: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  overallGrowthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  growthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  growthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '12',
    borderWidth: 2.5,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthScoreNum: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.primary,
    marginTop: 2,
  },
  growthScoreLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  growthSummary: {
    flex: 1,
  },
  growthSummaryTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  growthSummaryDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  winsSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  winsSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  winsSectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptyWins: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  emptyWinsTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyWinsDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  milestonesHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  milestonesSubheader: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  milestoneCard: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 100,
  },
  milestoneUnlocked: {},
  milestoneLeft: {
    alignItems: 'center',
    width: 50,
    marginRight: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconUnlocked: {
    backgroundColor: Colors.primary,
  },
  iconLocked: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: -2,
    marginBottom: -2,
  },
  connectorUnlocked: {
    backgroundColor: Colors.primary,
  },
  milestoneRight: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  milestoneDays: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  daysUnlocked: {
    color: Colors.primary,
  },
  milestoneDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
  },
  textLocked: {
    opacity: 0.5,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  unlockedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 4,
  },
  unlockedText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  shareIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
