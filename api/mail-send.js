// AegisDesk outbound mail via Resend. API keys stay on the server.

import crypto from 'crypto';
import { Resend } from 'resend';
import { getGateSession, isLoginConfigured } from './login.js';
import { buildWelcomeEmail, DEFAULT_FOUNDER_NAME } from '../mail/templates/welcome-email.js';

const MAX_BODY_BYTES = 48 * 1024;
const MAX_SUBJECT = 200;
const MAX_TEXT = 20000;
const MAX_HTML = 40000;
const MAX_NAME = 80;
const MAX_RECIPIENTS_TOTAL = 15;
const MAX_LIST = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const FINGERPRINT_TTL_MS = 90 * 1000;
const PROVIDER_TIMEOUT_MS = 15000;
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

const rateBuckets = new Map();
const inflightKeys = new Set();
const recentFingerprints = new Map();
const welcomeSent = new Map();

let resendClient = null;

function fail(res, status, code, error) {
  return res.status(status).json({ ok: false, code, error });
}

function ok(res, extra = {}) {
  return res.status(200).json({ ok: true, status: 'sent', ...extra });
}

function hasHeaderInjection(value) {
  return /[\r\n]/.test(String(value || ''));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254) return false;
  if (hasHeaderInjection(email)) return false;
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) return false;
  return EMAIL_RE.test(email);
}

function parseAddressList(input, { field, max }) {
  if (input == null || input === '') return [];
  let list;
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    list = input.split(/[;,]/);
  } else {
    const err = new Error(`${field} must be a string or array of addresses`);
    err.code = 'invalid_request';
    throw err;
  }
  const out = [];
  for (const item of list) {
    const email = normalizeEmail(item);
    if (!email) continue;
    if (!isValidEmail(email)) {
      const err = new Error(`Invalid ${field} address`);
      err.code = 'invalid_request';
      throw err;
    }
    if (!out.includes(email)) out.push(email);
  }
  if (out.length > max) {
    const err = new Error(`Too many ${field} recipients`);
    err.code = 'invalid_request';
    throw err;
  }
  return out;
}

function estimateBodyBytes(body) {
  try {
    return Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
  } catch {
    return MAX_BODY_BYTES + 1;
  }
}

function stripDangerousHtml(html) {
  let out = String(html || '');
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<(iframe|object|embed|form|input|button|textarea|link|meta|base)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<(iframe|object|embed|form|input|button|link|meta|base)[^>]*>/gi, '');
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '$1=$2#$2');
  return out.slice(0, MAX_HTML);
}

function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px 0;">${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return paragraphs || '<p></p>';
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getMailFrom() {
  return String(process.env.MAIL_FROM || '').trim();
}

function getReplyToDefault() {
  const value = String(process.env.MAIL_REPLY_TO || '').trim();
  return value && isValidEmail(value) ? normalizeEmail(value) : '';
}

function getFounderName() {
  const value = String(process.env.MAIL_FOUNDER_NAME || '').replace(/\s+/g, ' ').trim();
  return value ? value.slice(0, MAX_NAME) : DEFAULT_FOUNDER_NAME;
}

export function resolveAppUrl() {
  const raw = String(process.env.MAIL_APP_URL || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const local = host === 'localhost' || host === '127.0.0.1';
    if (url.protocol === 'https:') return url.toString().replace(/\/$/, '');
    if (url.protocol === 'http:' && local) return url.toString().replace(/\/$/, '');
    return null;
  } catch {
    return null;
  }
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

function rateKey(req, session) {
  if (session?.email) return `user:${session.email}`;
  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateBuckets.get(key) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateBuckets.set(key, entry);
  if (entry.count > RATE_MAX) {
    const err = new Error('Too many emails. Please wait before sending again.');
    err.code = 'rate_limited';
    err.status = 429;
    throw err;
  }
}

function pruneMaps() {
  const now = Date.now();
  for (const [key, value] of recentFingerprints) {
    if (now - value.at > FINGERPRINT_TTL_MS) recentFingerprints.delete(key);
  }
}

function fingerprint(session, payload) {
  const id = session?.email || session?.sessionId || 'anon';
  return crypto
    .createHash('sha256')
    .update(`${id}|${payload.to.join(',')}|${payload.cc.join(',')}|${payload.bcc.join(',')}|${payload.subject}|${payload.text}`)
    .digest('hex');
}

function welcomeIdempotencyKey(email) {
  const hash = crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 32);
  return `aegisdesk-welcome-${hash}`;
}

function parseIdempotencyKey(req) {
  const header = req.headers?.['idempotency-key'] || req.body?.idempotencyKey;
  if (header == null || header === '') return '';
  const key = String(header).trim();
  if (!/^[A-Za-z0-9._:\-]{8,64}$/.test(key)) return '';
  return key;
}

