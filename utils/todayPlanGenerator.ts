import type { RecoveryStage, RiskCategory } from '../types';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';

export type TodayPlanActionKind =
  | 'growth'
  | 'coping'
  | 'crisis'
  | 'awareness'
  | 'connection';

export type TodayPlanAction = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  kind: TodayPlanActionKind;
};

export type TodayPlan = {
  priorityActions: TodayPlanAction[];
  optionalActions: TodayPlanAction[];
  riskWarnings: string[];
};

export type TodayPlanInput = {
  stabilityScore: number;
  relapseRisk: RiskCategory;
  recoveryStage: RecoveryStage;
  missedEngagementScore: number; // 0-100, higher = more missed actions
  triggerRiskScore: number; // 0-100, higher = more trigger exposure
  stageProgramDay?: number; // 1-based day in current stage program
  stageProgramDuration?: number; // total days in current stage program
  totalCheckIns?: number; // how many check-ins the user has completed
  // Simple rule-based personalization flags
  highUrge?: boolean;
  nightRisk?: boolean;
  lowMood?: boolean;
};

function addActionIfMissing(
  list: TodayPlanAction[],
  action: TodayPlanAction,
): void {
  if (!list.find(a => a.id === action.id)) {
    list.push(action);
  }
}

function applyStageProgramActions(
  input: TodayPlanInput,
  priorityActions: TodayPlanAction[],
  optionalActions: TodayPlanAction[],
): void {
  const { recoveryStage, stageProgramDay, stageProgramDuration } = input;
  if (!stageProgramDay || !stageProgramDuration || stageProgramDuration <= 0) {
    return;
  }

  const day = Math.min(stageProgramDay, stageProgramDuration);
  const weekIndex = Math.floor((day - 1) / 7); // 0-based

  if (recoveryStage === 'crisis') {
    if (weekIndex >= 0) {
      addActionIfMissing(optionalActions, {
        id: 'crisis-program-support-contact',
        title: 'Safe support touchpoint',
        subtitle: 'Send a brief text or call to one safe person.',
        route: '/emergency',
        kind: 'connection',
      });
    }
  } else if (recoveryStage === 'stabilize') {
    addActionIfMissing(priorityActions, {
      id: 'stabilize-program-checkin',
      title: 'Daily stabilize check-in',
      subtitle: 'Lock in a simple check-in rhythm while things settle.',
      route: '/daily-checkin',
      kind: 'awareness',
    });

    if (weekIndex >= 1) {
      addActionIfMissing(priorityActions, {
        id: 'stabilize-program-trigger-review',
        title: 'Identify today’s triggers',
        subtitle: 'Name one trigger and decide how you’ll handle it.',
        route: '/triggers',
        kind: 'awareness',
      });
    }

    addActionIfMissing(optionalActions, {
      id: 'stabilize-program-sleep-step',
      title: 'One sleep-supporting choice',
      subtitle: 'Choose a small change tonight that gives your brain rest.',
      route: '/daily-checkin',
      kind: 'coping',
    });
  } else if (recoveryStage === 'rebuild') {
    addActionIfMissing(priorityActions, {
      id: 'rebuild-program-routine',
      title: 'Rebuild routine block',
      subtitle: 'Complete one routine block that supports the life you’re building.',
      route: '/rebuild',
      kind: 'growth',
    });

    if (weekIndex >= 1) {
      addActionIfMissing(optionalActions, {
        id: 'rebuild-program-habit',
        title: 'Practice a replacement habit',
        subtitle: 'Swap one old pattern for a healthier habit in a real moment.',
        route: '/rebuild',
        kind: 'growth',
      });
    }
  } else if (recoveryStage === 'maintain') {
    addActionIfMissing(priorityActions, {
      id: 'maintain-program-connection',
      title: 'Protective connection moment',
      subtitle: 'Invest a few minutes in a relationship that protects your recovery.',
      route: '/connection',
      kind: 'connection',
    });

    addActionIfMissing(optionalActions, {
      id: 'maintain-program-scan',
      title: 'Quick wellness check',
      subtitle: 'Glance at stress, sleep, and connection habits you logged—patterns only, not a diagnosis.',
      route: '/recovery-snapshot',
      kind: 'awareness',
    });
  }
}

