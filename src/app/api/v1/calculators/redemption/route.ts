import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { calculateRedemptionAdvisor } from '@/domain/calculators/redemptionAdvisor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      girviDateStr,
      redeemDateStr,
      principalRupees,
      monthlyInterestPct = 1.5,
      interestType = 'SIMPLE',
      dayCountRule = 'INCLUSIVE_BOTH',
    } = body;

    if (!girviDateStr || !redeemDateStr || !principalRupees) {
      return NextResponse.json({ ok: false, error: 'girviDateStr, redeemDateStr, and principalRupees are required' }, { status: 400 });
    }

    const result = calculateRedemptionAdvisor({
      girviDateStr,
      redeemDateStr,
      principalRupees: parseFloat(principalRupees),
      monthlyInterestPct: parseFloat(monthlyInterestPct),
      interestType,
      dayCountRule,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('Redemption advisor error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to calculate redemption timeline' }, { status: 500 });
  }
}
