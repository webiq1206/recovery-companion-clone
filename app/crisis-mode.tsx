import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Wind,
  Eye,
  Timer,
  Brain,
  Phone,
  ChevronRight,
  Heart,
  Hand,
  Ear,
  Flower2,
  Cookie,
  ArrowRight,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/core/domains/useUser';
import { useSupportContacts } from '@/core/domains/useSupportContacts';
import { generateCrisisSupportMessage } from '@/constants/companion';

type CrisisStep = 'landing' | 'breathing' | 'grounding' | 'urge-timer' | 'reset' | 'connect';

const STEPS: CrisisStep[] = ['landing', 'breathing', 'grounding', 'urge-timer', 'reset', 'connect'];

const GROUNDING_STEPS = [
  { count: 5, sense: 'SEE', icon: 'eye', prompt: 'Name 5 things you can see', color: '#4FC3F7' },
  { count: 4, sense: 'TOUCH', icon: 'hand', prompt: 'Name 4 things you can touch', color: '#81C784' },
  { count: 3, sense: 'HEAR', icon: 'ear', prompt: 'Name 3 things you can hear', color: '#FFB74D' },
  { count: 2, sense: 'SMELL', icon: 'flower', prompt: 'Name 2 things you can smell', color: '#CE93D8' },
  { count: 1, sense: 'TASTE', icon: 'taste', prompt: 'Name 1 thing you can taste', color: '#EF9A9A' },
];

const RESET_PROMPTS = [
  'This craving is temporary.\nIt will pass.',
  'You have survived every\ndifficult moment so far.',
  'One minute at a time.\nJust this minute.',
  'Your future self\nwill thank you.',
  'You are stronger\nthan this urge.',
  'Think of one person\nwho believes in you.',
  'Remember why you\nstarted this journey.',
];

const BG = '#080E1A';
const CARD = '#0F1926';
const BORDER = '#182740';
const ACCENT = '#2EC4B6';
const TXT = '#E8EFF6';
const MUTED = '#4A6A8A';
const BREATHE_IN = '#2EC4B6';
const BREATHE_OUT = '#1A6B64';

function GroundingIcon({ type, size, color }: { type: string; size: number; color: string }) {
  switch (type) {
    case 'eye': return <Eye size={size} color={color} />;
    case 'hand': return <Hand size={size} color={color} />;
    case 'ear': return <Ear size={size} color={color} />;
    case 'flower': return <Flower2 size={size} color={color} />;
    case 'taste': return <Cookie size={size} color={color} />;
    default: return <Eye size={size} color={color} />;
  }
}

