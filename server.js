import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';
import newsHandler from './api/news.js';
import gnewsHandler from './api/gnews.js';
import musicHandler from './api/music.js';
import mailHandler from './api/mail.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: '2mb' }));

// API routes
app.options('/api/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res.status(200).end();
});

app.post('/api/chat', (req, res) => chatHandler(req, res));

app.options('/api/news', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res.status(200).end();
});

app.post('/api/news', (req, res) => newsHandler(req, res));

app.options('/api/gnews', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res.status(200).end();
});

app.post('/api/gnews', (req, res) => gnewsHandler(req, res));

app.options('/api/music', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res.status(200).end();
});

app.post('/api/music', (req, res) => musicHandler(req, res));

// Mail API routes
app.options('/api/mail/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Account-Id');
  return res.status(200).end();
});

app.all('/api/mail/*', (req, res) => mailHandler(req, res));

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Test music API endpoint
app.get('/api/music/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Music API endpoint is available',
    apiKey: process.env.YOUTUBE_API_KEY ? 'Set' : 'Missing (using fallback)'
  });
});

// Root route - serve welcome.html first (before static files)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'welcome.html'));
});

// Static files
app.use(express.static(__dirname));

// Fallback to welcome.html for any other routes that don't match static files
app.get('*', (req, res) => {
  // If it's already an HTML file request, serve it
  if (req.path.endsWith('.html')) {
    res.sendFile(path.join(__dirname, req.path));
  } else {
    // Otherwise, redirect to welcome.html
    res.sendFile(path.join(__dirname, 'welcome.html'));
  }
});

const PORT = Number(process.env.PORT) || 3000;

function tryListen(port) {
  const server = app.listen(port, () => {
    console.log(`AegisDesk server running on port ${port}`);
    console.log(`Open: http://localhost:${port}/desktop.html`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1);
    } else {
      throw err;
    }
  });
}
tryListen(PORT);
