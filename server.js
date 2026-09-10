import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';
import newsHandler from './api/news.js';
import gnewsHandler from './api/gnews.js';
import musicHandler from './api/music.js';
import mailHandler from './api/mail.js';
import loginHandler, { requireGateIfConfigured } from './api/login.js';
import { applyCors, handlePreflight } from './api/cors.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);

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

const chatHits = new Map();
function rateLimitChat(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 20;
  const entry = chatHits.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  chatHits.set(ip, entry);
  if (entry.count > max) {
    return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
  }
  return next();
}

function corsFor(methods) {
  return (req, res, next) => {
    applyCors(req, res, methods);
    next();
  };
}

app.options('/api/login', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/login', corsFor('POST, OPTIONS'), wrap(loginHandler));

app.options('/api/chat', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/chat', corsFor('POST, OPTIONS'), requireGateIfConfigured, rateLimitChat, wrap(chatHandler));

app.options('/api/news', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/news', corsFor('POST, OPTIONS'), requireGateIfConfigured, wrap(newsHandler));

app.options('/api/gnews', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/gnews', corsFor('POST, OPTIONS'), requireGateIfConfigured, wrap(gnewsHandler));

app.options('/api/music', (req, res) => handlePreflight(req, res, 'POST, OPTIONS'));
app.post('/api/music', corsFor('POST, OPTIONS'), requireGateIfConfigured, wrap(musicHandler));

app.options('/api/mail/*', (req, res) => handlePreflight(req, res, 'GET, POST, OPTIONS'));
app.all('/api/mail/*', corsFor('GET, POST, OPTIONS'), requireGateIfConfigured, wrap(mailHandler));

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
    message: 'Music API endpoint is available',
    apiKey: process.env.YOUTUBE_API_KEY ? 'Set' : 'Missing'
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
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

app.get('*', (req, res) => {
  if (req.path.endsWith('.html')) {
    const target = path.join(__dirname, path.basename(req.path));
    return res.sendFile(target, (err) => {
      if (err) res.status(404).send('Not found');
    });
  }
  res.sendFile(path.join(__dirname, 'welcome.html'));
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

function tryListen(port) {
  const server = app.listen(port, () => {
    console.log(`AegisDesk server running on port ${port}`);
    console.log(`Open: http://localhost:${port}/login.html`);
    if (isProd && (!process.env.LOGIN_ACCESS_CODE || !process.env.LOGIN_ALLOWED_EMAILS)) {
      console.warn('Production login gate is not configured (LOGIN_ACCESS_CODE / LOGIN_ALLOWED_EMAILS).');
    }
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
tryListen(PORT);
