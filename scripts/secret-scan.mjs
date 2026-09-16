#!/usr/bin/env node
/**
 * Scan the repository for likely secret assignments without printing values.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKIP = new Set(['node_modules', '.git', 'dist', 'vendor']);
const NAME_RE = /(OPENAI_API_KEY|RESEND_API_KEY|YOUTUBE_API_KEY|NEWS_API_KEY|GNEWS_API_KEY|SESSION_SECRET|LOGIN_ACCESS_CODE|DATABASE_URL|GMAIL_CLIENT_SECRET|OUTLOOK_CLIENT_SECRET|PRIVATE_KEY|BEGIN RSA|BEGIN OPENSSH)/i;
const ASSIGN_RE = /(OPENAI_API_KEY|RESEND_API_KEY|YOUTUBE_API_KEY|NEWS_API_KEY|GNEWS_API_KEY|SESSION_SECRET|LOGIN_ACCESS_CODE|DATABASE_URL|GMAIL_CLIENT_SECRET|OUTLOOK_CLIENT_SECRET)\s*[=:]\s*['"]?([^'"\s]+)/i;

const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs|html|json|md|env|yml|yaml|txt)$/i.test(entry.name) || entry.name === '.env.example') {
      scan(full);
    }
  }
}

function scan(file) {
  const rel = path.relative(ROOT, file);
    if (rel === '.env.example' || rel.endsWith('secret-scan.mjs') || rel === '.env' || /(^|\/)\.env(\.|$)/.test(rel)) return;
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return; }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!NAME_RE.test(line)) return;
    const assign = line.match(ASSIGN_RE);
    if (!assign) return;
    const value = assign[2] || '';
    const placeholder = /replace-with|example|your-|changeme|postgres:\/\/USER/i.test(value) || value.length < 8;
    if (placeholder) return;
    if (/^process\.env/.test(value) || value.includes('process.env')) return;
    hits.push({ file: rel, line: i + 1, name: assign[1] });
  });
}

walk(ROOT);
if (hits.length) {
  console.error('Potential secret assignments (names only):');
  hits.forEach((h) => console.error(`  ${h.file}:${h.line} ${h.name}`));
  process.exit(1);
}
console.log('Secret scan: no hardcoded credential assignments found.');
