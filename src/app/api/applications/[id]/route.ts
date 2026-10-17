import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';

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
    const deleted = await db
      .delete(applications)
      .where(eq(applications.id, id))
      .returning({ id: applications.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted[0].id }, { status: 200 });
  } catch (error) {
    console.error('DELETE application error:', error);
    return NextResponse.json({ error: 'Could not delete application.' }, { status: 500 });
  }
}
