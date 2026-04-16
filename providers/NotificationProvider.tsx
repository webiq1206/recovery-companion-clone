import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient';
import {
  BehavioralNotificationState,
  BehavioralNotificationRecord,
  NotificationFrequencyState,
  NotificationIntensityLevel,
  DailyCheckIn,
  RiskCategory,
} from '../types';
import {
  NOTIFICATION_INTENSITY_CONFIG,
  BEHAVIORAL_TEMPLATES,
  HIGH_RISK_HOUR_WINDOWS,
  NOTIFICATION_CHANNEL_CONFIG,
  ADAPTIVE_FREQUENCY_RULES,
  BehavioralTriggerType,
  NotificationIntensity,
} from '../constants/notifications';

const STORAGE_KEY = 'behavioral_notification_state';
if (Platform.OS !== 'web' && !isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const DEFAULT_FREQUENCY: NotificationFrequencyState = {
  todayCount: 0,
  todayDate: '',
  lastSentAt: '',
  consecutiveDismisses: 0,
  frequencyMultiplier: 1.0,
  lastInteractionAt: '',
  consecutiveWithoutInteraction: 0,
  pausedUntil: '',
};

const DEFAULT_STATE: BehavioralNotificationState = {
  isPermissionGranted: false,
  intensity: 'balanced',
  history: [],
  frequency: DEFAULT_FREQUENCY,
  highRiskHours: [],
  lastMissedCheckinAlert: '',
  lastEmotionalDipAlert: '',
  lastStreakProtectionAlert: '',
  lastStabilityDropAlert: '',
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentHour(): number {
  return new Date().getHours();
}

function isInQuietHours(quietStart: number, quietEnd: number): boolean {
  const hour = getCurrentHour();
  if (quietStart <= quietEnd) {
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart || hour < quietEnd;
}

function minutesSince(isoDate: string): number {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / 60000;
}

function hoursSince(isoDate: string): number {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / 3600000;
}

function isInHighRiskWindow(highRiskHours: number[]): boolean {
  const hour = getCurrentHour();
  return highRiskHours.includes(hour);
}

function detectHighRiskHours(checkIns: DailyCheckIn[]): number[] {
  if (checkIns.length < 5) return [];

  const hourCravings: Record<number, { total: number; count: number }> = {};

  for (const checkIn of checkIns) {
    if (!checkIn.completedAt) continue;
    const hour = new Date(checkIn.completedAt).getHours();
    if (!hourCravings[hour]) {
      hourCravings[hour] = { total: 0, count: 0 };
    }
    hourCravings[hour].total += checkIn.cravingLevel;
    hourCravings[hour].count += 1;
  }

  const avgByHour = Object.entries(hourCravings).map(([h, data]) => ({
    hour: parseInt(h, 10),
    avg: data.total / data.count,
  }));

  avgByHour.sort((a, b) => b.avg - a.avg);

  const highRisk = avgByHour.filter(h => h.avg > 55).map(h => h.hour);

  for (const window of HIGH_RISK_HOUR_WINDOWS) {
    for (let h = window.start; h !== window.end; h = (h + 1) % 24) {
      if (!highRisk.includes(h)) {
        highRisk.push(h);
      }
    }
  }

  return [...new Set(highRisk)].slice(0, 8);
}

async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_CONFIG.id, {
      name: NOTIFICATION_CHANNEL_CONFIG.name,
      description: NOTIFICATION_CHANNEL_CONFIG.description,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
    });
  }
}

/** Read OS permission without prompting (store-friendly). */
async function readNotificationPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('[Notifications] Permission read error:', e);
    return false;
  }
}

/** Call only from explicit user action (e.g. Settings toggle). */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('[Notifications] Permission request error:', e);
    return false;
  }
}

