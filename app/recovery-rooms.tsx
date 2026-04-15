import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Modal, Alert, Animated, ScrollView, Platform,
} from 'react-native';
import { ScreenFlatList } from '../components/ScreenFlatList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Users, Shield, Clock, Radio, ChevronRight, Lock,
  Eye, EyeOff, Search, X, Calendar, Zap, Heart,
  MessageSquare, Star, Filter, LogOut,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useRecoveryRooms, TOPIC_LABELS } from '../providers/RecoveryRoomsProvider';
import { useSubscription } from '../providers/SubscriptionProvider';
import { RecoveryRoom, RecoveryRoomTopic, ScheduledSession } from '../types';

type ViewMode = 'rooms' | 'sessions' | 'my_rooms';

const TOPIC_ICONS: Record<RecoveryRoomTopic, typeof Heart> = {
  general: Heart,
  cravings: Zap,
  grief: Heart,
  anxiety: Shield,
  relationships: Users,
  early_recovery: Star,
  relapse_prevention: Shield,
  mindfulness: Eye,
  anger: Zap,
  self_care: Heart,
};

const TOPIC_COLORS: Record<RecoveryRoomTopic, string> = {
  general: '#5B9BD5',
  cravings: '#E8917A',
  grief: '#C4A6E0',
  anxiety: '#7DC9A0',
  relationships: '#F0C75E',
  early_recovery: '#FF9A76',
  relapse_prevention: '#82C4C3',
  mindfulness: '#A8D8EA',
  anger: '#FF6B6B',
  self_care: '#DDA0DD',
};

