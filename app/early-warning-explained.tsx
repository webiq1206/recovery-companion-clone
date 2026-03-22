import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack } from 'expo-router';
import { Info, AlertTriangle, Activity, Crosshair, Shield, ArrowRight, Zap, BarChart3 } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface CharacteristicCardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}

function CharacteristicCard({ icon, title, accentColor, children }: CharacteristicCardProps) {
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

function SignalRow({ label, description }: { label: string; description: string }) {
  return (
    <View style={styles.signalRow}>
      <View style={styles.signalBullet} />
      <View style={styles.signalContent}>
        <Text style={styles.signalLabel}>{label}</Text>
        <Text style={styles.signalDescription}>{description}</Text>
      </View>
    </View>
  );
}

function RiskLevelRow({ color, label, range }: { color: string; label: string; range: string }) {
  return (
    <View style={styles.rangeRow}>
      <View style={[styles.rangeDot, { backgroundColor: color }]} />
      <Text style={styles.rangeText}>
        <Text style={styles.rangeBold}>{range}</Text> - {label}
      </Text>
    </View>
  );
}

export default function EarlyWarningExplainedScreen() {
  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="early-warning-explained-screen"
    >
      <Stack.Screen options={{ title: 'Early Warning' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          The Early Warning system continuously monitors patterns in your check-ins to detect signs of increased risk before a crisis develops. It watches four key characteristics - Emotional, Behavioral, Triggers, and Stability - and combines them into an overall risk level so the app can respond with the right support at the right time.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>HOW IT WORKS</Text>

      <CharacteristicCard
        icon={<BarChart3 size={18} color={Colors.primary} />}
        title="Overall Risk Calculation"
        accentColor={Colors.primary}
      >
        <Text style={styles.bodyText}>
          Each of the four characteristics produces a risk score from 0 to 100. These scores are combined using adaptive weights that learn from your personal patterns over time, giving more importance to the factors that matter most for your recovery.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>Default weights</Text>
        <SignalRow
          label="Emotional (25%)"
          description="How much your emotional state contributes to your overall risk level."
        />
        <SignalRow
          label="Behavioral (25%)"
          description="How much craving intensity, stress, and sleep quality affect your risk."
        />
        <SignalRow
          label="Triggers (20%)"
          description="How much your environment and exposure to triggering situations factor in."
        />
        <SignalRow
          label="Stability (15%)"
          description="How much your overall stability score and consistency contribute."
        />
        <View style={styles.spacer} />
        <Text style={styles.bodyText}>
          As you use the app, these weights adjust automatically. If emotional dips tend to precede your hardest moments, the system learns to weigh Emotional more heavily for you - making predictions more personal and accurate over time.
        </Text>
        <View style={styles.spacer} />
        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Overall risk levels</Text>
          <RiskLevelRow color="#43A047" label="Low - Your patterns look strong and stable" range="0–24" />
          <RiskLevelRow color="#FDD835" label="Guarded - Some signals worth monitoring" range="25–44" />
          <RiskLevelRow color="#FB8C00" label="Elevated - Multiple signals need attention" range="45–64" />
          <RiskLevelRow color="#E53935" label="High - Immediate support recommended" range="65–100" />
        </View>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          The system also tracks your risk trend - whether your overall risk is rising, stable, or falling. A rising trend at an elevated level triggers stronger support than a stable one at the same score.
        </Text>
      </CharacteristicCard>

      <View style={styles.transitionNote}>
        <ArrowRight size={16} color={Colors.accentWarm} />
        <Text style={styles.transitionNoteText}>
          Predictions run automatically after each check-in and at least every hour when you're active. The more consistently you check in, the higher the system's confidence in its predictions.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>THE 4 CHARACTERISTICS</Text>

      <CharacteristicCard
        icon={<AlertTriangle size={18} color="#CE93D8" />}
        title="Emotional"
        accentColor="#CE93D8"
      >
        <Text style={styles.bodyText}>
          The Emotional characteristic measures the state of your inner world - how you're feeling day to day and whether your emotional patterns suggest increasing vulnerability.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Mood Level"
          description="Your average mood over the last 7 check-ins. Lower mood increases emotional risk."
        />
        <SignalRow
          label="Emotional State"
          description="Your self-reported emotional wellbeing score. Lower emotional state contributes to higher risk."
        />
        <SignalRow
          label="Mood Decline"
          description="Whether your mood is trending downward over recent days. A declining pattern adds significant risk."
        />
        <SignalRow
          label="Mood Volatility"
          description="Large swings between high and low mood indicate instability, even if the average looks okay."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          Consistently reporting low mood or emotional state will raise this score. Sudden drops are weighted more heavily than gradually low mood. High mood variance (big swings between days) also contributes, because emotional instability can be a precursor to relapse even when some days feel fine.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Journaling about what you're feeling - even briefly - can help process emotions and often improves this score over time. The app may suggest journaling when emotional risk rises.
        </Text>
      </CharacteristicCard>

      <CharacteristicCard
        icon={<Activity size={18} color="#FF6B35" />}
        title="Behavioral"
        accentColor="#FF6B35"
      >
        <Text style={styles.bodyText}>
          The Behavioral characteristic captures the physical and habitual signals that often precede a relapse - cravings, stress, sleep disruption, and how early you are in recovery.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Craving Intensity"
          description="Your average craving level over recent check-ins. This is the strongest behavioral signal, weighted at 40% of this score."
        />
        <SignalRow
          label="Stress Level"
          description="Your average stress from check-ins. Chronic stress erodes coping ability and raises risk."
        />
        <SignalRow
          label="Sleep Quality"
          description="Poor sleep disrupts emotional regulation and decision-making, making cravings harder to manage."
        />
        <SignalRow
          label="Days Sober"
          description="Earlier recovery carries inherently higher behavioral risk. The first 7 days add the most, tapering as sobriety grows."
        />
        <SignalRow
          label="Craving Spikes"
          description="A sudden jump of 20+ points in craving level from one day to the next triggers an additional risk boost."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          High cravings are the primary driver. Reporting craving levels above 70 for multiple days will significantly raise behavioral risk. Combined with poor sleep and high stress, this creates a compounding effect. As your sober days increase, the baseline behavioral risk naturally decreases - your body and mind are adapting.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          When behavioral risk spikes, the app may activate grounding exercises or crisis tools. Even 60 seconds of focused breathing can help ride out a craving wave.
        </Text>
      </CharacteristicCard>

      <CharacteristicCard
        icon={<Crosshair size={18} color="#FFC107" />}
        title="Triggers"
        accentColor="#FFC107"
      >
        <Text style={styles.bodyText}>
          The Triggers characteristic evaluates how safe your environment feels and whether you're being exposed to situations that historically increase your vulnerability.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Environment Safety"
          description="Your self-reported environment score from check-ins. Lower scores mean you're in or around triggering situations more often."
        />
        <SignalRow
          label="Craving Correlation"
          description="When cravings rise alongside low environment scores, it confirms trigger exposure is actively affecting you."
        />
        <SignalRow
          label="High-Craving Days"
          description="The number of days in the past week with craving levels above 70. Three or more such days add a significant risk boost."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          Environment safety is the biggest factor here - it accounts for 50% of trigger risk. If you consistently report low environment scores (below 30), this characteristic will be elevated. The combination of unsafe environments with high cravings is especially significant, as it suggests active trigger exposure rather than just general discomfort.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Reviewing your trigger map and planning safer alternatives for high-risk situations can make a real difference. Awareness is your first line of defense.
        </Text>
      </CharacteristicCard>

      <CharacteristicCard
        icon={<Shield size={18} color="#2EC4B6" />}
        title="Stability"
        accentColor="#2EC4B6"
      >
        <Text style={styles.bodyText}>
          The Stability characteristic measures the overall steadiness of your recovery - whether your foundation is holding firm or starting to show cracks.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Stability Score Average"
          description="Your average stability score over the last 7 check-ins. This is the core metric - lower stability directly increases risk."
        />
        <SignalRow
          label="Stability Trend"
          description="Whether your stability is declining over recent days. A drop of more than 10 points between your oldest and newest check-in adds extra risk."
        />
        <SignalRow
          label="Check-in Consistency"
          description="Missing check-ins for 3 or more days adds risk, as gaps in engagement often correlate with declining stability."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          Your stability score from each check-in is the primary input. It's essentially the inverse - a stability score of 80 means only 20 points of stability risk. What makes this characteristic important is the trend detection: if stability is dropping even from a high baseline, the system picks up on it early. Missing check-ins amplifies the signal because disengagement is itself a risk factor.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Consistent daily check-ins are the single best way to keep stability risk low. Even on good days, checking in reinforces your foundation and gives the system confidence in its predictions.
        </Text>
      </CharacteristicCard>

      <View style={styles.footerCard}>
        <Zap size={16} color={Colors.accentWarm} />
        <Text style={styles.footerText}>
          The Early Warning system is designed to catch problems before they become crises. It's not a judgment - it's a safety net. When risk rises, the app adjusts its tone, frequency, and tools to match what you need. Every check-in you complete makes these predictions more accurate and personal to your journey.
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
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
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  signalBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  signalContent: {
    flex: 1,
  },
  signalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  signalDescription: {
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
  transitionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,179,71,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,179,71,0.2)',
  },
  transitionNoteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,179,71,0.08)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,179,71,0.2)',
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  bottomSpacer: {
    height: 20,
  },
});
