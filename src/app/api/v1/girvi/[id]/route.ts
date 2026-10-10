import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Metal, GirviStatus } from '@prisma/client';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';
import { gramsToMg, mgToGrams } from '@/domain/weight';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const loan = await db.girviLoan.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: { location: true },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ ok: false, error: 'Girvi loan not found' }, { status: 404 });
    }

    // Fetch payments associated with this loan
    const payments = await db.payment.findMany({
      where: { refType: 'GIRVI', refId: loan.id },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch repledges associated with this loan
    const repledgeLinks = await db.repledgeLink.findMany({
      where: { girviId: loan.id },
      include: { loan: true },
    });

    let totalGrossMg = 0;
    let totalNetMg = 0;
    let totalValuationPaise = BigInt(0);

    const itemsFormatted = loan.items.map((i) => {
      totalGrossMg += i.grossWeightMg;
      totalNetMg += i.netWeightMg;
      totalValuationPaise += i.valuationPaise;

      return {
        id: i.id,
        ornamentType: i.ornamentType,
        metal: i.metal,
        purity: i.purity,
        grossWeightGrams: mgToGrams(i.grossWeightMg),
        stoneWeightGrams: mgToGrams(i.stoneWeightMg),
        netWeightGrams: mgToGrams(i.netWeightMg),
        valuationRupees: paiseToRupees(i.valuationPaise),
        locationId: i.locationId,
        locationName: i.location?.name || 'Main Vault',
      };
    });

    // Calculate accrued interest estimate
    const loanDate = new Date(loan.date);
    const now = new Date();
    const monthsElapsed = Math.max(1, (now.getFullYear() - loanDate.getFullYear()) * 12 + (now.getMonth() - loanDate.getMonth()));
    const principalRupees = paiseToRupees(loan.principalPaise);
    const monthlyRate = Number(loan.interestRatePerMonthPct);
    const estimatedInterestRupees = Math.round(principalRupees * (monthlyRate / 100) * monthsElapsed);

    return NextResponse.json({
      ok: true,
      data: {
        id: loan.id,
        loanNo: loan.loanNo,
        date: loan.date.toISOString().split('T')[0],
        dueDate: loan.dueDate ? loan.dueDate.toISOString().split('T')[0] : null,
        principalRupees,
        principalPaise: loan.principalPaise.toString(),
        interestRatePerMonthPct: monthlyRate,
        status: loan.status,
        notes: loan.notes || '',
        customer: loan.customer ? {
          id: loan.customer.id,
          name: loan.customer.name,
          nameHindi: loan.customer.nameHindi,
          phone: loan.customer.phone,
          altPhone: loan.customer.altPhone,
          relationType: loan.customer.relationType,
          relationName: loan.customer.relationName,
          address: loan.customer.address,
          city: loan.customer.city,
          photoUrl: loan.customer.photoUrl,
          identityDocType: loan.customer.identityDocType,
          identityDocNumber: loan.customer.identityDocNumber,
        } : null,
        items: itemsFormatted,
        totalGrossWeightGrams: mgToGrams(totalGrossMg),
        totalNetWeightGrams: mgToGrams(totalNetMg),
        totalValuationRupees: paiseToRupees(totalValuationPaise),
        estimatedInterestRupees,
        totalPayableRupees: principalRupees + estimatedInterestRupees,
        isRepledged: repledgeLinks.some((rl) => rl.loan.status === 'ACTIVE' && rl.returnedOn === null),
        repledgeInfo: repledgeLinks.map((rl) => ({
          repledgeLoanNo: rl.loan.loanNo,
          status: rl.loan.status,
          isReturned: rl.returnedOn !== null,
        })),
        payments: payments.map((p) => ({
          id: p.id,
          direction: p.direction,
          mode: p.mode,
          amountRupees: paiseToRupees(p.amountPaise),
          flowKind: p.flowKind,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    console.error('Fetch girvi loan detail error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch girvi loan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await db.girviLoan.findUnique({
      where: { id: params.id },
      include: { items: true, customer: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Girvi loan not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      principalRupees,
      interestRatePerMonthPct,
      loanDate,
      dueDate,
      status,
      notes,
      items,
      customer,
    } = body;

    const [updatedLoan] = await db.$transaction(async (tx) => {
      // 1. Update loan metadata
      const loan = await tx.girviLoan.update({
        where: { id: params.id },
        data: {
          principalPaise: principalRupees !== undefined ? rupeesToPaise(parseFloat(principalRupees) || 0) : existing.principalPaise,
          interestRatePerMonthPct: interestRatePerMonthPct !== undefined ? parseFloat(interestRatePerMonthPct) : existing.interestRatePerMonthPct,
          date: loanDate ? new Date(loanDate) : existing.date,
          dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
          status: status ? (status as GirviStatus) : existing.status,
          notes: notes !== undefined ? notes?.trim() : existing.notes,
        },
      });

      // 2. If items were passed, update ornament items
      if (items && Array.isArray(items)) {
        for (const itm of items) {
          if (itm.id) {
            const grossMg = itm.grossWeightGrams ? gramsToMg(parseFloat(itm.grossWeightGrams)) : undefined;
            const stoneMg = itm.stoneWeightGrams !== undefined ? gramsToMg(parseFloat(itm.stoneWeightGrams) || 0) : undefined;
            const netMg = (grossMg !== undefined && stoneMg !== undefined) ? Math.max(0, grossMg - stoneMg) : undefined;

            await tx.girviItem.update({
              where: { id: itm.id },
              data: {
                ornamentType: itm.ornamentType?.trim() || undefined,
                metal: itm.metal ? (itm.metal as Metal) : undefined,
                purity: itm.purity || undefined,
                grossWeightMg: grossMg,
                stoneWeightMg: stoneMg,
                netWeightMg: netMg,
                valuationPaise: itm.valuationRupees ? rupeesToPaise(parseFloat(itm.valuationRupees)) : undefined,
                locationId: itm.locationId || undefined,
              },
            });
          }
        }
      }

      // 3. If customer KYC updates passed, update customer
      if (customer && existing.customerId) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            name: customer.name?.trim() || undefined,
            nameHindi: customer.nameHindi?.trim() || undefined,
            phone: customer.phone?.trim() || undefined,
            altPhone: customer.altPhone?.trim() || undefined,
            relationType: customer.relationType || undefined,
            relationName: customer.relationName?.trim() || undefined,
            address: customer.address?.trim() || undefined,
            city: customer.city?.trim() || undefined,
            identityDocType: customer.identityDocType?.trim() || undefined,
            identityDocNumber: customer.identityDocNumber?.trim() || undefined,
          },
        });
      }

      return [loan];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_GIRVI_LOAN',
      entity: 'GirviLoan',
      entityId: updatedLoan.id,
      before: existing,
      after: body,
    });

    return NextResponse.json({ ok: true, data: updatedLoan });
  } catch (error: any) {
    console.error('Update girvi loan error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update girvi loan' }, { status: 500 });
  }
}
