#!/usr/bin/env node
/**
 * Auth + World Clock checks. Database tests run only when DATABASE_URL is set.
 */
import 'dotenv/config';
import assert from 'assert';
import {
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
  createUser,
  findUserByEmail,
  verifyPassword
} from '../db/users.js';
import { createSession, getSessionByToken, revokeSession } from '../db/sessions.js';
import { isDatabaseConfigured, pingDatabase, closePool } from '../db/pool.js';

function section(name) {
  console.log('\n== ' + name + ' ==');
}

section('validation');
assert.equal(normalizeEmail('  A@B.COM '), 'a@b.com');
assert.equal(validateEmail('not-an-email').ok, false);
assert.equal(validateEmail('user@example.com').ok, true);
assert.equal(validatePassword('short').ok, false);
assert.equal(validatePassword('long-enough').ok, true);
assert.equal(validateDisplayName('').ok, false);
assert.equal(validateDisplayName('Monish').ok, true);
console.log('validation ok');

section('world clock IANA / Intl');
const zones = [
  'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney'
];
const now = new Date();
for (const tz of zones) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const text = fmt.format(now);
  assert.ok(/\d/.test(text), tz + ' produced ' + text);
  const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset', hour: '2-digit' });
  const offset = offsetFmt.formatToParts(now).find((p) => p.type === 'timeZoneName');
  assert.ok(offset && offset.value, tz + ' offset');
}
console.log('intl zones ok');

section('database');
if (!isDatabaseConfigured()) {
  console.log('DATABASE_URL unset — skipping live signup/login (expected for website-only local runs).');
} else {
  const ping = await pingDatabase();
  if (!ping.ok) {
    console.log('database unavailable — skipping live signup/login.');
  } else {
    const stamp = Date.now();
    const email = `spec4.${stamp}@example.com`;
    const created = await createUser({ displayName: 'Spec Four', email, password: 'correct-horse' });
    assert.equal(created.ok, true, created.error);
    const dup = await createUser({ displayName: 'Spec Four', email, password: 'correct-horse' });
    assert.equal(dup.ok, false);
    assert.equal(dup.code, 'email_taken');
    const user = await findUserByEmail(email);
    assert.ok(user);
    assert.equal(await verifyPassword(user, 'correct-horse'), true);
    assert.equal(await verifyPassword(user, 'wrong-password'), false);
    assert.ok(!('password' in (created.user || {})));
    const session = await createSession(user.id, 'test-agent');
    const loaded = await getSessionByToken(session.token);
    assert.ok(loaded && loaded.user.email === email);
    await revokeSession(session.token);
    const after = await getSessionByToken(session.token);
    assert.equal(after, null);
    console.log('signup/login/duplicate/session ok');
  }
}

await closePool();
console.log('\nAll executed checks passed.');
