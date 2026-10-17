import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'mep_admin_session';
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function createAdminSessionToken(expiresAt: number): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const expiry = String(expiresAt);
  const signature = createHmac('sha256', secret).update(expiry).digest('hex');
  return `${expiry}.${signature}`;
}

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
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now()) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac('sha256', secret).update(expiryText).digest();
  const provided = Buffer.from(signature, 'hex');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
