import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRecovery } from '@/providers/RecoveryProvider';
import {
  RecoveryStage,
  StageTransition,
  StageSignal,
  StageConfig,
  StageDetectionData,
  DailyCheckIn,
} from '@/types';

const STORAGE_KEY = 'stage_detection_data';

const STAGE_CONFIGS: Record<RecoveryStage, StageConfig> = {
  crisis: {
    stage: 'crisis',
    label: 'Crisis Mode',
    description: 'Focused on immediate safety and stabilization. Every moment you hold on matters.',
    transitionMessage: "You're in a tough spot right now, and that's okay. We're here with maximum support to help you through this.",
    uiIntensity: 'high',
    supportFrequency: 'constant',
    aiTone: 'urgent',
    interventionTiming: 'immediate',
    accentColor: '#EF5350',
    iconName: 'shield-alert',
    program: {
      durationDays: 7,
      weeklyObjectives: [
        'Create a simple safety plan for the next 24 hours',
        'Anchor one or two reliable grounding tools',
        'Identify at least one safe person or support line',
      ],
      recommendedExercises: [
        'Use crisis grounding tools during spikes',
        'Complete short emergency check-ins when overwhelmed',
      ],
      dailyPractices: [
        'Open Crisis Mode and do at least one grounding tool',
        'Send a brief message or call to a safe contact',
        'Log a quick check-in after intense moments',
      ],
    },
  },
  stabilize: {
    stage: 'stabilize',
    label: 'Stabilizing',
    description: 'Building your foundation. Developing routines and coping strategies.',
    transitionMessage: "You're moving into a more stable place. The worst intensity is easing — let's build on that momentum.",
    uiIntensity: 'moderate',
    supportFrequency: 'frequent',
    aiTone: 'supportive',
    interventionTiming: 'proactive',
    accentColor: '#FFB347',
    iconName: 'anchor',
    program: {
      durationDays: 14,
      weeklyObjectives: [
        'Establish a daily check-in routine',
        'Identify top 3 personal triggers',
        'Experiment with at least two sleep-supporting habits',
      ],
      recommendedExercises: [
        'Use daily check-ins to track mood and cravings',
        'Review the Triggers tab and map risky situations',
        'Capture one small change that helps sleep each day',
      ],
      dailyPractices: [
        'Complete one daily check-in',
        'Review triggers and note one you managed or avoided',
        'Choose one small action that supports better sleep tonight',
      ],
    },
  },
  rebuild: {
    stage: 'rebuild',
    label: 'Rebuilding',
    description: 'Actively rebuilding your life. Growing stronger each day.',
    transitionMessage: "You've earned this. Your stability is growing and it's time to start rebuilding what matters to you.",
    uiIntensity: 'low',
    supportFrequency: 'regular',
    aiTone: 'encouraging',
    interventionTiming: 'scheduled',
    accentColor: '#2EC4B6',
    iconName: 'hammer',
    program: {
      durationDays: 30,
      weeklyObjectives: [
        'Design simple morning and evening recovery routines',
        'Create or refine at least one replacement habit',
        'Define one purpose-driven goal to move toward',
      ],
      recommendedExercises: [
        'Add or refine routine blocks in Rebuild',
        'Create a replacement habit for a common trigger',
        'Break a bigger life goal into smaller steps',
      ],
      dailyPractices: [
        'Complete at least one Rebuild routine block',
        'Practice one replacement habit when triggers show up',
        'Take one small step toward a purpose goal',
      ],
    },
  },
  maintain: {
    stage: 'maintain',
    label: 'Maintaining',
    description: 'Sustaining your recovery with confidence. Focused on long-term growth.',
    transitionMessage: "Look how far you've come. You're in a place of real strength now. Keep nurturing what you've built.",
    uiIntensity: 'minimal',
    supportFrequency: 'periodic',
    aiTone: 'celebratory',
    interventionTiming: 'on_demand',
    accentColor: '#4CAF50',
    iconName: 'trophy',
    program: {
      durationDays: 60,
      weeklyObjectives: [
        'Maintain recovery routines with flexibility, not pressure',
        'Strengthen connection and give-back in community',
        'Keep an eye on subtle early warning signs',
      ],
      recommendedExercises: [
        'Review routines and adjust for current season of life',
        'Engage in community or support room at least weekly',
        'Do a quick scan for stress, sleep, and isolation shifts',
      ],
      dailyPractices: [
        'Touch one small routine or habit that protects recovery',
        'Connect briefly with someone who supports your sobriety',
        'Do a two-minute reflection to catch early warning signs',
      ],
    },
  },
};

