import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import {
  RepledgeStatus,
  Direction,
  FlowKind,
  PayMode,
  PayRefType,
  LocationType,
  Metal,
  InterestType,
  RatePeriod,
} from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') as RepledgeStatus | 'ALL' | null;
    const sort = searchParams.get('sort') || 'createdAt:desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { loanNo: { contains: search } },
        { vendorRefNo: { contains: search } },
      ];
    }

    // Parse multi-level sorting e.g. "amount:desc,date:desc"
    const sortParts = sort.split(',').map((part) => {
      const [field, dir] = part.split(':');
      const direction = dir?.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (field === 'amount') return { principalPaise: direction };
      if (field === 'date') return { date: direction };
      return { createdAt: direction };
    });

    const [loans, total] = await Promise.all([
      db.repledgeLoan.findMany({
        where: whereClause,
        include: {
          links: true,
          events: true,
        },
        orderBy: sortParts as any,
        skip,
        take: limit,
      }),
      db.repledgeLoan.count({ where: whereClause }),
    ]);

    const formatted = loans.map((l) => {
      let totalGrossWeightMg = 0;
      let totalNetWeightMg = 0;

      for (const link of l.links) {
        totalNetWeightMg += link.weightNetMg;
        totalGrossWeightMg += link.weightNetMg; // Fallback estimate
      }

      // Financier monthly interest calculation from basis points (e.g. 150 bp = 1.5%)
      const financierRatePct = (l.rateBp || 150) / 100;
      const financierMonthlyInterestPaise =
        (l.principalPaise * BigInt(Math.round(financierRatePct * 100))) / BigInt(10000);

      return {
        id: l.id,
        loanNo: l.loanNo,
        vendorId: l.vendorId,
        vendorRefNo: l.vendorRefNo || null,
        principalPaise: l.principalPaise.toString(),
        metal: l.metal,
        interestType: l.interestType,
        rateBp: l.rateBp,
        ratePeriod: l.ratePeriod,
        repledgeDate: l.date ? l.date.toISOString().split('T')[0] : l.createdAt.toISOString().split('T')[0],
        dueDate: l.dueDate ? l.dueDate.toISOString().split('T')[0] : null,
        status: l.status,
        notes: l.notes || null,
        totalGrossWeightMg,
        totalNetWeightMg,
        financierMonthlyInterestPaise: financierMonthlyInterestPaise.toString(),
        linkedLoansCount: l.links.length,
        createdAt: l.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      data: formatted,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Fetch repledge loans error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch repledge loans' }, { status: 500 });
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
      vendorId,
      loanNo,
      vendorRefNo,
      principalPaise,
      metal = 'GOLD',
      interestType = 'SIMPLE',
      rateBp = 150, // 1.5% per month
      ratePeriod = 'MONTH',
      repledgeDate,
      dueDate,
      girviId,
      itemIds = [],
      weightNetMg = 0,
      weightFineMg = 0,
      valuePaise = 0,
      fundAccountId,
      paymentMode = 'BANK',
      notes,
    } = body;

    if (!vendorId) {
      return NextResponse.json({ ok: false, error: 'Vendor/Financier ID is required' }, { status: 400 });
    }

    const principal = BigInt(principalPaise || 0);
    if (principal <= BigInt(0)) {
      return NextResponse.json({ ok: false, error: 'Re-pledge principal amount must be greater than zero' }, { status: 400 });
    }

    // Resolve storage location for re-pledged vendor items ("VENDOR")
    let vendorLocation = await db.storageLocation.findFirst({
      where: { type: LocationType.VENDOR },
    });
    if (!vendorLocation) {
      vendorLocation = await db.storageLocation.create({
        data: {
          name: 'With Financier/Vendor',
          type: LocationType.VENDOR,
        },
      });
    }

    const repDate = repledgeDate ? new Date(repledgeDate) : new Date();
    const generatedLoanNo = loanNo?.trim() || `RPL-${Date.now().toString().slice(-6)}`;

    const [repledgeLoan, payment] = await db.$transaction(async (tx) => {
      // 1. Create RepledgeLoan
      const loan = await tx.repledgeLoan.create({
        data: {
          loanNo: generatedLoanNo,
          vendorId: vendorId,
          vendorRefNo: vendorRefNo?.trim() || null,
          principalPaise: principal,
          metal: (metal as Metal) || Metal.GOLD,
          interestType: (interestType as InterestType) || InterestType.SIMPLE,
          rateBp: rateBp || 150,
          ratePeriod: (ratePeriod as RatePeriod) || RatePeriod.MONTH,
          date: repDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: RepledgeStatus.ACTIVE,
          notes: notes?.trim() || null,
          createdById: user.id,
        },
      });

      // 2. Link Girvi Loan & Custody
      if (girviId) {
        await tx.repledgeLink.create({
          data: {
            loanId: loan.id,
            girviId: girviId,
            itemIds: itemIds,
            weightNetMg: weightNetMg || 0,
            weightFineMg: weightFineMg || 0,
            valuePaise: BigInt(valuePaise || 0),
            offeredPaise: principal,
            allocatedPrincipalPaise: principal,
            allocationBasis: 'MANUAL',
            status: 'ACTIVE',
          },
        });

        // Log movement to VENDOR
        await tx.custodyMovement.create({
          data: {
            girviId: girviId,
            itemIds: itemIds,
            toLocationId: vendorLocation!.id,
            businessDate: repDate,
            reasonCode: 'REPLEDGE_OUT',
            byUserId: user.id,
            note: `Re-pledged to Vendor ID: ${vendorId}`,
          },
        });
      }

      // 3. Post Financial Cash In flow (Money received from Financier)
      const p = await tx.payment.create({
        data: {
          businessDate: repDate,
          refType: PayRefType.REPLEDGE,
          refId: loan.id,
          direction: Direction.IN,
          flowKind: FlowKind.REPLEDGE_LOAN_IN,
          mode: (paymentMode as PayMode) || PayMode.BANK,
          amountPaise: principal,
          fundAccountId: fundAccountId || null,
          createdById: user.id,
        },
      });

      return [loan, p];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_REPLEDGE_LOAN',
      entity: 'RepledgeLoan',
      entityId: repledgeLoan.id,
      after: {
        id: repledgeLoan.id,
        loanNo: repledgeLoan.loanNo,
        principalPaise: repledgeLoan.principalPaise.toString(),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...repledgeLoan,
        principalPaise: repledgeLoan.principalPaise.toString(),
        date: repledgeLoan.date ? repledgeLoan.date.toISOString().split('T')[0] : null,
      },
    });
  } catch (error: any) {
    console.error('Create repledge loan error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create repledge loan' }, { status: 500 });
  }
}