function getStabilityBand(score: number): 'high' | 'medium' | 'low' {
  if (score > 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function generateTodayPlan(input: TodayPlanInput): TodayPlan {
  const {
    stabilityScore,
    relapseRisk,
    recoveryStage,
    missedEngagementScore,
    triggerRiskScore,
    totalCheckIns = 0,
    highUrge = false,
    nightRisk = false,
    lowMood = false,
  } = input;

  const stabilityBand = getStabilityBand(stabilityScore);
  const isNewUser = totalCheckIns < 2;

  const priorityActions: TodayPlanAction[] = [];
  const optionalActions: TodayPlanAction[] = [];
  const riskWarnings: string[] = [];

  const hasHighRelapseRisk = relapseRisk === 'high' || relapseRisk === 'elevated';
  const hasManyMissedActions = !isNewUser && missedEngagementScore >= 50;
  const hasHighTriggerRisk = triggerRiskScore >= 60;

  // Stability-driven core plan
  if (stabilityBand === 'high') {
    // Growth actions (rebuild, connection)
    priorityActions.push(
      {
        id: 'daily-checkin',
        title: 'Lock in what is working',
        subtitle: 'Capture today\'s stability so you can repeat it.',
        route: '/daily-checkin',
        kind: 'awareness',
      },
      {
        id: 'rebuild-step',
        title: 'One rebuild action',
        subtitle: 'Take one concrete step toward a life-giving goal.',
        route: '/rebuild',
        kind: 'growth',
      },
    );

    optionalActions.push(
      {
        id: 'connection-touchpoint',
        title: 'Connection touchpoint',
        subtitle: arePeerPracticeFeaturesEnabled()
          ? 'Reach out to one safe person or community space.'
          : 'Reach out to one safe person from your trusted circle.',
        route: '/connection',
        kind: 'connection',
      },
      {
        id: 'trigger-review',
        title: 'Light trigger review',
        subtitle: 'Scan for upcoming situations that could pull you off track.',
        route: '/triggers',
        kind: 'awareness',
      },
    );
  } else if (stabilityBand === 'medium') {
    // Coping and awareness actions
    priorityActions.push(
      {
        id: 'grounding-checkin',
        title: 'Grounding check-in',
        subtitle: 'Name how you are, what you need, and one next step.',
        route: '/daily-checkin',
        kind: 'awareness',
      },
      {
        id: 'coping-exercise',
        title: 'Coping exercise',
        subtitle: 'Use a quick grounding or breathing practice.',
        route: '/crisis-mode',
        kind: 'coping',
      },
    );

    optionalActions.push(
      {
        id: 'trigger-planning',
        title: 'Plan around triggers',
        subtitle: 'Adjust one situation or routine to lower friction.',
        route: '/triggers',
        kind: 'awareness',
      },
      {
        id: 'supportive-connection',
        title: 'Supportive connection',
        subtitle: 'Send a short message to someone who gets it.',
        route: '/connection',
        kind: 'connection',
      },
    );
  } else {
    // Crisis support actions
    priorityActions.push(
      {
        id: 'crisis-tools',
        title: 'Open Crisis Mode',
        subtitle: 'Go to safety and grounding tools right now.',
        route: '/crisis-mode',
        kind: 'crisis',
      },
      {
        id: 'reach-out-support',
        title: 'Reach out to support',
        subtitle: 'Text or call one safe person or professional.',
        route: '/emergency',
        kind: 'connection',
      },
    );

    optionalActions.push(
      {
        id: 'relapse-plan',
        title: 'Review Relapse Plan',
        subtitle: 'Remind yourself of warning signs and your safety steps.',
        route: '/relapse-plan',
        kind: 'crisis',
      },
      {
        id: 'brief-journal',
        title: 'Two-minute journal',
        subtitle: 'Get the swirl out of your head and into words.',
        route: '/new-journal',
        kind: 'coping',
      },
    );
  }

  // Recovery stage adjustments
  if (recoveryStage === 'rebuild' || recoveryStage === 'maintain') {
    // Emphasize growth when more stable
    if (stabilityBand === 'high' && !priorityActions.find(a => a.id === 'rebuild-step')) {
      priorityActions.push({
        id: 'rebuild-step',
        title: 'One rebuild step',
        subtitle: 'Invest today in the life you are building.',
        route: '/rebuild',
        kind: 'growth',
      });
    }
  }

  // Missed actions (engagement) adjustments
  if (hasManyMissedActions) {
    if (!priorityActions.find(a => a.id === 'daily-checkin' || a.id === 'grounding-checkin')) {
      priorityActions.unshift({
        id: 'daily-checkin',
        title: 'Quick reset check-in',
        subtitle: 'A 20-second check-in is enough to get back in rhythm.',
        route: '/daily-checkin',
        kind: 'awareness',
      });
    }
    const missedDays = Math.round((missedEngagementScore / 100) * 7);
    if (missedDays >= 5) {
      riskWarnings.push(
        "It's been a while since your last check-in. A quick one today helps you reconnect with your progress.",
      );
    } else {
      riskWarnings.push(
        'You have a few missed check-ins. Short, consistent actions matter more than perfection.',
      );
    }
  }

  // Trigger activity adjustments
  if (hasHighTriggerRisk) {
    if (!priorityActions.find(a => a.id === 'trigger-planning')) {
      priorityActions.push({
        id: 'trigger-planning',
        title: 'Trigger planning',
        subtitle: 'Choose one tough situation and jot a gentler plan you can try.',
        route: '/triggers',
        kind: 'awareness',
      });
    }
    riskWarnings.push(
      'Your recent environment and cravings look intense in your logs. Planning around one situation today can make the day feel more manageable.',
    );
  }

  // Support nudges from logged patterns (wellness/self-help only)
  if (hasHighRelapseRisk) {
    riskWarnings.push(
      'Your check-ins look like a heavy stretch. Today is a good day to lean on support people and crisis tools a little earlier.',
    );
  }

  // Personalization-driven adjustments
  if (highUrge) {
    const existingIndex = priorityActions.findIndex((a) => a.id === 'crisis-tools');
    let crisisAction: TodayPlanAction;
    if (existingIndex >= 0) {
      crisisAction = priorityActions.splice(existingIndex, 1)[0];
    } else {
      crisisAction = {
        id: 'crisis-tools',
        title: 'Use crisis tools now',
        subtitle: 'Your urges are high - jump straight into grounding and safety tools.',
        route: '/crisis-mode',
        kind: 'crisis',
      };
    }
    priorityActions.unshift(crisisAction);

    riskWarnings.push(
      'Your urge level looks elevated in what you logged. Grounding tools and reaching out sooner can help you ride the wave.',
    );
  }

  if (nightRisk) {
    const hasRelapsePlanAction =
      priorityActions.find((a) => a.id === 'relapse-plan') ||
      optionalActions.find((a) => a.id === 'relapse-plan');
    if (!hasRelapsePlanAction) {
      optionalActions.unshift({
        id: 'relapse-plan',
        title: 'Review your Relapse Plan',
        subtitle: 'Evenings have been higher-risk. Refresh your warning signs and safety steps.',
        route: '/relapse-plan',
        kind: 'crisis',
      });
    }
    riskWarnings.push(
      'Evenings have been a higher-risk window recently. Reviewing your relapse plan before you get tired can lower that risk.',
    );
  }

  if (lowMood) {
    const hasCoping =
      priorityActions.find((a) => a.id === 'coping-exercise') ||
      optionalActions.find((a) => a.id === 'coping-exercise');
    if (!hasCoping) {
      optionalActions.unshift({
        id: 'coping-exercise',
        title: 'One small grounding step',
        subtitle: 'Low mood calls for tiny, kind actions - start with one quick exercise.',
        route: '/crisis-mode',
        kind: 'coping',
      });
    }
  }

  // Fallback to always have at least one priority action
  if (priorityActions.length === 0) {
    priorityActions.push({
      id: 'daily-checkin',
      title: 'Start with a check-in',
      subtitle: 'A quick reflection anchors the rest of your day.',
      route: '/daily-checkin',
      kind: 'awareness',
    });
  }

  applyStageProgramActions(input, priorityActions, optionalActions);

  // Daily pledge is always the second action under Today's Plan
  const dailyPledgeAction: TodayPlanAction = {
    id: 'daily-pledge',
    title: "Daily Pledge",
    subtitle: "Commit to today and track your intention.",
    route: '/pledges',
    kind: 'awareness',
  };
  const existingPledgeIndex = priorityActions.findIndex((a) => a.id === 'daily-pledge');
  if (existingPledgeIndex >= 0) priorityActions.splice(existingPledgeIndex, 1);
  priorityActions.splice(1, 0, dailyPledgeAction);

  return {
    priorityActions,
    optionalActions,
    riskWarnings,
  };
}

