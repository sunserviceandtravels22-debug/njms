import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { bulkSettleQueue } from '@/server/services/settlementQueue';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bulkSettleSchema = z.object({
  lotIds: z.array(z.string()).min(1),
  settlementRatePaisePerGram: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  reason: z.string().optional(),
  overrideVarianceWarning: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = bulkSettleSchema.parse(body);

    const settled = await bulkSettleQueue(parsed, user.id);

    const serialized = settled.map((l) => ({
      ...l,
      provisionalRatePaise: l.provisionalRatePaise.toString(),
      provisionalValuePaise: l.provisionalValuePaise.toString(),
      settledRatePaisePerGram: l.settledRatePaisePerGram?.toString() ?? null,
    }));

    return NextResponse.json({ ok: true, data: serialized });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Bulk settlement failed' }, { status: 400 });
  }
}
