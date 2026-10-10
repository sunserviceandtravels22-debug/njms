import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';
import { PayMode, Direction, PayRefType, FlowKind, CustomerTag, RelationType } from '@prisma/client';

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
      customerId,
      customerName,
      customerPhone,
      oldGoldValuationRupees = 0,
      notes,
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

    // Resolve or link Customer
    let resolvedCustomerId: string | null = customerId || null;
    if (!resolvedCustomerId && customerPhone && customerPhone.trim().length >= 10) {
      const cleanPhone = customerPhone.trim();
      let cust = await db.customer.findFirst({ where: { phone: cleanPhone } });
      if (!cust && customerName && customerName.trim()) {
        cust = await db.customer.create({
          data: {
            name: customerName.trim(),
            phone: cleanPhone,
            relationType: RelationType.FATHER,
            tag: CustomerTag.STANDARD,
            city: 'Local',
            createdById: user.id,
          },
        });
      }
      if (cust) resolvedCustomerId = cust.id;
    }

    const sellingPaise = rupeesToPaise(sellingVal);
    const oldGoldAdjPaise = rupeesToPaise(parseFloat(oldGoldValuationRupees) || 0);
    const netPayablePaise = sellingPaise > oldGoldAdjPaise ? sellingPaise - oldGoldAdjPaise : BigInt(0);

    const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
    const idempotencyKey = `sale-${item.id}-${Date.now()}`;
    const now = new Date();

    // Map payment method
    let mode: PayMode = PayMode.CASH;
    const pm = (paymentMethod || 'CASH').toUpperCase();
    if (pm === 'UPI') mode = PayMode.UPI;
    else if (pm === 'CARD') mode = PayMode.CARD;
    else if (pm === 'BANK') mode = PayMode.BANK;
    else if (pm === 'CREDIT') mode = PayMode.CREDIT;

    // Execute transaction: create Sale, mark Item as SOLD, and create Cashbook Payment record
    const [saleRecord, updatedItem, paymentRecord] = await db.$transaction(async (tx) => {
      // 1. Create Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          customerId: resolvedCustomerId,
          date: now,
          subtotalPaise: sellingPaise,
          discountPaise: BigInt(0),
          taxablePaise: sellingPaise,
          gstPaise: BigInt(0),
          roundOffPaise: BigInt(0),
          oldGoldAdjPaise,
          totalPaise: sellingPaise,
          paidPaise: netPayablePaise,
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
      });

      // 2. Mark Inventory Item as SOLD and flip MEMO_IN ownership to OWNED
      const upd = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          status: 'SOLD',
          ownership: 'OWNED',
        },
      });

      // 2b. If item came from a wholesaler memo-in, update the MemoInLine
      if (item.memoInLineId) {
        await tx.memoInLine.update({
          where: { id: item.memoInLineId },
          data: {
            status: 'SOLD',
            convertedSaleId: sale.id,
          },
        }).catch(() => {});
      }

      // 3. Post Cashbook Payment In (if net payable > 0 and not full credit)
      let pmt = null;
      if (netPayablePaise > BigInt(0) && mode !== PayMode.CREDIT) {
        pmt = await tx.payment.create({
          data: {
            businessDate: now,
            refType: PayRefType.SALE,
            refId: sale.invoiceNo,
            direction: Direction.IN,
            flowKind: FlowKind.SALE_RECEIPT,
            mode,
            amountPaise: netPayablePaise,
            createdById: user.id,
          },
        });
      }

      return [sale, upd, pmt];
    });

    await writeAuditLog({
      userId: user.id,
      action: 'COMPLETE_SALE',
      entity: 'Sale',
      entityId: saleRecord.id,
      after: {
        invoiceNo,
        sellingPriceRupees: sellingVal,
        netPayableRupees: paiseToRupees(netPayablePaise),
        tagNo: item.tagNo,
        customerName: customerName || 'Walk-in',
        mode,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: saleRecord.id,
        invoiceNo: saleRecord.invoiceNo,
        sellingPriceRupees: sellingVal,
        paidRupees: paiseToRupees(netPayablePaise),
        customerName: customerName || 'Walk-in Client',
      },
    });
  } catch (error: any) {
    console.error('Process sale error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to process sale' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { invoiceNo: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { items: { some: { tagNo: { contains: search } } } },
        { items: { some: { name: { contains: search } } } },
      ];
    }

    const sales = await db.sale.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    const formatted = sales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      date: s.date.toISOString(),
      createdAt: s.createdAt.toISOString(),
      status: s.status,
      customer: s.customer ? {
        id: s.customer.id,
        name: s.customer.name,
        phone: s.customer.phone,
        city: s.customer.city,
      } : null,
      totalRupees: paiseToRupees(s.totalPaise),
      paidRupees: paiseToRupees(s.paidPaise),
      oldGoldAdjRupees: paiseToRupees(s.oldGoldAdjPaise),
      items: s.items.map((i) => ({
        id: i.id,
        inventoryItemId: i.inventoryItemId,
        tagNo: i.tagNo,
        name: i.name,
        metal: i.metal,
        purityPpt: i.purityPpt,
        grossWeightGrams: (i.grossWeightMg / 1000).toFixed(3),
        netWeightGrams: (i.netWeightMg / 1000).toFixed(3),
        totalRupees: paiseToRupees(i.totalPaise),
      })),
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch sales error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch sales' }, { status: 500 });
  }
}

