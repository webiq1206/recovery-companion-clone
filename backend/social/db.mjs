import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  joined_at TEXT NOT NULL,
  device_id TEXT UNIQUE,
  posting_restricted INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  is_reported INTEGER NOT NULL DEFAULT 0,
  report_reason TEXT NOT NULL DEFAULT '',
  removed_by_moderation INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id);

CREATE TABLE IF NOT EXISTS room_blocks (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('name','id')),
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, value),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('public','private')),
  likes_json TEXT NOT NULL DEFAULT '[]',
  comment_ids_json TEXT NOT NULL DEFAULT '[]',
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);

CREATE TABLE IF NOT EXISTS community_groups (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS moderation_reports (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export class SocialDatabase {
  /** @param {DatabaseSync} db */
  constructor(db) {
    this.db = db;
  }

  static open(dbFilePath) {
    const db = new DatabaseSync(dbFilePath);
    db.exec(SCHEMA);
    return new SocialDatabase(db);
  }

  isBootstrapped() {
    const row = this.db.prepare('SELECT COUNT(1) AS c FROM users').get();
    return Number(row?.c) > 0;
  }

  /** @param {string} legacyJsonPath */
  migrateFromLegacyStateFile(legacyJsonPath) {
    if (!fs.existsSync(legacyJsonPath)) return false;
    if (this.isBootstrapped()) return false;
    const raw = fs.readFileSync(legacyJsonPath, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;

    const insertUser = this.db.prepare(`
      INSERT OR REPLACE INTO users (id, username, display_name, avatar, bio, joined_at, device_id, posting_restricted)
      VALUES (@id, @username, @display_name, @avatar, @bio, @joined_at, @device_id, @posting_restricted)
    `);
    const insertFollow = this.db.prepare(`
      INSERT OR IGNORE INTO user_follows (follower_id, followee_id) VALUES (?, ?)
    `);
    const insertMember = this.db.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)`);
    const insertMsg = this.db.prepare(`
      INSERT OR REPLACE INTO room_messages
      (id, room_id, author_id, author_name, content, timestamp, is_anonymous, is_reported, report_reason, removed_by_moderation)
      VALUES (@id, @room_id, @author_id, @author_name, @content, @timestamp, @is_anonymous, @is_reported, @report_reason, @removed_by_moderation)
    `);
    const insertBlock = this.db.prepare(`INSERT OR IGNORE INTO room_blocks (user_id, kind, value) VALUES (?, ?, ?)`);
    const insertPost = this.db.prepare(`
      INSERT OR REPLACE INTO community_posts
      (id, author_id, content, created_at, visibility, likes_json, comment_ids_json, removed)
      VALUES (@id, @author_id, @content, @created_at, @visibility, @likes_json, @comment_ids_json, @removed)
    `);
    const insertComment = this.db.prepare(`
      INSERT OR REPLACE INTO community_comments (id, post_id, author_id, content, created_at, removed)
      VALUES (@id, @post_id, @author_id, @content, @created_at, @removed)
    `);
    const insertGroup = this.db.prepare(`INSERT OR REPLACE INTO community_groups (id, payload_json) VALUES (?, ?)`);
    const insertReport = this.db.prepare(`INSERT OR REPLACE INTO moderation_reports (id, payload_json) VALUES (?, ?)`);

    this.db.exec('BEGIN');
    try {
      if (data.users && typeof data.users === 'object') {
        for (const u of Object.values(data.users)) {
          if (!u?.id) continue;
          insertUser.run({
            id: u.id,
            username: String(u.username || 'member').toLowerCase(),
            display_name: String(u.displayName ?? ''),
            avatar: String(u.avatar ?? ''),
            bio: String(u.bio ?? ''),
            joined_at: String(u.joinedAt || new Date().toISOString()),
            device_id: u.deviceId ? String(u.deviceId) : null,
            posting_restricted: u.postingRestricted ? 1 : 0,
          });
          for (const fid of u.followingIds || []) {
            insertFollow.run(u.id, fid);
          }
        }
      }
      if (data.roomMembers && typeof data.roomMembers === 'object') {
        for (const [rid, arr] of Object.entries(data.roomMembers)) {
          for (const uid of Array.isArray(arr) ? arr : []) {
            insertMember.run(rid, uid);
          }
        }
      }
      if (data.roomMessages && typeof data.roomMessages === 'object') {
        for (const [rid, arr] of Object.entries(data.roomMessages)) {
          for (const m of Array.isArray(arr) ? arr : []) {
            if (!m?.id) continue;
            insertMsg.run({
              id: m.id,
              room_id: rid,
              author_id: String(m.authorId || ''),
              author_name: String(m.authorName || ''),
              content: String(m.content || ''),
              timestamp: String(m.timestamp || new Date().toISOString()),
              is_anonymous: m.isAnonymous ? 1 : 0,
              is_reported: m.isReported ? 1 : 0,
              report_reason: String(m.reportReason || ''),
              removed_by_moderation: m.removedByModeration ? 1 : 0,
            });
          }
        }
      }
      if (data.roomBlocks && typeof data.roomBlocks === 'object') {
        for (const [uid, b] of Object.entries(data.roomBlocks)) {
          for (const n of Array.isArray(b?.names) ? b.names : []) {
            insertBlock.run(uid, 'name', String(n));
          }
          for (const id of Array.isArray(b?.ids) ? b.ids : []) {
            insertBlock.run(uid, 'id', String(id));
          }
        }
      }
      for (const p of Array.isArray(data.communityPosts) ? data.communityPosts : []) {
        if (!p?.id) continue;
        insertPost.run({
          id: p.id,
          author_id: String(p.authorId || ''),
          content: String(p.content || ''),
          created_at: String(p.createdAt || new Date().toISOString()),
          visibility: p.visibility === 'private' ? 'private' : 'public',
          likes_json: JSON.stringify(Array.isArray(p.likes) ? p.likes : []),
          comment_ids_json: JSON.stringify(Array.isArray(p.commentIds) ? p.commentIds : []),
          removed: p.removedByModeration ? 1 : 0,
        });
      }
      for (const c of Array.isArray(data.communityComments) ? data.communityComments : []) {
        if (!c?.id) continue;
        insertComment.run({
          id: c.id,
          post_id: String(c.postId || ''),
          author_id: String(c.authorId || ''),
          content: String(c.content || ''),
          created_at: String(c.createdAt || new Date().toISOString()),
          removed: c.removedByModeration ? 1 : 0,
        });
      }
      for (const g of Array.isArray(data.communityGroups) ? data.communityGroups : []) {
        if (!g?.id) continue;
        insertGroup.run(g.id, JSON.stringify(g));
      }
      for (const r of Array.isArray(data.moderationReports) ? data.moderationReports : []) {
        if (!r?.id) continue;
        insertReport.run(r.id, JSON.stringify(r));
      }
      this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
        'migrated_from',
        JSON.stringify({ file: legacyJsonPath, at: new Date().toISOString() }),
      );
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    try {
      fs.renameSync(legacyJsonPath, legacyJsonPath + '.migrated.' + Date.now());
    } catch {
      /* best-effort */
    }
    return true;
  }

  /** @returns {Map<string, { followerIds: string[]; followingIds: string[] }>} */
  loadFollowGraph() {
    const map = new Map();
    const rows = this.db.prepare('SELECT follower_id, followee_id FROM user_follows').all();
    for (const row of rows) {
      const f = String(row.follower_id);
      const t = String(row.followee_id);
      if (!map.has(f)) map.set(f, { followerIds: [], followingIds: [] });
      if (!map.has(t)) map.set(t, { followerIds: [], followingIds: [] });
      map.get(f).followingIds.push(t);
      map.get(t).followerIds.push(f);
    }
    return map;
  }

  rowToUser(row, graph) {
    const g = graph.get(row.id) || { followerIds: [], followingIds: [] };
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatar: row.avatar,
      bio: row.bio,
      joinedAt: row.joined_at,
      followerIds: g.followerIds,
      followingIds: g.followingIds,
      postingRestricted: Boolean(row.posting_restricted),
    };
  }

  listUsers() {
    const graph = this.loadFollowGraph();
    const rows = this.db.prepare('SELECT * FROM users ORDER BY joined_at ASC').all();
    return rows.map((row) => this.rowToUser(row, graph));
  }

  getUser(userId) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!row) return null;
    const graph = this.loadFollowGraph();
    return this.rowToUser(row, graph);
  }

  isUsernameTaken(username, exceptUserId = null) {
    const row = exceptUserId
      ? this.db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?').get(username, exceptUserId)
      : this.db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
    return Boolean(row);
  }

  findUserByDevice(deviceId) {
    const row = this.db.prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId);
    if (!row) return null;
    const graph = this.loadFollowGraph();
    return this.rowToUser(row, graph);
  }

  insertUser(user) {
    this.db
      .prepare(
        `INSERT INTO users (id, username, display_name, avatar, bio, joined_at, device_id, posting_restricted)
       VALUES (@id, @username, @display_name, @avatar, @bio, @joined_at, @device_id, @posting_restricted)`,
      )
      .run({
        id: user.id,
        username: user.username,
        display_name: user.displayName ?? '',
        avatar: user.avatar ?? '',
        bio: user.bio ?? '',
        joined_at: user.joinedAt,
        device_id: user.deviceId ?? null,
        posting_restricted: user.postingRestricted ? 1 : 0,
      });
  }

  updateUserRow(userId, fields) {
    const sets = [];
    const params = { id: userId };
    if (fields.displayName !== undefined) {
      sets.push('display_name = @display_name');
      params.display_name = fields.displayName;
    }
    if (fields.username !== undefined) {
      sets.push('username = @username');
      params.username = fields.username;
    }
    if (fields.bio !== undefined) {
      sets.push('bio = @bio');
      params.bio = fields.bio;
    }
    if (fields.postingRestricted !== undefined) {
      sets.push('posting_restricted = @posting_restricted');
      params.posting_restricted = fields.postingRestricted ? 1 : 0;
    }
    if (!sets.length) return;
    this.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params);
  }

  registerUserProfile(userId, username, displayName) {
    this.db
      .prepare('UPDATE users SET username = @username, display_name = @display_name WHERE id = @id')
      .run({ id: userId, username, display_name: displayName });
  }

  getRoomBlocks(userId) {
    const rows = this.db.prepare('SELECT kind, value FROM room_blocks WHERE user_id = ?').all(userId);
    const names = new Set();
    const ids = new Set();
    for (const r of rows) {
      if (r.kind === 'name') names.add(r.value);
      else ids.add(r.value);
    }
    return { names, ids };
  }

  addRoomBlock(userId, authorName, authorId) {
    if (authorName) {
      this.db.prepare('INSERT OR IGNORE INTO room_blocks (user_id, kind, value) VALUES (?, ?, ?)').run(userId, 'name', authorName);
    }
    if (authorId) {
      this.db.prepare('INSERT OR IGNORE INTO room_blocks (user_id, kind, value) VALUES (?, ?, ?)').run(userId, 'id', authorId);
    }
  }

  roomMemberAdd(roomId, userId) {
    this.db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, userId);
  }

  roomMemberRemove(roomId, userId) {
    this.db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, userId);
  }

  roomMemberCount(roomId) {
    const row = this.db.prepare('SELECT COUNT(1) AS c FROM room_members WHERE room_id = ?').get(roomId);
    return Number(row?.c) || 0;
  }

  roomHasMember(roomId, userId) {
    const row = this.db.prepare('SELECT 1 AS x FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
    return Boolean(row);
  }

  listRoomMessages(roomId) {
    return this.db.prepare('SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC').all(roomId);
  }

  insertRoomMessage(msg) {
    this.db
      .prepare(
        `INSERT INTO room_messages
      (id, room_id, author_id, author_name, content, timestamp, is_anonymous, is_reported, report_reason, removed_by_moderation)
      VALUES (@id, @room_id, @author_id, @author_name, @content, @timestamp, @is_anonymous, @is_reported, @report_reason, @removed_by_moderation)`,
      )
      .run({
        id: msg.id,
        room_id: msg.roomId,
        author_id: msg.authorId,
        author_name: msg.authorName,
        content: msg.content,
        timestamp: msg.timestamp,
        is_anonymous: msg.isAnonymous ? 1 : 0,
        is_reported: msg.isReported ? 1 : 0,
        report_reason: msg.reportReason || '',
        removed_by_moderation: msg.removedByModeration ? 1 : 0,
      });
  }

  findRoomMessage(roomId, messageId) {
    return this.db.prepare('SELECT * FROM room_messages WHERE room_id = ? AND id = ?').get(roomId, messageId) || null;
  }

  updateRoomMessageModeration(roomId, messageId, patch) {
    const sets = [];
    const params = { room_id: roomId, id: messageId };
    if (patch.content !== undefined) {
      sets.push('content = @content');
      params.content = patch.content;
    }
    if (patch.isReported !== undefined) {
      sets.push('is_reported = @is_reported');
      params.is_reported = patch.isReported ? 1 : 0;
    }
    if (patch.reportReason !== undefined) {
      sets.push('report_reason = @report_reason');
      params.report_reason = patch.reportReason;
    }
    if (patch.removedByModeration !== undefined) {
      sets.push('removed_by_moderation = @removed_by_moderation');
      params.removed_by_moderation = patch.removedByModeration ? 1 : 0;
    }
    if (!sets.length) return;
    this.db.prepare(`UPDATE room_messages SET ${sets.join(', ')} WHERE room_id = @room_id AND id = @id`).run(params);
  }

  msgRowToClient(row, userId) {
    return {
      id: row.id,
      roomId: row.room_id,
      authorName: row.author_name,
      authorId: row.author_id,
      content: row.content,
      timestamp: row.timestamp,
      isAnonymous: Boolean(row.is_anonymous),
      isReported: Boolean(row.is_reported),
      reportReason: row.report_reason || '',
      isOwn: Boolean(userId && row.author_id === userId),
    };
  }

  listCommunityPostsVisible() {
    const rows = this.db.prepare('SELECT * FROM community_posts WHERE removed = 0 ORDER BY created_at DESC').all();
    return rows.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      createdAt: row.created_at,
      visibility: row.visibility,
      likes: safeJsonParse(row.likes_json, []),
      commentIds: safeJsonParse(row.comment_ids_json, []),
      removedByModeration: false,
    }));
  }

  listCommunityCommentsVisible() {
    const rows = this.db.prepare('SELECT * FROM community_comments WHERE removed = 0 ORDER BY created_at ASC').all();
    return rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      content: row.content,
      createdAt: row.created_at,
      removedByModeration: false,
    }));
  }

  listCommunityGroups() {
    const rows = this.db.prepare('SELECT payload_json FROM community_groups').all();
    return rows.map((r) => safeJsonParse(r.payload_json, null)).filter(Boolean);
  }

  getCommunityPost(postId) {
    const row = this.db.prepare('SELECT * FROM community_posts WHERE id = ?').get(postId);
    if (!row) return null;
    return {
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      createdAt: row.created_at,
      visibility: row.visibility,
      likes: safeJsonParse(row.likes_json, []),
      commentIds: safeJsonParse(row.comment_ids_json, []),
      removedByModeration: Boolean(row.removed),
    };
  }

  insertCommunityPost(post) {
    this.db
      .prepare(
        `INSERT INTO community_posts (id, author_id, content, created_at, visibility, likes_json, comment_ids_json, removed)
       VALUES (@id, @author_id, @content, @created_at, @visibility, @likes_json, @comment_ids_json, @removed)`,
      )
      .run({
        id: post.id,
        author_id: post.authorId,
        content: post.content,
        created_at: post.createdAt,
        visibility: post.visibility,
        likes_json: JSON.stringify(post.likes || []),
        comment_ids_json: JSON.stringify(post.commentIds || []),
        removed: post.removedByModeration ? 1 : 0,
      });
  }

  insertCommunityComment(c) {
    this.db
      .prepare(
        `INSERT INTO community_comments (id, post_id, author_id, content, created_at, removed)
       VALUES (@id, @post_id, @author_id, @content, @created_at, @removed)`,
      )
      .run({
        id: c.id,
        post_id: c.postId,
        author_id: c.authorId,
        content: c.content,
        created_at: c.createdAt,
        removed: c.removedByModeration ? 1 : 0,
      });
  }

  updatePostLikesAndComments(postId, likes, commentIds) {
    this.db
      .prepare('UPDATE community_posts SET likes_json = ?, comment_ids_json = ? WHERE id = ?')
      .run(JSON.stringify(likes), JSON.stringify(commentIds), postId);
  }

  hideCommunityPost(postId) {
    this.db.prepare('UPDATE community_posts SET removed = 1, content = ? WHERE id = ?').run('[Removed]', postId);
  }

  hideCommunityComment(commentId) {
    this.db.prepare('UPDATE community_comments SET removed = 1, content = ? WHERE id = ?').run('[Removed]', commentId);
  }

  getCommunityComment(commentId) {
    const row = this.db.prepare('SELECT * FROM community_comments WHERE id = ?').get(commentId);
    if (!row) return null;
    return {
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      content: row.content,
      createdAt: row.created_at,
      removedByModeration: Boolean(row.removed),
    };
  }

  appendModerationReport(report) {
    this.db.prepare('INSERT INTO moderation_reports (id, payload_json) VALUES (?, ?)').run(report.id, JSON.stringify(report));
  }

  listModerationReports() {
    const rows = this.db.prepare('SELECT payload_json FROM moderation_reports ORDER BY id').all();
    return rows.map((r) => safeJsonParse(r.payload_json, null)).filter(Boolean);
  }

  findModerationReport(id) {
    const row = this.db.prepare('SELECT payload_json FROM moderation_reports WHERE id = ?').get(id);
    return row ? safeJsonParse(row.payload_json, null) : null;
  }

  updateModerationReport(report) {
    this.db.prepare('UPDATE moderation_reports SET payload_json = ? WHERE id = ?').run(JSON.stringify(report), report.id);
  }

  toggleFollow(followerId, followeeId) {
    const row = this.db
      .prepare('SELECT 1 AS x FROM user_follows WHERE follower_id = ? AND followee_id = ?')
      .get(followerId, followeeId);
    if (row) {
      this.db.prepare('DELETE FROM user_follows WHERE follower_id = ? AND followee_id = ?').run(followerId, followeeId);
      return false;
    }
    this.db.prepare('INSERT OR IGNORE INTO user_follows (follower_id, followee_id) VALUES (?, ?)').run(followerId, followeeId);
    return true;
  }

  insertCommunityGroup(g) {
    this.db.prepare('INSERT OR REPLACE INTO community_groups (id, payload_json) VALUES (?, ?)').run(g.id, JSON.stringify(g));
  }
}
