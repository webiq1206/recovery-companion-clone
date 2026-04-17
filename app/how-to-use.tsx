import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import {
  Sun,
  Hammer,
  Users,
  ShieldAlert,
  Moon,
  ChevronDown,
  ChevronUp,
  Heart,
  BarChart3,
  Layers,
  Sparkles,
  CheckCircle,
  CircleDot,
  BookOpen,
  TrendingUp,
  Handshake,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { WellnessDisclaimerFooter } from '../components/WellnessDisclaimerFooter';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';
import { useSubscription } from '../providers/SubscriptionProvider';

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

const ExpandableSection = React.memo(({ title, icon, children, defaultOpen = false, accentColor = Colors.primary }: ExpandableSectionProps) => {
  const [expanded, setExpanded] = useState<boolean>(defaultOpen);
  const animValue = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    Haptics.selectionAsync();
    const toValue = expanded ? 0 : 1;
    Animated.timing(animValue, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animValue]);

  return (
    <View style={styles.expandableContainer}>
      <Pressable
        style={({ pressed }) => [styles.expandableHeader, pressed && { opacity: 0.85 }]}
        onPress={toggle}
        testID={`section-${title}`}
      >
        <View style={styles.expandableLeft}>
          <View style={[styles.sectionIconBg, { backgroundColor: accentColor + '18' }]}>
            {icon}
          </View>
          <Text style={styles.expandableTitle}>{title}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={Colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={Colors.textMuted} />
        )}
      </Pressable>
      {expanded && (
        <Animated.View style={styles.expandableBody}>
          {children}
        </Animated.View>
      )}
    </View>
  );
});

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  isLast?: boolean;
}

const StepCard = React.memo(({ number, title, description, icon, color, isLast }: StepCardProps) => (
  <View style={styles.stepCard}>
    <View style={styles.stepLeft}>
      <View style={[styles.stepNumberBg, { backgroundColor: color + '20' }]}>
        <Text style={[styles.stepNumber, { color }]}>{number}</Text>
      </View>
      <View style={[styles.stepConnector, isLast && { opacity: 0 }]} />
    </View>
    <View style={styles.stepRight}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconSmall, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
));

interface StageItemProps {
  label: string;
  description: string;
  color: string;
  isActive?: boolean;
}

const StageItem = React.memo(({ label, description, color }: StageItemProps) => (
  <View style={styles.stageItem}>
    <View style={[styles.stageDot, { backgroundColor: color }]} />
    <View style={styles.stageText}>
      <Text style={[styles.stageLabel, { color }]}>{label}</Text>
      <Text style={styles.stageDesc}>{description}</Text>
    </View>
  </View>
));

function buildDailySteps(options: {
  peerPractice: boolean;
  rebuildPrograms: boolean;
  advancedAccountability: boolean;
}): Omit<StepCardProps, 'isLast'>[] {
  const rebuildDescription = options.rebuildPrograms
    ? 'Open the Rebuild tab and complete one habit-replacement or identity exercise. Consistency matters more than size.'
    : 'The Rebuild tab hosts Life Rebuild Programs (Premium). On the free tier you will see how to unlock them—keep momentum with Today, Progress, and Journal until you choose to upgrade.';

  const connectDescription = options.peerPractice
    ? 'Use the Connect tab for your trusted circle, support resources, and recovery-room style prompts when your build includes them—wellness practice only, not live therapy or crisis care.'
    : 'Use the Connect tab for your trusted circle and support resources—quick reach-outs buffer stress and isolation.';

  const accountabilityDescription = options.advancedAccountability
    ? 'Open Accountability for commitments, partner check-ins, and gentle structure. Pairing intentions with another person can make follow-through easier.'
    : 'Open Accountability for personal commitments and follow-through. Premium adds partner check-ins and simple drift alerts when you want more structure.';

  return [
    {
      number: 1,
      title: 'Start on Today',
      description:
        'Use the Today tab for morning, afternoon, and evening check-ins. Each one updates your stability picture. Review your recovery stability readout and follow any suggested next step—small actions add up.',
      icon: <Sun size={16} color="#FFB347" />,
      color: '#FFB347',
    },
    {
      number: 2,
      title: 'Check Progress',
      description:
        'Open the Progress tab for trends and how cravings, mood, and triggers show up over time. Use it to notice patterns—not to judge yourself.',
      icon: <TrendingUp size={16} color={Colors.primary} />,
      color: Colors.primary,
    },
    {
      number: 3,
      title: 'Journal',
      description:
        'Visit the Journal tab for a short entry or reflection. Putting feelings into words can ease intensity and help you spot themes later.',
      icon: <BookOpen size={16} color="#7C8CF8" />,
      color: '#7C8CF8',
    },
    {
      number: 4,
      title: 'Rebuild action',
      description: rebuildDescription,
      icon: <Hammer size={16} color="#42A5F5" />,
      color: '#42A5F5',
    },
    {
      number: 5,
      title: 'Connect',
      description: connectDescription,
      icon: <Users size={16} color="#AB47BC" />,
      color: '#AB47BC',
    },
    {
      number: 6,
      title: 'Accountability',
      description: accountabilityDescription,
      icon: <Handshake size={16} color="#2E7D32" />,
      color: '#2E7D32',
    },
    {
      number: 7,
      title: 'Evening wrap-up and safety',
      description:
        'Finish an evening check-in on Today when you can. If stress or urges rise at any time, open Crisis Mode early or use Quick Coping Tools (from Profile under Help) for breathing, urge support, and grounding.',
      icon: <Moon size={16} color="#5C6BC0" />,
      color: '#5C6BC0',
    },
  ];
}

