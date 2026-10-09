import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'Array of item ids is required' }, { status: 400 });
    }

    const result = await db.inventoryItem.deleteMany({
      where: { id: { in: ids } },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'BULK_DELETE_INVENTORY',
      entity: 'InventoryItem',
      entityId: `count:${result.count}`,
      reason: `Purged ${ids.length} items`,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed bulk delete' }, { status: 500 });
  }
}
