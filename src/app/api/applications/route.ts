import { NextRequest, NextResponse } from 'next/server';
import { db, getClient, ensureDbInitialized, isProduction } from '@/db';
import { applications, leaders } from '@/db/schema';
import { eq, desc, asc, like, or, and, isNull, isNotNull, type SQL } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

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
    const requestedRole = searchParams.get('requestedRole');
    const assigned = searchParams.get('assigned'); // 'true' | 'false' | 'all'
    const search = searchParams.get('search')?.trim();

    let query = db.select().from(applications).$dynamic();
    const conditions: SQL[] = [];

    if (status && status !== 'all') {
      conditions.push(eq(applications.status, status));
    }

    if (requestedRole && requestedRole !== 'all') {
      conditions.push(eq(applications.requestedRole, requestedRole));
    }

    if (assigned === 'true') {
      conditions.push(isNotNull(applications.leaderId));
    } else if (assigned === 'false') {
      conditions.push(isNull(applications.leaderId));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          like(applications.name, pattern),
          like(applications.email, pattern),
          like(applications.whatsapp, pattern),
          like(applications.instagramUsername, pattern)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
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
    const rawRequestedRole = formData.get('requestedRole') as string | null;
    const rawRequestedPosition = formData.get('requestedPosition') as string | null;
    const rawInstagram = formData.get('instagramUsername') as string | null;

    // Strict input validation: Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name is required (minimum 2 characters)', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    // Strict input validation: Email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Valid email address is required', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Strict input validation: WhatsApp
    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim().length < 6) {
      return NextResponse.json(
        { error: 'WhatsApp contact number is required', code: 'MISSING_WHATSAPP' },
        { status: 400 }
      );
    }

    // Strict input validation: Requested Role (Leader or Co-Leader)
    if (!rawRequestedRole || (rawRequestedRole !== 'Leader' && rawRequestedRole !== 'Co-Leader')) {
      return NextResponse.json(
        { error: 'Please choose a preferred role: Squad Leader or Squad Co-Leader', code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }
    const requestedRole = rawRequestedRole as 'Leader' | 'Co-Leader';

    // Strict input validation: Requested Position
    let requestedPosition = 0; // 0 = flexible ("Any available position in this role")
    if (rawRequestedPosition !== null && rawRequestedPosition !== undefined && rawRequestedPosition !== '') {
      const parsedPos = parseInt(String(rawRequestedPosition), 10);
      if (isNaN(parsedPos) || parsedPos < 0 || parsedPos > 6) {
        return NextResponse.json(
          { error: 'Invalid position preference selection', code: 'INVALID_POSITION' },
          { status: 400 }
        );
      }
      requestedPosition = parsedPos;
    }

    // Validate role/position mapping:
    // Positions 1–3 must map ONLY to Leader
    // Positions 4–6 must map ONLY to Co-Leader
    if (requestedPosition !== 0) {
      if (requestedRole === 'Leader' && (requestedPosition < 1 || requestedPosition > 3)) {
        return NextResponse.json(
          { error: 'Positions 1–3 are designated for Squad Leaders only.', code: 'ROLE_POSITION_MISMATCH' },
          { status: 400 }
        );
      }
      if (requestedRole === 'Co-Leader' && (requestedPosition < 4 || requestedPosition > 6)) {
        return NextResponse.json(
          { error: 'Positions 4–6 are designated for Squad Co-Leaders only.', code: 'ROLE_POSITION_MISMATCH' },
          { status: 400 }
        );
      }
    }

    // Instagram Username (optional, accepts with or without leading @)
    let normalizedInstagram: string | null = null;
    if (rawInstagram && typeof rawInstagram === 'string' && rawInstagram.trim().length > 0) {
      const cleaned = rawInstagram.trim().replace(/^@+/, '');
      if (cleaned.length > 30) {
        return NextResponse.json(
          { error: 'Instagram username must not exceed 30 characters.', code: 'INVALID_INSTAGRAM_LENGTH' },
          { status: 400 }
        );
      }
      if (!/^[A-Za-z0-9._]+$/.test(cleaned)) {
        return NextResponse.json(
          { error: 'Instagram username contains invalid characters. Only letters, numbers, periods, and underscores are allowed.', code: 'INVALID_INSTAGRAM_CHARS' },
          { status: 400 }
        );
      }
      normalizedInstagram = cleaned.toLowerCase();
    }

    // Profile Image
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

    // Redesigned Application Submission Workflow:
    // 1. Applicant chooses Leader or Co-Leader
    // 2. Applicant chooses specific position or flexible preference (0)
    // 3. Applicant optionally supplies Instagram username
    // 4. Application is saved in persistent database with 'pending' status and leader_id = NULL
    // 5. It does NOT automatically claim or fill any public leader seat!
    // 6. Seats are only occupied upon explicit administrator assignment & approval.

    try {
      const appResult = await client.execute({
        sql: `INSERT INTO applications (name, email, whatsapp, bio, profile_image, status, leader_id, requested_role, requested_position, instagram_username, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, ?)
              RETURNING *;`,
        args: [
          sanitizedName,
          sanitizedEmail,
          sanitizedWhatsapp,
          sanitizedBio,
          dataUrl,
          requestedRole,
          requestedPosition === 0 ? null : requestedPosition,
          normalizedInstagram,
          now,
          now,
        ],
      });

      const newApp = appResult.rows[0];

      return NextResponse.json(
        {
          success: true,
          applicationId: newApp.id,
          reference: `MEP2027-${newApp.id}`,
          requestedRole,
          requestedPosition,
          instagramUsername: normalizedInstagram,
          status: 'pending',
          message: 'Your application has been received and is pending administrator review. Selected positions are recorded as preferences and finalized upon admin assignment.',
        },
        { status: 201, headers: NO_CACHE_HEADERS }
      );
    } catch (insertError: any) {
      console.error('Failed to insert application record in DB:', insertError);

      if (isProduction()) {
        return NextResponse.json(
          { error: 'Failed to record application in persistent database.', code: 'PERSISTENCE_FAILED' },
          { status: 500 }
        );
      }

      // Dev memory store fallback
      const saved = memoryStore.addApplication({
        name: sanitizedName,
        email: sanitizedEmail,
        whatsapp: sanitizedWhatsapp,
        bio: sanitizedBio,
        profileImage: dataUrl,
        requestedRole,
        requestedPosition: requestedPosition === 0 ? null : requestedPosition,
        instagramUsername: normalizedInstagram,
      });

      return NextResponse.json(
        {
          success: true,
          applicationId: saved.application.id,
          reference: `MEP2027-${saved.application.id}`,
          requestedRole,
          requestedPosition,
          instagramUsername: normalizedInstagram,
          status: 'pending',
          message: 'Your application has been received and is pending administrator review.',
        },
        { status: 201, headers: NO_CACHE_HEADERS }
      );
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
