/**
 * Unified Wizard Engine
 *
 * Single source of truth for all daily guidance. Consolidates:
 * - todayPlanGenerator.ts (stability-band driven, stage-aware)
 * - wizardSteps.ts daily guidance (getDailyGuidanceActions)
 * - wizard.tsx inline onboarding + daily task logic
 *
 * Outputs a WizardPlan consumed by the Today Hub.
 */

import type { RecoveryStage, RiskCategory, DailyCheckIn, Pledge, CheckInTimeOfDay } from '../types';
import {
  getCheckInAvailabilityWindow,
  getCheckInWindowHint,
  isCheckInPeriodInWindow,
} from './checkInWindows';
import type { WizardBehaviorState, ActionHistoryEntry } from '../stores/useWizardBehaviorStore';
import { getCompletedOnboardingSteps, ONBOARDING_STEP_IDS } from './wizardSteps';
import type { UserProfile, EmergencyContact, AccountabilityData } from '../types';
import { getRecoveryStage as getCompanionStage } from '../constants/companion';

// ── Types ────────────────────────────────────────────────────────────────

export type WizardActionKind = 'crisis' | 'coping' | 'awareness' | 'growth' | 'connection';

export interface WizardAction {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  kind: WizardActionKind;
  completed: boolean;
  priority: number;
  /** Route params (e.g. daily check-in period). */
  params?: { period?: CheckInTimeOfDay };
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  route: string;
  ctaLabel: string;
}

export interface WizardPlan {
  setupProgress: {
    completedSteps: number;
    totalSteps: number;
    nextStep: SetupStep | null;
    remainingSteps: SetupStep[];
  } | null;

  dailyGuidance: {
    primaryAction: WizardAction | null;
    actions: WizardAction[];
    riskWarnings: string[];
    encouragement: string | null;
    contextHint: string | null;
    isComplete: boolean;
    completionMessage: string | null;
    isReentryMode: boolean;
  };
}

export interface WizardEngineInput {
  hasCompletedOnboarding: boolean;
  profile: UserProfile;
  daysSober: number;

  hasEmergencyContacts: boolean;
  hasRebuildConfigured: boolean;
  hasAccountabilityConfigured: boolean;
  hasTriggers: boolean;
  hasCrisisToolCompletedToday: boolean;
  hasCopingToolCompletedToday: boolean;
  hasConnectionTouchpointCompletedToday: boolean;
  hasAccountabilityCheckInCompletedToday: boolean;
  hasRelapsePlan: boolean;
  emergencyContacts: EmergencyContact[];
  accountabilityData: AccountabilityData | null;

  todayCheckIns: DailyCheckIn[];
  currentPeriod: CheckInTimeOfDay;
  /** Wall clock for check-in window logic; should tick periodically in the hook. */
  checkInWindowNow: Date;
  /** Date key (YYYY-MM-DD local) for guidance completions and daily cap seeding; use 5:00 AM rollover (see `getGuidanceDateKey`). */
  guidanceDateKey: string;

  stabilityScore: number;
  stabilityTrend: 'rising' | 'declining' | 'stable';
  relapseRisk: RiskCategory;
  missedEngagementScore: number;
  triggerRiskScore: number;

  recoveryStage: RecoveryStage;
  stageProgramDay?: number;
  stageProgramDuration?: number;

  todayPledge: Pledge | null;
  hasJournalEntryToday: boolean;
  rebuildGoalsCount: number;
  rebuildHabitsCompletedToday: number;
  rebuildRoutinesCompletedToday: number;
  identityCurrentWeek: number;

  highUrge: boolean;
  nightRisk: boolean;
  lowMood: boolean;

  streakLength: number;
  milestoneProximity?: { label: string; daysAway: number };

  behaviorHistory: WizardBehaviorState;
  daysSinceLastSession: number;

