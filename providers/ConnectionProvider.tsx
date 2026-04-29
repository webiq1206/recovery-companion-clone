import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import {
  TrustedContact,
  PeerChat,
  PeerMessage,
  SafeRoom,
  RoomMessage,
  SponsorPairing,
  SponsorMessage,
  UserProfile,
} from '../types';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';
import {
  ANONYMOUS_CHAT_IDENTITY_QUERY_KEY,
  formatAnonymousChatHandle,
  generateRandomIdentityLabel,
  loadOrCreateAnonymousIdentity,
} from '../core/anonymousIdentity';

const STORAGE_KEYS = {
  TRUSTED_CONTACTS: 'connection_trusted_contacts',
  PEER_CHATS: 'connection_peer_chats',
  SAFE_ROOMS: 'connection_safe_rooms',
  SPONSOR_PAIRING: 'connection_sponsor_pairing',
  USER_DISPLAY_NAME: 'connection_display_name',
  BLOCKED_PEER_NAMES: 'connection_blocked_peer_names',
  BLOCKED_ROOM_AUTHORS: 'connection_blocked_room_authors',
  LOCAL_UGC_REPORTS: 'connection_local_ugc_reports',
};

export type ConnectionLocalUgcReport = {
  id: string;
  scope: 'peer' | 'connection_room';
  contextId: string;
  authorLabel: string;
  contentPreview: string;
  createdAt: string;
};

const SAMPLE_ROOMS: SafeRoom[] = [
  {
    id: 'room_1',
    name: 'Morning Check-In',
    description: 'Start your day with others who understand. Share how you are feeling.',
    memberCount: 8,
    maxMembers: 12,
    topic: 'daily',
    isJoined: false,
    createdAt: '2026-02-10T08:00:00.000Z',
    lastActivity: '2026-02-16T07:30:00.000Z',
    messages: [
      { id: 'rm_1', roomId: 'room_1', authorName: 'SteadyRiver45', content: 'Good morning everyone. Day 45 here. Feeling grateful today.', timestamp: '2026-02-16T07:15:00.000Z', isOwn: false },
      { id: 'rm_2', roomId: 'room_1', authorName: 'QuietOak08', content: 'Morning! Had a rough night but showing up anyway. That counts right?', timestamp: '2026-02-16T07:20:00.000Z', isOwn: false },
      { id: 'rm_3', roomId: 'room_1', authorName: 'KindHarbor12', content: 'It absolutely counts. Showing up is everything.', timestamp: '2026-02-16T07:25:00.000Z', isOwn: false },
    ],
  },
  {
    id: 'room_2',
    name: 'Cravings Support',
    description: 'A safe space when urges hit. No judgment, just support.',
    memberCount: 5,
    maxMembers: 8,
    topic: 'cravings',
    isJoined: false,
    createdAt: '2026-02-08T10:00:00.000Z',
    lastActivity: '2026-02-16T06:00:00.000Z',
    messages: [
      { id: 'rm_4', roomId: 'room_2', authorName: 'BraveBrook19', content: 'Having a hard moment right now. Trying to breathe through it.', timestamp: '2026-02-16T05:45:00.000Z', isOwn: false },
      { id: 'rm_5', roomId: 'room_2', authorName: 'CalmSummit64', content: 'You are not alone. This will pass. Focus on the next 5 minutes.', timestamp: '2026-02-16T05:50:00.000Z', isOwn: false },
    ],
  },
  {
    id: 'room_3',
    name: 'Evening Wind-Down',
    description: 'End the day peacefully. Reflect and release.',
    memberCount: 6,
    maxMembers: 10,
    topic: 'evening',
    isJoined: false,
    createdAt: '2026-02-09T20:00:00.000Z',
    lastActivity: '2026-02-15T21:30:00.000Z',
    messages: [
      { id: 'rm_6', roomId: 'room_3', authorName: 'GentlePine33', content: 'Made it through another day. Sending strength to everyone here.', timestamp: '2026-02-15T21:00:00.000Z', isOwn: false },
      { id: 'rm_7', roomId: 'room_3', authorName: 'WildHeron70', content: 'Grateful for this space. Sleep well everyone.', timestamp: '2026-02-15T21:25:00.000Z', isOwn: false },
    ],
  },
  {
    id: 'room_4',
    name: 'New Beginnings',
    description: 'For those in their first 30 days. You belong here.',
    memberCount: 4,
    maxMembers: 8,
    topic: 'newcomers',
    isJoined: false,
    createdAt: '2026-02-12T12:00:00.000Z',
    lastActivity: '2026-02-16T04:00:00.000Z',
    messages: [
      { id: 'rm_8', roomId: 'room_4', authorName: 'BrightPath03', content: 'Day 3 here. Hardest thing I have ever done but I am trying.', timestamp: '2026-02-16T03:45:00.000Z', isOwn: false },
      { id: 'rm_9', roomId: 'room_4', authorName: 'SteadyMeadow41', content: 'Day 3 is huge. You are doing incredible work just being here.', timestamp: '2026-02-16T03:55:00.000Z', isOwn: false },
    ],
  },
];

