/**
 * Live social API for RecoveryRoad (community + recovery rooms).
 *
 * Run: `npm run social-server` from the repo root.
 *
 * Persistence: SQLite (`social.db` under `SOCIAL_DATA_DIR`). One-time import from legacy
 * `social-state.json` runs automatically when the database is empty and that file exists.
 *
 * Environment:
 *   PORT (default 3847)
 *   SOCIAL_DATA_DIR — directory for `social.db` (default: ./data next to this file)
 *   SOCIAL_JWT_SECRET — signing key for session JWTs (required when NODE_ENV=production)
 *   SOCIAL_DEV_JWT_SECRET — optional stable JWT secret for local development
 *   SOCIAL_ADMIN_SECRET — enables moderation admin routes (Bearer token, see below)
 *   SOCIAL_REQUIRE_FORWARDED_TLS — set to `1` in production behind TLS to require `X-Forwarded-Proto: https`
 *   SOCIAL_ALLOWED_ORIGINS — optional comma-separated list for browser CORS; omit to allow all origins
 *
 * Admin API: send `Authorization: Bearer <SOCIAL_ADMIN_SECRET>` on admin routes.
 *
 * Deployments should terminate TLS in front of this process, set strong secrets, configure
 * `SOCIAL_ALLOWED_ORIGINS` for any browser clients, and take regular backups of `social.db`.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { SocialDatabase } from './db.mjs';
import { signSessionJwt, verifySessionJwt } from './jwt.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3847);
const isProd = process.env.NODE_ENV === 'production';
const ADMIN_SECRET = (process.env.SOCIAL_ADMIN_SECRET || '').trim();
const JWT_SECRET_ENV = (process.env.SOCIAL_JWT_SECRET || '').trim();
const DEV_JWT_SECRET = (process.env.SOCIAL_DEV_JWT_SECRET || '').trim();
const DATA_DIR = process.env.SOCIAL_DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'social.db');
const LEGACY_STATE_FILE = path.join(DATA_DIR, 'social-state.json');

const ALLOWED_ORIGINS = (process.env.SOCIAL_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** When `1` and NODE_ENV=production, require `X-Forwarded-Proto: https` (set by TLS terminator). */
const REQUIRE_FORWARDED_TLS = (process.env.SOCIAL_REQUIRE_FORWARDED_TLS || '').trim() === '1';

const MAX_ROOM_MESSAGE_LEN = 2000;
const MAX_POST_LEN = 5000;
const MAX_COMMENT_LEN = 2000;
const MAX_REPORT_DESC_LEN = 1000;
const MAX_DEVICE_ID_LEN = 200;
const MAX_DISPLAY_NAME_LEN = 80;

const RATE = {
  room_message: { limit: 40, windowMs: 60_000 },
  community_post: { limit: 15, windowMs: 3600_000 },
  community_comment: { limit: 60, windowMs: 3600_000 },
  report: { limit: 25, windowMs: 3600_000 },
  auth_session_ip: { limit: 60, windowMs: 60_000 },
};

/** @type {Map<string, number[]>} */
const rateHitTimestamps = new Map();
/** @type {Map<string, number[]>} */
const authIpHits = new Map();
/** @type {Map<string, { content: string; at: number }>} */
const lastContentFingerprint = new Map();

let jwtSecretValue = '';

function resolveJwtSecret() {
  if (JWT_SECRET_ENV) return JWT_SECRET_ENV;
  if (isProd) {
    throw new Error('SOCIAL_JWT_SECRET must be set before accepting traffic.');
  }
  if (DEV_JWT_SECRET) return DEV_JWT_SECRET;
  console.warn(
    '[social] SOCIAL_JWT_SECRET unset; using an ephemeral dev signing key (sessions reset when the process restarts). Set SOCIAL_DEV_JWT_SECRET or SOCIAL_JWT_SECRET for stable local tokens.',
  );
  return `dev-ephemeral-${randomUUID()}`;
}

function jwtSecret() {
  if (!jwtSecretValue) jwtSecretValue = resolveJwtSecret();
  return jwtSecretValue;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** @param {import('./db.mjs').SocialDatabase} store */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    bio: u.bio,
    joinedAt: u.joinedAt,
    followerIds: u.followerIds || [],
    followingIds: u.followingIds || [],
    postingRestricted: Boolean(u.postingRestricted),
  };
}

function forwardedTlsOk(req) {
  if (!REQUIRE_FORWARDED_TLS || !isProd) return true;
  const p = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return p === 'https';
}

