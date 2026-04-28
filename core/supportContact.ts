/**
 * App Store–visible support path. Set `EXPO_PUBLIC_SUPPORT_EMAIL` (and optionally
 * `EXPO_PUBLIC_SUPPORT_URL`) in EAS env for production builds (see `eas.json`).
 * In `__DEV__`, RecoveryRoad defaults apply when those vars are unset so Settings links work locally.
 *
 * For App Store Connect, set the same public privacy policy URL you host (HTTPS):
 * `EXPO_PUBLIC_PRIVACY_POLICY_URL` (optional; enables an in-app “open in browser” link).
 *
 * Optional public Terms of Service URL: `EXPO_PUBLIC_TERMS_OF_SERVICE_URL` (enables the same on the Terms screen).
 */
/**
 * When `EXPO_PUBLIC_*` is unset, local `expo start` has no EAS env — use RecoveryRoad
 * defaults in development only so Settings and support links work without a `.env` file.
 */
const DEV_DEFAULT_SUPPORT_EMAIL = 'support@recoveryroad.app';
const DEV_DEFAULT_SUPPORT_URL = 'https://recoveryroad.app/contact';

export function getSupportEmail(): string {
  const v = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '').trim();
  if (v) return v;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return DEV_DEFAULT_SUPPORT_EMAIL;
  return '';
}

export function getSupportUrl(): string {
  const v = (process.env.EXPO_PUBLIC_SUPPORT_URL || '').trim();
  if (v) return v;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return DEV_DEFAULT_SUPPORT_URL;
  return '';
}

/** Public HTTPS URL where this Privacy Policy is hosted (for App Store Connect and in-app link). */
export function getPrivacyPolicyPublicUrl(): string {
  return (process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '').trim();
}

/** Public HTTPS URL where these Terms of Service are hosted (for in-app link). */
export function getTermsOfServicePublicUrl(): string {
  return (process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL || '').trim();
}

export function hasConfiguredSupportContact(): boolean {
  return getSupportEmail().length > 0 || /^https?:\/\//i.test(getSupportUrl());
}

/** Footer text for in-app legal screens (Privacy Policy, Terms, etc.). */
export function formatLegalDocumentContactFooter(): string {
  const email = getSupportEmail();
  const url = getSupportUrl();
  const lines: string[] = [];
  lines.push('Contact');
  if (email) lines.push(`Email: ${email}`);
  if (/^https?:\/\//i.test(url)) lines.push(`Support website: ${url}`);
  lines.push(
    'You can also use the developer support link on the RecoveryRoad listing in the Apple App Store or Google Play.',
  );
  return lines.join('\n');
}