const SAMPLE_PEER_CHATS: PeerChat[] = [
  {
    id: 'peer_1',
    anonymousName: 'KindRiver55',
    messages: [
      { id: 'pm_1', chatId: 'peer_1', content: 'Hey, just wanted to check in. How are you holding up?', isOwn: false, timestamp: '2026-02-15T14:00:00.000Z' },
      { id: 'pm_2', chatId: 'peer_1', content: 'Better today than yesterday. Thanks for asking.', isOwn: true, timestamp: '2026-02-15T14:05:00.000Z' },
      { id: 'pm_3', chatId: 'peer_1', content: 'That is progress. Every little bit counts.', isOwn: false, timestamp: '2026-02-15T14:08:00.000Z' },
    ],
    createdAt: '2026-02-14T10:00:00.000Z',
    isActive: true,
    topic: 'general',
  },
];

async function loadItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (e) {
    console.log(`Error loading ${key}:`, e);
    return fallback;
  }
}

async function saveItem<T>(key: string, data: T): Promise<T> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
  return data;
}

const PRACTICE_MSG_BURST = { max: 28, windowMs: 60_000 };
const PRACTICE_REPORT_BURST = { max: 18, windowMs: 3600_000 };

function allowInSlidingWindow(
  ref: { current: number[] },
  policy: { max: number; windowMs: number },
): boolean {
  const now = Date.now();
  const pruned = ref.current.filter((t) => now - t < policy.windowMs);
  if (pruned.length >= policy.max) {
    ref.current = pruned;
    return false;
  }
  pruned.push(now);
  ref.current = pruned;
  return true;
}

