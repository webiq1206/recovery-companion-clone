import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Modal, Alert, Animated, KeyboardAvoidingView, Platform,
  Linking,
} from 'react-native';
import { ScreenFlatList } from '@/components/ScreenFlatList';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Heart, Shield, MessageCircle, Users, Phone, Plus, X,
  Send, UserPlus, CircleDot, Handshake, ChevronRight,
  PhoneCall, Trash2, ToggleLeft, ToggleRight, Radio,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useConnection } from '@/providers/ConnectionProvider';
import { TrustedContact, PeerChat, SafeRoom, PeerMessage, RoomMessage, SponsorMessage } from '@/types';
import { useHydrateToolUsageStore, useToolUsageStore } from '@/features/tools/state/useToolUsageStore';

type ConnectionTab = 'circle' | 'peers' | 'rooms' | 'sponsor';

const ROLE_LABELS: Record<TrustedContact['role'], string> = {
  friend: 'Friend',
  family: 'Family',
  sponsor: 'Sponsor',
  therapist: 'Therapist',
  peer: 'Peer',
};

const ROLE_COLORS: Record<TrustedContact['role'], string> = {
  friend: '#5B9BD5',
  family: '#E8917A',
  sponsor: '#7DC9A0',
  therapist: '#C4A6E0',
  peer: '#F0C75E',
};

