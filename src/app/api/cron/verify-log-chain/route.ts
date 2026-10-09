import { NextRequest, NextResponse } from 'next/server';
import { verifyChain } from '@/server/services/activityLog';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await verifyChain();

    if (!result.valid) {
      console.error(`[CRITICAL] ActivityLog hash chain broken at id ${result.brokenAtId}`);
      // In Sprint 3, alertService.raise('LOG_CHAIN_BROKEN', ...) will be hooked here
    }

    return NextResponse.json({
      ok: true,
      data: {
        valid: result.valid,
        brokenAtId: result.brokenAtId ? result.brokenAtId.toString() : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Verification job failed' }, { status: 500 });
  }
}
