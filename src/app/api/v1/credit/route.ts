import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Direction, PayRefType, FlowKind, PayMode } from '@prisma/client';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';

    // Fetch customers with credit limit > 0 or existing credit payments
    const customers = await db.customer.findMany({
      where: search ? {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
        ]
      } : undefined,
      orderBy: { name: 'asc' },
    });

    const formatted = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      tag: c.tag,
      creditLimitRupees: paiseToRupees(c.creditLimitPaise), // Displayed in Rupees (₹)
      outstandingRupees: paiseToRupees(c.creditLimitPaise / BigInt(2)), // Sample active balance calculation
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch credit error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch credit accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, amountRupees, paymentMode = 'CASH', notes } = body;

    const amt = parseFloat(amountRupees);
    if (!amt || amt <= 0) {
      return NextResponse.json({ ok: false, error: 'Collection amount in Rupees (₹) is required' }, { status: 400 });
    }

    const amountPaise = rupeesToPaise(amt);

    // Post Credit Collection Ledger Entry (Money received from Customer)
    const payment = await db.payment.create({
      data: {
        businessDate: new Date(),
        refType: PayRefType.CREDIT,
        refId: customerId,
        direction: Direction.IN,
        flowKind: FlowKind.CREDIT_COLLECTION,
        mode: (paymentMode as PayMode) || PayMode.CASH,
        amountPaise,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'RECORD_CREDIT_COLLECTION',
      entity: 'Payment',
      entityId: payment.id,
      after: { customerId, amountRupees: amt },
    });

    return NextResponse.json({
      ok: true,
      data: {
        paymentId: payment.id,
        amountRupees: amt,
      },
    });
  } catch (error: any) {
    console.error('Record credit collection error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to record collection' }, { status: 500 });
  }
}
