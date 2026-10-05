import 'dotenv/config';

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_SSLMODE } = process.env;
  if (!DB_HOST || !DB_DATABASE || !DB_USERNAME || DB_PASSWORD === undefined) {
    throw new Error('Set DATABASE_URL or DB_HOST, DB_DATABASE, DB_USERNAME, and DB_PASSWORD in .env');
  }
  if (DB_CONNECTION && !['pgsql', 'postgres', 'postgresql'].includes(DB_CONNECTION)) {
    throw new Error('FlashReserve requires PostgreSQL (DB_CONNECTION=pgsql)');
  }

  const host = DB_HOST.includes(':') && !DB_HOST.startsWith('[') ? `[${DB_HOST}]` : DB_HOST;
  const port = DB_PORT || '5432';
  const sslMode = DB_SSLMODE || (['localhost', '127.0.0.1', '::1'].includes(DB_HOST) ? '' : 'require');
  const sslQuery = sslMode ? `?sslmode=${encodeURIComponent(sslMode)}` : '';
  return `postgresql://${encodeURIComponent(DB_USERNAME)}:${encodeURIComponent(DB_PASSWORD)}@${host}:${port}/${encodeURIComponent(DB_DATABASE)}${sslQuery}`;
}
