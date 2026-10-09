import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { verifyChain } from '@/server/services/activityLog';
import { raise } from '@/server/services/alertService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const issues: string[] = [];

    // 1. Verify ActivityLog hash chain integrity
    const chainCheck = await verifyChain();
    if (!chainCheck.valid) {
      issues.push(`ActivityLog hash chain broken at id ${chainCheck.brokenAtId}`);
      await raise({
        ruleCode: 'LOG_CHAIN_BROKEN',
        entityType: 'ActivityLog',
        entityId: chainCheck.brokenAtId?.toString() || '0',
        severity: 'CRITICAL',
        payload: { brokenAtId: chainCheck.brokenAtId?.toString() },
      });
    }

    // 2. Invariant: Check for orphan MEMO_IN inventory items with no MemoInLine
    const orphanMemoItems = await db.inventoryItem.findMany({
      where: {
        ownership: 'MEMO_IN',
        memoInLineId: null,
      },
      select: { id: true, tagNo: true },
    });
    if (orphanMemoItems.length > 0) {
      issues.push(`Found ${orphanMemoItems.length} orphan MEMO_IN items without memoInLineId`);
      await raise({
        ruleCode: 'DATA_HEALTH_FAIL',
        entityType: 'InventoryItem',
        entityId: orphanMemoItems[0].id,
        severity: 'CRITICAL',
        payload: { count: orphanMemoItems.length, tags: orphanMemoItems.map((i) => i.tagNo) },
      });
    }

    // 3. Invariant: Check for negative stock
    const negativeStock = await db.inventoryItem.count({
      where: { quantity: { lt: 0 } },
    });
    if (negativeStock > 0) {
      issues.push(`Found ${negativeStock} items with negative stock`);
    }

    return NextResponse.json({
      ok: true,
      data: {
        passed: issues.length === 0,
        issuesCount: issues.length,
        issues,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Data health cron failed' }, { status: 500 });
  }
}
