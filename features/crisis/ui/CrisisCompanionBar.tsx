import React from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { crisisStyles, CRISIS_COLORS } from './styles';

export function CrisisCompanionBar(props: {
  companionFade: Animated.Value;
  message: string;
  /** When omitted, the bar is informational only (no link affordance). */
  onPress?: () => void;
}) {
  const { companionFade, message, onPress } = props;

  const inner = (
    <>
      <View style={crisisStyles.companionBarDot} />
      <Text style={crisisStyles.companionBarText} numberOfLines={2}>
        {message}
      </Text>
      {onPress ? <ChevronRight size={16} color={CRISIS_COLORS.MUTED} /> : null}
    </>
  );

  return (
    <Animated.View style={[crisisStyles.companionBar, { opacity: companionFade }]}>
      {onPress ? (
        <Pressable
          style={({ pressed }) => [crisisStyles.companionBarInner, pressed && { opacity: 0.85 }]}
          onPress={onPress}
          testID="crisis-companion-btn"
        >
          {inner}
        </Pressable>
      ) : (
        <View style={crisisStyles.companionBarInner} testID="crisis-companion-message">
          {inner}
        </View>
      )}
    </Animated.View>
  );
}

