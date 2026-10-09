import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { assertCapability } from '@/server/permissions';
import { verifyChain } from '@/server/services/activityLog';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    assertCapability(user.role, 'VIEW_ACTIVITY_LOG');

    const body = await req.json().catch(() => ({}));
    const fromId = body.fromId ? BigInt(body.fromId) : undefined;
    const toId = body.toId ? BigInt(body.toId) : undefined;

    const result = await verifyChain(fromId, toId);

    return NextResponse.json({
      ok: true,
      data: {
        valid: result.valid,
        brokenAtId: result.brokenAtId ? result.brokenAtId.toString() : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Chain verification failed' }, { status: 500 });
  }
}
