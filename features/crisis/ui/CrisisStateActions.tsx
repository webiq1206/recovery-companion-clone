import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Activity, HeartPulse, Phone, Walk } from 'lucide-react-native';

import { crisisStyles, CRISIS_COLORS } from './styles';

export type CrisisStateId = 'craving' | 'panic' | 'shame' | 'urge';

interface Props {
  selectedState: CrisisStateId | null;
  onSelectState: (state: CrisisStateId) => void;
  onBreathing: () => void;
  onTimer: () => void;
  onContactSupport: () => void;
  onLeaveEnvironment: () => void;
}

export function CrisisStateActions({
  selectedState,
  onSelectState,
  onBreathing,
  onTimer,
  onContactSupport,
  onLeaveEnvironment,
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

      <Text style={crisisStyles.stateLabelSecondary}>Pick one small action to try:</Text>

      <View style={crisisStyles.stateActionsList}>
        <Pressable
          style={({ pressed }) => [
            crisisStyles.stateActionCard,
            pressed && { opacity: 0.9 },
          ]}
          onPress={onTimer}
          testID="crisis-action-timer"
        >
          <View style={crisisStyles.stateActionIcon}>
            <Activity size={18} color={CRISIS_COLORS.ACCENT} />
          </View>
          <View style={crisisStyles.stateActionTextWrap}>
            <Text style={crisisStyles.stateActionTitle}>2-minute timer</Text>
            <Text style={crisisStyles.stateActionSubtitle}>
              Stay with the wave — urges crest and fall.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            crisisStyles.stateActionCard,
            pressed && { opacity: 0.9 },
          ]}
          onPress={onBreathing}
          testID="crisis-action-breathing"
        >
          <View style={crisisStyles.stateActionIcon}>
            <HeartPulse size={18} color={CRISIS_COLORS.ACCENT} />
          </View>
          <View style={crisisStyles.stateActionTextWrap}>
            <Text style={crisisStyles.stateActionTitle}>Guided breathing</Text>
            <Text style={crisisStyles.stateActionSubtitle}>
              Slow your body so your mind can follow.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            crisisStyles.stateActionCard,
            pressed && { opacity: 0.9 },
          ]}
          onPress={onContactSupport}
          testID="crisis-action-contact"
        >
          <View style={crisisStyles.stateActionIcon}>
            <Phone size={18} color={CRISIS_COLORS.ACCENT} />
          </View>
          <View style={crisisStyles.stateActionTextWrap}>
            <Text style={crisisStyles.stateActionTitle}>Contact support</Text>
            <Text style={crisisStyles.stateActionSubtitle}>
              Reach out to someone who can help you ride this out.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            crisisStyles.stateActionCard,
            pressed && { opacity: 0.9 },
          ]}
          onPress={onLeaveEnvironment}
          testID="crisis-action-leave"
        >
          <View style={crisisStyles.stateActionIcon}>
            <Walk size={18} color={CRISIS_COLORS.ACCENT} />
          </View>
          <View style={crisisStyles.stateActionTextWrap}>
            <Text style={crisisStyles.stateActionTitle}>Leave this environment</Text>
            <Text style={crisisStyles.stateActionSubtitle}>
              Step outside, change rooms, or move your body away from the trigger.
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

