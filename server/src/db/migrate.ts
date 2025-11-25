import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { logger } from '../shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCK_KEY = 'media-archive:migrations';

export async function runMigrations() {
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [LOCK_KEY]);
    lockAcquired = true;

    await client.query(
      `CREATE TABLE IF NOT EXISTS migrations (
        id serial primary key,
        name text unique,
        run_at timestamptz default now()
      )`,
    );

    const candidates = [
      path.resolve(__dirname, './migrations'), // dist/db/migrations
      path.resolve(__dirname, '../../src/db/migrations'), // source dir when running from dist
    ];
    const dir = candidates.find((p) => fs.existsSync(p));
    if (!dir) {
      logger.warn('[migrate] migrations directory not found, skipping');
      return;
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const name = file;
      const { rows } = await client.query('SELECT 1 FROM migrations WHERE name=$1', [name]);
      if (rows.length) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      if (!sql.trim()) {
        await client.query('INSERT INTO migrations(name) VALUES ($1)', [name]);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations(name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        logger.info({ migration: name }, '[migrate] applied');
      } catch (e) {
        await client.query('ROLLBACK');
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        const errorStack = e instanceof Error ? e.stack : undefined;
        logger.error(
          {
            err: e,
            migration: name,
            file: file,
            error: errorMessage,
            stack: errorStack,
          },
          '[migrate] failed',
        );
        throw e;
      }
    }
  } finally {
    if (lockAcquired) {
      await client
        .query('SELECT pg_advisory_unlock(hashtext($1))', [LOCK_KEY])
        .catch((unlockError) => {
          logger.error({ err: unlockError }, '[migrate] failed to release advisory lock');
        });
    }
    client.release();
  }
}