export const [ConnectionProvider, useConnection] = createContextHook(() => {
  const queryClient = useQueryClient();
  const peerMessageTimesRef = useRef<number[]>([]);
  const roomMessageTimesRef = useRef<number[]>([]);
  const localReportTimesRef = useRef<number[]>([]);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [peerChats, setPeerChats] = useState<PeerChat[]>([]);
  const [safeRooms, setSafeRooms] = useState<SafeRoom[]>([]);
  const [sponsorPairing, setSponsorPairing] = useState<SponsorPairing | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  const contactsQuery = useQuery({
    queryKey: ['connectionContacts'],
    queryFn: () => loadItem<TrustedContact[]>(STORAGE_KEYS.TRUSTED_CONTACTS, []),
    staleTime: Infinity,
  });

  const chatsQuery = useQuery({
    queryKey: ['connectionChats'],
    queryFn: () =>
      loadItem<PeerChat[]>(
        STORAGE_KEYS.PEER_CHATS,
        arePeerPracticeFeaturesEnabled() ? SAMPLE_PEER_CHATS : [],
      ),
    staleTime: Infinity,
  });

  const roomsQuery = useQuery({
    queryKey: ['connectionRooms'],
    queryFn: () =>
      loadItem<SafeRoom[]>(
        STORAGE_KEYS.SAFE_ROOMS,
        arePeerPracticeFeaturesEnabled() ? SAMPLE_ROOMS : [],
      ),
    staleTime: Infinity,
  });

  const sponsorQuery = useQuery({
    queryKey: ['connectionSponsor'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SPONSOR_PAIRING);
      return stored ? (JSON.parse(stored) as SponsorPairing) : null;
    },
    staleTime: Infinity,
  });

  const nameQuery = useQuery({
    queryKey: ['connectionDisplayName'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_DISPLAY_NAME);
      return stored ?? '';
    },
    staleTime: Infinity,
  });

  const chatIdentityQuery = useQuery({
    queryKey: ANONYMOUS_CHAT_IDENTITY_QUERY_KEY,
    queryFn: loadOrCreateAnonymousIdentity,
    staleTime: Infinity,
  });

  const chatIdentityLabel = chatIdentityQuery.data
    ? formatAnonymousChatHandle(chatIdentityQuery.data)
    : '';

  const blockedPeerNamesQuery = useQuery({
    queryKey: ['connectionBlockedPeerNames'],
    queryFn: () => loadItem<string[]>(STORAGE_KEYS.BLOCKED_PEER_NAMES, []),
    staleTime: Infinity,
  });

  const blockedRoomAuthorsQuery = useQuery({
    queryKey: ['connectionBlockedRoomAuthors'],
    queryFn: () => loadItem<string[]>(STORAGE_KEYS.BLOCKED_ROOM_AUTHORS, []),
    staleTime: Infinity,
  });

  useEffect(() => { if (contactsQuery.data !== undefined) setTrustedContacts(contactsQuery.data); }, [contactsQuery.data]);
  useEffect(() => { if (chatsQuery.data) setPeerChats(chatsQuery.data); }, [chatsQuery.data]);
  useEffect(() => { if (roomsQuery.data) setSafeRooms(roomsQuery.data); }, [roomsQuery.data]);
  useEffect(() => { if (sponsorQuery.data !== undefined) setSponsorPairing(sponsorQuery.data); }, [sponsorQuery.data]);
  useEffect(() => { if (nameQuery.data !== undefined) setDisplayName(nameQuery.data); }, [nameQuery.data]);

  const saveContactsMutation = useMutation({
    mutationFn: (contacts: TrustedContact[]) => saveItem(STORAGE_KEYS.TRUSTED_CONTACTS, contacts),
    onSuccess: (data) => {
      setTrustedContacts(data);
      queryClient.setQueryData(['connectionContacts'], data);
    },
  });

  const saveChatsMutation = useMutation({
    mutationFn: (chats: PeerChat[]) => saveItem(STORAGE_KEYS.PEER_CHATS, chats),
    onSuccess: (data) => {
      setPeerChats(data);
      queryClient.setQueryData(['connectionChats'], data);
    },
  });

  const saveRoomsMutation = useMutation({
    mutationFn: (rooms: SafeRoom[]) => saveItem(STORAGE_KEYS.SAFE_ROOMS, rooms),
    onSuccess: (data) => {
      setSafeRooms(data);
      queryClient.setQueryData(['connectionRooms'], data);
    },
  });

  const saveSponsorMutation = useMutation({
    mutationFn: async (pairing: SponsorPairing | null) => {
      if (pairing) {
        await AsyncStorage.setItem(STORAGE_KEYS.SPONSOR_PAIRING, JSON.stringify(pairing));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.SPONSOR_PAIRING);
      }
      return pairing;
    },
    onSuccess: (data) => {
      setSponsorPairing(data);
      queryClient.setQueryData(['connectionSponsor'], data);
    },
  });

  const saveNameMutation = useMutation({
    mutationFn: async (name: string) => {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DISPLAY_NAME, name);
      return name;
    },
    onSuccess: (data) => {
      setDisplayName(data);
      queryClient.setQueryData(['connectionDisplayName'], data);
    },
  });

  const saveBlockedPeerNamesMutation = useMutation({
    mutationFn: (names: string[]) => saveItem(STORAGE_KEYS.BLOCKED_PEER_NAMES, names),
    onSuccess: (data) => {
      queryClient.setQueryData(['connectionBlockedPeerNames'], data);
    },
  });

  const saveBlockedRoomAuthorsMutation = useMutation({
    mutationFn: (names: string[]) => saveItem(STORAGE_KEYS.BLOCKED_ROOM_AUTHORS, names),
    onSuccess: (data) => {
      queryClient.setQueryData(['connectionBlockedRoomAuthors'], data);
    },
  });

  const saveLocalUgcReportsMutation = useMutation({
    mutationFn: (reports: ConnectionLocalUgcReport[]) => saveItem(STORAGE_KEYS.LOCAL_UGC_REPORTS, reports),
    onSuccess: (data) => {
      queryClient.setQueryData(['connectionLocalUgcReports'], data);
    },
  });

  const setUserDisplayName = useCallback((name: string) => {
    saveNameMutation.mutate(name);
  }, []);

  const addTrustedContact = useCallback((contact: Omit<TrustedContact, 'id' | 'addedAt'>) => {
    const newContact: TrustedContact = {
      ...contact,
      id: 'tc_' + Date.now().toString(),
      addedAt: new Date().toISOString(),
    };
    const updated = [...trustedContacts, newContact];
    saveContactsMutation.mutate(updated);
  }, [trustedContacts]);

  const removeTrustedContact = useCallback((contactId: string) => {
    const updated = trustedContacts.filter(c => c.id !== contactId);
    saveContactsMutation.mutate(updated);
  }, [trustedContacts]);

  const updateContactAvailability = useCallback((contactId: string, isAvailable: boolean) => {
    const updated = trustedContacts.map(c =>
      c.id === contactId ? { ...c, isAvailable } : c
    );
    saveContactsMutation.mutate(updated);
  }, [trustedContacts]);

  const startPeerChat = useCallback((topic: string) => {
    const blockedPeers = queryClient.getQueryData<string[]>(['connectionBlockedPeerNames']) ?? [];
    let randomName = generateRandomIdentityLabel();
    let tries = 0;
    while (blockedPeers.includes(randomName) && tries < 24) {
      randomName = generateRandomIdentityLabel();
      tries += 1;
    }
    const chatId = 'peer_' + Date.now().toString();
    const newChat: PeerChat = {
      id: chatId,
      anonymousName: randomName,
      messages: [
        {
          id: 'pm_auto_' + Date.now().toString(),
          chatId,
          content: `Hi there. I am here to listen. What is on your mind?`,
          isOwn: false,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      isActive: true,
      topic,
    };
    const updated = [newChat, ...peerChats];
    saveChatsMutation.mutate(updated);
    return newChat.id;
  }, [peerChats, queryClient]);

  const sendPeerMessage = useCallback(
    (chatId: string, content: string, meta?: { replyToMessageId?: string }) => {
      if (!allowInSlidingWindow(peerMessageTimesRef, PRACTICE_MSG_BURST)) {
        Alert.alert(
          'Slow down a moment',
          'Too many practice messages in a short time. Pause briefly before sending more.',
        );
        return;
      }
      const message: PeerMessage = {
        id: 'pm_' + Date.now().toString(),
        chatId,
        content,
        isOwn: true,
        timestamp: new Date().toISOString(),
        ...(meta?.replyToMessageId ? { replyToMessageId: meta.replyToMessageId } : {}),
      };
      const updated = peerChats.map(c => {
        if (c.id !== chatId) return c;
        return { ...c, messages: [...c.messages, message] };
      });
      saveChatsMutation.mutate(updated);

      setTimeout(() => {
        const supportResponses = [
          'Thank you for sharing that. You are being really brave.',
          'I hear you. It is okay to feel that way.',
          'You are not alone in this. I am here.',
          'That sounds really hard. How can I support you right now?',
          'Take your time. There is no rush here.',
          'You are doing better than you think. Seriously.',
          'I understand. One moment at a time.',
          'That takes courage to say out loud. I am proud of you.',
        ];
        const response: PeerMessage = {
          id: 'pm_r_' + Date.now().toString(),
          chatId,
          content: supportResponses[Math.floor(Math.random() * supportResponses.length)],
          isOwn: false,
          timestamp: new Date().toISOString(),
        };
        setPeerChats(prev => {
          const blockedPeers = queryClient.getQueryData<string[]>(['connectionBlockedPeerNames']) ?? [];
          const chat = prev.find(c => c.id === chatId);
          if (!chat || blockedPeers.includes(chat.anonymousName)) {
            return prev;
          }
          const newChats = prev.map(c => {
            if (c.id !== chatId) return c;
            return { ...c, messages: [...c.messages, response] };
          });
          saveChatsMutation.mutate(newChats);
          return newChats;
        });
      }, 2000 + Math.random() * 3000);
    },
    [peerChats, queryClient],
  );

  const togglePeerMessageReaction = useCallback(
    (chatId: string, messageId: string, emoji: string) => {
      const updated = peerChats.map(c => {
        if (c.id !== chatId) return c;
        const messages = c.messages.map(m => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions ?? {}) };
          const prevMy = m.myReaction;
          if (prevMy === emoji) {
            const next = (reactions[emoji] ?? 1) - 1;
            if (next <= 0) delete reactions[emoji];
            else reactions[emoji] = next;
            const cleaned = Object.keys(reactions).length ? reactions : undefined;
            return { ...m, reactions: cleaned, myReaction: undefined };
          }
          if (prevMy) {
            const oldCount = (reactions[prevMy] ?? 1) - 1;
            if (oldCount <= 0) delete reactions[prevMy];
            else reactions[prevMy] = oldCount;
          }
          reactions[emoji] = (reactions[emoji] ?? 0) + 1;
          return { ...m, reactions, myReaction: emoji };
        });
        return { ...c, messages };
      });
      saveChatsMutation.mutate(updated);
    },
    [peerChats, saveChatsMutation],
  );

  const endPeerChat = useCallback((chatId: string) => {
    const updated = peerChats.map(c =>
      c.id === chatId ? { ...c, isActive: false } : c
    );
    saveChatsMutation.mutate(updated);
  }, [peerChats]);

  const blockPeerPartner = useCallback((chatId: string) => {
    const chat = peerChats.find(c => c.id === chatId);
    if (!chat) return;
    const cur = queryClient.getQueryData<string[]>(['connectionBlockedPeerNames']) ?? [];
    if (!cur.includes(chat.anonymousName)) {
      saveBlockedPeerNamesMutation.mutate([...cur, chat.anonymousName]);
    }
    const ended = peerChats.map(c =>
      c.id === chatId ? { ...c, isActive: false } : c
    );
    saveChatsMutation.mutate(ended);
  }, [peerChats, queryClient, saveBlockedPeerNamesMutation, saveChatsMutation]);

  const blockConnectionRoomAuthor = useCallback((authorName: string) => {
    const t = authorName.trim();
    if (!t) return;
    const cur = queryClient.getQueryData<string[]>(['connectionBlockedRoomAuthors']) ?? [];
    if (!cur.includes(t)) {
      saveBlockedRoomAuthorsMutation.mutate([...cur, t]);
    }
  }, [queryClient, saveBlockedRoomAuthorsMutation]);

  const recordLocalUgcReport = useCallback((input: {
    scope: 'peer' | 'connection_room';
    contextId: string;
    authorLabel: string;
    contentPreview: string;
  }) => {
    if (!allowInSlidingWindow(localReportTimesRef, PRACTICE_REPORT_BURST)) {
      Alert.alert(
        'Report limit',
        'You have submitted many practice reports recently. Try again later, or contact support if your organization provides a moderated intake channel.',
      );
      return;
    }
    const existing = queryClient.getQueryData<ConnectionLocalUgcReport[]>(['connectionLocalUgcReports']) ?? [];
    const row: ConnectionLocalUgcReport = {
      id: 'ugc_' + Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    saveLocalUgcReportsMutation.mutate([row, ...existing]);
  }, [queryClient, saveLocalUgcReportsMutation]);

  const joinRoom = useCallback((roomId: string) => {
    const updated = safeRooms.map(r =>
      r.id === roomId ? { ...r, isJoined: true, memberCount: r.memberCount + 1 } : r
    );
    saveRoomsMutation.mutate(updated);
  }, [safeRooms]);

  const leaveRoom = useCallback((roomId: string) => {
    const updated = safeRooms.map(r =>
      r.id === roomId ? { ...r, isJoined: false, memberCount: Math.max(0, r.memberCount - 1) } : r
    );
    saveRoomsMutation.mutate(updated);
  }, [safeRooms]);

  const sendRoomMessage = useCallback((roomId: string, content: string) => {
    if (!allowInSlidingWindow(roomMessageTimesRef, PRACTICE_MSG_BURST)) {
      Alert.alert(
        'Slow down a moment',
        'Too many practice messages in a short time. Pause briefly before sending more.',
      );
      return;
    }
    const name = chatIdentityLabel || displayName || 'You';
    const message: RoomMessage = {
      id: 'rm_' + Date.now().toString(),
      roomId,
      authorName: name,
      content,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    const updated = safeRooms.map(r => {
      if (r.id !== roomId) return r;
      return { ...r, messages: [...r.messages, message], lastActivity: new Date().toISOString() };
    });
    saveRoomsMutation.mutate(updated);

    setTimeout(() => {
      const roomResponses = [
        'Thank you for sharing. We are here with you.',
        'Sending you strength. You got this.',
        'I felt the same way last week. It does get better.',
        'You are in the right place. Welcome.',
        'That really resonates with me. Thank you.',
      ];
      const blockedAuthors = queryClient.getQueryData<string[]>(['connectionBlockedRoomAuthors']) ?? [];
      let randomAuthor = generateRandomIdentityLabel();
      let tries = 0;
      while (blockedAuthors.includes(randomAuthor) && tries < 24) {
        randomAuthor = generateRandomIdentityLabel();
        tries += 1;
      }
      const response: RoomMessage = {
        id: 'rm_r_' + Date.now().toString(),
        roomId,
        authorName: randomAuthor,
        content: roomResponses[Math.floor(Math.random() * roomResponses.length)],
        timestamp: new Date().toISOString(),
        isOwn: false,
      };
      setSafeRooms(prev => {
        const newRooms = prev.map(r => {
          if (r.id !== roomId) return r;
          return { ...r, messages: [...r.messages, response], lastActivity: new Date().toISOString() };
        });
        saveRoomsMutation.mutate(newRooms);
        return newRooms;
      });
    }, 3000 + Math.random() * 4000);
  }, [safeRooms, displayName, chatIdentityLabel, queryClient]);

  const requestSponsorPairing = useCallback(async () => {
    let userAddictions: string[] = [];
    try {
      const stored = await AsyncStorage.getItem('recovery_profile');
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        userAddictions = Array.isArray(parsed.addictions) ? parsed.addictions : [];
      }
    } catch (e) {
      console.log('Error loading user addictions for sponsor match:', e);
    }

    const SPONSOR_POOL: { name: string; recoveryTypes: string[] }[] = [
      { name: 'Alex M.', recoveryTypes: ['Alcohol', 'Nicotine'] },
      { name: 'Jordan K.', recoveryTypes: ['Drugs', 'Alcohol'] },
      { name: 'Riley S.', recoveryTypes: ['Gambling', 'Shopping'] },
      { name: 'Taylor P.', recoveryTypes: ['Alcohol', 'Drugs', 'Nicotine'] },
      { name: 'Morgan L.', recoveryTypes: ['Pornography', 'Social Media'] },
      { name: 'Casey R.', recoveryTypes: ['Drugs', 'Gambling'] },
      { name: 'Dana W.', recoveryTypes: ['Alcohol', 'Food'] },
      { name: 'Sam T.', recoveryTypes: ['Nicotine', 'Alcohol', 'Drugs'] },
      { name: 'Jamie H.', recoveryTypes: ['Shopping', 'Food', 'Social Media'] },
      { name: 'Quinn B.', recoveryTypes: ['Pornography', 'Gambling', 'Gaming'] },
    ];

    const userAddictionsLower = userAddictions.map(a => a.toLowerCase());

    const matchingSponsors = SPONSOR_POOL.filter(s =>
      s.recoveryTypes.some(rt => userAddictionsLower.includes(rt.toLowerCase()))
    );

    if (matchingSponsors.length === 0) {
      console.log('No matching sponsors found for user addictions:', userAddictions);
      Alert.alert(
        'No Match Found',
        'We could not find a sponsor whose recovery experience matches yours. Please update your recovery types in your profile or try again later.',
        [{ text: 'OK' }]
      );
      return;
    }

    const selected = matchingSponsors[Math.floor(Math.random() * matchingSponsors.length)];

    const matched = selected.recoveryTypes.filter(rt =>
      userAddictionsLower.includes(rt.toLowerCase())
    );

    const pairing: SponsorPairing = {
      id: 'sp_' + Date.now().toString(),
      sponsorName: selected.name,
      sponsorRecoveryTypes: selected.recoveryTypes,
      matchedRecoveryTypes: matched,
      status: 'pending',
      matchedAt: new Date().toISOString(),
      lastCheckIn: new Date().toISOString(),
      notes: '',
      messages: [],
    };
    saveSponsorMutation.mutate(pairing);
  }, []);

  const acceptSponsorPairing = useCallback(() => {
    if (!sponsorPairing) return;
    const updated = { ...sponsorPairing, status: 'active' as const };
    saveSponsorMutation.mutate(updated);
  }, [sponsorPairing]);

  const endSponsorPairing = useCallback(() => {
    saveSponsorMutation.mutate(null);
  }, []);

  const sendSponsorMessage = useCallback((content: string) => {
    if (!sponsorPairing || sponsorPairing.status !== 'active') return;

    const message: SponsorMessage = {
      id: 'sm_' + Date.now().toString(),
      content,
      isOwn: true,
      timestamp: new Date().toISOString(),
    };
    const updated: SponsorPairing = {
      ...sponsorPairing,
      messages: [...(sponsorPairing.messages ?? []), message],
      lastCheckIn: new Date().toISOString(),
    };
    saveSponsorMutation.mutate(updated);

    setTimeout(() => {
      const sponsorResponses = [
        'Thanks for reaching out. How are you feeling today?',
        'I hear you. Remember, one day at a time.',
        'That takes real courage to share. I am proud of you.',
        'Let us talk through this. What triggered that feeling?',
        'You are doing the right thing by reaching out. I am here.',
        'I have been there too. It does get easier, I promise.',
        'Good check-in. Keep that awareness going.',
        'Remember your coping tools. Which one can you use right now?',
        'You are stronger than you think. Let us work through this together.',
        'Thanks for being honest with me. That is a huge part of recovery.',
      ];
      const response: SponsorMessage = {
        id: 'sm_r_' + Date.now().toString(),
        content: sponsorResponses[Math.floor(Math.random() * sponsorResponses.length)],
        isOwn: false,
        timestamp: new Date().toISOString(),
      };
      setSponsorPairing(prev => {
        if (!prev) return prev;
        const newPairing: SponsorPairing = {
          ...prev,
          messages: [...(prev.messages ?? []), response],
        };
        saveSponsorMutation.mutate(newPairing);
        return newPairing;
      });
    }, 2000 + Math.random() * 3000);
  }, [sponsorPairing]);

  const isLoading =
    contactsQuery.isLoading ||
    chatsQuery.isLoading ||
    roomsQuery.isLoading ||
    chatIdentityQuery.isLoading;

  const blockedPeerNames = blockedPeerNamesQuery.data ?? [];
  const blockedRoomAuthors = blockedRoomAuthorsQuery.data ?? [];

  return useMemo(() => ({
    trustedContacts,
    peerChats,
    safeRooms,
    sponsorPairing,
    displayName,
    chatIdentityLabel,
    blockedPeerNames,
    blockedRoomAuthors,
    isLoading,
    setUserDisplayName,
    addTrustedContact,
    removeTrustedContact,
    updateContactAvailability,
    startPeerChat,
    sendPeerMessage,
    togglePeerMessageReaction,
    endPeerChat,
    blockPeerPartner,
    blockConnectionRoomAuthor,
    recordLocalUgcReport,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    requestSponsorPairing,
    acceptSponsorPairing,
    endSponsorPairing,
    sendSponsorMessage,
  }), [
    trustedContacts, peerChats, safeRooms, sponsorPairing,
    displayName, chatIdentityLabel, blockedPeerNames, blockedRoomAuthors, isLoading, setUserDisplayName,
    addTrustedContact, removeTrustedContact, updateContactAvailability,
    startPeerChat, sendPeerMessage, togglePeerMessageReaction, endPeerChat, blockPeerPartner,
    blockConnectionRoomAuthor, recordLocalUgcReport,
    joinRoom, leaveRoom, sendRoomMessage,
    requestSponsorPairing, acceptSponsorPairing, endSponsorPairing,
    sendSponsorMessage,
  ]);
});
