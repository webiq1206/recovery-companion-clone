import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ScreenScrollView } from "../ScreenScrollView";
import { getRecoveryPathById } from "../../constants/recoveryPaths";
import { getDemoRoomsForPath, type DemoRoom } from "../../constants/recoveryPathRooms";

const PREMIUM = {
  bg: "#0b0d0f",
  card: "#101217",
  border: "rgba(255,255,255,0.06)",
  text: "#F2F3F5",
  muted: "#8B919A",
  accent: "#2EC4B6",
  live: "rgba(46,196,182,0.2)",
  open: "rgba(255,255,255,0.08)",
} as const;

export default function RoomListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const raw = useLocalSearchParams<{ pathId?: string | string[] }>();
  const pathIdRaw = Array.isArray(raw.pathId) ? raw.pathId[0] : raw.pathId;
  const path = useMemo(() => getRecoveryPathById(pathIdRaw), [pathIdRaw]);
  const rooms = useMemo(() => getDemoRoomsForPath(path?.id ?? null), [path?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: path ? path.title : "Rooms",
    });
  }, [navigation, path]);

  const openChat = useCallback(
    (roomId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/recovery-paths/chat-room",
        params: { roomId },
      });
    },
    [router],
  );

  return (
    <View style={[styles.root, { paddingTop: 8 }]}>
      <ScreenScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {path ? (
          <>
            <Text style={styles.phase}>{path.phase}</Text>
            <Text style={styles.lead}>{path.description}</Text>
            <Text style={styles.sectionLabel}>Rooms</Text>
            <View style={styles.list}>
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onOpenRoom={openChat} />
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.lead}>Select a recovery path to see matched rooms.</Text>
        )}
      </ScreenScrollView>
    </View>
  );
}

function RoomCard({ room, onOpenRoom }: { room: DemoRoom; onOpenRoom: (roomId: string) => void }) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${room.name}. ${room.description}`}
        onPress={() => onOpenRoom(room.id)}
        style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.roomName}>{room.name}</Text>
          <View style={[styles.statusBadge, room.status === "live" ? styles.statusLive : styles.statusOpen]}>
            <Text style={styles.statusBadgeText}>{room.status === "live" ? "Live" : "Open"}</Text>
          </View>
        </View>
        <Text style={styles.roomDescription}>{room.description}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PREMIUM.bg,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  phase: {
    color: PREMIUM.accent,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  lead: {
    color: PREMIUM.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  sectionLabel: {
    color: PREMIUM.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: PREMIUM.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PREMIUM.border,
    overflow: "hidden",
  },
  cardMain: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  roomName: {
    flex: 1,
    color: PREMIUM.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusLive: {
    backgroundColor: PREMIUM.live,
  },
  statusOpen: {
    backgroundColor: PREMIUM.open,
  },
  statusBadgeText: {
    color: PREMIUM.text,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  roomDescription: {
    color: PREMIUM.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
