/**
 * RevenueCat alignment helpers for docs and UI mapping.
 * Entitlement id must match the entitlement configured in the RevenueCat dashboard.
 */

/**
 * Premium entitlement identifier in RevenueCat (case- and space-sensitive).
 * Override via EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID when dashboard id differs.
 */
export const REVENUECAT_PRO_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'RecoveryRoad Pro';

export const REVENUECAT_ENTITLEMENT_ENV_KEY = 'EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID' as const;

/** Env variable names for public SDK keys (Expo injects at build time). */
export const REVENUECAT_PUBLIC_ENV_KEYS = {
  ios: 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  android: 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
} as const;

/**
 * RevenueCat default offering package identifiers recognized by the custom paywall UI
 * (hosted paywall / offerings UI) for friendly labels.
 */
export const REVENUECAT_STANDARD_PACKAGE_IDENTIFIERS = [
  '$rc_monthly',
  '$rc_annual',
  '$rc_lifetime',
] as const;
