import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from './pool.js';

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function validateDisplayName(name) {
  const displayName = String(name || '').trim().replace(/\s+/g, ' ');
  if (displayName.length < 1 || displayName.length > 80) {
    return { ok: false, error: 'Display name must be 1–80 characters.' };
  }
  return { ok: true, displayName };
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  return { ok: true, email: normalized };
}

export function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }
  if (value.length > 128) {
    return { ok: false, error: 'Password must be 128 characters or fewer.' };
  }
  return { ok: true };
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}

export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  const result = await query(
    `SELECT id, email, email_normalized, password_hash, display_name, status, created_at, updated_at, last_login_at
     FROM users WHERE email_normalized = $1 LIMIT 1`,
    [normalized]
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query(
    `SELECT id, email, email_normalized, password_hash, display_name, status, created_at, updated_at, last_login_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser({ displayName, email, password }) {
  const nameCheck = validateDisplayName(displayName);
  if (!nameCheck.ok) return { ok: false, status: 400, error: nameCheck.error, code: 'invalid_name' };
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return { ok: false, status: 400, error: emailCheck.error, code: 'invalid_email' };
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { ok: false, status: 400, error: passCheck.error, code: 'invalid_password' };

  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  const id = crypto.randomUUID();

  try {
    const row = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO users (id, email, email_normalized, password_hash, display_name, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id, email, display_name, status, created_at, last_login_at`,
        [id, emailCheck.email, emailCheck.email, passwordHash, nameCheck.displayName]
      );
      await client.query(
        `INSERT INTO user_preferences (user_id, payload) VALUES ($1, '{}'::jsonb)
         ON CONFLICT (user_id) DO NOTHING`,
        [id]
      );
      return inserted.rows[0];
    });
    return { ok: true, user: publicUser(row) };
  } catch (err) {
    if (err?.code === '23505') {
      return { ok: false, status: 409, error: 'An account with this email already exists.', code: 'email_taken' };
    }
    if (err?.code === 'DATABASE_UNAVAILABLE') {
      return { ok: false, status: 503, error: 'Account service is temporarily unavailable.', code: 'database_unavailable' };
    }
    throw err;
  }
}

export async function verifyPassword(user, password) {
  if (!user?.password_hash) return false;
  return bcrypt.compare(String(password || ''), user.password_hash);
}

export async function markLogin(userId) {
  await query(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export { publicUser };
