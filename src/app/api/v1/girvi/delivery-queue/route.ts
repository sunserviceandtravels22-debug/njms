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
      take: 50,
    });

    const girviIds = batches.map((b) => b.girviId);
    const loans = await db.girviLoan.findMany({
      where: { id: { in: girviIds } },
      include: {
        customer: true,
        items: true,
      },
    });
    const loanMap = new Map(loans.map((l) => [l.id, l]));

    // Also fetch overdue / maturing girvi loan reminders (due in next 3 days or already past due)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const overdueLoans = await db.girviLoan.findMany({
      where: {
        status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] },
        dueDate: { lte: threeDaysFromNow },
      },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const formattedReminders = overdueLoans.map((ol) => {
      const isPast = ol.dueDate ? ol.dueDate.getTime() < Date.now() : false;
      const daysDiff = ol.dueDate ? Math.round((ol.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id: ol.id,
        loanNo: ol.loanNo,
        customerName: ol.customer?.name || 'Customer',
        customerPhone: ol.customer?.phone || '',
        dueDate: ol.dueDate ? ol.dueDate.toISOString().split('T')[0] : null,
        principalRupees: paiseToRupees(ol.principalPaise),
        isPast,
        daysText: isPast ? `Overdue by ${Math.abs(daysDiff)}d` : `Due in ${daysDiff}d`,
      };
    });

    const formattedCards = batches.map((b) => {
      const msWaiting = Date.now() - b.createdAt.getTime();
      const hoursWaiting = Math.floor(msWaiting / (1000 * 60 * 60));
      const loan = loanMap.get(b.girviId);

      let waitingColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
      if (hoursWaiting >= 72) {
        waitingColor = 'text-rose-600 bg-rose-50 border-rose-200';
      } else if (hoursWaiting >= 24) {
        waitingColor = 'text-amber-600 bg-amber-50 border-amber-200';
      }

      const totalNetMg = loan?.items.reduce((sum: number, it: any) => sum + it.netWeightMg, 0) || 0;
      const eta = b.state === 'READY_TO_HAND_OVER'
        ? 'Ready at Shop Counter'
        : 'ETA ~30 mins from Safe Vault';

      return {
        id: b.id,
        girviId: b.girviId,
        loanNo: loan?.loanNo || b.batchNo,
        batchNo: b.batchNo,
        state: b.state, // PAID_AWAITING_RELEASE | READY_TO_HAND_OVER | RELEASED
        lane: b.state === 'READY_TO_HAND_OVER' ? 'LANE_A_SHOP' : 'LANE_B_VENDOR',
        minPrincipalToPayRupees: paiseToRupees(b.minPrincipalToPayPaise),
        collectorName: b.collectorName || loan?.customer?.name || 'Customer',
        collectorRelation: b.collectorRelation || 'Self',
        customerPhone: loan?.customer?.phone || '',
        totalNetWeightGrams: mgToGrams(totalNetMg),
        ornamentsCount: loan?.items.length || 0,
        eta,
        hoursWaiting,
        waitingColor,
        createdAt: b.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      data: formattedCards,
      reminders: formattedReminders,
    });
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