  /** Paid premium (not freemium). Used to gate growth actions like One Rebuild Step. */
  hasPremiumSubscription: boolean;
  /** Count of Connection tab trusted-circle contacts (not legacy emergency-only). */
  trustedCircleContactCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'core-profile',
    title: 'Set up your profile',
    description: 'Share your name, addiction focus, and goals so your plan can adapt around you.',
    route: '/onboarding',
    ctaLabel: 'Begin setup',
  },
  {
    id: 'protection-profile',
    title: 'Review your protection profile',
    description: 'See how triggers, sleep, and support create your protection score.',
    route: '/protection-profile',
    ctaLabel: 'Open profile',
  },
  {
    id: 'emergency-contacts',
    title: 'Add trusted circle contacts',
    description:
      'Add 1-3 trusted people so you can reach them quickly from Connection and during Crisis Mode.',
    route: '/connection',
    ctaLabel: 'Add contacts',
  },
  {
    id: 'rebuild-plan',
    title: 'Set one rebuild action',
    description: 'Create a replacement habit, routine, or goal to start building forward.',
    route: '/rebuild',
    ctaLabel: 'Set plan',
  },
  {
    id: 'accountability',
    title: 'Add accountability',
    description: 'Connect a partner or create a commitment so you are not walking alone.',
    route: '/accountability',
    ctaLabel: 'Add accountability',
  },
];

export const REENTRY_MESSAGES = [
  "You're here. That's the hardest part. Let's start with just one thing.",
  "No matter how long the gap, coming back is always the right move.",
  "Recovery isn't a straight line. You showed up today, and that counts.",
  "You came back. That matters more than you know.",
  "Today is a fresh start. Nothing else matters right now.",
];

export const REENTRY_MESSAGES_LONG_GAP = [
  "It's been a few days, and you're still here. That takes real strength.",
  "However long it's been, this moment is what counts. Welcome back.",
  "You didn't give up. That's everything. Let's take it one step at a time.",
];

