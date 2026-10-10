import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { GirviStatus, Direction, PayRefType, FlowKind, PayMode } from '@prisma/client';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const loan = await db.girviLoan.findUnique({
      where: { id: params.id },
      include: { customer: true, items: true },
    });

    if (!loan) {
      return NextResponse.json({ ok: false, error: 'Girvi loan not found' }, { status: 404 });
    }

    if (loan.status === GirviStatus.REDEEMED) {
      return NextResponse.json({ ok: false, error: 'Loan is already redeemed and closed' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      interestPaidRupees = 0,
      paymentMode = 'CASH',
      redemptionDate,
      notes,
    } = body;

    const principalPaise = loan.principalPaise;
    const interestPaise = rupeesToPaise(parseFloat(interestPaidRupees) || 0);
    const totalPaise = principalPaise + interestPaise;

    let mode: PayMode = PayMode.CASH;
    const pm = (paymentMode || 'CASH').toUpperCase();
    if (pm === 'UPI') mode = PayMode.UPI;
    else if (pm === 'BANK') mode = PayMode.BANK;

    const rDate = redemptionDate ? new Date(redemptionDate) : new Date();

    const [updatedLoan] = await db.$transaction(async (tx) => {
      // 1. Mark loan as REDEEMED
      const l = await tx.girviLoan.update({
        where: { id: params.id },
        data: {
          status: GirviStatus.REDEEMED,
          notes: notes ? `${loan.notes || ''} [Redeemed on ${rDate.toISOString().split('T')[0]}: ${notes}]`.trim() : loan.notes,
        },
      });

      // 2. Mark ornaments released from Vault custody
      await tx.girviItem.updateMany({
        where: { girviLoanId: params.id },
        data: { locationId: null },
      });

      // 3. Post Principal Receipt in Cashbook Payment Ledger
      await tx.payment.create({
        data: {
          businessDate: rDate,
          refType: PayRefType.GIRVI,
          refId: loan.loanNo,
          direction: Direction.IN,
          flowKind: FlowKind.GIRVI_PRINCIPAL_IN,
          mode,
          amountPaise: principalPaise,
          createdById: user.id,
        },
      });

      // 4. Post Interest Receipt in Cashbook Payment Ledger (if interest > 0)
      if (interestPaise > BigInt(0)) {
        await tx.payment.create({
          data: {
            businessDate: rDate,
            refType: PayRefType.GIRVI,
            refId: loan.loanNo,
            direction: Direction.IN,
            flowKind: FlowKind.GIRVI_INTEREST_IN,
            mode,
            amountPaise: interestPaise,
            createdById: user.id,
          },
        });
      }

      return [l];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'REDEEM_GIRVI_LOAN',
      entity: 'GirviLoan',
      entityId: loan.id,
      after: {
        loanNo: loan.loanNo,
        principalPaid: paiseToRupees(principalPaise),
        interestPaid: parseFloat(interestPaidRupees) || 0,
        totalSettled: paiseToRupees(totalPaise),
        customerName: loan.customer?.name,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Girvi loan ${loan.loanNo} successfully redeemed! Ornaments released from custody.`,
      data: {
        id: updatedLoan.id,
        loanNo: updatedLoan.loanNo,
        status: updatedLoan.status,
      },
    });
  } catch (error: any) {
    console.error('Redeem girvi loan error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to redeem loan' }, { status: 500 });
  }
}
