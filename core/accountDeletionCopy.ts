/**
 * User-facing copy for account deletion and lighter local cache resets.
 * Keep in sync with `getAllAccountDeletionAsyncStorageKeys` / `resetAllData`.
 */

export const DELETE_ACCOUNT_INTRO =
  'RecoveryRoad does not create or host a server-side login or profile for you. Delete account permanently erases everything the app has stored on this device for your use of the app. Apple or Google may still hold subscription or purchase records tied to your store account—manage billing there.';

/** Same scope as delete account; wording matches the “Remove all app data” entry point. */
export const REMOVE_ALL_APP_DATA_INTRO =
  'RecoveryRoad does not create or host a server-side login or profile for you. Remove all app data permanently erases everything the app has stored on this device for your use of the app. Apple or Google may still hold subscription or purchase records tied to your store account—manage billing there.';

export const DELETE_ACCOUNT_DATA_BULLETS: readonly string[] = [
  'Profile and onboarding (name, goals, sober date, recovery inputs, privacy toggles)',
  'Daily check-ins, near-miss events, progress stats, and relapse timeline',
  'Journal, pledges, workbook answers, emergency contacts, and media you saved in the app',
  'Rebuild and accountability data stored locally',
  'Connection hub content stored on this device (trusted contacts and similar local-only items)',
  'Cached subscription entitlement (you can restore purchases after reinstall)',
  'Engagement and notification preferences, scheduled local reminders, and reminder counters',
  'App PIN/biometric lock, security settings, and on-device audit log',
  'Optional provider or workspace demo data (only if that build option was enabled on this device)',
];

export function formatDeleteAccountDetailsMessage(): string {
  const bullets = DELETE_ACCOUNT_DATA_BULLETS.map((line) => `• ${line}`).join('\n');
  return `${DELETE_ACCOUNT_INTRO}\n\nThis removes:\n${bullets}\n\nThis cannot be undone. You will set up the app again from the beginning.`;
}

export function formatRemoveAllAppDataDetailsMessage(): string {
  const bullets = DELETE_ACCOUNT_DATA_BULLETS.map((line) => `• ${line}`).join('\n');
  return `${REMOVE_ALL_APP_DATA_INTRO}\n\nThis removes:\n${bullets}\n\nThis cannot be undone. You will set up the app again from the beginning.`;
}

export const CLEAR_LOCAL_DIAGNOSTICS_INTRO =
  'This clears on-device diagnostics, prediction caches, and wizard engagement memory. It does not delete your profile, check-ins, journal, pledges, contacts, or locally saved connection details.';

export const CLEAR_LOCAL_DIAGNOSTICS_BULLETS: readonly string[] = [
  'Security audit log',
  'Risk, retention, and stage-detection caches',
  'Behavioral notification counters and background session timing',
  'Wizard / quick-start engagement history used to tune prompts',
];

export function formatClearLocalDiagnosticsMessage(): string {
  const bullets = CLEAR_LOCAL_DIAGNOSTICS_BULLETS.map((line) => `• ${line}`).join('\n');
  return `${CLEAR_LOCAL_DIAGNOSTICS_INTRO}\n\nRemoved:\n${bullets}`;
}
