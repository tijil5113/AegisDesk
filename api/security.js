/**
 * Shared rate limiting, CSRF origin checks, and security headers.
 */
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 20, key = 'global' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const id = `${key}:${ip}`;
    const now = Date.now();
    const entry = buckets.get(id) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    buckets.set(id, entry);
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (now - v.start > windowMs * 2) buckets.delete(k);
      }
    }
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests. Try again shortly.', code: 'rate_limited' });
    }
    return next();
  };
}

export function expectedOrigins(req) {
  const extra = String(process.env.ALLOWED_ORIGIN || '').trim();
  const host = req.get?.('host') || req.headers?.host;
  const proto = (req.secure || req.headers?.['x-forwarded-proto'] === 'https') ? 'https' : 'http';
  const list = [];
  if (host) list.push(`${proto}://${host}`);
  if (extra) list.push(extra.replace(/\/$/, ''));
  return list;
}

export function originAllowed(req) {
  const origin = req.headers?.origin;
  if (!origin) {
    const referer = req.headers?.referer;
    if (!referer) return true;
    try {
      const refOrigin = new URL(referer).origin;
      return expectedOrigins(req).includes(refOrigin);
    } catch (_) {
      return false;
    }
  }
  return expectedOrigins(req).includes(origin);
}

export function requireSameOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (!originAllowed(req)) {
    return res.status(403).json({ error: 'Invalid request origin.', code: 'csrf_rejected' });
  }
  return next();
}

export function applySecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  // CSP: allow required product sources. unsafe-inline is required for existing
  // inline boot/theme scripts and app markup. YouTube embeds are used by Music.
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.youtube.com https://www.youtube-nocookie.com",
    "connect-src 'self' https://api.open-meteo.com https://cdn.jsdelivr.net",
    "media-src 'self' blob: https:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.google.com https://maps.google.com"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
}

export function envReport() {
  const requiredCore = [];
  const optionalAuth = ['DATABASE_URL', 'SESSION_SECRET', 'LOGIN_ALLOWED_EMAILS', 'LOGIN_ACCESS_CODE'];
  const optionalProviders = [
    'OPENAI_API_KEY', 'OPEN_API', 'NEWS_API_KEY', 'GNEWS_API_KEY',
    'YOUTUBE_API_KEY', 'RESEND_API_KEY', 'MAIL_FROM'
  ];
  const present = (name) => Boolean(String(process.env[name] || '').trim());
  return {
    coreMissing: requiredCore.filter((n) => !present(n)),
    auth: {
      database: present('DATABASE_URL'),
      sessionSecret: present('SESSION_SECRET'),
      loginAllowlist: present('LOGIN_ALLOWED_EMAILS'),
      loginAccessCode: present('LOGIN_ACCESS_CODE')
    },
    providers: Object.fromEntries(optionalProviders.map((n) => [n, present(n)]))
  };
}
