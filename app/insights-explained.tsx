import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack } from 'expo-router';
import { Brain, Shield, Heart, Users, TrendingUp, BarChart3, Info, Zap, Moon, Compass } from 'lucide-react-native';
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

export default function InsightsExplainedScreen() {
  const peerPractice = arePeerPracticeFeaturesEnabled();
  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="insights-explained-screen"
    >
      <Stack.Screen options={{ title: 'Growth Insights Explained' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          Your scores reflect your recovery journey based on real data from your daily check-ins, journal entries, pledges, and app activity. They update as you engage with the app each day.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>GROWTH SCORE</Text>

      <ExplainerCard
        icon={<TrendingUp size={18} color="#66BB6A" />}
        title="What is the Growth Score?"
        accentColor="#66BB6A"
      >
        <Text style={styles.bodyText}>
          Your Growth Score is the average of five growth dimensions that together paint a picture of your long-term recovery progress. It measures not just survival, but how you're building a new life.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>How it's calculated</Text>
        <Text style={styles.bodyText}>
          Each of the five dimensions below is scored 0–100. Your overall Growth Score is the simple average of all five. As you engage more deeply with the app, each dimension updates to reflect your activity.
        </Text>
        <View style={styles.spacer} />
        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Score ranges</Text>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.rangeText}><Text style={styles.rangeBold}>50–100</Text> - Strong and growing</Text>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeDot, { backgroundColor: Colors.accentWarm }]} />
            <Text style={styles.rangeText}><Text style={styles.rangeBold}>0–49</Text> - Room to grow, keep showing up</Text>
          </View>
        </View>
      </ExplainerCard>

      <Text style={styles.sectionTitle}>GROWTH DIMENSIONS</Text>

      <ExplainerCard
        icon={<BarChart3 size={18} color="#2EC4B6" />}
        title="Consistency"
        accentColor="#2EC4B6"
      >
        <Text style={styles.bodyText}>
          Measures how regularly you're showing up for your recovery.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <FactorRow
          label="Check-in frequency (80%)"
          description="How many of the last 14 days you completed a daily check-in. Checking in every day for two weeks earns full marks."
        />
        <FactorRow
          label="Pledge streak bonus (20%)"
          description="Honoring your daily pledge builds momentum. A 30-day streak earns the maximum bonus."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Even imperfect consistency matters. Checking in most days will still give you a strong score here.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<Brain size={18} color="#66BB6A" />}
        title="Emotional Awareness"
        accentColor="#66BB6A"
      >
        <Text style={styles.bodyText}>
          Reflects how deeply you're engaging with your emotional life and processing your feelings.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <FactorRow
          label="Journal entries (40%)"
          description="Writing helps process emotions. Having 20 or more journal entries earns full credit in this area."
        />
        <FactorRow
          label="Mood awareness (30%)"
          description="Recognizing a range of moods shows emotional depth. This measures the variety of mood levels you've reported across recent check-ins."
        />
        <FactorRow
          label="Reflections (30%)"
          description="Adding meaningful reflections (more than a few words) to your check-ins shows deeper self-examination. Writing reflections on at least 7 of your recent check-ins earns full marks."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          You don't need to feel great to score well here. Recognizing difficult emotions honestly is just as valuable.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<Shield size={18} color="#42A5F5" />}
        title="Resilience"
        accentColor="#42A5F5"
      >
        <Text style={styles.bodyText}>
          Shows how well you're managing challenges and building inner strength over time.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <FactorRow
          label="Days sober (40%)"
          description="Time in recovery matters. Reaching 90 days earns full credit. Every day counts."
        />
        <FactorRow
          label="Craving management (30%)"
          description="Based on your average craving level from recent check-ins. Lower cravings over time mean you're building real resilience."
        />
        <FactorRow
          label="Stress management (30%)"
          description="Your average stress level from recent check-ins. Learning to navigate stress without relapse is a core resilience skill."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          This score naturally rises as you accumulate sober days and your coping skills strengthen.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<Heart size={18} color="#FF9800" />}
        title="Self-Care"
        accentColor="#FF9800"
      >
        <Text style={styles.bodyText}>
          Tracks how well you're taking care of your physical and environmental well-being.
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <FactorRow
          label="Sleep quality (50%)"
          description="Based on the average sleep quality you report in your daily check-ins. Better sleep supports recovery."
        />
        <FactorRow
          label="Environment safety (50%)"
          description="How safe and supportive your environment feels, as reported in check-ins. Feeling secure in your surroundings is essential."
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          Small improvements to sleep and environment have outsized effects on recovery. Focus here if this score is low.
        </Text>
      </ExplainerCard>

      <ExplainerCard
        icon={<Users size={18} color="#AB47BC" />}
        title="Connection"
        accentColor="#AB47BC"
      >
        <Text style={styles.bodyText}>
          {peerPractice
            ? 'Measures your engagement with community and social support networks.'
            : 'Measures your engagement with social support tools in the app (trusted circle, accountability, and similar connection actions).'}
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.subHeading}>What affects it</Text>
        <FactorRow
          label={peerPractice ? 'Community engagement (100%)' : 'Connection micro-wins (100%)'}
          description={
            peerPractice
              ? 'Earned through social micro-wins - actions like joining recovery rooms, engaging in community posts, or reaching out to peers. Earning 10 social wins earns full marks.'
              : 'Earned through social micro-wins—such as reaching out through your trusted circle or accountability tools. Earning 10 social wins earns full marks.'
          }
        />
        <View style={styles.spacer} />
        <Text style={styles.tipText}>
          {peerPractice
            ? 'Recovery is stronger together. Even small acts of connection - reading a post, sending encouragement - contribute to this score.'
            : 'Recovery is stronger together. Even small acts of connection—a brief check-in text, one intentional reach-out—contribute to this score.'}
        </Text>
      </ExplainerCard>

      <View style={styles.footerCard}>
        <Zap size={16} color={Colors.accentWarm} />
        <Text style={styles.footerText}>
          All scores update automatically as you use the app. There's no "right" pace - what matters is that you keep showing up.
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
