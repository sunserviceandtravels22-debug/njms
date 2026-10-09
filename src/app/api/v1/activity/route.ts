import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { assertCapability } from '@/server/permissions';
import { db } from '@/server/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    assertCapability(user.role, 'VIEW_ACTIVITY_LOG');

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const userId = searchParams.get('userId');
    const moduleName = searchParams.get('module');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const severity = searchParams.get('severity');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where: Prisma.ActivityLogWhereInput = {};

    if (fromStr || toStr) {
      where.at = {};
      if (fromStr) where.at.gte = new Date(fromStr);
      if (toStr) where.at.lte = new Date(toStr);
    }
    if (userId) where.userId = userId;
    if (moduleName) where.module = moduleName;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (severity) where.severity = severity;

    const [total, rows] = await Promise.all([
      db.activityLog.count({ where }),
      db.activityLog.findMany({
        where,
        orderBy: { at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const serializedRows = rows.map((r) => ({
      ...r,
      id: r.id.toString(),
    }));

    return NextResponse.json({
      ok: true,
      data: serializedRows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch activity logs' }, { status: 500 });
  }
}