async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerSeconds: number = 1,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web: would send:', title, '-', body);
    return `web_${Date.now()}`;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        categoryIdentifier: NOTIFICATION_CHANNEL_CONFIG.id,
      },
      trigger: triggerSeconds <= 1
        ? null
        : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds },
    });
    console.log('[Notifications] Scheduled:', id, title);
    return id;
  } catch (e) {
    console.log('[Notifications] Schedule error:', e);
    return null;
  }
}

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BehavioralNotificationState>(DEFAULT_STATE);
  const stateRef = useRef(state);
  const appStateRef = useRef(AppState.currentState);
  const evaluationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stateQuery = useQuery({
    queryKey: ['behavioral_notifications'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as BehavioralNotificationState;
          return {
            ...DEFAULT_STATE,
            ...parsed,
            frequency: { ...DEFAULT_FREQUENCY, ...(parsed.frequency ?? {}) },
            history: parsed.history ?? [],
          };
        }
        return DEFAULT_STATE;
      } catch (e) {
        console.log('[Notifications] Error loading state:', e);
        return DEFAULT_STATE;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (stateQuery.data) {
      setState(stateQuery.data);
    }
  }, [stateQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: BehavioralNotificationState) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      setState(data);
      queryClient.setQueryData(['behavioral_notifications'], data);
    },
  });

  const save = useCallback((data: BehavioralNotificationState) => {
    setState(data);
    saveMutation.mutate(data);
  }, []);

  useEffect(() => {
    if (!stateQuery.isSuccess || isExpoGo || Platform.OS === 'web') return;
    const cached = stateQuery.data;
    let cancelled = false;
    void (async () => {
      const granted = await readNotificationPermissionGranted();
      if (cancelled) return;
      if (granted) {
        await setupNotificationChannel();
      }
      if (granted !== cached.isPermissionGranted) {
        saveMutation.mutate({ ...cached, isPermissionGranted: granted });
      }
      console.log('[Notifications] Permission (read-only on launch):', granted ? 'granted' : 'denied');
    })();
    return () => {
      cancelled = true;
    };
  }, [stateQuery.isSuccess, stateQuery.data, isExpoGo, saveMutation]);

  /** Call when the user explicitly opts in (e.g. Settings → Notifications). */
  const promptForNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || isExpoGo) return false;
    const granted = await requestPermissions();
    if (granted) {
      await setupNotificationChannel();
    }
    const s = stateRef.current;
    if (granted !== s.isPermissionGranted) {
      saveMutation.mutate({ ...s, isPermissionGranted: granted });
    }
    return granted;
  }, [saveMutation]);

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo) return;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] User tapped notification:', response.notification.request.identifier);
      handleNotificationInteraction(response.notification.request.identifier, true);
    });

    return () => {
      responseSubscription.remove();
    };
  }, [state]);

  const resetTodayCountIfNeeded = useCallback(() => {
    const today = getToday();
    if (state.frequency.todayDate !== today) {
      const updated = {
        ...state,
        frequency: {
          ...state.frequency,
          todayCount: 0,
          todayDate: today,
        },
      };
      save(updated);
    }
  }, [state, save]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        resetTodayCountIfNeeded();
        if (!isExpoGo && Platform.OS !== 'web') {
          void (async () => {
            const granted = await readNotificationPermissionGranted();
            const s = stateRef.current;
            if (granted !== s.isPermissionGranted) {
              saveMutation.mutate({ ...s, isPermissionGranted: granted });
            }
            if (granted) {
              await setupNotificationChannel();
            }
          })();
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [resetTodayCountIfNeeded, saveMutation]);

  const handleNotificationInteraction = useCallback((notifId: string, tapped: boolean) => {
    const now = new Date().toISOString();
    const history = state.history.map(h => {
      if (h.id === notifId || h.deliveredAt === notifId) {
        return { ...h, interactedAt: now, tapped, dismissed: !tapped };
      }
      return h;
    });

    const freq = { ...state.frequency };
    if (tapped) {
      freq.consecutiveDismisses = 0;
      freq.consecutiveWithoutInteraction = 0;
      freq.lastInteractionAt = now;
      freq.frequencyMultiplier = Math.min(
        freq.frequencyMultiplier * ADAPTIVE_FREQUENCY_RULES.engagementBoostFactor,
        2.0
      );
    } else {
      freq.consecutiveDismisses += 1;
      freq.consecutiveWithoutInteraction += 1;
      if (freq.consecutiveDismisses >= ADAPTIVE_FREQUENCY_RULES.consecutiveDismissThreshold) {
        freq.frequencyMultiplier = Math.max(
          freq.frequencyMultiplier * ADAPTIVE_FREQUENCY_RULES.frequencyReductionFactor,
          0.3
        );
        console.log('[Notifications] Reducing frequency due to dismisses, multiplier:', freq.frequencyMultiplier);
      }
    }

    save({ ...state, history, frequency: freq });
  }, [state, save]);

  const canSendNotification = useCallback((
    quietHoursStart: number,
    quietHoursEnd: number,
    priority: 'low' | 'medium' | 'high' | 'critical',
  ): boolean => {
    if (!state.isPermissionGranted && Platform.OS !== 'web') return false;

    const intensityConfig = NOTIFICATION_INTENSITY_CONFIG[state.intensity as NotificationIntensity];
    if (!intensityConfig) return false;

    if (priority !== 'critical' && isInQuietHours(quietHoursStart, quietHoursEnd)) {
      console.log('[Notifications] Blocked: quiet hours');
      return false;
    }

    if (state.frequency.pausedUntil && new Date(state.frequency.pausedUntil) > new Date()) {
      console.log('[Notifications] Blocked: paused');
      return false;
    }

    const today = getToday();
    const todayCount = state.frequency.todayDate === today ? state.frequency.todayCount : 0;
    const effectiveMax = Math.round(intensityConfig.maxPerDay * state.frequency.frequencyMultiplier);

    if (todayCount >= effectiveMax && priority !== 'critical') {
      console.log('[Notifications] Blocked: daily limit reached', todayCount, '/', effectiveMax);
      return false;
    }

    const minInterval = intensityConfig.minIntervalMinutes / state.frequency.frequencyMultiplier;
    if (minutesSince(state.frequency.lastSentAt) < minInterval && priority !== 'critical') {
      console.log('[Notifications] Blocked: too soon since last');
      return false;
    }

    if (state.frequency.consecutiveWithoutInteraction >= ADAPTIVE_FREQUENCY_RULES.maxConsecutiveWithoutInteraction) {
      if (priority !== 'critical' && priority !== 'high') {
        console.log('[Notifications] Blocked: no interaction detected');
        return false;
      }
    }

    return true;
  }, [state]);

  const sendBehavioralNotification = useCallback(async (
    trigger: BehavioralTriggerType,
    quietHoursStart: number = 22,
    quietHoursEnd: number = 7,
  ): Promise<BehavioralNotificationRecord | null> => {
    const template = BEHAVIORAL_TEMPLATES.find(t => t.trigger === trigger);
    if (!template) {
      console.log('[Notifications] Unknown trigger:', trigger);
      return null;
    }

    if (!canSendNotification(quietHoursStart, quietHoursEnd, template.priority)) {
      return null;
    }

    const message = template.messages[Math.floor(Math.random() * template.messages.length)];
    const notifId = await scheduleLocalNotification(template.title, message);

    if (!notifId) return null;

    const now = new Date().toISOString();
    const today = getToday();

    const record: BehavioralNotificationRecord = {
      id: notifId,
      trigger,
      title: template.title,
      message,
      priority: template.priority,
      scheduledAt: now,
      deliveredAt: now,
      interactedAt: '',
      dismissed: false,
      tapped: false,
    };

    const history = [record, ...state.history].slice(0, 100);
    const freq: NotificationFrequencyState = {
      ...state.frequency,
      todayCount: (state.frequency.todayDate === today ? state.frequency.todayCount : 0) + 1,
      todayDate: today,
      lastSentAt: now,
    };

    save({ ...state, history, frequency: freq });
    console.log('[Notifications] Sent:', trigger, '-', template.title, '-', message);
    return record;
  }, [state, save, canSendNotification]);

  const evaluateBehavioralTriggers = useCallback(async (
    checkIns: DailyCheckIn[],
    riskCategory: RiskCategory,
    currentStreak: number,
    daysSober: number,
    quietHoursStart: number = 22,
    quietHoursEnd: number = 7,
  ) => {
    const intensityConfig = NOTIFICATION_INTENSITY_CONFIG[state.intensity as NotificationIntensity];
    if (!intensityConfig) return;

    const now = new Date();
    const hour = now.getHours();
    const today = getToday();

    const highRiskHours = detectHighRiskHours(checkIns);
    if (JSON.stringify(highRiskHours) !== JSON.stringify(state.highRiskHours)) {
      setState(prev => ({ ...prev, highRiskHours }));
    }

    if (intensityConfig.enableRiskAlerts && isInHighRiskWindow(highRiskHours)) {
      if (hoursSince(state.frequency.lastSentAt) >= 2) {
        await sendBehavioralNotification('high_risk_time', quietHoursStart, quietHoursEnd);
        return;
      }
    }

    if (intensityConfig.enableRiskAlerts && (riskCategory === 'elevated' || riskCategory === 'high')) {
      if (checkIns.length >= 3) {
        const recent = [...checkIns]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
        if (avgCraving > 60 && hoursSince(state.lastEmotionalDipAlert) >= 6) {
          await sendBehavioralNotification('craving_spike', quietHoursStart, quietHoursEnd);
          save({ ...state, lastEmotionalDipAlert: now.toISOString() });
          return;
        }
      }
    }

    if (intensityConfig.enableEmotionalDipSupport && checkIns.length >= 2) {
      const sorted = [...checkIns]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = sorted[0];
      const previous = sorted[1];

      if (latest && previous && latest.mood < previous.mood - 15 && latest.mood < 40) {
        if (hoursSince(state.lastEmotionalDipAlert) >= 8) {
          await sendBehavioralNotification('emotional_dip', quietHoursStart, quietHoursEnd);
          save({ ...state, lastEmotionalDipAlert: now.toISOString() });
          return;
        }
      }
    }

    if (intensityConfig.enableMissedCheckinNudge) {
      const lastCheckIn = checkIns.length > 0
        ? [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

      if (lastCheckIn) {
        const hoursSinceCheckin = hoursSince(lastCheckIn.completedAt || lastCheckIn.date);
        if (hoursSinceCheckin > 28 && hoursSince(state.lastMissedCheckinAlert) >= 12) {
          await sendBehavioralNotification('missed_checkin', quietHoursStart, quietHoursEnd);
          save({ ...state, lastMissedCheckinAlert: now.toISOString() });
          return;
        }
      }
    }

    if (intensityConfig.enableStreakProtection && currentStreak >= 3) {
      const lastCheckIn = checkIns.length > 0
        ? [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;
      if (lastCheckIn) {
        const hoursSinceCheckin = hoursSince(lastCheckIn.completedAt || lastCheckIn.date);
        if (hoursSinceCheckin > 20 && hoursSinceCheckin < 28 && hoursSince(state.lastStreakProtectionAlert) >= 12) {
          await sendBehavioralNotification('streak_protection', quietHoursStart, quietHoursEnd);
          save({ ...state, lastStreakProtectionAlert: now.toISOString() });
          return;
        }
      }
    }

    if (intensityConfig.enableRiskAlerts && checkIns.length >= 3) {
      const sorted = [...checkIns]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
      const avgStability = sorted.reduce((s, c) => s + c.stabilityScore, 0) / sorted.length;
      if (avgStability < 40 && hoursSince(state.lastStabilityDropAlert) >= 12) {
        await sendBehavioralNotification('stability_drop', quietHoursStart, quietHoursEnd);
        save({ ...state, lastStabilityDropAlert: now.toISOString() });
        return;
      }
    }

    if (intensityConfig.enableMorningEvening) {
      if (hour >= 7 && hour <= 9) {
        const alreadySentMorning = state.history.some(
          h => h.trigger === 'morning_anchor' && h.scheduledAt.startsWith(today)
        );
        if (!alreadySentMorning) {
          await sendBehavioralNotification('morning_anchor', quietHoursStart, quietHoursEnd);
          return;
        }
      }
      if (hour >= 20 && hour <= 21) {
        const alreadySentEvening = state.history.some(
          h => h.trigger === 'evening_wind_down' && h.scheduledAt.startsWith(today)
        );
        if (!alreadySentEvening) {
          await sendBehavioralNotification('evening_wind_down', quietHoursStart, quietHoursEnd);
          return;
        }
      }
    }

    const milestones = [7, 14, 30, 60, 90, 180, 365];
    for (const m of milestones) {
      if (daysSober >= m - 1 && daysSober < m) {
        const alreadySent = state.history.some(
          h => h.trigger === 'milestone_approaching' && h.scheduledAt.startsWith(today)
        );
        if (!alreadySent) {
          await sendBehavioralNotification('milestone_approaching', quietHoursStart, quietHoursEnd);
          return;
        }
      }
    }

    if (checkIns.length >= 5) {
      const sorted = [...checkIns]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const recentCommunity = sorted.slice(0, 7);
      const allLowEnvironment = recentCommunity.every(c => c.environment < 35);
      if (allLowEnvironment && hoursSince(state.frequency.lastSentAt) >= 8) {
        await sendBehavioralNotification('isolation_pattern', quietHoursStart, quietHoursEnd);
      }
    }
  }, [state, save, sendBehavioralNotification, canSendNotification]);

  const setIntensity = useCallback((intensity: NotificationIntensityLevel) => {
    console.log('[Notifications] Intensity changed to:', intensity);
    const updated = { ...state, intensity };
    save(updated);
  }, [state, save]);

  const pauseNotifications = useCallback((hours: number) => {
    const pauseUntil = new Date();
    pauseUntil.setHours(pauseUntil.getHours() + hours);
    const updated = {
      ...state,
      frequency: { ...state.frequency, pausedUntil: pauseUntil.toISOString() },
    };
    save(updated);
    console.log('[Notifications] Paused for', hours, 'hours');
  }, [state, save]);

  const resumeNotifications = useCallback(() => {
    const updated = {
      ...state,
      frequency: { ...state.frequency, pausedUntil: '' },
    };
    save(updated);
    console.log('[Notifications] Resumed');
  }, [state, save]);

  const clearHistory = useCallback(() => {
    const updated = { ...state, history: [] };
    save(updated);
  }, [state, save]);

  const isPaused = useMemo(() => {
    return state.frequency.pausedUntil !== '' && new Date(state.frequency.pausedUntil) > new Date();
  }, [state.frequency.pausedUntil]);

  const todayNotificationCount = useMemo(() => {
    const today = getToday();
    return state.frequency.todayDate === today ? state.frequency.todayCount : 0;
  }, [state.frequency]);

  const recentHistory = useMemo(() => {
    return state.history.slice(0, 20);
  }, [state.history]);

  const effectiveMaxPerDay = useMemo(() => {
    const config = NOTIFICATION_INTENSITY_CONFIG[state.intensity as NotificationIntensity];
    if (!config) return 4;
    return Math.round(config.maxPerDay * state.frequency.frequencyMultiplier);
  }, [state.intensity, state.frequency.frequencyMultiplier]);

  const intensityConfig = useMemo(() => {
    return NOTIFICATION_INTENSITY_CONFIG[state.intensity as NotificationIntensity] ?? NOTIFICATION_INTENSITY_CONFIG.balanced;
  }, [state.intensity]);

  return useMemo(() => ({
    state,
    intensity: state.intensity,
    isPermissionGranted: state.isPermissionGranted,
    isPaused,
    todayNotificationCount,
    effectiveMaxPerDay,
    recentHistory,
    intensityConfig,
    highRiskHours: state.highRiskHours,
    frequencyMultiplier: state.frequency.frequencyMultiplier,
    setIntensity,
    sendBehavioralNotification,
    evaluateBehavioralTriggers,
    pauseNotifications,
    resumeNotifications,
    clearHistory,
    promptForNotificationPermission,
    isLoading: stateQuery.isLoading,
  }), [
    state, isPaused, todayNotificationCount, effectiveMaxPerDay,
    recentHistory, intensityConfig, setIntensity,
    sendBehavioralNotification, evaluateBehavioralTriggers,
    pauseNotifications, resumeNotifications, clearHistory,
    promptForNotificationPermission,
    stateQuery.isLoading,
  ]);
});
