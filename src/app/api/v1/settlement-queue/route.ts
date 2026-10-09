import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { listQueuedSettlements } from '@/server/services/settlementQueue';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId') || undefined;

    const queuedLots = await listQueuedSettlements({ vendorId });

    const serialized = queuedLots.map((l) => ({
      ...l,
      provisionalRatePaise: l.provisionalRatePaise.toString(),
      provisionalValuePaise: l.provisionalValuePaise.toString(),
      settledRatePaisePerGram: l.settledRatePaisePerGram?.toString() ?? null,
    }));

    return NextResponse.json({ ok: true, data: serialized });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to list settlement queue' }, { status: 500 });
  }
}
