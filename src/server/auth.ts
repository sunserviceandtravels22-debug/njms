// Implements: FR-PLT-02, FR-PLT-03 | Doc: 03_TECH §7, §10

import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { db } from './db';
import { User, Role } from '@prisma/client';

const SESSION_COOKIE_NAME = 'njms_session';
const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 12; // 12 hours

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, device?: string, ip?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash,
      device: device || 'Web Browser',
      ip: ip || '127.0.0.1',
      expiresAt,
      lastSeenAt: new Date(),
    },
  });

  const cookieStore = cookies();
  // If APP_URL is http or explicitly set to non-secure, allow cookie over HTTP; otherwise secure in production
  const isExplicitHttp =
    (process.env.APP_URL && process.env.APP_URL.startsWith('http:')) ||
    (process.env.APP_BASE_URL && process.env.APP_BASE_URL.startsWith('http:')) ||
    process.env.COOKIE_SECURE === 'false';
  const isSecure = process.env.NODE_ENV === 'production' && !isExplicitHttp;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getSessionUser(): Promise<(User & { sessionToken: string }) | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  // Update last seen
  await db.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return { ...session.user, sessionToken: token };
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    await db.session.deleteMany({ where: { tokenHash } });
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.pinHash) return false;

  const pepper = process.env.PIN_PEPPER || '';
  return bcrypt.compare(pin + pepper, user.pinHash);
}

export function verifyTotp(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}
