import React, { useCallback, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Anchor,
  HeartHandshake,
  Layers,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenScrollView } from "../ScreenScrollView";
import { RECOVERY_PATHS, type RecoveryPathId, type RecoveryPathMeta } from "../../constants/recoveryPaths";

const PREMIUM = {
  bg: "#0b0d0f",
  card: "#101217",
  border: "rgba(255,255,255,0.06)",
  text: "#F2F3F5",
  muted: "#8B919A",
  accent: "#2EC4B6",
  track: "rgba(255,255,255,0.07)",
} as const;

type PathIconProps = { color: string; size: number };

function iconForPath(id: RecoveryPathId): React.ComponentType<PathIconProps> {
  switch (id) {
    case "stabilize":
      return Anchor;
    case "build_control":
      return SlidersHorizontal;
    case "repair_life":
      return Layers;
    case "heal_deep":
      return Sparkles;
    case "grow_forward":
      return TrendingUp;
    case "give_back":
      return HeartHandshake;
  }
}

function PathCard({
  path,
  onPress,
}: {
  path: RecoveryPathMeta;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const Icon = iconForPath(path.id);

  const runPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.98,
        useNativeDriver: true,
        friction: 7,
        tension: 320,
      }),
      Animated.timing(opacity, {
        toValue: 0.9,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const runPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 280,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale }], opacity }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${path.title}. ${path.phase}. ${path.description}`}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={runPressIn}
        onPressOut={runPressOut}
        style={(state): ViewStyle[] => {
          const hovered = "hovered" in state && state.hovered;
          const row: ViewStyle[] = [styles.card];
          if (state.pressed || hovered) row.push(styles.cardHovered);
          return row;
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconRing}>
            <Icon color={PREMIUM.accent} size={22} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.phase}>{path.phase}</Text>
            <Text style={styles.title}>{path.title}</Text>
            <Text style={styles.description}>{path.description}</Text>
          </View>
        </View>
        <View style={styles.progressTrack} accessibilityLabel="Progress placeholder">
          <View
            style={[styles.progressFill, { width: `${Math.round(path.progressPlaceholder * 100)}%` }]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function RecoveryPathsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const navigateToRooms = useCallback(
    (pathId: RecoveryPathId) => {
      router.push({
        pathname: "/recovery-paths/room-list",
        params: { pathId },
      });
    },
    [router],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose your path</Text>
        <Text style={styles.headerSubtitle}>Rooms match your stage.</Text>
      </View>
      <ScreenScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {RECOVERY_PATHS.map((path) => (
          <PathCard key={path.id} path={path} onPress={() => navigateToRooms(path.id)} />
        ))}
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PREMIUM.bg,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  headerTitle: {
    color: PREMIUM.text,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 8,
    color: PREMIUM.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
  },
  cardWrap: {
    borderRadius: 16,
  },
  card: {
    backgroundColor: PREMIUM.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PREMIUM.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  cardHovered: {
    borderColor: "rgba(46,196,182,0.22)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(46,196,182,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,196,182,0.18)",
  },
  cardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  phase: {
    color: PREMIUM.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    color: PREMIUM.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  description: {
    color: PREMIUM.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    marginTop: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: PREMIUM.track,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: PREMIUM.accent,
    opacity: 0.85,
  },
});