export default function HowToUseScreen() {
  const router = useRouter();
  const { hasFeature } = useSubscription();
  const dailySteps = useMemo(
    () =>
      buildDailySteps({
        peerPractice: arePeerPracticeFeaturesEnabled(),
        rebuildPrograms: hasFeature('rebuild_programs'),
        advancedAccountability: hasFeature('advanced_accountability'),
      }),
    [hasFeature],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'How to Use Recovery Companion',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconBg}>
            <BookOpen size={28} color={Colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>How to Use{'\n'}Recovery Companion</Text>
          <Text style={styles.heroSubtitle}>
            Use it regularly and let Today be your home base. The bottom tabs support the rest of your week. This is a
            wellness and self-help companion—not medical care or crisis services.
          </Text>
          <Text style={styles.heroNote}>
            The flow below is a rhythm you can adapt. Small, honest check-ins and actions add structure to your day.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.startDayBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/(home)/today-hub' as any);
          }}
          testID="start-guided-day"
        >
          <Sun size={18} color={Colors.white} />
          <Text style={styles.startDayText}>Go to Today</Text>
        </Pressable>

        <ExpandableSection
          title="Daily Recovery Flow"
          icon={<CircleDot size={18} color={Colors.primary} />}
          defaultOpen={true}
          accentColor={Colors.primary}
        >
          <Text style={styles.sectionIntro}>
            These seven beats line up with your tabs—from Today through Accountability. Skip or reorder when life
            demands it; aim to touch each area across the week.
          </Text>
          <View style={styles.stepsContainer}>
            {dailySteps.map((step, index) => (
              <StepCard
                key={step.number}
                {...step}
                isLast={index === dailySteps.length - 1}
              />
            ))}
          </View>
        </ExpandableSection>

        <ExpandableSection
          title="Profile & settings"
          icon={<User size={18} color={Colors.primary} />}
          accentColor={Colors.primary}
        >
          <Text style={styles.bodyText}>
            Your profile and app settings live off the main tab bar. On Today and other main screens, use the icons
            at the top right: open Profile for sobriety date, notifications, subscription, and Help—including this
            guide, why stability matters, and Quick Coping Tools. Use Settings for security, privacy, and app preferences.
            Open the Progress tab for stability explainers; Premium unlocks the full Recovery Journey analytics screen.
          </Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Quick Coping Tools</Text>
            <Text style={styles.infoCardText}>
              From Profile, scroll to Help and tap Quick Coping Tools for short exercises sorted by calm, handling
              urges, and emotional support.
            </Text>
          </View>
        </ExpandableSection>

        <ExpandableSection
          title="How Crisis Mode Works"
          icon={<ShieldAlert size={18} color={Colors.danger} />}
          accentColor={Colors.danger}
        >
          <Text style={styles.bodyText}>
            Crisis Mode is your emergency support system. Activate it whenever you feel cravings intensifying, emotional overwhelm building, or urges becoming hard to manage. You can also open Quick Coping Tools from Profile first if you want a lighter entry point; both paths offer grounding and breathing support.
          </Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>When to activate</Text>
            <Text style={styles.infoCardText}>
              Don't wait until cravings peak. Early activation is far more effective. Even moderate discomfort is a valid reason to use it.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>What it does</Text>
            <Text style={styles.infoCardText}>
              Crisis Mode activates grounding exercises, breathing techniques, and distraction tools that help stabilize your nervous system. It interrupts the craving cycle before it escalates.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Why it works</Text>
            <Text style={styles.infoCardText}>
              Cravings follow a wave pattern - they rise, peak, and pass. Crisis Mode helps you ride the wave without acting on it. Each time you use it, you build stronger neural pathways for self-regulation.
            </Text>
          </View>
        </ExpandableSection>

        <ExpandableSection
          title="Stability readouts & support tone"
          icon={<BarChart3 size={18} color="#42A5F5" />}
          accentColor="#42A5F5"
        >
          <Text style={styles.bodyText}>
            Readouts combine your own check-ins (mood, cravings, sleep, stress, and similar signals) into a wellness-oriented snapshot—not a clinical diagnosis or medical risk assessment. You will see the overview on Today and more detail on Progress.
          </Text>
          <View style={styles.factorsList}>
            <View style={styles.factorItem}>
              <View style={[styles.factorDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.factorText}>Mood and emotional patterns</Text>
            </View>
            <View style={styles.factorItem}>
              <View style={[styles.factorDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.factorText}>Trigger exposure and craving levels</Text>
            </View>
            <View style={styles.factorItem}>
              <View style={[styles.factorDot, { backgroundColor: '#42A5F5' }]} />
              <Text style={styles.factorText}>Daily engagement and consistency</Text>
            </View>
            <View style={styles.factorItem}>
              <View style={[styles.factorDot, { backgroundColor: '#AB47BC' }]} />
              <Text style={styles.factorText}>Behavioral patterns over time</Text>
            </View>
            <View style={styles.factorItem}>
              <View style={[styles.factorDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.factorText}>Sleep quality and stress levels</Text>
            </View>
          </View>
          <View style={[styles.infoCard, { borderColor: '#42A5F520' }]}>
            <Text style={styles.infoCardText}>
              When your entries suggest more strain, the app surfaces extra support tools and gentler pacing. That is protective, not punishment—more suggestions simply mean more options to choose from.
            </Text>
          </View>
        </ExpandableSection>

        <ExpandableSection
          title="Recovery Stages"
          icon={<Layers size={18} color={Colors.success} />}
          accentColor={Colors.success}
        >
          <Text style={styles.bodyText}>
            The app recognizes four recovery stages and adapts automatically based on your progress and patterns.
          </Text>
          <View style={styles.stagesContainer}>
            <StageItem
              label="Crisis"
              description="Immediate stabilization. Focus on safety, grounding, and getting through the moment."
              color={Colors.danger}
            />
            <StageItem
              label="Stabilize"
              description="Building daily rhythms. Establishing check-in habits and learning your trigger patterns."
              color="#FF9800"
            />
            <StageItem
              label="Rebuild"
              description="Active identity growth. Replacing old habits with new ones and developing resilience."
              color="#42A5F5"
            />
            <StageItem
              label="Maintain"
              description="Long-term protection. Sustaining progress, deepening connections, and preventing complacency."
              color={Colors.success}
            />
          </View>
          <Text style={[styles.bodyText, { marginTop: 12 }]}>
            You may move between stages - that's normal. The app adjusts its guidance to meet you where you are.
          </Text>
        </ExpandableSection>

        <ExpandableSection
          title="Best Results"
          icon={<Sparkles size={18} color="#FFB347" />}
          accentColor="#FFB347"
        >
          <View style={styles.guidelinesList}>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Use Today and check-ins regularly—even on good days. Consistency builds protection.
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Be honest in your check-ins. The app can only help with what it knows.
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Activate Crisis Mode early, or use Quick Coping Tools from Profile when stress is climbing.
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Journal when you can and complete Rebuild actions over the week. Small steps compound.
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Reach out through Connect and use Accountability for structure. Isolation is recovery's biggest threat.
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Use Progress for trends and stability explainers; subscribe to Premium if you want the full Recovery Journey analytics.
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.guidelineText}>
                Review Progress weekly. Seeing growth reinforces motivation.
              </Text>
            </View>
          </View>
          <View style={[styles.infoCard, { borderColor: '#FFB34720', marginTop: 8 }]}>
            <Text style={styles.infoCardText}>
              Recovery isn't about being perfect. It's about showing up. Every check-in, every grounding exercise, every connection matters - even on the hard days.
            </Text>
          </View>
        </ExpandableSection>

        <View style={styles.footerCard}>
          <Heart size={20} color={Colors.primary} />
          <Text style={styles.footerText}>
            You're doing something brave. This app is here to walk beside you, every step of the way.
          </Text>
        </View>

        <WellnessDisclaimerFooter style={{ marginTop: 16 }} />

        <View style={styles.bottomSpacer} />
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center' as const,
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  heroIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    lineHeight: 36,
    marginBottom: 14,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 23,
    marginBottom: 8,
  },
  heroNote: {
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  guidedModeCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  guidedLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  guidedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  guidedTextWrap: {
    flex: 1,
  },
  guidedTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  guidedDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  startDayBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 10,
    marginBottom: 16,
  },
  startDayText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  expandableContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  expandableHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
  },
  expandableLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  expandableTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  expandableBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 2,
  },
  sectionIntro: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 18,
  },
  stepsContainer: {
    gap: 0,
  },
  stepCard: {
    flexDirection: 'row' as const,
    gap: 14,
  },
  stepLeft: {
    alignItems: 'center' as const,
    width: 36,
  },
  stepNumberBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
    borderRadius: 1,
  },
  stepRight: {
    flex: 1,
    paddingBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  stepIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 36,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 5,
  },
  infoCardText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  factorsList: {
    gap: 10,
    marginBottom: 14,
  },
  factorItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  factorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  stagesContainer: {
    gap: 12,
    marginTop: 4,
  },
  stageItem: {
    flexDirection: 'row' as const,
    gap: 12,
    alignItems: 'flex-start' as const,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  stageText: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 3,
  },
  stageDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  guidelinesList: {
    gap: 14,
  },
  guidelineItem: {
    flexDirection: 'row' as const,
    gap: 10,
    alignItems: 'flex-start' as const,
  },
  guidelineText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 0 : 1,
  },
  footerCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    backgroundColor: Colors.primary + '0A',
    borderRadius: 14,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '18',
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic' as const,
  },
  bottomSpacer: {
    height: 20,
  },
});
