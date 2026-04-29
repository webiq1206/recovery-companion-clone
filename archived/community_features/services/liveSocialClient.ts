/**
 * HTTP client for the live social API (`backend/social/server.mjs`).
 * Auth: signed session JWT from POST /v1/auth/session (send as `Authorization: Bearer …` on all calls).
 *
 * Session body includes `clientBindingId` (stable per install, from SecureStore) and optional
 * `appAccountId` (RevenueCat anonymous id when present) so the backend can bind a durable account.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type {
  CommunityComment,
  CommunityPost,
  CommunityUser,
  PrivateGroup,
  RecoveryRoom,
  RoomReport,
} from '../types';
import { getLiveSocialApiBaseUrl } from '../core/socialLiveConfig';

const TOKEN_KEY = 'live_social_access_token';
const BINDING_KEY_SECURE = 'live_social_client_binding_v1';
const DEVICE_KEY_LEGACY = 'live_social_device_id';
/** Same key as `SubscriptionProvider` — stable per install when RevenueCat is configured. */
const RC_USER_ID_KEY = 'rc_user_id';

export class LiveSocialApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterSec?: number;

  constructor(
    message: string,
    opts: { status: number; code?: string; retryAfterSec?: number },
  ) {
    super(message);
    this.name = 'LiveSocialApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfterSec = opts.retryAfterSec;
  }
}

async function getOrCreateClientBindingId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(BINDING_KEY_SECURE);
    if (existing && existing.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(existing)) {
      return existing;
    }
  } catch {
    /* SecureStore unavailable (e.g. web) */
  }
  const legacy = await AsyncStorage.getItem(DEVICE_KEY_LEGACY);
  if (legacy && legacy.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(legacy)) {
    try {
      await SecureStore.setItemAsync(BINDING_KEY_SECURE, legacy);
    } catch {
      /* ignore */
    }
    return legacy;
  }
  const fresh = Crypto.randomUUID();
  try {
    await SecureStore.setItemAsync(BINDING_KEY_SECURE, fresh);
  } catch {
    await AsyncStorage.setItem(DEVICE_KEY_LEGACY, fresh);
  }
  return fresh;
}

async function getOptionalAppAccountId(): Promise<string | undefined> {
  const id = (await AsyncStorage.getItem(RC_USER_ID_KEY))?.trim();
  return id && id.length >= 8 ? id : undefined;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getLiveSocialApiBaseUrl();
  if (!base) {
    throw new Error('Live social API URL is not configured.');
  }
  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (init?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const body = json as { error?: string; code?: string; retryAfterSec?: number } | null;
    const msg = (typeof body?.error === 'string' && body.error) || text || res.statusText;
    throw new LiveSocialApiError(typeof msg === 'string' ? msg : `HTTP ${res.status}`, {
      status: res.status,
      code: typeof body?.code === 'string' ? body.code : undefined,
      retryAfterSec: typeof body?.retryAfterSec === 'number' ? body.retryAfterSec : undefined,
    });
  }
  return json as T;
}

export type LiveSocialSession = {
  token: string;
  user: CommunityUser;
};

export async function ensureLiveSocialSession(): Promise<LiveSocialSession> {
  const existing = await getToken();
  if (existing) {
    try {
      const me = await api<{ user: CommunityUser }>('/v1/me');
      return { token: existing, user: me.user };
    } catch {
      await setToken(null);
    }
  }
  const clientBindingId = await getOrCreateClientBindingId();
  const appAccountId = await getOptionalAppAccountId();
  const created = await api<{ token: string; user: CommunityUser }>('/v1/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      clientBindingId,
      ...(appAccountId ? { appAccountId } : {}),
    }),
  });
  await setToken(created.token);
  return { token: created.token, user: created.user };
}

export async function clearLiveSocialSession(): Promise<void> {
  await setToken(null);
}

export async function updateLiveProfile(partial: {
  displayName?: string;
  username?: string;
  bio?: string;
}): Promise<CommunityUser> {
  const { user } = await api<{ user: CommunityUser }>('/v1/me', {
    method: 'PATCH',
    body: JSON.stringify(partial),
  });
  return user;
}

/** --- Recovery rooms --- */

export async function listLiveRooms(): Promise<RecoveryRoom[]> {
  const { rooms } = await api<{ rooms: RecoveryRoom[] }>('/v1/rooms');
  return rooms;
}

export async function joinLiveRoom(roomId: string): Promise<RecoveryRoom[]> {
  const { rooms } = await api<{ rooms: RecoveryRoom[] }>(`/v1/rooms/${encodeURIComponent(roomId)}/join`, {
    method: 'POST',
  });
  return rooms;
}

export async function leaveLiveRoom(roomId: string): Promise<RecoveryRoom[]> {
  const { rooms } = await api<{ rooms: RecoveryRoom[] }>(`/v1/rooms/${encodeURIComponent(roomId)}/leave`, {
    method: 'POST',
  });
  return rooms;
}

