import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/db';
import { applications, leaders } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
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
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status');

    const baseQuery = db.select().from(applications);
    const filteredQuery = status
      ? baseQuery.where(eq(applications.status, status as any))
      : baseQuery;

    const results = await filteredQuery
      .orderBy(desc(applications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching applications from DB:', error);
    return NextResponse.json(memoryStore.getApplications(), { status: 200, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data', code: 'UNSUPPORTED_MEDIA_TYPE' },
        { status: 415 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const email = formData.get('email') as string | null;
    const whatsapp = formData.get('whatsapp') as string | null;
    const bio = formData.get('bio') as string | null;
    const profileImageFile = formData.get('profileImage') as File | null;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required', code: 'MISSING_NAME' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ error: 'Email is required', code: 'MISSING_EMAIL' }, { status: 400 });
    }

    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim() === '') {
      return NextResponse.json({ error: 'WhatsApp is required', code: 'MISSING_WHATSAPP' }, { status: 400 });
    }

    if (!profileImageFile) {
      return NextResponse.json({ error: 'Profile image is required', code: 'MISSING_IMAGE' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(profileImageFile.type)) {
      return NextResponse.json({ error: 'Profile image must be JPG, JPEG, or PNG', code: 'INVALID_IMAGE_TYPE' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // Up to 5MB (frontend compresses it, but allow up to 5MB)
    if (profileImageFile.size > maxSize) {
      return NextResponse.json({ error: 'Profile image must be smaller than 5 MB', code: 'IMAGE_TOO_LARGE' }, { status: 400 });
    }

    const arrayBuffer = await profileImageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${profileImageFile.type};base64,${base64}`;

    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedWhatsapp = whatsapp.trim();
    const sanitizedBio = bio ? bio.trim() : null;

    await ensureDbInitialized();

    // Query open leader slot directly from database
    const openLeaders = await db
      .select()
      .from(leaders)
      .where(eq(leaders.status, 'open'))
      .orderBy(asc(leaders.position))
      .limit(1);

    if (openLeaders.length === 0) {
      return NextResponse.json({ error: 'All leader slots are filled', code: 'NO_OPEN_SLOTS' }, { status: 400 });
    }

    const openLeader = openLeaders[0];
    const now = new Date();
    const assignedRole = openLeader.position <= 3 ? 'Leader' : 'Co-Leader';

    // Insert application record
    const newApplication = await db
      .insert(applications)
      .values({
        name: sanitizedName,
        email: sanitizedEmail,
        whatsapp: sanitizedWhatsapp,
        bio: sanitizedBio,
        profileImage: dataUrl,
        status: 'pending',
        leaderId: openLeader.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Update leader slot with new avatar and name
    await db
      .update(leaders)
      .set({
        name: sanitizedName,
        role: assignedRole,
        avatar: dataUrl,
        status: 'filled',
        updatedAt: now,
      })
      .where(eq(leaders.id, openLeader.id));

    // Also mirror to memoryStore as a safety backup
    memoryStore.addApplication({
      name: sanitizedName,
      email: sanitizedEmail,
      whatsapp: sanitizedWhatsapp,
      bio: sanitizedBio,
      profileImage: dataUrl,
    });

    return NextResponse.json(newApplication[0], { status: 201, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('POST application error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
