import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { siteContent, contentRevisions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { DEFAULT_SITE_CONTENT, validateSiteContent, type SiteContent } from '@/lib/content';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await ensureDbInitialized();

    const records = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.id, 'main'))
      .limit(1);

    const revisions = await db
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.contentId, 'main'))
      .orderBy(desc(contentRevisions.createdAt))
      .limit(15);

    if (records.length > 0) {
      try {
        const parsed = JSON.parse(records[0].data) as SiteContent;
        return NextResponse.json(
          {
            content: parsed,
            version: records[0].version,
            updatedAt: records[0].updatedAt,
            revisions: revisions.map((r) => ({
              id: r.id,
              action: r.action,
              createdBy: r.createdBy,
              createdAt: r.createdAt,
            })),
          },
          { status: 200, headers: NO_CACHE_HEADERS }
        );
      } catch (err) {
        console.error('Error parsing stored site content:', err);
      }
    }
  } catch (error) {
    console.error('Admin GET content DB error:', error);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database unavailable.' },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }
  }

  // Fallback to in-memory store
  const memContent = memoryStore.getContent();
  const memRevisions = memoryStore.getRevisions();
  return NextResponse.json(
    {
      content: memContent || DEFAULT_SITE_CONTENT,
      version: 1,
      updatedAt: new Date(),
      revisions: memRevisions.map((r) => ({
        id: r.id,
        action: r.action,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
      })),
    },
    { status: 200, headers: NO_CACHE_HEADERS }
  );
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
  }

  // Validate and sanitize content
  const validation = validateSiteContent(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Content validation failed', details: validation.errors },
      { status: 400 }
    );
  }

  const sanitized = validation.sanitized;
  const jsonPayload = JSON.stringify(sanitized);
  const now = new Date();

  try {
    await ensureDbInitialized();

    // Check existing record to increment version
    const existing = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.id, 'main'))
      .limit(1);

    const nextVersion = existing.length > 0 ? (existing[0].version || 1) + 1 : 1;

    // Upsert site_content
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

    // Record revision
    await db.insert(contentRevisions).values({
      contentId: 'main',
      data: jsonPayload,
      action: 'update',
      createdBy: 'admin',
      createdAt: now,
    });

    memoryStore.updateContent(sanitized, 'admin');

    return NextResponse.json(
      {
        success: true,
        content: sanitized,
        version: nextVersion,
        updatedAt: now,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Admin PATCH content DB error:', error);

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Failed to save website content to production database.' },
        { status: 500 }
      );
    }

    memoryStore.updateContent(sanitized, 'admin');
    return NextResponse.json(
      {
        success: true,
        content: sanitized,
        version: 1,
        updatedAt: now,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
}
