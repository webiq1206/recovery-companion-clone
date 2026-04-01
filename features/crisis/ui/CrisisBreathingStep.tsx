import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { CRISIS_BREATH_MAX_CYCLES } from './constants';
import { crisisStyles, CRISIS_COLORS } from './styles';

export function CrisisBreathingStep(props: {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  breathPhase: 'in' | 'hold' | 'out';
  breathTimer: number;
  breathCount: number;
  breathCircleAnim: Animated.Value;
  breathColor: string;
  breathingComplete: boolean;
  onContinue: () => void;
}) {
  const {
    fadeAnim,
    slideAnim,
    breathPhase,
    breathTimer,
    breathCount,
    breathCircleAnim,
    breathColor,
    breathingComplete,
    onContinue,
  } = props;

  const breathLabel = breathPhase === 'in' ? 'Breathe In' : breathPhase === 'hold' ? 'Hold' : 'Breathe Out';

  const cycleDisplay = Math.min(breathCount + 1, CRISIS_BREATH_MAX_CYCLES);

  return (
    <Animated.View
      style={[crisisStyles.breathingStepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={crisisStyles.breathingStepScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={crisisStyles.stepLabel}>Breathe</Text>
        <Text style={[crisisStyles.stepHint, styles.breathingHintTight]}>Follow the circle</Text>

        <View style={crisisStyles.crisisBreathWrapper}>
          <Animated.View
            style={[
              crisisStyles.crisisBreathCircle,
              {
                borderColor: breathColor,
                transform: [{ scale: breathCircleAnim }],
              },
            ]}
          >
            <Text style={[crisisStyles.crisisBreathPhaseText, { color: breathColor }]}>{breathLabel}</Text>
            <Text style={crisisStyles.crisisBreathTimerText}>{breathTimer}</Text>
          </Animated.View>
        </View>

        <Text style={[crisisStyles.breathMetaText, styles.cycleLineSpacing]}>
          Cycle {cycleDisplay} of {CRISIS_BREATH_MAX_CYCLES}
        </Text>

        {breathingComplete ? (
          <Pressable
            style={({ pressed }) => [crisisStyles.continueBtnComplete, pressed && { opacity: 0.92 }]}
            onPress={onContinue}
            testID="crisis-skip-breathing"
          >
            <Text style={crisisStyles.continueBtnCompleteText}>Continue</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [crisisStyles.breathContinueRow, pressed && { opacity: 0.65 }]}
            onPress={onContinue}
            hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            testID="crisis-skip-breathing"
          >
            <Text style={crisisStyles.breathMetaText}>Continue</Text>
            <ChevronRight size={16} color={CRISIS_COLORS.MUTED} />
          </Pressable>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
  },
  breathingHintTight: {
    marginBottom: 14,
  },
  cycleLineSpacing: {
    marginBottom: 6,
  },
});
