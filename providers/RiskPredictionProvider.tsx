import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import {
  DailyCheckIn,
  RiskPrediction,
  RiskAlert,
  SupportIntensity,
  RiskPredictionData,
  RiskTrend,
  RiskCategory,
  AdaptiveWeights,
  InterventionRecord,
  AlertSeverity,
  InterventionType,
  NearMissEvent,
} from '@/types';

const STORAGE_KEY = 'risk_prediction_data';

const DEFAULT_WEIGHTS: AdaptiveWeights = {
  emotional: 0.25,
  behavioral: 0.25,
  trigger: 0.2,
  stability: 0.15,
  isolation: 0.15,
  lastAdaptedAt: '',
  adaptationCount: 0,
};

const DEFAULT_INTENSITY: SupportIntensity = {
  level: 'baseline',
  checkInFrequency: 'daily',
  showCrisisButton: false,
  enableProactiveAlerts: false,
  companionTone: 'encouraging',
};

const DEFAULT_DATA: RiskPredictionData = {
  predictions: [],
  alerts: [],
  currentIntensity: DEFAULT_INTENSITY,
  lastAnalyzedAt: '',
  adaptiveWeights: DEFAULT_WEIGHTS,
  interventionHistory: [],
};

function getTimeOfDayRisk(checkIns: DailyCheckIn[]): { riskByPeriod: Record<string, number>; highRiskPeriod: string } {
  const periods: Record<string, { totalCraving: number; count: number }> = {
    morning: { totalCraving: 0, count: 0 },
    afternoon: { totalCraving: 0, count: 0 },
    evening: { totalCraving: 0, count: 0 },
    night: { totalCraving: 0, count: 0 },
  };

  for (const c of checkIns.slice(0, 14)) {
    const hour = new Date(c.completedAt).getHours();
    let period = 'morning';
    if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 21) period = 'evening';
    else if (hour >= 21 || hour < 5) period = 'night';
    periods[period].totalCraving += c.cravingLevel;
    periods[period].count += 1;
  }

  const riskByPeriod: Record<string, number> = {};
  let highRiskPeriod = 'evening';
  let maxRisk = 0;
  for (const [key, val] of Object.entries(periods)) {
    const avg = val.count > 0 ? Math.round(val.totalCraving / val.count) : 0;
    riskByPeriod[key] = avg;
    if (avg > maxRisk) {
      maxRisk = avg;
      highRiskPeriod = key;
    }
  }
  return { riskByPeriod, highRiskPeriod };
}

function getSleepDisruptionScore(checkIns: DailyCheckIn[]): { score: number; trend: 'improving' | 'declining' | 'stable' } {
  const recent = checkIns.slice(0, 7);
  if (recent.length === 0) return { score: 50, trend: 'stable' };
  const avgSleep = recent.reduce((s, c) => s + c.sleepQuality, 0) / recent.length;
  const disruption = Math.round(100 - avgSleep);

  if (recent.length < 3) return { score: disruption, trend: 'stable' };
  const recentHalf = recent.slice(0, Math.ceil(recent.length / 2));
  const olderHalf = recent.slice(Math.ceil(recent.length / 2));
  const recentAvg = recentHalf.reduce((s, c) => s + c.sleepQuality, 0) / recentHalf.length;
  const olderAvg = olderHalf.reduce((s, c) => s + c.sleepQuality, 0) / olderHalf.length;
  const diff = recentAvg - olderAvg;
  const trend = diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  return { score: disruption, trend };
}

function getMissedEngagementScore(checkIns: DailyCheckIn[]): number {
  if (checkIns.length === 0) return 50;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let missed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = checkIns.find(c => c.date.startsWith(dateStr));
    if (!found) missed++;
  }
  return Math.round((missed / 7) * 100);
}

