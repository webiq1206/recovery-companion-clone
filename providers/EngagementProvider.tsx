import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  MicroWin,
  MicroWinCategory,
  StreakData,
  GrowthDimension,
  EngagementData,
  NotificationPreferences,
  DailyCheckIn,
} from '@/types';

const STORAGE_KEY = 'engagement_data';

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  protectionTokens: 3,
  maxProtectionTokens: 3,
  protectionUsedDates: [],
  lastActiveDate: '',
  gracePeriodActive: false,
  gracePeriodExpires: '',
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  morningCheckin: true,
  eveningReflection: true,
  riskBasedAlerts: true,
  milestoneReminders: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
};

const DEFAULT_GROWTH_DIMENSIONS: GrowthDimension[] = [
  { id: 'consistency', label: 'Consistency', score: 0, previousScore: 0, maxScore: 100, color: '#2EC4B6' },
  { id: 'emotional_awareness', label: 'Emotional Awareness', score: 0, previousScore: 0, maxScore: 100, color: '#66BB6A' },
  { id: 'resilience', label: 'Resilience', score: 0, previousScore: 0, maxScore: 100, color: '#42A5F5' },
  { id: 'self_care', label: 'Self-Care', score: 0, previousScore: 0, maxScore: 100, color: '#FF9800' },
  { id: 'connection', label: 'Connection', score: 0, previousScore: 0, maxScore: 100, color: '#AB47BC' },
];

const DEFAULT_ENGAGEMENT: EngagementData = {
  microWins: [],
  streak: DEFAULT_STREAK,
  growthDimensions: DEFAULT_GROWTH_DIMENSIONS,
  totalWins: 0,
  weeklyWins: 0,
  notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
  lastEncouragementShown: '',
};

const MICRO_WIN_DEFINITIONS: { trigger: string; title: string; description: string; category: MicroWinCategory; icon: string }[] = [
  { trigger: 'checkin_completed', title: 'Checked In', description: 'You showed up for yourself today', category: 'consistency', icon: 'clipboard-check' },
  { trigger: 'journal_written', title: 'Words of Healing', description: 'You processed your feelings through writing', category: 'emotional', icon: 'pen-line' },
  { trigger: 'pledge_honored', title: 'Promise Kept', description: 'You honored your commitment today', category: 'resilience', icon: 'hand-heart' },
  { trigger: 'routine_completed', title: 'Routine Completed', description: 'You followed through on your daily structure', category: 'self_care', icon: 'check-circle' },
  { trigger: 'habit_practiced', title: 'Healthy Choice', description: 'You chose a replacement habit over old patterns', category: 'growth', icon: 'sprout' },
  { trigger: 'community_engaged', title: 'Reached Out', description: 'You connected with your recovery community', category: 'social', icon: 'users' },
  { trigger: 'crisis_navigated', title: 'Storm Weathered', description: 'You used your tools during a difficult moment', category: 'resilience', icon: 'shield' },
  { trigger: 'mood_improved', title: 'Rising Tide', description: 'Your emotional state improved from yesterday', category: 'emotional', icon: 'trending-up' },
  { trigger: 'streak_milestone_3', title: '3-Day Momentum', description: 'Three days of consistent engagement', category: 'consistency', icon: 'flame' },
  { trigger: 'streak_milestone_7', title: 'Week of Strength', description: 'A full week of showing up', category: 'consistency', icon: 'star' },
  { trigger: 'streak_milestone_14', title: 'Two-Week Foundation', description: 'Building unshakable habits', category: 'consistency', icon: 'award' },
  { trigger: 'streak_milestone_30', title: 'Monthly Champion', description: 'A month of dedication and growth', category: 'consistency', icon: 'trophy' },
  { trigger: 'first_reflection', title: 'Inner Explorer', description: 'You started looking inward', category: 'emotional', icon: 'compass' },
  { trigger: 'low_craving_day', title: 'Steady Ground', description: 'Your cravings were manageable today', category: 'resilience', icon: 'mountain' },
  { trigger: 'high_stability', title: 'Grounded & Stable', description: 'You reached high Comprehensive Stability', category: 'resilience', icon: 'anchor' },
];

