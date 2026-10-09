import { NextRequest, NextResponse } from 'next/server';
import { evaluateThresholds } from '@/server/services/alertService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await evaluateThresholds();

    return NextResponse.json({
      ok: true,
      data: summary,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Alert threshold evaluation failed' }, { status: 500 });
  }
}