export default function ConnectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useHydrateToolUsageStore();
  const logToolUsage = useToolUsageStore.use.logToolUsage();
  const {
    trustedContacts, peerChats, safeRooms, sponsorPairing, displayName,
    isLoading, setUserDisplayName,
    addTrustedContact, removeTrustedContact, updateContactAvailability,
    startPeerChat, sendPeerMessage, endPeerChat,
    joinRoom, leaveRoom, sendRoomMessage,
    requestSponsorPairing, acceptSponsorPairing, endSponsorPairing,
    sendSponsorMessage,
  } = useConnection();

  const [activeTab, setActiveTab] = useState<ConnectionTab>('circle');
  const [showAddContact, setShowAddContact] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactRole, setContactRole] = useState<TrustedContact['role']>('friend');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [showSponsorChat, setShowSponsorChat] = useState<boolean>(false);
  const [sponsorMessageText, setSponsorMessageText] = useState<string>('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleAddContact = useCallback(() => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Required', 'Please enter a name and phone number.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTrustedContact({
      name: contactName.trim(),
      phone: contactPhone.trim(),
      role: contactRole,
      isAvailable: true,
    });
    setContactName('');
    setContactPhone('');
    setContactRole('friend');
    setShowAddContact(false);
  }, [contactName, contactPhone, contactRole, addTrustedContact]);

  const handleCallContact = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Unable to Call', 'Could not open the phone dialer.');
    });
  }, []);

  const handleSMSContact = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const cleaned = phone.replace(/[^0-9+]/g, '');
    const fromName = displayName || 'Me';
    const message = encodeURIComponent(`Hi - it's ${fromName}. Just checking in. Could use a little support right now.`);
    const separator = Platform.OS === 'ios' ? '&' : '?';

    logToolUsage({
      toolId: 'connect',
      context: 'daily_guidance',
      action: 'completed',
      meta: { method: 'sms', phone: cleaned },
    });

    Linking.openURL(`sms:${cleaned}${separator}body=${message}`).catch(() => {
      Alert.alert('Unable to Text', `Please text ${phone} manually.`);
    });
  }, [displayName, logToolUsage]);

  const handleRemoveContact = useCallback((id: string, name: string) => {
    Alert.alert('Remove Contact', `Remove ${name} from your trusted circle?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeTrustedContact(id);
        },
      },
    ]);
  }, [removeTrustedContact]);

  const handleStartChat = useCallback(() => {
    if (!displayName) {
      setShowNamePrompt(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const chatId = startPeerChat('general');
    setActiveChatId(chatId);
  }, [displayName, startPeerChat]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeChatId) {
      sendPeerMessage(activeChatId, messageText.trim());
    } else if (activeRoomId) {
      sendRoomMessage(activeRoomId, messageText.trim());
    }
    setMessageText('');
  }, [messageText, activeChatId, activeRoomId, sendPeerMessage, sendRoomMessage]);

  const handleSetName = useCallback(() => {
    if (!nameInput.trim()) return;
    setUserDisplayName(nameInput.trim());
    setShowNamePrompt(false);
    setNameInput('');
  }, [nameInput, setUserDisplayName]);

  const handleSendSponsorMessage = useCallback(() => {
    if (!sponsorMessageText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendSponsorMessage(sponsorMessageText.trim());
    setSponsorMessageText('');
  }, [sponsorMessageText, sendSponsorMessage]);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return peerChats.find(c => c.id === activeChatId) ?? null;
  }, [activeChatId, peerChats]);

  const activeRoom = useMemo(() => {
    if (!activeRoomId) return null;
    return safeRooms.find(r => r.id === activeRoomId) ?? null;
  }, [activeRoomId, safeRooms]);

  const availableContacts = useMemo(() => {
    return trustedContacts.filter(c => c.isAvailable);
  }, [trustedContacts]);

  const formatTime = useCallback((dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const renderInstantReach = () => (
    <Animated.View style={[styles.reachSection, { transform: [{ scale: pulseAnim }] }]}>
      <Pressable
        style={({ pressed }) => [styles.reachButton, pressed && styles.reachButtonPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          if (availableContacts.length > 0) {
            handleCallContact(availableContacts[0].phone);
          } else {
            Alert.alert(
              'No Contacts Yet',
              'Add someone to your trusted circle to use instant reach.',
              [{ text: 'Add Contact', onPress: () => setShowAddContact(true) }, { text: 'Later' }]
            );
          }
        }}
        testID="instant-reach-btn"
      >
        <PhoneCall size={22} color="#FFFFFF" />
        <Text style={styles.reachButtonText}>Reach Out Now</Text>
        {availableContacts.length > 0 && (
          <Text style={styles.reachSubtext}>
            Call {availableContacts[0].name}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );

  const renderContactItem = useCallback(({ item }: { item: TrustedContact }) => {
    const roleColor = ROLE_COLORS[item.role];
    return (
      <View style={styles.contactCard} testID={`contact-${item.id}`}>
        <View style={styles.contactLeft}>
          <View style={[styles.contactAvatar, { backgroundColor: roleColor + '25' }]}>
            <Text style={[styles.contactAvatarText, { color: roleColor }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.name}</Text>
            <View style={styles.contactMeta}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[item.role]}</Text>
              </View>
              <CircleDot size={8} color={item.isAvailable ? Colors.success : Colors.textMuted} />
            </View>
          </View>
        </View>
        <View style={styles.contactActions}>
          <Pressable
            style={styles.contactActionBtn}
            onPress={() => handleCallContact(item.phone)}
            hitSlop={8}
          >
            <Phone size={18} color={Colors.success} />
          </Pressable>
          <Pressable
            style={styles.contactActionBtn}
            onPress={() => handleSMSContact(item.phone)}
            hitSlop={8}
          >
            <Send size={18} color={Colors.primary} />
          </Pressable>
          <Pressable
            style={styles.contactActionBtn}
            onPress={() => updateContactAvailability(item.id, !item.isAvailable)}
            hitSlop={8}
          >
            {item.isAvailable ? (
              <ToggleRight size={20} color={Colors.success} />
            ) : (
              <ToggleLeft size={20} color={Colors.textMuted} />
            )}
          </Pressable>
          <Pressable
            style={styles.contactActionBtn}
            onPress={() => handleRemoveContact(item.id, item.name)}
            hitSlop={8}
          >
            <Trash2 size={16} color={Colors.danger} />
          </Pressable>
        </View>
      </View>
    );
  }, [handleCallContact, handleSMSContact, handleRemoveContact, updateContactAvailability]);

  const renderCircleTab = () => (
    <ScreenFlatList
      data={trustedContacts}
      renderItem={renderContactItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {renderInstantReach()}
          <View style={styles.sectionHeader}>
            <Shield size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Your Trusted Circle</Text>
            <Text style={styles.sectionCount}>{trustedContacts.length}</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Heart size={32} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Build Your Circle</Text>
          <Text style={styles.emptyText}>
            Add people you trust. They will be your lifeline when things get tough.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emptyAction, pressed && styles.btnPressed]}
            onPress={() => setShowAddContact(true)}
          >
            <Plus size={16} color={Colors.white} />
            <Text style={styles.emptyActionText}>Add First Contact</Text>
          </Pressable>
        </View>
      }
      ListFooterComponent={
        trustedContacts.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.addContactInline, pressed && styles.btnPressed]}
            onPress={() => setShowAddContact(true)}
            testID="add-contact-btn"
          >
            <Plus size={18} color={Colors.primary} />
            <Text style={styles.addContactInlineText}>Add to Circle</Text>
          </Pressable>
        ) : null
      }
    />
  );

  const renderPeerChatItem = useCallback(({ item }: { item: PeerChat }) => {
    const lastMessage = item.messages[item.messages.length - 1];
    return (
      <Pressable
        style={({ pressed }) => [styles.chatCard, pressed && { opacity: 0.9 }]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveChatId(item.id);
        }}
        testID={`chat-${item.id}`}
      >
        <View style={styles.chatLeft}>
          <View style={styles.chatAvatar}>
            <MessageCircle size={18} color={Colors.primary} />
          </View>
          <View style={styles.chatInfo}>
            <View style={styles.chatNameRow}>
              <Text style={styles.chatName}>{item.anonymousName}</Text>
              {item.isActive && <View style={styles.activeDot} />}
            </View>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {lastMessage?.content ?? 'Start a conversation'}
            </Text>
          </View>
        </View>
        <View style={styles.chatRight}>
          <Text style={styles.chatTime}>{formatTime(lastMessage?.timestamp ?? item.createdAt)}</Text>
          <ChevronRight size={16} color={Colors.textMuted} />
        </View>
      </Pressable>
    );
  }, [formatTime]);

  const renderPeersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.peerHeader}>
        <View style={styles.peerSafeNotice}>
          <Shield size={16} color="#7DC9A0" />
          <Text style={styles.peerSafeText}>All chats are anonymous and private</Text>
        </View>
      </View>
      <ScreenFlatList
        data={peerChats}
        renderItem={renderPeerChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Peer Support</Text>
            <Text style={styles.emptyText}>
              Connect anonymously with someone who understands what you are going through.
            </Text>
          </View>
        }
      />
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleStartChat}
        testID="new-peer-chat-btn"
      >
        <Plus size={24} color={Colors.white} />
      </Pressable>
    </View>
  );

  const renderRoomItem = useCallback(({ item }: { item: SafeRoom }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.roomCard, pressed && { opacity: 0.9 }]}
        onPress={() => {
          Haptics.selectionAsync();
          if (!item.isJoined) {
            if (!displayName) {
              setShowNamePrompt(true);
              return;
            }
            joinRoom(item.id);
          }
          setActiveRoomId(item.id);
        }}
        testID={`room-${item.id}`}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomIcon}>
            <Users size={18} color={Colors.primary} />
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text style={styles.roomMembers}>
              {item.memberCount}/{item.maxMembers} members
            </Text>
          </View>
          {item.isJoined ? (
            <View style={styles.joinedBadge}>
              <Text style={styles.joinedText}>Joined</Text>
            </View>
          ) : (
            <View style={styles.joinBadge}>
              <Text style={styles.joinText}>Join</Text>
            </View>
          )}
        </View>
        <Text style={styles.roomDescription}>{item.description}</Text>
        {item.messages.length > 0 && (
          <View style={styles.roomPreview}>
            <Text style={styles.roomPreviewAuthor}>
              {item.messages[item.messages.length - 1].authorName}:
            </Text>
            <Text style={styles.roomPreviewText} numberOfLines={1}>
              {item.messages[item.messages.length - 1].content}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }, [displayName, joinRoom]);

  const renderRoomsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.peerHeader}>
        <View style={styles.peerSafeNotice}>
          <Heart size={16} color="#E8917A" />
          <Text style={styles.peerSafeText}>Small, safe spaces. No overwhelm.</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.recoveryRoomsBanner, pressed && { opacity: 0.9 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/recovery-rooms' as any);
        }}
        testID="recovery-rooms-btn"
      >
        <View style={styles.recoveryRoomsBannerIcon}>
          <Radio size={20} color="#FF6B6B" />
        </View>
        <View style={styles.recoveryRoomsBannerInfo}>
          <Text style={styles.recoveryRoomsBannerTitle}>Recovery Rooms</Text>
          <Text style={styles.recoveryRoomsBannerDesc}>Structured small groups with live sessions, moderation, and anonymous support</Text>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} />
      </Pressable>
      <ScreenFlatList
        data={safeRooms}
        renderItem={renderRoomItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderSponsorTab = () => (
    <ScreenScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sponsorIntro}>
        <View style={styles.sponsorIntroIcon}>
          <Handshake size={36} color={Colors.primary} />
        </View>
        <Text style={styles.sponsorIntroTitle}>Sponsor Pairing</Text>
        <Text style={styles.sponsorIntroText}>
          Get matched with an experienced peer who has walked this path before. Completely optional and always confidential.
        </Text>
      </View>

      {!sponsorPairing && (
        <Pressable
          style={({ pressed }) => [styles.sponsorRequestBtn, pressed && styles.btnPressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            requestSponsorPairing();
          }}
          testID="request-sponsor-btn"
        >
          <UserPlus size={20} color={Colors.white} />
          <Text style={styles.sponsorRequestText}>Request a Sponsor Match</Text>
        </Pressable>
      )}

      {sponsorPairing?.status === 'pending' && (
        <View style={styles.sponsorCard}>
          <View style={styles.sponsorStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.sponsorStatusLabel}>Matching in progress...</Text>
          </View>
          <Text style={styles.sponsorCardName}>{sponsorPairing.sponsorName}</Text>
          <Text style={styles.sponsorCardDetail}>
            We found a potential match. Would you like to connect?
          </Text>
          {sponsorPairing.sponsorRecoveryTypes && sponsorPairing.sponsorRecoveryTypes.length > 0 && (
            <View style={styles.recoveryTypesSection}>
              <Text style={styles.recoveryTypesLabel}>Recovering from:</Text>
              <View style={styles.recoveryTypesRow}>
                {sponsorPairing.sponsorRecoveryTypes.map((rt) => {
                  const isMatch = sponsorPairing.matchedRecoveryTypes?.some(
                    m => m.toLowerCase() === rt.toLowerCase()
                  );
                  return (
                    <View
                      key={rt}
                      style={[
                        styles.recoveryTypeChip,
                        isMatch && styles.recoveryTypeChipMatch,
                      ]}
                    >
                      <Text
                        style={[
                          styles.recoveryTypeText,
                          isMatch && styles.recoveryTypeTextMatch,
                        ]}
                      >
                        {rt}
                      </Text>
                      {isMatch && (
                        <View style={styles.matchDot} />
                      )}
                    </View>
                  );
                })}
              </View>
              {sponsorPairing.matchedRecoveryTypes && sponsorPairing.matchedRecoveryTypes.length > 0 && (
                <Text style={styles.matchNotice}>
                  Shared recovery: {sponsorPairing.matchedRecoveryTypes.join(', ')}
                </Text>
              )}
            </View>
          )}
          <View style={styles.sponsorActions}>
            <Pressable
              style={({ pressed }) => [styles.sponsorAcceptBtn, pressed && styles.btnPressed]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                acceptSponsorPairing();
              }}
            >
              <Text style={styles.sponsorAcceptText}>Accept Match</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.sponsorDeclineBtn, pressed && styles.btnPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                endSponsorPairing();
              }}
            >
              <Text style={styles.sponsorDeclineText}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      )}

      {sponsorPairing?.status === 'active' && (
        <View style={styles.sponsorCard}>
          <View style={styles.sponsorStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.sponsorStatusLabel}>Active Pairing</Text>
          </View>
          <View style={styles.sponsorActiveRow}>
            <View style={styles.sponsorAvatar}>
              <Text style={styles.sponsorAvatarText}>
                {sponsorPairing.sponsorName.charAt(0)}
              </Text>
            </View>
            <View style={styles.sponsorActiveInfo}>
              <Text style={styles.sponsorCardName}>{sponsorPairing.sponsorName}</Text>
              <Text style={styles.sponsorCardDetail}>Your guide on this journey</Text>
            </View>
          </View>
          {sponsorPairing.sponsorRecoveryTypes && sponsorPairing.sponsorRecoveryTypes.length > 0 && (
            <View style={styles.recoveryTypesSection}>
              <Text style={styles.recoveryTypesLabel}>Recovering from:</Text>
              <View style={styles.recoveryTypesRow}>
                {sponsorPairing.sponsorRecoveryTypes.map((rt) => {
                  const isMatch = sponsorPairing.matchedRecoveryTypes?.some(
                    m => m.toLowerCase() === rt.toLowerCase()
                  );
                  return (
                    <View
                      key={rt}
                      style={[
                        styles.recoveryTypeChip,
                        isMatch && styles.recoveryTypeChipMatch,
                      ]}
                    >
                      <Text
                        style={[
                          styles.recoveryTypeText,
                          isMatch && styles.recoveryTypeTextMatch,
                        ]}
                      >
                        {rt}
                      </Text>
                      {isMatch && (
                        <View style={styles.matchDot} />
                      )}
                    </View>
                  );
                })}
              </View>
              {sponsorPairing.matchedRecoveryTypes && sponsorPairing.matchedRecoveryTypes.length > 0 && (
                <Text style={styles.matchNotice}>
                  Shared recovery: {sponsorPairing.matchedRecoveryTypes.join(', ')}
                </Text>
              )}
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.sponsorMessageBtn, pressed && styles.btnPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowSponsorChat(true);
            }}
            testID="message-sponsor-btn"
          >
            <MessageCircle size={18} color={Colors.white} />
            <Text style={styles.sponsorMessageBtnText}>Message Sponsor</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.sponsorEndBtn, pressed && styles.btnPressed]}
            onPress={() => {
              Alert.alert('End Pairing', 'Are you sure you want to end this sponsor pairing?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'End', style: 'destructive',
                  onPress: () => endSponsorPairing(),
                },
              ]);
            }}
          >
            <Text style={styles.sponsorEndText}>End Pairing</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.sponsorInfoCards}>
        <View style={styles.infoCard}>
          <Shield size={20} color="#7DC9A0" />
          <Text style={styles.infoCardTitle}>Confidential</Text>
          <Text style={styles.infoCardText}>Everything shared stays between you and your sponsor.</Text>
        </View>
        <View style={styles.infoCard}>
          <Heart size={20} color="#E8917A" />
          <Text style={styles.infoCardTitle}>No Pressure</Text>
          <Text style={styles.infoCardText}>Go at your own pace. You can end anytime.</Text>
        </View>
      </View>
    </ScreenScrollView>
  );

  const renderChatModal = () => {
    const chat = activeChat;
    if (!chat) return null;
    return (
      <Modal visible={!!activeChatId} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.chatModal, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.chatModalHeader}>
              <Pressable onPress={() => { setActiveChatId(null); setMessageText(''); }} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
              <View style={styles.chatModalTitleRow}>
                <Text style={styles.chatModalTitle}>{chat.anonymousName}</Text>
                {chat.isActive && <View style={styles.activeDotSmall} />}
              </View>
              {chat.isActive ? (
                <Pressable
                  onPress={() => {
                    Alert.alert('End Chat', 'Are you sure you want to end this chat?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'End', style: 'destructive', onPress: () => { endPeerChat(chat.id); setActiveChatId(null); } },
                    ]);
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.endChatText}>End</Text>
                </Pressable>
              ) : (
                <View style={{ width: 36 }} />
              )}
            </View>
            <ScreenFlatList
              data={chat.messages}
              keyExtractor={item => item.id}
              style={styles.messageList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: { item: PeerMessage }) => (
                <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
                  <Text style={[styles.messageText, item.isOwn ? styles.ownMessageText : styles.otherMessageText]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.messageTime, item.isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
                    {formatTime(item.timestamp)}
                  </Text>
                </View>
              )}
            />
            {chat.isActive && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.textMuted}
                  value={messageText}
                  onChangeText={setMessageText}
                  maxLength={500}
                  testID="chat-input"
                />
                <Pressable
                  style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Send size={18} color={messageText.trim() ? Colors.white : Colors.textMuted} />
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderRoomModal = () => {
    const room = activeRoom;
    if (!room) return null;
    return (
      <Modal visible={!!activeRoomId} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.chatModal, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.chatModalHeader}>
              <Pressable onPress={() => { setActiveRoomId(null); setMessageText(''); }} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
              <View style={styles.chatModalTitleRow}>
                <Text style={styles.chatModalTitle}>{room.name}</Text>
                <Text style={styles.roomMembersBadge}>{room.memberCount} here</Text>
              </View>
              {room.isJoined ? (
                <Pressable
                  onPress={() => {
                    Alert.alert('Leave Room', 'Leave this room?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Leave', style: 'destructive', onPress: () => { leaveRoom(room.id); setActiveRoomId(null); } },
                    ]);
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.endChatText}>Leave</Text>
                </Pressable>
              ) : (
                <View style={{ width: 36 }} />
              )}
            </View>
            <ScreenFlatList
              data={room.messages}
              keyExtractor={item => item.id}
              style={styles.messageList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: { item: RoomMessage }) => (
                <View style={[styles.roomMessageContainer, item.isOwn && styles.roomMessageOwn]}>
                  {!item.isOwn && (
                    <Text style={styles.roomMessageAuthor}>{item.authorName}</Text>
                  )}
                  <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, item.isOwn ? styles.ownMessageText : styles.otherMessageText]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.messageTime, item.isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              )}
            />
            {room.isJoined && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Share with the group..."
                  placeholderTextColor={Colors.textMuted}
                  value={messageText}
                  onChangeText={setMessageText}
                  maxLength={500}
                  testID="room-input"
                />
                <Pressable
                  style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Send size={18} color={messageText.trim() ? Colors.white : Colors.textMuted} />
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.headerArea}>
        <Text style={styles.headerWarmText}>You are not alone</Text>
      </View>

      <View style={styles.tabRow}>
        {([
          { key: 'circle' as const, label: 'Circle', icon: Shield },
          { key: 'peers' as const, label: 'Peers', icon: MessageCircle },
          { key: 'rooms' as const, label: 'Rooms', icon: Users },
          { key: 'sponsor' as const, label: 'Sponsor', icon: Handshake },
        ]).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
              testID={`tab-${tab.key}`}
            >
              <Icon size={16} color={isActive ? Colors.white : Colors.textMuted} />
              <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.supportResourcesBelowTabs}>
        <Pressable
          style={({ pressed }) => [
            styles.supportResourcesBtn,
            pressed && { opacity: 0.9 },
          ]}
          onPress={() => router.push('/support' as any)}
          testID="support-resources-btn"
        >
          <MessageCircle size={16} color={Colors.primary} />
          <Text style={styles.supportResourcesBtnText}>
            Support & Resources
          </Text>
        </Pressable>
      </View>

      {activeTab === 'circle' && renderCircleTab()}
      {activeTab === 'peers' && renderPeersTab()}
      {activeTab === 'rooms' && renderRoomsTab()}
      {activeTab === 'sponsor' && renderSponsorTab()}

      {renderChatModal()}
      {renderRoomModal()}

      <Modal visible={showSponsorChat} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.chatModal, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.chatModalHeader}>
              <Pressable onPress={() => { setShowSponsorChat(false); setSponsorMessageText(''); }} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
              <View style={styles.chatModalTitleRow}>
                <View style={styles.sponsorChatAvatar}>
                  <Text style={styles.sponsorChatAvatarText}>
                    {sponsorPairing?.sponsorName?.charAt(0) ?? 'S'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.chatModalTitle}>{sponsorPairing?.sponsorName ?? 'Sponsor'}</Text>
                  <Text style={styles.sponsorChatSubtitle}>Your Sponsor</Text>
                </View>
              </View>
              <View style={{ width: 22 }} />
            </View>

            {(!sponsorPairing?.messages || sponsorPairing.messages.length === 0) ? (
              <View style={styles.sponsorChatEmpty}>
                <View style={styles.sponsorChatEmptyIcon}>
                  <MessageCircle size={32} color={Colors.textMuted} />
                </View>
                <Text style={styles.sponsorChatEmptyTitle}>Start a Conversation</Text>
                <Text style={styles.sponsorChatEmptyText}>
                  Reach out to {sponsorPairing?.sponsorName ?? 'your sponsor'}. They are here to support you.
                </Text>
              </View>
            ) : (
              <ScreenFlatList
                data={sponsorPairing?.messages ?? []}
                keyExtractor={item => item.id}
                style={styles.messageList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }: { item: SponsorMessage }) => (
                  <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, item.isOwn ? styles.ownMessageText : styles.otherMessageText]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.messageTime, item.isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>
                )}
              />
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Message your sponsor..."
                placeholderTextColor={Colors.textMuted}
                value={sponsorMessageText}
                onChangeText={setSponsorMessageText}
                maxLength={500}
                testID="sponsor-chat-input"
              />
              <Pressable
                style={[styles.sendBtn, !sponsorMessageText.trim() && styles.sendBtnDisabled]}
                onPress={handleSendSponsorMessage}
                disabled={!sponsorMessageText.trim()}
              >
                <Send size={18} color={sponsorMessageText.trim() ? Colors.white : Colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAddContact} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.formModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.formHeader}>
              <Pressable onPress={() => setShowAddContact(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.formTitle}>Add to Circle</Text>
              <View style={{ width: 22 }} />
            </View>

            <TextInput
              style={styles.formInput}
              placeholder="Name"
              placeholderTextColor={Colors.textMuted}
              value={contactName}
              onChangeText={setContactName}
              testID="contact-name-input"
            />
            <TextInput
              style={styles.formInput}
              placeholder="Phone number"
              placeholderTextColor={Colors.textMuted}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              testID="contact-phone-input"
            />

            <Text style={styles.formLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['friend', 'family', 'sponsor', 'therapist', 'peer'] as TrustedContact['role'][]).map(role => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleChip,
                    contactRole === role && { backgroundColor: ROLE_COLORS[role] + '30', borderColor: ROLE_COLORS[role] },
                  ]}
                  onPress={() => setContactRole(role)}
                >
                  <Text style={[
                    styles.roleChipText,
                    contactRole === role && { color: ROLE_COLORS[role] },
                  ]}>
                    {ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.formSubmitBtn, pressed && styles.btnPressed]}
              onPress={handleAddContact}
              testID="submit-contact-btn"
            >
              <Text style={styles.formSubmitText}>Add Contact</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNamePrompt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.namePromptModal, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.namePromptTitle}>Choose a Display Name</Text>
            <Text style={styles.namePromptSubtext}>
              This is how others will see you in rooms and chats. You can use a nickname.
            </Text>
            <TextInput
              style={styles.formInput}
              placeholder="Your display name"
              placeholderTextColor={Colors.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              testID="display-name-input"
            />
            <View style={styles.namePromptActions}>
              <Pressable
                style={({ pressed }) => [styles.namePromptCancel, pressed && styles.btnPressed]}
                onPress={() => setShowNamePrompt(false)}
              >
                <Text style={styles.namePromptCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.namePromptSubmit, pressed && styles.btnPressed]}
                onPress={handleSetName}
              >
                <Text style={styles.namePromptSubmitText}>Save</Text>
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
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerWarmText: {
    fontSize: 13,
    color: '#7DC9A0',
    fontWeight: '500' as const,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 0,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 3,
  },
  supportResourcesBelowTabs: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: '#1E3A4F',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  tabItemTextActive: {
    color: Colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  reachSection: {
    marginBottom: 16,
  },
  reachButton: {
    backgroundColor: '#1A4A3A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A6A5A',
  },
  reachButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  reachButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 8,
  },
  reachSubtext: {
    fontSize: 12,
    color: '#7DC9A0',
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  supportResourcesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  supportResourcesBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 6,
  },
  contactActionBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  addContactInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addContactInlineText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  peerHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  peerSafeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(125, 201, 160, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  peerSafeText: {
    fontSize: 13,
    color: '#7DC9A0',
    fontWeight: '500' as const,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  chatPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  chatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  roomCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  roomIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  roomMembers: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roomMembersBadge: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  joinedBadge: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  joinBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  roomDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  roomPreview: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
  },
  roomPreviewAuthor: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  roomPreviewText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  sponsorIntro: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sponsorIntroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46, 196, 182, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sponsorIntroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  sponsorIntroText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  sponsorRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  sponsorRequestText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  sponsorCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sponsorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sponsorStatusLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sponsorCardName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  sponsorCardDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sponsorActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  sponsorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(46, 196, 182, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  sponsorActiveInfo: {
    flex: 1,
  },
  sponsorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sponsorAcceptBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sponsorAcceptText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  sponsorDeclineBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sponsorDeclineText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sponsorEndBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sponsorMessageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  sponsorMessageBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  sponsorEndText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  sponsorChatAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(46, 196, 182, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorChatAvatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  sponsorChatSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  sponsorChatEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sponsorChatEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sponsorChatEmptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  sponsorChatEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  recoveryTypesSection: {
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: 'rgba(46, 196, 182, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  recoveryTypesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  recoveryTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recoveryTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recoveryTypeChipMatch: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    borderColor: 'rgba(46, 196, 182, 0.4)',
  },
  recoveryTypeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  recoveryTypeTextMatch: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  matchNotice: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7DC9A0',
    marginTop: 10,
  },
  sponsorInfoCards: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  infoCardText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  chatModal: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    flex: 1,
  },
  chatModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chatModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatModalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  endChatText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  messageList: {
    flex: 1,
    marginBottom: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
  },
  ownBubble: {
    backgroundColor: '#1A4A3A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#E0F5EE',
  },
  otherMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(224, 245, 238, 0.5)',
    textAlign: 'right' as const,
  },
  otherMessageTime: {
    color: Colors.textMuted,
  },
  roomMessageContainer: {
    marginBottom: 4,
  },
  roomMessageOwn: {
    alignItems: 'flex-end',
  },
  roomMessageAuthor: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 2,
    marginLeft: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  formModal: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  formInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  formSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  formSubmitText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  namePromptModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    alignSelf: 'center',
    width: '90%',
    position: 'absolute',
    top: '30%',
  },
  namePromptTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  namePromptSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  namePromptActions: {
    flexDirection: 'row',
    gap: 10,
  },
  namePromptCancel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  namePromptCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  namePromptSubmit: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  namePromptSubmitText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  recoveryRoomsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    gap: 12,
  },
  recoveryRoomsBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryRoomsBannerInfo: {
    flex: 1,
  },
  recoveryRoomsBannerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  recoveryRoomsBannerDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
