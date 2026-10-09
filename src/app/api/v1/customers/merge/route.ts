import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json({ ok: false, error: 'Only Owner or Manager can merge customer records' }, { status: 403 });
    }

    const { primaryCustomerId, duplicateCustomerId, reason } = await req.json();

    if (!primaryCustomerId || !duplicateCustomerId) {
      return NextResponse.json({ ok: false, error: 'Both primary and duplicate customer IDs are required' }, { status: 400 });
    }

    if (primaryCustomerId === duplicateCustomerId) {
      return NextResponse.json({ ok: false, error: 'Primary and duplicate customer cannot be the same' }, { status: 400 });
    }

    const [primary, duplicate] = await Promise.all([
      db.customer.findUnique({ where: { id: primaryCustomerId } }),
      db.customer.findUnique({ where: { id: duplicateCustomerId } }),
    ]);

    if (!primary || !duplicate) {
      return NextResponse.json({ ok: false, error: 'One or both customer profiles could not be found' }, { status: 404 });
    }

    await db.$transaction(async (tx: any) => {
      await tx.sale.updateMany({
        where: { customerId: duplicateCustomerId },
        data: { customerId: primaryCustomerId },
      });

      const updatedNotes = [primary.notes, duplicate.notes ? `[Merged from ${duplicate.name} (${duplicate.phone})]: ${duplicate.notes}` : '']
        .filter(Boolean)
        .join('\n');

      await tx.customer.update({
        where: { id: primaryCustomerId },
        data: {
          altPhone: primary.altPhone || duplicate.phone,
          address: primary.address || duplicate.address,
          photoUrl: primary.photoUrl || duplicate.photoUrl,
          photoDriveUrl: primary.photoDriveUrl || duplicate.photoDriveUrl,
          notes: updatedNotes || undefined,
        },
      });

      await tx.customer.delete({
        where: { id: duplicateCustomerId },
      });
    });

    await writeAuditLog({
      userId: user.id,
      action: 'MERGE_CUSTOMERS',
      entity: 'Customer',
      entityId: primaryCustomerId,
      before: { duplicateId: duplicate.id, duplicateName: duplicate.name, duplicatePhone: duplicate.phone },
      after: { primaryId: primary.id, primaryName: primary.name, primaryPhone: primary.phone },
      reason: reason || 'Duplicate customer record merged',
    });

    return NextResponse.json({
      ok: true,
      message: `Successfully merged customer '${duplicate.name}' into '${primary.name}'`,
    });
  } catch (error: any) {
    console.error('Merge customer error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to merge customer profiles' }, { status: 500 });
  }
}