const COMPLETION_MESSAGES: Record<string, string[]> = {
  'day1-7': [
    "You showed up and did the work today. That takes real courage.",
    "Every single day you do this, you're building something new.",
    "Today mattered. You made it count.",
  ],
  'day8-30': [
    "Another day of building your foundation. You're stronger than yesterday.",
    "Your consistency is creating momentum. Keep going.",
    "You're proving to yourself that change is real.",
  ],
  'day31-90': [
    "You're creating a pattern that's hard to break -- in the best way.",
    "This is who you're becoming. Today is proof of that.",
    "Months of showing up. That's not luck -- that's you.",
  ],
  'day90+': [
    "Consistency is your superpower. You've earned today's rest.",
    "You've built something remarkable. Take a moment to see that.",
    "The life you're living today is the one you fought for.",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCompletionMessage(daysSober: number): string {
  if (daysSober <= 7) return pickRandom(COMPLETION_MESSAGES['day1-7']);
  if (daysSober <= 30) return pickRandom(COMPLETION_MESSAGES['day8-30']);
  if (daysSober <= 90) return pickRandom(COMPLETION_MESSAGES['day31-90']);
  return pickRandom(COMPLETION_MESSAGES['day90+']);
}

// ── Scoring helpers ──────────────────────────────────────────────────────

function getStabilityBand(score: number): 'high' | 'medium' | 'low' {
  if (score > 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function urgencyMultiplier(
  stabilityScore: number,
  relapseRisk: RiskCategory,
  actionKind: WizardActionKind,
): number {
  const band = getStabilityBand(stabilityScore);
  const hasHighRisk = relapseRisk === 'high' || relapseRisk === 'elevated';

  if (actionKind === 'crisis') {
    if (band === 'low') return 2.0;
    if (hasHighRisk) return 1.6;
    return 1.0;
  }
  if (actionKind === 'coping') {
    if (band === 'low') return 1.5;
    if (band === 'medium') return 1.2;
    return 1.0;
  }
  if (actionKind === 'growth') {
    if (band === 'high') return 1.3;
    if (band === 'low') return 0.8;
    return 1.0;
  }
  return 1.0;
}

function stageRelevanceMultiplier(stage: RecoveryStage, kind: WizardActionKind): number {
  if (stage === 'crisis' && kind === 'crisis') return 1.3;
  if (stage === 'stabilize' && kind === 'coping') return 1.2;
  if (stage === 'rebuild' && kind === 'growth') return 1.3;
  if (stage === 'maintain' && kind === 'connection') return 1.2;
  return 1.0;
}

function behavioralMultiplier(
  actionId: string,
  history: WizardBehaviorState,
): number {
  const entry: ActionHistoryEntry | undefined = history.actionHistory[actionId];
  if (!entry) return 1.0;

  const totalSurfaced = entry.completionCount + entry.skipCount;
  if (totalSurfaced === 0) return 1.0;

  const skipRatio = entry.skipCount / totalSurfaced;
  if (skipRatio > 0.7 && totalSurfaced >= 5) return 0.5;
  if (skipRatio > 0.5 && totalSurfaced >= 3) return 0.7;

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  if (entry.completionCount >= 3) {
    const hourDiff = Math.abs(currentHour - entry.avgCompletionHour);
    if (hourDiff < 2) return 1.2;
  }

  return 1.0;
}

function streakModifier(behavior: WizardBehaviorState, kind: WizardActionKind): number {
  if (behavior.consecutiveLowStabilityDays >= 3 && (kind === 'crisis' || kind === 'coping')) {
    return 1.5;
  }
  if (behavior.consecutiveHighStabilityDays >= 5 && kind === 'growth') {
    return 1.3;
  }
  if (behavior.consecutiveHighStabilityDays >= 5 && kind === 'crisis') {
    return 0.7;
  }
  return 1.0;
}

function scoreAction(
  action: { kind: WizardActionKind; id: string; completed: boolean; basePriority: number },
  input: WizardEngineInput,
): number {
  if (action.completed) return 0;

  return (
    action.basePriority *
    urgencyMultiplier(input.stabilityScore, input.relapseRisk, action.kind) *
    stageRelevanceMultiplier(input.recoveryStage, action.kind) *
    behavioralMultiplier(action.id, input.behaviorHistory) *
    streakModifier(input.behaviorHistory, action.kind)
  );
}

// ── Setup progress ───────────────────────────────────────────────────────

function buildSetupProgress(input: WizardEngineInput): WizardPlan['setupProgress'] {
  const onboardingCompleted = getCompletedOnboardingSteps(
    input.profile,
    input.emergencyContacts,
    input.accountabilityData,
  );
  const onboardingDone = onboardingCompleted.size === ONBOARDING_STEP_IDS.length;

  // Core profile counts once onboarding flow is finished OR the persisted flag is set.
  // Do not hide setup progress when onboarding UI is done but optional steps remain
  // (previously `if (onboardingDone) return null` caused "4 of 5" to vanish on the home screen).
  const coreProfileDone = input.hasCompletedOnboarding || onboardingDone;

  const completedIds = new Set<string>();
  if (coreProfileDone) completedIds.add('core-profile');
  if (input.hasTriggers) completedIds.add('protection-profile');
  if (input.hasEmergencyContacts) completedIds.add('emergency-contacts');
  if (input.hasRebuildConfigured) completedIds.add('rebuild-plan');
  if (input.hasAccountabilityConfigured) completedIds.add('accountability');

  const remaining = SETUP_STEPS.filter((s) => !completedIds.has(s.id));
  if (remaining.length === 0) return null;

  return {
    completedSteps: SETUP_STEPS.length - remaining.length,
    totalSteps: SETUP_STEPS.length,
    nextStep: remaining[0],
    remainingSteps: remaining,
  };
}

// ── Context hints (replaces PersonalizationCard) ─────────────────────────

function buildContextHint(input: WizardEngineInput): string | null {
  if (input.highUrge) {
    return 'Your urge level is high. Crisis tools and grounding can help right now.';
  }
  if (input.nightRisk) {
    return 'Evenings have been higher-risk for you. Review your relapse plan before winding down.';
  }
  if (input.lowMood) {
    return 'Low mood is normal in recovery. One small, kind action can shift the trajectory.';
  }
  if (input.milestoneProximity && input.milestoneProximity.daysAway <= 2) {
    return `You're ${input.milestoneProximity.daysAway === 0 ? 'at' : `${input.milestoneProximity.daysAway} day${input.milestoneProximity.daysAway === 1 ? '' : 's'} from`} your ${input.milestoneProximity.label} milestone.`;
  }
  return null;
}

// ── Encouragement ────────────────────────────────────────────────────────

function buildEncouragement(input: WizardEngineInput): string | null {
  const stage = getCompanionStage(input.daysSober);

  if (input.daysSober === 0) {
    return "Today is Day 1. That decision alone is powerful.";
  }
  if (input.daysSober <= 3) {
    return "The first few days are the hardest. You're doing this.";
  }
  if (stage === 'early') {
    if (input.stabilityTrend === 'rising') {
      return "Your stability is rising. What you're doing is working.";
    }
    return "Every day you show up, you're rewriting your story.";
  }
  if (stage === 'building') {
    return "You're building a foundation. Each day makes it stronger.";
  }
  if (stage === 'strengthening') {
    return "You've come far. The life you're building is becoming yours.";
  }
  return null;
}

// ── Candidate actions ────────────────────────────────────────────────────

interface CandidateAction {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  kind: WizardActionKind;
  completed: boolean;
  basePriority: number;
  params?: { period: CheckInTimeOfDay };
}

const CHECK_IN_GUIDANCE_TITLE: Record<CheckInTimeOfDay, string> = {
  morning: 'Morning Check-In',
  afternoon: 'Afternoon Check-In',
  evening: 'Evening Check-In',
};

const CHECK_IN_GUIDANCE_ORDER: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];

function buildCheckInGuidanceSubtitle(
  period: CheckInTimeOfDay,
  done: boolean,
  now: Date,
): string {
  if (done) return 'Completed today';
  if (isCheckInPeriodInWindow(period, now)) {
    return `Available ${getCheckInAvailabilityWindow(period)} · Tap to log`;
  }
  const hint = getCheckInWindowHint(period);
  return hint ? `${hint} · PLEASE WAIT` : 'PLEASE WAIT';
}

function buildCandidateActions(input: WizardEngineInput): CandidateAction[] {
  const candidates: CandidateAction[] = [];
  const band = getStabilityBand(input.stabilityScore);

  const now = input.checkInWindowNow;
  CHECK_IN_GUIDANCE_ORDER.forEach((period, index) => {
    const done = input.todayCheckIns.some((c) => c.timeOfDay === period);
    candidates.push({
      id: `check-in-${period}`,
      title: CHECK_IN_GUIDANCE_TITLE[period],
      subtitle: buildCheckInGuidanceSubtitle(period, done, now),
      route: '/daily-checkin',
      kind: 'awareness',
      completed: done,
      basePriority: 10_000 - index,
      params: { period },
    });
  });

  candidates.push({
    id: 'daily-pledge',
    title: "Today's Pledge",
    subtitle: 'Commit to today and track your intention.',
    route: '/pledges',
    kind: 'awareness',
    completed: !!input.todayPledge?.completed,
    /** Below active check-in (10_000), above rotating guidance slots. */
    basePriority: 9000,
  });

  if (band === 'low' || input.highUrge) {
    candidates.push({
      id: 'crisis-tools',
      title: 'Open Crisis Tools',
      subtitle: 'Grounding, breathing, and safety tools for right now.',
      route: '/crisis-mode',
      kind: 'crisis',
      completed: input.hasCrisisToolCompletedToday,
      basePriority: 100,
    });
  }

  if (band === 'medium' || input.lowMood) {
    candidates.push({
      id: 'coping-exercise',
      title: 'Grounding Exercise',
      subtitle: 'A quick breathing or grounding practice to steady yourself.',
      route: '/tools/breathing',
      kind: 'coping',
      completed: input.hasCopingToolCompletedToday,
      basePriority: 70,
    });
  }

  const showOneRebuildStep =
    input.daysSober >= 30 &&
    input.hasPremiumSubscription &&
    input.trustedCircleContactCount === 0;

  if (showOneRebuildStep) {
    candidates.push({
      id: 'rebuild-action',
      title: 'One Rebuild Step',
      subtitle: input.rebuildGoalsCount > 0
        ? 'Take one step toward a goal you set.'
        : 'Build a habit, routine, or goal that supports your new life.',
      route: '/rebuild',
      kind: 'growth',
      completed: input.rebuildHabitsCompletedToday > 0 || input.rebuildRoutinesCompletedToday > 0,
      basePriority: 60,
    });
  }

  if (input.triggerRiskScore >= 50 || band === 'low') {
    candidates.push({
      id: 'trigger-review',
      title: 'Plan Around Triggers',
      subtitle: 'Identify one high-risk situation and plan your response.',
      route: '/triggers',
      kind: 'awareness',
      completed: input.hasTriggers,
      basePriority: 65,
    });
  }

  candidates.push({
    id: 'journal',
    title: 'Journal',
    subtitle: 'Reflect on your day and strengthen your mindset.',
    route: '/new-journal',
    kind: 'growth',
    completed: input.hasJournalEntryToday,
    basePriority: 50,
  });

  if (input.hasEmergencyContacts || input.hasAccountabilityConfigured) {
    candidates.push({
      id: 'connection-touchpoint',
      title: 'Connection Touchpoint',
      subtitle: 'Send a message or check in with someone in your circle.',
      route: '/connection',
      kind: 'connection',
      completed: input.hasConnectionTouchpointCompletedToday,
      basePriority: 55,
    });
  }

  if (!input.hasEmergencyContacts) {
    candidates.push({
      id: 'add-emergency-contact',
      title: 'Add a Trusted Circle Contact',
      subtitle: 'Someone to reach when things get hard. Stored only on your device.',
      route: '/connection',
      kind: 'connection',
      completed: false,
      basePriority: 80,
    });
  }

  const hasActiveContract =
    input.accountabilityData?.contracts?.some(
      (c) => (c as { isActive?: boolean }).isActive !== false,
    ) ?? false;
  if (hasActiveContract) {
    candidates.push({
      id: 'accountability-checkin',
      title: 'Accountability Check-In',
      subtitle: 'Check in with your commitment.',
      route: '/accountability',
      kind: 'awareness',
      completed: input.hasAccountabilityCheckInCompletedToday,
      basePriority: 58,
    });
  }

  // Stage-specific actions
  if (input.recoveryStage === 'maintain' || input.recoveryStage === 'rebuild') {
    if (input.nightRisk) {
      candidates.push({
        id: 'relapse-plan-review',
        title: 'Review Relapse Plan',
        subtitle: 'Refresh your warning signs and safety steps before the evening.',
        route: '/relapse-plan',
        kind: 'coping',
        completed: input.hasRelapsePlan,
        basePriority: 62,
      });
    }
  }

  return candidates;
}

function buildScoredWizardActions(input: WizardEngineInput): WizardAction[] {
  const candidates = buildCandidateActions(input);
  const scored = candidates.map((c) => ({
    ...c,
    priority: scoreAction(c, input),
  }));
  scored.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.priority - a.priority;
  });
  return scored.map((s) => {
    const action: WizardAction = {
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      route: s.route,
      kind: s.kind,
      completed: s.completed,
      priority: s.priority,
    };
    if (s.params) action.params = s.params;
    return action;
  });
}

/** Max rotating (non-pinned) rows under Today’s guidance per calendar day. */
const MAX_NON_CHECKIN_GUIDANCE_ACTIONS_PER_DAY = 3;

/** Always shown in Today’s guidance when present in candidates (not subject to daily rotation cap). */
function isGuidanceCapExempt(a: WizardAction): boolean {
  return a.id.startsWith('check-in-') || a.id === 'daily-pledge';
}

function hashStringToUint32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic subset for the given date key; order follows `pool` (priority order). */
function pickSeededActionIds(pool: WizardAction[], seedKey: string, count: number): Set<string> {
  if (count <= 0) return new Set();
  if (pool.length <= count) return new Set(pool.map((a) => a.id));

  const rand = createSeededRandom(hashStringToUint32(seedKey));
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  return new Set(idx.slice(0, count).map((i) => pool[i]!.id));
}

/**
 * Keeps pinned rows (time-window check-in + daily pledge) and up to
 * {@link MAX_NON_CHECKIN_GUIDANCE_ACTIONS_PER_DAY} other actions. Selection is stable for `localDateKey`.
 */
function limitDailyGuidanceActions(actions: WizardAction[], localDateKey: string): WizardAction[] {
  const pool = actions.filter((a) => !isGuidanceCapExempt(a));

  if (pool.length <= MAX_NON_CHECKIN_GUIDANCE_ACTIONS_PER_DAY) {
    return actions;
  }

  const mustShow = new Set<string>();
  const crisisIncomplete = pool.find((a) => a.id === 'crisis-tools' && !a.completed);
  if (crisisIncomplete) mustShow.add('crisis-tools');

  const poolForPick = pool.filter((a) => !mustShow.has(a.id));
  const need = MAX_NON_CHECKIN_GUIDANCE_ACTIONS_PER_DAY - mustShow.size;
  const extra = pickSeededActionIds(poolForPick, `${localDateKey}|dailyGuidance`, need);
  const pickedPoolIds = new Set<string>([...mustShow, ...extra]);

  return actions.filter((a) => isGuidanceCapExempt(a) || pickedPoolIds.has(a.id));
}

/** Morning → afternoon → evening first, then all other guidance rows (stable order). */
export function stabilizeGuidanceActionOrder(actions: WizardAction[]): WizardAction[] {
  const byId = new Map(actions.map((a) => [a.id, a] as const));
  const chain = CHECK_IN_GUIDANCE_ORDER.map((p) => byId.get(`check-in-${p}`)).filter(
    (a): a is WizardAction => a != null,
  );
  const rest = actions.filter((a) => !a.id.startsWith('check-in-'));
  return [...chain, ...rest];
}

function allGuidanceActionsCompleteExcept(
  actions: WizardAction[],
  exceptIds: ReadonlySet<string>,
): boolean {
  return actions.every((a) => exceptIds.has(a.id) || a.completed);
}

/**
 * Collapsed guidance shows this index first: earliest incomplete M/A/E check-in that is
 * inside its window (tappable). If none, a PLEASE WAIT M/A/E row may fill the slot only when
 * allowed: afternoon only if every other row is complete except evening; evening only if
 * every other row is complete. Otherwise the first non-check-in row.
 * When `checkInWindowNow` is omitted, locked check-ins are still eligible (legacy).
 */
export function getGuidanceCollapsedFocusIndex(
  actions: WizardAction[],
  checkInWindowNow?: Date,
): number {
  let firstLockedMaeCheckIn: number | null = null;

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    if (!a.id.startsWith('check-in-')) {
      return firstLockedMaeCheckIn ?? i;
    }
    if (a.completed) {
      continue;
    }
    if (checkInWindowNow != null) {
      const period = a.params?.period;
      if (period === 'morning' || period === 'afternoon' || period === 'evening') {
        if (isCheckInPeriodInWindow(period, checkInWindowNow)) {
          return i;
        }
        // PLEASE WAIT: afternoon only if all other tasks done except evening; evening only if all others done.
        if (period === 'morning') {
          firstLockedMaeCheckIn ??= i;
        } else if (period === 'afternoon') {
          if (
            allGuidanceActionsCompleteExcept(
              actions,
              new Set(['check-in-afternoon', 'check-in-evening']),
            )
          ) {
            firstLockedMaeCheckIn ??= i;
          }
        } else if (period === 'evening') {
          if (allGuidanceActionsCompleteExcept(actions, new Set(['check-in-evening']))) {
            firstLockedMaeCheckIn ??= i;
          }
        }
        continue;
      }
    }
    return i;
  }

  if (firstLockedMaeCheckIn !== null) {
    return firstLockedMaeCheckIn;
  }

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    if (!a.id.startsWith('check-in-')) {
      return i;
    }
  }
  return Math.max(0, actions.length - 1);
}