const SUPPORTIVE_MESSAGES = [
  "You are building something beautiful, one day at a time.",
  "Every small step you take matters more than you realize.",
  "Your commitment to healing is quietly reshaping your life.",
  "The fact that you're here shows incredible strength.",
  "Growth isn't always loud. Sometimes it's the quiet moments of choosing differently.",
  "You deserve the peace you're building for yourself.",
  "Each day sober is a gift you give to your future self.",
  "You're not just surviving - you're learning to thrive.",
  "The person you were yesterday would be proud of who you are today.",
  "Healing is not a destination. It's the courage to keep walking.",
  "You've already proven you can do hard things.",
  "There's no timeline for healing. You're exactly where you need to be.",
];

const RISK_BASED_MESSAGES: Record<string, string[]> = {
  morning_high_risk: [
    "Good morning. Today might feel heavy, but you have the tools to navigate it.",
    "Starting a new day takes courage. You have more of it than you know.",
    "Take it one hour at a time today. You've got this.",
  ],
  evening_reflection: [
    "Another day complete. Take a moment to acknowledge what you accomplished.",
    "Before you rest, remember: you showed up today. That matters.",
    "The day is ending. Whatever happened, you made it through.",
  ],
  streak_at_risk: [
    "It's okay to have off days. Your streak doesn't define your worth.",
    "Missing a day doesn't erase your progress. You can start again right now.",
    "Recovery isn't about perfection. It's about getting back up.",
  ],
  craving_pattern: [
    "This is typically a challenging time for you. Remember your tools.",
    "You've navigated moments like this before. You can do it again.",
    "When the urge comes, pause. Breathe. Choose your next action with care.",
  ],
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getThisWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export const [EngagementProvider, useEngagement] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [engagement, setEngagement] = useState<EngagementData>(DEFAULT_ENGAGEMENT);

  const engagementQuery = useQuery({
    queryKey: ['engagement'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as EngagementData;
          const merged: EngagementData = {
            ...DEFAULT_ENGAGEMENT,
            ...parsed,
            growthDimensions: parsed.growthDimensions?.length > 0
              ? parsed.growthDimensions
              : DEFAULT_GROWTH_DIMENSIONS,
            notificationPreferences: {
              ...DEFAULT_NOTIFICATION_PREFS,
              ...(parsed.notificationPreferences ?? {}),
            },
            streak: { ...DEFAULT_STREAK, ...(parsed.streak ?? {}) },
          };
          return merged;
        }
        return DEFAULT_ENGAGEMENT;
      } catch (e) {
        console.log('Error loading engagement data:', e);
        return DEFAULT_ENGAGEMENT;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (engagementQuery.data) {
      setEngagement(engagementQuery.data);
    }
  }, [engagementQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: EngagementData) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      setEngagement(data);
      queryClient.setQueryData(['engagement'], data);
    },
  });

  const save = useCallback((data: EngagementData) => {
    setEngagement(data);
    saveMutation.mutate(data);
  }, []);

  const recordMicroWin = useCallback((trigger: string) => {
    const def = MICRO_WIN_DEFINITIONS.find(d => d.trigger === trigger);
    if (!def) {
      console.log('Unknown micro-win trigger:', trigger);
      return null;
    }

    const today = getToday();
    const alreadyEarnedToday = engagement.microWins.some(
      w => w.id.startsWith(trigger) && w.earnedAt.startsWith(today)
    );
    if (alreadyEarnedToday) return null;

    const win: MicroWin = {
      id: `${trigger}_${Date.now()}`,
      title: def.title,
      description: def.description,
      category: def.category,
      earnedAt: new Date().toISOString(),
      icon: def.icon,
    };

    const weekStart = getThisWeekStart();
    const weeklyWins = engagement.microWins.filter(w => w.earnedAt >= weekStart).length + 1;

    const updated: EngagementData = {
      ...engagement,
      microWins: [win, ...engagement.microWins].slice(0, 200),
      totalWins: engagement.totalWins + 1,
      weeklyWins,
    };

    save(updated);
    return win;
  }, [engagement, save]);

  const updateStreak = useCallback((isActive: boolean) => {
    const today = getToday();
    const streak = { ...engagement.streak };
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (streak.lastActiveDate === today) return;

    if (isActive) {
      if (streak.lastActiveDate === yesterdayStr || streak.lastActiveDate === '') {
        streak.currentStreak += 1;
      } else if (streak.gracePeriodActive && new Date(streak.gracePeriodExpires) > new Date()) {
        streak.currentStreak += 1;
        streak.gracePeriodActive = false;
        streak.gracePeriodExpires = '';
      } else {
        streak.currentStreak = 1;
      }
      streak.lastActiveDate = today;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    }

    const updated = { ...engagement, streak };
    save(updated);

    const milestones = [3, 7, 14, 30, 60, 90];
    for (const m of milestones) {
      if (streak.currentStreak === m) {
        recordMicroWin(`streak_milestone_${m}`);
      }
    }
  }, [engagement, save, recordMicroWin]);

  const useStreakProtection = useCallback((): boolean => {
    const streak = { ...engagement.streak };
    if (streak.protectionTokens <= 0) return false;

    streak.protectionTokens -= 1;
    streak.protectionUsedDates = [...streak.protectionUsedDates, getToday()];
    streak.gracePeriodActive = true;
    const grace = new Date();
    grace.setHours(grace.getHours() + 36);
    streak.gracePeriodExpires = grace.toISOString();

    const updated = { ...engagement, streak };
    save(updated);
    return true;
  }, [engagement, save]);

  const updateGrowthDimensions = useCallback((checkIns: DailyCheckIn[], daysSober: number, journalCount: number, pledgeStreak: number) => {
    const recent = [...checkIns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 14);

    const older = [...checkIns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(14, 28);

    const dims = engagement.growthDimensions.map(d => ({ ...d, previousScore: d.score }));

    const consistencyDim = dims.find(d => d.id === 'consistency');
    if (consistencyDim) {
      const checkInRate = Math.min(recent.length / 14, 1);
      const streakBonus = Math.min(pledgeStreak / 30, 1) * 20;
      consistencyDim.score = Math.round(checkInRate * 80 + streakBonus);
    }

    const emotionalDim = dims.find(d => d.id === 'emotional_awareness');
    if (emotionalDim) {
      const journalScore = Math.min(journalCount / 20, 1) * 40;
      const moodVariety = recent.length > 0 ? new Set(recent.map(c => Math.round(c.mood / 20))).size : 0;
      const awarenessScore = Math.min(moodVariety / 5, 1) * 30;
      const reflectionScore = recent.filter(c => c.reflection && c.reflection.length > 10).length;
      const reflectionPct = Math.min(reflectionScore / 7, 1) * 30;
      emotionalDim.score = Math.round(journalScore + awarenessScore + reflectionPct);
    }

    const resilienceDim = dims.find(d => d.id === 'resilience');
    if (resilienceDim) {
      const soberBonus = Math.min(daysSober / 90, 1) * 40;
      const cravingManagement = recent.length > 0
        ? (100 - (recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length)) * 0.3
        : 0;
      const stressManagement = recent.length > 0
        ? (100 - (recent.reduce((s, c) => s + c.stress, 0) / recent.length)) * 0.3
        : 0;
      resilienceDim.score = Math.round(soberBonus + cravingManagement + stressManagement);
    }

    const selfCareDim = dims.find(d => d.id === 'self_care');
    if (selfCareDim) {
      const sleepScore = recent.length > 0
        ? (recent.reduce((s, c) => s + c.sleepQuality, 0) / recent.length) * 0.5
        : 0;
      const envScore = recent.length > 0
        ? (recent.reduce((s, c) => s + c.environment, 0) / recent.length) * 0.5
        : 0;
      selfCareDim.score = Math.round(sleepScore + envScore);
    }

    const connectionDim = dims.find(d => d.id === 'connection');
    if (connectionDim) {
      const socialWins = engagement.microWins.filter(w => w.category === 'social').length;
      connectionDim.score = Math.round(Math.min(socialWins / 10, 1) * 100);
    }

    const updated = { ...engagement, growthDimensions: dims };
    save(updated);
  }, [engagement, save]);

  const getEncouragementMessage = useCallback((daysSober: number, riskLevel: string): string => {
    const hour = new Date().getHours();

    if (riskLevel === 'high' || riskLevel === 'elevated') {
      const msgs = RISK_BASED_MESSAGES.craving_pattern;
      return msgs[daysSober % msgs.length];
    }

    if (hour < 10) {
      const msgs = RISK_BASED_MESSAGES.morning_high_risk;
      return msgs[daysSober % msgs.length];
    }

    if (hour >= 20) {
      const msgs = RISK_BASED_MESSAGES.evening_reflection;
      return msgs[daysSober % msgs.length];
    }

    return SUPPORTIVE_MESSAGES[daysSober % SUPPORTIVE_MESSAGES.length];
  }, []);

  const getRiskTimingMessage = useCallback((checkIns: DailyCheckIn[]): string | null => {
    if (checkIns.length < 3) return null;

    const recent = [...checkIns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
    const avgStress = recent.reduce((s, c) => s + c.stress, 0) / recent.length;

    if (avgCraving > 60) {
      const msgs = RISK_BASED_MESSAGES.craving_pattern;
      return msgs[Math.floor(Math.random() * msgs.length)];
    }

    if (avgStress > 65) {
      return "Your stress has been elevated. Consider a grounding exercise or reaching out to someone you trust.";
    }

    return null;
  }, []);

  const updateNotificationPrefs = useCallback((prefs: Partial<NotificationPreferences>) => {
    const updated = {
      ...engagement,
      notificationPreferences: { ...engagement.notificationPreferences, ...prefs },
    };
    save(updated);
  }, [engagement, save]);

  const todayMicroWins = useMemo(() => {
    const today = getToday();
    return engagement.microWins.filter(w => w.earnedAt.startsWith(today));
  }, [engagement.microWins]);

  const weeklyWinCount = useMemo(() => {
    const weekStart = getThisWeekStart();
    return engagement.microWins.filter(w => w.earnedAt >= weekStart).length;
  }, [engagement.microWins]);

  const recentWins = useMemo(() => {
    return engagement.microWins.slice(0, 20);
  }, [engagement.microWins]);

  const overallGrowthScore = useMemo(() => {
    if (engagement.growthDimensions.length === 0) return 0;
    const total = engagement.growthDimensions.reduce((s, d) => s + d.score, 0);
    return Math.round(total / engagement.growthDimensions.length);
  }, [engagement.growthDimensions]);

  return useMemo(() => ({
    engagement,
    microWins: engagement.microWins,
    streak: engagement.streak,
    growthDimensions: engagement.growthDimensions,
    notificationPreferences: engagement.notificationPreferences,
    todayMicroWins,
    weeklyWinCount,
    recentWins,
    overallGrowthScore,
    recordMicroWin,
    updateStreak,
    useStreakProtection,
    updateGrowthDimensions,
    getEncouragementMessage,
    getRiskTimingMessage,
    updateNotificationPrefs,
    isLoading: engagementQuery.isLoading,
  }), [
    engagement, todayMicroWins, weeklyWinCount, recentWins,
    overallGrowthScore, recordMicroWin, updateStreak,
    useStreakProtection, updateGrowthDimensions,
    getEncouragementMessage, getRiskTimingMessage,
    updateNotificationPrefs, engagementQuery.isLoading,
  ]);
});
