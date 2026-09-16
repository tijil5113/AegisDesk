/**
 * Account authentication: signup, login, logout, session.
 * Passwords hashed with bcryptjs. Sessions stored hashed in PostgreSQL.
 */
import { isDatabaseConfigured } from '../db/pool.js';
import {
  createUser,
  findUserByEmail,
  markLogin,
  publicUser,
  validateEmail,
  validatePassword,
  verifyPassword
} from '../db/users.js';
import {
  createSession,
  getSessionByToken,
  revokeSession,
  touchSession,
  SESSION_TTL_MS
} from '../db/sessions.js';
import { allowedEmails, getGateSession, isLoginConfigured } from './login.js';

const COOKIE = 'aegis_session';

function authDbFailure(res, err, fallback) {
  if (err?.code === 'SCHEMA_NOT_READY') {
    return res.status(503).json({
      error: 'Account tables are not ready yet. Wait a moment and try again.',
      code: 'schema_not_ready'
    });
  }
  if (err?.code === 'DATABASE_UNAVAILABLE') {
    return res.status(503).json({ error: 'Account service is temporarily unavailable.', code: 'database_unavailable' });
  }
  console.error(fallback.log, err?.message || err);
  return res.status(500).json({ error: fallback.error, code: fallback.code });
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `HttpOnly; Path=/; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${maxAge}`;
}

function clearCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return `HttpOnly; Path=/; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=0`;
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  String(header).split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch (_) { out[k] = v; }
  });
  return out;
}

function allowlist() {
  return allowedEmails();
}

function emailAllowedForAccounts(email) {
  const list = allowlist();
  if (!list.length) return true;
  return list.includes(email);
}

export function accountsAvailable() {
  return isDatabaseConfigured();
}

export async function getAccountSession(req) {
  if (!accountsAvailable()) return null;
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  try {
    const session = await getSessionByToken(token);
    if (session) {
      touchSession(session.id).catch(() => {});
    }
    return session;
  } catch (err) {
    if (err?.code === 'DATABASE_UNAVAILABLE' || err?.code === 'SCHEMA_NOT_READY') return null;
    throw err;
  }
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; ${cookieOptions()}`);
}

function clearSessionCookie(res) {
  const existing = res.getHeader('Set-Cookie');
  const clear = `${COOKIE}=; ${clearCookieOptions()}`;
  if (existing) {
    const list = Array.isArray(existing) ? existing : [existing];
    res.setHeader('Set-Cookie', [...list, clear]);
  } else {
    res.setHeader('Set-Cookie', clear);
  }
}

export async function signupHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.', code: 'method' });
  if (!accountsAvailable()) {
    return res.status(503).json({
      error: 'Account sign-up is unavailable because the database is not configured.',
      code: 'database_unconfigured'
    });
  }

  const body = req.body || {};
  const password = String(body.password || '');
  const confirm = String(body.confirmPassword || body.passwordConfirm || '');
  if (password !== confirm) {
    return res.status(400).json({ error: 'Passwords do not match.', code: 'password_mismatch' });
  }

  const emailCheck = validateEmail(body.email);
  if (emailCheck.ok && !emailAllowedForAccounts(emailCheck.email)) {
    return res.status(403).json({
      error: 'This email is not eligible to create an AegisDesk account.',
      code: 'email_not_allowed'
    });
  }

  try {
    const created = await createUser({
      displayName: body.displayName || body.name,
      email: body.email,
      password
    });
    if (!created.ok) {
      return res.status(created.status || 400).json({ error: created.error, code: created.code });
    }

    const session = await createSession(created.user.id, req.headers['user-agent']);
    await markLogin(created.user.id);
    setSessionCookie(res, session.token);
    return res.status(201).json({
      ok: true,
      user: created.user,
      session: { expiresAt: session.expiresAt }
    });
  } catch (err) {
    return authDbFailure(res, err, { log: '[auth/signup]', error: 'Could not create the account.', code: 'signup_failed' });
  }
}

export async function accountLoginHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.', code: 'method' });
  if (!accountsAvailable()) {
    return res.status(503).json({
      error: 'Account login is unavailable because the database is not configured.',
      code: 'database_unconfigured'
    });
  }

  const body = req.body || {};
  const emailCheck = validateEmail(body.email);
  const passCheck = validatePassword(body.password);
  if (!emailCheck.ok || !passCheck.ok) {
    return res.status(401).json({ error: 'Email or password is incorrect.', code: 'invalid_credentials' });
  }

  try {
    const user = await findUserByEmail(emailCheck.email);
    const passwordOk = user ? await verifyPassword(user, body.password) : false;
    if (!user || !passwordOk || user.status !== 'active') {
      return res.status(401).json({ error: 'Email or password is incorrect.', code: 'invalid_credentials' });
    }
    if (!emailAllowedForAccounts(emailCheck.email)) {
      return res.status(403).json({ error: 'This account is not authorized for this workspace.', code: 'email_not_allowed' });
    }

    const session = await createSession(user.id, req.headers['user-agent']);
    await markLogin(user.id);
    setSessionCookie(res, session.token);
    return res.status(200).json({
      ok: true,
      user: publicUser(user),
      session: { expiresAt: session.expiresAt }
    });
  } catch (err) {
    return authDbFailure(res, err, { log: '[auth/login]', error: 'Could not sign in.', code: 'login_failed' });
  }
}

export async function logoutHandler(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token && accountsAvailable()) {
    try { await revokeSession(token); } catch (err) {
      if (err?.code !== 'DATABASE_UNAVAILABLE' && err?.code !== 'SCHEMA_NOT_READY') console.error('[auth/logout]', err?.message || err);
    }
  }
  clearSessionCookie(res);
  const gateClear = `aegis_gate=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  const existing = res.getHeader('Set-Cookie');
  const list = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  res.setHeader('Set-Cookie', [...list, gateClear]);
  return res.status(200).json({ ok: true });
}

