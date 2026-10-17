import { NextRequest, NextResponse } from 'next/server';
import { db, getClient, ensureDbInitialized, isProduction } from '@/db';
import { applications, leaders } from '@/db/schema';
import { eq, desc, asc, like, or } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader6',
];

export async function GET(request: NextRequest) {
  // Public users must NEVER access private applicant contact info
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin credentials required to view applications.' },
      { status: 401 }
    );
  }

  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200);
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0'));
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    let query = db.select().from(applications).$dynamic();

    if (status && status !== 'all') {
      query = query.where(eq(applications.status, status));
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.where(
        or(
          like(applications.name, pattern),
          like(applications.email, pattern),
          like(applications.whatsapp, pattern)
        )
      );
    }

    const results = await query
      .orderBy(desc(applications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching applications:', error);
    if (isProduction()) {
      return NextResponse.json(
        { error: 'Failed to retrieve applications from persistent database.' },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }
    // Dev fallback only
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

    // Strict input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name is required (minimum 2 characters)', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Valid email address is required', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim().length < 6) {
      return NextResponse.json(
        { error: 'WhatsApp contact number is required', code: 'MISSING_WHATSAPP' },
        { status: 400 }
      );
    }

    if (!profileImageFile) {
      return NextResponse.json(
        { error: 'Profile image is required before submission', code: 'MISSING_IMAGE' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(profileImageFile.type)) {
      return NextResponse.json(
        { error: 'Profile image must be JPG, JPEG, PNG, or WEBP', code: 'INVALID_IMAGE_TYPE' },
        { status: 400 }
      );
    }

    // Limit to 5MB max
    const maxSize = 5 * 1024 * 1024;
    if (profileImageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Profile image must be smaller than 5 MB', code: 'IMAGE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const arrayBuffer = await profileImageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${profileImageFile.type};base64,${base64}`;

    const sanitizedName = name.trim().slice(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 150);
    const sanitizedWhatsapp = whatsapp.trim().slice(0, 30);
    const sanitizedBio = bio ? bio.trim().slice(0, 1000) : null;

    await ensureDbInitialized();
    const client = getClient();
    const now = Date.now();

    // Concurrency-safe atomic slot claim:
    // Update the lowest position slot that is currently open, and return the row in one atomic statement
    const claimResult = await client.execute({
      sql: `UPDATE leaders 
            SET name = ?, avatar = ?, status = 'filled', updated_at = ? 
            WHERE id = (
              SELECT id FROM leaders 
              WHERE status = 'open' 
              ORDER BY position ASC 
              LIMIT 1
            ) 
            RETURNING *;`,
      args: [sanitizedName, dataUrl, now],
    });

    if (claimResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'All 6 leader slots are currently filled. Thank you for your interest!', code: 'NO_OPEN_SLOTS' },
        { status: 400 }
      );
    }

    const claimedLeader = claimResult.rows[0];
    const leaderId = Number(claimedLeader.id);

    try {
      // Insert the application linked to this claimed leader slot
      const appResult = await client.execute({
        sql: `INSERT INTO applications (name, email, whatsapp, bio, profile_image, status, leader_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
              RETURNING *;`,
        args: [sanitizedName, sanitizedEmail, sanitizedWhatsapp, sanitizedBio, dataUrl, leaderId, now, now],
      });

      const newApp = appResult.rows[0];

      return NextResponse.json(
        {
          success: true,
          applicationId: newApp.id,
          assignedSlot: {
            id: leaderId,
            position: claimedLeader.position,
            role: claimedLeader.role,
          },
        },
        { status: 201, headers: NO_CACHE_HEADERS }
      );
    } catch (insertError) {
      console.error('Failed to insert application record, rolling back slot claim:', insertError);

      // Rollback the leader slot back to open status so it isn't orphaned
      const position = Number(claimedLeader.position);
      const defaultAvatar = DEFAULT_AVATARS[position - 1] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

      await client.execute({
        sql: `UPDATE leaders SET name = NULL, avatar = ?, status = 'open', updated_at = ? WHERE id = ?;`,
        args: [defaultAvatar, Date.now(), leaderId],
      });

      throw insertError;
    }
  } catch (error) {
    console.error('POST application fatal error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not process application at this time.',
        code: 'SUBMISSION_FAILED',
      },
      { status: 500 }
    );
  }
}
