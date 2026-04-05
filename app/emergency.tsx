import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ShieldAlert, Phone, MessageCircle, Heart, ArrowLeft, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';

const TOTAL_SECONDS = 90;

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: secondsLeft / TOTAL_SECONDS,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${minutes}:${secs.toString().padStart(2, '0')}`;

  const handleTrustedContact = (type: 'call' | 'text') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[Emergency] Trusted contact action:', type);
  };

  const handleBackToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/home' as any);
  };

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBackToToday}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          hitSlop={12}
        >
          <ArrowLeft size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headline}>You’re safe right now.</Text>
          <Text style={styles.subheadline}>
            Let’s slow things down together. You don’t have to decide anything in this moment.
          </Text>
        </View>
      </View>

      {/* Breathing timer */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Heart size={18} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>90-second breathing</Text>
        </View>
        <Text style={styles.cardBody}>
          Breathe in for 4, hold for 4, out for 6. Let your shoulders drop a little more each breath.
        </Text>
        <View style={styles.timerCircle}>
          <Text style={styles.timerLabel}>Remaining</Text>
          <Text style={styles.timerValue}>{display}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: widthInterpolated }]} />
        </View>
        <Text style={styles.progressHint}>
          If your mind wanders, that’s okay. Just gently come back to the next breath.
        </Text>
      </View>

      {/* Grounding steps */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <ShieldAlert size={18} color="#FFC107" />
          </View>
          <Text style={styles.cardTitle}>Grounding steps</Text>
        </View>
        <Text style={styles.cardBody}>
          Move through these at your own pace. You can pause between each step.
        </Text>

        <GroundingStep
          title="Notice your surroundings"
          description="Gently look around and name 3 things you can see and 3 things you can hear."
        />
        <GroundingStep
          title="Feel the support beneath you"
          description="Press your feet into the floor or notice the chair beneath you. Let yourself be held."
        />
        <GroundingStep
          title="Place one hand on your chest"
          description="Feel your hand rise and fall with your breathing. Remind yourself: “I am here. I am allowed to rest.”"
        />
      </View>

      {/* Trusted contact + resources */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reach toward support</Text>
        <Text style={styles.cardBody}>
          You are not a burden. If you can, let someone know you’re having a hard moment.
        </Text>

        <View style={styles.trustedRow}>
          <Pressable
            style={({ pressed }) => [
              styles.trustedButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => handleTrustedContact('call')}
          >
            <Phone size={18} color={Colors.white} />
            <Text style={styles.trustedText}>Call trusted contact</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.trustedButtonSecondary,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => handleTrustedContact('text')}
          >
            <MessageCircle size={18} color={Colors.primary} />
            <Text style={styles.trustedTextSecondary}>Text trusted contact</Text>
          </Pressable>
        </View>

        <View style={styles.resourcesBox}>
          <Text style={styles.resourcesTitle}>Crisis resources</Text>
          <Text style={styles.resourcesText}>
            • 988 Suicide & Crisis Lifeline (US){'\n'}
            • Local emergency services in your area{'\n'}
            • A trusted friend, family member, sponsor, or support person
          </Text>
          <Text style={styles.resourcesNote}>
            If you’re in immediate danger or thinking about harming yourself, please reach out to emergency services or a crisis line right now.
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.backToTodayButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={handleBackToToday}
      >
        <Text style={styles.backToTodayText}>Return to Today screen</Text>
      </Pressable>
    </View>
  );
}

function GroundingStep({ title, description }: { title: string; description: string }) {
  const [done, setDone] = useState(false);

  return (
    <Pressable
      onPress={() => setDone((v) => !v)}
      style={({ pressed }) => [
        styles.groundingRow,
        pressed && { opacity: 0.9 },
      ]}
      hitSlop={8}
    >
      <View style={[styles.groundingCheck, done && styles.groundingCheckDone]}>
        {done && <Check size={14} color={Colors.background} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.groundingTitle}>{title}</Text>
        <Text style={styles.groundingDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subheadline: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cardBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  timerCircle: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.primary,
  },
  progressHint: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  groundingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  groundingCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  groundingCheckDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  groundingTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  groundingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  trustedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  trustedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  trustedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  trustedButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  trustedTextSecondary: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  resourcesBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  resourcesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  resourcesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  resourcesNote: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  backToTodayButton: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backToTodayText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});

