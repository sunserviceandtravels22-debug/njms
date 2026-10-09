import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Metal } from '@prisma/client';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const rates = await db.dailyRate.findMany({
      where: { date: todayObj },
    });

    const formatted = rates.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      metal: r.metal,
      purityPpt: r.purityPpt,
      purityLabel: r.purityPpt === 1000 ? '24K Fine' : r.purityPpt === 916 ? '22K (916)' : `${r.purityPpt} ppt`,
      rateRupeesPerGram: paiseToRupees(r.ratePaisePerGram), // Displayed in ₹/g
      sellRateRupeesPerGram: r.sellRatePaisePerGram ? paiseToRupees(r.sellRatePaisePerGram) : null,
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch daily rates error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch daily rates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { metal = 'GOLD', purityPpt = 916, rateRupeesPerGram, sellRateRupeesPerGram } = body;

    const rateVal = parseFloat(rateRupeesPerGram);
    if (!rateVal || rateVal <= 0) {
      return NextResponse.json({ ok: false, error: 'Rate in Rupees per Gram (₹/g) is required' }, { status: 400 });
    }

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const ratePaisePerGram = rupeesToPaise(rateVal);
    const sellRatePaisePerGram = sellRateRupeesPerGram ? rupeesToPaise(parseFloat(sellRateRupeesPerGram)) : null;

    const rateRecord = await db.dailyRate.upsert({
      where: {
        date_metal_purityPpt: {
          date: todayObj,
          metal: metal as Metal,
          purityPpt: parseInt(purityPpt, 10),
        },
      },
      create: {
        date: todayObj,
        metal: metal as Metal,
        purityPpt: parseInt(purityPpt, 10),
        ratePaisePerGram,
        sellRatePaisePerGram,
        updatedById: user.id,
      },
      update: {
        ratePaisePerGram,
        sellRatePaisePerGram,
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_DAILY_RATE',
      entity: 'DailyRate',
      entityId: rateRecord.id,
      after: {
        metal: rateRecord.metal,
        purityPpt: rateRecord.purityPpt,
        rateRupeesPerGram: rateVal,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...rateRecord,
        rateRupeesPerGram: rateVal,
      },
    });
  } catch (error: any) {
    console.error('Update daily rate error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update daily rate' }, { status: 500 });
  }
}
