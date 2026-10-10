import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const loan = await db.girviLoan.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!loan) {
      return NextResponse.json({ ok: false, error: 'Girvi loan not found' }, { status: 404 });
    }

    const body = await req.json();
    const { itemIds = [], notes } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'Select at least one ornament to release' }, { status: 400 });
    }

    const validItems = loan.items.filter((i) => itemIds.includes(i.id));
    if (validItems.length === 0) {
      return NextResponse.json({ ok: false, error: 'None of the selected items belong to this loan' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      // 1. Release selected items from vault custody
      await tx.girviItem.updateMany({
        where: { id: { in: itemIds } },
        data: { locationId: null },
      });

      // 2. Record CustodyMovement
      await tx.custodyMovement.create({
        data: {
          girviId: loan.id,
          itemIds: itemIds,
          fromLocationId: validItems[0]?.locationId || null,
          toLocationId: 'CUSTOMER_RELEASED',
          businessDate: new Date(),
          reasonCode: 'PART_RELEASE',
          refType: 'GIRVI',
          refId: loan.loanNo,
          byUserId: user.id,
          note: notes || 'Partial ornament release to customer',
        },
      });
    });

    await writeAuditLog({
      userId: user.id,
      action: 'PARTIAL_RELEASE_GIRVI',
      entity: 'GirviLoan',
      entityId: loan.id,
      after: {
        loanNo: loan.loanNo,
        releasedItemsCount: validItems.length,
        releasedOrnaments: validItems.map((i) => i.ornamentType),
      },
    });

    return NextResponse.json({
      ok: true,
      message: `${validItems.length} ornament(s) successfully released to customer.`,
      data: {
        releasedCount: validItems.length,
      },
    });
  } catch (error: any) {
    console.error('Part-release girvi error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to release ornaments' }, { status: 500 });
  }
}
