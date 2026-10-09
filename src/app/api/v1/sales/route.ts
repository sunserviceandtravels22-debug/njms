import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      inventoryItemId,
      sellingPriceRupees,
      paymentMethod = 'CASH',
      customerName,
      customerPhone,
      goldRateAtSale,
      silverRateAtSale,
    } = body;

    const sellingVal = parseFloat(sellingPriceRupees);
    if (!sellingVal || sellingVal <= 0) {
      return NextResponse.json({ ok: false, error: 'Valid selling price in Rupees is required' }, { status: 400 });
    }

    // Fetch target inventory item
    const item = await db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: 'Inventory item not found' }, { status: 404 });
    }

    if (item.status === 'SOLD') {
      return NextResponse.json({ ok: false, error: 'Item is already sold' }, { status: 400 });
    }

    const sellingPaise = rupeesToPaise(sellingVal);
    const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
    const idempotencyKey = `sale-${item.id}-${Date.now()}`;

    // Execute transaction: create Sale record and mark item as SOLD
    const [saleRecord] = await db.$transaction([
      db.sale.create({
        data: {
          invoiceNo,
          date: new Date(),
          subtotalPaise: sellingPaise,
          discountPaise: BigInt(0),
          taxablePaise: sellingPaise,
          gstPaise: BigInt(0),
          roundOffPaise: BigInt(0),
          totalPaise: sellingPaise,
          paidPaise: sellingPaise,
          status: 'COMPLETED',
          idempotencyKey,
          createdById: user.id,
          items: {
            create: {
              inventoryItemId: item.id,
              tagNo: item.tagNo,
              name: item.name,
              metal: item.metal,
              purityPpt: item.purityPpt,
              grossWeightMg: item.grossWeightMg,
              netWeightMg: item.netWeightMg,
              ratePaisePerGram: BigInt(0),
              metalValuePaise: sellingPaise,
              makingType: item.makingType,
              makingValuePaise: item.makingValuePaise,
              totalPaise: sellingPaise,
            },
          },
        },
      }),
      db.inventoryItem.update({
        where: { id: item.id },
        data: { status: 'SOLD' },
      }),
    ]);

    await writeAuditLog({
      userId: user.id,
      action: 'COMPLETE_SALE',
      entity: 'Sale',
      entityId: saleRecord.id,
      after: {
        invoiceNo,
        sellingPriceRupees: sellingVal,
        tagNo: item.tagNo,
        customerName,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: saleRecord.id,
        invoiceNo: saleRecord.invoiceNo,
        sellingPriceRupees: sellingVal,
      },
    });
  } catch (error: any) {
    console.error('Process sale error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to process sale' }, { status: 500 });
  }
}