function resolvePrimaryGuidanceAction(
  actions: WizardAction[],
  checkInWindowNow?: Date,
): WizardAction | null {
  const i = getGuidanceCollapsedFocusIndex(actions, checkInWindowNow);
  const cand = actions[i];
  if (cand && !cand.completed) return cand;
  return actions.find((a) => !a.completed) ?? null;
}

// ── Risk warnings ────────────────────────────────────────────────────────

function buildRiskWarnings(input: WizardEngineInput): string[] {
  const warnings: string[] = [];

  if (input.relapseRisk === 'high' || input.relapseRisk === 'elevated') {
    warnings.push(
      'Your answers suggest a rough patch. Today is a good day to lean on support people and crisis tools a little earlier.',
    );
  }
  if (input.missedEngagementScore >= 50) {
    warnings.push(
      'You have some missed check-ins. Short, consistent actions matter more than perfection.',
    );
  }
  if (input.triggerRiskScore >= 60) {
    warnings.push(
      'Recent patterns in your logs look triggering. Planning around one situation today can make space feel safer.',
    );
  }
  if (input.highUrge) {
    warnings.push(
      'Your urge level looks elevated in what you logged. Grounding tools and reaching out sooner can help you ride the wave.',
    );
  }

  return warnings;
}

// ── Main engine ──────────────────────────────────────────────────────────

