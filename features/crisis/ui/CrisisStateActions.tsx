import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { crisisStyles } from './styles';

export type CrisisStateId = 'craving' | 'panic' | 'shame' | 'urge';

interface Props {
  selectedState: CrisisStateId | null;
  onSelectState: (state: CrisisStateId) => void;
}

export function CrisisStateActions({
  selectedState,
  onSelectState,
}: Props) {
  return (
    <View style={crisisStyles.stateActionsContainer}>
      <Text style={crisisStyles.stateLabel}>What feels most true right now?</Text>
      <View style={crisisStyles.statePillsRow}>
        {(['craving', 'panic', 'shame', 'urge'] as CrisisStateId[]).map((state) => {
          const isActive = state === selectedState;
          const label =
            state === 'craving'
              ? 'Craving'
              : state === 'panic'
                ? 'Panic'
                : state === 'shame'
                  ? 'Shame'
                  : 'Urge to relapse';
          return (
            <Pressable
              key={state}
              style={({ pressed }) => [
                crisisStyles.statePill,
                isActive && crisisStyles.statePillActive,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => onSelectState(state)}
              testID={`crisis-state-${state}`}
            >
              <Text
                style={[
                  crisisStyles.statePillLabel,
                  isActive && crisisStyles.statePillLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

