/**
 * View-model hook for the daily check-in flow.
 * Encapsulates phase state, metrics, emotional reflection, near-miss, and persistence.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useRetention } from '@/providers/RetentionProvider';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { calculateStability } from '@/utils/stabilityEngine';
import {
  getEmotionalReflection,
  getScoreColor,
  getScoreLabel,
} from '@/lib/services/checkInAnalysis';
import {
  METRICS_CONFIG,
  EMOTIONAL_TAGS,
  PERIOD_CONFIG_DATA,
  type CheckInTimeOfDay,
} from '@/features/checkin/constants/checkinMetrics';
import type { DailyCheckIn, EmotionalTag } from '@/types';

export interface PeriodConfig {
  label: string;
  iconKey: 'sun' | 'sunset';
  color: string;
  greeting: string;
}

const DEFAULT_VALUES: Record<string, number> = {
  mood: 50,
  cravingLevel: 50,
  stress: 50,
  sleepQuality: 50,
  environment: 50,
  emotionalState: 50,
};

export function useDailyCheckInFlow() {
  const { profile, daysSober } = useUser();
  const {
    addCheckIn,
    todayCheckIns,
    morningCheckIn,
    currentCheckInPeriod,
    currentPeriodCheckIn,
    checkIns,
    logNearMiss,
  } = useCheckin();
  const { triggerLoop, generateSupportiveNotification } = useRetention();

  const isMorning = currentCheckInPeriod === 'morning';
  const sleepLocked = !isMorning && morningCheckIn !== null;
  const morningSleepValue = morningCheckIn?.sleepQuality ?? 50;

  const [values, setValues] = useState<Record<string, number>>(() => ({
    ...DEFAULT_VALUES,
    sleepQuality: sleepLocked ? morningSleepValue : 50,
  }));
  const [selectedTags, setSelectedTags] = useState<EmotionalTag[]>([]);
  const [phase, setPhase] = useState<'metrics' | 'tags'>('metrics');
  const [submitted, setSubmitted] = useState(false);
  const [reflection, setReflection] = useState('');
  const [emotionalNote, setEmotionalNote] = useState('');
  const [calculatedScore, setCalculatedScore] = useState(0);
  const [hadNearMiss, setHadNearMiss] = useState<boolean | null>(null);
  const [nearMissNote, setNearMissNote] = useState('');

  useEffect(() => {
    if (sleepLocked) {
      setValues((prev) => ({ ...prev, sleepQuality: morningSleepValue }));
    }
  }, [sleepLocked, morningSleepValue]);

  const triggerReliefLoop = useCallback(
    (checkIn: DailyCheckIn) => {
      triggerLoop('relief', 'check_in_after_craving');
      if (checkIn.cravingLevel < 40) {
        triggerLoop('control', 'trigger_managed');
      }
      if (checkIn.mood >= 60) {
        generateSupportiveNotification('emotional_stability', checkIns);
      }
    },
    [triggerLoop, generateSupportiveNotification, checkIns]
  );

  const stabilityScore = useMemo(() => {
    const rp = profile?.recoveryProfile;
    const mood = values.mood;
    const emotional = values.emotionalState;
    const intensity = Math.min(
      5,
      Math.max(1, Math.round(1 + ((100 - (mood + emotional) / 2) / 100) * 4))
    );
    const sleepNum = values.sleepQuality;
    const sleepQuality: 'poor' | 'okay' | 'good' =
      sleepNum <= 33 ? 'poor' : sleepNum <= 66 ? 'okay' : 'good';
    const input = {
      intensity,
      sleepQuality,
      triggers: rp?.triggers ?? [],
      supportLevel: rp?.supportAvailability ?? 'limited',
      dailyActionsCompleted: 1,
      relapseLogged: false,
    };
    return calculateStability(input).score;
  }, [values, profile?.recoveryProfile]);

  const periodConfig = useMemo((): PeriodConfig => {
    const data = PERIOD_CONFIG_DATA[currentCheckInPeriod];
    return {
      ...data,
      iconKey: currentCheckInPeriod === 'evening' ? 'sunset' : 'sun',
    };
  }, [currentCheckInPeriod]);

  const PERIOD_CONFIG = useMemo((): Record<CheckInTimeOfDay, PeriodConfig> => {
    const periods: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];
    const result = {} as Record<CheckInTimeOfDay, PeriodConfig>;
    for (const p of periods) {
      const data = PERIOD_CONFIG_DATA[p];
      result[p] = {
        ...data,
        iconKey: p === 'evening' ? 'sunset' : 'sun',
      };
    }
    return result;
  }, []);

  const handleValueChange = useCallback(
    (key: string, val: number) => {
      if (key === 'sleepQuality' && sleepLocked) return;
      setValues((prev) => ({ ...prev, [key]: val }));
    },
    [sleepLocked]
  );

  const handleToggleTag = useCallback((tag: EmotionalTag) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      if (exists) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (phase === 'metrics') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhase('tags');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const score = stabilityScore;
    const { reflection: ref, emotionalNote: note } = getEmotionalReflection(
      score,
      values,
      checkIns,
      daysSober
    );
    setCalculatedScore(score);
    setReflection(ref);
    setEmotionalNote(note);

    const checkIn: DailyCheckIn = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      timeOfDay: currentCheckInPeriod,
      mood: values.mood,
      cravingLevel: values.cravingLevel,
      stress: values.stress,
      sleepQuality: values.sleepQuality,
      environment: values.environment,
      emotionalState: values.emotionalState,
      stabilityScore: score,
      reflection: ref,
      completedAt: new Date().toISOString(),
      emotionalTags: selectedTags.length ? selectedTags : undefined,
    };

    addCheckIn(checkIn);
    if (hadNearMiss) {
      logNearMiss({
        timestamp: new Date().toISOString(),
        cravingLevel: values.cravingLevel,
        triggerContext: `${periodConfig.label} check-in; mood ${values.mood}; stress ${values.stress}; environment ${values.environment}`,
        note: nearMissNote.trim() || undefined,
      });
    }
    triggerReliefLoop(checkIn);
    setSubmitted(true);
  }, [
    phase,
    stabilityScore,
    values,
    checkIns,
    daysSober,
    currentCheckInPeriod,
    selectedTags,
    addCheckIn,
    triggerReliefLoop,
    hadNearMiss,
    nearMissNote,
    logNearMiss,
    periodConfig.label,
  ]);

  const completedPeriods = useMemo(() => {
    const periods: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];
    return periods.filter((p) => todayCheckIns.some((c) => c.timeOfDay === p));
  }, [todayCheckIns]);

  const allPeriodsComplete = completedPeriods.length >= 3;

  const getCheckInForPeriod = useCallback(
    (period: CheckInTimeOfDay) => {
      return todayCheckIns.find((c) => c.timeOfDay === period) ?? null;
    },
    [todayCheckIns]
  );

  const resultScoreColor = getScoreColor(calculatedScore);
  const resultScoreLabel = getScoreLabel(calculatedScore);

  return {
    // Config (use METRICS_CONFIG + iconKey in screen; PERIOD_CONFIG has iconKey)
    METRICS_CONFIG,
    EMOTIONAL_TAGS,
    periodConfig,
    PERIOD_CONFIG,
    PERIOD_CONFIG_DATA,

    // State
    values,
    selectedTags,
    phase,
    submitted,
    reflection,
    emotionalNote,
    calculatedScore,
    hadNearMiss,
    nearMissNote,

    // Derived
    stabilityScore,
    isMorning,
    sleepLocked,
    morningSleepValue,
    completedPeriods,
    allPeriodsComplete,
    currentCheckInPeriod,
    currentPeriodCheckIn,
    todayCheckIns,

    // Result display helpers
    resultScoreColor,
    resultScoreLabel,

    // Handlers
    setValues,
    setHadNearMiss,
    setNearMissNote,
    handleValueChange,
    handleToggleTag,
    handleSubmit,
    getCheckInForPeriod,
  };
}
