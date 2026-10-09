import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Direction, PayRefType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ ok: false, error: 'Mandatory cancellation/reversal reason is required' }, { status: 400 });
    }

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (existing.reversedOfId) {
      return NextResponse.json({ ok: false, error: 'Transaction is already reversed' }, { status: 400 });
    }

    // Determine opposite direction for offsetting row
    const oppositeDirection = existing.direction === Direction.IN ? Direction.OUT : Direction.IN;

    // Create offsetting reversal entry
    const reversalRow = await db.payment.create({
      data: {
        businessDate: new Date(),
        refType: existing.refType || PayRefType.CASHBOOK,
        refId: `REV-${existing.refId || existing.id}`,
        direction: oppositeDirection,
        flowKind: existing.flowKind,
        mode: existing.mode,
        amountPaise: existing.amountPaise,
        categoryId: existing.categoryId,
        fundAccountId: existing.fundAccountId,
        utr: existing.utr ? `REV-${existing.utr}` : null,
        reversedOfId: existing.id,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'REVERSE_CASH_TXN',
      entity: 'Payment',
      entityId: existing.id,
      before: existing,
      after: {
        reversalTxnId: reversalRow.id,
        reason: reason.trim(),
      },
      reason: reason.trim(),
    });

    return NextResponse.json({
      ok: true,
      data: {
        originalId: existing.id,
        reversalTxnId: reversalRow.id,
        amountPaise: existing.amountPaise.toString(),
      },
    });
  } catch (error: any) {
    console.error('Cancel cash transaction error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to cancel/reverse transaction' }, { status: 500 });
  }
}
