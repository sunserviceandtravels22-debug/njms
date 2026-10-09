import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { paiseToRupees } from '@/domain/money';
import { mgToGrams } from '@/domain/weight';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const batches = await db.partialReleaseBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    const formattedCards = batches.map((b) => {
      const msWaiting = Date.now() - b.createdAt.getTime();
      const hoursWaiting = Math.floor(msWaiting / (1000 * 60 * 60));

      let waitingColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
      if (hoursWaiting >= 72) {
        waitingColor = 'text-rose-600 bg-rose-50 border-rose-200';
      } else if (hoursWaiting >= 24) {
        waitingColor = 'text-amber-600 bg-amber-50 border-amber-200';
      }

      return {
        id: b.id,
        girviId: b.girviId,
        batchNo: b.batchNo,
        state: b.state, // PAID_AWAITING_RELEASE | READY_TO_HAND_OVER | RELEASED
        lane: b.state === 'READY_TO_HAND_OVER' ? 'LANE_A_SHOP' : 'LANE_B_VENDOR',
        minPrincipalToPayRupees: paiseToRupees(b.minPrincipalToPayPaise),
        collectorName: b.collectorName || 'Customer',
        collectorRelation: b.collectorRelation || 'Self',
        hoursWaiting,
        waitingColor,
        createdAt: b.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, data: formattedCards });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Delivery queue fetch error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { batchId, newState, collectorName, collectorRelation } = body;

    if (!batchId || !newState) {
      return NextResponse.json({ ok: false, error: 'Missing batchId or newState' }, { status: 400 });
    }

    const updated = await db.partialReleaseBatch.update({
      where: { id: batchId },
      data: {
        state: newState,
        collectorName: collectorName || undefined,
        collectorRelation: collectorRelation || undefined,
        deliveredAt: newState === 'RELEASED' ? new Date() : undefined,
        deliveredById: newState === 'RELEASED' ? user.id : undefined,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Delivery queue update error' }, { status: 500 });
  }
}
