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
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, data: { customers: [], inventory: [], sales: [], girvi: [], cashbook: [] } });
    }

    const [customers, inventory, sales, girvi, cashbook] = await Promise.all([
      db.customer.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { relationName: { contains: q } },
            { city: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.inventoryItem.findMany({
        where: {
          OR: [
            { tagNo: { contains: q } },
            { sku: { contains: q } },
            { name: { contains: q } },
            { huid: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.sale.findMany({
        where: {
          OR: [
            { invoiceNo: { contains: q } },
            { customer: { name: { contains: q } } },
          ],
        },
        include: { customer: true },
        take: 5,
      }),
      db.girviLoan.findMany({
        where: {
          OR: [
            { loanNo: { contains: q } },
            { customer: { name: { contains: q } } },
          ],
        },
        include: { customer: true },
        take: 5,
      }),
      db.cashTxn.findMany({
        where: {
          OR: [
            { txnNo: { contains: q } },
            { labelText: { contains: q } },
            { partyName: { contains: q } },
          ],
        },
        take: 5,
      }),
    ]);

    const formattedCustomers = customers.map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: `${c.phone} ${c.relationName ? `(s/o ${c.relationName})` : ''}`,
      badge: c.tag,
      targetUrl: `/customers?id=${c.id}`,
    }));

    const formattedInventory = inventory.map((i) => ({
      id: i.id,
      title: `${i.name} (${i.metal})`,
      subtitle: `Tag: #${i.tagNo} • SKU: ${i.sku} • Net: ${mgToGrams(i.netWeightMg).toFixed(3)}g`,
      badge: i.status,
      targetUrl: `/inventory?search=${encodeURIComponent(i.tagNo)}`,
    }));

    const formattedSales = sales.map((s) => ({
      id: s.id,
      title: `Invoice #${s.invoiceNo}`,
      subtitle: `Client: ${s.customer?.name || 'Walk-in'} • Amount: ₹${paiseToRupees(s.totalPaise).toLocaleString('en-IN')}`,
      badge: s.status,
      targetUrl: `/pos/history?search=${encodeURIComponent(s.invoiceNo)}`,
    }));

    const formattedGirvi = girvi.map((g) => ({
      id: g.id,
      title: `Girvi Pledge #${g.loanNo}`,
      subtitle: `Pledger: ${g.customer?.name} • Principal: ₹${paiseToRupees(g.principalPaise).toLocaleString('en-IN')}`,
      badge: g.status,
      targetUrl: `/girvi?search=${encodeURIComponent(g.loanNo)}`,
    }));

    const formattedCashbook = cashbook.map((c) => ({
      id: c.id,
      title: `Txn #${c.txnNo} (${c.direction})`,
      subtitle: `${c.labelText} • Party: ${c.partyName || 'N/A'} • Amount: ₹${paiseToRupees(c.amountPaise).toLocaleString('en-IN')}`,
      badge: c.mode,
      targetUrl: `/cashbook?search=${encodeURIComponent(c.txnNo)}`,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        customers: formattedCustomers,
        inventory: formattedInventory,
        sales: formattedSales,
        girvi: formattedGirvi,
        cashbook: formattedCashbook,
      },
    });
  } catch (error: any) {
    console.error('Universal Search error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Search failed' }, { status: 500 });
  }
}
