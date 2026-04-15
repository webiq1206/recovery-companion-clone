import Constants from 'expo-constants';

/**
 * True when JS runs inside the Expo Go developer client (not a standalone store or dev-client binary).
 * Expo Go always injects a non-null expoVersion.
 */
export function isExpoGo(): boolean {
  return Constants.expoVersion != null;
}
