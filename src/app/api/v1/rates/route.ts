import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Metal } from '@prisma/client';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';
import { createSnapshot } from '@/server/services/rateSnapshot';

export const dynamic = 'force-dynamic';

function getUtcTodayDate(): Date {
  const todayStr = new Date().toISOString().split('T')[0];
  return new Date(`${todayStr}T00:00:00.000Z`);
}

async function saveDailyRate(
  date: Date,
  metal: Metal,
  purityPpt: number,
  ratePaise: bigint,
  sellRatePaise: bigint | null,
  userId: string
) {
  const existing = await db.dailyRate.findFirst({
    where: { date, metal, purityPpt },
  });

  if (existing) {
    return await db.dailyRate.update({
      where: { id: existing.id },
      data: {
        ratePaisePerGram: ratePaise,
        sellRatePaisePerGram: sellRatePaise,
        updatedById: userId,
      },
    });
  } else {
    return await db.dailyRate.create({
      data: {
        date,
        metal,
        purityPpt,
        ratePaisePerGram: ratePaise,
        sellRatePaisePerGram: sellRatePaise,
        updatedById: userId,
      },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const todayObj = getUtcTodayDate();

    let rates = await db.dailyRate.findMany({
      where: { date: todayObj },
      orderBy: [{ metal: 'asc' }, { purityPpt: 'desc' }],
    });

    const isToday = rates.length > 0;

    // Fallback to most recent rates if today's are not entered yet
    if (!isToday) {
      const latest = await db.dailyRate.findFirst({
        orderBy: { date: 'desc' },
      });
      if (latest) {
        rates = await db.dailyRate.findMany({
          where: { date: latest.date },
          orderBy: [{ metal: 'asc' }, { purityPpt: 'desc' }],
        });
      }
    }

    const formatted = rates.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      metal: r.metal,
      purityPpt: r.purityPpt,
      purityLabel: r.purityPpt >= 999 ? '24K Fine' : r.purityPpt === 916 ? '22K (916)' : `${r.purityPpt} ppt`,
      rateRupeesPerGram: paiseToRupees(r.ratePaisePerGram), // Displayed in ₹/g
      sellRateRupeesPerGram: r.sellRatePaisePerGram ? paiseToRupees(r.sellRatePaisePerGram) : null,
      isToday,
    }));

    return NextResponse.json({ ok: true, data: formatted, isToday });
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
    const todayObj = getUtcTodayDate();

    // Support combined update payload: { rates: [...] }
    if (body.rates && Array.isArray(body.rates)) {
      for (const item of body.rates) {
        const val = parseFloat(item.rateRupeesPerGram);
        if (val && val > 0) {
          const paiseVal = rupeesToPaise(val);
          const sellVal = item.sellRateRupeesPerGram ? rupeesToPaise(parseFloat(item.sellRateRupeesPerGram)) : null;
          await saveDailyRate(
            todayObj,
            item.metal as Metal,
            parseInt(item.purityPpt, 10),
            paiseVal,
            sellVal,
            user.id
          );
        }
      }
    } else {
      // Single rate update
      const { metal = 'GOLD', purityPpt = 916, rateRupeesPerGram, sellRateRupeesPerGram } = body;
      const rateVal = parseFloat(rateRupeesPerGram);
      if (!rateVal || rateVal <= 0) {
        return NextResponse.json({ ok: false, error: 'Rate in Rupees per Gram (₹/g) is required' }, { status: 400 });
      }

      const ratePaisePerGram = rupeesToPaise(rateVal);
      const sellRatePaisePerGram = sellRateRupeesPerGram ? rupeesToPaise(parseFloat(sellRateRupeesPerGram)) : null;

      await saveDailyRate(
        todayObj,
        metal as Metal,
        parseInt(purityPpt, 10),
        ratePaisePerGram,
        sellRatePaisePerGram,
        user.id
      );

      // If 24K was updated and no 22K exists for today, also auto-update 22K (916) proportionally
      if (metal === 'GOLD' && (parseInt(purityPpt, 10) === 1000 || parseInt(purityPpt, 10) === 999)) {
        const rate22Paise = BigInt(Math.round(Number(ratePaisePerGram) * 0.916));
        await saveDailyRate(todayObj, 'GOLD', 916, rate22Paise, null, user.id);
      }
    }

    // Now synchronize RateSnapshot so all inventory and memo modules stay in sync
    try {
      const allDaily = await db.dailyRate.findMany({
        where: { date: todayObj },
      });
      const g24 = allDaily.find((r) => r.metal === 'GOLD' && r.purityPpt >= 999)?.ratePaisePerGram;
      const g22 = allDaily.find((r) => r.metal === 'GOLD' && r.purityPpt === 916)?.ratePaisePerGram;
      const sil = allDaily.find((r) => r.metal === 'SILVER')?.ratePaisePerGram;

      if (g24 || sil) {
        const fallback24 = g24 ?? BigInt(700_000);
        const fallback22 = g22 ?? BigInt(Math.round(Number(fallback24) * 0.916));
        const fallbackSil = sil ?? BigInt(85_000);

        await createSnapshot(
          {
            gold24Paise: fallback24,
            gold22Paise: fallback22,
            silver999Paise: fallbackSil,
            source: 'MANUAL',
            note: 'Updated via Rates Management',
          },
          user.id
        );
      }
    } catch (snapErr) {
      console.warn('Could not create RateSnapshot after DailyRate update:', snapErr);
    }

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_DAILY_RATE',
      entity: 'DailyRate',
      entityId: todayObj.toISOString(),
      after: body,
    });

    return NextResponse.json({
      ok: true,
      message: 'Rates successfully saved to database',
    });
  } catch (error: any) {
    console.error('Update daily rate error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update daily rate' }, { status: 500 });
  }
}
