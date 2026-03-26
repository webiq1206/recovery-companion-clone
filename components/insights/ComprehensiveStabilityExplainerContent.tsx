import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ExplainerCardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}

function ExplainerCard({ icon, title, accentColor, children }: ExplainerCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '18' }]}>
          {icon}
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function FactorRow({ label, description }: { label: string; description: string }) {
  return (
    <View style={styles.factorRow}>
      <View style={styles.factorBullet} />
      <View style={styles.factorContent}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={styles.factorDescription}>{description}</Text>
      </View>
    </View>
  );
}

/** Explainer block for Comprehensive Stability (Comprehensive Stability Explained screen). */
export function ComprehensiveStabilityExplainerContent() {
  return (
    <>
      <Text style={styles.sectionTitle}>COMPREHENSIVE STABILITY</Text>

      <ExplainerCard
        icon={<Activity size={18} color="#2EC4B6" />}
        title="What is Comprehensive Stability?"
        accentColor="#2EC4B6"
      >
        <Text style={styles.bodyText}>
          Your Comprehensive Stability is a number from 0 to 100 that reflects how steady and grounded you've been
          recently. It's your emotional and behavioral baseline - a snapshot of where you stand right now.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How it's calculated</Text>
        <Text style={styles.bodyText}>
          Each daily check-in generates a stability score based on your reported mood, craving level, stress, sleep
          quality, and environment safety. For each calendar day, we average any check-ins you completed, then your
          Comprehensive Stability is the literal average of the last 7 days that have data.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <FactorRow
          label="Mood"
          description="Higher mood ratings raise your stability. Consistently low mood pulls it down."
        />
        <FactorRow
          label="Craving Level"
          description="Lower cravings indicate greater stability. High cravings reduce your score."
        />
        <FactorRow label="Stress" description="Lower stress contributes to higher Comprehensive Stability." />
        <FactorRow
          label="Sleep Quality"
          description="Better sleep quality improves your stability reading."
        />
        <FactorRow
          label="Environment Safety"
          description="Feeling safe in your environment raises stability."
        />
        <View style={styles.spacer} />
        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Score ranges</Text>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.rangeText}>
              <Text style={styles.rangeBold}>60–100</Text> - Stable and grounded
            </Text>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: Colors.accentWarm }]} />
            <Text style={styles.rangeText}>
              <Text style={styles.rangeBold}>40–59</Text> - Some fluctuation, keep going
            </Text>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.rangeText}>
              <Text style={styles.rangeBold}>0–39</Text> - Needs attention, use your tools
            </Text>
          </View>
        </View>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          If you haven't completed any check-ins yet, your Comprehensive Stability defaults to 50. The more consistently
          you check in, the more accurate it becomes.
        </Text>
      </ExplainerCard>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  cardBody: {},
  bodyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  spacer: {
    height: 14,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  factorBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  factorContent: {
    flex: 1,
  },
  factorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  factorDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  rangeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  rangeTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rangeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  rangeBold: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    fontStyle: 'italic' as const,
  },
});
