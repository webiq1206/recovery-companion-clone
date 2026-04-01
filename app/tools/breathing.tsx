import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useToolUsageStore } from '@/features/tools/state/useToolUsageStore';

type BreathPhase = 'in' | 'hold' | 'out';

const MAX_CYCLES = 8;

export default function BreathingToolScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logToolUsage = useToolUsageStore.use.logToolUsage();

  const [breathPhase, setBreathPhase] = useState<BreathPhase>('in');
  const [breathTimer, setBreathTimer] = useState(4);
  const [breathCount, setBreathCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const circleAnim = useRef(new Animated.Value(0.4)).current;
  const phaseRef = useRef<BreathPhase>('in');
  const cycleRef = useRef<number>(0);

  useEffect(() => {
    phaseRef.current = breathPhase;
  }, [breathPhase]);

  useEffect(() => {
    cycleRef.current = breathCount;
  }, [breathCount]);

  useEffect(() => {
    logToolUsage({ toolId: 'breathing', context: 'any', action: 'opened' });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, logToolUsage]);

  useEffect(() => {
    if (isComplete) return;
    const phaseDurations: Record<BreathPhase, number> = { in: 4, hold: 4, out: 6 };
    const duration = phaseDurations[breathPhase];
    setBreathTimer(duration);

    if (breathPhase === 'in') {
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: true,
      }).start();
    } else if (breathPhase === 'out') {
      Animated.timing(circleAnim, {
        toValue: 0.4,
        duration: duration * 1000,
        useNativeDriver: true,
      }).start();
    }

    let cleared = false;
    const countdown = setInterval(() => {
      if (cleared) return;
      setBreathTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          cleared = true;
          const current = phaseRef.current;
          if (current === 'in') {
            setBreathPhase('hold');
          } else if (current === 'hold') {
            setBreathPhase('out');
          } else {
            const nextCycle = cycleRef.current + 1;
            if (nextCycle >= MAX_CYCLES) {
              setIsComplete(true);
            } else {
              setBreathCount(nextCycle);
              setBreathPhase('in');
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cleared = true;
      clearInterval(countdown);
    };
  }, [breathPhase, isComplete]);

  const breathLabel =
    breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out';

  const breathColor = breathPhase === 'out' ? '#FF9F1C' : Colors.primary;

  function handleDone() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logToolUsage({
      toolId: 'breathing',
      context: 'any',
      action: 'completed',
      meta: { cycles: Math.min(breathCount + 1, MAX_CYCLES) },
    });
    router.back();
  }

  const cycleNumber = Math.min(breathCount + 1, MAX_CYCLES);

  return (
    <View
      style={[
        styles.container,
        // Keep content below the top step indicator and above bottom overlay content.
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Stack.Screen
        options={{
          title: 'Calm breathing',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.label}>FOLLOW THE CIRCLE</Text>
        <Text style={styles.title}>4-4-6 Breathing</Text>
        <Text style={styles.subtitle}>
          Breathe in for 4, hold for 4, and breathe out for 6. Stay with the circle.
        </Text>

        <View style={styles.circleWrapper}>
          <Animated.View
            style={[
              styles.circle,
              {
                borderColor: breathColor,
                transform: [{ scale: circleAnim }],
              },
            ]}
          >
            <Text style={[styles.phaseText, { color: breathColor }]}>{breathLabel}</Text>
            <Text style={styles.timerText}>{breathTimer}</Text>
          </Animated.View>
        </View>

        <Text style={styles.cycleText}>
          Cycle {cycleNumber} of {MAX_CYCLES}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            isComplete && styles.buttonComplete,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleDone}
          testID="breathing-tool-done"
        >
          <Text style={styles.buttonText}>{isComplete ? 'Continue' : 'I feel a bit calmer'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  circleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  phaseText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
  },
  cycleText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  button: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  buttonComplete: {
    backgroundColor: Colors.accentWarm,
    borderWidth: 1,
    borderColor: Colors.accentWarm + '55',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});

