import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { getDatabaseUrl } from '../src/db/config.js';

const pool = new Pool({ connectionString: getDatabaseUrl() });
const migrationsPath = fileURLToPath(new URL('../migrations/', import.meta.url));

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(741928310)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS flashreserve_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const migrationFiles = (await readdir(migrationsPath))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const name of migrationFiles) {
      const applied = await client.query('SELECT 1 FROM flashreserve_migrations WHERE name = $1', [name]);
      if (applied.rowCount) continue;
      const contents = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
      await client.query(contents);
      await client.query('INSERT INTO flashreserve_migrations (name) VALUES ($1)', [name]);
      console.log(`Applied migration ${name}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
