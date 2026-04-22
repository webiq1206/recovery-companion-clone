/**
 * App Store–visible support path. Set `EXPO_PUBLIC_SUPPORT_EMAIL` (and optionally
 * `EXPO_PUBLIC_SUPPORT_URL`) in EAS env for production builds.
 *
 * For App Store Connect, set the same public privacy policy URL you host (HTTPS):
 * `EXPO_PUBLIC_PRIVACY_POLICY_URL` (optional; enables an in-app “open in browser” link).
 */
export function getSupportEmail(): string {
  return (process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '').trim();
}

export function getSupportUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPPORT_URL || '').trim();
}

/** Public HTTPS URL where this Privacy Policy is hosted (for App Store Connect and in-app link). */
export function getPrivacyPolicyPublicUrl(): string {
  return (process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '').trim();
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
