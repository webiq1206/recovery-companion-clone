/**
 * Stand-in while full implementation is archived at `archived/community_features/providers/RecoveryRoomsProvider.tsx`.
 */
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import type { RecoveryRoom, RecoveryRoomTopic, RoomReport, ScheduledSession } from '../types';
import { getSocialPresentationMode } from '../core/socialLiveConfig';

export const TOPIC_LABELS: Record<RecoveryRoomTopic, string> = {
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

export const [RecoveryRoomsProvider, useRecoveryRooms] = createContextHook(() => {
  const rooms: RecoveryRoom[] = [];
  const socialMode = getSocialPresentationMode();

  const refetchRooms = useCallback(async () => {}, []);

  const setRoomDisplayName = useCallback(async (_name: string) => {}, []);
  const setAnonymousDefault = useCallback(async (_next: boolean) => {}, []);

  const joinRoom = useCallback(async (_roomId: string) => {}, []);
  const leaveRoom = useCallback(async (_roomId: string) => {}, []);
  const sendMessage = useCallback(
    async (_roomId: string, _content: string, _anonymous?: boolean) => {},
    [],
  );
  const reportMessage = useCallback(
    async (_roomId: string, _messageId: string, _reason: RoomReport['reason'], _description: string) => {},
    [],
  );
  const reportUser = useCallback(
    async (_roomId: string, _authorId: string, _reason: RoomReport['reason'], _description: string) => {},
    [],
  );
  const blockUser = useCallback(async (_payload: { authorId?: string; authorName?: string }) => {}, []);
  const blockAuthor = useCallback(async (_authorName: string) => {}, []);

  const getRoomById = useCallback((_roomId: string): RecoveryRoom | undefined => undefined, []);

  const getUpcomingSessions = useCallback((): (ScheduledSession & { roomName: string })[] => [], []);

  return useMemo(
    () => ({
      rooms,
      joinedRooms: rooms,
      availableRooms: rooms,
      liveRooms: rooms,
      reports: [] as RoomReport[],
      userId: '',
      displayName: '',
      chatIdentityLabel: '',
      isAnonymousDefault: true,
      isLoading: false,
      socialMode,
      refetchRooms,
      setRoomDisplayName,
      setAnonymousDefault,
      joinRoom,
      leaveRoom,
      sendMessage,
      reportMessage,
      reportUser,
      blockUser,
      blockAuthor,
      blockedAuthors: [] as string[],
      blockedUserIds: [] as string[],
      getRoomById,
      getUpcomingSessions,
      topicLabels: TOPIC_LABELS,
    }),
    [
      socialMode,
      refetchRooms,
      setRoomDisplayName,
      setAnonymousDefault,
      joinRoom,
      leaveRoom,
      sendMessage,
      reportMessage,
      reportUser,
      blockUser,
      blockAuthor,
      getRoomById,
      getUpcomingSessions,
    ],
  );
});
