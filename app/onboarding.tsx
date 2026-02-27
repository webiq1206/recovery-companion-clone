import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Animated, Dimensions, Switch, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, ChevronRight, ChevronLeft, Eye, EyeOff, Moon, Users, Target, AlertTriangle, Heart, Zap, Shield, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRecovery } from '@/providers/RecoveryProvider';
import { calculateRiskScore, calculateInterventionIntensity, calculateBaselineStability } from '@/providers/RecoveryProvider';
import { ADDICTION_TYPES } from '@/constants/milestones';
import { ONBOARDING_COPY, BRAND } from '@/constants/branding';
import { RecoveryStage, StruggleLevel, SleepQualityLevel, SupportAvailability, RecoveryProfile, PrivacyControls } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 0 is the hero screen, 1–6 are the data-collection steps
const TOTAL_STEPS = 7;

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

const STRUGGLE_LABELS = ['Minimal', 'Manageable', 'Moderate', 'Difficult', 'Overwhelming'];

const COMMON_TRIGGERS = [
  'Stress', 'Loneliness', 'Boredom', 'Social pressure', 'Anxiety',
  'Celebration', 'Anger', 'Sadness', 'Fatigue', 'Pain',
  'Relationship conflict', 'Work pressure', 'Financial worry',
];

const SLEEP_OPTIONS: { value: SleepQualityLevel; label: string; emoji: string }[] = [
  { value: 'poor', label: 'Poor', emoji: '😴' },
  { value: 'fair', label: 'Fair', emoji: '😑' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'excellent', label: 'Excellent', emoji: '✨' },
];