const STAGE_ORDER: RecoveryStage[] = ['crisis', 'stabilize', 'rebuild', 'maintain'];

function getStageIndex(stage: RecoveryStage): number {
  return STAGE_ORDER.indexOf(stage);
}

const DEFAULT_DATA: StageDetectionData = {
  currentStage: 'crisis',
  previousStage: null,
  stageConfig: STAGE_CONFIGS.crisis,
  transitions: [],
  lastEvaluatedAt: '',
  stageStartedAt: new Date().toISOString(),
  pendingTransition: null,
};

function evaluateStageSignals(
  checkIns: DailyCheckIn[],
  daysSober: number,
  stabilityScore: number,
  currentStage: RecoveryStage,
): { suggestedStage: RecoveryStage; signals: StageSignal[]; confidence: number } {
  const signals: StageSignal[] = [];
  const recent7 = checkIns.slice(0, 7);
  const recent14 = checkIns.slice(0, 14);

  const avgStability7 = recent7.length > 0
    ? recent7.reduce((s, c) => s + c.stabilityScore, 0) / recent7.length
    : stabilityScore;

  const avgMood7 = recent7.length > 0
    ? recent7.reduce((s, c) => s + c.mood, 0) / recent7.length
    : 50;

  const avgCraving7 = recent7.length > 0
    ? recent7.reduce((s, c) => s + c.cravingLevel, 0) / recent7.length
    : 50;

  const avgStress7 = recent7.length > 0
    ? recent7.reduce((s, c) => s + c.stress, 0) / recent7.length
    : 50;

  const checkInConsistency = recent14.length >= 7 ? Math.min(recent14.length / 14, 1) * 100 : recent7.length >= 3 ? 50 : 20;

  let stabilityTrend = 0;
  if (recent7.length >= 3) {
    const firstHalf = recent7.slice(Math.ceil(recent7.length / 2));
    const secondHalf = recent7.slice(0, Math.ceil(recent7.length / 2));
    const firstAvg = firstHalf.reduce((s, c) => s + c.stabilityScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, c) => s + c.stabilityScore, 0) / secondHalf.length;
    stabilityTrend = secondAvg - firstAvg;
  }

  signals.push({
    factor: 'Days Sober',
    value: daysSober,
    weight: 0.2,
    direction: daysSober >= 90 ? 'positive' : daysSober >= 30 ? 'neutral' : 'negative',
  });

  signals.push({
    factor: 'Stability Score',
    value: Math.round(avgStability7),
    weight: 0.25,
    direction: avgStability7 >= 65 ? 'positive' : avgStability7 >= 40 ? 'neutral' : 'negative',
  });

  signals.push({
    factor: 'Mood Average',
    value: Math.round(avgMood7),
    weight: 0.15,
    direction: avgMood7 >= 65 ? 'positive' : avgMood7 >= 40 ? 'neutral' : 'negative',
  });

  signals.push({
    factor: 'Craving Level',
    value: Math.round(avgCraving7),
    weight: 0.2,
    direction: avgCraving7 <= 30 ? 'positive' : avgCraving7 <= 55 ? 'neutral' : 'negative',
  });

  signals.push({
    factor: 'Stress Level',
    value: Math.round(avgStress7),
    weight: 0.1,
    direction: avgStress7 <= 35 ? 'positive' : avgStress7 <= 55 ? 'neutral' : 'negative',
  });

  signals.push({
    factor: 'Check-in Consistency',
    value: Math.round(checkInConsistency),
    weight: 0.05,
    direction: checkInConsistency >= 60 ? 'positive' : checkInConsistency >= 30 ? 'neutral' : 'negative',
  });

  signals.push({
    factor: 'Stability Trend',
    value: Math.round(stabilityTrend),
    weight: 0.05,
    direction: stabilityTrend > 5 ? 'positive' : stabilityTrend < -5 ? 'negative' : 'neutral',
  });

  let compositeScore = 0;
  compositeScore += (daysSober >= 180 ? 90 : daysSober >= 90 ? 70 : daysSober >= 30 ? 50 : daysSober >= 7 ? 30 : 10) * 0.2;
  compositeScore += avgStability7 * 0.25;
  compositeScore += avgMood7 * 0.15;
  compositeScore += (100 - avgCraving7) * 0.2;
  compositeScore += (100 - avgStress7) * 0.1;
  compositeScore += checkInConsistency * 0.05;
  compositeScore += Math.max(0, Math.min(100, 50 + stabilityTrend)) * 0.05;

  let suggestedStage: RecoveryStage;
  if (compositeScore >= 72) {
    suggestedStage = 'maintain';
  } else if (compositeScore >= 52) {
    suggestedStage = 'rebuild';
  } else if (compositeScore >= 32) {
    suggestedStage = 'stabilize';
  } else {
    suggestedStage = 'crisis';
  }

  const currentIdx = getStageIndex(currentStage);
  const suggestedIdx = getStageIndex(suggestedStage);

  if (suggestedIdx > currentIdx + 1) {
    suggestedStage = STAGE_ORDER[currentIdx + 1];
  }

  const confidence = Math.min(100, Math.max(20, Math.round(
    (recent7.length / 7) * 40 +
    (recent14.length / 14) * 30 +
    (daysSober >= 3 ? 30 : daysSober * 10)
  )));

  console.log('[StageDetection] Evaluation:', {
    compositeScore: Math.round(compositeScore),
    suggestedStage,
    currentStage,
    confidence,
    daysSober,
    avgStability7: Math.round(avgStability7),
    avgCraving7: Math.round(avgCraving7),
  });

  return { suggestedStage, signals, confidence };
}

