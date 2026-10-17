import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { applications, leaders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
  }

  const allowedStatuses = ['pending', 'approved', 'rejected'];
  const { status, adminNotes } = body || {};

  if (status !== undefined && !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  if (adminNotes !== undefined && typeof adminNotes !== 'string') {
    return NextResponse.json(
      { error: 'adminNotes must be a string.' },
      { status: 400 }
    );
  }

  const updates: { status?: string; adminNotes?: string; updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (status !== undefined) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes.slice(0, 1000);

  try {
    await ensureDbInitialized();
    const result = await db
      .update(applications)
      .set(updates)
      .where(eq(applications.id, id))
      .returning();

    if (result.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
      }
      const updatedMem = memoryStore.updateApplication(id, {
        status: updates.status,
        adminNotes: updates.adminNotes,
      });
      if (!updatedMem) {
        return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, application: updatedMem }, { headers: NO_CACHE_HEADERS });
    }

    memoryStore.updateApplication(id, {
      status: updates.status,
      adminNotes: updates.adminNotes,
    });

    return NextResponse.json({ success: true, application: result[0] }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('PATCH application error:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Failed to update application in production database.' },
        { status: 500 }
      );
    }
    const updatedMem = memoryStore.updateApplication(id, {
      status: updates.status,
      adminNotes: updates.adminNotes,
    });
    if (!updatedMem) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, application: updatedMem }, { headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 });
  }

  try {
    await ensureDbInitialized();

    // Check which application and leader slot is affected
    const existingApps = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    const deleted = await db
      .delete(applications)
      .where(eq(applications.id, id))
      .returning({ id: applications.id });

    // If associated with a leader, reset that slot back to open
    if (existingApps.length > 0 && existingApps[0].leaderId) {
      const leaderId = existingApps[0].leaderId;
      await db
        .update(leaders)
        .set({
          name: null,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=leader${leaderId}`,
          status: 'open',
          updatedAt: new Date(),
        })
        .where(eq(leaders.id, leaderId));
    }

    memoryStore.deleteApplication(id);

    if (deleted.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, id }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, id: deleted[0].id }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('DELETE application error:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Failed to delete application in production database.' },
        { status: 500 }
      );
    }
    memoryStore.deleteApplication(id);
    return NextResponse.json({ success: true, id }, { status: 200, headers: NO_CACHE_HEADERS });
  }
}