const SUPPORT_OPTIONS: { value: SupportAvailability; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'I\'m doing this alone' },
  { value: 'limited', label: 'Limited', desc: 'A few people know' },
  { value: 'moderate', label: 'Moderate', desc: 'I have some support' },
  { value: 'strong', label: 'Strong', desc: 'Good support network' },
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
  const { updateProfile } = useRecovery();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<number>(0);
  const [name, setName] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [addictions, setAddictions] = useState<string[]>([]);
  const [recoveryStage, setRecoveryStage] = useState<RecoveryStage>('crisis');
  const [struggleLevel, setStruggleLevel] = useState<StruggleLevel>(3);
  const [relapseCount, setRelapseCount] = useState<string>('0');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState<SleepQualityLevel>('fair');
  const [supportAvailability, setSupportAvailability] = useState<SupportAvailability>('limited');
  const [goals, setGoals] = useState<string[]>([]);
  const [privacyControls, setPrivacyControls] = useState<PrivacyControls>({
    isAnonymous: false,
    shareProgress: false,
    shareMood: false,
    allowCommunityMessages: true,
  });

  const animateTransition = useCallback((nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressAnim, {
      toValue: nextStep / (TOTAL_STEPS - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
    setStep(nextStep);
  }, [fadeAnim, progressAnim]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      animateTransition(step + 1);
    }
  }, [step, animateTransition]);

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

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const relapses = parseInt(relapseCount, 10);
    const rp: RecoveryProfile = {
      recoveryStage,
      struggleLevel,
      relapseCount: isNaN(relapses) ? 0 : relapses,
      triggers,
      sleepQuality,
      supportAvailability,
      goals,
      riskScore: 0,
      interventionIntensity: 'moderate',
      baselineStabilityScore: 50,
    };

    rp.riskScore = calculateRiskScore(rp);
    rp.interventionIntensity = calculateInterventionIntensity(rp.riskScore);
    rp.baselineStabilityScore = calculateBaselineStability(rp);

    const finalPrivacy: PrivacyControls = {
      ...privacyControls,
      isAnonymous,
    };

    updateProfile({
      name: isAnonymous ? 'Anonymous' : (name.trim() || 'Friend'),
      addictions: addictions.length > 0 ? addictions : ['Addiction'],
      soberDate: new Date().toISOString(),
      dailySavings: 0,
      motivation: goals.join(', '),
      hasCompletedOnboarding: true,
      privacyControls: finalPrivacy,
      recoveryProfile: rp,
    });

    // Go to protection profile immediately after onboarding; that screen will
    // then route into Home and How To Use.
    router.replace('/protection-profile' as any);
  }, [name, isAnonymous, addictions, recoveryStage, struggleLevel, relapseCount, triggers, sleepQuality, supportAvailability, goals, privacyControls, updateProfile, router]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return true; // hero
      case 1:
        return isAnonymous || name.trim().length > 0; // Identity
      case 2:
        return addictions.length > 0; // Addiction type
      case 3:
        return true; // Support level
      case 4:
        return true; // Protection calibration
      case 5:
        return triggers.length > 0; // Risk & support map (requires at least one trigger)
      case 6:
        return goals.length > 0; // Rebuilding goal
      default:
        return true;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <View style={styles.heroContainer}>
              <Image
                source={require('@/assets/images/app-icon.png')}
                style={styles.heroAppIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroAppName}>Recovery Companion</Text>
            <Text style={styles.heroTitle}>{ONBOARDING_COPY.hero.title}</Text>
            <Text style={styles.heroSubtitle}>
              {ONBOARDING_COPY.hero.subtitle}
            </Text>
            <View style={styles.trustBadges}>
              <View style={styles.trustItem}>
                <Lock size={14} color={Colors.primary} />
                <Text style={styles.trustText}>Private & encrypted</Text>
              </View>
              <View style={styles.trustItem}>
                <EyeOff size={14} color={Colors.primary} />
                <Text style={styles.trustText}>Anonymous option</Text>
              </View>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepLabel}>STEP 1 OF 6</Text>
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
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepLabel}>STEP 2 OF 6</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.addiction.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.addiction.subtitle}</Text>
            {addictions.length > 0 && (
              <Text style={styles.selectionCount}>{addictions.length} selected</Text>
            )}
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsListContent}>
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
            </ScrollView>
          </View>
        );

      case 3:
        // Support level (renamed stage screen)
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepLabel}>STEP 3 OF 6</Text>
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

      case 4:
        // ProtectionCalibrationScreen: merge intensity + relapse + sleep
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <ShieldCheck size={28} color={Colors.primary} />
            </View>
            <Text style={styles.stepLabel}>STEP 4 OF 6</Text>
            <Text style={styles.stepTitle}>Protection calibration</Text>
            <Text style={styles.stepSubtitle}>
              Help us understand how intense your struggle has been so we can right‑size your protection.
            </Text>

            <View style={styles.struggleContainer}>
              <Text style={styles.inputLabel}>CURRENT INTENSITY</Text>
              <Text style={styles.struggleValue}>{struggleLevel}</Text>
              <Text style={styles.struggleLabel}>{STRUGGLE_LABELS[struggleLevel - 1]}</Text>
              <View style={styles.struggleDots}>
                {([1, 2, 3, 4, 5] as StruggleLevel[]).map((level) => {
                  const active = level <= struggleLevel;
                  const dotColors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];
                  return (
                    <Pressable
                      key={level}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStruggleLevel(level);
                      }}
                      style={[
                        styles.struggleDot,
                        {
                          backgroundColor: active ? dotColors[level - 1] : Colors.cardBackground,
                          borderColor: active ? dotColors[level - 1] : Colors.border,
                        },
                      ]}
                      testID={`struggle-${level}`}
                    >
                      <Text style={[styles.struggleDotText, { color: active ? '#FFF' : Colors.textMuted }]}>{level}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.inputLabel}>RECENT RELAPSES (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={relapseCount}
                onChangeText={setRelapseCount}
                keyboardType="number-pad"
                maxLength={4}
                testID="relapse-count"
              />
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.inputLabel}>SLEEP QUALITY</Text>
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
            </View>
          </View>
        );

      case 5:
        // RiskAndSupportScreen: merge triggers + support
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <Users size={28} color={Colors.primary} />
            </View>
            <Text style={styles.stepLabel}>STEP 5 OF 6</Text>
            <Text style={styles.stepTitle}>Risk & support map</Text>
            <Text style={styles.stepSubtitle}>
              Map the situations that pull you off track and how much support you have around you.
            </Text>

            <Text style={styles.inputLabel}>COMMON TRIGGERS</Text>
            {triggers.length > 0 && (
              <Text style={styles.selectionCount}>{triggers.length} selected</Text>
            )}
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chipsWrap}
            >
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
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>SUPPORT NETWORK</Text>
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
            </View>
          </View>
        );

      case 6:
        // Rebuilding goal
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <Target size={28} color={Colors.primary} />
            </View>
            <Text style={styles.stepLabel}>STEP 6 OF 6</Text>
            <Text style={styles.stepTitle}>{ONBOARDING_COPY.steps.goals.title}</Text>
            <Text style={styles.stepSubtitle}>{ONBOARDING_COPY.steps.goals.subtitle}</Text>
            {goals.length > 0 && (
              <Text style={styles.selectionCount}>{goals.length} selected</Text>
            )}
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.optionsListContent}
            >
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
            </ScrollView>

            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Privacy Controls</Text>
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>Share progress with community</Text>
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
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        {step > 0 && (
          <Text style={styles.progressText}>
            {step}/{TOTAL_STEPS - 1}
          </Text>
        )}
      </View>

      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>

      <View style={styles.bottomRow}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={handleBack} testID="back-btn">
            <ChevronLeft size={20} color={Colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {step < TOTAL_STEPS - 1 ? (
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
                {step === 0 ? ONBOARDING_COPY.hero.cta : 'Continue'}
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
    fontSize: 30,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    lineHeight: 38,
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
