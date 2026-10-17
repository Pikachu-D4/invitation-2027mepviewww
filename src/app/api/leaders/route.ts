import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { applications, leaders } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

const PUBLIC_LEADERS_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=5, s-maxage=10, stale-while-revalidate=59',
  'CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
};

export async function GET() {
  try {
    await ensureDbInitialized();
    const allLeaders = await db
      .select()
      .from(leaders)
      .orderBy(asc(leaders.position));

    if (allLeaders && allLeaders.length > 0) {
      return NextResponse.json(allLeaders, {
        status: 200,
        headers: PUBLIC_LEADERS_CACHE_HEADERS,
      });
    }
  } catch (error) {
    console.error('Error fetching leaders from DB:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database unavailable.' },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }
  }

  // Development/Test fallback
  return NextResponse.json(memoryStore.getLeaders(), {
    status: 200,
    headers: PUBLIC_LEADERS_CACHE_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await ensureDbInitialized();
    const currentTimestamp = new Date();
    const leaderSlots = Array.from({ length: 6 }, (_, index) => ({
      name: null,
      role: index < 3 ? 'Leader' : 'Co-Leader',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=leader${index + 1}`,
      status: 'open' as const,
      position: index + 1,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    }));

    const createdLeaders = await db.insert(leaders).values(leaderSlots).returning();
    return NextResponse.json(createdLeaders, { status: 201, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('Error in leaders POST:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Failed to seed leaders in production database.' }, { status: 500 });
    }
    return NextResponse.json(memoryStore.getLeaders(), { status: 201, headers: NO_CACHE_HEADERS });
  }
}

// 🔁 Reset / clear a specific leader slot by position (1–6)
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { position } = body || {};

    if (typeof position !== 'number' || position < 1 || position > 6) {
      return NextResponse.json(
        { error: 'Missing or invalid position (must be 1-6)', code: 'INVALID_POSITION' },
        { status: 400 },
      );
    }

    await ensureDbInitialized();
    const currentTimestamp = new Date();

    const leaderToReset = await db
      .select()
      .from(leaders)
      .where(eq(leaders.position, position))
      .limit(1);

    const updated = await db
      .update(leaders)
      .set({
        name: null,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=leader${position}`,
        status: 'open',
        updatedAt: currentTimestamp,
      })
      .where(eq(leaders.position, position))
      .returning();

    // Disassociate application linked to this slot if any and return to pending/unassigned
    if (leaderToReset.length > 0) {
      await db
        .update(applications)
        .set({ leaderId: null, status: 'pending', updatedAt: currentTimestamp })
        .where(eq(applications.leaderId, leaderToReset[0].id));
    }

    memoryStore.resetLeader(position);

    if (updated.length > 0) {
      return NextResponse.json(updated[0], { status: 200, headers: NO_CACHE_HEADERS });
    }

    const resetSlot = memoryStore.resetLeader(position);
    return NextResponse.json(resetSlot, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('PATCH leader reset error:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Failed to reset leader slot in database.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Could not reset leader slot', code: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