function calculateIsolationRisk(checkIns: DailyCheckIn[]): number {
  const recent = checkIns.slice(0, 7);
  if (recent.length === 0) return 40;

  let risk = 0;

  const missedDays = calculateMissedCheckInDays(checkIns);
  if (missedDays >= 4) risk += 35;
  else if (missedDays >= 2) risk += 20;
  else if (missedDays >= 1) risk += 8;

  const avgEnvironment = recent.reduce((s, c) => s + c.environment, 0) / recent.length;
  if (avgEnvironment < 30) risk += 25;
  else if (avgEnvironment < 50) risk += 12;

  if (recent.length >= 3) {
    const recentAvgMood = recent.slice(0, 3).reduce((s, c) => s + c.mood, 0) / 3;
    if (recentAvgMood < 30) risk += 20;
    else if (recentAvgMood < 45) risk += 10;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let gapCount = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = checkIns.find(c => c.date.startsWith(dateStr));
    if (!found) gapCount++;
  }
  const engagementDropoff = gapCount / 14;
  if (engagementDropoff > 0.6) risk += 20;
  else if (engagementDropoff > 0.4) risk += 10;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

function calculateEmotionalRisk(checkIns: DailyCheckIn[]): number {
  const recent = checkIns.slice(0, 7);
  if (recent.length === 0) return 40;

  const avgMood = recent.reduce((s, c) => s + c.mood, 0) / recent.length;
  const avgEmotional = recent.reduce((s, c) => s + c.emotionalState, 0) / recent.length;

  const moodDecline = recent.length >= 3
    ? (recent[recent.length - 1].mood - recent[0].mood) / recent.length
    : 0;

  let risk = 0;
  risk += Math.max(0, (100 - avgMood) * 0.4);
  risk += Math.max(0, (100 - avgEmotional) * 0.3);
  if (moodDecline > 5) risk += moodDecline * 2;

  const moodVariance = recent.length > 1
    ? recent.reduce((s, c) => s + Math.pow(c.mood - avgMood, 2), 0) / recent.length
    : 0;
  if (moodVariance > 400) risk += 15;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

function calculateBehavioralRisk(checkIns: DailyCheckIn[], daysSober: number): number {
  const recent = checkIns.slice(0, 7);
  if (recent.length === 0) return 35;

  const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
  const avgStress = recent.reduce((s, c) => s + c.stress, 0) / recent.length;
  const avgSleep = recent.reduce((s, c) => s + c.sleepQuality, 0) / recent.length;

  let risk = 0;
  risk += avgCraving * 0.4;
  risk += avgStress * 0.25;
  risk += Math.max(0, (100 - avgSleep) * 0.2);

  if (daysSober < 7) risk += 15;
  else if (daysSober < 30) risk += 8;
  else if (daysSober < 90) risk += 3;

  const cravingSpike = recent.length >= 2 && recent[0].cravingLevel > recent[1].cravingLevel + 20;
  if (cravingSpike) risk += 12;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

function calculateNearMissRisk(nearMissEvents: NearMissEvent[]): number {
  if (!Array.isArray(nearMissEvents) || nearMissEvents.length === 0) return 0;

  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const recent = nearMissEvents.filter((e) => {
    const ts = new Date(e.timestamp).getTime();
    return !Number.isNaN(ts) && now.getTime() - ts <= sevenDaysMs;
  });

  if (recent.length === 0) return 0;

  let risk = 35;

  const highCravingEvents = recent.filter((e) => e.cravingLevel >= 70).length;
  if (highCravingEvents > 0) {
    risk += Math.min(highCravingEvents * 8, 24);
  }

  if (recent.length >= 3) {
    risk += 8;
  } else if (recent.length === 2) {
    risk += 4;
  }

  return Math.min(50, Math.max(0, Math.round(risk)));
}

function calculateTriggerRisk(checkIns: DailyCheckIn[]): number {
  const recent = checkIns.slice(0, 7);
  if (recent.length === 0) return 30;

  const avgEnvironment = recent.reduce((s, c) => s + c.environment, 0) / recent.length;
  const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;

  let risk = 0;
  risk += Math.max(0, (100 - avgEnvironment) * 0.5);
  risk += avgCraving * 0.3;

  const highCravingDays = recent.filter(c => c.cravingLevel > 70).length;
  if (highCravingDays >= 3) risk += 20;
  else if (highCravingDays >= 2) risk += 10;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

function calculateStabilityRisk(checkIns: DailyCheckIn[]): number {
  const recent = checkIns.slice(0, 7);
  if (recent.length === 0) return 45;

  const avgStability = recent.reduce((s, c) => s + c.stabilityScore, 0) / recent.length;

  let risk = Math.max(0, 100 - avgStability);

  if (recent.length >= 3) {
    const trend = recent[0].stabilityScore - recent[recent.length - 1].stabilityScore;
    if (trend > 10) risk += trend * 0.5;
  }

  const missedDays = calculateMissedCheckInDays(checkIns);
  if (missedDays >= 3) risk += 15;
  else if (missedDays >= 1) risk += 5;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

function calculateMissedCheckInDays(checkIns: DailyCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastCheckIn = new Date(checkIns[0].date);
  lastCheckIn.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - lastCheckIn.getTime()) / 86400000);
  return Math.max(0, diffDays);
}

function categorizeRisk(overallRisk: number): RiskCategory {
  if (overallRisk >= 65) return 'high';
  if (overallRisk >= 45) return 'elevated';
  if (overallRisk >= 25) return 'guarded';
  return 'low';
}

function getRiskCategoryLabel(category: RiskCategory): string {
  switch (category) {
    case 'high': return 'High';
    case 'elevated': return 'Elevated';
    case 'guarded': return 'Guarded';
    case 'low': return 'Low';
  }
}

function getRiskCategoryColor(category: RiskCategory): string {
  switch (category) {
    case 'high': return '#E53935';
    case 'elevated': return '#FB8C00';
    case 'guarded': return '#FDD835';
    case 'low': return '#43A047';
  }
}

function adaptWeights(
  currentWeights: AdaptiveWeights,
  predictions: RiskPrediction[],
): AdaptiveWeights {
  if (predictions.length < 5) {
    console.log('[RiskPrediction] Not enough history to adapt weights, need 5+ predictions');
    return currentWeights;
  }

  const recentSpikes = predictions.slice(0, 10).filter(p => p.overallRisk >= 60);
  if (recentSpikes.length === 0) return currentWeights;

  const factorSums = { emotional: 0, behavioral: 0, trigger: 0, stability: 0, isolation: 0 };
  let count = 0;

  for (const spike of recentSpikes) {
    const total = spike.emotionalRisk + spike.behavioralRisk + spike.triggerRisk + spike.stabilityRisk + spike.isolationRisk;
    if (total === 0) continue;
    factorSums.emotional += spike.emotionalRisk / total;
    factorSums.behavioral += spike.behavioralRisk / total;
    factorSums.trigger += spike.triggerRisk / total;
    factorSums.stability += spike.stabilityRisk / total;
    factorSums.isolation += spike.isolationRisk / total;
    count++;
  }

  if (count === 0) return currentWeights;

  const LEARNING_RATE = 0.15;
  const MIN_WEIGHT = 0.08;
  const MAX_WEIGHT = 0.40;

  const learnedEmotional = factorSums.emotional / count;
  const learnedBehavioral = factorSums.behavioral / count;
  const learnedTrigger = factorSums.trigger / count;
  const learnedStability = factorSums.stability / count;
  const learnedIsolation = factorSums.isolation / count;

  let newEmotional = currentWeights.emotional + LEARNING_RATE * (learnedEmotional - currentWeights.emotional);
  let newBehavioral = currentWeights.behavioral + LEARNING_RATE * (learnedBehavioral - currentWeights.behavioral);
  let newTrigger = currentWeights.trigger + LEARNING_RATE * (learnedTrigger - currentWeights.trigger);
  let newStability = currentWeights.stability + LEARNING_RATE * (learnedStability - currentWeights.stability);
  let newIsolation = currentWeights.isolation + LEARNING_RATE * (learnedIsolation - currentWeights.isolation);

  newEmotional = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newEmotional));
  newBehavioral = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newBehavioral));
  newTrigger = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newTrigger));
  newStability = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newStability));
  newIsolation = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newIsolation));

  const totalWeight = newEmotional + newBehavioral + newTrigger + newStability + newIsolation;
  newEmotional = Math.round((newEmotional / totalWeight) * 100) / 100;
  newBehavioral = Math.round((newBehavioral / totalWeight) * 100) / 100;
  newTrigger = Math.round((newTrigger / totalWeight) * 100) / 100;
  newStability = Math.round((newStability / totalWeight) * 100) / 100;
  const remainingForIsolation = 1 - newEmotional - newBehavioral - newTrigger - newStability;
  newIsolation = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, Math.round(remainingForIsolation * 100) / 100));
  const finalTotal = newEmotional + newBehavioral + newTrigger + newStability + newIsolation;
  if (Math.abs(finalTotal - 1) > 0.001) {
    const correction = 1 - finalTotal;
    newEmotional = Math.round((newEmotional + correction) * 100) / 100;
  }

  console.log('[RiskPrediction] Adapted weights:', {
    emotional: newEmotional, behavioral: newBehavioral,
    trigger: newTrigger, stability: newStability, isolation: newIsolation,
  });

  return {
    emotional: newEmotional,
    behavioral: newBehavioral,
    trigger: newTrigger,
    stability: newStability,
    isolation: newIsolation,
    lastAdaptedAt: new Date().toISOString(),
    adaptationCount: currentWeights.adaptationCount + 1,
  };
}

