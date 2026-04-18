import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { findDemoRoomById } from "../../constants/recoveryPathRooms";
import { ChatSafetyLinksBar } from "../ChatSafetyLinksBar";

const PREMIUM = {
  bg: "#0b0d0f",
  bubbleOther: "#161a22",
  bubbleOwn: "#1a3d38",
  border: "rgba(255,255,255,0.08)",
  text: "#F2F3F5",
  muted: "#8B919A",
  tag: "#9AA3AE",
  accent: "#2EC4B6",
  timeOwn: "rgba(242,243,245,0.55)",
  timeOther: "rgba(138,145,154,0.9)",
  inputBg: "#101217",
  sendDisabled: "#5A626C",
  reactionBar: "#1c2129",
  chip: "rgba(255,255,255,0.08)",
  threadLine: "rgba(46,196,182,0.35)",
  replyLink: "rgba(46,196,182,0.95)",
  banner: "#141920",
} as const;

/** Reactions: emoji → distinct mock user ids (no duplicate user per emoji) */
export type MessageReactions = Record<string, string[]>;

export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "🙏", "💯"] as const;

/** Logged-in user for mock dedupe */
export const ROOM_CHAT_CURRENT_USER_ID = "u-you";

const MOCK_USER_MENTOR = "u-mentor";
const MOCK_USER_D12 = "u-day12";
const MOCK_USER_D4 = "u-day4";
const MOCK_USER_R7 = "u-day7";

export type RoomChatMessage = {
  id: string;
  userTag: string;
  text: string;
  createdAt: number;
  isOwn: boolean;
  reactions: MessageReactions;
  /** Set when this message is a reply in a thread */
  replyToMessageId?: string;
};

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function buildMessageMap(messages: RoomChatMessage[]): Map<string, RoomChatMessage> {
  const m = new Map<string, RoomChatMessage>();
  for (const msg of messages) {
    m.set(msg.id, msg);
  }
  return m;
}

/** Walk reply chain to the top message id (thread root) */
function threadRootId(msg: RoomChatMessage, byId: Map<string, RoomChatMessage>): string {
  let cur: RoomChatMessage | undefined = msg;
  const seen = new Set<string>();
  while (cur?.replyToMessageId) {
    if (seen.has(cur.id)) return cur.id;
    seen.add(cur.id);
    const parent = byId.get(cur.replyToMessageId);
    if (!parent) return cur.id;
    cur = parent;
  }
  return cur.id;
}

/** 0 = root, 1 = direct reply, … */
function replyDepth(msg: RoomChatMessage, byId: Map<string, RoomChatMessage>): number {
  let d = 0;
  let cur: RoomChatMessage | undefined = msg;
  const seen = new Set<string>();
  while (cur?.replyToMessageId) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    cur = byId.get(cur.replyToMessageId);
    if (!cur) break;
    d += 1;
  }
  return d;
}

export type ThreadGroup = {
  rootId: string;
  root: RoomChatMessage;
  /** Root first, then replies in chronological order */
  messages: RoomChatMessage[];
  latestAt: number;
};

function buildThreadGroups(messages: RoomChatMessage[]): ThreadGroup[] {
  const byId = buildMessageMap(messages);
  const buckets = new Map<string, RoomChatMessage[]>();
  for (const m of messages) {
    const tid = threadRootId(m, byId);
    const list = buckets.get(tid) ?? [];
    list.push(m);
    buckets.set(tid, list);
  }
  const out: ThreadGroup[] = [];
  for (const [rootId, arr] of buckets) {
    const root = byId.get(rootId);
    if (!root) continue;
    const others = arr.filter((x) => x.id !== root.id).sort((a, b) => a.createdAt - b.createdAt);
    const ordered = [root, ...others];
    const latestAt = Math.max(...ordered.map((x) => x.createdAt));
    out.push({ rootId, root, messages: ordered, latestAt });
  }
  return out.sort((a, b) => b.latestAt - a.latestAt);
}