function normalizeClientBinding(raw) {
  const s = String(raw ?? '').trim();
  if (s.length < 16 || s.length > MAX_DEVICE_ID_LEN) return '';
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return '';
  return s;
}

function normalizeAppAccountId(raw) {
  const s = String(raw ?? '').trim().slice(0, 128);
  if (!s) return '';
  if (!/^[a-zA-Z0-9_.:-]+$/.test(s)) return '';
  return s;
}

/** Self-harm / crisis language flag for moderation and in-app resource prompts (not clinical triage). */
function contentHasCrisisSignal(content) {
  const c = String(content || '').toLowerCase();
  const needles = [
    'kill myself',
    'killing myself',
    'end my life',
    'want to die',
    'wish i were dead',
    'suicide',
    'hurt myself',
    'self-harm',
    'self harm',
    'cut myself',
    'better off dead',
  ];
  return needles.some((n) => c.includes(n));
}

/** Reject obvious spam / flooding patterns (server-side; complements rate limits). */
function basicSpamRejectReason(content) {
  const s = String(content || '');
  if (s.length < 2) return null;
  if (/(.)\1{30,}/.test(s)) return 'repetitive characters';
  const links = s.match(/https?:\/\//gi);
  if (links && links.length > 6) return 'too many links';
  const lower = s.toLowerCase();
  if (
    /(viagra|cialis|crypto\s*giveaway|free\s*money|click\s*here\s*now|whatsapp\s*\+?\d{6,})/i.test(lower) &&
    lower.length < 400
  ) {
    return 'blocked pattern';
  }
  return null;
}

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (xf) return xf.slice(0, 128);
  return String(req.socket?.remoteAddress || 'unknown').slice(0, 128);
}

function resolveCorsOrigin(req) {
  if (ALLOWED_ORIGINS.length === 0) return '*';
  const origin = req.headers.origin;
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

function json(res, code, body, corsOrigin) {
  const o = corsOrigin ?? '*';
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Vary': 'Origin',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) {
        reject(new Error('payload too large'));
      }
    });
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

