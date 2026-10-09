import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { settleMemoLoss } from '@/server/services/memoIn';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const lossSchema = z.object({
  settlementRatePaisePerGram: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  reasonCode: z.string().min(1),
  note: z.string().optional(),
  insuranceClaimRef: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { lineId } = await params;
    const body = await req.json();
    const parsed = lossSchema.parse(body);

    const result = await settleMemoLoss(lineId, parsed, user.id);

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        settlementRatePaisePerGram: result.settlementRatePaisePerGram.toString(),
        payablePaise: result.payablePaise.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to settle loss' }, { status: 400 });
  }
}
