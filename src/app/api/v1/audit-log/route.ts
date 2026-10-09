import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const logs = await db.activityLog.findMany({
      orderBy: { at: 'desc' },
      take: 100,
    });

    const formatted = logs.map((l: any) => ({
      id: l.id.toString(),
      timestamp: l.at.toISOString(),
      module: l.module || (l.entityType === 'InventoryItem' ? 'Inventory' : l.entityType === 'Sale' ? 'Sales' : l.entityType === 'SKUMaster' ? 'SKU' : 'Purchase'),
      recordId: l.entityId,
      recordType: l.entityType,
      action: l.action.includes('CREATE') ? 'Created' : l.action.includes('UPDATE') ? 'Edited' : l.action.includes('VOID') ? 'Voided' : l.action,
      userName: l.userId || 'System',
      reason: l.reasonText || l.action,
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch audit log' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await db.activityLog.delete({ where: { id: BigInt(id) } });
    } else {
      await db.activityLog.deleteMany({});
    }

    return NextResponse.json({ ok: true, message: 'Audit log trace purged' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to purge audit log' }, { status: 500 });
  }
}

