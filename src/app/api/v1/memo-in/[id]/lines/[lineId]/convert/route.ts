import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { convertMemoToSale } from '@/server/services/memoIn';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const convertMemoSaleSchema = z.object({
  customerId: z.string().optional(),
  retailRatePaisePerGram: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  makingPercentBp: z.number().int().default(1200),
  gstRateBp: z.number().int().default(300),
  rateMode: z.enum(['LOCKED_AT_SALE', 'QUEUED_FLOATING']).default('LOCKED_AT_SALE'),
  settlementRatePaisePerGram: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)).optional(),
  idempotencyKey: z.string().default(() => `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
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
    const parsed = convertMemoSaleSchema.parse(body);

    const result = await convertMemoToSale(lineId, parsed, user.id);

    return NextResponse.json({
      ok: true,
      data: {
        saleId: result.sale.id,
        invoiceNo: result.sale.invoiceNo,
        purchaseLotId: result.purchaseLot.id,
        customerTotal: result.conversion.customerSale.totalPaise.toString(),
        payablePaise: result.conversion.vendorPayable.payablePaise?.toString() ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to convert memo line' }, { status: 400 });
  }
}
