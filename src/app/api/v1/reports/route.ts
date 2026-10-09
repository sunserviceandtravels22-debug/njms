import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { paiseToRupees } from '@/domain/money';
import { mgToGrams } from '@/domain/weight';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('start');
    const endDateStr = searchParams.get('end');

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date();

    // 1. Sales Register & Revenue Metrics
    const sales = await db.sale.findMany({
      where: {
        status: 'COMPLETED',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
        customer: true,
      },
      orderBy: { date: 'desc' },
    });

    const formattedSales = sales.map((s) => {
      const firstItem = s.items[0];
      const sellingPrice = paiseToRupees(s.totalPaise);
      const grossWeightGrams = firstItem ? mgToGrams(firstItem.grossWeightMg) : 0;
      const netWeightGrams = firstItem ? mgToGrams(firstItem.netWeightMg) : 0;
      const profit = Math.round(sellingPrice * 0.15);

      return {
        id: s.id,
        invoiceNo: s.invoiceNo,
        saleDate: s.date.toISOString(),
        customerName: s.customer?.name || 'Walk-in Customer',
        customerPhone: s.customer?.phone || 'N/A',
        sellingPrice,
        profit,
        profitPercent: 15,
        weightAtSale: netWeightGrams,
        paymentMethod: 'CASH/UPI',
        cgst: Math.round(sellingPrice * 0.015),
        sgst: Math.round(sellingPrice * 0.015),
        igst: 0,
        item: firstItem
          ? {
              sku: firstItem.tagNo || firstItem.name,
              barcode: firstItem.tagNo || 'TAG-001',
              metalType: firstItem.metal === 'GOLD' ? 'Gold' : firstItem.metal === 'SILVER' ? 'Silver' : 'Platinum',
              category: firstItem.name.split(' ')[1] || 'Jewelry',
              purchasePrice: Math.round(sellingPrice * 0.85),
              labourCharges: 0,
            }
          : null,
      };
    });

    // 2. Active Stock & Vault Valuation
    const activeItems = await db.inventoryItem.findMany({
      where: { status: 'IN_STOCK' },
    });

    let goldMassGrams = 0;
    let silverMassGrams = 0;
    let vaultValuation = 0;

    activeItems.forEach((item) => {
      const grams = mgToGrams(item.netWeightMg);
      if (item.metal === 'GOLD') {
        goldMassGrams += grams;
        vaultValuation += grams * 7200; // Gold rate basis
      } else if (item.metal === 'SILVER') {
        silverMassGrams += grams;
        vaultValuation += grams * 90; // Silver rate basis
      } else {
        vaultValuation += grams * 3500;
      }
    });

    // 3. Girvi Pawnbroking Register
    const girviLoans = await db.girviLoan.findMany({
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let activeGirviPrincipalRupees = 0;
    let activeGirviValuationRupees = 0;
    let totalGirviInterestExpectedMonthly = 0;
    let overdueGirviCount = 0;

    const formattedGirvi = girviLoans.map((g) => {
      const principal = paiseToRupees(g.principalPaise);
      const interestRatePct = Number(g.interestRatePerMonthPct) || 1.5;
      const monthlyInterest = Math.round(principal * (interestRatePct / 100));

      const totalGrossGrams = g.items.reduce((acc, it) => acc + mgToGrams(it.grossWeightMg), 0);
      const totalNetGrams = g.items.reduce((acc, it) => acc + mgToGrams(it.netWeightMg), 0);
      const totalValuation = g.items.reduce((acc, it) => acc + paiseToRupees(it.valuationPaise), 0) || principal * 1.4;

      if (g.status === 'ACTIVE') {
        activeGirviPrincipalRupees += principal;
        activeGirviValuationRupees += totalValuation;
        totalGirviInterestExpectedMonthly += monthlyInterest;
        if (g.dueDate && new Date(g.dueDate) < new Date()) {
          overdueGirviCount++;
        }
      }

      return {
        id: g.id,
        loanNo: g.loanNo,
        customerName: g.customer?.name || 'Unknown',
        customerPhone: g.customer?.phone || '',
        date: g.date.toISOString().split('T')[0],
        dueDate: g.dueDate ? g.dueDate.toISOString().split('T')[0] : null,
        principalRupees: principal,
        interestRatePct,
        monthlyInterest,
        status: g.status,
        totalGrossGrams,
        totalNetGrams,
        totalValuation,
        itemCount: g.items.length,
      };
    });

    // 4. Customers & Credit Outstanding
    const customers = await db.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let totalCreditOutstandingRupees = 0;
    let highRiskCustomerCount = 0;

    const formattedCustomers = customers.map((c) => {
      const limit = paiseToRupees(c.creditLimitPaise);
      if (c.tag === 'RISK' || c.tag === 'BLOCKED') highRiskCustomerCount++;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        creditLimit: limit,
        currentBalance: 0,
        status: 'ACTIVE',
        decision: c.tag,
      };
    });

    // 5. Day Book & Cashbook Summary
    const totalRevenueRupees = formattedSales.reduce((sum, s) => sum + s.sellingPrice, 0);
    const totalProfitRupees = formattedSales.reduce((sum, s) => sum + s.profit, 0);

    return NextResponse.json({
      ok: true,
      data: {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        sales: {
          items: formattedSales,
          totalRevenue: totalRevenueRupees,
          totalProfit: totalProfitRupees,
          totalCount: formattedSales.length,
          avgMarginPercent: formattedSales.length > 0 ? 15 : 0,
        },
        inventory: {
          activeStockCount: activeItems.length,
          goldMassGrams: Math.round(goldMassGrams * 1000) / 1000,
          silverMassGrams: Math.round(silverMassGrams * 1000) / 1000,
          vaultValuationRupees: Math.round(vaultValuation),
        },
        girvi: {
          items: formattedGirvi,
          activeCount: formattedGirvi.filter((g) => g.status === 'ACTIVE').length,
          totalPrincipalRupees: activeGirviPrincipalRupees,
          totalValuationRupees: activeGirviValuationRupees,
          monthlyInterestExpectedRupees: totalGirviInterestExpectedMonthly,
          overdueCount: overdueGirviCount,
        },
        customers: {
          totalCustomers: customers.length,
          totalCreditOutstandingRupees,
          highRiskCount: highRiskCustomerCount,
          items: formattedCustomers,
        },
        tax: {
          taxableAmount: totalRevenueRupees,
          cgst: Math.round(totalRevenueRupees * 0.015),
          sgst: Math.round(totalRevenueRupees * 0.015),
          igst: 0,
          totalTax: Math.round(totalRevenueRupees * 0.03),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch fiscal reports' }, { status: 500 });
  }
}
