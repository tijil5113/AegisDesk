import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';
import newsHandler from './api/news.js';
import gnewsHandler from './api/gnews.js';
import musicHandler from './api/music.js';

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

// Static files
app.use(express.static(__dirname));

// Fallback to index.html or ai-chat.html if direct navigation
app.get('*', (req, res) => {
  const target = req.path.endsWith('.html') ? req.path : '/index.html';
  res.sendFile(path.join(__dirname, target));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AegisDesk server running on port ${PORT}`);
});
