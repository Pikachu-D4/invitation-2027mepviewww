import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  createAdminSessionToken,
  getAdminPassword,
  checkLoginRateLimit,
  recordLoginAttempt,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // Check rate limit
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 }
    );
  }

  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    return NextResponse.json(
      {
        error:
          'Admin login is not configured on this deployment. Please set ADMIN_PASSWORD and ADMIN_SECRET in your environment variables.',
      },
      { status: 503 }
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
  const expectedHash = createHash('sha256').update(expectedPassword).digest();

  if (!timingSafeEqual(providedHash, expectedHash)) {
    recordLoginAttempt(clientIp, false);
    return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 });
  }

  // Login successful
  recordLoginAttempt(clientIp, true);
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  const token = createAdminSessionToken(expiresAt);

  if (!token) {
    return NextResponse.json(
      { error: 'Failed to generate admin session token. Please verify ADMIN_SECRET configuration.' },
      { status: 500 }
    );
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
