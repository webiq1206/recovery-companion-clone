import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRelapse } from '@/core/domains/useRelapse';

/** Warm red — distinct but not alarming (not neon) */
const CRISIS_STRIP_COLOR = '#B85454';

const TAB_BAR_HEIGHT = 49;

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#0D1B2A',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(184,84,84,0.3)',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CRISIS_STRIP_COLOR,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export function CrisisStrip() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logCrisisActivation } = useRelapse();
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.strip, { bottom: bottomOffset }]}>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          logCrisisActivation?.();
          router.push('/crisis-mode' as any);
        }}
        testID="crisis-strip-btn"
      >
        <ShieldAlert size={18} color="#FFFFFF" />
        <Text style={styles.btnText}>I need help now</Text>
      </Pressable>
    </View>
  );
}
