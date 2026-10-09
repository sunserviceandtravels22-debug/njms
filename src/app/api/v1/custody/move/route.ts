import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { girviId, itemIds, toLocationId, fromLocationId, reasonCode = 'TRANSFER', note } = body;

    if (!girviId) {
      return NextResponse.json({ ok: false, error: 'Girvi loan ID is required' }, { status: 400 });
    }

    if (!toLocationId) {
      return NextResponse.json({ ok: false, error: 'Destination storage location is required' }, { status: 400 });
    }

    const targetLoc = await db.storageLocation.findUnique({ where: { id: toLocationId } });
    if (!targetLoc) {
      return NextResponse.json({ ok: false, error: 'Destination storage location not found' }, { status: 404 });
    }

    const movement = await db.custodyMovement.create({
      data: {
        girviId,
        itemIds: Array.isArray(itemIds) ? itemIds : [itemIds],
        fromLocationId: fromLocationId || null,
        toLocationId,
        movedAt: new Date(),
        businessDate: new Date(),
        reasonCode,
        byUserId: user.id,
        note: note?.trim() || null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CUSTODY_MOVE',
      entity: 'CustodyMovement',
      entityId: movement.id,
      after: {
        movementId: movement.id,
        girviId,
        toLocationName: targetLoc.name,
        itemCount: Array.isArray(itemIds) ? itemIds.length : 1,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        movementId: movement.id,
        toLocationName: targetLoc.name,
      },
    });
  } catch (error: any) {
    console.error('Custody move error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to move custody items' }, { status: 500 });
  }
}
