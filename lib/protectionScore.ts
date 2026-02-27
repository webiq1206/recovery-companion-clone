import { RecoveryProfile, SleepQualityLevel, SupportAvailability } from '@/types';

export type ProtectionStatus = 'High Alert' | 'Guarded' | 'Strengthening' | 'Stable';

export interface ProtectionScoreInput {
  intensity?: number | null; // 1–5
  sleepQuality?: SleepQualityLevel | null;
  triggerCount?: number | null;
  supportLevel?: SupportAvailability | null;
}

export interface ProtectionScoreResult {
  protectionScore: number; // 0–100
  protectionStatus: ProtectionStatus;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateProtectionScore(input: ProtectionScoreInput): ProtectionScoreResult {
  const {
    intensity,
    sleepQuality,
    triggerCount,
    supportLevel,
  } = input;

  // Sensible, crash-safe defaults if any field is missing.
  const safeIntensity = clamp(
    typeof intensity === 'number' && !Number.isNaN(intensity) ? intensity : 3,
    1,
    5,
  );
  const safeSleep: SleepQualityLevel = (sleepQuality as SleepQualityLevel) ?? 'fair';
  const safeTriggerCount = clamp(
    typeof triggerCount === 'number' && !Number.isNaN(triggerCount) ? triggerCount : 0,
    0,
    50,
  );
  const safeSupport: SupportAvailability = (supportLevel as SupportAvailability) ?? 'limited';

  // We treat these as risk contributors and invert to get a protection score.
  let riskPoints = 0;

  // Intensity (up to 30 points of risk)
  const intensityWeightPerStep = 30 / 4; // from 1 to 5 (4 steps)
  riskPoints += (safeIntensity - 1) * intensityWeightPerStep;

  // Sleep quality (up to ~20 points of risk)
  const sleepWeights: Record<SleepQualityLevel, number> = {
    poor: 18,
    fair: 10,
    good: 4,
    excellent: 0,
  };
  riskPoints += sleepWeights[safeSleep] ?? 10;

  // Triggers (up to 30 points of risk, capped)
  riskPoints += Math.min(safeTriggerCount * 3, 30);

  // Support availability (up to ~20 points of risk)
  const supportWeights: Record<SupportAvailability, number> = {
    none: 20,
    limited: 12,
    moderate: 5,
    strong: 0,
  };
  riskPoints += supportWeights[safeSupport] ?? 10;

  const rawProtection = 100 - riskPoints;
  const protectionScore = clamp(Math.round(rawProtection), 0, 100);

  let protectionStatus: ProtectionStatus;
  if (protectionScore < 40) {
    protectionStatus = 'High Alert';
  } else if (protectionScore < 60) {
    protectionStatus = 'Guarded';
  } else if (protectionScore < 80) {
    protectionStatus = 'Strengthening';
  } else {
    protectionStatus = 'Stable';
  }

  return { protectionScore, protectionStatus };
}

export function calculateProtectionFromProfile(rp: RecoveryProfile): ProtectionScoreResult {
  return calculateProtectionScore({
    intensity: rp.struggleLevel,
    sleepQuality: rp.sleepQuality,
    triggerCount: rp.triggers?.length ?? 0,
    supportLevel: rp.supportAvailability,
  });
}

