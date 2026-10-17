import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'mep_admin_session';
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_SECRET = 'mep2026-admin-session-signing-secret-static-ready-key-32chars';

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || '2554';
}

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || DEFAULT_SECRET;
}

export function createAdminSessionToken(expiresAt: number): string {
  const secret = getAdminSecret();
  const expiry = String(expiresAt);
  const signature = createHmac('sha256', secret).update(expiry).digest('hex');
  return `${expiry}.${signature}`;
}

export function isAdminRequest(request: NextRequest): boolean {
  const secret = getAdminSecret();
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