function determineTrend(predictions: RiskPrediction[]): RiskTrend {
  if (predictions.length < 2) return 'stable';
  const recent = predictions.slice(0, 3);
  const older = predictions.slice(3, 6);

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((s, p) => s + p.overallRisk, 0) / recent.length;
  const olderAvg = older.reduce((s, p) => s + p.overallRisk, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 5) return 'rising';
  if (diff < -5) return 'falling';
  return 'stable';
}

function calculateConfidence(checkIns: DailyCheckIn[]): number {
  const recent = checkIns.slice(0, 14);
  if (recent.length === 0) return 20;
  if (recent.length < 3) return 35;
  if (recent.length < 7) return 55;
  if (recent.length < 14) return 75;
  return 90;
}

function determineSupportIntensity(overallRisk: number, trend: RiskTrend, category: RiskCategory): SupportIntensity {
  if (category === 'high' || (overallRisk >= 60 && trend === 'rising')) {
    return {
      level: 'maximum',
      checkInFrequency: 'every_few_hours',
      showCrisisButton: true,
      enableProactiveAlerts: true,
      companionTone: 'crisis',
    };
  }
  if (category === 'elevated' || (overallRisk >= 45 && trend === 'rising')) {
    return {
      level: 'high',
      checkInFrequency: 'twice_daily',
      showCrisisButton: true,
      enableProactiveAlerts: true,
      companionTone: 'urgent',
    };
  }
  if (category === 'guarded') {
    return {
      level: 'elevated',
      checkInFrequency: 'daily',
      showCrisisButton: false,
      enableProactiveAlerts: true,
      companionTone: 'supportive',
    };
  }
  return DEFAULT_INTENSITY;
}

