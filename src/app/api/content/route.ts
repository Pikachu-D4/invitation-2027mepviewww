import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { siteContent } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { filterPublicContent, DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/content';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=5, s-maxage=10, stale-while-revalidate=59',
  'CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
};

export async function GET() {
  try {
    await ensureDbInitialized();

    const records = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.id, 'main'))
      .limit(1);

    if (records.length > 0) {
      try {
        const raw = JSON.parse(records[0].data) as SiteContent;
        const publicContent = filterPublicContent(raw);
        return NextResponse.json(publicContent, {
          status: 200,
          headers: CACHE_HEADERS,
        });
      } catch (parseError) {
        console.error('Failed to parse site content JSON from DB:', parseError);
      }
    }
  } catch (error) {
    console.error('Error retrieving site content from database:', error);
  }

  // Fallback to in-memory store or defaults
  const fallback = filterPublicContent(memoryStore.getContent() || DEFAULT_SITE_CONTENT);
  return NextResponse.json(fallback, {
    status: 200,
    headers: CACHE_HEADERS,
  });
}
