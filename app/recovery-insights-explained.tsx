import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  RefreshCw,
  Leaf,
  TrendingUp,
  Shield,
  Users,
  Info,
  Zap,
  ArrowRight,
  BarChart3,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';

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

function TriggerRow({ label, description }: { label: string; description: string }) {
  return (
    <View style={styles.triggerRow}>
      <View style={styles.triggerBullet} />
      <View style={styles.triggerContent}>
        <Text style={styles.triggerLabel}>{label}</Text>
        <Text style={styles.triggerDescription}>{description}</Text>
      </View>
    </View>
  );
}

function LoopCycleStep({ step, text, color }: { step: number; text: string; color: string }) {
  return (
    <View style={styles.cycleStep}>
      <View style={[styles.cycleStepNumber, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Text style={[styles.cycleStepNumberText, { color }]}>{step}</Text>
      </View>
      <Text style={styles.cycleStepText}>{text}</Text>
    </View>
  );
}

export default function RecoveryInsightsExplainedScreen() {
  const peerPractice = arePeerPracticeFeaturesEnabled();
  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="recovery-insights-explained-screen"
    >
      <Stack.Screen options={{ title: 'Your Recovery Journey Explained' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          Your Recovery Journey tracks the emotional and behavioral patterns that keep you engaged in your recovery. It measures how actively you're building positive reinforcement loops - the habits and actions that naturally motivate you to keep going.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>UNDERSTANDING THE SUMMARY</Text>

      <ExplainerCard
        icon={<BarChart3 size={18} color={Colors.primary} />}
        title="The metrics at the top of Your Recovery Journey"
        accentColor={Colors.primary}
      >
        <Text style={styles.bodyText}>
          The card at the top of Your Recovery Journey gives you a quick read on momentum, emotional
          steadiness, confidence, and how many reinforcement loops are active. Here is what each
          number represents.
        </Text>
        <View style={styles.spacer} />
        <TriggerRow
          label="Recovery Momentum (overall strength)"
          description="A 0–100 score that blends how strong your four reinforcement loops are with how far you are along your micro-progress dimensions. It uses 40% the average of your loop scores and 60% the average of your micro-progress completion (current value vs. target for each area). Higher means you are engaging both habit loops and steady growth signals."
        />
        <TriggerRow
          label="Stable days"
          description="Your current streak of days where recent daily check-ins show emotionally steady mood patterns (lower day-to-day volatility). It tracks the Emotional Regulation dimension. If moods swing widely again, the streak can reset until patterns settle."
        />
        <TriggerRow
          label="Confidence"
          description={
            peerPractice
              ? 'A 0–100 confidence-in-recovery score built from sober time, check-in consistency, navigating high-craving days, journaling, pledge streaks, and light community connection. It summarizes how much evidence you are building that you can stay on your path.'
              : 'A 0–100 confidence-in-recovery score built from sober time, check-in consistency, navigating high-craving days, journaling, pledge streaks, and connection habits (such as reaching out to your trusted circle). It summarizes how much evidence you are building that you can stay on your path.'
          }
        />
        <TriggerRow
          label="Active loops"
          description="How many of the four reinforcement loops—Relief, Growth, Control, and Belonging—currently have a score above zero (meaning each has been activated at least once). It is a count of which loops are “on,” not how strong they are."
        />
      </ExplainerCard>

      <Text style={styles.sectionTitle}>WHAT ARE REINFORCEMENT LOOPS?</Text>

      <ExplainerCard
        icon={<RefreshCw size={18} color={Colors.primary} />}
        title="Understanding Reinforcement Loops"
        accentColor={Colors.primary}
      >
        <Text style={styles.bodyText}>
          A reinforcement loop is a positive cycle where an action you take leads to a rewarding outcome, which motivates you to repeat that action. Over time, these loops become natural habits that sustain your recovery without relying on willpower alone.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the cycle works</Text>

        <View style={styles.cycleContainer}>
          <LoopCycleStep step={1} text="You take a recovery action (check in, journal, connect)" color={Colors.primary} />
          <View style={styles.cycleArrow}>
            <ArrowRight size={14} color={Colors.textMuted} />
          </View>
          <LoopCycleStep step={2} text="The app recognizes your action and activates the matching loop" color="#42A5F5" />
          <View style={styles.cycleArrow}>
            <ArrowRight size={14} color={Colors.textMuted} />
          </View>
          <LoopCycleStep step={3} text="You receive a reinforcement message acknowledging your effort" color="#66BB6A" />
          <View style={styles.cycleArrow}>
            <ArrowRight size={14} color={Colors.textMuted} />
          </View>
          <LoopCycleStep step={4} text="Your loop score increases, building momentum and motivation" color="#FFB347" />
        </View>

        <View style={styles.spacer} />
        <Text style={styles.bodyText}>
          Recovery Companion tracks four distinct reinforcement loops, each tied to a different aspect of your recovery. The stronger your loops become, the more natural and self-sustaining your recovery feels.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How loop scores are calculated</Text>
        <Text style={styles.bodyText}>
          Each loop has a score from 0 to 100. Every time you perform an action that activates a loop, its score increases. Scores gradually decay over time if the loop isn't activated, encouraging consistent engagement. Your overall Recovery Insights score is a weighted combination of all four loop scores (40%) and your micro-progress across six dimensions (60%).
        </Text>
      </ExplainerCard>

      <Text style={styles.sectionTitle}>THE 4 REINFORCEMENT LOOPS</Text>

      <ExplainerCard
        icon={<Leaf size={18} color="#66BB6A" />}
        title="Relief Loop"
        accentColor="#66BB6A"
      >
        <View style={styles.loopTagline}>
          <Text style={styles.loopTaglineText}>Finding calm when things feel heavy</Text>
        </View>
        <Text style={styles.bodyText}>
          The Relief Loop activates when you use a recovery tool during a difficult moment - and experience a shift toward calm. It reinforces the pattern of reaching for healthy coping strategies instead of old habits.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What activates it</Text>
        <TriggerRow
          label="Checking in after a craving"
          description="Completing a daily check-in when your craving level is elevated shows you're facing difficulty head-on."
        />
        <TriggerRow
          label="Using crisis tools"
          description="Reaching for the crisis mode, breathing exercises, or grounding techniques during a tough moment."
        />
        <TriggerRow
          label="Mood improvement after action"
          description="When your mood improves after using a recovery tool, the app recognizes that your action led to relief."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the score grows</Text>
        <Text style={styles.bodyText}>
          Each activation increases the Relief Loop score. More frequent activations build a stronger score. If you go several days without needing relief tools (which is a good sign!), the score may naturally settle - that's healthy and expected.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          A lower Relief score doesn't mean you're failing. It may mean you're in a stable period with fewer crises - which is progress.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<TrendingUp size={18} color="#42A5F5" />}
        title="Growth Loop"
        accentColor="#42A5F5"
      >
        <View style={styles.loopTagline}>
          <Text style={styles.loopTaglineText}>Becoming more than your past</Text>
        </View>
        <Text style={styles.bodyText}>
          The Growth Loop activates when you invest in understanding yourself better and building new skills. It tracks the work you do to evolve beyond addiction into the person you want to become.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What activates it</Text>
        <TriggerRow
          label="Writing journal entries"
          description="Each journal entry is an act of self-reflection. Writing helps you process emotions and recognize patterns."
        />
        <TriggerRow
          label="Completing exercises"
          description="Working through recovery exercises builds skills and deepens your understanding of yourself."
        />
        <TriggerRow
          label="Goal progress"
          description="Making progress on your recovery goals shows intentional forward movement."
        />
        <TriggerRow
          label="Identity work"
          description="Engaging with identity modules and exploring who you are beyond addiction."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the score grows</Text>
        <Text style={styles.bodyText}>
          The Growth Loop rewards depth and consistency. Writing regularly, completing exercises, and working toward goals all contribute. The score reflects cumulative effort - even small actions add up over time.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Growth isn't always visible day-to-day. Trust the process - every journal entry and completed exercise is building something lasting.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<Shield size={18} color="#FFB347" />}
        title="Control Loop"
        accentColor="#FFB347"
      >
        <View style={styles.loopTagline}>
          <Text style={styles.loopTaglineText}>Building trust in your own choices</Text>
        </View>
        <Text style={styles.bodyText}>
          The Control Loop activates when you follow through on commitments and manage challenging situations with intention. It's about proving to yourself that you can be relied on.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What activates it</Text>
        <TriggerRow
          label="Honoring pledges"
          description="Each day you keep your daily pledge, you build trust with yourself. This is the strongest Control Loop activator."
        />
        <TriggerRow
          label="Completing routines"
          description="Following through on your daily recovery routine - check-ins, reflections, exercises - shows discipline."
        />
        <TriggerRow
          label="Managing triggers"
          description="When you encounter a trigger and respond with a healthy choice instead of old patterns."
        />
        <TriggerRow
          label="Setting boundaries"
          description="Making intentional choices about your environment, relationships, and habits."
        />
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the score grows</Text>
        <Text style={styles.bodyText}>
          The Control Loop is heavily influenced by consistency. Honoring your pledge day after day creates a compounding effect. Missing a pledge doesn't erase your progress, but maintaining consistency accelerates growth.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Control isn't about perfection - it's about intention. Even one intentional choice per day feeds this loop.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<Users size={18} color="#AB47BC" />}
        title="Belonging Loop"
        accentColor="#AB47BC"
      >
        <View style={styles.loopTagline}>
          <Text style={styles.loopTaglineText}>Knowing you are not alone in this</Text>
        </View>
        <Text style={styles.bodyText}>
          {peerPractice
            ? "The Belonging Loop activates when you connect with others in your recovery community. Isolation is one of the biggest risks in recovery - this loop tracks how actively you're building and maintaining supportive connections."
            : 'The Belonging Loop activates when you use connection tools in Recovery Companion—trusted circle reach-outs, accountability check-ins, and similar actions. Isolation is one of the biggest risks in recovery; this loop tracks how actively you are building supportive connections.'}
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What activates it</Text>
        {peerPractice ? (
          <>
            <TriggerRow
              label="Community engagement"
              description="Interacting with community posts - reading, reacting, or commenting - counts as meaningful connection."
            />
            <TriggerRow
              label="Joining recovery rooms"
              description="Participating in group recovery sessions shows you're willing to be vulnerable with others."
            />
            <TriggerRow
              label="Sharing support"
              description="Offering encouragement, sharing your experience, or responding to someone in need."
            />
            <TriggerRow
              label="Contacting an accountability partner"
              description="Reaching out to your accountability partner, whether in crisis or just to check in."
            />
          </>
        ) : (
          <>
            <TriggerRow
              label="Trusted circle reach-out"
              description="Calling or texting someone in your trusted circle, or adding a new safe contact, counts as meaningful connection."
            />
            <TriggerRow
              label="Accountability partner"
              description="Reaching out to your accountability partner, whether in crisis or just to check in."
            />
            <TriggerRow
              label="Connection hub activity"
              description="Using Connect for structured support (for example instant reach or pledge-related touchpoints) reinforces belonging."
            />
            <TriggerRow
              label="Sharing support"
              description="Offering encouragement when you check in with someone you trust."
            />
          </>
        )}
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How the score grows</Text>
        <Text style={styles.bodyText}>
          {peerPractice
            ? "The Belonging Loop rewards any form of genuine connection. You don't need to be social every day - even reading a community post or sending a brief message activates it. Regular, small interactions build a stronger score than occasional large ones."
            : 'The Belonging Loop rewards genuine connection. You do not need a big social day—even a short check-in text or one intentional reach-out activates it. Regular, small interactions build a stronger score than occasional large ones.'}
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          {peerPractice
            ? 'Recovery is stronger together. Even small acts of connection - reading a post, sending encouragement - contribute meaningfully to this loop.'
            : 'Recovery is stronger together. Even small acts of connection—a brief message, one call when it counts—contribute meaningfully to this loop.'}
        </Text>
      </ExplainerCard>

      <View style={styles.footerCard}>
        <Zap size={16} color={Colors.accentWarm} />
        <Text style={styles.footerText}>
          Your reinforcement loops update automatically as you use the app. There's no "right" balance between the four loops - what matters is that you're actively engaging with the aspects of recovery that resonate with you. Over time, strong loops make recovery feel less like effort and more like who you are.
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
  loopTagline: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  loopTaglineText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  cycleContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cycleStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cycleStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleStepNumberText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  cycleStepText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cycleArrow: {
    paddingLeft: 7,
    paddingVertical: 2,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  triggerBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  triggerContent: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  triggerDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    fontStyle: 'italic' as const,
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
