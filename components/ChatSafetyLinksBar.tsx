import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';

const REPORT_BODY =
  'Long-press a message from someone else to report it. You can also read what counts as abuse in Community guidelines.';

const BLOCK_BODY =
  'Long-press a message from someone else, then choose Block to stop seeing that person’s messages on this device.';

export type ChatSafetyLinksBarTone = 'light' | 'dark';

type Props = {
  tone?: ChatSafetyLinksBarTone;
  style?: StyleProp<ViewStyle>;
  /** When false, no bottom hairline (e.g. inside a rounded bordered card). */
  showBottomDivider?: boolean;
  testID?: string;
};

export function ChatSafetyLinksBar({
  tone = 'light',
  style,
  showBottomDivider = true,
  testID = 'chat-safety-links-bar',
}: Props) {
  const router = useRouter();
  const isDark = tone === 'dark';

  const openGuidelines = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/community-guidelines' as never);
  }, [router]);

  const onReport = useCallback(() => {
    void Haptics.selectionAsync();
    Alert.alert('Report abuse', REPORT_BODY, [
      { text: 'OK', style: 'cancel' },
      { text: 'Guidelines', onPress: openGuidelines },
    ]);
  }, [openGuidelines]);

  const onBlock = useCallback(() => {
    void Haptics.selectionAsync();
    Alert.alert('Block users', BLOCK_BODY, [
      { text: 'OK', style: 'cancel' },
      { text: 'Guidelines', onPress: openGuidelines },
    ]);
  }, [openGuidelines]);

  const linkWrapStyle = ({ pressed }: { pressed: boolean }) => [
    pressed && styles.linkPressed,
    Platform.OS === 'web' && ({ cursor: 'pointer' } as object),
  ];

  return (
    <View
      style={[
        styles.wrap,
        isDark ? styles.wrapDark : styles.wrapLight,
        !showBottomDivider && styles.noBottomDivider,
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Report abuse, Block users, Guidelines"
      testID={testID}
    >
      <Pressable
        onPress={onReport}
        hitSlop={6}
        accessibilityRole="link"
        accessibilityLabel="Report abuse"
        style={linkWrapStyle}
      >
        <Text style={styles.link}>Report abuse</Text>
      </Pressable>
      <Text style={[styles.sep, isDark && styles.sepDark]}> - </Text>
      <Pressable
        onPress={onBlock}
        hitSlop={6}
        accessibilityRole="link"
        accessibilityLabel="Block users"
        style={linkWrapStyle}
      >
        <Text style={styles.link}>Block users</Text>
      </Pressable>
      <Text style={[styles.sep, isDark && styles.sepDark]}> - </Text>
      <Pressable
        onPress={openGuidelines}
        hitSlop={6}
        accessibilityRole="link"
        accessibilityLabel="Guidelines"
        style={linkWrapStyle}
      >
        <Text style={styles.link}>Guidelines</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noBottomDivider: {
    borderBottomWidth: 0,
  },
  wrapLight: {
    backgroundColor: Colors.cardBackground,
    borderBottomColor: Colors.border,
  },
  wrapDark: {
    backgroundColor: '#12151a',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.1,
  },
  sep: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  sepDark: {
    color: 'rgba(255,255,255,0.4)',
  },
  linkPressed: {
    opacity: 0.82,
  },
});
