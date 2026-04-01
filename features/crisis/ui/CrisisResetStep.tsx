import React from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight, Brain } from 'lucide-react-native';

import { RESET_PROMPTS } from './constants';
import { crisisStyles, CRISIS_COLORS } from './styles';

export function CrisisResetStep(props: {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  resetIndex: number;
  onNext: () => void;
}) {
  const { fadeAnim, slideAnim, resetIndex, onNext } = props;

  return (
    <Animated.View
      style={[crisisStyles.crisisStepSingleScrollOuter, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={crisisStyles.crisisStepFullScrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={crisisStyles.stepLabel}>Reset</Text>
        <Text style={[crisisStyles.stepHint, crisisStyles.crisisStepFitHint]}>Read slowly. Let each word sink in.</Text>

        <View style={crisisStyles.crisisResetCardCompact}>
          <Brain size={28} color={CRISIS_COLORS.ACCENT} style={{ marginBottom: 10 }} />
          <Text style={crisisStyles.crisisResetPromptCompact}>{RESET_PROMPTS[resetIndex]}</Text>
        </View>

        <Text style={crisisStyles.crisisResetCounterCompact}>
          {resetIndex + 1} of {RESET_PROMPTS.length}
        </Text>

        <Pressable
          style={({ pressed }) => [crisisStyles.crisisBigButtonCompact, pressed && crisisStyles.bigButtonPressed]}
          onPress={onNext}
          testID="crisis-next-reset"
        >
          <Text style={crisisStyles.bigButtonText}>{resetIndex < RESET_PROMPTS.length - 1 ? 'Next' : 'Continue'}</Text>
          <ArrowRight size={22} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}