function bearerToken(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

/** @param {import('./db.mjs').SocialDatabase} store */
function authUser(req, store) {
  const tok = bearerToken(req);
  if (!tok) return null;
  const userId = verifySessionJwt(tok, jwtSecret());
  if (!userId) return null;
  return store.getUser(userId);
}

function assertAdmin(req, res, corsOrigin) {
  if (!ADMIN_SECRET) {
    json(res, 403, { error: 'Admin API is not configured.', code: 'admin_disabled' }, corsOrigin);
    return false;
  }
  if (bearerToken(req) !== ADMIN_SECRET) {
    json(res, 403, { error: 'Forbidden', code: 'admin_forbidden' }, corsOrigin);
    return false;
  }
  return true;
}

function checkRateLimit(key, cfg) {
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

function checkAuthIpRate(ip) {
  const key = `ip:${ip}`;
  const now = Date.now();
  let arr = authIpHits.get(key) || [];
  arr = arr.filter((t) => now - t < RATE.auth_session_ip.windowMs);
  if (arr.length >= RATE.auth_session_ip.limit) {
    return { ok: false, retryAfterSec: Math.ceil((RATE.auth_session_ip.windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  authIpHits.set(key, arr);
  return { ok: true };
}

function checkSpamRepeat(userId, content, windowMs = 20_000) {
  const prev = lastContentFingerprint.get(userId);
  const now = Date.now();
  if (prev && prev.content === content && now - prev.at < windowMs) {
    return false;
  }
  lastContentFingerprint.set(userId, { content, at: now });
  return true;
}

function userMayPost(user) {
  if (!user) return { ok: false, error: 'Unauthorized', code: 'unauthorized' };
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

/** @param {import('./db.mjs').SocialDatabase} store */
function buildRoomView(roomId, userId, store) {
  const tpl = roomTemplates().find((r) => r.id === roomId);
  if (!tpl) return null;
  const count = store.roomMemberCount(roomId);
  const blocks = userId ? store.getRoomBlocks(userId) : { names: new Set(), ids: new Set() };
  const rows = store.listRoomMessages(roomId).filter((row) => !store.messageHiddenFromViewer(row, userId, blocks));
  const msgs = rows.map((row) => store.msgRowToClient(row, userId));
  return {
    ...tpl,
    memberCount: count,
    isJoined: userId ? store.roomHasMember(roomId, userId) : false,
    messages: msgs,
    lastActivity: msgs.length ? msgs[msgs.length - 1].timestamp : tpl.lastActivity,
  };
}

/** @param {import('./db.mjs').SocialDatabase} store */
function listRoomsForUser(userId, store) {
  return roomTemplates()
    .map((t) => buildRoomView(t.id, userId, store))
    .filter(Boolean);
}

/** @param {import('./db.mjs').SocialDatabase} store */
function findMessage(roomId, messageId, store) {
  const row = store.findRoomMessage(roomId, messageId);
  return row;
}

function normalizeUsername(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .slice(0, 32);
}

function validateUsername(u) {
  if (u.length < 3 || u.length > 32) return false;
  return /^[a-z0-9_]+$/.test(u);
}

ensureDataDir();
const store = SocialDatabase.open(DB_FILE);
try {
  if (store.migrateFromLegacyStateFile(LEGACY_STATE_FILE)) {
    console.log('[social] Imported legacy JSON state into SQLite and archived the old file.');
  }
} catch (e) {
  console.error('[social] Legacy state import failed', e);
  process.exit(1);
}

if (isProd && !JWT_SECRET_ENV) {
  console.error('[social] SOCIAL_JWT_SECRET is required when NODE_ENV=production.');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const corsOrigin = resolveCorsOrigin(req);
  if (corsOrigin === null) {
    return json(res, 403, { error: 'Origin not allowed', code: 'cors_forbidden' }, '*');
  }

  if (!forwardedTlsOk(req)) {
    return json(
      res,
      403,
      {
        error: 'HTTPS is required. Configure your edge proxy to set X-Forwarded-Proto: https, or unset SOCIAL_REQUIRE_FORWARDED_TLS.',
        code: 'tls_required',
      },
      corsOrigin,
    );
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Vary': 'Origin',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const routePath = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (routePath === '/v1/auth/session' && req.method === 'POST') {
      const ip = clientIp(req);
      const rl = checkAuthIpRate(ip);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'Too many session requests from this network. Try again shortly.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
        );
      }
      const body = await readBody(req);
      const clientBindingId = normalizeClientBinding(body?.clientBindingId ?? body?.deviceId);
      if (!clientBindingId) {
        return json(
          res,
          400,
          {
            error:
              'clientBindingId required: a stable per-install identifier (16+ chars, letters/digits/_/-). The app must generate and store this value securely.',
            code: 'missing_binding',
          },
          corsOrigin,
        );
      }
      const appAccountId = normalizeAppAccountId(body?.appAccountId);

      let user = null;
      if (appAccountId) {
        const byApp = store.findUserByAppAccountId(appAccountId);
        if (byApp) {
          store.updateUserDeviceBinding(byApp.id, clientBindingId, appAccountId);
          user = store.getUser(byApp.id);
        }
      }
      if (!user) {
        user = store.findUserByDevice(clientBindingId);
      }
      if (user) {
        if (appAccountId) {
          const existing = String(user.appAccountId || '');
          if (existing && existing !== appAccountId) {
            return json(
              res,
              409,
              {
                error: 'This install is already linked to a different app account identifier.',
                code: 'identity_conflict',
              },
              corsOrigin,
            );
          }
          if (!existing) {
            if (store.findUserByAppAccountId(appAccountId)) {
              return json(res, 409, { error: 'appAccountId already linked to another profile.', code: 'identity_conflict' }, corsOrigin);
            }
            store.updateUserRow(user.id, { appAccountId });
            user = store.getUser(user.id);
          }
        }
      } else {
        const id = `u_${randomUUID().slice(0, 8)}`;
        const username = `member_${id.slice(-6)}`;
        try {
          store.insertUser({
            id,
            username,
            displayName: '',
            avatar: AVATAR,
            bio: '',
            joinedAt: new Date().toISOString(),
            deviceId: clientBindingId,
            appAccountId: appAccountId || undefined,
            postingRestricted: false,
          });
        } catch (e) {
          if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return json(res, 409, { error: 'Account identifier conflict. Try again.', code: 'identity_conflict' }, corsOrigin);
          }
          throw e;
        }
        user = store.getUser(id);
      }
      const token = signSessionJwt(user.id, jwtSecret());
      return json(res, 200, { token, user: publicUser(user) }, corsOrigin);
    }

    const isAdminRoute = routePath.startsWith('/v1/admin/');
    const user = authUser(req, store);
    if (!user && routePath !== '/v1/auth/session' && !isAdminRoute) {
      return json(res, 401, { error: 'Unauthorized', code: 'unauthorized' }, corsOrigin);
    }

    if (routePath === '/v1/me' && req.method === 'GET') {
      return json(res, 200, { user: publicUser(user) }, corsOrigin);
    }

    if (routePath === '/v1/me' && req.method === 'PATCH') {
      const body = await readBody(req);
      if (body?.displayName != null) {
        user.displayName = String(body.displayName).trim().slice(0, MAX_DISPLAY_NAME_LEN);
      }
      if (body?.username != null) {
        const next = normalizeUsername(body.username);
        if (!validateUsername(next)) {
          return json(res, 400, { error: 'Username must be 3–32 characters: lowercase letters, digits, underscore.', code: 'invalid_username' }, corsOrigin);
        }
        if (store.isUsernameTaken(next, user.id)) {
          return json(res, 409, { error: 'Username already taken', code: 'username_taken' }, corsOrigin);
        }
        user.username = next;
      }
      if (body?.bio != null) user.bio = String(body.bio).slice(0, 2000);
      store.updateUserRow(user.id, {
        displayName: user.displayName,
        username: user.username,
        bio: user.bio,
      });
      const fresh = store.getUser(user.id);
      return json(res, 200, { user: publicUser(fresh) }, corsOrigin);
    }

    if (routePath === '/v1/me/blocks' && req.method === 'GET') {
      const b = store.getRoomBlocks(user.id);
      const communityBlockedUserIds = store.listCommunityBlockedUserIds(user.id);
      return json(
        res,
        200,
        { blockedAuthorNames: [...b.names], blockedUserIds: [...b.ids], communityBlockedUserIds },
        corsOrigin,
      );
    }

    if (routePath === '/v1/me/blocks' && req.method === 'POST') {
      const body = await readBody(req);
      const name = String(body?.authorName || '').trim();
      const sid = String(body?.authorId || '').trim();
      if (!name && !sid) return json(res, 400, { error: 'authorName or authorId required' }, corsOrigin);
      store.addRoomBlock(user.id, name, sid);
      const b = store.getRoomBlocks(user.id);
      const communityBlockedUserIds = store.listCommunityBlockedUserIds(user.id);
      return json(
        res,
        200,
        { blockedAuthorNames: [...b.names], blockedUserIds: [...b.ids], communityBlockedUserIds },
        corsOrigin,
      );
    }

    if (routePath === '/v1/me/community-blocks' && req.method === 'POST') {
      const body = await readBody(req);
      const blockedUserId = String(body?.blockedUserId || '').trim();
      if (!blockedUserId) {
        return json(res, 400, { error: 'blockedUserId required', code: 'invalid_body' }, corsOrigin);
      }
      if (blockedUserId === user.id) {
        return json(res, 400, { error: 'Cannot block yourself', code: 'invalid_block' }, corsOrigin);
      }
      const target = store.getUser(blockedUserId);
      if (!target) return json(res, 404, { error: 'User not found' }, corsOrigin);
      store.addCommunityUserBlock(user.id, blockedUserId);
      const communityBlockedUserIds = store.listCommunityBlockedUserIds(user.id);
      const b = store.getRoomBlocks(user.id);
      return json(
        res,
        200,
        {
          blockedAuthorNames: [...b.names],
          blockedUserIds: [...b.ids],
          communityBlockedUserIds,
        },
        corsOrigin,
      );
    }

    if (routePath === '/v1/rooms' && req.method === 'GET') {
      return json(res, 200, { rooms: listRoomsForUser(user.id, store) }, corsOrigin);
    }

    const joinMatch = /^\/v1\/rooms\/([^/]+)\/join$/.exec(routePath);
    if (joinMatch && req.method === 'POST') {
      const roomId = joinMatch[1];
      const tpl = roomTemplates().find((r) => r.id === roomId);
      if (!tpl) return json(res, 404, { error: 'Room not found' }, corsOrigin);
      const count = store.roomMemberCount(roomId);
      if (count >= tpl.maxMembers) {
        return json(res, 403, { error: 'Room full' }, corsOrigin);
      }
      store.roomMemberAdd(roomId, user.id);
      return json(res, 200, { rooms: listRoomsForUser(user.id, store) }, corsOrigin);
    }

    const leaveMatch = /^\/v1\/rooms\/([^/]+)\/leave$/.exec(routePath);
    if (leaveMatch && req.method === 'POST') {
      const roomId = leaveMatch[1];
      store.roomMemberRemove(roomId, user.id);
      return json(res, 200, { rooms: listRoomsForUser(user.id, store) }, corsOrigin);
    }

    const msgMatch = /^\/v1\/rooms\/([^/]+)\/messages$/.exec(routePath);
    if (msgMatch && req.method === 'POST') {
      const roomId = msgMatch[1];
      const may = userMayPost(user);
      if (!may.ok) return json(res, 403, { error: may.error, code: may.code }, corsOrigin);
      const rl = checkRateLimit(`${user.id}:room_message`, RATE.room_message);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'You are sending messages too quickly. Please wait a moment.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
        );
      }
      const body = await readBody(req);
      let content = String(body?.content || '').trim();
      if (!content) return json(res, 400, { error: 'content required' }, corsOrigin);
      if (content.length > MAX_ROOM_MESSAGE_LEN) {
        return json(res, 400, { error: `Message too long (max ${MAX_ROOM_MESSAGE_LEN})` }, corsOrigin);
      }
      if (!checkSpamRepeat(user.id, content)) {
        return json(res, 429, { error: 'Duplicate message detected. Please wait before retrying.', code: 'spam' }, corsOrigin);
      }
      const spamWhy = basicSpamRejectReason(content);
      if (spamWhy) {
        return json(res, 400, { error: 'Message rejected as spam or unsafe pattern.', code: 'spam_pattern', detail: spamWhy }, corsOrigin);
      }
      const anonymous = Boolean(body?.anonymous);
      if (!store.roomHasMember(roomId, user.id)) {
        return json(res, 403, { error: 'Join the room before posting' }, corsOrigin);
      }
      const authorName = anonymous ? 'Anonymous' : user.displayName || user.username || 'Member';
      const crisisSignal = contentHasCrisisSignal(content);
      const msg = {
        id: `m_${randomUUID().slice(0, 12)}`,
        roomId,
        authorId: user.id,
        authorName,
        content,
        timestamp: new Date().toISOString(),
        isAnonymous: anonymous,
        isReported: false,
        reportReason: '',
        removedByModeration: false,
        crisisSignal,
      };
      store.insertRoomMessage(msg);
      if (crisisSignal) {
        const rep = {
          id: `rep_auto_${randomUUID().slice(0, 10)}`,
          type: 'crisis_keyword_room',
          roomId,
          messageId: msg.id,
          reporterId: 'system',
          reason: 'crisis_language',
          description: 'Automated flag: message may contain self-harm or crisis language.',
          createdAt: new Date().toISOString(),
          status: 'pending',
          snapshot: { authorId: user.id, authorName, contentPreview: content.slice(0, 280) },
        };
        store.appendModerationReport(rep);
      }
      return json(res, 200, { rooms: listRoomsForUser(user.id, store) }, corsOrigin);
    }

    if (routePath === '/v1/rooms/reports' && req.method === 'POST') {
      const rl = checkRateLimit(`${user.id}:report`, RATE.report);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'Too many reports from this account. Try again later.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
        );
      }
      const body = await readBody(req);
      const roomId = String(body?.roomId || '');
      const messageId = String(body?.messageId || '');
      const row = roomId && messageId ? findMessage(roomId, messageId, store) : null;
      const msg = row ? store.msgRowToClient(row, user.id) : null;
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
        snapshot: row
          ? {
              messageContent: msg.content,
              authorId: msg.authorId,
              authorName: msg.authorName,
              timestamp: msg.timestamp,
            }
          : null,
      };
      store.appendModerationReport(rep);
      if (row) {
        store.updateRoomMessageModeration(roomId, messageId, {
          isReported: true,
          reportReason: String(body?.reason || 'reported'),
        });
      }
      return json(res, 201, { ok: true, reportId: rep.id }, corsOrigin);
    }

    if (routePath === '/v1/rooms/user-reports' && req.method === 'POST') {
      const rl = checkRateLimit(`${user.id}:report`, RATE.report);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'Too many reports from this account. Try again later.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
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
      store.appendModerationReport(rep);
      return json(res, 201, { ok: true, reportId: rep.id }, corsOrigin);
    }

    if (routePath === '/v1/community/register' && req.method === 'POST') {
      const body = await readBody(req);
      const username = normalizeUsername(body?.username);
      const displayName = String(body?.displayName || '').trim().slice(0, MAX_DISPLAY_NAME_LEN);
      if (!validateUsername(username)) {
        return json(res, 400, { error: 'Username must be 3–32 characters: lowercase letters, digits, underscore.', code: 'invalid_username' }, corsOrigin);
      }
      if (store.isUsernameTaken(username, user.id)) {
        return json(res, 409, { error: 'Username already taken', code: 'username_taken' }, corsOrigin);
      }
      store.registerUserProfile(user.id, username, displayName);
      const me = store.getUser(user.id);
      return json(res, 200, { me: publicUser(me), users: store.listUsersForViewer(user.id).map(publicUser) }, corsOrigin);
    }

    if (routePath === '/v1/community/users' && req.method === 'GET') {
      return json(res, 200, { users: store.listUsersForViewer(user.id).map(publicUser) }, corsOrigin);
    }

    if (routePath === '/v1/community/posts' && req.method === 'GET') {
      return json(res, 200, { posts: store.listCommunityPostsVisibleForViewer(user.id) }, corsOrigin);
    }

    if (routePath === '/v1/community/comments' && req.method === 'GET') {
      return json(res, 200, { comments: store.listCommunityCommentsVisibleForViewer(user.id) }, corsOrigin);
    }

    if (routePath === '/v1/community/groups' && req.method === 'GET') {
      return json(res, 200, { groups: store.listCommunityGroups() }, corsOrigin);
    }

    if (routePath === '/v1/community/posts' && req.method === 'POST') {
      const may = userMayPost(user);
      if (!may.ok) return json(res, 403, { error: may.error, code: may.code }, corsOrigin);
      const rl = checkRateLimit(`${user.id}:community_post`, RATE.community_post);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'Post limit reached. Try again later.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
        );
      }
      const body = await readBody(req);
      const content = String(body?.content || '').trim();
      const visibility = body?.visibility === 'private' ? 'private' : 'public';
      if (!content) return json(res, 400, { error: 'content required' }, corsOrigin);
      if (content.length > MAX_POST_LEN) {
        return json(res, 400, { error: `Post too long (max ${MAX_POST_LEN})` }, corsOrigin);
      }
      if (!checkSpamRepeat(user.id, content, 30_000)) {
        return json(res, 429, { error: 'Duplicate post detected.', code: 'spam' }, corsOrigin);
      }
      const spamWhy = basicSpamRejectReason(content);
      if (spamWhy) {
        return json(res, 400, { error: 'Post rejected as spam or unsafe pattern.', code: 'spam_pattern', detail: spamWhy }, corsOrigin);
      }
      const crisisFlag = contentHasCrisisSignal(content);
      const post = {
        id: `p_${randomUUID().slice(0, 10)}`,
        authorId: user.id,
        content,
        createdAt: new Date().toISOString(),
        visibility,
        likes: [],
        commentIds: [],
        removedByModeration: false,
        crisisFlag,
      };
      store.insertCommunityPost(post);
      if (crisisFlag) {
        store.appendModerationReport({
          id: `rep_auto_${randomUUID().slice(0, 10)}`,
          type: 'crisis_keyword_community_post',
          targetId: post.id,
          postId: post.id,
          reporterId: 'system',
          reason: 'crisis_language',
          description: 'Automated flag: post may contain self-harm or crisis language.',
          createdAt: new Date().toISOString(),
          status: 'pending',
          snapshot: { authorId: user.id, contentPreview: content.slice(0, 280) },
        });
      }
      return json(
        res,
        200,
        {
          posts: store.listCommunityPostsVisibleForViewer(user.id),
          comments: store.listCommunityCommentsVisibleForViewer(user.id),
        },
        corsOrigin,
      );
    }

    if (routePath === '/v1/community/comments' && req.method === 'POST') {
      const may = userMayPost(user);
      if (!may.ok) return json(res, 403, { error: may.error, code: may.code }, corsOrigin);
      const rl = checkRateLimit(`${user.id}:community_comment`, RATE.community_comment);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'Comment limit reached. Try again later.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
        );
      }
      const body = await readBody(req);
      const postId = String(body?.postId || '');
      const content = String(body?.content || '').trim();
      if (!postId || !content) return json(res, 400, { error: 'postId and content required' }, corsOrigin);
      if (content.length > MAX_COMMENT_LEN) {
        return json(res, 400, { error: `Comment too long (max ${MAX_COMMENT_LEN})` }, corsOrigin);
      }
      if (!checkSpamRepeat(user.id, content, 15_000)) {
        return json(res, 429, { error: 'Duplicate comment detected.', code: 'spam' }, corsOrigin);
      }
      const spamWhy = basicSpamRejectReason(content);
      if (spamWhy) {
        return json(res, 400, { error: 'Comment rejected as spam or unsafe pattern.', code: 'spam_pattern', detail: spamWhy }, corsOrigin);
      }
      const p = store.getCommunityPost(postId);
      if (!p || p.removedByModeration) return json(res, 404, { error: 'Post not found' }, corsOrigin);
      const c = {
        id: `c_${randomUUID().slice(0, 10)}`,
        postId,
        authorId: user.id,
        content,
        createdAt: new Date().toISOString(),
        removedByModeration: false,
      };
      store.insertCommunityComment(c);
      const nextIds = [...(p.commentIds || []), c.id];
      store.updatePostLikesAndComments(postId, p.likes || [], nextIds);
      if (contentHasCrisisSignal(content)) {
        store.appendModerationReport({
          id: `rep_auto_${randomUUID().slice(0, 10)}`,
          type: 'crisis_keyword_community_comment',
          targetId: c.id,
          postId,
          reporterId: 'system',
          reason: 'crisis_language',
          description: 'Automated flag: comment may contain self-harm or crisis language.',
          createdAt: new Date().toISOString(),
          status: 'pending',
          snapshot: { authorId: user.id, contentPreview: content.slice(0, 280) },
        });
      }
      return json(
        res,
        200,
        {
          posts: store.listCommunityPostsVisibleForViewer(user.id),
          comments: store.listCommunityCommentsVisibleForViewer(user.id),
        },
        corsOrigin,
      );
    }

    if (routePath === '/v1/community/reports' && req.method === 'POST') {
      const rl = checkRateLimit(`${user.id}:report`, RATE.report);
      if (!rl.ok) {
        return json(
          res,
          429,
          {
            error: 'Too many reports from this account. Try again later.',
            code: 'rate_limited',
            retryAfterSec: rl.retryAfterSec,
          },
          corsOrigin,
        );
      }
      const body = await readBody(req);
      const targetType = body?.targetType === 'comment' ? 'comment' : 'post';
      const targetId = String(body?.targetId || '');
      const postId = String(body?.postId || '');
      if (!targetId) return json(res, 400, { error: 'targetId required' }, corsOrigin);
      let snapshot = null;
      if (targetType === 'post') {
        const post = store.getCommunityPost(targetId);
        if (post && !post.removedByModeration) {
          snapshot = { content: post.content, authorId: post.authorId, visibility: post.visibility };
        }
      } else {
        const com = store.getCommunityComment(targetId);
        if (com && !com.removedByModeration) {
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
      store.appendModerationReport(rep);
      return json(res, 201, { ok: true, reportId: rep.id }, corsOrigin);
    }

    const likeMatch = /^\/v1\/community\/posts\/([^/]+)\/like$/.exec(routePath);
    if (likeMatch && req.method === 'POST') {
      const postId = likeMatch[1];
      const p = store.getCommunityPost(postId);
      if (!p || p.removedByModeration) return json(res, 404, { error: 'Post not found' }, corsOrigin);
      const likes = p.likes || [];
      const has = likes.includes(user.id);
      const next = has ? likes.filter((id) => id !== user.id) : [...likes, user.id];
      store.updatePostLikesAndComments(postId, next, p.commentIds || []);
      return json(res, 200, { posts: store.listCommunityPostsVisibleForViewer(user.id) }, corsOrigin);
    }

    const followMatch = /^\/v1\/community\/users\/([^/]+)\/follow$/.exec(routePath);
    if (followMatch && req.method === 'POST') {
      const targetId = followMatch[1];
      const target = store.getUser(targetId);
      if (!target) return json(res, 404, { error: 'User not found' }, corsOrigin);
      store.toggleFollow(user.id, targetId);
      const me = store.getUser(user.id);
      return json(res, 200, { me: publicUser(me), users: store.listUsersForViewer(user.id).map(publicUser) }, corsOrigin);
    }

    if (routePath === '/v1/admin/reports' && req.method === 'GET') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      return json(res, 200, { reports: store.listModerationReports() }, corsOrigin);
    }

    const patchReportMatch = /^\/v1\/admin\/reports\/([^/]+)$/.exec(routePath);
    if (patchReportMatch && req.method === 'PATCH') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      const id = patchReportMatch[1];
      const body = await readBody(req);
      const status = body?.status === 'resolved' || body?.status === 'reviewed' ? body.status : null;
      if (!status) return json(res, 400, { error: 'status must be reviewed or resolved' }, corsOrigin);
      const rep = store.findModerationReport(id);
      if (!rep) return json(res, 404, { error: 'Report not found' }, corsOrigin);
      rep.status = status;
      rep.moderatorNotes = String(body?.notes || '').slice(0, 2000);
      rep.updatedAt = new Date().toISOString();
      store.updateModerationReport(rep);
      return json(res, 200, { report: rep }, corsOrigin);
    }

    if (routePath === '/v1/admin/moderation/hide-room-message' && req.method === 'POST') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      const body = await readBody(req);
      const roomId = String(body?.roomId || '');
      const messageId = String(body?.messageId || '');
      const row = roomId && messageId ? findMessage(roomId, messageId, store) : null;
      if (!row) return json(res, 404, { error: 'Message not found' }, corsOrigin);
      store.updateRoomMessageModeration(roomId, messageId, {
        content: '[This message was removed because it violated community guidelines.]',
        isReported: true,
        reportReason: 'moderation_removed',
        removedByModeration: true,
      });
      return json(res, 200, { ok: true }, corsOrigin);
    }

    if (routePath === '/v1/admin/moderation/hide-community-post' && req.method === 'POST') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      const body = await readBody(req);
      const postId = String(body?.postId || '');
      const p = store.getCommunityPost(postId);
      if (!p) return json(res, 404, { error: 'Post not found' }, corsOrigin);
      store.hideCommunityPost(postId);
      return json(res, 200, { ok: true }, corsOrigin);
    }

    if (routePath === '/v1/admin/moderation/hide-community-comment' && req.method === 'POST') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      const body = await readBody(req);
      const commentId = String(body?.commentId || '');
      const c = store.getCommunityComment(commentId);
      if (!c) return json(res, 404, { error: 'Comment not found' }, corsOrigin);
      store.hideCommunityComment(commentId);
      return json(res, 200, { ok: true }, corsOrigin);
    }

    if (routePath === '/v1/admin/moderation/restrict-user' && req.method === 'POST') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      const body = await readBody(req);
      const userId = String(body?.userId || '');
      const restrict = Boolean(body?.restrict);
      const u = store.getUser(userId);
      if (!u) return json(res, 404, { error: 'User not found' }, corsOrigin);
      store.updateUserRow(userId, { postingRestricted: restrict });
      const fresh = store.getUser(userId);
      return json(res, 200, { user: publicUser(fresh) }, corsOrigin);
    }

    const adminDeleteUserMatch = /^\/v1\/admin\/users\/([^/]+)\/delete-data$/.exec(routePath);
    if (adminDeleteUserMatch && req.method === 'POST') {
      if (!assertAdmin(req, res, corsOrigin)) return;
      const targetUserId = adminDeleteUserMatch[1];
      const u = store.getUser(targetUserId);
      if (!u) return json(res, 404, { error: 'User not found' }, corsOrigin);
      store.deleteUserData(targetUserId);
      return json(res, 200, { ok: true, deletedUserId: targetUserId }, corsOrigin);
    }

    return json(res, 404, { error: 'Not found' }, corsOrigin);
  } catch (e) {
    console.error(e);
    if (String(e?.message || '').includes('payload too large')) {
      return json(res, 413, { error: 'Payload too large' }, corsOrigin);
    }
    if (typeof e === 'object' && e && (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY')) {
      return json(res, 409, { error: 'Conflict', code: 'constraint' }, corsOrigin);
    }
    return json(res, 500, { error: 'Server error' }, corsOrigin);
  }
});

server.listen(PORT, () => {
  console.log(`[social] API listening on port ${PORT}`);
  console.log(`[social] SQLite database: ${DB_FILE}`);
  if (ALLOWED_ORIGINS.length) {
    console.log(`[social] CORS restricted to: ${ALLOWED_ORIGINS.join(', ')}`);
  }
  if (ADMIN_SECRET) {
    console.log('[social] Admin moderation routes enabled (Authorization: Bearer <SOCIAL_ADMIN_SECRET>).');
  } else {
    console.warn('[social] SOCIAL_ADMIN_SECRET is not set; admin moderation routes respond with 403.');
  }
  if (REQUIRE_FORWARDED_TLS && isProd) {
    console.log('[social] SOCIAL_REQUIRE_FORWARDED_TLS=1: rejecting requests without X-Forwarded-Proto: https.');
  }
});