function buildSeedMessages(roomName: string | undefined): RoomChatMessage[] {
  const t = Date.now();
  const label = roomName ?? "this room";
  return [
    {
      id: "seed-1",
      userTag: "Mentor",
      text: `Welcome to ${label}. Keep it kind, specific, and one-day-at-a-time.`,
      createdAt: t - 1000 * 60 * 12,
      isOwn: false,
      reactions: {
        "👍": [MOCK_USER_D12, MOCK_USER_D4],
        "🙏": [MOCK_USER_R7],
      },
    },
    {
      id: "seed-1-r1",
      userTag: "Day 4",
      text: "Thank you—keeping it short today.",
      createdAt: t - 1000 * 60 * 11,
      isOwn: false,
      reactions: {},
      replyToMessageId: "seed-1",
    },
    {
      id: "seed-1-r2",
      userTag: "Day 12",
      text: "Same. One meeting at a time.",
      createdAt: t - 1000 * 60 * 10.5,
      isOwn: false,
      reactions: { "👍": [MOCK_USER_MENTOR] },
      replyToMessageId: "seed-1",
    },
    {
      id: "seed-1-r3",
      userTag: "You",
      text: "Noted—will read guidelines before I jump in.",
      createdAt: t - 1000 * 60 * 10.2,
      isOwn: true,
      reactions: {},
      replyToMessageId: "seed-1",
    },
    {
      id: "seed-1-r4",
      userTag: "Mentor",
      text: "That’s exactly the energy we want.",
      createdAt: t - 1000 * 60 * 9.8,
      isOwn: false,
      reactions: {},
      replyToMessageId: "seed-1",
    },
    {
      id: "seed-1-r5",
      userTag: "You",
      text: "Following your lead on short check-ins.",
      createdAt: t - 1000 * 60 * 9.5,
      isOwn: true,
      reactions: {},
      replyToMessageId: "seed-1-r2",
    },
    {
      id: "seed-2",
      userTag: "Day 12",
      text: "First time speaking here. Rough morning but I didn’t use.",
      createdAt: t - 1000 * 60 * 9,
      isOwn: false,
      reactions: {
        "❤️": [MOCK_USER_MENTOR, MOCK_USER_D4],
        "🔥": [MOCK_USER_D12],
      },
    },
    {
      id: "seed-3",
      userTag: "Day 4",
      text: "Proud of you for showing up. What helped most the first hour?",
      createdAt: t - 1000 * 60 * 8,
      isOwn: false,
      reactions: {
        "👍": [MOCK_USER_D12],
      },
    },
    {
      id: "seed-4",
      userTag: "You",
      text: "Checking in—sleep was better after the wind-down thread.",
      createdAt: t - 1000 * 60 * 5,
      isOwn: true,
      reactions: {
        "💯": [MOCK_USER_MENTOR, MOCK_USER_D4, MOCK_USER_D12],
      },
    },
  ];
}

function nextMessageId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyReactions(): MessageReactions {
  return {};
}

function mergeUserReaction(prev: MessageReactions, emoji: string, userId: string): MessageReactions {
  const existing = prev[emoji] ?? [];
  if (existing.includes(userId)) {
    return prev;
  }
  return { ...prev, [emoji]: [...existing, userId] };
}

