export const RECOVERY_PATH_IDS = [
  "stabilize",
  "build_control",
  "repair_life",
  "heal_deep",
  "grow_forward",
  "give_back",
] as const;

export type RecoveryPathId = (typeof RECOVERY_PATH_IDS)[number];

export type RecoveryPathMeta = {
  id: RecoveryPathId;
  title: string;
  phase: string;
  description: string;
  /** Placeholder progress 0–1 for the card indicator */
  progressPlaceholder: number;
};

export const RECOVERY_PATHS: readonly RecoveryPathMeta[] = [
  {
    id: "stabilize",
    title: "Stabilize",
    phase: "Days 1–30",
    description:
      "Safety first—Adjusting to life without addiction. The importance of routines, sleep, and lowering daily risk.",
    progressPlaceholder: 0.22,
  },
  {
    id: "build_control",
    title: "Maintain",
    phase: "30–90 days",
    description: "Using new skills and patterns that hold when pressure spikes.",
    progressPlaceholder: 0.38,
  },
  {
    id: "repair_life",
    title: "Repair Life",
    phase: "90+ days",
    description: "Trust, work, money, and relationships—steady, visible steps.",
    progressPlaceholder: 0.45,
  },
  {
    id: "heal_deep",
    title: "Heal Deep",
    phase: "Parallel",
    description: "Trauma-informed depth alongside your day-to-day plan.",
    progressPlaceholder: 0.3,
  },
  {
    id: "grow_forward",
    title: "Grow Forward",
    phase: "6+ months",
    description: "Purpose, identity, and momentum beyond crisis mode.",
    progressPlaceholder: 0.55,
  },
  {
    id: "give_back",
    title: "Give Back",
    phase: "Advanced",
    description: "Mentorship and service—without losing your center.",
    progressPlaceholder: 0.67,
  },
];

export function getRecoveryPathById(id: string | undefined): RecoveryPathMeta | null {
  if (!id) return null;
  return RECOVERY_PATHS.find((p) => p.id === id) ?? null;
}

export function isRecoveryPathId(value: string): value is RecoveryPathId {
  return (RECOVERY_PATH_IDS as readonly string[]).includes(value);
}
