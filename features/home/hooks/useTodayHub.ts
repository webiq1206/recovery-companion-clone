/**
 * View-model hook for the Today Hub screen.
 * Encapsulates stability, risk, today plan, and primary action derivation.
 */

import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { useRecovery } from '@/providers/RecoveryProvider';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { useStageDetection } from '@/providers/StageDetectionProvider';
import { calculateStability } from '@/utils/stabilityEngine';
import {
  generateTodayPlan,
  type TodayPlan,
  type TodayPlanAction,
} from '@/utils/todayPlanGenerator';
import type { StabilityZoneId } from '@/components/RecoveryStabilityPanel';
import type { StabilityTrend } from '@/utils/stabilityEngine';
import {
  Sun,
  AlertTriangle,
  Users,
  PhoneCall,
  Brain,
  BookOpenCheck,
  HandHeart,
} from 'lucide-react-native';

type IconComponent = ComponentType<{ size?: number; color?: string }>;

export type UiTodayPlanAction = TodayPlanAction & {
  icon: IconComponent;
};

export type UiTodayPlan = TodayPlan & {
  priorityActions: UiTodayPlanAction[];
  optionalActions: UiTodayPlanAction[];
};

const ACTION_ICON_MAP: Record<string, IconComponent> = {
  'daily-checkin': Sun,
  'daily-pledge': HandHeart,
  'grounding-checkin': Sun,
  'rebuild-step': BookOpenCheck,
  'connection-touchpoint': Users,
  'supportive-connection': Users,
  'trigger-review': AlertTriangle,
  'trigger-planning': AlertTriangle,
  'coping-exercise': Brain,
  'brief-journal': Brain,
  'crisis-tools': AlertTriangle,
  'reach-out-support': PhoneCall,
  'relapse-plan': BookOpenCheck,
};

function attachIcons(plan: TodayPlan): UiTodayPlan {
  const mapAction = (action: TodayPlanAction): UiTodayPlanAction => ({
    ...action,
    icon: ACTION_ICON_MAP[action.id] ?? Sun,
  });
  return {
    ...plan,
    priorityActions: plan.priorityActions.map(mapAction),
    optionalActions: plan.optionalActions.map(mapAction),
  };
}

export interface TodayHubViewModel {
  isLoading: boolean;
  shouldRedirectToOnboarding: boolean;
  stability: {
    score: number;
    trend: StabilityTrend;
    zoneId: StabilityZoneId;
  };
  relapseRisk: {
    category: 'low' | 'guarded' | 'elevated' | 'high';
    label: string;
    trendLabel: string;
  };
  todayPlan: UiTodayPlan;
  primaryAction: UiTodayPlanAction | null;
  showRelapsePlanCta: boolean;
}

function getStabilityZoneId(score: number): StabilityZoneId {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  if (score >= 30) return 'orange';
  return 'red';
}

export function useTodayHub(): TodayHubViewModel {
  const { profile, isLoading, checkIns } = useRecovery();
  const { currentStage, currentProgram } = useStageDetection();
  const {
    riskCategory,
    riskLabel,
    trendLabel: riskTrendLabel,
    missedEngagement,
    currentPrediction,
  } = useRiskPrediction();

  const stabilityResult = useMemo(() => {
    const rp = profile.recoveryProfile;
    const sorted = [...checkIns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const previousScores = sorted.slice(0, 7).map((c) => c.stabilityScore);
    const today = new Date().toISOString().split('T')[0];
    const dailyActionsCompleted = checkIns.filter((c) => c.date === today).length;

    const sleepQuality: 'poor' | 'okay' | 'good' =
      rp.sleepQuality === 'fair'
        ? 'okay'
        : rp.sleepQuality === 'excellent'
          ? 'good'
          : rp.sleepQuality === 'poor'
            ? 'poor'
            : 'good';

    const input = {
      intensity: rp.struggleLevel,
      sleepQuality,
      triggers: rp.triggers ?? [],
      supportLevel: rp.supportAvailability,
      dailyActionsCompleted,
      relapseLogged: (rp.relapseCount ?? 0) > 0,
    };

    return calculateStability(input, previousScores);
  }, [profile.recoveryProfile, checkIns]);

  const todayPlanDomain = useMemo(
    () =>
      generateTodayPlan({
        stabilityScore: stabilityResult.score,
        relapseRisk: riskCategory,
        recoveryStage: currentStage ?? profile.recoveryProfile.recoveryStage,
        missedEngagementScore: missedEngagement,
        triggerRiskScore: currentPrediction?.triggerRisk ?? 0,
        stageProgramDay: currentProgram?.day,
        stageProgramDuration: currentProgram?.duration,
      }),
    [
      stabilityResult.score,
      riskCategory,
      currentStage,
      profile.recoveryProfile.recoveryStage,
      missedEngagement,
      currentPrediction?.triggerRisk,
      currentProgram?.day,
      currentProgram?.duration,
    ]
  );

  const todayPlan = useMemo(() => attachIcons(todayPlanDomain), [todayPlanDomain]);

  const primaryAction =
    todayPlan.priorityActions[0] ?? todayPlan.optionalActions[0] ?? null;

  return useMemo(
    () => ({
      isLoading,
      shouldRedirectToOnboarding: !profile.hasCompletedOnboarding,
      stability: {
        score: stabilityResult.score,
        trend: stabilityResult.trend,
        zoneId: getStabilityZoneId(stabilityResult.score),
      },
      relapseRisk: {
        category: riskCategory,
        label: riskLabel,
        trendLabel: riskTrendLabel || 'Stable',
      },
      todayPlan,
      primaryAction,
      showRelapsePlanCta: riskCategory === 'high',
    }),
    [
      isLoading,
      profile.hasCompletedOnboarding,
      stabilityResult.score,
      stabilityResult.trend,
      riskCategory,
      riskLabel,
      riskTrendLabel,
      todayPlan,
      primaryAction,
    ]
  );
}
