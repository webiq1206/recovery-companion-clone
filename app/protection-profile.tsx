import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldAlert, ShieldCheck, Shield, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useHydrateRecoveryProfileStore, useRecoveryProfileStore } from '@/stores/useRecoveryProfileStore';
import { calculateProtectionScore, type ProtectionStatus } from '@/utils/protectionScore';
import { ProtectionScoreCircle } from '@/components/ProtectionScoreCircle';

function getProtectionBadgeMeta(level: ProtectionStatus) {
  switch (level) {
    case 'Extra support':
      return {
        icon: <ShieldAlert size={22} color="#EF5350" />,
        labelColor: '#EF5350',
        chipBg: 'rgba(239,83,80,0.12)',
        desc: "You're still building. Today may need extra support.",
      };
    case 'Guarded':
      return {
        icon: <AlertTriangle size={22} color="#FF9800" />,
        labelColor: '#FF9800',
        chipBg: 'rgba(255,152,0,0.12)',
        desc: 'There are meaningful risks nearby. We’ll keep a close watch.',
      };
    case 'Strengthening':
      return {
        icon: <Shield size={22} color={Colors.primary} />,
        labelColor: Colors.primary,
        chipBg: 'rgba(46,196,182,0.12)',
        desc: 'You’re actively building protection. Keep reinforcing these habits.',
      };
    case 'Stable':
    default:
      return {
        icon: <ShieldCheck size={22} color="#4CAF50" />,
        labelColor: '#4CAF50',
        chipBg: 'rgba(76,175,80,0.12)',
        desc: 'Your protection looks steady. Stay connected to what’s working.',
      };
  }
}

export default function ProtectionProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useHydrateRecoveryProfileStore();
  const { profile } = useRecoveryProfileStore();

  const rp = profile.recoveryProfile;
  const { protectionScore, protectionStatus } = useMemo(() => {
    const r = calculateProtectionScore({
      intensity: rp.struggleLevel,
      sleepQuality: rp.sleepQuality,
      triggers: rp.triggers ?? [],
      supportLevel: rp.supportAvailability,
    });
    return { protectionScore: r.score, protectionStatus: r.status };
  }, [rp.struggleLevel, rp.sleepQuality, rp.triggers, rp.supportAvailability]);
  const topRiskDrivers = useMemo(() => {
    return rp.triggers.slice(0, 3);
  }, [rp.triggers]);

  const strengths = useMemo(() => {
    const items: string[] = [];

    if (rp.supportAvailability === 'strong') {
      items.push('You have a strong support network');
    } else if (rp.supportAvailability === 'moderate') {
      items.push('You have people who can walk with you');
    } else if (rp.supportAvailability === 'limited') {
      items.push('You have at least one person in your corner');
    } else {
      items.push('You’re doing this without much support yet');
    }

    if (rp.goals.length > 0) {
      items.push(`You’ve named rebuilding goals like “${rp.goals[0]}”`);
    }

    return items.slice(0, 3);
  }, [rp.supportAvailability, rp.goals]);

  const handleStartPlan = () => {
    router.replace('/(tabs)/(home)' as any);
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
        <Text style={styles.title}>Your Protection Profile</Text>
        <Text style={styles.subtitle}>
          Based on what you shared. Revisit anytime from Profile.
        </Text>

        <View style={styles.scoreSection}>
          <ProtectionScoreCircle score={protectionScore} status={protectionStatus} size={160} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TOP RISK DRIVERS</Text>
          {topRiskDrivers.length === 0 ? (
            <Text style={styles.cardBody}>
              We didn’t detect specific risk drivers yet. You can add triggers and sleep patterns
              later, and this view will update.
            </Text>
          ) : (
            topRiskDrivers.map((item, idx) => (
              <View key={`${item}-${idx}`} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>YOUR STRENGTHS</Text>
          {strengths.map((item, idx) => (
            <View key={`${item}-${idx}`} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TODAY’S PROTECTION PLAN</Text>
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <ShieldAlert size={18} color={Colors.primary} />
            </View>
            <View style={styles.planTextWrap}>
              <Text style={styles.planTitle}>Morning Check-In</Text>
              <Text style={styles.planSubtitle}>
                Take 60 seconds to name how you’re arriving today and set one gentle intention.
              </Text>
            </View>
          </View>
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <AlertTriangle size={18} color={Colors.primary} />
            </View>
            <View style={styles.planTextWrap}>
              <Text style={styles.planTitle}>Trigger Review</Text>
              <Text style={styles.planSubtitle}>
                Look over your main triggers and choose one situation to plan around today.
              </Text>
            </View>
          </View>
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <TrendingUp size={18} color={Colors.primary} />
            </View>
            <View style={styles.planTextWrap}>
              <Text style={styles.planTitle}>One Rebuild Action</Text>
              <Text style={styles.planSubtitle}>
                Pick one small action that moves you toward your rebuilding goal and commit to it.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomRow}>
        <Pressable style={styles.primaryCta} onPress={handleStartPlan} testID="start-protection-plan">
          <Text style={styles.primaryCtaText}>Start Today’s Protection Plan</Text>
          <ChevronRight size={18} color={Colors.white} />
        </Pressable>
      </View>
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
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  scoreSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: Colors.textMuted,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  planIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  planTextWrap: {
    flex: 1,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  planSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomRow: {
    marginTop: 12,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

