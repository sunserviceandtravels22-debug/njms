// Implements: FR-PLT-02, FR-PLT-03 | Doc: 03_TECH §9

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      lang: user.lang,
    },
  });
}
