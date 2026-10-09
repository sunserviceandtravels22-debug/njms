import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';
import { computeLotRateFix } from '@/domain/purchase/lotCalculator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'ALL';

    const lots = await db.purchaseLot.findMany({
      include: {
        rateFixEvents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLots = lots.map((l) => {
      const provisionalRateRupees = paiseToRupees(l.provisionalRatePaise);
      const provisionalValueRupees = paiseToRupees(l.provisionalValuePaise);

      return {
        id: l.id,
        vendorId: l.vendorId,
        vendorInvoiceNo: l.vendorInvoiceNo || 'N/A',
        basis: l.basis,
        totalFineMg: l.totalFineMg,
        openFineMg: l.openFineMg,
        provisionalRateRupees,
        provisionalValueRupees,
        status: l.status,
        dueDate: l.dueDate ? l.dueDate.toISOString().split('T')[0] : null,
        rateFixEventsCount: l.rateFixEvents.length,
        createdAt: l.createdAt.toISOString().split('T')[0],
      };
    });

    return NextResponse.json({ ok: true, data: formattedLots });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Fetch purchase lots error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'RATE_FIX') {
      const { lotId, fineMgFixed, fixedRateRupees, note } = body;
      if (!lotId || !fineMgFixed || !fixedRateRupees) {
        return NextResponse.json({ ok: false, error: 'Missing lotId, fineMgFixed, or fixedRateRupees' }, { status: 400 });
      }

      const lot = await db.purchaseLot.findUnique({ where: { id: lotId } });
      if (!lot) {
        return NextResponse.json({ ok: false, error: 'Purchase lot not found' }, { status: 404 });
      }

      const fixedRatePaise = rupeesToPaise(fixedRateRupees);
      const calculation = computeLotRateFix({
        lotFineMg: lot.totalFineMg,
        fixedFineMg: fineMgFixed,
        fixedRatePaisePerGram: fixedRatePaise,
        provisionalRatePaisePerGram: lot.provisionalRatePaise,
        items: [],
      });

      const fixEvent = await db.rateFixEvent.create({
        data: {
          purchaseLotId: lotId,
          fineMgFixed,
          fixedRatePaise,
          metalValuePaise: calculation.totalFixedMetalValuePaise,
          gstPaise: calculation.gstDeltaPaise,
          note: note || 'Rate fix applied',
          byUserId: user.id,
        },
      });

      const newOpenFine = Math.max(0, lot.openFineMg - fineMgFixed);
      const newStatus = newOpenFine === 0 ? 'FIXED' : 'PARTLY_FIXED';

      await db.purchaseLot.update({
        where: { id: lotId },
        data: {
          openFineMg: newOpenFine,
          status: newStatus,
        },
      });

      return NextResponse.json({
        ok: true,
        data: {
          fixEventId: fixEvent.id,
          newStatus,
          metalValueDeltaRupees: paiseToRupees(calculation.metalValueDeltaPaise),
        },
      });
    }

    // Ingest new Purchase Lot
    const { vendorId, vendorInvoiceNo, basis, totalFineMg, provisionalRateRupees, dueDate } = body;
    const provRatePaise = rupeesToPaise(provisionalRateRupees || 7000);
    const provValPaise = BigInt(Math.round((totalFineMg * Number(provRatePaise)) / 1000));

    const newLot = await db.purchaseLot.create({
      data: {
        vendorId: vendorId || 'VEND-001',
        vendorInvoiceNo: vendorInvoiceNo || 'INV-' + Math.floor(1000 + Math.random() * 9000),
        basis: basis || 'RATE_OPEN',
        totalFineMg: totalFineMg || 100000, // 100 grams fine
        openFineMg: totalFineMg || 100000,
        provisionalRatePaise: provRatePaise,
        provisionalValuePaise: provValPaise,
        status: 'RATE_OPEN',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdById: user.id,
      },
    });

    return NextResponse.json({ ok: true, data: newLot });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Purchase lot operation error' }, { status: 500 });
  }
}
