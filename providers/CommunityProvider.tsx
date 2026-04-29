/**
 * Stand-in while full implementation is archived at `archived/community_features/providers/CommunityProvider.tsx`.
 */
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import type {
  CommunityComment,
  CommunityPost,
  CommunityUser,
  PrivateGroup,
  RoomReport,
} from '../types';
import { getSocialPresentationMode } from '../core/socialLiveConfig';

export const [CommunityProvider, useCommunity] = createContextHook(() => {
  const socialMode = getSocialPresentationMode();

  const refetchCommunity = useCallback(async () => {}, []);

  const setupUser = useCallback((_username: string, _displayName: string) => null as CommunityUser | null, []);

  const createPost = useCallback((_content: string, _visibility: 'public' | 'private') => {}, []);
  const addComment = useCallback((_postId: string, _content: string) => {}, []);
  const toggleLike = useCallback((_postId: string) => {}, []);
  const toggleFollow = useCallback((_targetUserId: string) => {}, []);
  const createGroup = useCallback((_name: string, _memberUsernames: string[]) => {}, []);
  const addMemberToGroup = useCallback((_groupId: string, _username: string) => {}, []);
  const removeMemberFromGroup = useCallback((_groupId: string, _username: string) => {}, []);
  const deleteGroup = useCallback((_groupId: string) => {}, []);

  const getUserById = useCallback((_userId: string): CommunityUser | undefined => undefined, []);

  const isAuthorBlocked = useCallback((_authorId: string) => false, []);

  const getCommentsForPost = useCallback((_postId: string): CommunityComment[] => [], []);

  const reportCommunityContent = useCallback(
    (
      _targetType: 'post' | 'comment',
      _targetId: string,
      _postId: string | undefined,
      _reason: RoomReport['reason'],
      _description: string,
    ) => {},
    [],
  );

  const blockCommunityUser = useCallback((_authorId: string, _authorDisplayName: string) => {}, []);

  return useMemo(
    () => ({
      currentUser: null as CommunityUser | null,
      allUsers: [] as CommunityUser[],
      posts: [] as CommunityPost[],
      comments: [] as CommunityComment[],
      groups: [] as PrivateGroup[],
      blockedCommunityUserIds: [] as string[],
      blockedCommunityAuthorNames: [] as string[],
      isLoading: false,
      socialMode,
      refetchCommunity,
      setupUser,
      createPost,
      addComment,
      toggleLike,
      toggleFollow,
      createGroup,
      addMemberToGroup,
      removeMemberFromGroup,
      deleteGroup,
      getUserById,
      getCommentsForPost,
      reportCommunityContent,
      blockCommunityUser,
      isAuthorBlocked,
    }),
    [
      socialMode,
      refetchCommunity,
      setupUser,
      createPost,
      addComment,
      toggleLike,
      toggleFollow,
      createGroup,
      addMemberToGroup,
      removeMemberFromGroup,
      deleteGroup,
      getUserById,
      getCommentsForPost,
      reportCommunityContent,
      blockCommunityUser,
      isAuthorBlocked,
    ],
  );
});
