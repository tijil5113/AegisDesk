import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';
import intentHandler from './api/intent.js';
import newsHandler from './api/news.js';
import gnewsHandler from './api/gnews.js';
import musicHandler from './api/music.js';
import mailHandler from './api/mail.js';
import loginHandler, { isLoginConfigured } from './api/login.js';
import {
  signupHandler,
  accountLoginHandler,
  logoutHandler,
  sessionHandler,
  requireAccountOrGate,
  requireMailAuth
} from './api/accounts.js';
import { applyCors, handlePreflight } from './api/cors.js';
import { applySecurityHeaders, envReport, rateLimit, requireSameOrigin } from './api/security.js';
import { pingDatabase, isDatabaseConfigured } from './db/pool.js';
import { runMigrations } from './db/migrate.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(applySecurityHeaders);
app.use(express.json({ limit: '2mb' }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  return next(err);
});

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('[API]', req.path, error?.message || error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

function corsFor(methods) {
  return (req, res, next) => {
    applyCors(req, res, methods);
    next();
  };
}

const limitLogin = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, key: 'login' });
const limitSignup = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, key: 'signup' });
const limitChat = rateLimit({ windowMs: 60 * 1000, max: 20, key: 'chat' });
const limitMail = rateLimit({ windowMs: 60 * 1000, max: 30, key: 'mail' });
const limitProvider = rateLimit({ windowMs: 60 * 1000, max: 40, key: 'provider' });

app.options('/api/login', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/login', corsFor('POST, OPTIONS'), requireSameOrigin, limitLogin, wrap(loginHandler));

app.options('/api/auth/signup', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/auth/signup', corsFor('POST, OPTIONS'), requireSameOrigin, limitSignup, wrap(signupHandler));

app.options('/api/auth/login', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/auth/login', corsFor('POST, OPTIONS'), requireSameOrigin, limitLogin, wrap(accountLoginHandler));

app.options('/api/auth/logout', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/auth/logout', corsFor('POST, OPTIONS'), requireSameOrigin, wrap(logoutHandler));

app.options('/api/auth/session', (req, res) => handlePreflight(req, res, 'GET, OPTIONS'));
app.get('/api/auth/session', corsFor('GET, OPTIONS'), wrap(sessionHandler));

app.options('/api/chat', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/chat', corsFor('POST, OPTIONS'), requireAccountOrGate, limitChat, wrap(chatHandler));

app.options('/api/intent', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/intent', corsFor('POST, OPTIONS'), requireAccountOrGate, limitChat, wrap(intentHandler));

app.options('/api/news', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/news', corsFor('POST, OPTIONS'), requireAccountOrGate, limitProvider, wrap(newsHandler));

app.options('/api/gnews', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/gnews', corsFor('POST, OPTIONS'), requireAccountOrGate, limitProvider, wrap(gnewsHandler));

app.options('/api/music', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/music', corsFor('POST, OPTIONS'), requireAccountOrGate, limitProvider, wrap(musicHandler));

app.options('/api/mail/*', (req, res) => handlePreflight(req, res, 'GET, POST, OPTIONS'));
app.all('/api/mail/*', corsFor('GET, POST, OPTIONS'), requireMailAuth, limitMail, wrap(mailHandler));

app.get('/health', async (req, res) => {
  const db = await pingDatabase();
  const report = envReport();
  res.status(200).json({
    status: 'ok',
    service: 'ok',
    database: db.configured ? (db.ok ? 'ok' : 'unavailable') : 'unconfigured',
    auth: {
      accounts: report.auth.database,
      gate: isLoginConfigured()
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/music/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Music API endpoint is available'
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname, {
  index: false,
  dotfiles: 'ignore',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

const notFoundPage = path.join(__dirname, '404.html');

app.get('*', (req, res) => {
  if (String(req.path || '').startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.path.endsWith('.html')) {
    const target = path.join(__dirname, path.basename(req.path));
    return res.sendFile(target, (err) => {
      if (err) {
        if (fs.existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
        return res.status(404).send('Not found');
      }
    });
  }
  if (fs.existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[Server]', err?.message || err);
  if (res.headersSent) return next(err);
  const wantsJson = String(req.path || '').startsWith('/api') || String(req.headers.accept || '').includes('application/json');
  if (wantsJson) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).send('Internal server error');
});

const PORT = Number(process.env.PORT) || 3000;

function logStartup() {
  const report = envReport();
  console.log(`AegisDesk server running on port ${PORT}`);
  console.log(`Open: http://localhost:${PORT}/`);
  if (isDatabaseConfigured()) {
    console.log('Database: DATABASE_URL configured');
  } else {
    console.warn('Database: DATABASE_URL is not set. Public site still works; account login/signup will return a structured error.');
  }
  if (isProd && !report.auth.sessionSecret) {
    console.warn('Production SESSION_SECRET is not set. Set it for cookie integrity on the legacy access-code gate.');
  }
  if (isProd && !report.auth.database && !isLoginConfigured()) {
    console.warn('Production has neither DATABASE_URL nor the access-code login gate.');
  }
}

function tryListen(port) {
  const server = app.listen(port, () => {
    logStartup();
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1);
    } else {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  });
}

async function boot() {
  if (isDatabaseConfigured()) {
    try {
      await runMigrations({ keepPool: true });
      console.log('Database: schema is ready');
    } catch (err) {
      console.warn('Database: migrations did not complete. Public site still works; account login/signup may fail until schema is applied.');
      console.warn(err?.message || err);
    }
  }
  tryListen(PORT);
}

boot();
