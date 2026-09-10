// Gate login for login.html — verifies email + access code server-side.
// This is a constrained allowlist gate, not a full identity platform (no Cognito).

import crypto from 'crypto';

const COOKIE_NAME = 'aegis_gate';

function allowedEmails() {
  return String(process.env.LOGIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function accessCode() {
  return String(process.env.LOGIN_ACCESS_CODE || '');
}

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.LOGIN_ACCESS_CODE || '';
}

function isLoginConfigured() {
  return Boolean(accessCode() && allowedEmails().length && sessionSecret());
}

function timingSafeEqualStr(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    const dummy = Buffer.alloc(left.length);
    try {
      crypto.timingSafeEqual(left, dummy);
    } catch (_) {
      /* length mismatch is a failed compare */
    }
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function emailAllowed(email) {
  return allowedEmails().includes(email);
}

export function signGateToken(sessionId, email) {
  const secret = sessionSecret();
  const payload = `${sessionId}|${String(email).toLowerCase()}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}|${sig}`;
}

export function verifyGateToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('|');
  if (parts.length !== 3) return null;
  const [sessionId, email, sig] = parts;
  const expected = signGateToken(sessionId, email);
  if (!timingSafeEqualStr(expected, `${sessionId}|${email}|${sig}`)) return null;
  if (!emailAllowed(email)) return null;
  return { sessionId, email };
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  String(header).split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

export function getGateSession(req) {
  const cookies = parseCookies(req);
  return verifyGateToken(cookies[COOKIE_NAME]);
}

export function requireGateIfConfigured(req, res, next) {
  if (!isLoginConfigured()) return next();
  if (getGateSession(req)) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return `HttpOnly; Path=/; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${7 * 24 * 60 * 60}`;
}

export default async function loginHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!isLoginConfigured()) {
    return res.status(503).json({
      error: 'Login is not configured on the server.',
      hint: 'Set LOGIN_ALLOWED_EMAILS and LOGIN_ACCESS_CODE in the environment. SESSION_SECRET is recommended.'
    });
  }

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const secret = String(body.secret || '').trim();
  const sessionId = String(body.sessionId || '').trim();

  if (!email || !secret) {
    return res.status(400).json({ error: 'Email and secret code are required.' });
  }

  if (!emailAllowed(email) || !timingSafeEqualStr(secret, accessCode())) {
    return res.status(401).json({ error: 'Email ID not authorized or secret code is incorrect.' });
  }

  const id = sessionId && /^AEGIS-[A-F0-9]{4}-[A-F0-9]{4}$/.test(sessionId)
    ? sessionId
    : `AEGIS-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const token = signGateToken(id, email);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieOptions()}`);
  return res.status(200).json({ ok: true, sessionId: id, email });
}
