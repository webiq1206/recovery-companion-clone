import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RecoveryRoom,
  RecoveryRoomMessage,
  ScheduledSession,
  RoomReport,
  RecoveryRoomTopic,
} from '../types';

const STORAGE_KEYS = {
  ROOMS: 'recovery_rooms_data',
  REPORTS: 'recovery_rooms_reports',
  USER_ID: 'recovery_rooms_user_id',
  IS_ANONYMOUS: 'recovery_rooms_anonymous',
  DISPLAY_NAME: 'recovery_rooms_display_name',
};

const ANONYMOUS_NAMES = [
  'Gentle Oak', 'Quiet River', 'Warm Breeze', 'Still Water',
  'Soft Light', 'Calm Shore', 'Kind Heart', 'Safe Harbor',
  'Bright Path', 'Steady Ground', 'Open Sky', 'Deep Roots',
  'Rising Sun', 'Peaceful Wave', 'Clear Spring', 'Golden Leaf',
];

const TOPIC_LABELS: Record<RecoveryRoomTopic, string> = {
  general: 'General Support',
  cravings: 'Craving Management',
  grief: 'Grief & Loss',
  anxiety: 'Anxiety & Stress',
  relationships: 'Relationships',
  early_recovery: 'Early Recovery',
  relapse_prevention: 'Relapse Prevention',
  mindfulness: 'Mindfulness',
  anger: 'Anger & Frustration',
  self_care: 'Self-Care',
};

