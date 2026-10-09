// Implements: FR-PLT-03 | Component: C-18 | Doc: 03_TECH §9, §10

import { NextResponse } from 'next/server';
import { getSessionUser, verifyPin } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';

export async function POST(request: Request) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { pin } = await request.json();
    if (!pin) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'PIN required' }, { status: 400 });
    }

    const valid = await verifyPin(currentUser.id, pin);

    if (valid) {
      await writeAuditLog({
        userId: currentUser.id,
        action: 'PIN_VERIFY_SUCCESS',
        entity: 'User',
        entityId: currentUser.id,
      });
      return NextResponse.json({ verified: true });
    } else {
      await writeAuditLog({
        userId: currentUser.id,
        action: 'PIN_VERIFY_FAILED',
        entity: 'User',
        entityId: currentUser.id,
      });
      return NextResponse.json({ verified: false, message: 'Incorrect PIN' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'PIN verification failed' }, { status: 500 });
  }
}
