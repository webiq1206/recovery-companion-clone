import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack } from 'expo-router';
import { Info } from 'lucide-react-native';
import Colors from '../constants/colors';
import { ComprehensiveStabilityExplainerContent } from '../components/insights/ComprehensiveStabilityExplainerContent';
import { WellnessDisclaimerFooter } from '../components/WellnessDisclaimerFooter';

export default function ComprehensiveStabilityExplainedScreen() {
  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="comprehensive-stability-explained-screen"
    >
      <Stack.Screen options={{ title: 'Comprehensive Stability Explained' }} />

      <View style={styles.introCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.introText}>
          How your Comprehensive Stability score is built from daily check-ins and what each part means.
        </Text>
      </View>

      <ComprehensiveStabilityExplainerContent />

      <WellnessDisclaimerFooter style={{ marginTop: 20 }} />

      <View style={{ height: 20 }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
});
