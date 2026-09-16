/**
 * PostgreSQL pool for AegisDesk.
 * Chosen over Prisma/Drizzle/Knex: this Express app is small, ESM, and
 * needs parameterized SQL without a generate step or extra query DSL.
 */
import pg from 'pg';

const { Pool } = pg;

let pool = null;
let lastError = null;
let status = 'unconfigured';

export function isDatabaseConfigured() {
  return Boolean(String(process.env.DATABASE_URL || '').trim());
}

export function getDatabaseStatus() {
  return {
    configured: isDatabaseConfigured(),
    status,
    error: status === 'unavailable' ? 'unavailable' : null
  };
}

export function getPool() {
  if (!isDatabaseConfigured()) return null;
  if (pool) return pool;

  const connectionString = String(process.env.DATABASE_URL).trim();
  const ssl = /railway|render|amazonaws|neon|supabase/i.test(connectionString)
    || process.env.PGSSL === 'true'
    || process.env.NODE_ENV === 'production';

  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: ssl ? { rejectUnauthorized: false } : undefined
  });

  pool.on('error', (err) => {
    lastError = err?.message || 'pool error';
    status = 'unavailable';
    console.error('[db] pool error:', lastError);
  });

  status = 'ok';
  return pool;
}

export async function query(text, params = []) {
  const active = getPool();
  if (!active) {
    const error = new Error('DATABASE_UNAVAILABLE');
    error.code = 'DATABASE_UNAVAILABLE';
    throw error;
  }
  try {
    const result = await active.query(text, params);
    status = 'ok';
    lastError = null;
    return result;
  } catch (err) {
    if (err.code === 'DATABASE_UNAVAILABLE') throw err;
    status = 'unavailable';
    lastError = 'query failed';
    const safe = new Error('DATABASE_UNAVAILABLE');
    safe.code = 'DATABASE_UNAVAILABLE';
    safe.cause = err;
    throw safe;
  }
}

export async function withTransaction(fn) {
  const active = getPool();
  if (!active) {
    const error = new Error('DATABASE_UNAVAILABLE');
    error.code = 'DATABASE_UNAVAILABLE';
    throw error;
  }
  let client;
  try {
    client = await active.connect();
  } catch (err) {
    status = 'unavailable';
    const safe = new Error('DATABASE_UNAVAILABLE');
    safe.code = 'DATABASE_UNAVAILABLE';
    throw safe;
  }
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    status = 'ok';
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    if (err && err.code === '23505') throw err;
    if (err && err.code === 'DATABASE_UNAVAILABLE') throw err;
    status = 'unavailable';
    const safe = new Error('DATABASE_UNAVAILABLE');
    safe.code = 'DATABASE_UNAVAILABLE';
    throw safe;
  } finally {
    if (client) client.release();
  }
}

export async function pingDatabase() {
  if (!isDatabaseConfigured()) {
    status = 'unconfigured';
    return { status, ok: false, configured: false };
  }
  try {
    const active = getPool();
    const result = await active.query('SELECT 1 AS ok');
    status = result.rows[0]?.ok === 1 ? 'ok' : 'unavailable';
    return { status, ok: status === 'ok', configured: true };
  } catch (_) {
    status = 'unavailable';
    return { status, ok: false, configured: true };
  }
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
  status = 'unconfigured';
}
