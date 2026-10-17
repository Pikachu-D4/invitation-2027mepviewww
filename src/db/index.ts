import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from '@/db/schema';
import { DEFAULT_SITE_CONTENT } from '@/lib/content';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _client: Client | null = null;
let _db: DrizzleDB | null = null;
let _initPromise: Promise<void> | null = null;

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader6',
];

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Returns a libSQL client instance.
 * Lazy initialized to prevent eager connection errors during build.
 */
export function getClient(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    _client = createClient({ url, authToken });
    return _client;
  }

  // During build phase or dev fallback
  if (isProduction() && !isBuildPhase()) {
    throw new Error(
      'Database configuration missing. TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN must be set in production.'
    );
  }

  if (!isProduction()) {
    console.warn(
      '[DEV ONLY] TURSO_CONNECTION_URL is not set. Using temporary in-memory database for local testing.'
    );
  }

  _client = createClient({ url: ':memory:' });
  return _client;
}

/**
 * Returns the Drizzle ORM instance.
 */
export function getDb(): DrizzleDB {
  if (_db) return _db;
  const client = getClient();
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Ensures the required tables and initial 6 leader slots exist.
 * Concurrency-safe initialization that runs once per process.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const client = getClient();
    try {
      // 1. Create leaders table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS leaders (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT,
          role TEXT,
          avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default' NOT NULL,
          status TEXT DEFAULT 'open' NOT NULL,
          position INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // 2. Create applications table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          whatsapp TEXT NOT NULL,
          bio TEXT,
          profile_image TEXT NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          leader_id INTEGER REFERENCES leaders(id),
          admin_notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // 3. Create site_content table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS site_content (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          version INTEGER DEFAULT 1 NOT NULL,
          updated_by TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // 4. Create content_revisions table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS content_revisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          content_id TEXT NOT NULL,
          data TEXT NOT NULL,
          action TEXT DEFAULT 'update' NOT NULL,
          created_by TEXT,
          created_at INTEGER NOT NULL
        );
      `);

      // 5. Ensure any missing columns if existing table had older schema
      try {
        await client.execute('ALTER TABLE applications ADD COLUMN profile_image TEXT');
      } catch {}
      try {
        await client.execute('ALTER TABLE applications ADD COLUMN admin_notes TEXT');
      } catch {}
      try {
        await client.execute('ALTER TABLE applications ADD COLUMN requested_role TEXT');
      } catch {}
      try {
        await client.execute('ALTER TABLE applications ADD COLUMN requested_position INTEGER');
      } catch {}
      try {
        await client.execute('ALTER TABLE applications ADD COLUMN instagram_username TEXT');
      } catch {}
      try {
        await client.execute('ALTER TABLE leaders ADD COLUMN position INTEGER');
      } catch {}

      // 5b. Safe idempotent backfill: If an application has an assigned leader but no requested_role recorded,
      // derive it from the assigned leader slot
      try {
        await client.execute(`
          UPDATE applications
          SET requested_role = (SELECT role FROM leaders WHERE leaders.id = applications.leader_id),
              requested_position = (SELECT position FROM leaders WHERE leaders.id = applications.leader_id)
          WHERE leader_id IS NOT NULL AND requested_role IS NULL;
        `);
      } catch (backfillErr) {
        console.warn('Backfill skipped or failed gracefully:', backfillErr);
      }

      // 6. Seed the 6 default leader slots if table has 0 rows
      const countRes = await client.execute('SELECT COUNT(*) as c FROM leaders');
      const count = Number(countRes.rows[0]?.c || 0);

      if (count === 0) {
        const now = Date.now();
        for (let i = 1; i <= 6; i++) {
          const role = i <= 3 ? 'Leader' : 'Co-Leader';
          const avatar = DEFAULT_AVATARS[i - 1];
          await client.execute({
            sql: 'INSERT INTO leaders (name, role, avatar, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [null, role, avatar, 'open', i, now, now],
          });
        }
      }

      // 7. Seed initial site content if absent
      const contentRes = await client.execute({
        sql: 'SELECT COUNT(*) as c FROM site_content WHERE id = ?',
        args: ['main'],
      });
      const contentCount = Number(contentRes.rows[0]?.c || 0);

      if (contentCount === 0) {
        const now = Date.now();
        const jsonPayload = JSON.stringify(DEFAULT_SITE_CONTENT);
        await client.execute({
          sql: 'INSERT INTO site_content (id, data, version, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          args: ['main', jsonPayload, 1, 'system_initial', now, now],
        });
        await client.execute({
          sql: 'INSERT INTO content_revisions (content_id, data, action, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
          args: ['main', jsonPayload, 'initial', 'system_initial', now],
        });
      }
    } catch (err) {
      console.error('Failed to initialize database schema:', err);
      throw err;
    }
  })();

  return _initPromise;
}

/**
 * Proxy export for `db` so existing code continues to work seamlessly.
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