function generateAlerts(
  prediction: RiskPrediction,
  checkIns: DailyCheckIn[],
  existingAlerts: RiskAlert[],
): RiskAlert[] {
  const newAlerts: RiskAlert[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayAlertIds = existingAlerts
    .filter(a => a.createdAt.startsWith(today))
    .map(a => a.id);

  if (prediction.emotionalRisk >= 65 && !todayAlertIds.includes(`emotional_${today}`)) {
    newAlerts.push({
      id: `emotional_${today}`,
      severity: prediction.emotionalRisk >= 80 ? 'critical' : 'warning',
      title: 'Your emotional world needs some care',
      message: "It looks like things have felt heavier lately. That's okay — recovery isn't a straight line, and tough moments are part of the journey.",
      suggestion: 'Writing down what you feel, even a few words, can lighten the weight. You could also talk to someone who gets it.',
      interventionType: prediction.emotionalRisk >= 80 ? 'crisis' : 'journaling',
      route: prediction.emotionalRisk >= 80 ? '/crisis-mode' : '/new-journal',
      createdAt: new Date().toISOString(),
      isDismissed: false,
      isActedOn: false,
    });
  }

  if (prediction.behavioralRisk >= 65 && !todayAlertIds.includes(`behavioral_${today}`)) {
    newAlerts.push({
      id: `behavioral_${today}`,
      severity: prediction.behavioralRisk >= 80 ? 'critical' : 'warning',
      title: 'Cravings are speaking up',
      message: "Your body and mind are asking for attention right now. Cravings can feel overwhelming, but they always pass. You've gotten through this before.",
      suggestion: 'A grounding exercise can help ride the wave. Even 60 seconds of focused breathing makes a difference.',
      interventionType: prediction.behavioralRisk >= 80 ? 'crisis' : 'grounding',
      route: prediction.behavioralRisk >= 80 ? '/crisis-mode' : '/crisis-mode',
      createdAt: new Date().toISOString(),
      isDismissed: false,
      isActedOn: false,
    });
  }

  if (prediction.triggerRisk >= 70 && !todayAlertIds.includes(`trigger_${today}`)) {
    newAlerts.push({
      id: `trigger_${today}`,
      severity: prediction.triggerRisk >= 85 ? 'critical' : 'caution',
      title: 'Your environment may need some attention',
      message: "You've been in situations that tend to make things harder. Noticing this is a sign of strength — awareness is your first line of defense.",
      suggestion: 'Take a look at your trigger map. Having a plan for safer alternatives can make all the difference.',
      interventionType: 'connection',
      route: '/(tabs)/triggers',
      createdAt: new Date().toISOString(),
      isDismissed: false,
      isActedOn: false,
    });
  }

  if (prediction.isolationRisk >= 60 && !todayAlertIds.includes(`isolation_${today}`)) {
    newAlerts.push({
      id: `isolation_${today}`,
      severity: prediction.isolationRisk >= 80 ? 'warning' : 'caution',
      title: "It's been quiet — we're here for you",
      message: "When we pull back from the world, it can feel safer, but isolation often makes things harder over time. You don't have to do this alone.",
      suggestion: 'Even a small connection helps. Check in here, or reach out to someone you trust — it doesn\'t have to be a big conversation.',
      interventionType: 'isolation_outreach',
      route: '/companion-chat',
      createdAt: new Date().toISOString(),
      isDismissed: false,
      isActedOn: false,
    });
  }

  const missedDays = calculateMissedCheckInDays(checkIns);
  if (missedDays >= 2 && !todayAlertIds.includes(`missed_${today}`)) {
    newAlerts.push({
      id: `missed_${today}`,
      severity: missedDays >= 4 ? 'warning' : 'caution',
      title: `We haven't heard from you in ${missedDays} days`,
      message: "No pressure — life gets busy. But even a quick check-in helps us stay in tune with how you're doing so we can be here when it matters.",
      suggestion: 'A 20-second check-in is all it takes. Just let us know how today is going.',
      interventionType: 'checkin',
      route: '/daily-checkin',
      createdAt: new Date().toISOString(),
      isDismissed: false,
      isActedOn: false,
    });
  }

  if (prediction.riskCategory === 'high' && prediction.trend === 'rising' && !todayAlertIds.includes(`rising_${today}`)) {
    newAlerts.push({
      id: `rising_${today}`,
      severity: 'critical',
      title: 'Multiple signals are rising together',
      message: "Several parts of your wellbeing are showing strain right now. This doesn't define your journey — it means now is the moment to lean on your tools and your people.",
      suggestion: 'Your recovery companion understands where you are. Let them help you think through what you need right now.',
      interventionType: 'companion',
      route: '/companion-chat',
      createdAt: new Date().toISOString(),
      isDismissed: false,
      isActedOn: false,
    });
  }

  return newAlerts;
}

function generateAutoInterventions(
  prediction: RiskPrediction,
  existingHistory: InterventionRecord[],
): InterventionRecord[] {
  const newRecords: InterventionRecord[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayInterventions = existingHistory.filter(r => r.triggeredAt.startsWith(today));

  if (prediction.riskCategory === 'elevated' && todayInterventions.length === 0) {
    newRecords.push({
      id: `auto_elevated_${today}`,
      triggeredAt: new Date().toISOString(),
      riskCategory: 'elevated',
      interventionType: 'checkin',
      wasAutoTriggered: true,
      riskScoreAtTime: prediction.overallRisk,
    });
    console.log('[RiskPrediction] Auto-intervention triggered: elevated risk → extra check-in prompt');
  }

  if (prediction.riskCategory === 'high' && todayInterventions.filter(r => r.riskCategory === 'high').length === 0) {
    newRecords.push({
      id: `auto_high_${today}`,
      triggeredAt: new Date().toISOString(),
      riskCategory: 'high',
      interventionType: 'crisis',
      wasAutoTriggered: true,
      riskScoreAtTime: prediction.overallRisk,
    });
    console.log('[RiskPrediction] Auto-intervention triggered: high risk → crisis tools activated');
  }

  if (prediction.isolationRisk >= 70 && todayInterventions.filter(r => r.interventionType === 'isolation_outreach').length === 0) {
    newRecords.push({
      id: `auto_isolation_${today}`,
      triggeredAt: new Date().toISOString(),
      riskCategory: prediction.riskCategory,
      interventionType: 'isolation_outreach',
      wasAutoTriggered: true,
      riskScoreAtTime: prediction.overallRisk,
    });
    console.log('[RiskPrediction] Auto-intervention triggered: isolation risk → outreach prompt');
  }

  return newRecords;
}

export const [RiskPredictionProvider, useRiskPrediction] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { daysSober } = useUser();
  const { checkIns, nearMissEvents } = useCheckin();
  const [data, setData] = useState<RiskPredictionData>(DEFAULT_DATA);
  const dataRef = useRef<RiskPredictionData>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const dataQuery = useQuery({
    queryKey: ['riskPrediction'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RiskPredictionData;
          if (!parsed.adaptiveWeights) parsed.adaptiveWeights = DEFAULT_WEIGHTS;
          if (!parsed.interventionHistory) parsed.interventionHistory = [];
          return parsed;
        }
        return DEFAULT_DATA;
      } catch (e) {
        console.log('Error loading risk prediction data:', e);
        return DEFAULT_DATA;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (dataQuery.data) {
      setData(dataQuery.data);
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newData: RiskPredictionData) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: (result) => {
      setData(result);
      queryClient.setQueryData(['riskPrediction'], result);
    },
  });

  const runPrediction = useCallback(() => {
    console.log('[RiskPrediction] Running prediction engine...');
    console.log('[RiskPrediction] Check-ins available:', checkIns.length);

    const currentData = dataRef.current;
    const weights = currentData.adaptiveWeights ?? DEFAULT_WEIGHTS;

    const emotionalRisk = calculateEmotionalRisk(checkIns);
    const behavioralRisk = calculateBehavioralRisk(checkIns, daysSober);
    const triggerRisk = calculateTriggerRisk(checkIns);
    const stabilityRisk = calculateStabilityRisk(checkIns);
    const isolationRisk = calculateIsolationRisk(checkIns);
    const nearMissRisk = calculateNearMissRisk(nearMissEvents);

    let overallRisk = Math.round(
      emotionalRisk * weights.emotional +
      behavioralRisk * weights.behavioral +
      triggerRisk * weights.trigger +
      stabilityRisk * weights.stability +
      isolationRisk * weights.isolation
    );

    if (nearMissRisk > 0) {
      overallRisk = Math.min(100, overallRisk + nearMissRisk);
    }

    const riskCategory = categorizeRisk(overallRisk);

    const updatedPredictionsForTrend = [{ overallRisk } as RiskPrediction, ...currentData.predictions].slice(0, 30);
    const trend = determineTrend(updatedPredictionsForTrend);
    const confidence = calculateConfidence(checkIns);

    const prediction: RiskPrediction = {
      overallRisk,
      emotionalRisk,
      behavioralRisk,
      triggerRisk,
      stabilityRisk,
      isolationRisk,
      riskCategory,
      trend,
      confidence,
      generatedAt: new Date().toISOString(),
    };

    const newAlerts = generateAlerts(prediction, checkIns, currentData.alerts);
    const currentIntensity = determineSupportIntensity(overallRisk, trend, riskCategory);

    const autoInterventions = generateAutoInterventions(prediction, currentData.interventionHistory ?? []);

    const updatedPredictions = [prediction, ...currentData.predictions].slice(0, 30);

    const newWeights = adaptWeights(weights, updatedPredictions);

    const updatedAlerts = [...newAlerts, ...currentData.alerts].slice(0, 50);
    const updatedInterventions = [...autoInterventions, ...(currentData.interventionHistory ?? [])].slice(0, 100);

    const updated: RiskPredictionData = {
      predictions: updatedPredictions,
      alerts: updatedAlerts,
      currentIntensity,
      lastAnalyzedAt: new Date().toISOString(),
      adaptiveWeights: newWeights,
      interventionHistory: updatedInterventions,
    };

    console.log('[RiskPrediction] Overall risk:', overallRisk, 'Category:', riskCategory, 'Trend:', trend, 'Intensity:', currentIntensity.level);
    console.log('[RiskPrediction] Isolation risk:', isolationRisk);
    console.log('[RiskPrediction] Weights:', { e: weights.emotional, b: weights.behavioral, t: weights.trigger, s: weights.stability, i: weights.isolation });

    saveMutation.mutate(updated);
    return prediction;
  }, [checkIns, daysSober]);

  useEffect(() => {
    if (checkIns.length === 0) return;

    const currentData = dataRef.current;
    const lastAnalyzed = currentData.lastAnalyzedAt ? new Date(currentData.lastAnalyzedAt) : null;
    const now = new Date();

    const shouldAnalyze = !lastAnalyzed ||
      (now.getTime() - lastAnalyzed.getTime()) > 3600000 ||
      (checkIns[0] && new Date(checkIns[0].completedAt) > (lastAnalyzed ?? new Date(0)));

    if (shouldAnalyze) {
      console.log('[RiskPrediction] Auto-triggering prediction analysis');
      runPrediction();
    }
  }, [checkIns.length, data.lastAnalyzedAt, runPrediction]);

  const dismissAlert = useCallback((alertId: string) => {
    const currentData = dataRef.current;
    const updated = {
      ...currentData,
      alerts: currentData.alerts.map(a => a.id === alertId ? { ...a, isDismissed: true } : a),
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const actOnAlert = useCallback((alertId: string) => {
    const currentData = dataRef.current;
    const updated = {
      ...currentData,
      alerts: currentData.alerts.map(a => a.id === alertId ? { ...a, isActedOn: true } : a),
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const currentPrediction = useMemo((): RiskPrediction | null => {
    return data.predictions[0] ?? null;
  }, [data.predictions]);

  const activeAlerts = useMemo(() => {
    const undismissed = data.alerts.filter(a => !a.isDismissed);
    const missedAlerts = undismissed.filter(a => a.id.startsWith('missed_'));
    if (missedAlerts.length <= 1) return undismissed;
    const latestMissed = missedAlerts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return undismissed.filter(a => !a.id.startsWith('missed_') || a.id === latestMissed.id);
  }, [data.alerts]);

  const criticalAlerts = useMemo(() => {
    return activeAlerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
  }, [activeAlerts]);

  const riskCategory = useMemo((): RiskCategory => {
    return currentPrediction?.riskCategory ?? 'low';
  }, [currentPrediction]);

  const riskLabel = useMemo((): string => {
    return getRiskCategoryLabel(riskCategory);
  }, [riskCategory]);

  const riskColor = useMemo((): string => {
    return getRiskCategoryColor(riskCategory);
  }, [riskCategory]);

  const trendLabel = useMemo((): string => {
    if (!currentPrediction) return '';
    switch (currentPrediction.trend) {
      case 'rising': return 'Increasing';
      case 'falling': return 'Decreasing';
      case 'stable': return 'Stable';
    }
  }, [currentPrediction]);

  const reassuringMessage = useMemo((): string => {
    if (!currentPrediction) return 'Complete a check-in to start your personalized early warning system.';
    switch (riskCategory) {
      case 'high':
        return "You're carrying a lot right now, and that takes real courage. Your tools and your people are right here — lean on them.";
      case 'elevated':
        return "Some things are asking for your attention. That's not a setback — it's awareness. Small, steady steps keep you moving forward.";
      case 'guarded':
        return "You're navigating things well. A few signals are worth keeping an eye on, and your daily habits are making a real difference.";
      case 'low':
        return "Your patterns reflect real strength and dedication. Keep nourishing what's working — you've earned this stability.";
    }
  }, [currentPrediction, riskCategory]);

  const timeOfDayRisk = useMemo(() => getTimeOfDayRisk(checkIns), [checkIns]);
  const sleepDisruption = useMemo(() => getSleepDisruptionScore(checkIns), [checkIns]);
  const missedEngagement = useMemo(() => getMissedEngagementScore(checkIns), [checkIns]);
  const isolationScore = useMemo(() => currentPrediction?.isolationRisk ?? 0, [currentPrediction]);

  const riskFactors = useMemo(() => {
    if (!currentPrediction) return [];
    const weights = data.adaptiveWeights ?? DEFAULT_WEIGHTS;
    const factors = [
      { label: 'Emotional', value: currentPrediction.emotionalRisk, color: '#CE93D8', weight: weights.emotional },
      { label: 'Behavioral', value: currentPrediction.behavioralRisk, color: '#FF6B35', weight: weights.behavioral },
      { label: 'Triggers', value: currentPrediction.triggerRisk, color: '#FFC107', weight: weights.trigger },
      { label: 'Stability', value: currentPrediction.stabilityRisk, color: '#2EC4B6', weight: weights.stability },
      { label: 'Isolation', value: currentPrediction.isolationRisk, color: '#7986CB', weight: weights.isolation },
      { label: 'Sleep', value: sleepDisruption.score, color: '#7C8CF8', weight: 0 },
      { label: 'Engagement', value: missedEngagement, color: '#66BB6A', weight: 0 },
    ];
    return factors.sort((a, b) => b.value - a.value);
  }, [currentPrediction, sleepDisruption, missedEngagement, data.adaptiveWeights]);

  const hasAutoIntervention = useMemo((): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return (data.interventionHistory ?? []).some(r => r.triggeredAt.startsWith(today) && r.wasAutoTriggered);
  }, [data.interventionHistory]);

  return useMemo(() => ({
    currentPrediction,
    predictions: data.predictions,
    activeAlerts,
    criticalAlerts,
    currentIntensity: data.currentIntensity,
    riskCategory,
    riskLabel,
    riskColor,
    trendLabel,
    reassuringMessage,
    runPrediction,
    dismissAlert,
    actOnAlert,
    isLoading: dataQuery.isLoading,
    timeOfDayRisk,
    sleepDisruption,
    missedEngagement,
    isolationScore,
    riskFactors,
    adaptiveWeights: data.adaptiveWeights ?? DEFAULT_WEIGHTS,
    hasAutoIntervention,
    interventionHistory: data.interventionHistory ?? [],
  }), [
    currentPrediction, data.predictions, activeAlerts, criticalAlerts,
    data.currentIntensity, riskCategory, riskLabel, riskColor, trendLabel,
    reassuringMessage, runPrediction, dismissAlert, actOnAlert,
    dataQuery.isLoading, timeOfDayRisk, sleepDisruption, missedEngagement,
    isolationScore, riskFactors, data.adaptiveWeights, hasAutoIntervention,
    data.interventionHistory,
  ]);
});
