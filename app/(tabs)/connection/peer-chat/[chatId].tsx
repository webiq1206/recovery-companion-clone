import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Send, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../../../constants/colors';
import { ChatSafetyLinksBar } from '../../../../components/ChatSafetyLinksBar';
import { arePeerPracticeFeaturesEnabled } from '../../../../core/socialLiveConfig';
import { useConnection } from '../../../../providers/ConnectionProvider';
import type { PeerMessage } from '../../../../types';

const QUICK_REACTIONS = ['❤️', '👍', '😮', '🙏'] as const;

function formatShortTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function PeerChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const raw = useLocalSearchParams<{ chatId: string | string[] }>();
  const chatId = Array.isArray(raw.chatId) ? raw.chatId[0] : raw.chatId;

  const {
    peerChats,
    blockedPeerNames,
    isLoading,
    sendPeerMessage,
    togglePeerMessageReaction,
    endPeerChat,
    blockPeerPartner,
    recordLocalUgcReport,
  } = useConnection();

  const chat = useMemo(
    () => (chatId ? peerChats.find(c => c.id === chatId) ?? null : null),
    [chatId, peerChats],
  );

  const blocked = chat ? blockedPeerNames.includes(chat.anonymousName) : false;

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<PeerMessage | null>(null);
  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId || isLoading) return;
    if (!chat || blocked) {
      router.back();
    }
  }, [chatId, chat, blocked, isLoading, router]);

  useLayoutEffect(() => {
    if (!chatId || !chat || blocked) return;
    navigation.setOptions({
      title: chat.anonymousName,
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/community-guidelines' as never);
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.75 }]}
          >
            <BookOpen size={20} color={Colors.primary} />
          </Pressable>
          {chat.isActive ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('End chat', 'Are you sure you want to end this chat?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'End',
                    style: 'destructive',
                    onPress: () => {
                      endPeerChat(chat.id);
                      router.back();
                    },
                  },
                ]);
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.headerEndBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.headerEndText}>End</Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      ),
    });
  }, [navigation, chatId, chat, blocked, router, endPeerChat]);

  const messageById = useMemo(() => {
    const m = new Map<string, PeerMessage>();
    if (!chat) return m;
    for (const msg of chat.messages) {
      m.set(msg.id, msg);
    }
    return m;
  }, [chat]);

  /** Inverted FlatList: newest item first in `data` (renders at the bottom). */
  const listData = useMemo(() => {
    if (!chat || blocked) return [];
    return [...chat.messages].reverse();
  }, [chat, blocked]);

  const openMessageActions = useCallback(
    (msg: PeerMessage) => {
      const runReply = () => {
        Haptics.selectionAsync();
        setReplyTo(msg);
      };
      const runReport = () => {
        if (msg.isOwn) return;
        recordLocalUgcReport({
          scope: 'peer',
          contextId: chat!.id,
          authorLabel: chat!.anonymousName,
          contentPreview: msg.content.slice(0, 200),
        });
        Alert.alert(
          'Report saved',
          'This practice chat is stored only on your device. For live spaces with server-side reporting, use Recovery Rooms when your organization has configured the social backend.',
        );
      };
      const runBlock = () => {
        if (msg.isOwn) return;
        Alert.alert('Block this partner?', 'You will not see this practice partner name again on this device.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              blockPeerPartner(chat!.id);
              router.back();
            },
          },
        ]);
      };

      if (Platform.OS === 'ios') {
        const opts = msg.isOwn
          ? ['Reply', 'Cancel']
          : ['Reply', 'Report', 'Block partner', 'Cancel'];
        const cancelIdx = opts.length - 1;
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: opts,
            cancelButtonIndex: cancelIdx,
            destructiveButtonIndex: msg.isOwn ? undefined : 2,
          },
          (idx) => {
            if (msg.isOwn) {
              if (idx === 0) runReply();
              return;
            }
            if (idx === 0) runReply();
            else if (idx === 1) runReport();
            else if (idx === 2) runBlock();
          },
        );
      } else {
        if (msg.isOwn) {
          Alert.alert('Message', undefined, [
            { text: 'Reply', onPress: runReply },
            { text: 'Cancel', style: 'cancel' },
          ]);
        } else {
          Alert.alert('Message', undefined, [
            { text: 'Reply', onPress: runReply },
            { text: 'Report', onPress: runReport },
            { text: 'Block partner', style: 'destructive', onPress: runBlock },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
      }
    },
    [chat, recordLocalUgcReport, blockPeerPartner, router],
  );

  const onSend = useCallback(() => {
    const t = input.trim();
    if (!t || !chatId || !chat?.isActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendPeerMessage(chatId, t, replyTo ? { replyToMessageId: replyTo.id } : undefined);
    setInput('');
    setReplyTo(null);
  }, [input, chatId, chat?.isActive, sendPeerMessage, replyTo]);

  const renderItem = useCallback(
    ({ item }: { item: PeerMessage }) => {
      const quoted = item.replyToMessageId ? messageById.get(item.replyToMessageId) : undefined;
      const reactions = item.reactions ?? {};
      const reactionEntries = Object.entries(reactions).filter(([, n]) => n > 0);

      return (
        <View style={[styles.row, item.isOwn ? styles.rowOwn : styles.rowOther]}>
          <Pressable
            onLongPress={() => openMessageActions(item)}
            delayLongPress={380}
            style={({ pressed }) => [styles.bubbleWrap, item.isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}
          >
            {quoted ? (
              <View style={styles.quoteStrip}>
                <Text style={styles.quoteLabel} numberOfLines={1}>
                  {quoted.isOwn ? 'You' : chat?.anonymousName ?? 'Peer'}
                </Text>
                <Text style={styles.quoteText} numberOfLines={3}>
                  {quoted.content}
                </Text>
              </View>
            ) : item.replyToMessageId ? (
              <Text style={styles.quoteMissing}>Original message unavailable</Text>
            ) : null}
            <View style={[styles.bubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
              <Text style={[styles.bubbleText, item.isOwn ? styles.ownBubbleText : styles.otherBubbleText]} selectable>
                {item.content}
              </Text>
              <Text style={[styles.timeText, item.isOwn ? styles.ownTime : styles.otherTime]}>
                {formatShortTime(item.timestamp)}
              </Text>
            </View>
            <View style={styles.reactionRow}>
              {reactionEntries.map(([emoji, count]) => (
                <View key={emoji} style={styles.reactionChip}>
                  <Text style={styles.reactionChipText}>
                    {emoji} {count}
                  </Text>
                </View>
              ))}
              {chat?.isActive ? (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPickerMessageId((id) => (id === item.id ? null : item.id));
                  }}
                  style={({ pressed }) => [styles.addReactionBtn, pressed && { opacity: 0.8 }]}
                  hitSlop={6}
                >
                  <Text style={styles.addReactionText}>＋</Text>
                </Pressable>
              ) : null}
            </View>
            {pickerMessageId === item.id && chat?.isActive ? (
              <View style={styles.quickPicker}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      Haptics.selectionAsync();
                      togglePeerMessageReaction(chatId!, item.id, emoji);
                      setPickerMessageId(null);
                    }}
                    style={({ pressed }) => [styles.quickEmoji, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.quickEmojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Pressable>
        </View>
      );
    },
    [chat, chatId, messageById, openMessageActions, pickerMessageId, togglePeerMessageReaction],
  );

  if (!arePeerPracticeFeaturesEnabled()) {
    return <Redirect href={'/(tabs)/connection' as never} />;
  }

  if (!chatId) {
    return <View style={styles.container} />;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!chat || blocked) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ChatSafetyLinksBar tone="light" testID="peer-chat-safety-bar" />
      <FlatList
        data={listData}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={[styles.listContent, { paddingTop: 12 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />
      {replyTo ? (
        <View style={styles.replyBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerLabel}>Replying to</Text>
            <Text style={styles.replyBannerText} numberOfLines={2}>
              {replyTo.content}
            </Text>
          </View>
          <Pressable
            onPress={() => setReplyTo(null)}
            hitSlop={10}
            style={({ pressed }) => [styles.replyClear, pressed && { opacity: 0.75 }]}
          >
            <X size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      {chat.isActive ? (
        <View style={[styles.inputBar, { paddingBottom: 10 + insets.bottom }]}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            maxLength={500}
            multiline
            testID="peer-chat-input"
          />
          <Pressable
            onPress={onSend}
            disabled={!input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              !input.trim() && styles.sendBtnDisabled,
              pressed && input.trim() && { opacity: 0.9 },
            ]}
            testID="peer-chat-send"
          >
            <Send size={20} color={input.trim() ? Colors.white : Colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.endedBar, { paddingBottom: 12 + insets.bottom }]}>
          <Text style={styles.endedText}>This chat has ended.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  headerIconBtn: {
    padding: 6,
  },
  headerEndBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerEndText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexGrow: 1,
  },
  row: {
    marginBottom: 10,
    maxWidth: '88%',
  },
  rowOwn: {
    alignSelf: 'flex-end',
  },
  rowOther: {
    alignSelf: 'flex-start',
  },
  bubbleWrap: {
    minWidth: '40%',
  },
  bubbleWrapOwn: {
    alignItems: 'flex-end',
  },
  bubbleWrapOther: {
    alignItems: 'flex-start',
  },
  quoteStrip: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingRight: 8,
    alignSelf: 'stretch',
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 2,
  },
  quoteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  quoteMissing: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
    fontStyle: 'italic' as const,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownBubbleText: {
    color: Colors.background,
  },
  otherBubbleText: {
    color: Colors.text,
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  ownTime: {
    color: 'rgba(13,27,42,0.65)',
    textAlign: 'right',
  },
  otherTime: {
    color: Colors.textMuted,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  reactionChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  reactionChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  addReactionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  addReactionText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  quickPicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingVertical: 4,
  },
  quickEmoji: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  quickEmojiText: {
    fontSize: 20,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  replyBannerLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 2,
  },
  replyBannerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  replyClear: {
    padding: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  endedBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  endedText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