export async function sendLiveRoomMessage(
  roomId: string,
  content: string,
  anonymous: boolean,
): Promise<RecoveryRoom[]> {
  const { rooms } = await api<{ rooms: RecoveryRoom[] }>(
    `/v1/rooms/${encodeURIComponent(roomId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content, anonymous }),
    },
  );
  return rooms;
}

export async function reportLiveRoomMessage(payload: {
  roomId: string;
  messageId: string;
  reason: RoomReport['reason'];
  description: string;
}): Promise<void> {
  await api('/v1/rooms/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reportLiveRoomUser(payload: {
  roomId: string;
  subjectUserId: string;
  subjectDisplayName: string;
  reason: RoomReport['reason'];
  description: string;
}): Promise<void> {
  await api('/v1/rooms/user-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Report a community post or comment (live backend moderation queue). */
export async function reportLiveCommunityTarget(payload: {
  targetType: 'post' | 'comment';
  targetId: string;
  postId?: string;
  reason: RoomReport['reason'];
  description: string;
}): Promise<{ ok?: boolean; reportId?: string }> {
  return api('/v1/community/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type LiveRoomBlocks = {
  blockedAuthorNames: string[];
  blockedUserIds: string[];
  /** User IDs blocked for community feed (server-enforced). */
  communityBlockedUserIds?: string[];
};

export async function listLiveRoomBlocks(): Promise<LiveRoomBlocks> {
  return api<LiveRoomBlocks>('/v1/me/blocks');
}

export async function addLiveRoomBlock(partial: {
  authorName?: string;
  authorId?: string;
}): Promise<LiveRoomBlocks> {
  return api<LiveRoomBlocks>('/v1/me/blocks', {
    method: 'POST',
    body: JSON.stringify(partial),
  });
}

/** Block a user’s community content for this account (in addition to recovery-room blocks). */
export async function addLiveCommunityBlock(blockedUserId: string): Promise<LiveRoomBlocks> {
  return api<LiveRoomBlocks>('/v1/me/community-blocks', {
    method: 'POST',
    body: JSON.stringify({ blockedUserId }),
  });
}

/** --- Community feed --- */

export async function listLiveCommunityUsers(): Promise<CommunityUser[]> {
  const { users } = await api<{ users: CommunityUser[] }>('/v1/community/users');
  return users;
}

export async function listLiveCommunityPosts(): Promise<CommunityPost[]> {
  const { posts } = await api<{ posts: CommunityPost[] }>('/v1/community/posts');
  return posts;
}

export async function listLiveCommunityComments(): Promise<CommunityComment[]> {
  const { comments } = await api<{ comments: CommunityComment[] }>('/v1/community/comments');
  return comments;
}

export async function listLiveCommunityGroups(): Promise<PrivateGroup[]> {
  const { groups } = await api<{ groups: PrivateGroup[] }>('/v1/community/groups');
  return groups;
}

export async function createLiveCommunityPost(
  content: string,
  visibility: 'public' | 'private',
): Promise<{ posts: CommunityPost[]; comments: CommunityComment[] }> {
  return api('/v1/community/posts', {
    method: 'POST',
    body: JSON.stringify({ content, visibility }),
  });
}

export async function createLiveCommunityComment(
  postId: string,
  content: string,
): Promise<{ posts: CommunityPost[]; comments: CommunityComment[] }> {
  return api('/v1/community/comments', {
    method: 'POST',
    body: JSON.stringify({ postId, content }),
  });
}

export async function toggleLiveCommunityPostLike(postId: string): Promise<CommunityPost[]> {
  const { posts } = await api<{ posts: CommunityPost[] }>(
    `/v1/community/posts/${encodeURIComponent(postId)}/like`,
    { method: 'POST' },
  );
  return posts;
}

export async function toggleLiveCommunityFollow(targetUserId: string): Promise<{
  me: CommunityUser;
  users: CommunityUser[];
}> {
  return api(`/v1/community/users/${encodeURIComponent(targetUserId)}/follow`, { method: 'POST' });
}

export async function registerLiveCommunityProfile(
  username: string,
  displayName: string,
): Promise<{ me: CommunityUser; users: CommunityUser[] }> {
  return api('/v1/community/register', {
    method: 'POST',
    body: JSON.stringify({ username, displayName }),
  });
}

export type LiveCommunityFeed = {
  me: CommunityUser;
  users: CommunityUser[];
  posts: CommunityPost[];
  comments: CommunityComment[];
  groups: PrivateGroup[];
};

export async function fetchLiveCommunityFeed(): Promise<LiveCommunityFeed> {
  const { user: me } = await ensureLiveSocialSession();
  const [users, posts, comments, groups] = await Promise.all([
    listLiveCommunityUsers(),
    listLiveCommunityPosts(),
    listLiveCommunityComments(),
    listLiveCommunityGroups(),
  ]);
  return { me, users, posts, comments, groups };
}
