import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from '@/db/schema';

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

export function getClient(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    _client = createClient({ url, authToken: authToken ?? undefined });
  } else {
    _client = createClient({ url: ':memory:' });
  }
  return _client;
}

export function getDb(): DrizzleDB {
  if (_db) return _db;
  const client = getClient();
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Ensures the required tables and initial 6 leader slots exist in Turso or in-memory DB.
 * Runs once per server process and caches the promise.
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
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // 3. Ensure any missing columns if existing table had old schema
      try {
        await client.execute('ALTER TABLE applications ADD COLUMN profile_image TEXT');
      } catch {
        // column already exists
      }
      try {
        await client.execute('ALTER TABLE leaders ADD COLUMN position INTEGER');
      } catch {
        // column already exists
      }

      // 4. Seed the 6 default leader slots if table has 0 rows
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
    } catch (err) {
      console.error('Failed to initialize database schema:', err);
    }
  })();

  return _initPromise;
}

export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop, receiver) {
    if (prop === 'then' || typeof prop === 'symbol' || prop === 'toJSON') {
      return undefined;
    }
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = DrizzleDB;