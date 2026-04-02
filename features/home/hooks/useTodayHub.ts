/**
 * View-model hook for the Today Hub screen.
 * Provides stability, risk, and loading state.
 * Daily guidance is now handled by hooks/useWizardEngine.ts.
 */

import { useMemo } from 'react';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useAppStore } from '@/stores/useAppStore';
import { mergeRecoveryProfiles } from '@/utils/mergeProfile';
import { getLocalDateKey } from '@/utils/checkInDate';
import { calculateStability } from '@/utils/stabilityEngine';
import type { StabilityZoneId } from '@/components/RecoveryStabilityPanel';
import type { StabilityTrend } from '@/utils/stabilityEngine';

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
    whySentence?: string;
    factors?: { label: string; value: number }[];
  };
  showRelapsePlanCta: boolean;
}

function getStabilityZoneId(score: number): StabilityZoneId {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  if (score >= 30) return 'orange';
  return 'red';
}

export function useTodayHub(): TodayHubViewModel {
  const { profile, isLoading } = useUser();
  const { checkIns } = useCheckin();
  const centralProfile = useAppStore((s) => s.userProfile);
  const centralDailyCheckIns = useAppStore((s) => s.dailyCheckIns);
  const {
    riskCategory,
    riskLabel,
    trendLabel: riskTrendLabel,
    riskFactors,
  } = useRiskPrediction();

  const stabilityResult = useMemo(() => {
    const rp =
      mergeRecoveryProfiles(
        centralProfile?.recoveryProfile,
        profile.recoveryProfile,
      ) ??
      profile.recoveryProfile ??
      centralProfile?.recoveryProfile;
    const sourceCheckIns = centralDailyCheckIns.length > 0 ? centralDailyCheckIns : checkIns;
    // Use a "last 7 calendar days" window for trend/momentum:
    //  - group stability scores by date
    //  - average each day’s available time-of-day check-ins
    //  - take the 7 most recent distinct days (skip empty days by construction)
    const stabilityScoresByDate = new Map<string, number[]>();
    for (const c of sourceCheckIns) {
      const score = c.stabilityScore;
      if (typeof score !== 'number' || !Number.isFinite(score)) continue;
      const arr = stabilityScoresByDate.get(c.date) ?? [];
      arr.push(score);
      stabilityScoresByDate.set(c.date, arr);
    }

    // Most-recent day first; each entry is that day's average stability across
    // any time-of-day check-ins (morning/afternoon/evening).
    const previousScores = [...stabilityScoresByDate.keys()]
      .sort((a, b) => b.localeCompare(a)) // YYYY-MM-DD strings: lexical compare is safe
      .slice(0, 7)
      .map((date) => {
        const scores = stabilityScoresByDate.get(date) ?? [];
        if (scores.length === 0) return 0;
        const sum = scores.reduce((s, v) => s + v, 0);
        return sum / scores.length;
      });
    const today = getLocalDateKey();
    const dailyActionsCompleted = sourceCheckIns.filter((c) => c.date === today).length;

    const sleepQuality: 'poor' | 'okay' | 'good' =
      rp?.sleepQuality === 'fair'
        ? 'okay'
        : rp?.sleepQuality === 'excellent'
          ? 'good'
          : rp?.sleepQuality === 'poor'
            ? 'poor'
            : 'good';

    const input = {
      intensity: rp?.struggleLevel ?? 3,
      sleepQuality,
      triggers: rp?.triggers ?? [],
      supportLevel: rp?.supportAvailability ?? 'limited',
      dailyActionsCompleted,
      relapseLogged: (rp?.relapseCount ?? 0) > 0,
    };

    // Displayed "Comprehensive Stability" is a literal average of the last 7 daily
    // stability values (skipping empty days by construction).
    const comprehensiveScore =
      previousScores.length > 0
        ? previousScores.reduce((s, v) => s + v, 0) / previousScores.length
        : 50;

    const stability = calculateStability(input, previousScores);
    return { ...stability, score: comprehensiveScore };
  }, [centralProfile, centralDailyCheckIns, profile.recoveryProfile, checkIns]);

  const riskExplain = useMemo(() => {
    const factors = (riskFactors ?? [])
      .filter((f) => typeof f?.value === 'number' && Number.isFinite(f.value))
      .map((f) => ({ label: f.label, value: Math.max(0, Math.min(100, Math.round(f.value))) }))
      .slice(0, 5);

    const labelToPhrase: Record<string, string> = {
      Behavioral: 'high cravings or stress',
      Emotional: 'low mood or emotional strain',
      Triggers: 'trigger exposure',
      Stability: 'recent stability dips',
      Isolation: 'isolation',
      Sleep: 'sleep disruption',
      Engagement: 'missed check-ins',
    };

    const topPhrases = factors
      .filter((f) => f.value >= 50)
      .slice(0, 2)
      .map((f) => labelToPhrase[f.label] ?? f.label.toLowerCase());

    const whySentence =
      topPhrases.length >= 2
        ? `Likely drivers: ${topPhrases[0]} + ${topPhrases[1]}.`
        : topPhrases.length === 1
          ? `Likely driver: ${topPhrases[0]}.`
          : undefined;

    return { factors, whySentence };
  }, [riskFactors]);

  return useMemo(
    () => ({
      isLoading,
      shouldRedirectToOnboarding: !(
        centralProfile?.hasCompletedOnboarding ?? profile.hasCompletedOnboarding
      ),
      stability: {
        score: stabilityResult.score,
        trend: stabilityResult.trend,
        zoneId: getStabilityZoneId(stabilityResult.score),
      },
      relapseRisk: {
        category: riskCategory,
        label: riskLabel,
        trendLabel: riskTrendLabel || 'Stable',
        whySentence: riskExplain.whySentence,
        factors: riskExplain.factors,
      },
      showRelapsePlanCta: riskCategory === 'high',
    }),
    [
      isLoading,
      centralProfile?.hasCompletedOnboarding,
      profile.hasCompletedOnboarding,
      stabilityResult.score,
      stabilityResult.trend,
      riskCategory,
      riskLabel,
      riskTrendLabel,
      riskExplain.whySentence,
      riskExplain.factors,
    ]
  );
}
