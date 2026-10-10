import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { paiseToRupees } from '@/domain/money';
import { mgToGrams } from '@/domain/weight';
import { computeRepledgeRowFigures } from '@/domain/repledge/rowFigures';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const financierRatePm = parseFloat(searchParams.get('financierRate') || '1.25');

    if (!query.trim()) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const q = query.trim().toLowerCase();

    // Find all currently active repledged girvi IDs to prevent duplicate repledging
    const activeLinks = await db.repledgeLink.findMany({
      where: {
        loan: { status: 'ACTIVE' },
        returnedOn: null,
      },
      select: { girviId: true },
    });
    const activeRepledgedGirviIds = new Set(activeLinks.map((l) => l.girviId));

    const loans = await db.girviLoan.findMany({
      where: {
        status: { in: ['ACTIVE', 'PARTIAL'] },
        OR: [
          { loanNo: { contains: q } },
          { customer: { name: { contains: q } } },
          { customer: { phone: { contains: q } } },
          { items: { some: { ornamentType: { contains: q } } } },
        ],
      },
      include: {
        customer: true,
        items: true,
      },
      take: 25,
    });

    // Filter out actively repledged loans
    const availableLoans = loans.filter((l) => !activeRepledgedGirviIds.has(l.id));

    const results = availableLoans.map((l) => {
      const principalRupees = paiseToRupees(l.principalPaise);
      const customerRatePm = Number(l.interestRatePerMonthPct) || 1.5;
      const offeredRupees = Math.round(principalRupees * 0.75); // default offered 75%

      const totalGrossGrams = l.items.reduce((acc, it) => acc + mgToGrams(it.grossWeightMg), 0);
      const totalNetGrams = l.items.reduce((acc, it) => acc + mgToGrams(it.netWeightMg), 0);
      const totalValuationRupees = l.items.reduce((acc, it) => acc + paiseToRupees(it.valuationPaise), 0) || principalRupees * 1.4;

      const figures = computeRepledgeRowFigures({
        customerPrincipalPaise: l.principalPaise,
        customerRatePerMonthPct: customerRatePm,
        offeredPaise: BigInt(offeredRupees * 100),
        vendorRatePerMonthPct: financierRatePm,
        metalValuePaise: BigInt(totalValuationRupees * 100),
      });

      return {
        id: l.id,
        loanNo: l.loanNo,
        customerId: l.customerId,
        customerName: l.customer?.name || 'Unknown',
        customerPhone: l.customer?.phone || '',
        customerRelation: l.customer?.relationName ? `${l.customer.relationType}: ${l.customer.relationName}` : '',
        date: l.date.toISOString().split('T')[0],
        dueDate: l.dueDate ? l.dueDate.toISOString().split('T')[0] : null,
        principalRupees,
        customerRatePm,
        offeredRupees,
        vendorRatePm: financierRatePm,
        rateGapPpPm: figures.rateGapPpPm,
        rupeeSpreadMonthly: paiseToRupees(figures.rupeeSpreadMonthlyPaise),
        ownCapitalRupees: paiseToRupees(figures.ownCapitalPaise),
        ltvPct: Math.round(figures.ltvPct),
        isLosingMoney: figures.isLosingMoney,
        totalGrossGrams,
        totalNetGrams,
        totalValuationRupees,
        status: l.status,
        itemCount: l.items.length,
        articlesSummary: l.items.map((i) => i.ornamentType).join(', '),
        items: l.items.map((i) => ({
          id: i.id,
          ornamentType: i.ornamentType,
          grossWeightGrams: mgToGrams(i.grossWeightMg),
          netWeightGrams: mgToGrams(i.netWeightMg),
          valuationRupees: paiseToRupees(i.valuationPaise),
        })),
      };
    });

    return NextResponse.json({ ok: true, data: results });
  } catch (error: any) {
    console.error('Form search error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Search failed' }, { status: 500 });
  }
}
