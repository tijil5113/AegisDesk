// NewsAPI.org proxy — NEWS_API_KEY is read server-side only.
// Role: fallback / alternate source. Canonical News page uses GNews first.

import { applyCors } from './cors.js';

const ALLOWED_MODES = new Set(['top', 'everything']);
const ALLOWED_LANGS = new Set(['en', 'hi', 'ta', 'ar', 'de', 'es', 'fr', 'he', 'it', 'nl', 'no', 'pt', 'ru', 'sv', 'ud', 'zh']);
const ALLOWED_CATEGORIES = new Set(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']);
const ALLOWED_SORT = new Set(['publishedAt', 'relevancy', 'popularity']);

function normalizeArticles(articles) {
  return (articles || []).map((article) => ({
    title: article.title || '',
    description: article.description || '',
    content: article.content || article.description || '',
    url: article.url || '',
    urlToImage: article.urlToImage || article.image || '',
    image: article.urlToImage || article.image || '',
    publishedAt: article.publishedAt || '',
    source: {
      name: article.source?.name || 'Unknown',
      id: article.source?.id || ''
    }
  }));
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    console.error('NEWS_API_KEY is not set');
    return res.status(503).json({
      error: 'API is not configured',
      code: 'not_configured'
    });
  }

  try {
    const body = req.body || {};
    const mode = String(body.mode || 'top');
    const country = /^[A-Za-z]{2}$/.test(String(body.country || ''))
      ? String(body.country).toLowerCase()
      : 'in';
    const categoryRaw = body.category ? String(body.category).toLowerCase() : '';
    const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : '';
    const q = typeof body.q === 'string' ? body.q.trim().slice(0, 200) : '';
    const sources = typeof body.sources === 'string' ? body.sources.slice(0, 200) : '';
    const language = ALLOWED_LANGS.has(String(body.language || '').toLowerCase())
      ? String(body.language).toLowerCase()
      : 'en';
    const page = Math.max(Number(body.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(body.pageSize) || 24, 1), 100);
    const sortBy = ALLOWED_SORT.has(String(body.sortBy || '')) ? String(body.sortBy) : 'publishedAt';

    if (!ALLOWED_MODES.has(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "top" or "everything"' });
    }

    const params = new URLSearchParams({
      apiKey,
      language,
      page: String(page),
      pageSize: String(pageSize)
    });

    let apiUrl = '';
    if (mode === 'top') {
      apiUrl = 'https://newsapi.org/v2/top-headlines';
      if (country) params.set('country', country);
      if (category) params.set('category', category);
      if (sources) params.set('sources', sources);
    } else {
      apiUrl = 'https://newsapi.org/v2/everything';
      if (q) params.set('q', q);
      else if (category) params.set('q', category);
      else params.set('q', 'news');
      if (sources) params.set('sources', sources);
      params.set('sortBy', sortBy);
    }

    console.log('[NewsAPI] Fetching', { mode, language, page, pageSize, category: category || undefined });

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AegisDesk-NewsHub/1.0',
        Accept: 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[NewsAPI] Provider status:', response.status);
      if (response.status === 401) {
        return res.status(503).json({ error: 'API is not configured', code: 'invalid_key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Quota reached', code: 'quota_exceeded' });
      }
      return res.status(502).json({ error: 'Service temporarily unavailable', code: 'provider_error' });
    }

    let articles = data.articles || [];
    let totalResults = data.totalResults || 0;

    if (mode === 'top' && articles.length === 0 && country === 'in') {
      const fallbackParams = new URLSearchParams({
        apiKey,
        language: 'en',
        page: String(page),
        pageSize: String(pageSize),
        sortBy: 'publishedAt',
        q: category ? `india ${category}` : 'india'
      });
      try {
        const fallbackResponse = await fetch(`https://newsapi.org/v2/everything?${fallbackParams.toString()}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'AegisDesk-NewsHub/1.0',
            Accept: 'application/json'
          }
        });
        const fallbackData = await fallbackResponse.json().catch(() => ({}));
        if (fallbackData.articles && fallbackData.articles.length > 0) {
          articles = fallbackData.articles;
          totalResults = fallbackData.totalResults || 0;
        }
      } catch (_) {
        /* keep original empty result */
      }
    }

    const normalized = normalizeArticles(articles);
    return res.status(200).json({
      status: data.status || 'ok',
      totalResults: totalResults || 0,
      articles: normalized,
      page,
      pageSize,
      totalPages: totalResults > 0 ? Math.ceil(totalResults / pageSize) : 0
    });
  } catch (error) {
    console.error('NewsAPI proxy error:', error?.name || 'request_failed');
    return res.status(502).json({
      error: 'Network error',
      code: 'network_error'
    });
  }
}
