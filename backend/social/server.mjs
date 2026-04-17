/**
 * Live social API for Recovery Companion (community + recovery rooms).
 *
 * Run: `npm run social-server` from repo root.
 * Configure the app: EXPO_PUBLIC_LIVE_SOCIAL_API_URL=https://your-host (or LAN http in dev)
 *
 * Features: durable JSON persistence, per-user rate limits, duplicate/spam checks,
 * moderation queue with content snapshots, admin review and enforcement actions.
 *
 * Env:
 *   PORT (default 3847)
 *   SOCIAL_ADMIN_SECRET — required for admin routes
 *   SOCIAL_DATA_DIR — optional directory for social-state.json (default: ./data next to this file)
 *
 * Production deployments should terminate TLS in front of this process, use strong secrets,
 * and consider replacing JSON persistence with a managed database and authenticated users.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3847);
const ADMIN_SECRET = process.env.SOCIAL_ADMIN_SECRET || '';
const DATA_DIR = process.env.SOCIAL_DATA_DIR || path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'social-state.json');

const MAX_ROOM_MESSAGE_LEN = 2000;
const MAX_POST_LEN = 5000;
const MAX_COMMENT_LEN = 2000;
const MAX_REPORT_DESC_LEN = 1000;

const RATE = {
  room_message: { limit: 40, windowMs: 60_000 },
  community_post: { limit: 15, windowMs: 3600_000 },
  community_comment: { limit: 60, windowMs: 3600_000 },
  report: { limit: 25, windowMs: 3600_000 },
};

/** @type {Map<string, { userId: string }>} */
const sessions = new Map();

/** @type {Map<string, any>} */
const users = new Map();

/** @type {Map<string, Set<string>>} */
const roomMembers = new Map();

/** @type {Map<string, any[]>} */
const roomMessages = new Map();

/** @type {Map<string, { names: Set<string>, ids: Set<string> }>} */
const roomBlocksByUser = new Map();

/** @type {any[]} */
let communityPosts = [];

/** @type {any[]} */
let communityComments = [];

/** @type {any[]} */
let communityGroups = [];

/** @type {any[]} */
let moderationReports = [];

/** @type {Map<string, number[]>} key: `${userId}:${bucket}` -> timestamps */
const rateHitTimestamps = new Map();

/** @type {Map<string, { content: string; at: number }>} last post fingerprint per user */
const lastContentFingerprint = new Map();

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Could not create data dir', DATA_DIR, e);
  }
}

function setsToPlainRoomBlocks() {
  const out = {};
  for (const [uid, b] of roomBlocksByUser.entries()) {
    out[uid] = { names: [...b.names], ids: [...b.ids] };
  }
  return out;
}

function plainToSetsRoomBlocks(obj) {
  roomBlocksByUser.clear();
  if (!obj || typeof obj !== 'object') return;
  for (const [uid, b] of Object.entries(obj)) {
    const names = new Set(Array.isArray(b?.names) ? b.names : []);
    const ids = new Set(Array.isArray(b?.ids) ? b.ids : []);
    roomBlocksByUser.set(uid, { names, ids });
  }
}

