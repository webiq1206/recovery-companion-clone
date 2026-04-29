import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRelapse } from '../core/domains/useRelapse';
import { isExpoGo } from '../utils/runtime';

/** Higher threshold reduces accidental triggers (walking, commuting). */
const SHAKE_THRESHOLD = 7.0;
const SHAKE_COOLDOWN_MS = 2000;

/**
 * Listens for device shake on native and opens crisis mode. No-op on web.
 * Mount once at app root (e.g. in _layout) so it works from anywhere.
 *
 * Disabled in Expo Go: Expo Go already maps shake to the Expo developer menu, which cannot
 * be turned off from JS; we avoid also navigating to crisis on the same gesture.
 */
export function useShakeToCrisis() {
  const router = useRouter();
  const { logCrisisActivation } = useRelapse();
  const lastShakeTime = useRef(0);
  const lastAcc = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (isExpoGo()) return;

    let subscription: { remove: () => void } | null = null;

    import('expo-sensors').then(({ Accelerometer }) => {
      Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener((data) => {
        const { x, y, z } = data;
        const prev = lastAcc.current;
        const delta = Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z);
        lastAcc.current = { x, y, z };

        if (delta > SHAKE_THRESHOLD) {
          const now = Date.now();
          if (now - lastShakeTime.current > SHAKE_COOLDOWN_MS) {
            lastShakeTime.current = now;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            logCrisisActivation?.();
            router.push('/crisis-mode' as any);
          }
        }
      });
    }).catch(() => {});

    return () => {
      subscription?.remove();
    };
  }, [router]);
}
