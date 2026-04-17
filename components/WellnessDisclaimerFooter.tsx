import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Shield } from 'lucide-react-native';
import Colors from '../constants/colors';
import { WELLNESS_APP_DISCLAIMER } from '../constants/wellnessDisclaimer';

/** Canonical non-medical disclaimer for long-form education / explainer screens. */
export function WellnessDisclaimerFooter(props?: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.wrap, props?.style]} testID="wellness-disclaimer-footer">
      <Shield size={16} color={Colors.textMuted} style={styles.icon} />
      <Text style={styles.text}>{WELLNESS_APP_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(46,196,182,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,182,0.22)',
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
