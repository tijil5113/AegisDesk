// OpenAI API proxy — OPENAI_API_KEY is read server-side only.

import { applyCors } from './cors.js';

const ALLOWED_MODELS = new Set(['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o']);
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 8000;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const sliced = messages.slice(0, MAX_MESSAGES);
  return sliced.map((m) => {
    const role = ALLOWED_ROLES.has(m?.role) ? m.role : 'user';
    if (typeof m?.content === 'string') {
      return { role, content: m.content.slice(0, MAX_CONTENT_CHARS) };
    }
    if (Array.isArray(m?.content)) {
      return { role, content: m.content.slice(0, 4) };
    }
    return { role, content: String(m?.content || '').slice(0, MAX_CONTENT_CHARS) };
  });
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const sanitized = sanitizeMessages(req.body?.messages);
  if (!sanitized || sanitized.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API;

  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(503).json({
      error: 'API is not configured',
      code: 'not_configured'
    });
  }

  const { model: clientModel, max_tokens: clientMaxTokens } = req.body || {};

  try {
    const limitedMessages = sanitized.length > 5
      ? [sanitized[0], ...sanitized.slice(-4)]
      : sanitized;

    const hasVision = limitedMessages.some((m) => {
      const c = m.content;
      return Array.isArray(c) && c.some((p) => p && (p.type === 'image_url' || p.image_url));
    });
    const requestedModel = typeof clientModel === 'string' ? clientModel : '';
    const model = hasVision
      ? 'gpt-4o-mini'
      : (ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gpt-3.5-turbo');
    const parsedMax = Number(clientMaxTokens);
    const maxTokens = Math.min(Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 500, 800);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: limitedMessages,
        max_tokens: maxTokens,
        temperature: 0.5,
        top_p: 0.8,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('OpenAI API error status:', response.status);
      const code = data?.error?.code || '';
      if (response.status === 401 || code === 'invalid_api_key') {
        return res.status(503).json({ error: 'API is not configured', code: 'invalid_key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Quota reached', code: 'quota_exceeded' });
      }
      return res.status(502).json({ error: 'Service temporarily unavailable', code: 'provider_error' });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error('OpenAI API error:', error?.name || 'request_failed');
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Service temporarily unavailable', code: 'timeout' });
    }
    return res.status(502).json({
      error: 'Network error',
      code: 'network_error'
    });
  }
}
