import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Anchor,
  HeartHandshake,
  Layers,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
import Colors from '../../../constants/colors';
import { hairline, radius, shadows, spacing } from '../../../constants/theme';
import { RECOVERY_PATHS, type RecoveryPathId, type RecoveryPathMeta } from '../../../constants/recoveryPaths';

const CHAT_ROOM_ID_BY_PATH: Record<RecoveryPathId, string> = {
  stabilize: 'stabilize-chat',
  build_control: 'maintain-chat',
  repair_life: 'rebuild-chat',
  heal_deep: 'heal-chat',
  grow_forward: 'grow-chat',
  give_back: 'give-back-chat',
};

function chatBlockTitle(path: RecoveryPathMeta): string {
  switch (path.id) {
    case 'repair_life':
      return 'Rebuild';
    case 'heal_deep':
      return 'Heal';
    case 'grow_forward':
      return 'Grow';
    default:
      return path.title;
  }
}

type PathIconProps = { color: string; size: number };

function iconForPath(id: RecoveryPathId): React.ComponentType<PathIconProps> {
  switch (id) {
    case 'stabilize':
      return Anchor;
    case 'build_control':
      return SlidersHorizontal;
    case 'repair_life':
      return Layers;
    case 'heal_deep':
      return Sparkles;
    case 'grow_forward':
      return TrendingUp;
    case 'give_back':
      return HeartHandshake;
  }
}

export default function ConnectionChatPathsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: spacing.xs }]}>
      <ScreenScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Each path groups themed practice rooms. Tap a room to open the chat space.
        </Text>

        {RECOVERY_PATHS.map((path) => (
          <PathSection key={path.id} path={path} />
        ))}
      </ScreenScrollView>
    </View>
  );
}

function PathSection({ path }: { path: RecoveryPathMeta }) {
  const Icon = iconForPath(path.id);
  const router = useRouter();
  const roomId = CHAT_ROOM_ID_BY_PATH[path.id];
  const blockTitle = chatBlockTitle(path);

  const openLinkedChat = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/recovery-paths/chat-room',
      params: { roomId },
    } as never);
  }, [router, roomId]);

  const cardBody = (
    <View style={styles.pathCard}>
      <View style={styles.pathCardTop}>
        <View style={styles.iconRing}>
          <Icon color={Colors.primary} size={22} />
        </View>
        <View style={styles.pathTextCol}>
          {path.id === 'build_control' ? (
            <>
              <Text style={styles.phase}>DAYS 30-90</Text>
              <Text style={styles.pathTitle}>{path.title}</Text>
              <Text style={styles.pathDescription}>{path.description}</Text>
            </>
          ) : (
            <>
              <Text style={styles.phase}>{path.phase}</Text>
              <Text style={styles.pathTitle}>{blockTitle}</Text>
              <Text style={styles.pathDescription}>{path.description}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const a11yOpenChat = `Open ${blockTitle} chat`;

  return (
    <View style={styles.pathBlock}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={a11yOpenChat}
        onPress={openLinkedChat}
        style={({ pressed }) => [
          pressed && styles.pathCardPressablePressed,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as object),
        ]}
      >
        {cardBody}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  lead: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  pathBlock: {
    marginBottom: spacing.md,
  },
  pathCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
    ...shadows.soft,
  },
  pathCardPressablePressed: {
    opacity: 0.92,
  },
  pathCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary + '35',
  },
  pathTextCol: {
    flex: 1,
    minWidth: 0,
  },
  phase: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  pathTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: spacing.xxs,
  },
  pathDescription: {
    marginTop: spacing.xxs,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
