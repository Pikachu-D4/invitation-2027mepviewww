import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;

/**
 * Returns a lazily-initialised Drizzle instance backed by Turso / libSQL.
 *
 * Connection is deferred to runtime so importing this module during `next build`
 * or static page collection does not throw URL_INVALID when TURSO_CONNECTION_URL is not set.
 */
export function getDb(): DrizzleDB {
  if (_db) return _db;

  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    // If running in build phase or test without database credentials, use in-memory client
    // so Next.js static collection does not fail.
    if (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NODE_ENV === 'test' ||
      !process.env.NODE_ENV ||
      process.env.NEXT_RUNTIME === 'nodejs'
    ) {
      console.warn(
        '⚠️ TURSO_CONNECTION_URL is not defined. Initializing fallback client for build/prerender phase.'
      );
      const fallbackClient = createClient({ url: ':memory:' });
      _db = drizzle(fallbackClient, { schema });
      return _db;
    }

    throw new Error(
      'Missing TURSO_CONNECTION_URL environment variable. ' +
        'Set it in .env.local (local dev) or in your hosting dashboard (Vercel / Netlify).'
    );
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