export default function CrisisModeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUser();
  const { emergencyContacts } = useSupportContacts();

  const [currentStep, setCurrentStep] = useState<CrisisStep>('landing');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCount, setBreathCount] = useState(0);
  const companionMessage = generateCrisisSupportMessage(currentStep, breathCount);
  const companionFade = useRef(new Animated.Value(0)).current;
  const [breathTimer, setBreathTimer] = useState(4);
  const [groundingIndex, setGroundingIndex] = useState(0);
  const [groundingChecked, setGroundingChecked] = useState<number[]>([]);
  const [urgeSeconds, setUrgeSeconds] = useState(0);
  const [urgeRunning, setUrgeRunning] = useState(false);
  const [resetIndex, setResetIndex] = useState(0);

  const breathCircleAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const landingPulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    companionFade.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.timing(companionFade, { toValue: 1, duration: 700, delay: 300, useNativeDriver: true }).start();
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 'landing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(landingPulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(landingPulse, { toValue: 0.6, duration: 2500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [currentStep]);

  const breathPhaseRef = useRef(breathPhase);
  useEffect(() => {
    breathPhaseRef.current = breathPhase;
  }, [breathPhase]);

  useEffect(() => {
    if (currentStep !== 'breathing') return;

    const phaseDurations = { in: 4, hold: 4, out: 6 };
    const duration = phaseDurations[breathPhase];
    setBreathTimer(duration);

    if (breathPhase === 'in') {
      Animated.timing(breathCircleAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: true,
      }).start();
    } else if (breathPhase === 'out') {
      Animated.timing(breathCircleAnim, {
        toValue: 0.4,
        duration: duration * 1000,
        useNativeDriver: true,
      }).start();
    }

    let cleared = false;
    const countdown = setInterval(() => {
      if (cleared) return;
      setBreathTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          cleared = true;
          const currentPhase = breathPhaseRef.current;
          if (currentPhase === 'in') {
            setBreathPhase('hold');
          } else if (currentPhase === 'hold') {
            setBreathPhase('out');
          } else {
            setBreathCount(c => c + 1);
            setBreathPhase('in');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cleared = true;
      clearInterval(countdown);
    };
  }, [currentStep, breathPhase, breathCount]);

  useEffect(() => {
    if (currentStep !== 'urge-timer' || !urgeRunning) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const interval = setInterval(() => {
      setUrgeSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      pulse.stop();
      clearInterval(interval);
    };
  }, [currentStep, urgeRunning]);

  const goToStep = useCallback((step: CrisisStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      goToStep(STEPS[idx + 1]);
    }
  }, [currentStep, goToStep]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }, [router]);

  const handleCallContact = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const cleaned = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Unable to Call', `Please dial ${phone} manually.`);
    });
  }, []);

  const handleSMSContact = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleaned = phone.replace(/[^0-9+]/g, '');
    const message = encodeURIComponent(`I'm having a tough moment and could use some support. - ${profile.name || 'Me'}`);
    const separator = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${cleaned}${separator}body=${message}`).catch(() => {
      Alert.alert('Unable to Text', `Please text ${phone} manually.`);
    });
  }, [profile.name]);

  const groundingIndexRef = useRef(groundingIndex);
  useEffect(() => {
    groundingIndexRef.current = groundingIndex;
  }, [groundingIndex]);

  const handleGroundingCheck = useCallback((itemIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGroundingChecked(prev => {
      if (prev.includes(itemIndex)) return prev;
      const next = [...prev, itemIndex];
      const gi = groundingIndexRef.current;
      const currentGrounding = GROUNDING_STEPS[gi];
      if (next.length >= currentGrounding.count) {
        setTimeout(() => {
          const latestGi = groundingIndexRef.current;
          if (latestGi < GROUNDING_STEPS.length - 1) {
            setGroundingIndex(g => g + 1);
            setGroundingChecked([]);
          } else {
            goNext();
          }
        }, 600);
      }
      return next;
    });
  }, [goNext]);

  const handleNextReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (resetIndex < RESET_PROMPTS.length - 1) {
      setResetIndex(prev => prev + 1);
    } else {
      goNext();
    }
  }, [resetIndex, goNext]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const stepIndex = STEPS.indexOf(currentStep);

  const renderLanding = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Animated.View style={[styles.landingCircle, { opacity: landingPulse }]}>
        <Heart size={56} color={ACCENT} />
      </Animated.View>
      <Text style={styles.landingTitle}>You're safe.</Text>
      <Text style={styles.landingSubtitle}>
        This feeling will pass.{'\n'}Let's walk through this together.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.bigButton, pressed && styles.bigButtonPressed]}
        onPress={goNext}
        testID="crisis-start"
      >
        <Text style={styles.bigButtonText}>I'm ready</Text>
        <ArrowRight size={24} color="#FFFFFF" />
      </Pressable>

      {emergencyContacts.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.quickCallBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleCallContact(emergencyContacts[0].phone)}
          testID="crisis-quick-call"
        >
          <Phone size={20} color={ACCENT} />
          <Text style={styles.quickCallText}>Call {emergencyContacts[0].name}</Text>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [styles.emergencyCallBtn, pressed && { opacity: 0.7 }]}
        onPress={() => handleCallContact('988')}
        testID="crisis-988"
      >
        <Phone size={18} color="#EF5350" />
        <Text style={styles.emergencyCallText}>988 Crisis Lifeline</Text>
      </Pressable>
    </Animated.View>
  );

  const renderBreathing = () => {
    const breathLabel = breathPhase === 'in' ? 'Breathe In' : breathPhase === 'hold' ? 'Hold' : 'Breathe Out';
    const breathColor = breathPhase === 'out' ? BREATHE_OUT : BREATHE_IN;

    return (
      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.stepLabel}>Breathe</Text>
        <Text style={styles.stepHint}>Follow the circle</Text>

        <View style={styles.breathWrapper}>
          <Animated.View
            style={[
              styles.breathCircle,
              {
                borderColor: breathColor,
                transform: [{ scale: breathCircleAnim }],
              },
            ]}
          >
            <Text style={[styles.breathPhaseText, { color: breathColor }]}>{breathLabel}</Text>
            <Text style={styles.breathTimerText}>{breathTimer}</Text>
          </Animated.View>
        </View>

        <Text style={styles.breathCountText}>Cycle {breathCount + 1}</Text>

        <Pressable
          style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.7 }]}
          onPress={goNext}
          testID="crisis-skip-breathing"
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <ChevronRight size={20} color={MUTED} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderGrounding = () => {
    const current = GROUNDING_STEPS[groundingIndex];
    const items = Array.from({ length: current.count }, (_, i) => i);

    return (
      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.stepLabel}>Ground Yourself</Text>
        <Text style={styles.stepHint}>Focus on your senses</Text>

        <View style={[styles.groundingIconWrapper, { backgroundColor: current.color + '15' }]}>
          <GroundingIcon type={current.icon} size={40} color={current.color} />
        </View>

        <Text style={[styles.groundingSense, { color: current.color }]}>{current.sense}</Text>
        <Text style={styles.groundingPrompt}>{current.prompt}</Text>

        <View style={styles.groundingChecks}>
          {items.map((i) => {
            const checked = groundingChecked.includes(i);
            return (
              <Pressable
                key={i}
                style={[
                  styles.groundingCheckItem,
                  checked && { backgroundColor: current.color + '25', borderColor: current.color },
                ]}
                onPress={() => handleGroundingCheck(i)}
                testID={`grounding-check-${i}`}
              >
                {checked ? (
                  <Check size={28} color={current.color} />
                ) : (
                  <Text style={styles.groundingCheckNum}>{i + 1}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.groundingProgress}>
          {GROUNDING_STEPS.map((s, i) => (
            <View
              key={i}
              style={[
                styles.groundingDot,
                i === groundingIndex && { backgroundColor: current.color, width: 24 },
                i < groundingIndex && { backgroundColor: ACCENT },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.7 }]}
          onPress={goNext}
          testID="crisis-skip-grounding"
        >
          <Text style={styles.continueBtnText}>Skip</Text>
          <ChevronRight size={20} color={MUTED} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderUrgeTimer = () => {
    const progress = Math.min(urgeSeconds / 600, 1);

    return (
      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.stepLabel}>Ride the Wave</Text>
        <Text style={styles.stepHint}>Cravings peak then fade</Text>

        <Animated.View style={[styles.urgeTimerCircle, { transform: [{ scale: urgeRunning ? pulseAnim : 1 }] }]}>
          <Text style={styles.urgeTimerText}>{formatTime(urgeSeconds)}</Text>
          <Text style={styles.urgeTimerLabel}>
            {urgeSeconds < 60 ? 'Stay with it' : urgeSeconds < 300 ? 'You\'re doing great' : 'Almost through'}
          </Text>
        </Animated.View>

        <View style={styles.urgeProgressBar}>
          <View style={[styles.urgeProgressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.urgeProgressLabel}>Most urges fade within 10-15 minutes</Text>

        {!urgeRunning ? (
          <Pressable
            style={({ pressed }) => [styles.bigButton, pressed && styles.bigButtonPressed]}
            onPress={() => { setUrgeRunning(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            testID="crisis-start-timer"
          >
            <Timer size={24} color="#FFFFFF" />
            <Text style={styles.bigButtonText}>Start Timer</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.bigButton, { backgroundColor: BORDER }, pressed && { opacity: 0.8 }]}
            onPress={() => { setUrgeRunning(false); setUrgeSeconds(0); }}
            testID="crisis-reset-timer"
          >
            <RotateCcw size={22} color={TXT} />
            <Text style={[styles.bigButtonText, { color: TXT }]}>Reset</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.7 }]}
          onPress={goNext}
          testID="crisis-skip-timer"
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <ChevronRight size={20} color={MUTED} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderReset = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.stepLabel}>Reset</Text>
      <Text style={styles.stepHint}>Read slowly. Let each word sink in.</Text>

      <View style={styles.resetCard}>
        <Brain size={32} color={ACCENT} style={{ marginBottom: 20 }} />
        <Text style={styles.resetPrompt}>{RESET_PROMPTS[resetIndex]}</Text>
      </View>

      <Text style={styles.resetCounter}>{resetIndex + 1} of {RESET_PROMPTS.length}</Text>

      <Pressable
        style={({ pressed }) => [styles.bigButton, pressed && styles.bigButtonPressed]}
        onPress={handleNextReset}
        testID="crisis-next-reset"
      >
        <Text style={styles.bigButtonText}>
          {resetIndex < RESET_PROMPTS.length - 1 ? 'Next' : 'Continue'}
        </Text>
        <ArrowRight size={24} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );

  const renderConnect = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.stepLabel}>Reach Out</Text>
      <Text style={styles.stepHint}>You don't have to do this alone</Text>

      <ScrollView
        style={styles.connectScroll}
        contentContainerStyle={styles.connectScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {emergencyContacts.length > 0 ? (
          <>
            <Text style={styles.connectSectionLabel}>YOUR CONTACTS</Text>
            {emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.connectCard}>
                <View style={styles.connectAvatar}>
                  <Text style={styles.connectAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.connectInfo}>
                  <Text style={styles.connectName}>{contact.name}</Text>
                  <Text style={styles.connectPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.connectActions}>
                  <Pressable
                    style={({ pressed }) => [styles.connectCallBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => handleCallContact(contact.phone)}
                    testID={`crisis-call-${contact.id}`}
                  >
                    <Phone size={22} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.connectTextBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => handleSMSContact(contact.phone)}
                    testID={`crisis-text-${contact.id}`}
                  >
                    <Text style={styles.connectTextBtnLabel}>Text</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noContactsCard}>
            <Text style={styles.noContactsText}>
              Add personal contacts in Profile to quickly reach out during moments like this.
            </Text>
          </View>
        )}

        <Text style={[styles.connectSectionLabel, { marginTop: 24 }]}>CRISIS LINES</Text>
        <Pressable
          style={({ pressed }) => [styles.crisisLineCard, pressed && { opacity: 0.8 }]}
          onPress={() => handleCallContact('988')}
          testID="crisis-call-988"
        >
          <View style={[styles.crisisLineIcon, { backgroundColor: '#EF535020' }]}>
            <Phone size={22} color="#EF5350" />
          </View>
          <View style={styles.crisisLineInfo}>
            <Text style={styles.crisisLineName}>988 Crisis Lifeline</Text>
            <Text style={styles.crisisLineAvail}>24/7 · Call or Text</Text>
          </View>
          <ChevronRight size={18} color={MUTED} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.crisisLineCard, pressed && { opacity: 0.8 }]}
          onPress={() => handleCallContact('1-800-662-4357')}
          testID="crisis-call-samhsa"
        >
          <View style={[styles.crisisLineIcon, { backgroundColor: ACCENT + '20' }]}>
            <Phone size={22} color={ACCENT} />
          </View>
          <View style={styles.crisisLineInfo}>
            <Text style={styles.crisisLineName}>SAMHSA Helpline</Text>
            <Text style={styles.crisisLineAvail}>24/7 · 1-800-662-4357</Text>
          </View>
          <ChevronRight size={18} color={MUTED} />
        </Pressable>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.doneButton, pressed && { opacity: 0.9 }]}
        onPress={handleClose}
        testID="crisis-done"
      >
        <Text style={styles.doneButtonText}>I'm feeling better</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'landing': return renderLanding();
      case 'breathing': return renderBreathing();
      case 'grounding': return renderGrounding();
      case 'urge-timer': return renderUrgeTimer();
      case 'reset': return renderReset();
      case 'connect': return renderConnect();
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.header}>
        {currentStep !== 'landing' && (
          <View style={styles.progressRow}>
            {STEPS.slice(1).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressSegment,
                  i < stepIndex && styles.progressSegmentDone,
                  i === stepIndex - 1 && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
        )}
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={handleClose}
          hitSlop={20}
          testID="crisis-close"
        >
          <X size={24} color={MUTED} />
        </Pressable>
      </View>

      {renderStep()}

      <Animated.View style={[styles.companionBar, { opacity: companionFade }]}>
        <Pressable
          style={({ pressed }) => [styles.companionBarInner, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/companion-chat' as any, params: { context: 'crisis' } });
          }}
          testID="crisis-companion-btn"
        >
          <View style={styles.companionBarDot} />
          <Text style={styles.companionBarText} numberOfLines={2}>{companionMessage}</Text>
          <ChevronRight size={16} color={MUTED} />
        </Pressable>
      </Animated.View>

      <Pressable
        style={({ pressed }) => [styles.relapsePlanBar, pressed && { opacity: 0.9 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/relapse-plan' as any);
        }}
        testID="crisis-relapse-plan-cta"
      >
        <View style={styles.relapsePlanDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.relapsePlanTitle}>Open your Relapse Plan</Text>
          <Text style={styles.relapsePlanSubtitle}>
            Re-center on your warning signs, coping strategies, and support contacts while you use these tools.
          </Text>
        </View>
        <ChevronRight size={16} color={MUTED} />
      </Pressable>

      {currentStep !== 'landing' && currentStep !== 'connect' && (
        <View style={styles.stepNav}>
          {STEPS.slice(1).map((step) => {
            const isActive = step === currentStep;
            const isDone = STEPS.indexOf(step) < stepIndex;
            const StepIcon = step === 'breathing' ? Wind
              : step === 'grounding' ? Eye
              : step === 'urge-timer' ? Timer
              : step === 'reset' ? Brain
              : Phone;

            return (
              <Pressable
                key={step}
                style={[
                  styles.stepNavItem,
                  isActive && styles.stepNavItemActive,
                ]}
                onPress={() => goToStep(step)}
                hitSlop={8}
                testID={`crisis-nav-${step}`}
              >
                <StepIcon size={18} color={isActive ? ACCENT : isDone ? ACCENT + '80' : MUTED} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 12,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
  },
  progressSegmentDone: {
    backgroundColor: ACCENT + '60',
  },
  progressSegmentActive: {
    backgroundColor: ACCENT,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  landingCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: ACCENT + '10',
    borderWidth: 2,
    borderColor: ACCENT + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  landingTitle: {
    fontSize: 38,
    fontWeight: '300' as const,
    color: TXT,
    marginBottom: 16,
    letterSpacing: 1,
  },
  landingSubtitle: {
    fontSize: 18,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 48,
  },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: ACCENT,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 48,
    width: '100%',
    maxWidth: 340,
    minHeight: 64,
  },
  bigButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  bigButtonText: {
    fontSize: 19,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  quickCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT + '35',
    backgroundColor: ACCENT + '08',
    minHeight: 56,
  },
  quickCallText: {
    fontSize: 17,
    fontWeight: '500' as const,
    color: ACCENT,
  },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  emergencyCallText: {
    fontSize: 16,
    color: '#EF5350',
    fontWeight: '500' as const,
  },
  stepLabel: {
    fontSize: 30,
    fontWeight: '300' as const,
    color: TXT,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepHint: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 32,
    textAlign: 'center',
  },
  breathWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    marginBottom: 20,
  },
  breathCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT + '06',
  },
  breathPhaseText: {
    fontSize: 22,
    fontWeight: '400' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  breathTimerText: {
    fontSize: 52,
    fontWeight: '200' as const,
    color: TXT,
  },
  breathCountText: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 24,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 12,
    minHeight: 52,
  },
  continueBtnText: {
    fontSize: 16,
    color: MUTED,
    fontWeight: '500' as const,
  },
  groundingIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  groundingSense: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 4,
    marginBottom: 12,
  },
  groundingPrompt: {
    fontSize: 20,
    color: TXT,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 28,
    fontWeight: '300' as const,
  },
  groundingChecks: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  groundingCheckItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
  },
  groundingCheckNum: {
    fontSize: 20,
    color: MUTED,
    fontWeight: '300' as const,
  },
  groundingProgress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  groundingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BORDER,
  },
  urgeTimerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: ACCENT + '35',
    backgroundColor: ACCENT + '08',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  urgeTimerText: {
    fontSize: 48,
    fontWeight: '200' as const,
    color: TXT,
    fontVariant: ['tabular-nums'],
  },
  urgeTimerLabel: {
    fontSize: 15,
    color: ACCENT,
    marginTop: 8,
    fontWeight: '400' as const,
  },
  urgeProgressBar: {
    width: '100%',
    maxWidth: 300,
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  urgeProgressFill: {
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  urgeProgressLabel: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 28,
  },
  resetCard: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
    maxWidth: 340,
  },
  resetPrompt: {
    fontSize: 24,
    color: TXT,
    textAlign: 'center',
    lineHeight: 36,
    fontWeight: '300' as const,
    letterSpacing: 0.3,
  },
  resetCounter: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 24,
  },
  connectScroll: {
    flex: 1,
    width: '100%',
    maxWidth: 380,
  },
  connectScrollContent: {
    paddingBottom: 20,
  },
  connectSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: MUTED,
    letterSpacing: 2,
    marginBottom: 12,
  },
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 80,
  },
  connectAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  connectAvatarText: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: ACCENT,
  },
  connectInfo: {
    flex: 1,
  },
  connectName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: TXT,
    marginBottom: 2,
  },
  connectPhone: {
    fontSize: 14,
    color: MUTED,
  },
  connectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  connectCallBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectTextBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectTextBtnLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: ACCENT,
  },
  noContactsCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: BORDER,
  },
  noContactsText: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 24,
  },
  crisisLineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 76,
  },
  crisisLineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  crisisLineInfo: {
    flex: 1,
  },
  crisisLineName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: TXT,
    marginBottom: 2,
  },
  crisisLineAvail: {
    fontSize: 13,
    color: MUTED,
  },
  doneButton: {
    backgroundColor: ACCENT,
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    marginHorizontal: 28,
    marginTop: 8,
    minHeight: 64,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  stepNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  stepNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  stepNavItemActive: {
    backgroundColor: ACCENT + '12',
  },
  companionBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  companionBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: ACCENT + '18',
    minHeight: 56,
  },
  companionBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  companionBarText: {
    flex: 1,
    fontSize: 14,
    color: TXT,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  relapsePlanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: ACCENT + '18',
  },
  relapsePlanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  relapsePlanTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TXT,
  },
  relapsePlanSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
});
