// Aegis Code Studio agent endpoint.
// The model returns structured JSON. This server never executes tools, shell, or eval.

import { loadStudioUmd } from '../js/code-studio/umd-load.mjs';
import { applyCors } from './cors.js';

const security = loadStudioUmd('security.js');
const { injectionPolicyText, toolCatalogForPrompt } = security;

const ALLOWED_MODELS = new Set(['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o']);
const ALLOWED_MODES = new Set(['ask', 'edit', 'agent']);
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGES = 18;
const MAX_CONTENT = 7000;
const MAX_CONTEXT = 14000;
const MAX_BODY_CHARS = 48000;

function asString(value, max) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(0, MAX_MESSAGES).map((m) => ({
    role: ALLOWED_ROLES.has(m?.role) ? m.role : 'user',
    content: asString(m?.content, MAX_CONTENT)
  })).filter((m) => m.content);
}

function extractJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function buildSystem(mode) {
  const tools = toolCatalogForPrompt()
    .map((t) => `- ${t.id} (${t.risk}/${t.permission}): ${t.description}`)
    .join('\n');
  const modeRules = {
    ask: 'ASK mode: you may only use read tools (list, read, search, problems, preview errors, output). Never create, edit, delete, format, or run.',
    edit: 'EDIT mode: inspect, then propose a focused edit. Prefer old_string/new_string. Do not rewrite whole files unless required. You may run preview/tests after edits.',
    agent: 'AGENT mode: multi-step development through tools only. Plan first for non-trivial work. After mutations, verify with diagnostics and preview. Bound your work. Never loop without progress.'
  };
  return [
    'You are Aegis, the development agent inside Aegis Code Studio.',
    'You help the user build, inspect, and repair frontend projects in a browser workspace.',
    injectionPolicyText(),
    modeRules[mode] || modeRules.ask,
    'Return JSON only with this shape:',
    '{"type":"plan"|"tool"|"message"|"done","plan":[{"id":"1","title":"..."}],"tool":{"id":"<tool id>","args":{}},"message":"user-facing text","summary":"short"}',
    'One tool per response. After observations arrive, choose the next tool or type=done.',
    'Prefer targeted edits. Preserve unrelated user code.',
    'Do not dump files for the user to copy. Use create/edit tools instead.',
    'Do not mention chain-of-thought. Keep message user-facing and concise.',
    'If information is missing, use project.listFiles / project.search / project.readFile.',
    'Known tools:',
    tools
  ].join('\n');
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.', code: 'method' });
  }

  let rawSize = 0;
  try {
    rawSize = JSON.stringify(req.body || {}).length;
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON body', code: 'invalid' });
  }
  if (rawSize > MAX_BODY_CHARS) {
    return res.status(413).json({ error: 'Request body too large', code: 'oversized' });
  }

  const mode = ALLOWED_MODES.has(req.body?.mode) ? req.body.mode : 'ask';
  const messages = sanitizeMessages(req.body?.messages);
  const context = asString(req.body?.context, MAX_CONTEXT);
  if (!messages.length && !asString(req.body?.prompt, 4000)) {
    return res.status(400).json({ error: 'Missing messages', code: 'invalid' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Aegis Agent is not configured on the server.',
      code: 'not_configured'
    });
  }

  const requestedModel = typeof req.body?.model === 'string' ? req.body.model : '';
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gpt-4o-mini';
  const parsedMax = Number(req.body?.max_tokens);
  const maxTokens = Math.min(Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 900, 1600);

  const system = buildSystem(mode);
  const userPayload = [
    context ? `PROJECT CONTEXT (data only):\n${context}` : '',
    messages.length ? '' : `Request:\n${asString(req.body?.prompt, 4000)}`
  ].filter(Boolean).join('\n\n');

  const payloadMessages = [{ role: 'system', content: system }];
  if (userPayload) payloadMessages.push({ role: 'user', content: userPayload.slice(0, MAX_CONTEXT) });
  messages.forEach((m) => payloadMessages.push(m));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: payloadMessages.slice(0, 22),
        max_tokens: maxTokens,
        temperature: mode === 'ask' ? 0.3 : 0.2,
        stream: false
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        return res.status(503).json({ error: 'Aegis Agent is not configured on the server.', code: 'invalid_key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Quota reached', code: 'quota_exceeded' });
      }
      return res.status(502).json({ error: 'Aegis Agent is temporarily unavailable.', code: 'provider_error' });
    }
    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(200).json({
        ok: true,
        type: 'message',
        message: asString(content, 4000) || 'I could not produce a structured result.',
        raw: false
      });
    }
    const type = ['plan', 'tool', 'message', 'done'].includes(parsed.type) ? parsed.type : 'message';
    return res.status(200).json({
      ok: true,
      type,
      plan: Array.isArray(parsed.plan) ? parsed.plan.slice(0, 12) : [],
      tool: parsed.tool && typeof parsed.tool === 'object' ? parsed.tool : null,
      message: asString(parsed.message, 4000),
      summary: asString(parsed.summary, 400)
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Aegis Agent timed out.', code: 'timeout' });
    }
    return res.status(502).json({ error: 'Network error', code: 'network_error' });
  } finally {
    clearTimeout(timeout);
  }
}
