import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, Dimensions, Switch, Image } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, ChevronRight, ChevronLeft, Eye, EyeOff, Target, AlertTriangle, Heart, Zap, Shield, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useUser } from '../core/domains/useUser';
import { useSupportContacts } from '../core/domains/useSupportContacts';
import { useAccountability } from '../core/domains/useAccountability';
import { calculateRiskScore, calculateInterventionIntensity, calculateBaselineStability } from '../providers/RecoveryProvider';
import { ADDICTION_TYPES } from '../constants/milestones';
import { ONBOARDING_COPY, BRAND } from '../constants/branding';
import { RecoveryStage, RecoveryProfile, PrivacyControls } from '../types';
import type { StruggleLevel, SleepQualityLevel, SupportAvailability } from '../types';
import {
  getAllOnboardingStepDefs,
  getRemainingOnboardingSteps,
  type OnboardingStepId,
} from '../utils/wizardSteps';
import { useAppStore } from '../stores/useAppStore';
import { LegalDocLinksRow } from '../components/LegalDocLinksRow';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECOVERY_STAGES: { value: RecoveryStage; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'crisis',
    label: 'I need immediate support',
    desc: 'I’m in a crisis or close to it',
    icon: <AlertTriangle size={22} color="#EF5350" />,
  },
  {
    value: 'stabilize',
    label: 'I’m feeling unstable',
    desc: 'I’m struggling to stay steady',
    icon: <Shield size={22} color="#FFC107" />,
  },
  {
    value: 'rebuild',
    label: 'I’m finding my footing',
    desc: 'I’m starting to get some stability',
    icon: <Zap size={22} color={Colors.primary} />,
  },
  {
    value: 'maintain',
    label: 'I’m building forward momentum',
    desc: 'I’m focused on staying on track',
    icon: <Heart size={22} color="#4CAF50" />,
  },
];

const COMMON_TRIGGERS = [
  'Stress', 'Loneliness', 'Boredom', 'Social pressure', 'Anxiety',
  'Celebration', 'Anger', 'Sadness', 'Fatigue', 'Pain',
  'Relationship conflict', 'Work pressure', 'Financial worry',
];

const SLEEP_OPTIONS: { value: SleepQualityLevel; label: string; emoji: string }[] = [
  { value: 'poor', label: 'Poor', emoji: '😴' },
  { value: 'fair', label: 'Fair', emoji: '😐' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'excellent', label: 'Excellent', emoji: '😊' },
];

const SUPPORT_OPTIONS: { value: SupportAvailability; label: string; desc: string }[] = [
  { value: 'none', label: 'No support network', desc: 'I\'m on my own right now' },
  { value: 'limited', label: 'Limited support', desc: 'A few people I can reach' },
  { value: 'moderate', label: 'Moderate support', desc: 'Some regular support' },
  { value: 'strong', label: 'Strong support', desc: 'Reliable network around me' },
];

const TIME_IN_RECOVERY_OPTIONS = [
  'Just getting started',
  'Under 30 days',
  '1–3 months',
  '3–12 months',
  '1+ year',
];

const RELAPSE_FREQUENCY_OPTIONS = [
  'No relapses in the last year',
  'One relapse in the last year',
  'A few relapses in the last year',
  'Monthly or more often',
  'I haven\'t had a long period of sobriety yet',
];

