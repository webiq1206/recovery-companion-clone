import React from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Check, ChevronRight, Cookie, Ear, Eye, Flower2, Hand } from 'lucide-react-native';

import { crisisStyles, CRISIS_COLORS } from './styles';
import { GROUNDING_STEPS } from './constants';

function GroundingIcon({ type, size, color }: { type: string; size: number; color: string }) {
  switch (type) {
    case 'eye':
      return <Eye size={size} color={color} />;
    case 'hand':
      return <Hand size={size} color={color} />;
    case 'ear':
      return <Ear size={size} color={color} />;
    case 'flower':
      return <Flower2 size={size} color={color} />;
    case 'taste':
      return <Cookie size={size} color={color} />;
    default:
      return <Eye size={size} color={color} />;
  }
}

export function CrisisGroundingStep(props: {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  groundingIndex: number;
  groundingChecked: number[];
  onCheck: (idx: number) => void;
  onSkip: () => void;
}) {
  const { fadeAnim, slideAnim, groundingIndex, groundingChecked, onCheck, onSkip } = props;
  const current = GROUNDING_STEPS[groundingIndex];
  const items = Array.from({ length: current.count }, (_, i) => i);

  return (
    <Animated.View style={[crisisStyles.crisisStepFitOuter, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={crisisStyles.crisisStepFitHeader}>
        <Text style={crisisStyles.stepLabel}>Ground Yourself</Text>
        <Text style={[crisisStyles.stepHint, crisisStyles.crisisStepFitHint]}>Focus on your senses</Text>
      </View>

      <View style={crisisStyles.crisisStepFitMain}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={crisisStyles.crisisStepFitMainScrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[crisisStyles.crisisGroundingIconWrap, { backgroundColor: current.color + '15' }]}>
            <GroundingIcon type={current.icon} size={32} color={current.color} />
          </View>

          <Text style={[crisisStyles.crisisGroundingSense, { color: current.color }]}>{current.sense}</Text>
          <Text style={crisisStyles.crisisGroundingPrompt}>{current.prompt}</Text>

          <View style={crisisStyles.crisisGroundingChecks}>
            {items.map((i) => {
              const checked = groundingChecked.includes(i);
              return (
                <Pressable
                  key={i}
                  style={[
                    crisisStyles.crisisGroundingCheckItem,
                    checked && { backgroundColor: current.color + '25', borderColor: current.color },
                  ]}
                  onPress={() => onCheck(i)}
                  testID={`grounding-check-${i}`}
                >
                  {checked ? (
                    <Check size={24} color={current.color} />
                  ) : (
                    <Text style={crisisStyles.crisisGroundingCheckNum}>{i + 1}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={crisisStyles.crisisGroundingProgress}>
            {GROUNDING_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  crisisStyles.groundingDot,
                  i === groundingIndex && { backgroundColor: current.color, width: 22 },
                  i < groundingIndex && { backgroundColor: CRISIS_COLORS.ACCENT },
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={crisisStyles.crisisStepFitFooter}>
        <Pressable
          style={({ pressed }) => [crisisStyles.continueBtn, { marginTop: 0 }, pressed && { opacity: 0.7 }]}
          onPress={onSkip}
          testID="crisis-skip-grounding"
        >
          <Text style={crisisStyles.continueBtnText}>Skip</Text>
          <ChevronRight size={20} color={CRISIS_COLORS.MUTED} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
