import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;

/**
 * Returns a Drizzle database instance backed by Turso if configured,
 * or an in-memory client if TURSO_CONNECTION_URL is not set.
 *
 * This ensures the application works completely out-of-the-box
 * without requiring any external database setup.
 */
export function getDb(): DrizzleDB {
  if (_db) return _db;

  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    // In-memory fallback: zero external database needed
    const fallbackClient = createClient({ url: ':memory:' });
    _db = drizzle(fallbackClient, { schema });
    return _db;
  }

  const client = createClient({ url, authToken: authToken ?? undefined });
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * `db` is a Proxy that defers to `getDb()` on property access.
 * Safely ignores promises (then), symbols, and inspections so tooling / bundlers
 * won't accidentally trigger connection initialization.
 */
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop, receiver) {
    if (prop === 'then' || typeof prop === 'symbol' || prop === 'toJSON') {
      return undefined;
    }
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = DrizzleDB;