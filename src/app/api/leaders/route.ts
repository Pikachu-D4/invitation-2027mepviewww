import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaders } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.TURSO_CONNECTION_URL) {
    try {
      const allLeaders = await db
        .select()
        .from(leaders)
        .orderBy(asc(leaders.position));

      if (allLeaders.length > 0) {
        return NextResponse.json(allLeaders, { status: 200 });
      }
    } catch (error) {
      console.warn('DB query failed, falling back to memory store:', error);
    }
  }

  // Self-contained store: guaranteed to return 6 leader slots
  return NextResponse.json(memoryStore.getLeaders(), { status: 200 });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (process.env.TURSO_CONNECTION_URL) {
    try {
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
      return NextResponse.json(createdLeaders, { status: 201 });
    } catch (error) {
      console.warn('DB insert failed, using memory store:', error);
    }
  }

  return NextResponse.json(memoryStore.getLeaders(), { status: 201 });
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
        {
          error: 'Missing or invalid position (must be 1-6)',
          code: 'INVALID_POSITION',
        },
        { status: 400 },
      );
    }

    if (process.env.TURSO_CONNECTION_URL) {
      try {
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
          return NextResponse.json(updated[0], { status: 200 });
        }
      } catch (dbErr) {
        console.warn('DB update failed, using memoryStore:', dbErr);
      }
    }

    const resetSlot = memoryStore.resetLeader(position);
    if (!resetSlot) {
      return NextResponse.json(
        { error: 'No leader slot found for this position', code: 'POSITION_NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json(resetSlot, { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + String(error), code: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
