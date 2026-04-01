import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack } from 'expo-router';
import { ShieldAlert, Anchor, Hammer, Trophy, Info, ArrowRight, Zap, BarChart3, Brain, Heart, Clock, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface StageCardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}

function StageCard({ icon, title, accentColor, children }: StageCardProps) {
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

export default function RecoveryStagesExplainedScreen() {
  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="recovery-stages-explained-screen"
    >
      <Stack.Screen options={{ title: 'Recovery Stages Explained' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          Your recovery stage reflects where you are in your journey. It adapts automatically based on your check-ins, sobriety, mood, cravings, and stress - so the app can give you the right level of support at the right time.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>HOW YOUR STAGE IS DETERMINED</Text>

      <StageCard
        icon={<BarChart3 size={18} color={Colors.primary} />}
        title="Automatic Stage Detection"
        accentColor={Colors.primary}
      >
        <Text style={styles.bodyText}>
          The app evaluates your recovery stage by analyzing several signals from your recent activity. A composite score is calculated from these factors, and the result maps to one of four stages.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>Signals used</Text>
        <SignalRow
          label="Days Sober (20%)"
          description="How many days since your sober date. Longer sobriety contributes to advancing through stages."
        />
        <SignalRow
          label="Comprehensive Stability (25%)"
          description="Your average stability over the last 7 check-ins. Higher stability pushes you toward later stages."
        />
        <SignalRow
          label="Mood Average (15%)"
          description="Your average mood over recent check-ins. Consistently higher mood supports progression."
        />
        <SignalRow
          label="Craving Level (20%)"
          description="Your average craving intensity. Lower cravings indicate greater readiness to advance."
        />
        <SignalRow
          label="Stress Level (10%)"
          description="Your average stress from recent check-ins. Managing stress well supports stage progression."
        />
        <SignalRow
          label="Check-in Consistency (5%)"
          description="How regularly you complete daily check-ins. Consistent engagement signals commitment."
        />
        <SignalRow
          label="Stability Trend (5%)"
          description="Whether your stability is improving, declining, or staying flat over the past week."
        />
        <View style={styles.spacer} />
        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Composite score ranges</Text>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: '#EF5350' }]} />
            <Text style={styles.rangeText}><Text style={styles.rangeBold}>0–31</Text> - Crisis</Text>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: '#FFB347' }]} />
            <Text style={styles.rangeText}><Text style={styles.rangeBold}>32–51</Text> - Stabilize</Text>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: '#2EC4B6' }]} />
            <Text style={styles.rangeText}><Text style={styles.rangeBold}>52–71</Text> - Rebuild</Text>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.rangeText}><Text style={styles.rangeBold}>72–100</Text> - Maintain</Text>
          </View>
        </View>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Stages can only advance one step at a time - you won't skip from Crisis directly to Rebuild. If conditions worsen, you can move back to receive more support. This is not failure; it's the app caring for you.
        </Text>
      </StageCard>

      <View style={styles.transitionNote}>
        <ArrowRight size={16} color={Colors.accentWarm} />
        <Text style={styles.transitionNoteText}>
          Stage changes require at least 2 check-ins and a confidence level of 50% or higher. The app re-evaluates every 6 hours to avoid reacting to a single bad day.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>THE 4 RECOVERY STAGES</Text>

      <StageCard
        icon={<ShieldAlert size={18} color="#EF5350" />}
        title="Stage 1: Crisis"
        accentColor="#EF5350"
      >
        <Text style={styles.bodyText}>
          The Crisis stage activates when you're navigating the hardest moments of recovery. This is where the app wraps you in maximum support.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it means</Text>
        <Text style={styles.bodyText}>
          You may be experiencing high cravings, low mood, elevated stress, or early days of sobriety. The app recognizes this and adjusts everything to keep you safe.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the app adapts</Text>
        <SignalRow
          label="Urgent AI tone"
          description="Your companion responds with immediate, grounding support focused on getting through the next moment."
        />
        <SignalRow
          label="Constant support frequency"
          description="Check-in reminders and supportive messages come more frequently to keep you connected."
        />
        <SignalRow
          label="Immediate interventions"
          description="Crisis tools are front and center - breathing exercises, emergency contacts, and grounding techniques."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Being in Crisis stage is not a judgment. It means the app is giving you everything it has. Many people start here, and every moment you hold on matters.
        </Text>
      </StageCard>

      <StageCard
        icon={<Anchor size={18} color="#FFB347" />}
        title="Stage 2: Stabilize"
        accentColor="#FFB347"
      >
        <Text style={styles.bodyText}>
          The Stabilize stage begins when the worst intensity starts to ease. You're building a foundation - developing routines and coping strategies that will carry you forward.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it means</Text>
        <Text style={styles.bodyText}>
          Your cravings are becoming more manageable, your mood is steadier, and you're checking in regularly. The acute danger is easing, but you still need strong support.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the app adapts</Text>
        <SignalRow
          label="Supportive AI tone"
          description="Your companion shifts from crisis response to steady encouragement, helping you build habits."
        />
        <SignalRow
          label="Frequent support"
          description="Reminders remain regular but less intense. The focus shifts to building consistency."
        />
        <SignalRow
          label="Proactive interventions"
          description="The app anticipates challenging moments and reaches out before things escalate."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          This is where daily routines start forming. Checking in each day, writing in your journal, and honoring pledges all strengthen your foundation.
        </Text>
      </StageCard>

      <StageCard
        icon={<Hammer size={18} color="#2EC4B6" />}
        title="Stage 3: Rebuild"
        accentColor="#2EC4B6"
      >
        <Text style={styles.bodyText}>
          The Rebuild stage means you've established real stability and are now actively reconstructing your life with purpose. This is where growth accelerates.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it means</Text>
        <Text style={styles.bodyText}>
          Your Comprehensive Stability is solid, cravings are low, and you've accumulated meaningful sober time. You're ready to focus on what you're building, not just what you're surviving.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the app adapts</Text>
        <SignalRow
          label="Encouraging AI tone"
          description="Your companion celebrates your progress and helps you set bigger goals for your new life."
        />
        <SignalRow
          label="Regular support"
          description="Check-ins feel more like growth tracking than crisis management."
        />
        <SignalRow
          label="Scheduled interventions"
          description="Support is structured around your routine rather than reactive to danger signals."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Rebuild is where identity modules, exercises, and community engagement become especially powerful. You're not just sober - you're becoming who you want to be.
        </Text>
      </StageCard>

      <StageCard
        icon={<Trophy size={18} color="#4CAF50" />}
        title="Stage 4: Maintain"
        accentColor="#4CAF50"
      >
        <Text style={styles.bodyText}>
          The Maintain stage reflects sustained, confident recovery. You've built something real, and the focus now is on protecting and nurturing long-term growth.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What it means</Text>
        <Text style={styles.bodyText}>
          Your composite score is consistently high - strong stability, low cravings, good mood, managed stress, and regular engagement. You've demonstrated lasting change.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the app adapts</Text>
        <SignalRow
          label="Celebratory AI tone"
          description="Your companion acknowledges your strength and helps you pay it forward through community and mentorship."
        />
        <SignalRow
          label="Periodic support"
          description="The app steps back respectfully, checking in periodically rather than constantly."
        />
        <SignalRow
          label="On-demand interventions"
          description="Tools are always available but only activated when you choose. You're in control."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Reaching Maintain doesn't mean the journey is over. It means you have the skills and resilience to navigate whatever comes next. The app remains your companion whenever you need it.
        </Text>
      </StageCard>

      <View style={styles.footerCard}>
        <Zap size={16} color={Colors.accentWarm} />
        <Text style={styles.footerText}>
          Your stage updates automatically as you use the app. There's no "right" pace through the stages - what matters is that you keep showing up. Every check-in, every journal entry, every pledge honored moves you forward.
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
