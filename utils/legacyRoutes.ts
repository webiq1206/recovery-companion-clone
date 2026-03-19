/**
 * Legacy -> canonical route mapping for gradual IA transition.
 *
 * This file is intentionally non-enforcing for now.
 * We can wire strict redirects later once route usage is fully stabilized.
 */
export const LEGACY_ROUTE_MAP: Record<string, string> = {
  '/(tabs)/community': '/connection',
  '/(tabs)/support': '/support',
  '/(tabs)/rebuild': '/rebuild',
  '/(tabs)/profile': '/profile',
  '/(tabs)/progress': '/progress',
  '/(tabs)/journal': '/journal',
  '/(tabs)/triggers': '/triggers',
  '/(tabs)/milestones': '/milestones',
  '/(tabs)/accountability': '/accountability',
  '/(tabs)/pledges': '/pledges',
  '/(tabs)/connection/recovery-rooms': '/recovery-rooms',
  '/(tabs)/connection/room-session': '/room-session',
  '/(tabs)/(home)': '/home',
  '/(tabs)/(home)/today-hub': '/home',
};

export function resolveCanonicalRoute(path: string): string {
  return LEGACY_ROUTE_MAP[path] ?? path;
}

export function shouldEnableStrictIARedirects(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_STRICT_IA_REDIRECTS === '1';
}

