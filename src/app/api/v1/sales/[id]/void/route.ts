import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const saleId = params.id;
    const body = await req.json().catch(() => ({}));
    const { reason = 'History Correction' } = body;

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json({ ok: false, error: 'Sale record not found' }, { status: 404 });
    }

    // Return inventory items back to stock
    const itemIds = sale.items.map((i) => i.inventoryItemId).filter(Boolean) as string[];

    await db.$transaction([
      db.sale.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
      }),
      db.inventoryItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: 'IN_STOCK' },
      }),
    ]);

    await writeAuditLog({
      userId: user.id,
      action: 'VOID_SALE',
      entity: 'Sale',
      entityId: saleId,
      reason,
    });

    return NextResponse.json({ ok: true, message: 'Sale transaction voided successfully' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to void sale' }, { status: 500 });
  }
}