function reactionSummary(reactions: MessageReactions): { emoji: string; count: number }[] {
  return Object.entries(reactions)
    .map(([emoji, users]) => ({ emoji, count: users.length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

type MessageRowProps = {
  item: RoomChatMessage;
  byId: Map<string, RoomChatMessage>;
  showReactionBar: boolean;
  onLongPress: () => void;
  onPickReaction: (emoji: string) => void;
  currentUserReacted: (emoji: string) => boolean;
  onReply: () => void;
  /** Visual thread indent (left rail) */
  depth: number;
};

function RoomMessageRow({
  item,
  byId,
  showReactionBar,
  onLongPress,
  onPickReaction,
  currentUserReacted,
  onReply,
  depth,
}: MessageRowProps) {
  const summary = useMemo(() => reactionSummary(item.reactions), [item.reactions]);
  const parentSnippet = item.replyToMessageId ? byId.get(item.replyToMessageId)?.text : undefined;
  const isNested = depth > 0;
  const bubbleCompact = isNested;

  return (
    <View
      style={[
        styles.msgRow,
        item.isOwn ? styles.msgRowOwn : styles.msgRowOther,
        isNested && styles.msgRowNested,
        { marginLeft: isNested ? Math.min(depth, 4) * 10 : 0 },
      ]}
    >
      {isNested ? <View style={styles.threadRail} /> : null}
      <View style={[styles.msgBlock, item.isOwn ? styles.msgBlockOwn : styles.msgBlockOther, isNested && styles.msgBlockNested]}>
        {parentSnippet ? (
          <Text style={styles.replyContext} numberOfLines={1}>
            Replying to · {parentSnippet}
          </Text>
        ) : null}
        <Text style={[styles.userTag, bubbleCompact && styles.userTagCompact]}>{item.userTag}</Text>
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={380}
          style={({ pressed }) => [pressed && styles.bubblePressed]}
        >
          <View style={[styles.bubble, item.isOwn ? styles.bubbleOwn : styles.bubbleOther, bubbleCompact && styles.bubbleCompact]}>
            <Text style={[styles.bubbleText, bubbleCompact && styles.bubbleTextCompact]} selectable>
              {item.text}
            </Text>
            <Text style={[styles.timeText, item.isOwn ? styles.timeOwn : styles.timeOther]}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </Pressable>
        {summary.length > 0 ? (
          <View
            style={[styles.reactionChips, item.isOwn ? styles.reactionChipsOwn : styles.reactionChipsOther]}
            accessibilityLabel="Reactions"
          >
            {summary.map(({ emoji, count }) => (
              <View key={emoji} style={styles.reactionChip}>
                <Text style={styles.reactionChipText}>
                  {emoji} {count}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {showReactionBar ? (
          <View
            style={[styles.reactionBar, item.isOwn ? styles.reactionBarOwn : styles.reactionBarOther]}
            accessibilityRole="toolbar"
            accessibilityLabel="Emoji reactions"
          >
            {REACTION_EMOJIS.map((emoji) => {
              const already = currentUserReacted(emoji);
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onPickReaction(emoji)}
                  disabled={already}
                  style={({ pressed }) => [
                    styles.reactionHit,
                    already && styles.reactionHitDisabled,
                    pressed && !already && styles.reactionHitPressed,
                  ]}
                  accessibilityLabel={`React with ${emoji}`}
                  accessibilityState={{ disabled: already }}
                >
                  <Text style={[styles.reactionEmoji, already && styles.reactionEmojiMuted]}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onReply();
          }}
          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
          style={({ pressed }) => [styles.replyLinkWrap, item.isOwn ? styles.replyLinkWrapOwn : styles.replyLinkWrapOther, pressed && { opacity: 0.75 }]}
        >
          <Text style={styles.replyLink}>Reply</Text>
        </Pressable>
      </View>
    </View>
  );
}

type ThreadRowProps = {
  group: ThreadGroup;
  byId: Map<string, RoomChatMessage>;
  expanded: boolean;
  onToggleReplies: () => void;
  reactionBarMessageId: string | null;
  openReactionBar: (id: string) => void;
  applyReaction: (id: string, emoji: string) => void;
  currentUserReactedOnMessage: (m: RoomChatMessage, emoji: string) => boolean;
  beginReplyTo: (id: string) => void;
};

function RoomThreadRow({
  group,
  byId,
  expanded,
  onToggleReplies,
  reactionBarMessageId,
  openReactionBar,
  applyReaction,
  currentUserReactedOnMessage,
  beginReplyTo,
}: ThreadRowProps) {
  const root = group.root;
  const replies = group.messages.slice(1);
  const showToggle = replies.length > 2;
  const visibleReplies = !showToggle || expanded ? replies : replies.slice(0, 2);

  return (
    <View style={styles.threadGroup}>
      <RoomMessageRow
        item={root}
        byId={byId}
        showReactionBar={reactionBarMessageId === root.id}
        onLongPress={() => openReactionBar(root.id)}
        onPickReaction={(emoji) => applyReaction(root.id, emoji)}
        currentUserReacted={(emoji) => currentUserReactedOnMessage(root, emoji)}
        onReply={() => beginReplyTo(root.id)}
        depth={replyDepth(root, byId)}
      />
      {visibleReplies.map((msg) => (
        <RoomMessageRow
          key={msg.id}
          item={msg}
          byId={byId}
          showReactionBar={reactionBarMessageId === msg.id}
          onLongPress={() => openReactionBar(msg.id)}
          onPickReaction={(emoji) => applyReaction(msg.id, emoji)}
          currentUserReacted={(emoji) => currentUserReactedOnMessage(msg, emoji)}
          onReply={() => beginReplyTo(msg.id)}
          depth={replyDepth(msg, byId)}
        />
      ))}
      {showToggle ? (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onToggleReplies();
          }}
          style={({ pressed }) => [styles.viewRepliesBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Hide replies" : `View all ${replies.length} replies`}
        >
          <Text style={styles.viewRepliesText}>
            {expanded ? "Hide replies" : `View replies (${replies.length})`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const raw = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = Array.isArray(raw.roomId) ? raw.roomId[0] : raw.roomId;
  const room = useMemo(() => findDemoRoomById(roomId), [roomId]);
  const messageSeed = useMemo(() => buildSeedMessages(room?.name), [room?.name, roomId]);
  const [messages, setMessages] = useState<RoomChatMessage[]>(messageSeed);
  const [input, setInput] = useState("");
  const [reactionBarMessageId, setReactionBarMessageId] = useState<string | null>(null);
  const [replyDraftParentId, setReplyDraftParentId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMessages(messageSeed);
    setReactionBarMessageId(null);
    setReplyDraftParentId(null);
    setExpandedThreads({});
  }, [messageSeed]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: room?.name ?? "Room",
    });
  }, [navigation, room?.name]);

  const byId = useMemo(() => buildMessageMap(messages), [messages]);
  const threadGroups = useMemo(() => buildThreadGroups(messages), [messages]);

  const replyPreview = replyDraftParentId ? byId.get(replyDraftParentId) : undefined;

  const toggleThreadExpanded = useCallback((rootId: string) => {
    setExpandedThreads((prev) => ({ ...prev, [rootId]: !prev[rootId] }));
  }, []);

  const beginReplyTo = useCallback((messageId: string) => {
    setReactionBarMessageId(null);
    setReplyDraftParentId(messageId);
  }, []);

  const openReactionBar = useCallback((messageId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReactionBarMessageId((id) => (id === messageId ? null : messageId));
  }, []);

  const applyReaction = useCallback((messageId: string, emoji: string) => {
    void Haptics.selectionAsync();
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const next = mergeUserReaction(m.reactions, emoji, ROOM_CHAT_CURRENT_USER_ID);
        if (next === m.reactions) return m;
        return { ...m, reactions: next };
      }),
    );
  }, []);

  const currentUserReactedOnMessage = useCallback(
    (message: RoomChatMessage, emoji: string) => {
      return (message.reactions[emoji] ?? []).includes(ROOM_CHAT_CURRENT_USER_ID);
    },
    [],
  );

  const renderItem = useCallback<ListRenderItem<ThreadGroup>>(
    ({ item }) => (
      <RoomThreadRow
        group={item}
        byId={byId}
        expanded={!!expandedThreads[item.rootId]}
        onToggleReplies={() => toggleThreadExpanded(item.rootId)}
        reactionBarMessageId={reactionBarMessageId}
        openReactionBar={openReactionBar}
        applyReaction={applyReaction}
        currentUserReactedOnMessage={currentUserReactedOnMessage}
        beginReplyTo={beginReplyTo}
      />
    ),
    [
      byId,
      expandedThreads,
      reactionBarMessageId,
      openReactionBar,
      applyReaction,
      currentUserReactedOnMessage,
      beginReplyTo,
      toggleThreadExpanded,
    ],
  );

  const onSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg: RoomChatMessage = {
      id: nextMessageId(),
      userTag: "You",
      text,
      createdAt: Date.now(),
      isOwn: true,
      reactions: emptyReactions(),
      ...(replyDraftParentId ? { replyToMessageId: replyDraftParentId } : {}),
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
    setReactionBarMessageId(null);
    setReplyDraftParentId(null);
  }, [input, replyDraftParentId]);

  const keyboardOffset = Platform.OS === "ios" ? insets.top + 52 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <ChatSafetyLinksBar tone="dark" testID="recovery-path-chat-safety-bar" />
      <FlatList
        style={styles.chatList}
        data={threadGroups}
        keyExtractor={(g) => g.rootId}
        renderItem={renderItem}
        inverted
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          setReactionBarMessageId(null);
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: 10 + insets.bottom, paddingBottom: 8 },
        ]}
      />
      {replyPreview ? (
        <View style={styles.replyBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerLabel}>Replying to {replyPreview.userTag}</Text>
            <Text style={styles.replyBannerText} numberOfLines={2}>
              {replyPreview.text}
            </Text>
          </View>
          <Pressable
            onPress={() => setReplyDraftParentId(null)}
            hitSlop={10}
            style={({ pressed }) => [styles.replyBannerClear, pressed && { opacity: 0.75 }]}
            accessibilityLabel="Cancel reply"
          >
            <X size={18} color={PREMIUM.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder={replyPreview ? "Write a reply…" : "Message"}
            placeholderTextColor={PREMIUM.muted}
            value={input}
            onChangeText={setInput}
            onFocus={() => setReactionBarMessageId(null)}
            multiline
            maxLength={2000}
            testID="recovery-room-chat-input"
          />
          <Pressable
            onPress={onSend}
            disabled={!input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              !input.trim() && styles.sendBtnDisabled,
              pressed && !!input.trim() && styles.sendBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            testID="recovery-room-chat-send"
          >
            <Send size={22} color={input.trim() ? PREMIUM.text : PREMIUM.sendDisabled} />
          </Pressable>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PREMIUM.bg,
  },
  chatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  threadGroup: {
    marginBottom: 16,
    maxWidth: "100%",
  },
  msgRow: {
    marginBottom: 6,
    maxWidth: "94%",
    flexDirection: "row",
  },
  msgRowOwn: {
    alignSelf: "flex-end",
  },
  msgRowOther: {
    alignSelf: "flex-start",
  },
  msgRowNested: {
    maxWidth: "98%",
  },
  threadRail: {
    width: 3,
    borderRadius: 2,
    backgroundColor: PREMIUM.threadLine,
    marginRight: 8,
    marginTop: 4,
    marginBottom: 4,
    opacity: 0.9,
  },
  msgBlock: {
    flex: 1,
    minWidth: 0,
  },
  msgBlockOwn: {
    alignItems: "flex-end",
  },
  msgBlockOther: {
    alignItems: "flex-start",
  },
  msgBlockNested: {
    paddingRight: 2,
  },
  replyContext: {
    fontSize: 11,
    color: PREMIUM.muted,
    marginBottom: 4,
    maxWidth: "100%",
  },
  userTag: {
    fontSize: 11,
    fontWeight: "700",
    color: PREMIUM.tag,
    letterSpacing: 0.4,
    marginBottom: 4,
    marginHorizontal: 2,
  },
  userTagCompact: {
    fontSize: 10,
  },
  bubblePressed: {
    opacity: 0.92,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 1,
  },
  bubbleCompact: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  bubbleOwn: {
    backgroundColor: PREMIUM.bubbleOwn,
    borderColor: "rgba(46,196,182,0.25)",
  },
  bubbleOther: {
    backgroundColor: PREMIUM.bubbleOther,
    borderColor: PREMIUM.border,
  },
  bubbleText: {
    color: PREMIUM.text,
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: "flex-end",
  },
  timeOwn: {
    color: PREMIUM.timeOwn,
  },
  timeOther: {
    color: PREMIUM.timeOther,
  },
  reactionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    maxWidth: 280,
  },
  reactionChipsOwn: {
    justifyContent: "flex-end",
  },
  reactionChipsOther: {
    justifyContent: "flex-start",
  },
  reactionChip: {
    backgroundColor: PREMIUM.chip,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PREMIUM.border,
  },
  reactionChipText: {
    color: PREMIUM.text,
    fontSize: 13,
    fontWeight: "600",
  },
  reactionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: PREMIUM.reactionBar,
    borderWidth: 1,
    borderColor: PREMIUM.border,
    gap: 2,
  },
  reactionBarOwn: {
    alignSelf: "flex-end",
  },
  reactionBarOther: {
    alignSelf: "flex-start",
  },
  reactionHit: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  reactionHitPressed: {
    backgroundColor: "rgba(46,196,182,0.15)",
  },
  reactionHitDisabled: {
    opacity: 0.45,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  reactionEmojiMuted: {
    opacity: 0.55,
  },
  replyLinkWrap: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  replyLinkWrapOwn: {
    alignSelf: "flex-end",
  },
  replyLinkWrapOther: {
    alignSelf: "flex-start",
  },
  replyLink: {
    fontSize: 13,
    fontWeight: "600",
    color: PREMIUM.replyLink,
  },
  viewRepliesBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  viewRepliesText: {
    fontSize: 13,
    fontWeight: "600",
    color: PREMIUM.muted,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: PREMIUM.banner,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PREMIUM.border,
  },
  replyBannerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: PREMIUM.accent,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  replyBannerText: {
    fontSize: 13,
    color: PREMIUM.muted,
    lineHeight: 18,
  },
  replyBannerClear: {
    padding: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PREMIUM.border,
    backgroundColor: PREMIUM.bg,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: PREMIUM.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PREMIUM.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: PREMIUM.text,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PREMIUM.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: "#2a3038",
  },
  sendBtnPressed: {
    opacity: 0.92,
  },
});