function buildTransitionReason(fromStage: RecoveryStage, toStage: RecoveryStage, signals: StageSignal[]): string {
  const fromIdx = getStageIndex(fromStage);
  const toIdx = getStageIndex(toStage);
  const isProgression = toIdx > fromIdx;

  if (isProgression) {
    const positiveFactors = signals
      .filter(s => s.direction === 'positive')
      .map(s => s.factor)
      .slice(0, 3);
    if (positiveFactors.length > 0) {
      return `Your ${positiveFactors.join(', ').toLowerCase()} show real improvement. You're ready for the next phase.`;
    }
    return 'Your overall patterns show consistent improvement. Moving to the next recovery phase.';
  } else {
    const negativeFactors = signals
      .filter(s => s.direction === 'negative')
      .map(s => s.factor)
      .slice(0, 3);
    if (negativeFactors.length > 0) {
      return `Your ${negativeFactors.join(', ').toLowerCase()} suggest you could use more support right now. This is not a setback — it's self-awareness.`;
    }
    return "Your recent patterns suggest more support would help. Adjusting to give you what you need — you're still building; this is care.";
  }
}

export const [StageDetectionProvider, useStageDetection] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { profile, checkIns, daysSober, stabilityScore, updateProfile } = useRecovery();
  const [data, setData] = useState<StageDetectionData>(DEFAULT_DATA);

  const dataQuery = useQuery({
    queryKey: ['stageDetection'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StageDetectionData;
          parsed.stageConfig = STAGE_CONFIGS[parsed.currentStage] ?? STAGE_CONFIGS.crisis;
          return parsed;
        }
      } catch (e) {
        console.log('[StageDetection] Error loading data:', e);
      }
      return {
        ...DEFAULT_DATA,
        currentStage: profile.recoveryProfile?.recoveryStage ?? 'crisis',
        stageConfig: STAGE_CONFIGS[profile.recoveryProfile?.recoveryStage ?? 'crisis'],
      };
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (dataQuery.data) {
      setData(dataQuery.data);
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newData: StageDetectionData) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: (result) => {
      setData(result);
      queryClient.setQueryData(['stageDetection'], result);
    },
  });

  const evaluateStage = useCallback(() => {
    if (checkIns.length < 2) {
      console.log('[StageDetection] Not enough check-ins to evaluate, need at least 2');
      return;
    }

    const now = new Date();
    const lastEval = data.lastEvaluatedAt ? new Date(data.lastEvaluatedAt) : null;
    if (lastEval && (now.getTime() - lastEval.getTime()) < 1000 * 60 * 60 * 6) {
      console.log('[StageDetection] Skipping evaluation, last eval was less than 6 hours ago');
      return;
    }

    const { suggestedStage, signals, confidence } = evaluateStageSignals(
      checkIns,
      daysSober,
      stabilityScore,
      data.currentStage,
    );

    if (suggestedStage !== data.currentStage && confidence >= 50) {
      const transition: StageTransition = {
        id: Date.now().toString(),
        fromStage: data.currentStage,
        toStage: suggestedStage,
        triggeredAt: now.toISOString(),
        reason: buildTransitionReason(data.currentStage, suggestedStage, signals),
        signals,
        acknowledged: false,
      };

      console.log('[StageDetection] Stage transition detected:', {
        from: data.currentStage,
        to: suggestedStage,
        confidence,
      });

      const updated: StageDetectionData = {
        ...data,
        pendingTransition: transition,
        lastEvaluatedAt: now.toISOString(),
      };
      saveMutation.mutate(updated);
    } else {
      const updated: StageDetectionData = {
        ...data,
        lastEvaluatedAt: now.toISOString(),
      };
      saveMutation.mutate(updated);
    }
  }, [checkIns, daysSober, stabilityScore, data]);

  useEffect(() => {
    if (!dataQuery.isLoading && profile.hasCompletedOnboarding && checkIns.length >= 2) {
      const timer = setTimeout(() => {
        evaluateStage();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [checkIns.length, dataQuery.isLoading, profile.hasCompletedOnboarding, evaluateStage]);

  const acknowledgeTransition = useCallback(() => {
    if (!data.pendingTransition) return;

    const transition = { ...data.pendingTransition, acknowledged: true };
    const newStage = transition.toStage;

    const updated: StageDetectionData = {
      ...data,
      currentStage: newStage,
      previousStage: data.currentStage,
      stageConfig: STAGE_CONFIGS[newStage],
      transitions: [transition, ...data.transitions].slice(0, 20),
      stageStartedAt: new Date().toISOString(),
      pendingTransition: null,
    };

    saveMutation.mutate(updated);

    updateProfile({
      recoveryProfile: {
        ...profile.recoveryProfile,
        recoveryStage: newStage,
      },
    });

    console.log('[StageDetection] Transition acknowledged:', transition.fromStage, '->', transition.toStage);
  }, [data, profile, updateProfile]);

  const dismissTransition = useCallback(() => {
    if (!data.pendingTransition) return;

    const updated: StageDetectionData = {
      ...data,
      pendingTransition: null,
    };
    saveMutation.mutate(updated);
    console.log('[StageDetection] Transition dismissed');
  }, [data]);

  const forceEvaluate = useCallback(() => {
    const { suggestedStage, signals, confidence } = evaluateStageSignals(
      checkIns,
      daysSober,
      stabilityScore,
      data.currentStage,
    );

    if (suggestedStage !== data.currentStage && confidence >= 30) {
      const transition: StageTransition = {
        id: Date.now().toString(),
        fromStage: data.currentStage,
        toStage: suggestedStage,
        triggeredAt: new Date().toISOString(),
        reason: buildTransitionReason(data.currentStage, suggestedStage, signals),
        signals,
        acknowledged: false,
      };

      const updated: StageDetectionData = {
        ...data,
        pendingTransition: transition,
        lastEvaluatedAt: new Date().toISOString(),
      };
      saveMutation.mutate(updated);
    }
  }, [checkIns, daysSober, stabilityScore, data]);

  const stageProgress = useMemo(() => {
    const stageStart = data.stageStartedAt ? new Date(data.stageStartedAt) : new Date();
    const now = new Date();
    const daysInStage = Math.max(0, Math.floor((now.getTime() - stageStart.getTime()) / 86400000));
    return daysInStage;
  }, [data.stageStartedAt]);

  const currentProgram = useMemo(() => {
    const config = STAGE_CONFIGS[data.currentStage];
    const day = stageProgress + 1;
    const duration = config.program.durationDays;
    const clampedDay = Math.min(day, duration);
    const completed = clampedDay >= duration;
    const progressPercent = duration > 0 ? Math.min(1, clampedDay / duration) : 0;
    return {
      day: clampedDay,
      duration,
      completed,
      progressPercent,
      objectives: config.program.weeklyObjectives,
      recommendedExercises: config.program.recommendedExercises,
      dailyPractices: config.program.dailyPractices,
    };
  }, [data.currentStage, stageProgress]);

  const isProgressing = useMemo(() => {
    if (!data.pendingTransition) return false;
    return getStageIndex(data.pendingTransition.toStage) > getStageIndex(data.currentStage);
  }, [data.pendingTransition, data.currentStage]);

  return useMemo(() => ({
    currentStage: data.currentStage,
    previousStage: data.previousStage,
    stageConfig: data.stageConfig ?? STAGE_CONFIGS[data.currentStage],
    transitions: data.transitions,
    pendingTransition: data.pendingTransition,
    stageProgress,
    currentProgram,
    isProgressing,
    stageConfigs: STAGE_CONFIGS,
    acknowledgeTransition,
    dismissTransition,
    forceEvaluate,
    isLoading: dataQuery.isLoading,
  }), [
    data.currentStage, data.previousStage, data.stageConfig,
    data.transitions, data.pendingTransition,
    stageProgress, isProgressing,
    acknowledgeTransition, dismissTransition, forceEvaluate,
    dataQuery.isLoading,
  ]);
});
