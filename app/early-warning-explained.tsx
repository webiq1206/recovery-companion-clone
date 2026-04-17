import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack } from 'expo-router';
import { Info, AlertTriangle, Activity, Crosshair, Shield, ArrowRight, Zap, BarChart3 } from 'lucide-react-native';
import Colors from '../constants/colors';
import { WellnessDisclaimerFooter } from '../components/WellnessDisclaimerFooter';

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
      <Stack.Screen options={{ title: 'Wellness signals explained' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          Wellness signals look at patterns you already logged in check-ins—mood, habits, triggers, and steadiness—and
          combine them into a simple on-device summary so the app can suggest tools and reminders. They do not diagnose,
          treat, monitor you clinically, or predict medical outcomes.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>HOW IT WORKS</Text>

      <CharacteristicCard
        icon={<BarChart3 size={18} color={Colors.primary} />}
        title="How the summary is built"
        accentColor={Colors.primary}
      >
        <Text style={styles.bodyText}>
          Each area produces a 0–100 reflection score from your own entries. Scores are blended with simple adaptive
          weights so reminders can match how you tend to feel over time—self-help math only, not a medical algorithm.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>Default weights</Text>
        <SignalRow
          label="Emotional (25%)"
          description="How much your logged emotional state contributes to the blended reflection score."
        />
        <SignalRow
          label="Behavioral (25%)"
          description="How much craving intensity, stress, and sleep quality you reported affect the blend."
        />
        <SignalRow
          label="Triggers (20%)"
          description="How much your environment and triggering situations you noted factor in."
        />
        <SignalRow
          label="Stability (15%)"
          description="How much your overall Comprehensive Stability and consistency contribute to the blend."
        />
        <View style={styles.spacer} />
        <Text style={styles.bodyText}>
          As you keep checking in, these weights adjust gently. If emotional dips often line up with harder days for you,
          Emotional may weigh a bit more—so reminders feel closer to your real life. That personalization is not a medical
          forecast.
        </Text>
        <View style={styles.spacer} />
        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Support bands (from your entries)</Text>
          <RiskLevelRow color="#43A047" label="Steady — patterns look calm in what you logged" range="0–24" />
          <RiskLevelRow color="#FDD835" label="Mindful — a few signals to notice, not judge" range="25–44" />
          <RiskLevelRow color="#FB8C00" label="Extra support — several signals suggest leaning on tools" range="45–64" />
          <RiskLevelRow color="#E53935" label="Priority support — reach for tools and people you trust" range="65–100" />
        </View>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          The app also tracks whether your blended score is rising, steady, or easing. A rising trend may surface stronger
          self-help suggestions—not a medical escalation.
        </Text>
      </CharacteristicCard>

      <View style={styles.transitionNote}>
        <ArrowRight size={16} color={Colors.accentWarm} />
        <Text style={styles.transitionNoteText}>
          Summaries refresh after check-ins and periodically while you use the app. More consistent check-ins mean the
          on-device view reflects your recent life more clearly—not higher medical certainty.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>THE 4 CHARACTERISTICS</Text>

      <CharacteristicCard
        icon={<AlertTriangle size={18} color="#CE93D8" />}
        title="Emotional"
        accentColor="#CE93D8"
      >
        <Text style={styles.bodyText}>
          The Emotional area reflects how you said you feel day to day—useful for noticing trends, not for labeling you.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Mood Level"
          description="Your average mood over the last 7 check-ins. Lower mood increases this reflection score."
        />
        <SignalRow
          label="Emotional State"
          description="Your self-reported emotional wellbeing score. Lower scores add more weight here."
        />
        <SignalRow
          label="Mood Decline"
          description="Whether your mood is trending downward over recent days. A declining pattern adds more weight."
        />
        <SignalRow
          label="Mood Volatility"
          description="Large swings between high and low mood indicate instability, even if the average looks okay."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          Consistently reporting low mood or emotional state will raise this score. Sudden drops weigh more than a steady
          low mood. Big day-to-day swings add weight because rapid change can feel harder to navigate—not because the app
          predicts a specific outcome.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Journaling about what you are feeling—even briefly—can help you process emotions. The app may suggest journaling when this area looks heavy in your entries.
        </Text>
      </CharacteristicCard>

      <CharacteristicCard
        icon={<Activity size={18} color="#FF6B35" />}
        title="Behavioral"
        accentColor="#FF6B35"
      >
        <Text style={styles.bodyText}>
          The Behavioral area captures habits you log—cravings, stress, sleep, and how early you are in sobriety—as
          wellness context, not a medical readout.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Craving Intensity"
          description="Your average craving level over recent check-ins. This is the strongest behavioral signal, weighted at 40% of this score."
        />
        <SignalRow
          label="Stress Level"
          description="Your average stress from check-ins. Chronic stress tends to weigh more heavily in this blend."
        />
        <SignalRow
          label="Sleep Quality"
          description="Poor sleep disrupts emotional regulation and decision-making, making cravings harder to manage."
        />
        <SignalRow
          label="Days Sober"
          description="Earlier sobriety carries more weight in this blend. The first 7 days add the most, tapering as sober days grow."
        />
        <SignalRow
          label="Craving Spikes"
          description="A sudden jump of 20+ points in craving level from one day to the next adds extra weight."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          High cravings are the primary driver. Reporting craving levels above 70 for multiple days will raise this
          behavioral score. Combined with poor sleep and high stress, the blend weighs more heavily. As sober days
          increase, the baseline weight eases—reflecting the timeline you shared, not a medical prognosis.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          When this score spikes, the app may suggest grounding exercises or crisis tools. Even 60 seconds of focused
          breathing can help ride out a craving wave.
        </Text>
      </CharacteristicCard>

      <CharacteristicCard
        icon={<Crosshair size={18} color="#FFC107" />}
        title="Triggers"
        accentColor="#FFC107"
      >
        <Text style={styles.bodyText}>
          The Triggers area reflects how safe your environment felt in check-ins and situations you marked as stressful.
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
          description="The number of days in the past week with craving levels above 70. Three or more such days add significant weight."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          Environment safety is the biggest factor here—it accounts for about half of this trigger score. If you
          consistently report low environment scores (below 30), this area looks heavier. Unsafe-feeling environments plus
          high cravings weigh more together because both show up in what you logged.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Reviewing your trigger map and planning gentler alternatives for tough situations can make a real difference.
          Awareness is a practical self-help step.
        </Text>
      </CharacteristicCard>

      <CharacteristicCard
        icon={<Shield size={18} color="#2EC4B6" />}
        title="Stability"
        accentColor="#2EC4B6"
      >
        <Text style={styles.bodyText}>
          The Stability area summarizes how steady your logged days feel—helpful context for self-help planning, not a
          clinical stability test.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it tracks</Text>
        <SignalRow
          label="Comprehensive Stability (7-day view)"
          description="Your Comprehensive Stability is the literal average of your per-day stability over the last 7 calendar days with data (days with 0 check-ins are skipped)."
        />
        <SignalRow
          label="Stability Trend"
          description="Whether your stability is declining over recent days. A drop of more than 10 points between your oldest and newest check-in adds extra weight."
        />
        <SignalRow
          label="Check-in Consistency"
          description="Missing check-ins for 3 or more days adds weight, because gaps mean less recent context."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <Text style={styles.bodyText}>
          Your per-day stability values feed Comprehensive Stability. It is essentially the inverse—Comprehensive Stability
          of 80 means about 20 points in this stability slice. Trends matter: if stability is dropping even from a high
          baseline, the blend responds sooner. Missing check-ins can make the picture sparser because there is less recent
          data—not because the app is surveilling you.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Consistent daily check-ins keep this reflection grounded in real life. Even on good days, a quick check-in
          reinforces the habit and keeps summaries closer to how you are doing.
        </Text>
      </CharacteristicCard>

      <View style={styles.footerCard}>
        <Zap size={16} color={Colors.accentWarm} />
        <Text style={styles.footerText}>
          Wellness signals are a self-help nudge based on your own words and taps. They are not a crisis service. When
          scores rise, the app may suggest gentler pacing and tools—use licensed professionals and emergency resources
          when you need them.
        </Text>
      </View>

      <WellnessDisclaimerFooter style={{ marginTop: 16 }} />

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
