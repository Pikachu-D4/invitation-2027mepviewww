import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { siteContent, contentRevisions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { DEFAULT_SITE_CONTENT } from '@/lib/content';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const now = new Date();
  const jsonPayload = JSON.stringify(DEFAULT_SITE_CONTENT);

  try {
    await ensureDbInitialized();

    const existing = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.id, 'main'))
      .limit(1);

    const nextVersion = existing.length > 0 ? (existing[0].version || 1) + 1 : 1;

    await db
      .insert(siteContent)
      .values({
        id: 'main',
        data: jsonPayload,
        version: nextVersion,
        updatedBy: 'admin',
        createdAt: existing.length > 0 ? existing[0].createdAt : now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteContent.id,
        set: {
          data: jsonPayload,
          version: nextVersion,
          updatedBy: 'admin',
          updatedAt: now,
        },
      });

    await db.insert(contentRevisions).values({
      contentId: 'main',
      data: jsonPayload,
      action: 'reset',
      createdBy: 'admin',
      createdAt: now,
    });

    memoryStore.resetContent('admin');

    return NextResponse.json(
      {
        success: true,
        message: 'Website content has been reset to defaults.',
        content: DEFAULT_SITE_CONTENT,
        version: nextVersion,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Reset content DB error:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Failed to reset website content in production database.' },
        { status: 500 }
      );
    }

    memoryStore.resetContent('admin');
    return NextResponse.json(
      {
        success: true,
        message: 'Website content reset to defaults (offline/dev).',
        content: DEFAULT_SITE_CONTENT,
        version: 1,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
}
