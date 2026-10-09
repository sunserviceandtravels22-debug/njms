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
} from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const {
      principalPaidPaise = 0,
      interestPaidPaise = 0,
      paymentMode = 'BANK',
      fundAccountId,
      settlementDate,
      returnToLocationId,
      notes,
    } = body;

    const pPaid = BigInt(principalPaidPaise || 0);
    const iPaid = BigInt(interestPaidPaise || 0);
    const totalPaid = pPaid + iPaid;

    if (totalPaid <= BigInt(0)) {
      return NextResponse.json({ ok: false, error: 'Settlement amount must be greater than zero' }, { status: 400 });
    }

    const repledgeLoan = await db.repledgeLoan.findUnique({
      where: { id },
      include: {
        links: true,
      },
    });

    if (!repledgeLoan) {
      return NextResponse.json({ ok: false, error: 'Re-pledge loan not found' }, { status: 404 });
    }

    if (repledgeLoan.status === RepledgeStatus.CLOSED) {
      return NextResponse.json({ ok: false, error: 'Re-pledge loan is already settled and closed' }, { status: 400 });
    }

    const setDate = settlementDate ? new Date(settlementDate) : new Date();

    // Determine target location for returned items if closing
    let vaultLocationId = returnToLocationId;
    if (!vaultLocationId) {
      const vaultLoc = await db.storageLocation.findFirst({ where: { type: LocationType.VAULT } });
      vaultLocationId = vaultLoc?.id || null;
    }

    const [settlement, updatedLoan] = await db.$transaction(async (tx) => {
      // 1. Create settlement entry
      const voucherNo = `STL-${Date.now().toString().slice(-6)}`;
      const st = await tx.repledgeSettlement.create({
        data: {
          voucherNo,
          loanId: id,
          vendorId: repledgeLoan.vendorId,
          settledOn: setDate,
          sequence: '1',
          systemPayablePaise: totalPaid,
          paidPaise: totalPaid,
          mode: (paymentMode as PayMode) || PayMode.BANK,
          fundAccountId: fundAccountId || null,
          createdById: user.id,
        },
      });

      // 2. Compute total principal paid so far including this settlement
      const previousSettlements = await tx.repledgeSettlement.aggregate({
        where: { loanId: id },
        _sum: { paidPaise: true },
      });

      const totalPrincipalSettled = previousSettlements._sum.paidPaise || BigInt(0);
      const isFullySettled = totalPrincipalSettled >= repledgeLoan.principalPaise;

      let newStatus = repledgeLoan.status;
      if (isFullySettled) {
        newStatus = RepledgeStatus.CLOSED;

        // Update custody location for all linked items back from Vendor to Vault
        if (vaultLocationId) {
          for (const link of repledgeLoan.links) {
            await tx.custodyMovement.create({
              data: {
                girviId: link.girviId,
                itemIds: link.itemIds || [],
                toLocationId: vaultLocationId,
                businessDate: setDate,
                reasonCode: 'REPLEDGE_RETURN',
                byUserId: user.id,
                note: `Re-pledge Loan #${repledgeLoan.loanNo} Settled & Returned to Vault`,
              },
            });
          }
        }
      } else if (pPaid > BigInt(0)) {
        newStatus = RepledgeStatus.PARTIAL;
      }

      const uLoan = await tx.repledgeLoan.update({
        where: { id },
        data: { status: newStatus },
      });

      // 3. Post Cash Out ledger entry (Money paid to Financier)
      if (pPaid > BigInt(0)) {
        await tx.payment.create({
          data: {
            businessDate: setDate,
            refType: PayRefType.REPLEDGE,
            refId: id,
            direction: Direction.OUT,
            flowKind: FlowKind.REPLEDGE_PRINCIPAL_OUT,
            mode: (paymentMode as PayMode) || PayMode.BANK,
            amountPaise: pPaid,
            fundAccountId: fundAccountId || null,
            createdById: user.id,
          },
        });
      }

      if (iPaid > BigInt(0)) {
        await tx.payment.create({
          data: {
            businessDate: setDate,
            refType: PayRefType.REPLEDGE,
            refId: id,
            direction: Direction.OUT,
            flowKind: FlowKind.REPLEDGE_INTEREST_OUT,
            mode: (paymentMode as PayMode) || PayMode.BANK,
            amountPaise: iPaid,
            fundAccountId: fundAccountId || null,
            createdById: user.id,
          },
        });
      }

      return [st, uLoan];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'SETTLE_REPLEDGE_LOAN',
      entity: 'RepledgeLoan',
      entityId: id,
      after: {
        settlementId: settlement.id,
        totalPaidPaise: totalPaid.toString(),
        newStatus: updatedLoan.status,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        settlementId: settlement.id,
        repledgeLoanId: id,
        totalPaidPaise: totalPaid.toString(),
        status: updatedLoan.status,
      },
    });
  } catch (error: any) {
    console.error('Settle repledge loan error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to settle repledge loan' }, { status: 500 });
  }
}
