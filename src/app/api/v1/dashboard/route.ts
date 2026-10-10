// Dashboard Summary API — aggregates real KPIs from all modules
// Implements: FR-DSH-01 | Doc: 03_TECH §6

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const isStaff = user.role === 'STAFF';

    // ── Date helpers ─────────────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // ── 1. Today's sales (Sale model, totalPaise field) ──────────────────────
    const todaySales = await db.sale.aggregate({
      where: {
        status: { not: 'VOIDED' },
        date: { gte: todayStart },
      },
      _sum: { totalPaise: true },
      _count: { _all: true },
    });

    // ── 2. Active credit outstanding — sum of customers' creditLimitPaise usage
    //    Credit exposure: total (creditLimitPaise) used across customers
    const customersWithCredit = await db.customer.aggregate({
      where: { creditLimitPaise: { gt: 0 } },
      _sum: { creditLimitPaise: true },
      _count: { _all: true },
    });

    // ── 3. Active girvi (GirviLoan model, principalPaise, status ACTIVE) ────
    const girviActive = await db.girviLoan.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { principalPaise: true },
      _count: { _all: true },
    });

    // ── 4. Total inventory value (using latest rate snapshot) ────────────────
    const latestSnapshot = await db.rateSnapshot.findFirst({
      orderBy: { effectiveAt: 'desc' },
    });
    const goldRate24 = latestSnapshot?.gold24Paise ?? BigInt(700_000);   // ₹7000/g default
    const silverRate = latestSnapshot?.silver999Paise ?? BigInt(85_000); // ₹85/g default

    const stockItems = await db.inventoryItem.findMany({
      where: { status: 'IN_STOCK' },
      select: { metal: true, purityPpt: true, netWeightMg: true, quantity: true },
    });

    let vaultValuePaise = BigInt(0);
    let totalStockCount = 0;
    for (const item of stockItems) {
      totalStockCount += item.quantity;
      const rate = item.metal === 'GOLD' ? goldRate24 : silverRate;
      const fineMg = BigInt(Math.round((item.netWeightMg * item.purityPpt) / 1000));
      vaultValuePaise += (fineMg * rate) / BigInt(1000);
    }

    // ── 5. Sales trend — last 7 days ─────────────────────────────────────────
    const recentSales = await db.sale.findMany({
      where: {
        status: { not: 'VOIDED' },
        date: { gte: sevenDaysAgo },
      },
      select: { date: true, totalPaise: true, discountPaise: true },
    });

    const dayMap: Record<string, { revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { weekday: 'short' });
      dayMap[key] = { revenue: 0 };
    }
    for (const sale of recentSales) {
      const key = new Date(sale.date).toLocaleDateString('en-IN', { weekday: 'short' });
      if (dayMap[key]) {
        dayMap[key].revenue += Number(sale.totalPaise) / 100;
      }
    }
    const salesTrend = Object.entries(dayMap).map(([name, v]) => ({
      name,
      Revenue: Math.round(v.revenue),
    }));

    // ── 6. Category breakdown for pie chart ──────────────────────────────────
    const categoryGroups = await db.inventoryItem.groupBy({
      by: ['category'],
      where: { status: 'IN_STOCK' },
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 6,
    });

    const categoryData = categoryGroups.map((g) => ({
      name: g.category,
      value: g._count._all,
    }));

    // ── 7. Today's rates from dailyRate ───────────────────────────────────────
    const todayRates = await db.dailyRate.findMany({
      where: { date: todayStart },
      orderBy: [{ metal: 'asc' }, { purityPpt: 'desc' }],
    });

    // ── 8. Recent customers ──────────────────────────────────────────────────
    const recentCustomerCount = await db.customer.count();

    return NextResponse.json({
      ok: true,
      data: {
        todaySalesAmountPaise: (todaySales._sum.totalPaise ?? BigInt(0)).toString(),
        todaySalesCount: todaySales._count._all,
        creditOutstandingPaise: (customersWithCredit._sum.creditLimitPaise ?? BigInt(0)).toString(),
        creditCustomerCount: customersWithCredit._count._all,
        girviPrincipalPaise: (girviActive._sum.principalPaise ?? BigInt(0)).toString(),
        girviCount: girviActive._count._all,
        vaultValuePaise: vaultValuePaise.toString(),
        totalStockCount,
        totalCustomers: recentCustomerCount,
        salesTrend,
        categoryData,
        rates: todayRates.map((r) => ({
          id: r.id,
          metal: r.metal,
          purityPpt: r.purityPpt,
          rateRupeesPerGram: Number(r.ratePaisePerGram) / 100,
        })),
        isStaff,
      },
    });
  } catch (error: any) {
    console.error('[/api/v1/dashboard] error:', error);
    return NextResponse.json({ ok: false, error: error.message ?? 'Failed to load dashboard' }, { status: 500 });
  }
}
