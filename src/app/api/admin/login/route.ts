import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  createAdminSessionToken,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: 'Admin login is not configured. Set ADMIN_SECRET to a random value of at least 32 characters.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== 'string' || password.length === 0 || password.length > 512) {
    return NextResponse.json({ error: 'Enter the admin password.' }, { status: 400 });
  }

  const providedHash = createHash('sha256').update(password).digest();
  const expectedHash = createHash('sha256').update(secret).digest();
  if (!timingSafeEqual(providedHash, expectedHash)) {
    return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 });
  }

  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  const token = createAdminSessionToken(expiresAt);
  if (!token) {
    return NextResponse.json({ error: 'Admin login is not configured.' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expiresAt),
  });
  return response;
}
