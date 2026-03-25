import React from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { ArrowRight, Heart, Phone } from 'lucide-react-native';

import { crisisStyles, CRISIS_COLORS } from './styles';
import type { EmergencyContact } from '@/types';

export function CrisisLandingStep(props: {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  landingPulse: Animated.Value;
  emergencyContacts: EmergencyContact[];
  onStart: () => void;
  onQuickCall: (phone: string) => void;
  onCall988: () => void;
}) {
  const { fadeAnim, landingPulse, emergencyContacts, onStart, onQuickCall, onCall988 } = props;

  return (
    <Animated.View style={[crisisStyles.landingStepContainer, { opacity: fadeAnim }]}>
      <Animated.View style={[crisisStyles.landingCircle, { opacity: landingPulse }]}>
        <Heart size={56} color={CRISIS_COLORS.ACCENT} />
      </Animated.View>
      <Text style={crisisStyles.landingTitle}>You're safe.</Text>
      <Text style={crisisStyles.landingSubtitle}>
        This feeling will pass.{'\n'}Let's walk through this together.
      </Text>
      <Pressable
        style={({ pressed }) => [crisisStyles.bigButton, pressed && crisisStyles.bigButtonPressed]}
        onPress={onStart}
        testID="crisis-start"
      >
        <Text style={crisisStyles.bigButtonText}>I'm ready</Text>
        <ArrowRight size={24} color="#FFFFFF" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [crisisStyles.emergencyCallBtn, pressed && { opacity: 0.7 }]}
        onPress={onCall988}
        testID="crisis-988"
      >
        <Phone size={18} color="#EF5350" />
        <Text style={crisisStyles.emergencyCallText}>988 Crisis Lifeline</Text>
      </Pressable>
    </Animated.View>
  );
}

