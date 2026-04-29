import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import {
  CommunityUser,
  CommunityPost,
  CommunityComment,
  PrivateGroup,
  RoomReport,
} from '../types';
import { getSocialPresentationMode, isCommunityEnabled, isLocalSocialDemoEnabled } from '../core/socialLiveConfig';
import { LiveSocialApiError } from '../services/liveSocialClient';
import * as liveSocial from '../services/liveSocialClient';

function alertLiveSocialFailure(title: string, err: unknown) {
  if (err instanceof LiveSocialApiError) {
    let message = err.message;
    if (err.status === 429 && err.retryAfterSec != null) {
      message += ` Try again in about ${err.retryAfterSec}s.`;
    }
    Alert.alert(title, message);
    return;
  }
  console.log(title, err);
}

const STORAGE_KEYS = {
  COMMUNITY_USER: 'community_user',
  COMMUNITY_POSTS: 'community_posts',
  COMMUNITY_COMMENTS: 'community_comments',
  COMMUNITY_USERS: 'community_users',
  COMMUNITY_GROUPS: 'community_groups',
};

const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
];

const SAMPLE_USERS: CommunityUser[] = [
  { id: 'user_sam', username: 'sam_recovery', displayName: 'Sam R.', avatar: AVATARS[0], bio: '90 days strong', joinedAt: '2025-11-01T00:00:00.000Z', followerIds: [], followingIds: [] },
  { id: 'user_alex', username: 'alex_hope', displayName: 'Alex H.', avatar: AVATARS[1], bio: 'One day at a time', joinedAt: '2025-10-15T00:00:00.000Z', followerIds: [], followingIds: [] },
  { id: 'user_jamie', username: 'jamie_strong', displayName: 'Jamie S.', avatar: AVATARS[2], bio: 'Finding my path', joinedAt: '2025-12-01T00:00:00.000Z', followerIds: [], followingIds: [] },
  { id: 'user_morgan', username: 'morgan_free', displayName: 'Morgan F.', avatar: AVATARS[3], bio: '1 year sober!', joinedAt: '2025-09-20T00:00:00.000Z', followerIds: [], followingIds: [] },
  { id: 'user_casey', username: 'casey_brave', displayName: 'Casey B.', avatar: AVATARS[4], bio: 'Grateful every day', joinedAt: '2025-08-10T00:00:00.000Z', followerIds: [], followingIds: [] },
];

const SAMPLE_POSTS: CommunityPost[] = [
  { id: 'post_1', authorId: 'user_sam', content: 'Just hit 90 days today! Never thought I would make it this far. To everyone just starting out - it gets easier, I promise.', createdAt: '2026-02-14T08:30:00.000Z', visibility: 'public', likes: ['user_alex', 'user_jamie'], commentIds: ['comment_1'] },
  { id: 'post_2', authorId: 'user_alex', content: 'Morning meditation really changed my recovery game. 15 minutes every morning before I do anything else. Highly recommend it.', createdAt: '2026-02-13T14:20:00.000Z', visibility: 'public', likes: ['user_sam'], commentIds: ['comment_2'] },
  { id: 'post_3', authorId: 'user_morgan', content: 'ONE YEAR SOBER! 365 days. I cannot believe it. Thank you to this community for all the support. You all saved my life.', createdAt: '2026-02-12T19:45:00.000Z', visibility: 'public', likes: ['user_sam', 'user_alex', 'user_jamie', 'user_casey'], commentIds: ['comment_3', 'comment_4'] },
  { id: 'post_4', authorId: 'user_casey', content: 'Had a tough day today but I did NOT give in. Called my sponsor, went for a walk, and journaled. The urge passed. We are stronger than our cravings.', createdAt: '2026-02-11T21:10:00.000Z', visibility: 'public', likes: ['user_morgan', 'user_jamie'], commentIds: [] },
  { id: 'post_5', authorId: 'user_jamie', content: 'Started volunteering at a local shelter. Giving back helps me stay grounded and reminds me how far I have come.', createdAt: '2026-02-10T10:00:00.000Z', visibility: 'public', likes: ['user_casey'], commentIds: ['comment_5'] },
];