export async function sessionHandler(req, res) {
  const configured = accountsAvailable();
  const gate = isLoginConfigured();
  try {
    const session = await getAccountSession(req);
    if (session) {
      return res.status(200).json({
        ok: true,
        authenticated: true,
        auth: 'account',
        user: session.user,
        accountsConfigured: configured,
        gateConfigured: gate
      });
    }
    return res.status(200).json({
      ok: true,
      authenticated: false,
      auth: null,
      user: null,
      accountsConfigured: configured,
      gateConfigured: gate
    });
  } catch (err) {
    if (err?.code === 'DATABASE_UNAVAILABLE' || err?.code === 'SCHEMA_NOT_READY') {
      return res.status(200).json({
        ok: true,
        authenticated: false,
        auth: null,
        user: null,
        accountsConfigured: configured,
        gateConfigured: gate,
        database: err.code === 'SCHEMA_NOT_READY' ? 'schema_not_ready' : 'unavailable'
      });
    }
    console.error('[auth/session]', err?.message || err);
    return res.status(500).json({ error: 'Could not read session.', code: 'session_failed' });
  }
}

export async function requireAccountOrGate(req, res, next) {
  if (accountsAvailable()) {
    try {
      const session = await getAccountSession(req);
      if (session) {
        req.accountSession = session;
        req.gateSession = { email: session.user.email, sessionId: session.id };
        return next();
      }
    } catch (err) {
      if (err?.code !== 'DATABASE_UNAVAILABLE' && err?.code !== 'SCHEMA_NOT_READY') {
        console.error('[auth/require]', err?.message || err);
        return res.status(500).json({ error: 'Authentication service error.' });
      }
    }
  }
  if (isLoginConfigured()) {
    const gate = getGateSession(req);
    if (gate) {
      req.gateSession = gate;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required', code: 'unauthorized' });
  }
  return next();
}

export async function requireMailAuth(req, res, next) {
  if (accountsAvailable()) {
    try {
      const session = await getAccountSession(req);
      if (session) {
        req.accountSession = session;
        req.gateSession = { email: session.user.email, sessionId: session.id };
        return next();
      }
    } catch (err) {
      if (err?.code !== 'DATABASE_UNAVAILABLE' && err?.code !== 'SCHEMA_NOT_READY') {
        return res.status(500).json({ ok: false, code: 'auth_error', error: 'Authentication service error' });
      }
    }
  }
  if (!isLoginConfigured()) return next();
  const session = getGateSession(req);
  if (session) {
    req.gateSession = session;
    return next();
  }
  return res.status(401).json({
    ok: false,
    code: 'unauthorized',
    error: 'Authentication required'
  });
}
