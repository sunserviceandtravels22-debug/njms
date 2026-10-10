import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Metal, GirviStatus, Direction, PayRefType, FlowKind, PayMode, CustomerTag, RelationType } from '@prisma/client';
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

        // Extract defect if stored in ornamentType format "Ring [Defect: Broken Clasp]"
        let defectType = 'None';
        let cleanName = i.ornamentType;
        const defectMatch = i.ornamentType.match(/\[Defect:\s*([^\]]+)\]/i);
        if (defectMatch) {
          defectType = defectMatch[1].trim();
          cleanName = i.ornamentType.replace(/\[Defect:\s*[^\]]+\]/i, '').trim();
        }

        return {
          id: i.id,
          ornamentType: cleanName,
          rawOrnamentType: i.ornamentType,
          defectType,
          metal: i.metal,
          purity: i.purity,
          grossWeightGrams: mgToGrams(i.grossWeightMg),
          stoneWeightGrams: mgToGrams(i.stoneWeightMg),
          netWeightGrams: mgToGrams(i.netWeightMg),
          valuationRupees: paiseToRupees(i.valuationPaise),
          locationId: i.locationId,
          locationName: i.location?.name || 'Main Safe Locker',
        };
      });

      return {
        id: l.id,
        loanNo: l.loanNo,
        customerId: l.customerId,
        customerName: l.customer?.name || 'Unknown',
        customerPhone: l.customer?.phone || '',
        customerRelation: l.customer?.relationName ? `${l.customer.relationType}: ${l.customer.relationName}` : '',
        customerCity: l.customer?.city || 'Local',
        date: l.date.toISOString().split('T')[0],
        dueDate: l.dueDate ? l.dueDate.toISOString().split('T')[0] : null,
        principalRupees: paiseToRupees(l.principalPaise),
        principalPaise: l.principalPaise.toString(),
        interestRatePerMonthPct: Number(l.interestRatePerMonthPct),
        status: l.status,
        notes: l.notes || '',
        totalGrossWeightGrams: mgToGrams(totalGrossWeightMg),
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
      customer,
      principalRupees,
      interestRatePerMonthPct = 1.5,
      loanDate,
      dueDate,
      items = [],
      defaultLocationId,
      notes,
    } = body;

    const pRupees = parseFloat(principalRupees);
    if (!pRupees || pRupees <= 0) {
      return NextResponse.json({ ok: false, error: 'Principal loan amount in Rupees (₹) is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'At least one ornament item is required' }, { status: 400 });
    }

    // Resolve or create Customer with complete KYC
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customer) {
      const cleanPhone = (customer.phone || '').trim();
      if (!cleanPhone) {
        return NextResponse.json({ ok: false, error: 'Customer mobile phone is required' }, { status: 400 });
      }

      let existing = await db.customer.findFirst({ where: { phone: cleanPhone } });
      if (!existing) {
        existing = await db.customer.create({
          data: {
            name: (customer.name || 'Girvi Client').trim(),
            nameHindi: customer.nameHindi?.trim() || null,
            phone: cleanPhone,
            altPhone: customer.altPhone?.trim() || null,
            relationType: (customer.relationType as RelationType) || RelationType.FATHER,
            relationName: customer.relationName?.trim() || null,
            address: customer.address?.trim() || null,
            city: customer.city?.trim() || 'Local',
            pincode: customer.pincode?.trim() || null,
            identityDocType: customer.identityDocType?.trim() || 'Aadhaar Card',
            identityDocNumber: customer.identityDocNumber?.trim() || null,
            tag: CustomerTag.STANDARD,
            createdById: user.id,
          },
        });
      }
      resolvedCustomerId = existing.id;
    }

    if (!resolvedCustomerId) {
      return NextResponse.json({ ok: false, error: 'Customer is required' }, { status: 400 });
    }

    const principalPaise = rupeesToPaise(pRupees);
    const lDate = loanDate ? new Date(loanDate) : new Date();
    const generatedLoanNo = `GIR-${Date.now().toString().slice(-6)}`;

    // Resolve default Vault Location
    let targetLocationId = defaultLocationId;
    if (!targetLocationId) {
      const vaultLoc = await db.storageLocation.findFirst({ where: { type: 'VAULT', active: true } });
      targetLocationId = vaultLoc?.id || null;
    }

    const [loan, payment] = await db.$transaction(async (tx) => {
      // 1. Create GirviLoan
      const newLoan = await tx.girviLoan.create({
        data: {
          loanNo: generatedLoanNo,
          customerId: resolvedCustomerId,
          date: lDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          principalPaise,
          interestRatePerMonthPct: parseFloat(interestRatePerMonthPct) || 1.5,
          status: GirviStatus.ACTIVE,
          notes: notes?.trim() || null,
          createdById: user.id,
        },
      });

      // 2. Create GirviItems with Grams -> Mg & defect annotations
      for (const item of items) {
        const grossMg = gramsToMg(parseFloat(item.grossWeightGrams) || 0);
        const stoneMg = gramsToMg(parseFloat(item.stoneWeightGrams) || 0);
        const netMg = Math.max(0, grossMg - stoneMg);
        const valuationPaise = rupeesToPaise(parseFloat(item.valuationRupees) || 0);

        let ornamentTitle = (item.ornamentType || 'Gold Ornament').trim();
        if (item.defectType && item.defectType !== 'None') {
          ornamentTitle = `${ornamentTitle} [Defect: ${item.defectType}]`;
        }

        await tx.girviItem.create({
          data: {
            girviLoanId: newLoan.id,
            ornamentType: ornamentTitle,
            metal: (item.metal as Metal) || Metal.GOLD,
            purity: item.purity || '22K',
            grossWeightMg: grossMg,
            stoneWeightMg: stoneMg,
            netWeightMg: netMg,
            valuationPaise,
            locationId: item.locationId || targetLocationId,
          },
        });
      }

      // 3. Post Cash Payout in Payment Ledger
      const p = await tx.payment.create({
        data: {
          businessDate: lDate,
          refType: PayRefType.GIRVI,
          refId: newLoan.loanNo,
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