export function generateWizardPlan(input: WizardEngineInput): WizardPlan {
  const setupProgress = buildSetupProgress(input);

  // Re-entry mode: user returning after 2+ day gap
  if (input.daysSinceLastSession >= 2) {
    const isLongGap = input.daysSinceLastSession >= 5;
    const reentryMsg = isLongGap
      ? pickRandom(REENTRY_MESSAGES_LONG_GAP)
      : pickRandom(REENTRY_MESSAGES);

    const rawActions = buildScoredWizardActions(input);
    const actions = stabilizeGuidanceActionOrder(
      limitDailyGuidanceActions(rawActions, input.guidanceDateKey),
    );
    const incompleteActions = actions.filter((a) => !a.completed);
    const isComplete = actions.length > 0 && incompleteActions.length === 0;
    const primaryAction = resolvePrimaryGuidanceAction(actions, input.checkInWindowNow);
    const riskWarnings = buildRiskWarnings(input);

    return {
      setupProgress,
      dailyGuidance: {
        primaryAction,
        actions,
        riskWarnings: isComplete ? [] : riskWarnings,
        encouragement: reentryMsg,
        contextHint: isComplete
          ? null
          : "Welcome back — use Today’s guidance when your check-in window is open, or choose a step below.",
        isComplete,
        completionMessage: isComplete ? getCompletionMessage(input.daysSober) : null,
        isReentryMode: true,
      },
    };
  }

  // Normal mode
  const rawActions = buildScoredWizardActions(input);
  const actions = stabilizeGuidanceActionOrder(
    limitDailyGuidanceActions(rawActions, input.guidanceDateKey),
  );
  const contextHint = buildContextHint(input);
  const encouragement = buildEncouragement(input);
  const riskWarnings = buildRiskWarnings(input);

  const incompleteActions = actions.filter((a) => !a.completed);
  const isComplete = actions.length > 0 && incompleteActions.length === 0;
  const primaryAction = resolvePrimaryGuidanceAction(actions, input.checkInWindowNow);

  return {
    setupProgress,
    dailyGuidance: {
      primaryAction,
      actions,
      riskWarnings: isComplete ? [] : riskWarnings,
      encouragement,
      contextHint: isComplete ? null : contextHint,
      isComplete,
      completionMessage: isComplete ? getCompletionMessage(input.daysSober) : null,
      isReentryMode: false,
    },
  };
}
