import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { assertCapability } from '@/server/permissions';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    assertCapability(user.role, 'VIEW_ACTIVITY_LOG');

    const { entityType, entityId } = await params;

    const rows = await db.activityLog.findMany({
      where: {
        OR: [
          { entityType, entityId },
          { parentEntityType: entityType, parentEntityId: entityId },
        ],
      },
      orderBy: { at: 'desc' },
      take: 100,
    });

    const serializedRows = rows.map((r) => ({
      ...r,
      id: r.id.toString(),
    }));

    return NextResponse.json({
      ok: true,
      data: serializedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch entity activity' }, { status: 500 });
  }
}