const SAMPLE_ROOMS: RecoveryRoom[] = [
  {
    id: 'rr_1',
    name: 'Morning Circle',
    description: 'Start your day grounded with others who understand. Share intentions, gratitude, or just listen.',
    topic: 'general',
    memberCount: 7,
    maxMembers: 8,
    isJoined: false,
    isAnonymous: false,
    createdAt: '2026-02-10T06:00:00.000Z',
    lastActivity: '2026-02-16T07:45:00.000Z',
    scheduledSessions: [
      {
        id: 'ss_1',
        roomId: 'rr_1',
        title: 'Morning Gratitude Share',
        description: 'Start the day by sharing one thing you are grateful for.',
        scheduledAt: '2026-02-17T07:00:00.000Z',
        durationMinutes: 30,
        isActive: false,
        attendeeCount: 0,
      },
      {
        id: 'ss_2',
        roomId: 'rr_1',
        title: 'Intention Setting',
        description: 'Set your recovery intention for the day ahead.',
        scheduledAt: '2026-02-18T07:00:00.000Z',
        durationMinutes: 25,
        isActive: false,
        attendeeCount: 0,
      },
    ],
    messages: [
      { id: 'rrm_1', roomId: 'rr_1', authorName: 'Quiet River', authorId: 'u_qr', content: 'Good morning everyone. Day 62 and feeling stronger.', timestamp: '2026-02-16T07:15:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
      { id: 'rrm_2', roomId: 'rr_1', authorName: 'Warm Breeze', authorId: 'u_wb', content: 'Morning! Had some tough dreams last night but I am here. Showing up matters.', timestamp: '2026-02-16T07:22:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
      { id: 'rrm_3', roomId: 'rr_1', authorName: 'Gentle Oak', authorId: 'u_go', content: 'Showing up IS the win. Proud of both of you. Let us carry this energy forward today.', timestamp: '2026-02-16T07:30:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
    ],
    rules: [
      'Be kind and respectful at all times',
      'What is shared here stays here',
      'No advice unless asked - just listen and support',
      'Use "I" statements when sharing',
      'Respect the group flow',
    ],
    isLive: false,
    currentSessionId: null,
  },
  {
    id: 'rr_2',
    name: 'Craving SOS',
    description: 'When urges hit, come here. Real-time support from people who get it. No judgment, just presence.',
    topic: 'cravings',
    memberCount: 5,
    maxMembers: 8,
    isJoined: false,
    isAnonymous: false,
    createdAt: '2026-02-08T10:00:00.000Z',
    lastActivity: '2026-02-16T06:20:00.000Z',
    scheduledSessions: [
      {
        id: 'ss_3',
        roomId: 'rr_2',
        title: 'Urge Surfing Workshop',
        description: 'Learn to ride the wave of cravings without giving in.',
        scheduledAt: '2026-02-17T18:00:00.000Z',
        durationMinutes: 45,
        isActive: false,
        attendeeCount: 0,
      },
    ],
    messages: [
      { id: 'rrm_4', roomId: 'rr_2', authorName: 'Anonymous', authorId: 'u_anon1', content: 'Really struggling right now. The pull is strong tonight.', timestamp: '2026-02-16T05:50:00.000Z', isOwn: false, isAnonymous: true, isReported: false, reportReason: '' },
      { id: 'rrm_5', roomId: 'rr_2', authorName: 'Safe Harbor', authorId: 'u_sh', content: 'You are here instead of there. That is already a victory. Breathe with us. 4 in, 7 hold, 8 out.', timestamp: '2026-02-16T05:52:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
      { id: 'rrm_6', roomId: 'rr_2', authorName: 'Still Water', authorId: 'u_sw', content: 'I was where you are 3 weeks ago. It passed. It always passes. Stay with us.', timestamp: '2026-02-16T05:55:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
    ],
    rules: [
      'This is a crisis-safe space - be gentle',
      'No graphic descriptions of substance use',
      'Support, do not advise',
      'If you feel unsafe, reach out to crisis resources',
      'Anonymous participation is welcome here',
    ],
    isLive: false,
    currentSessionId: null,
  },
  {
    id: 'rr_3',
    name: 'Quiet Minds',
    description: 'A mindfulness-focused room. Guided breathing, body scans, and present-moment awareness together.',
    topic: 'mindfulness',
    memberCount: 6,
    maxMembers: 10,
    isJoined: false,
    isAnonymous: false,
    createdAt: '2026-02-09T14:00:00.000Z',
    lastActivity: '2026-02-15T21:00:00.000Z',
    scheduledSessions: [
      {
        id: 'ss_4',
        roomId: 'rr_3',
        title: 'Evening Body Scan',
        description: 'Release the tension of the day with a guided body scan meditation.',
        scheduledAt: '2026-02-16T21:00:00.000Z',
        durationMinutes: 20,
        isActive: true,
        attendeeCount: 4,
      },
      {
        id: 'ss_5',
        roomId: 'rr_3',
        title: 'Breathing Together',
        description: 'Simple box breathing exercise. No experience needed.',
        scheduledAt: '2026-02-18T12:00:00.000Z',
        durationMinutes: 15,
        isActive: false,
        attendeeCount: 0,
      },
    ],
    messages: [
      { id: 'rrm_7', roomId: 'rr_3', authorName: 'Deep Roots', authorId: 'u_dr', content: 'Welcome to tonight\'s session. Let us begin by finding a comfortable position.', timestamp: '2026-02-15T21:00:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
      { id: 'rrm_8', roomId: 'rr_3', authorName: 'Open Sky', authorId: 'u_os', content: 'This is my favorite part of the day. Thank you for holding this space.', timestamp: '2026-02-15T21:02:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
    ],
    rules: [
      'Silence is welcome - you do not need to speak',
      'During exercises, follow the session structure until the reflection window',
      'Share reflections after, not during, exercises',
      'Be patient with yourself and others',
    ],
    isLive: true,
    currentSessionId: 'ss_4',
  },
  {
    id: 'rr_4',
    name: 'First 30 Days',
    description: 'For those in early recovery. Raw, real, and safe. You belong here no matter where you are.',
    topic: 'early_recovery',
    memberCount: 4,
    maxMembers: 6,
    isJoined: false,
    isAnonymous: false,
    createdAt: '2026-02-12T12:00:00.000Z',
    lastActivity: '2026-02-16T04:30:00.000Z',
    scheduledSessions: [
      {
        id: 'ss_6',
        roomId: 'rr_4',
        title: 'New Member Welcome',
        description: 'Introductions and sharing what brought you here. Completely optional to speak.',
        scheduledAt: '2026-02-17T19:00:00.000Z',
        durationMinutes: 40,
        isActive: false,
        attendeeCount: 0,
      },
    ],
    messages: [
      { id: 'rrm_9', roomId: 'rr_4', authorName: 'Anonymous', authorId: 'u_anon2', content: 'Day 5. I am scared but I am trying.', timestamp: '2026-02-16T04:10:00.000Z', isOwn: false, isAnonymous: true, isReported: false, reportReason: '' },
      { id: 'rrm_10', roomId: 'rr_4', authorName: 'Bright Path', authorId: 'u_bp', content: 'Day 5 is huge. Fear is normal. You are doing something incredibly brave right now.', timestamp: '2026-02-16T04:15:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
      { id: 'rrm_11', roomId: 'rr_4', authorName: 'Rising Sun', authorId: 'u_rs', content: 'I remember day 5. I am on day 28 now. It is so worth it. Keep going.', timestamp: '2026-02-16T04:20:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
    ],
    rules: [
      'Zero judgment - everyone starts somewhere',
      'No pressure to share - listening counts',
      'Be honest about where you are',
      'Celebrate every single day',
      'Anonymous participation always welcome',
    ],
    isLive: false,
    currentSessionId: null,
  },
  {
    id: 'rr_5',
    name: 'Rebuilding Trust',
    description: 'For navigating relationships during recovery. Family, friends, partners - it is all welcome here.',
    topic: 'relationships',
    memberCount: 6,
    maxMembers: 8,
    isJoined: false,
    isAnonymous: false,
    createdAt: '2026-02-11T16:00:00.000Z',
    lastActivity: '2026-02-15T20:00:00.000Z',
    scheduledSessions: [
      {
        id: 'ss_7',
        roomId: 'rr_5',
        title: 'Healthy Boundaries Practice',
        description: 'Learning to set and maintain boundaries with loved ones.',
        scheduledAt: '2026-02-18T19:00:00.000Z',
        durationMinutes: 35,
        isActive: false,
        attendeeCount: 0,
      },
    ],
    messages: [
      { id: 'rrm_12', roomId: 'rr_5', authorName: 'Kind Heart', authorId: 'u_kh', content: 'Tonight\'s theme: What does rebuilding trust look like for you?', timestamp: '2026-02-15T19:30:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
      { id: 'rrm_13', roomId: 'rr_5', authorName: 'Golden Leaf', authorId: 'u_gl', content: 'For me it is showing up consistently. Small promises kept. That is how trust comes back.', timestamp: '2026-02-15T19:35:00.000Z', isOwn: false, isAnonymous: false, isReported: false, reportReason: '' },
    ],
    rules: [
      'Respect everyone\'s relationships - no unsolicited opinions',
      'Share your experience, not advice',
      'Keep details about others vague for privacy',
      'Be compassionate - recovery affects everyone differently',
    ],
    isLive: false,
    currentSessionId: null,
  },
];

const SUPPORT_RESPONSES = [
  'Thank you for sharing that. It takes real courage.',
  'I hear you. You are not alone in this.',
  'That really resonates. Thank you for being honest.',
  'Sending strength your way. We are all in this together.',
  'Take your time. This space is here for you.',
  'That is a powerful realization. Thank you for trusting us.',
  'I felt something similar recently. You are seen here.',
  'One breath at a time. You are doing great.',
];

/** Removes "facilitator" wording from guideline strings (including legacy persisted rules). */
function sanitizeRoomGuideline(rule: string): string {
  let s = rule;
  s = s.replace(/Respect the facilitator and group flow/gi, 'Respect the group flow');
  s = s.replace(/Follow the facilitator's guidance during sessions/gi, 'During exercises, follow the session structure until the reflection window');
  s = s.replace(/Follow the facilitator\u2019s guidance during sessions/gi, 'During exercises, follow the session structure until the reflection window');
  s = s.replace(/\bfacilitators\b/gi, 'groups');
  s = s.replace(/\bfacilitator's\b/gi, "group's");
  s = s.replace(/\bfacilitator\u2019s\b/gi, "group's");
  s = s.replace(/\bfacilitator\b/gi, 'group');
  s = s.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
  return s;
}

for (const room of SAMPLE_ROOMS) {
  room.rules = room.rules.map(sanitizeRoomGuideline);
}

/** Normalizes recovery room objects loaded from AsyncStorage (supports prior storage shapes). */
function migrateRecoveryRoomsFromStorage(data: unknown): RecoveryRoom[] {
  if (!Array.isArray(data)) return SAMPLE_ROOMS;
  return data.map((entry: unknown) => {
    const r = entry as Record<string, unknown>;
    const rawMessages = Array.isArray(r.messages) ? r.messages : [];
    const messages: RecoveryRoomMessage[] = rawMessages.map((m: unknown) => {
      const msg = m as Record<string, unknown>;
      return {
        id: String(msg.id ?? ''),
        roomId: String(msg.roomId ?? ''),
        authorName: String(msg.authorName ?? ''),
        authorId: String(msg.authorId ?? ''),
        content: String(msg.content ?? ''),
        timestamp: String(msg.timestamp ?? ''),
        isOwn: Boolean(msg.isOwn),
        isAnonymous: Boolean(msg.isAnonymous),
        isReported: Boolean(msg.isReported),
        reportReason: String(msg.reportReason ?? ''),
      };
    });
    const rawSessions = Array.isArray(r.scheduledSessions) ? r.scheduledSessions : [];
    const scheduledSessions: ScheduledSession[] = rawSessions.map((s: unknown) => {
      const ss = s as Record<string, unknown>;
      return {
        id: String(ss.id ?? ''),
        roomId: String(ss.roomId ?? ''),
        title: String(ss.title ?? ''),
        description: String(ss.description ?? ''),
        scheduledAt: String(ss.scheduledAt ?? ''),
        durationMinutes: Number(ss.durationMinutes ?? 0),
        isActive: Boolean(ss.isActive),
        attendeeCount: Number(ss.attendeeCount ?? 0),
      };
    });
    const rules = (Array.isArray(r.rules) ? r.rules.map((x) => String(x)) : []).map(sanitizeRoomGuideline);
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      description: String(r.description ?? ''),
      topic: (r.topic ?? 'general') as RecoveryRoomTopic,
      memberCount: Number(r.memberCount ?? 0),
      maxMembers: Number(r.maxMembers ?? 0),
      isJoined: Boolean(r.isJoined),
      isAnonymous: Boolean(r.isAnonymous),
      createdAt: String(r.createdAt ?? ''),
      lastActivity: String(r.lastActivity ?? ''),
      scheduledSessions,
      messages,
      rules,
      isLive: Boolean(r.isLive),
      currentSessionId: r.currentSessionId != null ? String(r.currentSessionId) : null,
    };
  });
}

async function loadData<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (e) {
    console.log(`Error loading ${key}:`, e);
    return fallback;
  }
}

async function saveData<T>(key: string, data: T): Promise<T> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
  return data;
}

export { TOPIC_LABELS };

export const [RecoveryRoomsProvider, useRecoveryRooms] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [rooms, setRooms] = useState<RecoveryRoom[]>([]);
  const [reports, setReports] = useState<RoomReport[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [isAnonymousDefault, setIsAnonymousDefault] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');

  const roomsQuery = useQuery({
    queryKey: ['recoveryRooms'],
    queryFn: async () => {
      const raw = await loadData<unknown>(STORAGE_KEYS.ROOMS, SAMPLE_ROOMS);
      return migrateRecoveryRoomsFromStorage(raw);
    },
    staleTime: Infinity,
  });

  const reportsQuery = useQuery({
    queryKey: ['recoveryRoomReports'],
    queryFn: () => loadData<RoomReport[]>(STORAGE_KEYS.REPORTS, []),
    staleTime: Infinity,
  });

  const userIdQuery = useQuery({
    queryKey: ['recoveryRoomUserId'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (stored) return stored;
      const newId = 'rru_' + Date.now().toString();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newId);
      return newId;
    },
    staleTime: Infinity,
  });

  const anonQuery = useQuery({
    queryKey: ['recoveryRoomAnon'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.IS_ANONYMOUS);
      return stored === 'true';
    },
    staleTime: Infinity,
  });

  const nameQuery = useQuery({
    queryKey: ['recoveryRoomName'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
      return stored ?? '';
    },
    staleTime: Infinity,
  });

  useEffect(() => { if (roomsQuery.data) setRooms(roomsQuery.data); }, [roomsQuery.data]);
  useEffect(() => { if (reportsQuery.data) setReports(reportsQuery.data); }, [reportsQuery.data]);
  useEffect(() => { if (userIdQuery.data) setUserId(userIdQuery.data); }, [userIdQuery.data]);
  useEffect(() => { if (anonQuery.data !== undefined) setIsAnonymousDefault(anonQuery.data); }, [anonQuery.data]);
  useEffect(() => { if (nameQuery.data !== undefined) setDisplayName(nameQuery.data); }, [nameQuery.data]);

  const saveRoomsMutation = useMutation({
    mutationFn: (data: RecoveryRoom[]) => saveData(STORAGE_KEYS.ROOMS, data),
    onSuccess: (data) => {
      setRooms(data);
      queryClient.setQueryData(['recoveryRooms'], data);
    },
  });

  const saveReportsMutation = useMutation({
    mutationFn: (data: RoomReport[]) => saveData(STORAGE_KEYS.REPORTS, data),
    onSuccess: (data) => {
      setReports(data);
      queryClient.setQueryData(['recoveryRoomReports'], data);
    },
  });

  const setRoomDisplayName = useCallback((name: string) => {
    setDisplayName(name);
    AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, name);
    queryClient.setQueryData(['recoveryRoomName'], name);
  }, [queryClient]);

  const setAnonymousDefault = useCallback((val: boolean) => {
    setIsAnonymousDefault(val);
    AsyncStorage.setItem(STORAGE_KEYS.IS_ANONYMOUS, val.toString());
    queryClient.setQueryData(['recoveryRoomAnon'], val);
  }, [queryClient]);

  const joinRoom = useCallback((roomId: string) => {
    const updated = rooms.map(r => {
      if (r.id !== roomId) return r;
      if (r.memberCount >= r.maxMembers) return r;
      return { ...r, isJoined: true, memberCount: r.memberCount + 1 };
    });
    saveRoomsMutation.mutate(updated);
  }, [rooms]);

  const leaveRoom = useCallback((roomId: string) => {
    const updated = rooms.map(r => {
      if (r.id !== roomId) return r;
      return { ...r, isJoined: false, memberCount: Math.max(0, r.memberCount - 1) };
    });
    saveRoomsMutation.mutate(updated);
  }, [rooms]);

  const sendMessage = useCallback((roomId: string, content: string, anonymous: boolean) => {
    const authorName = anonymous ? 'Anonymous' : (displayName || 'You');
    const message: RecoveryRoomMessage = {
      id: 'rrm_' + Date.now().toString(),
      roomId,
      authorName,
      authorId: userId,
      content,
      timestamp: new Date().toISOString(),
      isOwn: true,
      isAnonymous: anonymous,
      isReported: false,
      reportReason: '',
    };
    const updated = rooms.map(r => {
      if (r.id !== roomId) return r;
      return { ...r, messages: [...r.messages, message], lastActivity: new Date().toISOString() };
    });
    saveRoomsMutation.mutate(updated);

    // Demo reply: still runs after release unless replaced with real-time/backend chat.
    setTimeout(() => {
      const randomAuthor = ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];
      const response: RecoveryRoomMessage = {
        id: 'rrm_r_' + Date.now().toString(),
        roomId,
        authorName: randomAuthor,
        authorId: 'u_' + randomAuthor.toLowerCase().replace(' ', '_'),
        content: SUPPORT_RESPONSES[Math.floor(Math.random() * SUPPORT_RESPONSES.length)],
        timestamp: new Date().toISOString(),
        isOwn: false,
        isAnonymous: false,
        isReported: false,
        reportReason: '',
      };
      setRooms(prev => {
        const newRooms = prev.map(r => {
          if (r.id !== roomId) return r;
          return { ...r, messages: [...r.messages, response], lastActivity: new Date().toISOString() };
        });
        saveRoomsMutation.mutate(newRooms);
        return newRooms;
      });
    }, 2500 + Math.random() * 3500);
  }, [rooms, displayName, userId]);

  const reportMessage = useCallback((roomId: string, messageId: string, reason: RoomReport['reason'], description: string) => {
    const report: RoomReport = {
      id: 'report_' + Date.now().toString(),
      roomId,
      messageId,
      reporterId: userId,
      reason,
      description,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const updatedReports = [...reports, report];
    saveReportsMutation.mutate(updatedReports);

    const updatedRooms = rooms.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        messages: r.messages.map(m =>
          m.id === messageId ? { ...m, isReported: true, reportReason: reason } : m
        ),
      };
    });
    saveRoomsMutation.mutate(updatedRooms);
  }, [rooms, reports, userId]);

  const getRoomById = useCallback((roomId: string): RecoveryRoom | undefined => {
    return rooms.find(r => r.id === roomId);
  }, [rooms]);

  const getUpcomingSessions = useCallback((): (ScheduledSession & { roomName: string })[] => {
    const now = new Date().getTime();
    const sessions: (ScheduledSession & { roomName: string })[] = [];
    rooms.forEach(room => {
      room.scheduledSessions.forEach(session => {
        const sessionTime = new Date(session.scheduledAt).getTime();
        if (sessionTime > now || session.isActive) {
          sessions.push({ ...session, roomName: room.name });
        }
      });
    });
    return sessions.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [rooms]);

  const joinedRooms = rooms.filter(r => r.isJoined);
  const availableRooms = rooms.filter(r => !r.isJoined);
  const liveRooms = rooms.filter(r => r.isLive);

  const isLoading = roomsQuery.isLoading || userIdQuery.isLoading;

  return useMemo(() => ({
    rooms,
    joinedRooms,
    availableRooms,
    liveRooms,
    reports,
    userId,
    displayName,
    isAnonymousDefault,
    isLoading,
    setRoomDisplayName,
    setAnonymousDefault,
    joinRoom,
    leaveRoom,
    sendMessage,
    reportMessage,
    getRoomById,
    getUpcomingSessions,
    topicLabels: TOPIC_LABELS,
  }), [
    rooms, joinedRooms, availableRooms, liveRooms, reports,
    userId, displayName, isAnonymousDefault, isLoading,
    setRoomDisplayName, setAnonymousDefault,
    joinRoom, leaveRoom, sendMessage, reportMessage,
    getRoomById, getUpcomingSessions,
  ]);
});
