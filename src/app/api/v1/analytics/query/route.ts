import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { Direction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    // 1. Total Customers Count
    const totalCustomers = await db.customer.count();

    // 2. Total Payments In & Out
    const paymentsSummary = await db.payment.groupBy({
      by: ['direction'],
      where: { reversedOfId: null },
      _sum: { amountPaise: true },
    });

    let totalInPaise = BigInt(0);
    let totalOutPaise = BigInt(0);
    for (const p of paymentsSummary) {
      if (p.direction === Direction.IN) totalInPaise = p._sum.amountPaise || BigInt(0);
      if (p.direction === Direction.OUT) totalOutPaise = p._sum.amountPaise || BigInt(0);
    }

    // 3. Active Re-pledge Principal
    const repledgeSummary = await db.repledgeLoan.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { principalPaise: true },
      _count: { _all: true },
    });

    // 4. Storage Location distribution stats
    const locations = await db.storageLocation.findMany({
      where: { active: true },
    });

    return NextResponse.json({
      ok: true,
      data: {
        kpis: {
          totalCustomers,
          totalInPaise: totalInPaise.toString(),
          totalOutPaise: totalOutPaise.toString(),
          netCashPaise: (totalInPaise - totalOutPaise).toString(),
          activeRepledgeLoans: repledgeSummary._count._all,
          activeRepledgePrincipalPaise: (repledgeSummary._sum.principalPaise || BigInt(0)).toString(),
        },
        locations: locations.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
        })),
      },
    });
  } catch (error: any) {
    console.error('Analytics query error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to query analytics data' }, { status: 500 });
  }
}
