// GNews API proxy — GNEWS_API_KEY is read server-side only.

import { applyCors } from './cors.js';

const ALLOWED_MODES = new Set(['top', 'category', 'search']);
const ALLOWED_TOPICS = new Set(['world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health']);
const ALLOWED_LANGS = new Set(['en', 'hi', 'ta']);

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    console.error('[GNews] GNEWS_API_KEY is not set');
    return res.status(503).json({
      status: 'error',
      code: 'not_configured',
      error: 'API is not configured',
      message: 'API is not configured'
    });
  }

  try {
    const body = req.body || {};
    const mode = String(body.mode || 'top');
    const topicRaw = body.topic ? String(body.topic).toLowerCase() : '';
    const q = typeof body.q === 'string' ? body.q.trim().slice(0, 200) : '';
    const lang = ALLOWED_LANGS.has(String(body.lang || '').toLowerCase())
      ? String(body.lang).toLowerCase()
      : 'en';
    const country = /^[A-Za-z]{2}$/.test(String(body.country || ''))
      ? String(body.country).toLowerCase()
      : 'in';
    const max = Math.min(Math.max(Number(body.max) || 20, 1), 20);
    const page = Math.max(Number(body.page) || 1, 1);

    if (!ALLOWED_MODES.has(mode)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid mode. Use "top", "category", or "search"'
      });
    }

    if (mode === 'search' && !q) {
      return res.status(400).json({
        status: 'error',
        error: 'Search query (q) is required when mode is "search"'
      });
    }

    if (mode === 'category' && topicRaw && !ALLOWED_TOPICS.has(topicRaw)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid category'
      });
    }

    const params = new URLSearchParams({
      token: apiKey,
      lang,
      country,
      max: String(max)
    });

    let apiUrl = 'https://gnews.io/api/v4/top-headlines';
    if (mode === 'search') {
      apiUrl = 'https://gnews.io/api/v4/search';
      params.set('q', q);
    } else if (topicRaw && ALLOWED_TOPICS.has(topicRaw)) {
      params.set('topic', topicRaw);
    }

    console.log('[GNews] Fetching', { mode, lang, country, max, page, topic: topicRaw || undefined });

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AegisDesk-NewsHub/1.0',
        Accept: 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[GNews] Provider status:', response.status);
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({
          status: 'error',
          code: 'invalid_key',
          error: 'API is not configured',
          message: 'API is not configured'
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          status: 'error',
          code: 'quota_exceeded',
          error: 'Quota reached',
          message: 'Quota reached'
        });
      }
      return res.status(502).json({
        status: 'error',
        code: 'provider_error',
        error: 'Service temporarily unavailable',
        message: 'Service temporarily unavailable'
      });
    }

    const normalizedResponse = {
      status: 'ok',
      totalArticles: data.totalArticles || (data.articles?.length || 0),
      articles: (data.articles || []).map((article) => ({
        title: article.title || '',
        description: article.description || '',
        content: article.content || article.description || '',
        url: article.url || '',
        image: article.image || '',
        urlToImage: article.image || '',
        publishedAt: article.publishedAt || article.pubDate || '',
        source: {
          name: article.source?.name || 'Unknown',
          url: article.source?.url || ''
        }
      }))
    };

    return res.json(normalizedResponse);
  } catch (error) {
    console.error('[GNews] Server error:', error?.name || 'request_failed');
    return res.status(502).json({
      status: 'error',
      code: 'network_error',
      error: 'Network error',
      message: 'Network error'
    });
  }
}