function serializeState() {
  const membersObj = {};
  for (const [rid, set] of roomMembers.entries()) {
    membersObj[rid] = [...set];
  }
  const messagesObj = {};
  for (const [rid, list] of roomMessages.entries()) {
    messagesObj[rid] = list;
  }
  const sessionsObj = Object.fromEntries(sessions.entries());
  const usersObj = Object.fromEntries(users.entries());
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    users: usersObj,
    sessions: sessionsObj,
    roomMembers: membersObj,
    roomMessages: messagesObj,
    roomBlocks: setsToPlainRoomBlocks(),
    communityPosts,
    communityComments,
    communityGroups,
    moderationReports,
  };
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return false;
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const data = JSON.parse(raw);
    users.clear();
    sessions.clear();
    if (data.users && typeof data.users === 'object') {
      for (const [k, v] of Object.entries(data.users)) {
        users.set(k, { postingRestricted: false, ...v });
      }
    }
    if (data.sessions && typeof data.sessions === 'object') {
      for (const [tok, s] of Object.entries(data.sessions)) {
        if (s?.userId) sessions.set(tok, { userId: s.userId });
      }
    }
    plainToSetsRoomBlocks(data.roomBlocks);
    roomMembers.clear();
    if (data.roomMembers && typeof data.roomMembers === 'object') {
      for (const [rid, arr] of Object.entries(data.roomMembers)) {
        roomMembers.set(rid, new Set(Array.isArray(arr) ? arr : []));
      }
    }
    roomMessages.clear();
    if (data.roomMessages && typeof data.roomMessages === 'object') {
      for (const [rid, arr] of Object.entries(data.roomMessages)) {
        roomMessages.set(rid, Array.isArray(arr) ? arr : []);
      }
    }
    communityPosts = Array.isArray(data.communityPosts) ? data.communityPosts : [];
    communityComments = Array.isArray(data.communityComments) ? data.communityComments : [];
    communityGroups = Array.isArray(data.communityGroups) ? data.communityGroups : [];
    moderationReports = Array.isArray(data.moderationReports) ? data.moderationReports : [];
    return true;
  } catch (e) {
    console.error('Failed to load state file', e);
    return false;
  }
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      ensureDataDir();
      const tmp = STATE_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(serializeState()), 'utf8');
      fs.renameSync(tmp, STATE_FILE);
    } catch (e) {
      console.error('Persist failed', e);
    }
  }, 400);
}

function assertAdmin(url, res, origin) {
  const secret = url.searchParams.get('secret') || '';
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    json(res, 403, { error: 'Forbidden', code: 'admin_forbidden' }, origin);
    return false;
  }
  return true;
}

function json(res, code, body, origin) {
  const o = origin || '*';
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const tok = m[1].trim();
  const s = sessions.get(tok);
  if (!s) return null;
  return users.get(s.userId) || null;
}

