import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from './config.js';
import * as schema from './schema.js';

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle(pool, { schema });
