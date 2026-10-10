import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const moduleFilter = searchParams.get('module') || 'All';
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));

    const logs = await db.activityLog.findMany({
      orderBy: { at: 'desc' },
      take: limit,
    });

    // Fetch unique user IDs to resolve names
    const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))) as string[];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, `${u.name} (${u.role})`]));

    const formatted = logs.map((l: any) => {
      let resolvedModule = l.module || 'System';
      if (!l.module || l.module === 'UNKNOWN') {
        const ent = (l.entityType || '').toLowerCase();
        if (ent.includes('sale')) resolvedModule = 'Sales';
        else if (ent.includes('girvi')) resolvedModule = 'Girvi';
        else if (ent.includes('repledge')) resolvedModule = 'Repledge';
        else if (ent.includes('customer')) resolvedModule = 'Customers';
        else if (ent.includes('inventory')) resolvedModule = 'Inventory';
        else if (ent.includes('storage') || ent.includes('location') || ent.includes('custody')) resolvedModule = 'Custody';
        else if (ent.includes('cash') || ent.includes('payment')) resolvedModule = 'Cashbook';
        else if (ent.includes('rate')) resolvedModule = 'Rates';
        else if (ent.includes('sku')) resolvedModule = 'SKU';
        else resolvedModule = 'System';
      }

      let actionLabel = l.action;
      if (l.action.startsWith('CREATE_')) actionLabel = 'Created ' + l.action.replace('CREATE_', '').replace('_', ' ');
      else if (l.action.startsWith('UPDATE_')) actionLabel = 'Edited ' + l.action.replace('UPDATE_', '').replace('_', ' ');
      else if (l.action.startsWith('DELETE_')) actionLabel = 'Deleted ' + l.action.replace('DELETE_', '').replace('_', ' ');
      else if (l.action.startsWith('SETTLE_')) actionLabel = 'Settled ' + l.action.replace('SETTLE_', '').replace('_', ' ');
      else if (l.action.startsWith('VOID_')) actionLabel = 'Voided ' + l.action.replace('VOID_', '').replace('_', ' ');

      return {
        id: l.id.toString(),
        timestamp: l.at.toISOString(),
        module: resolvedModule,
        recordId: l.entityId || '-',
        recordType: l.entityType || 'Record',
        action: actionLabel,
        rawAction: l.action,
        userName: l.userId ? (userMap.get(l.userId) || l.userId) : 'System Automated',
        reason: l.reasonText || l.reasonCode || actionLabel,
        details: l.after ? JSON.stringify(l.after) : null,
      };
    });

    const filtered = formatted.filter((item) => {
      const matchesMod = moduleFilter === 'All' || item.module.toLowerCase() === moduleFilter.toLowerCase();
      const matchesSearch =
        !search ||
        item.action.toLowerCase().includes(search) ||
        item.recordId.toLowerCase().includes(search) ||
        item.recordType.toLowerCase().includes(search) ||
        item.userName.toLowerCase().includes(search) ||
        (item.reason && item.reason.toLowerCase().includes(search));
      return matchesMod && matchesSearch;
    });

    return NextResponse.json({ ok: true, data: filtered });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch audit log' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Only Owner can manage audit logs' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await db.activityLog.delete({ where: { id: BigInt(id) } });
    } else {
      await db.activityLog.deleteMany({});
    }

    return NextResponse.json({ ok: true, message: 'Audit log trace cleared' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to purge audit log' }, { status: 500 });
  }
}