export default function RecoveryRoomsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasFeature } = useSubscription();
  const {
    rooms, joinedRooms, availableRooms, liveRooms,
    displayName, isAnonymousDefault,
    setRoomDisplayName, setAnonymousDefault,
    joinRoom, leaveRoom, getUpcomingSessions, topicLabels,
  } = useRecoveryRooms();

  const [viewMode, setViewMode] = useState<ViewMode>('rooms');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<RecoveryRoomTopic | null>(null);
  const [showNameSetup, setShowNameSetup] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const upcomingSessions = useMemo(() => getUpcomingSessions(), [getUpcomingSessions]);

  const filteredRooms = useMemo(() => {
    let list = viewMode === 'my_rooms' ? joinedRooms : rooms;
    if (selectedTopic) {
      list = list.filter(r => r.topic === selectedTopic);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        topicLabels[r.topic].toLowerCase().includes(q)
      );
    }
    return list;
  }, [rooms, joinedRooms, viewMode, selectedTopic, searchQuery, topicLabels]);

  const handleJoinRoom = useCallback((room: RecoveryRoom) => {
    if (room.memberCount >= room.maxMembers) {
      Alert.alert('Room Full', 'This room has reached its member limit. Try again later.');
      return;
    }
    if (!displayName && !isAnonymousDefault) {
      setPendingRoomId(room.id);
      setShowNameSetup(true);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    joinRoom(room.id);
    router.push({ pathname: '/room-session' as any, params: { roomId: room.id } });
  }, [displayName, isAnonymousDefault, joinRoom, router]);

  const handleEnterRoom = useCallback((room: RecoveryRoom) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!room.isJoined) {
      handleJoinRoom(room);
      return;
    }
    router.push({ pathname: '/room-session' as any, params: { roomId: room.id } });
  }, [handleJoinRoom, router]);

  const handleLeaveRoomFromList = useCallback(
    (room: RecoveryRoom) => {
      Alert.alert(
        'Leave room',
        `Leave "${room.name}"? You can join again later.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              leaveRoom(room.id);
            },
          },
        ],
      );
    },
    [leaveRoom],
  );

  const handleSetName = useCallback(() => {
    if (!nameInput.trim() && !isAnonymousDefault) {
      Alert.alert('Name Required', 'Please enter a display name or enable anonymous mode.');
      return;
    }
    if (nameInput.trim()) {
      setRoomDisplayName(nameInput.trim());
    }
    setShowNameSetup(false);
    setNameInput('');
    if (pendingRoomId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      joinRoom(pendingRoomId);
      router.push({ pathname: '/room-session' as any, params: { roomId: pendingRoomId } });
      setPendingRoomId(null);
    }
  }, [nameInput, isAnonymousDefault, setRoomDisplayName, pendingRoomId, joinRoom, router]);

  const formatSessionTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMs < 0) return 'Now';
    if (diffHrs < 1) return `In ${Math.max(1, Math.floor(diffMs / 60000))}m`;
    if (diffHrs < 24) return `In ${diffHrs}h`;
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  const formatSessionDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, []);

  const renderLiveBanner = () => {
    if (liveRooms.length === 0) return null;
    return (
      <View style={styles.liveBanner}>
        <View style={styles.liveDotContainer}>
          <View style={styles.liveDot} />
          <View style={styles.liveDotPulse} />
        </View>
        <Text style={styles.liveBannerText}>
          {liveRooms.length} live session{liveRooms.length > 1 ? 's' : ''} happening now
        </Text>
        <Pressable
          style={styles.liveBannerAction}
          onPress={() => {
            Haptics.selectionAsync();
            if (liveRooms[0]) {
              handleEnterRoom(liveRooms[0]);
            }
          }}
        >
          <Text style={styles.liveBannerActionText}>Join</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };

  const renderTopicFilter = () => {
    const topics: (RecoveryRoomTopic | null)[] = [null, ...Object.keys(topicLabels) as RecoveryRoomTopic[]];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicFilterRow}
      >
        {topics.map((topic) => {
          const isActive = selectedTopic === topic;
          const label = topic ? topicLabels[topic] : 'All';
          const color = topic ? TOPIC_COLORS[topic] : Colors.primary;
          return (
            <Pressable
              key={topic ?? 'all'}
              style={[
                styles.topicChip,
                isActive && { backgroundColor: color + '25', borderColor: color },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedTopic(topic);
              }}
            >
              <Text style={[
                styles.topicChipText,
                isActive && { color },
              ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  const renderRoomCard = useCallback(({ item }: { item: RecoveryRoom }) => {
    const topicColor = TOPIC_COLORS[item.topic];
    const TopicIcon = TOPIC_ICONS[item.topic];
    const spotsLeft = item.maxMembers - item.memberCount;
    const isFull = spotsLeft <= 0;
    const lastMsg = item.messages[item.messages.length - 1];

    return (
      <Pressable
        style={({ pressed }) => [styles.roomCard, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
        onPress={() => handleEnterRoom(item)}
        testID={`room-${item.id}`}
      >
        <View style={styles.roomCardTop}>
          <View style={[styles.roomIconCircle, { backgroundColor: topicColor + '18' }]}>
            <TopicIcon size={20} color={topicColor} />
          </View>
          <View style={styles.roomCardTitleArea}>
            <View style={styles.roomNameRow}>
              <Text style={styles.roomCardName} numberOfLines={1}>{item.name}</Text>
              {item.isLive && (
                <View style={styles.liveTag}>
                  <Radio size={10} color="#FF4D4D" />
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.roomMetaRow}>
              <View style={[styles.topicBadge, { backgroundColor: topicColor + '15' }]}>
                <Text style={[styles.topicBadgeText, { color: topicColor }]}>
                  {topicLabels[item.topic]}
                </Text>
              </View>
              <Text style={styles.roomMemberText}>
                {item.memberCount}/{item.maxMembers}
              </Text>
            </View>
          </View>
          {item.isJoined ? (
            <View style={styles.joinedRow}>
              <View style={styles.joinedTag}>
                <Text style={styles.joinedTagText}>Joined</Text>
              </View>
              <Pressable
                onPress={() => handleLeaveRoomFromList(item)}
                hitSlop={10}
                style={({ pressed }) => [styles.leaveRoomIconBtn, pressed && { opacity: 0.75 }]}
                accessibilityRole="button"
                accessibilityLabel={`Leave ${item.name}`}
                testID={`leave-room-${item.id}`}
              >
                <LogOut size={16} color={Colors.danger} />
              </Pressable>
            </View>
          ) : isFull ? (
            <View style={styles.fullTag}>
              <Lock size={12} color={Colors.textMuted} />
              <Text style={styles.fullTagText}>Full</Text>
            </View>
          ) : (
            <View style={styles.openTag}>
              <Text style={styles.openTagText}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        <Text style={styles.roomCardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.roomCardBottom}>
          {item.scheduledSessions.length > 0 && (
            <View style={styles.roomSessionBadge}>
              <Calendar size={11} color={Colors.primary} />
              <Text style={styles.roomSessionText}>
                {item.scheduledSessions.length} session{item.scheduledSessions.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {lastMsg && (
          <View style={styles.roomPreviewBar}>
            <MessageSquare size={11} color={Colors.textMuted} />
            <Text style={styles.roomPreviewName}>
              {lastMsg.isAnonymous ? 'Anonymous' : lastMsg.authorName}:
            </Text>
            <Text style={styles.roomPreviewContent} numberOfLines={1}>
              {lastMsg.content}
            </Text>
          </View>
        )}

        {!isFull && spotsLeft <= 2 && !item.isJoined && (
          <View style={styles.urgencyBar}>
            <Text style={styles.urgencyText}>Almost full - join now to secure your spot</Text>
          </View>
        )}
      </Pressable>
    );
  }, [handleEnterRoom, handleLeaveRoomFromList, topicLabels]);

  const renderSessionCard = useCallback(({ item }: { item: ScheduledSession & { roomName: string } }) => {
    return (
      <View style={styles.sessionCard} testID={`session-${item.id}`}>
        <View style={styles.sessionTimeCol}>
          <Text style={styles.sessionTimeMain}>{formatSessionDate(item.scheduledAt)}</Text>
          <Text style={styles.sessionTimeSub}>{formatSessionTime(item.scheduledAt)}</Text>
          {item.isActive && (
            <View style={styles.sessionLiveDot}>
              <Radio size={10} color="#FF4D4D" />
            </View>
          )}
        </View>
        <View style={styles.sessionInfoCol}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionRoom}>{item.roomName}</Text>
          <Text style={styles.sessionDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.sessionMeta}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.sessionMetaText}>{item.durationMinutes} min</Text>
            {item.attendeeCount > 0 ? (
              <>
                <Users size={12} color={Colors.textMuted} />
                <Text style={styles.sessionMetaText}>{item.attendeeCount} attending</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    );
  }, [formatSessionDate, formatSessionTime]);

  const renderContent = () => {
    if (viewMode === 'sessions') {
      return (
        <ScreenFlatList
          data={upcomingSessions}
          renderItem={renderSessionCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Calendar size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Upcoming Sessions</Text>
              <Text style={styles.emptyText}>Check back soon. Sessions are added regularly.</Text>
            </View>
          }
        />
      );
    }

    return (
      <ScreenFlatList
        data={filteredRooms}
        renderItem={renderRoomCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          viewMode === 'rooms' ? renderTopicFilter() : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Users size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {viewMode === 'my_rooms' ? 'No Rooms Joined Yet' : 'No Rooms Found'}
            </Text>
            <Text style={styles.emptyText}>
              {viewMode === 'my_rooms'
                ? 'Join a recovery room to start connecting with others.'
                : 'Try adjusting your search or filters.'}
            </Text>
          </View>
        }
      />
    );
  };

  if (!hasFeature('recovery_rooms')) {
    return (
      <View style={styles.container}>
        <View style={styles.premiumGate}>
          <View style={styles.premiumGateIcon}>
            <Users size={32} color="#D4A574" />
          </View>
          <Text style={styles.premiumGateTitle}>Recovery Rooms</Text>
          <Text style={styles.premiumGateDesc}>
            Join small-group sessions with peers on similar recovery journeys. Safe, supportive, and anonymous.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.premiumGateBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/premium-upgrade' as never);
            }}
          >
            <Text style={styles.premiumGateBtnText}>Unlock Rooms</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.searchBar}>
        <Search size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rooms..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="room-search-input"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.modeRow}>
        {([
          { key: 'rooms' as const, label: 'All Rooms' },
          { key: 'my_rooms' as const, label: 'My Rooms' },
          { key: 'sessions' as const, label: 'Sessions' },
        ]).map(mode => {
          const isActive = viewMode === mode.key;
          return (
            <Pressable
              key={mode.key}
              style={[styles.modeTab, isActive && styles.modeTabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setViewMode(mode.key);
              }}
              testID={`mode-${mode.key}`}
            >
              <Text style={[styles.modeTabText, isActive && styles.modeTabTextActive]}>
                {mode.label}
              </Text>
              {mode.key === 'my_rooms' && joinedRooms.length > 0 && (
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>{joinedRooms.length}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {renderLiveBanner()}
      {renderContent()}

      <View style={styles.anonToggleBar}>
        <Pressable
          style={[styles.anonToggle, isAnonymousDefault && styles.anonToggleActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAnonymousDefault(!isAnonymousDefault);
          }}
          testID="anon-toggle"
        >
          {isAnonymousDefault ? (
            <EyeOff size={16} color="#FFFFFF" />
          ) : (
            <Eye size={16} color={Colors.textMuted} />
          )}
          <Text style={[styles.anonToggleText, isAnonymousDefault && styles.anonToggleTextActive]}>
            {isAnonymousDefault ? 'Anonymous Mode' : 'Visible'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={showNameSetup} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.nameModal, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.nameModalTitle}>How should we call you?</Text>
            <Text style={styles.nameModalSubtext}>
              Choose a display name for recovery rooms. You can also participate anonymously.
            </Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Your display name"
              placeholderTextColor={Colors.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              testID="room-name-input"
            />
            <Pressable
              style={[styles.anonOption, isAnonymousDefault && styles.anonOptionActive]}
              onPress={() => setAnonymousDefault(!isAnonymousDefault)}
            >
              <EyeOff size={18} color={isAnonymousDefault ? Colors.primary : Colors.textMuted} />
              <View style={styles.anonOptionInfo}>
                <Text style={[styles.anonOptionTitle, isAnonymousDefault && { color: Colors.primary }]}>
                  Stay Anonymous
                </Text>
                <Text style={styles.anonOptionDesc}>
                  Your messages will show as "Anonymous"
                </Text>
              </View>
            </Pressable>
            <View style={styles.nameModalActions}>
              <Pressable
                style={styles.nameModalCancel}
                onPress={() => {
                  setShowNameSetup(false);
                  setPendingRoomId(null);
                }}
              >
                <Text style={styles.nameModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.nameModalSave}
                onPress={handleSetName}
              >
                <Text style={styles.nameModalSaveText}>Continue</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  modeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: '#1E3A4F',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  modeTabTextActive: {
    color: Colors.primary,
  },
  modeBadge: {
    backgroundColor: Colors.primary + '30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.08)',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 77, 77, 0.2)',
  },
  liveDotContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
  },
  liveDotPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 77, 77, 0.25)',
  },
  liveBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  liveBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FF4D4D',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  liveBannerActionText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  topicFilterRow: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  roomCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  roomCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  roomIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCardTitleArea: {
    flex: 1,
  },
  roomNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomCardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FF4D4D',
    letterSpacing: 0.5,
  },
  roomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  roomMemberText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  joinedTag: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  joinedTagText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaveRoomIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },
  fullTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fullTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  openTag: {
    backgroundColor: 'rgba(125, 201, 160, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#7DC9A0',
  },
  roomCardDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  roomCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  roomSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 196, 182, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomSessionText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  roomPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  roomPreviewName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  roomPreviewContent: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  urgencyBar: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  urgencyText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 14,
  },
  sessionTimeCol: {
    alignItems: 'center',
    minWidth: 60,
  },
  sessionTimeMain: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sessionTimeSub: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  sessionLiveDot: {
    marginTop: 6,
  },
  sessionInfoCol: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  sessionRoom: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  sessionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionMetaText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  anonToggleBar: {
    position: 'absolute',
    bottom: 20,
    right: 16,
  },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  anonToggleActive: {
    backgroundColor: '#1A4A3A',
    borderColor: '#2A6A5A',
  },
  anonToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  anonToggleTextActive: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  nameModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  nameModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  nameModalSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  anonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  anonOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46, 196, 182, 0.06)',
  },
  anonOptionInfo: {
    flex: 1,
  },
  anonOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  anonOptionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  nameModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  nameModalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nameModalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  nameModalSave: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  nameModalSaveText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  premiumGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  premiumGateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212,165,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  premiumGateTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  premiumGateDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumGateBtn: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  premiumGateBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.background,
  },
});