const SAMPLE_COMMENTS: CommunityComment[] = [
  { id: 'comment_1', postId: 'post_1', authorId: 'user_alex', content: 'Congrats Sam! You are an inspiration!', createdAt: '2026-02-14T09:00:00.000Z' },
  { id: 'comment_2', postId: 'post_2', authorId: 'user_morgan', content: 'Meditation is a game changer. Keep it up!', createdAt: '2026-02-13T15:00:00.000Z' },
  { id: 'comment_3', postId: 'post_3', authorId: 'user_sam', content: 'Incredible milestone Morgan! So proud of you!', createdAt: '2026-02-12T20:00:00.000Z' },
  { id: 'comment_4', postId: 'post_3', authorId: 'user_casey', content: 'You deserve every bit of this! Happy anniversary!', createdAt: '2026-02-12T20:30:00.000Z' },
  { id: 'comment_5', postId: 'post_5', authorId: 'user_alex', content: 'That is beautiful Jamie. Service work is so important.', createdAt: '2026-02-10T11:00:00.000Z' },
];

export const [CommunityProvider, useCommunity] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(null);
  const [allUsers, setAllUsers] = useState<CommunityUser[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [blockedCommunityAuthorNames, setBlockedCommunityAuthorNames] = useState<string[]>([]);
  const [blockedCommunityUserIds, setBlockedCommunityUserIds] = useState<string[]>([]);

  const liveBlocksQuery = useQuery({
    queryKey: ['liveSocialBlocks'],
    queryFn: async () => {
      await liveSocial.ensureLiveSocialSession();
      return liveSocial.listLiveRoomBlocks();
    },
    enabled: isCommunityEnabled(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isCommunityEnabled()) {
      setBlockedCommunityAuthorNames([]);
      setBlockedCommunityUserIds([]);
      return;
    }
    const b = liveBlocksQuery.data;
    if (b) {
      setBlockedCommunityAuthorNames(b.blockedAuthorNames ?? []);
      setBlockedCommunityUserIds(
        [...new Set([...(b.blockedUserIds ?? []), ...(b.communityBlockedUserIds ?? [])])],
      );
    }
  }, [liveBlocksQuery.data]);

  const liveFeedQuery = useQuery({
    queryKey: ['liveSocialCommunityFeed'],
    queryFn: () => liveSocial.fetchLiveCommunityFeed(),
    enabled: isCommunityEnabled(),
    staleTime: 0,
    refetchInterval: 25_000,
  });

  useEffect(() => {
    if (!isCommunityEnabled() || !liveFeedQuery.data) return;
    const { me, users, posts: p, comments: c, groups: g } = liveFeedQuery.data;
    setCurrentUser(me);
    setAllUsers(users);
    setPosts(p);
    setComments(c);
    setGroups(g);
  }, [liveFeedQuery.data]);

  const userQuery = useQuery({
    queryKey: ['communityUser'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_USER);
      return stored ? (JSON.parse(stored) as CommunityUser) : null;
    },
    enabled: !isCommunityEnabled(),
    staleTime: Infinity,
  });

  const demo = isLocalSocialDemoEnabled();

  const usersQuery = useQuery({
    queryKey: ['communityUsers'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_USERS);
      return stored ? (JSON.parse(stored) as CommunityUser[]) : demo ? SAMPLE_USERS : [];
    },
    enabled: !isCommunityEnabled(),
    staleTime: Infinity,
  });

  const postsQuery = useQuery({
    queryKey: ['communityPosts'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      return stored ? (JSON.parse(stored) as CommunityPost[]) : demo ? SAMPLE_POSTS : [];
    },
    enabled: !isCommunityEnabled(),
    staleTime: Infinity,
  });

  const commentsQuery = useQuery({
    queryKey: ['communityComments'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_COMMENTS);
      return stored ? (JSON.parse(stored) as CommunityComment[]) : demo ? SAMPLE_COMMENTS : [];
    },
    enabled: !isCommunityEnabled(),
    staleTime: Infinity,
  });

  const groupsQuery = useQuery({
    queryKey: ['communityGroups'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_GROUPS);
      return stored ? (JSON.parse(stored) as PrivateGroup[]) : [];
    },
    enabled: !isCommunityEnabled(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isCommunityEnabled()) return;
    if (userQuery.data !== undefined) setCurrentUser(userQuery.data);
  }, [userQuery.data]);

  useEffect(() => {
    if (isCommunityEnabled()) return;
    if (usersQuery.data) setAllUsers(usersQuery.data);
  }, [usersQuery.data]);

  useEffect(() => {
    if (isCommunityEnabled()) return;
    if (postsQuery.data) setPosts(postsQuery.data);
  }, [postsQuery.data]);

  useEffect(() => {
    if (isCommunityEnabled()) return;
    if (commentsQuery.data) setComments(commentsQuery.data);
  }, [commentsQuery.data]);

  useEffect(() => {
    if (isCommunityEnabled()) return;
    if (groupsQuery.data) setGroups(groupsQuery.data);
  }, [groupsQuery.data]);

  const saveUserMutation = useMutation({
    mutationFn: async (user: CommunityUser) => {
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_USER, JSON.stringify(user));
      return user;
    },
    onSuccess: (data) => {
      setCurrentUser(data);
      queryClient.setQueryData(['communityUser'], data);
    },
  });

  const saveUsersMutation = useMutation({
    mutationFn: async (users: CommunityUser[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_USERS, JSON.stringify(users));
      return users;
    },
    onSuccess: (data) => {
      setAllUsers(data);
      queryClient.setQueryData(['communityUsers'], data);
    },
  });

  const savePostsMutation = useMutation({
    mutationFn: async (newPosts: CommunityPost[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(newPosts));
      return newPosts;
    },
    onSuccess: (data) => {
      setPosts(data);
      queryClient.setQueryData(['communityPosts'], data);
    },
  });

  const saveCommentsMutation = useMutation({
    mutationFn: async (newComments: CommunityComment[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_COMMENTS, JSON.stringify(newComments));
      return newComments;
    },
    onSuccess: (data) => {
      setComments(data);
      queryClient.setQueryData(['communityComments'], data);
    },
  });

  const saveGroupsMutation = useMutation({
    mutationFn: async (newGroups: PrivateGroup[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_GROUPS, JSON.stringify(newGroups));
      return newGroups;
    },
    onSuccess: (data) => {
      setGroups(data);
      queryClient.setQueryData(['communityGroups'], data);
    },
  });

  const setupUser = useCallback((username: string, displayName: string) => {
    if (isCommunityEnabled()) {
      void (async () => {
        try {
          const { me, users } = await liveSocial.registerLiveCommunityProfile(username, displayName);
          setCurrentUser(me);
          setAllUsers(users);
          await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
        } catch (e) {
          alertLiveSocialFailure('Could not register profile', e);
        }
      })();
      return null;
    }
    const user: CommunityUser = {
      id: 'user_' + Date.now().toString(),
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      bio: '',
      joinedAt: new Date().toISOString(),
      followerIds: [],
      followingIds: [],
    };
    saveUserMutation.mutate(user);
    const updatedUsers = [...allUsers, user];
    saveUsersMutation.mutate(updatedUsers);
    return user;
  }, [allUsers, queryClient, saveUserMutation, saveUsersMutation]);

  const createPost = useCallback((content: string, visibility: 'public' | 'private') => {
    if (!currentUser) return;
    if (isCommunityEnabled()) {
      void (async () => {
        try {
          const { posts: nextPosts, comments: nextComments } = await liveSocial.createLiveCommunityPost(
            content,
            visibility,
          );
          setPosts(nextPosts);
          setComments(nextComments);
          await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
        } catch (e) {
          alertLiveSocialFailure('Post not published', e);
        }
      })();
      return;
    }
    const post: CommunityPost = {
      id: 'post_' + Date.now().toString(),
      authorId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      visibility,
      likes: [],
      commentIds: [],
    };
    const updated = [post, ...posts];
    setPosts(updated);
    savePostsMutation.mutate(updated);
  }, [currentUser, posts, queryClient, savePostsMutation]);

  const addComment = useCallback((postId: string, content: string) => {
    if (!currentUser) return;
    if (isCommunityEnabled()) {
      void (async () => {
        try {
          const { posts: nextPosts, comments: nextComments } = await liveSocial.createLiveCommunityComment(
            postId,
            content,
          );
          setPosts(nextPosts);
          setComments(nextComments);
          await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
        } catch (e) {
          alertLiveSocialFailure('Comment not published', e);
        }
      })();
      return;
    }
    const comment: CommunityComment = {
      id: 'comment_' + Date.now().toString(),
      postId,
      authorId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveCommentsMutation.mutate(updatedComments);

    const updatedPosts = posts.map(p =>
      p.id === postId ? { ...p, commentIds: [...p.commentIds, comment.id] } : p
    );
    setPosts(updatedPosts);
    savePostsMutation.mutate(updatedPosts);
  }, [currentUser, comments, posts, queryClient, saveCommentsMutation, savePostsMutation]);

  const toggleLike = useCallback((postId: string) => {
    if (!currentUser) return;
    if (isCommunityEnabled()) {
      void (async () => {
        try {
          const nextPosts = await liveSocial.toggleLiveCommunityPostLike(postId);
          setPosts(nextPosts);
          await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
        } catch (e) {
          alertLiveSocialFailure('Could not update like', e);
        }
      })();
      return;
    }
    const updatedPosts = posts.map(p => {
      if (p.id !== postId) return p;
      const hasLiked = p.likes.includes(currentUser.id);
      return {
        ...p,
        likes: hasLiked
          ? p.likes.filter(id => id !== currentUser.id)
          : [...p.likes, currentUser.id],
      };
    });
    setPosts(updatedPosts);
    savePostsMutation.mutate(updatedPosts);
  }, [currentUser, posts, queryClient, savePostsMutation]);

  const toggleFollow = useCallback((targetUserId: string) => {
    if (!currentUser) return;
    if (isCommunityEnabled()) {
      void (async () => {
        try {
          const { me, users } = await liveSocial.toggleLiveCommunityFollow(targetUserId);
          setCurrentUser(me);
          setAllUsers(users);
          await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
        } catch (e) {
          alertLiveSocialFailure('Could not update follow', e);
        }
      })();
      return;
    }
    const isFollowing = currentUser.followingIds.includes(targetUserId);
    const updatedUser = {
      ...currentUser,
      followingIds: isFollowing
        ? currentUser.followingIds.filter(id => id !== targetUserId)
        : [...currentUser.followingIds, targetUserId],
    };
    setCurrentUser(updatedUser);
    saveUserMutation.mutate(updatedUser);

    const updatedUsers = allUsers.map(u => {
      if (u.id === targetUserId) {
        return {
          ...u,
          followerIds: isFollowing
            ? u.followerIds.filter(id => id !== currentUser.id)
            : [...u.followerIds, currentUser.id],
        };
      }
      return u;
    });
    setAllUsers(updatedUsers);
    saveUsersMutation.mutate(updatedUsers);
  }, [currentUser, allUsers, queryClient, saveUserMutation, saveUsersMutation]);

  const createGroup = useCallback((name: string, memberUsernames: string[]) => {
    if (!currentUser || isCommunityEnabled()) return;
    const group: PrivateGroup = {
      id: 'group_' + Date.now().toString(),
      ownerId: currentUser.id,
      name,
      memberUsernames,
      createdAt: new Date().toISOString(),
    };
    const updated = [...groups, group];
    setGroups(updated);
    saveGroupsMutation.mutate(updated);
  }, [currentUser, groups, saveGroupsMutation]);

  const addMemberToGroup = useCallback((groupId: string, username: string) => {
    if (isCommunityEnabled()) return;
    const updated = groups.map(g => {
      if (g.id !== groupId) return g;
      if (g.memberUsernames.includes(username)) return g;
      return { ...g, memberUsernames: [...g.memberUsernames, username] };
    });
    setGroups(updated);
    saveGroupsMutation.mutate(updated);
  }, [groups, saveGroupsMutation]);

  const removeMemberFromGroup = useCallback((groupId: string, username: string) => {
    if (isCommunityEnabled()) return;
    const updated = groups.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, memberUsernames: g.memberUsernames.filter(u => u !== username) };
    });
    setGroups(updated);
    saveGroupsMutation.mutate(updated);
  }, [groups, saveGroupsMutation]);

  const deleteGroup = useCallback((groupId: string) => {
    if (isCommunityEnabled()) return;
    const updated = groups.filter(g => g.id !== groupId);
    setGroups(updated);
    saveGroupsMutation.mutate(updated);
  }, [groups, saveGroupsMutation]);

  const getUserById = useCallback((userId: string): CommunityUser | undefined => {
    if (currentUser?.id === userId) return currentUser;
    return allUsers.find(u => u.id === userId);
  }, [currentUser, allUsers]);

  const isAuthorBlocked = useCallback(
    (authorId: string) => {
      if (blockedCommunityUserIds.includes(authorId)) return true;
      const author =
        allUsers.find(u => u.id === authorId) ?? (currentUser?.id === authorId ? currentUser : undefined);
      const lowerNames = blockedCommunityAuthorNames.map((n) => n.trim().toLowerCase());
      if (author) {
        if (lowerNames.includes(author.displayName.trim().toLowerCase())) return true;
        if (lowerNames.includes(author.username.trim().toLowerCase())) return true;
      }
      return false;
    },
    [blockedCommunityUserIds, blockedCommunityAuthorNames, allUsers, currentUser],
  );

  const getCommentsForPost = useCallback(
    (postId: string): CommunityComment[] => {
      return comments
        .filter((c) => c.postId === postId && !isAuthorBlocked(c.authorId))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    [comments, isAuthorBlocked],
  );

  const reportCommunityContent = useCallback(
    (
      targetType: 'post' | 'comment',
      targetId: string,
      postId: string | undefined,
      reason: RoomReport['reason'],
      description: string,
    ) => {
      if (!isCommunityEnabled()) return;
      void (async () => {
        try {
          await liveSocial.reportLiveCommunityTarget({
            targetType,
            targetId,
            postId,
            reason,
            description,
          });
          await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
        } catch (e) {
          alertLiveSocialFailure('Report not submitted', e);
        }
      })();
    },
    [queryClient],
  );

  const blockCommunityUser = useCallback(
    (authorId: string, authorDisplayName: string) => {
      const id = authorId.trim();
      const label = authorDisplayName.trim();
      if (!id && !label) return;
      if (isCommunityEnabled()) {
        void (async () => {
          try {
            let next = await liveSocial.addLiveRoomBlock({
              authorId: id || undefined,
              authorName: label || undefined,
            });
            if (id && !id.startsWith('anon:')) {
              next = await liveSocial.addLiveCommunityBlock(id);
            }
            setBlockedCommunityAuthorNames(next.blockedAuthorNames ?? []);
            setBlockedCommunityUserIds(
              [...new Set([...(next.blockedUserIds ?? []), ...(next.communityBlockedUserIds ?? [])])],
            );
            await queryClient.invalidateQueries({ queryKey: ['liveSocialBlocks'] });
            await queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
          } catch (e) {
            alertLiveSocialFailure('Block not saved', e);
          }
        })();
      }
    },
    [queryClient],
  );

  const visiblePosts = useMemo(() => {
    const visibilityOk = (p: CommunityPost) => {
      if (!currentUser) return p.visibility === 'public';
      const myGroupMemberUsernames = groups
        .filter(g => g.ownerId === currentUser.id)
        .flatMap(g => g.memberUsernames);
      const groupsImIn = groups.filter(g => g.memberUsernames.includes(currentUser.username));
      const ownerIds = groupsImIn.map(g => g.ownerId);
      if (p.visibility === 'public') return true;
      if (p.authorId === currentUser.id) return true;
      const author = allUsers.find(u => u.id === p.authorId);
      if (author && myGroupMemberUsernames.includes(author.username)) return true;
      if (ownerIds.includes(p.authorId)) return true;
      return false;
    };

    return posts.filter((p) => visibilityOk(p) && !isAuthorBlocked(p.authorId));
  }, [posts, currentUser, groups, allUsers, isAuthorBlocked]);

  const isLoading =
    (isCommunityEnabled() && liveFeedQuery.isLoading) ||
    (!isCommunityEnabled() && (
      userQuery.isLoading || postsQuery.isLoading || commentsQuery.isLoading || groupsQuery.isLoading
    ));

  const socialMode = getSocialPresentationMode();

  const refetchCommunity = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['liveSocialCommunityFeed'] });
    void queryClient.invalidateQueries({ queryKey: ['liveSocialBlocks'] });
    void queryClient.invalidateQueries({ queryKey: ['communityUser'] });
    void queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
  }, [queryClient]);

  return useMemo(() => ({
    currentUser,
    allUsers,
    posts: visiblePosts,
    comments,
    groups,
    blockedCommunityUserIds,
    blockedCommunityAuthorNames,
    isLoading,
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
  }), [
    currentUser, allUsers, visiblePosts, comments, groups,
    blockedCommunityUserIds, blockedCommunityAuthorNames,
    isLoading, socialMode, refetchCommunity, setupUser, createPost, addComment, toggleLike,
    toggleFollow, createGroup, addMemberToGroup, removeMemberFromGroup,
    deleteGroup, getUserById, getCommentsForPost, reportCommunityContent, blockCommunityUser,
    isAuthorBlocked,
  ]);
});
