import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';

export type ConnectSafetyGuidelinesStripTone = 'light' | 'dark';

const DEFAULT_TITLE = 'Report abuse · Block users · Guidelines';
const DEFAULT_SUBTITLE =
  'Tap for Connect safety guidelines, enforcement, escalation, and how moderation review works.';

type Props = {
  tone?: ConnectSafetyGuidelinesStripTone;
  /** Softer card on light-tan chat chrome (header band). */
  surface?: 'default' | 'onTan';
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ConnectSafetyGuidelinesStrip({
  tone = 'light',
  surface = 'default',
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  style,
  testID = 'connect-safety-guidelines-strip',
}: Props) {
  const router = useRouter();
  const isDark = tone === 'dark';
  const stripSurface =
    surface === 'onTan' && !isDark ? styles.stripLightOnTan : isDark ? styles.stripDark : styles.stripLight;

  const onPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/community-guidelines' as never);
  }, [router]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.strip,
        stripSurface,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Flag size={16} color={Colors.danger} />
      <View style={styles.textCol}>
        <Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={16} color={isDark ? 'rgba(255,255,255,0.42)' : Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  stripLight: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderColor: 'rgba(239,83,80,0.22)',
  },
  stripLightOnTan: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(90,70,50,0.12)',
  },
  stripDark: {
    backgroundColor: 'rgba(239,83,80,0.14)',
    borderColor: 'rgba(239,83,80,0.32)',
  },
  pressed: {
    opacity: 0.9,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  titleDark: {
    color: '#F2F3F5',
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  subtitleDark: {
    color: 'rgba(139,145,154,0.95)',
  },
});
