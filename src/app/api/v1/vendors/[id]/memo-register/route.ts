import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { computePayable } from '@/domain/touchCalc';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id: wholesalerId } = await params;

    // 1. Fetch latest spot rates to compute live open exposure value
    const latestRate = await db.rateSnapshot.findFirst({
      orderBy: { effectiveAt: 'desc' },
    });
    const goldRatePaise = latestRate?.gold24Paise ?? 700_000n;
    const silverRatePaise = latestRate?.silver999Paise ?? 85_000n;

    // 2. Fetch all memos and lines for this wholesaler
    const memos = await db.memoIn.findMany({
      where: { wholesalerVendorId: wholesalerId },
      include: { lines: true },
    });

    let convertedCount = 0;
    let returnedCount = 0;
    let lostCount = 0;
    let totalMemoValuePaise = 0n;
    const openLines: any[] = [];

    for (const memo of memos) {
      for (const line of memo.lines) {
        if (line.status === 'SOLD') {
          convertedCount++;
        } else if (line.status === 'RETURNED') {
          returnedCount++;
        } else if (line.status === 'LOST') {
          lostCount++;
        } else {
          // Open or on-hold
          const ratePaise = line.metal === 'GOLD' ? goldRatePaise : silverRatePaise;
          const estPayable = computePayable(line.netMg, line.touchPpt, ratePaise);
          totalMemoValuePaise += estPayable;

          openLines.push({
            id: line.id,
            memoId: memo.id,
            shopMemoNo: memo.shopMemoNo,
            receivedOn: memo.receivedOn,
            returnByDate: memo.returnByDate,
            category: line.category,
            metal: line.metal,
            netMg: line.netMg,
            touchPpt: line.touchPpt,
            status: line.status,
            estimatedPayablePaise: estPayable.toString(),
            heldForCustomerId: line.heldForCustomerId,
          });
        }
      }
    }

    // Default exposure limit ₹10,00,000 (100,000,000 paise)
    const exposureLimitPaise = 100_000_000n;
    const exposureExceeded = totalMemoValuePaise > exposureLimitPaise;

    return NextResponse.json({
      ok: true,
      data: {
        wholesalerId,
        openLines,
        convertedCount,
        returnedCount,
        lostCount,
        openCount: openLines.length,
        totalMemoValuePaise: totalMemoValuePaise.toString(),
        exposureLimitPaise: exposureLimitPaise.toString(),
        exposureExceeded,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch memo register' }, { status: 500 });
  }
}
