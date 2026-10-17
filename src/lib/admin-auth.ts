import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'mep_admin_session';
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const DEV_FALLBACK_PASSWORD = '2554';
const DEV_FALLBACK_SECRET = 'mep2027-dev-signing-secret-minimum-32-chars-long';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Returns the configured admin password.
 * In production, ADMIN_PASSWORD must be provided via environment variables.
 */
export function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (password && password.length >= 4) {
    return password;
  }

  if (isProduction()) {
    console.error('CRITICAL: ADMIN_PASSWORD is not configured in production environment.');
    return null;
  }

  return DEV_FALLBACK_PASSWORD;
}

/**
 * Returns the HMAC signing secret for admin session tokens.
 * In production, ADMIN_SECRET must be at least 32 characters.
 */
export function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (isProduction()) {
    console.error('CRITICAL: ADMIN_SECRET is not configured or shorter than 32 characters in production.');
    return null;
  }

  return DEV_FALLBACK_SECRET;
}

/**
 * Creates an HMAC-signed session token for the admin cookie.
 */
export function createAdminSessionToken(expiresAt: number): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const expiry = String(expiresAt);
  const signature = createHmac('sha256', secret).update(expiry).digest('hex');
  return `${expiry}.${signature}`;
}

/**
 * Verifies whether the incoming request contains a valid, unexpired admin session token.
 */
export function isAdminRequest(request: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  const separator = token.indexOf('.');
  if (separator <= 0) return false;

  const expiryText = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiry = Number(expiryText);

  // Validate expiry
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now()) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac('sha256', secret).update(expiryText).digest();
  const provided = Buffer.from(signature, 'hex');

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

// In-memory sliding window rate limiter for login attempts
interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}

const loginRateLimits = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(clientIp: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimits.get(clientIp);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockoutUntil > now) {
    const remaining = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: remaining };
  }

  return { allowed: true };
}

export function recordLoginAttempt(clientIp: string, success: boolean): void {
  const now = Date.now();
  const record = loginRateLimits.get(clientIp) || { attempts: 0, lockoutUntil: 0 };

  if (success) {
    loginRateLimits.delete(clientIp);
    return;
  }

  record.attempts += 1;
  // If 5 or more failed attempts, lockout for 15 minutes
  if (record.attempts >= 5) {
    record.lockoutUntil = now + 15 * 60 * 1000;
  }
  loginRateLimits.set(clientIp, record);
}
