import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Metal, GirviStatus, Direction, PayRefType, FlowKind, PayMode } from '@prisma/client';
import { gramsToMg, mgToGrams } from '@/domain/weight';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') as GirviStatus | 'ALL' | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status;

    if (search) {
      whereClause.OR = [
        { loanNo: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [loans, total] = await Promise.all([
      db.girviLoan.findMany({
        where: whereClause,
        include: {
          customer: true,
          items: { include: { location: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.girviLoan.count({ where: whereClause }),
    ]);

    const formatted = loans.map((l) => {
      let totalGrossWeightMg = 0;
      let totalNetWeightMg = 0;
      let totalValuationPaise = BigInt(0);

      const itemsFormatted = l.items.map((i) => {
        totalGrossWeightMg += i.grossWeightMg;
        totalNetWeightMg += i.netWeightMg;
        totalValuationPaise += i.valuationPaise;

        return {
          id: i.id,
          ornamentType: i.ornamentType,
          metal: i.metal,
          purity: i.purity,
          grossWeightGrams: mgToGrams(i.grossWeightMg), // Displayed in Grams (g)
          stoneWeightGrams: mgToGrams(i.stoneWeightMg),
          netWeightGrams: mgToGrams(i.netWeightMg),
          valuationRupees: paiseToRupees(i.valuationPaise), // Displayed in Rupees (₹)
          locationName: i.location?.name || 'Vault',
        };
      });

      return {
        id: l.id,
        loanNo: l.loanNo,
        customerId: l.customerId,
        customerName: l.customer?.name || 'Unknown',
        customerPhone: l.customer?.phone || '',
        date: l.date.toISOString().split('T')[0],
        dueDate: l.dueDate ? l.dueDate.toISOString().split('T')[0] : null,
        principalRupees: paiseToRupees(l.principalPaise), // Displayed in Rupees (₹)
        principalPaise: l.principalPaise.toString(),
        interestRatePerMonthPct: Number(l.interestRatePerMonthPct),
        status: l.status,
        totalGrossWeightGrams: mgToGrams(totalGrossWeightMg), // Displayed in Grams (g)
        totalNetWeightGrams: mgToGrams(totalNetWeightMg),
        totalValuationRupees: paiseToRupees(totalValuationPaise),
        items: itemsFormatted,
        createdAt: l.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      data: formatted,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Fetch girvi loans error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch girvi loans' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId,
      principalRupees,
      interestRatePerMonthPct = 1.5,
      loanDate,
      dueDate,
      items = [],
      notes,
    } = body;

    if (!customerId) {
      return NextResponse.json({ ok: false, error: 'Customer is required' }, { status: 400 });
    }

    const pRupees = parseFloat(principalRupees);
    if (!pRupees || pRupees <= 0) {
      return NextResponse.json({ ok: false, error: 'Principal loan amount in Rupees (₹) is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'At least one ornament item is required' }, { status: 400 });
    }

    const principalPaise = rupeesToPaise(pRupees);
    const lDate = loanDate ? new Date(loanDate) : new Date();
    const generatedLoanNo = `GIR-${Date.now().toString().slice(-6)}`;

    // Resolve default Vault Location
    const vaultLoc = await db.storageLocation.findFirst({ where: { type: 'VAULT' } });

    const [loan, payment] = await db.$transaction(async (tx) => {
      // 1. Create GirviLoan
      const newLoan = await tx.girviLoan.create({
        data: {
          loanNo: generatedLoanNo,
          customerId,
          date: lDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          principalPaise,
          interestRatePerMonthPct: parseFloat(interestRatePerMonthPct) || 1.5,
          status: GirviStatus.ACTIVE,
          notes: notes?.trim() || null,
          createdById: user.id,
        },
      });

      // 2. Create GirviItems with Grams -> Mg & Rupees -> Paise conversion
      for (const item of items) {
        const grossMg = gramsToMg(parseFloat(item.grossWeightGrams) || 0);
        const stoneMg = gramsToMg(parseFloat(item.stoneWeightGrams) || 0);
        const netMg = Math.max(0, grossMg - stoneMg);
        const valuationPaise = rupeesToPaise(parseFloat(item.valuationRupees) || 0);

        await tx.girviItem.create({
          data: {
            girviLoanId: newLoan.id,
            ornamentType: item.ornamentType?.trim() || 'Gold Ornament',
            metal: (item.metal as Metal) || Metal.GOLD,
            purity: item.purity || '22K',
            grossWeightMg: grossMg,
            stoneWeightMg: stoneMg,
            netWeightMg: netMg,
            valuationPaise,
            locationId: vaultLoc?.id || null,
          },
        });
      }

      // 3. Post Cash Payout Flow in Payment Ledger (Money given to Customer)
      const p = await tx.payment.create({
        data: {
          businessDate: lDate,
          refType: PayRefType.GIRVI,
          refId: newLoan.id,
          direction: Direction.OUT,
          flowKind: FlowKind.GIRVI_LOAN_OUT,
          mode: PayMode.CASH,
          amountPaise: principalPaise,
          createdById: user.id,
        },
      });

      return [newLoan, p];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_GIRVI_LOAN',
      entity: 'GirviLoan',
      entityId: loan.id,
      after: {
        loanNo: loan.loanNo,
        principalRupees: pRupees,
        itemsCount: items.length,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...loan,
        principalPaise: loan.principalPaise.toString(),
        principalRupees: pRupees,
        date: loan.date.toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('Create girvi loan error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create girvi loan' }, { status: 500 });
  }
}
