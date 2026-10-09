import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const {
      amountPaise,
      mode,
      businessDate,
      direction,
      categoryId,
      utr,
      reason,
    } = body;

    // Check if core financial fields are being mutated
    if (
      amountPaise !== undefined ||
      mode !== undefined ||
      businessDate !== undefined ||
      direction !== undefined
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Financial fields (amount, mode, date, direction) cannot be directly modified. Per 07_EDIT_DELETE_RULES, use 1-Tap Reversal (/cancel) and re-enter the entry.',
        },
        { status: 400 }
      );
    }

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (existing.reversedOfId) {
      return NextResponse.json({ ok: false, error: 'Reversed transactions cannot be modified' }, { status: 400 });
    }

    const updated = await db.payment.update({
      where: { id },
      data: {
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        utr: utr !== undefined ? (utr?.trim() || null) : existing.utr,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'SAFE_UPDATE_CASH_TXN',
      entity: 'Payment',
      entityId: id,
      before: existing,
      after: updated,
      reason: reason || 'Safe edit cash transaction',
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...updated,
        amountPaise: updated.amountPaise.toString(),
        businessDate: updated.businessDate.toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('Update cash transaction error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update transaction' }, { status: 500 });
  }
}
