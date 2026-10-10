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
      include: { customer: true },
    });

    if (!loan) {
      return NextResponse.json({ ok: false, error: 'Girvi loan not found' }, { status: 404 });
    }

    if (loan.status === GirviStatus.REDEEMED) {
      return NextResponse.json({ ok: false, error: 'Cannot make payments on a redeemed loan' }, { status: 400 });
    }

    const body = await req.json();
    const {
      principalPaidRupees = 0,
      interestPaidRupees = 0,
      paymentMode = 'CASH',
      paymentDate,
      notes,
    } = body;

    const pPaid = parseFloat(principalPaidRupees) || 0;
    const iPaid = parseFloat(interestPaidRupees) || 0;
    const totalPaid = pPaid + iPaid;

    if (totalPaid <= 0) {
      return NextResponse.json({ ok: false, error: 'Payment amount must be greater than zero' }, { status: 400 });
    }

    const pPaidPaise = rupeesToPaise(pPaid);
    const iPaidPaise = rupeesToPaise(iPaid);

    let newPrincipalPaise = loan.principalPaise - pPaidPaise;
    if (newPrincipalPaise < BigInt(0)) newPrincipalPaise = BigInt(0);

    let newStatus: GirviStatus = loan.status;
    if (newPrincipalPaise === BigInt(0)) {
      newStatus = GirviStatus.REDEEMED;
    } else {
      newStatus = GirviStatus.PARTIAL;
    }

    let mode: PayMode = PayMode.CASH;
    const pm = (paymentMode || 'CASH').toUpperCase();
    if (pm === 'UPI') mode = PayMode.UPI;
    else if (pm === 'BANK') mode = PayMode.BANK;

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const [updatedLoan] = await db.$transaction(async (tx) => {
      // 1. Update loan principal & status
      const updated = await tx.girviLoan.update({
        where: { id: params.id },
        data: {
          principalPaise: newPrincipalPaise,
          status: newStatus,
          notes: notes ? `${loan.notes || ''} [Part-payment ₹${totalPaid} on ${payDate.toISOString().split('T')[0]}: ${notes}]`.trim() : loan.notes,
        },
      });

      // 2. Post Principal payment if > 0
      if (pPaidPaise > BigInt(0)) {
        await tx.payment.create({
          data: {
            businessDate: payDate,
            refType: PayRefType.GIRVI,
            refId: loan.loanNo,
            direction: Direction.IN,
            flowKind: FlowKind.GIRVI_PRINCIPAL_IN,
            mode,
            amountPaise: pPaidPaise,
            createdById: user.id,
          },
        });
      }

      // 3. Post Interest payment if > 0
      if (iPaidPaise > BigInt(0)) {
        await tx.payment.create({
          data: {
            businessDate: payDate,
            refType: PayRefType.GIRVI,
            refId: loan.loanNo,
            direction: Direction.IN,
            flowKind: FlowKind.GIRVI_INTEREST_IN,
            mode,
            amountPaise: iPaidPaise,
            createdById: user.id,
          },
        });
      }

      return [updated];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'PARTIAL_PAYMENT_GIRVI',
      entity: 'GirviLoan',
      entityId: loan.id,
      after: {
        loanNo: loan.loanNo,
        principalPaid: pPaid,
        interestPaid: iPaid,
        remainingPrincipal: paiseToRupees(newPrincipalPaise),
        newStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Partial payment of ₹${totalPaid} recorded successfully.`,
      data: {
        id: updatedLoan.id,
        loanNo: updatedLoan.loanNo,
        remainingPrincipalRupees: paiseToRupees(newPrincipalPaise),
        status: updatedLoan.status,
      },
    });
  } catch (error: any) {
    console.error('Part-payment girvi error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to process partial payment' }, { status: 500 });
  }
}
