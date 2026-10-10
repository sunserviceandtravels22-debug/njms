import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';
import { Direction, FlowKind, PayMode, PayRefType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const saleId = params.id;
    const body = await req.json();
    const {
      saleItemIds = [], // Array of SaleItem IDs to return; if empty or all, returns all items
      refundRupees = 0,
      paymentMethod = 'CASH',
      reason = 'Customer Return',
    } = body;

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: { items: true, customer: true },
    });

    if (!sale) {
      return NextResponse.json({ ok: false, error: 'Sale record not found' }, { status: 404 });
    }

    if (sale.status === 'CANCELLED' || sale.status === 'RETURNED') {
      return NextResponse.json({ ok: false, error: `Sale is already ${sale.status}` }, { status: 400 });
    }

    // Determine target items to return
    const targetItems =
      saleItemIds.length > 0
        ? sale.items.filter((item) => saleItemIds.includes(item.id))
        : sale.items;

    if (targetItems.length === 0) {
      return NextResponse.json({ ok: false, error: 'No items selected for return' }, { status: 400 });
    }

    const inventoryItemIds = targetItems
      .map((i) => i.inventoryItemId)
      .filter(Boolean) as string[];

    const isAllReturned = targetItems.length === sale.items.length;
    const newStatus = isAllReturned ? 'RETURNED' : 'PARTIAL_RETURN';

    const refundPaise = rupeesToPaise(parseFloat(refundRupees) || 0);

    let mode: PayMode = PayMode.CASH;
    const pm = (paymentMethod || 'CASH').toUpperCase();
    if (pm === 'UPI') mode = PayMode.UPI;
    else if (pm === 'CARD') mode = PayMode.CARD;
    else if (pm === 'BANK') mode = PayMode.BANK;
    else if (pm === 'CREDIT') mode = PayMode.CREDIT;

    const now = new Date();

    const [updatedSale, returnedCount, paymentEntry] = await db.$transaction(async (tx) => {
      // 1. Update sale status
      const updSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: newStatus,
        },
      });

      // 2. Restock returned inventory items back to IN_STOCK
      let restocked = 0;
      if (inventoryItemIds.length > 0) {
        const updItems = await tx.inventoryItem.updateMany({
          where: { id: { in: inventoryItemIds } },
          data: { status: 'IN_STOCK' },
        });
        restocked = updItems.count;
      }

      // 3. Record Cashbook Payment Refund if refund amount > 0
      let pmt = null;
      if (refundPaise > BigInt(0) && mode !== PayMode.CREDIT) {
        pmt = await tx.payment.create({
          data: {
            businessDate: now,
            refType: PayRefType.SALE,
            refId: sale.invoiceNo,
            direction: Direction.OUT,
            flowKind: FlowKind.REFUND,
            mode,
            amountPaise: refundPaise,
            createdById: user.id,
          },
        });
      }

      return [updSale, restocked, pmt];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'RETURN_SALE_ITEMS',
      entity: 'Sale',
      entityId: sale.id,
      after: {
        invoiceNo: sale.invoiceNo,
        returnedItemsCount: targetItems.length,
        inventoryRestockedCount: returnedCount,
        refundRupees: paiseToRupees(refundPaise),
        refundMode: mode,
        reason,
        status: newStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Successfully returned ${targetItems.length} item(s)`,
      data: {
        saleId: updatedSale.id,
        invoiceNo: updatedSale.invoiceNo,
        status: updatedSale.status,
        refundRupees: paiseToRupees(refundPaise),
        restockedCount: returnedCount,
      },
    });
  } catch (error: any) {
    console.error('Process return error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to process return' }, { status: 500 });
  }
}
