import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, leaders } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
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

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { 
          error: 'Content-Type must be multipart/form-data', 
          code: 'UNSUPPORTED_MEDIA_TYPE' 
        },
        { status: 415 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const email = formData.get('email') as string | null;
    const whatsapp = formData.get('whatsapp') as string | null;
    const bio = formData.get('bio') as string | null;
    const profileImageFile = formData.get('profileImage') as File | null;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required', code: 'MISSING_EMAIL' },
        { status: 400 }
      );
    }

    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim() === '') {
      return NextResponse.json(
        { error: 'WhatsApp is required', code: 'MISSING_WHATSAPP' },
        { status: 400 }
      );
    }

    // Validate profile image
    if (!profileImageFile) {
      return NextResponse.json(
        { error: 'Profile image is required', code: 'MISSING_IMAGE' },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(profileImageFile.type)) {
      return NextResponse.json(
        { 
          error: 'Profile image must be JPG, JPEG, or PNG', 
          code: 'INVALID_IMAGE_TYPE' 
        },
        { status: 400 }
      );
    }

    // Check file size (2 MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (profileImageFile.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'Profile image must be smaller than 2 MB', 
          code: 'IMAGE_TOO_LARGE' 
        },
        { status: 400 }
      );
    }

    // Convert image to base64 data URL
    const arrayBuffer = await profileImageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${profileImageFile.type};base64,${base64}`;

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedWhatsapp = whatsapp.trim();
    const sanitizedBio = bio ? bio.trim() : null;

    // Find first open leader by position (asc)
    const openLeaders = await db
      .select()
      .from(leaders)
      .where(eq(leaders.status, 'open'))
      .orderBy(asc(leaders.position))
      .limit(1);

    if (openLeaders.length === 0) {
      return NextResponse.json(
        { error: 'All leader slots are filled', code: 'NO_OPEN_SLOTS' },
        { status: 400 }
      );
    }

    const openLeader = openLeaders[0];
    const now = new Date();

    // Determine role based on position: 1-3 = Leader, 4-6 = Co-Leader
    const assignedRole = openLeader.position <= 3 ? 'Leader' : 'Co-Leader';

    // Create application with transaction-like error handling
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

    if (newApplication.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create application', code: 'CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Update the leader record with profile image as avatar and correct role
    try {
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
    } catch (updateError) {
      // Rollback: delete the created application
      await db
        .delete(applications)
        .where(eq(applications.id, newApplication[0].id));

      console.error('Leader update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update leader slot', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(newApplication[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
