/**
 * Live social / community backend configuration.
 *
 * When `EXPO_PUBLIC_LIVE_SOCIAL_API_URL` is set, Recovery Rooms and Community use the real API
 * (see `services/liveSocialClient.ts` and `docs/LIVE_SOCIAL.md`).
 *
 * When unset in production builds, simulated sample data and auto-replies are disabled so the app
 * cannot be mistaken for a live moderated peer service.
 */

declare const __DEV__: boolean;

export function getLiveSocialApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_LIVE_SOCIAL_API_URL?.trim();
  return raw && /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, '') : '';
}

export function isLiveSocialMode(): boolean {
  return getLiveSocialApiBaseUrl().length > 0;
}

/**
 * On-device sample community / seeded rooms + auto-replies. Only when not in live mode and
 * running a dev bundle. Set `EXPO_PUBLIC_ALLOW_LOCAL_SOCIAL_DEMO=false` to force-disable.
 */
export function isLocalSocialDemoEnabled(): boolean {
  if (typeof __DEV__ === 'boolean' && !__DEV__) {
    return false;
  }
  if (isLiveSocialMode()) {
    return false;
  }
  return process.env.EXPO_PUBLIC_ALLOW_LOCAL_SOCIAL_DEMO !== 'false';
}

export type SocialPresentationMode = 'live' | 'local_demo' | 'offline';

export function getSocialPresentationMode(): SocialPresentationMode {
  if (isLiveSocialMode()) return 'live';
  if (isLocalSocialDemoEnabled()) return 'local_demo';
  return 'offline';
}

/**
 * Recovery Rooms, simulated peer chat, sample “safe rooms,” and related marketing should only
 * appear when live social is configured (real backend) or in a dev bundle where local demo is allowed.
 * Release store builds without `EXPO_PUBLIC_LIVE_SOCIAL_API_URL` keep these fully hidden.
 */
export function arePeerPracticeFeaturesEnabled(): boolean {
  if (isLiveSocialMode()) return true;
  if (typeof __DEV__ === 'boolean' && __DEV__) return true;
  return false;
}
