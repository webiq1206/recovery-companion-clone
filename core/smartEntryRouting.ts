import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecoveryPathId } from '../constants/recoveryPaths';
import { RECOVERY_PATHS } from '../constants/recoveryPaths';
import { PATH_DEMO_ROOMS } from '../constants/recoveryPathRooms';
import type { DailyCheckIn } from '../types';
import type { RecoveryRoomTopic } from '../types';

/** AsyncStorage key: local calendar day string when user dismissed the Today hub smart-entry banner. */
export const SMART_ENTRY_BANNER_DISMISS_KEY = 'smart_entry_banner_dismissed_day';

export async function clearSmartEntryBannerDismiss(): Promise<void> {
  await AsyncStorage.removeItem(SMART_ENTRY_BANNER_DISMISS_KEY);
}

/** 1–5 scales aligned with daily check-ins (1 = hardest mood / lowest energy, 5 = strongest cravings). */
export type SmartEntryMoodInput = {
  mood: number;
  cravingLevel: number;
  stress?: number;
};

export type SmartEntryRecommendation = {
  recoveryPathId: RecoveryPathId;
  recoveryPathTitle: string;
  recoveryRoomId: string;
  recoveryRoomName: string;
  recoveryRoomTopic: RecoveryRoomTopic;
  /** First catalog room for this path (recovery-paths demo flow). */
  suggestedDemoRoomId: string;
  /** Short human-readable routing notes for UI. */
  reasons: readonly string[];
};

const ROOM_META: Record<
  string,
  {
    name: string;
    topic: RecoveryRoomTopic;
  }
> = {
  rr_1: { name: 'Morning Circle', topic: 'general' },
  rr_2: { name: 'Craving SOS', topic: 'cravings' },
  rr_3: { name: 'Quiet Minds', topic: 'mindfulness' },
  rr_4: { name: 'First 30 Days', topic: 'early_recovery' },
  rr_5: { name: 'Rebuilding Trust', topic: 'relationships' },
};

export const DEFAULT_SMART_ENTRY_MOOD: SmartEntryMoodInput = {
  mood: 3,
  cravingLevel: 2,
  stress: 3,
};

function clampScale(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function pathFromDaysSober(daysSober: number): RecoveryPathId {
  if (daysSober < 30) return 'stabilize';
  if (daysSober < 90) return 'build_control';
  if (daysSober < 180) return 'repair_life';
  if (daysSober < 365) return 'grow_forward';
  return 'give_back';
}

function firstDemoRoomIdForPath(pathId: RecoveryPathId): string {
  const list = PATH_DEMO_ROOMS[pathId];
  return list[0]?.id ?? 'stabilize-dawn-checkin';
}

/**
 * Picks a Connect recovery room id from mood/stress (priority: cravings → low mood → stress),
 * then aligns with early sobriety when nothing else matched.
 */
function recoveryRoomFromSignals(
  daysSober: number,
  mood: SmartEntryMoodInput,
): { roomId: string; reasons: string[] } {
  const reasons: string[] = [];
  const craving = clampScale(mood.cravingLevel);
  const moodVal = clampScale(mood.mood);
  const stressVal = clampScale(mood.stress ?? 3);

  if (craving >= 4) {
    reasons.push('Strong cravings — a cravings-focused room is a good fit.');
    return { roomId: 'rr_2', reasons };
  }

  if (moodVal <= 2) {
    reasons.push('Heavy mood — a gentle, grounding space may help.');
    return { roomId: 'rr_3', reasons };
  }

  if (stressVal >= 4 && craving <= 3) {
    reasons.push('High stress — mindfulness and regulation together.');
    return { roomId: 'rr_3', reasons };
  }

  if (daysSober < 30) {
    reasons.push('Under 30 days — peers in early recovery.');
    return { roomId: 'rr_4', reasons };
  }

  if (moodVal >= 4 && stressVal <= 2) {
    reasons.push('Mood is steadier — general support works well.');
    return { roomId: 'rr_1', reasons };
  }

  reasons.push('General support for where you are today.');
  return { roomId: 'rr_1', reasons };
}

function pathReason(pathId: RecoveryPathId): string {
  if (pathId === 'stabilize') return 'Under 30 days sober — the Stabilize path matches early risk.';
  if (pathId === 'build_control') return 'About 1–3 months sober — Build Control supports urge skills.';
  if (pathId === 'repair_life') return 'Roughly 3–6 months sober — Repair Life fits trust and routines.';
  if (pathId === 'grow_forward') return 'Six months to a year — Grow Forward supports purpose and momentum.';
  return 'A year or more — Give Back fits mentorship when you are ready.';
}

/**
 * @param daysSober — whole days since sober date (or 0 if unknown)
 * @param mood — mock or from latest check-in (mood 1–5, craving 1–5)
 */
export function getSmartEntryRecommendation(
  daysSober: number,
  mood: SmartEntryMoodInput,
): SmartEntryRecommendation {
  const d = Math.max(0, Math.floor(daysSober));
  const recoveryPathId = pathFromDaysSober(d);
  const pathMeta =
    RECOVERY_PATHS.find((p) => p.id === recoveryPathId) ?? RECOVERY_PATHS[0];

  const { roomId, reasons: roomReasons } = recoveryRoomFromSignals(d, mood);
  const meta = ROOM_META[roomId] ?? ROOM_META.rr_1;

  const reasons = [pathReason(recoveryPathId), ...roomReasons];

  return {
    recoveryPathId,
    recoveryPathTitle: pathMeta.title,
    recoveryRoomId: roomId,
    recoveryRoomName: meta.name,
    recoveryRoomTopic: meta.topic,
    suggestedDemoRoomId: firstDemoRoomIdForPath(recoveryPathId),
    reasons,
  };
}

/** Uses the most recent check-in by `completedAt`; returns null if none. */
export function moodInputFromLatestCheckIn(checkIns: DailyCheckIn[]): SmartEntryMoodInput | null {
  if (!checkIns.length) return null;
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
  const c = sorted[0];
  return {
    mood: clampScale(c.mood),
    cravingLevel: clampScale(c.cravingLevel),
    stress: clampScale(c.stress),
  };
}
