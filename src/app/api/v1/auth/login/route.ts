// Implements: FR-PLT-02, FR-PLT-03 | Screen: S-01 | Doc: 03_TECH §9, §10

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/server/db';
import { createSession, verifyTotp } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const { username, password, totpCode } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Username and password required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { username } });

    if (!user || !user.active) {
      return NextResponse.json({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }, { status: 401 });
    }

    // Owner role TOTP check if enabled
    if (user.role === Role.OWNER && user.totpSecretEnc) {
      if (!totpCode) {
        return NextResponse.json({ code: '2FA_REQUIRED', message: '2FA code required for Owner role' }, { status: 402 });
      }
      const valid2fa = verifyTotp(user.totpSecretEnc, totpCode);
      if (!valid2fa) {
        return NextResponse.json({ code: 'INVALID_2FA', message: 'Invalid 2FA code' }, { status: 401 });
      }
    }

    const sessionToken = await createSession(user.id);

    await writeAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        lang: user.lang,
      },
      token: sessionToken,
    });
  } catch (error) {
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Login failed' }, { status: 500 });
  }
}
