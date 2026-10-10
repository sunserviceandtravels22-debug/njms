import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { evaluateThresholds } from '@/server/services/alertService';
import { writeAuditLog } from '@/server/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await evaluateThresholds();

    await writeAuditLog({
      userId: user.id,
      action: 'SYNC_ALERTS',
      entity: 'Alert',
      entityId: 'system',
      after: {
        evaluated: summary.evaluated,
        raised: summary.raised,
        triggeredBy: user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Alert sync complete — ${summary.evaluated} rule(s) evaluated, ${summary.raised} new alert(s) raised`,
      data: summary,
    });
  } catch (error: any) {
    console.error('Alert sync error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Alert sync failed' },
      { status: 500 }
    );
  }
}
