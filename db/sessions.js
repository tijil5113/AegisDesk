import crypto from 'crypto';
import { query } from './pool.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId, userAgent) {
  const id = crypto.randomUUID();
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, tokenHash, expiresAt.toISOString(), String(userAgent || '').slice(0, 240)]
  );
  return { id, token, expiresAt };
}

export async function getSessionByToken(token) {
  if (!token || typeof token !== 'string' || token.length < 32) return null;
  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT s.id, s.user_id, s.expires_at, s.revoked_at, s.last_seen_at,
            u.id AS uid, u.email, u.display_name, u.status, u.created_at, u.last_login_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  if (row.status !== 'active') return null;
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    user: {
      id: row.uid,
      email: row.email,
      displayName: row.display_name,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    }
  };
}

export async function touchSession(sessionId) {
  await query(
    `UPDATE sessions SET last_seen_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId]
  );
}

export async function revokeSession(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  await query(
    `UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

export async function revokeAllUserSessions(userId) {
  await query(
    `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

export { SESSION_TTL_MS };
