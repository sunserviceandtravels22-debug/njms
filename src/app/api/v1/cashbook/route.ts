import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { calculateBalanceChain, LedgerPaymentItem } from '@/domain/cash/balanceChain';
import { PayMode, Direction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const todayStr = new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || todayStr;
    const endDate = searchParams.get('endDate') || todayStr;
    const mode = searchParams.get('mode') as PayMode | 'ALL' | null;
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // 1. Calculate historical opening balance before startDate
    const priorPayments = await db.payment.findMany({
      where: {
        businessDate: { lt: new Date(startDate) },
        reversedOfId: null,
      },
      select: {
        direction: true,
        mode: true,
        amountPaise: true,
      },
    });

    let initialOpeningPaise = BigInt(0);
    for (const p of priorPayments) {
      if (mode && mode !== 'ALL' && p.mode !== mode) continue;
      if (p.direction === Direction.IN) {
        initialOpeningPaise += p.amountPaise;
      } else {
        initialOpeningPaise -= p.amountPaise;
      }
    }

    // 2. Fetch payments within date range
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    endObj.setHours(23, 59, 59, 999);

    const whereRange: any = {
      businessDate: {
        gte: startObj,
        lte: endObj,
      },
    };

    if (mode && mode !== 'ALL') {
      whereRange.mode = mode;
    }

    if (search) {
      whereRange.OR = [
        { utr: { contains: search } },
        { categoryId: { contains: search } },
      ];
    }

    const [payments, totalCount] = await Promise.all([
      db.payment.findMany({
        where: whereRange,
        orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.payment.count({ where: whereRange }),
    ]);

    // Fetch cash categories mapping for names
    const categories = await db.cashCategory.findMany();
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Batch resolve party names for ref types
    const saleRefs = payments.filter((p) => p.refType === 'SALE').map((p) => p.refId);
    const girviRefs = payments.filter((p) => p.refType === 'GIRVI').map((p) => p.refId);
    const repledgeRefs = payments.filter((p) => p.refType === 'REPLEDGE').map((p) => p.refId);

    const [sales, girvis, repledges] = await Promise.all([
      saleRefs.length > 0
        ? db.sale.findMany({
            where: { OR: [{ invoiceNo: { in: saleRefs } }, { id: { in: saleRefs } }] },
            include: { customer: true },
          })
        : [],
      girviRefs.length > 0
        ? db.girviLoan.findMany({
            where: { OR: [{ id: { in: girviRefs } }, { loanNo: { in: girviRefs } }] },
            include: { customer: true },
          })
        : [],
      repledgeRefs.length > 0
        ? db.repledgeLoan.findMany({
            where: { OR: [{ id: { in: repledgeRefs } }, { loanNo: { in: repledgeRefs } }] },
          })
        : [],
    ]);

    const partyMap = new Map<string, string>();
    for (const s of sales) {
      const name = s.customer?.name || 'Walk-in Client';
      partyMap.set(s.invoiceNo, name);
      partyMap.set(s.id, name);
    }
    for (const g of girvis) {
      const name = g.customer?.name || 'Girvi Client';
      partyMap.set(g.id, name);
      partyMap.set(g.loanNo, name);
    }
    for (const r of repledges) {
      partyMap.set(r.id, `Financier (${r.loanNo})`);
      partyMap.set(r.loanNo, `Financier (${r.loanNo})`);
    }

    // 3. Transform payments to LedgerPaymentItem format for balance chain engine
    const ledgerItems: LedgerPaymentItem[] = payments.map((p) => ({
      id: p.id,
      businessDate: p.businessDate.toISOString().split('T')[0],
      direction: p.direction === Direction.IN ? 'IN' : 'OUT',
      mode: p.mode,
      amountPaise: p.amountPaise,
      fundAccountId: p.fundAccountId,
      reversedOfId: p.reversedOfId,
    }));

    // 4. Run gap-free balance chain calculator
    const balanceChain = calculateBalanceChain({
      startDate,
      endDate,
      initialOpeningPaise,
      payments: ledgerItems,
    });

    // 5. Calculate range summary totals
    let rangeInPaise = BigInt(0);
    let rangeOutPaise = BigInt(0);
    let rangeCashInPaise = BigInt(0);
    let rangeCashOutPaise = BigInt(0);
    let rangeUpiInPaise = BigInt(0);
    let rangeUpiOutPaise = BigInt(0);

    for (const day of balanceChain) {
      rangeInPaise += day.inPaise;
      rangeOutPaise += day.outPaise;
      rangeCashInPaise += day.cashInPaise;
      rangeCashOutPaise += day.cashOutPaise;
      rangeUpiInPaise += day.upiBankInPaise;
      rangeUpiOutPaise += day.upiBankOutPaise;
    }

    const openingPaise = balanceChain.length > 0 ? balanceChain[0].openingPaise : initialOpeningPaise;
    const closingPaise = balanceChain.length > 0 ? balanceChain[balanceChain.length - 1].closingPaise : initialOpeningPaise;
    const netFlowPaise = rangeInPaise - rangeOutPaise;

    // 6. Format payments list for client response
    const formattedPayments = payments.map((p) => {
      const dt = new Date(p.createdAt);
      const timeString = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const party = partyMap.get(p.refId) || (p.refType === 'SALE' ? 'Walk-in Client' : p.refType === 'GIRVI' ? 'Girvi Client' : 'Direct Transaction');

      return {
        id: p.id,
        businessDate: p.businessDate.toISOString().split('T')[0],
        timeString,
        partyName: party,
        direction: p.direction,
        refType: p.refType,
        refId: p.refId,
        flowKind: p.flowKind,
        mode: p.mode,
        amountPaise: p.amountPaise.toString(),
        categoryId: p.categoryId,
        categoryName: p.categoryId ? categoryMap.get(p.categoryId) || 'Uncategorized' : 'Uncategorized',
        fundAccountId: p.fundAccountId,
        utr: p.utr || null,
        reversedOfId: p.reversedOfId || null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          startDate,
          endDate,
          openingPaise: openingPaise.toString(),
          closingPaise: closingPaise.toString(),
          rangeInPaise: rangeInPaise.toString(),
          rangeOutPaise: rangeOutPaise.toString(),
          netFlowPaise: netFlowPaise.toString(),
          cashInPaise: rangeCashInPaise.toString(),
          cashOutPaise: rangeCashOutPaise.toString(),
          upiInPaise: rangeUpiInPaise.toString(),
          upiOutPaise: rangeUpiOutPaise.toString(),
        },
        balanceChain: balanceChain.map((b) => ({
          ...b,
          openingPaise: b.openingPaise.toString(),
          inPaise: b.inPaise.toString(),
          outPaise: b.outPaise.toString(),
          closingPaise: b.closingPaise.toString(),
          cashInPaise: b.cashInPaise.toString(),
          cashOutPaise: b.cashOutPaise.toString(),
          upiBankInPaise: b.upiBankInPaise.toString(),
          upiBankOutPaise: b.upiBankOutPaise.toString(),
        })),
        payments: formattedPayments,
      },
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Cashbook GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch cashbook data' }, { status: 500 });
  }
}
