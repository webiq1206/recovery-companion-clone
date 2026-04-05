import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/core/domains/useUser';
import { useSupportContacts } from '@/core/domains/useSupportContacts';
import { useConnection } from '@/providers/ConnectionProvider';
import { mergeTrustedAndEmergencyContacts } from '@/utils/mergeEmergencyContacts';
import { useRelapse } from '@/core/domains/useRelapse';
import { generateCrisisSupportMessage } from '@/constants/companion';
import { getToolsForContext } from '@/features/tools/registry';
import type { ToolId } from '@/features/tools/types';
import { useHydrateToolUsageStore, useToolUsageStore } from '@/features/tools/state/useToolUsageStore';
import { CrisisLandingStep } from '@/features/crisis/ui/CrisisLandingStep';
import { CrisisBreathingStep } from '@/features/crisis/ui/CrisisBreathingStep';
import { CrisisGroundingStep } from '@/features/crisis/ui/CrisisGroundingStep';
import { CrisisUrgeTimerStep } from '@/features/crisis/ui/CrisisUrgeTimerStep';
import { CrisisResetStep } from '@/features/crisis/ui/CrisisResetStep';
import { CrisisConnectStep } from '@/features/crisis/ui/CrisisConnectStep';
import { CrisisProgressRow } from '@/features/crisis/ui/CrisisProgressRow';
import { CrisisStepNav } from '@/features/crisis/ui/CrisisStepNav';
import { CrisisCompanionBar } from '@/features/crisis/ui/CrisisCompanionBar';
import { CrisisRelapsePlanCta } from '@/features/crisis/ui/CrisisRelapsePlanCta';
import { crisisStyles, CRISIS_COLORS } from '@/features/crisis/ui/styles';
import { CrisisStateActions, type CrisisStateId } from '@/features/crisis/ui/CrisisStateActions';
import { CRISIS_BREATH_MAX_CYCLES, GROUNDING_STEPS, RESET_PROMPTS } from '@/features/crisis/ui/constants';

type CrisisStep = 'landing' | ToolId;

const CRISIS_TOOL_IDS = getToolsForContext('crisis')
  .filter((t) => !t.excludeFromCrisisStepFlow)
  .map((t) => t.id);

const STEPS: CrisisStep[] = ['landing', ...CRISIS_TOOL_IDS];

