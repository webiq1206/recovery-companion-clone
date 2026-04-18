import { RECOVERY_KEYS_TO_CLEAR } from './persistence/recovery';

/**
 * AsyncStorage keys removed on "delete account" / full local wipe (store submission).
 * RECOVERY_KEYS_TO_CLEAR is merged in at runtime — do not duplicate those here.
 */
export const ACCOUNT_DELETION_EXTRA_ASYNC_STORAGE_KEYS: readonly string[] = [
  'recovery-app-store',
  'subscription_state',
  'rc_user_id',
  'live_social_access_token',
  'live_social_device_id',
  'connection_trusted_contacts',
  'connection_peer_chats',
  'connection_safe_rooms',
  'connection_sponsor_pairing',
  'connection_display_name',
  'connection_blocked_peer_names',
  'connection_blocked_room_authors',
  'connection_local_ugc_reports',
  'community_user',
  'community_posts',
  'community_comments',
  'community_users',
  'community_groups',
  'recovery_rooms_data',
  'recovery_rooms_reports',
  'recovery_rooms_user_id',
  'recovery_rooms_anonymous',
  'recovery_rooms_display_name',
  'recovery_rooms_blocked_authors',
  'recovery_rooms_blocked_author_ids',
  'recovery_anonymous_chat_identity_v1',
  'smart_entry_banner_dismissed_day',
  'risk_prediction_data',
  'recovery:wizard_behavior',
  'behavioral_notification_state',
  'engagement_data',
  'therapist_portal_data',
  'enterprise_data',
  'stage_detection_data',
  'retention_data',
  'ro_provider_mode_enabled',
  'ro_security_settings',
  'ro_audit_log',
  'ro_analytics_events',
  'ro_background_time',
];

export function getAllAccountDeletionAsyncStorageKeys(): string[] {
  return [...new Set([...RECOVERY_KEYS_TO_CLEAR, ...ACCOUNT_DELETION_EXTRA_ASYNC_STORAGE_KEYS])];
}

/**
 * Keys cleared by `clearDiagnosticsCaches` only (not profile, journal, check-ins, etc.).
 * Wizard behavior uses `recovery:wizard_behavior` and is reset via the wizard store.
 */
export const LOCAL_DIAGNOSTICS_CACHE_ASYNC_STORAGE_KEYS: readonly string[] = [
  'ro_audit_log',
  'ro_analytics_events',
  'ro_background_time',
  'risk_prediction_data',
  'retention_data',
  'stage_detection_data',
  'behavioral_notification_state',
];
