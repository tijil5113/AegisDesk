#!/usr/bin/env node
/**
 * Apply versioned SQL migrations in db/migrations/.
 * Usage: node db/migrate.js
 * Never drops production tables.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, isDatabaseConfigured, closePool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not set. Migrations were not applied.');
    process.exit(1);
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((name) => /^\d+_.*\.sql$/.test(name))
      .sort();

    for (const file of files) {
      const id = file;
      const existing = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [id]);
      if (existing.rowCount) {
        console.log(`skip  ${id}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`apply ${id}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('Migrations complete.');
  } finally {
    client.release();
    await closePool();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err?.message || err);
  process.exit(1);
});
