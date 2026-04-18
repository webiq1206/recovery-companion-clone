import AsyncStorage from '@react-native-async-storage/async-storage';

export const ANONYMOUS_CHAT_IDENTITY_STORAGE_KEY = 'recovery_anonymous_chat_identity_v1';

export const ANONYMOUS_CHAT_IDENTITY_QUERY_KEY = ['anonymousChatIdentity'] as const;

export type AnonymousIdentityRole = 'New' | 'Active' | 'Mentor';

export type AnonymousIdentity = {
  dayCount: number;
  role: AnonymousIdentityRole | null;
};

function isValidStoredIdentity(parsed: unknown): parsed is AnonymousIdentity {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  if (typeof p.dayCount !== 'number' || !Number.isFinite(p.dayCount)) return false;
  const r = p.role;
  if (r !== null && r !== 'New' && r !== 'Active' && r !== 'Mentor') return false;
  return true;
}

export function generateMockIdentity(): AnonymousIdentity {
  const dayCount = 1 + Math.floor(Math.random() * 547);
  const roleRoll = Math.random();
  const role: AnonymousIdentityRole | null =
    roleRoll < 0.22 ? null : roleRoll < 0.48 ? 'New' : roleRoll < 0.74 ? 'Active' : 'Mentor';
  return { dayCount, role };
}

export function formatAnonymousIdentityLabel(identity: AnonymousIdentity): string {
  const day = Math.max(1, Math.min(9999, Math.floor(identity.dayCount)));
  const dayPart = `Day ${day}`;
  if (!identity.role) return dayPart;
  return `${dayPart} · ${identity.role}`;
}

const HANDLE_ADJECTIVES = [
  'Quiet',
  'Steady',
  'Gentle',
  'Brave',
  'Kind',
  'Calm',
  'Bright',
  'Wild',
] as const;

const HANDLE_NOUNS = [
  'River',
  'Oak',
  'Harbor',
  'Summit',
  'Path',
  'Brook',
  'Pine',
  'Heron',
  'Meadow',
  'Cedar',
] as const;

/** Stable anonymous-style display name for chat (replaces "Day N · Role" in UI). */
export function formatAnonymousChatHandle(identity: AnonymousIdentity): string {
  const day = Math.max(1, Math.min(9999, Math.floor(identity.dayCount)));
  const roleKey =
    identity.role === 'Mentor' ? 3 : identity.role === 'Active' ? 2 : identity.role === 'New' ? 1 : 0;
  const h = (day * 17 + roleKey * 31) % (HANDLE_ADJECTIVES.length * HANDLE_NOUNS.length);
  const adj = HANDLE_ADJECTIVES[Math.floor(h / HANDLE_NOUNS.length) % HANDLE_ADJECTIVES.length];
  const noun = HANDLE_NOUNS[h % HANDLE_NOUNS.length];
  const suffix = String(day % 100).padStart(2, '0');
  return `${adj}${noun}${suffix}`;
}

/** Ephemeral handle for simulated peers (not persisted). */
export function generateRandomIdentityLabel(): string {
  return formatAnonymousChatHandle(generateMockIdentity());
}

export async function loadOrCreateAnonymousIdentity(): Promise<AnonymousIdentity> {
  try {
    const stored = await AsyncStorage.getItem(ANONYMOUS_CHAT_IDENTITY_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isValidStoredIdentity(parsed)) return parsed;
    }
  } catch {
    // fall through to regenerate
  }
  const created = generateMockIdentity();
  try {
    await AsyncStorage.setItem(ANONYMOUS_CHAT_IDENTITY_STORAGE_KEY, JSON.stringify(created));
  } catch {
    // still return in-memory identity for this runtime
  }
  return created;
}
