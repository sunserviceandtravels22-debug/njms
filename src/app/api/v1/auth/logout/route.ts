// Implements: FR-PLT-02 | Doc: 03_TECH §9

import { NextResponse } from 'next/server';
import { destroySession, getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await writeAuditLog({
      userId: user.id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: user.id,
    });
  }
  await destroySession();
  return NextResponse.json({ success: true });
}