function assertConfigured() {
  if (!process.env.RESEND_API_KEY) {
    const err = new Error('Outbound mail is not configured.');
    err.code = 'not_configured';
    err.status = 503;
    throw err;
  }
  if (!getMailFrom()) {
    const err = new Error('Sender identity is not configured. Set MAIL_FROM.');
    err.code = 'not_configured';
    err.status = 503;
    throw err;
  }
}

function mapProviderError(error) {
  const message = String(error?.message || '');
  const status = Number(error?.statusCode || error?.status || 0);
  if (error?.name === 'AbortError' || /timeout/i.test(message)) {
    return { status: 504, code: 'send_failed', error: 'The mail provider timed out. The message may not have been sent.' };
  }
  if (status === 401 || status === 403 || /invalid api key|unauthorized/i.test(message)) {
    return { status: 502, code: 'provider_error', error: 'The mail provider rejected the request.' };
  }
  if (/domain|not verified|from address|invalid `from`/i.test(message)) {
    return { status: 502, code: 'send_failed', error: 'Sender domain is not verified for outbound mail.' };
  }
  return { status: 502, code: 'provider_error', error: 'The mail provider could not send this message.' };
}

async function sendWithResend({ to, cc, bcc, subject, html, text, replyTo, idempotencyKey }) {
  const client = getResend();
  if (!client) {
    const err = new Error('Outbound mail is not configured.');
    err.code = 'not_configured';
    err.status = 503;
    throw err;
  }

  const payload = {
    from: getMailFrom(),
    to,
    subject,
    html,
    text
  };
  if (cc.length) payload.cc = cc;
  if (bcc.length) payload.bcc = bcc;
  if (replyTo) payload.replyTo = replyTo;

  // Attachments can be added here later as payload.attachments.
  // This phase does not accept or transmit client attachments.

  const options = idempotencyKey ? { idempotencyKey } : undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const sendPromise = options
      ? client.emails.send(payload, options)
      : client.emails.send(payload);
    const raced = Promise.race([
      sendPromise,
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const err = new Error('timeout');
          err.code = 'send_failed';
          reject(err);
        });
      })
    ]);
    const result = await raced;
    if (result?.error) {
      const mapped = mapProviderError(result.error);
      const err = new Error(mapped.error);
      err.code = mapped.code;
      err.status = mapped.status;
      throw err;
    }
    const id = result?.data?.id || result?.id;
    if (!id) {
      const err = new Error('The mail provider returned an unexpected response.');
      err.code = 'provider_error';
      err.status = 502;
      throw err;
    }
    return { id };
  } finally {
    clearTimeout(timer);
  }
}

function getSession(req) {
  return req.gateSession || getGateSession(req) || null;
}

function validateSendBody(body) {
  if (estimateBodyBytes(body) > MAX_BODY_BYTES) {
    const err = new Error('Request is too large.');
    err.code = 'invalid_request';
    err.status = 413;
    throw err;
  }

  if (body?.from != null || body?.sender != null) {
    const err = new Error('Sender identity cannot be set by the client.');
    err.code = 'invalid_request';
    throw err;
  }

  if (body?.attachments != null && !(Array.isArray(body.attachments) && body.attachments.length === 0)) {
    const err = new Error('Attachments are not available yet.');
    err.code = 'invalid_request';
    throw err;
  }

  const to = parseAddressList(body?.to, { field: 'to', max: MAX_LIST });
  const cc = parseAddressList(body?.cc, { field: 'cc', max: MAX_LIST });
  const bcc = parseAddressList(body?.bcc, { field: 'bcc', max: MAX_LIST });
  if (!to.length) {
    const err = new Error('At least one recipient is required.');
    err.code = 'invalid_request';
    throw err;
  }
  if (to.length + cc.length + bcc.length > MAX_RECIPIENTS_TOTAL) {
    const err = new Error('Too many recipients.');
    err.code = 'invalid_request';
    throw err;
  }

  const subject = String(body?.subject || '').trim();
  if (!subject) {
    const err = new Error('A subject is required.');
    err.code = 'invalid_request';
    throw err;
  }
  if (subject.length > MAX_SUBJECT || hasHeaderInjection(subject)) {
    const err = new Error('Invalid subject.');
    err.code = 'invalid_request';
    throw err;
  }

  let text = String(body?.text || body?.body || '').trim();
  let html = body?.html != null ? String(body.html).trim() : '';
  if (html) html = stripDangerousHtml(html);
  if (!text && html) text = htmlToText(html);
  if (!html && text) html = textToHtml(text);
  if (!text && !htmlToText(html)) {
    const err = new Error('A message is required.');
    err.code = 'invalid_request';
    throw err;
  }
  if (text.length > MAX_TEXT) {
    const err = new Error('Message is too long.');
    err.code = 'invalid_request';
    throw err;
  }

  let replyTo = '';
  if (body?.replyTo != null && String(body.replyTo).trim()) {
    if (!isValidEmail(body.replyTo) || hasHeaderInjection(body.replyTo)) {
      const err = new Error('Invalid reply-to address.');
      err.code = 'invalid_request';
      throw err;
    }
    replyTo = normalizeEmail(body.replyTo);
  } else {
    replyTo = getReplyToDefault();
  }

  return { to, cc, bcc, subject, text, html, replyTo };
}

