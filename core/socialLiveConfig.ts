/**
 * Live social / community backend configuration.
 *
 * Release builds require **`https://` `EXPO_PUBLIC_LIVE_SOCIAL_API_URL`** plus
 * **`EXPO_PUBLIC_COMMUNITY_ENABLED=true|1|on`** for live UGC (`isCommunityEnabled()`).
 *
 * Dev bundles may use `http://` for LAN testing. See `docs/LIVE_SOCIAL.md`.
 */

import { isCommunityFeatureEnabled } from './communityFeaturesArchived';

declare const __DEV__: boolean;

function readLiveSocialApiUrlRaw(): string {
  const raw = process.env.EXPO_PUBLIC_LIVE_SOCIAL_API_URL?.trim();
  return raw && /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, '') : '';
}

/**
 * Base URL for the live social API. Release binaries (`!__DEV__`) only accept **https** origins.
 */
export function getLiveSocialApiBaseUrl(): string {
  const base = readLiveSocialApiUrlRaw();
  if (!base) return '';
  const isRelease = typeof __DEV__ !== 'undefined' && !__DEV__;
  if (isRelease && !base.toLowerCase().startsWith('https://')) {
    return '';
  }
  return base;
}

export function isLiveSocialMode(): boolean {
  return getLiveSocialApiBaseUrl().length > 0;
}

/**
 * Live community / recovery rooms. **Release builds** require an explicit opt-in flag
 * (`EXPO_PUBLIC_COMMUNITY_ENABLED=true|1|on`) plus a configured **https** API URL, so store
 * binaries never accidentally ship partial social features.
 *
 * Set `EXPO_PUBLIC_COMMUNITY_ENABLED=false` to force-disable even when a URL is present.
 */
export function isCommunityEnabled(): boolean {
  if (!isCommunityFeatureEnabled) return false;
  const v = process.env.EXPO_PUBLIC_COMMUNITY_ENABLED?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (!isLiveSocialMode()) return false;
  const isRelease = typeof __DEV__ !== 'undefined' && !__DEV__;
  if (isRelease) {
    return v === 'true' || v === '1' || v === 'on';
  }
  return true;
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
  if (isCommunityEnabled()) return 'live';
  if (isLocalSocialDemoEnabled()) return 'local_demo';
  return 'offline';
}

/**
 * Recovery Rooms, Connect “Peers/Rooms” tabs, community guidelines entry points, and premium
 * marketing for `recovery_rooms` are enabled when:
 * - Live social is configured (`isCommunityEnabled()`), or
 * - The app is running under the Metro / dev client (`__DEV__`), so Connect Peers/Rooms are always
 *   available while developing without extra env, or
 * - A local engineer demo is explicitly allowed (dev bundle + `EXPO_PUBLIC_ALLOW_LOCAL_SOCIAL_DEMO` not `false`).
 *
 * **Release** store builds (`!__DEV__`) without live social still resolve to “State A” (hidden) unless
 * `EXPO_PUBLIC_ALLOW_LOCAL_SOCIAL_DEMO` is not `false` (unusual for production).
 */
export function arePeerPracticeFeaturesEnabled(): boolean {
  if (!isCommunityFeatureEnabled) return false;
  if (isCommunityEnabled()) return true;
  if (typeof __DEV__ === 'boolean' && __DEV__) return true;
  return isLocalSocialDemoEnabled();
}