const GOAL_OPTIONS = [
  'Stay sober one day at a time',
  'Improve my health',
  'Repair relationships',
  'Find new purpose',
  'Build healthy habits',
  'Manage stress better',
  'Sleep better',
  'Save money',
  'Be present for family',
  'Regain self-respect',
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const connectLiveFeaturesEnabled = arePeerPracticeFeaturesEnabled();
  const params = useLocalSearchParams<{ devFullOnboarding?: string }>();
  /** Dev-only: replay every onboarding screen from the start (ignored in production). */
  const devReplayFullOnboarding = __DEV__ && params.devFullOnboarding === '1';
  const { profile, updateProfile, isLoading } = useUser();
  const { emergencyContacts } = useSupportContacts();
  const { accountabilityData } = useAccountability();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [addictions, setAddictions] = useState<string[]>([]);
  const [moneySpentDailyInput, setMoneySpentDailyInput] = useState<string>('');
  const [timeSpentDailyInput, setTimeSpentDailyInput] = useState<string>('');
  const [recoveryStage, setRecoveryStage] = useState<RecoveryStage>('crisis');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [struggleLevel, setStruggleLevel] = useState<StruggleLevel>(3);
  const [sleepQuality, setSleepQuality] = useState<SleepQualityLevel>('fair');
  const [supportAvailability, setSupportAvailability] = useState<SupportAvailability>('limited');
  const [timeInRecovery, setTimeInRecovery] = useState<string>('');
  const [relapseFrequency, setRelapseFrequency] = useState<string>('');
  const [emotionalBaseline, setEmotionalBaseline] = useState<number>(3);
  const [cravingBaseline, setCravingBaseline] = useState<number>(3);
  const [privacyControls, setPrivacyControls] = useState<PrivacyControls>({
    isAnonymous: false,
    shareProgress: false,
    shareMood: false,
    allowCommunityMessages: true,
  });
  /** Bumped on each dev full replay focus so profile fields re-hydrate from storage. */
  const [devReplayHydrateTick, setDevReplayHydrateTick] = useState(0);

  const updateUserState = useAppStore.use.updateUserState();

  const remainingSteps = useMemo(() => {
    if (devReplayFullOnboarding) {
      return getAllOnboardingStepDefs();
    }
    return getRemainingOnboardingSteps(profile, emergencyContacts, accountabilityData ?? null);
  }, [devReplayFullOnboarding, profile, emergencyContacts, accountabilityData]);
  const currentStepId: OnboardingStepId | null = remainingSteps[step]?.id ?? null;
  const totalStepsInWizard = remainingSteps.length;

  const hasInitializedFromProfile = useRef(false);
  useEffect(() => {
    if (!profile || isLoading || hasInitializedFromProfile.current) return;
    hasInitializedFromProfile.current = true;
    if (profile.name) setName(profile.name);
    if (profile.privacyControls?.isAnonymous != null) setIsAnonymous(profile.privacyControls.isAnonymous);
    if (Array.isArray(profile.addictions) && profile.addictions.length > 0) setAddictions(profile.addictions);
    const rp = profile.recoveryProfile;
    if (rp) {
      if (rp.recoveryStage) setRecoveryStage(rp.recoveryStage);
      if (typeof rp.struggleLevel === 'number') setStruggleLevel(rp.struggleLevel);
      if (rp.sleepQuality) setSleepQuality(rp.sleepQuality);
      if (rp.supportAvailability) setSupportAvailability(rp.supportAvailability);
      if (Array.isArray(rp.triggers) && rp.triggers.length > 0) setTriggers(rp.triggers);
      if (Array.isArray(rp.goals) && rp.goals.length > 0) setGoals(rp.goals);
    }
    if (profile.privacyControls) setPrivacyControls(profile.privacyControls);
  }, [profile, isLoading, devReplayHydrateTick]);

  useEffect(() => {
    if (devReplayFullOnboarding) return;
    if (hasStarted && remainingSteps.length === 0) {
      updateProfile({ hasCompletedOnboarding: true });
      updateUserState({ hasCompletedOnboarding: true });
      router.replace('/protection-profile?offerNotifs=1' as any);
    }
  }, [
    devReplayFullOnboarding,
    hasStarted,
    remainingSteps.length,
    updateProfile,
    updateUserState,
    router,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!devReplayFullOnboarding) return;
      hasInitializedFromProfile.current = false;
      setDevReplayHydrateTick((n) => n + 1);
      setStep(0);
      setHasStarted(false);
      progressAnim.setValue(0);
      fadeAnim.setValue(1);
    }, [devReplayFullOnboarding, progressAnim, fadeAnim]),
  );

  const animateTransition = useCallback(
    (nextStep: number) => {
      const total = Math.max(1, totalStepsInWizard);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      Animated.timing(progressAnim, {
        toValue: total > 1 ? nextStep / (total - 1) : 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setStep(nextStep);
    },
    [fadeAnim, progressAnim, totalStepsInWizard]
  );

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < totalStepsInWizard - 1) {
      animateTransition(step + 1);
    }
  }, [step, totalStepsInWizard, animateTransition]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition(step - 1);
    }
  }, [step, animateTransition]);

  const toggleItem = useCallback((item: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    Haptics.selectionAsync();
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  }, []);

  const mapRiskScoreToLevel = (riskScore: number): 'low' | 'moderate' | 'high' | 'critical' => {
    if (riskScore >= 75) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'moderate';
    return 'low';
  };

  const mapSupportToLevel = (support: SupportAvailability): 'low' | 'medium' | 'high' => {
    if (support === 'none') return 'low';
    if (support === 'limited') return 'medium';
    return 'high';
  };

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const rp: RecoveryProfile = {
      recoveryStage,
      struggleLevel,
      relapseCount: 0,
      triggers,
      sleepQuality,
      supportAvailability,
      goals,
      riskScore: 0,
      interventionIntensity: 'moderate',
      baselineStabilityScore: 50,
      emotionalBaseline,
      cravingBaseline,
      supportLevel: mapSupportToLevel(supportAvailability),
    };

    rp.riskScore = calculateRiskScore(rp);
    rp.interventionIntensity = calculateInterventionIntensity(rp.riskScore);
    rp.baselineStabilityScore = calculateBaselineStability(rp);
    rp.baselineStability = rp.baselineStabilityScore;
    rp.relapseRiskLevel = mapRiskScoreToLevel(rp.riskScore);

    const finalPrivacy: PrivacyControls = {
      ...privacyControls,
      isAnonymous,
    };

    const parsedMoney = parseFloat(moneySpentDailyInput.replace(/^\$/, '').trim());
    const dailySavings =
      Number.isFinite(parsedMoney) && parsedMoney >= 0 ? Math.round(parsedMoney * 100) / 100 : 0;

    const parsedTime = parseFloat(timeSpentDailyInput.trim());
    const timeSpentDaily =
      Number.isFinite(parsedTime) && parsedTime >= 0 ? Math.round(parsedTime * 100) / 100 : 0;

    const completedProfile = {
      name: isAnonymous ? 'Anonymous' : (name.trim() || 'Friend'),
      addictions: addictions.length > 0 ? addictions : ['Addiction'],
      soberDate: new Date().toISOString(),
      dailySavings,
      timeSpentDaily,
      motivation: goals.join(', '),
      hasCompletedOnboarding: true,
      privacyControls: finalPrivacy,
      recoveryProfile: rp,
    };

    updateProfile(completedProfile);
    updateUserState(completedProfile);

    router.replace('/recovery-snapshot?offerNotifs=1' as any);
  }, [
    name,
    isAnonymous,
    addictions,
    recoveryStage,
    triggers,
    goals,
    struggleLevel,
    sleepQuality,
    supportAvailability,
    privacyControls,
    emotionalBaseline,
    cravingBaseline,
    updateProfile,
    router,
    moneySpentDailyInput,
    timeSpentDailyInput,
    updateUserState,
  ]);

  const canProceed = (): boolean => {
    if (currentStepId == null) return false;
    switch (currentStepId) {
      case 'identity':
        return isAnonymous || name.trim().length > 0;
      case 'addiction':
        return addictions.length > 0;
      case 'daily_spend':
        return true;
      case 'stage':
      case 'calibration':
        return true;
      case 'triggers':
        return triggers.length > 0;
      case 'goals':
        return goals.length > 0;
      default:
        return true;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderStep = () => {
    if (currentStepId == null) return null;
    const stepNum = step + 1;
    const stepLabel = `STEP ${stepNum} OF ${totalStepsInWizard}`;
    switch (currentStepId) {
      case 'identity':
        return (
          <ScreenScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
            <Text style={[styles.stepLabel, { marginTop: 24 }]}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.name.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.name.subtitle}</Text>

            <View style={styles.anonymousToggle}>
              <View style={styles.anonymousLeft}>
                {isAnonymous ? <EyeOff size={20} color={Colors.primary} /> : <Eye size={20} color={Colors.textSecondary} />}
                <Text style={styles.anonymousLabel}>Stay anonymous</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  setIsAnonymous(val);
                  setPrivacyControls(p => ({ ...p, isAnonymous: val }));
                }}
                trackColor={{ false: Colors.border, true: Colors.primaryDark }}
                thumbColor={isAnonymous ? Colors.primary : Colors.textMuted}
                testID="anonymous-toggle"
              />
            </View>

            {!isAnonymous && (
              <>
                <Text style={styles.inputLabel}>YOUR NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={30}
                  testID="onboarding-name"
                />
              </>
            )}
          </ScreenScrollView>
        );

      case 'addiction':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.addiction.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.addiction.subtitle}</Text>
            {addictions.length > 0 && (
              <Text style={styles.selectionCount}>{addictions.length} selected</Text>
            )}
            <ScreenScrollView style={styles.optionsList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
              {ADDICTION_TYPES.map((type) => {
                const selected = addictions.includes(type);
                return (
                  <Pressable
                    key={type}
                    style={[styles.optionChip, selected && styles.optionChipSelected]}
                    onPress={() => toggleItem(type, addictions, setAddictions)}
                    testID={`addiction-${type}`}
                  >
                    <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{type}</Text>
                    {selected && <View style={styles.checkDot}><Text style={styles.checkDotText}>✓</Text></View>}
                  </Pressable>
                );
              })}
            </ScreenScrollView>
          </View>
        );

      case 'daily_spend':
        return (
          <ScreenScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.dailySpend.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.dailySpend.subtitle}</Text>

            <Text style={[styles.inputLabel, { marginTop: 20 }]}>TIME (UNITS PER DAY, E.G. HOURS)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2 or 1.5"
              placeholderTextColor={Colors.textMuted}
              value={timeSpentDailyInput}
              onChangeText={setTimeSpentDailyInput}
              keyboardType="decimal-pad"
              testID="onboarding-time-spent-daily"
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>MONEY (PER DAY)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25 or 25.50"
              placeholderTextColor={Colors.textMuted}
              value={moneySpentDailyInput}
              onChangeText={setMoneySpentDailyInput}
              keyboardType="decimal-pad"
              testID="onboarding-money-spent-daily"
            />
          </ScreenScrollView>
        );

      case 'stage':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.stage.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.stage.subtitle}</Text>
            <View style={styles.stageList}>
              {RECOVERY_STAGES.map((stage) => {
                const selected = recoveryStage === stage.value;
                return (
                  <Pressable
                    key={stage.value}
                    style={[styles.stageCard, selected && styles.stageCardSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setRecoveryStage(stage.value);
                    }}
                    testID={`stage-${stage.value}`}
                  >
                    <View style={styles.stageIconWrap}>{stage.icon}</View>
                    <View style={styles.stageTextWrap}>
                      <Text style={[styles.stageLabel, selected && styles.stageLabelSelected]}>{stage.label}</Text>
                      <Text style={styles.stageDesc}>{stage.desc}</Text>
                    </View>
                    {selected && <View style={styles.radioActive} />}
                    {!selected && <View style={styles.radioInactive} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'calibration':
        return (
          <ScreenScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.struggle.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.struggle.subtitle}</Text>

            <Text style={[styles.stepLabel, { marginTop: 4 }]}>Time in recovery</Text>
            <View style={styles.chipsWrap}>
              {TIME_IN_RECOVERY_OPTIONS.map((option) => {
                const selected = timeInRecovery === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.chipSmall, selected && styles.chipSmallSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTimeInRecovery(option);
                    }}
                    testID={`time-${option}`}
                  >
                    <Text style={[styles.chipSmallText, selected && styles.chipSmallTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.stepLabel, { marginTop: 8 }]}>Relapse frequency</Text>
            <View style={styles.chipsWrap}>
              {RELAPSE_FREQUENCY_OPTIONS.map((option) => {
                const selected = relapseFrequency === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.chipSmall, selected && styles.chipSmallSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setRelapseFrequency(option);
                    }}
                    testID={`relapse-${option}`}
                  >
                    <Text style={[styles.chipSmallText, selected && styles.chipSmallTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.stepLabel, { marginTop: 16 }]}>Emotional baseline</Text>
            <View style={styles.struggleDots}>
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const selected = emotionalBaseline === n;
                return (
                  <Pressable
                    key={`emotion-${n}`}
                    style={[
                      styles.struggleDot,
                      {
                        borderColor: selected ? Colors.primary : Colors.border,
                        backgroundColor: selected ? 'rgba(46,196,182,0.12)' : Colors.cardBackground,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEmotionalBaseline(n);
                    }}
                    testID={`emotional-${n}`}
                  >
                    <Text style={[styles.struggleDotText, { color: selected ? Colors.primary : Colors.text }]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.stepLabel, { marginTop: 16 }]}>Craving baseline</Text>
            <View style={styles.struggleDots}>
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const selected = cravingBaseline === n;
                return (
                  <Pressable
                    key={`craving-${n}`}
                    style={[
                      styles.struggleDot,
                      {
                        borderColor: selected ? Colors.primary : Colors.border,
                        backgroundColor: selected ? 'rgba(46,196,182,0.12)' : Colors.cardBackground,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCravingBaseline(n);
                    }}
                    testID={`craving-${n}`}
                  >
                    <Text style={[styles.struggleDotText, { color: selected ? Colors.primary : Colors.text }]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.struggleContainer}>
              <Text style={styles.struggleValue}>{struggleLevel}</Text>
              <Text style={styles.struggleLabel}>
                {struggleLevel === 1 && 'Managing okay'}
                {struggleLevel === 2 && 'Some strain'}
                {struggleLevel === 3 && 'Moderate struggle'}
                {struggleLevel === 4 && 'High intensity'}
                {struggleLevel === 5 && 'Crisis level'}
              </Text>
              <View style={styles.struggleDots}>
                {([1, 2, 3, 4, 5] as const).map((n) => {
                  const selected = struggleLevel === n;
                  return (
                    <Pressable
                      key={n}
                      style={[
                        styles.struggleDot,
                        { borderColor: selected ? Colors.primary : Colors.border, backgroundColor: selected ? 'rgba(46,196,182,0.12)' : Colors.cardBackground },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStruggleLevel(n);
                      }}
                      testID={`struggle-${n}`}
                    >
                      <Text style={[styles.struggleDotText, { color: selected ? Colors.primary : Colors.text }]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={[styles.stepLabel, { marginTop: 32 }]}>{ONBOARDING_COPY.steps.sleep.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.sleep.subtitle}</Text>
            <View style={styles.sleepGrid}>
              {SLEEP_OPTIONS.map((opt) => {
                const selected = sleepQuality === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.sleepCard, selected && styles.sleepCardSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSleepQuality(opt.value);
                    }}
                    testID={`sleep-${opt.value}`}
                  >
                    <Text style={styles.sleepEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.sleepLabel, selected && styles.sleepLabelSelected]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScreenScrollView>
        );

      case 'triggers':
        return (
          <ScreenScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.triggers.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.triggers.subtitle}</Text>
            {triggers.length > 0 && (
              <Text style={styles.selectionCount}>{triggers.length} selected</Text>
            )}
            <View style={styles.chipsWrap}>
              {COMMON_TRIGGERS.map((trigger) => {
                const selected = triggers.includes(trigger);
                return (
                  <Pressable
                    key={trigger}
                    style={[styles.chipSmall, selected && styles.chipSmallSelected]}
                    onPress={() => toggleItem(trigger, triggers, setTriggers)}
                    testID={`trigger-${trigger}`}
                  >
                    <Text style={[styles.chipSmallText, selected && styles.chipSmallTextSelected]}>{trigger}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.stepLabel, { marginTop: 24 }]}>Support network</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.support.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.support.subtitle}</Text>
            <View style={styles.supportList}>
              {SUPPORT_OPTIONS.map((opt) => {
                const selected = supportAvailability === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.supportCard, selected && styles.supportCardSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSupportAvailability(opt.value);
                    }}
                    testID={`support-${opt.value}`}
                  >
                    <View style={styles.supportTextWrap}>
                      <Text style={[styles.supportLabel, selected && styles.supportLabelSelected]}>{opt.label}</Text>
                      <Text style={styles.supportDesc}>{opt.desc}</Text>
                    </View>
                    {selected && <View style={styles.radioActive} />}
                    {!selected && <View style={styles.radioInactive} />}
                  </Pressable>
                );
              })}
            </View>
          </ScreenScrollView>
        );

      case 'goals':
        return (
          <ScreenScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
            <View style={styles.stepIconWrap}>
              <Target size={28} color={Colors.primary} />
            </View>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.goals.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.goals.subtitle}</Text>
            {goals.length > 0 && (
              <Text style={styles.selectionCount}>{goals.length} selected</Text>
            )}
            {GOAL_OPTIONS.map((goal) => {
              const selected = goals.includes(goal);
              return (
                <Pressable
                  key={goal}
                  style={[styles.optionChip, selected && styles.optionChipSelected]}
                  onPress={() => toggleItem(goal, goals, setGoals)}
                  testID={`goal-${goal}`}
                >
                  <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{goal}</Text>
                  {selected && (
                    <View style={styles.checkDot}>
                      <Text style={styles.checkDotText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Privacy Controls</Text>
              <Text style={styles.privacyExplainer}>
                {connectLiveFeaturesEnabled
                  ? 'These choices apply if you use live Connect spaces (for example recovery rooms). You can change them anytime in Settings. Review the Privacy Policy, Terms, and how local vs shared data works using the links below.'
                  : 'Most recovery data stays on this device. You can change privacy choices anytime in Settings. Review the Privacy Policy, Terms, and how local data works using the links below.'}
              </Text>
              <LegalDocLinksRow compact />
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>
                  {connectLiveFeaturesEnabled ? 'Share progress in Connect' : 'Share progress (Connect)'}
                </Text>
                <Switch
                  value={privacyControls.shareProgress}
                  onValueChange={(val) =>
                    setPrivacyControls((p) => ({ ...p, shareProgress: val }))
                  }
                  trackColor={{ false: Colors.border, true: Colors.primaryDark }}
                  thumbColor={privacyControls.shareProgress ? Colors.primary : Colors.textMuted}
                />
              </View>
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>Share mood data</Text>
                <Switch
                  value={privacyControls.shareMood}
                  onValueChange={(val) =>
                    setPrivacyControls((p) => ({ ...p, shareMood: val }))
                  }
                  trackColor={{ false: Colors.border, true: Colors.primaryDark }}
                  thumbColor={privacyControls.shareMood ? Colors.primary : Colors.textMuted}
                />
              </View>
            </View>
          </ScreenScrollView>
        );

      default:
        return null;
    }
  };

  if (!hasStarted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <ScreenScrollView
          style={styles.stepContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.optionsListContent}
        >
          <View style={styles.heroContainer}>
            <Image
              source={require('../assets/images/app-icon.png')}
              style={styles.heroAppIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroAppName}>{BRAND.appName}</Text>
          <Text style={styles.heroTitle}>{ONBOARDING_COPY.hero.title}</Text>
          <Text style={styles.heroSubtitle}>
            {ONBOARDING_COPY.hero.subtitle}
          </Text>
          <View style={styles.trustBadges}>
            <View style={styles.trustItem}>
              <Lock size={14} color={Colors.primary} />
              <Text style={styles.trustText}>Private on your device</Text>
            </View>
            <View style={styles.trustItem}>
              <EyeOff size={14} color={Colors.primary} />
              <Text style={styles.trustText}>Anonymous option</Text>
            </View>
          </View>
          <LegalDocLinksRow compact />
          <Text style={styles.legalHint}>
            {connectLiveFeaturesEnabled
              ? 'Tap to read how we handle data, terms for use of the app, and Connect safety rules before you continue.'
              : 'Tap to read how we handle data and terms for use of the app before you continue.'}
          </Text>
          <Text style={styles.wellnessDisclaimer}>{ONBOARDING_COPY.wellnessDisclaimer}</Text>
        </ScreenScrollView>

        <View style={[styles.bottomRow, { justifyContent: 'center' }]}>
          <Pressable
            style={styles.nextBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setHasStarted(true);
            }}
            testID="begin-setup-btn"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.nextBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextText}>{ONBOARDING_COPY.hero.cta}</Text>
              <ChevronRight size={18} color={Colors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        {step >= 0 && totalStepsInWizard > 0 && (
          <Text style={styles.progressText}>
            {step + 1}/{totalStepsInWizard}
          </Text>
        )}
      </View>

      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>

      <View style={styles.bottomRow}>
        <Pressable
          style={styles.backBtn}
          onPress={step > 0 ? handleBack : () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHasStarted(false);
            setStep(0);
          }}
          testID="back-btn"
        >
          <ChevronLeft size={20} color={Colors.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {step < totalStepsInWizard - 1 ? (
          <Pressable
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            testID="next-btn"
          >
            <LinearGradient
              colors={canProceed() ? [Colors.primary, Colors.primaryDark] : [Colors.cardBackground, Colors.cardBackground]}
              style={styles.nextBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.nextText, !canProceed() && styles.nextTextDisabled]}>
                {step === 0 ? 'Continue' : 'Continue'}
              </Text>
              <ChevronRight size={18} color={canProceed() ? Colors.white : Colors.textMuted} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable style={styles.nextBtn} onPress={handleComplete} testID="complete-btn">
            <LinearGradient
              colors={canProceed() ? [Colors.primary, Colors.primaryDark] : [Colors.cardBackground, Colors.cardBackground]}
              style={styles.nextBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.nextText, !canProceed() && styles.nextTextDisabled]}>{ONBOARDING_COPY.completeCta}</Text>
            </LinearGradient>
          </Pressable>
        )}
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
  progressBarContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 24,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%' as const,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    minWidth: 28,
    textAlign: 'right' as const,
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
  },
  heroContainer: {
    alignItems: 'center' as const,
    marginBottom: 32,
    marginTop: 20,
  },
  heroAppIcon: {
    width: 110,
    height: 110,
    borderRadius: 26,
  },
  heroAppName: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#2BB5B2',
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    lineHeight: 30,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 32,
  },
  trustBadges: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 20,
  },
  trustItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  trustText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  legalHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  wellnessDisclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 16,
    marginTop: 14,
    paddingHorizontal: 16,
    opacity: 0.92,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 34,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  stepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  anonymousToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  anonymousLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  anonymousLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  selectionCount: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  optionsList: {
    flex: 1,
  },
  optionsListContent: {
    gap: 8,
    paddingBottom: 20,
  },
  optionChip: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.08)',
  },
  optionChipText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  optionChipTextSelected: {
    color: Colors.primary,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkDotText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  stageList: {
    gap: 10,
  },
  stageCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 14,
  },
  stageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.08)',
  },
  stageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stageTextWrap: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  stageLabelSelected: {
    color: Colors.primary,
  },
  stageDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  radioActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 6,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  radioInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  struggleContainer: {
    alignItems: 'center' as const,
    marginTop: 16,
  },
  struggleValue: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  struggleLabel: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  struggleDots: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  struggleDot: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
  },
  struggleDotText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  chipsWrap: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    paddingBottom: 20,
  },
  chipSmall: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipSmallSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.12)',
  },
  chipSmallText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  chipSmallTextSelected: {
    color: Colors.primary,
  },
  sleepGrid: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 8,
  },
  sleepCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  sleepCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.08)',
  },
  sleepEmoji: {
    fontSize: 28,
  },
  sleepLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sleepLabelSelected: {
    color: Colors.primary,
  },
  supportList: {
    gap: 10,
  },
  supportCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  supportCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.08)',
  },
  supportTextWrap: {
    flex: 1,
  },
  supportLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  supportLabelSelected: {
    color: Colors.primary,
  },
  supportDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  skipBtn: {
    marginTop: 16,
    alignSelf: 'center' as const,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  privacySection: {
    marginTop: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacySectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  privacyExplainer: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  privacyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 8,
  },
  privacyLabel: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  bottomRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  backBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    padding: 8,
  },
  backText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  nextBtn: {
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 6,
    borderRadius: 14,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  nextTextDisabled: {
    color: Colors.textMuted,
  },
});
