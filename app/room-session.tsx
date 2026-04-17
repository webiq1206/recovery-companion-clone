import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Modal, Alert, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { FlatList } from 'react-native';
import { ScreenFlatList } from '../components/ScreenFlatList';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import {
  Shield, Clock, Radio, X, Send, EyeOff, Eye,
  Flag, Users, Calendar, ChevronDown, ChevronRight, AlertTriangle,
  Info, LogOut, MessageSquare, Heart, BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';
import { useRecoveryRooms, TOPIC_LABELS } from '../providers/RecoveryRoomsProvider';
import { RecoveryRoomMessage, RoomReport, ScheduledSession } from '../types';

type SessionView = 'chat' | 'info' | 'schedule';

const REPORT_REASONS: { key: RoomReport['reason']; label: string }[] = [
  { key: 'inappropriate', label: 'Inappropriate Content' },
  { key: 'harassment', label: 'Harassment or Bullying' },
  { key: 'spam', label: 'Spam' },
  { key: 'triggering', label: 'Triggering Content' },
  { key: 'other', label: 'Other' },
];

export default function RoomSessionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const {
    getRoomById,
    sendMessage,
    reportMessage,
    reportUser,
    leaveRoom,
    displayName,
    isAnonymousDefault,
    userId,
    blockUser,
    blockedAuthors,
    blockedUserIds,
    socialMode,
    refetchRooms,
  } = useRecoveryRooms();

  const room = getRoomById(roomId ?? '');

  const visibleMessages = useMemo(() => {
    if (!room) return [];
    return room.messages.filter((m) => {
      if (m.isOwn) return true;
      if (m.authorId && blockedUserIds.includes(m.authorId)) return false;
      return !blockedAuthors.includes(m.authorName);
    });
  }, [room, blockedAuthors, blockedUserIds]);

  const [sessionView, setSessionView] = useState<SessionView>('chat');
  const [messageText, setMessageText] = useState<string>('');
  const [sendAnonymous, setSendAnonymous] = useState<boolean>(isAnonymousDefault);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportingMessageId, setReportingMessageId] = useState<string>('');
  const [reportReason, setReportReason] = useState<RoomReport['reason']>('inappropriate');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [showReportUserModal, setShowReportUserModal] = useState<boolean>(false);
  const [reportingSubject, setReportingSubject] = useState<{ userId: string; displayName: string }>({
    userId: '',
    displayName: '',
  });
  const [showRules, setShowRules] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    setSendAnonymous(isAnonymousDefault);
  }, [isAnonymousDefault]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !roomId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(roomId, messageText.trim(), sendAnonymous);
    setMessageText('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messageText, roomId, sendAnonymous, sendMessage]);

  const handleReport = useCallback((messageId: string) => {
    setReportingMessageId(messageId);
    setReportReason('inappropriate');
    setReportDescription('');
    setShowReportModal(true);
  }, []);

  const handleMessageActions = useCallback(
    (message: RecoveryRoomMessage) => {
      if (message.isOwn || message.isReported) return;
      const authorLabel = message.isAnonymous ? 'Anonymous' : message.authorName;
      Alert.alert('Safety: this message', `Participant: ${authorLabel}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report message',
          onPress: () => handleReport(message.id),
        },
        {
          text: 'Report user',
          onPress: () => {
            setReportingSubject({
              userId: message.authorId || `anon:${authorLabel}`,
              displayName: authorLabel,
            });
            setReportReason('inappropriate');
            setReportDescription('');
            setShowReportUserModal(true);
          },
        },
        {
          text: 'Block user',
          style: 'destructive',
          onPress: () => {
            blockUser(authorLabel, message.authorId || undefined);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'User blocked',
              socialMode === 'live'
                ? 'You will not see new messages from this participant in recovery rooms while signed in with this account. Blocking is enforced by the app together with the server.'
                : 'You will not see messages from this display name (and linked account id when available) in recovery rooms on this device.',
            );
          },
        },
      ]);
    },
    [handleReport, blockUser, socialMode],
  );

  const handleSubmitReport = useCallback(() => {
    if (!roomId || !reportingMessageId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reportMessage(roomId, reportingMessageId, reportReason, reportDescription);
    setShowReportModal(false);
    const live = socialMode === 'live';
    Alert.alert(
      'Report received',
      live
        ? 'Thank you. Your report was sent to the moderation queue for this app’s backend. We may remove content or restrict accounts that violate the Community Guidelines. You will not receive a personal reply for every report.'
        : 'Thank you. Your report is saved on this device so you can share it with a sponsor or clinician if you choose. It is not sent to a remote moderation team unless live community is enabled for your build.',
    );
  }, [roomId, reportingMessageId, reportReason, reportDescription, reportMessage, socialMode]);

  const handleSubmitReportUser = useCallback(() => {
    if (!roomId || !reportingSubject.displayName) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reportUser(roomId, reportingSubject.userId, reportingSubject.displayName, reportReason, reportDescription);
    setShowReportUserModal(false);
    const live = socialMode === 'live';
    Alert.alert(
      'User report received',
      live
        ? 'Thank you. This report flags the participant for moderators (not just a single message). Serious or illegal content may be escalated according to our enforcement policy. Emergency: contact local emergency services if you are in immediate danger.'
        : 'Thank you. This user report is stored on this device. Enable the live community backend so reports can reach a moderation team.',
    );
  }, [roomId, reportingSubject, reportReason, reportDescription, reportUser, socialMode]);

  const openSafetyMenu = useCallback(() => {
    Haptics.selectionAsync();
    Alert.alert(
      'Community safety',
      'Long-press any message from someone else to Report message, Report user, or Block user. Read the full Community Guidelines for conduct rules, enforcement, and escalation.',
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Open guidelines',
          onPress: () => router.push('/community-guidelines' as any),
        },
      ],
    );
  }, [router]);

  const handleLeaveRoom = useCallback(() => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room? You can always rejoin later.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            if (roomId) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              leaveRoom(roomId);
              router.back();
            }
          },
        },
      ]
    );
  }, [roomId, leaveRoom, router]);

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, []);

  const formatSessionTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffMs < 0) return 'Now';
    if (diffHrs < 1) return `In ${Math.max(1, Math.floor(diffMs / 60000))}m`;
    if (diffHrs < 24) return `In ${diffHrs}h`;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  const activeSession = useMemo(() => {
    if (!room) return null;
    return room.scheduledSessions.find(s => s.isActive) ?? null;
  }, [room]);

  if (!arePeerPracticeFeaturesEnabled()) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Recovery rooms are not available in this app build.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Room not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderMessageItem = ({ item }: { item: RecoveryRoomMessage }) => {
    const isOwn = item.isOwn || item.authorId === userId;
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && (
          <View style={styles.messageAuthorRow}>
            <Text style={styles.messageAuthor}>
              {item.isAnonymous ? 'Anonymous' : item.authorName}
            </Text>
          </View>
        )}
        <Pressable
          onLongPress={() => {
            if (!isOwn && !item.isReported) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleMessageActions(item);
            }
          }}
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
            item.isReported && styles.reportedBubble,
          ]}
        >
          {item.isReported ? (
            <View style={styles.reportedContent}>
              <AlertTriangle size={14} color={Colors.textMuted} />
              <Text style={styles.reportedText}>Message under review</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                {item.content}
              </Text>
              <Text style={[styles.messageTime, isOwn ? styles.ownTime : styles.otherTime]}>
                {formatTime(item.timestamp)}
                {item.isAnonymous && isOwn && ' · Anonymous'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  const renderSessionBanner = () => {
    if (!activeSession) return null;
    return (
      <View style={styles.sessionBanner}>
        <Radio size={14} color="#FF4D4D" />
        <View style={styles.sessionBannerInfo}>
          <Text style={styles.sessionBannerTitle}>{activeSession.title}</Text>
          <Text style={styles.sessionBannerMeta}>
            {activeSession.durationMinutes} min session
          </Text>
        </View>
      </View>
    );
  };

  const renderInfoView = () => (
    <ScreenScrollView contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>About This Room</Text>
        <Text style={styles.infoDescription}>{room.description}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoStat}>
          <Users size={18} color={Colors.primary} />
          <Text style={styles.infoStatValue}>{room.memberCount}/{room.maxMembers}</Text>
          <Text style={styles.infoStatLabel}>Members</Text>
        </View>
        <View style={styles.infoStat}>
          <MessageSquare size={18} color={Colors.primary} />
          <Text style={styles.infoStatValue}>{room.messages.length}</Text>
          <Text style={styles.infoStatLabel}>Messages</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Room Guidelines</Text>
        {room.rules.map((rule, i) => (
          <View key={i} style={styles.ruleRow}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Safety & moderation</Text>
        <View style={styles.safetyCard}>
          <Flag size={20} color={Colors.danger} />
          <View style={styles.safetyInfo}>
            <Text style={styles.safetyTitle}>Report abuse</Text>
            <Text style={styles.safetyDesc}>
              Long-press a message you did not send to open options: report that message, report the user (flags their
              account for review), or block the user so you stop seeing their messages.
            </Text>
          </View>
        </View>
        <View style={styles.safetyCard}>
          <Shield size={20} color="#7DC9A0" />
          <View style={styles.safetyInfo}>
            <Text style={styles.safetyTitle}>Block users</Text>
            <Text style={styles.safetyDesc}>
              Blocking hides that participant from your recovery rooms. With live community enabled, blocks are stored
              with your account on the server as well as in the app.
            </Text>
          </View>
        </View>
        <View style={styles.safetyCard}>
          <EyeOff size={20} color="#C4A6E0" />
          <View style={styles.safetyInfo}>
            <Text style={styles.safetyTitle}>Anonymous Option</Text>
            <Text style={styles.safetyDesc}>
              Toggle anonymous mode to participate without revealing your identity.
            </Text>
          </View>
        </View>
        <View style={styles.safetyCard}>
          <Heart size={20} color="#E8917A" />
          <View style={styles.safetyInfo}>
            <Text style={styles.safetyTitle}>Emotional safety</Text>
            <Text style={styles.safetyDesc}>
              If content feels triggering, step away. This is not a crisis service—use emergency services or a crisis
              line if you are in immediate danger.
            </Text>
          </View>
        </View>
        <View style={styles.safetyCard}>
          <BookOpen size={20} color={Colors.primary} />
          <View style={styles.safetyInfo}>
            <Text style={styles.safetyTitle}>Community Guidelines</Text>
            <Text style={styles.safetyDesc}>
              The full guidelines explain acceptable content, enforcement, how moderation review works when live
              community is on, and escalation paths.
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.guidelinesCta, pressed && { opacity: 0.88 }]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/community-guidelines' as any);
          }}
        >
          <Text style={styles.guidelinesCtaText}>Read Community Guidelines</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.leaveBtn, pressed && { opacity: 0.8 }]}
        onPress={handleLeaveRoom}
        testID="leave-room-btn"
      >
        <LogOut size={16} color={Colors.danger} />
        <Text style={styles.leaveBtnText}>Leave Room</Text>
      </Pressable>
    </ScreenScrollView>
  );

  const renderScheduleView = () => (
    <ScreenScrollView contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.scheduleHeader}>Upcoming Sessions</Text>
      {room.scheduledSessions.length === 0 ? (
        <View style={styles.emptySchedule}>
          <Calendar size={32} color={Colors.textMuted} />
          <Text style={styles.emptyScheduleText}>No sessions scheduled yet</Text>
        </View>
      ) : (
        room.scheduledSessions.map(session => (
          <View key={session.id} style={styles.scheduleCard}>
            <View style={styles.scheduleCardTop}>
              {session.isActive && <Radio size={12} color="#FF4D4D" />}
              <Text style={styles.scheduleCardTitle}>{session.title}</Text>
            </View>
            <Text style={styles.scheduleCardDesc}>{session.description}</Text>
            <View style={styles.scheduleCardMeta}>
              <Clock size={12} color={Colors.textMuted} />
              <Text style={styles.scheduleCardMetaText}>
                {formatSessionTime(session.scheduledAt)} · {session.durationMinutes}min
                {session.attendeeCount > 0 ? ` · ${session.attendeeCount} attending` : ''}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScreenScrollView>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <ChevronDown size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>{room.name}</Text>
            {room.isLive && (
              <View style={styles.headerLive}>
                <Radio size={8} color="#FF4D4D" />
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>
            {TOPIC_LABELS[room.topic]} · {room.memberCount} members
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={openSafetyMenu}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Safety and reporting"
            testID="room-safety-btn"
          >
            <Flag size={20} color={Colors.danger} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/community-guidelines' as any);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Community guidelines"
            testID="room-guidelines-btn"
          >
            <BookOpen size={20} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              handleLeaveRoom();
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.headerLeaveBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Leave room"
            testID="header-leave-room-btn"
          >
            <LogOut size={18} color={Colors.danger} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setSessionView(sessionView === 'info' ? 'chat' : 'info');
            }}
            hitSlop={8}
            testID="info-btn"
          >
            <Info size={20} color={sessionView === 'info' ? Colors.primary : Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.viewTabs}>
        {([
          { key: 'chat' as const, label: 'Chat' },
          { key: 'schedule' as const, label: 'Schedule' },
          { key: 'info' as const, label: 'Info & Rules' },
        ]).map(tab => {
          const isActive = sessionView === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.viewTab, isActive && styles.viewTabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setSessionView(tab.key);
              }}
            >
              <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.safetyBar, pressed && { opacity: 0.88 }]}
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/community-guidelines' as any);
        }}
        testID="room-safety-guidelines-bar"
      >
        <Shield size={16} color={Colors.primary} />
        <Text style={styles.safetyBarText} numberOfLines={2}>
          Guidelines · Report abuse · Block users — long-press a message for options
        </Text>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      {sessionView === 'chat' && (
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {renderSessionBanner()}

          {(socialMode === 'live' || socialMode === 'local_demo') && (
            <View
              style={[
                styles.socialStrip,
                socialMode === 'live' ? styles.socialStripLive : styles.socialStripDemo,
              ]}
            >
              <Text style={styles.socialStripText}>
                {socialMode === 'live'
                  ? 'Live chat: long-press a message to report or block. Not monitored 24/7—use crisis services if you are unsafe.'
                  : 'Development preview: some replies may be simulated on-device, not from live people.'}
              </Text>
              {socialMode === 'live' ? (
                <Pressable onPress={() => refetchRooms()} hitSlop={8}>
                  <Text style={styles.socialStripLink}>Refresh</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {showRules && (
            <Pressable style={styles.rulesOverlay} onPress={() => setShowRules(false)}>
              <View style={styles.rulesPopup}>
                <Text style={styles.rulesPopupTitle}>Room Guidelines</Text>
                {room.rules.map((rule, i) => (
                  <View key={i} style={styles.ruleRow}>
                    <View style={styles.ruleDot} />
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          )}

          <ScreenFlatList
            ref={flatListRef}
            data={visibleMessages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              <View style={styles.chatWelcome}>
                <Shield size={20} color={Colors.primary} />
                <Text style={styles.chatWelcomeText}>
                  Welcome to {room.name}. Be kind. Long-press someone else’s message to report abuse, report a user, or
                  block a user. Open the full Community Guidelines from the banner above or the book icon.
                </Text>
                <Pressable onPress={() => setShowRules(true)}>
                  <Text style={styles.chatWelcomeLink}>View room rules</Text>
                </Pressable>
              </View>
            }
          />

          <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              style={[styles.anonInputToggle, sendAnonymous && styles.anonInputToggleActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSendAnonymous(!sendAnonymous);
              }}
              testID="anon-send-toggle"
            >
              {sendAnonymous ? (
                <EyeOff size={16} color={Colors.primary} />
              ) : (
                <Eye size={16} color={Colors.textMuted} />
              )}
            </Pressable>
            <TextInput
              style={styles.chatInput}
              placeholder={sendAnonymous ? 'Share anonymously...' : 'Share with the group...'}
              placeholderTextColor={Colors.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              maxLength={500}
              multiline
              testID="session-input"
            />
            <Pressable
              style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
              testID="send-btn"
            >
              <Send size={18} color={messageText.trim() ? '#FFFFFF' : Colors.textMuted} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {sessionView === 'info' && renderInfoView()}
      {sessionView === 'schedule' && renderScheduleView()}

      <Modal visible={showReportUserModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.reportModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.reportHeader}>
              <AlertTriangle size={20} color={Colors.warning} />
              <Text style={styles.reportTitle}>Report user</Text>
              <Pressable onPress={() => setShowReportUserModal(false)} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.reportSubtext}>
              Flags this participant for review (not only one message). Include anything moderators should know.
            </Text>
            <Text style={styles.reportSubjectLine}>
              Participant: {reportingSubject.displayName || 'Unknown'}
            </Text>

            {REPORT_REASONS.map(reason => (
              <Pressable
                key={reason.key}
                style={[
                  styles.reportReasonItem,
                  reportReason === reason.key && styles.reportReasonItemActive,
                ]}
                onPress={() => setReportReason(reason.key)}
              >
                <View style={[
                  styles.reportRadio,
                  reportReason === reason.key && styles.reportRadioActive,
                ]} />
                <Text style={[
                  styles.reportReasonText,
                  reportReason === reason.key && { color: Colors.text },
                ]}>
                  {reason.label}
                </Text>
              </Pressable>
            ))}

            <TextInput
              style={styles.reportInput}
              placeholder="What happened? (recommended)"
              placeholderTextColor={Colors.textMuted}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              maxLength={500}
            />

            <View style={styles.reportActions}>
              <Pressable
                style={styles.reportCancel}
                onPress={() => setShowReportUserModal(false)}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.reportSubmit}
                onPress={handleSubmitReportUser}
              >
                <Flag size={16} color="#FFFFFF" />
                <Text style={styles.reportSubmitText}>Submit user report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.reportModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.reportHeader}>
              <AlertTriangle size={20} color={Colors.warning} />
              <Text style={styles.reportTitle}>Report message</Text>
              <Pressable onPress={() => setShowReportModal(false)} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.reportSubtext}>
              Help keep this space safe. Select a reason for reporting this message.
            </Text>

            {REPORT_REASONS.map(reason => (
              <Pressable
                key={reason.key}
                style={[
                  styles.reportReasonItem,
                  reportReason === reason.key && styles.reportReasonItemActive,
                ]}
                onPress={() => setReportReason(reason.key)}
              >
                <View style={[
                  styles.reportRadio,
                  reportReason === reason.key && styles.reportRadioActive,
                ]} />
                <Text style={[
                  styles.reportReasonText,
                  reportReason === reason.key && { color: Colors.text },
                ]}>
                  {reason.label}
                </Text>
              </Pressable>
            ))}

            <TextInput
              style={styles.reportInput}
              placeholder="Additional details (optional)"
              placeholderTextColor={Colors.textMuted}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              maxLength={200}
            />

            <View style={styles.reportActions}>
              <Pressable
                style={styles.reportCancel}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.reportSubmit}
                onPress={handleSubmitReport}
              >
                <Flag size={16} color="#FFFFFF" />
                <Text style={styles.reportSubmitText}>Submit Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerLive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLeaveBtn: {
    padding: 4,
    borderRadius: 8,
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 4,
  },
  viewTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewTabActive: {
    backgroundColor: '#1E3A4F',
  },
  viewTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  viewTabTextActive: {
    color: Colors.primary,
  },
  safetyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  safetyBarText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  guidelinesCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(46,196,182,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.25)',
  },
  guidelinesCtaText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  chatArea: {
    flex: 1,
  },
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 77, 77, 0.06)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 77, 77, 0.15)',
  },
  sessionBannerInfo: {
    flex: 1,
  },
  sessionBannerTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  sessionBannerMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rulesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  rulesPopup: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  rulesPopupTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  socialStrip: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialStripLive: {
    backgroundColor: 'rgba(46,196,182,0.1)',
    borderColor: 'rgba(46,196,182,0.3)',
  },
  socialStripDemo: {
    backgroundColor: 'rgba(240,199,94,0.1)',
    borderColor: 'rgba(240,199,94,0.3)',
  },
  socialStripText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  socialStripLink: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  chatWelcome: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 12,
  },
  chatWelcomeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  chatWelcomeLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  messageRow: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
  },
  messageAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    marginLeft: 4,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ownBubble: {
    backgroundColor: '#1A4A3A',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 6,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  reportedBubble: {
    backgroundColor: 'rgba(255, 193, 7, 0.06)',
    borderColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 0.5,
  },
  reportedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportedText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTime: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  otherTime: {
    color: Colors.textMuted,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    gap: 8,
  },
  anonInputToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 2,
  },
  anonInputToggleActive: {
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
    borderColor: Colors.primary,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  infoContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  infoStat: {
    alignItems: 'center',
    gap: 6,
  },
  infoStatValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  infoStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  ruleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  safetyInfo: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  safetyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    backgroundColor: 'rgba(239, 83, 80, 0.06)',
    marginTop: 12,
  },
  leaveBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  scheduleHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  emptySchedule: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyScheduleText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scheduleCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  scheduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scheduleCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  scheduleCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  scheduleCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scheduleCardMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reportModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reportTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reportSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
  },
  reportSubjectLine: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  reportReasonItemActive: {
    backgroundColor: 'rgba(46, 196, 182, 0.08)',
  },
  reportRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  reportRadioActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  reportReasonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reportInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 12,
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reportCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  reportSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.warning,
  },
  reportSubmitText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
});
