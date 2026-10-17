import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { leaders } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
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
        headers: NO_CACHE_HEADERS,
      });
    }
  } catch (error) {
    console.error('Error fetching leaders from DB:', error);
  }

  // Fallback if DB is unavailable
  return NextResponse.json(memoryStore.getLeaders(), {
    status: 200,
    headers: NO_CACHE_HEADERS,
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
    return NextResponse.json(memoryStore.getLeaders(), { status: 201, headers: NO_CACHE_HEADERS });
  }
}

// 🔁 Reset / clear a specific leader slot by position (1–6)
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { position } = await request.json();

    if (typeof position !== 'number' || position < 1 || position > 6) {
      return NextResponse.json(
        { error: 'Missing or invalid position (must be 1-6)', code: 'INVALID_POSITION' },
        { status: 400 },
      );
    }

    await ensureDbInitialized();
    const currentTimestamp = new Date();
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

    if (updated.length > 0) {
      return NextResponse.json(updated[0], { status: 200, headers: NO_CACHE_HEADERS });
    }

    const resetSlot = memoryStore.resetLeader(position);
    return NextResponse.json(resetSlot, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Could not reset leader slot', code: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
