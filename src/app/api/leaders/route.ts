import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaders } from '@/db/schema';
import { sql, asc, eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const allLeaders = await db
      .select()
      .from(leaders)
      .orderBy(asc(leaders.position));

    return NextResponse.json(allLeaders, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error:
          'Internal server error: ' +
          (error instanceof Error ? error.message : String(error)),
        code: 'SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const existingLeaders = await db
      .select({ count: sql<number>`count(*)` })
      .from(leaders);

    const count = existingLeaders[0]?.count || 0;

    if (count > 0) {
      return NextResponse.json(
        {
          error: 'Leaders already exist. Cannot initialize again.',
          code: 'LEADERS_ALREADY_EXIST',
        },
        { status: 400 },
      );
    }

    const currentTimestamp = new Date();
    const leaderSlots = Array.from({ length: 6 }, (_, index) => ({
      name: null,
      role: null,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      status: 'open' as const,
      position: index + 1,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    }));

    const createdLeaders = await db.insert(leaders).values(leaderSlots).returning();

    return NextResponse.json(createdLeaders, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error:
          'Internal server error: ' +
          (error instanceof Error ? error.message : String(error)),
        code: 'SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

// 🔁 Reset / clear a specific leader slot by position (1–6)
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { position } = await request.json();

    // position should be a number between 1 and 6
    if (typeof position !== 'number') {
      return NextResponse.json(
        {
          error: 'Missing or invalid position',
          code: 'INVALID_POSITION',
        },
        { status: 400 },
      );
    }

    const currentTimestamp = new Date();

    const updated = await db
      .update(leaders)
      .set({
        name: null,
        role: null,
        // back to default avatar (same as in POST)
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        status: 'open',
        updatedAt: currentTimestamp,
      })
      .where(eq(leaders.position, position))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        {
          error: 'No leader slot found for this position',
          code: 'POSITION_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      {
        error:
          'Internal server error: ' +
          (error instanceof Error ? error.message : String(error)),
        code: 'SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}
