import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { calculateLendingAdvisor } from '@/domain/calculators/lendingAdvisor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { items = [], safetyBp = 5000, monthlyInterestPct = 1.5, roundStepRupees = 100 } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Select at least one jewellery article' }, { status: 400 });
    }

    const result = calculateLendingAdvisor({
      items,
      safetyBp,
      monthlyInterestPct,
      roundStepRupees,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('Lending advisor error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to calculate lending suggestion' }, { status: 500 });
  }
}
