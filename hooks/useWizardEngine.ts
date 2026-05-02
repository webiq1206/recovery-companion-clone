/**
 * Hook that assembles all data sources and feeds them into the wizard engine.
 * Returns a reactive WizardPlan that updates automatically when underlying
 * stores change (check-in completed, pledge taken, etc.).
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUser } from '../core/domains/useUser';
import { useCheckin } from '../core/domains/useCheckin';
import { useRebuild } from '../core/domains/useRebuild';
import { useSupportContacts } from '../core/domains/useSupportContacts';
import { useAccountability } from '../core/domains/useAccountability';
import { useJournal } from '../core/domains/useJournal';
import { useRelapse } from '../core/domains/useRelapse';
import { useAppMeta } from '../core/domains/useAppMeta';
import { useAppStore } from '../stores/useAppStore';
import { useCheckInsStore } from '../stores/useCheckInsStore';
import { usePledgesStore } from '../features/pledges/state/usePledgesStore';
import { useRiskPrediction } from '../providers/RiskPredictionProvider';
import { useStageDetection } from '../providers/StageDetectionProvider';
import { useConnection } from '../providers/ConnectionProvider';
import { useSubscription } from '../providers/SubscriptionProvider';
import { useEngagement } from '../providers/EngagementProvider';
import { usePersonalization } from '../features/home/hooks/usePersonalization';
import {
  useWizardBehaviorStore,
  useHydrateWizardBehaviorStore,
} from '../stores/useWizardBehaviorStore';
import {
  useHydrateToolUsageStore,
  useToolUsageStore,
} from '../features/tools/state/useToolUsageStore';
import type { ToolId } from '../features/tools/types';
import {
  generateWizardPlan,
  type WizardPlan,
  type WizardAction,
  type WizardEngineInput,
} from '../utils/wizardEngine';
import type { DailyCheckIn, UserProfile } from '../types';
import {
  mergeRecoveryProfiles,
  mergeTodayCheckInsFromSources,
} from '../utils/mergeProfile';
import { getIdentityProgramEffectiveWeek } from '../features/rebuild/utils/identityProgramWeek';
import { mergeTrustedAndEmergencyContacts } from '../utils/mergeEmergencyContacts';
import { getGuidanceDateKey } from '../utils/checkInDate';

const EMPTY_PLAN: WizardPlan = {
  setupProgress: null,
  dailyGuidance: {
    primaryAction: null,
    actions: [],
    riskWarnings: [],
    encouragement: null,
    contextHint: null,
    isComplete: false,
    completionMessage: null,
    isReentryMode: false,
  },
};

export interface RecentCompletion {
  actionTitle: string;
  timestamp: number;
}

export interface WizardEngineResult {
  plan: WizardPlan;
  recentCompletion: RecentCompletion | null;
  clearRecentCompletion: () => void;
}

/**
 * Plain `YYYY-MM-DD` keys compare as-is. ISO instants map through `getGuidanceDateKey` (local, 5am
 * boundary) so they match the home “today” key — not UTC `split('T')[0]` (tool usage, rebuild, etc.).
 */
function getDateKey(dateValue: string | undefined | null): string {
  if (!dateValue) return '';
  if (dateValue.includes('T')) {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return getGuidanceDateKey(d);
  }
  return dateValue;
}