function authToken(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function getRoomBlocks(userId) {
  let b = roomBlocksByUser.get(userId);
  if (!b) {
    b = { names: new Set(), ids: new Set() };
    roomBlocksByUser.set(userId, b);
  }
  return b;
}

function checkRateLimit(userId, bucket, cfg) {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  let arr = rateHitTimestamps.get(key) || [];
  arr = arr.filter((t) => now - t < cfg.windowMs);
  if (arr.length >= cfg.limit) {
    return { ok: false, retryAfterSec: Math.ceil((cfg.windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  rateHitTimestamps.set(key, arr);
  return { ok: true };
}

function checkSpamRepeat(userId, content, windowMs = 20_000) {
  const fp = `${userId}:${content}`;
  const prev = lastContentFingerprint.get(userId);
  const now = Date.now();
  if (prev && prev.content === content && now - prev.at < windowMs) {
    return false;
  }
  lastContentFingerprint.set(userId, { content, at: now });
  return true;
}

function userMayPost(user) {
  if (!user) return false;
  if (user.postingRestricted) {
    return { ok: false, error: 'Posting is temporarily restricted on this account.', code: 'restricted' };
  }
  return { ok: true };
}

const AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';

function roomTemplates() {
  return [
    {
      id: 'rr_live_1',
      name: 'Morning Circle',
      description:
        'Start your day grounded with others who understand. Share intentions, gratitude, or just listen.',
      topic: 'general',
      memberCount: 0,
      maxMembers: 50,
      isJoined: false,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      scheduledSessions: [],
      messages: [],
      rules: [
        'Be kind and respectful at all times',
        'What is shared here stays here',
        'No advice unless asked — listen and support',
        'Use “I” statements when sharing',
        'Respect the group flow',
      ],
      isLive: true,
      currentSessionId: null,
    },
    {
      id: 'rr_live_2',
      name: 'Craving SOS',
      description:
        'When urges hit, come here. Support from people who get it. Not a substitute for crisis services.',
      topic: 'cravings',
      memberCount: 0,
      maxMembers: 50,
      isJoined: false,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      scheduledSessions: [],
      messages: [],
      rules: [
        'This is a crisis-aware space — be gentle',
        'No graphic descriptions of substance use',
        'Support; do not diagnose',
        'If you are in immediate danger, contact local emergency services',
        'Anonymous participation is welcome',
      ],
      isLive: true,
      currentSessionId: null,
    },
    {
      id: 'rr_live_3',
      name: 'Quiet Minds',
      description: 'Mindfulness-focused room. Breathing and present-moment awareness together.',
      topic: 'mindfulness',
      memberCount: 0,
      maxMembers: 50,
      isJoined: false,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      scheduledSessions: [],
      messages: [],
      rules: ['Silence is welcome — you do not need to speak', 'Be patient with yourself and others'],
      isLive: true,
      currentSessionId: null,
    },
  ];
}

function initRoomsIfEmpty() {
  for (const r of roomTemplates()) {
    if (!roomMembers.has(r.id)) roomMembers.set(r.id, new Set());
    if (!roomMessages.has(r.id)) roomMessages.set(r.id, []);
  }
}

function buildRoomView(roomId, userId) {
  const tpl = roomTemplates().find((r) => r.id === roomId);
  if (!tpl) return null;
  const members = roomMembers.get(roomId);
  const msgs = roomMessages.get(roomId) || [];
  const count = members ? members.size : 0;
  return {
    ...tpl,
    memberCount: count,
    isJoined: userId ? members.has(userId) : false,
    messages: msgs.map((m) => ({
      ...m,
      isOwn: Boolean(userId && m.authorId === userId),
    })),
    lastActivity: msgs.length ? msgs[msgs.length - 1].timestamp : tpl.lastActivity,
  };
}

function listRoomsForUser(userId) {
  return roomTemplates()
    .map((t) => buildRoomView(t.id, userId))
    .filter(Boolean);
}

function findMessage(roomId, messageId) {
  const list = roomMessages.get(roomId) || [];
  return list.find((m) => m.id === messageId) || null;
}

ensureDataDir();
if (loadState()) {
  console.log('Loaded social state from', STATE_FILE);
} else {
  console.log('Starting with empty persisted state (new file will be created at', STATE_FILE, ')');
}
initRoomsIfEmpty();

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '*';
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (path === '/v1/auth/session' && req.method === 'POST') {
      const body = await readBody(req);
      const deviceId = String(body?.deviceId || randomUUID());
      let user = [...users.values()].find((u) => u.deviceId === deviceId);
      if (!user) {
        const id = `u_${randomUUID().slice(0, 8)}`;
        user = {
          id,
          username: `member_${id.slice(-6)}`,
          displayName: '',
          avatar: AVATAR,
          bio: '',
          joinedAt: new Date().toISOString(),
          followerIds: [],
          followingIds: [],
          deviceId,
          postingRestricted: false,
        };
        users.set(id, user);
      }
      const token = randomUUID() + randomUUID();
      sessions.set(token, { userId: user.id });
      scheduleSave();
      return json(res, 200, { token, user }, origin);
    }

    const user = authUser(req);
    if (!user && path !== '/v1/auth/session') {
      return json(res, 401, { error: 'Unauthorized', code: 'unauthorized' }, origin);
    }

    if (path === '/v1/me' && req.method === 'GET') {
      return json(res, 200, { user }, origin);
    }

    if (path === '/v1/me' && req.method === 'PATCH') {
      const body = await readBody(req);
      if (body?.displayName != null) user.displayName = String(body.displayName).trim();
      if (body?.username != null) user.username = String(body.username).toLowerCase().trim();
      if (body?.bio != null) user.bio = String(body.bio);
      users.set(user.id, user);
      scheduleSave();
      return json(res, 200, { user }, origin);
    }

    if (path === '/v1/me/blocks' && req.method === 'GET') {
      const b = getRoomBlocks(user.id);
      return json(
        res,
        200,
        { blockedAuthorNames: [...b.names], blockedUserIds: [...b.ids] },
        origin,
      );
    }

    if (path === '/v1/me/blocks' && req.method === 'POST') {
      const body = await readBody(req);
      const name = String(body?.authorName || '').trim();
      const sid = String(body?.authorId || '').trim();
      if (!name && !sid) return json(res, 400, { error: 'authorName or authorId required' }, origin);
      const b = getRoomBlocks(user.id);
      if (name) b.names.add(name);
      if (sid) b.ids.add(sid);
      scheduleSave();
      return json(res, 200, { blockedAuthorNames: [...b.names], blockedUserIds: [...b.ids] }, origin);
    }

    if (path === '/v1/rooms' && req.method === 'GET') {
      return json(res, 200, { rooms: listRoomsForUser(user.id) }, origin);
    }

    const joinMatch = /^\/v1\/rooms\/([^/]+)\/join$/.exec(path);
    if (joinMatch && req.method === 'POST') {
      const roomId = joinMatch[1];
      const members = roomMembers.get(roomId);
      if (!members) return json(res, 404, { error: 'Room not found' }, origin);
      const room = buildRoomView(roomId, user.id);
      if (room.memberCount >= room.maxMembers) {
        return json(res, 403, { error: 'Room full' }, origin);
      }
      members.add(user.id);
      scheduleSave();
      return json(res, 200, { rooms: listRoomsForUser(user.id) }, origin);
    }

    const leaveMatch = /^\/v1\/rooms\/([^/]+)\/leave$/.exec(path);
    if (leaveMatch && req.method === 'POST') {
      const roomId = leaveMatch[1];
      const members = roomMembers.get(roomId);
      if (members) members.delete(user.id);
      scheduleSave();
      return json(res, 200, { rooms: listRoomsForUser(user.id) }, origin);
    }

    const msgMatch = /^\/v1\/rooms\/([^/]+)\/messages$/.exec(path);
    if (msgMatch && req.method === 'POST') {
      const roomId = msgMatch[1];
      const may = userMayPost(user);
      if (!may.ok) return json(res, 403, { error: may.error, code: may.code }, origin);
      const rl = checkRateLimit(user.id, 'room_message', RATE.room_message);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'You are sending messages too quickly. Please wait a moment.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          origin,
        );
      }
      const body = await readBody(req);
      let content = String(body?.content || '').trim();
      if (!content) return json(res, 400, { error: 'content required' }, origin);
      if (content.length > MAX_ROOM_MESSAGE_LEN) {
        return json(res, 400, { error: `Message too long (max ${MAX_ROOM_MESSAGE_LEN})` }, origin);
      }
      if (!checkSpamRepeat(user.id, content)) {
        return json(res, 429, { error: 'Duplicate message detected. Please wait before retrying.', code: 'spam' }, origin);
      }
      const anonymous = Boolean(body?.anonymous);
      const members = roomMembers.get(roomId);
      if (!members || !members.has(user.id)) {
        return json(res, 403, { error: 'Join the room before posting' }, origin);
      }
      const authorName = anonymous ? 'Anonymous' : user.displayName || user.username || 'Member';
      const msg = {
        id: `m_${randomUUID().slice(0, 12)}`,
        roomId,
        authorName,
        authorId: user.id,
        content,
        timestamp: new Date().toISOString(),
        isAnonymous: anonymous,
        isReported: false,
        reportReason: '',
      };
      const list = roomMessages.get(roomId) || [];
      list.push(msg);
      roomMessages.set(roomId, list);
      scheduleSave();
      return json(res, 200, { rooms: listRoomsForUser(user.id) }, origin);
    }

    if (path === '/v1/rooms/reports' && req.method === 'POST') {
      const rl = checkRateLimit(user.id, 'report', RATE.report);
      if (!rl.ok) {
        return json(
          res,
          429,
          { error: 'Too many reports from this account. Try again later.', code: 'rate_limited', retryAfterSec: rl.retryAfterSec },
          origin,
        );
      }
      const body = await readBody(req);
      const roomId = String(body?.roomId || '');
      const messageId = String(body?.messageId || '');
      const msg = roomId && messageId ? findMessage(roomId, messageId) : null;
      const rep = {
        id: `rep_${randomUUID().slice(0, 12)}`,
        type: 'room_message',
        roomId,
        messageId,
        reporterId: user.id,
        reason: body?.reason || 'other',
        description: String(body?.description || '').slice(0, MAX_REPORT_DESC_LEN),
        createdAt: new Date().toISOString(),
        status: 'pending',
        snapshot: msg
          ? {
              messageContent: msg.content,
              authorId: msg.authorId,
              authorName: msg.authorName,
              timestamp: msg.timestamp,
            }
          : null,
      };
      moderationReports.push(rep);
      if (msg) {
        msg.isReported = true;
        msg.reportReason = String(body?.reason || 'reported');
      }
      scheduleSave();
      return json(res, 201, { ok: true, reportId: rep.id }, origin);
    }

    if (path === '/v1/rooms/user-reports' && req.method === 'POST') {
      const rl = checkRateLimit(user.id, 'report', RATE.report);
      if (!rl.ok) {
        return json(
          res,
          429,
          { error: 'Too many reports from this account. Try again later.', code: 'rate_limited', retryAfterSec: rl.retryAfterSec },
          origin,
        );
      }
      const body = await readBody(req);
      const rep = {
        id: `rep_u_${randomUUID().slice(0, 12)}`,
        type: 'room_user',
        roomId: String(body?.roomId || ''),
        messageId: '',
        subjectUserId: String(body?.subjectUserId || ''),
        subjectDisplayName: String(body?.subjectDisplayName || ''),
        reporterId: user.id,
        reason: body?.reason || 'other',
        description: String(body?.description || '').slice(0, MAX_REPORT_DESC_LEN),
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      moderationReports.push(rep);
      scheduleSave();
      return json(res, 201, { ok: true, reportId: rep.id }, origin);
    }

    if (path === '/v1/community/register' && req.method === 'POST') {
      const body = await readBody(req);
      user.username = String(body?.username || user.username).toLowerCase().trim();
      user.displayName = String(body?.displayName || '').trim();
      users.set(user.id, user);
      scheduleSave();
      return json(res, 200, { me: user, users: [...users.values()] }, origin);
    }

    if (path === '/v1/community/users' && req.method === 'GET') {
      return json(res, 200, { users: [...users.values()] }, origin);
    }

    if (path === '/v1/community/posts' && req.method === 'GET') {
      const visible = communityPosts.filter((p) => !p.removedByModeration);
      return json(res, 200, { posts: visible }, origin);
    }

    if (path === '/v1/community/comments' && req.method === 'GET') {
      const visible = communityComments.filter((c) => !c.removedByModeration);
      return json(res, 200, { comments: visible }, origin);
    }

    if (path === '/v1/community/groups' && req.method === 'GET') {
      return json(res, 200, { groups: [...communityGroups] }, origin);
    }

    if (path === '/v1/community/posts' && req.method === 'POST') {
      const may = userMayPost(user);
      if (!may.ok) return json(res, 403, { error: may.error, code: may.code }, origin);
      const rl = checkRateLimit(user.id, 'community_post', RATE.community_post);
      if (!rl.ok) {
        return json(
          res,
          429,
          { error: 'Post limit reached. Try again later.', code: 'rate_limited', retryAfterSec: rl.retryAfterSec },
          origin,
        );
      }
      const body = await readBody(req);
      const content = String(body?.content || '').trim();
      const visibility = body?.visibility === 'private' ? 'private' : 'public';
      if (!content) return json(res, 400, { error: 'content required' }, origin);
      if (content.length > MAX_POST_LEN) {
        return json(res, 400, { error: `Post too long (max ${MAX_POST_LEN})` }, origin);
      }
      if (!checkSpamRepeat(user.id, content, 30_000)) {
        return json(res, 429, { error: 'Duplicate post detected.', code: 'spam' }, origin);
      }
      const post = {
        id: `p_${randomUUID().slice(0, 10)}`,
        authorId: user.id,
        content,
        createdAt: new Date().toISOString(),
        visibility,
        likes: [],
        commentIds: [],
        removedByModeration: false,
      };
      communityPosts.unshift(post);
      scheduleSave();
      return json(res, 200, { posts: communityPosts.filter((p) => !p.removedByModeration), comments: communityComments.filter((c) => !c.removedByModeration) }, origin);
    }

    if (path === '/v1/community/comments' && req.method === 'POST') {
      const may = userMayPost(user);
      if (!may.ok) return json(res, 403, { error: may.error, code: may.code }, origin);
      const rl = checkRateLimit(user.id, 'community_comment', RATE.community_comment);
      if (!rl.ok) {
        return json(
          res,
          429,
          { error: 'Comment limit reached. Try again later.', code: 'rate_limited', retryAfterSec: rl.retryAfterSec },
          origin,
        );
      }
      const body = await readBody(req);
      const postId = String(body?.postId || '');
      let content = String(body?.content || '').trim();
      if (!postId || !content) return json(res, 400, { error: 'postId and content required' }, origin);
      if (content.length > MAX_COMMENT_LEN) {
        return json(res, 400, { error: `Comment too long (max ${MAX_COMMENT_LEN})` }, origin);
      }
      if (!checkSpamRepeat(user.id, content, 15_000)) {
        return json(res, 429, { error: 'Duplicate comment detected.', code: 'spam' }, origin);
      }
      const p = communityPosts.find((x) => x.id === postId && !x.removedByModeration);
      if (!p) return json(res, 404, { error: 'Post not found' }, origin);
      const c = {
        id: `c_${randomUUID().slice(0, 10)}`,
        postId,
        authorId: user.id,
        content,
        createdAt: new Date().toISOString(),
        removedByModeration: false,
      };
      communityComments.push(c);
      p.commentIds = [...(p.commentIds || []), c.id];
      scheduleSave();
      return json(res, 200, { posts: communityPosts.filter((x) => !x.removedByModeration), comments: communityComments.filter((x) => !x.removedByModeration) }, origin);
    }

    if (path === '/v1/community/reports' && req.method === 'POST') {
      const rl = checkRateLimit(user.id, 'report', RATE.report);
      if (!rl.ok) {
        return json(
          res,
          429,
          { error: 'Too many reports from this account. Try again later.', code: 'rate_limited', retryAfterSec: rl.retryAfterSec },
          origin,
        );
      }
      const body = await readBody(req);
      const targetType = body?.targetType === 'comment' ? 'comment' : 'post';
      const targetId = String(body?.targetId || '');
      const postId = String(body?.postId || '');
      if (!targetId) return json(res, 400, { error: 'targetId required' }, origin);
      let snapshot = null;
      if (targetType === 'post') {
        const post = communityPosts.find((x) => x.id === targetId);
        if (post) {
          snapshot = { content: post.content, authorId: post.authorId, visibility: post.visibility };
        }
      } else {
        const com = communityComments.find((x) => x.id === targetId);
        if (com) {
          snapshot = { content: com.content, authorId: com.authorId, postId: com.postId };
        }
      }
      const rep = {
        id: `rep_c_${randomUUID().slice(0, 12)}`,
        type: targetType === 'comment' ? 'community_comment' : 'community_post',
        targetId,
        postId: postId || (snapshot && snapshot.postId) || '',
        reporterId: user.id,
        reason: body?.reason || 'other',
        description: String(body?.description || '').slice(0, MAX_REPORT_DESC_LEN),
        createdAt: new Date().toISOString(),
        status: 'pending',
        snapshot,
      };
      moderationReports.push(rep);
      scheduleSave();
      return json(res, 201, { ok: true, reportId: rep.id }, origin);
    }

    const likeMatch = /^\/v1\/community\/posts\/([^/]+)\/like$/.exec(path);
    if (likeMatch && req.method === 'POST') {
      const postId = likeMatch[1];
      const p = communityPosts.find((x) => x.id === postId);
      if (!p || p.removedByModeration) return json(res, 404, { error: 'Post not found' }, origin);
      const has = (p.likes || []).includes(user.id);
      p.likes = has ? (p.likes || []).filter((id) => id !== user.id) : [...(p.likes || []), user.id];
      scheduleSave();
      return json(res, 200, { posts: communityPosts.filter((x) => !x.removedByModeration) }, origin);
    }

    const followMatch = /^\/v1\/community\/users\/([^/]+)\/follow$/.exec(path);
    if (followMatch && req.method === 'POST') {
      const targetId = followMatch[1];
      const target = users.get(targetId);
      if (!target) return json(res, 404, { error: 'User not found' }, origin);
      const following = user.followingIds || [];
      const isF = following.includes(targetId);
      if (isF) {
        user.followingIds = following.filter((id) => id !== targetId);
        target.followerIds = (target.followerIds || []).filter((id) => id !== user.id);
      } else {
        user.followingIds = [...following, targetId];
        target.followerIds = [...(target.followerIds || []), user.id];
      }
      users.set(user.id, user);
      users.set(target.id, target);
      scheduleSave();
      return json(res, 200, { me: user, users: [...users.values()] }, origin);
    }

    if (path === '/v1/admin/reports' && req.method === 'GET') {
      if (!assertAdmin(url, res, origin)) return;
      return json(res, 200, { reports: moderationReports }, origin);
    }

    const patchReportMatch = /^\/v1\/admin\/reports\/([^/]+)$/.exec(path);
    if (patchReportMatch && req.method === 'PATCH') {
      if (!assertAdmin(url, res, origin)) return;
      const id = patchReportMatch[1];
      const body = await readBody(req);
      const status = body?.status === 'resolved' || body?.status === 'reviewed' ? body.status : null;
      if (!status) return json(res, 400, { error: 'status must be reviewed or resolved' }, origin);
      const rep = moderationReports.find((r) => r.id === id);
      if (!rep) return json(res, 404, { error: 'Report not found' }, origin);
      rep.status = status;
      rep.moderatorNotes = String(body?.notes || '').slice(0, 2000);
      rep.updatedAt = new Date().toISOString();
      scheduleSave();
      return json(res, 200, { report: rep }, origin);
    }

    if (path === '/v1/admin/moderation/hide-room-message' && req.method === 'POST') {
      if (!assertAdmin(url, res, origin)) return;
      const body = await readBody(req);
      const roomId = String(body?.roomId || '');
      const messageId = String(body?.messageId || '');
      const msg = roomId && messageId ? findMessage(roomId, messageId) : null;
      if (!msg) return json(res, 404, { error: 'Message not found' }, origin);
      msg.content = '[This message was removed because it violated community guidelines.]';
      msg.isReported = true;
      msg.reportReason = 'moderation_removed';
      msg.removedByModeration = true;
      scheduleSave();
      return json(res, 200, { ok: true }, origin);
    }

    if (path === '/v1/admin/moderation/hide-community-post' && req.method === 'POST') {
      if (!assertAdmin(url, res, origin)) return;
      const body = await readBody(req);
      const postId = String(body?.postId || '');
      const p = communityPosts.find((x) => x.id === postId);
      if (!p) return json(res, 404, { error: 'Post not found' }, origin);
      p.removedByModeration = true;
      p.content = '[Removed]';
      scheduleSave();
      return json(res, 200, { ok: true }, origin);
    }

    if (path === '/v1/admin/moderation/hide-community-comment' && req.method === 'POST') {
      if (!assertAdmin(url, res, origin)) return;
      const body = await readBody(req);
      const commentId = String(body?.commentId || '');
      const c = communityComments.find((x) => x.id === commentId);
      if (!c) return json(res, 404, { error: 'Comment not found' }, origin);
      c.removedByModeration = true;
      c.content = '[Removed]';
      scheduleSave();
      return json(res, 200, { ok: true }, origin);
    }

    if (path === '/v1/admin/moderation/restrict-user' && req.method === 'POST') {
      if (!assertAdmin(url, res, origin)) return;
      const body = await readBody(req);
      const userId = String(body?.userId || '');
      const restrict = Boolean(body?.restrict);
      const u = users.get(userId);
      if (!u) return json(res, 404, { error: 'User not found' }, origin);
      u.postingRestricted = restrict;
      users.set(userId, u);
      scheduleSave();
      return json(res, 200, { user: u }, origin);
    }

    return json(res, 404, { error: 'Not found' }, origin);
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Server error' }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`Live social API http://localhost:${PORT}`);
  console.log(`Persistence: ${STATE_FILE}`);
  console.log('Set EXPO_PUBLIC_LIVE_SOCIAL_API_URL in the Expo app to this origin (use LAN IP for physical devices).');
  if (ADMIN_SECRET) {
    console.log('Admin: GET /v1/admin/reports?secret=***  |  PATCH /v1/admin/reports/:id?secret=***');
    console.log('Admin actions: POST /v1/admin/moderation/hide-room-message|hide-community-post|hide-community-comment|restrict-user?secret=***');
  } else {
    console.warn('SOCIAL_ADMIN_SECRET is not set; admin moderation routes are disabled.');
  }
});