export default function CrisisModeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUser();
  const { emergencyContacts } = useSupportContacts();
  const { trustedContacts } = useConnection();
  const contactsForCrisis = useMemo(
    () => mergeTrustedAndEmergencyContacts(trustedContacts ?? [], emergencyContacts ?? []),
    [trustedContacts, emergencyContacts],
  );
  const { logCrisisActivation } = useRelapse();
  useHydrateToolUsageStore();
  const logToolUsage = useToolUsageStore.use.logToolUsage();

  const [currentStep, setCurrentStep] = useState<CrisisStep>('landing');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCount, setBreathCount] = useState(0);
  const [breathingComplete, setBreathingComplete] = useState(false);
  const companionMessage = generateCrisisSupportMessage(currentStep, breathCount);
  const companionFade = useRef(new Animated.Value(0)).current;
  const [breathTimer, setBreathTimer] = useState(4);
  const [groundingIndex, setGroundingIndex] = useState(0);
  const [groundingChecked, setGroundingChecked] = useState<number[]>([]);
  const [urgeSeconds, setUrgeSeconds] = useState(0);
  const [urgeRunning, setUrgeRunning] = useState(false);
  const [resetIndex, setResetIndex] = useState(0);
  const [currentState, setCurrentState] = useState<CrisisStateId | null>(null);

  const breathCircleAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const landingPulse = useRef(new Animated.Value(0.6)).current;

  // Log a crisis activation domain event when the flow is first opened.
  useEffect(() => {
    logCrisisActivation();
  }, [logCrisisActivation]);

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

  const breathCountRef = useRef(breathCount);
  useEffect(() => {
    breathCountRef.current = breathCount;
  }, [breathCount]);

  useEffect(() => {
    if (currentStep !== 'breathing') return;
    setBreathCount(0);
    setBreathPhase('in');
    setBreathingComplete(false);
    breathCircleAnim.setValue(0.4);
  }, [currentStep, breathCircleAnim]);

  const wasBreathingCompleteRef = useRef(false);
  useEffect(() => {
    if (breathingComplete && !wasBreathingCompleteRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasBreathingCompleteRef.current = breathingComplete;
  }, [breathingComplete]);

  useEffect(() => {
    if (currentStep !== 'breathing' || breathingComplete) return;

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
            const c = breathCountRef.current;
            if (c >= CRISIS_BREATH_MAX_CYCLES - 1) {
              setBreathingComplete(true);
            } else {
              setBreathCount(c + 1);
              setBreathPhase('in');
            }
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
  }, [currentStep, breathPhase, breathingComplete]);

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
    if (step !== 'landing') {
      logToolUsage({ toolId: step, context: 'crisis', action: 'opened' });
    }
  }, [logToolUsage]);

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
    logToolUsage({ toolId: 'connect', context: 'crisis', action: 'completed', meta: { method: 'call', phone } });
    const cleaned = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Unable to Call', `Please dial ${phone} manually.`);
    });
  }, [logToolUsage]);

  const handleSMSContact = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logToolUsage({ toolId: 'connect', context: 'crisis', action: 'completed', meta: { method: 'text', phone } });
    const cleaned = phone.replace(/[^0-9+]/g, '');
    const displayName = profile?.name || 'Me';
    const message = encodeURIComponent(`I'm having a tough moment and could use some support. - ${displayName}`);
    const separator = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${cleaned}${separator}body=${message}`).catch(() => {
      Alert.alert('Unable to Text', `Please text ${phone} manually.`);
    });
  }, [logToolUsage, profile?.name]);

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

  const stepIndex = STEPS.indexOf(currentStep);
  const toolSteps = STEPS.slice(1) as ToolId[];

  const renderStep = () => {
    const breathColor = breathPhase === 'out' ? CRISIS_COLORS.BREATHE_OUT : CRISIS_COLORS.BREATHE_IN;
    switch (currentStep) {
      case 'landing':
        return (
          <>
            <ScreenScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{
                paddingBottom: insets.bottom + 24,
                paddingHorizontal: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <CrisisLandingStep
                fadeAnim={fadeAnim}
                landingPulse={landingPulse}
                onCall988={() => handleCallContact('988')}
              />
              <CrisisStateActions
                selectedState={currentState}
                onSelectState={setCurrentState}
              />
            </ScreenScrollView>
            <View style={crisisStyles.crisisLandingReadyWrap}>
              <Pressable
                style={({ pressed }) => [crisisStyles.bigButton, pressed && crisisStyles.bigButtonPressed]}
                onPress={goNext}
                testID="crisis-start"
              >
                <Text style={crisisStyles.bigButtonText}>I'm ready</Text>
                <ArrowRight size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </>
        );
      case 'breathing':
        return (
          <CrisisBreathingStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            breathPhase={breathPhase}
            breathTimer={breathTimer}
            breathCount={breathCount}
            breathCircleAnim={breathCircleAnim}
            breathColor={breathColor}
            breathingComplete={breathingComplete}
            onContinue={goNext}
          />
        );
      case 'grounding':
        return (
          <CrisisGroundingStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            groundingIndex={groundingIndex}
            groundingChecked={groundingChecked}
            onCheck={handleGroundingCheck}
            onSkip={goNext}
          />
        );
      case 'urge-timer':
        return (
          <CrisisUrgeTimerStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            pulseAnim={pulseAnim}
            urgeSeconds={urgeSeconds}
            urgeRunning={urgeRunning}
            onStart={() => {
              setUrgeRunning(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            onReset={() => {
              setUrgeRunning(false);
              setUrgeSeconds(0);
            }}
            onContinue={goNext}
          />
        );
      case 'reset':
        return <CrisisResetStep fadeAnim={fadeAnim} slideAnim={slideAnim} resetIndex={resetIndex} onNext={handleNextReset} />;
      case 'connect':
        return (
          <CrisisConnectStep
            emergencyContacts={contactsForCrisis}
            onCallContact={handleCallContact}
            onTextContact={handleSMSContact}
            onClose={handleClose}
          />
        );
      default: return null;
    }
  };

  return (
    <View style={[crisisStyles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      <View style={crisisStyles.header}>
        {currentStep !== 'landing' && (
          <CrisisProgressRow total={toolSteps.length} activeIndex={Math.max(stepIndex - 1, 0)} />
        )}
        <Pressable
          style={({ pressed }) => [crisisStyles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={handleClose}
          hitSlop={20}
          testID="crisis-close"
        >
          <X size={24} color={CRISIS_COLORS.MUTED} />
        </Pressable>
      </View>

      {renderStep()}

      {currentStep !== 'landing' && (
        <CrisisCompanionBar
          companionFade={companionFade}
          message={companionMessage}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/companion-chat' as any, params: { context: 'crisis' } });
          }}
        />
      )}

      <CrisisRelapsePlanCta
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/relapse-plan' as any);
        }}
      />

      {currentStep !== 'landing' && currentStep !== 'connect' && (
        <CrisisStepNav
          steps={toolSteps}
          currentStep={currentStep as ToolId}
          stepIndex={stepIndex - 1}
          onGoToStep={goToStep as (s: ToolId) => void}
        />
      )}
    </View>
  );
}