export function useWizardEngineHook(): WizardEngineResult {
  useHydrateWizardBehaviorStore();
  useHydrateToolUsageStore();

  const userHook = useUser();
  const profile = userHook?.profile;
  const daysSober = userHook?.daysSober ?? 0;

  const checkinHook = useCheckin();
  const currentCheckInPeriod = checkinHook?.currentCheckInPeriod;

  const rebuildHook = useRebuild();
  const rebuildData = rebuildHook?.rebuildData;

  const contactsHook = useSupportContacts();
  const emergencyContacts = contactsHook?.emergencyContacts ?? [];

  const { peerChats, safeRooms, sponsorPairing, trustedContacts } = useConnection();
  const { isPremium } = useSubscription();

  const emergencyContactsCombined = useMemo(
    () => mergeTrustedAndEmergencyContacts(trustedContacts ?? [], emergencyContacts ?? []),
    [emergencyContacts, trustedContacts],
  );

  const accountabilityHook = useAccountability();
  const accountabilityData = accountabilityHook?.accountabilityData;

  const journalHook = useJournal();
  const journal = journalHook?.journal ?? [];

  const relapseHook = useRelapse();
  const hasRelapsePlan = !!relapseHook?.relapsePlan;

  const toolUsageEvents = useToolUsageStore.use.events();

  const appMetaHook = useAppMeta();
  const stabilityScore = appMetaHook?.stabilityScore ?? 50;

  const centralProfile = useAppStore((s) => s.userProfile);
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);

  const stageHook = useStageDetection();
  const currentStage = stageHook?.currentStage;
  const currentProgram = stageHook?.currentProgram;

  const riskHook = useRiskPrediction();
  const riskCategory = riskHook?.riskCategory ?? 'low' as const;
  const missedEngagement = riskHook?.missedEngagement ?? 0;
  const currentPrediction = riskHook?.currentPrediction;
  const trendLabel = riskHook?.trendLabel ?? '';

  const engagementHook = useEngagement();
  const streak = engagementHook?.streak;

  const personalization = usePersonalization();

  const behaviorState = useWizardBehaviorStore(
    useShallow((s) => ({
      actionHistory: s.actionHistory,
      periodEngagement: s.periodEngagement,
      consecutiveLowStabilityDays: s.consecutiveLowStabilityDays,
      consecutiveHighStabilityDays: s.consecutiveHighStabilityDays,
      lastSessionDate: s.lastSessionDate,
      lastStabilityUpdateDate: s.lastStabilityUpdateDate,
    })),
  );

  const getDaysSinceLastSession =
    useWizardBehaviorStore.use.getDaysSinceLastSession();
  const recordSessionStart = useWizardBehaviorStore.use.recordSessionStart();
  const recordActionSurfaced =
    useWizardBehaviorStore.use.recordActionSurfaced();
  const recordActionCompleted =
    useWizardBehaviorStore.use.recordActionCompleted();
  const updateStabilityStreak =
    useWizardBehaviorStore.use.updateStabilityStreak();

  const [recentCompletion, setRecentCompletion] =
    useState<RecentCompletion | null>(null);

  const [checkInWindowNow, setCheckInWindowNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setCheckInWindowNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const guidanceDateKey = useMemo(
    () => getGuidanceDateKey(checkInWindowNow),
    [checkInWindowNow],
  );

  const checkInsSlice = useCheckInsStore.use.checkIns();
  const pledgesList = usePledgesStore.use.pledges();
  const toolUsageHydrated = useToolUsageStore.use.hasHydrated();
  const checkInsHydrated = useCheckInsStore.use.hasHydrated();
  const pledgesHydrated = usePledgesStore.use.hasHydrated();
  /** Avoid false "X done" toasts when persisted state loads after the first plan snapshot. */
  const guidanceCompletionInputsReady =
    toolUsageHydrated && checkInsHydrated && pledgesHydrated;

  const clearRecentCompletion = useCallback(
    () => setRecentCompletion(null),
    [],
  );

  const currentPeriod = currentCheckInPeriod ?? (() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning' as const;
    if (h < 17) return 'afternoon' as const;
    return 'evening' as const;
  })();

  // Record session start on mount
  const didRecordSession = useRef(false);
  useEffect(() => {
    if (!didRecordSession.current) {
      didRecordSession.current = true;
      recordSessionStart(currentPeriod);
      updateStabilityStreak(stabilityScore);
    }
  }, [recordSessionStart, currentPeriod, updateStabilityStreak, stabilityScore]);

  const hasJournalEntryToday = useMemo(() => {
    return (journal ?? []).some((e) => getDateKey(e.date) === guidanceDateKey);
  }, [journal, guidanceDateKey]);

  const daysSinceLastSession = useMemo(
    () => getDaysSinceLastSession(),
    [getDaysSinceLastSession, behaviorState.lastSessionDate],
  );

  const rebuildHabitsCompletedToday = useMemo(
    () =>
      (rebuildData?.habits ?? []).filter((h) => getDateKey(h.lastCompleted) === guidanceDateKey)
        .length,
    [rebuildData?.habits, guidanceDateKey],
  );

  const rebuildRoutinesCompletedToday = useMemo(
    () =>
      (rebuildData?.routines ?? []).filter((r) => getDateKey(r.completedAt) === guidanceDateKey)
        .length,
    [rebuildData?.routines, guidanceDateKey],
  );

  const hasCrisisToolCompletedToday = useMemo(() => {
    const crisisToolIds: ToolId[] = [
      'breathing',
      'grounding',
      'urge-timer',
      'connect',
    ];

    // Crisis Mode embedded steps only reliably log `opened` as the user progresses.
    // We treat "opened any crisis step" as "crisis tools engagement completed".
    return toolUsageEvents.some((e) => {
      if (!crisisToolIds.includes(e.toolId)) return false;
      if (getDateKey(e.timestamp) !== guidanceDateKey) return false;
      return (e.context === 'crisis' && e.action === 'opened') || (e.action === 'completed' && e.toolId !== 'journal-prompt');
    });
  }, [toolUsageEvents, guidanceDateKey]);

  const hasCopingToolCompletedToday = useMemo(() => {
    const copingToolIds: ToolId[] = ['breathing', 'urge-timer'];
    return toolUsageEvents.some((e) => {
      if (!copingToolIds.includes(e.toolId)) return false;
      if (getDateKey(e.timestamp) !== guidanceDateKey) return false;
      // Embedded crisis steps emit `opened` with `context: 'crisis'`.
      // Tools screens emit `completed` when the user finishes.
      return e.action === 'completed' || (e.context === 'crisis' && e.action === 'opened');
    });
  }, [toolUsageEvents, guidanceDateKey]);

  const hasConnectionTouchpointCompletedToday = useMemo(() => {
    const isOwnMessageToday = (timestamp: string, isOwn: boolean) =>
      isOwn && getDateKey(timestamp) === guidanceDateKey;

    const viaConnectTool = toolUsageEvents.some((e) => {
      return (
        e.toolId === 'connect' &&
        e.action === 'completed' &&
        getDateKey(e.timestamp) === guidanceDateKey
      );
    });
    if (viaConnectTool) return true;

    const sentInPeers = peerChats.some((c) =>
      (c.messages ?? []).some((m) => isOwnMessageToday(m.timestamp, m.isOwn)),
    );
    if (sentInPeers) return true;

    const sentInRooms = safeRooms.some((r) =>
      (r.messages ?? []).some((m) => isOwnMessageToday(m.timestamp, m.isOwn)),
    );
    if (sentInRooms) return true;

    const sentInSponsor = (sponsorPairing?.messages ?? []).some((m) =>
      isOwnMessageToday(m.timestamp, m.isOwn),
    );

    return sentInSponsor;
  }, [peerChats, safeRooms, sponsorPairing, guidanceDateKey, toolUsageEvents]);

  /** True only when every active commitment has at least one check-in dated for the guidance day. */
  const hasAccountabilityCheckInCompletedToday = useMemo(() => {
    const activeContracts = (accountabilityData?.contracts ?? []).filter(
      (c) => (c as { isActive?: boolean }).isActive !== false,
    );
    if (activeContracts.length === 0) return false;
    return activeContracts.every((c) =>
      (c.checkIns ?? []).some((ci) => getDateKey(ci.date) === guidanceDateKey),
    );
  }, [accountabilityData, guidanceDateKey]);

  const stabilityTrend: 'rising' | 'declining' | 'stable' = useMemo(() => {
    const raw = trendLabel?.toLowerCase() ?? '';
    if (raw.includes('rising') || raw.includes('improving')) return 'rising';
    if (raw.includes('declining') || raw.includes('falling')) return 'declining';
    return 'stable';
  }, [trendLabel]);

  /** Prefer persisted app-store profile so setup progress matches after AsyncStorage hydrate. */
  const mergedProfile = useMemo((): UserProfile | Record<string, never> => {
    if (!profile && !centralProfile) return {} as Record<string, never>;
    if (!centralProfile) return profile as UserProfile;
    if (!profile) return centralProfile;
    const mergedRp = mergeRecoveryProfiles(
      centralProfile.recoveryProfile,
      profile.recoveryProfile,
    );
    return {
      ...profile,
      ...centralProfile,
      hasCompletedOnboarding:
        centralProfile.hasCompletedOnboarding ?? profile.hasCompletedOnboarding,
      recoveryProfile:
        mergedRp ?? profile.recoveryProfile ?? centralProfile.recoveryProfile,
    };
  }, [profile, centralProfile]);

  const safeProfile = mergedProfile as UserProfile & Record<string, unknown>;

  const sliceGuidanceDayCheckIns = useMemo(
    () => checkInsSlice.filter((c) => c.date === guidanceDateKey),
    [checkInsSlice, guidanceDateKey],
  );

  const guidanceDayPledge = useMemo(
    () => pledgesList.find((p) => p.date === guidanceDateKey) ?? null,
    [pledgesList, guidanceDateKey],
  );

  /** Merge check-ins for the guidance day from slice + central store (per-period field merge). */
  const mergedTodayCheckIns = useMemo((): DailyCheckIn[] => {
    return mergeTodayCheckInsFromSources(
      sliceGuidanceDayCheckIns,
      centralDailyCheckIns,
      guidanceDateKey,
    );
  }, [sliceGuidanceDayCheckIns, centralDailyCheckIns, guidanceDateKey]);

  const input: WizardEngineInput = useMemo(
    () => ({
      hasCompletedOnboarding: !!safeProfile.hasCompletedOnboarding,
      profile: safeProfile as UserProfile,
      daysSober,
      hasEmergencyContacts: emergencyContactsCombined.length > 0,
      hasRebuildConfigured:
        (rebuildData?.habits?.length ?? 0) > 0 ||
        (rebuildData?.routines?.length ?? 0) > 0 ||
        (rebuildData?.goals?.length ?? 0) > 0,
      hasAccountabilityConfigured:
        (accountabilityData?.partners?.length ?? 0) > 0 ||
        (accountabilityData?.contracts?.length ?? 0) > 0,
      hasTriggers: (safeProfile.recoveryProfile?.triggers?.length ?? 0) > 0,
      emergencyContacts: emergencyContactsCombined,
      accountabilityData: accountabilityData ?? null,
      todayCheckIns: mergedTodayCheckIns,
      currentPeriod,
      checkInWindowNow,
      guidanceDateKey,
      stabilityScore: stabilityScore ?? 50,
      stabilityTrend,
      relapseRisk: riskCategory ?? 'low',
      missedEngagementScore: missedEngagement ?? 0,
      triggerRiskScore: currentPrediction?.triggerRisk ?? 0,
      recoveryStage: currentStage ?? safeProfile.recoveryProfile?.recoveryStage ?? 'crisis',
      stageProgramDay: currentProgram?.day,
      stageProgramDuration: currentProgram?.duration,
      todayPledge: guidanceDayPledge,
      hasJournalEntryToday,
      rebuildGoalsCount: rebuildData?.goals?.length ?? 0,
      rebuildHabitsCompletedToday,
      rebuildRoutinesCompletedToday,
      hasCrisisToolCompletedToday,
      hasCopingToolCompletedToday,
      hasConnectionTouchpointCompletedToday,
      hasAccountabilityCheckInCompletedToday,
      hasRelapsePlan,
      identityCurrentWeek: getIdentityProgramEffectiveWeek(rebuildData?.identityProgram),
      highUrge: personalization?.highUrgeCrisisHint?.shouldHighlightCrisisTools ?? false,
      nightRisk: personalization?.nightRiskWarning?.shouldWarn ?? false,
      lowMood: personalization?.lowMoodSuggestions?.shouldSuggest ?? false,
      streakLength: streak?.currentStreak ?? 0,
      behaviorHistory: behaviorState,
      daysSinceLastSession,
      hasPremiumSubscription: isPremium,
      trustedCircleContactCount: trustedContacts?.length ?? 0,
    }),
    [
      safeProfile,
      daysSober,
      emergencyContactsCombined,
      trustedContacts?.length,
      isPremium,
      rebuildData,
      accountabilityData,
      mergedTodayCheckIns,
      currentPeriod,
      checkInWindowNow,
      guidanceDateKey,
      stabilityScore,
      stabilityTrend,
      riskCategory,
      missedEngagement,
      currentPrediction?.triggerRisk,
      currentStage,
      currentProgram?.day,
      currentProgram?.duration,
      guidanceDayPledge,
      hasJournalEntryToday,
      rebuildHabitsCompletedToday,
      rebuildRoutinesCompletedToday,
      personalization,
      streak?.currentStreak,
      behaviorState,
      daysSinceLastSession,
      hasCrisisToolCompletedToday,
      hasCopingToolCompletedToday,
      hasConnectionTouchpointCompletedToday,
      hasAccountabilityCheckInCompletedToday,
      hasRelapsePlan,
    ],
  );

  const plan = useMemo(() => {
    try {
      return generateWizardPlan(input);
    } catch (err) {
      console.error('[WizardEngine] generateWizardPlan threw:', err);
      return EMPTY_PLAN;
    }
  }, [input]);

  // Record surfaced actions
  const surfacedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const action of plan.dailyGuidance.actions) {
      if (!action.completed && !surfacedRef.current.has(action.id)) {
        surfacedRef.current.add(action.id);
        recordActionSurfaced(action.id);
      }
    }
  }, [plan.dailyGuidance.actions, recordActionSurfaced]);

  // Detect completions for feedback toast and behavioral tracking
  const prevActionsRef = useRef<Map<string, boolean>>(new Map());
  const completionBaselineDateKeyRef = useRef<string | null>(null);
  const completionBaselineReadyRef = useRef(false);
  useEffect(() => {
    if (completionBaselineDateKeyRef.current !== guidanceDateKey) {
      completionBaselineDateKeyRef.current = guidanceDateKey;
      completionBaselineReadyRef.current = false;
    }

    if (!guidanceCompletionInputsReady) {
      return;
    }

    if (!completionBaselineReadyRef.current) {
      const seeded = new Map<string, boolean>();
      for (const action of plan.dailyGuidance.actions) {
        seeded.set(action.id, action.completed);
      }
      prevActionsRef.current = seeded;
      completionBaselineReadyRef.current = true;
      return;
    }

    const prev = prevActionsRef.current;
    for (const action of plan.dailyGuidance.actions) {
      const wasPreviouslyIncomplete = prev.has(action.id) && !prev.get(action.id);
      if (action.completed && wasPreviouslyIncomplete) {
        recordActionCompleted(action.id);
        setRecentCompletion({
          actionTitle: action.title,
          timestamp: Date.now(),
        });
      }
    }
    const next = new Map<string, boolean>();
    for (const action of plan.dailyGuidance.actions) {
      next.set(action.id, action.completed);
    }
    prevActionsRef.current = next;
  }, [
    plan.dailyGuidance.actions,
    recordActionCompleted,
    guidanceCompletionInputsReady,
    guidanceDateKey,
  ]);

  return { plan, recentCompletion, clearRecentCompletion };
}
