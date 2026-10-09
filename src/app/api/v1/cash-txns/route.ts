import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Direction, PayMode, FlowKind, PayRefType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      direction,
      mode = 'CASH',
      flowKind = 'OPERATIONAL',
      amountPaise,
      businessDate,
      categoryId,
      fundAccountId,
      notes,
      utr,
      forceDuplicate = false,
    } = body;

    if (!direction || !['IN', 'OUT'].includes(direction)) {
      return NextResponse.json({ ok: false, error: 'Valid direction (IN or OUT) is required' }, { status: 400 });
    }

    const amount = BigInt(amountPaise || 0);
    if (amount <= BigInt(0)) {
      return NextResponse.json({ ok: false, error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const date = businessDate ? new Date(businessDate) : new Date();

    // Enforce 10-minute duplicate guard unless explicitly bypassed with forceDuplicate=true
    if (!forceDuplicate) {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const duplicate = await db.payment.findFirst({
        where: {
          direction: direction as Direction,
          mode: mode as PayMode,
          amountPaise: amount,
          categoryId: categoryId || null,
          createdAt: { gte: tenMinsAgo },
          reversedOfId: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Duplicate transaction detected in last 10 minutes. If this is intentional, confirm to proceed.',
            isDuplicate: true,
            existingTxnId: duplicate.id,
          },
          { status: 409 }
        );
      }
    }

    // Resolve or fallback default Fund Account if not provided
    let targetFundAccountId = fundAccountId;
    if (!targetFundAccountId) {
      const defaultAccount = await db.fundAccount.findFirst({
        where: { type: mode === 'CASH' ? 'CASH' : 'BANK' },
      });
      targetFundAccountId = defaultAccount?.id || null;
    }

    const refId = `CB-${Date.now()}`;

    // Create payment entry in core payment ledger
    const newPayment = await db.payment.create({
      data: {
        businessDate: date,
        refType: PayRefType.CASHBOOK,
        refId: refId,
        direction: direction as Direction,
        flowKind: (flowKind as FlowKind) || FlowKind.EXPENSE,
        mode: mode as PayMode,
        amountPaise: amount,
        categoryId: categoryId || null,
        fundAccountId: targetFundAccountId,
        utr: utr?.trim() || null,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_CASH_TXN',
      entity: 'Payment',
      entityId: newPayment.id,
      after: {
        id: newPayment.id,
        direction: newPayment.direction,
        mode: newPayment.mode,
        amountPaise: newPayment.amountPaise.toString(),
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...newPayment,
        amountPaise: newPayment.amountPaise.toString(),
        businessDate: newPayment.businessDate.toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('Create cash transaction error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create cash transaction' }, { status: 500 });
  }
}
