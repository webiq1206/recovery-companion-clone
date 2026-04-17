import { createHmac, timingSafeEqual } from 'node:crypto';

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

/**
 * @param {string} userId
 * @param {string} secret
 * @param {number} [ttlSec]
 */
export function signSessionJwt(userId, secret, ttlSec = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: userId, typ: 'social_access', iat: now, exp: now + ttlSec };
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson(payload);
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * @param {string} token
 * @param {string} secret
 * @returns {string | null} userId
 */
export function verifySessionJwt(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  try {
    if (s.length !== expected.length || !timingSafeEqual(Buffer.from(s, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return null;
    }
  } catch {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (payload.typ !== 'social_access' || typeof payload.sub !== 'string') return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now > payload.exp) return null;
  return payload.sub;
}
