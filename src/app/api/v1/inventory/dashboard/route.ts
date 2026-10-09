import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { computeMetalValue } from '@/domain/inventoryCalc';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const isStaff = user.role === 'STAFF';

    // 1. Get latest rate snapshot to compute current market value
    const latestRate = await db.rateSnapshot.findFirst({
      orderBy: { effectiveAt: 'desc' },
    });

    const goldRatePaise = latestRate?.gold24Paise ?? 700_000n;
    const silverRatePaise = latestRate?.silver999Paise ?? 85_000n;

    // 2. Fetch inventory items in stock
    const items = await db.inventoryItem.findMany({
      where: { status: 'IN_STOCK' },
      select: {
        id: true,
        metal: true,
        purityPpt: true,
        netWeightMg: true,
        costPaise: true,
        itemClass: true,
        category: true,
        trackingMode: true,
        quantity: true,
        createdAt: true,
      },
    });

    let totalItems = 0;
    let totalFineGoldMg = 0;
    let totalFineSilverMg = 0;
    let totalMarketValuePaise = 0n;
    let totalCostPaise = 0n;

    const classCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    const now = Date.now();
    let deadStockCount = 0;

    for (const item of items) {
      totalItems += item.quantity;
      classCounts[item.itemClass] = (classCounts[item.itemClass] || 0) + item.quantity;
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + item.quantity;

      if (!isStaff && item.costPaise) {
        totalCostPaise += item.costPaise;
      }

      // Check dead stock (> 365 days)
      const ageDays = (now - item.createdAt.getTime()) / (1000 * 3600 * 24);
      if (ageDays > 365) deadStockCount++;

      if (item.metal === 'GOLD') {
        const fineMg = Math.round((item.netWeightMg * item.purityPpt) / 1000);
        totalFineGoldMg += fineMg;
        totalMarketValuePaise += computeMetalValue(item.netWeightMg, item.purityPpt, goldRatePaise);
      } else if (item.metal === 'SILVER') {
        const fineMg = Math.round((item.netWeightMg * item.purityPpt) / 1000);
        totalFineSilverMg += fineMg;
        totalMarketValuePaise += computeMetalValue(item.netWeightMg, item.purityPpt, silverRatePaise);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          totalItems,
          totalFineGoldMg,
          totalFineSilverMg,
          totalMarketValuePaise: totalMarketValuePaise.toString(),
          totalCostPaise: isStaff ? null : totalCostPaise.toString(), // hidden for STAFF (D12-DSH-04)
          deadStockCount,
        },
        classBreakdown: classCounts,
        categoryBreakdown: categoryCounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch inventory dashboard' }, { status: 500 });
  }
}