export async function handleResendSend(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'invalid_request', 'Method not allowed. Use POST.');
  }

  if (isLoginConfigured() && !getSession(req)) {
    return fail(res, 401, 'unauthorized', 'Authentication required');
  }

    try {
        const session = getSession(req);
        const payload = validateSendBody(req.body || {});
        assertConfigured();
        const key = rateKey(req, session);
    checkRateLimit(key);
    pruneMaps();

    const fp = fingerprint(session, payload);
    const recent = recentFingerprints.get(fp);
    if (recent) {
      return ok(res, { id: recent.id, status: 'sent', duplicate: true });
    }

    const idempotencyKey = parseIdempotencyKey(req) || `send-${fp.slice(0, 40)}`;
    if (inflightKeys.has(idempotencyKey) || inflightKeys.has(fp)) {
      return fail(res, 429, 'rate_limited', 'This message is already being sent.');
    }

    inflightKeys.add(idempotencyKey);
    inflightKeys.add(fp);
    try {
      const result = await sendWithResend({ ...payload, idempotencyKey });
      recentFingerprints.set(fp, { at: Date.now(), id: result.id });
      console.log('[Mail] Send accepted', { id: result.id, toCount: payload.to.length });
      return ok(res, { id: result.id });
    } finally {
      inflightKeys.delete(idempotencyKey);
      inflightKeys.delete(fp);
    }
  } catch (error) {
    const code = error.code || 'send_failed';
    const status = error.status || (code === 'invalid_request' ? 400 : code === 'not_configured' ? 503 : code === 'rate_limited' ? 429 : 502);
    console.error('[Mail] Send failed', { code, message: error.message });
    return fail(res, status, code, error.message || 'Failed to send email');
  }
}

export async function sendWelcomeForAuthenticatedUser(session, { recipientName } = {}) {
  assertConfigured();
  const email = normalizeEmail(session?.email);
  if (!isValidEmail(email)) {
    const err = new Error('The authenticated session does not include a usable email address.');
    err.code = 'invalid_request';
    throw err;
  }

  const idempotencyKey = welcomeIdempotencyKey(email);
  const existing = welcomeSent.get(idempotencyKey);
  if (existing) {
    return { id: existing.id, duplicate: true };
  }

  if (inflightKeys.has(idempotencyKey)) {
    const err = new Error('A welcome email is already being sent.');
    err.code = 'rate_limited';
    err.status = 429;
    throw err;
  }

  const template = buildWelcomeEmail({
    recipientName: recipientName || email.split('@')[0],
    appUrl: resolveAppUrl(),
    founderName: getFounderName()
  });

  inflightKeys.add(idempotencyKey);
  try {
    const result = await sendWithResend({
      to: [email],
      cc: [],
      bcc: [],
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: getReplyToDefault(),
      idempotencyKey
    });
    welcomeSent.set(idempotencyKey, { id: result.id, at: Date.now() });
    console.log('[Mail] Welcome send accepted', { id: result.id });
    return { id: result.id, duplicate: false };
  } finally {
    inflightKeys.delete(idempotencyKey);
  }
}

export async function handleWelcomeSend(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'invalid_request', 'Method not allowed. Use POST.');
  }

  const session = getSession(req);
  if (!session?.email) {
    return fail(
      res,
      401,
      'unauthorized',
      'Welcome email requires an authenticated session with a known email address.'
    );
  }

  try {
    const name = req.body?.recipientName != null
      ? String(req.body.recipientName).replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
      : '';
    const result = await sendWelcomeForAuthenticatedUser(session, { recipientName: name });
    if (result.duplicate) {
      return res.status(200).json({
        ok: true,
        id: result.id,
        status: 'sent',
        duplicate: true
      });
    }
    return ok(res, { id: result.id });
  } catch (error) {
    const code = error.code || 'send_failed';
    const status = error.status || (code === 'invalid_request' ? 400 : code === 'not_configured' ? 503 : code === 'rate_limited' ? 429 : 502);
    console.error('[Mail] Welcome send failed', { code, message: error.message });
    return fail(res, status, code, error.message || 'Failed to send welcome email');
  }
}
