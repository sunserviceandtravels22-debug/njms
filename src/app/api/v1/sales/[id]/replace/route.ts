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
      saleItemId, // The specific SaleItem being returned for exchange
      newInventoryItemId, // The replacement item from IN_STOCK inventory
      creditValuationRupees, // Credit given for the old item
      newPriceRupees, // Selling price of the replacement item
      paymentMethod = 'CASH', // Mode for paying or refunding the difference
      notes = 'Item Replacement / Exchange',
    } = body;

    if (!saleItemId || !newInventoryItemId) {
      return NextResponse.json({ ok: false, error: 'Both original item and replacement item must be specified' }, { status: 400 });
    }

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: { items: true, customer: true },
    });

    if (!sale) {
      return NextResponse.json({ ok: false, error: 'Sale record not found' }, { status: 404 });
    }

    const oldSaleItem = sale.items.find((i) => i.id === saleItemId);
    if (!oldSaleItem) {
      return NextResponse.json({ ok: false, error: 'Target sale item not found in this sale invoice' }, { status: 404 });
    }

    // Verify replacement inventory item
    const newItem = await db.inventoryItem.findUnique({
      where: { id: newInventoryItemId },
    });

    if (!newItem) {
      return NextResponse.json({ ok: false, error: 'Replacement inventory item not found' }, { status: 404 });
    }

    if (newItem.status !== 'IN_STOCK') {
      return NextResponse.json({ ok: false, error: `Replacement item is not available (Current status: ${newItem.status})` }, { status: 400 });
    }

    const creditPaise = creditValuationRupees !== undefined
      ? rupeesToPaise(parseFloat(creditValuationRupees) || 0)
      : oldSaleItem.totalPaise;

    const newPricePaise = newPriceRupees !== undefined
      ? rupeesToPaise(parseFloat(newPriceRupees) || 0)
      : (newItem.costPaise || BigInt(0));

    // Calculate difference
    const diffPaise = newPricePaise - creditPaise; // > 0 means customer owes money; < 0 means store refunds money

    let mode: PayMode = PayMode.CASH;
    const pm = (paymentMethod || 'CASH').toUpperCase();
    if (pm === 'UPI') mode = PayMode.UPI;
    else if (pm === 'CARD') mode = PayMode.CARD;
    else if (pm === 'BANK') mode = PayMode.BANK;
    else if (pm === 'CREDIT') mode = PayMode.CREDIT;

    const now = new Date();

    const [updatedSale, restockedOld, soldNew, pmt] = await db.$transaction(async (tx) => {
      // 1. Restock old inventory item if it had one
      let restocked = null;
      if (oldSaleItem.inventoryItemId) {
        restocked = await tx.inventoryItem.update({
          where: { id: oldSaleItem.inventoryItemId },
          data: { status: 'IN_STOCK' },
        });
      }

      // 2. Mark new inventory item as SOLD
      const soldItem = await tx.inventoryItem.update({
        where: { id: newItem.id },
        data: { status: 'SOLD' },
      });

      // 3. Add new SaleItem to the sale record
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          inventoryItemId: newItem.id,
          tagNo: newItem.tagNo,
          name: `${newItem.name} (Exchanged for ${oldSaleItem.name})`,
          metal: newItem.metal,
          purityPpt: newItem.purityPpt,
          grossWeightMg: newItem.grossWeightMg,
          netWeightMg: newItem.netWeightMg,
          ratePaisePerGram: BigInt(0),
          metalValuePaise: newPricePaise,
          makingType: newItem.makingType,
          makingValuePaise: newItem.makingValuePaise,
          totalPaise: newPricePaise,
        },
      });

      // 4. Update old sale item name to reflect replacement
      await tx.saleItem.update({
        where: { id: oldSaleItem.id },
        data: {
          name: `${oldSaleItem.name} [RETURNED/EXCHANGED]`,
        },
      });

      // 5. Post Cashbook Payment if difference != 0
      let paymentRecord = null;
      if (diffPaise > BigInt(0) && mode !== PayMode.CREDIT) {
        // Customer pays difference
        paymentRecord = await tx.payment.create({
          data: {
            businessDate: now,
            refType: PayRefType.SALE,
            refId: sale.invoiceNo,
            direction: Direction.IN,
            flowKind: FlowKind.SALE_RECEIPT,
            mode,
            amountPaise: diffPaise,
            createdById: user.id,
          },
        });
      } else if (diffPaise < BigInt(0) && mode !== PayMode.CREDIT) {
        // Store refunds difference
        paymentRecord = await tx.payment.create({
          data: {
            businessDate: now,
            refType: PayRefType.SALE,
            refId: sale.invoiceNo,
            direction: Direction.OUT,
            flowKind: FlowKind.REFUND,
            mode,
            amountPaise: -diffPaise,
            createdById: user.id,
          },
        });
      }

      // 6. Update sale totals
      const updSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          totalPaise: sale.totalPaise + diffPaise,
          paidPaise: sale.paidPaise + diffPaise,
          status: 'COMPLETED',
        },
      });

      return [updSale, restocked, soldItem, paymentRecord];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'REPLACE_SALE_ITEM',
      entity: 'Sale',
      entityId: sale.id,
      after: {
        invoiceNo: sale.invoiceNo,
        returnedOldItemTag: oldSaleItem.tagNo || oldSaleItem.name,
        issuedNewItemTag: newItem.tagNo,
        creditRupees: paiseToRupees(creditPaise),
        newPriceRupees: paiseToRupees(newPricePaise),
        netDifferenceRupees: paiseToRupees(diffPaise),
        settlementMode: mode,
        notes,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Item replacement completed successfully',
      data: {
        saleId: updatedSale.id,
        invoiceNo: updatedSale.invoiceNo,
        differenceRupees: paiseToRupees(diffPaise),
        newItemTag: newItem.tagNo,
        oldItemRestocked: !!restockedOld,
      },
    });
  } catch (error: any) {
    console.error('Process replacement error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to process replacement' }, { status: 500 });
  }
}
